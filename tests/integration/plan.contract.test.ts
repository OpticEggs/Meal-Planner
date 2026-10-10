/**
 * Stage 2 contract tests at the server-command boundary, against real PostgreSQL.
 * Browser-level versions of the visibility tests (T08/T09) live in tests/e2e.
 */
import { describe, expect, it } from "vitest";
import { fresh, op, protectedState, line, q, race, retailerCalls } from "./helpers";
import { NIGHT, WEEK } from "../fixtures/household";
import {
  adoptWeekProposalCommand,
  applyPlanChangeCommand,
  cancelPreviewCommand,
  createPreviewCommand,
  generateProposalCommand,
  recordLeftoverShortfallCommand,
  setNightLockCommand,
} from "@/server/commands/plan";
import { addRecipeNoteCommand, saveInterestCommand, saveRecipeVersionCommand, setFavoriteCommand, setRecipePreferenceCommand } from "@/server/commands/library";
import { captureHouseholdNeedCommand } from "@/server/commands/groceries";
import { updateSettingsCommand } from "@/server/commands/household";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";
import type { PlanOperation } from "@/domain/planning/operations";

async function preview(actor: Actor, weekId: string, operation: PlanOperation) {
  const r = await createPreviewCommand(actor, op(), { weekId, operation });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
  return r.status === "accepted" ? (r.result as { previewId: string; contentHash: string; blockers: { code: string }[]; consequences: string[]; additionalBasketCost: { known: boolean; minor: number } }) : (null as never);
}
const apply = (actor: Actor, p: { previewId: string; contentHash: string }, operationId = op()) =>
  applyPlanChangeCommand(actor, operationId, { previewId: p.previewId, reviewedHash: p.contentHash });

async function nightRecipe(weekId: string, night: string) {
  const r = await q<{ title: string | null; kind: string; revision: number; locked: boolean }>(
    `SELECT v.title, a.kind, a.revision, a.locked FROM assignments a LEFT JOIN cooking_events e ON e.id=a.cooking_event_id
     LEFT JOIN recipe_versions v ON v.id=e.recipe_version_id WHERE a.week_id=$1 AND a.night=$2`,
    [weekId, night],
  );
  return r[0];
}
const changeEventCount = async () => (await q<{ n: number }>("SELECT count(*)::int AS n FROM change_events"))[0].n;

describe("T01 preview Friday while the other member reviews groceries; cancel", () => {
  it("leaves accepted week, portions and active requirements unchanged with no household edit or external call", async () => {
    const { fx, jon, alex } = await fresh();
    const before = await protectedState(fx.weekId);
    const events0 = await changeEventCount();
    const alexView1 = await householdSnapshot(alex);
    const p = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    expect(p.consequences[0]).toContain("Friday");
    const alexView2 = await householdSnapshot(alex);
    expect(alexView2.groceries!.lines).toEqual(alexView1.groceries!.lines);
    expect(alexView2.seq).toBe(alexView1.seq);
    const c = await cancelPreviewCommand(jon, op(), { previewId: p.previewId });
    expect(c.status).toBe("accepted");
    expect(await protectedState(fx.weekId)).toEqual(before);
    expect(await changeEventCount()).toBe(events0);
    expect(await retailerCalls()).toBe(0);
    const pv = await q<{ status: string }>("SELECT status FROM previews WHERE id=$1", [p.previewId]);
    expect(pv[0].status).toBe("canceled");
  });
});

describe("T02 either member adopts the displayed week", () => {
  it("creates one shared accepted plan and no order, cooking or consumption record", async () => {
    const { fx, jon, alex } = await fresh();
    const next = "2026-10-19";
    const g = await generateProposalCommand(jon, op(), { weekStart: next });
    expect(g.status).toBe("accepted");
    const proposalId = String(g.status === "accepted" && g.result.proposalId);
    const alexView = await householdSnapshot(alex, next);
    const shown = alexView.proposals.find((p) => p.id === proposalId)!;
    expect(shown).toBeTruthy();
    // Alex adopts what Alex sees — no vote from Jon required.
    const a = await adoptWeekProposalCommand(alex, op(), { proposalId, reviewedHash: shown.contentHash, expectedAcceptedChoiceRevision: 0 });
    expect(a.status, JSON.stringify(a)).toBe("accepted");
    const w = await q<{ accepted_choice_revision: number; adopted_by: string }>("SELECT accepted_choice_revision, adopted_by FROM weeks WHERE household_id=$1 AND week_start=$2", [fx.householdId, next]);
    expect(w[0]).toEqual({ accepted_choice_revision: 1, adopted_by: fx.members.alex });
    expect((await q<{ n: number }>("SELECT count(*)::int n FROM orders"))[0].n).toBe(0);
    expect((await q<{ n: number }>("SELECT count(*)::int n FROM cook_records"))[0].n).toBe(0);
    expect((await q<{ n: number }>("SELECT count(*)::int n FROM receipt_observations"))[0].n).toBe(0);
    expect((await q<{ n: number }>("SELECT count(*)::int n FROM handoff_batches"))[0].n).toBe(0);
    const sj = await householdSnapshot(jon, next);
    const sa = await householdSnapshot(alex, next);
    expect(sj.week!.acceptedChoiceRevision).toBe(1);
    expect(sa.week!.acceptedChoiceRevision).toBe(1);
    expect(sj.week!.nights).toEqual(sa.week!.nights);
    // The adopted content is exactly the reviewed proposal.
    const nights = (sa.week as { nights: { night: string; kind: string; recipe: { id: string } | null }[] }).nights;
    for (const n of shown.content.nights) {
      const got = nights.find((x) => x.night === n.night)!;
      expect(got.kind).toBe(n.kind);
      expect(got.recipe?.id ?? null).toBe(n.recipeVersionId);
    }
  });
});

describe("T03 Sounds good and preference changes", () => {
  it("persist without changing accepted assignments, portions or requirements", async () => {
    const { fx, jon, alex } = await fresh();
    const before = await protectedState(fx.weekId);
    expect((await saveInterestCommand(alex, op(), { recipeId: fx.recipes.chili.recipeId })).status).toBe("accepted");
    expect((await setRecipePreferenceCommand(jon, op(), { recipeId: fx.recipes.salmon.recipeId, value: "not_for_me" })).status).toBe("accepted");
    expect((await setFavoriteCommand(alex, op(), { recipeId: fx.recipes.tacos.recipeId, favorite: true })).status).toBe("accepted");
    expect((await addRecipeNoteCommand(jon, op(), { recipeId: fx.recipes.tacos.recipeId, body: "More lime next time" })).status).toBe("accepted");
    expect(await protectedState(fx.weekId)).toEqual(before);
    expect((await q("SELECT 1 FROM interests WHERE recipe_id=$1 AND archived_at IS NULL", [fx.recipes.chili.recipeId])).length).toBe(1);
    expect((await q<{ value: string }>("SELECT value FROM recipe_preferences WHERE member_id=$1", [fx.members.jon]))[0].value).toBe("not_for_me");
    // Friday's salmon stays selected even though Jon marked it Not for me.
    expect((await nightRecipe(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Salmon rice bowls");
  });
});

describe("T04 previews affecting leftovers or a locked night", () => {
  it("shows consequences before Apply, cancellation changes nothing, protected dinners are not moved", async () => {
    const { fx, jon } = await fresh();
    const p1 = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.wed, recipeVersionId: fx.recipes.stirfry.versionId });
    // stir-fry is not leftover-friendly: Thursday's dependency is shown before Apply.
    expect(p1.consequences.join(" ")).toMatch(/Thursday becomes an open night/);
    expect((await cancelPreviewCommand(jon, op(), { previewId: p1.previewId })).status).toBe("accepted");
    const before = await protectedState(fx.weekId);
    // Lock Thursday, then a Wednesday change that would alter Thursday is blocked.
    const thu = await nightRecipe(fx.weekId, NIGHT.thu);
    expect((await setNightLockCommand(jon, op(), { assignmentId: fx.assignments.thu, expectedRevision: thu.revision, locked: true })).status).toBe("accepted");
    const p2 = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.wed, recipeVersionId: fx.recipes.penne.versionId });
    expect(p2.blockers.map((b) => b.code)).toContain("locked_dependent");
    const r2 = await apply(jon, p2);
    expect(r2.status).toBe("rejected");
    // Moving Friday onto the locked Thursday is refused; nothing displaced.
    const p3 = await preview(jon, fx.weekId, { type: "move", assignmentId: fx.assignments.fri, toNight: NIGHT.thu });
    expect(p3.blockers.map((b) => b.code)).toEqual(expect.arrayContaining(["locked"]));
    expect((await apply(jon, p3)).status).toBe("rejected");
    const after = await protectedState(fx.weekId);
    expect(after.assignments.find((a: any) => a.night === NIGHT.thu)).toEqual({ ...before.assignments.find((a: any) => a.night === NIGHT.thu), locked: true, revision: thu.revision + 1 });
    expect(after.events).toEqual(before.events);
    expect(after.allocations).toEqual(before.allocations);
  });
});

describe("T07 record less left than planned", () => {
  it("makes the dependent night unresolved, keeps the selected dinner, proposes but does not apply recovery", async () => {
    const { fx, alex } = await fresh();
    const before = await protectedState(fx.weekId);
    const r = await recordLeftoverShortfallCommand(alex, op(), { eventId: fx.events.chicken_rice, portionsRemaining: "1" });
    expect(r.status).toBe("accepted");
    expect(await protectedState(fx.weekId)).toEqual(before);
    const s = await householdSnapshot(alex);
    const thu = s.week!.nights.find((n: any) => n.night === NIGHT.thu) as any;
    expect(thu.kind).toBe("leftover");
    expect(thu.recipe.title).toBe("Fixture: Sheet-pan chicken and rice");
    expect(thu.coverage.status).toBe("unresolved");
    expect(s.week!.mealsChosen).toBe(false);
    expect(String(r.status === "accepted" && r.result.recovery)).toMatch(/unchanged/);
  });
});

describe("T08 (server boundary) other member changes Friday while a Friday preview is open", () => {
  it("reports the current Friday and stale draft from the snapshot before Apply; the old draft cannot apply", async () => {
    const { fx, jon, alex } = await fresh();
    const pj = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    const pa = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.chili.versionId });
    expect((await apply(alex, pa)).status).toBe("accepted");
    const s = await householdSnapshot(jon);
    const fri = s.week!.nights.find((n: any) => n.night === NIGHT.fri) as any;
    expect(fri.recipe.title).toBe("Fixture: Turkey chili");
    expect(fri.updatedBy).toBe("Alex");
    const draft = s.previews.find((p) => p.id === pj.previewId)!;
    expect(draft.stale).toBe(true);
    expect(draft.staleChanges[0]).toMatchObject({ dayName: "Friday", by: "Alex", now: "Fixture: Turkey chili" });
    const r = await apply(jon, pj);
    expect(r.status).toBe("rejected");
    expect(r.status === "rejected" && r.code).toBe("stale_preview");
    expect((await nightRecipe(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Turkey chili");
    expect((await q<{ status: string }>("SELECT status FROM previews WHERE id=$1", [pj.previewId]))[0].status).toBe("open"); // draft preserved
  });
});

for (const order of ["Jon (Sunday) first", "Alex (Friday) first"] as const) {
  describe(`T10 concurrent independent Friday and Sunday replacements — ${order}`, () => {
    it("both survive, neither restores other nights, groceries are recalculated", async () => {
      const { fx, jon, alex } = await fresh();
      const before = await protectedState(fx.weekId);
      const sun = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.sun, recipeVersionId: fx.recipes.chili.versionId });
      const fri = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
      const [a, b] =
        order === "Jon (Sunday) first"
          ? await race(fx.householdId, () => apply(jon, sun), () => apply(alex, fri))
          : await race(fx.householdId, () => apply(alex, fri), () => apply(jon, sun)).then(([x, y]) => [y, x] as const);
      expect(a.status, JSON.stringify(a)).toBe("accepted");
      expect(b.status, JSON.stringify(b)).toBe("accepted");
      const after = await protectedState(fx.weekId);
      expect((await nightRecipe(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Chicken penne");
      expect((await nightRecipe(fx.weekId, NIGHT.sun)).title).toBe("Fixture: Turkey chili");
      for (const n of [NIGHT.mon, NIGHT.tue, NIGHT.wed, NIGHT.thu, NIGHT.sat]) {
        expect(after.assignments.find((x: any) => x.night === n)).toEqual(before.assignments.find((x: any) => x.night === n));
      }
      expect(after.week[0].accepted_choice_revision).toBe(3);
      // Chicken: Wed batch 5.5 portions x 6 oz = 33 oz + Fri penne 2 x 5 oz = 10 oz -> 43 oz -> 2 trays of 24 oz.
      const chicken = await line(fx.weekId, "chicken_thigh");
      expect(chicken.meal).toMatchObject({ quantity: "1219.029", unit: "g" });
      expect(chicken.packagesNeeded).toBe(2);
      // Salmon: no longer needed for dinner; Alex's independent request remains.
      const salmon = await line(fx.weekId, "salmon");
      expect(salmon.meal).toBeNull();
      expect(salmon.requests.map((r: any) => r.kind)).toEqual(["usual"]);
      expect(salmon.packagesNeeded).toBe(1);
      // Turkey arrives with Sunday's chili; shawarma's yogurt and pita are gone.
      expect((await line(fx.weekId, "ground_turkey")).packagesNeeded).toBe(1);
      expect(await line(fx.weekId, "greek_yogurt")).toBeUndefined();
    });
  });
}

for (const order of ["Jon first", "Alex first"] as const) {
  describe(`T11 concurrent replacements of the same target — ${order}`, () => {
    it("one commits; the other makes no accepted write and keeps its draft", async () => {
      const { fx, jon, alex } = await fresh();
      const pj = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
      const pa = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.chili.versionId });
      const [first, second] =
        order === "Jon first"
          ? await race(fx.householdId, () => apply(jon, pj), () => apply(alex, pa))
          : await race(fx.householdId, () => apply(alex, pa), () => apply(jon, pj));
      expect(first.status).toBe("accepted");
      expect(second.status).toBe("rejected");
      expect(second.status === "rejected" && second.code).toBe("stale_preview");
      const fri = await nightRecipe(fx.weekId, NIGHT.fri);
      expect(fri.title).toBe(order === "Jon first" ? "Fixture: Chicken penne" : "Fixture: Turkey chili");
      expect(fri.revision).toBe(2);
      expect((await q<{ accepted_choice_revision: number }>("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [fx.weekId]))[0].accepted_choice_revision).toBe(2);
      const loser = order === "Jon first" ? pa : pj;
      expect((await q<{ status: string }>("SELECT status FROM previews WHERE id=$1", [loser.previewId]))[0].status).toBe("open");
    });
  });
}

for (const order of ["adoption first", "Friday change first"] as const) {
  describe(`T12 adopt a whole proposal after a newer accepted change — ${order}`, () => {
    it("never restores an obsolete seven-day snapshot", async () => {
      const { fx, jon, alex } = await fresh();
      const g = await generateProposalCommand(jon, op(), { weekStart: WEEK });
      const proposal = (await householdSnapshot(jon)).proposals.find((p) => p.id === (g.status === "accepted" && g.result.proposalId))!;
      const fri = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.chili.versionId });
      const adopt = () => adoptWeekProposalCommand(jon, op(), { proposalId: proposal.id, reviewedHash: proposal.contentHash, expectedAcceptedChoiceRevision: 1 });
      if (order === "Friday change first") {
        const [f, a] = await race(fx.householdId, () => apply(alex, fri), adopt);
        expect(f.status).toBe("accepted");
        expect(a.status).toBe("rejected");
        expect(a.status === "rejected" && a.code).toBe("stale_week");
        expect(JSON.stringify(a.status === "rejected" && a.details)).toContain("Alex");
        expect((await nightRecipe(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Turkey chili");
        expect((await q<{ accepted_choice_revision: number }>("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [fx.weekId]))[0].accepted_choice_revision).toBe(2);
      } else {
        const [a, f] = await race(fx.householdId, adopt, () => apply(alex, fri));
        expect(a.status).toBe("accepted");
        // Alex's Friday draft was reviewed against the old Friday; it now needs renewed review.
        expect(f.status).toBe("rejected");
        expect(f.status === "rejected" && f.code).toBe("stale_preview");
      }
    });
  });
}

describe("T15 (plan commands) duplicate click or retry", () => {
  it("returns the same recorded result with no duplicate edit; reused id with different payload is refused", async () => {
    const { fx, jon } = await fresh();
    const p = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    const id = op();
    const [r1, r2] = await Promise.all([apply(jon, p, id), apply(jon, p, id)]);
    const r3 = await apply(jon, p, id);
    expect(r1.status).toBe("accepted");
    expect({ ...r2, replayed: undefined }).toEqual({ ...r1, replayed: undefined });
    expect(r3.replayed).toBe(true);
    expect(r3.status).toBe("accepted");
    expect((await q<{ accepted_choice_revision: number }>("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [fx.weekId]))[0].accepted_choice_revision).toBe(2);
    const g = await generateProposalCommand(jon, op(), { weekStart: "2026-10-19" });
    const pr = (await householdSnapshot(jon, "2026-10-19")).proposals[0];
    const aid = op();
    const a1 = await adoptWeekProposalCommand(jon, aid, { proposalId: pr.id, reviewedHash: pr.contentHash, expectedAcceptedChoiceRevision: 0 });
    const a2 = await adoptWeekProposalCommand(jon, aid, { proposalId: pr.id, reviewedHash: pr.contentHash, expectedAcceptedChoiceRevision: 0 });
    expect(g.status).toBe("accepted");
    expect(a1.status).toBe("accepted");
    expect(a2.replayed).toBe(true);
    expect((await q<{ n: number }>("SELECT count(*)::int n FROM weeks WHERE week_start='2026-10-19' AND accepted_choice_revision=1"))[0].n).toBe(1);
    const reused = await adoptWeekProposalCommand(jon, aid, { proposalId: pr.id, reviewedHash: pr.contentHash, expectedAcceptedChoiceRevision: 7 });
    expect(reused.status).toBe("rejected");
    expect(reused.status === "rejected" && reused.code).toBe("operation_id_reused");
  });
});

describe("T21 edit a recipe in the library after adopting it", () => {
  it("keeps the accepted assignment on its pinned recipe version", async () => {
    const { fx, jon } = await fresh();
    const before = await protectedState(fx.weekId);
    const r = await saveRecipeVersionCommand(jon, op(), {
      recipeId: fx.recipes.salmon.recipeId, expectedVersionNo: 1, title: "Salmon rice bowls (household version)", instructions: "Use more ginger.",
      components: [{ key: "protein", name: "Salmon" }, { key: "base", name: "Rice" }],
      // EQR (2026-10-10): rows stated afresh (null = added here; an edit must say where each row came from).
      ingredients: [{ componentKey: "protein", ingredientKey: "salmon", ingredientName: "Salmon fillet", quantity: "8", unit: "oz", sourceRowId: null }, { componentKey: "base", ingredientKey: "rice", ingredientName: "Jasmine rice", quantity: "90", unit: "g", sourceRowId: null }],
    });
    expect(r.status).toBe("accepted");
    expect(await protectedState(fx.weekId)).toEqual(before);
    const fri = (await householdSnapshot(jon)).week!.nights.find((n: any) => n.night === NIGHT.fri) as any;
    expect(fri.recipe.id).toBe(fx.recipes.salmon.versionId);
    expect(fri.recipe.title).toBe("Fixture: Salmon rice bowls");
    const cur = await q<{ current_version_id: string }>("SELECT current_version_id FROM recipes WHERE id=$1", [fx.recipes.salmon.recipeId]);
    expect(cur[0].current_version_id).not.toBe(fx.recipes.salmon.versionId);
    // Immutable versions: the database refuses to rewrite the pinned version.
    await expect(q("UPDATE recipe_versions SET title='x' WHERE id=$1", [fx.recipes.salmon.versionId])).rejects.toThrow(/immutable/);
  });
});

describe("T22 two night edits interacting through a real dependency", () => {
  for (const order of ["Wednesday first", "Thursday first"] as const) {
    it(`leftover source: conflict in either order (${order})`, async () => {
      const { fx, jon, alex } = await fresh();
      const wed = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.wed, recipeVersionId: fx.recipes.penne.versionId, leftovers: "follow" });
      const thu = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.thu, recipeVersionId: fx.recipes.tacos.versionId });
      const [first, second] =
        order === "Wednesday first"
          ? await race(fx.householdId, () => apply(jon, wed), () => apply(alex, thu))
          : await race(fx.householdId, () => apply(alex, thu), () => apply(jon, wed));
      expect(first.status).toBe("accepted");
      expect(second.status).toBe("rejected");
      expect(second.status === "rejected" && second.code).toBe("stale_preview");
    });
  }

  it("destination lock: a move onto a night that was locked meanwhile is stopped, never overwritten", async () => {
    const { fx, jon, alex } = await fresh();
    const mv = await preview(jon, fx.weekId, { type: "move", assignmentId: fx.assignments.fri, toNight: NIGHT.tue });
    expect(mv.blockers).toEqual([]);
    const tue = await nightRecipe(fx.weekId, NIGHT.tue);
    expect((await setNightLockCommand(alex, op(), { assignmentId: fx.assignments.tue, expectedRevision: tue.revision, locked: true })).status).toBe("accepted");
    const r = await apply(jon, mv);
    expect(r.status).toBe("rejected");
    expect((await nightRecipe(fx.weekId, NIGHT.tue)).kind).toBe("out");
    expect((await nightRecipe(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Salmon rice bowls");
  });

  it("firm constraint: each change fits a firm budget alone, the combination does not, and is not silently relaxed", async () => {
    const { fx, jon, alex } = await fresh();
    const s0 = await householdSnapshot(jon);
    const base = s0.groceries!.summary.pickupSpending.knownMinor as number;
    const fri = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    const sat = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.mon, recipeVersionId: fx.recipes.chili.versionId });
    const dF = fri.additionalBasketCost.minor;
    const dS = sat.additionalBasketCost.minor;
    expect(dF).toBeGreaterThan(0);
    expect(dS).toBeGreaterThan(0);
    const limit = base + Math.max(dF, dS);
    const set = await updateSettingsCommand(jon, op(), { expectedRevision: 1, budgetScope: "pickup", budgetLimitMinor: limit, budgetFirm: true });
    expect(set.status).toBe("accepted");
    // Unrelated nights at the plan level: different targets, so only the firm limit can stop the second.
    const [a, b] = await race(fx.householdId, () => apply(alex, fri), () => apply(jon, sat));
    expect(a.status).toBe("accepted");
    expect(b.status).toBe("rejected");
    expect(b.status === "rejected" && b.code).toBe("constraint_violation");
    expect((await nightRecipe(fx.weekId, NIGHT.mon)).title).toBe("Fixture: Tofu veggie stir-fry");
  });
});

describe("X01 (commands) household isolation", () => {
  it("another household cannot read or write plans, drafts or purchases by id substitution, with no side effects", async () => {
    const { fx, jon, other } = await fresh();
    const p = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    const before = await protectedState(fx.weekId);
    const attempts = [
      await applyPlanChangeCommand(other, op(), { previewId: p.previewId, reviewedHash: p.contentHash }),
      await createPreviewCommand(other, op(), { weekId: fx.weekId, operation: { type: "set_kind", assignmentId: fx.assignments.mon, kind: "out" } }),
      await setNightLockCommand(other, op(), { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: true }),
      await captureHouseholdNeedCommand(other, op(), { weekId: fx.weekId, text: "Milk", from: "groceries" }),
      await cancelPreviewCommand(other, op(), { previewId: p.previewId }),
      await recordLeftoverShortfallCommand(other, op(), { eventId: fx.events.chicken_rice, portionsRemaining: "0" }),
      await saveInterestCommand(other, op(), { recipeId: fx.recipes.chili.recipeId }),
    ];
    for (const r of attempts) {
      expect(r.status).toBe("rejected");
      expect(r.status === "rejected" && r.code).toBe("not_found");
    }
    expect(await protectedState(fx.weekId)).toEqual(before);
    expect((await q("SELECT 1 FROM previews WHERE id=$1 AND status='open'", [p.previewId])).length).toBe(1);
    const otherView = await householdSnapshot(other, WEEK);
    expect(otherView.week).toBeNull();
    expect(JSON.stringify(otherView)).not.toContain(fx.weekId);
  });
});

describe("X03 (command identity)", () => {
  it("same id + same payload returns the original; same id + different payload is rejected with no write", async () => {
    const { fx, jon } = await fresh();
    const id = op();
    const r1 = await setNightLockCommand(jon, id, { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: true });
    const r2 = await setNightLockCommand(jon, id, { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: true });
    const r3 = await setNightLockCommand(jon, id, { assignmentId: fx.assignments.sat, expectedRevision: 1, locked: true });
    expect(r1.status).toBe("accepted");
    expect(r2).toEqual({ ...r1, replayed: true });
    expect(r3.status === "rejected" && r3.code).toBe("operation_id_reused");
    expect((await nightRecipe(fx.weekId, NIGHT.sat)).locked).toBe(false);
  });
});

describe("Negative control: a stale target is rejected", () => {
  it("a lock request bound to an old revision makes no write", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await setNightLockCommand(alex, op(), { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: true })).status).toBe("accepted");
    const r = await setNightLockCommand(jon, op(), { assignmentId: fx.assignments.mon, expectedRevision: 1, locked: false });
    expect(r.status === "rejected" && r.code).toBe("stale_target");
    expect((await nightRecipe(fx.weekId, NIGHT.mon)).locked).toBe(true);
  });
});

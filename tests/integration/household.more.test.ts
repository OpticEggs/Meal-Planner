import { describe, expect, it } from "vitest";
import { fresh, line, op, protectedState, q } from "./helpers";
import { NIGHT } from "../fixtures/household";
import { applyPlanChangeCommand, createPreviewCommand, generateProposalCommand, setPlateCommand } from "@/server/commands/plan";
import { addExclusionCommand, setTargetsCommand, updateSettingsCommand } from "@/server/commands/household";
import { setRecipePreferenceCommand } from "@/server/commands/library";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";
import type { PlanOperation } from "@/domain/planning/operations";

async function previewApply(actor: Actor, weekId: string, operation: PlanOperation) {
  const p = await createPreviewCommand(actor, op(), { weekId, operation });
  if (p.status !== "accepted") throw new Error(JSON.stringify(p));
  const a = await applyPlanChangeCommand(actor, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) });
  return { preview: p.result as any, apply: a };
}

describe("Backup and deferred dinners", () => {
  it("keeps the original as a deferred dinner, never stacked, and it can be placed deliberately later", async () => {
    const { fx, jon } = await fresh();
    const { preview, apply } = await previewApply(jon, fx.weekId, { type: "backup", assignmentId: fx.assignments.wed, recipeVersionId: fx.recipes.penne.versionId });
    expect(preview.consequences.join(" ")).toMatch(/kept as a deferred dinner/);
    expect(preview.consequences.join(" ")).toMatch(/Thursday becomes an open night/);
    expect(apply.status).toBe("accepted");
    const ev = await q<{ status: string; cook_night: string | null; recipe_version_id: string }>("SELECT status, cook_night, recipe_version_id FROM cooking_events WHERE id=$1", [fx.events.chicken_rice]);
    expect(ev[0]).toMatchObject({ status: "deferred", cook_night: null, recipe_version_id: fx.recipes.chicken_rice.versionId });
    const s = await householdSnapshot(jon);
    expect(s.deferred.map((d: any) => d.recipe.title)).toEqual(["Fixture: Sheet-pan chicken and rice"]);
    // Deferred demand is not active meal demand.
    expect((await line(fx.weekId, "chicken_thigh")).meal.sources.map((x: any) => x.recipeTitle).sort()).toEqual(["Fixture: Chicken penne", "Fixture: Chicken shawarma bowls"]);
    // Place it on the now-open Thursday.
    const placed = await previewApply(jon, fx.weekId, { type: "place", eventId: fx.events.chicken_rice, toNight: NIGHT.thu });
    expect(placed.apply.status).toBe("accepted");
    const thu = (await householdSnapshot(jon)).week!.nights.find((n: any) => n.night === NIGHT.thu) as any;
    expect(thu.kind).toBe("cook");
    expect(thu.recipe.title).toBe("Fixture: Sheet-pan chicken and rice");
    // Placing onto an occupied night is refused (no two dinners on one night).
    const p2 = await createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "move", assignmentId: fx.assignments.thu, toNight: NIGHT.fri } });
    expect(p2.status === "accepted" && (p2.result.blockers as any[]).map((b) => b.code)).toContain("destination_occupied");
  });
});

describe("Proposal controls", () => {
  it("Fewer sessions and Different dinners revise open nights only and explain the actual change", async () => {
    const { fx, jon, alex } = await fresh();
    const next = "2026-10-19";
    const g1 = await generateProposalCommand(jon, op(), { weekStart: next, inputs: { cookingSessions: 4 } });
    const id1 = String(g1.status === "accepted" && g1.result.proposalId);
    const c1 = (await q<{ content: any }>("SELECT content FROM proposals WHERE id=$1", [id1]))[0].content;
    expect(c1.nights.filter((n: any) => n.kind === "cook")).toHaveLength(4);
    const g2 = await generateProposalCommand(alex, op(), { weekStart: next, mode: "fewer_sessions", basedOnProposalId: id1 });
    const p2 = (await q<{ content: any; explanation: any }>("SELECT content, explanation FROM proposals WHERE id=$1", [String(g2.status === "accepted" && g2.result.proposalId)]))[0];
    expect(p2.content.nights.filter((n: any) => n.kind === "cook")).toHaveLength(3);
    expect(p2.explanation.changes[0]).toBe("Cooking sessions: 4 → 3.");
    const g3 = await generateProposalCommand(jon, op(), { weekStart: next, mode: "different_dinners", basedOnProposalId: id1 });
    const p3 = (await q<{ content: any; explanation: any }>("SELECT content, explanation FROM proposals WHERE id=$1", [String(g3.status === "accepted" && g3.result.proposalId)]))[0];
    const r1 = new Set(c1.nights.filter((n: any) => n.kind === "cook").map((n: any) => n.recipeVersionId));
    const r3 = p3.content.nights.filter((n: any) => n.kind === "cook").map((n: any) => n.recipeVersionId);
    expect(r3.some((r: string) => !r1.has(r))).toBe(true);
    expect(p3.explanation.changes.length).toBeGreaterThan(0);
    // Not for me excludes for that eater's shared dinners; the recipe stays in the library.
    await setRecipePreferenceCommand(alex, op(), { recipeId: fx.recipes.tacos.recipeId, value: "not_for_me" });
    const g4 = await generateProposalCommand(jon, op(), { weekStart: next });
    const p4 = (await q<{ content: any; explanation: any }>("SELECT content, explanation FROM proposals WHERE id=$1", [String(g4.status === "accepted" && g4.result.proposalId)]))[0];
    expect(p4.content.nights.some((n: any) => n.recipeVersionId === fx.recipes.tacos.versionId)).toBe(false);
    expect(p4.explanation.excluded.map((e: any) => e.reason).join(" ")).toContain("Not for me: Alex");
    expect((await q("SELECT 1 FROM recipes WHERE id=$1 AND archived_at IS NULL", [fx.recipes.tacos.recipeId])).length).toBe(1);
    // Nothing was accepted by generating proposals.
    expect((await q<{ n: number }>("SELECT count(*)::int n FROM weeks WHERE week_start=$1 AND accepted_choice_revision > 0", [next]))[0].n).toBe(0);
  });
});

describe("X08 new exclusion flags, never replaces", () => {
  it("flags Friday's salmon after a fish exclusion and leaves the accepted dinner in place", async () => {
    const { fx, jon } = await fresh();
    const before = await protectedState(fx.weekId);
    expect((await addExclusionCommand(jon, op(), { term: "fish", memberId: null })).status).toBe("accepted");
    expect(await protectedState(fx.weekId)).toEqual(before);
    const s = await householdSnapshot(jon);
    const fri = s.week!.nights.find((n: any) => n.night === NIGHT.fri) as any;
    expect(fri.constraint.status).toBe("violated");
    expect(fri.recipe.title).toBe("Fixture: Salmon rice bowls");
    expect(s.week!.mealsChosen).toBe(false);
    // A new substitute that fails the exclusion cannot be applied.
    const p = await createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.mon, recipeVersionId: fx.recipes.salmon.versionId } });
    expect(p.status === "accepted" && (p.result.blockers as any[]).map((b) => b.code)).toContain("constraint_violation");
  });
});

describe("Separate per-person targets and portions", () => {
  it("each member sets their own daily and dinner targets; plates show nutrition against the dinner target only", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await setTargetsCommand(jon, op(), { scope: "dinner", calories: "900", proteinG: "60", carbsG: null, fatG: null })).status).toBe("accepted");
    expect((await setTargetsCommand(jon, op(), { scope: "daily", calories: "2600", proteinG: "160", carbsG: null, fatG: null })).status).toBe("accepted");
    expect((await setTargetsCommand(alex, op(), { scope: "dinner", calories: "650", proteinG: null, carbsG: null, fatG: null })).status).toBe("accepted");
    const rows = await q<{ member_id: string; scope: string; calories: string }>("SELECT member_id, scope, calories FROM member_targets ORDER BY 1,2");
    expect(rows).toHaveLength(3);
    const s = await householdSnapshot(alex);
    const wed = s.week!.nights.find((n: any) => n.night === NIGHT.wed) as any;
    const jonPlate = wed.plates.find((p: any) => p.memberId === fx.members.jon);
    expect(jonPlate.componentPortions.protein).toBe("1.5");
    expect(jonPlate.dinnerTarget.calories).toBe("900");
    // 1.5 x 6 oz chicken (255.15 g x 1.77) + 75 g rice x 3.65 + 100 g broccoli x 0.34 + 1 tbsp oil (14.79 ml / 15 x 120)
    expect(jonPlate.nutrition.calories.value).toBe("877.7");
    expect(jonPlate.nutrition.synthetic).toBe(true);
    const sat = s.week!.nights.find((n: any) => n.night === NIGHT.sat) as any;
    expect(sat.plates[0].nutrition.calories.value).toBeNull(); // cheese, beans, tortillas have no data: unknown, not zero
    expect(sat.plates[0].nutrition.calories.missing.sort()).toEqual(["black_beans", "cheese", "tortillas"]);
    // Reserving a lunch adds exactly one batch plate.
    const ev = (await q<{ revision: number }>("SELECT revision FROM cooking_events WHERE id=$1", [fx.events.salmon]))[0];
    const before = (await line(fx.weekId, "salmon")).meal.quantity;
    const r = await setPlateCommand(jon, op(), { eventId: fx.events.salmon, expectedEventRevision: ev.revision, memberId: fx.members.jon, night: NIGHT.sat, kind: "lunch", componentPortions: { protein: "1", base: "1", veg: "1" } });
    expect(r.status).toBe("accepted");
    expect(Number((await line(fx.weekId, "salmon")).meal.quantity)).toBeCloseTo(Number(before) * 1.5, 2);
  });

  it("settings are saved inputs with revision checks; nothing starts set", async () => {
    const { jon, alex } = await fresh();
    const s0 = await householdSnapshot(jon);
    expect(s0.settings).toMatchObject({ storeLabel: null, budgetScope: null, budgetLimitMinor: null, cookingSessions: null, variety: null, maxEffort: null, equipment: [] });
    expect(s0.targets).toEqual([]);
    expect(s0.exclusions).toEqual([]);
    expect((await updateSettingsCommand(jon, op(), { expectedRevision: 1, cookingSessions: 3 })).status).toBe("accepted");
    const stale = await updateSettingsCommand(alex, op(), { expectedRevision: 1, cookingSessions: 5 });
    expect(stale.status === "rejected" && stale.code).toBe("stale_target");
    expect((await householdSnapshot(alex)).settings.cookingSessions).toBe(3);
  });
});

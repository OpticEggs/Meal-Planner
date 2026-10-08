import { randomUUID } from "node:crypto";
import { computeOperation, closureStale, type OperationResult, type PlanOperation } from "@/domain/planning/operations";
import { explainChange, generateProposal, type KeptNight, type PreferenceValue, type ProposalContent, type ProposalInputs } from "@/domain/planning/proposal";
import { checkRecipe } from "@/domain/planning/constraints";
import { computeProjection } from "@/domain/groceries/projection";
import { addDays, dayName, nextDinnerDate, weekStartOf } from "@/domain/dates";
import type { PlanState, RecipeVersion } from "@/domain/types";
import type { Db } from "../db/pool";
import { nowInstant } from "../env";
import { Reject, runCommand, type Actor } from "./framework";
import { ensureCycle, projectionInput } from "../groceries/recompute";
import {
  findWeek,
  loadExclusions,
  loadHousehold,
  loadIngredients,
  loadMembers,
  loadPlanState,
  loadRecipeVersions,
  loadSettings,
  weekById,
  type WeekRow,
} from "../queries/load";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function ensureWeek(c: Db, householdId: string, weekStart: string): Promise<WeekRow> {
  if (!ISO_DATE.test(weekStart) || weekStartOf(weekStart) !== weekStart) throw new Reject("invalid", "weekStart must be a Monday (YYYY-MM-DD)");
  await c.query("INSERT INTO weeks(household_id, week_start) VALUES ($1,$2) ON CONFLICT (household_id, week_start) DO NOTHING", [householdId, weekStart]);
  const w = (await findWeek(c, householdId, weekStart))!;
  await ensureCycle(c, householdId, w.id);
  return w;
}

async function context(c: Db, householdId: string, state: PlanState, extraRecipeVersionIds: string[] = []) {
  const members = await loadMembers(c, householdId);
  const recipes = await loadRecipeVersions(c, householdId, [...new Set([...state.events.map((e) => e.recipeVersionId), ...extraRecipeVersionIds])]);
  const exclusions = await loadExclusions(c, householdId);
  const ingredients = await loadIngredients(c, householdId);
  return { members, recipes, exclusions, ingredients };
}

async function lockedWeekForUpdate(c: Db, householdId: string, weekId: string): Promise<WeekRow> {
  const r = await c.query("SELECT id FROM weeks WHERE id=$1 AND household_id=$2 FOR UPDATE", [weekId, householdId]);
  if (!r.rowCount) throw new Reject("not_found", "Week not found");
  return (await weekById(c, householdId, weekId))!;
}

async function bumpWeek(c: Db, weekId: string): Promise<number> {
  const r = await c.query("UPDATE weeks SET accepted_choice_revision = accepted_choice_revision + 1 WHERE id=$1 RETURNING accepted_choice_revision", [weekId]);
  return r.rows[0].accepted_choice_revision;
}

/** Persists the scoped result of an operation: only the closure's changed rows are written. */
async function persistOperation(c: Db, actor: Actor, base: PlanState, res: OperationResult): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  for (const pid of res.newEvents) idMap.set(pid, randomUUID());
  const real = (id: string | null) => (id && idMap.has(id) ? idMap.get(id)! : id);
  for (const pid of res.newEvents) {
    const e = res.state.events.find((x) => x.id === pid)!;
    await c.query(
      "INSERT INTO cooking_events(id, week_id, household_id, recipe_version_id, status, cook_night, revision) VALUES ($1,$2,$3,$4,$5,$6,1)",
      [idMap.get(pid), base.weekId, actor.householdId, e.recipeVersionId, e.status, e.cookNight],
    );
  }
  for (const id of res.changedEvents) {
    const e = res.state.events.find((x) => x.id === id)!;
    await c.query("UPDATE cooking_events SET status=$2, cook_night=$3, revision=revision+1 WHERE id=$1", [id, e.status, e.cookNight]);
  }
  for (const id of [...res.changedEvents, ...res.newEvents]) {
    const rid = real(id)!;
    await c.query("DELETE FROM allocations WHERE cooking_event_id=$1", [rid]);
    for (const al of res.state.allocations.filter((a) => a.cookingEventId === id)) {
      await c.query(
        "INSERT INTO allocations(cooking_event_id, household_id, member_id, kind, night, component_portions) VALUES ($1,$2,$3,$4,$5,$6)",
        [rid, actor.householdId, al.memberId, al.kind, al.night, al.componentPortions],
      );
    }
  }
  for (const id of res.changedAssignments) {
    const a = res.state.assignments.find((x) => x.id === id)!;
    await c.query(
      "UPDATE assignments SET kind=$2, cooking_event_id=$3, reason=$4, locked=$5, revision=revision+1, updated_by=$6, updated_at=now() WHERE id=$1",
      [id, a.kind, real(a.cookingEventId), a.reason, a.locked, actor.memberId],
    );
  }
  return idMap;
}

// ---------------------------------------------------------------------------------
// Proposals

export interface GenerateProposalPayload {
  weekStart: string;
  mode?: "fresh" | "fewer_sessions" | "different_dinners";
  basedOnProposalId?: string | null;
  inputs?: Partial<Pick<ProposalInputs, "cookingSessions" | "variety" | "maxNewRecipes" | "maxEffort">>;
}

export function generateProposalCommand(actor: Actor, operationId: string, p: GenerateProposalPayload) {
  return runCommand(actor, "GenerateProposal", operationId, p, async (c) => {
    const week = await ensureWeek(c, actor.householdId, p.weekStart);
    const state = await loadPlanState(c, week);
    const settings = await loadSettings(c, actor.householdId);
    const members = await loadMembers(c, actor.householdId);
    const current = await loadRecipeVersions(c, actor.householdId, null);
    const pinned = await loadRecipeVersions(c, actor.householdId, state.events.map((e) => e.recipeVersionId));
    let base: { content: ProposalContent } | null = null;
    if (p.basedOnProposalId) {
      const b = await c.query("SELECT content FROM proposals WHERE id=$1 AND household_id=$2", [p.basedOnProposalId, actor.householdId]);
      if (!b.rowCount) throw new Reject("not_found", "Base proposal not found");
      base = { content: b.rows[0].content };
    }
    const prefRows = await c.query("SELECT recipe_id, member_id, value FROM recipe_preferences WHERE household_id=$1", [actor.householdId]);
    const preferences = new Map<string, Map<string, PreferenceValue>>();
    for (const r of prefRows.rows) {
      const m = preferences.get(r.recipe_id) ?? new Map();
      m.set(r.member_id, r.value);
      preferences.set(r.recipe_id, m);
    }
    const interests = new Set<string>(
      (await c.query("SELECT recipe_id FROM interests WHERE household_id=$1 AND archived_at IS NULL", [actor.householdId])).rows.map((r) => r.recipe_id),
    );
    const recent = new Set<string>(
      (
        await c.query(
          `SELECT DISTINCT v.recipe_id FROM cooking_events e JOIN weeks w ON w.id=e.week_id JOIN recipe_versions v ON v.id=e.recipe_version_id
           WHERE w.household_id=$1 AND e.status='scheduled' AND w.week_start >= $2::date - 14 AND w.week_start < $2::date`,
          [actor.householdId, p.weekStart],
        )
      ).rows.map((r) => r.recipe_id),
    );
    const cooked = new Set<string>(
      (await c.query("SELECT DISTINCT v.recipe_id FROM cook_records cr JOIN recipe_versions v ON v.id=cr.recipe_version_id WHERE cr.household_id=$1", [actor.householdId])).rows.map(
        (r) => r.recipe_id,
      ),
    );
    const kept: KeptNight[] = state.assignments
      .filter((a) => a.locked)
      .map((a) => {
        const e = state.events.find((x) => x.id === a.cookingEventId);
        return {
          night: a.night, kind: a.kind, recipeVersionId: e?.recipeVersionId ?? null, eventId: e?.id ?? null, cookNight: e?.cookNight ?? null,
          allocations: state.allocations.filter((al) => al.cookingEventId === e?.id).map((al) => ({ memberId: al.memberId, kind: al.kind, night: al.night, componentPortions: al.componentPortions })),
        };
      });
    const inputs: ProposalInputs = {
      cookingSessions: p.inputs?.cookingSessions ?? settings.cookingSessions,
      variety: p.inputs?.variety ?? settings.variety,
      maxNewRecipes: p.inputs?.maxNewRecipes ?? settings.maxNewRecipes,
      maxEffort: p.inputs?.maxEffort ?? settings.maxEffort,
      avoidRecipeIds: [],
    };
    if (base && p.mode === "fewer_sessions") {
      inputs.cookingSessions = Math.max(1, base.content.nights.filter((n) => n.kind === "cook").length - 1);
    }
    if (base && p.mode === "different_dinners") {
      inputs.avoidRecipeIds = base.content.nights
        .filter((n) => !n.kept && n.recipeVersionId)
        .map((n) => current.get(n.recipeVersionId!)?.recipeId ?? pinned.get(n.recipeVersionId!)?.recipeId)
        .filter(Boolean) as string[];
      if (base.content.nights.filter((n) => n.kind === "cook").length) inputs.cookingSessions = inputs.cookingSessions ?? base.content.nights.filter((n) => n.kind === "cook").length;
    }
    const gen = generateProposal(
      {
        weekStart: week.weekStart, members, recipes: [...current.values()], preferences, interests, recentRecipeIds: recent, cookedRecipeIds: cooked,
        exclusions: await loadExclusions(c, actor.householdId), ingredients: await loadIngredients(c, actor.householdId), kept,
      },
      inputs,
    );
    const titles = new Map<string, string>([...current, ...pinned].map(([id, r]) => [id, r.title]));
    const explanation = {
      mode: p.mode ?? "fresh",
      changes: base ? explainChange(base.content, gen.content, titles) : [],
      excluded: gen.excluded,
      settingsUsed: gen.settingsUsed,
      effortVarietyNovelty: { variety: inputs.variety, maxNewRecipes: inputs.maxNewRecipes, maxEffort: inputs.maxEffort },
    };
    const ins = await c.query(
      `INSERT INTO proposals(household_id, week_id, base_accepted_choice_revision, content, content_hash, inputs, explanation, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [actor.householdId, week.id, week.acceptedChoiceRevision, gen.content, gen.contentHash, inputs, explanation, actor.memberId],
    );
    return {
      status: "accepted",
      result: { proposalId: ins.rows[0].id, contentHash: gen.contentHash, weekId: week.id, baseAcceptedChoiceRevision: week.acceptedChoiceRevision },
      // A shared draft: delivered to both members, but it changes no accepted choice.
      change: { weekId: week.id, summary: { type: "proposal", text: `${actor.displayName} proposed a week` } },
    };
  });
}

export interface AdoptPayload {
  proposalId: string;
  reviewedHash: string;
  expectedAcceptedChoiceRevision: number;
}

export function adoptWeekProposalCommand(actor: Actor, operationId: string, p: AdoptPayload) {
  return runCommand(actor, "AdoptWeekProposal", operationId, p, async (c) => {
    const pr = await c.query("SELECT * FROM proposals WHERE id=$1 AND household_id=$2", [p.proposalId, actor.householdId]);
    if (!pr.rowCount) throw new Reject("not_found", "Proposal not found");
    const proposal = pr.rows[0];
    if (proposal.content_hash !== p.reviewedHash) throw new Reject("proposal_changed", "This is not the proposal you reviewed. Nothing was adopted.");
    if (proposal.status !== "open") throw new Reject("proposal_closed", `This proposal is ${proposal.status}. Nothing was adopted.`);
    const week = await lockedWeekForUpdate(c, actor.householdId, proposal.week_id);
    if (week.acceptedChoiceRevision !== p.expectedAcceptedChoiceRevision || week.acceptedChoiceRevision !== proposal.base_accepted_choice_revision) {
      const changes = await c.query(
        `SELECT ce.summary, ce.accepted_choice_revision, m.display_name FROM change_events ce LEFT JOIN members m ON m.id=ce.actor_member_id
         WHERE ce.household_id=$1 AND ce.summary->>'weekId' = $2 AND ce.accepted_choice_revision > $3 ORDER BY ce.seq`,
        [actor.householdId, week.id, Math.min(p.expectedAcceptedChoiceRevision, proposal.base_accepted_choice_revision)],
      );
      throw new Reject("stale_week", "The accepted week changed after this proposal was made. Adoption stopped; review the current week.", {
        currentAcceptedChoiceRevision: week.acceptedChoiceRevision,
        reviewedAcceptedChoiceRevision: p.expectedAcceptedChoiceRevision,
        newerChanges: changes.rows.map((r) => ({ by: r.display_name, text: r.summary.text, revision: r.accepted_choice_revision })),
      });
    }
    const content: ProposalContent = proposal.content;
    const state = await loadPlanState(c, week);
    const members = await loadMembers(c, actor.householdId);
    const rvIds = content.events.map((e) => e.recipeVersionId);
    const recipes = await loadRecipeVersions(c, actor.householdId, rvIds);
    const exclusions = await loadExclusions(c, actor.householdId);
    const ingredients = await loadIngredients(c, actor.householdId);
    const problems: string[] = [];
    for (const ev of content.events.filter((e) => !e.key.startsWith("keep:"))) {
      const rv = recipes.get(ev.recipeVersionId);
      if (!rv) {
        problems.push("A proposed recipe version no longer exists");
        continue;
      }
      const chk = checkRecipe(rv, members.map((m) => m.id), exclusions, ingredients);
      if (chk.status !== "ok") problems.push(`${rv.title}: ${chk.reasons.join("; ")}`);
    }
    if (problems.length) throw new Reject("constraint_violation", "This proposal no longer passes your hard requirements. Nothing was adopted.", { problems });

    // Locked nights are kept exactly; everything else follows the reviewed proposal.
    const keptEventIds = new Set(content.events.filter((e) => e.key.startsWith("keep:")).map((e) => e.key.slice(5)));
    for (const ev of state.events) {
      if (ev.status === "scheduled" && !keptEventIds.has(ev.id)) {
        await c.query("UPDATE cooking_events SET status='retired', revision=revision+1 WHERE id=$1", [ev.id]);
      }
    }
    const keyToId = new Map<string, string>();
    for (const ev of content.events) {
      if (ev.key.startsWith("keep:")) {
        keyToId.set(ev.key, ev.key.slice(5));
        continue;
      }
      const id = randomUUID();
      keyToId.set(ev.key, id);
      await c.query(
        "INSERT INTO cooking_events(id, week_id, household_id, recipe_version_id, status, cook_night) VALUES ($1,$2,$3,$4,'scheduled',$5)",
        [id, week.id, actor.householdId, ev.recipeVersionId, ev.cookNight],
      );
      for (const al of ev.allocations) {
        await c.query(
          "INSERT INTO allocations(cooking_event_id, household_id, member_id, kind, night, component_portions) VALUES ($1,$2,$3,$4,$5,$6)",
          [id, actor.householdId, al.memberId, al.kind, al.night, al.componentPortions],
        );
      }
    }
    for (const n of content.nights) {
      if (n.kept) continue;
      const eventId = n.eventKey ? keyToId.get(n.eventKey)! : null;
      await c.query(
        `INSERT INTO assignments(week_id, household_id, night, kind, cooking_event_id, locked, reason, updated_by)
         VALUES ($1,$2,$3,$4,$5,false,$6,$7)
         ON CONFLICT (week_id, night) DO UPDATE SET kind=EXCLUDED.kind, cooking_event_id=EXCLUDED.cooking_event_id, locked=false,
           reason=EXCLUDED.reason, revision=assignments.revision+1, updated_by=EXCLUDED.updated_by, updated_at=now()`,
        [week.id, actor.householdId, n.night, n.kind, eventId, n.reasons.join(" · "), actor.memberId],
      );
    }
    const rev = await bumpWeek(c, week.id);
    await c.query("UPDATE weeks SET adopted_proposal_id=$2, adopted_by=$3, adopted_at=$4 WHERE id=$1", [week.id, proposal.id, actor.memberId, nowInstant()]);
    await c.query("UPDATE proposals SET status='adopted' WHERE id=$1", [proposal.id]);
    await c.query("UPDATE proposals SET status='superseded' WHERE week_id=$1 AND status='open'", [week.id]);
    return {
      status: "accepted",
      result: { weekId: week.id, acceptedChoiceRevision: rev },
      change: { weekId: week.id, summary: { type: "adopt", text: `${actor.displayName} adopted the week` } },
      recomputeWeeks: [week.id],
    };
  });
}

// ---------------------------------------------------------------------------------
// Previews (drafts) and scoped changes

export interface PreviewPayload {
  weekId: string;
  operation: PlanOperation;
}

export async function previewConsequence(c: Db, householdId: string, weekId: string, state: PlanState, res: OperationResult, recipes: Map<string, RecipeVersion>) {
  const settings = await loadSettings(c, householdId);
  const now = await projectionInput(c, householdId, weekId);
  const current = computeProjection(now.input);
  const nextRecipes = new Map(recipes);
  const after = await projectionInput(c, householdId, weekId, { state: res.state, recipes: nextRecipes });
  const next = computeProjection(after.input);
  const delta: { name: string; before: string | null; after: string | null; change: string }[] = [];
  const keys = new Set([...current.lines.map((l) => l.key), ...next.lines.map((l) => l.key)]);
  for (const k of [...keys].sort()) {
    const a = current.lines.find((l) => l.key === k);
    const b = next.lines.find((l) => l.key === k);
    const fa = a?.meal ? `${a.meal.quantity} ${a.meal.unit}` : null;
    const fb = b?.meal ? `${b.meal.quantity} ${b.meal.unit}` : null;
    if (fa === fb) continue;
    const name = (b ?? a)!.name;
    const change = !fa ? "now needed for dinner" : !fb ? "no longer needed for dinner" : "dinner amount changes";
    delta.push({ name, before: fa, after: fb, change });
  }
  const additional =
    current.pickupSpending.complete && next.pickupSpending.complete
      ? { known: true, minor: next.pickupSpending.knownMinor - current.pickupSpending.knownMinor }
      : { known: false, minor: null as number | null, unknownCount: next.pickupSpending.unknownCount };
  const budgetBlock =
    settings.budgetFirm && next.budget.status === "over" && (next.budget.scope === "pickup" ? next.pickupSpending.knownMinor > current.pickupSpending.knownMinor : next.dinnerIngredientCost.knownMinor > current.dinnerIngredientCost.knownMinor)
      ? `This would put the ${next.budget.scope === "pickup" ? "pickup estimate" : "dinner ingredient cost"} over your firm budget.`
      : null;
  return { groceryDelta: delta, additionalBasketCost: additional, baseline: "current accepted week", budgetBlock, nextBudget: next.budget };
}

export function createPreviewCommand(actor: Actor, operationId: string, p: PreviewPayload) {
  return runCommand(actor, "CreatePreview", operationId, p, async (c) => {
    const week = await weekById(c, actor.householdId, p.weekId);
    if (!week || week.acceptedChoiceRevision === 0) throw new Reject("not_found", "There is no accepted week to change yet");
    const state = await loadPlanState(c, week);
    const extra = "recipeVersionId" in p.operation ? [p.operation.recipeVersionId] : [];
    const ctx = await context(c, actor.householdId, state, extra);
    if (extra.length && !ctx.recipes.has(extra[0])) throw new Reject("not_found", "Recipe not found");
    const res = computeOperation(state, p.operation, ctx);
    const consequence = await previewConsequence(c, actor.householdId, week.id, state, res, ctx.recipes);
    const ins = await c.query(
      `INSERT INTO previews(household_id, week_id, created_by, operation, base, consequence, content_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        actor.householdId, week.id, actor.memberId, p.operation, { ...res.closure, acceptedChoiceRevision: week.acceptedChoiceRevision },
        { lines: res.consequences, blockers: res.blockers, ...consequence }, res.contentHash,
      ],
    );
    return { status: "accepted", result: { previewId: ins.rows[0].id, contentHash: res.contentHash, consequences: res.consequences, blockers: res.blockers, ...consequence } };
  });
}

export function cancelPreviewCommand(actor: Actor, operationId: string, p: { previewId: string }) {
  return runCommand(actor, "CancelPreview", operationId, p, async (c) => {
    const r = await c.query(
      "UPDATE previews SET status='canceled', resolved_at=now() WHERE id=$1 AND household_id=$2 AND created_by=$3 AND status='open' RETURNING id",
      [p.previewId, actor.householdId, actor.memberId],
    );
    if (!r.rowCount) throw new Reject("not_found", "Open preview not found");
    return { status: "accepted", result: { previewId: p.previewId } };
  });
}

async function staleDetails(c: Db, state: PlanState, changed: { kind: string; id: string; night?: string }[]) {
  const nights = changed.filter((x) => x.kind === "assignment" && x.night).map((x) => x.night!);
  const r = await c.query(
    `SELECT a.night, a.kind, a.updated_at, m.display_name, v.title FROM assignments a LEFT JOIN members m ON m.id=a.updated_by
     LEFT JOIN cooking_events e ON e.id=a.cooking_event_id LEFT JOIN recipe_versions v ON v.id=e.recipe_version_id
     WHERE a.week_id=$1 AND a.night = ANY($2::date[]) ORDER BY a.night`,
    [state.weekId, nights],
  );
  return r.rows.map((x) => ({ night: x.night, by: x.display_name, now: x.kind === "cook" ? x.title : x.kind === "leftover" ? `Leftovers of ${x.title}` : x.kind, at: x.updated_at }));
}

export function applyPlanChangeCommand(actor: Actor, operationId: string, p: { previewId: string; reviewedHash: string }) {
  return runCommand(actor, "ApplyPlanChange", operationId, p, async (c) => {
    const pr = await c.query("SELECT * FROM previews WHERE id=$1 AND household_id=$2 AND created_by=$3", [p.previewId, actor.householdId, actor.memberId]);
    if (!pr.rowCount) throw new Reject("not_found", "Preview not found");
    const preview = pr.rows[0];
    if (preview.status !== "open") throw new Reject("preview_closed", `This preview is ${preview.status}.`);
    if (preview.content_hash !== p.reviewedHash) throw new Reject("preview_changed", "This is not the preview you reviewed. Nothing changed.");
    const week = await lockedWeekForUpdate(c, actor.householdId, preview.week_id);
    const state = await loadPlanState(c, week);
    const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);
    if (stale.stale) {
      throw new Reject("stale_preview", "A newer decision changed this night or what it depends on. Review it again; nothing was changed.", {
        changed: await staleDetails(c, state, stale.changed),
      });
    }
    const op: PlanOperation = preview.operation;
    const ctx = await context(c, actor.householdId, state, "recipeVersionId" in op ? [op.recipeVersionId] : []);
    const res = computeOperation(state, op, ctx);
    if (res.contentHash !== preview.content_hash) {
      throw new Reject("stale_preview", "Applying this now would produce something different from what you reviewed. Review it again.");
    }
    if (res.blockers.length) throw new Reject(res.blockers[0].code, res.blockers.map((b) => b.message).join(" "), { blockers: res.blockers });
    const cons = await previewConsequence(c, actor.householdId, week.id, state, res, ctx.recipes);
    if (cons.budgetBlock) {
      throw new Reject("constraint_violation", `${cons.budgetBlock} Combined with the current week, this is not applied; firm limits are never relaxed silently.`);
    }
    await persistOperation(c, actor, state, res);
    const rev = await bumpWeek(c, week.id);
    await c.query("UPDATE previews SET status='applied', resolved_at=now() WHERE id=$1", [preview.id]);
    return {
      status: "accepted",
      result: { weekId: week.id, acceptedChoiceRevision: rev, consequences: res.consequences },
      change: { weekId: week.id, summary: { type: op.type, text: `${actor.displayName}: ${res.consequences[0] ?? "changed the plan"}`, nights: res.changedAssignments } },
      recomputeWeeks: [week.id],
    };
  });
}

export function setNightLockCommand(actor: Actor, operationId: string, p: { assignmentId: string; expectedRevision: number; locked: boolean }) {
  return runCommand(actor, "SetNightLock", operationId, p, async (c) => {
    const a = await c.query("SELECT * FROM assignments WHERE id=$1 AND household_id=$2", [p.assignmentId, actor.householdId]);
    if (!a.rowCount) throw new Reject("not_found", "Night not found");
    const row = a.rows[0];
    await lockedWeekForUpdate(c, actor.householdId, row.week_id);
    if (row.revision !== p.expectedRevision) throw new Reject("stale_target", `${dayName(row.night)} changed since you looked. Review it again.`);
    if (row.locked === p.locked) return { status: "accepted", result: { unchanged: true } };
    await c.query("UPDATE assignments SET locked=$2, revision=revision+1, updated_by=$3, updated_at=now() WHERE id=$1", [p.assignmentId, p.locked, actor.memberId]);
    const rev = await bumpWeek(c, row.week_id);
    return {
      status: "accepted",
      result: { acceptedChoiceRevision: rev },
      change: { weekId: row.week_id, summary: { type: "lock", text: `${actor.displayName} ${p.locked ? "locked" : "unlocked"} ${dayName(row.night)}` } },
      recomputeWeeks: [row.week_id],
    };
  });
}

export function setPlateCommand(
  actor: Actor,
  operationId: string,
  p: { eventId: string; expectedEventRevision: number; memberId: string; night: string; kind: "dinner" | "lunch"; componentPortions: Record<string, string> | null },
) {
  return runCommand(actor, "SetPlate", operationId, p, async (c) => {
    const e = await c.query("SELECT week_id FROM cooking_events WHERE id=$1 AND household_id=$2", [p.eventId, actor.householdId]);
    if (!e.rowCount) throw new Reject("not_found", "Cooking event not found");
    const m = await c.query("SELECT 1 FROM members WHERE id=$1 AND household_id=$2", [p.memberId, actor.householdId]);
    if (!m.rowCount) throw new Reject("not_found", "Member not found");
    const week = await lockedWeekForUpdate(c, actor.householdId, e.rows[0].week_id);
    const state = await loadPlanState(c, week);
    const ev = state.events.find((x) => x.id === p.eventId);
    if (!ev || ev.revision !== p.expectedEventRevision) throw new Reject("stale_target", "This dinner changed since you looked. Review it again.");
    const ctx = await context(c, actor.householdId, state);
    const res = computeOperation(state, { type: "plate", eventId: p.eventId, memberId: p.memberId, night: p.night, kind: p.kind, componentPortions: p.componentPortions }, ctx);
    if (res.blockers.length) throw new Reject(res.blockers[0].code, res.blockers.map((b) => b.message).join(" "));
    await persistOperation(c, actor, state, res);
    const rev = await bumpWeek(c, week.id);
    return {
      status: "accepted",
      result: { acceptedChoiceRevision: rev },
      change: { weekId: week.id, summary: { type: "plate", text: `${actor.displayName}: ${res.consequences[0]}` } },
      recomputeWeeks: [week.id],
    };
  });
}

// ---------------------------------------------------------------------------------
// Facts: leftovers and explicit cooking history (never change selected dinners)

export function recordLeftoverShortfallCommand(actor: Actor, operationId: string, p: { eventId: string; portionsRemaining: string; note?: string }) {
  return runCommand(actor, "RecordLeftoverShortfall", operationId, p, async (c) => {
    if (!/^\d+(\.\d+)?$/.test(String(p.portionsRemaining))) throw new Reject("invalid", "Portions remaining must be a number");
    const e = await c.query("SELECT week_id, recipe_version_id FROM cooking_events WHERE id=$1 AND household_id=$2", [p.eventId, actor.householdId]);
    if (!e.rowCount) throw new Reject("not_found", "Cooking event not found");
    await c.query(
      "INSERT INTO leftover_observations(household_id, cooking_event_id, member_id, portions_remaining, note, observed_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [actor.householdId, p.eventId, actor.memberId, p.portionsRemaining, p.note ?? null, nowInstant()],
    );
    return {
      status: "accepted",
      result: { recorded: true, recovery: "Selected dinners are unchanged. Review the affected night and choose a recovery if you want one." },
      change: { weekId: e.rows[0].week_id, summary: { type: "fact", text: `${actor.displayName} recorded less left than planned` } },
    };
  });
}

export function recordCookedCommand(actor: Actor, operationId: string, p: { eventId: string }) {
  return runCommand(actor, "RecordCooked", operationId, p, async (c) => {
    const e = await c.query("SELECT week_id, recipe_version_id, cook_night FROM cooking_events WHERE id=$1 AND household_id=$2", [p.eventId, actor.householdId]);
    if (!e.rowCount) throw new Reject("not_found", "Cooking event not found");
    const h = await loadHousehold(c, actor.householdId);
    const today = nextDinnerDate(nowInstant(), h.timezone, 24);
    await c.query("INSERT INTO cook_records(household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on) VALUES ($1,$2,$3,$4,$5)", [
      actor.householdId, p.eventId, e.rows[0].recipe_version_id, actor.memberId, e.rows[0].cook_night ?? today,
    ]);
    return { status: "accepted", result: { recorded: true }, change: { weekId: e.rows[0].week_id, summary: { type: "cooked", text: `${actor.displayName} recorded cooking` } } };
  });
}

export { addDays };

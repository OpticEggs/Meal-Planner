import { hashOf } from "../hash";
import { dayName } from "../dates";
import { defaultPlate } from "../recipes/plate";
import { checkRecipe } from "./constraints";
import type { Allocation, Assignment, CookingEvent, Exclusion, Ingredient, PlanState, RecipeVersion } from "../types";

/**
 * Scoped plan operations. Each operation is computed from a base state into a
 * resulting state, together with its dependency closure: the assignments and
 * cooking events it reads or writes. A preview records the closure revisions; Apply
 * recomputes against the CURRENT state and requires (a) the closure revisions to be
 * unchanged and (b) the recomputed content hash to equal the reviewed hash.
 * Unrelated nights are never part of the closure, so independent edits both survive.
 */

export type PlanOperation =
  | { type: "replace"; assignmentId: string; recipeVersionId: string; leftovers?: "follow" | "open" }
  | { type: "backup"; assignmentId: string; recipeVersionId: string }
  | { type: "move"; assignmentId: string; toNight: string }
  | { type: "place"; eventId: string; toNight: string }
  | { type: "set_kind"; assignmentId: string; kind: "out" | "open" }
  | { type: "plate"; eventId: string; memberId: string; night: string; kind: "dinner" | "lunch"; componentPortions: Record<string, string> | null };

export interface OperationContext {
  members: { id: string; displayName: string }[];
  recipes: Map<string, RecipeVersion>;
  exclusions: Exclusion[];
  ingredients: Map<string, Ingredient>;
}

export interface Blocker {
  code: "locked" | "locked_dependent" | "destination_occupied" | "not_found" | "invalid" | "constraint_violation" | "constraint_unknown";
  message: string;
}

export interface OperationResult {
  state: PlanState; // resulting state; new events carry placeholder ids "new:N"
  closure: { assignments: Record<string, number>; events: Record<string, number> };
  changedAssignments: string[]; // assignment ids whose accepted content changes
  changedEvents: string[]; // existing event ids whose content changes
  newEvents: string[]; // placeholder ids
  consequences: string[]; // human-readable, shown before Apply
  blockers: Blocker[];
  contentHash: string; // hash of the resulting content of the closure
}

function clone(s: PlanState): PlanState {
  return {
    ...s,
    assignments: s.assignments.map((a) => ({ ...a })),
    events: s.events.map((e) => ({ ...e })),
    allocations: s.allocations.map((a) => ({ ...a, componentPortions: { ...a.componentPortions } })),
  };
}

function remapPlate(from: Record<string, string>, to: RecipeVersion): Record<string, string> {
  // Component keys may differ between recipes; matching keys keep their portions,
  // others start at one portion. Never multiply unrelated components.
  const plate = defaultPlate(to);
  for (const k of Object.keys(plate)) if (from[k] !== undefined) plate[k] = from[k];
  return plate;
}

export function computeOperation(base: PlanState, op: PlanOperation, ctx: OperationContext): OperationResult {
  const s = clone(base);
  const closureA = new Set<string>();
  const closureE = new Set<string>();
  const consequences: string[] = [];
  const blockers: Blocker[] = [];
  const newEvents: string[] = [];
  let seq = 0;
  const asg = (id: string) => s.assignments.find((a) => a.id === id);
  const asgAt = (night: string) => s.assignments.find((a) => a.night === night);
  const ev = (id: string | null) => (id ? s.events.find((e) => e.id === id) : undefined);
  const dependents = (eventId: string, exceptNight?: string) =>
    s.assignments.filter((a) => a.cookingEventId === eventId && a.kind === "leftover" && a.night !== exceptNight);
  const title = (rvId: string) => ctx.recipes.get(rvId)?.title ?? "Unknown recipe";
  const memberIds = ctx.members.map((m) => m.id);
  const nameOf = (id: string) => ctx.members.find((m) => m.id === id)?.displayName ?? "member";

  const touch = (a: Assignment | undefined) => {
    if (a) closureA.add(a.id);
  };
  const touchE = (e: CookingEvent | undefined) => {
    if (e) closureE.add(e.id);
  };
  const newEvent = (recipeVersionId: string, cookNight: string | null, status: CookingEvent["status"] = "scheduled") => {
    const id = `new:${seq++}`;
    s.events.push({ id, recipeVersionId, status, cookNight, revision: 1 });
    newEvents.push(id);
    return id;
  };
  const dropAllocations = (eventId: string, night?: string) => {
    s.allocations = s.allocations.filter((al) => !(al.cookingEventId === eventId && (night === undefined || al.night === night)));
  };
  const dinnerPlates = (eventId: string, night: string, rv: RecipeVersion): Allocation[] =>
    memberIds.map((m) => ({ cookingEventId: eventId, memberId: m, kind: "dinner", night, componentPortions: defaultPlate(rv) }));
  const checkNewRecipe = (rv: RecipeVersion) => {
    const r = checkRecipe(rv, memberIds, ctx.exclusions, ctx.ingredients);
    if (r.status === "violated") blockers.push({ code: "constraint_violation", message: `${rv.title}: ${r.reasons.join("; ")}` });
    if (r.status === "unknown") blockers.push({ code: "constraint_unknown", message: `${rv.title} cannot pass your exclusions: ${r.reasons.join("; ")}` });
  };
  const openNight = (a: Assignment, why: string) => {
    a.kind = "open";
    a.cookingEventId = null;
    a.reason = null;
    consequences.push(`${dayName(a.night)} becomes an open night (${why}).`);
  };

  switch (op.type) {
    case "replace":
    case "backup": {
      const target = asg(op.assignmentId);
      const rv = ctx.recipes.get(op.recipeVersionId);
      if (!target || !rv) {
        blockers.push({ code: "not_found", message: "Night or recipe not found" });
        break;
      }
      touch(target);
      const beforeLabel = target.cookingEventId ? title(ev(target.cookingEventId)!.recipeVersionId) : target.kind === "out" ? "Out" : "Open";
      if (target.locked) blockers.push({ code: "locked", message: `${dayName(target.night)} is locked. Unlock it first to change it.` });
      checkNewRecipe(rv);
      const oldEvent = ev(target.cookingEventId);
      touchE(oldEvent);
      const newId = newEvent(rv.id, target.night);
      if (target.kind === "cook" && oldEvent) {
        const deps = dependents(oldEvent.id);
        deps.forEach(touch);
        const lockedDeps = deps.filter((d) => d.locked);
        let mode: "follow" | "open" = op.type === "backup" ? "open" : (op.leftovers ?? (rv.leftoverFriendly ? "follow" : "open"));
        if (mode === "follow" && !rv.leftoverFriendly) {
          mode = "open";
          consequences.push(`${rv.title} is not marked leftover-friendly, so its leftover nights cannot follow it.`);
        }
        if (lockedDeps.length) {
          blockers.push({
            code: "locked_dependent",
            message: `${lockedDeps.map((d) => dayName(d.night)).join(", ")} is locked and depends on ${dayName(target.night)}'s cooking.`,
          });
        }
        const oldAllocs = s.allocations.filter((al) => al.cookingEventId === oldEvent.id);
        dropAllocations(oldEvent.id);
        for (const al of oldAllocs) {
          const isTargetNight = al.night === target.night;
          if (isTargetNight || mode === "follow") {
            s.allocations.push({ ...al, cookingEventId: newId, componentPortions: remapPlate(al.componentPortions, rv) });
          }
        }
        if (op.type === "backup") {
          oldEvent.status = "deferred";
          oldEvent.cookNight = null;
          oldEvent.revision += 1;
          consequences.push(
            `${title(oldEvent.recipeVersionId)} is kept as a deferred dinner, not scheduled. Its recipe stays pinned and anything already ordered for it stays ordered; place it on another night when you choose.`,
          );
        } else {
          oldEvent.status = "retired";
          oldEvent.revision += 1;
        }
        for (const d of deps) {
          if (mode === "follow") {
            d.cookingEventId = newId;
            consequences.push(`${dayName(d.night)} becomes leftovers of ${rv.title}.`);
          } else {
            openNight(d, `it was leftovers of ${title(oldEvent.recipeVersionId)}`);
          }
        }
      } else if (target.kind === "leftover" && oldEvent) {
        if (op.type === "backup") {
          blockers.push({ code: "invalid", message: "Backup applies to a cooking night" });
        }
        dropAllocations(oldEvent.id, target.night);
        oldEvent.revision += 1;
        s.allocations.push(...dinnerPlates(newId, target.night, rv));
        consequences.push(`${title(oldEvent.recipeVersionId)} no longer needs to cover ${dayName(target.night)}; its batch shrinks accordingly.`);
      } else {
        if (op.type === "backup") blockers.push({ code: "invalid", message: "Backup applies to a cooking night" });
        s.allocations.push(...dinnerPlates(newId, target.night, rv));
      }
      target.kind = "cook";
      target.cookingEventId = newId;
      target.reason = op.type === "backup" ? "Backup chosen deliberately" : "Changed deliberately";
      consequences.unshift(`${dayName(target.night)}: ${beforeLabel} → ${rv.title}.`);
      break;
    }
    case "move": {
      const target = asg(op.assignmentId);
      const dest = asgAt(op.toNight);
      if (!target || !dest || target.kind !== "cook" || !target.cookingEventId) {
        blockers.push({ code: "not_found", message: "Only a cooking night can be moved, to a night in this week" });
        break;
      }
      touch(target);
      touch(dest);
      const e = ev(target.cookingEventId)!;
      touchE(e);
      if (target.locked) blockers.push({ code: "locked", message: `${dayName(target.night)} is locked.` });
      if (dest.locked) blockers.push({ code: "locked", message: `${dayName(dest.night)} is locked and will not be displaced.` });
      if (dest.kind === "cook" || dest.kind === "leftover") {
        blockers.push({ code: "destination_occupied", message: `${dayName(dest.night)} already has a dinner. Change it first; Table never stacks two dinners on one night.` });
      }
      const deps = dependents(e.id);
      deps.forEach(touch);
      for (const al of s.allocations) {
        if (al.cookingEventId === e.id && al.night === target.night && al.kind === "dinner") al.night = op.toNight;
      }
      for (const d of deps) {
        if (d.night <= op.toNight) {
          if (d.locked) blockers.push({ code: "locked_dependent", message: `${dayName(d.night)} is locked and would come before the cooking.` });
          dropAllocations(e.id, d.night);
          openNight(d, "leftovers cannot come before the cooking");
        }
      }
      e.cookNight = op.toNight;
      e.revision += 1;
      dest.kind = "cook";
      dest.cookingEventId = e.id;
      dest.reason = "Moved deliberately";
      target.kind = "open";
      target.cookingEventId = null;
      target.reason = null;
      consequences.unshift(`${title(e.recipeVersionId)} moves from ${dayName(target.night)} to ${dayName(dest.night)}. No second copy of its ingredients is bought. ${dayName(target.night)} becomes open.`);
      break;
    }
    case "place": {
      const e = ev(op.eventId);
      const dest = asgAt(op.toNight);
      if (!e || e.status !== "deferred" || !dest) {
        blockers.push({ code: "not_found", message: "Deferred dinner or night not found" });
        break;
      }
      touchE(e);
      touch(dest);
      if (dest.locked) blockers.push({ code: "locked", message: `${dayName(dest.night)} is locked.` });
      if (dest.kind === "cook" || dest.kind === "leftover") blockers.push({ code: "destination_occupied", message: `${dayName(dest.night)} already has a dinner.` });
      const rv = ctx.recipes.get(e.recipeVersionId)!;
      e.status = "scheduled";
      e.cookNight = op.toNight;
      e.revision += 1;
      s.allocations.push(...dinnerPlates(e.id, op.toNight, rv));
      dest.kind = "cook";
      dest.cookingEventId = e.id;
      dest.reason = "Deferred dinner placed deliberately";
      consequences.push(`${rv.title} is scheduled on ${dayName(op.toNight)}.`);
      break;
    }
    case "set_kind": {
      const target = asg(op.assignmentId);
      if (!target) {
        blockers.push({ code: "not_found", message: "Night not found" });
        break;
      }
      touch(target);
      if (target.locked) blockers.push({ code: "locked", message: `${dayName(target.night)} is locked.` });
      const e = ev(target.cookingEventId);
      touchE(e);
      if (e && target.kind === "cook") {
        const deps = dependents(e.id);
        deps.forEach(touch);
        for (const d of deps) {
          if (d.locked) blockers.push({ code: "locked_dependent", message: `${dayName(d.night)} is locked and depends on this cooking.` });
          openNight(d, `it was leftovers of ${title(e.recipeVersionId)}`);
        }
        dropAllocations(e.id);
        e.status = "retired";
        e.revision += 1;
      } else if (e && target.kind === "leftover") {
        dropAllocations(e.id, target.night);
        e.revision += 1;
      }
      consequences.unshift(`${dayName(target.night)} becomes ${op.kind === "out" ? "a night out" : "an open night"}.`);
      target.kind = op.kind;
      target.cookingEventId = null;
      target.reason = null;
      break;
    }
    case "plate": {
      const e = ev(op.eventId);
      if (!e || e.status !== "scheduled" || !e.cookNight) {
        blockers.push({ code: "not_found", message: "Cooking event not found" });
        break;
      }
      touchE(e);
      const rv = ctx.recipes.get(e.recipeVersionId)!;
      if (op.night < e.cookNight) blockers.push({ code: "invalid", message: "A plate cannot be eaten before the cooking." });
      const nightAsg = asgAt(op.night);
      if (op.kind === "dinner") {
        touch(nightAsg);
        if (!nightAsg || nightAsg.cookingEventId !== e.id) blockers.push({ code: "invalid", message: "That night does not draw from this cooking" });
        if (nightAsg?.locked) blockers.push({ code: "locked", message: `${dayName(op.night)} is locked.` });
      }
      if (op.componentPortions) {
        for (const [k, v] of Object.entries(op.componentPortions)) {
          if (!rv.components.some((c) => c.key === k)) blockers.push({ code: "invalid", message: `Unknown component ${k}` });
          if (!/^\d+(\.\d+)?$/.test(v) || Number(v) > 10) blockers.push({ code: "invalid", message: `Invalid portion ${v}` });
        }
      }
      const idx = s.allocations.findIndex((al) => al.cookingEventId === e.id && al.memberId === op.memberId && al.night === op.night && al.kind === op.kind);
      if (op.componentPortions === null) {
        if (idx >= 0) s.allocations.splice(idx, 1);
        consequences.push(`${nameOf(op.memberId)}'s ${op.kind} on ${dayName(op.night)} is removed from the ${rv.title} batch.`);
      } else if (idx >= 0) {
        s.allocations[idx].componentPortions = { ...s.allocations[idx].componentPortions, ...op.componentPortions };
        consequences.push(`${nameOf(op.memberId)}'s ${op.kind} plate on ${dayName(op.night)} changes; only the changed components change quantities.`);
      } else {
        s.allocations.push({ cookingEventId: e.id, memberId: op.memberId, kind: op.kind, night: op.night, componentPortions: { ...defaultPlate(rv), ...op.componentPortions } });
        consequences.push(`${nameOf(op.memberId)} reserves a ${op.kind} from ${rv.title} on ${dayName(op.night)}.`);
      }
      e.revision += 1;
      break;
    }
  }

  const closure = {
    assignments: Object.fromEntries([...closureA].map((id) => [id, base.assignments.find((a) => a.id === id)!.revision])),
    events: Object.fromEntries([...closureE].map((id) => [id, base.events.find((e) => e.id === id)!.revision])),
  };
  const changedAssignments = [...closureA].filter((id) => {
    const b = base.assignments.find((a) => a.id === id)!;
    const n = s.assignments.find((a) => a.id === id)!;
    return b.kind !== n.kind || b.cookingEventId !== n.cookingEventId || b.locked !== n.locked;
  });
  const changedEvents = [...closureE].filter((id) => base.events.find((e) => e.id === id)!.revision !== s.events.find((e) => e.id === id)!.revision);
  const contentHash = hashOf({
    op,
    assignments: [...closureA].sort().map((id) => {
      const a = s.assignments.find((x) => x.id === id)!;
      return [a.id, a.night, a.kind, a.cookingEventId, a.locked];
    }),
    events: [...closureE, ...newEvents].sort().map((id) => {
      const e = s.events.find((x) => x.id === id)!;
      return [e.id, e.recipeVersionId, e.status, e.cookNight];
    }),
    allocations: s.allocations
      .filter((al) => closureE.has(al.cookingEventId) || newEvents.includes(al.cookingEventId))
      .map((al) => [al.cookingEventId, al.memberId, al.kind, al.night, al.componentPortions])
      .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))),
  });
  return { state: s, closure, changedAssignments, changedEvents, newEvents, consequences, blockers, contentHash };
}

export interface StaleCheck {
  stale: boolean;
  changed: { kind: "assignment" | "event"; id: string; night?: string }[];
}

/** Compares a preview's recorded closure revisions with the current state. */
export function closureStale(closure: OperationResult["closure"], current: PlanState): StaleCheck {
  const changed: StaleCheck["changed"] = [];
  for (const [id, rev] of Object.entries(closure.assignments)) {
    const a = current.assignments.find((x) => x.id === id);
    if (!a || a.revision !== rev) changed.push({ kind: "assignment", id, night: a?.night });
  }
  for (const [id, rev] of Object.entries(closure.events)) {
    const e = current.events.find((x) => x.id === id);
    if (!e || e.revision !== rev) changed.push({ kind: "event", id });
  }
  return { stale: changed.length > 0, changed };
}

import { dayName, nightsOf } from "../dates";
import { checkRecipe } from "./constraints";
import type { ProposalContent } from "./proposal";
import type { Allocation, Assignment, CookingEvent, Exclusion, Ingredient, PlanState, RecipeVersion } from "../types";

/**
 * Complete-plan admission for whole-week adoption ("Use this week"). An incomplete
 * proposal stays a draft; it is never adopted as the settled week. Scoped recoveries and
 * fact updates are different commands and may still expose a named unresolved night.
 */

export interface AdmissionProblem {
  code: "incomplete_week" | "locked_dependency" | "constraint_violation" | "constraint_unknown";
  message: string;
}

export function buildCandidate(content: ProposalContent, state: PlanState): { candidate: PlanState; problems: AdmissionProblem[] } {
  const problems: AdmissionProblem[] = [];
  const events: CookingEvent[] = [];
  const allocations: Allocation[] = [];
  for (const e of content.events) {
    if (e.key.startsWith("keep:")) {
      const id = e.key.slice(5);
      const cur = state.events.find((x) => x.id === id);
      if (!cur || cur.status !== "scheduled") {
        problems.push({ code: "locked_dependency", message: `A kept dinner's cooking is no longer scheduled.` });
        continue;
      }
      events.push({ ...cur });
      allocations.push(...state.allocations.filter((a) => a.cookingEventId === id).map((a) => ({ ...a })));
    } else {
      events.push({ id: e.key, recipeVersionId: e.recipeVersionId, status: "scheduled", cookNight: e.cookNight, revision: 0 });
      allocations.push(...e.allocations.map((a) => ({ cookingEventId: e.key, memberId: a.memberId, kind: a.kind, night: a.night, componentPortions: a.componentPortions })));
    }
  }
  const assignments: Assignment[] = content.nights.map((n) => {
    const cur = state.assignments.find((a) => a.night === n.night);
    if (n.kept && cur) return { ...cur };
    const eventId = n.eventKey ? (n.eventKey.startsWith("keep:") ? n.eventKey.slice(5) : n.eventKey) : null;
    return { id: cur?.id ?? `cand:${n.night}`, night: n.night, kind: n.kind, cookingEventId: eventId, locked: false, revision: cur?.revision ?? 0, reason: null };
  });
  return { candidate: { ...state, assignments, events, allocations }, problems };
}

export function admitWeek(args: {
  content: ProposalContent;
  state: PlanState;
  members: { id: string; displayName: string }[];
  recipes: Map<string, RecipeVersion>;
  exclusions: Exclusion[];
  ingredients: Map<string, Ingredient>;
}): { candidate: PlanState; problems: AdmissionProblem[] } {
  const { content, state, members } = args;
  const { candidate, problems } = buildCandidate(content, state);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? "a member";
  const nights = nightsOf(content.weekStart);

  // Coverage: seven nights, none open, each served by a scheduled cooking on or before it.
  if (content.nights.length !== 7 || !nights.every((n) => content.nights.some((x) => x.night === n))) {
    problems.push({ code: "incomplete_week", message: "The proposal does not cover all seven nights." });
  }
  const open = content.nights.filter((n) => n.kind === "open").map((n) => dayName(n.night));
  if (open.length) problems.push({ code: "incomplete_week", message: `No dinner chosen for ${open.join(", ")}.` });
  for (const a of candidate.assignments) {
    if (a.kind !== "cook" && a.kind !== "leftover") continue;
    const e = candidate.events.find((x) => x.id === a.cookingEventId);
    if (!e || !e.cookNight) {
      problems.push({ code: "incomplete_week", message: `${dayName(a.night)} refers to a cooking that is not part of this week.` });
      continue;
    }
    if (a.kind === "cook" && e.cookNight !== a.night) problems.push({ code: "incomplete_week", message: `${dayName(a.night)}'s cooking is scheduled for another night.` });
    if (a.kind === "leftover" && !(a.night > e.cookNight)) problems.push({ code: "incomplete_week", message: `${dayName(a.night)}'s leftovers would come before the cooking.` });
    for (const m of members) {
      if (!candidate.allocations.some((al) => al.cookingEventId === e.id && al.memberId === m.id && al.kind === "dinner" && al.night === a.night)) {
        problems.push({ code: "incomplete_week", message: `${dayName(a.night)} has no plate for ${nameOf(m.id)}.` });
      }
    }
  }
  for (const al of candidate.allocations) {
    const e = candidate.events.find((x) => x.id === al.cookingEventId)!;
    if (al.kind === "lunch") {
      if (!(al.night > (e.cookNight ?? ""))) problems.push({ code: "incomplete_week", message: `${nameOf(al.memberId)}'s lunch on ${dayName(al.night)} comes before its cooking.` });
    } else if (candidate.assignments.find((a) => a.night === al.night)?.cookingEventId !== al.cookingEventId) {
      problems.push({ code: "incomplete_week", message: `${nameOf(al.memberId)}'s plate on ${dayName(al.night)} is not served by that night's dinner.` });
    }
  }

  // Locks: every locked accepted night is kept exactly, with its cooking.
  for (const a of state.assignments.filter((x) => x.locked)) {
    const n = content.nights.find((x) => x.night === a.night);
    const expectKey = a.cookingEventId ? `keep:${a.cookingEventId}` : null;
    if (!n || !n.kept || n.kind !== a.kind || n.eventKey !== expectKey) {
      problems.push({ code: "locked_dependency", message: `${dayName(a.night)} is locked and this proposal does not keep it with its cooking.` });
    }
  }

  // Current hard exclusions for every newly chosen cooking (kept dinners are flagged, not replaced).
  for (const e of content.events.filter((x) => !x.key.startsWith("keep:"))) {
    const rv = args.recipes.get(e.recipeVersionId);
    if (!rv) {
      problems.push({ code: "incomplete_week", message: "A proposed recipe version no longer exists." });
      continue;
    }
    const eaters = [...new Set(e.allocations.map((a) => a.memberId))];
    const r = checkRecipe(rv, eaters, args.exclusions, args.ingredients);
    if (r.status === "violated") problems.push({ code: "constraint_violation", message: `${rv.title}: ${r.reasons.join("; ")}` });
    if (r.status === "unknown") problems.push({ code: "constraint_unknown", message: `${rv.title}: ${r.reasons.join("; ")}` });
  }
  return { candidate, problems: dedupe(problems) };
}

function dedupe(p: AdmissionProblem[]): AdmissionProblem[] {
  const seen = new Set<string>();
  return p.filter((x) => (seen.has(x.message) ? false : (seen.add(x.message), true)));
}

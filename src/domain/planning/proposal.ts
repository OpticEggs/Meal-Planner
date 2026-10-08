import { hashOf } from "../hash";
import { dayName, nightsOf } from "../dates";
import { defaultPlate } from "../recipes/plate";
import { checkRecipe } from "./constraints";
import type { EffortLevel, Exclusion, Ingredient, NightKind, RecipeVersion } from "../types";

/**
 * Deterministic, explainable proposal generator over the local recipe collection.
 * Hard eligibility first (exclusions incl. unknown ingredient information, "Not for
 * me" from an eater, effort cap), then preference ordering. No hidden optimizer:
 * every reason shown is a recorded fact about the recipe or the household.
 */

export type PreferenceValue = "make_again" | "occasionally" | "not_for_me";

export interface ProposalInputs {
  cookingSessions: number | null; // null -> default 4, labeled as default
  variety: "familiar" | "balanced" | "adventurous" | null;
  maxNewRecipes: number | null;
  maxEffort: EffortLevel | null;
  avoidRecipeIds: string[]; // "Different dinners": rotate away from these
}

export interface ProposalNight {
  night: string;
  kind: NightKind;
  eventKey: string | null;
  recipeVersionId: string | null;
  locked: boolean;
  kept: boolean; // carried over unchanged (locked accepted night)
  reasons: string[];
}

export interface ProposalEvent {
  key: string; // "keep:<eventId>" for a kept event, "p:N" for a proposed one
  recipeVersionId: string;
  cookNight: string;
  allocations: { memberId: string; kind: "dinner" | "lunch"; night: string; componentPortions: Record<string, string> }[];
}

export interface ProposalContent {
  weekStart: string;
  nights: ProposalNight[];
  events: ProposalEvent[];
  unresolved: string[];
}

export interface KeptNight {
  night: string;
  kind: NightKind;
  recipeVersionId: string | null;
  eventId: string | null;
  allocations: ProposalEvent["allocations"];
  cookNight: string | null;
}

export interface ProposalContext {
  weekStart: string;
  members: { id: string; displayName: string }[];
  recipes: RecipeVersion[]; // current versions of non-archived recipes
  preferences: Map<string, Map<string, PreferenceValue>>; // recipeId -> memberId -> value
  interests: Set<string>; // recipeIds saved to Sounds good
  recentRecipeIds: Set<string>; // accepted in the last 14 days
  cookedRecipeIds: Set<string>; // explicitly recorded as cooked, ever
  exclusions: Exclusion[];
  ingredients: Map<string, Ingredient>;
  kept: KeptNight[]; // locked accepted nights; protected
}

const EFFORT_RANK: Record<EffortLevel, number> = { easy: 0, medium: 1, involved: 2 };

export interface ProposalResult {
  content: ProposalContent;
  contentHash: string;
  excluded: { title: string; reason: string }[];
  settingsUsed: { cookingSessions: number; cookingSessionsIsDefault: boolean };
}

export function generateProposal(ctx: ProposalContext, inputs: ProposalInputs): ProposalResult {
  const nights = nightsOf(ctx.weekStart);
  const memberIds = ctx.members.map((m) => m.id);
  const excluded: { title: string; reason: string }[] = [];
  const keptByNight = new Map(ctx.kept.map((k) => [k.night, k]));
  const keptRecipeIds = new Set(
    ctx.kept.map((k) => ctx.recipes.find((r) => r.id === k.recipeVersionId)?.recipeId).filter(Boolean) as string[],
  );

  const eligible: RecipeVersion[] = [];
  for (const r of ctx.recipes) {
    const check = checkRecipe(r, memberIds, ctx.exclusions, ctx.ingredients);
    if (check.status !== "ok") {
      excluded.push({ title: r.title, reason: check.status === "violated" ? check.reasons.join("; ") : check.reasons.join("; ") });
      continue;
    }
    const prefs = ctx.preferences.get(r.recipeId);
    const notFor = memberIds.filter((m) => prefs?.get(m) === "not_for_me");
    if (notFor.length) {
      excluded.push({ title: r.title, reason: `Not for me: ${notFor.map((m) => ctx.members.find((x) => x.id === m)!.displayName).join(", ")}` });
      continue;
    }
    if (inputs.maxEffort && r.effortLevel && EFFORT_RANK[r.effortLevel] > EFFORT_RANK[inputs.maxEffort]) {
      excluded.push({ title: r.title, reason: `Effort ${r.effortLevel} is above your limit (${inputs.maxEffort})` });
      continue;
    }
    if (keptRecipeIds.has(r.recipeId)) continue;
    eligible.push(r);
  }

  const score = (r: RecipeVersion) => {
    let s = 0;
    if (ctx.interests.has(r.recipeId)) s += 3;
    const prefs = ctx.preferences.get(r.recipeId);
    for (const m of memberIds) {
      const v = prefs?.get(m);
      if (v === "make_again") s += 2;
      if (v === "occasionally") s += 0.5;
    }
    if (ctx.recentRecipeIds.has(r.recipeId)) s -= 4;
    const isNew = !ctx.cookedRecipeIds.has(r.recipeId);
    if (isNew && inputs.variety === "familiar") s -= 1.5;
    if (isNew && inputs.variety === "adventurous") s += 1.5;
    if (inputs.avoidRecipeIds.includes(r.recipeId)) s -= 10;
    return s;
  };
  const ranked = eligible.slice().sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

  const sessions = inputs.cookingSessions ?? 4;
  const keptCooks = ctx.kept.filter((k) => k.kind === "cook").length;
  const openNights = nights.filter((n) => !keptByNight.has(n));
  let cooksNeeded = Math.max(0, Math.min(sessions - keptCooks, openNights.length));
  const leftoversNeeded = openNights.length - cooksNeeded;

  // Novelty limit.
  const chosen: RecipeVersion[] = [];
  let newCount = 0;
  const wantLeftoverFriendly = leftoversNeeded > 0;
  const order = wantLeftoverFriendly
    ? [...ranked.filter((r) => r.leftoverFriendly).slice(0, leftoversNeeded), ...ranked]
    : ranked;
  for (const r of order) {
    if (chosen.length >= cooksNeeded) break;
    if (chosen.includes(r)) continue;
    const isNew = !ctx.cookedRecipeIds.has(r.recipeId);
    if (isNew && inputs.maxNewRecipes !== null && newCount >= inputs.maxNewRecipes) continue;
    if (isNew) newCount++;
    chosen.push(r);
  }
  const unresolved: string[] = [];
  if (chosen.length < cooksNeeded) {
    unresolved.push(`Only ${chosen.length} eligible recipe(s) for ${cooksNeeded} cooking session(s).`);
    cooksNeeded = chosen.length;
  }
  // Leftover-friendly cooks first so leftovers can follow them; then by title for stable order.
  const queue = chosen.slice();

  const out: ProposalNight[] = [];
  const events: ProposalEvent[] = [];
  let k = 0;
  let leftoversLeft = openNights.length - cooksNeeded;
  let lastCook: { event: ProposalEvent; rv: RecipeVersion; leftovers: number } | null = null;
  for (const night of nights) {
    const kept = keptByNight.get(night);
    if (kept) {
      const ke = kept.eventId ? events.find((e) => e.key === `keep:${kept.eventId}`) : undefined;
      if (kept.kind === "cook" && kept.eventId && kept.recipeVersionId && !ke) {
        events.push({ key: `keep:${kept.eventId}`, recipeVersionId: kept.recipeVersionId, cookNight: kept.cookNight ?? night, allocations: kept.allocations });
      }
      out.push({
        night,
        kind: kept.kind,
        eventKey: kept.eventId ? `keep:${kept.eventId}` : null,
        recipeVersionId: kept.recipeVersionId,
        locked: true,
        kept: true,
        reasons: ["Locked — kept as accepted"],
      });
      lastCook = null;
      continue;
    }
    // One leftover night per cooking by default; a second only when no cook remains.
    const canLeftover = lastCook && lastCook.rv.leftoverFriendly && lastCook.leftovers < (queue.length === 0 ? 2 : 1) && leftoversLeft > 0;
    if (canLeftover) {
      lastCook!.leftovers += 1;
      leftoversLeft -= 1;
      for (const m of memberIds) {
        lastCook!.event.allocations.push({ memberId: m, kind: "dinner", night, componentPortions: defaultPlate(lastCook!.rv) });
      }
      out.push({
        night,
        kind: "leftover",
        eventKey: lastCook!.event.key,
        recipeVersionId: lastCook!.rv.id,
        locked: false,
        kept: false,
        reasons: [`Leftovers of ${dayName(lastCook!.event.cookNight)}'s ${lastCook!.rv.title} (one cooking covers both nights)`],
      });
      continue;
    }
    const rv = queue.shift();
    if (!rv) {
      unresolved.push(`${dayName(night)} has no dinner: no eligible recipe or leftover source remains.`);
      out.push({ night, kind: "open", eventKey: null, recipeVersionId: null, locked: false, kept: false, reasons: ["Needs a decision"] });
      lastCook = null;
      continue;
    }
    const ev: ProposalEvent = {
      key: `p:${k++}`,
      recipeVersionId: rv.id,
      cookNight: night,
      allocations: memberIds.map((m) => ({ memberId: m, kind: "dinner" as const, night, componentPortions: defaultPlate(rv) })),
    };
    events.push(ev);
    out.push({ night, kind: "cook", eventKey: ev.key, recipeVersionId: rv.id, locked: false, kept: false, reasons: reasonsFor(rv, ctx) });
    lastCook = { event: ev, rv, leftovers: 0 };
  }

  const content: ProposalContent = { weekStart: ctx.weekStart, nights: out, events, unresolved };
  return {
    content,
    contentHash: hashOf(content),
    excluded,
    settingsUsed: { cookingSessions: sessions, cookingSessionsIsDefault: inputs.cookingSessions === null },
  };
}

function reasonsFor(rv: RecipeVersion, ctx: ProposalContext): string[] {
  const reasons: string[] = [];
  if (ctx.interests.has(rv.recipeId)) reasons.push("Saved to Sounds good");
  const prefs = ctx.preferences.get(rv.recipeId);
  for (const m of ctx.members) {
    const v = prefs?.get(m.id);
    if (v === "make_again") reasons.push(`${m.displayName}: Make again`);
    if (v === "occasionally") reasons.push(`${m.displayName}: Occasionally`);
  }
  if (!ctx.cookedRecipeIds.has(rv.recipeId)) reasons.push("New to you — no cooking recorded");
  if (rv.effortMinutes) reasons.push(`About ${rv.effortMinutes} min${rv.estimate ? " (estimate)" : ""}`);
  if (rv.leftoverFriendly) reasons.push("Leftover-friendly");
  return reasons;
}

/** Explains what actually changed between two proposals (open nights only). */
export function explainChange(before: ProposalContent, after: ProposalContent, titles: Map<string, string>): string[] {
  const lines: string[] = [];
  const cooks = (c: ProposalContent) => c.nights.filter((n) => n.kind === "cook").length;
  if (cooks(before) !== cooks(after)) lines.push(`Cooking sessions: ${cooks(before)} → ${cooks(after)}.`);
  for (const n of after.nights) {
    const b = before.nights.find((x) => x.night === n.night);
    if (!b || n.kept) continue;
    const label = (x: ProposalNight) =>
      x.kind === "cook" ? titles.get(x.recipeVersionId!) ?? "?" : x.kind === "leftover" ? `leftovers of ${titles.get(x.recipeVersionId!) ?? "?"}` : x.kind;
    if (label(b) !== label(n)) lines.push(`${dayName(n.night)}: ${label(b)} → ${label(n)}.`);
  }
  const kept = after.nights.filter((n) => n.kept).map((n) => dayName(n.night));
  if (kept.length) lines.push(`Locked nights unchanged: ${kept.join(", ")}.`);
  if (!lines.length) lines.push("No eligible alternative changed the open nights.");
  return lines;
}

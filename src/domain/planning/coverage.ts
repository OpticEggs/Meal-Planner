import { D } from "../units";
import type { LeftoverObservation, PlanState } from "../types";

export type CoverageStatus = "covered" | "out" | "uncovered" | "unresolved";

export interface NightCoverage {
  night: string;
  status: CoverageStatus;
  reason: string | null;
}

/**
 * Meal coverage from accepted choices plus facts. A leftover-shortfall observation can
 * make a dependent night unresolved; the selected dinner itself is never changed here.
 */
export function computeCoverage(state: PlanState, observations: LeftoverObservation[]): NightCoverage[] {
  const shortNights = new Map<string, string>();
  for (const ev of state.events) {
    const obs = observations
      .filter((o) => o.cookingEventId === ev.id)
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
      .at(-1);
    if (!obs) continue;
    let remaining = new D(obs.portionsRemaining);
    const future = state.allocations
      .filter((al) => al.cookingEventId === ev.id && al.night > (ev.cookNight ?? "") && al.night >= obs.observedNight)
      .sort((a, b) => a.night.localeCompare(b.night) || a.kind.localeCompare(b.kind));
    const byNight = new Map<string, number>();
    for (const al of future) byNight.set(al.night, (byNight.get(al.night) ?? 0) + 1);
    for (const [night, plates] of [...byNight].sort()) {
      if (remaining.gte(plates)) {
        remaining = remaining.minus(plates);
      } else {
        shortNights.set(night, `Less left than planned: ${obs.portionsRemaining} portion(s) recorded, ${plates} planned for this night`);
        remaining = new D(0);
      }
    }
  }
  return state.assignments
    .slice()
    .sort((a, b) => a.night.localeCompare(b.night))
    .map((a) => {
      if (a.kind === "out") return { night: a.night, status: "out" as const, reason: null };
      if (a.kind === "open") return { night: a.night, status: "uncovered" as const, reason: "No dinner chosen" };
      const ev = state.events.find((e) => e.id === a.cookingEventId);
      if (!ev || ev.status !== "scheduled" || !ev.cookNight) {
        return { night: a.night, status: "unresolved" as const, reason: "Source cooking event is not scheduled" };
      }
      if (a.kind === "leftover" && ev.cookNight >= a.night) {
        return { night: a.night, status: "unresolved" as const, reason: "Leftovers would come before the cooking" };
      }
      const plates = state.allocations.filter((al) => al.cookingEventId === ev.id && al.night === a.night && al.kind === "dinner");
      if (plates.length === 0) return { night: a.night, status: "unresolved" as const, reason: "No plates allocated" };
      const short = shortNights.get(a.night);
      if (short) return { night: a.night, status: "unresolved" as const, reason: short };
      return { night: a.night, status: "covered" as const, reason: null };
    });
}

export function mealsChosen(coverage: NightCoverage[], violatedNights: string[]): boolean {
  return coverage.length === 7 && coverage.every((c) => c.status === "covered" || c.status === "out") && violatedNights.length === 0;
}

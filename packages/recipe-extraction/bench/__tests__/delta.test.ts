/**
 * The v2 → v3 delta (bench/delta.ts): every figure is compared and each change needs a known reason. On
 * the real historical report the only changes are sensitivity 3(b) (SCORE-01), the scorer's A6 (SCORE-02)
 * and the holdout-v2 set label; everything else — C1, C1+, C2, C3+C4, C5, C7, C8, S1–S8, field accuracy,
 * A1–A5, sensitivity (a), every per-category and per-source figure, the §9 field scores and the pages — is
 * unchanged.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultDeps, parseArgs, run } from "../cli";
import { DELTA_REASONS, delta, deltaMarkdown } from "../delta";
import { HISTORICAL_ENGINES, HISTORICAL_REPORT } from "./helpers";

const rate = (num: number, den: number) => ({ num, den, rate: den ? num / den : null, ci95: null });
function report(plan: string, sens: string, over: { C1?: number; excluded?: number } = {}) {
  const set = {
    status: "dev (development; diagnostics only)",
    aggregate: { lines: 2, ready: 1, needsReview: 1, unsupported: 0, outcomes: { C1: rate(over.C1 ?? 1, 1) }, severe: { S1: rate(0, 2) }, anySevere: rate(0, 2), strict: {}, fieldAccuracyOnReady: {} },
    caseIds: { C1: ["a"] },
    byCategory: { range: { lines: 1, outcomes: { C1: rate(1, 1) } } },
    bySourceKind: null,
    sensitivity: { [sens]: { excluded: over.excluded ?? 0, needsReview: 1, excludedIds: [] } },
  };
  return JSON.stringify({ schema: "s", corpus: { files: [] }, ingredientEngines: [], pages: [], outcomes: { plan, engines: [{ engine: { id: "e" }, sets: { dev: set } }] } });
}

describe("delta tool", () => {
  it("identical figures give no change; a sensitivity change is SCORE-01; any other change is UNEXPECTED", () => {
    const same = delta(report("EVALUATION-PLAN-v2", "needsReviewExcludingBareFoods"), report("EVALUATION-PLAN-v3", "needsReviewExcludingBareNoAmount"));
    expect(same.summary).toMatchObject({ changed: 0, unexpected: 0 });
    expect(same.outsideOutcomes).toMatchObject({ schema: "identical", corpus: "identical", ingredientEngines: "identical", pages: "identical" });
    const sens = delta(report("EVALUATION-PLAN-v2", "needsReviewExcludingBareFoods"), report("EVALUATION-PLAN-v3", "needsReviewExcludingBareNoAmount", { excluded: 1 }));
    expect(sens.figures.filter((f) => f.changed).map((f) => [f.figure, f.reason])).toEqual([["sensitivity(b).excluded", DELTA_REASONS.score01]]);
    const c1 = delta(report("EVALUATION-PLAN-v2", "needsReviewExcludingBareFoods"), report("EVALUATION-PLAN-v3", "needsReviewExcludingBareNoAmount", { C1: 0 }));
    expect(c1.summary.unexpected).toBe(1);
    expect(c1.figures.find((f) => f.changed)).toMatchObject({ figure: "outcomes.C1", old: "1/1", new: "0/1", reason: DELTA_REASONS.unexpected });
    expect(deltaMarkdown(c1)).toContain("Unexpected changes: **1**");
  });

  it("on the historical report: only SCORE-01 sensitivity, the scorer's A6 and the holdout-v2 label change; nothing unexpected", async () => {
    const res = await run(parseArgs(["--engines", HISTORICAL_ENGINES.join(","), "--split", "every", "--pages"]), { ...defaultDeps(), stdout: () => {}, stderr: () => {}, writeFile: () => {}, now: () => 0 });
    const d = delta(readFileSync(HISTORICAL_REPORT, "utf8"), res.json!);
    expect(Object.values(d.outsideOutcomes).every((v) => v === "identical")).toBe(true);
    expect(d.summary.unexpected).toBe(0);
    expect(d.summary.changedByReason).toEqual({ [DELTA_REASONS.score01]: 90, [DELTA_REASONS.setLabel]: 3, [DELTA_REASONS.a6]: 6 });
    const h2 = (engine: string, figure: string) => d.figures.find((f) => f.engine === engine && f.set === "holdout2" && f.figure === figure)!;
    for (const e of HISTORICAL_ENGINES) {
      expect(h2(e, "sensitivity(b).excluded")).toMatchObject({ old: "23", new: "29", changed: true });
      for (const fig of ["outcomes.C1", "outcomes.C1plus", "outcomes.C2High", "outcomes.C2Medium", "outcomes.C3plusC4", "outcomes.C5", "outcomes.C7", "outcomes.C8", "severe.S3", "acceptance.A1.status", "acceptance.A5.status", "sensitivity(a).A1.status"])
        expect(h2(e, fig).changed, `${e} ${fig}`).toBe(false);
    }
    expect(h2("semantic-v1", "outcomes.C1")).toMatchObject({ new: "254/271", changed: false });
  });
});

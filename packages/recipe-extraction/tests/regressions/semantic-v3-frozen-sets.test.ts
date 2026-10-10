// REQUIRED Phase 2C development coverage on the frozen, now EXPOSED label sets (coordinator-owned; the implementation
// worker must not edit it). Classified by the production scorer's per-line classifier (outcomes v3) for `semantic-v3`:
//   - a ready label must be C1 AND fully correct (C1+, every field) — lost qualifiers and notes count (PHASE-2C-PLAN FL-E4);
//   - a needs_review label must be C5 without a wrong pre-fill (not C5b);
//   - an unsupported label must be C7, or C8 (a safe abstention, tallied separately).
// Excluded: the pre-registered debatable cases (holdout-v2 ing-h2-0087; holdout-v3 ing-h3-0297, ing-h3-0311).
// holdout-v3 0104 and 0211 are kept: CONTRACT §13.7 settles them in the direction of their frozen labels.
// Exposed material: passing is required coverage, never evidence of generalisation; no frozen label is changed.
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadIngredientCases } from "../../bench/labels";
import { classifyLine } from "../../bench/outcomes";
import { getEngine } from "../../src/ingredient/engines";

const ENGINE = "semantic-v3";
const FIXTURES = path.join(import.meta.dirname, "../../fixtures");
const EXCLUDED = new Set(["ing-h2-0087", "ing-h3-0297", "ing-h3-0311"]);
const cases = loadIngredientCases(FIXTURES, ["dev", "holdout", "holdout2", "holdout3"]).filter((c) => !EXCLUDED.has(c.id));
const tally = { c1plus: 0, c5: 0, c7: 0, c8: 0 };

describe(`frozen label sets (exposed) — ${ENGINE} (required)`, () => {
  const engine = getEngine(ENGINE);
  for (const c of cases) {
    it(`${c.id} [${c.expect.status}] ${JSON.stringify(c.input).slice(0, 70)}`, () => {
      const o = classifyLine(c, engine.parse(c.input));
      if (c.expect.status === "ready") {
        expect({ outcome: o.outcome, fullyCorrect: o.fullyCorrect }).toEqual({ outcome: "C1", fullyCorrect: true });
        tally.c1plus++;
      } else if (c.expect.status === "needs_review") {
        expect(o.outcome).toBe("C5");
        expect(o.partial).not.toBe("b");
        tally.c5++;
      } else {
        expect(["C7", "C8"]).toContain(o.outcome);
        if (o.outcome === "C8") tally.c8++;
        else tally.c7++;
      }
    });
  }
  afterAll(() => console.info(`[frozen sets] ${cases.length} cases: C1+ ${tally.c1plus}, C5 ${tally.c5}, C7 ${tally.c7}, C8 (safe abstention) ${tally.c8}`));
});

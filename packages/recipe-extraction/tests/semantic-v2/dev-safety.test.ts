/**
 * semantic-v2 on the dev label set (fixtures/ingredients/dev.jsonl, development examples): a safety
 * regression guard, not a score target — no false certainty of any severity, no fabricated amount, no
 * cross-dimension unit, the safety net never used, and every reading validates. Exact match rates are reported
 * by the benchmark, not pinned here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseIngredientJsonl } from "../../bench/labels";
import { scoreIngredients } from "../../bench/score";
import { guardedParse, semanticV2Engine } from "../../src/ingredient/semantic-v2/engine";
import { validateParsedIngredientV1 } from "../../src/validate";

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/ingredients/dev.jsonl");
const cases = parseIngredientJsonl(readFileSync(file, "utf8"), "dev", "ingredients/dev.jsonl");

describe("semantic-v2 on the dev labels: safety", () => {
  const score = scoreIngredients(cases, semanticV2Engine);
  const m = score.overall.metrics;

  it("never needs the safety net, and every reading validates", () => {
    // (engineErrors counts throws from parse(), which the safety net already prevents; `guardedParse`
    // says whether the net was used at all)
    expect(m.engineErrors).toBe(0);
    for (const c of cases) {
      expect(guardedParse(c.input).net, c.id).toBe("none");
      expect(validateParsedIngredientV1(semanticV2Engine.parse(c.input)), c.id).toEqual([]);
    }
  });

  it("is never falsely certain, never fabricates an amount, never crosses dimensions", () => {
    expect(m.falseCertainty.total.num).toBe(0);
    expect(m.fabricatedQuantity.num).toBe(0);
    expect(m.crossDimension.num).toBe(0);
    expect(score.mismatches.filter((x) => x.falseCertainty !== null)).toEqual([]);
  });
});

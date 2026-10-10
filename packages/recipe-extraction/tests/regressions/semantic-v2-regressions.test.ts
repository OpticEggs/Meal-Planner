// REQUIRED Phase 2B development coverage (coordinator-owned): every firm case of the exposed regression corpus must
// read correctly with the candidate engine `semantic-v2`, and every output must satisfy the contract validator.
// These cases are exposed development material — passing them is required coverage, not fresh evidence.
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { getEngine } from "../../src/ingredient/engines";
import { validateParsedIngredientV1 } from "../../src/validate";
import { loadRegressions, mismatches } from "./regression-match";

const ENGINE = "semantic-v2";
const firm = loadRegressions().filter((c) => c.firm);

describe(`exposed regressions 2B — ${ENGINE} (required)`, () => {
  const engine = getEngine(ENGINE); // a missing registration fails the whole file, visibly
  for (const c of firm) {
    it(`${c.id} [${c.family}] ${c.origin.kind}:${c.origin.ref} ${JSON.stringify(c.input).slice(0, 70)}`, () => {
      const got = engine.parse(c.input) as ParsedIngredientV1;
      expect(validateParsedIngredientV1(got)).toEqual([]);
      expect(mismatches(c, got)).toEqual([]);
    });
  }
});

// REQUIRED Phase 2C development coverage (coordinator-owned; the implementation worker must not edit it): every firm
// case of the exposed 2C regression corpus must read correctly with the candidate `semantic-v3`, every output must
// satisfy the contract validator and read identically twice, and every `noAmount` case must carry no amount
// (owner requirement 2, CONTRACT §13.2). For an `unsupported` label a safe abstention (needs_review with no amount,
// unit, package or options) is accepted and reported separately — it is never counted as a correct rejection.
// These cases are exposed development material: passing them is required coverage, not fresh evidence.
import { afterAll, describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { getEngine } from "../../src/ingredient/engines";
import { validateParsedIngredientV1 } from "../../src/validate";
import { CORPUS_FILE_2C, loadRegressions, mismatches, noAmountViolations, safeAbstention } from "./regression-match";

const ENGINE = "semantic-v3";
const firm = loadRegressions(CORPUS_FILE_2C).filter((c) => c.firm);
const tally = { exact: 0, safeAbstention: 0 };

describe(`exposed regressions 2C — ${ENGINE} (required)`, () => {
  const engine = getEngine(ENGINE); // a missing registration fails the whole file, visibly
  for (const c of firm) {
    it(`${c.id} [${c.family}] ${c.origin.kind}:${c.origin.ref} ${JSON.stringify(c.input).slice(0, 70)}`, () => {
      const got = engine.parse(c.input) as ParsedIngredientV1;
      expect(validateParsedIngredientV1(got)).toEqual([]);
      expect(JSON.stringify(engine.parse(c.input))).toBe(JSON.stringify(got));
      expect(noAmountViolations(c, got)).toEqual([]);
      if (safeAbstention(c, got)) tally.safeAbstention++;
      else {
        expect(mismatches(c, got)).toEqual([]);
        tally.exact++;
      }
    });
  }
  afterAll(() => {
    // Reported separately (PHASE-2C-PLAN §5); visible in the test output.
    console.info(`[2C corpus] ${firm.length} firm: ${tally.exact} exact, ${tally.safeAbstention} safe abstentions`);
  });
});

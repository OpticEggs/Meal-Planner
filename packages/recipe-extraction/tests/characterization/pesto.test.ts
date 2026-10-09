/**
 * The owner-reported line `1/3 cup pesto (homemade (or store-bought))`.
 *
 * (i) The recorded baseline: what Table import 2 (frozen at cb7b56e) produces today, in contract v1.
 * (ii) The Phase 2 target, written with `it.fails` against the DEFAULT engine: it is expected to fail
 *      while the default engine is the legacy one. When Phase 2 makes it pass, `it.fails` turns red —
 *      that is the signal to change `it.fails` to `it` (and to re-record the baseline section if the
 *      default engine changed).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_ENGINE_ID, ENGINES, parseIngredientV1, validateParsedIngredientV1 } from "../../src/index";

const LINE = "1/3 cup pesto (homemade (or store-bought))";

describe("pesto: recorded baseline (legacy-table-import-2)", () => {
  it("needs review: the or-rule and the thirds rule fire, the name keeps the amount, nothing is invented", () => {
    const r = ENGINES["legacy-table-import-2"].parse(LINE);
    expect(r).toEqual({
      raw: LINE,
      normalized: LINE,
      status: "needs_review",
      name: "1/3 cup pesto (homemade )",
      quantity: null,
      unit: null,
      packageSize: null,
      equivalents: [],
      form: null,
      note: "or store-bought",
      alternatives: [],
      optional: false,
      approximate: false,
      amountUnstated: null,
      reasons: ["legacy_contains_or", "legacy_fraction_not_exact_decimal"],
      evidence: { spans: {} },
    });
    expect(validateParsedIngredientV1(r)).toEqual([]);
  });

  it("the +suggestion engine has no suggestion to apply: same fields, no legacy_suggestion_applied", () => {
    const r = ENGINES["legacy-table-import-2+suggestion"].parse(LINE);
    expect(r).toEqual(ENGINES["legacy-table-import-2"].parse(LINE));
    expect(r.reasons).not.toContain("legacy_suggestion_applied");
  });
});

describe("pesto: Phase 2 target (default engine)", () => {
  // Expected to FAIL in Phase 1 (the default engine is the faithful legacy one). When a Phase 2 engine
  // becomes the default and reads this line correctly, this `it.fails` turns red and must become `it`.
  it.fails(`${DEFAULT_ENGINE_ID} reads it as 1/3 cup pesto, note "homemade or store-bought"`, () => {
    const r = parseIngredientV1(LINE);
    expect(r.status).toBe("ready");
    expect(r.name).toBe("pesto");
    expect(r.quantity).toMatchObject({ kind: "exact", numerator: "1", denominator: "3" });
    expect(r.unit).toMatchObject({ canonical: "cup" });
    expect(r.note).toBe("homemade or store-bought");
    expect(r.alternatives).toEqual([]);
  });
});

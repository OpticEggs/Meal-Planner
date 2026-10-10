/**
 * The owner-reported line `1/3 cup pesto (homemade (or store-bought))`.
 *
 * (i) The recorded baseline: what Table import 2 (frozen at cb7b56e) produces today, in contract v1.
 * (ii) The Phase 2 target, now a normal test against the Phase 2 engine `semantic-v1` by id (the
 *      default engine is unchanged until the predeclared acceptance criteria are met; when the default
 *      changes, this section can be pointed at the default again).
 * (iii) Regression: the hyphenated mixed number `1-1/2 cups milk` is exactly 3/2 cup and ready — not a
 *      range (the legacy reading, whose suggestion was the wrong amount 1 cup).
 */
import { describe, expect, it } from "vitest";
import { ENGINES, parseIngredientV1, validateParsedIngredientV1 } from "../../src/index";

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

describe("pesto: Phase 2 target (semantic-v1)", () => {
  it("semantic-v1 reads it as exactly 1/3 cup pesto, note \"homemade or store-bought\", no alternatives", () => {
    const r = parseIngredientV1(LINE, { engine: "semantic-v1" });
    expect(r.status).toBe("ready");
    expect(r.name).toBe("pesto");
    expect(r.quantity).toEqual({ kind: "exact", numerator: "1", denominator: "3", display: "1/3" });
    expect(r.unit).toEqual({ canonical: "cup", dimension: "volume", source: "cup" });
    expect(r.note).toBe("homemade or store-bought");
    expect(r.alternatives).toEqual([]);
    expect(r.packageSize).toBeNull();
    expect(r.reasons).toEqual([]);
    expect(validateParsedIngredientV1(r)).toEqual([]);
    expect(ENGINES["semantic-v1"].parse(LINE)).toEqual(r);
  });

  it("the same line with 1/2, and its legacy-defect variants, read cleanly too", () => {
    expect(parseIngredientV1("1/2 cup pesto (homemade (or store-bought))", { engine: "semantic-v1" })).toMatchObject({
      status: "ready", name: "pesto", quantity: { numerator: "1", denominator: "2" }, note: "homemade or store-bought", alternatives: [],
    });
    expect(parseIngredientV1("⅓ cup pesto (homemade or store-bought)", { engine: "semantic-v1" })).toMatchObject({
      status: "ready", name: "pesto", quantity: { numerator: "1", denominator: "3" }, note: "homemade or store-bought",
    });
  });
});

describe("regression: 1-1/2 cups milk (semantic-v1)", () => {
  it("is exactly 3/2 cup and ready — a mixed number, not a range", () => {
    const r = parseIngredientV1("1-1/2 cups milk", { engine: "semantic-v1" });
    expect(r).toMatchObject({
      status: "ready",
      name: "milk",
      quantity: { kind: "exact", numerator: "3", denominator: "2", display: "1 1/2" },
      unit: { canonical: "cup", dimension: "volume", source: "cups" },
      reasons: [],
    });
    expect(r.reasons).not.toContain("quantity_range");
    expect(validateParsedIngredientV1(r)).toEqual([]);
  });

  it("the legacy reading of the same line is recorded for contrast: a range, no amount", () => {
    const r = ENGINES["legacy-table-import-2"].parse("1-1/2 cups milk");
    expect(r).toMatchObject({ status: "needs_review", quantity: null, reasons: ["quantity_range"] });
  });
});

describe("pesto: Phase 2B candidate (semantic-v2)", () => {
  it("semantic-v2 reads it exactly as semantic-v1 does: 1/3 cup pesto, note \"homemade or store-bought\", no alternatives", () => {
    const r = parseIngredientV1(LINE, { engine: "semantic-v2" });
    expect(r).toMatchObject({
      status: "ready",
      name: "pesto",
      quantity: { kind: "exact", numerator: "1", denominator: "3", display: "1/3" },
      unit: { canonical: "cup", dimension: "volume", source: "cup" },
      note: "homemade or store-bought",
      alternatives: [],
      packageSize: null,
      reasons: [],
    });
    expect(validateParsedIngredientV1(r)).toEqual([]);
    expect(ENGINES["semantic-v2"].parse(LINE)).toEqual(r);
    expect(parseIngredientV1("1-1/2 cups milk", { engine: "semantic-v2" })).toMatchObject({
      status: "ready", name: "milk", quantity: { kind: "exact", numerator: "3", denominator: "2" }, unit: { canonical: "cup" }, reasons: [],
    });
  });
});

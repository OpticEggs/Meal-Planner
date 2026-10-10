import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { alternativeSet, canonicalLine, compareIngredient, normalizeText, noteTokens, sameLines } from "../compare";
import { labelToReading } from "../controls";
import { loadIngredientCases } from "../labels";
import type { IngredientCase } from "../types";
import { FIXTURES } from "./helpers";

const cases = loadIngredientCases(FIXTURES);
const byInput = (input: string) => cases.find((c) => c.input === input)!;
const reading = (c: IngredientCase, patch: Partial<ParsedIngredientV1> = {}): ParsedIngredientV1 => ({ ...labelToReading(c), ...patch });
const q = (n: string, d: string, display = `${n}/${d}`) => ({ kind: "exact" as const, numerator: n, denominator: d, display });

describe("§9 normalization", () => {
  it("names: NFKC, lowercase, collapsed whitespace, edge punctuation trimmed; empty is null", () => {
    expect(normalizeText("ＦＬＯＵＲ")).toBe("flour");
    expect(normalizeText("  Red   Bell Pepper. ")).toBe("red bell pepper");
    expect(normalizeText("(pesto)")).toBe("pesto");
    expect(normalizeText("2% milk")).toBe("2% milk");
    expect(normalizeText("crème fraîche")).toBe("crème fraîche");
    expect(normalizeText(" .. ")).toBeNull();
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText(42)).toBeNull();
  });

  it("notes: a sorted token bag ignoring ( ) , ; :", () => {
    expect(noteTokens("medium; diced")).toEqual(noteTokens("diced, medium"));
    expect(noteTokens("homemade or store-bought")).toEqual(noteTokens("(homemade (or store-bought))"));
    expect(noteTokens("Fresh or frozen; pitted")).toEqual(["fresh", "frozen", "or", "pitted"]);
    expect(noteTokens(null)).toEqual([]);
    expect(noteTokens("")).toEqual([]);
    expect(noteTokens("chopped")).not.toEqual(noteTokens("minced"));
  });

  it("alternatives: a set of normalized names", () => {
    expect(alternativeSet(["Milk", "cream"])).toEqual(alternativeSet(["cream", "milk "]));
    expect(alternativeSet(["milk", "milk"])).toEqual(["milk"]);
    expect(alternativeSet("milk")).toEqual([]);
  });

  it("page ingredient lines: whitespace canonicalized (a decoded &nbsp; equals a space), nothing else", () => {
    expect(canonicalLine("4 cups  stock ")).toBe("4 cups stock");
    expect(sameLines(["1 cinnamon stick"], ["1 cinnamon stick"])).toBe(true);
    expect(sameLines(["½ cup rice"], ["&frac12; cup rice"])).toBe(false);
    expect(sameLines(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameLines(["a"], "a")).toBe(false);
  });
});

describe("per-field comparison", () => {
  it("the label's own reading matches on every field", () => {
    for (const c of cases) {
      const r = compareIngredient(c, labelToReading(c));
      expect(r.mismatches, c.id).toEqual([]);
      expect(r.falseCertainty, c.id).toBeNull();
    }
  });

  it("quantities compare as exact rationals; display text is ignored; non-canonical strings never match", () => {
    const c = byInput(".5 tsp baking soda");
    expect(compareIngredient(c, reading(c, { quantity: q("1", "2", "0.5") })).fields.quantity.strict).toBe(true);
    expect(compareIngredient(c, reading(c, { quantity: q("2", "4") })).fields.quantity.strict).toBe(false);
    expect(compareIngredient(c, reading(c, { quantity: q("5", "10") })).fields.quantity.strict).toBe(false);
    const third = byInput("1/3 cup olive oil");
    const rounded = compareIngredient(third, reading(third, { quantity: q("3333", "10000", "0.3333") }));
    expect(rounded.fields.quantity.strict).toBe(false);
    expect(rounded.falseCertainty).toEqual({ kind: "wrong_amount", severity: "high" });
  });

  it("ranges compare both ends; an exact reading of a range label is wrong", () => {
    const c = byInput("2-3 cloves garlic, minced");
    expect(compareIngredient(c, labelToReading(c)).fields.quantity.strict).toBe(true);
    const r = compareIngredient(c, reading(c, { quantity: { kind: "range", min: q("2", "1", "2"), max: q("4", "1", "4"), display: "2–4" } }));
    expect(r.fields.quantity.strict).toBe(false);
    expect(compareIngredient(c, reading(c, { quantity: q("2", "1", "2") })).fields.quantity.strict).toBe(false);
  });

  it("oz vs fl_oz: unit mismatch and cross-dimension; package sizes too", () => {
    const c = byInput("2 oz cheese");
    const r = compareIngredient(c, reading(c, { unit: { canonical: "fl_oz", dimension: "volume", source: "oz" } }));
    expect(r.fields.unit.strict).toBe(false);
    expect(r.crossDimension).toBe(true);
    expect(r.crossDimensionApplicable).toBe(true);
    const can = byInput("2 (15 oz) cans black beans, drained");
    const p = compareIngredient(can, reading(can, { packageSize: { quantity: q("15", "1", "15"), unit: { canonical: "fl_oz", dimension: "volume", source: "oz" } } }));
    expect(p.fields.packageSize.strict).toBe(false);
    expect(p.crossDimension).toBe(true);
    expect(p.falseCertainty).toEqual({ kind: "wrong_amount", severity: "high" });
    const same = compareIngredient(c, reading(c, { unit: { canonical: "lb", dimension: "mass", source: "lb" } }));
    expect(same.fields.unit.strict).toBe(false);
    expect(same.crossDimension).toBe(false);
  });

  it("accept values count as accepted, never strict", () => {
    const c = byInput("1⁄2 cup chopped walnuts");
    const r = compareIngredient(c, reading(c, { name: "walnuts", note: "chopped" }));
    expect(r.fields.name).toEqual({ strict: false, accepted: true });
    expect(r.fields.note).toEqual({ strict: false, accepted: true });
    expect(r.corePass).toEqual({ strict: false, accepted: true });
    expect(r.falseCertainty).toBeNull();
    expect(r.detailOnlyMismatch).toBe(false);
    const alt = byInput("1 lb ground beef or turkey");
    expect(compareIngredient(alt, reading(alt, { alternatives: ["Turkey", "ground beef"] })).fields.alternatives).toEqual({ strict: false, accepted: true });
  });

  it("false certainty: suppressed ambiguity uses the case severity; wrong name is medium; note-only is separate", () => {
    const range = byInput("3-4 lb pork shoulder");
    expect(compareIngredient(range, reading(range, { status: "ready", quantity: q("3", "1", "3") })).falseCertainty).toEqual({ kind: "suppressed_ambiguity", severity: "high" });
    const flakes = byInput("1/2-1 tsp red pepper flakes");
    expect(compareIngredient(flakes, reading(flakes, { status: "ready" })).falseCertainty).toEqual({ kind: "suppressed_ambiguity", severity: "low" });
    const onion = byInput("1 medium onion, diced");
    expect(compareIngredient(onion, reading(onion, { name: "medium onion" })).falseCertainty).toEqual({ kind: "wrong_name", severity: "medium" });
    const note = compareIngredient(onion, reading(onion, { note: "diced" }));
    expect(note.falseCertainty).toBeNull();
    expect(note.detailOnlyMismatch).toBe(true);
    const review = compareIngredient(onion, reading(onion, { status: "needs_review", name: "medium onion" }));
    expect(review.falseCertainty).toBeNull();
  });

  it("fabricated quantity: an amount where the label has none", () => {
    const c = byInput("salt to taste");
    const r = compareIngredient(c, reading(c, { quantity: q("1", "1", "1"), unit: { canonical: "pinch", dimension: "imprecise", source: "" } }));
    expect(r.fabricatedQuantity).toBe(true);
    expect(r.crossDimensionApplicable).toBe(false);
    const amb = byInput("1,5 kg potatoes");
    expect(compareIngredient(amb, reading(amb, { quantity: q("3", "2", "1.5") })).fabricatedQuantity).toBe(true);
  });

  it("a malformed reading is a mismatch, not a crash", () => {
    const c = byInput("3 cloves garlic");
    const r = compareIngredient(c, { status: "ready" } as unknown as ParsedIngredientV1);
    expect(r.fields.name.strict).toBe(false);
    expect(r.fields.quantity.strict).toBe(false);
    expect(r.fields.alternatives.strict).toBe(false);
    expect(r.falseCertainty?.kind).toBe("wrong_amount");
    expect(r.mismatches.every((m) => typeof m.expected === "string" && typeof m.got === "string")).toBe(true);
  });
});

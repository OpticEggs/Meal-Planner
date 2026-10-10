// The Phase 2B regression corpus loads, is well-formed, and its comparator decides hand-checked cases correctly.
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { getEngine } from "../../src/ingredient/engines";
import { loadRegressions, mismatches, parseAmount, type RegressionCase } from "./regression-match";

const corpus = loadRegressions();

describe("exposed regression corpus 2B", () => {
  it("has unique ids and inputs, every family tagged, every status known", () => {
    expect(new Set(corpus.map((c) => c.id)).size).toBe(corpus.length);
    expect(new Set(corpus.map((c) => c.input.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim())).size).toBe(corpus.length);
    for (const c of corpus) {
      expect(["A", "B", "C", "D", "-"]).toContain(c.family);
      expect(["ready", "needs_review", "unsupported"]).toContain(c.expect.status);
    }
  });
  it("contains every published failure group", () => {
    const refs = new Set(corpus.map((c) => c.origin.ref));
    for (const r of ["ing-h2-0054", "ing-h2-0165", "ing-h2-0219", "ing-h2-0087", "ing-h2-0286", "ing-hold-0031", "K1", "K2", "K3", "K4", "FH-SF1", "FH-SF2", "FH-SF3", "FH-SF4", "R3-S1"]) expect(refs.has(r)).toBe(true);
    expect(corpus.length).toBeGreaterThanOrEqual(850);
  });
  it("parses label amounts exactly", () => {
    expect(parseAmount("1 1/2")).toEqual({ n: 3n, d: 2n });
    expect(parseAmount("14.5")).toEqual({ n: 29n, d: 2n });
    expect(parseAmount("2/4")).toEqual({ n: 1n, d: 2n });
    expect(parseAmount("x")).toBeNull();
  });
  it("comparator: hand-checked match, field mismatch, accepted name, alternatives as a set, '*' unchecked", () => {
    const parse = (s: string) => getEngine("legacy-table-import-2").parse(s) as ParsedIngredientV1;
    const base: RegressionCase = {
      id: "t", input: "2 cups flour", origin: { kind: "test", ref: "t" }, family: "A", firm: true, alsoIn: [],
      expect: { status: "ready", name: "flour", acceptNames: [], quantity: "2", unit: "cup", packageSize: null, alternatives: [], acceptAlternatives: [] },
    };
    expect(mismatches(base, parse("2 cups flour"))).toEqual([]);
    expect(mismatches({ ...base, expect: { ...base.expect, quantity: "3" } }, parse("2 cups flour"))).toHaveLength(1);
    expect(mismatches({ ...base, expect: { ...base.expect, name: "all-purpose flour", acceptNames: ["flour"] } }, parse("2 cups flour"))).toEqual([]);
    expect(mismatches({ ...base, expect: { ...base.expect, unit: "*", quantity: "*", name: "*" } }, parse("2 cups flour"))).toEqual([]);
    const reading = { ...parse("2 cups flour"), alternatives: ["B", "a"] } as ParsedIngredientV1;
    expect(mismatches({ ...base, expect: { ...base.expect, alternatives: ["a", "b"] } }, reading)).toEqual([]);
    expect(mismatches({ ...base, expect: { ...base.expect, alternatives: ["a"], acceptAlternatives: [["a", "b"]] } }, reading)).toEqual([]);
    expect(mismatches({ ...base, expect: { ...base.expect, alternatives: ["a", "c"] } }, reading)).toHaveLength(1);
  });
  it("comparator: an unsupported label accepts a safe abstention (review, no amount/unit/package/options) and nothing else", () => {
    const unsupported: RegressionCase = {
      id: "t", input: "1 comal", origin: { kind: "test", ref: "t" }, family: "D", firm: true, alsoIn: [],
      expect: { status: "unsupported", name: null, acceptNames: [], quantity: null, unit: null, packageSize: null, alternatives: [], acceptAlternatives: [] },
    };
    const reading = getEngine("legacy-table-import-2").parse("2 cups flour") as ParsedIngredientV1;
    const abstain = { ...reading, status: "needs_review", name: "comal", quantity: null, unit: null, packageSize: null, alternatives: [] } as ParsedIngredientV1;
    expect(mismatches(unsupported, abstain)).toEqual([]);
    expect(mismatches(unsupported, { ...abstain, quantity: reading.quantity } as ParsedIngredientV1).length).toBeGreaterThan(0); // S1 risk
    expect(mismatches(unsupported, { ...abstain, status: "ready" } as ParsedIngredientV1).length).toBeGreaterThan(0); // S8
  });
});

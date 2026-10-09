/**
 * Differential parity: the frozen copy of Table's ingredient-line parser (src/legacy) against the live
 * Table module, over the whole ingredient corpus. Every output — including `suggestion` and
 * `suggestionNote` — must be deep-equal.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import * as live from "@/server/integrations/recipe-import/ingredient-line";
import * as liveUnits from "@/domain/units";
import * as frozen from "../../src/legacy/ingredient-line";
import * as frozenUnits from "../../src/legacy/units";
import { ingredientCorpus, NON_STRING_INPUTS, RANDOM_COUNT } from "./corpus";

const show = (s: unknown) => (typeof s === "string" ? JSON.stringify(s.length > 120 ? `${s.slice(0, 120)}…(${s.length})` : s) : String(s));

function mismatches<T>(inputs: readonly unknown[], a: (x: never) => T, b: (x: never) => T): string[] {
  const out: string[] = [];
  for (const x of inputs) {
    const l = a(x as never);
    const f = b(x as never);
    if (!isDeepStrictEqual(l, f)) {
      out.push(`${show(x)}\n  live:   ${JSON.stringify(l)?.slice(0, 400)}\n  frozen: ${JSON.stringify(f)?.slice(0, 400)}`);
      if (out.length >= 20) break;
    }
  }
  return out;
}

describe("ingredient-line parity (frozen copy vs live Table module)", () => {
  const corpus = ingredientCorpus();

  it("the corpus has the promised sizes", () => {
    expect(corpus.literals.length).toBeGreaterThan(500);
    expect(corpus.random.length).toBe(RANDOM_COUNT);
    expect(corpus.random.length).toBeGreaterThanOrEqual(20_000);
    expect(corpus.all.length).toBe(corpus.literals.length + corpus.sweep.length + corpus.hostile.length + corpus.random.length);
  });

  it.each([
    ["Table test literals", "literals"],
    ["Table property sweep", "sweep"],
    ["hostile lines", "hostile"],
    ["seeded random lines", "random"],
  ] as const)("parseIngredientLine is deep-equal over the %s", (_label, key) => {
    expect(mismatches(corpus[key], live.parseIngredientLine, frozen.parseIngredientLine)).toEqual([]);
  });

  it("parseIngredientLine is deep-equal for non-string inputs", () => {
    expect(mismatches(NON_STRING_INPUTS, live.parseIngredientLine, frozen.parseIngredientLine)).toEqual([]);
  });

  it("splitNote is deep-equal over the corpus", () => {
    const short = corpus.all.filter((s) => s.length <= 2_000);
    expect(mismatches(short, live.splitNote, frozen.splitNote)).toEqual([]);
  });

  it("exports the same constants and unit table", () => {
    expect(frozen.MAX_QUANTITY).toBe(live.MAX_QUANTITY);
    expect(frozenUnits.KNOWN_UNITS).toEqual(liveUnits.KNOWN_UNITS);
    const words = [...new Set([...corpus.literals, ...corpus.random.slice(0, 2_000)].flatMap((s) => s.split(/\s+/)))];
    words.push("fl oz", "fluid ounce", "fluid ounces", " Cups. ", "EA.", "Items", "toString", "__proto__", "constructor");
    expect(mismatches(words, liveUnits.normalizeUnit, frozenUnits.normalizeUnit)).toEqual([]);
  });

  it("the parity corpus exercises every legacy outcome", () => {
    const reasons = new Set<string>();
    let parsed = 0;
    let use = 0;
    let leaveOut = 0;
    for (const line of corpus.all) {
      const r = frozen.parseIngredientLine(line);
      if (r.status === "parsed") parsed++;
      for (const x of r.reasons) reasons.add(x.startsWith("unit not supported: ") ? "unit not supported: *" : x);
      if (r.suggestion?.use) use++;
      if (r.suggestion && !r.suggestion.use) leaveOut++;
    }
    expect([...reasons].sort()).toEqual(
      [
        "alternatives (or)", "empty line", "fraction not exact as a decimal", "implausible quantity", "invalid fraction", "more than one quantity", "no fixed quantity",
        "no ingredient name", "no quantity", "non-positive quantity", "parenthetical package size or note with numbers", "quantity range", "unit not supported: *",
        "unrecognized number format", "unrecognized quantity",
      ].sort(),
    );
    expect(parsed).toBeGreaterThan(2_000);
    expect(use).toBeGreaterThan(2_000);
    expect(leaveOut).toBeGreaterThan(200);
  });
});

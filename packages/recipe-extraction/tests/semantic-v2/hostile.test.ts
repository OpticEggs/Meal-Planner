/**
 * semantic-v2 on hostile input: never throws, stays fast, always valid, and a cut line is flagged.
 * The engine reads at most LIMITS.maxLineChars characters, so every line is bounded work.
 */
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { LIMITS } from "../../src/contract";
import { parseSemanticUnchecked, semanticV2Engine } from "../../src/ingredient/semantic-v2/engine";
import { validateParsedIngredientV1 } from "../../src/validate";
import { generateLines } from "./generate";

/** Generous per-line bound for CI machines; typical lines take well under a millisecond. */
const PER_LINE_MS = 250;

const HOSTILE: [string, string][] = [
  ["100k digits", "1".repeat(100_000)],
  ["100k characters of words", "flour ".repeat(17_000)],
  ["100k spaces before the unit", `1 ${" ".repeat(100_000)}cup`],
  ["10k nested brackets", `1 cup ${"(".repeat(10_000)}flour${")".repeat(10_000)}`],
  ["10k unclosed brackets", `1 ${"(".repeat(10_000)}`],
  ["10k stray closers", `1 cup flour ${")".repeat(10_000)}`],
  ["10k mixed brackets", `1 cup ${"([{".repeat(3_400)}`],
  ["nested mixed groups", `1 cup ${"(a(b(c".repeat(5_000)}`],
  ["10k vulgar fractions", "½".repeat(10_000)],
  ["10k fraction slashes", "1/".repeat(10_000)],
  ["thousands of ors between amounts", `${"1 or ".repeat(10_000)}2 eggs`],
  ["thousands of ors between foods", `1 cup ${"milk or ".repeat(10_000)}cream`],
  ["thousands of ors in a remark", `1 cup milk (${"fresh or ".repeat(5_000)}frozen)`],
  ["thousands of commas", `1 cup ${"a, ".repeat(10_000)}`],
  ["thousands of ranges", `${"2-".repeat(10_000)}3 cups`],
  ["10k prices", `1 cup flour ${"($0.16) ".repeat(10_000)}`],
  ["10k package groups", `1 ${"(15 oz) ".repeat(5_000)}can beans`],
  ["10k bidi controls", `${"‮⁦".repeat(10_000)}1 cup milk`],
  ["10k NUL characters", `1 cup${"\u0000".repeat(10_000)}milk`],
  ["50k surrogate pairs", "😀".repeat(50_000)],
  ["lone surrogates", "𐀀\ud800 1 cup \udfff milk".repeat(1_000)],
  ["many number words", `${"a dozen ".repeat(5_000)}eggs`],
  ["many plus signs", `1 cup ${"plus 1 tbsp ".repeat(2_000)}flour`],
  ["many size words", `2 ${"large ".repeat(10_000)}eggs`],
  ["long decimal", `0.${"0".repeat(5_000)}1 g salt`],
  ["huge number with fraction", `${"9".repeat(400)} 1/2 cups flour`],
];

describe("hostile lines", () => {
  it.each(HOSTILE)("%s: no throw, bounded, valid", (_label, line) => {
    const t0 = performance.now();
    const r = parseSemanticUnchecked(line);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(PER_LINE_MS);
    expect(validateParsedIngredientV1(r)).toEqual([]);
    expect(r.raw).toBe(line);
    expect(r.normalized.length).toBeLessThanOrEqual(LIMITS.maxLineChars);
    expect(semanticV2Engine.parse(line)).toEqual(r);
  });

  it("flags a line cut at 500 characters (and only then); a cut line is never ready", () => {
    const at500 = `2 cups ${"a".repeat(493)}`;
    expect(semanticV2Engine.parse(at500)).toMatchObject({ status: "ready", reasons: [] });
    const at501 = `${at500}a`;
    const r = semanticV2Engine.parse(at501);
    expect(r).toMatchObject({ status: "needs_review", normalized: at500 });
    expect(r.reasons[0]).toBe("input_truncated");
    expect(semanticV2Engine.parse(`${" ".repeat(2_000)}2 cups flour${" ".repeat(2_000)}`)).toMatchObject({ status: "ready", reasons: [] });
  });

  it("non-string input reads as an empty line", () => {
    for (const x of [null, undefined, 42, {}, [], Symbol.for("x"), BigInt(1)]) {
      expect(semanticV2Engine.parse(x as unknown as string)).toMatchObject({ raw: "", normalized: "", status: "unsupported", reasons: ["empty_line"] });
    }
  });

  it("is fast on ordinary lines: 20 000 generated lines well within a few seconds", () => {
    const lines = generateLines(0x7e11, 20_000);
    const t0 = performance.now();
    for (const l of lines) semanticV2Engine.parse(l);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(20_000); // generous for slow CI; typical ≈ 0.1 ms per line
  });
});

describe("public API", () => {
  it("exports the engine id and registers the engine by it (the default engine is unchanged)", async () => {
    const api = await import("../../src/index");
    expect(api.SEMANTIC_V2_ENGINE_ID).toBe("semantic-v2");
    expect(api.ENGINES["semantic-v2"]).toBe(semanticV2Engine);
    expect(api.getEngine("semantic-v2").description).toBe("Phase 2B semantic ingredient reader, repaired families A–D (contract v1)");
    expect(api.DEFAULT_ENGINE_ID).toBe("legacy-table-import-2");
    expect(api.parseIngredientV1("1/3 cup pesto", { engine: "semantic-v2" })).toEqual(semanticV2Engine.parse("1/3 cup pesto"));
  });
});

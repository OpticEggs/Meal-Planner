/**
 * Hostile input: nothing throws, every case finishes well within a generous bound, and every output
 * still validates against the contract.
 */
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { ENGINES, extractRecipePage, LIMITS, validateParsedIngredientV1, validateRecipeExtractionV1 } from "../../src/index";

const BOUND_MS = 3_000;
const INPUT = { requestedUrl: "https://www.example.com/r/", finalUrl: "https://www.example.com/r/" };

function timed<T>(fn: () => T): { value: T; ms: number } {
  const t0 = performance.now();
  const value = fn();
  return { value, ms: performance.now() - t0 };
}

const LINES: [string, string][] = [
  ["100k digits", "1".repeat(100_000)],
  ["100k characters of words", "flour ".repeat(17_000)],
  ["100k spaces before the unit", `1 ${" ".repeat(100_000)}cup`],
  ["10k nested parentheses", `1 cup ${"(".repeat(10_000)}flour${")".repeat(10_000)}`],
  ["10k unbalanced parentheses", `1 ${"(".repeat(10_000)}`],
  ["10k vulgar fractions", "½".repeat(10_000)],
  ["10k vulgar fractions after an amount", `1 ${"⅓".repeat(10_000)} cup`],
  ["10k fraction slashes", "1/".repeat(10_000)],
  ["10k ors", `${"1 or ".repeat(10_000)}2 eggs`],
  ["10k prices", `1 cup flour ${"($0.16) ".repeat(10_000)}`],
  ["10k bidi controls", `${"‮⁦".repeat(10_000)}1 cup milk`],
  ["10k NUL characters", `1 cup${"\u0000".repeat(10_000)}milk`],
  ["50k surrogate pairs", "😀".repeat(50_000)],
  ["lone surrogates", "𐀀\ud800 1 cup \udfff milk".repeat(1_000)],
  ["nested mixed brackets", `1 cup ${"(a(b(c".repeat(5_000)}`],
];

describe("hostile ingredient lines", () => {
  it.each(LINES)("%s: no throw, bounded, valid (both engines)", (_label, line) => {
    for (const engine of Object.values(ENGINES)) {
      const { value, ms } = timed(() => engine.parse(line));
      expect(ms).toBeLessThan(BOUND_MS);
      expect(validateParsedIngredientV1(value)).toEqual([]);
      expect(value.normalized.length).toBeLessThanOrEqual(LIMITS.maxLineChars);
      expect(value.raw).toBe(line);
    }
  });
});

const ld = (body: string) => `<script type="application/ld+json">${body}</script>`;
const MiB = 1024 * 1024;
/** `unit` repeated to just under 8 MiB (and so within LIMITS.maxHtmlChars). */
const fill = (unit: string) => unit.repeat(Math.floor((8 * MiB - 1) / unit.length));

const PAGES: [string, () => string, RegExp | null][] = [
  ["one character over the limit", () => "<".repeat(LIMITS.maxHtmlChars + 1), /input_too_large/],
  ["~8 MiB of script tags", () => fill("<script>var a=1;</script>"), /script_tags_limit/],
  ["~8 MiB of JSON-LD script tags", () => fill(ld('{"@type":"Thing"}')), /jsonld_blocks_limit/],
  ["~8 MiB of unterminated script tags", () => fill("<script a='"), null],
  ["deeply nested JSON-LD (100k levels)", () => ld(`${"[".repeat(100_000)}${"]".repeat(100_000)}`), /jsonld_too_deep/],
  ["deeply nested objects (in budget)", () => ld(`${'{"@graph":['.repeat(60)}{"@type":"Recipe","name":"R","recipeIngredient":["1 cup a"]}${"]}".repeat(60)}`), null],
  ["an over-large JSON-LD block", () => ld(`{"@type":"Recipe","name":"${"x".repeat(600 * 1024)}"}`), /jsonld_block_too_large/],
  ["more than 20 recipes", () => ld(JSON.stringify(Array.from({ length: 25 }, (_v, i) => ({ "@type": "Recipe", name: `R${i}`, recipeIngredient: ["1 cup a"] })))), /recipes_limit/],
  ["more than 10k JSON-LD nodes", () => ld(JSON.stringify([{ "@type": "Recipe", name: "R", recipeIngredient: ["1 cup a"] }, ...Array.from({ length: 12_000 }, () => ({}))])), /nodes_limit/],
  [
    "huge microdata: 100k itemprops",
    () => `<div itemscope itemtype="https://schema.org/Recipe">${'<span itemprop="recipeIngredient">1 cup a</span>'.repeat(100_000)}</div>`,
    /microdata/,
  ],
  [
    "huge microdata: 50k nested divs",
    () => `<div itemscope itemtype="http://schema.org/Recipe"><span itemprop="name">R</span>${"<div>".repeat(50_000)}<li itemprop="recipeIngredient">1 cup a</li>${"</div>".repeat(50_000)}</div>`,
    /microdata/,
  ],
  ["~8 MiB of meta tags", () => fill('<meta property="og:title" content="x">'), null],
  ["~8 MiB of unclosed comments and tags", () => `${"<!--".repeat(MiB)}${"<a ".repeat(MiB)}`, null],
  ["entity soup", () => ld(JSON.stringify({ "@type": "Recipe", name: "&#x202E;&lt;script&gt;".repeat(10_000), recipeIngredient: ["&frac13; cup &amp; sugar".repeat(1_000)] })), null],
];

describe("hostile pages", () => {
  it.each(PAGES)("%s: no throw, bounded, valid", (_label, make, expected) => {
    const html = make();
    expect(html.length).toBeGreaterThan(0);
    const { value, ms } = timed(() => extractRecipePage(html, INPUT));
    expect(ms).toBeLessThan(BOUND_MS);
    expect(validateRecipeExtractionV1(value)).toEqual([]);
    if (expected) expect(value.diagnostics.map((d) => d.code).join(" ")).toMatch(expected);
    for (const d of value.diagnostics) expect(d.detail ?? "").not.toMatch(/<[a-z!/]/i); // never page HTML
  });

  it("refuses an over-limit page quickly without reading it", () => {
    const html = "<".repeat(LIMITS.maxHtmlChars + 1);
    const { value, ms } = timed(() => extractRecipePage(html, INPUT));
    expect(ms).toBeLessThan(50);
    expect(value.diagnostics.map((d) => d.code)).toEqual(["input_too_large"]);
    expect(value.candidates).toEqual([]);
  });

  it("hostile addresses never throw", () => {
    for (const u of [null, undefined, 5, {}, "", "javascript:alert(1)", "https://[::1]/", `https://${"a".repeat(5_000)}.com/`, "https://user:pw@example.com/", "\u0000"]) {
      const r = extractRecipePage("<p>x</p>", { requestedUrl: u as string, finalUrl: u as string });
      expect(validateRecipeExtractionV1(r)).toEqual([]);
      expect(r.source).toEqual({ requestedUrl: null, finalUrl: null, finalHost: null });
    }
  });
});

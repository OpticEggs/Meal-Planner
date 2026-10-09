/**
 * Page diagnostics: every legacy problem text maps to its stable code, and the derived diagnostics
 * mirror Table's recipe-import-service classification, in a stable order.
 */
import { describe, expect, it } from "vitest";
import { DIAGNOSTICS, LIMITS } from "../../src/contract";
import { JSONLD_LIMITS } from "../../src/legacy/jsonld";
import { extractRecipePage, legacyProblemCode } from "../../src/page/extract";
import { validateRecipeExtractionV1 } from "../../src/validate";

const INPUT = { requestedUrl: "https://www.example.com/r/", finalUrl: "https://www.example.com/r/" };
const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const codes = (html: string) => extractRecipePage(html, INPUT).diagnostics.map((d) => d.code);

describe("legacy problem texts", () => {
  it.each([
    [`more than ${JSONLD_LIMITS.maxScriptTags} script tags; the rest were ignored`, "script_tags_limit"],
    [`more than ${JSONLD_LIMITS.maxBlocks} JSON-LD blocks; the rest were ignored`, "jsonld_blocks_limit"],
    [`JSON-LD block 3 is larger than ${JSONLD_LIMITS.maxBlockChars} characters; skipped`, "jsonld_block_too_large"],
    [`JSON-LD block 1 is nested deeper than ${JSONLD_LIMITS.maxDepth}; skipped`, "jsonld_too_deep"],
    ["JSON-LD block 2 is not valid JSON; skipped", "jsonld_invalid_json"],
    [`more than ${JSONLD_LIMITS.maxNodes} JSON-LD nodes; the rest were ignored`, "nodes_limit"],
    [`more than ${JSONLD_LIMITS.maxCandidates} recipes; the rest were ignored`, "recipes_limit"],
    [`ingredients beyond ${JSONLD_LIMITS.maxIngredients} were ignored`, "ingredients_limit"],
    [`instruction steps beyond ${JSONLD_LIMITS.maxSteps} were ignored`, "steps_limit"],
    [`more than ${JSONLD_LIMITS.maxMicrodataTags} tags scanned for microdata; stopped`, "microdata_tags_limit"],
    [`microdata recipe text beyond ${JSONLD_LIMITS.maxMicrodataChars} characters was ignored`, "microdata_truncated"],
    [`more than ${JSONLD_LIMITS.maxItemprops} microdata properties; the rest were ignored`, "microdata_props_limit"],
    ["microdata is too large or too deeply nested to read fully; the rest was ignored", "microdata_too_large"],
    ["no page text", "input_not_text"],
    ["a brand-new problem", "unclassified"],
  ])("%j → %s", (text, code) => {
    expect(legacyProblemCode(text)).toBe(code);
    expect(Object.keys(DIAGNOSTICS)).toContain(code);
  });

  it("real limit problems arrive with the legacy text as detail", () => {
    const many = Array.from({ length: 21 }, (_v, i) => ld({ "@type": "Recipe", name: `R${i}`, recipeIngredient: ["1 cup a"] })).join("");
    const r = extractRecipePage(many + '<script type="application/ld+json">{oops</script>', INPUT);
    expect(r.diagnostics).toContainEqual({ code: "jsonld_blocks_limit", detail: `more than ${JSONLD_LIMITS.maxBlocks} JSON-LD blocks; the rest were ignored` });
    const steps = ld({ "@type": "Recipe", name: "R", recipeIngredient: Array.from({ length: 120 }, (_v, i) => `${i + 1} cups a`), recipeInstructions: Array.from({ length: 70 }, (_v, i) => `Step ${i}`) });
    expect(codes(steps)).toEqual(["steps_limit", "ingredients_limit"]); // legacy reads the steps first
    expect(codes('<script type="application/ld+json">{oops</script>')).toEqual(["jsonld_invalid_json", "no_recipe_data"]);
  });
});

describe("derived diagnostics", () => {
  const recipe = (name: string, lines: string[]) => ({ "@type": "Recipe", name, recipeIngredient: lines });

  it("no structured data at all", () => {
    expect(codes("<html><body><p>Just a story.</p></body></html>")).toEqual(["no_structured_data"]);
    expect(codes("")).toEqual(["no_structured_data"]);
  });

  it("structured data without a recipe", () => {
    expect(codes(ld({ "@type": "WebSite", name: "S" }))).toEqual(["no_recipe_data"]);
  });

  it("a recipe without ingredients", () => {
    expect(codes(ld({ "@type": "Recipe", name: "R" }))).toEqual(["recipe_without_ingredients"]);
  });

  it("one usable recipe: nothing to report", () => {
    expect(codes(ld(recipe("R", ["1 cup flour"])))).toEqual([]);
  });

  it("several recipes with ingredients", () => {
    const r = extractRecipePage(ld([recipe("A", ["1 cup a"]), recipe("B", ["2 cups b"]), recipe("C", [])]), INPUT);
    expect(r.diagnostics).toEqual([{ code: "multiple_recipes", detail: "2 recipes have ingredient lists" }]);
    expect(r.candidates.map((c) => c.title)).toEqual(["A", "B", "C"]);
  });

  it("microdata", () => {
    const html = `<div itemscope itemtype="https://schema.org/Recipe"><span itemprop="name">M</span><li itemprop="recipeIngredient">1 cup milk</li></div>`;
    const r = extractRecipePage(html, INPUT);
    expect(r.diagnostics).toEqual([{ code: "microdata_used", detail: null }]);
    expect(r.candidates[0]).toMatchObject({ structure: "microdata", title: "M", ingredientLines: ["1 cup milk"] });
  });

  it("not text, and too large: nothing is read", () => {
    const notText = extractRecipePage(42 as unknown as string, INPUT);
    expect(notText.diagnostics).toEqual([{ code: "input_not_text", detail: "the page input is not text" }]);
    expect(notText.candidates).toEqual([]);
    const big = extractRecipePage(" ".repeat(LIMITS.maxHtmlChars + 1), INPUT);
    expect(big.diagnostics).toEqual([{ code: "input_too_large", detail: `the page text is longer than ${LIMITS.maxHtmlChars} characters and was not read` }]);
    expect(big.stats).toEqual({ jsonLdBlocks: 0, recipeNodes: 0, microdata: false });
    for (const r of [notText, big]) expect(validateRecipeExtractionV1(r)).toEqual([]);
  });

  it("the Open Graph image is the hero when the recipe names none; later images are other", () => {
    const og = '<meta property="og:image" content="/og.jpg"><meta property="og:title" content="OG">';
    const a = extractRecipePage(og + ld(recipe("R", ["1 cup a"])), INPUT);
    expect(a.page).toEqual({ title: "OG", siteName: null, image: { url: "https://www.example.com/og.jpg", role: "hero" } });
    expect(a.candidates[0].imageCandidates).toEqual([{ url: "https://www.example.com/og.jpg", role: "hero" }]);
    const b = extractRecipePage(og + ld({ ...recipe("R", ["1 cup a"]), image: ["/1.jpg", "https://cdn.example.net/2.jpg"] }), INPUT);
    expect(b.candidates[0].imageCandidates).toEqual([
      { url: "https://www.example.com/1.jpg", role: "hero" },
      { url: "https://cdn.example.net/2.jpg", role: "other" },
    ]);
  });

  it("throws only for an unknown engine id", () => {
    expect(() => extractRecipePage("", INPUT, { engine: "nope" })).toThrow(/unknown ingredient engine/);
    expect(() => extractRecipePage(null as unknown as string, null as unknown as typeof INPUT)).not.toThrow();
  });
});

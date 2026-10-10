/**
 * `extractRecipePage` over every page fixture (and the seeded mutations): outputs validate, are
 * deterministic, carry the legacy candidates faithfully, and classify every legacy problem.
 */
import { describe, expect, it } from "vitest";
import { extractRecipes, pageMeta } from "../../src/legacy/jsonld";
import { validateLinkUrl } from "../../src/legacy/link";
import { ENGINES } from "../../src/ingredient/engines";
import { extractRecipePage, legacyProblemCode, PAGE_ENGINE_ID } from "../../src/page/extract";
import { LIMITS, PACKAGE_NAME, PACKAGE_VERSION } from "../../src/contract";
import { validateRecipeExtractionV1 } from "../../src/validate";
import { fixturePages, mutatedPages, PAGE_SEED } from "../parity/page-corpus";

const fixtures = fixturePages();
const mutations = mutatedPages(PAGE_SEED, fixtures);
const INPUTS = [
  { requestedUrl: "https://www.example.com/recipes/page/", finalUrl: "https://www.example.com/recipes/page/" },
  { requestedUrl: "https://short.example.net/x?utm_source=feed", finalUrl: "https://Recipes.Example.ORG./a/b/?k=1&fbclid=2#jump" },
  { requestedUrl: "javascript:alert(1)", finalUrl: "not a url" },
];

describe("extractRecipePage over the page fixtures", () => {
  it.each(Object.keys(ENGINES))("every fixture and mutation validates with engine %s", (engine) => {
    const bad: string[] = [];
    for (const p of [...fixtures, ...mutations]) {
      for (const input of INPUTS) {
        const problems = validateRecipeExtractionV1(extractRecipePage(p.html, input, { engine }));
        if (problems.length) bad.push(`${p.name}: ${problems.slice(0, 3).join("; ")}`);
      }
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("is deterministic: the same page twice gives identical JSON text", () => {
    for (const p of [...fixtures, ...mutations.slice(0, 120)]) {
      expect(JSON.stringify(extractRecipePage(p.html, INPUTS[1]))).toBe(JSON.stringify(extractRecipePage(p.html, INPUTS[1])));
    }
  });

  it("carries every legacy candidate field and reads each ingredient line once", () => {
    for (const p of [...fixtures, ...mutations]) {
      const base = validateLinkUrl(INPUTS[1].finalUrl);
      if (!base.ok) throw new Error("fixture base URL must be valid");
      const legacy = extractRecipes(p.html, { baseUrl: base.url });
      const v1 = extractRecipePage(p.html, INPUTS[1]);
      expect(v1.candidates.length).toBe(legacy.candidates.length);
      v1.candidates.forEach((c, i) => {
        const l = legacy.candidates[i];
        expect(c).toMatchObject({
          structure: l.source, title: l.name, description: l.description, yieldText: l.yield, servings: l.servings,
          times: { prepMinutes: l.prepMinutes, cookMinutes: l.cookMinutes, totalMinutes: l.totalMinutes },
          author: l.author, siteName: l.siteName, category: l.category, cuisine: l.cuisine, declaredUrl: l.sourceUrl,
          hasInstructions: l.hasInstructions, hasNutrition: l.hasNutrition, ingredientLines: l.ingredients,
          instructionCandidates: l.instructions,
        });
        expect(c.imageCandidates.map((im) => im.url)).toEqual(l.images);
        expect(c.imageCandidates.map((im) => im.role)).toEqual(l.images.map((_u, k) => (k === 0 ? "hero" : "other")));
        expect(c.ingredients).toEqual(l.ingredients.map((line) => ENGINES["legacy-table-import-2"].parse(line)));
      });
      expect(v1.page).toEqual({ title: legacy.meta.title, siteName: legacy.meta.siteName, image: legacy.meta.image ? { url: legacy.meta.image, role: "hero" } : null });
      expect(v1.page).toEqual({ ...v1.page, title: pageMeta(p.html, base.url).title });
      expect(v1.stats).toEqual(legacy.stats);
      expect(v1.retention).toBe("not_decided");
      expect(v1.extractorVersion).toBe(`${PACKAGE_NAME}@${PACKAGE_VERSION}`);
      expect(v1.engines).toEqual({ page: PAGE_ENGINE_ID, ingredient: "legacy-table-import-2" });
      // Every legacy problem appears, classified, with the legacy text as detail.
      for (const prob of legacy.problems) expect(v1.diagnostics).toContainEqual({ code: legacyProblemCode(prob), detail: prob });
    }
  });

  it("classifies every legacy problem seen in the mutations (never unclassified)", () => {
    const codes = new Set<string>();
    for (const p of mutations) {
      for (const prob of extractRecipes(p.html).problems) {
        const code = legacyProblemCode(prob);
        expect(code, prob).not.toBe("unclassified");
        codes.add(code);
      }
    }
    expect(codes.size).toBeGreaterThanOrEqual(3);
  });

  it("validates and normalizes the caller's addresses; the final one resolves relative links", () => {
    const html = fixtures.find((p) => p.name.endsWith("recipe-pages/plain.html"))!.html;
    const r = extractRecipePage(html, INPUTS[1]);
    expect(r.source).toEqual({ requestedUrl: "https://short.example.net/x", finalUrl: "https://recipes.example.org/a/b/?k=1", finalHost: "recipes.example.org" });
    const bad = extractRecipePage(html, INPUTS[2]);
    expect(bad.source).toEqual({ requestedUrl: null, finalUrl: null, finalHost: null });
    expect(bad.diagnostics.filter((d) => d.code === "url_invalid").map((d) => d.detail)).toEqual([
      "requestedUrl: only http and https links are accepted",
      "finalUrl: this is not a complete web address (it should start with https://)",
    ]);
    expect(bad.candidates.length).toBe(r.candidates.length); // the page is still read
    const long = extractRecipePage(html, { requestedUrl: `https://example.com/${"x".repeat(LIMITS.maxUrlChars)}`, finalUrl: 42 as unknown as string });
    expect(long.diagnostics.slice(0, 2)).toEqual([
      { code: "url_invalid", detail: `requestedUrl: the address is longer than ${LIMITS.maxUrlChars} characters` },
      { code: "url_invalid", detail: "finalUrl: the address is not text" },
    ]);
    expect(validateRecipeExtractionV1(long)).toEqual([]);
  });
});

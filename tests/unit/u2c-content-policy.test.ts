/**
 * What of a recipe page's own content may be kept (owner gates C1/C2), the production config check,
 * and the small client-side helpers of the URL-to-recipe flow. Pure; no database, no network.
 */
import { describe, expect, it } from "vitest";
import { recipeContentConfig } from "@/server/env";
import { configProblems } from "@/server/deploy";
import { contentUse, NOTHING_KEPT } from "@/server/integrations/recipe-import/content-policy";
import { budgetBytesSearchUrl, suggestedDecision, titleFromUrl, type ParsedLine } from "@/domain/recipes/import";

describe("content policy", () => {
  it("CP-01: nothing is kept unless the owner turned it on", () => {
    const cfg = recipeContentConfig({});
    expect(cfg).toEqual({ householdPrivate: false, grants: [] });
    expect(contentUse("example.com", cfg)).toEqual(NOTHING_KEPT);
  });

  it("CP-02: the household-private setting keeps method and photo for any readable site — never Budget Bytes", () => {
    const cfg = recipeContentConfig({ TABLE_RECIPE_CONTENT: "household_private" });
    expect(contentUse("www.example.com", cfg)).toEqual({ instructions: true, photos: true, basis: "household-private copy (owner setting)" });
    expect(contentUse("www.budgetbytes.com", cfg)).toEqual(NOTHING_KEPT);
  });

  it("CP-03: per-site grants keep only what was granted, for that site and its subdomains only, and win over the general setting", () => {
    const cfg = recipeContentConfig({ TABLE_RECIPE_CONTENT_GRANTS: "Example.com=photos; other.org=instructions+photos" });
    expect(contentUse("cdn.example.com", cfg)).toEqual({ instructions: false, photos: true, basis: "permission recorded for example.com" });
    expect(contentUse("notexample.com", cfg)).toEqual(NOTHING_KEPT);
    expect(contentUse("other.org", cfg)).toMatchObject({ instructions: true, photos: true });
    const both = recipeContentConfig({ TABLE_RECIPE_CONTENT: "household_private", TABLE_RECIPE_CONTENT_GRANTS: "example.com=photos" });
    expect(contentUse("example.com", both)).toMatchObject({ instructions: false, photos: true });
    expect(contentUse("budgetbytes.com", recipeContentConfig({ TABLE_RECIPE_CONTENT_GRANTS: "budgetbytes.com=instructions+photos" }))).toEqual(NOTHING_KEPT);
  });

  it("CP-04: malformed settings are errors, and production reports them before start", () => {
    expect(() => recipeContentConfig({ TABLE_RECIPE_CONTENT: "on" })).toThrow();
    expect(() => recipeContentConfig({ TABLE_RECIPE_CONTENT_GRANTS: "example.com=everything" })).toThrow();
    expect(() => recipeContentConfig({ TABLE_RECIPE_CONTENT_GRANTS: "example=photos" })).toThrow();
    const base = { TABLE_ENV: "production", DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "s".repeat(40), BETTER_AUTH_URL: "https://table.example.com" };
    expect(configProblems(base)).toEqual([]);
    expect(configProblems({ ...base, TABLE_RECIPE_CONTENT: "yes" })).toContain("TABLE_RECIPE_CONTENT_invalid");
    expect(configProblems({ ...base, TABLE_RECIPE_IMPORT_FETCH: "maybe" })).toContain("TABLE_RECIPE_IMPORT_FETCH_invalid");
  });
});

describe("review helpers", () => {
  it("RH-01: a starting name from the link's address only", () => {
    expect(titleFromUrl("https://www.budgetbytes.com/easy-one-pot-chili/")).toBe("Easy one pot chili");
    expect(titleFromUrl("https://x.example.com/recipes/12345")).toBeNull();
    expect(titleFromUrl("https://x.example.com/")).toBeNull();
    expect(titleFromUrl("not a url")).toBeNull();
    expect(budgetBytesSearchUrl("  black beans & rice ")).toBe("https://www.budgetbytes.com/?s=black%20beans%20%26%20rice");
  });

  it("RH-02: a suggestion is offered only on a line that needs review, and only if it would be a valid decision", () => {
    const line = (p: Partial<ParsedLine>): ParsedLine => ({ quantity: null, unit: null, name: "x", form: null, status: "requires_review", reasons: [], ...p });
    expect(suggestedDecision(line({ suggestion: { use: true, name: "salsa", quantity: "0.3333", unit: "cup", form: "raw" } }))).toEqual({ use: true, name: "salsa", quantity: "0.3333", unit: "cup", form: "raw" });
    expect(suggestedDecision(line({ suggestion: { use: false } }))).toEqual({ use: false });
    expect(suggestedDecision(line({ status: "parsed", suggestion: { use: false } }))).toBeNull();
    expect(suggestedDecision(line({ suggestion: { use: true, name: "x", quantity: "1", unit: "can", form: "raw" } }))).toBeNull();
    expect(suggestedDecision(line({ suggestion: { use: true, name: "x", quantity: "0", unit: "cup", form: "raw" } }))).toBeNull();
    expect(suggestedDecision(line({}))).toBeNull();
  });
});

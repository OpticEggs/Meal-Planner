/**
 * The benchmark's own inputs through both readers: the frozen legacy copy (what the benchmark scores
 * as the baseline) must equal the live Table modules on every benchmark ingredient line and page, so
 * the reported baseline IS Table import 2's behaviour at cb7b56e. Labels are not read here — only the
 * inputs — so nothing is tuned against the holdout.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import * as liveLine from "@/server/integrations/recipe-import/ingredient-line";
import * as liveLd from "@/server/integrations/recipe-import/jsonld";
import * as frozenLine from "../../src/legacy/ingredient-line";
import * as frozenLd from "../../src/legacy/jsonld";
import { extractRecipePage, ENGINES, validateParsedIngredientV1, validateRecipeExtractionV1 } from "../../src/index";

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures");

const inputsOf = (file: string): string[] =>
  readFileSync(path.join(FIXTURES, "ingredients", file), "utf8").split("\n").filter((l) => l.trim().length > 0).map((l) => JSON.parse(l).input as string);

const pages = (JSON.parse(readFileSync(path.join(FIXTURES, "pages", "labels.json"), "utf8")) as { file: string; requestedUrl: string; finalUrl: string }[])
  .map((p) => ({ ...p, html: readFileSync(path.join(FIXTURES, "pages", p.file), "utf8") }));

describe("benchmark corpus parity (frozen legacy vs live Table)", () => {
  const lines = [...inputsOf("dev.jsonl"), ...inputsOf("holdout.jsonl")];

  it("covers every benchmark line and page", () => {
    expect(lines.length).toBeGreaterThanOrEqual(220);
    expect(pages.length).toBeGreaterThanOrEqual(10);
  });

  it("parseIngredientLine is deep-equal on every benchmark line", () => {
    const bad = lines.filter((l) => !isDeepStrictEqual(liveLine.parseIngredientLine(l), frozenLine.parseIngredientLine(l)));
    expect(bad).toEqual([]);
  });

  it("extractRecipes is deep-equal on every benchmark page with its final URL", () => {
    const bad = pages.filter((p) => !isDeepStrictEqual(liveLd.extractRecipes(p.html, { baseUrl: p.finalUrl }), frozenLd.extractRecipes(p.html, { baseUrl: p.finalUrl })));
    expect(bad.map((p) => p.file)).toEqual([]);
  });

  it("every engine's reading of every benchmark line satisfies the contract", () => {
    const problems: string[] = [];
    for (const engine of Object.values(ENGINES)) {
      for (const l of lines) for (const p of validateParsedIngredientV1(engine.parse(l))) problems.push(`${engine.id} ${JSON.stringify(l)}: ${p}`);
    }
    expect(problems).toEqual([]);
  });

  it("every benchmark page extraction satisfies the contract", () => {
    const problems = pages.flatMap((p) => validateRecipeExtractionV1(extractRecipePage(p.html, { requestedUrl: p.requestedUrl, finalUrl: p.finalUrl })).map((x) => `${p.file}: ${x}`));
    expect(problems).toEqual([]);
  });
});

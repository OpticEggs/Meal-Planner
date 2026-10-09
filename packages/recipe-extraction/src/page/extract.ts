/**
 * `extractRecipePage`: contract v1 over Table import 2's frozen page scanner (`../legacy/jsonld`,
 * cb7b56e). The caller has already fetched the page; nothing here fetches, resolves or keeps anything.
 * Candidates, page meta and problems are the legacy ones, translated; ingredient lines are read by the
 * chosen ingredient engine.
 */
import {
  LIMITS, PACKAGE_NAME, PACKAGE_VERSION, SCHEMA_VERSION,
  type DiagnosticCode, type DiagnosticV1, type ImageCandidateV1, type IngredientEngine, type PageInputV1, type RecipeCandidateV1, type RecipeExtractionV1,
} from "../contract";
import { getEngine } from "../ingredient/engines";
import { extractRecipes, type RecipeCandidate } from "../legacy/jsonld";
import { validateLinkUrl } from "../legacy/link";

export const PAGE_ENGINE_ID = "legacy-table-import-2-page";

const PROBLEM_CODES: readonly [RegExp, DiagnosticCode][] = [
  [/^more than \d+ script tags/, "script_tags_limit"],
  [/^more than \d+ JSON-LD blocks/, "jsonld_blocks_limit"],
  [/^JSON-LD block \d+ is larger than/, "jsonld_block_too_large"],
  [/^JSON-LD block \d+ is nested deeper/, "jsonld_too_deep"],
  [/^JSON-LD block \d+ is not valid JSON/, "jsonld_invalid_json"],
  [/^more than \d+ JSON-LD nodes/, "nodes_limit"],
  [/^more than \d+ recipes/, "recipes_limit"],
  [/^ingredients beyond/, "ingredients_limit"],
  [/^instruction steps beyond/, "steps_limit"],
  [/^more than \d+ tags scanned for microdata/, "microdata_tags_limit"],
  [/^microdata recipe text beyond/, "microdata_truncated"],
  [/^more than \d+ microdata properties/, "microdata_props_limit"],
  [/^microdata is too large/, "microdata_too_large"],
];

/** The v1 code of a legacy page problem text; `unclassified` for any text this table does not know. */
export function legacyProblemCode(problem: string): DiagnosticCode {
  if (problem === "no page text") return "input_not_text";
  for (const [re, code] of PROBLEM_CODES) if (re.test(problem)) return code;
  return "unclassified";
}

/** A caller-given page address, validated like Table validates links; null when it is not a usable http(s) link. */
function checkUrl(v: unknown, field: "requestedUrl" | "finalUrl", diagnostics: DiagnosticV1[]): string | null {
  let why: string | null = null;
  let url: string | null = null;
  if (typeof v !== "string") why = "the address is not text";
  else if (v.length > LIMITS.maxUrlChars) why = `the address is longer than ${LIMITS.maxUrlChars} characters`;
  else {
    const r = validateLinkUrl(v);
    if (r.ok) url = r.url;
    else why = r.message;
  }
  if (why !== null) diagnostics.push({ code: "url_invalid", detail: `${field}: ${why}` });
  return url;
}

const image = (url: string, i: number): ImageCandidateV1 => ({ url, role: i === 0 ? "hero" : "other" });

function candidateV1(c: RecipeCandidate, engine: IngredientEngine): RecipeCandidateV1 {
  return {
    structure: c.source,
    title: c.name,
    description: c.description,
    yieldText: c.yield,
    servings: c.servings,
    times: { prepMinutes: c.prepMinutes, cookMinutes: c.cookMinutes, totalMinutes: c.totalMinutes },
    author: c.author,
    siteName: c.siteName,
    category: c.category,
    cuisine: c.cuisine,
    declaredUrl: c.sourceUrl,
    hasInstructions: c.hasInstructions,
    hasNutrition: c.hasNutrition,
    ingredientLines: [...c.ingredients],
    ingredients: c.ingredients.map((line) => engine.parse(line)),
    instructionCandidates: c.instructions.map((s) => ({ section: s.section, text: s.text })),
    imageCandidates: c.images.map(image),
  };
}

function dedupe(diagnostics: DiagnosticV1[]): DiagnosticV1[] {
  const seen = new Set<string>();
  return diagnostics.filter((d) => {
    const key = JSON.stringify([d.code, d.detail]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Reads the recipe data a fetched page states. `input.finalUrl` (the address that answered) resolves
 * relative links; both addresses are validated like Table's saved links. Never throws for any page
 * text or address; throws only for an unknown `opts.engine` (a programming error).
 */
export function extractRecipePage(html: string, input: PageInputV1, opts: { engine?: string } = {}): RecipeExtractionV1 {
  const engine = getEngine(opts.engine);
  const diagnostics: DiagnosticV1[] = [];
  const requestedUrl = checkUrl(input?.requestedUrl, "requestedUrl", diagnostics);
  const finalUrl = checkUrl(input?.finalUrl, "finalUrl", diagnostics);
  const out: RecipeExtractionV1 = {
    schemaVersion: SCHEMA_VERSION,
    extractorVersion: `${PACKAGE_NAME}@${PACKAGE_VERSION}`,
    engines: { page: PAGE_ENGINE_ID, ingredient: engine.id },
    source: { requestedUrl, finalUrl, finalHost: finalUrl === null ? null : new URL(finalUrl).hostname },
    page: { title: null, siteName: null, image: null },
    retention: "not_decided",
    candidates: [],
    stats: { jsonLdBlocks: 0, recipeNodes: 0, microdata: false },
    diagnostics,
  };
  if (typeof html !== "string") {
    diagnostics.push({ code: "input_not_text", detail: "the page input is not text" });
    return out;
  }
  if (html.length > LIMITS.maxHtmlChars) {
    diagnostics.push({ code: "input_too_large", detail: `the page text is longer than ${LIMITS.maxHtmlChars} characters and was not read` });
    return out;
  }

  const r = extractRecipes(html, { baseUrl: finalUrl ?? undefined });
  for (const p of r.problems) diagnostics.push({ code: legacyProblemCode(p), detail: p });
  out.page = { title: r.meta.title, siteName: r.meta.siteName, image: r.meta.image === null ? null : { url: r.meta.image, role: "hero" } };
  out.stats = { jsonLdBlocks: r.stats.jsonLdBlocks, recipeNodes: r.stats.recipeNodes, microdata: r.stats.microdata };
  out.candidates = r.candidates.map((c) => candidateV1(c, engine));

  // Derived diagnostics, in a stable order (mirrors Table's recipe-import-service classification).
  if (r.stats.microdata) diagnostics.push({ code: "microdata_used", detail: null });
  const withIngredients = r.candidates.filter((c) => c.ingredients.length > 0).length;
  if (withIngredients > 1) diagnostics.push({ code: "multiple_recipes", detail: `${withIngredients} recipes have ingredient lists` });
  if (withIngredients === 0) {
    if (r.candidates.length > 0) diagnostics.push({ code: "recipe_without_ingredients", detail: null });
    else if (r.stats.jsonLdBlocks > 0) diagnostics.push({ code: "no_recipe_data", detail: null });
    else diagnostics.push({ code: "no_structured_data", detail: null });
  }
  out.diagnostics = dedupe(diagnostics);
  return out;
}

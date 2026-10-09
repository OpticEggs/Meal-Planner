/**
 * Recipe extraction contract v1 — the package's only public data shapes.
 *
 * The extractor DESCRIBES what a recipe page or ingredient line states. It decides nothing for the
 * household: not what to buy, not what may be kept from a publisher, not how a quantity is stored.
 * Table's server (adapter, content policy, draft commands) makes those decisions later.
 *
 * Every value here is JSON-serializable plain data. Quantities are exact rationals carried as
 * canonical decimal-digit strings; nothing is a binary float. Specification and labeling rules:
 * `packages/recipe-extraction/CONTRACT-v1.md`.
 */

export const SCHEMA_VERSION = "recipe-extraction/v1" as const;
export const PACKAGE_NAME = "@table/recipe-extraction" as const;
export const PACKAGE_VERSION = "0.1.0" as const;

/** Hard limits. Inputs beyond them are refused or truncated with a diagnostic/reason, never silently. */
export const LIMITS = {
  /** Characters of one ingredient line that are read (longer → truncated + `input_truncated`). */
  maxLineChars: 500,
  /** Largest positive quantity value accepted in the stated unit. */
  maxQuantity: 10_000,
  /** Largest reduced denominator of an exact quantity (6 decimal places, or a fraction up to 1/1000000). */
  maxDenominator: 1_000_000,
  /** Characters of page text read by `extractRecipePage` (Table's fetcher caps pages at 2 MiB). */
  maxHtmlChars: 8 * 1024 * 1024,
  /** URL length (same as Table's link validation). */
  maxUrlChars: 2048,
} as const;

// --- Exact quantities ----------------------------------------------------------------------------

/**
 * An exact positive rational. `numerator`/`denominator` are canonical: decimal digits only, no sign,
 * no leading zeros, reduced (gcd 1), denominator ≥ 1 and ≤ LIMITS.maxDenominator, value ≤
 * LIMITS.maxQuantity. `display` is a human rendering only and is never parsed back: a decimal when
 * the source wrote a decimal and it terminates, otherwise a reduced mixed fraction ("1 1/3", "1/3",
 * "2"). It never shows a rounded value.
 */
export interface ExactQuantity {
  kind: "exact";
  numerator: string;
  denominator: string;
  display: string;
}

/** A stated range ("2-3", "2 to 3", "1 or 2"). Always needs review: Table needs one amount. */
export interface RangeQuantity {
  kind: "range";
  min: ExactQuantity;
  max: ExactQuantity;
  display: string;
}

export type QuantityV1 = ExactQuantity | RangeQuantity;

// --- Units ---------------------------------------------------------------------------------------

export type Dimension = "mass" | "volume" | "count" | "imprecise";

export interface UnitDef {
  dimension: Dimension;
  /**
   * Exact size in the dimension's base unit (mass: gram, volume: millilitre) by DEFINITION (US
   * customary volumes; avoirdupois mass), as a decimal string. null for count and imprecise units:
   * they never convert. Mass and volume never convert into each other (no densities here).
   */
  base: string | null;
}

/**
 * Canonical unit codes. `oz` is mass (avoirdupois ounce); `fl_oz` is volume (US fluid ounce) — the
 * extractor reports the one the line wrote and never infers it from the food. Count units name what
 * is counted (a clove is not a can); `each` is a bare count ("2 eggs"). Imprecise units are read but
 * have no fixed amount.
 */
export const UNIT_REGISTRY = {
  mg: { dimension: "mass", base: "0.001" },
  g: { dimension: "mass", base: "1" },
  kg: { dimension: "mass", base: "1000" },
  oz: { dimension: "mass", base: "28.349523125" },
  lb: { dimension: "mass", base: "453.59237" },
  ml: { dimension: "volume", base: "1" },
  dl: { dimension: "volume", base: "100" },
  l: { dimension: "volume", base: "1000" },
  tsp: { dimension: "volume", base: "4.92892159375" },
  tbsp: { dimension: "volume", base: "14.78676478125" },
  fl_oz: { dimension: "volume", base: "29.5735295625" },
  cup: { dimension: "volume", base: "236.5882365" },
  pint: { dimension: "volume", base: "473.176473" },
  quart: { dimension: "volume", base: "946.352946" },
  gallon: { dimension: "volume", base: "3785.411784" },
  each: { dimension: "count", base: null },
  bag: { dimension: "count", base: null },
  ball: { dimension: "count", base: null },
  block: { dimension: "count", base: null },
  bottle: { dimension: "count", base: null },
  box: { dimension: "count", base: null },
  bulb: { dimension: "count", base: null },
  bunch: { dimension: "count", base: null },
  can: { dimension: "count", base: null },
  carton: { dimension: "count", base: null },
  clove: { dimension: "count", base: null },
  container: { dimension: "count", base: null },
  cube: { dimension: "count", base: null },
  ear: { dimension: "count", base: null },
  envelope: { dimension: "count", base: null },
  fillet: { dimension: "count", base: null },
  head: { dimension: "count", base: null },
  jar: { dimension: "count", base: null },
  leaf: { dimension: "count", base: null },
  link: { dimension: "count", base: null },
  loaf: { dimension: "count", base: null },
  package: { dimension: "count", base: null },
  packet: { dimension: "count", base: null },
  piece: { dimension: "count", base: null },
  pod: { dimension: "count", base: null },
  rib: { dimension: "count", base: null },
  sheet: { dimension: "count", base: null },
  slice: { dimension: "count", base: null },
  sprig: { dimension: "count", base: null },
  stalk: { dimension: "count", base: null },
  stick: { dimension: "count", base: null },
  strip: { dimension: "count", base: null },
  tin: { dimension: "count", base: null },
  tube: { dimension: "count", base: null },
  wedge: { dimension: "count", base: null },
  dash: { dimension: "imprecise", base: null },
  drop: { dimension: "imprecise", base: null },
  handful: { dimension: "imprecise", base: null },
  inch: { dimension: "imprecise", base: null },
  knob: { dimension: "imprecise", base: null },
  pinch: { dimension: "imprecise", base: null },
  scoop: { dimension: "imprecise", base: null },
  splash: { dimension: "imprecise", base: null },
  sprinkle: { dimension: "imprecise", base: null },
} as const satisfies Record<string, UnitDef>;

export type UnitCode = keyof typeof UNIT_REGISTRY;

export interface UnitV1 {
  canonical: UnitCode;
  dimension: Dimension;
  /** The unit as written ("Tbsp", "cups", "fl. oz."); "" when implicit (a bare count → each). */
  source: string;
}

/** A container's stated contents ("2 (15 oz) cans" → 15 oz). Never multiplied into the quantity. */
export interface PackageSizeV1 {
  quantity: ExactQuantity;
  unit: UnitV1; // mass or volume only
}

/** The same amount restated in another unit — mass, volume or a count ("1 cup (120 g) flour" → 120 g; "1/2 cup (1 stick)" → 1 stick). Never an imprecise unit. Not used for arithmetic. */
export interface EquivalentV1 {
  quantity: ExactQuantity;
  unit: UnitV1;
}

// --- Reasons and status --------------------------------------------------------------------------

/**
 * `ready`: the reading is complete and unambiguous — every part the line states was assigned and
 *   nothing is left over; no range, no ingredient choice, no unread number. A line may be ready
 *   without a quantity only when it explicitly states that there is no fixed amount (`amountUnstated`).
 * `needs_review`: something stated could not be assigned unambiguously, or no amount was found and
 *   the line doesn't say why. At least one `review` reason.
 * `unsupported`: not an ingredient line (empty, a heading, an instruction). At least one
 *   `unsupported` reason; name and quantity are null.
 */
export type IngredientStatus = "ready" | "needs_review" | "unsupported";

export type ReasonClass = "info" | "review" | "unsupported";

/** Stable machine codes. Labels are for people and may be reworded; codes may not change meaning. */
export const REASONS = {
  // unsupported
  empty_line: { class: "unsupported", label: "The line is empty." },
  section_heading: { class: "unsupported", label: "This looks like a heading, not an ingredient." },
  not_an_ingredient: { class: "unsupported", label: "This doesn't look like an ingredient line." },
  // review — any engine
  quantity_missing: { class: "review", label: "No amount was found for this ingredient." },
  quantity_range: { class: "review", label: "The amount is a range; choose one amount." },
  quantity_invalid: { class: "review", label: "The amount can't be read (for example 1/0 or 1 3/2)." },
  quantity_not_positive: { class: "review", label: "The amount is zero or negative." },
  quantity_implausible: { class: "review", label: "The amount is implausibly large." },
  number_format_ambiguous: { class: "review", label: "The number format is ambiguous (for example 1,5 or 1,000)." },
  quantity_unassigned: { class: "review", label: "The line has another number that couldn't be placed." },
  unit_unknown: { class: "review", label: "The word after the amount may be a unit Table doesn't know." },
  ingredient_alternatives: { class: "review", label: "The line offers a choice of ingredients; choose one." },
  name_missing: { class: "review", label: "No ingredient name was found." },
  structure_unbalanced: { class: "review", label: "Brackets in the line don't match." },
  input_truncated: { class: "review", label: "The line was too long and was cut." },
  unclassified: { class: "review", label: "The line needs a person to check it." },
  // review — emitted only by the frozen legacy engines (Table import 2 behaviour, for baselines)
  legacy_fraction_not_exact_decimal: { class: "review", label: "Legacy: the fraction has no exact decimal (thirds, sixths…)." },
  legacy_unit_not_supported: { class: "review", label: "Legacy: the unit (can, clove, bunch…) isn't supported." },
  legacy_parenthetical_number: { class: "review", label: "Legacy: a parenthetical contains a number." },
  legacy_contains_or: { class: "review", label: "Legacy: the line contains the word \"or\"." },
  legacy_no_fixed_quantity: { class: "review", label: "Legacy: the line says to taste, optional or similar." },
  legacy_more_than_one_quantity: { class: "review", label: "Legacy: more than one number in the line." },
  legacy_unrecognized_quantity: { class: "review", label: "Legacy: the amount couldn't be read." },
  legacy_suggestion_applied: { class: "review", label: "Legacy: a proposal was filled in; a person must accept it." },
  // info — never block `ready`
  list_marker_removed: { class: "info", label: "A list bullet was removed." },
  price_annotation_removed: { class: "info", label: "A price annotation was removed; it is not an amount." },
  amount_unstated: { class: "info", label: "The line says there is no fixed amount (to taste, for serving…)." },
  optional_ingredient: { class: "info", label: "The ingredient is optional." },
  approximate_quantity: { class: "info", label: "The amount is approximate (about, roughly)." },
  quantity_from_word: { class: "info", label: "The amount was written as a word (a, one, half)." },
  package_size_stated: { class: "info", label: "A container size was stated; it is not multiplied in." },
  count_unit: { class: "info", label: "Counted in containers or pieces (can, clove…)." },
  imprecise_unit: { class: "info", label: "The unit has no fixed amount (pinch, dash…)." },
  compound_quantity_summed: { class: "info", label: "Amounts in related units were added exactly (1 lb 4 oz)." },
  equivalent_quantity_stated: { class: "info", label: "The same amount was restated in another unit." },
  form_stated: { class: "info", label: "The line says cooked or raw." },
} as const satisfies Record<string, { class: ReasonClass; label: string }>;

export type ReasonCode = keyof typeof REASONS;

/** Explicit "no fixed amount" phrases: to taste, as needed/desired, for serving, for garnish, other (for dusting, greasing, frying, drizzling…). */
export type AmountUnstated = "to_taste" | "as_needed" | "for_serving" | "for_garnish" | "other";

export type SpanField = "quantity" | "unit" | "packageSize" | "name" | "note";

export interface ParsedIngredientV1 {
  /** The input exactly as given (non-string input → ""). */
  raw: string;
  /** The text the engine read: controls → spaces, whitespace collapsed, capped at LIMITS.maxLineChars. */
  normalized: string;
  status: IngredientStatus;
  /** The food as shopped for (variety, colour, percentage kept); null when unsupported or a choice of ingredients. */
  name: string | null;
  quantity: QuantityV1 | null;
  unit: UnitV1 | null;
  packageSize: PackageSizeV1 | null;
  equivalents: EquivalentV1[];
  form: "raw" | "cooked" | null;
  /** Preparation, size words and sourcing remarks, "; "-joined in source order. Never holds the amount. */
  note: string | null;
  /** Every option when the line offers a choice of ingredients ("milk or cream" → ["milk", "cream"]); else []. */
  alternatives: string[];
  optional: boolean;
  approximate: boolean;
  amountUnstated: AmountUnstated | null;
  /** Unique, in detection order. Status must agree with their classes (see `validate.ts`). */
  reasons: ReasonCode[];
  /** Half-open [start, end) UTF-16 offsets into `normalized`; {} when the engine reports none. */
  evidence: { spans: Partial<Record<SpanField, [number, number]>> };
}

/** An ingredient-line reader. Pure and deterministic: same line → deep-equal output. */
export interface IngredientEngine {
  readonly id: string;
  readonly description: string;
  parse(line: string): ParsedIngredientV1;
}

// --- Pages ---------------------------------------------------------------------------------------

/** Where the text came from. The caller (Table's server) fetched it; the extractor never fetches. */
export interface PageInputV1 {
  /** The link the member gave. */
  requestedUrl: string;
  /** The address that actually answered (after redirects) — relative links resolve against it. */
  finalUrl: string;
}

export const DIAGNOSTICS = {
  input_not_text: "The page input was not text.",
  input_too_large: "The page text was larger than the limit and was not read.",
  url_invalid: "A page address given by the caller is not a valid http(s) link.",
  script_tags_limit: "Too many script tags; the rest were ignored.",
  jsonld_blocks_limit: "Too many JSON-LD blocks; the rest were ignored.",
  jsonld_block_too_large: "A JSON-LD block was too large and was skipped.",
  jsonld_too_deep: "A JSON-LD block was nested too deeply and was skipped.",
  jsonld_invalid_json: "A JSON-LD block was not valid JSON and was skipped.",
  nodes_limit: "Too many JSON-LD nodes; the rest were ignored.",
  recipes_limit: "Too many recipes on the page; the rest were ignored.",
  ingredients_limit: "Too many ingredient lines; the rest were ignored.",
  steps_limit: "Too many instruction steps; the rest were ignored.",
  microdata_tags_limit: "Too many tags scanned for microdata; stopped.",
  microdata_props_limit: "Too many microdata properties; the rest were ignored.",
  microdata_truncated: "Microdata recipe text beyond the limit was ignored.",
  microdata_too_large: "Microdata too large or deeply nested to read fully.",
  microdata_used: "Read from schema.org microdata (older markup), not JSON-LD.",
  multiple_recipes: "The page has more than one recipe; the caller chooses.",
  no_structured_data: "No structured recipe data was found.",
  no_recipe_data: "Structured data was found, but none of it is a recipe.",
  recipe_without_ingredients: "Recipe data was found without an ingredient list.",
  unclassified: "A page problem without a stable code (see detail).",
} as const;

export type DiagnosticCode = keyof typeof DIAGNOSTICS;

export interface DiagnosticV1 {
  code: DiagnosticCode;
  /** Plain words (for example the legacy problem text). Never page HTML. */
  detail: string | null;
}

export interface ImageCandidateV1 {
  /** Absolute, validated http(s) link. A link is not permission to fetch, keep, show or hotlink it. */
  url: string;
  role: "hero" | "other" | "unknown";
}

export interface InstructionCandidateV1 {
  section: string | null;
  text: string;
}

export interface RecipeCandidateV1 {
  structure: "json_ld" | "microdata";
  title: string | null;
  description: string | null;
  yieldText: string | null;
  /** Only when the yield states one unambiguous integer from 1 to 100. */
  servings: number | null;
  times: { prepMinutes: number | null; cookMinutes: number | null; totalMinutes: number | null };
  author: string | null;
  siteName: string | null;
  category: string | null;
  cuisine: string | null;
  /** The URL the recipe data names for itself (validated) — a claim by the page, not proof of origin. */
  declaredUrl: string | null;
  hasInstructions: boolean;
  hasNutrition: boolean;
  /** The ingredient lines as published (markup removed, entities decoded), in order. */
  ingredientLines: string[];
  /** One reading per `ingredientLines` entry, same order and length. */
  ingredients: ParsedIngredientV1[];
  /** Transient candidates. Retention and display are decided by Table's content policy, not here. */
  instructionCandidates: InstructionCandidateV1[];
  imageCandidates: ImageCandidateV1[];
}

export interface RecipeExtractionV1 {
  schemaVersion: typeof SCHEMA_VERSION;
  /** `@table/recipe-extraction@<version>`. */
  extractorVersion: string;
  engines: { page: string; ingredient: string };
  source: { requestedUrl: string | null; finalUrl: string | null; finalHost: string | null };
  /** Open Graph / Twitter card facts of the page (fallbacks only). */
  page: { title: string | null; siteName: string | null; image: ImageCandidateV1 | null };
  /** The extractor never decides what may be kept, shown or fetched; Table's server does. */
  retention: "not_decided";
  candidates: RecipeCandidateV1[];
  stats: { jsonLdBlocks: number; recipeNodes: number; microdata: boolean };
  diagnostics: DiagnosticV1[];
}

/**
 * Every validator rule has at least one negative test on a hand-built invalid object, next to valid
 * baselines (so each failure is caused by the one mutation under test).
 */
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1, RecipeExtractionV1 } from "../../src/contract";
import { validateParsedIngredientV1, validateRecipeExtractionV1 } from "../../src/validate";

// Mutations deliberately break the types: the validator is for untrusted JSON.
type Loose = { [key: string]: any };
type Mut = (x: Loose) => void;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const exact = (numerator: string, denominator = "1", display = numerator) => ({ kind: "exact", numerator, denominator, display });
const unit = (canonical: string, dimension: string, source = "") => ({ canonical, dimension, source });

const READY: ParsedIngredientV1 = {
  raw: "2 (15 oz) cans black beans",
  normalized: "2 (15 oz) cans black beans",
  status: "ready",
  name: "black beans",
  quantity: { kind: "exact", numerator: "2", denominator: "1", display: "2" },
  unit: { canonical: "can", dimension: "count", source: "cans" },
  packageSize: { quantity: { kind: "exact", numerator: "15", denominator: "1", display: "15" }, unit: { canonical: "oz", dimension: "mass", source: "oz" } },
  equivalents: [],
  form: null,
  note: null,
  alternatives: [],
  optional: false,
  approximate: false,
  amountUnstated: null,
  reasons: ["package_size_stated", "count_unit"],
  evidence: { spans: { quantity: [0, 1], packageSize: [3, 8], name: [15, 26] } },
};
const REVIEW: ParsedIngredientV1 = {
  ...clone(READY),
  raw: "1 cup milk or cream",
  normalized: "1 cup milk or cream",
  status: "needs_review",
  name: null,
  quantity: { kind: "range", min: { kind: "exact", numerator: "1", denominator: "1", display: "1" }, max: { kind: "exact", numerator: "2", denominator: "1", display: "2" }, display: "1-2" },
  unit: { canonical: "cup", dimension: "volume", source: "cup" },
  packageSize: null,
  equivalents: [{ quantity: { kind: "exact", numerator: "240", denominator: "1", display: "240" }, unit: { canonical: "ml", dimension: "volume", source: "ml" } }],
  alternatives: ["milk", "cream"],
  reasons: ["quantity_range", "ingredient_alternatives"],
  evidence: { spans: {} },
};
const UNSUPPORTED: ParsedIngredientV1 = {
  ...clone(READY),
  raw: "For the sauce:",
  normalized: "For the sauce:",
  status: "unsupported",
  name: null,
  quantity: null,
  unit: null,
  packageSize: null,
  reasons: ["section_heading"],
  evidence: { spans: {} },
};
const UNSTATED: ParsedIngredientV1 = { ...clone(READY), raw: "salt, to taste", normalized: "salt, to taste", name: "salt", quantity: null, unit: null, packageSize: null, amountUnstated: "to_taste", reasons: ["amount_unstated"], evidence: { spans: {} } };

describe("validateParsedIngredientV1 accepts valid lines", () => {
  it.each([
    ["ready with package size", READY],
    ["needs_review with a range, alternatives and an equivalent", REVIEW],
    ["unsupported", UNSUPPORTED],
    ["ready without an amount that says why", UNSTATED],
  ])("%s", (_l, x) => expect(validateParsedIngredientV1(x)).toEqual([]));
});

const ingredientCases: [string, ParsedIngredientV1, Mut, RegExp][] = [
  // structure
  ["missing key", READY, (x) => delete x.note, /missing key "note"/],
  ["unknown top-level key", READY, (x) => (x.confidence = 0.9), /unknown key "confidence"/],
  ["raw not a string", READY, (x) => (x.raw = 5), /raw: expected a string/],
  ["normalized not a string", READY, (x) => (x.normalized = null), /normalized: expected a string/],
  ["normalized over 500 characters", READY, (x) => (x.normalized = "a".repeat(501)), /normalized: longer than 500/],
  ["unknown status", READY, (x) => (x.status = "parsed"), /status: expected one of/],
  ["empty name", READY, (x) => (x.name = "  "), /name: expected a non-empty string/],
  ["name not a string", READY, (x) => (x.name = 7), /name: expected a non-empty string/],
  // quantities
  ["unreduced fraction", READY, (x) => (x.quantity = exact("2", "6", "1/3")), /not a canonical reduced fraction/],
  ["leading zero", READY, (x) => (x.quantity = exact("02")), /not a canonical reduced fraction/],
  ["signed numerator", READY, (x) => (x.quantity = exact("-1")), /not a canonical reduced fraction/],
  ["decimal numerator", READY, (x) => (x.quantity = exact("1.5")), /not a canonical reduced fraction/],
  ["zero denominator", READY, (x) => (x.quantity = exact("1", "0", "1/0")), /not a canonical reduced fraction/],
  ["zero quantity", READY, (x) => (x.quantity = exact("0")), /out of bounds/],
  ["quantity above 10 000", READY, (x) => (x.quantity = exact("10001")), /out of bounds/],
  ["denominator above 1 000 000", READY, (x) => (x.quantity = exact("1", "1000001", "x")), /out of bounds/],
  ["numeric numerator", READY, (x) => (x.quantity = { ...exact("1"), numerator: 1 }), /must be strings of digits/],
  ["empty display", READY, (x) => (x.quantity = exact("1", "1", "")), /display: expected a non-empty string/],
  ["unknown quantity kind", READY, (x) => (x.quantity = { ...exact("1"), kind: "approx" }), /kind: expected "exact" or "range"/],
  ["extra key in a quantity", READY, (x) => (x.quantity = { ...exact("1"), value: 1 }), /quantity: unknown key "value"/],
  ["quantity not an object", READY, (x) => (x.quantity = "2"), /quantity: expected a quantity object or null/],
  ["range with min = max", REVIEW, (x) => (x.quantity = { kind: "range", min: exact("2"), max: exact("2"), display: "2-2" }), /a range needs min < max/],
  ["range with min > max", REVIEW, (x) => (x.quantity = { kind: "range", min: exact("3"), max: exact("2"), display: "3-2" }), /a range needs min < max/],
  ["range with an invalid end", REVIEW, (x) => (x.quantity = { kind: "range", min: exact("0"), max: exact("2"), display: "0-2" }), /quantity\.min: out of bounds/],
  ["range missing max", REVIEW, (x) => (x.quantity = { kind: "range", min: exact("1"), display: "1-" }), /missing key "max"/],
  // units
  ["unit not in the registry", READY, (x) => (x.unit = unit("cups", "volume")), /unit\.canonical: not a unit code/],
  ["prototype key as unit", READY, (x) => (x.unit = unit("toString", "count")), /unit\.canonical: not a unit code/],
  ["unit dimension mismatch (oz is mass)", READY, (x) => (x.unit = unit("oz", "volume", "oz")), /unit\.dimension: "volume" does not match oz \(mass\)/],
  ["unit source not a string", READY, (x) => (x.unit = { canonical: "cup", dimension: "volume", source: null }), /unit\.source: expected a string/],
  ["unit missing source", READY, (x) => (x.unit = { canonical: "cup", dimension: "volume" }), /unit: missing key "source"/],
  ["package size in a count unit", READY, (x) => ((x.packageSize as Record<string, unknown>).unit = unit("can", "count")), /packageSize\.unit: unit must be mass or volume/],
  ["package size as a range", READY, (x) => ((x.packageSize as Record<string, unknown>).quantity = { kind: "range", min: exact("1"), max: exact("2"), display: "1-2" }), /packageSize\.quantity: expected an exact quantity/],
  ["package size missing unit", READY, (x) => (x.packageSize = { quantity: exact("15") }), /packageSize: missing key "unit"/],
  ["equivalents not an array", READY, (x) => (x.equivalents = {}), /equivalents: expected an array/],
  ["equivalent in an imprecise unit", REVIEW, (x) => (x.equivalents = [{ quantity: exact("1"), unit: unit("pinch", "imprecise") }]), /equivalents\[0\]\.unit: unit must be mass or volume/],
  // other fields
  ["unknown form", READY, (x) => (x.form = "frozen"), /form: expected "raw", "cooked" or null/],
  ["empty note", READY, (x) => (x.note = ""), /note: expected a non-empty string or null/],
  ["alternatives not an array", REVIEW, (x) => (x.alternatives = "milk"), /alternatives: expected an array/],
  ["a single alternative", REVIEW, (x) => (x.alternatives = ["milk"]), /at least two options/],
  ["an empty alternative", REVIEW, (x) => (x.alternatives = ["milk", ""]), /alternatives\[1\]: expected a non-empty string/],
  ["optional not boolean", READY, (x) => (x.optional = "no"), /optional: expected a boolean/],
  ["approximate not boolean", READY, (x) => (x.approximate = 0), /approximate: expected a boolean/],
  ["unknown amountUnstated", UNSTATED, (x) => (x.amountUnstated = "some"), /amountUnstated: expected one of/],
  // reasons
  ["reasons not an array", READY, (x) => (x.reasons = "count_unit"), /reasons: expected an array/],
  ["unknown reason code", READY, (x) => (x.reasons = ["count_unit", "made_up"]), /reasons\[1\]: not a known reason code/],
  ["prototype key as reason", READY, (x) => (x.reasons = ["constructor"]), /reasons\[0\]: not a known reason code/],
  ["duplicate reason", READY, (x) => (x.reasons = ["count_unit", "count_unit"]), /duplicate reason "count_unit"/],
  // evidence
  ["evidence missing spans", READY, (x) => (x.evidence = {}), /evidence: missing key "spans"/],
  ["evidence extra key", READY, (x) => (x.evidence = { spans: {}, confidence: 1 }), /evidence: unknown key "confidence"/],
  ["unknown span field", READY, (x) => (x.evidence = { spans: { form: [0, 1] } }), /not a span field/],
  ["span past the normalized text", READY, (x) => (x.evidence = { spans: { name: [15, 999] } }), /span outside normalized text/],
  ["reversed span", READY, (x) => (x.evidence = { spans: { name: [5, 2] } }), /span outside normalized text or reversed/],
  ["non-integer span", READY, (x) => (x.evidence = { spans: { name: [0.5, 2] } }), /expected \[start, end\] non-negative integers/],
  ["negative span", READY, (x) => (x.evidence = { spans: { name: [-1, 2] } }), /expected \[start, end\] non-negative integers/],
  // status rules
  ["ready with a review reason", READY, (x) => (x.reasons = ["quantity_unassigned"]), /"ready" cannot carry a review reason/],
  ["ready without a name", READY, (x) => (x.name = null), /a ready line needs a name/],
  ["ready with a range", READY, (x) => (x.quantity = { kind: "range", min: exact("1"), max: exact("2"), display: "1-2" }), /a ready line cannot have a range/],
  ["ready with a quantity but no unit", READY, (x) => (x.unit = null), /a ready line with a quantity needs a unit/],
  ["ready without quantity or amountUnstated", UNSTATED, (x) => (x.amountUnstated = null), /must say why \(amountUnstated\)/],
  ["ready with alternatives", READY, (x) => (x.alternatives = ["a", "b"]), /a ready line cannot offer a choice/],
  ["needs_review without a review reason", REVIEW, (x) => (x.reasons = ["count_unit"]), /"needs_review" needs at least one review reason/],
  ["needs_review with an unsupported reason", REVIEW, (x) => (x.reasons = ["quantity_range", "empty_line"]), /must be "unsupported"/],
  ["ready with an unsupported reason", READY, (x) => (x.reasons = ["not_an_ingredient"]), /must be "unsupported"/],
  ["unsupported without an unsupported reason", UNSUPPORTED, (x) => (x.reasons = ["quantity_missing"]), /"unsupported" needs at least one unsupported reason/],
  ["unsupported with a name", UNSUPPORTED, (x) => (x.name = "sauce"), /name: must be null on an unsupported line/],
  ["unsupported with a quantity", UNSUPPORTED, (x) => (x.quantity = exact("1")), /quantity: must be null on an unsupported line/],
  ["unsupported with a unit", UNSUPPORTED, (x) => (x.unit = unit("cup", "volume")), /unit: must be null on an unsupported line/],
  ["unsupported with a package size", UNSUPPORTED, (x) => (x.packageSize = { quantity: exact("15"), unit: unit("oz", "mass") }), /packageSize: must be null on an unsupported line/],
];

describe("validateParsedIngredientV1 rejects", () => {
  it.each(ingredientCases)("%s", (_label, base, mutate, expected) => {
    const x: Loose = clone(base);
    expect(validateParsedIngredientV1(base)).toEqual([]);
    mutate(x);
    const problems = validateParsedIngredientV1(x);
    expect(problems.join("\n")).toMatch(expected);
  });

  it.each([null, undefined, 5, "line", [], new Date(0), Object.create({ raw: "x" })])("a non-plain value %#", (v) => {
    expect(validateParsedIngredientV1(v)[0]).toMatch(/expected an object/);
  });
});

// --- Pages ---------------------------------------------------------------------------------------

const PAGE: RecipeExtractionV1 = {
  schemaVersion: "recipe-extraction/v1",
  extractorVersion: "@table/recipe-extraction@0.1.0",
  engines: { page: "legacy-table-import-2-page", ingredient: "legacy-table-import-2" },
  source: { requestedUrl: "https://example.com/r", finalUrl: "https://www.example.com/r", finalHost: "www.example.com" },
  page: { title: "T", siteName: null, image: { url: "https://www.example.com/a.jpg", role: "hero" } },
  retention: "not_decided",
  candidates: [
    {
      structure: "json_ld",
      title: "R",
      description: null,
      yieldText: "4 servings",
      servings: 4,
      times: { prepMinutes: 10, cookMinutes: null, totalMinutes: 0 },
      author: null,
      siteName: null,
      category: null,
      cuisine: null,
      declaredUrl: "https://www.example.com/r",
      hasInstructions: true,
      hasNutrition: false,
      ingredientLines: ["2 (15 oz) cans black beans"],
      ingredients: [clone(READY)],
      instructionCandidates: [{ section: null, text: "Cook." }],
      imageCandidates: [{ url: "https://www.example.com/a.jpg", role: "hero" }, { url: "http://cdn.example.net/b.jpg", role: "other" }],
    },
  ],
  stats: { jsonLdBlocks: 1, recipeNodes: 1, microdata: false },
  diagnostics: [{ code: "multiple_recipes", detail: "2 recipes" }, { code: "microdata_used", detail: null }],
};
const cand = (x: Loose): Loose => x.candidates[0];

const pageCases: [string, Mut, RegExp][] = [
  ["missing key", (x) => delete x.stats, /page: missing key "stats"/],
  ["unknown top-level key", (x) => (x.html = "<p>"), /page: unknown key "html"/],
  ["wrong schema version", (x) => (x.schemaVersion = "recipe-extraction/v2"), /schemaVersion: expected "recipe-extraction\/v1"/],
  ["empty extractor version", (x) => (x.extractorVersion = ""), /extractorVersion: expected a non-empty string/],
  ["engines missing ingredient", (x) => (x.engines = { page: "p" }), /engines: missing key "ingredient"/],
  ["engine id empty", (x) => (x.engines = { page: "p", ingredient: "" }), /engines\.ingredient: expected a non-empty string/],
  ["requested URL not http(s)", (x) => (x.source = { ...x.source, requestedUrl: "javascript:alert(1)" }), /source\.requestedUrl: expected an absolute http\(s\) link/],
  ["final host not the final URL's host", (x) => (x.source = { ...x.source, finalHost: "evil.com" }), /finalHost: must be the host of source\.finalUrl/],
  ["final host without a final URL", (x) => (x.source = { ...x.source, finalUrl: null }), /finalHost: must be null without a final URL/],
  ["page image not http(s)", (x) => (x.page = { ...x.page, image: { url: "data:image/png;base64,AA", role: "hero" } }), /page\.image\.url: expected an absolute http\(s\) link/],
  ["page image role unknown", (x) => (x.page = { ...x.page, image: { url: "https://a.example.com/x.jpg", role: "banner" as "hero" } }), /page\.image\.role: expected one of/],
  ["page title not text", (x) => (x.page = { ...x.page, title: 5 as unknown as string }), /page\.page\.title: expected a string or null/],
  ["retention decided", (x) => (x.retention = "keep" as "not_decided"), /retention: must be "not_decided"/],
  ["candidates not an array", (x) => (x.candidates = {} as never), /candidates: expected an array/],
  ["candidate with an unknown key", (x) => (cand(x).html = "<p>"), /candidates\[0\]: unknown key "html"/],
  ["candidate structure unknown", (x) => (cand(x).structure = "rdfa"), /structure: expected "json_ld" or "microdata"/],
  ["candidate title not text", (x) => (cand(x).title = 3), /candidates\[0\]\.title: expected a string or null/],
  ["servings 0", (x) => (cand(x).servings = 0), /servings: expected an integer from 1 to 100/],
  ["servings 101", (x) => (cand(x).servings = 101), /servings: expected an integer from 1 to 100/],
  ["servings 2.5", (x) => (cand(x).servings = 2.5), /servings: expected an integer from 1 to 100/],
  ["negative minutes", (x) => (cand(x).times = { prepMinutes: -1, cookMinutes: null, totalMinutes: null }), /times\.prepMinutes: expected a non-negative integer/],
  ["times with an unknown key", (x) => (cand(x).times = { prepMinutes: 1, cookMinutes: null, totalMinutes: null, restMinutes: 1 }), /times: unknown key "restMinutes"/],
  ["declared URL not http(s)", (x) => (cand(x).declaredUrl = "ftp://example.com/r"), /declaredUrl: expected an absolute http\(s\) link or null/],
  ["hasInstructions not boolean", (x) => (cand(x).hasInstructions = "yes"), /hasInstructions: expected a boolean/],
  ["hasNutrition not boolean", (x) => (cand(x).hasNutrition = 1), /hasNutrition: expected a boolean/],
  ["ingredient line not text", (x) => (cand(x).ingredientLines = [1]), /ingredientLines\[0\]: expected a string/],
  ["fewer readings than lines", (x) => (cand(x).ingredientLines = ["2 (15 oz) cans black beans", "salt"]), /1 readings for 2 ingredient lines/],
  ["an invalid reading inside a candidate", (x) => ((cand(x).ingredients as Record<string, unknown>[])[0].status = "parsed"), /candidates\[0\]\.ingredients\[0\]\.status: expected one of/],
  ["a reading of another line", (x) => (cand(x).ingredientLines = ["something else"]), /ingredients\[0\]\.raw: must equal ingredientLines\[0\]/],
  ["empty instruction text", (x) => (cand(x).instructionCandidates = [{ section: null, text: "" }]), /instructionCandidates\[0\]\.text: expected a non-empty string/],
  ["instruction section not text", (x) => (cand(x).instructionCandidates = [{ section: 1, text: "Cook." }]), /instructionCandidates\[0\]\.section: expected a string or null/],
  ["image candidate javascript:", (x) => (cand(x).imageCandidates = [{ url: "javascript:alert(1)", role: "hero" }]), /imageCandidates\[0\]\.url: expected an absolute http\(s\) link/],
  ["image candidate role unknown", (x) => (cand(x).imageCandidates = [{ url: "https://a.example.com/x.jpg", role: "thumb" }]), /imageCandidates\[0\]\.role: expected one of/],
  ["negative block count", (x) => (x.stats = { ...x.stats, jsonLdBlocks: -1 }), /stats\.jsonLdBlocks: expected a non-negative integer/],
  ["recipe node count not an integer", (x) => (x.stats = { ...x.stats, recipeNodes: 1.5 }), /stats\.recipeNodes: expected a non-negative integer/],
  ["microdata flag not boolean", (x) => (x.stats = { ...x.stats, microdata: "no" as unknown as boolean }), /stats\.microdata: expected a boolean/],
  ["unknown diagnostic code", (x) => (x.diagnostics = [{ code: "whatever" as "unclassified", detail: null }]), /diagnostics\[0\]\.code: not a known diagnostic code/],
  ["diagnostic detail not text", (x) => (x.diagnostics = [{ code: "unclassified", detail: 3 as unknown as string }]), /diagnostics\[0\]\.detail: expected a string or null/],
  ["diagnostic with an extra key", (x) => (x.diagnostics = [{ code: "unclassified", detail: null, html: "<p>" } as never]), /diagnostics\[0\]: unknown key "html"/],
];

describe("validateRecipeExtractionV1", () => {
  it("accepts a valid page result", () => expect(validateRecipeExtractionV1(PAGE)).toEqual([]));

  it.each(pageCases)("rejects: %s", (_label, mutate, expected) => {
    const x: Loose = clone(PAGE);
    mutate(x);
    expect(validateRecipeExtractionV1(x).join("\n")).toMatch(expected);
  });

  it.each([null, "page", [], 1])("rejects a non-object %#", (v) => {
    expect(validateRecipeExtractionV1(v)[0]).toMatch(/expected an object/);
  });
});

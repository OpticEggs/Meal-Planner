/**
 * Structural and semantic validation of contract v1 values (CONTRACT-v1.md §2.1 and §3). Each
 * validator returns a list of problems in plain words with a JSON-ish path; an empty list means the
 * value is valid. Validators never throw on any input and never modify it.
 */
import { DIAGNOSTICS, LIMITS, REASONS, SCHEMA_VERSION, type Dimension, type ReasonClass } from "./contract";
import { cmp, fromExactQuantity, withinBounds, type Rational } from "./rational";
import { isUnitCode, dimensionOf } from "./units";

type Obj = Record<string, unknown>;

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function isObj(x: unknown): x is Obj {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

const describe = (x: unknown) => (x === null ? "null" : Array.isArray(x) ? "an array" : typeof x);

/** Reports missing and unknown keys. Returns false when `x` is not a plain object. */
function shape(x: unknown, keys: readonly string[], path: string, problems: string[]): x is Obj {
  if (!isObj(x)) {
    problems.push(`${path}: expected an object, got ${describe(x)}`);
    return false;
  }
  for (const k of keys) if (!hasOwn(x, k)) problems.push(`${path}: missing key "${k}"`);
  for (const k of Object.keys(x)) if (!keys.includes(k)) problems.push(`${path}: unknown key "${k.slice(0, 60)}"`);
  return true;
}

const isStringOrNull = (v: unknown) => v === null || typeof v === "string";
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isNonNegativeInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

function stringOrNull(v: unknown, path: string, problems: string[]) {
  if (!isStringOrNull(v)) problems.push(`${path}: expected a string or null, got ${describe(v)}`);
}

/** An absolute http(s) link within the URL length limit. Parsing only; nothing is fetched. */
export function isHttpUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > LIMITS.maxUrlChars) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// --- Quantities and units ------------------------------------------------------------------------

const EXACT_KEYS = ["kind", "numerator", "denominator", "display"] as const;
const RANGE_KEYS = ["kind", "min", "max", "display"] as const;

/** Checks an ExactQuantity; returns its value when valid. */
function exactQuantity(q: unknown, path: string, problems: string[]): Rational | null {
  if (!shape(q, EXACT_KEYS, path, problems)) return null;
  const before = problems.length;
  if (q.kind !== "exact") problems.push(`${path}.kind: expected "exact"`);
  if (typeof q.display !== "string" || q.display.length === 0) problems.push(`${path}.display: expected a non-empty string`);
  if (typeof q.numerator !== "string" || typeof q.denominator !== "string") {
    problems.push(`${path}: numerator and denominator must be strings of digits`);
    return null;
  }
  const r = fromExactQuantity({ kind: "exact", numerator: q.numerator, denominator: q.denominator, display: "" });
  if (!r) {
    problems.push(`${path}: numerator/denominator are not a canonical reduced fraction (digits only, no leading zeros, gcd 1, denominator ≥ 1)`);
    return null;
  }
  if (!withinBounds(r)) {
    problems.push(`${path}: out of bounds (must be positive, ≤ ${LIMITS.maxQuantity} and have a denominator ≤ ${LIMITS.maxDenominator})`);
    return null;
  }
  return problems.length === before ? r : null;
}

function quantity(q: unknown, path: string, problems: string[]): void {
  if (q === null) return;
  if (!isObj(q)) return void problems.push(`${path}: expected a quantity object or null, got ${describe(q)}`);
  if (q.kind === "exact") return void exactQuantity(q, path, problems);
  if (q.kind === "range") {
    if (!shape(q, RANGE_KEYS, path, problems)) return;
    const min = exactQuantity(q.min, `${path}.min`, problems);
    const max = exactQuantity(q.max, `${path}.max`, problems);
    if (typeof q.display !== "string" || q.display.length === 0) problems.push(`${path}.display: expected a non-empty string`);
    if (min && max && cmp(min, max) >= 0) problems.push(`${path}: a range needs min < max`);
    return;
  }
  problems.push(`${path}.kind: expected "exact" or "range"`);
}

const UNIT_KEYS = ["canonical", "dimension", "source"] as const;

function unit(u: unknown, path: string, problems: string[], allowed?: readonly Dimension[]): void {
  if (!shape(u, UNIT_KEYS, path, problems)) return;
  if (typeof u.source !== "string") problems.push(`${path}.source: expected a string`);
  else if (u.source.length > LIMITS.maxLineChars) problems.push(`${path}.source: longer than ${LIMITS.maxLineChars} characters`);
  if (!isUnitCode(u.canonical)) return void problems.push(`${path}.canonical: not a unit code of UNIT_REGISTRY`);
  const dim = dimensionOf(u.canonical);
  if (u.dimension !== dim) problems.push(`${path}.dimension: "${String(u.dimension).slice(0, 20)}" does not match ${u.canonical} (${dim})`);
  if (allowed && dim && !allowed.includes(dim)) problems.push(`${path}: unit must be ${allowed.join(" or ")}, got ${u.canonical} (${dim})`);
}

const AMOUNT_KEYS = ["quantity", "unit"] as const;
const MASS_OR_VOLUME: readonly Dimension[] = ["mass", "volume"];

function statedAmount(v: unknown, path: string, problems: string[]): void {
  if (!shape(v, AMOUNT_KEYS, path, problems)) return;
  if (!isObj(v.quantity) || v.quantity.kind !== "exact") problems.push(`${path}.quantity: expected an exact quantity`);
  else exactQuantity(v.quantity, `${path}.quantity`, problems);
  unit(v.unit, `${path}.unit`, problems, MASS_OR_VOLUME);
}

// --- Ingredient line -----------------------------------------------------------------------------

const INGREDIENT_KEYS = [
  "raw", "normalized", "status", "name", "quantity", "unit", "packageSize", "equivalents", "form", "note", "alternatives", "optional",
  "approximate", "amountUnstated", "reasons", "evidence",
] as const;
const STATUSES = ["ready", "needs_review", "unsupported"];
const AMOUNT_UNSTATED = ["to_taste", "as_needed", "for_serving", "for_garnish", "other"];
const SPAN_FIELDS = ["quantity", "unit", "packageSize", "name", "note"];

/** Problems of a `ParsedIngredientV1` (empty = valid). */
export function validateParsedIngredientV1(x: unknown, path = "ingredient"): string[] {
  const problems: string[] = [];
  if (!shape(x, INGREDIENT_KEYS, path, problems)) return problems;

  if (typeof x.raw !== "string") problems.push(`${path}.raw: expected a string`);
  const normalized = typeof x.normalized === "string" ? x.normalized : null;
  if (normalized === null) problems.push(`${path}.normalized: expected a string`);
  else if (normalized.length > LIMITS.maxLineChars) problems.push(`${path}.normalized: longer than ${LIMITS.maxLineChars} characters`);

  const status = typeof x.status === "string" && STATUSES.includes(x.status) ? x.status : null;
  if (status === null) problems.push(`${path}.status: expected one of ${STATUSES.join(", ")}`);

  if (x.name !== null && !isNonEmptyString(x.name)) problems.push(`${path}.name: expected a non-empty string or null`);
  quantity(x.quantity, `${path}.quantity`, problems);
  if (x.unit !== null) unit(x.unit, `${path}.unit`, problems);
  if (x.packageSize !== null) statedAmount(x.packageSize, `${path}.packageSize`, problems);

  if (!Array.isArray(x.equivalents)) problems.push(`${path}.equivalents: expected an array`);
  else x.equivalents.forEach((e, i) => statedAmount(e, `${path}.equivalents[${i}]`, problems));

  if (x.form !== null && x.form !== "raw" && x.form !== "cooked") problems.push(`${path}.form: expected "raw", "cooked" or null`);
  if (x.note !== null && !isNonEmptyString(x.note)) problems.push(`${path}.note: expected a non-empty string or null`);

  const alternatives = Array.isArray(x.alternatives) ? x.alternatives : null;
  if (alternatives === null) problems.push(`${path}.alternatives: expected an array`);
  else {
    alternatives.forEach((a, i) => {
      if (!isNonEmptyString(a)) problems.push(`${path}.alternatives[${i}]: expected a non-empty string`);
    });
    if (alternatives.length === 1) problems.push(`${path}.alternatives: a choice needs at least two options (or none)`);
  }

  if (typeof x.optional !== "boolean") problems.push(`${path}.optional: expected a boolean`);
  if (typeof x.approximate !== "boolean") problems.push(`${path}.approximate: expected a boolean`);
  if (x.amountUnstated !== null && !(typeof x.amountUnstated === "string" && AMOUNT_UNSTATED.includes(x.amountUnstated))) {
    problems.push(`${path}.amountUnstated: expected one of ${AMOUNT_UNSTATED.join(", ")} or null`);
  }

  // Reasons: known codes, unique.
  const classes = new Set<ReasonClass>();
  if (!Array.isArray(x.reasons)) problems.push(`${path}.reasons: expected an array`);
  else {
    const seen = new Set<string>();
    x.reasons.forEach((r, i) => {
      if (typeof r !== "string" || !hasOwn(REASONS, r)) return void problems.push(`${path}.reasons[${i}]: not a known reason code`);
      if (seen.has(r)) problems.push(`${path}.reasons[${i}]: duplicate reason "${r}"`);
      seen.add(r);
      classes.add(REASONS[r as keyof typeof REASONS].class);
    });
  }

  // Evidence spans: [start, end) integer offsets into `normalized`.
  if (shape(x.evidence, ["spans"], `${path}.evidence`, problems)) {
    const spans = x.evidence.spans;
    if (!isObj(spans)) problems.push(`${path}.evidence.spans: expected an object`);
    else {
      for (const [k, v] of Object.entries(spans)) {
        const p = `${path}.evidence.spans.${k.slice(0, 40)}`;
        if (!SPAN_FIELDS.includes(k)) {
          problems.push(`${p}: not a span field (${SPAN_FIELDS.join(", ")})`);
          continue;
        }
        if (!Array.isArray(v) || v.length !== 2 || !isNonNegativeInt(v[0]) || !isNonNegativeInt(v[1])) {
          problems.push(`${p}: expected [start, end] non-negative integers`);
          continue;
        }
        if (v[0] > v[1] || (normalized !== null && v[1] > normalized.length)) problems.push(`${p}: span outside normalized text or reversed`);
      }
    }
  }

  // Status rules (§2.1): the strongest reason class decides the status.
  if (status !== null && Array.isArray(x.reasons)) {
    const hasUnsupported = classes.has("unsupported");
    const hasReview = classes.has("review");
    if (status === "unsupported") {
      if (!hasUnsupported) problems.push(`${path}.status: "unsupported" needs at least one unsupported reason`);
      for (const k of ["name", "quantity", "unit", "packageSize"] as const) {
        if (x[k] !== null) problems.push(`${path}.${k}: must be null on an unsupported line`);
      }
    } else if (hasUnsupported) {
      problems.push(`${path}.status: a line with an unsupported reason must be "unsupported"`);
    }
    if (status === "needs_review" && !hasReview) problems.push(`${path}.status: "needs_review" needs at least one review reason`);
    if (status === "ready") {
      if (hasReview) problems.push(`${path}.status: "ready" cannot carry a review reason`);
      if (x.name === null) problems.push(`${path}.name: a ready line needs a name`);
      if (isObj(x.quantity) && x.quantity.kind === "range") problems.push(`${path}.quantity: a ready line cannot have a range`);
      if (x.quantity !== null && x.unit === null) problems.push(`${path}.unit: a ready line with a quantity needs a unit`);
      if (x.quantity === null && x.amountUnstated === null) problems.push(`${path}.amountUnstated: a ready line without a quantity must say why (amountUnstated)`);
      if (Array.isArray(x.alternatives) && x.alternatives.length > 0) problems.push(`${path}.alternatives: a ready line cannot offer a choice of ingredients`);
    }
  }
  return problems;
}

// --- Page ----------------------------------------------------------------------------------------

const PAGE_KEYS = ["schemaVersion", "extractorVersion", "engines", "source", "page", "retention", "candidates", "stats", "diagnostics"] as const;
const CANDIDATE_KEYS = [
  "structure", "title", "description", "yieldText", "servings", "times", "author", "siteName", "category", "cuisine", "declaredUrl",
  "hasInstructions", "hasNutrition", "ingredientLines", "ingredients", "instructionCandidates", "imageCandidates",
] as const;
const IMAGE_ROLES = ["hero", "other", "unknown"];

function image(v: unknown, path: string, problems: string[]): void {
  if (!shape(v, ["url", "role"], path, problems)) return;
  if (!isHttpUrl(v.url)) problems.push(`${path}.url: expected an absolute http(s) link`);
  if (typeof v.role !== "string" || !IMAGE_ROLES.includes(v.role)) problems.push(`${path}.role: expected one of ${IMAGE_ROLES.join(", ")}`);
}

function candidate(c: unknown, path: string, problems: string[]): void {
  if (!shape(c, CANDIDATE_KEYS, path, problems)) return;
  if (c.structure !== "json_ld" && c.structure !== "microdata") problems.push(`${path}.structure: expected "json_ld" or "microdata"`);
  for (const k of ["title", "description", "yieldText", "author", "siteName", "category", "cuisine"] as const) stringOrNull(c[k], `${path}.${k}`, problems);
  if (c.servings !== null && !(typeof c.servings === "number" && Number.isInteger(c.servings) && c.servings >= 1 && c.servings <= 100)) {
    problems.push(`${path}.servings: expected an integer from 1 to 100 or null`);
  }
  if (shape(c.times, ["prepMinutes", "cookMinutes", "totalMinutes"], `${path}.times`, problems)) {
    for (const [k, v] of Object.entries(c.times)) {
      if (v !== null && !isNonNegativeInt(v)) problems.push(`${path}.times.${k.slice(0, 40)}: expected a non-negative integer or null`);
    }
  }
  if (c.declaredUrl !== null && !isHttpUrl(c.declaredUrl)) problems.push(`${path}.declaredUrl: expected an absolute http(s) link or null`);
  if (typeof c.hasInstructions !== "boolean") problems.push(`${path}.hasInstructions: expected a boolean`);
  if (typeof c.hasNutrition !== "boolean") problems.push(`${path}.hasNutrition: expected a boolean`);

  const lines = Array.isArray(c.ingredientLines) ? c.ingredientLines : null;
  if (lines === null) problems.push(`${path}.ingredientLines: expected an array`);
  else lines.forEach((l, i) => {
    if (typeof l !== "string") problems.push(`${path}.ingredientLines[${i}]: expected a string`);
  });
  if (!Array.isArray(c.ingredients)) problems.push(`${path}.ingredients: expected an array`);
  else {
    if (lines !== null && c.ingredients.length !== lines.length) {
      problems.push(`${path}.ingredients: ${c.ingredients.length} readings for ${lines.length} ingredient lines (must be one per line)`);
    }
    c.ingredients.forEach((ing, i) => {
      problems.push(...validateParsedIngredientV1(ing, `${path}.ingredients[${i}]`));
      if (lines !== null && isObj(ing) && typeof lines[i] === "string" && ing.raw !== lines[i]) {
        problems.push(`${path}.ingredients[${i}].raw: must equal ingredientLines[${i}]`);
      }
    });
  }

  if (!Array.isArray(c.instructionCandidates)) problems.push(`${path}.instructionCandidates: expected an array`);
  else c.instructionCandidates.forEach((s, i) => {
    const p = `${path}.instructionCandidates[${i}]`;
    if (!shape(s, ["section", "text"], p, problems)) return;
    stringOrNull(s.section, `${p}.section`, problems);
    if (typeof s.text !== "string" || s.text.length === 0) problems.push(`${p}.text: expected a non-empty string`);
  });
  if (!Array.isArray(c.imageCandidates)) problems.push(`${path}.imageCandidates: expected an array`);
  else c.imageCandidates.forEach((im, i) => image(im, `${path}.imageCandidates[${i}]`, problems));
}

/** Problems of a `RecipeExtractionV1` (empty = valid). */
export function validateRecipeExtractionV1(x: unknown): string[] {
  const problems: string[] = [];
  const path = "page";
  if (!shape(x, PAGE_KEYS, path, problems)) return problems;
  if (x.schemaVersion !== SCHEMA_VERSION) problems.push(`${path}.schemaVersion: expected "${SCHEMA_VERSION}"`);
  if (!isNonEmptyString(x.extractorVersion)) problems.push(`${path}.extractorVersion: expected a non-empty string`);
  if (shape(x.engines, ["page", "ingredient"], `${path}.engines`, problems)) {
    if (!isNonEmptyString(x.engines.page)) problems.push(`${path}.engines.page: expected a non-empty string`);
    if (!isNonEmptyString(x.engines.ingredient)) problems.push(`${path}.engines.ingredient: expected a non-empty string`);
  }
  if (shape(x.source, ["requestedUrl", "finalUrl", "finalHost"], `${path}.source`, problems)) {
    const s = x.source;
    for (const k of ["requestedUrl", "finalUrl"] as const) {
      if (s[k] !== null && !isHttpUrl(s[k])) problems.push(`${path}.source.${k}: expected an absolute http(s) link or null`);
    }
    if (s.finalHost !== null && !isNonEmptyString(s.finalHost)) problems.push(`${path}.source.finalHost: expected a non-empty string or null`);
    if (isHttpUrl(s.finalUrl)) {
      if (s.finalHost !== new URL(s.finalUrl).hostname) problems.push(`${path}.source.finalHost: must be the host of source.finalUrl`);
    } else if (s.finalHost !== null) problems.push(`${path}.source.finalHost: must be null without a final URL`);
  }
  if (shape(x.page, ["title", "siteName", "image"], `${path}.page`, problems)) {
    stringOrNull(x.page.title, `${path}.page.title`, problems);
    stringOrNull(x.page.siteName, `${path}.page.siteName`, problems);
    if (x.page.image !== null) image(x.page.image, `${path}.page.image`, problems);
  }
  if (x.retention !== "not_decided") problems.push(`${path}.retention: must be "not_decided"`);
  if (!Array.isArray(x.candidates)) problems.push(`${path}.candidates: expected an array`);
  else x.candidates.forEach((c, i) => candidate(c, `${path}.candidates[${i}]`, problems));
  if (shape(x.stats, ["jsonLdBlocks", "recipeNodes", "microdata"], `${path}.stats`, problems)) {
    if (!isNonNegativeInt(x.stats.jsonLdBlocks)) problems.push(`${path}.stats.jsonLdBlocks: expected a non-negative integer`);
    if (!isNonNegativeInt(x.stats.recipeNodes)) problems.push(`${path}.stats.recipeNodes: expected a non-negative integer`);
    if (typeof x.stats.microdata !== "boolean") problems.push(`${path}.stats.microdata: expected a boolean`);
  }
  if (!Array.isArray(x.diagnostics)) problems.push(`${path}.diagnostics: expected an array`);
  else x.diagnostics.forEach((d, i) => {
    const p = `${path}.diagnostics[${i}]`;
    if (!shape(d, ["code", "detail"], p, problems)) return;
    if (typeof d.code !== "string" || !hasOwn(DIAGNOSTICS, d.code)) problems.push(`${p}.code: not a known diagnostic code`);
    stringOrNull(d.detail, `${p}.detail`, problems);
  });
  return problems;
}

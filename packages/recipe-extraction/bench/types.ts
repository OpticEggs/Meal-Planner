/**
 * Benchmark label types and small pure helpers shared by the label loader, the comparison and the
 * scorer. Label semantics: CONTRACT-v1.md §7–§9 and fixtures/README.md. Pure: no I/O.
 */
import { UNIT_REGISTRY, type AmountUnstated, type DiagnosticCode, type Dimension, type IngredientStatus, type UnitCode } from "../src/contract";
import { cmp, parseRationalText, withinBounds, type Rational } from "../src/rational";

/**
 * Every ingredient split, in report order. `dev` and `holdout` (holdout-v1, previously exposed) are the
 * Phase 1 splits; `holdout2` is holdout-v2 (EVALUATION-PLAN-v2 §9; exposed since its single run);
 * `holdout3` is the future fresh holdout-v3 (EVALUATION-PLAN-v3) — its file may not exist yet.
 */
export const SPLITS = ["dev", "holdout", "holdout2", "holdout3"] as const;
export type Split = (typeof SPLITS)[number];
/** What `--split every` scores: dev + holdout-v1 + holdout-v2 (its Phase 2 meaning; never holdout-v3). */
export const EVERY_SPLITS = ["dev", "holdout", "holdout2"] as const satisfies readonly Split[];
/** The Phase 1 ingredient splits: the default of `loadIngredientCases` (unchanged behaviour for its callers). */
export const V1_SPLITS = ["dev", "holdout"] as const satisfies readonly Split[];
/** Page labels exist for these splits only. */
export const PAGE_SPLITS = ["dev", "holdout"] as const satisfies readonly Split[];
export type PageSplit = (typeof PAGE_SPLITS)[number];

/** Corpus category tags (snake_case). A case may carry several. */
export const CATEGORIES = [
  "integer_decimal",
  "fraction",
  "fraction_third",
  "mixed_vulgar",
  "nested_parens",
  "prep_note",
  "source_choice",
  "ingredient_alternatives",
  "range",
  "optional",
  "unstated_amount",
  "quantity_missing",
  "count_unit",
  "package_size",
  "oz_vs_floz",
  "compound_quantity",
  "equivalent_quantity",
  "percentage",
  "price_annotation",
  "form_cooked_raw",
  "number_word",
  "approximate",
  "imprecise_unit",
  "heading_non_ingredient",
  "empty",
  "unicode_text",
  "ambiguous_number_format",
  "size_word",
  "seasoning_lookalike",
  "seasoning_ordinary",
  "quart_pint_gallon",
  "long_line",
  "quantity_after_name",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = ["high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEASONING_CLASSES = ["ordinary_salt", "ordinary_black_pepper", "salt_and_pepper", "lookalike"] as const;
export type SeasoningClass = (typeof SEASONING_CLASSES)[number];

export const PROVENANCE_KINDS = ["synthetic_pattern", "owner_reported_line", "repo_test_input"] as const;
export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number];

export const STATUSES = ["ready", "needs_review", "unsupported"] as const satisfies readonly IngredientStatus[];
export const AMOUNT_UNSTATED = ["to_taste", "as_needed", "for_serving", "for_garnish", "other"] as const satisfies readonly AmountUnstated[];

/** Every `expect` field, in the CONTRACT §8 order. All must be present in a label. */
export const EXPECT_FIELDS = [
  "status",
  "name",
  "quantity",
  "unit",
  "packageSize",
  "equivalents",
  "form",
  "note",
  "alternatives",
  "optional",
  "approximate",
  "amountUnstated",
] as const;
export type ExpectField = (typeof EXPECT_FIELDS)[number];

/** Fields that may carry extra acceptable values (`accept`), counted separately from strict matches. */
export const ACCEPT_FIELDS = ["name", "note", "alternatives"] as const;

export interface LabelAmount {
  /** Label text: "n", "n/d" or "w n/d" (exact, positive). */
  quantity: string;
  unit: UnitCode;
}

export interface IngredientExpect {
  status: IngredientStatus;
  name: string | null;
  /** "n", "n/d", "w n/d", a range "a..b", or null. */
  quantity: string | null;
  unit: UnitCode | null;
  packageSize: LabelAmount | null;
  equivalents: LabelAmount[];
  form: "raw" | "cooked" | null;
  note: string | null;
  alternatives: string[];
  optional: boolean;
  approximate: boolean;
  amountUnstated: AmountUnstated | null;
}

export interface IngredientAccept {
  name?: string[];
  note?: (string | null)[];
  alternatives?: string[][];
}

export interface Provenance {
  kind: ProvenanceKind;
  source: string;
}

/**
 * Structured origin of a case (required for holdout2 and holdout3 cases, optional elsewhere): who wrote a synthetic
 * line, or the file, line and commit of a repository test input. `kind` equals `provenance.kind`.
 */
export type CaseSource =
  | { kind: "synthetic_pattern"; author: string }
  | { kind: "owner_reported_line"; author: string }
  | { kind: "repo_test_input"; file: string; line: number; commit: string };

export interface IngredientCase {
  id: string;
  split: Split;
  categories: Category[];
  input: string;
  expect: IngredientExpect;
  accept: IngredientAccept;
  severity: Severity;
  seasoningClass: SeasoningClass | null;
  provenance: Provenance;
  /** Required for holdout2 and holdout3 (EVALUATION-PLAN-v2 §9), optional elsewhere. */
  source?: CaseSource;
  /** A short template signature of the line's construction ("N unit food, prep"); required for holdout2 and holdout3. */
  construction?: string;
  rationale: string;
}

// --- Pages ---------------------------------------------------------------------------------------

/** Candidate fields scored per page candidate, in report order. */
export const PAGE_CANDIDATE_FIELDS = [
  "structure",
  "title",
  "servings",
  "yieldText",
  "prepMinutes",
  "cookMinutes",
  "totalMinutes",
  "author",
  "siteName",
  "category",
  "cuisine",
  "ingredientLines",
  "instructionCount",
  "imageUrls",
  "declaredUrl",
] as const;
export type PageCandidateField = (typeof PAGE_CANDIDATE_FIELDS)[number];

/** Text fields of a page candidate that may carry extra acceptable values. */
export const PAGE_ACCEPT_FIELDS = ["title", "yieldText", "author", "siteName", "category", "cuisine", "declaredUrl"] as const;
export type PageAcceptField = (typeof PAGE_ACCEPT_FIELDS)[number];

export interface PageCandidateLabel {
  structure: "json_ld" | "microdata";
  title: string | null;
  servings: number | null;
  yieldText: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  author: string | null;
  siteName: string | null;
  category: string | null;
  cuisine: string | null;
  /** Exact strings after entity decoding, markup removal and whitespace collapse, in order. */
  ingredientLines: string[];
  instructionCount: number;
  /** Absolute, in the order the recipe data lists them (og:image only when the recipe names none). */
  imageUrls: string[];
  declaredUrl: string | null;
  accept?: Partial<Record<PageAcceptField, (string | null)[]>>;
}

export interface PageLabel {
  id: string;
  split: PageSplit;
  /** File name under fixtures/pages/. */
  file: string;
  requestedUrl: string;
  finalUrl: string;
  isRecipe: boolean;
  expectedCandidateCount: number;
  candidates: PageCandidateLabel[];
  /** Diagnostic codes that must appear (a subset; others may also appear). */
  expectedDiagnostics: DiagnosticCode[];
  provenance: Provenance;
  rationale: string;
}

// --- Quantity label text -------------------------------------------------------------------------

export type LabelQuantity = { kind: "exact"; value: Rational } | { kind: "range"; min: Rational; max: Rational };

const ZERO = BigInt(0);

function positiveExact(s: string): Rational | null {
  const r = parseRationalText(s);
  if (!r || r.n === ZERO || !withinBounds(r)) return null;
  return r;
}

/** Exact label amount ("2", "1/3", "1 1/3"; decimals accepted) — positive and within contract bounds — or null. */
export function parseLabelExact(s: string): Rational | null {
  if (typeof s !== "string" || s.includes("..")) return null;
  return positiveExact(s);
}

/** A label quantity: exact text or a range "a..b" with a < b; null when malformed. */
export function parseLabelQuantity(s: string): LabelQuantity | null {
  if (typeof s !== "string") return null;
  const parts = s.split("..");
  if (parts.length === 1) {
    const value = positiveExact(s);
    return value ? { kind: "exact", value } : null;
  }
  if (parts.length !== 2) return null;
  const min = positiveExact(parts[0]);
  const max = positiveExact(parts[1]);
  if (!min || !max || cmp(min, max) >= 0) return null;
  return { kind: "range", min, max };
}

export function isUnitCode(code: unknown): code is UnitCode {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(UNIT_REGISTRY, code);
}

/** Registry dimension of a canonical unit code, or null for an unknown code. */
export function unitDimension(code: string): Dimension | null {
  return isUnitCode(code) ? UNIT_REGISTRY[code].dimension : null;
}

/**
 * The two Phase 1 engines: Table import 2's frozen `parseIngredientLine` (cb7b56e) translated into
 * contract v1, faithfully — including its defects. Nothing here improves a reading; that is Phase 2.
 *
 * The ONE intended deviation from legacy behaviour: when the cleaned line is longer than
 * LIMITS.maxLineChars, legacy silently reads only the first 500 characters; these engines read the
 * same 500 characters but add `input_truncated` (a review reason), so a cut line is never `ready`.
 * "Longer" means the line after legacy cleaning (controls → spaces, whitespace collapsed, trimmed),
 * i.e. exactly when legacy's `.slice(0, 500)` cut something.
 */
import { LIMITS, type IngredientEngine, type ParsedIngredientV1, type ReasonCode, type UnitV1, type ExactQuantity } from "../contract";
import { parseIngredientLine, type IngredientLine } from "../legacy/ingredient-line";
import { normalizeUnit } from "../legacy/units";
import { fromDecimalString, toExactQuantity } from "../rational";
import { tryUnitV1 } from "../units";

export const LEGACY_ENGINE_ID = "legacy-table-import-2";
export const LEGACY_SUGGESTION_ENGINE_ID = "legacy-table-import-2+suggestion";

// --- Legacy text handling, restated (verified against the frozen parser in tests/contract) ---------

/** Legacy's control/bidi class (C0, DEL, U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+FEFF). */
export const LEGACY_CONTROLS = /[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g;

/** What legacy reads: the cleaned line capped at 500 characters, and whether the cap cut anything. */
export function legacyNormalized(raw: unknown): { normalized: string; truncated: boolean } {
  const full = (typeof raw === "string" ? raw : "").replace(LEGACY_CONTROLS, " ").replace(/\s+/g, " ").trim();
  return { normalized: full.slice(0, LIMITS.maxLineChars), truncated: full.length > LIMITS.maxLineChars };
}

// Legacy pre-cleaning before the amount is read: one list bullet, price-only parentheticals.
const PRICE = /\(\s*\$\s*(?:\d{1,6}(?:\.\d{1,2})?|\.\d{1,2})\s*\*{0,3}\s*\)/g;
const legacyLine = (normalized: string) => normalized.replace(/^[•·*\-–]\s+/, "").replace(PRICE, " ").replace(/\s+/g, " ").trim();

// Legacy's leading-amount patterns, in its order (mixed, fraction, vulgar, decimal/integer).
const VULGAR_CHARS = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒";
const AMOUNT_PATTERNS: readonly RegExp[] = [
  /^(\d{1,6})\s+(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/])/,
  /^(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/])/,
  new RegExp(`^(\\d{1,6})?\\s?([${VULGAR_CHARS}])`, "u"),
  /^(\d{1,12}(?:\.\d{1,6})?|\.\d{1,6})(?![\d/⁄])/,
];

/** The leading amount exactly as written at the start of legacy's cleaned line, or null. */
export function leadingAmountText(line: string): string | null {
  for (const re of AMOUNT_PATTERNS) {
    const m = re.exec(line);
    if (m) return m[0];
  }
  return null;
}

const FL_OZ = /^(?:fl\.?\s?oz\.?|fluid\s+ounces?)(?=[\s,)]|$)/i;
const UNIT_WORD = /^([A-Za-z]{1,12}\.?)(?=[\s,)]|$)/;

/** The unit word as written after the amount on a line legacy parsed with `unit`; "" for an implicit each. */
function unitSource(line: string, amountText: string, unit: string): string {
  const rest = line.slice(amountText.length).trim();
  if (unit === "fl_oz") return FL_OZ.exec(rest)?.[0] ?? "";
  const m = UNIT_WORD.exec(rest);
  if (!m) return "";
  if (unit !== "each") return m[1];
  return normalizeUnit(m[1].replace(/\.$/, "").toLowerCase()) === "each" ? m[1] : "";
}

// --- Reasons -------------------------------------------------------------------------------------

const REASON_MAP: Record<string, ReasonCode> = {
  "empty line": "empty_line",
  "no fixed quantity": "legacy_no_fixed_quantity",
  "alternatives (or)": "legacy_contains_or",
  "parenthetical package size or note with numbers": "legacy_parenthetical_number",
  "no quantity": "quantity_missing",
  "invalid fraction": "quantity_invalid",
  "fraction not exact as a decimal": "legacy_fraction_not_exact_decimal",
  "unrecognized number format": "number_format_ambiguous",
  "quantity range": "quantity_range",
  "non-positive quantity": "quantity_not_positive",
  "implausible quantity": "quantity_implausible",
  "unrecognized quantity": "legacy_unrecognized_quantity",
  "no ingredient name": "name_missing",
  "more than one quantity": "legacy_more_than_one_quantity",
};

/** The v1 code of a legacy reason text; `unclassified` for any text this table does not know. */
export function legacyReasonCode(reason: string): ReasonCode {
  if (Object.prototype.hasOwnProperty.call(REASON_MAP, reason)) return REASON_MAP[reason];
  if (/^unit not supported: /.test(reason)) return "legacy_unit_not_supported";
  return "unclassified";
}

const dedupe = (codes: ReasonCode[]): ReasonCode[] => [...new Set(codes)];

// --- Translation ---------------------------------------------------------------------------------

function exactFromDecimal(text: string, notation: "decimal" | "fraction"): ExactQuantity | null {
  const r = fromDecimalString(text);
  return r ? toExactQuantity(r, notation) : null;
}

/** The legacy reading of a line, plus the v1 translation of it (no suggestion applied). */
function translate(line: unknown): { legacy: IngredientLine; v1: ParsedIngredientV1 } {
  const legacy = parseIngredientLine(line as string);
  const { normalized, truncated } = legacyNormalized(line);
  const reasons: ReasonCode[] = [];
  if (truncated) reasons.push("input_truncated");
  for (const r of legacy.reasons) reasons.push(legacyReasonCode(r));

  const unsupported = legacy.status === "requires_review" && legacy.reasons.length === 1 && legacy.reasons[0] === "empty line";
  const cleaned = legacyLine(normalized);
  const amountText = leadingAmountText(cleaned);
  const notation = amountText !== null && amountText.includes(".") ? "decimal" : "fraction";

  let quantity: ExactQuantity | null = null;
  if (legacy.quantity !== null) {
    quantity = exactFromDecimal(legacy.quantity, notation);
    if (quantity === null) reasons.push("unclassified"); // never seen: legacy quantities are positive and ≤ 10 000
  }
  let unit: UnitV1 | null = null;
  if (legacy.unit !== null) {
    unit = tryUnitV1(legacy.unit, amountText === null ? "" : unitSource(cleaned, amountText, legacy.unit));
    if (unit === null) reasons.push("unclassified"); // never seen: legacy units are all registry codes
  }

  const codes = dedupe(reasons);
  const status = unsupported ? "unsupported" : legacy.status === "parsed" && codes.length === 0 ? "ready" : "needs_review";
  const v1: ParsedIngredientV1 = {
    raw: typeof line === "string" ? line : "",
    normalized,
    status,
    name: status === "unsupported" || legacy.name === "" ? null : legacy.name,
    quantity: status === "unsupported" ? null : quantity,
    unit: status === "unsupported" ? null : unit,
    packageSize: null,
    equivalents: [],
    form: legacy.form,
    note: legacy.note,
    alternatives: [],
    optional: false,
    approximate: false,
    amountUnstated: null,
    reasons: codes,
    evidence: { spans: {} },
  };
  return { legacy, v1 };
}

/** `legacy-table-import-2`: the frozen parser, translated. */
export const legacyEngine: IngredientEngine = Object.freeze({
  id: LEGACY_ENGINE_ID,
  description:
    "Table import 2's ingredient-line parser (frozen copy at cb7b56e) translated into contract v1. Faithful, including its defects; " +
    "the only deviation is the input_truncated reason when a line is cut at 500 characters.",
  parse(line: string): ParsedIngredientV1 {
    return translate(line).v1;
  },
});

/**
 * `legacy-table-import-2+suggestion` (benchmark only): the same, with the legacy one-click suggestion
 * filled in — what the current "Use suggestion" button would have produced (e.g. 0.3333 for 1/3,
 * kept exactly as 3333/10000). Status stays `needs_review`; `legacy_suggestion_applied` says so.
 * Suggestion units carry `source: ""`: legacy reports the proposed unit, not the word the line wrote.
 */
export const legacySuggestionEngine: IngredientEngine = Object.freeze({
  id: LEGACY_SUGGESTION_ENGINE_ID,
  description:
    "Benchmark only: legacy-table-import-2 with the legacy one-click suggestion filled in (rounded thirds stay 0.3333). " +
    "Status stays needs_review with legacy_suggestion_applied.",
  parse(line: string): ParsedIngredientV1 {
    const { legacy, v1 } = translate(line);
    const s = legacy.suggestion;
    if (s === null || v1.status === "unsupported") return v1;
    const reasons = [...v1.reasons];
    if (s.use) {
      const quantity = exactFromDecimal(s.quantity, "decimal");
      const unit = tryUnitV1(s.unit, "");
      // A proposal the contract cannot carry (e.g. 0.000001 × 1.5 L: denominator above 1 000 000) keeps
      // neither its amount nor its unit, and says so with `unclassified`.
      const representable = quantity !== null && unit !== null;
      if (!representable) reasons.push("unclassified");
      v1.quantity = representable ? quantity : null;
      v1.unit = representable ? unit : null;
      v1.name = s.name.length > 0 ? s.name : null;
      v1.form = s.form;
    } else {
      v1.quantity = null;
      v1.unit = null;
    }
    reasons.push("legacy_suggestion_applied");
    v1.reasons = dedupe(reasons);
    v1.status = "needs_review";
    return v1;
  },
});

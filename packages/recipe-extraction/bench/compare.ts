/**
 * CONTRACT-v1 §9 normalization and per-field comparison of one engine reading against one label.
 * Pure: no I/O. Imports only types from the contract and functions from rational.ts.
 *
 * Strict = equal to the label after normalization. Accepted = strict, or equal to one of the case's
 * `accept` values (name, note, alternatives); for other fields accepted = strict.
 */
import type { Dimension, ExactQuantity, ParsedIngredientV1 } from "../src/contract";
import { eq, formatMixed, fromExactQuantity, type Rational } from "../src/rational";
import { EXPECT_FIELDS, parseLabelExact, parseLabelQuantity, unitDimension, type ExpectField, type IngredientCase, type LabelAmount, type Severity } from "./types";

// --- Normalization -------------------------------------------------------------------------------

const EDGE_PUNCT = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;

/** §9 name normalization: NFKC, lowercase, collapsed whitespace, leading/trailing punctuation trimmed. Empty → null. */
export function normalizeText(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim().replace(EDGE_PUNCT, "");
  return t === "" ? null : t;
}

/** §9 note comparison form: normalized text as a sorted token bag, ignoring ( ) , ; : — null → []. */
export function noteTokens(s: unknown): string[] {
  const t = normalizeText(s);
  if (t === null) return [];
  return t.replace(/[(),;:]/g, " ").split(/\s+/u).filter((x) => x !== "").sort();
}

const sameTokens = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** §9 alternatives comparison form: the set of normalized names (sorted, deduplicated). */
export function alternativeSet(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(normalizeText).filter((x): x is string => x !== null))].sort();
}

// --- Rendering (strings only, for mismatch lists) ------------------------------------------------

const ratText = (r: Rational) => formatMixed(r);

function exactOf(q: unknown): Rational | null {
  if (!q || typeof q !== "object" || (q as ExactQuantity).kind !== "exact") return null;
  return fromExactQuantity(q as ExactQuantity);
}

export function renderQuantity(q: unknown): string {
  if (q === null || q === undefined) return "null";
  if (typeof q !== "object") return `invalid(${String(q)})`;
  const k = (q as { kind?: unknown }).kind;
  if (k === "exact") {
    const r = exactOf(q);
    return r ? ratText(r) : "invalid(non-canonical exact quantity)";
  }
  if (k === "range") {
    const { min, max } = q as { min: unknown; max: unknown };
    const a = exactOf(min);
    const b = exactOf(max);
    return a && b ? `${ratText(a)}..${ratText(b)}` : "invalid(non-canonical range)";
  }
  return "invalid(unknown quantity kind)";
}

function unitCode(u: unknown): string | null {
  if (!u || typeof u !== "object") return null;
  const c = (u as { canonical?: unknown }).canonical;
  return typeof c === "string" ? c : null;
}

function engineDimension(u: unknown): Dimension | string | null {
  const code = unitCode(u);
  if (code === null) return null;
  return unitDimension(code) ?? (typeof (u as { dimension?: unknown }).dimension === "string" ? (u as { dimension: string }).dimension : "unknown");
}

function renderEngineAmount(a: unknown): string {
  if (a === null || a === undefined) return "null";
  if (typeof a !== "object") return "invalid";
  const { quantity, unit } = a as { quantity?: unknown; unit?: unknown };
  return `${renderQuantity(quantity)} ${unitCode(unit) ?? "null"}`;
}

const renderLabelAmount = (a: LabelAmount | null) => (a ? `${ratText(parseLabelExact(a.quantity)!)} ${a.unit}` : "null");
const renderList = (xs: string[]) => (xs.length === 0 ? "[]" : xs.join(" | "));
const renderScalar = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "string" ? v : JSON.stringify(v));

// --- Field comparison ----------------------------------------------------------------------------

function amountKey(quantity: Rational | null, unit: string | null): string {
  return `${unit ?? "?"}:${quantity ? `${quantity.n}/${quantity.d}` : "?"}`;
}

function sameQuantity(label: string | null, got: unknown): boolean {
  if (label === null) return got === null || got === undefined;
  const want = parseLabelQuantity(label);
  if (!want || !got || typeof got !== "object") return false;
  const kind = (got as { kind?: unknown }).kind;
  if (want.kind === "exact") {
    const r = exactOf(got);
    return kind === "exact" && r !== null && eq(r, want.value);
  }
  if (kind !== "range") return false;
  const a = exactOf((got as { min?: unknown }).min);
  const b = exactOf((got as { max?: unknown }).max);
  return a !== null && b !== null && eq(a, want.min) && eq(b, want.max);
}

function sameAmount(label: LabelAmount | null, got: unknown): boolean {
  if (label === null) return got === null || got === undefined;
  if (!got || typeof got !== "object") return false;
  const { quantity, unit } = got as { quantity?: unknown; unit?: unknown };
  const r = exactOf(quantity);
  const want = parseLabelExact(label.quantity);
  return unitCode(unit) === label.unit && r !== null && want !== null && eq(r, want);
}

function sameEquivalents(label: LabelAmount[], got: unknown): boolean {
  if (!Array.isArray(got)) return false;
  const want = label.map((a) => amountKey(parseLabelExact(a.quantity), a.unit)).sort();
  const have = got.map((a) => amountKey(exactOf(a?.quantity), unitCode(a?.unit))).sort();
  return want.length === have.length && want.every((x, i) => x === have[i]);
}

export interface FieldResult {
  strict: boolean;
  accepted: boolean;
}

export type FalseCertaintyKind = "suppressed_ambiguity" | "wrong_amount" | "wrong_name";

export interface FieldMismatch {
  field: ExpectField;
  expected: string;
  got: string;
  /** True when the reading matches one of the case's `accept` values. */
  accepted: boolean;
}

export interface CaseComparison {
  id: string;
  fields: Record<ExpectField, FieldResult>;
  labelReady: boolean;
  engineReady: boolean;
  corePass: FieldResult;
  fullPass: FieldResult;
  /** Engine `ready` while the label is not ready, or a core field wrong (§9). Null when not falsely certain. */
  falseCertainty: { kind: FalseCertaintyKind; severity: Severity } | null;
  /** Engine `ready`, core fields right, but note/flags/equivalents differ (reported separately, low). */
  detailOnlyMismatch: boolean;
  /** Engine states an amount where the label has none. */
  fabricatedQuantity: boolean;
  /** The label has a unit or a package size (cross-dimension denominator). */
  crossDimensionApplicable: boolean;
  /** Engine unit (or package-size unit) dimension differs from the label's. */
  crossDimension: boolean;
  mismatches: FieldMismatch[];
  /** Set when the engine threw; every field then counts as a mismatch. */
  error: string | null;
}

const CORE: readonly ExpectField[] = ["status", "name", "quantity", "unit"];

/** Compare one reading with its label. `got` may be malformed; anything unreadable is a mismatch. */
export function compareIngredient(c: IngredientCase, got: ParsedIngredientV1): CaseComparison {
  const e = c.expect;
  const g = (got ?? {}) as Partial<ParsedIngredientV1>;
  const acc = c.accept ?? {};
  const fields = {} as Record<ExpectField, FieldResult>;
  const exp = {} as Record<ExpectField, string>;
  const have = {} as Record<ExpectField, string>;
  const set = (f: ExpectField, strict: boolean, accepted: boolean, expected: string, gotText: string) => {
    fields[f] = { strict, accepted: strict || accepted };
    exp[f] = expected;
    have[f] = gotText;
  };

  set("status", g.status === e.status, false, e.status, renderScalar(g.status));

  const gName = normalizeText(g.name);
  const nameStrict = gName === normalizeText(e.name);
  set("name", nameStrict, (acc.name ?? []).some((n) => normalizeText(n) === gName), renderScalar(e.name), renderScalar(g.name));

  set("quantity", sameQuantity(e.quantity, g.quantity), false, e.quantity === null ? "null" : renderLabelQuantityText(e.quantity), renderQuantity(g.quantity));
  set("unit", unitCode(g.unit) === e.unit, false, renderScalar(e.unit), renderScalar(unitCode(g.unit)));
  set("packageSize", sameAmount(e.packageSize, g.packageSize), false, renderLabelAmount(e.packageSize), renderEngineAmount(g.packageSize));
  set("equivalents", sameEquivalents(e.equivalents, g.equivalents), false, renderList(e.equivalents.map((a) => renderLabelAmount(a))), Array.isArray(g.equivalents) ? renderList(g.equivalents.map(renderEngineAmount)) : "invalid");
  set("form", (g.form ?? null) === e.form, false, renderScalar(e.form), renderScalar(g.form));

  const gNote = noteTokens(g.note);
  set("note", sameTokens(gNote, noteTokens(e.note)), (acc.note ?? []).some((n) => sameTokens(noteTokens(n), gNote)), renderScalar(e.note), renderScalar(g.note));

  const gAlt = alternativeSet(g.alternatives);
  const altEq = (xs: string[]) => {
    const s = alternativeSet(xs);
    return s.length === gAlt.length && s.every((x, i) => x === gAlt[i]);
  };
  set("alternatives", Array.isArray(g.alternatives) && altEq(e.alternatives), Array.isArray(g.alternatives) && (acc.alternatives ?? []).some(altEq), renderList(e.alternatives), Array.isArray(g.alternatives) ? renderList(g.alternatives.map(String)) : "invalid");
  set("optional", g.optional === e.optional, false, String(e.optional), renderScalar(g.optional));
  set("approximate", g.approximate === e.approximate, false, String(e.approximate), renderScalar(g.approximate));
  set("amountUnstated", (g.amountUnstated ?? null) === e.amountUnstated, false, renderScalar(e.amountUnstated), renderScalar(g.amountUnstated));

  const all = (k: keyof FieldResult, list: readonly ExpectField[]) => list.every((f) => fields[f][k]);
  const labelReady = e.status === "ready";
  const engineReady = g.status === "ready";

  let falseCertainty: CaseComparison["falseCertainty"] = null;
  let detailOnlyMismatch = false;
  if (engineReady) {
    if (!labelReady) falseCertainty = { kind: "suppressed_ambiguity", severity: c.severity };
    else if (!fields.quantity.strict || !fields.unit.strict || !fields.packageSize.strict) falseCertainty = { kind: "wrong_amount", severity: "high" };
    else if (!fields.name.accepted) falseCertainty = { kind: "wrong_name", severity: "medium" };
    else detailOnlyMismatch = !EXPECT_FIELDS.every((f) => fields[f].accepted);
  }

  const gQuantityPresent = g.quantity !== null && g.quantity !== undefined;
  const dimDiffers = (labelUnit: string | null, gotUnit: unknown) => labelUnit !== null && unitCode(gotUnit) !== null && unitDimension(labelUnit) !== engineDimension(gotUnit);
  const crossDimension = dimDiffers(e.unit, g.unit) || dimDiffers(e.packageSize?.unit ?? null, g.packageSize?.unit ?? null);

  return {
    id: c.id,
    fields,
    labelReady,
    engineReady,
    corePass: { strict: all("strict", CORE), accepted: all("accepted", CORE) },
    fullPass: { strict: all("strict", EXPECT_FIELDS), accepted: all("accepted", EXPECT_FIELDS) },
    falseCertainty,
    detailOnlyMismatch,
    fabricatedQuantity: e.quantity === null && gQuantityPresent,
    crossDimensionApplicable: e.unit !== null || e.packageSize !== null,
    crossDimension,
    mismatches: EXPECT_FIELDS.filter((f) => !fields[f].strict).map((f) => ({ field: f, expected: exp[f], got: have[f], accepted: fields[f].accepted })),
    error: null,
  };
}

function renderLabelQuantityText(s: string): string {
  const q = parseLabelQuantity(s);
  if (!q) return `invalid(${s})`;
  return q.kind === "exact" ? ratText(q.value) : `${ratText(q.min)}..${ratText(q.max)}`;
}

/** The comparison for an engine that threw on this case: nothing matches, nothing is claimed. */
export function erroredComparison(c: IngredientCase, message: string): CaseComparison {
  const fields = {} as Record<ExpectField, FieldResult>;
  for (const f of EXPECT_FIELDS) fields[f] = { strict: false, accepted: false };
  return {
    id: c.id,
    fields,
    labelReady: c.expect.status === "ready",
    engineReady: false,
    corePass: { strict: false, accepted: false },
    fullPass: { strict: false, accepted: false },
    falseCertainty: null,
    detailOnlyMismatch: false,
    fabricatedQuantity: false,
    crossDimensionApplicable: c.expect.unit !== null || c.expect.packageSize !== null,
    crossDimension: false,
    mismatches: EXPECT_FIELDS.map((f) => ({ field: f, expected: "(label)", got: "(engine error)", accepted: false })),
    error: message,
  };
}

// --- Page fields -------------------------------------------------------------------------------

/** Whitespace canonicalization for published ingredient lines: any whitespace run → one space, trimmed. */
export const canonicalLine = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/gu, " ").trim() : null);

export function sameLines(label: string[], got: unknown): boolean {
  if (!Array.isArray(got) || got.length !== label.length) return false;
  return label.every((l, i) => canonicalLine(got[i]) === canonicalLine(l));
}

/** Text page fields (title, author, site name…): §9 text normalization; null equals null. */
export const sameText = (label: string | null, got: unknown) => normalizeText(label) === normalizeText(got);

export { renderScalar };

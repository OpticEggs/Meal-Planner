/**
 * Outcome scoring, **outcomes v3**, for EVALUATION-PLAN-v3 (which carries EVALUATION-PLAN-v2 §3–§7, its
 * A1–A7 thresholds and its readings unchanged except SCORE-01 and SCORE-02 below): one outcome class per
 * line (C1–C8, with C1+ and the C3/C5 partial sub-classes, or CE), the severe semantic errors S1–S8,
 * false-certainty severity, aggregates per set / category tag / source kind with numerators,
 * denominators and Wilson 95% intervals, and the acceptance criteria A1–A7.
 *
 * Each line is judged in four separate dimensions:
 *   1. output validity — `validateParsedIngredientV1` problems of the complete output;
 *   2. engine error — the engine threw;
 *   3. nondeterminism — the line is parsed twice and the two serialized results differ;
 *   4. semantic accuracy — the C/S classification, computed only for a valid, deterministic, non-error
 *      output. Any failure of 1–3 makes the line CE (SCORE-02): it stays in every denominator, gets no
 *      C1–C8 class and no S code, and fails A6. An invalid output is never repaired or coerced.
 * SCORE-01: sensitivity figure 3(b) leaves out the needs_review labels with no amount, defined by the
 * label (quantity, unit and alternatives all null) as the plan states — not by category tag.
 *
 * Field comparison is CONTRACT-v1 §9 via `compareIngredient`. "Accepted" matching (a case's `accept`
 * values count) is the acceptance basis; strict figures are reported alongside. Pure: readings come from
 * the caller's engine; no I/O. The outcomes v2 scorer is archived in `bench/archive/` (byte-identical).
 */
import type { Dimension, IngredientEngine, IngredientStatus, ParsedIngredientV1 } from "../src/contract";
import { validateParsedIngredientV1 } from "../src/validate";
import { canonicalJson } from "./canonical";
import { alternativeSet, compareIngredient, erroredComparison, normalizeText, type CaseComparison } from "./compare";
import { rate, wilsonInterval, Z95, type Rate } from "./stats";
import {
  CATEGORIES,
  CONTRACT12_ITEMS,
  EXPECT_FIELDS,
  FAMILIES,
  PROVENANCE_KINDS,
  SPLITS,
  unitDimension,
  type Category,
  type Contract12Item,
  type ExposureAudit,
  type Family,
  type IngredientCase,
  type ProvenanceKind,
  type Split,
} from "./types";

export const SCORER_ID = "outcomes" as const;
export const SCORER_VERSION = "v3" as const;
export const OUTCOME_PLAN = "EVALUATION-PLAN-v3" as const;
/** The scorer's source file (package-relative); the report carries its SHA-256. */
export const SCORER_SOURCE = "bench/outcomes.ts" as const;
/** Files the scorer's results also depend on (package-relative); the report carries their SHA-256 too. */
export const SCORER_DEPENDENCIES = ["bench/canonical.ts", "bench/compare.ts", "bench/stats.ts", "bench/types.ts", "src/validate.ts"] as const;

/** C1–C8 (§4) plus CE: engine error, invalid output or nondeterminism (SCORE-02). */
export const OUTCOME_CLASSES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "CE"] as const;
export type OutcomeClass = (typeof OUTCOME_CLASSES)[number];
export const SEVERE_CODES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;
export type SevereCode = (typeof SEVERE_CODES)[number];
/** C3/C5 sub-classes: a useful partial, b wrong partial, c abstention, x not defined by the plan. */
export const PARTIAL_KINDS = ["a", "b", "c", "x"] as const;
export type PartialKind = (typeof PARTIAL_KINDS)[number];
/** The engine's status string; "error" when the first parse threw, "invalid" when not a contract status. */
export type EngineStatus = IngredientStatus | "error" | "invalid";
export type FalseCertaintySeverity = "high" | "medium";

/** Readings the plan leaves open, as implemented here. Reported verbatim in every outcomes section. */
export const INTERPRETATION: readonly string[] = [
  "CE (SCORE-02): a line is CE when the engine threw on either of its two parses, when either complete output fails validateParsedIngredientV1 (src/validate.ts) — not merely when its status is outside the contract (plan v3 change log 2(a)) — or when the two parses differ: canonical JSON of the whole outputs, unscored fields (evidence, reasons, unit source) included, or the thrown messages, so two different errors are also nondeterministic (change log 2(c)). A CE line stays in every denominator (so it is never C1), gets no C1–C8 class, no C3/C5 sub-class, no false-certainty severity and no S code, counts as not accurate for A2 field accuracy, and fails A6. An invalid output is never repaired or coerced to make it scoreable. Validity, engine error and nondeterminism are reported as separate dimensions; the semantic classification below applies only to valid, deterministic, non-error outputs.",
  "C3/C5 sub-classes are decided in the order b, c, a, x over the engine's name, quantity, unit and package size (accepted values count; a non-empty alternatives list is also compared): b = a non-null field contradicts the label; c = name, quantity and unit are all null and no alternatives were read; a = no contradiction and the food was named (name non-null, or, on a choice-of-ingredients label, the options matched); x = no contradiction but the food was not named while an amount or unit was read — a case the plan does not define, reported separately and still counted in C3/C5.",
  "C2 severity: high when the line has any of S2–S8 or a wrong unit or package size; medium when only the name is wrong (not S7). The one remaining C2 case — a fabricated quantity (S1) on a ready label whose unit also matches (both null) — is not covered by the plan's rule and is reported as high (a valid ready output with a quantity always has a unit, so under SCORE-02 this case can only arise as CE).",
  "S5 compares the engine name (§9 normalization) with the label's alternatives and any accepted alternative lists; it applies to any engine status when the engine reports no alternatives.",
  "S7 uses the accepted name match and §9-normalized word sets: the engine's (non-null) name words form a proper subset of the label name's words.",
  "S6 fires when the label has a packageSize, the engine has none and the engine unit is mass or volume, whether or not the engine states a quantity (plan v3 change log 2(b)).",
  "S3 is the CONTRACT-v1 §9 cross-dimension check: the engine unit's dimension differs from the label unit's, or the engine package size's from the label package size's, both present.",
  "A2 field accuracy counts a field as accurate when it matches the label, whatever the engine status (a CE line counts as not accurate). A1/A2 'met with confidence' uses the unrounded Wilson lower bound (z = 1.959964).",
  "A6 in the scorer: CE = 0 — no engine error, every output valid, every line read identically twice. The rest of A6 (legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; reports byte-deterministic) and A7 are recorded outside the scorer.",
  "Sensitivity 3(b) (SCORE-01): the needs_review labels with no amount are those whose label quantity and unit are null and whose alternatives are empty, whatever their category tags.",
  "Sensitivity (a) on holdout-v3 leaves out the cases marked debatable: true in holdout-v3.jsonl; on holdout-v2 the pre-registered list (ing-h2-0087). Sensitivity (c), holdout-v3 only: A1–A5 without the cases marked reliesOnNewReading: true (the result under CONTRACT-v1 §7 alone). Sensitivity (d), holdout-v3 only and only when fixtures/EXPOSURE-AUDIT-v3.json exists: A1–A5 without its matchedCaseIds. All three come from frozen data files, never from scorer constants, and are informational.",
  "holdout-v3 breakdowns: per repair family (the case's family), per CONTRACT-v1 §12 item exercised (a case counts in every item it lists; 'none' = no item) and per construction (the case's construction string; compact: lines, classes, S codes).",
  "Review-only pre-fills (informational, not plan classes; plan v3 change log 2): an invented option is an engine option that matches no label option (nor an accepted one); a dropped option is a label option missing from an engine list that invents none. Both are judged only on an engine alternatives list that matches neither the label's options nor an accepted list, so they never overlap; both stay visible next to C3b/C5b.",
];

// --- Reading an engine (dimensions 1–3) ----------------------------------------------------------------

/** One call of `engine.parse`: its output, or the message it threw. */
export type Parse = { ok: true; output: unknown } | { ok: false; error: string };
/** The two parses of one line. */
export interface Observation {
  first: Parse;
  second: Parse;
}

const errorText = (err: unknown) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err));

function parseOnce(engine: IngredientEngine, input: string): Parse {
  try {
    return { ok: true, output: engine.parse(input) };
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }
}

/** Parse one line twice (errors caught per call). */
export function observe(engine: IngredientEngine, input: string): Observation {
  return { first: parseOnce(engine, input), second: parseOnce(engine, input) };
}

/** One observation per distinct input of `cases`, in corpus order. */
export function observeAll(cases: readonly IngredientCase[], engine: IngredientEngine): Map<string, Observation> {
  const out = new Map<string, Observation>();
  for (const c of cases) if (!out.has(c.input)) out.set(c.input, observe(engine, c.input));
  return out;
}

/** An engine that answers each observed input with its first parse (or rethrows its first error), so the
 * CONTRACT §9 field scorer sees the same reading the outcome scorer classifies. Unobserved inputs are parsed live. */
export function replayEngine(engine: IngredientEngine, observations: ReadonlyMap<string, Observation>): IngredientEngine {
  return {
    id: engine.id,
    description: engine.description,
    parse(line: string): ParsedIngredientV1 {
      const o = observations.get(line);
      if (!o) return engine.parse(line);
      if (!o.first.ok) throw new Error(o.first.error);
      return o.first.output as ParsedIngredientV1;
    },
  };
}

/** The serialized form two parses are compared in: canonical JSON of the output, or the thrown message. */
export function serializeParse(p: Parse): string {
  if (!p.ok) return `throw ${JSON.stringify(p.error)}`;
  try {
    return `output ${canonicalJson(p.output)}`;
  } catch (err) {
    return `unserializable ${errorText(err)}`;
  }
}

export interface LineValidity {
  /** The engine threw on the first or the second parse (the first such message); else null. */
  engineError: string | null;
  /** `validateParsedIngredientV1` problems of the complete first output, then those of the second output prefixed
   * "second parse: " when they differ ([] for a parse that threw). Any problem makes the line invalid. */
  problems: string[];
  /** The two parses differ (serialized as `serializeParse`). */
  nondeterministic: boolean;
}

/** The contract validator's verdict on one parse ([] when the parse threw). */
const problemsOf = (p: Parse): string[] => (p.ok ? validateParsedIngredientV1(p.output) : []);
const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function lineValidity(o: Observation): LineValidity {
  const engineError = !o.first.ok ? o.first.error : !o.second.ok ? o.second.error : null;
  // Both parses are validated (plan v3 change log 2(a)); the second's problems are listed only when they differ.
  const first = problemsOf(o.first);
  const second = problemsOf(o.second);
  const problems = sameList(first, second) ? first : [...first, ...second.map((x) => `second parse: ${x}`)];
  // Two different thrown messages differ too (change log 2(c)).
  return { engineError, problems, nondeterministic: serializeParse(o.first) !== serializeParse(o.second) };
}

/** SCORE-02: engine error, invalid output or nondeterminism. */
export const isCE = (v: LineValidity) => v.engineError !== null || v.problems.length > 0 || v.nondeterministic;

/** SCORE-01: a needs_review label with no amount — label quantity, unit and alternatives all null. */
export const isBareNoAmountLabel = (c: IngredientCase) => c.expect.status === "needs_review" && c.expect.quantity === null && c.expect.unit === null && c.expect.alternatives.length === 0;

// --- Classification (dimension 4) --------------------------------------------------------------------

export interface LineOutcome {
  id: string;
  split: Split;
  categories: Category[];
  sourceKind: ProvenanceKind | null;
  labelStatus: IngredientStatus;
  engineStatus: EngineStatus;
  /** Dimensions 1–3. Any failure makes the line CE. */
  validity: LineValidity;
  /** The outcome class under accepted matching (the acceptance basis); CE for a CE line. */
  outcome: OutcomeClass;
  /** C1+ (accepted): C1 and every other field matches too. */
  fullyCorrect: boolean;
  /** C3/C5 sub-class (accepted), else null. */
  partial: PartialKind | null;
  /** C2 lines only. */
  falseCertainty: FalseCertaintySeverity | null;
  /** C1 whose only mismatches are non-core: a low "detail mismatch", not C2. */
  detailMismatch: boolean;
  /** Never on a CE line. */
  severe: SevereCode[];
  strict: { outcome: OutcomeClass; fullyCorrect: boolean };
  /** Field matches whatever the engine status (A2); all false on a CE line. */
  fields: { name: { strict: boolean; accepted: boolean }; quantity: boolean; unit: boolean };
  /** Review-only pre-fills (informational); false on a CE line. */
  reviewPrefill: { inventedOption: boolean; droppedOption: boolean };
  /** SCORE-01 label property (sensitivity 3(b)). */
  bareNoAmount: boolean;
  /** The case's construction template, when recorded. */
  construction: string | null;
  /** holdout-v3 case metadata (frozen with the labels), else null. */
  metadata: CaseMetadata | null;
}

export interface CaseMetadata {
  family: Family;
  contract12: Contract12Item[];
  reliesOnNewReading: boolean;
  debatable: boolean;
}

function metadataOf(c: IngredientCase): CaseMetadata | null {
  if (c.family === undefined || c.contract12 === undefined || c.reliesOnNewReading === undefined || c.debatable === undefined) return null;
  return { family: c.family, contract12: [...c.contract12], reliesOnNewReading: c.reliesOnNewReading, debatable: c.debatable };
}

const READ_STATUSES: readonly string[] = ["ready", "needs_review", "unsupported"];
const present = (v: unknown) => v !== null && v !== undefined;

function engineUnitDimension(u: unknown): Dimension | string | null {
  if (!u || typeof u !== "object") return null;
  const code = (u as { canonical?: unknown }).canonical;
  if (typeof code !== "string") return null;
  const d = (u as { dimension?: unknown }).dimension;
  return unitDimension(code) ?? (typeof d === "string" ? d : "unknown");
}

const words = (s: string | null) => new Set((s ?? "").split(" ").filter((w) => w !== ""));

function classOf(label: IngredientStatus, engine: IngredientStatus, coreMatches: boolean): OutcomeClass {
  if (engine === "ready") return label === "ready" && coreMatches ? "C1" : "C2";
  if (label === "ready") return engine === "needs_review" ? "C3" : "C4";
  if (label === "needs_review") return engine === "needs_review" ? "C5" : "C6";
  return engine === "unsupported" ? "C7" : "C8";
}

function partialKind(c: IngredientCase, g: Partial<ParsedIngredientV1>, r: CaseComparison): PartialKind {
  const name = normalizeText(g.name);
  const engineAlts = alternativeSet(g.alternatives);
  const f = r.fields;
  const contradicts =
    (name !== null && !f.name.accepted) ||
    (present(g.quantity) && !f.quantity.strict) ||
    (present(g.unit) && !f.unit.strict) ||
    (present(g.packageSize) && !f.packageSize.strict) ||
    (engineAlts.length > 0 && !f.alternatives.accepted);
  if (contradicts) return "b";
  if (name === null && !present(g.quantity) && !present(g.unit) && engineAlts.length === 0) return "c";
  if (name !== null) return "a";
  if (c.expect.name === null && engineAlts.length > 0) return "a";
  return "x";
}

function engineStatusOf(o: Observation): EngineStatus {
  if (!o.first.ok) return "error";
  const g = o.first.output;
  const s = g && typeof g === "object" ? (g as { status?: unknown }).status : undefined;
  return typeof s === "string" && READ_STATUSES.includes(s) ? (s as IngredientStatus) : "invalid";
}

/** The outcome of one line from its two parses. */
export function classifyObservation(c: IngredientCase, o: Observation): LineOutcome {
  const validity = lineValidity(o);
  const ce = isCE(validity);
  const r = o.first.ok ? compareIngredient(c, o.first.output as ParsedIngredientV1) : erroredComparison(c, o.first.error);
  const g = (o.first.ok && o.first.output && typeof o.first.output === "object" ? o.first.output : {}) as Partial<ParsedIngredientV1>;
  const engineStatus = engineStatusOf(o);
  const L = c.expect.status;
  const f = r.fields;
  const core = (mode: "strict" | "accepted") => f.name[mode] && f.quantity.strict && f.unit.strict && f.packageSize.strict;
  // A non-CE output is valid, so its status is a contract status.
  const outcome: OutcomeClass = ce ? "CE" : classOf(L, engineStatus as IngredientStatus, core("accepted"));
  const strictOutcome: OutcomeClass = ce ? "CE" : classOf(L, engineStatus as IngredientStatus, core("strict"));
  const fullyCorrect = outcome === "C1" && EXPECT_FIELDS.every((k) => f[k].accepted);
  const strictFullyCorrect = strictOutcome === "C1" && EXPECT_FIELDS.every((k) => f[k].strict);

  const name = normalizeText(g.name);
  const engineAlts = alternativeSet(g.alternatives);
  const labelOptions = new Set([...c.expect.alternatives, ...(c.accept.alternatives ?? []).flat()].map(normalizeText));
  const severe: SevereCode[] = [];
  // Semantic accuracy (dimension 4) only for a valid, deterministic, non-error output (SCORE-02).
  if (!ce) {
    const ready = engineStatus === "ready";
    if (c.expect.quantity === null && present(g.quantity)) severe.push("S1");
    if (ready && c.expect.quantity !== null && !f.quantity.strict) severe.push("S2");
    if (r.crossDimension) severe.push("S3");
    if (L === "needs_review" && ready) severe.push("S4");
    if (c.expect.alternatives.length >= 2 && engineAlts.length === 0 && name !== null && labelOptions.has(name)) severe.push("S5");
    // S6 whether or not the engine states a quantity (plan v3 change log 2(b)).
    if (c.expect.packageSize !== null && !present(g.packageSize)) {
      const d = engineUnitDimension(g.unit);
      if (d === "mass" || d === "volume") severe.push("S6");
    }
    if (ready && L === "ready" && !f.name.accepted && name !== null) {
      const want = words(normalizeText(c.expect.name));
      const got = words(name);
      if (got.size > 0 && got.size < want.size && [...got].every((w) => want.has(w))) severe.push("S7");
    }
    if (L === "unsupported" && ready) severe.push("S8");
  }

  let falseCertainty: FalseCertaintySeverity | null = null;
  if (outcome === "C2") {
    const high = severe.some((s) => s !== "S1") || !f.unit.strict || !f.packageSize.strict;
    falseCertainty = high ? "high" : !f.name.accepted && f.quantity.strict ? "medium" : "high";
  }

  const offeredWrongList = !ce && engineAlts.length > 0 && !f.alternatives.accepted;
  const labelAlts = alternativeSet(c.expect.alternatives);
  return {
    id: c.id,
    split: c.split,
    categories: [...c.categories],
    sourceKind: c.source?.kind ?? null,
    labelStatus: L,
    engineStatus,
    validity,
    outcome,
    fullyCorrect,
    partial: outcome === "C3" || outcome === "C5" ? partialKind(c, g, r) : null,
    falseCertainty,
    detailMismatch: outcome === "C1" && !fullyCorrect,
    severe,
    strict: { outcome: strictOutcome, fullyCorrect: strictFullyCorrect },
    fields: ce
      ? { name: { strict: false, accepted: false }, quantity: false, unit: false }
      : { name: { strict: f.name.strict, accepted: f.name.accepted }, quantity: f.quantity.strict, unit: f.unit.strict },
    reviewPrefill: {
      inventedOption: offeredWrongList && engineAlts.some((x) => !labelOptions.has(x)),
      droppedOption: offeredWrongList && labelAlts.length >= 2 && engineAlts.every((x) => labelOptions.has(x)) && labelAlts.some((x) => !engineAlts.includes(x)),
    },
    bareNoAmount: isBareNoAmountLabel(c),
    construction: c.construction ?? null,
    metadata: metadataOf(c),
  };
}

/**
 * The outcome of one line from a single reading treated as deterministic (both parses equal) — for unit
 * tests and callers that already hold one reading. `error` is set when the engine threw (then `reading`
 * is ignored).
 */
export function classifyLine(c: IngredientCase, reading: unknown, error: string | null = null): LineOutcome {
  const p: Parse = error !== null ? { ok: false, error } : { ok: true, output: reading };
  return classifyObservation(c, { first: p, second: p });
}

/** Parse every case twice (errors caught per call) and classify each line. */
export function classifyLines(cases: readonly IngredientCase[], engine: IngredientEngine, observations: ReadonlyMap<string, Observation> = observeAll(cases, engine)): LineOutcome[] {
  return cases.map((c) => classifyObservation(c, observations.get(c.input) ?? observe(engine, c.input)));
}

// --- Aggregates --------------------------------------------------------------------------------------

export interface OutcomeRates {
  /** Of R (lines labelled ready). */
  C1: Rate;
  C1plus: Rate;
  detailMismatchLow: Rate;
  /** Of N. */
  C2: Rate;
  C2High: Rate;
  C2Medium: Rate;
  /** C2 split by label status: of R, of A, of U. */
  C2OnReady: Rate;
  C2OnNeedsReview: Rate;
  C2OnUnsupported: Rate;
  /** Of R. */
  C3: Rate;
  C3a: Rate;
  C3b: Rate;
  C3c: Rate;
  C3x: Rate;
  C4: Rate;
  C3plusC4: Rate;
  /** Of A (lines labelled needs_review). */
  C5: Rate;
  C5a: Rate;
  C5b: Rate;
  C5c: Rate;
  C5x: Rate;
  C6: Rate;
  /** Of U (lines labelled unsupported). */
  C7: Rate;
  C8: Rate;
  /** Of N. */
  CE: Rate;
}

/** Dimensions 1–3, of N (a line may fail several). */
export interface ValidityRates {
  engineError: Rate;
  invalidOutput: Rate;
  nondeterministic: Rate;
  /** Valid, deterministic, non-error: the lines the semantic classification applies to (N − CE). */
  classified: Rate;
}

export interface OutcomeAggregate {
  lines: number;
  /** R, A, U. */
  ready: number;
  needsReview: number;
  unsupported: number;
  outcomes: OutcomeRates;
  validity: ValidityRates;
  /** Strict matching: C1 and C1+ of R, C2 of N. */
  strict: { C1: Rate; C1plus: Rate; C2: Rate };
  /** A2: field accuracy on R, whatever the engine status. */
  fieldAccuracyOnReady: { name: { strict: Rate; accepted: Rate }; quantity: Rate; unit: Rate };
  /** Of N. */
  severe: Record<SevereCode, Rate>;
  anySevere: Rate;
  /** Review-only pre-fills (informational), of N. */
  reviewPrefill: { inventedOption: Rate; droppedOption: Rate };
}

export const CASE_ID_KEYS = [
  "C1", "C1plus", "detailMismatchLow", "C2High", "C2Medium", "C3a", "C3b", "C3c", "C3x", "C4", "C5a", "C5b", "C5c", "C5x", "C6", "C7", "C8", "CE",
  "CEEngineError", "CEInvalidOutput", "CENondeterministic",
  ...SEVERE_CODES,
  "inventedOption", "droppedOption",
  "strictDiffers",
] as const;
export type CaseIdKey = (typeof CASE_ID_KEYS)[number];
export type OutcomeCaseIds = Record<CaseIdKey, string[]>;

const n = (lines: readonly LineOutcome[], f: (x: LineOutcome) => boolean) => lines.reduce((k, x) => k + (f(x) ? 1 : 0), 0);

export function aggregate(lines: readonly LineOutcome[]): OutcomeAggregate {
  const R = lines.filter((x) => x.labelStatus === "ready");
  const A = lines.filter((x) => x.labelStatus === "needs_review");
  const U = lines.filter((x) => x.labelStatus === "unsupported");
  const N = lines.length;
  const of = (set: readonly LineOutcome[], f: (x: LineOutcome) => boolean) => rate(n(set, f), set.length);
  const cls = (k: OutcomeClass, p?: PartialKind) => (x: LineOutcome) => x.outcome === k && (p === undefined || x.partial === p);
  const severe = {} as Record<SevereCode, Rate>;
  for (const s of SEVERE_CODES) severe[s] = of(lines, (x) => x.severe.includes(s));
  return {
    lines: N,
    ready: R.length,
    needsReview: A.length,
    unsupported: U.length,
    outcomes: {
      C1: of(R, cls("C1")),
      C1plus: of(R, (x) => x.fullyCorrect),
      detailMismatchLow: of(R, (x) => x.detailMismatch),
      C2: of(lines, cls("C2")),
      C2High: of(lines, (x) => x.falseCertainty === "high"),
      C2Medium: of(lines, (x) => x.falseCertainty === "medium"),
      C2OnReady: of(R, cls("C2")),
      C2OnNeedsReview: of(A, cls("C2")),
      C2OnUnsupported: of(U, cls("C2")),
      C3: of(R, cls("C3")),
      C3a: of(R, cls("C3", "a")),
      C3b: of(R, cls("C3", "b")),
      C3c: of(R, cls("C3", "c")),
      C3x: of(R, cls("C3", "x")),
      C4: of(R, cls("C4")),
      C3plusC4: of(R, (x) => x.outcome === "C3" || x.outcome === "C4"),
      C5: of(A, cls("C5")),
      C5a: of(A, cls("C5", "a")),
      C5b: of(A, cls("C5", "b")),
      C5c: of(A, cls("C5", "c")),
      C5x: of(A, cls("C5", "x")),
      C6: of(A, cls("C6")),
      C7: of(U, cls("C7")),
      C8: of(U, cls("C8")),
      CE: of(lines, cls("CE")),
    },
    validity: {
      engineError: of(lines, (x) => x.validity.engineError !== null),
      invalidOutput: of(lines, (x) => x.validity.problems.length > 0),
      nondeterministic: of(lines, (x) => x.validity.nondeterministic),
      classified: of(lines, (x) => x.outcome !== "CE"),
    },
    strict: { C1: of(R, (x) => x.strict.outcome === "C1"), C1plus: of(R, (x) => x.strict.fullyCorrect), C2: of(lines, (x) => x.strict.outcome === "C2") },
    fieldAccuracyOnReady: {
      name: { strict: of(R, (x) => x.fields.name.strict), accepted: of(R, (x) => x.fields.name.accepted) },
      quantity: of(R, (x) => x.fields.quantity),
      unit: of(R, (x) => x.fields.unit),
    },
    severe,
    anySevere: of(lines, (x) => x.severe.length > 0),
    reviewPrefill: { inventedOption: of(lines, (x) => x.reviewPrefill.inventedOption), droppedOption: of(lines, (x) => x.reviewPrefill.droppedOption) },
  };
}

export function caseIds(lines: readonly LineOutcome[]): OutcomeCaseIds {
  const pick = (f: (x: LineOutcome) => boolean) => lines.filter(f).map((x) => x.id);
  const out = {
    C1: pick((x) => x.outcome === "C1"),
    C1plus: pick((x) => x.fullyCorrect),
    detailMismatchLow: pick((x) => x.detailMismatch),
    C2High: pick((x) => x.falseCertainty === "high"),
    C2Medium: pick((x) => x.falseCertainty === "medium"),
    C3a: pick((x) => x.outcome === "C3" && x.partial === "a"),
    C3b: pick((x) => x.outcome === "C3" && x.partial === "b"),
    C3c: pick((x) => x.outcome === "C3" && x.partial === "c"),
    C3x: pick((x) => x.outcome === "C3" && x.partial === "x"),
    C4: pick((x) => x.outcome === "C4"),
    C5a: pick((x) => x.outcome === "C5" && x.partial === "a"),
    C5b: pick((x) => x.outcome === "C5" && x.partial === "b"),
    C5c: pick((x) => x.outcome === "C5" && x.partial === "c"),
    C5x: pick((x) => x.outcome === "C5" && x.partial === "x"),
    C6: pick((x) => x.outcome === "C6"),
    C7: pick((x) => x.outcome === "C7"),
    C8: pick((x) => x.outcome === "C8"),
    CE: pick((x) => x.outcome === "CE"),
    CEEngineError: pick((x) => x.validity.engineError !== null),
    CEInvalidOutput: pick((x) => x.validity.problems.length > 0),
    CENondeterministic: pick((x) => x.validity.nondeterministic),
    inventedOption: pick((x) => x.reviewPrefill.inventedOption),
    droppedOption: pick((x) => x.reviewPrefill.droppedOption),
    strictDiffers: pick((x) => x.strict.outcome !== x.outcome || x.strict.fullyCorrect !== x.fullyCorrect),
  } as OutcomeCaseIds;
  for (const s of SEVERE_CODES) out[s] = pick((x) => x.severe.includes(s));
  return out;
}

/** Most validator problems listed per CE line in the report (all are counted). */
export const MAX_PROBLEMS_PER_LINE = 10;

export interface CELine {
  id: string;
  engineError: string | null;
  nondeterministic: boolean;
  problemCount: number;
  /** The first MAX_PROBLEMS_PER_LINE validator problems, in validator order. */
  problems: string[];
}

export function ceLines(lines: readonly LineOutcome[]): CELine[] {
  return lines
    .filter((x) => x.outcome === "CE")
    .map((x) => ({ id: x.id, engineError: x.validity.engineError, nondeterministic: x.validity.nondeterministic, problemCount: x.validity.problems.length, problems: x.validity.problems.slice(0, MAX_PROBLEMS_PER_LINE) }));
}

// --- Acceptance (§6) ---------------------------------------------------------------------------------

export type CriterionStatus = "met with confidence" | "met" | "not met" | "checked outside the scorer" | "scorer checks met; rest checked outside the scorer";
export const ACCEPTANCE_THRESHOLD = { A1: 0.98, A2: 0.98, A5: 0.1 } as const;

/** The sets on which A1–A7 are computed: holdout-v2 (historical, exposed) and holdout-v3 (Gate G2). */
export const ACCEPTANCE_SPLITS = ["holdout2", "holdout3"] as const satisfies readonly Split[];
export type AcceptanceSplit = (typeof ACCEPTANCE_SPLITS)[number];
export const isAcceptanceSplit = (s: Split): s is AcceptanceSplit => (ACCEPTANCE_SPLITS as readonly Split[]).includes(s);

/** What an acceptance table on each set may claim. */
export const ACCEPTANCE_BASIS: Record<AcceptanceSplit, string> = {
  holdout2: "historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate",
  holdout3: "Gate G2 acceptance set (EVALUATION-PLAN-v3) — acceptance evidence only when FREEZE-v3.json exists and verifies holdout-v3 (see the freeze line)",
};

export interface AcceptanceCriterion {
  id: "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7";
  criterion: string;
  rule: string;
  status: CriterionStatus;
  /** The figures the status was decided on (numerator, denominator, Wilson interval). */
  evidence: Record<string, Rate>;
}

export interface AcceptanceReport {
  set: AcceptanceSplit;
  basis: string;
  criteria: AcceptanceCriterion[];
  /** A1 (point) and A2–A5 all met. */
  a1ToA5Met: boolean;
  /** The scorer's part of A6: CE = 0 (no engine error, every output valid, deterministic). */
  a6ScorerChecksMet: boolean;
}

/** Point estimate ≥ 98 % (exact integer arithmetic), with den > 0. */
const pointAtLeast98 = (r: Rate) => r.den > 0 && r.num * 100 >= r.den * 98;
const lowerAtLeast98 = (r: Rate) => r.den > 0 && (wilsonInterval(r.num, r.den) as [number, number])[0] >= ACCEPTANCE_THRESHOLD.A1;
const graded = (rs: Rate[]): CriterionStatus => (rs.every(lowerAtLeast98) ? "met with confidence" : rs.every(pointAtLeast98) ? "met" : "not met");
const zero = (rs: Rate[]): CriterionStatus => (rs.every((r) => r.num === 0) ? "met" : "not met");

export function acceptance(a: OutcomeAggregate, set: AcceptanceSplit): AcceptanceReport {
  const fa = a.fieldAccuracyOnReady;
  const s = a.severe;
  const c3c4 = a.outcomes.C3plusC4;
  const v = a.validity;
  const a6 = a.outcomes.CE.num === 0;
  const criteria: AcceptanceCriterion[] = [
    { id: "A1", criterion: "C1 on R ≥ 98 %", rule: "met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 %", status: graded([a.outcomes.C1]), evidence: { C1: a.outcomes.C1 } },
    {
      id: "A2",
      criterion: "name, quantity and unit field accuracy on R each ≥ 98 %",
      rule: "as A1, for each field (accepted name matches)",
      status: graded([fa.name.accepted, fa.quantity, fa.unit]),
      evidence: { name: fa.name.accepted, quantity: fa.quantity, unit: fa.unit },
    },
    { id: "A3", criterion: "high-severity false certainty = 0", rule: "count of C2 lines with high severity, on all lines", status: zero([a.outcomes.C2High]), evidence: { C2High: a.outcomes.C2High } },
    { id: "A4", criterion: "S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0", rule: "on all lines", status: zero([s.S1, s.S3, s.S4, s.S5, s.S6]), evidence: { S1: s.S1, S3: s.S3, S4: s.S4, S5: s.S5, S6: s.S6 } },
    {
      id: "A5",
      criterion: "C3 + C4 on R ≤ 10 %",
      rule: "point estimate",
      status: c3c4.den > 0 && c3c4.num * 10 <= c3c4.den ? "met" : "not met",
      evidence: { C3plusC4: c3c4 },
    },
    {
      id: "A6",
      criterion: "legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic",
      rule: "in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator",
      status: a6 ? "scorer checks met; rest checked outside the scorer" : "not met",
      evidence: { CE: a.outcomes.CE, engineError: v.engineError, invalidOutput: v.invalidOutput, nondeterministic: v.nondeterministic },
    },
    { id: "A7", criterion: "the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test", rule: "recorded by the coordinator", status: "checked outside the scorer", evidence: {} },
  ];
  return { set, basis: ACCEPTANCE_BASIS[set], criteria, a1ToA5Met: criteria.slice(0, 5).every((c) => c.status !== "not met"), a6ScorerChecksMet: a6 };
}

// --- Sets and the report section -------------------------------------------------------------------

export const SET_STATUS: Record<Split, string> = {
  dev: "dev (development; diagnostics only)",
  holdout: "holdout-v1 (previously exposed)",
  holdout2: "holdout-v2 (exposed; historical acceptance set)",
  holdout3: "holdout-v3 (fresh; acceptance set)",
};

// --- Pre-registered sensitivity figures (informational, not the acceptance basis) -------------------

/**
 * holdout-v2 cases pre-registered as debatable before any candidate was evaluated on it (EVALUATION-PLAN-v2
 * change log 3(a)). holdout-v3's debatable cases are data: `debatable: true` in holdout-v3.jsonl. The
 * acceptance decision stays on ALL cases; A1–A5 without these are reported as information only.
 */
export const DEBATABLE_CASES: Readonly<{ holdout2: readonly string[] }> = { holdout2: ["ing-h2-0087"] };
export const SENSITIVITY_NOTE = "informational, not the acceptance basis" as const;
export const BARE_NO_AMOUNT_DEFINITION =
  "needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01)" as const;
export const SENSITIVITY_DEFINITIONS = {
  debatableHoldout2: "(a) without the cases pre-registered as debatable at holdout-v2 adjudication (EVALUATION-PLAN-v2 change log 3(a))",
  debatableHoldout3: "(a) without the cases marked debatable: true in holdout-v3.jsonl (EVALUATION-PLAN-v3 §7 (a))",
  newReadings: "(c) without the cases marked reliesOnNewReading: true in holdout-v3.jsonl — the result under CONTRACT-v1 §7 alone (EVALUATION-PLAN-v3 §7 (c))",
  exposureAudit: "(d) without the cases listed in fixtures/EXPOSURE-AUDIT-v3.json (EVALUATION-PLAN-v3 §7 (d), §9.4)",
} as const;

export interface NeedsReviewSensitivity {
  definition: typeof BARE_NO_AMOUNT_DEFINITION;
  /** needs_review-labelled lines left out (isBareNoAmountLabel). */
  excludedIds: string[];
  excluded: number;
  /** needs_review-labelled lines kept (the denominator below). */
  needsReview: number;
  /** Of the kept needs_review lines. */
  C5: Rate;
  C5a: Rate;
  C5b: Rate;
  C5c: Rate;
  C5x: Rate;
  C6: Rate;
  S4: Rate;
}

/** A1–A5 (and the rest of the acceptance table) recomputed without some cases of an acceptance set. */
export interface ExclusionSensitivity {
  definition: string;
  excludedIds: string[];
  /** Lines kept. */
  lines: number;
  acceptance: AcceptanceReport;
}

export interface ExposureAuditSensitivity extends ExclusionSensitivity {
  method: string;
  auditedAt: string;
  /** Ids the audit lists (the set may hold fewer when a run is restricted, e.g. --case). */
  matchedCaseIds: number;
}

export interface Sensitivity {
  note: typeof SENSITIVITY_NOTE;
  /** (a) holdout-v2: the pre-registered list; holdout-v3: `debatable: true` cases (always reported, possibly none). Else null. */
  excludingDebatable: ExclusionSensitivity | null;
  /** (b) needs_review figures without the bare no-amount labels (SCORE-01). */
  needsReviewExcludingBareNoAmount: NeedsReviewSensitivity;
  /** (c) holdout-v3 only: without the `reliesOnNewReading: true` cases. Else null. */
  excludingNewReadings: ExclusionSensitivity | null;
  /** (d) holdout-v3 only, when the exposure audit file exists: without its matched cases. Else null. */
  excludingExposureAudit: ExposureAuditSensitivity | null;
}

/** Options of a run that come from data files outside the labels (pure: the caller loads them). */
export interface OutcomeOptions {
  /** The holdout-v3 exposure audit (fixtures/EXPOSURE-AUDIT-v3.json), when it exists. */
  exposureAudit?: ExposureAudit | null;
}

function excluding(set: AcceptanceSplit, lines: readonly LineOutcome[], definition: string, drop: (x: LineOutcome) => boolean): ExclusionSensitivity {
  const rest = lines.filter((x) => !drop(x));
  return { definition, excludedIds: lines.filter(drop).map((x) => x.id), lines: rest.length, acceptance: acceptance(aggregate(rest), set) };
}

export function sensitivity(set: Split, lines: readonly LineOutcome[], options: OutcomeOptions = {}): Sensitivity {
  const bare = lines.filter((x) => x.labelStatus === "needs_review" && x.bareNoAmount);
  const kept = lines.filter((x) => x.labelStatus === "needs_review" && !x.bareNoAmount);
  const k = aggregate(kept);
  let excludingDebatable: Sensitivity["excludingDebatable"] = null;
  let excludingNewReadings: Sensitivity["excludingNewReadings"] = null;
  let excludingExposureAudit: Sensitivity["excludingExposureAudit"] = null;
  if (set === "holdout2" && DEBATABLE_CASES.holdout2.length > 0) {
    excludingDebatable = excluding(set, lines, SENSITIVITY_DEFINITIONS.debatableHoldout2, (x) => DEBATABLE_CASES.holdout2.includes(x.id));
  }
  if (set === "holdout3") {
    excludingDebatable = excluding(set, lines, SENSITIVITY_DEFINITIONS.debatableHoldout3, (x) => x.metadata?.debatable === true);
    excludingNewReadings = excluding(set, lines, SENSITIVITY_DEFINITIONS.newReadings, (x) => x.metadata?.reliesOnNewReading === true);
    const audit = options.exposureAudit;
    if (audit) {
      const matched = new Set(audit.matchedCaseIds);
      excludingExposureAudit = {
        ...excluding(set, lines, SENSITIVITY_DEFINITIONS.exposureAudit, (x) => matched.has(x.id)),
        method: audit.method,
        auditedAt: audit.auditedAt,
        matchedCaseIds: matched.size,
      };
    }
  }
  return {
    note: SENSITIVITY_NOTE,
    excludingDebatable,
    needsReviewExcludingBareNoAmount: {
      definition: BARE_NO_AMOUNT_DEFINITION,
      excludedIds: bare.map((x) => x.id),
      excluded: bare.length,
      needsReview: kept.length,
      C5: k.outcomes.C5,
      C5a: k.outcomes.C5a,
      C5b: k.outcomes.C5b,
      C5c: k.outcomes.C5c,
      C5x: k.outcomes.C5x,
      C6: k.outcomes.C6,
      S4: k.severe.S4,
    },
    excludingNewReadings,
    excludingExposureAudit,
  };
}

// --- holdout-v3 breakdowns ---------------------------------------------------------------------------

/** One construction template of a set, compactly: its lines, their classes (C1, C3b, CE …) and S codes. */
export interface ConstructionGroup {
  lines: number;
  caseIds: string[];
  /** One entry per line, in case order: the class with its sub-class (e.g. "C3b"). */
  classes: string[];
  /** The S codes of its lines (union, S1…S8 order). */
  severe: SevereCode[];
}

export interface ConstructionBreakdown {
  /** Distinct construction templates (plan §8 reports this count). */
  distinct: number;
  /** Most lines sharing one template (plan §8: at most 2). */
  maxUses: number;
  groups: Record<string, ConstructionGroup>;
}

export const NO_CONSTRUCTION = "(none)";
export const NO_CONTRACT12_ITEM = "none";
export type Contract12Group = Contract12Item | typeof NO_CONTRACT12_ITEM;

export function byConstruction(lines: readonly LineOutcome[]): ConstructionBreakdown {
  const groups: Record<string, ConstructionGroup> = {};
  for (const x of lines) {
    const key = x.construction ?? NO_CONSTRUCTION;
    const g = (groups[key] ??= { lines: 0, caseIds: [], classes: [], severe: [] });
    g.lines++;
    g.caseIds.push(x.id);
    g.classes.push(`${x.outcome}${x.partial ?? ""}`);
    g.severe = SEVERE_CODES.filter((s) => g.severe.includes(s) || x.severe.includes(s));
  }
  const counts = Object.values(groups).map((g) => g.lines);
  return { distinct: counts.length, maxUses: counts.length === 0 ? 0 : Math.max(...counts), groups };
}

export interface OutcomeSetReport {
  set: Split;
  status: string;
  aggregate: OutcomeAggregate;
  caseIds: OutcomeCaseIds;
  /** Every CE line with its dimensions (validator problems capped per line). */
  ceLines: CELine[];
  byCategory: Partial<Record<Category, OutcomeAggregate>>;
  /** Acceptance sets only (per provenance source), else null. */
  bySourceKind: Partial<Record<ProvenanceKind, OutcomeAggregate>> | null;
  /** Acceptance sets only, else null. Computed on every case of the set. */
  acceptance: AcceptanceReport | null;
  /** Pre-registered sensitivity figures — informational, not the acceptance basis. */
  sensitivity: Sensitivity;
  /** holdout-v3 only (else null): per repair family. */
  byFamily: Partial<Record<Family, OutcomeAggregate>> | null;
  /** holdout-v3 only (else null): per CONTRACT-v1 §12 item exercised ("none" = no item). */
  byContract12: Partial<Record<Contract12Group, OutcomeAggregate>> | null;
  /** holdout-v3 only (else null): per construction template, compact. */
  byConstruction: ConstructionBreakdown | null;
}

export interface EngineOutcomes {
  engine: { id: string; description: string };
  sets: Partial<Record<Split, OutcomeSetReport>>;
}

export interface HoldoutFreezeStatus {
  frozen: boolean;
  frozenAt: string | null;
  sha256: string | null;
}

export interface ScorerIdentity {
  id: typeof SCORER_ID;
  version: typeof SCORER_VERSION;
  plan: typeof OUTCOME_PLAN;
  source: typeof SCORER_SOURCE;
  /** SHA-256 of SCORER_SOURCE's bytes (null when the caller could not read it). */
  sha256: string | null;
  /** SHA-256 of each SCORER_DEPENDENCIES file (null when unreadable). */
  dependencies: Record<string, string | null>;
}

export interface OutcomesSection {
  scorer: ScorerIdentity;
  plan: typeof OUTCOME_PLAN;
  z: number;
  interpretation: string[];
  /** Freeze status of every acceptance set in the run (empty when none is scored). */
  freezes: Partial<Record<AcceptanceSplit, HoldoutFreezeStatus>>;
  engines: EngineOutcomes[];
}

export function setReport(set: Split, lines: readonly LineOutcome[], options: OutcomeOptions = {}): OutcomeSetReport {
  const byCategory: Partial<Record<Category, OutcomeAggregate>> = {};
  for (const cat of CATEGORIES) {
    const sub = lines.filter((x) => x.categories.includes(cat));
    if (sub.length > 0) byCategory[cat] = aggregate(sub);
  }
  let bySourceKind: OutcomeSetReport["bySourceKind"] = null;
  if (isAcceptanceSplit(set)) {
    bySourceKind = {};
    for (const k of PROVENANCE_KINDS) {
      const sub = lines.filter((x) => x.sourceKind === k);
      if (sub.length > 0) bySourceKind[k] = aggregate(sub);
    }
  }
  let byFamily: OutcomeSetReport["byFamily"] = null;
  let byContract12: OutcomeSetReport["byContract12"] = null;
  if (set === "holdout3") {
    byFamily = {};
    for (const f of FAMILIES) {
      const sub = lines.filter((x) => x.metadata?.family === f);
      if (sub.length > 0) byFamily[f] = aggregate(sub);
    }
    byContract12 = {};
    for (const item of [...CONTRACT12_ITEMS, NO_CONTRACT12_ITEM] as const) {
      const sub = lines.filter((x) => (item === NO_CONTRACT12_ITEM ? x.metadata !== null && x.metadata.contract12.length === 0 : x.metadata?.contract12.includes(item)));
      if (sub.length > 0) byContract12[item] = aggregate(sub);
    }
  }
  const agg = aggregate(lines);
  return {
    set,
    status: SET_STATUS[set],
    aggregate: agg,
    caseIds: caseIds(lines),
    ceLines: ceLines(lines),
    byCategory,
    bySourceKind,
    acceptance: isAcceptanceSplit(set) ? acceptance(agg, set) : null,
    sensitivity: sensitivity(set, lines, options),
    byFamily,
    byContract12,
    byConstruction: set === "holdout3" ? byConstruction(lines) : null,
  };
}

/** Outcomes of one engine on every set present in `cases` (per set; sets are never pooled). */
export function engineOutcomes(cases: readonly IngredientCase[], engine: IngredientEngine, observations?: ReadonlyMap<string, Observation>, options: OutcomeOptions = {}): EngineOutcomes {
  const lines = classifyLines(cases, engine, observations);
  const sets: Partial<Record<Split, OutcomeSetReport>> = {};
  for (const s of SPLITS) {
    const sub = lines.filter((x) => x.split === s);
    if (sub.length > 0) sets[s] = setReport(s, sub, options);
  }
  return { engine: { id: String(engine.id), description: String(engine.description ?? "") }, sets };
}

/** The scorer identity for a report; the caller supplies the file hashes (this module does no I/O). */
export function scorerIdentity(sha256: string | null, dependencies: Record<string, string | null> = {}): ScorerIdentity {
  const deps: Record<string, string | null> = {};
  for (const d of SCORER_DEPENDENCIES) deps[d] = dependencies[d] ?? null;
  return { id: SCORER_ID, version: SCORER_VERSION, plan: OUTCOME_PLAN, source: SCORER_SOURCE, sha256, dependencies: deps };
}

export function outcomesSection(engines: EngineOutcomes[], freezes: Partial<Record<AcceptanceSplit, HoldoutFreezeStatus>>, scorer: ScorerIdentity = scorerIdentity(null)): OutcomesSection {
  return { scorer, plan: OUTCOME_PLAN, z: Number(Z95.toFixed(6)), interpretation: [...INTERPRETATION], freezes, engines };
}

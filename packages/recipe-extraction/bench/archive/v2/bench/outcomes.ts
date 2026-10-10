/**
 * Outcome scoring of EVALUATION-PLAN-v2 (§3–§7): one outcome class per line (C1–C8, with C1+ and the
 * C3/C5 partial sub-classes), the severe semantic errors S1–S8, false-certainty severity, aggregates per
 * set / category tag / source kind with numerators, denominators and Wilson 95% intervals, and the
 * acceptance criteria A1–A5 on holdout-v2. Pure: readings come from the caller's engine; no I/O.
 *
 * Field comparison is CONTRACT-v1 §9 via `compareIngredient`. "Accepted" matching (a case's `accept`
 * values count) is the acceptance basis; strict figures are reported alongside.
 *
 * Where the plan does not define a situation, the reading used here is listed in `INTERPRETATION`
 * (reported verbatim in every outcomes section) — it never changes a definition the plan does give.
 */
import type { Dimension, IngredientEngine, IngredientStatus, ParsedIngredientV1 } from "../src/contract";
import { alternativeSet, compareIngredient, erroredComparison, normalizeText, type CaseComparison } from "./compare";
import { rate, wilsonInterval, Z95, type Rate } from "./stats";
import { CATEGORIES, EXPECT_FIELDS, PROVENANCE_KINDS, SPLITS, unitDimension, type Category, type IngredientCase, type ProvenanceKind, type Split } from "./types";

export const OUTCOME_PLAN = "EVALUATION-PLAN-v2";

/** C1–C8 (§4) plus CE: the engine threw or returned a status outside the contract (see INTERPRETATION). */
export const OUTCOME_CLASSES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "CE"] as const;
export type OutcomeClass = (typeof OUTCOME_CLASSES)[number];
export const SEVERE_CODES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;
export type SevereCode = (typeof SEVERE_CODES)[number];
/** C3/C5 sub-classes: a useful partial, b wrong partial, c abstention, x not defined by the plan. */
export const PARTIAL_KINDS = ["a", "b", "c", "x"] as const;
export type PartialKind = (typeof PARTIAL_KINDS)[number];
export type EngineStatus = IngredientStatus | "error" | "invalid";
export type FalseCertaintySeverity = "high" | "medium";

/** Readings the plan leaves open, as implemented here. Reported in every outcomes section. */
export const INTERPRETATION: readonly string[] = [
  "CE (not a plan class): the engine threw, or returned a status other than ready / needs_review / unsupported. Such a line gets no C1–C8 class and no S code; it stays in every denominator (so it is never C1). A6 (contract validator passes on every output) requires CE = 0.",
  "C3/C5 sub-classes are decided in the order b, c, a, x over the engine's name, quantity, unit and package size (accepted values count; a non-empty alternatives list is also compared): b = a non-null field contradicts the label; c = name, quantity and unit are all null and no alternatives were read; a = no contradiction and the food was named (name non-null, or, on a choice-of-ingredients label, the options matched); x = no contradiction but the food was not named while an amount or unit was read — a case the plan does not define, reported separately and still counted in C3/C5.",
  "C2 severity: high when the line has any of S2–S8 or a wrong unit or package size; medium when only the name is wrong (not S7). The one remaining C2 case — a fabricated quantity (S1) on a ready label whose unit also matches (both null) — is not covered by the plan's rule and is reported as high.",
  "S5 compares the engine name (§9 normalization) with the label's alternatives and any accepted alternative lists; it applies to any engine status when the engine reports no alternatives.",
  "S7 uses the accepted name match and §9-normalized word sets: the engine's (non-null) name words form a proper subset of the label name's words.",
  "S3 is the CONTRACT-v1 §9 cross-dimension check: the engine unit's dimension differs from the label unit's, or the engine package size's from the label package size's, both present.",
  "A2 field accuracy counts a field as accurate when it matches the label, whatever the engine status. A1/A2 'met with confidence' uses the unrounded Wilson lower bound (z = 1.959964).",
];

export interface LineOutcome {
  id: string;
  split: Split;
  categories: Category[];
  sourceKind: ProvenanceKind | null;
  labelStatus: IngredientStatus;
  engineStatus: EngineStatus;
  /** The outcome class under accepted matching (the acceptance basis). */
  outcome: OutcomeClass;
  /** C1+ (accepted): C1 and every other field matches too. */
  fullyCorrect: boolean;
  /** C3/C5 sub-class (accepted), else null. */
  partial: PartialKind | null;
  /** C2 lines only. */
  falseCertainty: FalseCertaintySeverity | null;
  /** C1 whose only mismatches are non-core: a low "detail mismatch", not C2. */
  detailMismatch: boolean;
  severe: SevereCode[];
  strict: { outcome: OutcomeClass; fullyCorrect: boolean };
  /** Field matches whatever the engine status (A2). */
  fields: { name: { strict: boolean; accepted: boolean }; quantity: boolean; unit: boolean };
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

function classOf(label: IngredientStatus, engine: EngineStatus, coreMatches: boolean): OutcomeClass {
  if (engine === "error" || engine === "invalid") return "CE";
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

/**
 * The outcome of one line. `reading` is the engine's output (may be malformed); `error` is set when the
 * engine threw (then `reading` is ignored).
 */
export function classifyLine(c: IngredientCase, reading: unknown, error: string | null = null): LineOutcome {
  const r = error !== null ? erroredComparison(c, error) : compareIngredient(c, reading as ParsedIngredientV1);
  const g = (error === null && reading && typeof reading === "object" ? reading : {}) as Partial<ParsedIngredientV1>;
  const engineStatus: EngineStatus = error !== null ? "error" : typeof g.status === "string" && READ_STATUSES.includes(g.status) ? (g.status as IngredientStatus) : "invalid";
  const L = c.expect.status;
  const f = r.fields;
  const core = (mode: "strict" | "accepted") => f.name[mode] && f.quantity.strict && f.unit.strict && f.packageSize.strict;
  const outcome = classOf(L, engineStatus, core("accepted"));
  const strictOutcome = classOf(L, engineStatus, core("strict"));
  const fullyCorrect = outcome === "C1" && EXPECT_FIELDS.every((k) => f[k].accepted);
  const strictFullyCorrect = strictOutcome === "C1" && EXPECT_FIELDS.every((k) => f[k].strict);

  const severe: SevereCode[] = [];
  if (engineStatus !== "error") {
    const ready = engineStatus === "ready";
    const name = normalizeText(g.name);
    const engineAlts = alternativeSet(g.alternatives);
    if (c.expect.quantity === null && present(g.quantity)) severe.push("S1");
    if (ready && c.expect.quantity !== null && !f.quantity.strict) severe.push("S2");
    if (r.crossDimension) severe.push("S3");
    if (L === "needs_review" && ready) severe.push("S4");
    if (c.expect.alternatives.length >= 2 && engineAlts.length === 0 && name !== null) {
      const options = new Set([...c.expect.alternatives, ...(c.accept.alternatives ?? []).flat()].map(normalizeText));
      if (options.has(name)) severe.push("S5");
    }
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

  return {
    id: c.id,
    split: c.split,
    categories: [...c.categories],
    sourceKind: c.source?.kind ?? null,
    labelStatus: L,
    engineStatus,
    outcome,
    fullyCorrect,
    partial: outcome === "C3" || outcome === "C5" ? partialKind(c, g, r) : null,
    falseCertainty,
    detailMismatch: outcome === "C1" && !fullyCorrect,
    severe,
    strict: { outcome: strictOutcome, fullyCorrect: strictFullyCorrect },
    fields: { name: { strict: f.name.strict, accepted: f.name.accepted }, quantity: f.quantity.strict, unit: f.unit.strict },
  };
}

/** Run `engine.parse` on every case (errors are caught per line) and classify each reading. */
export function classifyLines(cases: readonly IngredientCase[], engine: IngredientEngine): LineOutcome[] {
  return cases.map((c) => {
    let reading: unknown;
    try {
      reading = engine.parse(c.input);
    } catch (err) {
      return classifyLine(c, null, err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    }
    return classifyLine(c, reading);
  });
}

/**
 * An engine that parses each distinct input once and replays the result (or rethrows the same error),
 * so the existing scorer and the outcome scorer see one reading per line.
 */
export function memoizeEngine(engine: IngredientEngine): IngredientEngine {
  const cache = new Map<string, { value?: ParsedIngredientV1; error?: unknown }>();
  return {
    id: engine.id,
    description: engine.description,
    parse(line: string): ParsedIngredientV1 {
      const key = typeof line === "string" ? line : `\u0000${String(line)}`;
      let hit = cache.get(key);
      if (!hit) {
        try {
          hit = { value: engine.parse(line) };
        } catch (err) {
          hit = { error: err };
        }
        cache.set(key, hit);
      }
      if ("error" in hit) throw hit.error;
      return hit.value as ParsedIngredientV1;
    },
  };
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

export interface OutcomeAggregate {
  lines: number;
  /** R, A, U. */
  ready: number;
  needsReview: number;
  unsupported: number;
  outcomes: OutcomeRates;
  /** Strict matching: C1 and C1+ of R, C2 of N. */
  strict: { C1: Rate; C1plus: Rate; C2: Rate };
  /** A2: field accuracy on R, whatever the engine status. */
  fieldAccuracyOnReady: { name: { strict: Rate; accepted: Rate }; quantity: Rate; unit: Rate };
  /** Of N. */
  severe: Record<SevereCode, Rate>;
  anySevere: Rate;
}

export const CASE_ID_KEYS = [
  "C1", "C1plus", "detailMismatchLow", "C2High", "C2Medium", "C3a", "C3b", "C3c", "C3x", "C4", "C5a", "C5b", "C5c", "C5x", "C6", "C7", "C8", "CE",
  ...SEVERE_CODES,
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
    strict: { C1: of(R, (x) => x.strict.outcome === "C1"), C1plus: of(R, (x) => x.strict.fullyCorrect), C2: of(lines, (x) => x.strict.outcome === "C2") },
    fieldAccuracyOnReady: {
      name: { strict: of(R, (x) => x.fields.name.strict), accepted: of(R, (x) => x.fields.name.accepted) },
      quantity: of(R, (x) => x.fields.quantity),
      unit: of(R, (x) => x.fields.unit),
    },
    severe,
    anySevere: of(lines, (x) => x.severe.length > 0),
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
    strictDiffers: pick((x) => x.strict.outcome !== x.outcome || x.strict.fullyCorrect !== x.fullyCorrect),
  } as OutcomeCaseIds;
  for (const s of SEVERE_CODES) out[s] = pick((x) => x.severe.includes(s));
  return out;
}

// --- Acceptance (§6) ---------------------------------------------------------------------------------

export type CriterionStatus = "met with confidence" | "met" | "not met" | "checked outside the scorer";
export const ACCEPTANCE_THRESHOLD = { A1: 0.98, A2: 0.98, A5: 0.1 } as const;

export interface AcceptanceCriterion {
  id: "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7";
  criterion: string;
  rule: string;
  status: CriterionStatus;
  /** The figures the status was decided on (numerator, denominator, Wilson interval). */
  evidence: Record<string, Rate>;
}

export interface AcceptanceReport {
  set: "holdout2";
  criteria: AcceptanceCriterion[];
  /** A1 (point) and A2–A5 all met. A6/A7 are recorded outside the scorer. */
  a1ToA5Met: boolean;
}

/** Point estimate ≥ 98 % (exact integer arithmetic), with den > 0. */
const pointAtLeast98 = (r: Rate) => r.den > 0 && r.num * 100 >= r.den * 98;
const lowerAtLeast98 = (r: Rate) => r.den > 0 && (wilsonInterval(r.num, r.den) as [number, number])[0] >= ACCEPTANCE_THRESHOLD.A1;
const graded = (rs: Rate[]): CriterionStatus => (rs.every(lowerAtLeast98) ? "met with confidence" : rs.every(pointAtLeast98) ? "met" : "not met");
const zero = (rs: Rate[]): CriterionStatus => (rs.every((r) => r.num === 0) ? "met" : "not met");

export function acceptance(a: OutcomeAggregate): AcceptanceReport {
  const fa = a.fieldAccuracyOnReady;
  const s = a.severe;
  const c3c4 = a.outcomes.C3plusC4;
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
    { id: "A6", criterion: "legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic", rule: "recorded by the coordinator", status: "checked outside the scorer", evidence: { CE: a.outcomes.CE } },
    { id: "A7", criterion: "the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test", rule: "recorded by the coordinator", status: "checked outside the scorer", evidence: {} },
  ];
  return { set: "holdout2", criteria, a1ToA5Met: criteria.slice(0, 5).every((c) => c.status !== "not met") };
}

// --- Sets and the report section -------------------------------------------------------------------

export const SET_STATUS: Record<Split, string> = {
  dev: "dev (development; diagnostics only)",
  holdout: "holdout-v1 (previously exposed)",
  holdout2: "holdout-v2 (fresh)",
};

// --- Pre-registered sensitivity figures (coordinator adjudication 2026-10-09) -----------------------

/**
 * holdout-v2 cases pre-registered as debatable before any candidate was evaluated. The acceptance
 * decision stays on ALL holdout-v2 cases; A1–A5 without these are reported as information only.
 */
export const DEBATABLE_CASES: readonly string[] = ["ing-h2-0087"];
/** A needs_review label whose only category tags are among these is a bare food with no amount. */
export const BARE_FOOD_TAGS: readonly Category[] = ["quantity_missing", "seasoning_ordinary", "seasoning_lookalike"];
export const SENSITIVITY_NOTE = "informational, not the acceptance basis" as const;

export const isBareFoodNeedsReview = (x: LineOutcome) =>
  x.labelStatus === "needs_review" && x.categories.length > 0 && x.categories.every((c) => BARE_FOOD_TAGS.includes(c));

export interface NeedsReviewSensitivity {
  /** needs_review-labelled lines left out: only quantity_missing and/or seasoning tags (bare foods, no amount). */
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

export interface Sensitivity {
  note: typeof SENSITIVITY_NOTE;
  /** holdout2 only: A1–A5 recomputed without DEBATABLE_CASES. */
  excludingDebatable: { excludedIds: string[]; lines: number; acceptance: AcceptanceReport } | null;
  needsReviewExcludingBareFoods: NeedsReviewSensitivity;
}

export function sensitivity(set: Split, lines: readonly LineOutcome[]): Sensitivity {
  const bare = lines.filter(isBareFoodNeedsReview);
  const kept = lines.filter((x) => x.labelStatus === "needs_review" && !isBareFoodNeedsReview(x));
  const k = aggregate(kept);
  let excludingDebatable: Sensitivity["excludingDebatable"] = null;
  if (set === "holdout2") {
    const rest = lines.filter((x) => !DEBATABLE_CASES.includes(x.id));
    excludingDebatable = { excludedIds: lines.filter((x) => DEBATABLE_CASES.includes(x.id)).map((x) => x.id), lines: rest.length, acceptance: acceptance(aggregate(rest)) };
  }
  return {
    note: SENSITIVITY_NOTE,
    excludingDebatable,
    needsReviewExcludingBareFoods: {
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
  };
}

export interface OutcomeSetReport {
  set: Split;
  status: string;
  aggregate: OutcomeAggregate;
  caseIds: OutcomeCaseIds;
  byCategory: Partial<Record<Category, OutcomeAggregate>>;
  /** holdout2 only (per provenance source), else null. */
  bySourceKind: Partial<Record<ProvenanceKind, OutcomeAggregate>> | null;
  /** holdout2 only, else null. The acceptance basis: every holdout-v2 case. */
  acceptance: AcceptanceReport | null;
  /** Pre-registered sensitivity figures — informational, not the acceptance basis. */
  sensitivity: Sensitivity;
}

export interface EngineOutcomes {
  engine: { id: string; description: string };
  sets: Partial<Record<Split, OutcomeSetReport>>;
}

export interface Holdout2FreezeStatus {
  frozen: boolean;
  frozenAt: string | null;
  sha256: string | null;
}

export interface OutcomesSection {
  plan: typeof OUTCOME_PLAN;
  z: number;
  interpretation: string[];
  /** Null when holdout2 is not part of the run. */
  holdout2Freeze: Holdout2FreezeStatus | null;
  engines: EngineOutcomes[];
}

export function setReport(set: Split, lines: readonly LineOutcome[]): OutcomeSetReport {
  const byCategory: Partial<Record<Category, OutcomeAggregate>> = {};
  for (const cat of CATEGORIES) {
    const sub = lines.filter((x) => x.categories.includes(cat));
    if (sub.length > 0) byCategory[cat] = aggregate(sub);
  }
  let bySourceKind: OutcomeSetReport["bySourceKind"] = null;
  if (set === "holdout2") {
    bySourceKind = {};
    for (const k of PROVENANCE_KINDS) {
      const sub = lines.filter((x) => x.sourceKind === k);
      if (sub.length > 0) bySourceKind[k] = aggregate(sub);
    }
  }
  const agg = aggregate(lines);
  return {
    set,
    status: SET_STATUS[set],
    aggregate: agg,
    caseIds: caseIds(lines),
    byCategory,
    bySourceKind,
    acceptance: set === "holdout2" ? acceptance(agg) : null,
    sensitivity: sensitivity(set, lines),
  };
}

/** Outcomes of one engine on every set present in `cases` (per set; sets are never pooled). */
export function engineOutcomes(cases: readonly IngredientCase[], engine: IngredientEngine): EngineOutcomes {
  const lines = classifyLines(cases, engine);
  const sets: Partial<Record<Split, OutcomeSetReport>> = {};
  for (const s of SPLITS) {
    const sub = lines.filter((x) => x.split === s);
    if (sub.length > 0) sets[s] = setReport(s, sub);
  }
  return { engine: { id: String(engine.id), description: String(engine.description ?? "") }, sets };
}

export function outcomesSection(engines: EngineOutcomes[], holdout2Freeze: Holdout2FreezeStatus | null): OutcomesSection {
  return { plan: OUTCOME_PLAN, z: Number(Z95.toFixed(6)), interpretation: [...INTERPRETATION], holdout2Freeze, engines };
}

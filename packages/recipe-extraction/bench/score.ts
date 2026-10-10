/**
 * Deterministic scoring (CONTRACT-v1 §9) of an ingredient engine against the ingredient labels, and of
 * a page extractor against the page labels. Pure: the page text comes from the caller's `readFile`.
 * Imports only types from the contract and functions from rational.ts (via the bench modules).
 */
import type { IngredientEngine, PageInputV1, ParsedIngredientV1, RecipeCandidateV1, RecipeExtractionV1 } from "../src/contract";
import { compareIngredient, erroredComparison, normalizeText, renderScalar, sameLines, sameText, type CaseComparison, type FieldMismatch } from "./compare";
import { rate, type Rate } from "./stats";
import { CATEGORIES, EXPECT_FIELDS, PAGE_ACCEPT_FIELDS, PAGE_CANDIDATE_FIELDS, SPLITS, type Category, type ExpectField, type IngredientCase, type PageCandidateField, type PageCandidateLabel, type PageLabel, type Split } from "./types";

export interface StrictAccepted {
  strict: Rate;
  accepted: Rate;
}

export interface IngredientMetrics {
  cases: number;
  labelReady: number;
  engineReady: number;
  engineErrors: number;
  /** Per field, over all lines and over ready-labelled lines. */
  fieldMatch: { all: Record<ExpectField, StrictAccepted>; readyLabelled: Record<ExpectField, StrictAccepted> };
  /** status + name + quantity + unit. */
  corePass: { all: StrictAccepted; readyLabelled: StrictAccepted };
  /** Every field. */
  fullPass: { all: StrictAccepted; readyLabelled: StrictAccepted };
  /** Engine not ready, over all lines. */
  reviewRate: Rate;
  /** Label ready, engine not, over ready-labelled lines. */
  unnecessaryReview: Rate;
  falseCertainty: {
    /** Over all lines. high + medium + low. */
    total: Rate;
    high: Rate;
    medium: Rate;
    low: Rate;
    /** Same total, over engine-ready lines. */
    ofEngineReady: Rate;
    /** Engine ready on a line labelled needs_review/unsupported (case severity), over those lines. */
    suppressedAmbiguity: Rate;
    /** Engine ready, label ready, wrong quantity/unit/package size (high), over ready-labelled lines. */
    wrongAmount: Rate;
    /** Engine ready, label ready, amount right, wrong name (medium), over ready-labelled lines. */
    wrongName: Rate;
    /** Reported separately, severity low: engine ready, core right, only note/flags/equivalents differ. Over engine-ready lines. */
    detailOnlyLow: Rate;
  };
  /** Engine states an amount where the label has none, over lines whose label has no quantity. */
  fabricatedQuantity: Rate;
  /** Engine unit or package dimension differs from the label's, over lines whose label has a unit or package size. */
  crossDimension: Rate;
  /** label status → engine status → count. */
  statusConfusion: Record<string, Record<string, number>>;
}

export interface CategoryMetrics {
  cases: number;
  labelReady: number;
  corePass: StrictAccepted;
  fullPass: StrictAccepted;
  reviewRate: Rate;
  unnecessaryReview: Rate;
  falseCertainty: { total: Rate; high: Rate; medium: Rate; low: Rate };
  fabricatedQuantity: Rate;
  crossDimension: Rate;
}

export interface IngredientSplitReport {
  metrics: IngredientMetrics;
  byCategory: Partial<Record<Category, CategoryMetrics>>;
}

export interface CaseMismatchReport {
  id: string;
  split: Split;
  fields: FieldMismatch[];
  falseCertainty: CaseComparison["falseCertainty"];
  detailOnlyMismatch: boolean;
  fabricatedQuantity: boolean;
  crossDimension: boolean;
  error: string | null;
}

export interface IngredientScore {
  engine: { id: string; description: string };
  overall: IngredientSplitReport;
  splits: Partial<Record<Split, IngredientSplitReport>>;
  /** Every case with at least one strict mismatch (or an engine error), in corpus order. Strings only. */
  mismatches: CaseMismatchReport[];
}

interface Row {
  c: IngredientCase;
  r: CaseComparison;
  /** The engine's status string ("error" when it threw, "invalid" when not a string). */
  status: string;
}

const count = (rows: Row[], f: (x: Row) => boolean) => rows.reduce((n, x) => n + (f(x) ? 1 : 0), 0);

function sa(rows: Row[], pick: (r: CaseComparison) => { strict: boolean; accepted: boolean }): StrictAccepted {
  return { strict: rate(count(rows, (x) => pick(x.r).strict), rows.length), accepted: rate(count(rows, (x) => pick(x.r).accepted), rows.length) };
}

function fieldTable(rows: Row[]): Record<ExpectField, StrictAccepted> {
  const out = {} as Record<ExpectField, StrictAccepted>;
  for (const f of EXPECT_FIELDS) out[f] = sa(rows, (r) => r.fields[f]);
  return out;
}

function falseCertaintyCounts(rows: Row[]) {
  const fc = (sev?: string) => count(rows, (x) => x.r.falseCertainty !== null && (sev === undefined || x.r.falseCertainty.severity === sev));
  return { total: fc(), high: fc("high"), medium: fc("medium"), low: fc("low") };
}

function metrics(rows: Row[]): IngredientMetrics {
  const ready = rows.filter((x) => x.r.labelReady);
  const notReadyLabel = rows.filter((x) => !x.r.labelReady);
  const engineReady = rows.filter((x) => x.r.engineReady);
  const fc = falseCertaintyCounts(rows);
  const confusion: Record<string, Record<string, number>> = {};
  for (const x of rows) {
    const byLabel = (confusion[x.c.expect.status] ??= {});
    byLabel[x.status] = (byLabel[x.status] ?? 0) + 1;
  }
  return {
    cases: rows.length,
    labelReady: ready.length,
    engineReady: engineReady.length,
    engineErrors: count(rows, (x) => x.r.error !== null),
    fieldMatch: { all: fieldTable(rows), readyLabelled: fieldTable(ready) },
    corePass: { all: sa(rows, (r) => r.corePass), readyLabelled: sa(ready, (r) => r.corePass) },
    fullPass: { all: sa(rows, (r) => r.fullPass), readyLabelled: sa(ready, (r) => r.fullPass) },
    reviewRate: rate(count(rows, (x) => !x.r.engineReady), rows.length),
    unnecessaryReview: rate(count(ready, (x) => !x.r.engineReady), ready.length),
    falseCertainty: {
      total: rate(fc.total, rows.length),
      high: rate(fc.high, rows.length),
      medium: rate(fc.medium, rows.length),
      low: rate(fc.low, rows.length),
      ofEngineReady: rate(fc.total, engineReady.length),
      suppressedAmbiguity: rate(count(notReadyLabel, (x) => x.r.falseCertainty?.kind === "suppressed_ambiguity"), notReadyLabel.length),
      wrongAmount: rate(count(ready, (x) => x.r.falseCertainty?.kind === "wrong_amount"), ready.length),
      wrongName: rate(count(ready, (x) => x.r.falseCertainty?.kind === "wrong_name"), ready.length),
      detailOnlyLow: rate(count(engineReady, (x) => x.r.detailOnlyMismatch), engineReady.length),
    },
    fabricatedQuantity: rate(count(rows, (x) => x.r.fabricatedQuantity), count(rows, (x) => x.c.expect.quantity === null)),
    crossDimension: rate(count(rows, (x) => x.r.crossDimension), count(rows, (x) => x.r.crossDimensionApplicable)),
    statusConfusion: confusion,
  };
}

function categoryMetrics(rows: Row[]): CategoryMetrics {
  const m = metrics(rows);
  return {
    cases: m.cases,
    labelReady: m.labelReady,
    corePass: m.corePass.all,
    fullPass: m.fullPass.all,
    reviewRate: m.reviewRate,
    unnecessaryReview: m.unnecessaryReview,
    falseCertainty: { total: m.falseCertainty.total, high: m.falseCertainty.high, medium: m.falseCertainty.medium, low: m.falseCertainty.low },
    fabricatedQuantity: m.fabricatedQuantity,
    crossDimension: m.crossDimension,
  };
}

function splitReport(rows: Row[]): IngredientSplitReport {
  const byCategory: Partial<Record<Category, CategoryMetrics>> = {};
  for (const cat of CATEGORIES) {
    const sub = rows.filter((x) => x.c.categories.includes(cat));
    if (sub.length > 0) byCategory[cat] = categoryMetrics(sub);
  }
  return { metrics: metrics(rows), byCategory };
}

/** Run `engine.parse` on every case and score the readings. Deterministic for a deterministic engine. */
export function scoreIngredients(cases: readonly IngredientCase[], engine: IngredientEngine): IngredientScore {
  const rows: Row[] = cases.map((c) => {
    let reading: ParsedIngredientV1;
    try {
      reading = engine.parse(c.input);
    } catch (err) {
      return { c, r: erroredComparison(c, err instanceof Error ? `${err.name}: ${err.message}` : String(err)), status: "error" };
    }
    return { c, r: compareIngredient(c, reading), status: typeof reading?.status === "string" ? reading.status : "invalid" };
  });
  const splits: Partial<Record<Split, IngredientSplitReport>> = {};
  for (const s of SPLITS) {
    const sub = rows.filter((x) => x.c.split === s);
    if (sub.length > 0) splits[s] = splitReport(sub);
  }
  return {
    engine: { id: String(engine.id), description: String(engine.description ?? "") },
    overall: splitReport(rows),
    splits,
    mismatches: rows
      .filter((x) => x.r.mismatches.length > 0 || x.r.error !== null)
      .map((x) => ({
        id: x.c.id,
        split: x.c.split,
        fields: x.r.mismatches,
        falseCertainty: x.r.falseCertainty,
        detailOnlyMismatch: x.r.detailOnlyMismatch,
        fabricatedQuantity: x.r.fabricatedQuantity,
        crossDimension: x.r.crossDimension,
        error: x.r.error,
      })),
  };
}

// --- Pages -----------------------------------------------------------------------------------------

export type PageExtract = (html: string, input: PageInputV1) => RecipeExtractionV1;

export interface PageFieldMismatch {
  candidate: number;
  field: PageCandidateField;
  expected: string;
  got: string;
  accepted: boolean;
}

export interface PageMismatchReport {
  id: string;
  split: Split;
  expectedCandidates: number;
  gotCandidates: number;
  fields: PageFieldMismatch[];
  missingDiagnostics: string[];
  retention: string;
  error: string | null;
}

export interface PageSplitReport {
  pages: number;
  expectedCandidates: number;
  extractorErrors: number;
  detection: { truePositive: number; falsePositive: number; falseNegative: number; trueNegative: number; precision: Rate; recall: Rate };
  candidateCountMatch: Rate;
  /** Per candidate field over expected candidates (paired by index; a missing candidate matches nothing). */
  fieldMatch: Record<PageCandidateField, StrictAccepted>;
  /** Every field of the candidate matches (accepted). */
  candidateFullMatch: Rate;
  ingredientListExact: Rate;
  /** Pages on which every expected diagnostic code appears. */
  diagnosticsFound: Rate;
  /** Rights invariant: retention is "not_decided" on every extraction. */
  retentionNotDecided: Rate;
  /** Status distribution of the extracted candidates' ingredient readings. */
  ingredientReadings: { candidates: number; readings: number; ready: number; needs_review: number; unsupported: number; other: number; lengthMatchesLines: Rate };
}

export interface PageScore {
  extractor: { page: string; ingredient: string };
  overall: PageSplitReport;
  splits: Partial<Record<Split, PageSplitReport>>;
  mismatches: PageMismatchReport[];
}

interface PageRow {
  p: PageLabel;
  out: RecipeExtractionV1 | null;
  error: string | null;
  fields: { candidate: number; results: Record<PageCandidateField, { strict: boolean; accepted: boolean }>; mismatches: PageFieldMismatch[] }[];
  missingDiagnostics: string[];
}

function renderPageValue(v: unknown): string {
  if (Array.isArray(v)) return v.length === 0 ? "[]" : v.map((x) => renderScalar(x)).join(" | ");
  return renderScalar(v);
}

function extractedField(c: RecipeCandidateV1 | undefined, f: PageCandidateField): unknown {
  if (!c) return undefined;
  switch (f) {
    case "prepMinutes":
    case "cookMinutes":
    case "totalMinutes":
      return c.times?.[f] ?? null;
    case "instructionCount":
      return Array.isArray(c.instructionCandidates) ? c.instructionCandidates.length : null;
    case "imageUrls":
      return Array.isArray(c.imageCandidates) ? c.imageCandidates.map((i) => i?.url) : null;
    default:
      return (c as unknown as Record<string, unknown>)[f] ?? null;
  }
}

function comparePageField(label: PageCandidateLabel, f: PageCandidateField, got: unknown, present: boolean): { strict: boolean; accepted: boolean } {
  if (!present) return { strict: false, accepted: false };
  const want = label[f];
  let strict: boolean;
  switch (f) {
    case "ingredientLines":
      strict = sameLines(label.ingredientLines, got);
      break;
    case "imageUrls":
      strict = Array.isArray(got) && got.length === label.imageUrls.length && label.imageUrls.every((u, i) => got[i] === u);
      break;
    case "declaredUrl":
    case "structure":
    case "servings":
    case "prepMinutes":
    case "cookMinutes":
    case "totalMinutes":
    case "instructionCount":
      strict = (got ?? null) === want;
      break;
    default:
      strict = sameText(want as string | null, got);
  }
  const acceptList = (PAGE_ACCEPT_FIELDS as readonly string[]).includes(f) ? (label.accept?.[f as (typeof PAGE_ACCEPT_FIELDS)[number]] ?? []) : [];
  const accepted = strict || acceptList.some((a) => (f === "declaredUrl" ? (got ?? null) === a : normalizeText(a) === normalizeText(got)));
  return { strict, accepted };
}

function pageSplit(rows: PageRow[]): PageSplitReport {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const x of rows) {
    const predicted = (x.out?.candidates?.length ?? 0) > 0;
    if (x.p.isRecipe && predicted) tp++;
    else if (!x.p.isRecipe && predicted) fp++;
    else if (x.p.isRecipe && !predicted) fn++;
    else tn++;
  }
  const cands = rows.flatMap((x) => x.fields);
  const fieldMatch = {} as Record<PageCandidateField, StrictAccepted>;
  for (const f of PAGE_CANDIDATE_FIELDS) {
    fieldMatch[f] = {
      strict: rate(cands.filter((c) => c.results[f].strict).length, cands.length),
      accepted: rate(cands.filter((c) => c.results[f].accepted).length, cands.length),
    };
  }
  const readings = { candidates: 0, readings: 0, ready: 0, needs_review: 0, unsupported: 0, other: 0 };
  let lengthOk = 0;
  for (const x of rows) {
    for (const c of x.out?.candidates ?? []) {
      readings.candidates++;
      const ings = Array.isArray(c?.ingredients) ? c.ingredients : [];
      if (Array.isArray(c?.ingredientLines) && ings.length === c.ingredientLines.length) lengthOk++;
      for (const r of ings) {
        readings.readings++;
        const s = r?.status;
        if (s === "ready" || s === "needs_review" || s === "unsupported") readings[s]++;
        else readings.other++;
      }
    }
  }
  return {
    pages: rows.length,
    expectedCandidates: cands.length,
    extractorErrors: rows.filter((x) => x.error !== null).length,
    detection: { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn, precision: rate(tp, tp + fp), recall: rate(tp, tp + fn) },
    candidateCountMatch: rate(rows.filter((x) => (x.out?.candidates?.length ?? 0) === x.p.expectedCandidateCount && x.error === null).length, rows.length),
    fieldMatch,
    candidateFullMatch: rate(cands.filter((c) => PAGE_CANDIDATE_FIELDS.every((f) => c.results[f].accepted)).length, cands.length),
    ingredientListExact: rate(cands.filter((c) => c.results.ingredientLines.strict).length, cands.length),
    diagnosticsFound: rate(rows.filter((x) => x.error === null && x.missingDiagnostics.length === 0).length, rows.length),
    retentionNotDecided: rate(rows.filter((x) => x.out?.retention === "not_decided").length, rows.length),
    ingredientReadings: { ...readings, lengthMatchesLines: rate(lengthOk, readings.candidates) },
  };
}

/** Run `extract` on every labelled page (text from `readFile(label.file)`) and score the results. */
export function scorePages(pages: readonly PageLabel[], extract: PageExtract, readFile: (file: string) => string): PageScore {
  const engines = new Set<string>();
  const rows: PageRow[] = pages.map((p) => {
    let out: RecipeExtractionV1 | null = null;
    let error: string | null = null;
    try {
      out = extract(readFile(p.file), { requestedUrl: p.requestedUrl, finalUrl: p.finalUrl });
      if (out?.engines) engines.add(`${out.engines.page}\u0000${out.engines.ingredient}`);
    } catch (err) {
      error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
    const got = Array.isArray(out?.candidates) ? out!.candidates : [];
    const fields = p.candidates.map((label, i) => {
      const c = got[i];
      const results = {} as Record<PageCandidateField, { strict: boolean; accepted: boolean }>;
      const mismatches: PageFieldMismatch[] = [];
      for (const f of PAGE_CANDIDATE_FIELDS) {
        const value = extractedField(c, f);
        const res = comparePageField(label, f, value, c !== undefined);
        results[f] = res;
        if (!res.strict) mismatches.push({ candidate: i, field: f, expected: renderPageValue(label[f]), got: c === undefined ? "(no candidate)" : renderPageValue(value), accepted: res.accepted });
      }
      return { candidate: i, results, mismatches };
    });
    const codes = new Set((out?.diagnostics ?? []).map((d) => d?.code));
    const missingDiagnostics = p.expectedDiagnostics.filter((d) => !codes.has(d));
    return { p, out, error, fields, missingDiagnostics };
  });
  const splits: Partial<Record<Split, PageSplitReport>> = {};
  for (const s of SPLITS) {
    const sub = rows.filter((x) => x.p.split === s);
    if (sub.length > 0) splits[s] = pageSplit(sub);
  }
  const ids = [...engines].sort();
  const name = (k: 0 | 1) => (ids.length === 0 ? "unknown" : [...new Set(ids.map((x) => x.split("\u0000")[k]))].join(", "));
  return {
    extractor: { page: name(0), ingredient: name(1) },
    overall: pageSplit(rows),
    splits,
    mismatches: rows
      .filter((x) => x.error !== null || x.missingDiagnostics.length > 0 || x.fields.some((f) => f.mismatches.length > 0) || (x.out?.candidates?.length ?? 0) !== x.p.expectedCandidateCount || x.out?.retention !== "not_decided")
      .map((x) => ({
        id: x.p.id,
        split: x.p.split,
        expectedCandidates: x.p.expectedCandidateCount,
        gotCandidates: x.out?.candidates?.length ?? 0,
        fields: x.fields.flatMap((f) => f.mismatches),
        missingDiagnostics: x.missingDiagnostics,
        retention: renderScalar(x.out?.retention ?? null),
        error: x.error,
      })),
  };
}

/**
 * Mutation controls: engines built from the labels. The oracle must score perfectly; each saboteur must
 * be caught by the metric it is designed to trip. If a scorer change lets a saboteur through, these fail.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REASONS, UNIT_REGISTRY, type ParsedIngredientV1 } from "../../src/contract";
import { fromExactQuantity } from "../../src/rational";
import { controlEngines, oraclePageExtractor } from "../controls";
import { loadIngredientCases, loadPageLabels } from "../labels";
import { scoreIngredients, scorePages } from "../score";
import { EXPECT_FIELDS, parseLabelQuantity, type IngredientCase } from "../types";
import { FIXTURES } from "./helpers";

const cases = loadIngredientCases(FIXTURES);
const ctl = controlEngines(cases);
const score = (key: keyof typeof ctl) => scoreIngredients(cases, ctl[key]);
const oracle = score("oracle");

const READING_KEYS = ["raw", "normalized", "status", "name", "quantity", "unit", "packageSize", "equivalents", "form", "note", "alternatives", "optional", "approximate", "amountUnstated", "reasons", "evidence"];

/** Minimal contract-shape check of a reading (types and canonical quantities; not the §2.1 status rules). */
function shapeProblems(r: ParsedIngredientV1): string[] {
  const p: string[] = [];
  if (Object.keys(r).sort().join() !== [...READING_KEYS].sort().join()) p.push("keys");
  const exactOk = (q: unknown) => q !== null && typeof q === "object" && fromExactQuantity(q as never) !== null;
  if (r.quantity !== null && !(r.quantity.kind === "exact" ? exactOk(r.quantity) : exactOk(r.quantity.min) && exactOk(r.quantity.max))) p.push("quantity");
  const unitOk = (u: ParsedIngredientV1["unit"]) => u !== null && u.canonical in UNIT_REGISTRY && UNIT_REGISTRY[u.canonical].dimension === u.dimension && typeof u.source === "string";
  if (r.unit !== null && !unitOk(r.unit)) p.push("unit");
  if (r.packageSize !== null && !(exactOk(r.packageSize.quantity) && unitOk(r.packageSize.unit))) p.push("packageSize");
  if (!r.equivalents.every((e) => exactOk(e.quantity) && unitOk(e.unit))) p.push("equivalents");
  if (!r.reasons.every((c) => c in REASONS) || new Set(r.reasons).size !== r.reasons.length) p.push("reasons");
  if (typeof r.optional !== "boolean" || typeof r.approximate !== "boolean") p.push("flags");
  return p;
}

/** §2.1 status rules, applied to the oracle (the labels must satisfy them). */
function statusRuleProblems(r: ParsedIngredientV1): string[] {
  const p: string[] = [];
  const classes = r.reasons.map((c) => REASONS[c].class);
  if (r.status === "ready") {
    if (r.name === null) p.push("ready without name");
    if (r.quantity?.kind === "range") p.push("ready with range");
    if (r.quantity !== null && r.unit === null) p.push("ready quantity without unit");
    if (r.quantity === null && r.amountUnstated === null) p.push("ready without quantity or amountUnstated");
    if (r.alternatives.length > 0) p.push("ready with alternatives");
    if (classes.some((c) => c !== "info")) p.push("ready with a review/unsupported reason");
  }
  if (r.status === "needs_review" && !classes.includes("review")) p.push("needs_review without a review reason");
  if (r.status === "unsupported" && (!classes.includes("unsupported") || r.name !== null || r.quantity !== null || r.unit !== null || r.packageSize !== null)) p.push("unsupported rule");
  if (r.alternatives.length === 1) p.push("one alternative");
  return p;
}

describe("control engines produce contract-shaped readings", () => {
  it.each(Object.keys(ctl))("%s", (key) => {
    const engine = ctl[key];
    for (const c of cases) expect(shapeProblems(engine.parse(c.input)), `${key} ${c.id}`).toEqual([]);
    expect(shapeProblems(engine.parse("a line that is not in the corpus"))).toEqual([]);
  });

  it("the oracle's readings satisfy the §2.1 status rules", () => {
    for (const c of cases) expect(statusRuleProblems(ctl.oracle.parse(c.input)), c.id).toEqual([]);
  });
});

describe("oracle", () => {
  it("scores 100% with zero false certainty, fabrication and cross-dimension, on every split", () => {
    for (const s of [oracle.overall, oracle.splits.dev!, oracle.splits.holdout!]) {
      const m = s.metrics;
      expect(m.corePass.all.strict.num).toBe(m.cases);
      expect(m.fullPass.all.strict.num).toBe(m.cases);
      expect(m.fullPass.readyLabelled.strict.num).toBe(m.labelReady);
      for (const f of EXPECT_FIELDS) expect(m.fieldMatch.all[f].strict.num, f).toBe(m.cases);
      expect(m.falseCertainty.total.num).toBe(0);
      expect(m.falseCertainty.detailOnlyLow.num).toBe(0);
      expect(m.fabricatedQuantity.num).toBe(0);
      expect(m.crossDimension.num).toBe(0);
      expect(m.unnecessaryReview.num).toBe(0);
      expect(m.engineErrors).toBe(0);
    }
    expect(oracle.mismatches).toEqual([]);
    expect(oracle.splits.dev!.metrics.cases + oracle.splits.holdout!.metrics.cases).toBe(cases.length);
  });

  it("per-category figures cover every category and also score 100%", () => {
    for (const [cat, m] of Object.entries(oracle.overall.byCategory)) {
      expect(m!.corePass.strict.num, cat).toBe(m!.cases);
      expect(m!.falseCertainty.total.num, cat).toBe(0);
    }
  });
});

describe("saboteurs are detected", () => {
  it("drop-amount (ready, quantity null) → high false certainty", () => {
    const m = score("dropAmount").overall.metrics;
    const withAmount = cases.filter((c) => c.expect.status === "ready" && c.expect.quantity !== null).length;
    expect(m.falseCertainty.high.num).toBe(withAmount);
    expect(m.falseCertainty.wrongAmount.num).toBe(withAmount);
    expect(m.fieldMatch.all.quantity.strict.num).toBe(cases.length - withAmount);
  });

  it("oz ↔ fl_oz swap → cross-dimension (dev and holdout)", () => {
    const s = score("ozSwap");
    const touchesOz = (c: IngredientCase) => [c.expect.unit, c.expect.packageSize?.unit].some((u) => u === "oz" || u === "fl_oz");
    expect(s.overall.metrics.crossDimension.num).toBe(cases.filter(touchesOz).length);
    expect(s.splits.dev!.metrics.crossDimension.num).toBeGreaterThan(0);
    expect(s.splits.holdout!.metrics.crossDimension.num).toBeGreaterThan(0);
    expect(s.overall.metrics.falseCertainty.high.num).toBeGreaterThan(0);
  });

  it("suppressed ambiguity (needs_review labels returned ready) → high false certainty", () => {
    const m = score("suppressAmbiguity").overall.metrics;
    const notReady = cases.filter((c) => c.expect.status === "needs_review");
    expect(m.falseCertainty.suppressedAmbiguity.num).toBe(notReady.length);
    expect(m.falseCertainty.high.num).toBe(notReady.filter((c) => c.severity === "high").length);
    expect(m.falseCertainty.high.num).toBeGreaterThan(0);
    expect(m.falseCertainty.total.num).toBe(notReady.length);
  });

  it("invent amount (1 each where the label has none) → fabricated quantity", () => {
    const m = score("inventAmount").overall.metrics;
    const invented = cases.filter((c) => c.expect.quantity === null && c.expect.status !== "unsupported").length;
    expect(m.fabricatedQuantity.num).toBe(invented);
    expect(m.fabricatedQuantity.num).toBeGreaterThan(0);
    expect(m.fabricatedQuantity.den).toBe(cases.filter((c) => c.expect.quantity === null).length);
  });

  it("all needs_review → review rate 100% and zero false certainty", () => {
    const m = score("allNeedsReview").overall.metrics;
    expect(m.reviewRate.num).toBe(m.reviewRate.den);
    expect(m.reviewRate.rate).toBe(1);
    expect(m.unnecessaryReview.num).toBe(m.labelReady);
    expect(m.falseCertainty.total.num).toBe(0);
  });

  it("name = raw input → name match falls", () => {
    const m = score("nameIsRawInput").overall.metrics;
    expect(m.fieldMatch.all.name.strict.num).toBeLessThan(oracle.overall.metrics.fieldMatch.all.name.strict.num);
    expect(m.fieldMatch.all.name.accepted.num).toBeLessThan(cases.length / 2);
    expect(m.falseCertainty.medium.num).toBeGreaterThan(0);
  });

  it("rounded third (1/3 → 3333/10000) → quantity mismatch on exactly the third/sixth cases", () => {
    const s = score("roundedThird");
    const hasThird = (c: IngredientCase) => {
      const q = c.expect.quantity === null ? null : parseLabelQuantity(c.expect.quantity);
      if (!q) return false;
      const dens = q.kind === "exact" ? [q.value.d] : [q.min.d, q.max.d];
      return dens.some((d) => d % BigInt(3) === BigInt(0));
    };
    const expected = cases.filter(hasThird).map((c) => c.id);
    const got = s.mismatches.filter((m) => m.fields.some((f) => f.field === "quantity")).map((m) => m.id);
    expect(expected.length).toBeGreaterThan(10);
    expect(got).toEqual(expected);
    expect(s.mismatches.find((m) => m.id === "ing-dev-0001")!.fields).toEqual([{ field: "quantity", expected: "1/3", got: "3333/10000", accepted: false }]);
  });
});

describe("page scoring controls", () => {
  const pages = loadPageLabels(FIXTURES);
  const read = (file: string) => readFileSync(path.join(FIXTURES, "pages", file), "utf8");

  it("an oracle extractor scores 100% (detection, counts, every field, lists, diagnostics, retention)", () => {
    const files: string[] = [];
    const s = scorePages(pages, oraclePageExtractor(pages, ctl.oracle), (f) => (files.push(f), read(f)));
    expect(files).toEqual(pages.map((p) => p.file));
    for (const r of [s.overall, s.splits.dev!, s.splits.holdout!]) {
      expect(r.detection.precision.num).toBe(r.detection.precision.den);
      expect(r.detection.recall.num).toBe(r.detection.recall.den);
      expect(r.detection.falsePositive + r.detection.falseNegative).toBe(0);
      expect(r.candidateCountMatch.num).toBe(r.pages);
      expect(r.candidateFullMatch.num).toBe(r.expectedCandidates);
      expect(r.ingredientListExact.num).toBe(r.expectedCandidates);
      expect(r.diagnosticsFound.num).toBe(r.pages);
      expect(r.retentionNotDecided.num).toBe(r.pages);
      expect(r.ingredientReadings.lengthMatchesLines.num).toBe(r.ingredientReadings.candidates);
    }
    expect(s.mismatches).toEqual([]);
    expect(s.overall.detection.trueNegative).toBe(pages.filter((p) => !p.isRecipe).length);
  });

  it("an extractor that finds nothing loses recall and every field", () => {
    const s = scorePages(pages, oraclePageExtractor([], ctl.oracle), read);
    expect(s.overall.detection.recall.num).toBe(0);
    expect(s.overall.detection.falseNegative).toBe(pages.filter((p) => p.isRecipe).length);
    expect(s.overall.fieldMatch.title.strict.num).toBe(0);
    expect(s.overall.diagnosticsFound.num).toBe(pages.filter((p) => p.expectedDiagnostics.length === 0).length);
  });

  it("image order, undecoded entities and a wrong site name are each caught", () => {
    const s = scorePages(
      pages,
      oraclePageExtractor(pages, ctl.oracle, (c) => ({
        ...c,
        imageCandidates: [...c.imageCandidates].reverse(),
        ingredientLines: c.ingredientLines.map((l) => l.replace("½", "&frac12;")),
        siteName: c.siteName === null ? null : `${c.siteName} (OG)`,
      })),
      read,
    );
    const multiImage = pages.flatMap((p) => p.candidates).filter((c) => c.imageUrls.length > 1).length;
    const withHalf = pages.flatMap((p) => p.candidates).filter((c) => c.ingredientLines.some((l) => l.includes("½"))).length;
    const o = s.overall;
    expect(o.expectedCandidates - o.fieldMatch.imageUrls.strict.num).toBe(multiImage);
    expect(o.expectedCandidates - o.ingredientListExact.num).toBe(withHalf);
    expect(o.fieldMatch.siteName.strict.num).toBe(0);
    expect(withHalf).toBeGreaterThan(0);
  });

  it("an extractor that throws is reported, not fatal; a retention other than not_decided is flagged", () => {
    const s = scorePages(pages, () => {
      throw new Error("boom");
    }, read);
    expect(s.overall.extractorErrors).toBe(pages.length);
    expect(s.mismatches.every((m) => m.error === "Error: boom")).toBe(true);
    const kept = scorePages(pages, (h, i) => ({ ...oraclePageExtractor(pages, ctl.oracle)(h, i), retention: "kept" as never }), read);
    expect(kept.overall.retentionNotDecided.num).toBe(0);
  });
});

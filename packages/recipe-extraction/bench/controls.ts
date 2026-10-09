/**
 * Mutation controls: engines built from the labels themselves. The oracle returns each label as a
 * contract-shaped reading; each saboteur breaks it in one known way, so the scorer is shown to detect
 * that failure (bench/__tests__/mutation-controls.test.ts). Never a parser: an input that is not in the
 * corpus gets an honest "unclassified" needs_review reading. Pure.
 */
import type { Dimension, ExactQuantity, IngredientEngine, ParsedIngredientV1, QuantityV1, RecipeCandidateV1, RecipeExtractionV1, ReasonCode, UnitV1 } from "../src/contract";
import { formatMixed, fromExactQuantity, parseRationalText, rational, toDecimal, toExactQuantity, type Rational } from "../src/rational";
import { parseLabelExact, parseLabelQuantity, unitDimension, type IngredientCase, type LabelAmount, type PageLabel } from "./types";

const exact = (r: Rational): ExactQuantity => {
  const q = toExactQuantity(r);
  if (!q) throw new RangeError(`label quantity out of bounds: ${formatMixed(r)}`);
  return q;
};

function labelQuantity(s: string | null): QuantityV1 | null {
  if (s === null) return null;
  const q = parseLabelQuantity(s);
  if (!q) throw new Error(`invalid label quantity ${s}`);
  if (q.kind === "exact") return exact(q.value);
  return { kind: "range", min: exact(q.min), max: exact(q.max), display: `${formatMixed(q.min)}–${formatMixed(q.max)}` };
}

function unit(code: string | null): UnitV1 | null {
  if (code === null) return null;
  return { canonical: code as UnitV1["canonical"], dimension: unitDimension(code) as Dimension, source: code === "each" ? "" : code };
}

const amount = (a: LabelAmount) => ({ quantity: exact(parseLabelExact(a.quantity)!), unit: unit(a.unit)! });

function normalizedText(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, " ").replace(/\s+/gu, " ").trim().slice(0, 500);
}

function reasonsFor(c: IngredientCase): ReasonCode[] {
  const e = c.expect;
  if (e.status === "unsupported") return [c.input.trim() === "" ? "empty_line" : c.categories.includes("heading_non_ingredient") ? "section_heading" : "not_an_ingredient"];
  const out: ReasonCode[] = [];
  if (e.status === "needs_review") {
    if (e.alternatives.length > 0) out.push("ingredient_alternatives");
    if (e.quantity?.includes("..")) out.push("quantity_range");
    if (e.quantity === null && e.unit !== null) out.push(c.categories.includes("ambiguous_number_format") ? "number_format_ambiguous" : "quantity_not_positive");
    if (e.quantity === null && e.unit === null && e.alternatives.length === 0) out.push("quantity_missing");
    if (out.length === 0) out.push("unclassified");
  }
  if (e.amountUnstated) out.push("amount_unstated");
  if (e.optional) out.push("optional_ingredient");
  if (e.approximate) out.push("approximate_quantity");
  if (e.packageSize) out.push("package_size_stated");
  if (e.equivalents.length > 0) out.push("equivalent_quantity_stated");
  if (e.form) out.push("form_stated");
  const dim = e.unit ? unitDimension(e.unit) : null;
  if (dim === "count") out.push("count_unit");
  if (dim === "imprecise") out.push("imprecise_unit");
  return out;
}

/** The label as a contract-shaped reading (what a perfect engine would return). */
export function labelToReading(c: IngredientCase): ParsedIngredientV1 {
  const e = c.expect;
  return {
    raw: c.input,
    normalized: normalizedText(c.input),
    status: e.status,
    name: e.name,
    quantity: labelQuantity(e.quantity),
    unit: unit(e.unit),
    packageSize: e.packageSize ? amount(e.packageSize) : null,
    equivalents: e.equivalents.map(amount),
    form: e.form,
    note: e.note,
    alternatives: [...e.alternatives],
    optional: e.optional,
    approximate: e.approximate,
    amountUnstated: e.amountUnstated,
    reasons: reasonsFor(c),
    evidence: { spans: {} },
  };
}

/** An honest reading for a line that is not in the label set. */
export function unknownLineReading(line: string): ParsedIngredientV1 {
  return {
    raw: typeof line === "string" ? line : "",
    normalized: typeof line === "string" ? normalizedText(line) : "",
    status: "needs_review",
    name: null,
    quantity: null,
    unit: null,
    packageSize: null,
    equivalents: [],
    form: null,
    note: null,
    alternatives: [],
    optional: false,
    approximate: false,
    amountUnstated: null,
    reasons: ["unclassified"],
    evidence: { spans: {} },
  };
}

export type Sabotage = (reading: ParsedIngredientV1, c: IngredientCase) => ParsedIngredientV1;

/** An engine that answers each labelled input with `transform(labelToReading(case))`. */
export function engineFromLabels(id: string, description: string, cases: readonly IngredientCase[], transform: Sabotage = (r) => r): IngredientEngine {
  const byInput = new Map(cases.map((c) => [c.input, c]));
  return {
    id,
    description,
    parse(line: string): ParsedIngredientV1 {
      const c = byInput.get(line);
      return c ? transform(labelToReading(c), c) : unknownLineReading(line);
    },
  };
}

const swapOz = (u: UnitV1 | null): UnitV1 | null =>
  u?.canonical === "oz" ? { ...u, canonical: "fl_oz", dimension: "volume" } : u?.canonical === "fl_oz" ? { ...u, canonical: "oz", dimension: "mass" } : u;

function roundThird(q: ExactQuantity): ExactQuantity {
  const r = fromExactQuantity(q)!;
  if (r.d % BigInt(3) !== BigInt(0)) return q;
  const rounded = parseRationalText(toDecimal(r, 4).value)!;
  return toExactQuantity(rational(rounded.n, rounded.d), "decimal")!;
}

/** The oracle and the saboteurs named in the Phase 1 brief. */
export function controlEngines(cases: readonly IngredientCase[]): Record<string, IngredientEngine> {
  const mk = (id: string, description: string, t?: Sabotage) => engineFromLabels(id, description, cases, t);
  return {
    oracle: mk("control:oracle", "Returns every label exactly."),
    dropAmount: mk("control:drop-amount", "Ready-labelled lines with an amount come back ready with quantity null.", (r, c) =>
      c.expect.status === "ready" && c.expect.quantity !== null ? { ...r, quantity: null } : r),
    ozSwap: mk("control:oz-swap", "oz and fl_oz exchanged in unit, package size and equivalents.", (r) => ({
      ...r,
      unit: swapOz(r.unit),
      packageSize: r.packageSize ? { ...r.packageSize, unit: swapOz(r.packageSize.unit)! } : null,
      equivalents: r.equivalents.map((x) => ({ ...x, unit: swapOz(x.unit)! })),
    })),
    suppressAmbiguity: mk("control:suppress-ambiguity", "needs_review labels come back ready: first option, lower end of a range, 'as needed' for a missing amount.", (r, c) => {
      if (c.expect.status !== "needs_review") return r;
      const q = r.quantity?.kind === "range" ? r.quantity.min : r.quantity;
      return {
        ...r,
        status: "ready",
        name: r.name ?? r.alternatives[0] ?? null,
        alternatives: [],
        quantity: q,
        amountUnstated: q === null ? (r.amountUnstated ?? "as_needed") : r.amountUnstated,
        reasons: [],
      };
    }),
    inventAmount: mk("control:invent-amount", "Every ingredient line without a labelled amount gets 1 (each when no unit).", (r, c) =>
      c.expect.quantity === null && c.expect.status !== "unsupported" ? { ...r, quantity: exact(rational(BigInt(1))), unit: r.unit ?? unit("each") } : r),
    allNeedsReview: mk("control:all-needs-review", "Every line comes back needs_review (reason unclassified).", (r) => ({ ...r, status: "needs_review", reasons: ["unclassified"] })),
    nameIsRawInput: mk("control:name-is-raw-input", "The name is the whole input line.", (r, c) => (c.expect.status === "unsupported" ? r : { ...r, name: r.raw })),
    roundedThird: mk("control:rounded-third", "Quantities with a third in them are rounded to 4 decimals (1/3 → 0.3333).", (r) => {
      const q = r.quantity;
      if (q === null) return r;
      return { ...r, quantity: q.kind === "exact" ? roundThird(q) : { ...q, min: roundThird(q.min), max: roundThird(q.max) } };
    }),
  };
}

const nullCore = (r: ParsedIngredientV1): ParsedIngredientV1 => ({
  ...r,
  name: null,
  quantity: null,
  unit: null,
  packageSize: null,
  equivalents: [],
  form: null,
  note: null,
  alternatives: [],
  optional: false,
  approximate: false,
  amountUnstated: null,
});

/**
 * Mutation controls for the EVALUATION-PLAN-v2 outcome scorer (bench/outcomes.ts): the oracle and one
 * saboteur per outcome class / severe code it must trip (bench/__tests__/outcome-controls.test.ts).
 */
export function outcomeControlEngines(cases: readonly IngredientCase[]): Record<string, IngredientEngine> {
  const mk = (id: string, description: string, t?: Sabotage) => engineFromLabels(id, description, cases, t);
  return {
    oracle: mk("control:oracle", "Returns every label exactly."),
    dropAmount: mk("control:drop-amount", "Ready-labelled lines with an amount come back ready with quantity null (S2).", (r, c) =>
      c.expect.status === "ready" && c.expect.quantity !== null ? { ...r, quantity: null } : r),
    ozSwap: mk("control:oz-swap", "oz and fl_oz exchanged in unit, package size and equivalents (S3).", (r) => ({
      ...r,
      unit: swapOz(r.unit),
      packageSize: r.packageSize ? { ...r.packageSize, unit: swapOz(r.packageSize.unit)! } : null,
      equivalents: r.equivalents.map((x) => ({ ...x, unit: swapOz(x.unit)! })),
    })),
    readyOnNeedsReview: mk("control:ready-on-needs-review", "needs_review labels come back ready, fields as labelled (S4).", (r, c) =>
      c.expect.status === "needs_review" ? { ...r, status: "ready", reasons: [] } : r),
    readyOnUnsupported: mk("control:ready-on-unsupported", "unsupported labels come back ready with the line as the name (S8).", (r, c) =>
      c.expect.status === "unsupported" ? { ...r, status: "ready", name: r.normalized === "" ? "(empty)" : r.normalized, amountUnstated: "other", reasons: [] } : r),
    inventAmount: mk("control:invent-amount", "Every ingredient line without a labelled amount gets 1 (each when no unit) (S1).", (r, c) =>
      c.expect.quantity === null && c.expect.status !== "unsupported" ? { ...r, quantity: exact(rational(BigInt(1))), unit: r.unit ?? unit("each") } : r),
    firstAlternative: mk("control:first-alternative", "A choice of ingredients comes back ready as its first option, no alternatives (S5).", (r, c) =>
      c.expect.alternatives.length >= 2 ? { ...r, status: "ready", name: c.expect.alternatives[0], alternatives: [], reasons: [] } : r),
    foldPackage: mk("control:fold-package", "count × package size folded into the size's unit; package size dropped (S6).", (r, c) => {
      const p = c.expect.packageSize;
      const q = c.expect.quantity === null ? null : parseLabelQuantity(c.expect.quantity);
      if (!p || !q || q.kind !== "exact") return r;
      const size = parseLabelExact(p.quantity)!;
      return { ...r, quantity: exact(rational(q.value.n * size.n, q.value.d * size.d)), unit: unit(p.unit), packageSize: null };
    }),
    dropQualifier: mk("control:drop-qualifier", "Ready labels with a multi-word name lose the name's first word (S7 unless the shorter name is accepted).", (r, c) => {
      const words = (c.expect.name ?? "").trim().split(/\s+/u);
      return c.expect.status === "ready" && words.length >= 2 ? { ...r, name: words.slice(1).join(" ") } : r;
    }),
    collapseRange: mk("control:collapse-range", "A range comes back ready as its lower end (S2, S4).", (r) =>
      r.quantity?.kind === "range" ? { ...r, status: "ready", quantity: r.quantity.min, reasons: [] } : r),
    allNeedsReviewPartials: mk("control:all-needs-review-partials", "Every line needs_review (unclassified), every field as labelled: useful partials (C3a/C5a/C8).", (r) => ({
      ...r,
      status: "needs_review",
      reasons: ["unclassified"],
    })),
    allAbstain: mk("control:all-abstain", "Every line needs_review with nothing read (C3c/C5c/C8).", (r) => ({ ...nullCore(r), status: "needs_review", reasons: ["unclassified"] })),
    allUnsupported: mk("control:all-unsupported", "Every line unsupported, nothing read (C4/C6/C7).", (r) => ({ ...nullCore(r), status: "unsupported", reasons: ["not_an_ingredient"] })),
  };
}

// --- Page oracle --------------------------------------------------------------------------------

export type PageCandidateSabotage = (c: RecipeCandidateV1, label: PageLabel) => RecipeCandidateV1;

/** A page "extractor" that returns each page's labels (looked up by finalUrl); for scorer tests only. */
export function oraclePageExtractor(pages: readonly PageLabel[], ingredientEngine: IngredientEngine, sabotage: PageCandidateSabotage = (c) => c) {
  const byFinal = new Map(pages.map((p) => [p.finalUrl, p]));
  return (_html: string, input: { requestedUrl: string; finalUrl: string }): RecipeExtractionV1 => {
    const p = byFinal.get(input.finalUrl);
    const host = (() => {
      try {
        return new URL(input.finalUrl).host;
      } catch {
        return null;
      }
    })();
    const candidates: RecipeCandidateV1[] = (p?.candidates ?? []).map((l) =>
      sabotage(
        {
          structure: l.structure,
          title: l.title,
          description: null,
          yieldText: l.yieldText,
          servings: l.servings,
          times: { prepMinutes: l.prepMinutes, cookMinutes: l.cookMinutes, totalMinutes: l.totalMinutes },
          author: l.author,
          siteName: l.siteName,
          category: l.category,
          cuisine: l.cuisine,
          declaredUrl: l.declaredUrl,
          hasInstructions: l.instructionCount > 0,
          hasNutrition: false,
          ingredientLines: [...l.ingredientLines],
          ingredients: l.ingredientLines.map((line) => ingredientEngine.parse(line)),
          instructionCandidates: Array.from({ length: l.instructionCount }, (_, i) => ({ section: null, text: `step ${i + 1}` })),
          imageCandidates: l.imageUrls.map((url, i) => ({ url, role: i === 0 ? "hero" : "other" })),
        },
        p!,
      ),
    );
    return {
      schemaVersion: "recipe-extraction/v1",
      extractorVersion: "control",
      engines: { page: "control:page-oracle", ingredient: ingredientEngine.id },
      source: { requestedUrl: input.requestedUrl, finalUrl: input.finalUrl, finalHost: host },
      page: { title: null, siteName: null, image: null },
      retention: "not_decided",
      candidates,
      stats: { jsonLdBlocks: 0, recipeNodes: candidates.length, microdata: candidates.some((c) => c.structure === "microdata") },
      diagnostics: (p?.expectedDiagnostics ?? []).map((code) => ({ code, detail: null })),
    };
  };
}

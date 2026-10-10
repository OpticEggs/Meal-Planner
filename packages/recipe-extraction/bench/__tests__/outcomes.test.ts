/**
 * Outcomes v3 scoring (EVALUATION-PLAN-v3), unit level: every outcome class (C1–C8, C1+, the C3/C5
 * partial sub-classes, CE), every severe code S1–S8, false-certainty severity, aggregates and the
 * acceptance statuses — each from a hand-built label and a contract-valid engine reading (an invalid
 * reading is CE; see the CE tests). The hand-calculated oracles are in oracles-v3.json.
 */
import { describe, expect, it } from "vitest";
import type { IngredientEngine, ParsedIngredientV1 } from "../../src/contract";
import { labelToReading } from "../controls";
import { ACCEPTANCE_THRESHOLD, acceptance, aggregate, classifyLine, classifyLines, classifyObservation, engineOutcomes, observe, observeAll, replayEngine, serializeParse, setReport, type LineOutcome } from "../outcomes";
import { rate } from "../stats";
import type { IngredientCase, IngredientExpect } from "../types";

let seq = 0;
function mk(input: string, e: Partial<IngredientExpect>, extra: Partial<IngredientCase> = {}): IngredientCase {
  seq++;
  return {
    id: `ing-h2-${String(seq).padStart(4, "0")}`,
    split: "holdout2",
    categories: ["integer_decimal"],
    input,
    expect: {
      status: "ready",
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
      ...e,
    },
    accept: {},
    severity: "high",
    seasoningClass: null,
    provenance: { kind: "synthetic_pattern", source: "unit test" },
    source: { kind: "synthetic_pattern", author: "unit test" },
    construction: "test",
    rationale: "unit test",
    ...extra,
  };
}
const read = (c: IngredientCase, patch: Partial<ParsedIngredientV1> = {}): ParsedIngredientV1 => ({ ...labelToReading(c), ...patch });
const q = (n: string, d = "1") => ({ kind: "exact" as const, numerator: n, denominator: d, display: d === "1" ? n : `${n}/${d}` });
const u = (canonical: string, dimension: string, source = canonical) => ({ canonical, dimension, source }) as ParsedIngredientV1["unit"];

// Labels used throughout.
const flour = mk("2 cups flour, sifted", { name: "flour", quantity: "2", unit: "cup", note: "sifted" });
const walnuts = mk("1/2 cup chopped walnuts", { name: "chopped walnuts", quantity: "1/2", unit: "cup" }, { accept: { name: ["walnuts"], note: ["chopped"] } });
const milk = mk("1 cup 2% milk", { name: "2% milk", quantity: "1", unit: "cup" });
const beans = mk("2 (15 oz) cans black beans", { name: "black beans", quantity: "2", unit: "can", packageSize: { quantity: "15", unit: "oz" } });
const saltToTaste = mk("salt to taste", { name: "salt", amountUnstated: "to_taste" });
const range = mk("2-3 cloves garlic", { status: "needs_review", name: "garlic", quantity: "2..3", unit: "clove" });
const alts = mk("1 cup milk or cream", { status: "needs_review", name: null, quantity: "1", unit: "cup", alternatives: ["milk", "cream"] }, { accept: { alternatives: [["whole milk", "cream"]] } });
const altsNoAmount = mk("chicken stock or water", { status: "needs_review", alternatives: ["chicken stock", "water"] });
const noAmount = mk("fresh parsley", { status: "needs_review", name: "fresh parsley" });
const heading = mk("For the sauce:", { status: "unsupported" }, { categories: ["heading_non_ingredient"], severity: "medium" });

const one = (c: IngredientCase, r: unknown, err: string | null = null) => classifyLine(c, r, err);

describe("outcome classes (§4)", () => {
  it("C1 and C1+: ready label, ready reading, every field right", () => {
    const o = one(flour, read(flour));
    expect(o).toMatchObject({ outcome: "C1", fullyCorrect: true, detailMismatch: false, partial: null, falseCertainty: null, severe: [] });
    expect(o.strict).toEqual({ outcome: "C1", fullyCorrect: true });
  });

  it("C1 that is not C1+: only a non-core field differs → low detail mismatch, not C2", () => {
    const o = one(flour, read(flour, { note: "packed", optional: true }));
    expect(o).toMatchObject({ outcome: "C1", fullyCorrect: false, detailMismatch: true, falseCertainty: null, severe: [] });
  });

  it("accepted values give C1; strict matching reports the same line as C2", () => {
    const o = one(walnuts, read(walnuts, { name: "walnuts", note: "chopped" }));
    expect(o.outcome).toBe("C1");
    expect(o.fullyCorrect).toBe(true);
    expect(o.strict).toEqual({ outcome: "C2", fullyCorrect: false });
    expect(o.fields.name).toEqual({ strict: false, accepted: true });
  });

  it("package size is a core field: a wrong package size on a ready reading is C2 high", () => {
    const o = one(beans, read(beans, { packageSize: { quantity: q("16"), unit: u("oz", "mass")! } }));
    expect(o).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: [] });
  });

  it("C2 medium: only the name is wrong (and not a dropped qualifier)", () => {
    const o = one(flour, read(flour, { name: "bread flour" }));
    expect(o).toMatchObject({ outcome: "C2", falseCertainty: "medium", severe: [] });
  });

  it("C2 high: a wrong unit of the same dimension (no S code)", () => {
    const o = one(flour, read(flour, { unit: u("tbsp", "volume") }));
    expect(o).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: [] });
  });

  it("C2 high: ready on a needs_review label (S4) or an unsupported label (S8)", () => {
    expect(one(noAmount, read(noAmount, { status: "ready", amountUnstated: "as_needed", reasons: [] }))).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: ["S4"] });
    expect(one(heading, read(heading, { status: "ready", name: "sauce", amountUnstated: "other", reasons: [] }))).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: ["S8"] });
  });

  it("a fabricated amount on a ready reading is C2 high with S1; with a null unit the reading is invalid, so CE (documented reading)", () => {
    expect(one(saltToTaste, read(saltToTaste, { quantity: q("1"), unit: u("pinch", "imprecise") }))).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: ["S1"] });
    expect(one(saltToTaste, read(saltToTaste, { quantity: q("1") }))).toMatchObject({ outcome: "CE", falseCertainty: null, severe: [] });
  });

  it("C3 sub-classes on a ready label: a useful partial, b wrong partial, c abstention, x food not named", () => {
    const nr = { status: "needs_review" as const, reasons: ["unclassified" as const] };
    expect(one(flour, read(flour, { ...nr, quantity: null, unit: null })).partial).toBe("a");
    expect(one(flour, read(flour, nr))).toMatchObject({ outcome: "C3", partial: "a" });
    expect(one(flour, read(flour, { ...nr, name: "2 cups flour" })).partial).toBe("b");
    expect(one(flour, read(flour, { ...nr, quantity: q("3") })).partial).toBe("b");
    expect(one(flour, read(flour, { ...nr, name: null, quantity: null, unit: null, note: null })).partial).toBe("c");
    expect(one(flour, read(flour, { ...nr, name: null })).partial).toBe("x");
    expect(one(flour, read(flour, { ...nr, name: null, alternatives: ["flour", "starch"] })).partial).toBe("b");
    expect(one(walnuts, read(walnuts, { ...nr, name: "walnuts" })).partial).toBe("a");
  });

  it("C4: ready label, unsupported reading", () => {
    expect(one(flour, read(flour, { status: "unsupported", name: null, quantity: null, unit: null, reasons: ["not_an_ingredient"] }))).toMatchObject({ outcome: "C4", partial: null, severe: [] });
  });

  it("C5 with partial correctness, C6", () => {
    expect(one(range, read(range))).toMatchObject({ outcome: "C5", partial: "a", severe: [] });
    expect(one(alts, read(alts))).toMatchObject({ outcome: "C5", partial: "a" });
    expect(one(altsNoAmount, read(altsNoAmount))).toMatchObject({ outcome: "C5", partial: "a" });
    expect(one(altsNoAmount, read(altsNoAmount, { alternatives: [] })).partial).toBe("c");
    expect(one(alts, read(alts, { alternatives: [] })).partial).toBe("x");
    expect(one(alts, read(alts, { alternatives: ["milk", "butter"] })).partial).toBe("b");
    expect(one(noAmount, read(noAmount, { name: null })).partial).toBe("c");
    expect(one(range, read(range, { status: "unsupported", name: null, quantity: null, unit: null, reasons: ["not_an_ingredient"] }))).toMatchObject({ outcome: "C6", partial: null });
  });

  it("C7 and C8", () => {
    expect(one(heading, read(heading)).outcome).toBe("C7");
    expect(one(heading, read(heading, { status: "needs_review", reasons: ["unclassified"] })).outcome).toBe("C8");
  });

  it("CE: an engine error, an output that fails the contract validator, or two different parses (never C1, no S code)", () => {
    expect(one(flour, null, "Error: boom")).toMatchObject({ outcome: "CE", engineStatus: "error", severe: [], fullyCorrect: false, validity: { engineError: "Error: boom", problems: [], nondeterministic: false } });
    // SF-6: a status outside the contract no longer carries S codes (v2 gave S1 here).
    expect(one(saltToTaste, { ...read(saltToTaste), status: "maybe", quantity: q("1") })).toMatchObject({ outcome: "CE", engineStatus: "invalid", severe: [] });
    expect(one(flour, undefined)).toMatchObject({ outcome: "CE", engineStatus: "invalid", severe: [] });
    // N-2: validity is the validator's verdict, not the status string: a ready reading with a range is CE.
    const rangeReady = one(range, read(range, { status: "ready", reasons: [] }));
    expect(rangeReady).toMatchObject({ outcome: "CE", engineStatus: "ready", severe: [], falseCertainty: null, partial: null });
    expect(rangeReady.validity.problems).toEqual(["ingredient.quantity: a ready line cannot have a range"]);
    expect(rangeReady.fields).toEqual({ name: { strict: false, accepted: false }, quantity: false, unit: false });
    const twice = classifyObservation(flour, { first: { ok: true, output: read(flour) }, second: { ok: true, output: read(flour, { note: "x" }) } });
    expect(twice).toMatchObject({ outcome: "CE", severe: [], validity: { engineError: null, problems: [], nondeterministic: true } });
  });
});

describe("severe semantic errors (§5)", () => {
  it("S1 fabricated amount, on any status", () => {
    expect(one(noAmount, read(noAmount, { quantity: q("1"), unit: u("each", "count", "") })).severe).toEqual(["S1"]);
    expect(one(heading, read(heading, { status: "needs_review", name: "sauce", quantity: q("2"), unit: u("each", "count", ""), reasons: ["unclassified"] }))).toMatchObject({ outcome: "C8", severe: ["S1"] });
  });

  it("S2 wrong amount on a ready reading, including a range collapsed to one end", () => {
    expect(one(flour, read(flour, { quantity: q("3") })).severe).toEqual(["S2"]);
    expect(one(flour, read(flour, { quantity: null, amountUnstated: "other" })).severe).toEqual(["S2"]);
    expect(one(range, read(range, { status: "ready", quantity: q("2"), reasons: [] })).severe).toEqual(["S2", "S4"]);
    expect(one(flour, read(flour, { status: "needs_review", quantity: q("3"), reasons: ["unclassified"] })).severe).toEqual([]);
  });

  it("S3 cross-dimension on the unit or the package size (oz vs fl_oz)", () => {
    const oz = mk("2 oz cheese", { name: "cheese", quantity: "2", unit: "oz" });
    expect(one(oz, read(oz, { unit: u("fl_oz", "volume", "oz") })).severe).toEqual(["S3"]);
    expect(one(beans, read(beans, { packageSize: { quantity: q("15"), unit: u("fl_oz", "volume", "oz")! } })).severe).toEqual(["S3"]);
    expect(one(oz, read(oz, { unit: u("lb", "mass") })).severe).toEqual([]);
  });

  it("S4 suppressed ambiguity", () => {
    expect(one(noAmount, read(noAmount, { status: "ready", amountUnstated: "as_needed", reasons: [] })).severe).toEqual(["S4"]);
  });

  it("S5 silent alternative choice (labelled and accepted options), on any status", () => {
    expect(one(alts, read(alts, { status: "ready", name: "milk", alternatives: [], reasons: [] })).severe).toEqual(["S4", "S5"]);
    expect(one(alts, read(alts, { name: "Cream", alternatives: [] })).severe).toEqual(["S5"]);
    expect(one(alts, read(alts, { name: "whole milk", alternatives: [] })).severe).toEqual(["S5"]);
    expect(one(alts, read(alts, { name: "milk", alternatives: ["milk", "cream"] })).severe).toEqual([]);
    expect(one(alts, read(alts, { name: "half-and-half", alternatives: [] })).severe).toEqual([]);
  });

  it("S6 package representation changed: count × size folded into a mass/volume amount", () => {
    expect(one(beans, read(beans, { quantity: q("30"), unit: u("oz", "mass"), packageSize: null })).severe).toEqual(["S2", "S3", "S6"]);
    expect(one(beans, read(beans, { status: "needs_review", quantity: q("30"), unit: u("oz", "mass"), packageSize: null, reasons: ["unclassified"] })).severe).toEqual(["S3", "S6"]);
    expect(one(beans, read(beans, { packageSize: null })).severe).toEqual([]);
  });

  it("S7 dropped material qualifier: engine name words a proper subset of the label's", () => {
    expect(one(milk, read(milk, { name: "milk" }))).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: ["S7"] });
    expect(one(walnuts, read(walnuts, { name: "walnuts" })).severe).toEqual([]);
    expect(one(milk, read(milk, { name: "2% milk drink" })).severe).toEqual([]);
    expect(one(milk, read(milk, { name: "soy milk" })).severe).toEqual([]);
    expect(one(milk, read(milk, { status: "needs_review", name: "milk", reasons: ["unclassified"] })).severe).toEqual([]);
  });

  it("S8 ready on a non-ingredient", () => {
    expect(one(heading, read(heading, { status: "ready", name: "For the sauce", amountUnstated: "other", reasons: [] })).severe).toEqual(["S8"]);
  });

  it("a line may carry several codes", () => {
    const o = one(beans, read(beans, { quantity: q("30"), unit: u("fl_oz", "volume", "oz"), packageSize: null }));
    expect(o.severe).toEqual(["S2", "S3", "S6"]);
  });
});

describe("aggregates, denominators and intervals (§3, §7)", () => {
  const lines: LineOutcome[] = [
    one(flour, read(flour)),
    one(walnuts, read(walnuts, { note: "toasted" })),
    one(milk, read(milk, { name: "milk" })),
    one(beans, read(beans, { status: "needs_review", reasons: ["unclassified"] })),
    one(saltToTaste, read(saltToTaste, { status: "unsupported", name: null, amountUnstated: null, reasons: ["not_an_ingredient"] })),
    one(range, read(range)),
    one(alts, read(alts, { status: "ready", name: "milk", alternatives: [], reasons: [] })),
    one(heading, read(heading)),
    one(heading, null, "Error: boom"),
  ];

  it("counts each class over its own denominator", () => {
    const a = aggregate(lines);
    expect([a.lines, a.ready, a.needsReview, a.unsupported]).toEqual([9, 5, 2, 2]);
    const o = a.outcomes;
    expect([o.C1.num, o.C1.den, o.C1plus.num, o.detailMismatchLow.num]).toEqual([2, 5, 1, 1]);
    expect([o.C2.num, o.C2.den, o.C2High.num, o.C2Medium.num]).toEqual([2, 9, 2, 0]);
    expect([o.C2OnReady.num, o.C2OnReady.den, o.C2OnNeedsReview.num, o.C2OnNeedsReview.den, o.C2OnUnsupported.den]).toEqual([1, 5, 1, 2, 2]);
    expect([o.C3.num, o.C3a.num, o.C4.num, o.C3plusC4.num, o.C3plusC4.den]).toEqual([1, 1, 1, 2, 5]);
    expect([o.C5.num, o.C5.den, o.C5a.num, o.C6.num]).toEqual([1, 2, 1, 0]);
    expect([o.C7.num, o.C7.den, o.C8.num, o.CE.num, o.CE.den]).toEqual([1, 2, 0, 1, 9]);
    expect([a.severe.S4.num, a.severe.S5.num, a.severe.S7.num, a.anySevere.num, a.anySevere.den]).toEqual([1, 1, 1, 2, 9]);
    expect(a.strict.C1.num).toBe(2);
  });

  it("every rate carries numerator, denominator and a Wilson interval; zero counts keep their upper bound", () => {
    const a = aggregate(lines);
    expect(a.outcomes.C6).toEqual(rate(0, 2));
    expect(a.outcomes.C6.ci95![1]).toBeGreaterThan(0);
    expect(aggregate([]).outcomes.C1).toEqual({ num: 0, den: 0, rate: null, ci95: null });
  });

  it("field accuracy on R counts matches whatever the engine status", () => {
    const a = aggregate(lines);
    expect(a.fieldAccuracyOnReady.quantity.num).toBe(5); // salt-to-taste's null quantity matches; beans read as needs_review still match
    expect(a.fieldAccuracyOnReady.name.accepted.num).toBe(3); // milk → "milk" and salt → null do not
  });

  it("sets report per category and (holdout2 only) per source kind, with case ids", () => {
    const s = setReport("holdout2", lines);
    expect(s.byCategory.heading_non_ingredient!.lines).toBe(2);
    expect(s.byCategory.integer_decimal!.lines).toBe(7);
    expect(Object.keys(s.bySourceKind!)).toEqual(["synthetic_pattern"]);
    expect(s.caseIds.S5).toEqual([alts.id]);
    expect(s.caseIds.CE).toEqual([heading.id]);
    expect(s.caseIds.strictDiffers).toEqual([]);
    expect(s.acceptance).not.toBeNull();
    const dev = setReport("dev", lines);
    expect(dev.bySourceKind).toBeNull();
    expect(dev.acceptance).toBeNull();
  });
});

describe("acceptance statuses (§6)", () => {
  const withC1 = (num: number, den: number) => {
    const a = aggregate([]);
    a.outcomes.C1 = rate(num, den);
    for (const f of ["quantity", "unit"] as const) a.fieldAccuracyOnReady[f] = rate(den, den);
    a.fieldAccuracyOnReady.name.accepted = rate(den, den);
    a.outcomes.C3plusC4 = rate(0, den);
    return a;
  };
  const status = (a: ReturnType<typeof aggregate>, id: string) => acceptance(a, "holdout2").criteria.find((c) => c.id === id)!.status;

  it("A1: met with confidence needs the Wilson lower bound ≥ 98 % (189 perfect R lines), met on the point estimate, else not met", () => {
    expect(ACCEPTANCE_THRESHOLD.A1).toBe(0.98);
    expect(status(withC1(189, 189), "A1")).toBe("met with confidence");
    expect(status(withC1(188, 188), "A1")).toBe("met");
    expect(status(withC1(98, 100), "A1")).toBe("met");
    expect(status(withC1(97, 100), "A1")).toBe("not met");
    expect(status(withC1(0, 0), "A1")).toBe("not met");
  });

  it("A2 needs every field; A3/A4 need zero counts; A5 is the point estimate ≤ 10 %; A6/A7 are outside the scorer", () => {
    const a = withC1(200, 200);
    expect(status(a, "A2")).toBe("met with confidence");
    a.fieldAccuracyOnReady.unit = rate(195, 200);
    expect(status(a, "A2")).toBe("not met");
    expect(status(a, "A3")).toBe("met");
    a.outcomes.C2High = rate(1, 300);
    expect(status(a, "A3")).toBe("not met");
    expect(status(a, "A4")).toBe("met");
    a.severe.S6 = rate(1, 300);
    expect(status(a, "A4")).toBe("not met");
    a.outcomes.C3plusC4 = rate(20, 200);
    expect(status(a, "A5")).toBe("met");
    a.outcomes.C3plusC4 = rate(21, 200);
    expect(status(a, "A5")).toBe("not met");
    expect(status(a, "A6")).toBe("scorer checks met; rest checked outside the scorer");
    a.outcomes.CE = rate(1, 300);
    expect(status(a, "A6")).toBe("not met");
    expect(acceptance(a, "holdout2").a6ScorerChecksMet).toBe(false);
    expect(status(a, "A7")).toBe("checked outside the scorer");
    expect(acceptance(a, "holdout2").a1ToA5Met).toBe(false);
    expect(acceptance(withC1(200, 200), "holdout2").a1ToA5Met).toBe(true);
  });
});

describe("pre-registered sensitivity figures (informational, not the acceptance basis)", () => {
  const yogurt = mk("3 (5.3 oz) cups vanilla Greek yogurt", { name: "vanilla Greek yogurt", quantity: "3", unit: "container", packageSize: { quantity: "5 3/10", unit: "oz" } }, { id: "ing-h2-0087" });
  const bareSalt = mk("sea salt", { status: "needs_review", name: "sea salt" }, { categories: ["quantity_missing", "seasoning_ordinary"] });
  const bareFood = mk("vanilla ice cream", { status: "needs_review", name: "vanilla ice cream" }, { categories: ["quantity_missing"] });
  // Tagged size_word as well: the v2 tag heuristic kept it, the plan's label definition leaves it out (SCORE-01).
  const largeEggs = mk("large eggs", { status: "needs_review", name: "eggs", note: "large" }, { categories: ["quantity_missing", "size_word"] });
  const lines = [
    one(flour, read(flour)),
    one(yogurt, read(yogurt, { unit: u("cup", "volume", "cups") })), // the debatable reading: S3, C2 high
    one(bareSalt, read(bareSalt, { status: "ready", amountUnstated: "to_taste", reasons: [] })), // S4 on a bare food
    one(bareFood, read(bareFood, { name: null })), // C5c
    one(largeEggs, read(largeEggs)), // C5a
    one(range, read(range, { status: "unsupported", name: null, quantity: null, unit: null, reasons: ["not_an_ingredient"] })), // C6, kept (an amount)
    one(altsNoAmount, read(altsNoAmount)), // C5a, kept (alternatives)
  ];

  it("lists the debatable cases in a constant and recomputes A1–A5 without them on holdout2 only", () => {
    const s = setReport("holdout2", lines);
    expect(s.sensitivity.note).toBe("informational, not the acceptance basis");
    expect(s.acceptance!.criteria.find((c) => c.id === "A4")!.status).toBe("not met");
    const d = s.sensitivity.excludingDebatable!;
    expect(d.excludedIds).toEqual(["ing-h2-0087"]);
    expect(d.lines).toBe(lines.length - 1);
    expect(d.acceptance.criteria.find((c) => c.id === "A3")!.status).toBe("not met"); // the bare-food S4 line is still there
    expect(d.acceptance.criteria.find((c) => c.id === "A4")!.evidence.S3.num).toBe(0);
    expect(setReport("dev", lines).sensitivity.excludingDebatable).toBeNull();
  });

  it("reports needs_review figures without the labels with no amount (quantity, unit, alternatives all null — SCORE-01), with counts", () => {
    const n = setReport("holdout2", lines).sensitivity.needsReviewExcludingBareNoAmount;
    expect(n.definition).toMatch(/quantity and unit null and alternatives empty/);
    expect(n.excludedIds).toEqual([bareSalt.id, bareFood.id, largeEggs.id]);
    expect([n.excluded, n.needsReview]).toEqual([3, 2]);
    expect([n.C5.num, n.C5.den, n.C5a.num, n.C5c.num, n.C6.num, n.S4.num, n.S4.den]).toEqual([1, 2, 1, 0, 1, 0, 2]);
    const all = setReport("holdout2", lines).aggregate;
    expect([all.outcomes.C5.num, all.outcomes.C5.den, all.outcomes.C5c.num, all.severe.S4.num]).toEqual([3, 5, 1, 1]);
    expect(lines.map((x) => x.bareNoAmount)).toEqual([false, false, true, true, true, false, false]);
  });
});

describe("engine plumbing", () => {
  it("observe parses a line twice; observeAll once per distinct input; replayEngine replays the first parse or its error", () => {
    let calls = 0;
    const base: IngredientEngine = {
      id: "t",
      description: "d",
      parse(line: string) {
        calls++;
        if (line === "boom") throw new Error("bad line");
        return read(flour);
      },
    };
    const o = observe(base, "x");
    expect(calls).toBe(2);
    expect(o.first).toEqual({ ok: true, output: read(flour) });
    expect(observe(base, "boom")).toEqual({ first: { ok: false, error: "Error: bad line" }, second: { ok: false, error: "Error: bad line" } });
    calls = 0;
    const obs = observeAll([flour, { ...flour, id: "ing-h2-9999" }], base);
    expect([obs.size, calls]).toEqual([1, 2]);
    const m = replayEngine(base, new Map([...obs, ["boom", observe(base, "boom")]]));
    calls = 0;
    expect(m.parse(flour.input)).toBe(obs.get(flour.input)!.first.ok ? (obs.get(flour.input)!.first as { output: unknown }).output : null);
    expect(() => m.parse("boom")).toThrow("Error: bad line");
    expect(calls).toBe(0);
    m.parse("unobserved");
    expect(calls).toBe(1);
    expect([m.id, m.description]).toEqual(["t", "d"]);
  });

  it("serializeParse compares canonical JSON (key order does not matter) or the thrown message", () => {
    expect(serializeParse({ ok: true, output: { a: 1, b: 2 } })).toBe(serializeParse({ ok: true, output: { b: 2, a: 1 } }));
    expect(serializeParse({ ok: true, output: { a: 1 } })).not.toBe(serializeParse({ ok: true, output: { a: 2 } }));
    expect(serializeParse({ ok: false, error: "E" })).not.toBe(serializeParse({ ok: false, error: "F" }));
    expect(serializeParse({ ok: true, output: { a: Number.NaN } })).toMatch(/^unserializable /);
  });

  it("classifyLines catches engine errors per line; engineOutcomes reports each set separately", () => {
    const thrower: IngredientEngine = { id: "x", description: "", parse: () => { throw new TypeError("nope"); } };
    expect(classifyLines([flour], thrower)[0]).toMatchObject({ outcome: "CE", engineStatus: "error" });
    const devCase = { ...flour, id: "ing-dev-9001", split: "dev" as const, source: undefined };
    const e = engineOutcomes([flour, devCase], { id: "o", description: "", parse: () => read(flour) });
    expect(Object.keys(e.sets)).toEqual(["dev", "holdout2"]);
    expect(e.sets.dev!.aggregate.lines).toBe(1);
    expect(e.sets.holdout2!.acceptance).not.toBeNull();
  });
});

/**
 * Mutation controls for the outcomes v3 scorer: engines built from the labels (never a parser). The
 * oracle must be all C1+/C5a/C7 with zero severe errors and pass A1–A5 and the scorer's A6 checks; each
 * saboteur must trip exactly the class or code it is designed to trip, on exactly the lines it touches;
 * each CE saboteur (invalid output, engine error, nondeterminism) must give CE with no S code on exactly
 * its lines. Run on every split, with the acceptance checks on holdout-v2 (historical).
 */
import { describe, expect, it } from "vitest";
import { engineFromLabels, outcomeControlEngines } from "../controls";
import { loadIngredientCases } from "../labels";
import { DEBATABLE_CASES, engineOutcomes, isBareNoAmountLabel, type EngineOutcomes, type OutcomeSetReport, type SevereCode } from "../outcomes";
import { normalizeText } from "../compare";
import { SPLITS, parseLabelQuantity, type IngredientCase, type Split } from "../types";
import { FIXTURES } from "./helpers";

const cases = loadIngredientCases(FIXTURES, SPLITS);
const ctl = outcomeControlEngines(cases);
const run = (key: keyof typeof ctl): EngineOutcomes => engineOutcomes(cases, ctl[key]);
const ids = (f: (c: IngredientCase) => boolean, split?: Split) => cases.filter((c) => (split === undefined || c.split === split) && f(c)).map((c) => c.id);
const setIds = (e: EngineOutcomes, pick: (s: OutcomeSetReport) => string[]) => SPLITS.flatMap((s) => (e.sets[s] ? pick(e.sets[s]!) : []));
const severeIds = (e: EngineOutcomes, code: SevereCode) => setIds(e, (s) => s.caseIds[code]);
const statusOf = (e: EngineOutcomes, id: string) => e.sets.holdout2!.acceptance!.criteria.find((c) => c.id === id)!.status;
const ready = (c: IngredientCase) => c.expect.status === "ready";

describe("outcome controls cover every split", () => {
  it("the corpus has dev, holdout-v1 and holdout-v2 lines", () => {
    for (const s of SPLITS) expect(cases.filter((c) => c.split === s).length, s).toBeGreaterThan(100);
  });
});

describe("oracle", () => {
  const o = run("oracle");
  it("every ready label is C1+, every needs_review label C5a, every unsupported label C7; no C2, no severe error", () => {
    for (const s of SPLITS) {
      const set = o.sets[s]!;
      const a = set.aggregate;
      expect(a.outcomes.C1.num, s).toBe(a.ready);
      expect(a.outcomes.C1plus.num, s).toBe(a.ready);
      expect(a.strict.C1plus.num, s).toBe(a.ready);
      expect(a.outcomes.C5a.num, s).toBe(a.needsReview);
      expect(a.outcomes.C7.num, s).toBe(a.unsupported);
      expect(a.outcomes.C2.num + a.outcomes.C3.num + a.outcomes.C4.num + a.outcomes.C6.num + a.outcomes.C8.num + a.outcomes.CE.num, s).toBe(0);
      expect(a.anySevere.num, s).toBe(0);
      expect(set.caseIds.strictDiffers, s).toEqual([]);
      expect(a.fieldAccuracyOnReady.name.strict.num, s).toBe(a.ready);
    }
  });

  it("passes A1–A5 on holdout-v2, A1 and A2 with confidence (≥ 189 ready lines), and the scorer's A6 checks", () => {
    const h = o.sets.holdout2!;
    expect(h.aggregate.ready).toBeGreaterThanOrEqual(189);
    for (const id of ["A1", "A2"]) expect(statusOf(o, id)).toBe("met with confidence");
    for (const id of ["A3", "A4", "A5"]) expect(statusOf(o, id)).toBe("met");
    expect(statusOf(o, "A6")).toBe("scorer checks met; rest checked outside the scorer");
    expect(statusOf(o, "A7")).toBe("checked outside the scorer");
    expect(h.acceptance!.a1ToA5Met).toBe(true);
    expect(h.acceptance!.a6ScorerChecksMet).toBe(true);
    for (const s of SPLITS) expect(o.sets[s]!.aggregate.validity.classified.num, s).toBe(o.sets[s]!.aggregate.lines);
    expect(o.sets.dev!.acceptance).toBeNull();
    expect(o.sets.holdout!.acceptance).toBeNull();
  });

  it("reports holdout-v2 per source kind", () => {
    const k = o.sets.holdout2!.bySourceKind!;
    expect(Object.keys(k).sort()).toEqual(["repo_test_input", "synthetic_pattern"]);
    expect(k.repo_test_input!.lines + k.synthetic_pattern!.lines).toBe(o.sets.holdout2!.aggregate.lines);
  });
});

describe("saboteurs trip their class or code on exactly the lines they touch", () => {
  it("every semantic saboteur returns valid, deterministic readings (CE = 0), so its codes are scored", () => {
    for (const key of Object.keys(ctl).filter((k) => !["invalidReady", "throwOnNeedsReview", "nondeterministicNote"].includes(k))) {
      const e = run(key as keyof typeof ctl);
      expect(setIds(e, (s) => s.caseIds.CE), key).toEqual([]);
    }
  });

  it("drop amount → S2 and C2 high on every ready line with an amount; A1, A2, A3 not met", () => {
    const e = run("dropAmount");
    const want = ids((c) => ready(c) && c.expect.quantity !== null);
    expect(severeIds(e, "S2")).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.C2High)).toEqual(want);
    for (const id of ["A1", "A2", "A3"]) expect(statusOf(e, id)).toBe("not met");
  });

  it("oz ↔ fl_oz → S3 on every line whose unit or package size is oz or fl_oz; A4 not met", () => {
    const e = run("ozSwap");
    const want = ids((c) => [c.expect.unit, c.expect.packageSize?.unit].some((u) => u === "oz" || u === "fl_oz"));
    expect(want.filter((x) => x.startsWith("ing-h2-")).length).toBeGreaterThanOrEqual(10);
    expect(severeIds(e, "S3")).toEqual(want);
    expect(statusOf(e, "A4")).toBe("not met");
  });

  it("ready on needs_review → S4 and C2 high on every needs_review label; A3, A4 not met", () => {
    const e = run("readyOnNeedsReview");
    const want = ids((c) => c.expect.status === "needs_review");
    expect(severeIds(e, "S4")).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.C2High)).toEqual(want);
    for (const id of ["A3", "A4"]) expect(statusOf(e, id)).toBe("not met");
  });

  it("ready on unsupported → S8 and C2 high on every unsupported label; A3 not met (A4 does not list S8)", () => {
    const e = run("readyOnUnsupported");
    const want = ids((c) => c.expect.status === "unsupported");
    expect(severeIds(e, "S8")).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.C2High)).toEqual(want);
    expect(statusOf(e, "A3")).toBe("not met");
    expect(statusOf(e, "A4")).toBe("met");
  });

  it("invent an amount → S1 on every ingredient line without a labelled amount; A4 not met", () => {
    const e = run("inventAmount");
    const want = ids((c) => c.expect.quantity === null && c.expect.status !== "unsupported");
    expect(want.filter((x) => x.startsWith("ing-h2-")).length).toBeGreaterThanOrEqual(30);
    expect(severeIds(e, "S1")).toEqual(want);
    expect(statusOf(e, "A4")).toBe("not met");
  });

  it("first alternative chosen silently → S5 on every choice-of-ingredients line; A4 not met", () => {
    const e = run("firstAlternative");
    const want = ids((c) => c.expect.alternatives.length >= 2);
    expect(want.filter((x) => x.startsWith("ing-h2-")).length).toBeGreaterThanOrEqual(10);
    expect(severeIds(e, "S5")).toEqual(want);
    expect(statusOf(e, "A4")).toBe("not met");
  });

  it("package count folded into the size's unit → S6 on every line with a package size and an exact count; A4 not met", () => {
    const e = run("foldPackage");
    const want = ids((c) => c.expect.packageSize !== null && parseLabelQuantity(c.expect.quantity ?? "")?.kind === "exact");
    expect(want.filter((x) => x.startsWith("ing-h2-")).length).toBeGreaterThanOrEqual(20);
    expect(severeIds(e, "S6")).toEqual(want);
    expect(statusOf(e, "A4")).toBe("not met");
  });

  it("a qualifier word dropped from the name → S7 wherever the shorter name is not an accepted value", () => {
    const e = run("dropQualifier");
    const shorter = (c: IngredientCase) => (c.expect.name ?? "").trim().split(/\s+/u).slice(1).join(" ");
    const want = ids((c) => {
      const words = (c.expect.name ?? "").trim().split(/\s+/u);
      if (!ready(c) || words.length < 2) return false;
      const s = normalizeText(shorter(c));
      return !(c.accept.name ?? []).some((n) => normalizeText(n) === s);
    });
    expect(want.filter((x) => x.startsWith("ing-h2-")).length).toBeGreaterThanOrEqual(50);
    expect(severeIds(e, "S7")).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.C2High)).toEqual(want);
    expect(statusOf(e, "A3")).toBe("not met");
  });

  it("a range collapsed to one end → S2 and S4 on every range line", () => {
    const e = run("collapseRange");
    const want = ids((c) => parseLabelQuantity(c.expect.quantity ?? "")?.kind === "range");
    expect(want.filter((x) => x.startsWith("ing-h2-")).length).toBeGreaterThanOrEqual(10);
    expect(severeIds(e, "S2")).toEqual(want);
    expect(severeIds(e, "S4")).toEqual(want);
  });

  it("all needs_review with useful partials → C3a on every ready label, C5a / C8 elsewhere, no C1, no severe error; A1 and A5 not met", () => {
    const e = run("allNeedsReviewPartials");
    for (const s of SPLITS) {
      const a = e.sets[s]!.aggregate;
      expect(a.outcomes.C3a.num, s).toBe(a.ready);
      expect(a.outcomes.C5a.num, s).toBe(a.needsReview);
      expect(a.outcomes.C8.num, s).toBe(a.unsupported);
      expect(a.outcomes.C1.num + a.outcomes.C2.num + a.anySevere.num, s).toBe(0);
    }
    expect(statusOf(e, "A1")).toBe("not met");
    expect(statusOf(e, "A5")).toBe("not met");
    expect(statusOf(e, "A3")).toBe("met");
    expect(statusOf(e, "A4")).toBe("met");
    expect(statusOf(e, "A2")).toBe("met with confidence"); // the fields are right; only the status is withheld
  });

  it("all abstain → C3c on every ready label, C5c on every needs_review label, C8 on unsupported; no severe error", () => {
    const e = run("allAbstain");
    for (const s of SPLITS) {
      const a = e.sets[s]!.aggregate;
      expect(a.outcomes.C3c.num, s).toBe(a.ready);
      expect(a.outcomes.C5c.num, s).toBe(a.needsReview);
      expect(a.outcomes.C8.num, s).toBe(a.unsupported);
      expect(a.anySevere.num, s).toBe(0);
    }
    expect(statusOf(e, "A2")).toBe("not met");
  });

  it("all unsupported → C4 on every ready label, C6 on needs_review, C7 on unsupported; no severe error", () => {
    const e = run("allUnsupported");
    for (const s of SPLITS) {
      const a = e.sets[s]!.aggregate;
      expect(a.outcomes.C4.num, s).toBe(a.ready);
      expect(a.outcomes.C6.num, s).toBe(a.needsReview);
      expect(a.outcomes.C7.num, s).toBe(a.unsupported);
      expect(a.anySevere.num, s).toBe(0);
    }
    expect(statusOf(e, "A5")).toBe("not met");
  });

  it("sensitivity: a saboteur that only reads the debatable case's 'cups' as volume fails A3/A4, which pass without the debatable cases (informational)", () => {
    const e = engineOutcomes(
      cases,
      engineFromLabels("control:debatable-cup", "ing-h2-0087 read as volume cups", cases, (r, c) =>
        DEBATABLE_CASES.holdout2.includes(c.id) ? { ...r, unit: { canonical: "cup", dimension: "volume", source: "cups" } } : r),
    );
    const h = e.sets.holdout2!;
    expect(h.caseIds.S3).toEqual([...DEBATABLE_CASES.holdout2]);
    expect(statusOf(e, "A3")).toBe("not met");
    expect(statusOf(e, "A4")).toBe("not met");
    const d = h.sensitivity.excludingDebatable!;
    expect(d.excludedIds).toEqual([...DEBATABLE_CASES.holdout2]);
    expect(d.acceptance.criteria.slice(0, 5).map((c) => c.status)).toEqual(["met with confidence", "met with confidence", "met", "met", "met"]);
  });

  it("sensitivity (SCORE-01): needs_review figures leave out exactly the needs_review labels with quantity, unit and alternatives all null", () => {
    const e = run("readyOnNeedsReview");
    const bare = (c: IngredientCase) => c.expect.status === "needs_review" && c.expect.quantity === null && c.expect.unit === null && c.expect.alternatives.length === 0;
    for (const s of SPLITS) {
      const n = e.sets[s]!.sensitivity.needsReviewExcludingBareNoAmount;
      expect(n.excludedIds, s).toEqual(ids(bare, s));
      expect(n.excludedIds, s).toEqual(ids(isBareNoAmountLabel, s));
      expect(n.needsReview + n.excluded, s).toBe(e.sets[s]!.aggregate.needsReview);
      expect(n.S4.num, s).toBe(n.needsReview);
      expect(n.C5.num, s).toBe(0);
    }
    expect(e.sets.holdout2!.sensitivity.needsReviewExcludingBareNoAmount.excluded).toBe(29);
    const o = run("oracle").sets.holdout2!.sensitivity.needsReviewExcludingBareNoAmount;
    expect(o.C5a.num).toBe(o.needsReview);
  });

  it("CE: an invalid output (ready, no amount, no amountUnstated) is CE with no S code on exactly those lines; A6 not met", () => {
    const e = run("invalidReady");
    const want = ids((c) => ready(c) && c.expect.quantity !== null);
    expect(setIds(e, (s) => s.caseIds.CE)).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.CEInvalidOutput)).toEqual(want);
    expect(setIds(e, (s) => [...s.caseIds.CEEngineError, ...s.caseIds.CENondeterministic])).toEqual([]);
    for (const code of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const) expect(severeIds(e, code), code).toEqual([]);
    expect(setIds(e, (s) => s.caseIds.C2High)).toEqual([]);
    expect(statusOf(e, "A6")).toBe("not met");
    expect(e.sets.holdout2!.acceptance!.a6ScorerChecksMet).toBe(false);
    expect(e.sets.holdout2!.ceLines[0].problems).toContain("ingredient.amountUnstated: a ready line without a quantity must say why (amountUnstated)");
    for (const s of SPLITS) expect(e.sets[s]!.aggregate.outcomes.CE.den, s).toBe(e.sets[s]!.aggregate.lines); // CE stays in N
    for (const s of SPLITS) expect(e.sets[s]!.aggregate.outcomes.C1.den, s).toBe(e.sets[s]!.aggregate.ready); // and in R
  });

  it("CE: an engine error is CE (engine error dimension) on exactly the lines that throw; A6 not met", () => {
    const e = run("throwOnNeedsReview");
    const want = ids((c) => c.expect.status === "needs_review");
    expect(setIds(e, (s) => s.caseIds.CE)).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.CEEngineError)).toEqual(want);
    expect(setIds(e, (s) => [...s.caseIds.CEInvalidOutput, ...s.caseIds.CENondeterministic])).toEqual([]);
    expect(e.sets.holdout2!.ceLines[0].engineError).toMatch(/^Error: refused ing-h2-/);
    expect(statusOf(e, "A6")).toBe("not met");
  });

  it("CE: a nondeterministic engine (the second parse differs) is CE (nondeterministic dimension) on exactly those lines; A6 not met", () => {
    const e = run("nondeterministicNote");
    const want = ids(ready);
    expect(setIds(e, (s) => s.caseIds.CE)).toEqual(want);
    expect(setIds(e, (s) => s.caseIds.CENondeterministic)).toEqual(want);
    expect(setIds(e, (s) => [...s.caseIds.CEInvalidOutput, ...s.caseIds.CEEngineError])).toEqual([]);
    expect(setIds(e, (s) => s.caseIds.C1)).toEqual([]);
    expect(statusOf(e, "A6")).toBe("not met");
    expect(statusOf(e, "A1")).toBe("not met");
  });

  it("every saboteur is distinguishable from the oracle on holdout-v2", () => {
    const oracle = JSON.stringify(run("oracle").sets.holdout2!.caseIds);
    for (const key of Object.keys(ctl).filter((k) => k !== "oracle")) expect(JSON.stringify(run(key as keyof typeof ctl).sets.holdout2!.caseIds), key).not.toBe(oracle);
  });
});

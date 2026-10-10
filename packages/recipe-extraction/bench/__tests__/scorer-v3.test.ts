/**
 * Outcomes v3 (EVALUATION-PLAN-v3) against the archived outcomes v2: the two scorer faults found by the
 * final-head review are reproduced on v2 and shown repaired on v3 —
 *   SCORE-01 (SF-5): sensitivity 3(b) selected needs_review lines by category tag (23 on holdout-v2), not by
 *     the plan's label definition (quantity, unit and alternatives all null: 29);
 *   SCORE-02 (SF-6, N-2): a CE line with a status outside the contract still got S codes, validity was
 *     judged by the status string only (the validator never ran), and nondeterminism was never checked.
 * Plus the scorer identity in the report, the `--scorer` / `--engines` options and the byte-for-byte
 * reproduction of the historical report with the archived scorer.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { classifyLine as classifyLineV2, engineOutcomes as engineOutcomesV2, isBareFoodNeedsReview, type IngredientCaseV2 } from "../archive/outcomes-v2";
import { PACKAGE_ROOT, defaultDeps, parseArgs, run, UsageError, type RunDeps } from "../cli";
import { labelToReading, outcomeControlEngines } from "../controls";
import { loadIngredientCases } from "../labels";
import { classifyLine, classifyObservation, engineOutcomes, isBareNoAmountLabel, SCORER_DEPENDENCIES, type OutcomesSection } from "../outcomes";
import { FIXTURES, HISTORICAL_ENGINES, HISTORICAL_REPORT_SHA256 } from "./helpers";

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const h2 = loadIngredientCases(FIXTURES, ["holdout2"]);
const byId = (id: string) => h2.find((c) => c.id === id)!;
const v2 = (c: (typeof h2)[number]) => c as unknown as IngredientCaseV2;

/** The 29 holdout-v2 needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)). */
const BARE_NO_AMOUNT_H2 = [
  "ing-h2-0158", "ing-h2-0186", "ing-h2-0205", "ing-h2-0206", "ing-h2-0207", "ing-h2-0208", "ing-h2-0209", "ing-h2-0210",
  "ing-h2-0211", "ing-h2-0323", "ing-h2-0325", "ing-h2-0327", "ing-h2-0328", "ing-h2-0343", "ing-h2-0344", "ing-h2-0345",
  "ing-h2-0346", "ing-h2-0347", "ing-h2-0348", "ing-h2-0350", "ing-h2-0351", "ing-h2-0352", "ing-h2-0353", "ing-h2-0354",
  "ing-h2-0355", "ing-h2-0356", "ing-h2-0357", "ing-h2-0358", "ing-h2-0359",
];
/** The six the v2 tag heuristic missed (final-head review SF-5; plan change log 10(a)). */
const MISSED_BY_TAGS = ["ing-h2-0158", "ing-h2-0186", "ing-h2-0207", "ing-h2-0208", "ing-h2-0209", "ing-h2-0350"];

describe("SCORE-01: sensitivity 3(b) — needs_review labels with no amount", () => {
  it("reproduction on the frozen holdout-v2: the v2 tag heuristic selects 23 of the 69 needs_review labels, missing six", () => {
    const nr = h2.filter((c) => c.expect.status === "needs_review");
    expect(nr.length).toBe(69);
    const byTags = nr.filter((c) => isBareFoodNeedsReview(classifyLineV2(v2(c), null, "probe"))).map((c) => c.id);
    expect(byTags.length).toBe(23);
    expect(BARE_NO_AMOUNT_H2.filter((id) => !byTags.includes(id))).toEqual(MISSED_BY_TAGS);
    expect(byTags.filter((id) => !BARE_NO_AMOUNT_H2.includes(id))).toEqual([]);
    // What the six are: no amount, but a tag outside quantity_missing / seasoning (price, optional, prep, unicode, size).
    for (const id of MISSED_BY_TAGS) {
      const c = byId(id);
      expect([c.expect.quantity, c.expect.unit, c.expect.alternatives], id).toEqual([null, null, []]);
      expect(c.categories.some((t) => !["quantity_missing", "seasoning_ordinary", "seasoning_lookalike"].includes(t)), id).toBe(true);
    }
  });

  it("reproduction through the archived v2 report section: 23 excluded, 46 kept", () => {
    const oracle = outcomeControlEngines(h2).oracle;
    const s = engineOutcomesV2(h2 as unknown as IngredientCaseV2[], oracle).sets.holdout2!.sensitivity.needsReviewExcludingBareFoods;
    expect([s.excluded, s.needsReview]).toEqual([23, 46]);
  });

  it("repair: v3 selects exactly the 29 label-defined lines (listed), by label alone, and reports 29 excluded / 40 kept", () => {
    expect(h2.filter(isBareNoAmountLabel).map((c) => c.id)).toEqual(BARE_NO_AMOUNT_H2);
    const s = engineOutcomes(h2, outcomeControlEngines(h2).oracle).sets.holdout2!.sensitivity.needsReviewExcludingBareNoAmount;
    expect(s.excludedIds).toEqual(BARE_NO_AMOUNT_H2);
    expect([s.excluded, s.needsReview]).toEqual([29, 40]);
    expect(s.definition).toBe("needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01)");
  });

  it("repair: the definition does not depend on tags — retagging a label changes nothing, giving it a unit does", () => {
    const c = byId("ing-h2-0209");
    expect(isBareNoAmountLabel({ ...c, categories: ["size_word"] })).toBe(true);
    expect(isBareNoAmountLabel({ ...c, expect: { ...c.expect, unit: "each" } })).toBe(false);
    expect(isBareNoAmountLabel({ ...c, expect: { ...c.expect, alternatives: ["eggs", "egg whites"], name: null } })).toBe(false);
    expect(isBareNoAmountLabel({ ...c, expect: { ...c.expect, status: "ready", amountUnstated: "as_needed" } })).toBe(false);
  });
});

describe("SCORE-02: CE from validity, engine error and nondeterminism; no S code on CE", () => {
  const salt = byId("ing-h2-0158"); // "salt ($0.01)": needs_review, no amount
  const garlicRange = h2.find((c) => c.expect.quantity?.includes("..") && c.expect.status === "needs_review" && c.expect.alternatives.length === 0)!;
  const readyWithAmount = h2.find((c) => c.expect.status === "ready" && c.expect.quantity !== null && c.expect.packageSize === null)!;
  const q1 = { kind: "exact" as const, numerator: "1", denominator: "1", display: "1" };

  it("reproduction (SF-6): v2 gives a CE line with a status outside the contract an S code; v3 gives none", () => {
    const bogus = { ...labelToReading(salt), status: "bogus", quantity: q1 };
    expect(classifyLineV2(v2(salt), bogus)).toMatchObject({ outcome: "CE", engineStatus: "invalid", severe: ["S1"] });
    expect(classifyLine(salt, bogus)).toMatchObject({ outcome: "CE", engineStatus: "invalid", severe: [] });
  });

  it("reproduction (N-2): v2 judges validity by the status string, so an invalid output with a contract status is scored; v3 runs the validator", () => {
    const rangeReady: ParsedIngredientV1 = { ...labelToReading(garlicRange), status: "ready", reasons: [] };
    expect(classifyLineV2(v2(garlicRange), rangeReady)).toMatchObject({ outcome: "C2", falseCertainty: "high", severe: ["S4"] });
    const v3 = classifyLine(garlicRange, rangeReady);
    expect(v3).toMatchObject({ outcome: "CE", severe: [], falseCertainty: null });
    expect(v3.validity.problems).toContain("ingredient.quantity: a ready line cannot have a range");

    const noAmountReady: ParsedIngredientV1 = { ...labelToReading(readyWithAmount), quantity: null };
    expect(classifyLineV2(v2(readyWithAmount), noAmountReady)).toMatchObject({ outcome: "C2", severe: ["S2"] });
    expect(classifyLine(readyWithAmount, noAmountReady)).toMatchObject({ outcome: "CE", severe: [], validity: { problems: ["ingredient.amountUnstated: a ready line without a quantity must say why (amountUnstated)"] } });

    const extraKey = { ...labelToReading(readyWithAmount), confidence: 0.9 };
    expect(classifyLineV2(v2(readyWithAmount), extraKey)).toMatchObject({ outcome: "C1", fullyCorrect: true });
    expect(classifyLine(readyWithAmount, extraKey)).toMatchObject({ outcome: "CE", fullyCorrect: false, validity: { problems: ['ingredient: unknown key "confidence"'] } });
  });

  it("reproduction: v2 never parses a line twice, so a nondeterministic engine is scored; v3 makes it CE", () => {
    let k = 0;
    const flaky = { id: "flaky", description: "", parse: (line: string) => ({ ...labelToReading(h2.find((c) => c.input === line)!), note: k++ % 2 === 0 ? null : "second" }) };
    const one = [readyWithAmount];
    expect(engineOutcomesV2(one as unknown as IngredientCaseV2[], flaky).sets.holdout2!.aggregate.outcomes.CE.num).toBe(0);
    const e = engineOutcomes(one, flaky).sets.holdout2!;
    expect(e.caseIds.CENondeterministic).toEqual([readyWithAmount.id]);
    expect(e.aggregate.outcomes.CE.num).toBe(1);
  });

  it("repair: A6 is computed from the dimensions — v2 recorded it outside the scorer even with an invalid output; v3 says not met", () => {
    const bad = { id: "bad", description: "", parse: (line: string) => ({ ...labelToReading(h2.find((c) => c.input === line)!), quantity: null }) };
    const one = [readyWithAmount];
    const a6v2 = engineOutcomesV2(one as unknown as IngredientCaseV2[], bad).sets.holdout2!.acceptance!.criteria.find((c) => c.id === "A6")!;
    expect(a6v2.status).toBe("checked outside the scorer");
    const acc = engineOutcomes(one, bad).sets.holdout2!.acceptance!;
    expect(acc.criteria.find((c) => c.id === "A6")!).toMatchObject({ status: "not met", evidence: { CE: { num: 1, den: 1 }, invalidOutput: { num: 1, den: 1 }, engineError: { num: 0 }, nondeterministic: { num: 0 } } });
    expect(acc.a6ScorerChecksMet).toBe(false);
  });

  it("the four dimensions are recorded separately on a line that fails two of them", () => {
    const o = classifyObservation(readyWithAmount, { first: { ok: true, output: { ...labelToReading(readyWithAmount), quantity: null } }, second: { ok: false, error: "Error: second" } });
    expect(o.validity).toEqual({ engineError: "Error: second", problems: ["ingredient.amountUnstated: a ready line without a quantity must say why (amountUnstated)"], nondeterministic: true });
    expect(o).toMatchObject({ outcome: "CE", severe: [], partial: null, falseCertainty: null, fullyCorrect: false, strict: { outcome: "CE", fullyCorrect: false } });
  });
});

describe("scorer identity, --scorer and --engines", () => {
  const realDeps = (): { d: RunDeps; out: string[] } => {
    const out: string[] = [];
    return { d: { ...defaultDeps(), stdout: (t) => out.push(t), stderr: (t) => out.push(t), writeFile: () => {}, now: () => 0 }, out };
  };

  it("parses --scorer and --engines; refuses unknown scorers and --engine together with --engines", () => {
    expect(parseArgs([]).scorer).toBeUndefined();
    expect(parseArgs(["--scorer", "outcomes-v2"]).scorer).toBe("outcomes-v2");
    expect(parseArgs(["--engines", "a, b,,c"]).onlyEngines).toEqual(["a", "b", "c"]);
    expect(() => parseArgs(["--scorer", "outcomes-v1"])).toThrow(/--scorer must be outcomes-v3 or outcomes-v2/);
    expect(() => parseArgs(["--engines", ","])).toThrow(UsageError);
    expect(() => parseArgs(["--engine", "a", "--engines", "b"])).toThrow(/cannot be combined/);
  });

  it("--engines rejects an unknown id (exit 1)", async () => {
    const { d, out } = realDeps();
    expect((await run(parseArgs(["--engines", "no-such-engine", "--split", "dev"]), d)).code).toBe(1);
    expect(out.join("\n")).toMatch(/unknown engine id\(s\): no-such-engine/);
  });

  it("a v3 report names the scorer, its plan and the SHA-256 of bench/outcomes.ts and its dependencies", async () => {
    const r = (await run(parseArgs(["--engines", "legacy-table-import-2", "--split", "dev"]), realDeps().d)).report!;
    const o = r.outcomes as OutcomesSection;
    expect(o.scorer).toEqual({
      id: "outcomes",
      version: "v3",
      plan: "EVALUATION-PLAN-v3",
      source: "bench/outcomes.ts",
      sha256: sha256(readFileSync(path.join(PACKAGE_ROOT, "bench/outcomes.ts"))),
      dependencies: Object.fromEntries(SCORER_DEPENDENCIES.map((f) => [f, sha256(readFileSync(path.join(PACKAGE_ROOT, f)))])),
    });
    expect(o.plan).toBe("EVALUATION-PLAN-v3");
  });

  it("--scorer outcomes-v2 --engines <historical ids> --split every --pages reproduces the historical report byte-for-byte (SHA-256 afc55fd5…)", async () => {
    const res = await run(parseArgs(["--scorer", "outcomes-v2", "--engines", HISTORICAL_ENGINES.join(","), "--split", "every", "--pages"]), realDeps().d);
    expect(res.code).toBe(0);
    expect(sha256(res.json!)).toBe(HISTORICAL_REPORT_SHA256);
    expect(res.markdown).toContain("## Outcomes (EVALUATION-PLAN-v2)");
    expect(res.markdown).toContain("#### holdout-v2 (fresh)");
  });

  it("v3 reports on the historical engines are byte-identical across reruns", async () => {
    const argv = ["--engines", HISTORICAL_ENGINES.join(","), "--split", "every", "--pages"];
    const a = await run(parseArgs(argv), realDeps().d);
    const b = await run(parseArgs(argv), realDeps().d);
    expect(a.code).toBe(0);
    expect(a.json).toBe(b.json);
    expect(sha256(a.json!)).not.toBe(HISTORICAL_REPORT_SHA256);
  });
});

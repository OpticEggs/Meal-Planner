/**
 * Holdout-v3 support (EVALUATION-PLAN-v3), opt-in: split `holdout3`, file
 * `fixtures/ingredients/holdout-v3.jsonl`, frozen by `fixtures/FREEZE-v3.json`, with the optional
 * `fixtures/EXPOSURE-AUDIT-v3.json`. Both states are tested on temporary copies of the fixtures from which
 * those three files (and their manifest entries) are removed — "absent" (everything behaves as before) and
 * "present" with a five-line synthetic plumbing file that is NOT holdout-v3 content. The real holdout-v3
 * files are never read here. Only label-built control engines are used.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs, run, splitsFor, UsageError, type RunDeps } from "../cli";
import { engineFromLabels, outcomeControlEngines } from "../controls";
import { EXPOSURE_AUDIT_FILE } from "../exposure-audit";
import { FREEZE_V3_FILE, FREEZE_V3_RULE, HOLDOUT3_INGREDIENTS, computeFreezeV3, freezeV2Status, freezeV3Status, verifyFreezeV3 } from "../freeze";
import { checkInvariants } from "../invariants";
import { LabelValidationError, loadIngredientCases, parseIngredientJsonl } from "../labels";
import type { OutcomesSection } from "../outcomes";
import { renderMarkdown } from "../report";
import { EVERY_SPLITS, type IngredientCase, type IngredientExpect } from "../types";
import { copyFixtures, FIXTURES } from "./helpers";
import type { IngredientEngine } from "../../src/contract";

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

const MANIFEST = "MANIFEST.json";
const readJson = (dir: string, rel: string) => JSON.parse(readFileSync(path.join(dir, rel), "utf8"));
const writeJson = (dir: string, rel: string, v: unknown) => writeFileSync(path.join(dir, rel), JSON.stringify(v, null, 2) + "\n");

/** A temporary fixtures copy with no holdout-v3 file, no FREEZE-v3.json and no EXPOSURE-AUDIT-v3.json (and no manifest entries for them). */
function absentCopy(): string {
  const c = copyFixtures();
  cleanup = c.cleanup;
  const h3Files = [HOLDOUT3_INGREDIENTS, FREEZE_V3_FILE, EXPOSURE_AUDIT_FILE];
  for (const f of h3Files) rmSync(path.join(c.dir, f), { force: true });
  const m = readJson(c.dir, MANIFEST);
  m.files = m.files.filter((f: { path: string }) => !h3Files.includes(f.path));
  writeJson(c.dir, MANIFEST, m);
  return c.dir;
}

const EXPECT_DEFAULTS: IngredientExpect = {
  status: "ready", name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null,
};
interface H3Meta {
  family: string;
  contract12: string[];
  reliesOnNewReading: boolean;
  debatable: boolean;
}
const PLAIN: H3Meta = { family: "plain", contract12: [], reliesOnNewReading: false, debatable: false };
function h3(n: number, input: string, expect: Partial<IngredientExpect>, categories: string[], meta: Partial<H3Meta> = {}): Record<string, unknown> {
  return {
    ...PLAIN,
    ...meta,
    id: `ing-h3-${String(n).padStart(4, "0")}`,
    split: "holdout3",
    categories,
    input,
    expect: { ...EXPECT_DEFAULTS, ...expect },
    accept: {},
    severity: "high",
    seasoningClass: null,
    provenance: { kind: "synthetic_pattern", source: "temporary plumbing fixture written by holdout3.test.ts (not holdout-v3 content)" },
    source: { kind: "synthetic_pattern", author: "holdout3.test.ts" },
    construction: `plumbing test ${n}`,
    rationale: "Temporary plumbing test case; exists only in a temporary directory.",
  };
}
/** Six synthetic plumbing lines (ready ×3, needs_review ×2, unsupported ×1) with holdout-v3 metadata. */
const H3_CASES = [
  h3(1, "2 cups plumbing-test flour", { name: "plumbing-test flour", quantity: "2", unit: "cup" }, ["integer_decimal"]),
  h3(2, "1 (15 oz) can plumbing-test beans", { name: "plumbing-test beans", quantity: "1", unit: "can", packageSize: { quantity: "15", unit: "oz" } }, ["package_size", "count_unit"], { family: "C", contract12: ["12.3"] }),
  h3(3, "plumbing-test parsley", { status: "needs_review", name: "plumbing-test parsley" }, ["quantity_missing"], { debatable: true }),
  h3(4, "1 cup plumbing-test milk or plumbing-test cream", { status: "needs_review", quantity: "1", unit: "cup", alternatives: ["plumbing-test milk", "plumbing-test cream"] }, ["ingredient_alternatives"], { family: "B", contract12: ["12.7"] }),
  h3(5, "For the plumbing test:", { status: "unsupported" }, ["heading_non_ingredient"], { family: "D", contract12: ["12.8"] }),
  h3(6, "a half-cup plumbing-test milk", { name: "plumbing-test milk", quantity: "1/2", unit: "cup" }, ["fraction", "number_word"], { family: "A", contract12: ["12.1"], reliesOnNewReading: true }),
];
const jsonl = (xs: unknown[]) => xs.map((x) => JSON.stringify(x)).join("\n") + "\n";

/** A temporary fixtures copy with the synthetic holdout-v3 file listed in the manifest (no freeze record). */
function presentCopy(): string {
  const dir = absentCopy();
  writeFileSync(path.join(dir, HOLDOUT3_INGREDIENTS), jsonl(H3_CASES));
  const m = readJson(dir, MANIFEST);
  const v2 = m.files.find((f: { path: string }) => f.path === "ingredients/holdout-v2.jsonl");
  m.files.push({ ...v2, path: HOLDOUT3_INGREDIENTS, split: "holdout3", provenance: "temporary plumbing fixture (test)" });
  writeJson(dir, MANIFEST, m);
  return dir;
}

function freezeV3(dir: string, date = "2026-10-11") {
  const rec = computeFreezeV3(dir, date);
  writeJson(dir, FREEZE_V3_FILE, rec);
  const m = readJson(dir, MANIFEST);
  m.files.push({ path: FREEZE_V3_FILE, kind: "freeze_record", provenance: "test", rights: m.files[0].rights, created: date, author: "test", reviewer: "test" });
  writeJson(dir, MANIFEST, m);
  return rec;
}

/** Run deps over `dir` with label-built control engines; counts parses of holdout-v3 inputs. */
function deps(dir: string, cases: IngredientCase[], extra: IngredientEngine[] = []) {
  const out: string[] = [];
  const err: string[] = [];
  const ctl = outcomeControlEngines(cases);
  const h3Inputs = new Set(H3_CASES.map((c) => c.input as string));
  const counter = { h3Parses: 0 };
  const d: RunDeps = {
    fixturesDir: dir,
    ingredientEngines: (ids) =>
      [ctl.oracle, ctl.ozSwap, ...extra]
        .filter((e) => ids.length === 0 || ids.includes(e.id))
        .map((e) => ({ ...e, parse: (line: string) => (h3Inputs.has(line) && counter.h3Parses++, e.parse(line)) })),
    pageExtractor: () => {
      throw new Error("no pages in these tests");
    },
    stdout: (t) => out.push(t),
    stderr: (t) => err.push(t),
    writeFile: () => {},
    now: () => 0,
  };
  return { d, out, err, counter };
}

describe("holdout-v3 absent: everything behaves as before", () => {
  it("invariants hold, nothing to verify, the status says not frozen; loading holdout3 is a clear error", () => {
    const dir = absentCopy();
    expect(checkInvariants(dir)).toEqual({ ok: true, problems: [] });
    expect(verifyFreezeV3(dir)).toEqual([]);
    expect(freezeV3Status(dir)).toEqual({ frozen: false, frozenAt: null, sha256: null });
    expect(() => loadIngredientCases(dir, ["holdout3"])).toThrow(LabelValidationError);
    expect(() => loadIngredientCases(dir, ["holdout3"])).toThrow(/ingredients\/holdout-v3\.jsonl does not exist \(split holdout3: holdout-v3 has not been written yet\)/);
  });

  it("the selections keep their meanings: all = dev + holdout-v1, every = + holdout-v2, holdout3 only by itself", () => {
    expect(splitsFor("all")).toEqual(["dev", "holdout"]);
    expect(splitsFor("every")).toEqual(["dev", "holdout", "holdout2"]);
    expect(splitsFor("holdout3")).toEqual(["holdout3"]);
    expect(parseArgs(["--split", "holdout3"]).split).toBe("holdout3");
  });

  it("default, all and every runs report exactly the sets they reported before (no holdout-v3 key anywhere)", async () => {
    const dir = absentCopy();
    const cases = loadIngredientCases(dir, EVERY_SPLITS);
    for (const [argv, sets] of [[[], ["dev", "holdout"]], [["--split", "all"], ["dev", "holdout"]], [["--split", "every"], ["dev", "holdout", "holdout2"]]] as const) {
      const r = await run(parseArgs([...argv, "--engine", "control:oracle"]), deps(dir, cases).d);
      expect(r.code).toBe(0);
      expect(Object.keys(r.report!.corpus.ingredientCases)).toEqual(sets);
      expect(Object.keys(r.report!.outcomes!.engines[0].sets)).toEqual(sets);
      expect(Object.keys((r.report!.outcomes as OutcomesSection).freezes)).toEqual(sets.includes("holdout2" as never) ? ["holdout2"] : []);
      // No holdout-v3 data: no holdout3 key, no ing-h3- id, no holdout-v3 corpus file (the scorer's readings text may name holdout-v3).
      expect(r.json).not.toContain('"holdout3"');
      expect(r.json).not.toContain("ing-h3-");
      expect(r.json).not.toContain("fixtures/ingredients/holdout-v3.jsonl");
    }
  });

  it("--split holdout3 and --print-freeze-v3 refuse with exit 1 and say holdout-v3 does not exist", async () => {
    const dir = absentCopy();
    const a = deps(dir, loadIngredientCases(dir, EVERY_SPLITS));
    expect((await run(parseArgs(["--split", "holdout3"]), a.d)).code).toBe(1);
    expect(a.err.join("\n")).toMatch(/holdout-v3\.jsonl does not exist/);
    const b = deps(dir, []);
    expect((await run(parseArgs(["--print-freeze-v3", "2026-10-11"]), b.d)).code).toBe(1);
    expect(b.err.join("\n")).toMatch(/holdout-v3 cannot be read/);
  });
});

describe("holdout-v3 present (temporary synthetic file)", () => {
  it("cases need source and construction and an ing-h3- id, as holdout2", () => {
    const base = H3_CASES[0];
    const errs = (o: Record<string, unknown>) => {
      try {
        parseIngredientJsonl(JSON.stringify(o) + "\n", "holdout3", "t.jsonl");
        return "";
      } catch (e) {
        return (e as LabelValidationError).errors.join("\n");
      }
    };
    expect(errs(base)).toBe("");
    const { source: _s, ...noSource } = base;
    expect(errs(noSource)).toMatch(/missing field 'source' \(required for holdout3\)/);
    const { construction: _c, ...noConstruction } = base;
    expect(errs(noConstruction)).toMatch(/missing field 'construction' \(required for holdout3\)/);
    expect(errs({ ...base, id: "ing-h2-0001" })).toMatch(/id must match ing-h3-NNNN/);
    expect(errs({ ...base, split: "holdout2" })).toMatch(/split 'holdout2' does not match the file \(holdout3\)/);
  });

  it("it loads alone or with every other split (ids and inputs unique across files); invariants hold before a freeze", () => {
    const dir = presentCopy();
    expect(loadIngredientCases(dir, ["holdout3"]).map((c) => c.id)).toEqual(H3_CASES.map((c) => c.id));
    expect(loadIngredientCases(dir, [...EVERY_SPLITS, "holdout3"]).length).toBe(loadIngredientCases(dir, EVERY_SPLITS).length + H3_CASES.length);
    expect(checkInvariants(dir)).toEqual({ ok: true, problems: [] });
    expect(freezeV3Status(dir)).toEqual({ frozen: false, frozenAt: null, sha256: null });
  });

  it("it is opt-in: default, all and every never parse a holdout-v3 input or report it", async () => {
    const dir = presentCopy();
    const cases = loadIngredientCases(dir, [...EVERY_SPLITS, "holdout3"]);
    const x = deps(dir, cases);
    for (const argv of [[], ["--split", "all"], ["--split", "every"]]) {
      const r = await run(parseArgs([...argv, "--engine", "control:oracle"]), x.d);
      expect(r.code).toBe(0);
      expect(Object.keys(r.report!.corpus.ingredientCases)).not.toContain("holdout3");
      expect(r.json).not.toContain("ing-h3-");
      expect(r.json).not.toContain("fixtures/ingredients/holdout-v3.jsonl");
    }
    expect(x.counter.h3Parses).toBe(0);
  });

  it("--split holdout3 scores holdout-v3 only, with A1–A7 as the Gate G2 acceptance set; unfrozen, the report says so", async () => {
    const dir = presentCopy();
    const x = deps(dir, loadIngredientCases(dir, ["holdout3"]));
    const res = await run(parseArgs(["--split", "holdout3", "--engine", "control:oracle"]), x.d);
    expect(res.code).toBe(0);
    const r = res.report!;
    expect(r.corpus.ingredientCases).toEqual({ holdout3: 6 });
    expect(r.corpus.files.map((f) => f.path)).toEqual(["fixtures/ingredients/holdout-v3.jsonl"]);
    const o = r.outcomes as OutcomesSection;
    expect(o.freezes).toEqual({ holdout3: { frozen: false, frozenAt: null, sha256: null } });
    const s = o.engines[0].sets.holdout3!;
    expect(Object.keys(o.engines[0].sets)).toEqual(["holdout3"]);
    expect(s.status).toBe("holdout-v3 (fresh; acceptance set)");
    expect(s.acceptance!.set).toBe("holdout3");
    expect(s.acceptance!.basis).toMatch(/^Gate G2 acceptance set \(EVALUATION-PLAN-v3\)/);
    expect(s.acceptance!.criteria.map((c) => c.id)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6", "A7"]);
    expect(s.acceptance!.a6ScorerChecksMet).toBe(true);
    expect(s.bySourceKind).toEqual({ synthetic_pattern: s.aggregate });
    expect(s.sensitivity.excludingDebatable!.excludedIds).toEqual(["ing-h3-0003"]); // debatable: true, read from the file
    expect(s.sensitivity.excludingNewReadings!.excludedIds).toEqual(["ing-h3-0006"]);
    expect(s.sensitivity.excludingExposureAudit).toBeNull(); // no EXPOSURE-AUDIT-v3.json
    expect(s.sensitivity.needsReviewExcludingBareNoAmount.excludedIds).toEqual(["ing-h3-0003"]);
    expect(x.counter.h3Parses).toBe(12); // six lines, each parsed twice
    const md = renderMarkdown(r);
    expect(md).toContain("Holdout-v3 freeze: **NOT FROZEN** (no FREEZE-v3.json)");
    expect(md).toContain("##### Acceptance — Gate G2 on holdout-v3 (fresh; acceptance set), engine `control:oracle`");
    const sab = await run(parseArgs(["--split", "holdout3", "--engine", "control:oz-swap"]), x.d);
    expect((sab.report!.outcomes as OutcomesSection).engines[0].sets.holdout3!.acceptance!.criteria.find((c) => c.id === "A4")!.status).toBe("not met");
  });

  it("once FREEZE-v3.json exists it is verified on every run: edits, a missing file and a changed rule are caught and the run refuses", async () => {
    const dir = presentCopy();
    const rec = freezeV3(dir);
    expect(rec.rule).toBe(FREEZE_V3_RULE);
    expect(FREEZE_V3_RULE).toMatch(/written blind from CONTRACT-v1 §7 and §12 by the evaluation worker/);
    expect(rec.ingredients).toMatchObject({ file: HOLDOUT3_INGREDIENTS, cases: 6, byStatus: { needs_review: 2, ready: 3, unsupported: 1 }, bySourceKind: { synthetic_pattern: 6 } });
    expect(checkInvariants(dir)).toEqual({ ok: true, problems: [] });
    expect(freezeV3Status(dir)).toEqual({ frozen: true, frozenAt: "2026-10-11", sha256: rec.ingredients.sha256 });
    const x = deps(dir, loadIngredientCases(dir, ["holdout3"]));
    const ok = await run(parseArgs(["--split", "holdout3", "--engine", "control:oracle"]), x.d);
    expect((ok.report!.outcomes as OutcomesSection).freezes.holdout3).toEqual(freezeV3Status(dir));
    expect(renderMarkdown(ok.report!)).toContain("— verified against holdout-v3.jsonl before this run.");

    const file = path.join(dir, HOLDOUT3_INGREDIENTS);
    const text = readFileSync(file, "utf8");
    writeFileSync(file, text.replace('"name":"plumbing-test flour"', '"name":"flour"'));
    expect(verifyFreezeV3(dir)).toEqual(["ingredients/holdout-v3.jsonl: SHA-256 differs from FREEZE-v3.json"]);
    expect(checkInvariants(dir).problems).toContain("ingredients/holdout-v3.jsonl: SHA-256 differs from FREEZE-v3.json");
    const refused = deps(dir, []);
    expect((await run(parseArgs(["--split", "holdout3"]), refused.d)).code).toBe(1);
    expect(refused.err.join("\n")).toMatch(/Fixture invariants failed/);
    expect((await run(parseArgs([]), refused.d)).code).toBe(1); // every run verifies it, not only holdout3 runs
    rmSync(file);
    expect(verifyFreezeV3(dir)).toEqual(["ingredients/holdout-v3.jsonl: recorded in FREEZE-v3.json but missing"]);
    writeFileSync(file, text);
    writeJson(dir, FREEZE_V3_FILE, { ...rec, rule: "anything goes" });
    expect(verifyFreezeV3(dir).join("\n")).toMatch(/FREEZE-v3\.json: rule text differs from bench\/freeze\.ts FREEZE_V3_RULE/);
    writeFileSync(path.join(dir, FREEZE_V3_FILE), "{not json");
    expect(verifyFreezeV3(dir)[0]).toMatch(/FREEZE-v3\.json: cannot be read/);
  });

  it("holdout-v2's freeze is untouched by holdout-v3 support; --print-freeze-v3 prints the record computed from the file", async () => {
    const dir = presentCopy();
    expect(freezeV2Status(dir).frozen).toBe(true);
    const x = deps(dir, []);
    expect((await run(parseArgs(["--print-freeze-v3", "2026-10-11"]), x.d)).code).toBe(0);
    expect(JSON.parse(x.out.join("\n"))).toEqual(computeFreezeV3(dir, "2026-10-11"));
    expect(existsSync(path.join(dir, FREEZE_V3_FILE))).toBe(false); // printing writes nothing
  });

  it("the archived v2 scorer refuses holdout-v3", () => {
    expect(() => parseArgs(["--scorer", "outcomes-v2", "--split", "holdout3"])).toThrow(UsageError);
    expect(() => parseArgs(["--scorer", "outcomes-v2", "--split", "holdout3"])).toThrow(/predates holdout-v3/);
  });
});

describe("holdout-v3 case metadata and the data-driven sensitivity figures", () => {
  const errs = (o: Record<string, unknown>, split: "dev" | "holdout2" | "holdout3" = "holdout3") => {
    try {
      parseIngredientJsonl(JSON.stringify(o) + "\n", split, "t.jsonl");
      return "";
    } catch (e) {
      return (e as LabelValidationError).errors.join("\n");
    }
  };
  const without = (o: Record<string, unknown>, k: string) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k));

  it("family, contract12, reliesOnNewReading and debatable are required and validated for holdout3", () => {
    const base = H3_CASES[5];
    expect(errs(base)).toBe("");
    for (const k of ["family", "contract12", "reliesOnNewReading", "debatable"]) expect(errs(without(base, k)), k).toMatch(new RegExp(`missing field '${k}' \\(required for holdout3\\)`));
    expect(errs({ ...base, family: "E" })).toMatch(/family must be one of A, B, C, D, plain/);
    expect(errs({ ...base, contract12: ["12.15"] })).toMatch(/contract12 must be an array of CONTRACT-v1 §12 items/);
    expect(errs({ ...base, contract12: "12.1" })).toMatch(/contract12 must be an array/);
    expect(errs({ ...base, contract12: ["12.1", "12.1"] })).toMatch(/contract12 lists an item twice/);
    expect(errs({ ...base, reliesOnNewReading: "yes" })).toMatch(/reliesOnNewReading must be a boolean/);
    expect(errs({ ...base, debatable: 1 })).toMatch(/debatable must be a boolean/);
    expect(errs({ ...base, contract12: [] })).toMatch(/reliesOnNewReading needs a §12 item with new content/);
    expect(errs({ ...base, contract12: ["12.5", "12.12"] })).toMatch(/not only 12\.5, 12\.12/);
    expect(errs({ ...base, contract12: ["12.12", "12.6"] })).toBe("");
    expect(errs({ ...base, reliesOnNewReading: false, contract12: [] })).toBe("");
  });

  it("the metadata is rejected on every other split", () => {
    const h2 = { ...H3_CASES[0], id: "ing-h2-0001", split: "holdout2" };
    expect(errs(h2, "holdout2")).toMatch(/field 'family' is only for holdout3 cases/);
    const dev = { ...without(without(without(without(H3_CASES[0], "source"), "construction"), "contract12"), "debatable"), id: "ing-dev-0001", split: "dev" };
    const e = errs(dev, "dev");
    expect(e).toMatch(/field 'family' is only for holdout3 cases/);
    expect(e).toMatch(/field 'reliesOnNewReading' is only for holdout3 cases/);
    expect(errs(without(without(without(without(dev, "family"), "reliesOnNewReading"), "contract12"), "debatable"), "dev")).toBe("");
  });

  /** ing-h3-0006 ("a half-cup …", 1/2 cup, reliesOnNewReading) read as 1 cup: C2 high with S2; every other line as labelled. */
  const sabotage = (cases: IngredientCase[]) =>
    engineFromLabels("control:new-reading-wrong", "reads ing-h3-0006 as 1 cup", cases, (r, c) => (c.id === "ing-h3-0006" ? { ...r, quantity: { kind: "exact", numerator: "1", denominator: "1", display: "1" } } : r));
  const score = async (dir: string) => {
    const cases = loadIngredientCases(dir, ["holdout3"]);
    const x = deps(dir, cases, [sabotage(cases)]);
    const res = await run(parseArgs(["--split", "holdout3", "--engine", "control:new-reading-wrong"]), x.d);
    expect(res.code, x.err.join("\n")).toBe(0);
    return { res, s: (res.report!.outcomes as OutcomesSection).engines[0].sets.holdout3! };
  };
  const status = (a: { criteria: { id: string; status: string }[] }, id: string) => a.criteria.find((c) => c.id === id)!.status;
  const writeAudit = (dir: string, audit: unknown, listInManifest = true) => {
    writeJson(dir, EXPOSURE_AUDIT_FILE, audit);
    if (!listInManifest) return;
    const m = readJson(dir, MANIFEST);
    m.files.push({ path: EXPOSURE_AUDIT_FILE, kind: "exposure_audit", provenance: "test", rights: m.files[0].rights, created: "2026-10-11", author: "test", reviewer: "test" });
    writeJson(dir, MANIFEST, m);
  };

  it("hand-calculated: (a) drops the debatable case, (c) the new-reading case, (d) is absent without an audit file", async () => {
    const { s } = await score(presentCopy());
    // All lines: R = {0001, 0002, 0006}; 0006 is C2 high (S2) → C1 2/3 (A1 not met), C2High 1 (A3 not met).
    expect(s.acceptance!.criteria.find((c) => c.id === "A1")!.evidence.C1).toMatchObject({ num: 2, den: 3 });
    expect([status(s.acceptance!, "A1"), status(s.acceptance!, "A3")]).toEqual(["not met", "not met"]);
    // (a) without 0003 (needs_review, C5a): R unchanged → C1 2/3, A1 and A3 still not met; 5 lines kept.
    const a = s.sensitivity.excludingDebatable!;
    expect([a.excludedIds, a.lines, a.acceptance.criteria[0].evidence.C1.num, a.acceptance.criteria[0].evidence.C1.den]).toEqual([["ing-h3-0003"], 5, 2, 3]);
    expect([status(a.acceptance, "A1"), status(a.acceptance, "A3")]).toEqual(["not met", "not met"]);
    // (c) without 0006: R = {0001, 0002} → C1 2/2 = 100 % ≥ 98 % on the point estimate, Wilson lower bound 34.2 % < 98 % → "met"; C2High 0 → A3 met.
    const c = s.sensitivity.excludingNewReadings!;
    expect([c.excludedIds, c.lines]).toEqual([["ing-h3-0006"], 5]);
    expect(c.acceptance.criteria[0].evidence.C1).toMatchObject({ num: 2, den: 2 });
    expect([status(c.acceptance, "A1"), status(c.acceptance, "A3"), status(c.acceptance, "A4")]).toEqual(["met", "met", "met"]);
    expect(c.definition).toMatch(/reliesOnNewReading: true .* CONTRACT-v1 §7 alone/);
    expect(s.sensitivity.excludingExposureAudit).toBeNull();
    expect(renderMarkdown((await score(presentCopy())).res.report!)).toContain("(d) exposure audit: no fixtures/EXPOSURE-AUDIT-v3.json — no figure.");
  });

  it("hand-calculated: (d) drops exactly the audit's matched ids; the figure names the audit", async () => {
    const dir = presentCopy();
    writeAudit(dir, { matchedCaseIds: ["ing-h3-0001", "ing-h3-0005"], method: "exact normalized match against the exposed strings", auditedAt: "2026-10-11" });
    expect(checkInvariants(dir)).toEqual({ ok: true, problems: [] });
    const { res, s } = await score(dir);
    // Without 0001 (ready C1) and 0005 (unsupported C7): R = {0002, 0006} → C1 1/2 (A1 not met), C2High 1 (A3 not met), C7 of U = 0/0.
    const d = s.sensitivity.excludingExposureAudit!;
    expect([d.excludedIds, d.lines, d.matchedCaseIds, d.method, d.auditedAt]).toEqual([["ing-h3-0001", "ing-h3-0005"], 4, 2, "exact normalized match against the exposed strings", "2026-10-11"]);
    expect(d.acceptance.criteria[0].evidence.C1).toMatchObject({ num: 1, den: 2 });
    expect([status(d.acceptance, "A1"), status(d.acceptance, "A3")]).toEqual(["not met", "not met"]);
    const md = renderMarkdown(res.report!);
    expect(md).toContain("A1–A5 (d) without the cases listed in fixtures/EXPOSURE-AUDIT-v3.json");
    expect(md).toContain("(audit of 2026-10-11, 2 matched id(s); method: exact normalized match against the exposed strings): 2 excluded (ing-h3-0001, ing-h3-0005), 4 lines kept.");
    // An empty audit is still a figure (nothing excluded).
    writeAudit(dir, { matchedCaseIds: [], method: "m", auditedAt: "2026-10-11T09:30Z" }, false);
    const empty = (await score(dir)).s.sensitivity.excludingExposureAudit!;
    expect([empty.excludedIds, empty.lines]).toEqual([[], 6]);
  });

  it("the audit file is validated on every run when present; an invalid one makes the run refuse", async () => {
    const dir = presentCopy();
    const valid = { matchedCaseIds: ["ing-h3-0002"], method: "m", auditedAt: "2026-10-11" };
    writeAudit(dir, valid);
    expect(checkInvariants(dir).ok).toBe(true);
    const bad: [unknown, RegExp][] = [
      [{ ...valid, extra: 1 }, /unknown key 'extra'/],
      [{ matchedCaseIds: ["ing-h3-0002"], method: "m" }, /missing key 'auditedAt'/],
      [{ ...valid, matchedCaseIds: ["ing-h2-0002"] }, /matchedCaseIds must be an array of holdout-v3 case ids/],
      [{ ...valid, matchedCaseIds: ["ing-h3-0002", "ing-h3-0002"] }, /lists an id twice/],
      [{ ...valid, matchedCaseIds: ["ing-h3-0099"] }, /ing-h3-0099 is not a holdout-v3 case/],
      [{ ...valid, method: " " }, /method must be a non-empty string/],
      [{ ...valid, auditedAt: "11/10/2026" }, /auditedAt must be a date/],
      [[], /must be a JSON object/],
    ];
    for (const [audit, re] of bad) {
      writeAudit(dir, audit, false);
      expect(checkInvariants(dir).problems.join("\n"), String(re)).toMatch(re);
    }
    const x = deps(dir, []);
    expect((await run(parseArgs(["--split", "holdout3"]), x.d)).code).toBe(1);
    expect(x.err.join("\n")).toMatch(/Fixture invariants failed/);
    writeFileSync(path.join(dir, EXPOSURE_AUDIT_FILE), "{not json");
    expect(checkInvariants(dir).problems.join("\n")).toMatch(/EXPOSURE-AUDIT-v3\.json: cannot be read/);
    // Present without holdout-v3, or not listed in the manifest: refused too.
    const absent = absentCopy();
    writeAudit(absent, valid, false);
    const p = checkInvariants(absent).problems.join("\n");
    expect(p).toMatch(/EXPOSURE-AUDIT-v3\.json: present but ingredients\/holdout-v3\.jsonl does not exist/);
    expect(p).toMatch(/EXPOSURE-AUDIT-v3\.json: not listed in MANIFEST\.json/);
  });

  it("breakdowns per repair family, per §12 item and per construction (holdout-v3 only)", async () => {
    const { res, s } = await score(presentCopy());
    expect(Object.keys(s.byFamily!)).toEqual(["A", "B", "C", "D", "plain"]);
    expect(s.byFamily!.A!).toMatchObject({ lines: 1, ready: 1 });
    expect(s.byFamily!.A!.outcomes.C2High.num).toBe(1);
    expect(s.byFamily!.A!.severe.S2.num).toBe(1);
    expect([s.byFamily!.plain!.lines, s.byFamily!.plain!.outcomes.C1.num, s.byFamily!.plain!.outcomes.C5.num]).toEqual([2, 1, 1]);
    expect(s.byFamily!.D!.outcomes.C7).toMatchObject({ num: 1, den: 1 });
    expect(Object.keys(s.byContract12!)).toEqual(["12.1", "12.3", "12.7", "12.8", "none"]);
    expect(s.byContract12!["12.1"]!.outcomes.C2.num).toBe(1);
    expect(s.byContract12!.none!.lines).toBe(2);
    expect(s.byConstruction!.distinct).toBe(6);
    expect(s.byConstruction!.maxUses).toBe(1);
    expect(s.byConstruction!.groups["plumbing test 6"]).toEqual({ lines: 1, caseIds: ["ing-h3-0006"], classes: ["C2"], severe: ["S2"] });
    expect(s.byConstruction!.groups["plumbing test 4"]).toEqual({ lines: 1, caseIds: ["ing-h3-0004"], classes: ["C5a"], severe: [] });
    const md = renderMarkdown(res.report!);
    expect(md).toContain("##### By repair family — holdout-v3 (fresh; acceptance set)");
    expect(md).toContain("##### By CONTRACT-v1 §12 item exercised — holdout-v3 (fresh; acceptance set)");
    expect(md).toMatch(/\| §12\.1 \| 1 \| 1\/0\/0 \| 0\/1 \| 0\/1 \| 1 \(1\/0\) \| 0\/1 \|/); // C1, C1+, C2 (high/medium), C3 + C4
    expect(md).toContain("| no §12 item | 2 |");
    expect(md).toContain("6 distinct construction(s); at most 1 line(s) per construction");
    expect(md).toContain("| plumbing test 6 | ing-h3-0006 | C2 | S2 |");
    expect(md).not.toContain("| plumbing test 4 |");
    // Other sets carry no holdout-v3 breakdowns or figures.
    const dev = (await run(parseArgs(["--split", "dev", "--engine", "control:oracle"]), deps(FIXTURES, loadIngredientCases(FIXTURES, ["dev"])).d)).report!;
    const ds = (dev.outcomes as OutcomesSection).engines[0].sets.dev!;
    expect([ds.byFamily, ds.byContract12, ds.byConstruction, ds.sensitivity.excludingNewReadings, ds.sensitivity.excludingExposureAudit]).toEqual([null, null, null, null, null]);
  });

  it("holdout-v3 reports are byte-identical across reruns, with or without an audit file", async () => {
    const dir = presentCopy();
    expect((await score(dir)).res.json).toBe((await score(dir)).res.json);
    writeAudit(dir, { matchedCaseIds: ["ing-h3-0004"], method: "m", auditedAt: "2026-10-11" });
    expect((await score(dir)).res.json).toBe((await score(dir)).res.json);
  });
});

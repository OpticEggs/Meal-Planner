/**
 * Holdout-v3 support (EVALUATION-PLAN-v3), opt-in: split `holdout3`, file
 * `fixtures/ingredients/holdout-v3.jsonl`, frozen by `fixtures/FREEZE-v3.json`. Neither file is part of
 * this commit; both states are tested on temporary copies of the fixtures — "absent" (everything behaves
 * as before) and "present" with a five-line synthetic plumbing file that is NOT holdout-v3 content.
 * Only label-built control engines are used.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs, run, splitsFor, UsageError, type RunDeps } from "../cli";
import { outcomeControlEngines } from "../controls";
import { FREEZE_V3_FILE, FREEZE_V3_RULE, HOLDOUT3_INGREDIENTS, computeFreezeV3, freezeV2Status, freezeV3Status, verifyFreezeV3 } from "../freeze";
import { checkInvariants } from "../invariants";
import { LabelValidationError, loadIngredientCases, parseIngredientJsonl } from "../labels";
import type { OutcomesSection } from "../outcomes";
import { renderMarkdown } from "../report";
import { EVERY_SPLITS, type IngredientCase, type IngredientExpect } from "../types";
import { copyFixtures } from "./helpers";

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

const MANIFEST = "MANIFEST.json";
const readJson = (dir: string, rel: string) => JSON.parse(readFileSync(path.join(dir, rel), "utf8"));
const writeJson = (dir: string, rel: string, v: unknown) => writeFileSync(path.join(dir, rel), JSON.stringify(v, null, 2) + "\n");

/** A temporary fixtures copy with no holdout-v3 file and no FREEZE-v3.json (and no manifest entries for them). */
function absentCopy(): string {
  const c = copyFixtures();
  cleanup = c.cleanup;
  for (const f of [HOLDOUT3_INGREDIENTS, FREEZE_V3_FILE]) rmSync(path.join(c.dir, f), { force: true });
  const m = readJson(c.dir, MANIFEST);
  m.files = m.files.filter((f: { path: string }) => f.path !== HOLDOUT3_INGREDIENTS && f.path !== FREEZE_V3_FILE);
  writeJson(c.dir, MANIFEST, m);
  return c.dir;
}

const EXPECT_DEFAULTS: IngredientExpect = {
  status: "ready", name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null,
};
function h3(n: number, input: string, expect: Partial<IngredientExpect>, categories: string[]): Record<string, unknown> {
  return {
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
/** Five synthetic plumbing lines (ready ×2, needs_review ×2, unsupported ×1). */
const H3_CASES = [
  h3(1, "2 cups plumbing-test flour", { name: "plumbing-test flour", quantity: "2", unit: "cup" }, ["integer_decimal"]),
  h3(2, "1 (15 oz) can plumbing-test beans", { name: "plumbing-test beans", quantity: "1", unit: "can", packageSize: { quantity: "15", unit: "oz" } }, ["package_size", "count_unit"]),
  h3(3, "plumbing-test parsley", { status: "needs_review", name: "plumbing-test parsley" }, ["quantity_missing"]),
  h3(4, "1 cup plumbing-test milk or plumbing-test cream", { status: "needs_review", quantity: "1", unit: "cup", alternatives: ["plumbing-test milk", "plumbing-test cream"] }, ["ingredient_alternatives"]),
  h3(5, "For the plumbing test:", { status: "unsupported" }, ["heading_non_ingredient"]),
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
function deps(dir: string, cases: IngredientCase[]) {
  const out: string[] = [];
  const err: string[] = [];
  const ctl = outcomeControlEngines(cases);
  const h3Inputs = new Set(H3_CASES.map((c) => c.input as string));
  const counter = { h3Parses: 0 };
  const d: RunDeps = {
    fixturesDir: dir,
    ingredientEngines: (ids) =>
      [ctl.oracle, ctl.ozSwap]
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
      expect(r.json).not.toContain("holdout3");
      expect(r.json).not.toContain("holdout-v3");
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
      expect(r.json).not.toContain("holdout-v3");
    }
    expect(x.counter.h3Parses).toBe(0);
  });

  it("--split holdout3 scores holdout-v3 only, with A1–A7 as the Gate G2 acceptance set; unfrozen, the report says so", async () => {
    const dir = presentCopy();
    const x = deps(dir, loadIngredientCases(dir, ["holdout3"]));
    const res = await run(parseArgs(["--split", "holdout3", "--engine", "control:oracle"]), x.d);
    expect(res.code).toBe(0);
    const r = res.report!;
    expect(r.corpus.ingredientCases).toEqual({ holdout3: 5 });
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
    expect(s.sensitivity.excludingDebatable).toBeNull(); // none pre-registered for holdout-v3
    expect(s.sensitivity.needsReviewExcludingBareNoAmount.excludedIds).toEqual(["ing-h3-0003"]);
    expect(x.counter.h3Parses).toBe(10); // five lines, each parsed twice
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
    expect(rec.ingredients).toMatchObject({ file: HOLDOUT3_INGREDIENTS, cases: 5, byStatus: { needs_review: 2, ready: 2, unsupported: 1 }, bySourceKind: { synthetic_pattern: 5 } });
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

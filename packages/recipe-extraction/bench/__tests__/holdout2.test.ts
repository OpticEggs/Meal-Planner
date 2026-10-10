/**
 * Holdout-v2 (EVALUATION-PLAN-v2 §8–§9): the label file's composition and provenance, the `source` /
 * `construction` fields, the FREEZE-v2 record and its verification, and the CLI's holdout2 split.
 * Only label-built control engines are used here — never a parser on holdout-v2 inputs.
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TABLE_TEST_LITERALS } from "../../tests/parity/table-test-literals";
import { parseArgs, run, splitsFor, type RunDeps } from "../cli";
import { compareIngredient } from "../compare";
import { labelToReading, outcomeControlEngines } from "../controls";
import { FREEZE_V2_FILE, FREEZE_V2_RULE, computeFreezeV2, freezeV2Status, verifyFreezeV2 } from "../freeze";
import { checkInvariants } from "../invariants";
import { LabelValidationError, loadIngredientCases, parseIngredientJsonl } from "../labels";
import { DEBATABLE_CASES, type OutcomesSection } from "../outcomes";
import { renderMarkdown } from "../report";
import { CATEGORIES, SPLITS, V1_SPLITS } from "../types";
import { copyFixtures, FIXTURES } from "./helpers";

const v2 = loadIngredientCases(FIXTURES, ["holdout2"]);
const status = (s: string) => v2.filter((c) => c.expect.status === s).length;

describe("holdout-v2 composition (§9)", () => {
  it("meets the minimums: ≥ 260 lines, ≥ 200 ready, ≥ 40 needs_review, ≥ 15 unsupported", () => {
    expect(v2.length).toBeGreaterThanOrEqual(260);
    expect(status("ready")).toBeGreaterThanOrEqual(200);
    expect(status("needs_review")).toBeGreaterThanOrEqual(40);
    expect(status("unsupported")).toBeGreaterThanOrEqual(15);
    expect(v2.map((c) => c.id)).toEqual(v2.map((_, i) => `ing-h2-${String(i + 1).padStart(4, "0")}`));
  });

  it("represents every CONTRACT category tag at least three times", () => {
    for (const cat of CATEGORIES) expect(v2.filter((c) => c.categories.includes(cat)).length, cat).toBeGreaterThanOrEqual(3);
  });

  it("records source and construction on every case; source.kind equals provenance.kind", () => {
    for (const c of v2) {
      expect(c.source, c.id).toBeDefined();
      expect(c.source!.kind, c.id).toBe(c.provenance.kind);
      expect(c.construction?.trim(), c.id).toBeTruthy();
    }
  });

  it("synthetic lines use no construction more than twice", () => {
    const counts = new Map<string, number>();
    for (const c of v2.filter((x) => x.source!.kind === "synthetic_pattern")) counts.set(c.construction!, (counts.get(c.construction!) ?? 0) + 1);
    expect([...counts].filter(([, n]) => n > 2)).toEqual([]);
    expect(counts.size).toBeGreaterThanOrEqual(100);
  });

  it("has ≥ 40 repository test inputs from the import overhaul (8e6bd6e), each with file and line", () => {
    const repo = v2.filter((c) => c.source!.kind === "repo_test_input");
    expect(repo.length).toBeGreaterThanOrEqual(40);
    for (const c of repo) {
      const s = c.source as { file: string; line: number; commit: string };
      expect(s.commit, c.id).toBe("8e6bd6e");
      expect(s.file, c.id).toMatch(/^tests\//);
      expect(s.line, c.id).toBeGreaterThan(0);
    }
  });

  it("no input repeats a dev, holdout-v1 or parity-corpus input (exact string)", () => {
    const old = new Set(loadIngredientCases(FIXTURES, V1_SPLITS).map((c) => c.input));
    const parity = new Set(TABLE_TEST_LITERALS);
    expect(v2.filter((c) => old.has(c.input)).map((c) => c.id)).toEqual([]);
    expect(v2.filter((c) => parity.has(c.input)).map((c) => c.id)).toEqual([]);
    expect(new Set(v2.map((c) => c.input)).size).toBe(v2.length);
  });

  it("loading all splits checks uniqueness across dev, holdout-v1 and holdout-v2; the default stays dev + holdout", () => {
    expect(loadIngredientCases(FIXTURES, SPLITS).length).toBe(loadIngredientCases(FIXTURES).length + v2.length);
    expect(new Set(loadIngredientCases(FIXTURES).map((c) => c.split))).toEqual(new Set(["dev", "holdout"]));
  });
});

describe("source and construction fields", () => {
  const base = () => JSON.parse(readFileSync(path.join(FIXTURES, "ingredients/holdout-v2.jsonl"), "utf8").split("\n")[0]) as Record<string, unknown>;
  const errs = (o: Record<string, unknown>, split: "dev" | "holdout2" = "holdout2") => {
    try {
      parseIngredientJsonl(JSON.stringify(o) + "\n", split, "t.jsonl");
      return "";
    } catch (e) {
      expect(e).toBeInstanceOf(LabelValidationError);
      return (e as LabelValidationError).errors.join("\n");
    }
  };

  it("a real holdout-v2 case validates", () => {
    expect(errs(base())).toBe("");
  });

  it.each([
    ["source required for holdout2", (o: Record<string, unknown>) => delete o.source, /missing field 'source' \(required for holdout2\)/],
    ["construction required for holdout2", (o: Record<string, unknown>) => delete o.construction, /missing field 'construction'/],
    ["construction non-empty", (o: Record<string, unknown>) => (o.construction = " "), /construction must be a non-empty string/],
    ["construction length", (o: Record<string, unknown>) => (o.construction = "x".repeat(121)), /at most 120 characters/],
    ["source kind", (o: Record<string, unknown>) => (o.source = { kind: "scraped", author: "x" }), /source\.kind: must be one of/],
    ["source kind equals provenance kind", (o: Record<string, unknown>) => (o.source = { kind: "repo_test_input", file: "tests/x.ts", line: 1, commit: "8e6bd6e" }), /differs from provenance\.kind/],
    ["synthetic source needs an author", (o: Record<string, unknown>) => (o.source = { kind: "synthetic_pattern" }), /missing field 'author'/],
    ["unknown source field", (o: Record<string, unknown>) => (o.source = { kind: "synthetic_pattern", author: "a", url: "x" }), /unknown field 'url'/],
    ["id prefix", (o: Record<string, unknown>) => (o.id = "ing-hold-0001"), /id must match ing-h2-NNNN/],
  ])("rejects: %s", (_n, mutate, pattern) => {
    const o = base();
    mutate(o);
    expect(errs(o)).toMatch(pattern);
  });

  it("repo sources need a relative file, a positive line and a commit hash", () => {
    const o = base();
    o.provenance = { kind: "repo_test_input", source: "t" };
    o.source = { kind: "repo_test_input", file: "/abs/x.ts", line: 0, commit: "HEAD" };
    const e = errs(o);
    expect(e).toMatch(/source\.file: must be a repository-relative path/);
    expect(e).toMatch(/source\.line: must be a positive integer/);
    expect(e).toMatch(/source\.commit: must be a commit hash/);
  });

  it("the fields are optional for dev and holdout, and validated when present", () => {
    const o = base();
    o.id = "ing-dev-0001";
    o.split = "dev";
    delete o.source;
    delete o.construction;
    expect(errs(o, "dev")).toBe("");
    o.construction = "";
    expect(errs(o, "dev")).toMatch(/construction must be a non-empty string/);
  });
});

describe("pre-freeze adjudication (2026-10-09)", () => {
  const byId = (id: string) => v2.find((c) => c.id === id)!;

  it("accept.note may hold null (no note): the merged names of 0212/0213 pass the note field too", () => {
    for (const [id, name] of [["ing-h2-0212", "lime juice"], ["ing-h2-0213", "orange zest"]]) {
      const c = byId(id);
      expect(c.accept.note, id).toContain(null);
      const r = compareIngredient(c, { ...labelToReading(c), name, note: null });
      expect(r.fields.name, id).toEqual({ strict: false, accepted: true });
      expect(r.fields.note, id).toEqual({ strict: false, accepted: true });
      expect(r.fullPass.accepted, id).toBe(true);
    }
    const line = JSON.parse(readFileSync(path.join(FIXTURES, "ingredients/holdout-v2.jsonl"), "utf8").split("\n")[0]);
    const check = (accept: unknown) => {
      try {
        parseIngredientJsonl(JSON.stringify({ ...line, accept }) + "\n", "holdout2", "t.jsonl");
        return "";
      } catch (e) {
        return (e as LabelValidationError).errors.join("\n");
      }
    };
    expect(check({ note: [null] })).toBe("");
    expect(check({ note: [null, "chopped"] })).toBe("");
    expect(check({ note: [3] })).toMatch(/accept\.note: must be a non-empty array of strings or null/);
    expect(check({ name: [null] })).toMatch(/accept\.name: must be a non-empty array of non-empty strings/);
  });

  it("'ground' is a product form: bare 'black pepper' is not accepted on 0204/0322/0325; 0215 accepts only the expanded options", () => {
    for (const id of ["ing-h2-0204", "ing-h2-0322", "ing-h2-0325"]) {
      const c = byId(id);
      expect(c.accept.name ?? [], id).not.toContain("black pepper");
      expect(compareIngredient(c, { ...labelToReading(c), name: "black pepper" }).fields.name.accepted, id).toBe(false);
    }
    const miso = byId("ing-h2-0215");
    expect(miso.accept).toEqual({});
    expect(compareIngredient(miso, { ...labelToReading(miso), alternatives: ["white", "yellow miso"] }).fields.alternatives.accepted).toBe(false);
  });

  it("the pre-registered debatable cases exist in holdout-v2 and say so in their rationale", () => {
    expect(DEBATABLE_CASES).toEqual({ holdout2: ["ing-h2-0087"] });
    for (const id of DEBATABLE_CASES.holdout2) expect(byId(id).rationale).toMatch(/DEBATABLE — PRE-REGISTERED/);
  });
});

describe("FREEZE-v2", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });
  const copy = () => {
    const c = copyFixtures();
    cleanup = c.cleanup;
    return c.dir;
  };
  /** Manifest of a fixtures copy without any FREEZE-v2.json entry (works before and after the real freeze). */
  const manifestWithoutFreezeV2 = (dir: string) => {
    const m = JSON.parse(readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
    m.files = m.files.filter((f: { path: string }) => f.path !== FREEZE_V2_FILE);
    return m;
  };
  const freeze = (dir: string, date = "2026-10-10") => {
    const rec = computeFreezeV2(dir, date);
    writeFileSync(path.join(dir, FREEZE_V2_FILE), JSON.stringify(rec, null, 2) + "\n");
    const m = manifestWithoutFreezeV2(dir);
    m.files.push({ path: FREEZE_V2_FILE, kind: "freeze_record", provenance: "test", rights: m.files[0].rights, created: date, author: "test", reviewer: "test" });
    writeFileSync(path.join(dir, "MANIFEST.json"), JSON.stringify(m, null, 2) + "\n");
    return rec;
  };

  it("records the file hash, the case counts by status and by source kind, the date and the rule", () => {
    const rec = computeFreezeV2(FIXTURES, "2026-10-10");
    expect(rec.ingredients.file).toBe("ingredients/holdout-v2.jsonl");
    expect(rec.ingredients.cases).toBe(v2.length);
    expect(rec.ingredients.byStatus).toEqual({ needs_review: status("needs_review"), ready: status("ready"), unsupported: status("unsupported") });
    expect(Object.values(rec.ingredients.bySourceKind).reduce((a, b) => a + b, 0)).toBe(v2.length);
    expect(rec.rule).toBe(FREEZE_V2_RULE);
    expect(rec.rule).toMatch(/never tuned against engine output/);
    expect(rec.ingredients.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("holdout-v2 is frozen (2026-10-09, before any candidate evaluation) and FREEZE-v2.json matches the file", () => {
    const recorded = JSON.parse(readFileSync(path.join(FIXTURES, FREEZE_V2_FILE), "utf8"));
    expect(verifyFreezeV2(FIXTURES)).toEqual([]);
    expect(recorded).toEqual(computeFreezeV2(FIXTURES, "2026-10-09"));
    expect(recorded.frozenAt).toBe("2026-10-09");
    expect(recorded.ingredients.cases).toBe(v2.length);
    expect(freezeV2Status(FIXTURES)).toEqual({ frozen: true, frozenAt: "2026-10-09", sha256: recorded.ingredients.sha256 });
  });

  it("before the freeze there is nothing to verify; the status says not frozen", () => {
    const dir = copy();
    rmSync(path.join(dir, FREEZE_V2_FILE), { force: true });
    expect(verifyFreezeV2(dir)).toEqual([]);
    expect(freezeV2Status(dir)).toEqual({ frozen: false, frozenAt: null, sha256: null });
  });

  it("once frozen it is verified on every run: edits, added or removed cases, a missing file and a changed rule are caught", () => {
    const dir = copy();
    const rec = freeze(dir);
    expect(verifyFreezeV2(dir)).toEqual([]);
    expect(checkInvariants(dir).problems).toEqual([]);
    expect(freezeV2Status(dir)).toEqual({ frozen: true, frozenAt: "2026-10-10", sha256: rec.ingredients.sha256 });
    const file = path.join(dir, "ingredients/holdout-v2.jsonl");
    const text = readFileSync(file, "utf8");
    writeFileSync(file, text.replace('"name":"baby arugula"', '"name":"arugula"'));
    expect(verifyFreezeV2(dir).join("\n")).toMatch(/holdout-v2\.jsonl: SHA-256 differs from FREEZE-v2\.json/);
    expect(checkInvariants(dir).problems.join("\n")).toMatch(/holdout-v2\.jsonl: SHA-256 differs/);
    writeFileSync(file, text.split("\n").slice(1).join("\n"));
    expect(verifyFreezeV2(dir).join("\n")).toMatch(/\d+ cases, FREEZE-v2\.json records \d+/);
    rmSync(file);
    expect(verifyFreezeV2(dir)).toEqual(["ingredients/holdout-v2.jsonl: recorded in FREEZE-v2.json but missing"]);
    writeFileSync(file, text);
    writeFileSync(path.join(dir, FREEZE_V2_FILE), JSON.stringify({ ...rec, rule: "anything goes" }));
    expect(verifyFreezeV2(dir).join("\n")).toMatch(/rule text differs/);
    writeFileSync(path.join(dir, FREEZE_V2_FILE), "{not json");
    expect(verifyFreezeV2(dir)[0]).toMatch(/FREEZE-v2\.json: cannot be read/);
  });

  it("the manifest must list holdout-v2 and FREEZE-v2.json; split holdout2 is a valid manifest split", () => {
    const dir = copy();
    writeFileSync(path.join(dir, FREEZE_V2_FILE), JSON.stringify(computeFreezeV2(dir, "2026-10-10")));
    writeFileSync(path.join(dir, "MANIFEST.json"), JSON.stringify(manifestWithoutFreezeV2(dir)));
    expect(checkInvariants(dir).problems.join("\n")).toMatch(/FREEZE-v2\.json: not listed in MANIFEST\.json/);
    const m = JSON.parse(readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
    const entry = m.files.find((f: { path: string }) => f.path === "ingredients/holdout-v2.jsonl");
    expect(entry.split).toBe("holdout2");
    m.files = m.files.filter((f: { path: string }) => f.path !== "ingredients/holdout-v2.jsonl");
    writeFileSync(path.join(dir, "MANIFEST.json"), JSON.stringify(m));
    expect(checkInvariants(dir).problems.join("\n")).toMatch(/ingredients\/holdout-v2\.jsonl: not listed in MANIFEST\.json/);
  });
});

describe("command line: --split holdout2, --print-freeze-v2 and the outcomes section", () => {
  const all = loadIngredientCases(FIXTURES, SPLITS);
  const ctl = outcomeControlEngines(all);
  const deps = (fixturesDir = FIXTURES) => {
    const out: string[] = [];
    const d: RunDeps = {
      fixturesDir,
      ingredientEngines: (ids) => (ids.length === 0 ? [ctl.oracle, ctl.ozSwap] : [ctl.oracle, ctl.ozSwap].filter((e) => ids.includes(e.id))),
      pageExtractor: () => {
        throw new Error("no pages in these tests");
      },
      stdout: (t) => out.push(t),
      stderr: (t) => out.push(t),
      writeFile: () => {},
      now: () => 0,
    };
    return { d, out };
  };

  it("parses --split holdout2 and --print-freeze-v2", () => {
    expect(parseArgs(["--split", "holdout2"]).split).toBe("holdout2");
    expect(parseArgs(["--print-freeze-v2", "2026-10-10"]).printFreezeV2).toBe("2026-10-10");
    expect(parseArgs([]).printFreezeV2).toBeUndefined();
    expect(() => parseArgs(["--print-freeze-v2", "soon"])).toThrow(/YYYY-MM-DD/);
    expect(() => parseArgs(["--split", "holdout3"])).toThrow(/dev, holdout, holdout2, all or every/);
    expect(parseArgs(["--split", "every"]).split).toBe("every");
  });

  it("holdout2 is opt-in: the default and --split all are dev + holdout exactly as in Phase 1; every adds holdout2", () => {
    expect(parseArgs([]).split).toBe("all");
    expect(splitsFor("all")).toEqual(["dev", "holdout"]);
    expect(splitsFor("every")).toEqual(["dev", "holdout", "holdout2"]);
    expect(splitsFor("holdout2")).toEqual(["holdout2"]);
    expect(splitsFor("dev")).toEqual(["dev"]);
  });

  it("a default run never loads or scores holdout-v2", async () => {
    const { d } = deps();
    let seen = 0;
    const counting: RunDeps = {
      ...d,
      ingredientEngines: (ids) =>
        d.ingredientEngines(ids).map((e) => ({ ...e, parse: (line: string) => (v2.some((c) => c.input === line) && seen++, e.parse(line)) })),
    };
    for (const argv of [[], ["--split", "all"]]) {
      const r = (await run(parseArgs(argv), counting)).report!;
      expect(Object.keys(r.corpus.ingredientCases)).toEqual(["dev", "holdout"]);
      expect(r.corpus.files.map((f) => f.path)).not.toContain("fixtures/ingredients/holdout-v2.jsonl");
      expect(Object.keys(r.outcomes!.engines[0].sets)).toEqual(["dev", "holdout"]);
      expect((r.outcomes as OutcomesSection).freezes).toEqual({});
    }
    expect(seen).toBe(0);
  });

  it("--print-freeze-v2 prints the record computed from the file", async () => {
    const { d, out } = deps();
    expect((await run(parseArgs(["--print-freeze-v2", "2026-10-10"]), d)).code).toBe(0);
    expect(JSON.parse(out.join("\n"))).toEqual(computeFreezeV2(FIXTURES, "2026-10-10"));
  });

  it("--split holdout2 scores holdout-v2 only, with outcomes, acceptance and the freeze status; JSON is deterministic", async () => {
    const a = await run(parseArgs(["--split", "holdout2", "--engine", "control:oracle"]), deps().d);
    const b = await run(parseArgs(["--split", "holdout2", "--engine", "control:oracle"]), deps().d);
    expect(a.code).toBe(0);
    expect(a.json).toBe(b.json);
    const r = a.report!;
    expect(r.corpus.ingredientCases).toEqual({ holdout2: v2.length });
    expect(r.corpus.files.map((f) => f.path)).toEqual(["fixtures/ingredients/holdout-v2.jsonl"]);
    expect(r.corpus.pages).toEqual({});
    expect(Object.keys(r.ingredientEngines[0].splits)).toEqual(["holdout2"]);
    const o = r.outcomes as OutcomesSection;
    expect(o.plan).toBe("EVALUATION-PLAN-v3");
    expect(o.scorer).toMatchObject({ id: "outcomes", version: "v3", plan: "EVALUATION-PLAN-v3", source: "bench/outcomes.ts" });
    expect(o.scorer.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(o.z).toBe(1.959964);
    expect(o.freezes).toEqual({ holdout2: freezeV2Status(FIXTURES) });
    expect(Object.keys(o.engines[0].sets)).toEqual(["holdout2"]);
    const acc = o.engines[0].sets.holdout2!.acceptance!;
    expect(acc.a1ToA5Met).toBe(true);
    expect(acc.basis).toMatch(/^historical — holdout-v2 is exposed/);
    const md = renderMarkdown(r);
    expect(md).toContain("## Outcomes (outcomes v3, EVALUATION-PLAN-v3)");
    expect(md).toContain(`source \`bench/outcomes.ts\` SHA-256 \`${o.scorer.sha256}\``);
    expect(md).toContain("#### holdout-v2 (exposed; historical acceptance set)");
    expect(md).toContain("##### Acceptance — Gate G2 on holdout-v2 (exposed; historical acceptance set), engine `control:oracle`");
    expect(md).toContain("Basis: historical — holdout-v2 is exposed");
    expect(md).toContain("| A1 | C1 on R ≥ 98 % |");
    expect(md).toContain("**met with confidence**");
    expect(md).toContain("##### By source — holdout-v2 (exposed; historical acceptance set)");
    if (!o.freezes.holdout2!.frozen) expect(md).toContain("Holdout-v2 freeze: **NOT FROZEN**");
  });

  it("an oz/fl_oz saboteur fails A4 in the report; zero counts state their upper bound", async () => {
    const r = (await run(parseArgs(["--split", "holdout2", "--engine", "control:oz-swap"]), deps().d)).report!;
    const acc = (r.outcomes as OutcomesSection).engines[0].sets.holdout2!.acceptance!;
    expect(acc.criteria.find((c) => c.id === "A4")!.status).toBe("not met");
    const md = renderMarkdown(r);
    expect(md).toMatch(/\| \*\*S3 cross-dimension\*\* \(of N\) \| [1-9]\d*\/\d+ \|/);
    expect(md).toMatch(/\| \*\*S8 ready on a non-ingredient\*\* \(of N\) \| 0\/\d+ \| 0\.0% \| ≤ \d+\.\d% \|/);
  });

  it("--split every reports dev, holdout-v1 and holdout-v2 separately (never pooled) in the outcomes section", async () => {
    const r = (await run(parseArgs(["--split", "every", "--engine", "control:oracle"]), deps().d)).report!;
    expect(r.selection.split).toBe("every");
    expect(Object.keys(r.corpus.ingredientCases)).toEqual(["dev", "holdout", "holdout2"]);
    expect(Object.keys(r.outcomes!.engines[0].sets)).toEqual(["dev", "holdout", "holdout2"]);
    expect(r.outcomes!.engines[0].sets.dev!.status).toBe("dev (development; diagnostics only)");
    expect(r.outcomes!.engines[0].sets.holdout!.status).toBe("holdout-v1 (previously exposed)");
  });

  it("a dev-only run has an outcomes section without holdout-v2 freeze status or acceptance", async () => {
    const r = (await run(parseArgs(["--split", "dev", "--engine", "control:oracle"]), deps().d)).report!;
    expect((r.outcomes as OutcomesSection).freezes).toEqual({});
    expect(r.outcomes!.engines[0].sets.dev!.acceptance).toBeNull();
    expect(renderMarkdown(r)).not.toContain("Holdout-v2 freeze");
  });
});

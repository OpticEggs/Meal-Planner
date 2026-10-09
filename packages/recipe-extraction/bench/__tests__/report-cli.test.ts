import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as api from "../../src/index";
import { canonicalJson, canonicalJsonPretty } from "../canonical";
import { USAGE, UsageError, parseArgs, run, type CliOptions, type RunDeps } from "../cli";
import { controlEngines, oraclePageExtractor } from "../controls";
import { ENGINES_UNAVAILABLE, EnginesUnavailableError, availableIngredientEngines, pageExtractor } from "../engines";
import { loadIngredientCases, loadPageLabels } from "../labels";
import { renderMarkdown } from "../report";
import { FIXTURES } from "./helpers";

const cases = loadIngredientCases(FIXTURES);
const pages = loadPageLabels(FIXTURES);
const ctl = controlEngines(cases);

function deps(overrides: Partial<RunDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const written: Record<string, string> = {};
  let clock = 0;
  const d: RunDeps = {
    fixturesDir: FIXTURES,
    ingredientEngines: (ids) => {
      const all = [ctl.oracle, ctl.ozSwap, ctl.roundedThird];
      return ids.length === 0 ? all : all.filter((e) => ids.includes(e.id));
    },
    pageExtractor: () => (html, input, opts) => oraclePageExtractor(pages, opts?.engine === "control:oz-swap" ? ctl.ozSwap : ctl.oracle)(html, input),
    stdout: (t) => out.push(t),
    stderr: (t) => err.push(t),
    writeFile: (f, t) => (written[f] = t),
    now: () => (clock += 7.25), // a moving clock: timing must never reach the JSON
    ...overrides,
  };
  return { d, out, err, written };
}
const opts = (argv: string[]): CliOptions => parseArgs(argv);

describe("canonical JSON", () => {
  it("sorts keys at every level, keeps array order, omits undefined", () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: undefined, b: null }, "x"] })).toBe('{"a":[{"b":null,"d":2},"x"],"b":1}');
    expect(canonicalJsonPretty({ b: { y: 1, x: [] }, a: {} })).toBe('{\n  "a": {},\n  "b": {"x":[],"y":1}\n}\n');
    expect(canonicalJsonPretty({ r: { num: 1, den: 2, ci95: [0.1, 0.9] }, list: [{ b: 1 }, { a: [1, { z: 0 }] }] })).toBe(
      '{\n  "list": [\n    {"b":1},\n    {\n      "a": [\n        1,\n        {"z":0}\n      ]\n    }\n  ],\n  "r": {"ci95":[0.1,0.9],"den":2,"num":1}\n}\n',
    );
    expect(JSON.parse(canonicalJsonPretty({ b: [1, { c: 2 }], a: "x" }))).toEqual({ a: "x", b: [1, { c: 2 }] });
    expect(() => canonicalJson({ x: Number.NaN })).toThrow(TypeError);
    expect(() => canonicalJson({ f: () => 1 })).toThrow(TypeError);
  });
});

describe("report determinism", () => {
  it("two runs give identical JSON text, without timing, timestamps or absolute paths", async () => {
    const a = await run(opts(["--pages", "--out-json", "r.json", "--out-md", "r.md"]), deps().d);
    const b = await run(opts(["--pages", "--out-json", "r.json", "--out-md", "r.md"]), deps({ now: () => 1e9 * Math.random() }).d);
    expect(a.code).toBe(0);
    expect(a.json).toBe(b.json);
    const json = a.json!;
    expect(json).not.toContain(FIXTURES);
    expect(json).not.toContain(path.resolve(FIXTURES, ".."));
    expect(json).not.toMatch(/"(totalMs|timing|ms|time|timestamp|date)"/i);
    expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
    const report = JSON.parse(json);
    expect(report.schema).toBe("recipe-extraction-bench/v1");
    expect(report.package).toEqual({ name: "@table/recipe-extraction", version: "0.1.0" });
    expect(report.contract).toBe("recipe-extraction/v1");
    expect(report.ingredientEngines.map((e: { engine: { id: string } }) => e.engine.id)).toEqual(["control:oracle", "control:oz-swap", "control:rounded-third"]);
    expect(report.corpus.ingredientCases).toEqual({ dev: 182, holdout: 128 });
    const files = report.corpus.files.map((f: { path: string }) => f.path);
    expect(files).toContain("fixtures/ingredients/holdout.jsonl");
    expect(files).toContain("fixtures/pages/labels.json");
    expect(files).toContain("fixtures/pages/hold-graph-website.html");
    expect(report.corpus.files.every((f: { sha256: string }) => /^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);
    expect(report.freeze).toEqual({ verified: true, problems: [] });
    expect(report.pages).toHaveLength(1);
    expect(report.pages[0].requestedIngredientEngine).toBeNull();
    // Per-split figures are always present, with numerators and denominators.
    const oracle = report.ingredientEngines[0];
    expect(Object.keys(oracle.splits)).toEqual(["dev", "holdout"]);
    expect(oracle.overall.metrics.corePass.all.strict).toEqual({ num: 310, den: 310, rate: 1, ci95: [0.9878, 1] });
  });

  it("the JSON written to --out-json is the deterministic text; the Markdown carries timing in its own section", async () => {
    const { d, written } = deps();
    const r = await run(opts(["--out-json", "r.json", "--out-md", "r.md"]), d);
    expect(written["r.json"]).toBe(r.json);
    expect(written["r.md"]).toContain("## Runtime (non-deterministic — not part of the JSON report)");
    expect(written["r.md"]).toContain("| Metric | n/N | Rate | 95% CI (Wilson) |");
    expect(written["r.md"]).toContain("### By category (all)");
    const plain = renderMarkdown(r.report!);
    expect(plain).not.toContain("Runtime");
    expect(renderMarkdown(r.report!)).toBe(plain);
    expect(r.timing.length).toBe(3);
  });

  it("mismatch rows are strings and appear in the Markdown table", async () => {
    const r = await run(opts(["--engine", "control:rounded-third", "--split", "dev"]), deps().d);
    const rep = r.report!;
    const m = rep.ingredientEngines[0].mismatches;
    expect(m.length).toBeGreaterThan(0);
    for (const x of m) for (const f of x.fields) expect([typeof f.expected, typeof f.got]).toEqual(["string", "string"]);
    expect(r.markdown).toContain("| ing-dev-0001 | quantity | 1/3 | 3333/10000 | no | wrong_amount (high) |");
    expect(Object.keys(rep.ingredientEngines[0].splits)).toEqual(["dev"]);
  });
});

describe("command line", () => {
  it("parses options", () => {
    expect(parseArgs([])).toEqual({ engines: [], split: "all", pages: false, caseId: null, outJson: null, outMd: null, printFreeze: null, help: false });
    const o = parseArgs(["--engine", "a", "--engine", "b", "--split", "holdout", "--pages", "--case", "ing-hold-0001", "--out-json", "x.json", "--out-md", "x.md"]);
    expect(o).toMatchObject({ engines: ["a", "b"], split: "holdout", pages: true, caseId: "ing-hold-0001", outJson: "x.json", outMd: "x.md" });
    expect(() => parseArgs(["--split", "test"])).toThrow(UsageError);
    expect(() => parseArgs(["--engine"])).toThrow(/needs a value/);
    expect(() => parseArgs(["--engine", "--pages"])).toThrow(/needs a value/);
    expect(() => parseArgs(["--fast"])).toThrow(/unknown option/);
    expect(() => parseArgs(["--print-freeze", "today"])).toThrow(/YYYY-MM-DD/);
  });

  it("--help prints usage", async () => {
    const { d, out } = deps();
    expect((await run(opts(["--help"]), d)).code).toBe(0);
    expect(out.join("\n")).toBe(USAGE);
  });

  it("--engine selects engines; --split restricts cases but keeps per-split figures", async () => {
    const { d, out } = deps();
    const r = await run(opts(["--engine", "control:oracle", "--split", "holdout"]), d);
    expect(r.report!.ingredientEngines).toHaveLength(1);
    expect(r.report!.corpus.ingredientCases).toEqual({ holdout: 128 });
    expect(r.report!.corpus.files.map((f) => f.path)).toEqual(["fixtures/ingredients/holdout.jsonl"]);
    expect(out.join("\n")).toMatch(/control:oracle:\n {2}overall {2}core 128\/128/);
  });

  it("--case scores one case and prints its details", async () => {
    const { d, out } = deps();
    const r = await run(opts(["--case", "ing-dev-0001", "--engine", "control:rounded-third"]), d);
    expect(r.code).toBe(0);
    expect(r.report!.ingredientEngines[0].overall.metrics.cases).toBe(1);
    const text = out.join("\n");
    expect(text).toContain('Case ing-dev-0001 (dev) input "1/3 cup pesto (homemade (or store-bought))"');
    expect(text).toContain("✗ quantity: expected 1/3 · got 3333/10000");
  });

  it("--case with a page id scores that page", async () => {
    const r = await run(opts(["--case", "page-hold-graph-website"]), deps().d);
    expect(r.report!.pages[0].score.overall.pages).toBe(1);
    expect(r.report!.ingredientEngines).toEqual([]);
  });

  it("an unknown --case id is a usage error", async () => {
    const { d, err } = deps();
    expect((await run(opts(["--case", "ing-dev-9999"]), d)).code).toBe(2);
    expect(err.join("\n")).toMatch(/no ingredient case or page with id ing-dev-9999/);
  });

  it("--pages with --engine runs pages once per requested engine", async () => {
    const r = await run(opts(["--pages", "--engine", "control:oracle", "--engine", "control:oz-swap"]), deps().d);
    expect(r.report!.pages.map((p) => p.requestedIngredientEngine)).toEqual(["control:oracle", "control:oz-swap"]);
    expect(r.report!.pages[1].score.extractor.ingredient).toBe("control:oz-swap");
  });

  it("refuses clearly when the build has no engines", async () => {
    const { d, err } = deps({
      ingredientEngines: () => {
        throw new EnginesUnavailableError("src/index.ts does not export ENGINES");
      },
    });
    expect((await run(opts([]), d)).code).toBe(1);
    expect(err.join("\n")).toContain(ENGINES_UNAVAILABLE);
  });

  it("--print-freeze prints the record computed from the files and writes nothing", async () => {
    const { d, out, written } = deps();
    expect((await run(opts(["--print-freeze", "2026-10-09"]), d)).code).toBe(0);
    expect(JSON.parse(out.join("\n"))).toEqual(JSON.parse(readFileSync(path.join(FIXTURES, "FREEZE.json"), "utf8")));
    expect(written).toEqual({});
  });
});

describe("engine lookup through the package API", () => {
  const hasEngines = (api as unknown as Record<string, unknown>).ENGINES !== undefined;
  const hasExtractor = typeof (api as unknown as Record<string, unknown>).extractRecipePage === "function";

  it(hasEngines ? "lists the registered engines" : "says 'engines not available in this build' until the API exports ENGINES", () => {
    if (hasEngines) {
      const all = availableIngredientEngines();
      expect(Object.keys(all).length).toBeGreaterThan(0);
      for (const [id, e] of Object.entries(all)) expect(e.id).toBe(id);
    } else {
      expect(() => availableIngredientEngines()).toThrow(ENGINES_UNAVAILABLE);
    }
  });

  it(hasExtractor ? "returns extractRecipePage" : "says 'engines not available in this build' until the API exports extractRecipePage", () => {
    if (hasExtractor) expect(typeof pageExtractor()).toBe("function");
    else expect(() => pageExtractor()).toThrow(ENGINES_UNAVAILABLE);
  });
});

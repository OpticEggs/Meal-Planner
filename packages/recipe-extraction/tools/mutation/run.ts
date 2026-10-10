/**
 * Package mutation runner. For each mutation of each spec file it copies the package to a fresh
 * temporary directory, applies one exact string replacement to one file, runs the named tests with
 * vitest's JSON reporter, and classifies the result (KILLED / KILLED-UNEXPECTED / SURVIVED / ERROR —
 * see lib.ts). The tests are first run once on an unmutated copy (baseline); a failing baseline makes
 * every mutation that uses those tests ERROR. Setup failure is never a kill.
 *
 * Usage (from packages/recipe-extraction):
 *   npx tsx tools/mutation/run.ts <spec.json>... [--only <id,id>] [--scratch <dir>]
 *                                 [--out-json <file>] [--out-md <file>] [--keep]
 * The copy holds the whole package; the repository's node_modules, src (Table's app code, for the
 * `@/` alias of the parity tests) and docs (the historical evidence some tests read) are symlinked at the
 * copy's root, read-only by convention. Exit codes: 0 every result equals its spec's `expect`; 1 some
 * result differs; 2 usage or spec error. The JSON results carry no timings or paths outside the package.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyMutation, classify, specProblems, type Classification, type Mutation, type ResultClass, type Spec, type VitestReport } from "./lib";

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const PACKAGE_REL = path.relative(REPO_ROOT, PACKAGE_ROOT);
/** Read-only repository folders the package's tests need, symlinked into each copy. */
const LINKED = ["node_modules", "src", "docs"];
const VITEST_TIMEOUT_MS = 10 * 60 * 1000;

export const USAGE = `Package mutation runner.

Usage: npx tsx tools/mutation/run.ts <spec.json>... [options]
  --only <id,id>      run only these mutation ids
  --scratch <dir>     where the temporary copies go (default: the OS temp dir)
  --out-json <file>   write the results (deterministic JSON)
  --out-md <file>     write the results table (Markdown)
  --keep              keep the temporary copies (default: removed after each run)`;

interface Options {
  specs: string[];
  only: string[] | null;
  scratch: string;
  outJson: string | null;
  outMd: string | null;
  keep: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = { specs: [], only: null, scratch: os.tmpdir(), outJson: null, outMd: null, keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === "--only") o.only = value().split(",").map((x) => x.trim()).filter(Boolean);
    else if (a === "--scratch") o.scratch = path.resolve(value());
    else if (a === "--out-json") o.outJson = path.resolve(value());
    else if (a === "--out-md") o.outMd = path.resolve(value());
    else if (a === "--keep") o.keep = true;
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else o.specs.push(path.resolve(a));
  }
  if (o.specs.length === 0) throw new Error("give at least one spec file");
  return o;
}

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const rel = (p: string) => path.relative(PACKAGE_ROOT, p).split(path.sep).join("/");

/** A fresh copy of the package (with the read-only links) under `scratch`. */
function makeCopy(scratch: string): { root: string; pkg: string } {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, "mutation-"));
  const pkg = path.join(root, PACKAGE_REL);
  cpSync(PACKAGE_ROOT, pkg, { recursive: true, filter: (src) => path.basename(src) !== "node_modules" });
  for (const l of LINKED) if (existsSync(path.join(REPO_ROOT, l))) symlinkSync(path.join(REPO_ROOT, l), path.join(root, l));
  return { root, pkg };
}

function runVitest(pkg: string, tests: string[], pattern: string | undefined): { report: VitestReport | null; error?: string } {
  const out = path.join(pkg, "..", "vitest-report.json");
  const bin = path.join(REPO_ROOT, "node_modules", ".bin", "vitest");
  const args = ["run", "--config", "vitest.config.ts", "--reporter=json", `--outputFile=${out}`, ...(pattern ? ["-t", pattern] : []), ...tests];
  const r = spawnSync(bin, args, { cwd: pkg, encoding: "utf8", timeout: VITEST_TIMEOUT_MS, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" } });
  if (r.error) return { report: null, error: `vitest could not run: ${r.error.message}` };
  if (!existsSync(out)) return { report: null, error: `vitest wrote no report (exit ${r.status}): ${(r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" / ")}` };
  try {
    return { report: JSON.parse(readFileSync(out, "utf8")) as VitestReport };
  } catch (err) {
    return { report: null, error: `unreadable vitest report: ${(err as Error).message}` };
  } finally {
    rmSync(out, { force: true });
  }
}

export interface MutationResult {
  spec: string;
  id: string;
  description: string;
  file: string;
  expect: ResultClass;
  result: ResultClass;
  asExpected: boolean;
  why: string;
  tests: Classification["tests"];
  killedByIntended: string[];
  /** Every failing test with the first line of its failure message. */
  failed: Classification["failed"];
}

export interface RunReport {
  format: "recipe-extraction-mutation-results/v1";
  package: string;
  specs: { file: string; sha256: string; owner: string; description: string }[];
  baselines: { tests: string[]; testNamePattern: string | null; ok: boolean; why: string; counts: Classification["tests"] }[];
  results: MutationResult[];
  summary: Record<ResultClass, number> & { asExpected: number; total: number };
}

const subsetKey = (m: Mutation) => JSON.stringify([m.tests, m.testNamePattern ?? null]);

export function runSpecs(opts: Options, log: (s: string) => void = (s) => process.stdout.write(`${s}\n`)): RunReport {
  const specs: { file: string; spec: Spec; bytes: Buffer }[] = [];
  for (const file of opts.specs) {
    const bytes = readFileSync(file);
    const raw = JSON.parse(bytes.toString("utf8"));
    const problems = specProblems(raw, path.basename(file));
    if (problems.length > 0) throw new Error(`invalid spec ${file}:\n  ${problems.join("\n  ")}`);
    specs.push({ file, spec: raw as Spec, bytes });
  }
  const chosen = specs.flatMap((s) => s.spec.mutations.filter((m) => opts.only === null || opts.only.includes(m.id)).map((m) => ({ s, m })));
  if (opts.only) {
    const unknown = opts.only.filter((id) => !chosen.some((c) => c.m.id === id));
    if (unknown.length > 0) throw new Error(`unknown mutation id(s): ${unknown.join(", ")}`);
  }

  // Baselines: each distinct test subset once, unmutated.
  const baselines = new Map<string, { ok: boolean; why: string; tests: Classification["tests"] }>();
  const base = makeCopy(opts.scratch);
  try {
    for (const { m } of chosen) {
      const key = subsetKey(m);
      if (baselines.has(key)) continue;
      const { report, error } = runVitest(base.pkg, m.tests, m.testNamePattern);
      const c = classify({ anchor: { ok: true }, report, killedBy: [], runnerError: error });
      baselines.set(key, { ok: c.result === "SURVIVED", why: c.why, tests: c.tests });
      log(`baseline ${m.tests.join(" ")}${m.testNamePattern ? ` -t ${m.testNamePattern}` : ""}: ${c.result === "SURVIVED" ? "ok" : `FAILS (${c.why})`} (${c.tests.passed}/${c.tests.total})`);
    }
  } finally {
    if (!opts.keep) rmSync(base.root, { recursive: true, force: true });
  }

  const results: MutationResult[] = [];
  for (const { s, m } of chosen) {
    const copy = makeCopy(opts.scratch);
    let c: Classification;
    try {
      const target = path.join(copy.pkg, m.file);
      const text = existsSync(target) ? readFileSync(target, "utf8") : null;
      const applied = text === null ? { error: `file ${m.file} does not exist`, occurrences: 0 } : applyMutation(text, m);
      if ("error" in applied) c = classify({ anchor: { ok: false, error: applied.error }, report: null, killedBy: m.killedBy });
      else {
        writeFileSync(target, applied.text);
        const baseline = baselines.get(subsetKey(m))!;
        if (!baseline.ok) c = { ...classify({ anchor: { ok: true }, report: null, killedBy: m.killedBy, baselineOk: false }), why: `the unmutated baseline is not usable: ${baseline.why}` };
        else {
          const { report, error } = runVitest(copy.pkg, m.tests, m.testNamePattern);
          c = classify({ anchor: { ok: true }, report, killedBy: m.killedBy, runnerError: error });
        }
      }
    } finally {
      if (!opts.keep) rmSync(copy.root, { recursive: true, force: true });
    }
    const r: MutationResult = {
      spec: rel(s.file),
      id: m.id,
      description: m.description,
      file: m.file,
      expect: m.expect,
      result: c.result,
      asExpected: c.result === m.expect,
      why: c.why,
      tests: c.tests,
      killedByIntended: c.killedByIntended,
      failed: c.failed,
    };
    results.push(r);
    log(`${r.asExpected ? "ok  " : "FAIL"} ${r.id}: ${r.result} (expected ${r.expect}) — ${r.why}`);
  }

  const summary = { KILLED: 0, "KILLED-UNEXPECTED": 0, SURVIVED: 0, ERROR: 0, asExpected: 0, total: results.length } as RunReport["summary"];
  for (const r of results) {
    summary[r.result]++;
    if (r.asExpected) summary.asExpected++;
  }
  return {
    format: "recipe-extraction-mutation-results/v1",
    package: PACKAGE_REL.split(path.sep).join("/"),
    specs: specs.map((s) => ({ file: rel(s.file), sha256: sha256(s.bytes), owner: s.spec.owner, description: s.spec.description })),
    baselines: [...baselines.entries()].map(([k, v]) => {
      const [tests, pattern] = JSON.parse(k) as [string[], string | null];
      return { tests, testNamePattern: pattern, ok: v.ok, why: v.why, counts: v.tests };
    }),
    results,
    summary,
  };
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function resultsMarkdown(r: RunReport): string {
  const out = [
    "| Spec | Mutation | File | Expected | Result | As expected | Intended killers failed | Tests failed / run | Why |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const x of r.results) {
    out.push(
      `| ${cell(x.spec)} | ${cell(x.id)} | ${cell(x.file)} | ${x.expect} | **${x.result}** | ${x.asExpected ? "yes" : "**no**"} | ${x.killedByIntended.length} | ${x.tests.failed}/${x.tests.total} | ${cell(x.why)} |`,
    );
  }
  const s = r.summary;
  out.push("", `${s.total} mutation(s): KILLED ${s.KILLED}, KILLED-UNEXPECTED ${s["KILLED-UNEXPECTED"]}, SURVIVED ${s.SURVIVED}, ERROR ${s.ERROR}; as expected ${s.asExpected}/${s.total}.`, "");
  return out.join("\n");
}

function stableJson(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(sort) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])])) : x;
  return JSON.stringify(sort(v), null, 2) + "\n";
}

export function main(argv: string[]): number {
  let opts: Options;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${USAGE}\n`);
    return 2;
  }
  let report: RunReport;
  try {
    report = runSpecs(opts);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return 2;
  }
  if (opts.outJson) writeFileSync(opts.outJson, stableJson(report));
  if (opts.outMd) writeFileSync(opts.outMd, resultsMarkdown(report));
  process.stdout.write(`\n${resultsMarkdown(report)}`);
  return report.summary.asExpected === report.summary.total ? 0 : 1;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exitCode = main(process.argv.slice(2));

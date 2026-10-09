/**
 * Benchmark command line. Reads only local fixture files; engines come from the package API
 * (`bench/engines.ts`). Usage: `npx tsx bench/cli.ts [options]` (see USAGE).
 *
 * Exit codes: 0 report produced; 1 corpus or engine problem (invariants, freeze, labels, no engines);
 * 2 usage error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { IngredientEngine } from "../src/contract";
import { canonicalJsonPretty } from "./canonical";
import { compareIngredient } from "./compare";
import { pageExtractor, selectIngredientEngines, type PageExtractor } from "./engines";
import { computeFreeze, computeFreezeV2, freezeV2Status, sha256Hex } from "./freeze";
import { checkInvariants } from "./invariants";
import { INGREDIENT_FILES, PAGE_LABELS_FILE, loadIngredientCases, loadPageLabels } from "./labels";
import { engineOutcomes, memoizeEngine, outcomesSection, type EngineOutcomes } from "./outcomes";
import { buildReport, renderMarkdown, reportJson, type BenchReport, type CorpusFile, type PageRun, type TimingEntry } from "./report";
import { scoreIngredients, scorePages, type IngredientScore } from "./score";
import { fraction } from "./stats";
import { PAGE_SPLITS, SPLITS, type IngredientCase, type PageLabel, type Split } from "./types";

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES_DIR = path.join(PACKAGE_ROOT, "fixtures");

export const USAGE = `Recipe extraction benchmark (local fixtures only; no network).

Usage: tsx bench/cli.ts [options]
  --engine <id>          ingredient engine to score (repeatable; default: every registered engine)
  --split dev|holdout|holdout2|all
                         cases to score (default all = dev, holdout-v1 and holdout-v2; per-split
                         figures are always reported; outcomes are never pooled across sets)
  --pages                also score the synthetic recipe pages with extractRecipePage
  --case <id>            score one ingredient case or page and print its details
  --out-json <file>      write the deterministic JSON report
  --out-md <file>        write the Markdown report (with a non-deterministic runtime section)
  --print-freeze <date>  print the holdout freeze record computed from the files (writes nothing)
  --print-freeze-v2 <date>
                         print the holdout-v2 freeze record (FREEZE-v2.json) computed from the file
  --help                 this text`;

export class UsageError extends Error {}

export interface CliOptions {
  engines: string[];
  split: Split | "all";
  pages: boolean;
  caseId: string | null;
  outJson: string | null;
  outMd: string | null;
  printFreeze: string | null;
  /** Set only by --print-freeze-v2 (absent otherwise). */
  printFreezeV2?: string;
  help: boolean;
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const o: CliOptions = { engines: [], split: "all", pages: false, caseId: null, outJson: null, outMd: null, printFreeze: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new UsageError(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--engine":
        o.engines.push(value());
        break;
      case "--split": {
        const v = value();
        if (v !== "all" && !(SPLITS as readonly string[]).includes(v)) throw new UsageError(`--split must be dev, holdout, holdout2 or all (got ${v})`);
        o.split = v as Split | "all";
        break;
      }
      case "--pages":
        o.pages = true;
        break;
      case "--case":
        o.caseId = value();
        break;
      case "--out-json":
        o.outJson = value();
        break;
      case "--out-md":
        o.outMd = value();
        break;
      case "--print-freeze": {
        const v = value();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new UsageError("--print-freeze needs a date YYYY-MM-DD");
        o.printFreeze = v;
        break;
      }
      case "--print-freeze-v2": {
        const v = value();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new UsageError("--print-freeze-v2 needs a date YYYY-MM-DD");
        o.printFreezeV2 = v;
        break;
      }
      case "--help":
      case "-h":
        o.help = true;
        break;
      default:
        throw new UsageError(`unknown option ${a}`);
    }
  }
  return o;
}

/** Everything `run` touches outside itself, so tests can inject engines and capture output. */
export interface RunDeps {
  fixturesDir: string;
  ingredientEngines: (ids: readonly string[]) => IngredientEngine[];
  pageExtractor: () => PageExtractor;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  writeFile: (file: string, text: string) => void;
  /** Milliseconds clock for the runtime section only. */
  now: () => number;
}

export const defaultDeps = (): RunDeps => ({
  fixturesDir: FIXTURES_DIR,
  ingredientEngines: selectIngredientEngines,
  pageExtractor,
  stdout: (t) => process.stdout.write(t.endsWith("\n") ? t : `${t}\n`),
  stderr: (t) => process.stderr.write(t.endsWith("\n") ? t : `${t}\n`),
  writeFile: (f, t) => writeFileSync(f, t),
  now: () => performance.now(),
});

export interface RunResult {
  code: number;
  report: BenchReport | null;
  json: string | null;
  markdown: string | null;
  timing: TimingEntry[];
}

const noReport = (code: number): RunResult => ({ code, report: null, json: null, markdown: null, timing: [] });

function corpusFile(fixturesDir: string, rel: string, entries: number): CorpusFile {
  return { path: `fixtures/${rel}`, sha256: sha256Hex(readFileSync(path.join(fixturesDir, rel))), entries };
}

function summaryLine(s: IngredientScore): string[] {
  const out: string[] = [];
  const parts: [string, IngredientScore["overall"]][] = [["overall", s.overall], ...SPLITS.filter((x) => s.splits[x]).map((x) => [x, s.splits[x]!] as [string, IngredientScore["overall"]])];
  for (const [name, r] of parts) {
    const m = r.metrics;
    const fc = m.falseCertainty;
    out.push(
      `  ${name.padEnd(8)} core ${fraction(m.corePass.all.strict)}  full ${fraction(m.fullPass.all.strict)}  review ${fraction(m.reviewRate)}  ` +
        `false-certain ${fc.total.num} (H${fc.high.num}/M${fc.medium.num}/L${fc.low.num})  fabricated ${fraction(m.fabricatedQuantity)}  cross-dim ${fraction(m.crossDimension)}`,
    );
  }
  return out;
}

/** One stdout line per set: the EVALUATION-PLAN-v2 outcome classes, severe errors and (holdout2) Gate G2. */
function outcomeLines(e: EngineOutcomes | undefined): string[] {
  if (!e) return [];
  const out: string[] = [];
  for (const split of SPLITS) {
    const s = e.sets[split];
    if (!s) continue;
    const o = s.aggregate.outcomes;
    const severe = s.aggregate.severe;
    const sev = (["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const).map((k) => `${k}:${severe[k].num}`).join(" ");
    const g2 = s.acceptance ? `  G2 ${s.acceptance.criteria.slice(0, 5).map((c) => `${c.id} ${c.status}`).join(", ")}` : "";
    out.push(
      `  outcomes ${split.padEnd(8)} C1 ${fraction(o.C1)}  C1+ ${fraction(o.C1plus)}  C2 ${o.C2.num} (H${o.C2High.num}/M${o.C2Medium.num})  C3+C4 ${fraction(o.C3plusC4)}  ` +
        `C5 ${fraction(o.C5)}  C7 ${fraction(o.C7)}  CE ${o.CE.num}  ${sev}${g2}`,
    );
  }
  return out;
}

/** The benchmark run behind `main`. */
export async function run(opts: CliOptions, deps: RunDeps): Promise<RunResult> {
  if (opts.help) {
    deps.stdout(USAGE);
    return noReport(0);
  }
  if (opts.printFreeze) {
    deps.stdout(JSON.stringify(computeFreeze(deps.fixturesDir, opts.printFreeze), null, 2));
    return noReport(0);
  }
  if (opts.printFreezeV2) {
    deps.stdout(JSON.stringify(computeFreezeV2(deps.fixturesDir, opts.printFreezeV2), null, 2));
    return noReport(0);
  }

  const inv = checkInvariants(deps.fixturesDir);
  if (!inv.ok) {
    deps.stderr(`Fixture invariants failed (${inv.problems.length}); refusing to benchmark:\n  ${inv.problems.join("\n  ")}`);
    return noReport(1);
  }

  const splits: Split[] = opts.split === "all" ? [...SPLITS] : [opts.split];
  let cases: IngredientCase[];
  let pages: PageLabel[] = [];
  try {
    cases = loadIngredientCases(deps.fixturesDir, splits);
    if (opts.pages || opts.caseId) pages = loadPageLabels(deps.fixturesDir, splits);
  } catch (err) {
    deps.stderr((err as Error).message);
    return noReport(1);
  }
  let scorePagesToo = opts.pages;
  if (opts.caseId) {
    const c = cases.filter((x) => x.id === opts.caseId);
    const p = pages.filter((x) => x.id === opts.caseId);
    if (c.length === 0 && p.length === 0) {
      deps.stderr(`no ingredient case or page with id ${opts.caseId} in split ${opts.split}`);
      return noReport(2);
    }
    cases = c;
    pages = p;
    scorePagesToo = p.length > 0;
  }

  let engines: IngredientEngine[] = [];
  let extract: PageExtractor | null = null;
  try {
    // Memoized: the §9 scorer and the outcome scorer see the same single reading of each line.
    if (cases.length > 0) engines = deps.ingredientEngines(opts.engines).map(memoizeEngine);
    if (scorePagesToo) extract = deps.pageExtractor();
  } catch (err) {
    deps.stderr((err as Error).message);
    return noReport(1);
  }

  const timing: TimingEntry[] = [];
  const scores: IngredientScore[] = [];
  const outcomes: EngineOutcomes[] = [];
  for (const engine of engines) {
    const t0 = deps.now();
    scores.push(scoreIngredients(cases, engine));
    outcomes.push(engineOutcomes(cases, engine));
    timing.push({ label: `ingredients · ${engine.id}`, items: cases.length, totalMs: deps.now() - t0 });
  }

  const pageRuns: PageRun[] = [];
  if (extract) {
    const pagesDir = path.join(deps.fixturesDir, "pages");
    const readFile = (file: string) => readFileSync(path.join(pagesDir, path.basename(file)), "utf8");
    const requested: (string | null)[] = opts.engines.length > 0 ? [...new Set(opts.engines)] : [null];
    for (const id of requested) {
      const t0 = deps.now();
      const score = scorePages(pages, (html, input) => (id === null ? extract!(html, input) : extract!(html, input, { engine: id })), readFile);
      timing.push({ label: `pages · ${id ?? "default"}`, items: pages.length, totalMs: deps.now() - t0 });
      pageRuns.push({ requestedIngredientEngine: id, score });
    }
  }

  const files: CorpusFile[] = [];
  const caseCounts: Partial<Record<Split, number>> = {};
  const pageCounts: Partial<Record<Split, number>> = {};
  for (const s of splits) {
    const all = loadIngredientCases(deps.fixturesDir, [s]);
    files.push(corpusFile(deps.fixturesDir, INGREDIENT_FILES[s], all.length));
    caseCounts[s] = cases.filter((c) => c.split === s).length;
  }
  if (pageRuns.length > 0) {
    const allLabels = loadPageLabels(deps.fixturesDir);
    files.push(corpusFile(deps.fixturesDir, PAGE_LABELS_FILE, allLabels.length));
    for (const p of pages) files.push(corpusFile(deps.fixturesDir, `pages/${p.file}`, 1));
    for (const s of splits) if ((PAGE_SPLITS as readonly Split[]).includes(s)) pageCounts[s] = pages.filter((p) => p.split === s).length;
  }

  const report = buildReport({
    selection: { split: opts.split, case: opts.caseId, pages: pageRuns.length > 0 },
    corpusFiles: files,
    ingredientCases: caseCounts,
    pages: pageCounts,
    freezeProblems: [],
    ingredientScores: scores,
    pageRuns,
    outcomes: outcomesSection(outcomes, splits.includes("holdout2") ? freezeV2Status(deps.fixturesDir) : null),
  });
  const json = reportJson(report);
  const markdown = renderMarkdown(report, timing);

  if (opts.caseId) {
    for (const c of cases) {
      deps.stdout(`Case ${c.id} (${c.split}) input ${JSON.stringify(c.input)}\nLabel: ${JSON.stringify(c.expect)}${Object.keys(c.accept).length ? `\nAccept: ${JSON.stringify(c.accept)}` : ""}`);
      for (const e of engines) {
        let reading: unknown;
        try {
          reading = e.parse(c.input);
        } catch (err) {
          reading = { error: (err as Error).message };
        }
        deps.stdout(`  ${e.id}: ${canonicalJsonPretty(reading).trimEnd().replace(/\n/g, "\n  ")}`);
        if (!(reading as { error?: string }).error) {
          for (const m of compareIngredient(c, reading as never).mismatches) deps.stdout(`    ✗ ${m.field}: expected ${m.expected} · got ${m.got}${m.accepted ? " (accepted)" : ""}`);
        }
      }
    }
    for (const r of pageRuns) for (const m of r.score.mismatches) deps.stdout(`Page ${m.id}: ${JSON.stringify(m)}`);
  }

  deps.stdout(`Recipe extraction benchmark — ${cases.length} ingredient case(s), split ${opts.split}`);
  scores.forEach((s, i) => deps.stdout([`${s.engine.id}:`, ...summaryLine(s), ...outcomeLines(outcomes[i])].join("\n")));
  for (const r of pageRuns) {
    const o = r.score.overall;
    deps.stdout(
      `pages (${r.requestedIngredientEngine ?? "default"}): detection P ${fraction(o.detection.precision)} R ${fraction(o.detection.recall)}  ` +
        `count ${fraction(o.candidateCountMatch)}  ingredient lists ${fraction(o.ingredientListExact)}  diagnostics ${fraction(o.diagnosticsFound)}  retention ${fraction(o.retentionNotDecided)}`,
    );
  }
  if (opts.outJson) {
    deps.writeFile(opts.outJson, json);
    deps.stdout(`Wrote ${opts.outJson} (deterministic)`);
  }
  if (opts.outMd) {
    deps.writeFile(opts.outMd, markdown);
    deps.stdout(`Wrote ${opts.outMd}`);
  }
  return { code: 0, report, json, markdown, timing };
}

/** Command-line entry point. Returns the exit code. */
export async function main(argv: string[]): Promise<number> {
  const deps = defaultDeps();
  let opts: CliOptions;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      deps.stderr(`${err.message}\n\n${USAGE}`);
      return 2;
    }
    throw err;
  }
  try {
    return (await run(opts, deps)).code;
  } catch (err) {
    deps.stderr(`benchmark failed: ${(err as Error).message}`);
    return 1;
  }
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

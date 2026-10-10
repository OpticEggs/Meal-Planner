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
import { computeFreeze, computeFreezeV2, computeFreezeV3, freezeV2Status, freezeV3Status, sha256Hex } from "./freeze";
import { checkInvariants } from "./invariants";
import { INGREDIENT_FILES, PAGE_LABELS_FILE, loadIngredientCases, loadPageLabels } from "./labels";
import {
  engineOutcomes as engineOutcomesV2,
  memoizeEngine as memoizeEngineV2,
  outcomesSection as outcomesSectionV2,
  type EngineOutcomes as EngineOutcomesV2,
  type IngredientCaseV2,
  type OutcomeSetReport as OutcomeSetReportV2,
} from "./archive/outcomes-v2";
import {
  ACCEPTANCE_SPLITS,
  SCORER_DEPENDENCIES,
  SCORER_SOURCE,
  engineOutcomes,
  observeAll,
  outcomesSection,
  replayEngine,
  scorerIdentity,
  type AcceptanceSplit,
  type EngineOutcomes,
  type HoldoutFreezeStatus,
  type OutcomeSetReport,
  type ScorerIdentity,
} from "./outcomes";
import { buildReport, renderMarkdown, reportJson, type BenchReport, type CorpusFile, type PageRun, type TimingEntry } from "./report";
import { scoreIngredients, scorePages, type IngredientScore } from "./score";
import { fraction } from "./stats";
import { EVERY_SPLITS, PAGE_SPLITS, SPLITS, V1_SPLITS, type IngredientCase, type PageLabel, type Split } from "./types";

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES_DIR = path.join(PACKAGE_ROOT, "fixtures");

export const USAGE = `Recipe extraction benchmark (local fixtures only; no network).

Usage: tsx bench/cli.ts [options]
  --engine <id>          ingredient engine to score (repeatable; default: every registered engine);
                         with --pages, pages are scored once per requested engine
  --engines <id,id,...>  score only these registered engines, as if no others were registered
                         (pages, with --pages, use the extractor's default as without --engine)
  --scorer outcomes-v3|outcomes-v2
                         outcome scorer (default outcomes-v3 = bench/outcomes.ts, EVALUATION-PLAN-v3;
                         outcomes-v2 = the archived bench/archive/ scorer, for reproducing the
                         historical holdout-v2 report)
  --split dev|holdout|holdout2|holdout3|all|every
                         cases to score (default all = dev + holdout-v1, as in Phase 1; holdout-v2 is
                         opt-in only: holdout2 alone, or every = dev + holdout-v1 + holdout-v2;
                         holdout-v3 is scored only by holdout3 alone, never by all or every;
                         per-split figures are always reported; outcomes are never pooled across sets)
  --pages                also score the synthetic recipe pages with extractRecipePage
  --case <id>            score one ingredient case or page and print its details
  --out-json <file>      write the deterministic JSON report
  --out-md <file>        write the Markdown report (with a non-deterministic runtime section)
  --print-freeze <date>  print the holdout freeze record computed from the files (writes nothing)
  --print-freeze-v2 <date>
                         print the holdout-v2 freeze record (FREEZE-v2.json) computed from the file
  --print-freeze-v3 <date>
                         print the holdout-v3 freeze record (FREEZE-v3.json) computed from the file
  --help                 this text`;

export class UsageError extends Error {}

/**
 * `all` = the Phase 1 splits (dev + holdout); `every` adds holdout2. holdout2 is never scored by default;
 * holdout3 only when selected by itself.
 */
export type SplitSelection = Split | "all" | "every";

/** The splits a selection scores. */
export function splitsFor(selection: SplitSelection): Split[] {
  if (selection === "all") return [...V1_SPLITS];
  if (selection === "every") return [...EVERY_SPLITS];
  return [selection];
}

/** The outcome scorer of a run: outcomes v3 (default) or the archived outcomes v2. */
export const SCORERS = ["outcomes-v3", "outcomes-v2"] as const;
export type ScorerChoice = (typeof SCORERS)[number];

export interface CliOptions {
  engines: string[];
  split: SplitSelection;
  pages: boolean;
  caseId: string | null;
  outJson: string | null;
  outMd: string | null;
  printFreeze: string | null;
  /** Set only by --print-freeze-v2 (absent otherwise). */
  printFreezeV2?: string;
  /** Set only by --print-freeze-v3 (absent otherwise). */
  printFreezeV3?: string;
  /** Set only by --scorer (absent = outcomes-v3). */
  scorer?: ScorerChoice;
  /** Set only by --engines: the registered engines to keep (absent = no restriction). */
  onlyEngines?: string[];
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
      case "--engines": {
        const ids = value().split(",").map((x) => x.trim()).filter((x) => x !== "");
        if (ids.length === 0) throw new UsageError("--engines needs a comma-separated list of engine ids");
        o.onlyEngines = [...(o.onlyEngines ?? []), ...ids];
        break;
      }
      case "--scorer": {
        const v = value();
        if (!(SCORERS as readonly string[]).includes(v)) throw new UsageError(`--scorer must be ${SCORERS.join(" or ")} (got ${v})`);
        o.scorer = v as ScorerChoice;
        break;
      }
      case "--split": {
        const v = value();
        if (v !== "all" && v !== "every" && !(SPLITS as readonly string[]).includes(v)) throw new UsageError(`--split must be dev, holdout, holdout2, holdout3, all or every (got ${v})`);
        o.split = v as SplitSelection;
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
      case "--print-freeze-v3": {
        const v = value();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new UsageError("--print-freeze-v3 needs a date YYYY-MM-DD");
        o.printFreezeV3 = v;
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
  if (o.onlyEngines && o.engines.length > 0) throw new UsageError("--engine and --engines cannot be combined");
  if (o.scorer === "outcomes-v2" && o.split === "holdout3") throw new UsageError("--scorer outcomes-v2 predates holdout-v3 and cannot score it (use outcomes-v3)");
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

/** One stdout line per set: the outcome classes, severe errors and (acceptance sets) Gate G2. */
function outcomeLines(e: EngineOutcomes | EngineOutcomesV2 | undefined): string[] {
  if (!e) return [];
  const out: string[] = [];
  const sets = e.sets as Partial<Record<Split, OutcomeSetReport | OutcomeSetReportV2>>;
  for (const split of SPLITS) {
    const s = sets[split];
    if (!s) continue;
    const o = s.aggregate.outcomes;
    const severe = s.aggregate.severe;
    const sev = (["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const).map((k) => `${k}:${severe[k].num}`).join(" ");
    const g2 = s.acceptance ? `  G2 ${s.acceptance.criteria.slice(0, 5).map((c) => `${c.id} ${c.status}`).join(", ")}` : "";
    const v = "validity" in s.aggregate ? `  invalid ${s.aggregate.validity.invalidOutput.num} error ${s.aggregate.validity.engineError.num} nondet ${s.aggregate.validity.nondeterministic.num}` : "";
    out.push(
      `  outcomes ${split.padEnd(8)} C1 ${fraction(o.C1)}  C1+ ${fraction(o.C1plus)}  C2 ${o.C2.num} (H${o.C2High.num}/M${o.C2Medium.num})  C3+C4 ${fraction(o.C3plusC4)}  ` +
        `C5 ${fraction(o.C5)}  C7 ${fraction(o.C7)}  CE ${o.CE.num}${v}  ${sev}${g2}`,
    );
  }
  return out;
}

/** The engines a run scores: `--engine` ids (in that order), `--engines` (registry order), or all. */
function selectEngines(opts: CliOptions, deps: RunDeps): IngredientEngine[] {
  if (!opts.onlyEngines) return deps.ingredientEngines(opts.engines);
  const all = deps.ingredientEngines([]);
  const known = new Set(all.map((e) => e.id));
  const unknown = opts.onlyEngines.filter((id) => !known.has(id));
  if (unknown.length > 0) throw new Error(`unknown engine id(s): ${unknown.join(", ")} (registered: ${[...known].join(", ")})`);
  return all.filter((e) => opts.onlyEngines!.includes(e.id));
}

/** Freeze status of every acceptance set the run scores. */
function acceptanceFreezes(fixturesDir: string, splits: readonly Split[]): Partial<Record<AcceptanceSplit, HoldoutFreezeStatus>> {
  const out: Partial<Record<AcceptanceSplit, HoldoutFreezeStatus>> = {};
  for (const s of ACCEPTANCE_SPLITS) if (splits.includes(s)) out[s] = HOLDOUT_FREEZE_STATUS[s](fixturesDir);
  return out;
}
const HOLDOUT_FREEZE_STATUS: Record<AcceptanceSplit, (fixturesDir: string) => HoldoutFreezeStatus> = { holdout2: freezeV2Status, holdout3: freezeV3Status };

/** SHA-256 of a package file, or null when it cannot be read. */
function packageFileSha256(packageRoot: string, rel: string): string | null {
  try {
    return sha256Hex(readFileSync(path.join(packageRoot, rel)));
  } catch {
    return null;
  }
}

/** The outcomes v3 scorer identity of the code that is running: SHA-256 of bench/outcomes.ts and its dependencies. */
export function scorerIdentityOf(packageRoot: string): ScorerIdentity {
  const deps: Record<string, string | null> = {};
  for (const d of SCORER_DEPENDENCIES) deps[d] = packageFileSha256(packageRoot, d);
  return scorerIdentity(packageFileSha256(packageRoot, SCORER_SOURCE), deps);
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
  if (opts.printFreezeV3) {
    try {
      deps.stdout(JSON.stringify(computeFreezeV3(deps.fixturesDir, opts.printFreezeV3), null, 2));
    } catch (err) {
      deps.stderr(`holdout-v3 cannot be read (${(err as Error).message})`);
      return noReport(1);
    }
    return noReport(0);
  }

  const inv = checkInvariants(deps.fixturesDir);
  if (!inv.ok) {
    deps.stderr(`Fixture invariants failed (${inv.problems.length}); refusing to benchmark:\n  ${inv.problems.join("\n  ")}`);
    return noReport(1);
  }

  const splits: Split[] = splitsFor(opts.split);
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

  const scorer: ScorerChoice = opts.scorer ?? "outcomes-v3";
  let selected: IngredientEngine[] = [];
  let extract: PageExtractor | null = null;
  try {
    if (cases.length > 0) selected = selectEngines(opts, deps);
    if (scorePagesToo) extract = deps.pageExtractor();
  } catch (err) {
    deps.stderr((err as Error).message);
    return noReport(1);
  }

  // The §9 field scorer and the outcome scorer see the same reading of each line: v3 parses every line
  // twice (nondeterminism check) and replays the first parse; v2 memoizes a single parse.
  const timing: TimingEntry[] = [];
  const scores: IngredientScore[] = [];
  const outcomes: (EngineOutcomes | EngineOutcomesV2)[] = [];
  const engines: IngredientEngine[] = [];
  for (const raw of selected) {
    const t0 = deps.now();
    if (scorer === "outcomes-v2") {
      const engine = memoizeEngineV2(raw);
      scores.push(scoreIngredients(cases, engine));
      outcomes.push(engineOutcomesV2(cases as unknown as IngredientCaseV2[], engine));
      engines.push(engine);
    } else {
      const observations = observeAll(cases, raw);
      const engine = replayEngine(raw, observations);
      scores.push(scoreIngredients(cases, engine));
      outcomes.push(engineOutcomes(cases, raw, observations));
      engines.push(engine);
    }
    timing.push({ label: `ingredients · ${raw.id}`, items: cases.length, totalMs: deps.now() - t0 });
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
    outcomes:
      scorer === "outcomes-v2"
        ? outcomesSectionV2(outcomes as EngineOutcomesV2[], splits.includes("holdout2") ? freezeV2Status(deps.fixturesDir) : null)
        : outcomesSection(outcomes as EngineOutcomes[], acceptanceFreezes(deps.fixturesDir, splits), scorerIdentityOf(PACKAGE_ROOT)),
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

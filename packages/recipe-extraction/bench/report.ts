/**
 * Benchmark report: a deterministic JSON document (canonical key order, no timestamps, no absolute
 * paths) and a Markdown rendering. Runtime figures are NOT part of the report; they are passed to the
 * Markdown renderer separately and printed in an explicitly non-deterministic section. Pure.
 */
import { PACKAGE_NAME, PACKAGE_VERSION, SCHEMA_VERSION } from "../src/contract";
import { canonicalJsonPretty } from "./canonical";
import type { IngredientMetrics, IngredientScore, IngredientSplitReport, PageScore, PageSplitReport, StrictAccepted } from "./score";
import { fraction, percent, type Rate } from "./stats";
import { CATEGORIES, EXPECT_FIELDS, PAGE_CANDIDATE_FIELDS, SPLITS, type Split } from "./types";

export const REPORT_SCHEMA = "recipe-extraction-bench/v1";

export interface CorpusFile {
  /** Relative to the package root, e.g. "fixtures/ingredients/dev.jsonl". */
  path: string;
  sha256: string;
  /** Cases (JSONL), page labels (labels.json) or 1 (an HTML page). */
  entries: number;
}

export interface BenchReport {
  schema: typeof REPORT_SCHEMA;
  package: { name: string; version: string };
  contract: string;
  selection: { split: Split | "all"; case: string | null; pages: boolean };
  corpus: { files: CorpusFile[]; ingredientCases: Partial<Record<Split, number>>; pages: Partial<Record<Split, number>> };
  freeze: { verified: boolean; problems: string[] };
  ingredientEngines: IngredientScore[];
  /** One page run per requested ingredient engine (null = the extractor's default); empty without --pages. */
  pages: PageRun[];
}

export interface PageRun {
  requestedIngredientEngine: string | null;
  score: PageScore;
}

export interface BuildReportInput {
  selection: BenchReport["selection"];
  corpusFiles: CorpusFile[];
  ingredientCases: Partial<Record<Split, number>>;
  pages: Partial<Record<Split, number>>;
  freezeProblems: string[];
  ingredientScores: IngredientScore[];
  pageRuns: PageRun[];
}

export function buildReport(input: BuildReportInput): BenchReport {
  for (const f of input.corpusFiles) if (f.path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(f.path) || f.path.includes("..")) throw new Error(`corpus path must be package-relative: ${f.path}`);
  return {
    schema: REPORT_SCHEMA,
    package: { name: PACKAGE_NAME, version: PACKAGE_VERSION },
    contract: SCHEMA_VERSION,
    selection: input.selection,
    corpus: { files: [...input.corpusFiles].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)), ingredientCases: input.ingredientCases, pages: input.pages },
    freeze: { verified: input.freezeProblems.length === 0, problems: input.freezeProblems },
    ingredientEngines: input.ingredientScores,
    pages: input.pageRuns,
  };
}

/** The deterministic JSON text: canonical key order, two-space indentation, trailing newline. */
export const reportJson = (report: BenchReport) => canonicalJsonPretty(report);

// --- Timing (non-deterministic; never part of the JSON report) --------------------------------------

export interface TimingEntry {
  label: string;
  items: number;
  totalMs: number;
}

// --- Markdown -------------------------------------------------------------------------------------

const cell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const ci = (r: Rate) => (r.ci95 ? `${percent(r.ci95[0])}–${percent(r.ci95[1])}` : "—");
const row = (name: string, r: Rate) => `| ${cell(name)} | ${fraction(r)} | ${percent(r.rate)} | ${ci(r)} |`;
const header = ["| Metric | n/N | Rate | 95% CI (Wilson) |", "|---|---|---|---|"];

function saRows(name: string, s: StrictAccepted): string[] {
  return [row(`${name} (strict)`, s.strict), row(`${name} (accepted)`, s.accepted)];
}

function metricsTable(m: IngredientMetrics): string[] {
  const fc = m.falseCertainty;
  return [
    ...header,
    ...saRows("Core pass (status+name+quantity+unit), all lines", m.corePass.all),
    ...saRows("Core pass, ready-labelled lines", m.corePass.readyLabelled),
    ...saRows("Full pass (every field), all lines", m.fullPass.all),
    ...saRows("Full pass, ready-labelled lines", m.fullPass.readyLabelled),
    row("Review rate (engine not ready)", m.reviewRate),
    row("Unnecessary review (label ready, engine not)", m.unnecessaryReview),
    row("**False certainty, total** (of all lines)", fc.total),
    row("False certainty — high", fc.high),
    row("False certainty — medium", fc.medium),
    row("False certainty — low", fc.low),
    row("False certainty (of engine-ready lines)", fc.ofEngineReady),
    row("Suppressed ambiguity (of not-ready labels)", fc.suppressedAmbiguity),
    row("Wrong amount on a ready reading (of ready labels)", fc.wrongAmount),
    row("Wrong name on a ready reading (of ready labels)", fc.wrongName),
    row("Note/flags-only mismatch on a ready reading — low, separate (of engine-ready)", fc.detailOnlyLow),
    row("**Fabricated quantity** (of lines with no labelled amount)", m.fabricatedQuantity),
    row("**Cross-dimension** (of lines with a labelled unit or package)", m.crossDimension),
  ];
}

function fieldTable(m: IngredientMetrics): string[] {
  const lines = ["| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |", "|---|---|---|---|---|"];
  for (const f of EXPECT_FIELDS) {
    const a = m.fieldMatch.all[f];
    const r = m.fieldMatch.readyLabelled[f];
    const fmt = (x: Rate) => `${fraction(x)} (${percent(x.rate)})`;
    lines.push(`| ${f} | ${fmt(a.strict)} | ${fmt(a.accepted)} | ${fmt(r.strict)} | ${fmt(r.accepted)} |`);
  }
  return lines;
}

function categoryTable(s: IngredientSplitReport): string[] {
  const lines = ["| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |", "|---|---|---|---|---|---|---|---|"];
  for (const cat of CATEGORIES) {
    const m = s.byCategory[cat];
    if (!m) continue;
    const fc = m.falseCertainty;
    lines.push(`| ${cat} | ${m.cases} | ${fraction(m.corePass.strict)} | ${fraction(m.fullPass.strict)} | ${fraction(m.reviewRate)} | ${fc.high.num}/${fc.medium.num}/${fc.low.num} | ${fraction(m.fabricatedQuantity)} | ${fraction(m.crossDimension)} |`);
  }
  return lines;
}

function pageTable(s: PageSplitReport): string[] {
  const d = s.detection;
  const lines = [
    ...header,
    row("Recipe detection precision", d.precision),
    row("Recipe detection recall", d.recall),
    row("Candidate count matches", s.candidateCountMatch),
    row("Candidate: every field matches (accepted)", s.candidateFullMatch),
    row("Ingredient list exact", s.ingredientListExact),
    row("Expected diagnostics present", s.diagnosticsFound),
    row("retention = not_decided", s.retentionNotDecided),
    row("Readings length = ingredient lines", s.ingredientReadings.lengthMatchesLines),
    "",
    "| Candidate field | Strict | Accepted |",
    "|---|---|---|",
  ];
  const fmt = (x: Rate) => `${fraction(x)} (${percent(x.rate)})`;
  for (const f of PAGE_CANDIDATE_FIELDS) lines.push(`| ${f} | ${fmt(s.fieldMatch[f].strict)} | ${fmt(s.fieldMatch[f].accepted)} |`);
  const r = s.ingredientReadings;
  lines.push("", `Ingredient readings on extracted candidates: ${r.readings} (ready ${r.ready}, needs_review ${r.needs_review}, unsupported ${r.unsupported}, other ${r.other}); extractor errors: ${s.extractorErrors}.`);
  return lines;
}

export interface MarkdownOptions {
  /** Most mismatch rows printed per engine (the JSON report always has all). Default 200. */
  maxMismatchRows?: number;
}

/** Markdown rendering. Deterministic unless `timing` is given (then a non-deterministic section is appended). */
export function renderMarkdown(report: BenchReport, timing?: TimingEntry[], options: MarkdownOptions = {}): string {
  const maxRows = options.maxMismatchRows ?? 200;
  const out: string[] = [];
  out.push(`# Recipe extraction benchmark`, "");
  out.push(`${report.package.name}@${report.package.version} · contract ${report.contract} · split ${report.selection.split}${report.selection.case ? ` · case ${report.selection.case}` : ""}`, "");
  out.push(`Holdout freeze: ${report.freeze.verified ? "verified" : `**NOT VERIFIED** (${report.freeze.problems.length} problem(s))`}`, "");
  out.push("| Corpus file | Entries | SHA-256 |", "|---|---|---|");
  for (const f of report.corpus.files) out.push(`| ${cell(f.path)} | ${f.entries} | \`${f.sha256.slice(0, 16)}…\` |`);
  out.push("");
  for (const e of report.ingredientEngines) {
    out.push(`## Ingredient engine \`${cell(e.engine.id)}\``, "", cell(e.engine.description), "");
    const parts: [string, IngredientSplitReport][] = [["Overall", e.overall]];
    for (const s of SPLITS) if (e.splits[s]) parts.push([s, e.splits[s]!]);
    for (const [name, s] of parts) {
      out.push(`### ${name} — ${s.metrics.cases} lines (${s.metrics.labelReady} ready-labelled, engine errors ${s.metrics.engineErrors})`, "");
      out.push(...metricsTable(s.metrics), "", ...fieldTable(s.metrics), "");
    }
    out.push(`### By category (${report.selection.split})`, "", ...categoryTable(e.overall), "");
    out.push(`### Mismatches (${e.mismatches.length} case(s)${e.mismatches.length > 0 ? `; field rows shown up to ${maxRows}` : ""})`, "");
    if (e.mismatches.length > 0) {
      out.push("| Case | Field | Expected | Got | Accepted | False certainty |", "|---|---|---|---|---|---|");
      let n = 0;
      for (const m of e.mismatches) {
        const fc = m.falseCertainty ? `${m.falseCertainty.kind} (${m.falseCertainty.severity})` : m.detailOnlyMismatch ? "detail only (low)" : "";
        if (m.error) {
          if (n++ < maxRows) out.push(`| ${m.id} | (error) | | ${cell(m.error)} | | |`);
          continue;
        }
        for (const f of m.fields) if (n++ < maxRows) out.push(`| ${m.id} | ${f.field} | ${cell(f.expected)} | ${cell(f.got)} | ${f.accepted ? "yes" : "no"} | ${cell(fc)} |`);
      }
      if (n > maxRows) out.push("", `(${n - maxRows} more row(s) in the JSON report.)`);
      out.push("");
    }
  }
  for (const run of report.pages) {
    const p = run.score;
    out.push(`## Pages (requested ingredient engine: ${run.requestedIngredientEngine === null ? "default" : `\`${cell(run.requestedIngredientEngine)}\``}; reported page engine \`${cell(p.extractor.page)}\`, ingredient engine \`${cell(p.extractor.ingredient)}\`)`, "");
    const parts: [string, PageSplitReport][] = [["Overall", p.overall]];
    for (const s of SPLITS) if (p.splits[s]) parts.push([s, p.splits[s]!]);
    for (const [name, s] of parts) out.push(`### ${name} — ${s.pages} pages, ${s.expectedCandidates} expected candidates`, "", ...pageTable(s), "");
    if (p.mismatches.length > 0) {
      out.push("### Page mismatches", "", "| Page | Candidate | Field | Expected | Got | Accepted |", "|---|---|---|---|---|---|");
      for (const m of p.mismatches) {
        if (m.error) out.push(`| ${m.id} | | (error) | | ${cell(m.error)} | |`);
        if (m.gotCandidates !== m.expectedCandidates) out.push(`| ${m.id} | | candidate count | ${m.expectedCandidates} | ${m.gotCandidates} | no |`);
        if (m.missingDiagnostics.length > 0) out.push(`| ${m.id} | | diagnostics | ${cell(m.missingDiagnostics.join(", "))} | (missing) | no |`);
        if (m.retention !== "not_decided") out.push(`| ${m.id} | | retention | not_decided | ${cell(m.retention)} | no |`);
        for (const f of m.fields) out.push(`| ${m.id} | ${f.candidate} | ${f.field} | ${cell(f.expected)} | ${cell(f.got)} | ${f.accepted ? "yes" : "no"} |`);
      }
      out.push("");
    }
  }
  if (timing && timing.length > 0) {
    out.push("## Runtime (non-deterministic — not part of the JSON report)", "", "| Run | Items | Total ms | ms per item |", "|---|---|---|---|");
    for (const t of timing) out.push(`| ${cell(t.label)} | ${t.items} | ${t.totalMs.toFixed(1)} | ${t.items > 0 ? (t.totalMs / t.items).toFixed(3) : "—"} |`);
    out.push("");
  }
  return out.join("\n");
}

/**
 * Benchmark report: a deterministic JSON document (canonical key order, no timestamps, no absolute
 * paths) and a Markdown rendering. Runtime figures are NOT part of the report; they are passed to the
 * Markdown renderer separately and printed in an explicitly non-deterministic section. Pure.
 */
import { PACKAGE_NAME, PACKAGE_VERSION, SCHEMA_VERSION } from "../src/contract";
import { canonicalJsonPretty } from "./canonical";
import { outcomesMarkdownV2 } from "./archive/report-outcomes-v2";
import type { OutcomesSection as OutcomesSectionV2 } from "./archive/outcomes-v2";
import {
  ACCEPTANCE_SPLITS,
  SEVERE_CODES,
  type AcceptanceSplit,
  type CaseIdKey,
  type EngineOutcomes,
  type OutcomeAggregate,
  type OutcomeSetReport,
  type OutcomesSection,
  type SevereCode,
} from "./outcomes";
import type { IngredientMetrics, IngredientScore, IngredientSplitReport, PageScore, PageSplitReport, StrictAccepted } from "./score";
import { fraction, percent, type Rate } from "./stats";
import { CATEGORIES, EXPECT_FIELDS, PAGE_CANDIDATE_FIELDS, PROVENANCE_KINDS, SPLITS, type Split } from "./types";

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
  /** `all` = dev + holdout (Phase 1); `every` = dev + holdout + holdout2. */
  selection: { split: Split | "all" | "every"; case: string | null; pages: boolean };
  corpus: { files: CorpusFile[]; ingredientCases: Partial<Record<Split, number>>; pages: Partial<Record<Split, number>> };
  freeze: { verified: boolean; problems: string[] };
  ingredientEngines: IngredientScore[];
  /** One page run per requested ingredient engine (null = the extractor's default); empty without --pages. */
  pages: PageRun[];
  /**
   * Outcome scoring: outcomes v3 (bench/outcomes.ts, EVALUATION-PLAN-v3) by default, or the archived
   * outcomes v2 (bench/archive/, EVALUATION-PLAN-v2) for reproductions. Every other section is the same.
   */
  outcomes?: OutcomesSection | OutcomesSectionV2;
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
  /** Omitted → no `outcomes` key in the report. */
  outcomes?: OutcomesSection | OutcomesSectionV2;
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
    outcomes: input.outcomes,
  };
}

/** An archived outcomes v2 section (reproductions with `--scorer outcomes-v2`). */
export const isOutcomesV2 = (s: OutcomesSection | OutcomesSectionV2): s is OutcomesSectionV2 => s.plan === "EVALUATION-PLAN-v2";

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

// --- Outcomes (outcomes v3, EVALUATION-PLAN-v3) ---------------------------------------------------

/** Most case ids printed in one Markdown cell for non-severe classes (the JSON report always has all). */
export const MAX_IDS_PER_CELL = 25;

/** "lo–hi" for a positive count; "≤ hi" for a zero count (the upper bound is the claim, plan §7). */
const claim = (r: Rate) => (r.ci95 === null ? "—" : r.num === 0 ? `≤ ${percent(r.ci95[1])}` : `${percent(r.ci95[0])}–${percent(r.ci95[1])}`);
const orow = (name: string, r: Rate, ids: string) => `| ${cell(name)} | ${fraction(r)} | ${percent(r.rate)} | ${claim(r)} | ${ids} |`;
const brief = (r: Rate) => `${fraction(r)} (${percent(r.rate)}, ${claim(r)})`;

/** Case ids for a cell: every id when `all` (severe counterexamples), else at most MAX_IDS_PER_CELL. */
function idList(ids: string[] | undefined, all = false): string {
  if (!ids || ids.length === 0) return "";
  if (all || ids.length <= MAX_IDS_PER_CELL) return ids.join(", ");
  return `${ids.slice(0, MAX_IDS_PER_CELL).join(", ")} … (+${ids.length - MAX_IDS_PER_CELL} in the JSON report)`;
}

function severeSummary(a: OutcomeAggregate): string {
  const parts = SEVERE_CODES.filter((s) => a.severe[s].num > 0).map((s) => `${s}×${a.severe[s].num}`);
  return parts.length === 0 ? "0" : parts.join(" ");
}

const SEVERE_NAMES: Record<SevereCode, string> = {
  S1: "S1 fabricated amount",
  S2: "S2 wrong amount on a ready reading",
  S3: "S3 cross-dimension",
  S4: "S4 suppressed ambiguity",
  S5: "S5 silent alternative choice",
  S6: "S6 package representation changed",
  S7: "S7 dropped material qualifier",
  S8: "S8 ready on a non-ingredient",
};

function outcomeTable(s: OutcomeSetReport): string[] {
  const o = s.aggregate.outcomes;
  const v = s.aggregate.validity;
  const p = s.aggregate.reviewPrefill;
  const ids = (k: CaseIdKey) => idList(s.caseIds[k]);
  const every = (k: CaseIdKey) => idList(s.caseIds[k], true);
  const json = "(in the JSON report)";
  const lines = [
    "| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |",
    "|---|---|---|---|---|",
    orow("C1 correct ready — core fields (of R)", o.C1, json),
    orow("C1+ fully correct — all fields (of R)", o.C1plus, json),
    orow("C1 with only non-core mismatches — low detail mismatch, not C2 (of R)", o.detailMismatchLow, ids("detailMismatchLow")),
    orow("**C2 incorrect ready** (of N)", o.C2, ""),
    orow("C2 — high false certainty (of N)", o.C2High, every("C2High")),
    orow("C2 — medium false certainty (of N)", o.C2Medium, every("C2Medium")),
    orow("C2 on ready labels (of R)", o.C2OnReady, ""),
    orow("C2 on needs_review labels (of A)", o.C2OnNeedsReview, ""),
    orow("C2 on unsupported labels (of U)", o.C2OnUnsupported, ""),
    orow("C3 unnecessary review (of R)", o.C3, ""),
    orow("C3a useful partial (of R)", o.C3a, ids("C3a")),
    orow("C3b wrong partial — review-only wrong pre-fill (of R)", o.C3b, ids("C3b")),
    orow("C3c abstention (of R)", o.C3c, ids("C3c")),
    orow("C3x food not named, amount read — not defined by the plan (of R)", o.C3x, ids("C3x")),
    orow("C4 unnecessary rejection (of R)", o.C4, ids("C4")),
    orow("C3 + C4 (of R)", o.C3plusC4, ""),
    orow("C5 correct review (of A)", o.C5, ""),
    orow("C5a useful partial (of A)", o.C5a, json),
    orow("C5b wrong partial — review-only wrong pre-fill (of A)", o.C5b, ids("C5b")),
    orow("C5c abstention (of A)", o.C5c, ids("C5c")),
    orow("C5x food not named, amount read — not defined by the plan (of A)", o.C5x, ids("C5x")),
    orow("C6 review rejected (of A)", o.C6, ids("C6")),
    orow("C7 correct rejection (of U)", o.C7, json),
    orow("C8 unsupported reviewed (of U)", o.C8, ids("C8")),
    orow("**CE** engine error, invalid output or nondeterminism — no class, no S code (of N)", o.CE, every("CE")),
    orow("CE dimension: engine error (of N)", v.engineError, every("CEEngineError")),
    orow("CE dimension: output fails the contract validator (of N)", v.invalidOutput, every("CEInvalidOutput")),
    orow("CE dimension: nondeterministic — two parses differ (of N)", v.nondeterministic, every("CENondeterministic")),
  ];
  for (const c of SEVERE_CODES) lines.push(orow(`**${SEVERE_NAMES[c]}** (of N)`, s.aggregate.severe[c], every(c)));
  lines.push(orow("Any severe error (of N)", s.aggregate.anySevere, ""));
  lines.push(orow("Invented option — review-only pre-fill, informational (of N)", p.inventedOption, ids("inventedOption")));
  lines.push(orow("Dropped option — review-only pre-fill, informational (of N)", p.droppedOption, ids("droppedOption")));
  return lines;
}

/** C1 (core fields) and C1+ (all fields) side by side for every set of one engine. */
function headlineTable(e: EngineOutcomes): string[] {
  const out = [
    "| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const split of SPLITS) {
    const s = e.sets[split];
    if (!s) continue;
    const a = s.aggregate;
    const o = a.outcomes;
    out.push(
      `| ${cell(s.status)} | ${a.lines} | ${a.ready}/${a.needsReview}/${a.unsupported} | ${brief(o.C1)} | ${brief(o.C1plus)} | ${o.C2High.num}/${o.C2Medium.num} | ${brief(o.C3plusC4)} | ${fraction(o.C5)} | ${fraction(o.C7)} | ${o.CE.num} | ${severeSummary(a)} |`,
    );
  }
  return out;
}

function ceTable(s: OutcomeSetReport): string[] {
  if (s.ceLines.length === 0) return [];
  const out = [`##### CE lines — ${s.status}`, "", "| Case | Engine error | Nondeterministic | Validator problems |", "|---|---|---|---|"];
  for (const x of s.ceLines) {
    const more = x.problemCount > x.problems.length ? ` … (+${x.problemCount - x.problems.length})` : "";
    out.push(`| ${x.id} | ${cell(x.engineError ?? "")} | ${x.nondeterministic ? "yes" : "no"} | ${cell(x.problems.join("; "))}${more} |`);
  }
  out.push("");
  return out;
}

const OUTCOME_COLUMNS = "| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 high/medium | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |";

function outcomeRow(name: string, a: OutcomeAggregate): string {
  const o = a.outcomes;
  return `| ${cell(name)} | ${a.lines} | ${a.ready}/${a.needsReview}/${a.unsupported} | ${fraction(o.C1)} | ${fraction(o.C1plus)} | ${o.C2High.num}/${o.C2Medium.num} | ${o.C3a.num}/${o.C3b.num}/${o.C3c.num}/${o.C3x.num} | ${o.C4.num} | ${fraction(o.C5)} | ${o.C6.num} | ${fraction(o.C7)} | ${o.C8.num} | ${o.CE.num} | ${severeSummary(a)} |`;
}

function outcomeGroupTable(groups: [string, OutcomeAggregate | undefined][]): string[] {
  const out = [OUTCOME_COLUMNS, "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const [name, a] of groups) if (a) out.push(outcomeRow(name, a));
  return out;
}

/** Pre-registered sensitivity figures of one set — clearly labelled as information only. */
function sensitivityMarkdown(s: OutcomeSetReport): string[] {
  const z = s.sensitivity;
  const out = [`##### Sensitivity — ${s.status} (${z.note})`, ""];
  if (z.excludingDebatable) {
    const d = z.excludingDebatable;
    out.push(
      `A1–A5 recomputed without the pre-registered debatable case(s) ${d.excludedIds.join(", ") || "(none present)"} (${d.lines} lines). The acceptance table above uses every case.`,
      "",
      "| # | Evidence | Status (informational) |",
      "|---|---|---|",
    );
    for (const c of d.acceptance.criteria.slice(0, 5)) out.push(`| ${c.id} | ${cell(Object.entries(c.evidence).map(([k, r]) => `${k} ${brief(r)}`).join("; "))} | ${c.status} |`);
    out.push("");
  }
  const n = z.needsReviewExcludingBareNoAmount;
  out.push(
    `${n.definition}: ${n.excluded} excluded${n.excluded > 0 ? ` (${idList(n.excludedIds, true)})` : ""}, ${n.needsReview} needs_review lines kept — ` +
      `C5 ${brief(n.C5)} · C5a ${fraction(n.C5a)} · C5b ${fraction(n.C5b)} · C5c ${fraction(n.C5c)} · C5x ${fraction(n.C5x)} · C6 ${brief(n.C6)} · S4 ${brief(n.S4)}.`,
    "",
  );
  return out;
}

/** Freeze record file and label file of each acceptance set. */
const FREEZE_FILES: Record<AcceptanceSplit, { name: string; record: string; data: string }> = {
  holdout2: { name: "Holdout-v2", record: "FREEZE-v2.json", data: "holdout-v2.jsonl" },
};

/** The "Outcomes (outcomes v3, EVALUATION-PLAN-v3)" Markdown section. Deterministic. */
export function outcomesMarkdown(section: OutcomesSection): string[] {
  const out: string[] = [];
  const sc = section.scorer;
  out.push(`## Outcomes (${sc.id} ${sc.version}, ${section.plan})`, "");
  out.push(`Scorer: \`${sc.id}\` ${sc.version} for ${sc.plan} · source \`${sc.source}\` SHA-256 ${sc.sha256 ? `\`${sc.sha256}\`` : "(not recorded)"}.`, "");
  out.push(
    "One outcome class per line (EVALUATION-PLAN-v3, carrying EVALUATION-PLAN-v2 §3–§7 except SCORE-01/02); sets are reported separately and never pooled. " +
      `Every rate shows n/N and a Wilson 95% interval (z = ${section.z}); for a zero count the upper bound is the claim. ` +
      "Accepted matching (a case's `accept` values count) is the acceptance basis; strict figures are listed too. R / A / U = lines labelled ready / needs_review / unsupported; N = all lines. " +
      "Every line is parsed twice: validity, engine error and nondeterminism are separate dimensions, and any of them makes the line CE (no class, no S code).",
    "",
  );
  for (const set of ACCEPTANCE_SPLITS) {
    const f = section.freezes[set];
    if (!f) continue;
    const ff = FREEZE_FILES[set];
    out.push(
      f.frozen
        ? `${ff.name} freeze: ${ff.record}${f.frozenAt ? ` (${f.frozenAt})` : ""}${f.sha256 ? `, SHA-256 \`${f.sha256.slice(0, 16)}…\`` : ""} — verified against ${ff.data} before this run.`
        : `${ff.name} freeze: **NOT FROZEN** (no ${ff.record}) — its figures are not acceptance evidence until the labels are checked, adjudicated and frozen.`,
      "",
    );
  }
  out.push("Scorer readings where the plan is silent:", "", ...section.interpretation.map((t) => `- ${t}`), "");
  if (section.engines.length === 0) out.push("(No ingredient engine was scored.)", "");
  for (const e of section.engines) {
    out.push(`### Outcomes — engine \`${cell(e.engine.id)}\``, "", ...headlineTable(e), "");
    for (const split of SPLITS) {
      const s = e.sets[split];
      if (!s) continue;
      const a = s.aggregate;
      out.push(`#### ${s.status} — ${a.lines} lines (R ${a.ready}, A ${a.needsReview}, U ${a.unsupported})`, "");
      out.push(...outcomeTable(s), "");
      out.push(...ceTable(s));
      const st = a.strict;
      out.push(
        `Strict matching: C1 ${brief(st.C1)} · C1+ ${brief(st.C1plus)} · C2 ${brief(st.C2)}. Lines whose class differs under strict matching: ${idList(s.caseIds.strictDiffers) || "none"}.`,
        "",
      );
      const fa = a.fieldAccuracyOnReady;
      out.push(
        "| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |",
        "|---|---|---|",
        `| name | ${brief(fa.name.strict)} | ${brief(fa.name.accepted)} |`,
        `| quantity | ${brief(fa.quantity)} | ${brief(fa.quantity)} |`,
        `| unit | ${brief(fa.unit)} | ${brief(fa.unit)} |`,
        "",
      );
      out.push(`##### By category — ${s.status}`, "", ...outcomeGroupTable(CATEGORIES.map((c) => [c, s.byCategory[c]])), "");
      if (s.bySourceKind) out.push(`##### By source — ${s.status}`, "", ...outcomeGroupTable(PROVENANCE_KINDS.map((k) => [k, s.bySourceKind![k]])), "");
      if (s.acceptance) {
        out.push(
          `##### Acceptance — Gate G2 on ${s.status}, engine \`${cell(e.engine.id)}\``,
          "",
          `Basis: ${s.acceptance.basis}.`,
          "",
          "| # | Criterion | Evidence | Rule | Status |",
          "|---|---|---|---|---|",
        );
        for (const c of s.acceptance.criteria) {
          const ev = Object.entries(c.evidence).map(([k, r]) => `${k} ${brief(r)}`).join("; ") || "—";
          out.push(`| ${c.id} | ${cell(c.criterion)} | ${cell(ev)} | ${cell(c.rule)} | **${c.status}** |`);
        }
        out.push(
          "",
          `A1 (point) and A2–A5 all met: **${s.acceptance.a1ToA5Met ? "yes" : "no"}**. A6 in the scorer (CE = 0): **${s.acceptance.a6ScorerChecksMet ? "met" : "not met"}** (the rest of A6, and A7, are recorded outside the scorer).`,
          "",
        );
      }
      out.push(...sensitivityMarkdown(s));
    }
  }
  return out;
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
  if (report.outcomes) out.push(...(isOutcomesV2(report.outcomes) ? outcomesMarkdownV2(report.outcomes) : outcomesMarkdown(report.outcomes)));
  if (timing && timing.length > 0) {
    out.push("## Runtime (non-deterministic — not part of the JSON report)", "", "| Run | Items | Total ms | ms per item |", "|---|---|---|---|");
    for (const t of timing) out.push(`| ${cell(t.label)} | ${t.items} | ${t.totalMs.toFixed(1)} | ${t.items > 0 ? (t.totalMs / t.items).toFixed(3) : "—"} |`);
    out.push("");
  }
  return out.join("\n");
}

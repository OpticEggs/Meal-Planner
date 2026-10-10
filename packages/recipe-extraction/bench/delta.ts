/**
 * Delta between an outcomes v2 report (the historical holdout-v2 report) and an outcomes v3 report of the
 * same engines and sets: every headline figure is compared — nothing is assumed unchanged — and each
 * change must be explained by a known scorer change (SCORE-01, SCORE-02, the v3 set labels); any other
 * change is reported as UNEXPECTED. The sections outside the outcome scorer (corpus, §9 field scores,
 * pages) are compared whole. Pure `delta`; `main` reads and writes files.
 *
 * Usage: npx tsx bench/delta.ts --old <v2 report.json> --new <v3 report.json> [--out-json f] [--out-md f]
 * Exit codes: 0 no unexpected change; 1 an unexpected change; 2 usage error.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, canonicalJsonPretty } from "./canonical";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const get = (o: unknown, p: string): unknown => p.split(".").reduce<unknown>((x, k) => (isObj(x) ? x[k] : undefined), o);

/** A figure's comparable value: "num/den" for a rate, the value itself otherwise (lists of ids sorted as given). */
function show(v: unknown): string {
  if (v === undefined) return "(absent)";
  if (isObj(v) && typeof v.num === "number" && typeof v.den === "number") return `${v.num}/${v.den}`;
  if (Array.isArray(v)) return v.length === 0 ? "[]" : v.join(", ");
  return typeof v === "string" ? v : JSON.stringify(v);
}

export const DELTA_REASONS = {
  unchanged: "unchanged (verified: same value under v2 and v3)",
  score01: "SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag",
  a6: "SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer",
  setLabel: "v3 labels holdout-v2 as exposed (its acceptance table is historical); the figures are unchanged",
  basis: "v3 acceptance tables carry their basis; holdout-v2's is historical",
  unexpected: "UNEXPECTED — not explained by SCORE-01, SCORE-02 or the v3 set labels",
} as const;

export interface FigureDelta {
  engine: string;
  set: string;
  figure: string;
  old: string;
  new: string;
  changed: boolean;
  reason: string;
}

export interface DeltaReport {
  format: "recipe-extraction-outcomes-delta/v1";
  old: { sha256: string; plan: string };
  new: { sha256: string; plan: string; scorer: unknown };
  /** Report sections outside the outcome scorer, compared whole (canonical JSON). */
  outsideOutcomes: Record<string, "identical" | "differs">;
  figures: FigureDelta[];
  /** Figures only v3 reports (no v2 counterpart), with their values. */
  newFigures: { engine: string; set: string; figure: string; value: string }[];
  summary: { compared: number; unchanged: number; changed: number; unexpected: number; changedByReason: Record<string, number> };
}

const RATE_FIGURES = [
  "C1", "C1plus", "detailMismatchLow", "C2", "C2High", "C2Medium", "C2OnReady", "C2OnNeedsReview", "C2OnUnsupported",
  "C3", "C3a", "C3b", "C3c", "C3x", "C4", "C3plusC4", "C5", "C5a", "C5b", "C5c", "C5x", "C6", "C7", "C8", "CE",
];
const SEVERE = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
const CASE_KEYS = [
  "C1", "C1plus", "detailMismatchLow", "C2High", "C2Medium", "C3a", "C3b", "C3c", "C3x", "C4", "C5a", "C5b", "C5c", "C5x", "C6", "C7", "C8", "CE", ...SEVERE, "strictDiffers",
];
const SENS = ["C5", "C5a", "C5b", "C5c", "C5x", "C6", "S4"];

/** The figures of one engine × set, as [name, old path, new path, reason when changed]. */
function figureMap(set: string): [string, string, string, string][] {
  const f: [string, string, string, string][] = [];
  for (const k of RATE_FIGURES) f.push([`outcomes.${k}`, `aggregate.outcomes.${k}`, `aggregate.outcomes.${k}`, DELTA_REASONS.unexpected]);
  for (const k of SEVERE) f.push([`severe.${k}`, `aggregate.severe.${k}`, `aggregate.severe.${k}`, DELTA_REASONS.unexpected]);
  f.push(["severe.any", "aggregate.anySevere", "aggregate.anySevere", DELTA_REASONS.unexpected]);
  for (const k of ["C1", "C1plus", "C2"]) f.push([`strict.${k}`, `aggregate.strict.${k}`, `aggregate.strict.${k}`, DELTA_REASONS.unexpected]);
  for (const k of ["name.strict", "name.accepted", "quantity", "unit"]) f.push([`fieldAccuracyOnReady.${k}`, `aggregate.fieldAccuracyOnReady.${k}`, `aggregate.fieldAccuracyOnReady.${k}`, DELTA_REASONS.unexpected]);
  for (const k of ["lines", "ready", "needsReview", "unsupported"]) f.push([`count.${k}`, `aggregate.${k}`, `aggregate.${k}`, DELTA_REASONS.unexpected]);
  for (const k of CASE_KEYS) f.push([`caseIds.${k}`, `caseIds.${k}`, `caseIds.${k}`, DELTA_REASONS.unexpected]);
  f.push(["status", "status", "status", set === "holdout2" ? DELTA_REASONS.setLabel : DELTA_REASONS.unexpected]);
  const nOld = "sensitivity.needsReviewExcludingBareFoods";
  const nNew = "sensitivity.needsReviewExcludingBareNoAmount";
  for (const k of ["excluded", "needsReview", "excludedIds", ...SENS]) f.push([`sensitivity(b).${k}`, `${nOld}.${k}`, `${nNew}.${k}`, DELTA_REASONS.score01]);
  if (set === "holdout2") {
    for (const id of ["A1", "A2", "A3", "A4", "A5", "A6", "A7"]) {
      f.push([`acceptance.${id}.status`, `acceptance.criteria.${id}.status`, `acceptance.criteria.${id}.status`, id === "A6" ? DELTA_REASONS.a6 : DELTA_REASONS.unexpected]);
      f.push([`acceptance.${id}.evidence`, `acceptance.criteria.${id}.evidence`, `acceptance.criteria.${id}.evidence`, id === "A6" ? DELTA_REASONS.a6 : DELTA_REASONS.unexpected]);
    }
    f.push(["acceptance.a1ToA5Met", "acceptance.a1ToA5Met", "acceptance.a1ToA5Met", DELTA_REASONS.unexpected]);
    for (const id of ["A1", "A2", "A3", "A4", "A5"]) {
      f.push([`sensitivity(a).${id}.status`, `sensitivity.excludingDebatable.acceptance.criteria.${id}.status`, `sensitivity.excludingDebatable.acceptance.criteria.${id}.status`, DELTA_REASONS.unexpected]);
      f.push([`sensitivity(a).${id}.evidence`, `sensitivity.excludingDebatable.acceptance.criteria.${id}.evidence`, `sensitivity.excludingDebatable.acceptance.criteria.${id}.evidence`, DELTA_REASONS.unexpected]);
    }
    f.push(["sensitivity(a).excludedIds", "sensitivity.excludingDebatable.excludedIds", "sensitivity.excludingDebatable.excludedIds", DELTA_REASONS.unexpected]);
  }
  return f;
}

/** Resolve "acceptance.criteria.A3.status"-style paths (criteria are an array keyed by id). */
function at(setReport: unknown, p: string): unknown {
  const m = /^(.*acceptance)\.criteria\.(A\d)\.(.*)$/.exec(p);
  if (!m) return get(setReport, p);
  const criteria = get(setReport, `${m[1]}.criteria`);
  const c = Array.isArray(criteria) ? criteria.find((x) => isObj(x) && x.id === m[2]) : undefined;
  return get(c, m[3]);
}

function showEvidence(v: unknown): string {
  if (!isObj(v)) return show(v);
  return Object.keys(v).sort().map((k) => `${k} ${show(v[k])}`).join("; ") || "—";
}

/** Group-level aggregates (per category and source) compared whole, rate by rate (num/den). */
function aggregateRates(a: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObj(a)) return out;
  for (const [k, v] of Object.entries(a)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isObj(v) && typeof v.num === "number") out[p] = show(v);
    else if (isObj(v)) Object.assign(out, aggregateRates(v, p));
    else if (typeof v === "number") out[p] = String(v);
  }
  return out;
}
const V3_ONLY_AGGREGATE = /^(validity|reviewPrefill)\./;

export function delta(oldText: string, newText: string): DeltaReport {
  const o = JSON.parse(oldText) as Obj;
  const n = JSON.parse(newText) as Obj;
  const sha = (t: string) => createHash("sha256").update(t).digest("hex");
  const outsideOutcomes: DeltaReport["outsideOutcomes"] = {};
  for (const k of ["schema", "package", "contract", "selection", "corpus", "freeze", "ingredientEngines", "pages"]) outsideOutcomes[k] = canonicalJson(o[k] ?? null) === canonicalJson(n[k] ?? null) ? "identical" : "differs";

  const figures: FigureDelta[] = [];
  const newFigures: DeltaReport["newFigures"] = [];
  const push = (engine: string, set: string, figure: string, ov: string, nv: string, reason: string) => {
    const changed = ov !== nv;
    figures.push({ engine, set, figure, old: ov, new: nv, changed, reason: changed ? reason : DELTA_REASONS.unchanged });
  };
  const oEngines = (get(o, "outcomes.engines") as Obj[]) ?? [];
  const nEngines = (get(n, "outcomes.engines") as Obj[]) ?? [];
  for (const oe of oEngines) {
    const id = String(get(oe, "engine.id"));
    const ne = nEngines.find((e) => get(e, "engine.id") === id);
    for (const set of Object.keys((oe.sets as Obj) ?? {})) {
      const os = get(oe, `sets.${set}`);
      const ns = ne ? get(ne, `sets.${set}`) : undefined;
      if (ns === undefined) {
        push(id, set, "set", "present", "(absent)", DELTA_REASONS.unexpected);
        continue;
      }
      for (const [name, op, np, reason] of figureMap(set)) {
        const ov = at(os, op);
        const nv = at(ns, np);
        const isEvidence = name.endsWith(".evidence");
        push(id, set, name, isEvidence ? showEvidence(ov) : show(ov), isEvidence ? showEvidence(nv) : show(nv), reason);
      }
      // Per category / per source aggregates: every rate and count compared (v3-only dimensions listed apart).
      for (const group of ["byCategory", "bySourceKind"]) {
        const og = (get(os, group) as Obj | null) ?? {};
        const ng = (get(ns, group) as Obj | null) ?? {};
        for (const key of [...new Set([...Object.keys(og), ...Object.keys(ng)])].sort()) {
          const or = aggregateRates(og[key]);
          const nr = aggregateRates(ng[key]);
          const keys = [...new Set([...Object.keys(or), ...Object.keys(nr)])].filter((k) => !V3_ONLY_AGGREGATE.test(k)).sort();
          const diff = keys.filter((k) => or[k] !== nr[k]);
          push(id, set, `${group}.${key}`, `${keys.length} figures`, diff.length === 0 ? `${keys.length} figures` : `${diff.length} differ: ${diff.join(", ")}`, DELTA_REASONS.unexpected);
        }
      }
      // Figures only v3 reports.
      for (const [name, p] of [
        ["validity.engineError", "aggregate.validity.engineError"],
        ["validity.invalidOutput", "aggregate.validity.invalidOutput"],
        ["validity.nondeterministic", "aggregate.validity.nondeterministic"],
        ["validity.classified", "aggregate.validity.classified"],
        ["reviewPrefill.inventedOption", "aggregate.reviewPrefill.inventedOption"],
        ["reviewPrefill.droppedOption", "aggregate.reviewPrefill.droppedOption"],
        ["caseIds.inventedOption", "caseIds.inventedOption"],
        ["caseIds.droppedOption", "caseIds.droppedOption"],
        ["ceLines", "ceLines"],
        ["acceptance.a6ScorerChecksMet", "acceptance.a6ScorerChecksMet"],
        ["acceptance.basis", "acceptance.basis"],
      ] as const) {
        const v = get(ns, p);
        if (v !== undefined) newFigures.push({ engine: id, set, figure: name, value: name === "ceLines" ? `${(v as unknown[]).length} line(s)` : show(v) });
      }
    }
  }
  const changed = figures.filter((f) => f.changed);
  const changedByReason: Record<string, number> = {};
  for (const f of changed) changedByReason[f.reason] = (changedByReason[f.reason] ?? 0) + 1;
  return {
    format: "recipe-extraction-outcomes-delta/v1",
    old: { sha256: sha(oldText), plan: String(get(o, "outcomes.plan")) },
    new: { sha256: sha(newText), plan: String(get(n, "outcomes.plan")), scorer: get(n, "outcomes.scorer") ?? null },
    outsideOutcomes,
    figures,
    newFigures,
    summary: {
      compared: figures.length,
      unchanged: figures.length - changed.length,
      changed: changed.length,
      unexpected: changed.filter((f) => f.reason === DELTA_REASONS.unexpected).length,
      changedByReason,
    },
  };
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const HEADLINE = [
  "outcomes.C1", "outcomes.C1plus", "outcomes.C2", "outcomes.C2High", "outcomes.C2Medium", "outcomes.C3plusC4", "outcomes.C3a", "outcomes.C3b", "outcomes.C3c", "outcomes.C3x", "outcomes.C4",
  "outcomes.C5", "outcomes.C5a", "outcomes.C5b", "outcomes.C5c", "outcomes.C5x", "outcomes.C6", "outcomes.C7", "outcomes.C8", "outcomes.CE",
  ...SEVERE.map((s) => `severe.${s}`),
  "fieldAccuracyOnReady.name.accepted", "fieldAccuracyOnReady.quantity", "fieldAccuracyOnReady.unit",
  "acceptance.A1.status", "acceptance.A2.status", "acceptance.A3.status", "acceptance.A4.status", "acceptance.A5.status", "acceptance.A6.status", "acceptance.A7.status",
  "sensitivity(a).A1.status", "sensitivity(a).A3.status", "sensitivity(a).A4.status",
  "sensitivity(b).excluded", "sensitivity(b).needsReview", "sensitivity(b).C5", "sensitivity(b).C5a", "sensitivity(b).C5c", "sensitivity(b).C6", "sensitivity(b).S4",
];

/** Markdown: the headline figures per engine and set, every change with its reason, then the counts. */
export function deltaMarkdown(d: DeltaReport): string {
  const out: string[] = [];
  const engines = [...new Set(d.figures.map((f) => f.engine))];
  out.push(`Old report SHA-256 \`${d.old.sha256}\` (${d.old.plan}); new report SHA-256 \`${d.new.sha256}\` (${d.new.plan}).`, "");
  out.push("| Section outside the outcome scorer | v2 vs v3 |", "|---|---|", ...Object.entries(d.outsideOutcomes).map(([k, v]) => `| ${k} | ${v} |`), "");
  for (const e of engines) {
    const sets = [...new Set(d.figures.filter((f) => f.engine === e).map((f) => f.set))];
    out.push(`### \`${e}\``, "", `| Figure | ${sets.map((s) => `${s} v2 → v3`).join(" | ")} |`, `|---|${sets.map(() => "---").join("|")}|`);
    for (const name of HEADLINE) {
      const cells = sets.map((s) => {
        const f = d.figures.find((x) => x.engine === e && x.set === s && x.figure === name);
        if (!f) return "—";
        return f.changed ? `**${cell(f.old)} → ${cell(f.new)}**` : `${cell(f.new)} (same)`;
      });
      if (cells.some((c) => c !== "—")) out.push(`| ${name} | ${cells.join(" | ")} |`);
    }
    out.push("");
  }
  const changed = d.figures.filter((f) => f.changed);
  out.push(`#### Every changed figure (${changed.length} of ${d.figures.length} compared)`, "", "| Engine | Set | Figure | v2 | v3 | Why |", "|---|---|---|---|---|---|");
  for (const f of changed) out.push(`| ${f.engine} | ${f.set} | ${f.figure} | ${cell(f.old)} | ${cell(f.new)} | ${cell(f.reason)} |`);
  out.push("", `Unexpected changes: **${d.summary.unexpected}**.`, "");
  out.push("#### Figures only v3 reports", "", "| Engine | Set | Figure | v3 |", "|---|---|---|---|");
  for (const f of d.newFigures) out.push(`| ${f.engine} | ${f.set} | ${f.figure} | ${cell(f.value)} |`);
  out.push("");
  return out.join("\n");
}

export function main(argv: string[]): number {
  const arg = (k: string) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const oldFile = arg("--old");
  const newFile = arg("--new");
  if (!oldFile || !newFile) {
    process.stderr.write("Usage: npx tsx bench/delta.ts --old <v2 report.json> --new <v3 report.json> [--out-json f] [--out-md f]\n");
    return 2;
  }
  const d = delta(readFileSync(oldFile, "utf8"), readFileSync(newFile, "utf8"));
  const outJson = arg("--out-json");
  const outMd = arg("--out-md");
  if (outJson) writeFileSync(outJson, canonicalJsonPretty(d));
  if (outMd) writeFileSync(outMd, deltaMarkdown(d));
  process.stdout.write(`${d.summary.compared} figures compared: ${d.summary.unchanged} unchanged, ${d.summary.changed} changed (${d.summary.unexpected} unexpected)\n`);
  for (const [r, k] of Object.entries(d.summary.changedByReason)) process.stdout.write(`  ${k} × ${r}\n`);
  return d.summary.unexpected === 0 ? 0 : 1;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exitCode = main(process.argv.slice(2));

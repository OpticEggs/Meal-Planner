/**
 * The Markdown rendering of an outcomes v2 section (EVALUATION-PLAN-v2), moved here unchanged from
 * `bench/report.ts` at `8131fe0` when the live report switched to outcomes v3. Used only by
 * `--scorer outcomes-v2` runs (reproductions of the historical report). Pure.
 */
import { SEVERE_CODES, type CaseIdKey, type OutcomeAggregate, type OutcomeSetReport, type OutcomesSection } from "./outcomes-v2";
import { fraction, percent, type Rate } from "./v2/bench/stats";
import { CATEGORIES, PROVENANCE_KINDS, SPLITS } from "./v2/bench/types";

const cell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/** Most case ids printed in one Markdown cell (the JSON report always has all). */
export const MAX_IDS_PER_CELL = 25;

/** "lo–hi" for a positive count; "≤ hi" for a zero count (the upper bound is the claim, plan §7). */
const claim = (r: Rate) => (r.ci95 === null ? "—" : r.num === 0 ? `≤ ${percent(r.ci95[1])}` : `${percent(r.ci95[0])}–${percent(r.ci95[1])}`);
const orow = (name: string, r: Rate, ids: string) => `| ${cell(name)} | ${fraction(r)} | ${percent(r.rate)} | ${claim(r)} | ${ids} |`;
const brief = (r: Rate) => `${fraction(r)} (${percent(r.rate)}, ${claim(r)})`;

function idList(ids: string[] | undefined): string {
  if (!ids || ids.length === 0) return "";
  const shown = ids.slice(0, MAX_IDS_PER_CELL).join(", ");
  return ids.length > MAX_IDS_PER_CELL ? `${shown} … (+${ids.length - MAX_IDS_PER_CELL} in the JSON report)` : shown;
}

function severeSummary(a: OutcomeAggregate): string {
  const parts = SEVERE_CODES.filter((s) => a.severe[s].num > 0).map((s) => `${s}×${a.severe[s].num}`);
  return parts.length === 0 ? "0" : parts.join(" ");
}

function outcomeTable(s: OutcomeSetReport): string[] {
  const o = s.aggregate.outcomes;
  const ids = (k: CaseIdKey) => idList(s.caseIds[k]);
  const json = "(in the JSON report)";
  const lines = [
    "| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |",
    "|---|---|---|---|---|",
    orow("C1 correct ready (of R)", o.C1, json),
    orow("C1+ fully correct (of R)", o.C1plus, json),
    orow("C1 with only non-core mismatches — low detail mismatch, not C2 (of R)", o.detailMismatchLow, ids("detailMismatchLow")),
    orow("**C2 incorrect ready** (of N)", o.C2, ""),
    orow("C2 — high false certainty (of N)", o.C2High, ids("C2High")),
    orow("C2 — medium false certainty (of N)", o.C2Medium, ids("C2Medium")),
    orow("C2 on ready labels (of R)", o.C2OnReady, ""),
    orow("C2 on needs_review labels (of A)", o.C2OnNeedsReview, ""),
    orow("C2 on unsupported labels (of U)", o.C2OnUnsupported, ""),
    orow("C3 unnecessary review (of R)", o.C3, ""),
    orow("C3a useful partial (of R)", o.C3a, ids("C3a")),
    orow("C3b wrong partial (of R)", o.C3b, ids("C3b")),
    orow("C3c abstention (of R)", o.C3c, ids("C3c")),
    orow("C3x food not named, amount read — not defined by the plan (of R)", o.C3x, ids("C3x")),
    orow("C4 unnecessary rejection (of R)", o.C4, ids("C4")),
    orow("C3 + C4 (of R)", o.C3plusC4, ""),
    orow("C5 correct review (of A)", o.C5, ""),
    orow("C5a useful partial (of A)", o.C5a, json),
    orow("C5b wrong partial (of A)", o.C5b, ids("C5b")),
    orow("C5c abstention (of A)", o.C5c, ids("C5c")),
    orow("C5x food not named, amount read — not defined by the plan (of A)", o.C5x, ids("C5x")),
    orow("C6 review rejected (of A)", o.C6, ids("C6")),
    orow("C7 correct rejection (of U)", o.C7, json),
    orow("C8 unsupported reviewed (of U)", o.C8, ids("C8")),
    orow("CE engine error or non-contract status (of N)", o.CE, ids("CE")),
  ];
  const sev: Record<string, string> = {
    S1: "S1 fabricated amount",
    S2: "S2 wrong amount on a ready reading",
    S3: "S3 cross-dimension",
    S4: "S4 suppressed ambiguity",
    S5: "S5 silent alternative choice",
    S6: "S6 package representation changed",
    S7: "S7 dropped material qualifier",
    S8: "S8 ready on a non-ingredient",
  };
  for (const c of SEVERE_CODES) lines.push(orow(`**${sev[c]}** (of N)`, s.aggregate.severe[c], ids(c)));
  lines.push(orow("Any severe error (of N)", s.aggregate.anySevere, ""));
  return lines;
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
      `A1–A5 recomputed without the pre-registered debatable case(s) ${d.excludedIds.join(", ") || "(none present)"} (${d.lines} lines). The acceptance decision above uses every case.`,
      "",
      "| # | Evidence | Status (informational) |",
      "|---|---|---|",
    );
    for (const c of d.acceptance.criteria.slice(0, 5)) out.push(`| ${c.id} | ${cell(Object.entries(c.evidence).map(([k, r]) => `${k} ${brief(r)}`).join("; "))} | ${c.status} |`);
    out.push("");
  }
  const n = z.needsReviewExcludingBareFoods;
  out.push(
    `needs_review labels without bare foods with no amount (only quantity_missing and/or seasoning tags): ${n.excluded} excluded${n.excluded > 0 ? ` (${idList(n.excludedIds)})` : ""}, ${n.needsReview} kept — ` +
      `C5 ${brief(n.C5)} · C5a ${fraction(n.C5a)} · C5b ${fraction(n.C5b)} · C5c ${fraction(n.C5c)} · C5x ${fraction(n.C5x)} · C6 ${brief(n.C6)} · S4 ${brief(n.S4)}.`,
    "",
  );
  return out;
}

/** The "Outcomes (EVALUATION-PLAN-v2)" Markdown section. Deterministic. */
export function outcomesMarkdownV2(section: OutcomesSection): string[] {
  const out: string[] = [];
  out.push("## Outcomes (EVALUATION-PLAN-v2)", "");
  out.push(
    "One outcome class per line (`docs/table/recipe-extraction/EVALUATION-PLAN-v2.md` §3–§7); sets are reported separately and never pooled. " +
      `Every rate shows n/N and a Wilson 95% interval (z = ${section.z}); for a zero count the upper bound is the claim. ` +
      "Accepted matching (a case's `accept` values count) is the acceptance basis; strict figures are listed too. R / A / U = lines labelled ready / needs_review / unsupported; N = all lines.",
    "",
  );
  if (section.holdout2Freeze) {
    const f = section.holdout2Freeze;
    out.push(
      f.frozen
        ? `Holdout-v2 freeze: FREEZE-v2.json${f.frozenAt ? ` (${f.frozenAt})` : ""}${f.sha256 ? `, SHA-256 \`${f.sha256.slice(0, 16)}…\`` : ""} — verified against holdout-v2.jsonl before this run.`
        : "Holdout-v2 freeze: **NOT FROZEN** (no FREEZE-v2.json) — holdout-v2 figures are not acceptance evidence until the labels are checked, adjudicated and frozen.",
      "",
    );
  }
  out.push("Scorer readings where the plan is silent:", "", ...section.interpretation.map((t) => `- ${t}`), "");
  if (section.engines.length === 0) out.push("(No ingredient engine was scored.)", "");
  for (const e of section.engines) {
    out.push(`### Outcomes — engine \`${cell(e.engine.id)}\``, "");
    for (const split of SPLITS) {
      const s = e.sets[split];
      if (!s) continue;
      const a = s.aggregate;
      out.push(`#### ${s.status} — ${a.lines} lines (R ${a.ready}, A ${a.needsReview}, U ${a.unsupported})`, "");
      out.push(...outcomeTable(s), "");
      const st = a.strict;
      out.push(
        `Strict matching: C1 ${brief(st.C1)} · C1+ ${brief(st.C1plus)} · C2 ${brief(st.C2)}. Lines whose class differs under strict matching: ${idList(s.caseIds.strictDiffers) || "none"}.`,
        "",
      );
      const fa = a.fieldAccuracyOnReady;
      out.push(
        "| Field accuracy on R (any engine status) | Strict | Accepted |",
        "|---|---|---|",
        `| name | ${brief(fa.name.strict)} | ${brief(fa.name.accepted)} |`,
        `| quantity | ${brief(fa.quantity)} | ${brief(fa.quantity)} |`,
        `| unit | ${brief(fa.unit)} | ${brief(fa.unit)} |`,
        "",
      );
      out.push(`##### By category — ${s.status}`, "", ...outcomeGroupTable(CATEGORIES.map((c) => [c, s.byCategory[c]])), "");
      if (s.bySourceKind) out.push(`##### By source — ${s.status}`, "", ...outcomeGroupTable(PROVENANCE_KINDS.map((k) => [k, s.bySourceKind![k]])), "");
      if (s.acceptance) {
        out.push(`##### Acceptance — Gate G2 on ${s.status}, engine \`${cell(e.engine.id)}\``, "", "| # | Criterion | Evidence | Rule | Status |", "|---|---|---|---|---|");
        for (const c of s.acceptance.criteria) {
          const ev = Object.entries(c.evidence).map(([k, r]) => `${k} ${brief(r)}`).join("; ") || "—";
          out.push(`| ${c.id} | ${cell(c.criterion)} | ${cell(ev)} | ${cell(c.rule)} | **${c.status}** |`);
        }
        out.push("", `A1 (point) and A2–A5 all met: **${s.acceptance.a1ToA5Met ? "yes" : "no"}** (A6/A7 are recorded outside the scorer).`, "");
      }
      out.push(...sensitivityMarkdown(s));
    }
  }
  return out;
}

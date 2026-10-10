import type pg from "pg";
import { Q } from "@/domain/exact";
import { parseAmount, perServing } from "@/domain/quantity";
import { normalizeUnit } from "@/domain/units";
import { slug } from "@/domain/recipes/rebase";
import { isHouseholdSeasoning } from "@/domain/groceries/seasonings";
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";
import type { DraftLine } from "@/domain/recipes/import";

/**
 * READ-ONLY audit of legacy recipe quantities (EQ, D135). It never writes: it runs inside a READ ONLY
 * transaction that is always rolled back, and it proposes nothing it carries out. Any correction it
 * describes would be a NEW recipe version made by a member (or by a separately authorized tool); history,
 * the version an accepted dinner uses, and purchasing records are never rewritten.
 *
 * For every ingredient row saved before exact quantities (quantity_basis = 'legacy') it reports whether the
 * stored decimal may be a rounded approximation, and — separately — what source evidence exists to recover
 * the exact amount: the import draft the version was confirmed from (its exact amount and servings), the same
 * row in an earlier version that has such evidence, or only the original line text with no servings. A
 * pattern match ("0.6667 looks like 2/3") is reported as a pattern, never as evidence.
 *
 * It also lists the two seasoning cases the descriptor fix (RIO-02) cannot repair by itself: an imported row
 * stored as plain salt/pepper whose own source line names a specialty seasoning, and an import that left such
 * a line out before the fix.
 */

/** Only a database on this machine, unless the caller says --remote-read-only on purpose. */
export function auditTargetAllowed(url: string, remoteReadOnly: boolean): { ok: true } | { ok: false; reason: string } {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { ok: false, reason: "DATABASE_URL is missing or not a postgres:// URL" };
  }
  if (["127.0.0.1", "localhost", "::1", "[::1]"].includes(host) || remoteReadOnly) return { ok: true };
  return { ok: false, reason: `Refusing ${host}: this audit runs against a local disposable copy. Pass --remote-read-only only if you mean to read a remote database.` };
}

export type Risk = "short_decimal" | "rounded_4dp" | "rounded_12dp" | "long_decimal";
export type Evidence =
  | { kind: "import_draft"; draftId: string; line: string; amount: string; servings: number; matches: "exact" | "4dp_half_up" | "12dp_half_up" | "12dp_down" }
  | { kind: "earlier_version"; versionNo: number; amount: string; servings: number; via: "lineage" | "same_row" }
  | { kind: "source_line_only"; line: string; note: string }
  | { kind: "conflicting"; detail: string }
  | { kind: "missing" };

export interface LegacyRowFinding {
  householdId: string;
  recipeId: string;
  versionId: string;
  versionNo: number;
  title: string;
  provenance: string;
  current: boolean;
  componentKey: string;
  ingredientKey: string;
  unit: string;
  quantity: string;
  risk: Risk;
  /** A small fraction the decimal is consistent with — a pattern, not evidence. */
  pattern: string | null;
  evidence: Evidence;
  recoverable: boolean;
  scheduledDinners: { eventId: string; cookNight: string | null; weekId: string }[];
  /** What a separately authorized correction could do (never done here). */
  proposal: string | null;
}

export interface SeasoningFinding {
  kind: "stored_as_plain_seasoning" | "left_out_before_fix";
  householdId: string;
  recipeId: string | null;
  versionId: string | null;
  draftId: string | null;
  title: string;
  line: string;
  readsNowAs: string;
  evidence: "source_line";
}

export interface LegacyAudit {
  readOnly: true;
  generatedAt: string;
  scope: { householdId: string | null };
  summary: {
    legacyRows: number;
    byRisk: Record<Risk, number>;
    recoverable: number;
    sourceLineOnly: number;
    missing: number;
    conflicting: number;
    seasoningFindings: number;
    versionsOnScheduledDinners: number;
  };
  rows: LegacyRowFinding[];
  seasonings: SeasoningFinding[];
}

const placesOf = (q: string) => (q.includes(".") ? q.split(".")[1].replace(/0+$/, "").length : 0);

function riskOf(q: string): Risk {
  const p = placesOf(q);
  if (p <= 3) return "short_decimal";
  if (p === 4) return "rounded_4dp";
  if (p === 12) return "rounded_12dp";
  return "long_decimal";
}

/** The simplest fraction (denominator ≤ 48) that rounds to `q` at its own number of places, if any. */
function patternOf(q: string): string | null {
  const p = placesOf(q);
  if (p <= 3) return null;
  const v = Q.of(q);
  const half = Q.frac(5, 1).div(Q.of(`1${"0".repeat(p + 1)}`)); // half a unit in the last place
  for (let d = 2; d <= 48; d++) {
    const n = v.mul(d).roundHalfUp();
    if (n <= BigInt(0)) continue;
    const f = Q.frac(n, d);
    const diff = f.minus(v);
    if (diff.lt(half) && diff.gt(Q.zero.minus(half))) return f.toString();
  }
  return null;
}

/** How a stored decimal relates to an exact per-serving value, if it is one of the roundings Table has used. */
function storedAs(stored: string, amount: string, servings: number): "exact" | "4dp_half_up" | "12dp_half_up" | "12dp_down" | null {
  const r = parseAmount(amount);
  if (!r) return null;
  const v = Q.frac(r.n, r.d).div(servings);
  const s = Q.of(stored);
  if (s.eq(v)) return "exact";
  if (s.eq(Q.of(v.toDecimal(4)))) return "4dp_half_up";
  if (s.eq(Q.of(v.toDecimal(12)))) return "12dp_half_up";
  const scale = Q.of(`1${"0".repeat(12)}`);
  if (perServing(amount, servings)?.value === stored || s.eq(Q.frac(v.mul(scale).floor()).div(scale))) return "12dp_down";
  return null;
}

export async function auditLegacyQuantities(c: pg.ClientBase, opts: { householdId?: string | null; now?: Date } = {}): Promise<LegacyAudit> {
  const hh = opts.householdId ?? null;
  const seasoningsOut: SeasoningFinding[] = [];
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const rows = (await c.query(
      `SELECT v.household_id, v.recipe_id, v.id AS version_id, v.version_no, v.title, v.provenance, v.import_draft_id, (r.current_version_id = v.id) AS current,
              ri.id AS row_id, ri.source_row_id, ri.component_key, ri.ingredient_key, ri.unit, ri.quantity::text AS quantity, ri.note, ri.quantity_basis, ri.exact_amount, ri.exact_servings
         FROM recipe_ingredients ri JOIN recipe_versions v ON v.id = ri.recipe_version_id JOIN recipes r ON r.id = v.recipe_id
        WHERE ($1::uuid IS NULL OR v.household_id = $1)
        ORDER BY v.household_id, v.recipe_id, v.version_no, ri.sort, ri.ingredient_key`,
      [hh],
    )).rows;
    const drafts = new Map<string, { servings: number | null; lines: DraftLine[] }>(
      (await c.query("SELECT id, servings, lines FROM recipe_import_drafts WHERE ($1::uuid IS NULL OR household_id = $1)", [hh])).rows.map((d) => [d.id, { servings: d.servings, lines: d.lines ?? [] }]),
    );
    const dinners = (await c.query(
      `SELECT e.id, e.recipe_version_id, e.cook_night::text AS cook_night, e.week_id FROM cooking_events e
        WHERE e.status = 'scheduled' AND ($1::uuid IS NULL OR e.household_id = $1)`,
      [hh],
    )).rows;

    const findings: LegacyRowFinding[] = [];
    // EQR: a row's evidence is never borrowed from a look-alike. Evidence by row id (for verified lineage), and per
    // recipe + row identity the evidence of the latest earlier version that had that identity — used for rows of
    // an earlier release (no lineage) only when it is unambiguous: one recoverable value and no more same-looking
    // rows than that version had.
    const byRow = new Map<string, Evidence>();
    type Seen = { versionNo: number; values: Set<string>; unrecoverable: boolean; count: number };
    const known = new Map<string, Seen>();
    const identOf = (r: { recipe_id: string; component_key: string; ingredient_key: string; unit: string; quantity: string }) =>
      `${r.recipe_id}|${r.component_key}|${r.ingredient_key}|${r.unit}|${Q.of(r.quantity).toString()}`;
    const countIn = new Map<string, number>(); // version id + identity → rows
    for (const r of rows) countIn.set(`${r.version_id}|${identOf(r)}`, (countIn.get(`${r.version_id}|${identOf(r)}`) ?? 0) + 1);
    let pending = new Map<string, Seen>();
    let pendingVersion: string | null = null;
    const flush = () => {
      for (const [k, v] of pending) known.set(k, v);
      pending = new Map();
    };
    for (const r of rows) {
      if (r.version_id !== pendingVersion) {
        flush();
        pendingVersion = r.version_id;
      }
      const ident = identOf(r);
      let evidence: Evidence = { kind: "missing" };
      const draft = r.import_draft_id ? drafts.get(r.import_draft_id) : undefined;
      if (draft) {
        const candidates = draft.lines.filter((l) => l.decision?.use && slug(l.decision.name) === r.ingredient_key && normalizeUnit(l.decision.unit) === r.unit);
        const fits = draft.servings
          ? candidates.map((l) => ({ l, how: storedAs(r.quantity, (l.decision as { quantity: string }).quantity, draft.servings!) })).filter((x) => x.how)
          : [];
        const amounts = [...new Set(fits.map((x) => { const a = parseAmount((x.l.decision as { quantity: string }).quantity)!; return Q.frac(a.n, a.d).toString(); }))];
        if (amounts.length === 1) {
          evidence = { kind: "import_draft", draftId: r.import_draft_id, line: fits[0].l.raw, amount: amounts[0], servings: draft.servings!, matches: fits[0].how! };
        } else if (amounts.length > 1) {
          evidence = { kind: "conflicting", detail: `Lines ${fits.map((x) => `"${x.l.raw}"`).join(" and ")} of the import draft all divide into the stored ${r.quantity}; which one this row came from is unknown` };
        } else if (candidates.length) {
          evidence = { kind: "conflicting", detail: `The import draft has ${candidates.length} line(s) for ${r.ingredient_key} in ${r.unit}, but none divides into the stored ${r.quantity}${draft.servings ? "" : " (the draft records no servings)"}` };
        }
      }
      if (r.quantity_basis === "exact" && r.exact_amount && r.exact_servings) {
        // AUD-01: an exact row is its own evidence — the amount a member (or a confirmed import) actually chose; it is
        // never reported, only passed on to rows copied from it. What it came from is history, not its amount: a member
        // who changed 2-for-3 to 1/2 a serving meant 1/2.
        evidence = { kind: "earlier_version", versionNo: r.version_no, amount: Q.of(r.exact_amount).toString(), servings: r.exact_servings, via: "lineage" };
      } else if (evidence.kind === "missing" && r.source_row_id) {
        // Verified lineage: the row it came from. Lineage proves ancestry, not that the source's amount still applies —
        // the source's evidence carries over only if it still gives this row's stored decimal.
        const src = byRow.get(r.source_row_id);
        const srcVersion = rows.find((x) => x.row_id === r.source_row_id)?.version_no;
        if (src?.kind === "import_draft" || src?.kind === "earlier_version") {
          const versionNo = src.kind === "import_draft" ? srcVersion! : src.versionNo;
          evidence = storedAs(r.quantity, src.amount, src.servings)
            ? { kind: "earlier_version", versionNo, amount: src.amount, servings: src.servings, via: "lineage" }
            : { kind: "conflicting", detail: `It comes from a row of version ${srcVersion} whose evidence is ${src.amount} for ${src.servings} servings, which does not give the stored ${r.quantity}; the amount was changed since, so that evidence no longer applies` };
        } else if (src) evidence = src;
      } else if (evidence.kind === "missing") {
        const earlier = known.get(ident);
        if (earlier) {
          const here = countIn.get(`${r.version_id}|${ident}`) ?? 0;
          if (earlier.values.size === 1 && !earlier.unrecoverable && here <= earlier.count) {
            const [amount, servings] = [...earlier.values][0].split("|");
            evidence = { kind: "earlier_version", versionNo: earlier.versionNo, amount, servings: Number(servings), via: "same_row" };
          } else {
            evidence = { kind: "conflicting", detail: `Version ${earlier.versionNo} has ${earlier.count} row(s) like this (${earlier.values.size} recoverable value(s)) and this version has ${here}; which earlier row each came from is unknown` };
          }
        }
      }
      if (evidence.kind === "missing" && typeof r.note === "string" && r.note.startsWith("From: ")) {
        evidence = { kind: "source_line_only", line: r.note.slice(6), note: "The original line is kept, but not the servings it was divided by" };
      }
      byRow.set(r.row_id, evidence);
      const seen = pending.get(ident) ?? { versionNo: r.version_no, values: new Set<string>(), unrecoverable: false, count: 0 };
      seen.count++;
      if (evidence.kind === "import_draft") seen.values.add(`${evidence.amount}|${evidence.servings}`);
      else if (evidence.kind === "earlier_version") {
        seen.values.add(`${evidence.amount}|${evidence.servings}`);
        seen.versionNo = evidence.versionNo;
      } else seen.unrecoverable = true;
      pending.set(ident, seen);

      // Seasoning identity lost (any basis): stored as plain salt/pepper while its own source line reads as something else now.
      if (typeof r.note === "string" && r.note.startsWith("From: ") && isHouseholdSeasoning(r.ingredient_key.replace(/_/g, " "))) {
        const now = parseIngredientLine(r.note.slice(6));
        if (now.status !== "omitted" && now.name && slug(now.name) !== r.ingredient_key) {
          seasoningsOut.push({
            kind: "stored_as_plain_seasoning", householdId: r.household_id, recipeId: r.recipe_id, versionId: r.version_id, draftId: r.import_draft_id ?? null,
            title: r.title, line: r.note.slice(6), readsNowAs: now.name, evidence: "source_line",
          });
        }
      }
      if (r.quantity_basis !== "legacy") continue;
      const recoverable = evidence.kind === "import_draft" || evidence.kind === "earlier_version";
      const risk = riskOf(r.quantity);
      findings.push({
        householdId: r.household_id, recipeId: r.recipe_id, versionId: r.version_id, versionNo: r.version_no, title: r.title, provenance: r.provenance, current: r.current,
        componentKey: r.component_key, ingredientKey: r.ingredient_key, unit: r.unit, quantity: r.quantity, risk, pattern: patternOf(r.quantity), evidence, recoverable,
        scheduledDinners: dinners.filter((d) => d.recipe_version_id === r.version_id).map((d) => ({ eventId: d.id, cookNight: d.cook_night, weekId: d.week_id })),
        proposal: recoverable && risk !== "short_decimal"
          ? `A new version of "${r.title}" could store ${r.ingredient_key} as ${(evidence as { amount: string }).amount} ${r.unit} for ${(evidence as { servings: number }).servings} servings (exact). Version ${r.version_no} and any dinner already on it stay as they are unless a member chooses the new version.`
          : null,
      });
    }

    // Imports confirmed before the descriptor fix that left a specialty seasoning out.
    const confirmed = (await c.query(
      `SELECT d.id, d.household_id, d.title, d.lines, v.id AS version_id, v.recipe_id FROM recipe_import_drafts d LEFT JOIN recipe_versions v ON v.id = d.confirmed_version_id
        WHERE d.status = 'confirmed' AND ($1::uuid IS NULL OR d.household_id = $1)`,
      [hh],
    )).rows;
    for (const d of confirmed) {
      for (const l of (d.lines ?? []) as DraftLine[]) {
        if (l.decision && !l.decision.use && l.parsed?.status === "omitted") {
          const now = parseIngredientLine(l.raw);
          if (now.status !== "omitted") {
            seasoningsOut.push({
              kind: "left_out_before_fix", householdId: d.household_id, recipeId: d.recipe_id ?? null, versionId: d.version_id ?? null, draftId: d.id,
              title: d.title ?? "", line: l.raw, readsNowAs: now.name, evidence: "source_line",
            });
          }
        }
      }
    }

    const byRisk: Record<Risk, number> = { short_decimal: 0, rounded_4dp: 0, rounded_12dp: 0, long_decimal: 0 };
    for (const f of findings) byRisk[f.risk]++;
    return {
      readOnly: true,
      generatedAt: (opts.now ?? new Date()).toISOString(),
      scope: { householdId: hh },
      summary: {
        legacyRows: findings.length,
        byRisk,
        recoverable: findings.filter((f) => f.recoverable).length,
        sourceLineOnly: findings.filter((f) => f.evidence.kind === "source_line_only").length,
        missing: findings.filter((f) => f.evidence.kind === "missing").length,
        conflicting: findings.filter((f) => f.evidence.kind === "conflicting").length,
        seasoningFindings: seasoningsOut.length,
        versionsOnScheduledDinners: new Set(findings.filter((f) => f.scheduledDinners.length && f.risk !== "short_decimal").map((f) => f.versionId)).size,
      },
      rows: findings,
      seasonings: seasoningsOut,
    };
  } finally {
    await c.query("ROLLBACK");
  }
}

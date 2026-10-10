import { effectiveFacts, isForm, type Candidate, type Form, type ProvenanceKind } from "@/domain/nutrition/fdc";
import { outcomeSentence } from "@/domain/nutrition/outcomes";
import type pg from "pg";
import { pool, type Db } from "../db/pool";
import { candidateView, defaultFdcClient, DETAIL_URL_TEMPLATE, type CandidateView, type FdcClient } from "../integrations/fdc";
import { Reject, runCommand, type Actor } from "./framework";

/**
 * Ingredient nutrition from USDA FoodData Central, confirmed by a member (B7).
 *
 *  - The candidate is re-fetched server-side and re-normalized OUTSIDE the transaction (no network
 *    I/O inside it); the member's review digest must equal the digest of what was fetched, else
 *    `changed_since_review` and nothing is written.
 *  - Each decision names the revision it was made against (`expectedRevision`, 0 = never decided);
 *    another member's decision in between is refused as `stale`, nothing written.
 *  - History is append-only (nutrition_matches); ingredient_nutrition holds the current values.
 *  - Nutrition is never allergen information: ingredients (tags, allergen_info_known) and
 *    exclusions are not read for writing or touched here. Accepted dinners, recipe versions and
 *    member targets are not touched either; only calculated nutrition can change.
 */

export interface ConfirmNutritionMatchPayload {
  ingredientKey: string;
  fdcId: number;
  form: Form;
  portionId?: string | null;
  reviewDigest: string;
  expectedRevision: number;
}

export interface ClearNutritionMatchPayload {
  ingredientKey: string;
  expectedRevision: number;
}

export interface NutritionDeps {
  client?: FdcClient;
}

const FORM_TEXT: Record<Form, string> = { raw: "raw", cooked: "cooked", as_sold: "as sold" };

function validRevision(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function validateConfirm(p: ConfirmNutritionMatchPayload): string | null {
  if (!p || typeof p !== "object") return "A nutrition match needs an ingredient, a food, a form and the reviewed values.";
  if (typeof p.ingredientKey !== "string" || !p.ingredientKey.trim() || p.ingredientKey.length > 80) return "Ingredient is required.";
  if (typeof p.fdcId !== "number" || !Number.isInteger(p.fdcId) || p.fdcId <= 0) return "A FoodData Central food id is required.";
  if (!isForm(p.form)) return "Choose the form these values describe: raw, cooked or as sold.";
  if (p.portionId !== undefined && p.portionId !== null && (typeof p.portionId !== "string" || p.portionId.length > 40)) return "Unknown portion.";
  if (typeof p.reviewDigest !== "string" || !/^[0-9a-f]{64}$/.test(p.reviewDigest)) return "The reviewed values are missing; review the food again.";
  if (!validRevision(p.expectedRevision)) return "expectedRevision is required (the nutrition revision you reviewed).";
  return null;
}

/** The ingredient's latest nutrition decision (revision 0 when none was ever made). */
export async function nutritionRevision(c: Db, householdId: string, ingredientKey: string) {
  const r = await c.query(
    `SELECT m.id, m.revision, m.action, m.fdc_id, m.data_type, m.description, m.form, m.decided_at, mem.display_name AS decided_by_name
       FROM nutrition_matches m JOIN members mem ON mem.id=m.decided_by
      WHERE m.household_id=$1 AND m.ingredient_key=$2 ORDER BY m.revision DESC LIMIT 1`,
    [householdId, ingredientKey],
  );
  const row = r.rows[0];
  return {
    revision: (row?.revision as number | undefined) ?? 0,
    latestId: (row?.id as string | undefined) ?? null,
    latest: row
      ? { action: row.action as "matched" | "cleared", fdcId: row.fdc_id, dataType: row.data_type, description: row.description, form: row.form, decidedBy: row.decided_by_name, decidedAt: row.decided_at }
      : null,
  };
}

async function staleCheck(c: Db, actor: Actor, key: string, name: string, expectedRevision: number) {
  const cur = await nutritionRevision(c, actor.householdId, key);
  if (cur.revision !== expectedRevision) {
    const what = cur.latest?.action === "cleared" ? "cleared it" : cur.latest ? `chose ${cur.latest.dataType} #${cur.latest.fdcId}` : "changed it";
    throw new Reject(
      "stale",
      `${cur.latest?.decidedBy ?? "Someone"} changed the nutrition for ${name} while you were reviewing (${what}). Nothing was saved; review the current source first.`,
      { currentRevision: cur.revision, current: cur.latest },
    );
  }
  return cur;
}

async function ingredientName(c: Db | pg.Pool, householdId: string, key: string): Promise<string | null> {
  const r = await c.query("SELECT name FROM ingredients WHERE household_id=$1 AND key=$2", [householdId, key]);
  return r.rowCount ? (r.rows[0].name as string) : null;
}

function sourceText(candidate: Candidate, provenance: ProvenanceKind): string {
  const base = `USDA FoodData Central — ${candidate.dataType} #${candidate.fdcId} “${candidate.description}”`;
  if (provenance === "fdc_api") return base;
  const label = provenance === "fixture_fetched_demo" ? "fetched demo record (DEMO_KEY)" : provenance === "fixture_official_example" ? "official spec example" : "synthetic test values";
  return `FIXTURE — ${label}, not live data: ${base}`;
}

export async function confirmNutritionMatchCommand(actor: Actor, operationId: string, p: ConfirmNutritionMatchPayload, deps: NutritionDeps = {}) {
  const invalid = validateConfirm(p);
  let view: CandidateView | null = null;
  if (!invalid) {
    // A replay is answered from its receipt without contacting FoodData Central, and nothing is
    // fetched for an ingredient outside the caller's household.
    const prior = await pool().query("SELECT 1 FROM command_receipts WHERE household_id=$1 AND operation_id=$2", [actor.householdId, operationId]);
    if (!prior.rowCount && (await ingredientName(pool(), actor.householdId, p.ingredientKey)) !== null) {
      view = await candidateView(p.fdcId, deps.client ?? defaultFdcClient());
    }
  }
  return runCommand(actor, "ConfirmNutritionMatch", operationId, p, async (c) => {
    if (invalid) throw new Reject("invalid", invalid);
    const name = await ingredientName(c, actor.householdId, p.ingredientKey);
    if (name === null) throw new Reject("not_found", "Ingredient not found");
    const cur = await staleCheck(c, actor, p.ingredientKey, name, p.expectedRevision);
    if (!view) throw new Reject("unavailable", outcomeSentence({ kind: "unavailable" }));
    if (view.outcome !== "ok") {
      throw new Reject(view.outcome, view.outcome === "no_matches" ? "FoodData Central no longer has this food. Nothing was saved." : outcomeSentence({ kind: view.outcome }));
    }
    if (view.reviewDigest !== p.reviewDigest) {
      throw new Reject(
        "changed_since_review",
        "FoodData Central now returns different values for this food than the ones you reviewed. Nothing was saved; review the current values.",
        { candidate: view.candidate, reviewDigest: view.reviewDigest, provenance: view.provenance, retrievedAt: view.retrievedAt },
      );
    }
    const eff = effectiveFacts(view.candidate, p.portionId ?? null);
    if (!eff.ok) {
      throw new Reject(eff.reason, eff.reason === "basis_unknown"
        ? "These values do not state a basis Table can use (the serving is not in grams), so they cannot be used."
        : "That portion is not offered for this food.");
    }
    const cand = view.candidate;
    const n = cand.nutrients;
    const prev = await c.query("SELECT source, provenance_kind, match_id FROM ingredient_nutrition WHERE household_id=$1 AND ingredient_key=$2", [actor.householdId, p.ingredientKey]);
    const replaced = prev.rowCount && !prev.rows[0].match_id ? `${prev.rows[0].provenance_kind}: ${prev.rows[0].source}` : null;
    const portion = eff.value.portion;
    const ins = await c.query(
      `INSERT INTO nutrition_matches(household_id, ingredient_key, revision, action, supersedes_id, replaced_source, fdc_id, data_type, description,
         publication_date, basis_qty, basis_unit, form,
         energy_kcal, energy_unit, energy_nutrient, protein_g, protein_unit, protein_nutrient, fat_g, fat_unit, fat_nutrient, carbs_g, carbs_unit, carbs_nutrient,
         nutrient_status, chosen_portion, provenance_kind, retrieved_at, source_url_template, review_digest, decided_by)
       VALUES ($1,$2,$3,'matched',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
       RETURNING id, revision`,
      [
        actor.householdId, p.ingredientKey, cur.revision + 1, cur.latestId, replaced, cand.fdcId, cand.dataType, cand.description,
        cand.publicationDate, cand.basis!.qty, cand.basis!.unit, p.form,
        n.energy.amount, n.energy.unit, n.energy.number, n.protein.amount, n.protein.unit, n.protein.number,
        n.fat.amount, n.fat.unit, n.fat.number, n.carbs.amount, n.carbs.unit, n.carbs.number,
        JSON.stringify({ energy: n.energy.status, protein: n.protein.status, fat: n.fat.status, carbs: n.carbs.status }),
        portion ? JSON.stringify({ id: portion.id, label: portion.label, amount: portion.amount, unit: portion.unit, gramWeight: portion.gramWeight }) : null,
        view.provenance, view.retrievedAt, DETAIL_URL_TEMPLATE, view.reviewDigest, actor.memberId,
      ],
    );
    const match = ins.rows[0];
    const e = eff.value;
    await c.query(
      `INSERT INTO ingredient_nutrition(household_id, ingredient_key, basis_qty, basis_unit, form, calories, protein_g, carbs_g, fat_g, source, synthetic,
         match_id, provenance_kind, fdc_id, data_type, retrieved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (household_id, ingredient_key) DO UPDATE SET basis_qty=EXCLUDED.basis_qty, basis_unit=EXCLUDED.basis_unit, form=EXCLUDED.form,
         calories=EXCLUDED.calories, protein_g=EXCLUDED.protein_g, carbs_g=EXCLUDED.carbs_g, fat_g=EXCLUDED.fat_g, source=EXCLUDED.source,
         synthetic=EXCLUDED.synthetic, match_id=EXCLUDED.match_id, provenance_kind=EXCLUDED.provenance_kind, fdc_id=EXCLUDED.fdc_id,
         data_type=EXCLUDED.data_type, retrieved_at=EXCLUDED.retrieved_at`,
      [
        actor.householdId, p.ingredientKey, e.basisQty, e.basisUnit, p.form, e.calories, e.proteinG, e.carbsG, e.fatG,
        sourceText(cand, view.provenance), view.provenance.startsWith("fixture_"), match.id, view.provenance, cand.fdcId, cand.dataType, view.retrievedAt,
      ],
    );
    return {
      status: "accepted",
      result: { revision: match.revision, matchId: match.id },
      change: {
        summary: {
          type: "nutrition", ingredientKey: p.ingredientKey,
          text: `${actor.displayName} chose nutrition for ${name}: FoodData Central ${cand.dataType} #${cand.fdcId} (${FORM_TEXT[p.form]})`,
        },
      },
    };
  });
}

export function clearNutritionMatchCommand(actor: Actor, operationId: string, p: ClearNutritionMatchPayload) {
  return runCommand(actor, "ClearNutritionMatch", operationId, p, async (c) => {
    if (!p || typeof p.ingredientKey !== "string" || !p.ingredientKey.trim()) throw new Reject("invalid", "Ingredient is required.");
    if (!validRevision(p.expectedRevision)) throw new Reject("invalid", "expectedRevision is required (the nutrition revision you reviewed).");
    const name = await ingredientName(c, actor.householdId, p.ingredientKey);
    if (name === null) throw new Reject("not_found", "Ingredient not found");
    const cur = await staleCheck(c, actor, p.ingredientKey, name, p.expectedRevision);
    const prev = await c.query("SELECT source, provenance_kind, match_id FROM ingredient_nutrition WHERE household_id=$1 AND ingredient_key=$2", [actor.householdId, p.ingredientKey]);
    if (!prev.rowCount) throw new Reject("nothing_to_clear", `${name} has no nutrition values to clear; it is already unknown.`);
    const replaced = prev.rows[0].match_id ? null : `${prev.rows[0].provenance_kind}: ${prev.rows[0].source}`;
    const ins = await c.query(
      `INSERT INTO nutrition_matches(household_id, ingredient_key, revision, action, supersedes_id, replaced_source, decided_by)
       VALUES ($1,$2,$3,'cleared',$4,$5,$6) RETURNING revision`,
      [actor.householdId, p.ingredientKey, cur.revision + 1, cur.latestId, replaced, actor.memberId],
    );
    await c.query("DELETE FROM ingredient_nutrition WHERE household_id=$1 AND ingredient_key=$2", [actor.householdId, p.ingredientKey]);
    return {
      status: "accepted",
      result: { revision: ins.rows[0].revision },
      change: { summary: { type: "nutrition", ingredientKey: p.ingredientKey, text: `${actor.displayName} cleared the nutrition for ${name}; it is unknown again` } },
    };
  });
}

import { Reject, runCommand, type Actor } from "./framework";
import type { Db } from "../db/pool";
import { ensureCycle } from "../groceries/recompute";
import { openMealList } from "../queries/meal-lists";
import { KNOWN_UNITS, normalizeUnit } from "@/domain/units";
import { parseAmount } from "@/domain/quantity";
import { Q } from "@/domain/exact";

/**
 * Day-free meal selection (CATALOG-FIRST-PLAN §0, D140–D143). A meal list owns an undated bookkeeping week and its own
 * grocery cycle; these commands never create, move or edit a cooking event, assignment or accepted week. Every change
 * names the revision the member saw; a concurrent change by the other member is rejected with what is there now.
 */

const SERVINGS_MAX = 48;

function servingsOf(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > SERVINGS_MAX)
    throw new Reject("invalid", `Servings must be a whole number from 1 to ${SERVINGS_MAX}.`, { field: "servings" });
  return v;
}

/** The open list, created with its own undated week and grocery cycle when there is none. */
async function listForAdding(c: Db, actor: Actor) {
  const open = await openMealList(c, actor.householdId, true);
  if (open) return open;
  const w = await c.query("INSERT INTO weeks(household_id, kind, week_start) VALUES ($1,'meal_list',NULL) RETURNING id", [actor.householdId]);
  const l = await c.query("INSERT INTO meal_lists(household_id, week_id, opened_by) VALUES ($1,$2,$3) RETURNING *", [actor.householdId, w.rows[0].id, actor.memberId]);
  await ensureCycle(c, actor.householdId, w.rows[0].id);
  return l.rows[0] as { id: string; week_id: string; revision: number; opened_by: string; opened_at: Date };
}

async function bumpList(c: Db, listId: string) {
  await c.query("UPDATE meal_lists SET revision = revision + 1 WHERE id=$1", [listId]);
}

/** A selected meal of the household's open list, locked, checked against the revision the member saw. */
async function selectedMeal(c: Db, actor: Actor, id: unknown, expectedRevision: unknown) {
  if (typeof id !== "string") throw new Reject("invalid", "selectedMealId required");
  if (typeof expectedRevision !== "number") throw new Reject("invalid", "expectedRevision required");
  const r = await c.query(
    `SELECT s.*, l.status AS list_status, l.week_id, v.title, m.display_name AS updated_by_name
     FROM selected_meals s JOIN meal_lists l ON l.id=s.list_id JOIN recipe_versions v ON v.id=s.recipe_version_id
     JOIN members m ON m.id=s.updated_by
     WHERE s.id=$1 AND s.household_id=$2 FOR UPDATE OF s`,
    [id, actor.householdId],
  );
  const s = r.rows[0];
  if (!s) throw new Reject("not_found", "That meal is not on your list.");
  if (s.list_status !== "open") throw new Reject("list_closed", "That list was closed; a new list has started.");
  if (s.status !== "active" || s.revision !== expectedRevision) {
    throw new Reject(
      "stale_selection",
      s.status !== "active"
        ? `${s.updated_by_name} removed ${s.title} from the list.`
        : `${s.updated_by_name} changed ${s.title} to ${s.servings} servings. Nothing else changed.`,
      { current: { status: s.status, servings: s.servings, revision: s.revision, updatedBy: s.updated_by_name } },
    );
  }
  return s as { id: string; list_id: string; week_id: string; recipe_id: string; recipe_version_id: string; servings: number; revision: number; title: string };
}

export function addSelectedMealCommand(actor: Actor, operationId: string, p: { recipeId: string; versionId: string; servings: number }) {
  return runCommand(actor, "AddSelectedMeal", operationId, p, async (c) => {
    const servings = servingsOf(p?.servings);
    const r = await c.query(
      `SELECT r.id, r.current_version_id, r.archived_at, v.title FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id
       WHERE r.id=$1 AND r.household_id=$2`,
      [p?.recipeId, actor.householdId],
    );
    const recipe = r.rows[0];
    if (!recipe) throw new Reject("not_found", "Recipe not found");
    if (recipe.archived_at) throw new Reject("archived", "This recipe is archived.");
    // Bound to the version the member saw: a newer one (another member's edit) is named, never silently taken.
    if (p.versionId !== recipe.current_version_id) {
      throw new Reject("recipe_changed", `${recipe.title} was edited since you opened it. Check it, then add it again.`, { currentVersionId: recipe.current_version_id });
    }
    const list = await listForAdding(c, actor);
    const dup = await c.query(
      `SELECT s.id, s.servings, s.revision, m.display_name FROM selected_meals s JOIN members m ON m.id=s.added_by
       WHERE s.list_id=$1 AND s.recipe_id=$2 AND s.status='active'`,
      [list.id, recipe.id],
    );
    if (dup.rowCount) {
      const d = dup.rows[0];
      // Q2: a recipe is on a list once; adding it again is a deliberate servings change, never a second copy.
      throw new Reject("already_selected", `${recipe.title} is already selected (${d.servings} servings, added by ${d.display_name}). Change its servings instead.`, {
        selectedMealId: d.id, servings: d.servings, revision: d.revision,
      });
    }
    const ins = await c.query(
      `INSERT INTO selected_meals(household_id, list_id, recipe_id, recipe_version_id, servings, added_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id`,
      [actor.householdId, list.id, recipe.id, recipe.current_version_id, servings, actor.memberId],
    );
    await bumpList(c, list.id);
    return {
      status: "accepted",
      result: { selectedMealId: ins.rows[0].id, listId: list.id, weekId: list.week_id },
      recomputeWeeks: [list.week_id],
      change: { summary: { type: "selection", text: `${actor.displayName} added ${recipe.title} (${servings} servings)` } },
    };
  });
}

export function setSelectedMealServingsCommand(actor: Actor, operationId: string, p: { selectedMealId: string; expectedRevision: number; servings: number }) {
  return runCommand(actor, "SetSelectedMealServings", operationId, p, async (c) => {
    const servings = servingsOf(p?.servings);
    const s = await selectedMeal(c, actor, p?.selectedMealId, p?.expectedRevision);
    if (servings === s.servings) return { status: "accepted", result: { revision: s.revision } };
    await c.query("UPDATE selected_meals SET servings=$2, revision=revision+1, updated_by=$3, updated_at=now() WHERE id=$1", [s.id, servings, actor.memberId]);
    await bumpList(c, s.list_id);
    return {
      status: "accepted",
      result: { revision: s.revision + 1 },
      recomputeWeeks: [s.week_id],
      change: { summary: { type: "selection", text: `${actor.displayName} changed ${s.title} to ${servings} servings` } },
    };
  });
}

export function removeSelectedMealCommand(actor: Actor, operationId: string, p: { selectedMealId: string; expectedRevision: number }) {
  return runCommand(actor, "RemoveSelectedMeal", operationId, p, async (c) => {
    const s = await selectedMeal(c, actor, p?.selectedMealId, p?.expectedRevision);
    await c.query("UPDATE selected_meals SET status='removed', revision=revision+1, updated_by=$2, updated_at=now() WHERE id=$1", [s.id, actor.memberId]);
    await bumpList(c, s.list_id);
    return {
      status: "accepted",
      result: {},
      recomputeWeeks: [s.week_id],
      change: { summary: { type: "selection", text: `${actor.displayName} removed ${s.title} from the list` } },
    };
  });
}

/** Explicitly moves a selected meal to another version of the same recipe (never automatic). */
export function useRecipeVersionCommand(actor: Actor, operationId: string, p: { selectedMealId: string; expectedRevision: number; versionId: string }) {
  return runCommand(actor, "UseRecipeVersion", operationId, p, async (c) => {
    const s = await selectedMeal(c, actor, p?.selectedMealId, p?.expectedRevision);
    const v = await c.query("SELECT id, version_no, title FROM recipe_versions WHERE id=$1 AND recipe_id=$2 AND household_id=$3", [p?.versionId, s.recipe_id, actor.householdId]);
    if (!v.rowCount) throw new Reject("not_found", "That version does not belong to this recipe.");
    if (v.rows[0].id === s.recipe_version_id) return { status: "accepted", result: { revision: s.revision } };
    await c.query("UPDATE selected_meals SET recipe_version_id=$2, revision=revision+1, updated_by=$3, updated_at=now() WHERE id=$1", [s.id, v.rows[0].id, actor.memberId]);
    await bumpList(c, s.list_id);
    return {
      status: "accepted",
      result: { revision: s.revision + 1 },
      recomputeWeeks: [s.week_id],
      change: { summary: { type: "selection", text: `${actor.displayName} switched ${v.rows[0].title} to version ${v.rows[0].version_no}` } },
    };
  });
}

/** Q6: an amount for a "Needs a quantity" item, for this meal's planned servings, or Don't buy, or clearing the answer. */
export function answerMissingQuantityCommand(
  actor: Actor,
  operationId: string,
  p: { selectedMealId: string; expectedRevision: number; itemId: string; answer: { quantity: string; unit: string } | { dontBuy: true } | null },
) {
  return runCommand(actor, "AnswerMissingQuantity", operationId, p, async (c) => {
    const s = await selectedMeal(c, actor, p?.selectedMealId, p?.expectedRevision);
    const item = await c.query("SELECT id, name FROM recipe_unquantified_items WHERE id=$1 AND recipe_version_id=$2", [p?.itemId, s.recipe_version_id]);
    if (!item.rowCount) throw new Reject("not_found", "That item is not part of this meal's recipe version.");
    const name = item.rows[0].name as string;
    let text: string;
    if (p.answer === null) {
      await c.query("DELETE FROM selected_meal_quantity_decisions WHERE selected_meal_id=$1 AND item_id=$2", [s.id, p.itemId]);
      text = `${actor.displayName} cleared the answer for ${name} (${s.title})`;
    } else if (p.answer && "dontBuy" in p.answer && p.answer.dontBuy === true) {
      await c.query(
        `INSERT INTO selected_meal_quantity_decisions(household_id, selected_meal_id, item_id, decision, decided_by)
         VALUES ($1,$2,$3,'dont_buy',$4)
         ON CONFLICT (selected_meal_id, item_id) DO UPDATE SET decision='dont_buy', quantity=NULL, unit=NULL, for_servings=NULL, decided_by=EXCLUDED.decided_by, decided_at=now()`,
        [actor.householdId, s.id, p.itemId, actor.memberId],
      );
      text = `${actor.displayName} marked ${name} Don't buy (${s.title})`;
    } else if (p.answer && "quantity" in p.answer) {
      const r = parseAmount(String(p.answer.quantity ?? ""));
      if (!r) throw new Reject("invalid", "Enter an amount such as 8, 1/2 or 1 1/2.", { field: "quantity" });
      const unit = normalizeUnit(String(p.answer.unit ?? ""));
      if (!KNOWN_UNITS.includes(unit)) throw new Reject("invalid", `Choose a unit (${KNOWN_UNITS.join(", ")}).`, { field: "unit" });
      const q = Q.frac(r.n, r.d).toString();
      await c.query(
        `INSERT INTO selected_meal_quantity_decisions(household_id, selected_meal_id, item_id, decision, quantity, unit, for_servings, decided_by)
         VALUES ($1,$2,$3,'amount',$4,$5,$6,$7)
         ON CONFLICT (selected_meal_id, item_id) DO UPDATE SET decision='amount', quantity=EXCLUDED.quantity, unit=EXCLUDED.unit,
           for_servings=EXCLUDED.for_servings, decided_by=EXCLUDED.decided_by, decided_at=now()`,
        [actor.householdId, s.id, p.itemId, q, unit, s.servings, actor.memberId],
      );
      text = `${actor.displayName} set ${name} for ${s.title}: ${p.answer.quantity} ${unit}`;
    } else throw new Reject("invalid", "answer must be an amount, Don't buy, or null");
    await c.query("UPDATE selected_meals SET revision=revision+1, updated_by=$2, updated_at=now() WHERE id=$1", [s.id, actor.memberId]);
    await bumpList(c, s.list_id);
    return { status: "accepted", result: { revision: s.revision + 1 }, recomputeWeeks: [s.week_id], change: { summary: { type: "selection", text } } };
  });
}

/** Closes the open list (kept as history with its purchases); the next meal added starts a new list. */
export function startNewMealListCommand(actor: Actor, operationId: string, p: { listId: string; expectedRevision: number }) {
  return runCommand(actor, "StartNewMealList", operationId, p, async (c) => {
    const open = await openMealList(c, actor.householdId, true);
    if (!open || open.id !== p?.listId) throw new Reject("stale_selection", "This list was already closed.");
    if (open.revision !== p.expectedRevision) throw new Reject("stale_selection", "The list changed since you looked. Check it first.", { revision: open.revision });
    await c.query("UPDATE meal_lists SET status='closed', closed_by=$2, closed_at=now(), revision=revision+1 WHERE id=$1", [open.id, actor.memberId]);
    return { status: "accepted", result: {}, change: { summary: { type: "selection", text: `${actor.displayName} started a new list` } } };
  });
}

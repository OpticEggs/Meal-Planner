import type { Db } from "../db/pool";
import type { SelectedMealInput } from "@/domain/groceries/projection";
import { loadRecipeVersions } from "./load";

/** The household's open meal list (at most one), or null. */
export async function openMealList(c: Db, householdId: string, forUpdate = false) {
  const r = await c.query(
    `SELECT * FROM meal_lists WHERE household_id=$1 AND status='open'${forUpdate ? " FOR UPDATE" : ""}`,
    [householdId],
  );
  return (r.rows[0] as { id: string; week_id: string; revision: number; opened_by: string; opened_at: Date } | undefined) ?? null;
}

/** Projection input for a meal list's cycle: its active selected meals at their pinned versions, with the members'
 *  answers for "Needs a quantity" items. A calendar week has none (its demand is its accepted dinners only). */
export async function loadSelections(c: Db, householdId: string, weekId: string): Promise<SelectedMealInput[]> {
  const r = await c.query(
    `SELECT s.id, s.recipe_version_id, s.servings FROM selected_meals s JOIN meal_lists l ON l.id=s.list_id
     WHERE l.week_id=$1 AND l.household_id=$2 AND s.status='active' ORDER BY s.added_at, s.id`,
    [weekId, householdId],
  );
  if (!r.rowCount) return [];
  const versions = await loadRecipeVersions(c, householdId, [...new Set(r.rows.map((x) => x.recipe_version_id as string))]);
  const d = await c.query(
    `SELECT d.*, m.display_name FROM selected_meal_quantity_decisions d JOIN members m ON m.id=d.decided_by
     WHERE d.selected_meal_id = ANY($1::uuid[])`,
    [r.rows.map((x) => x.id)],
  );
  return r.rows.map((x) => ({
    id: x.id,
    recipe: versions.get(x.recipe_version_id)!,
    servings: x.servings,
    decisions: d.rows
      .filter((y) => y.selected_meal_id === x.id)
      .map((y) => ({ itemId: y.item_id, decision: y.decision, quantity: y.quantity, unit: y.unit, forServings: y.for_servings, memberName: y.display_name })),
  }));
}

/** What both members see of the open list: each selected meal, pinned version vs the recipe's current one, who did what. */
export async function mealListView(c: Db, householdId: string, list: { id: string; week_id: string; revision: number; opened_by: string; opened_at: Date }) {
  const r = await c.query(
    `SELECT s.*, v.version_no, v.title, r.current_version_id, cv.version_no AS current_version_no, r.archived_at,
            ma.display_name AS added_by_name, mu.display_name AS updated_by_name
     FROM selected_meals s JOIN recipe_versions v ON v.id=s.recipe_version_id JOIN recipes r ON r.id=s.recipe_id
     LEFT JOIN recipe_versions cv ON cv.id=r.current_version_id
     JOIN members ma ON ma.id=s.added_by JOIN members mu ON mu.id=s.updated_by
     WHERE s.list_id=$1 AND s.status='active' ORDER BY s.added_at, s.id`,
    [list.id],
  );
  const versions = await loadRecipeVersions(c, householdId, [...new Set(r.rows.map((x) => x.recipe_version_id as string))]);
  const opener = await c.query("SELECT display_name FROM members WHERE id=$1", [list.opened_by]);
  return {
    id: list.id,
    weekId: list.week_id,
    revision: list.revision,
    openedAt: list.opened_at.toISOString(),
    openedBy: opener.rows[0]?.display_name ?? null,
    meals: r.rows.map((x) => {
      const v = versions.get(x.recipe_version_id)!;
      return {
        id: x.id as string,
        recipeId: x.recipe_id as string,
        versionId: x.recipe_version_id as string,
        versionNo: x.version_no as number,
        currentVersionId: (x.current_version_id as string | null) ?? null,
        currentVersionNo: (x.current_version_no as number | null) ?? null,
        archived: x.archived_at !== null,
        title: x.title as string,
        servings: x.servings as number,
        revision: x.revision as number,
        addedBy: x.added_by_name as string,
        updatedBy: x.updated_by_name as string,
        updatedAt: (x.updated_at as Date).toISOString(),
        imageId: v.memberPhotoId ?? v.imageId ?? null,
        sourceUrl: v.sourceUrl ?? null,
        photoKind: v.memberPhotoId ? ("member" as const) : v.imageId ? ("source" as const) : null,
        unquantified: (v.unquantified ?? []).map((u) => ({ id: u.id, name: u.name, note: u.note })),
      };
    }),
  };
}

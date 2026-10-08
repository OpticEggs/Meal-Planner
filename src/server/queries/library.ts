import { readSnapshot } from "../db/pool";
import { nowInstant } from "../env";
import type { Actor } from "../commands/framework";
import { computeProjection } from "@/domain/groceries/projection";
import { checkRecipe } from "@/domain/planning/constraints";
import { defaultPlate, plateNutrition } from "@/domain/recipes/plate";
import { convert, D } from "@/domain/units";
import { localDate, weekStartOf } from "@/domain/dates";
import { projectionInput } from "../groceries/recompute";
import { findWeek, loadExclusions, loadHousehold, loadIngredients, loadMembers, loadNutrition, loadRecipeVersions } from "./load";

/**
 * Recipe library with values computed from structured data:
 *  - nutrition per default plate (unknown stays unknown)
 *  - serving cost = usage value of one default plate at current package prices
 *  - additional basket cost = pickup spending change if this recipe were added as one
 *    cooking (default plates for each member) to the current accepted week (labeled baseline)
 */
export async function librarySnapshot(actor: Actor) {
  return readSnapshot(async (c) => {
    const h = await loadHousehold(c, actor.householdId);
    const members = await loadMembers(c, actor.householdId);
    const current = await loadRecipeVersions(c, actor.householdId, null);
    const ingredients = await loadIngredients(c, actor.householdId);
    const nutrition = await loadNutrition(c, actor.householdId);
    const exclusions = await loadExclusions(c, actor.householdId);
    const recipesQ = await c.query("SELECT id, current_version_id, archived_at, created_at FROM recipes WHERE household_id=$1 ORDER BY created_at", [actor.householdId]);
    const versionsQ = await c.query(
      "SELECT v.id, v.recipe_id, v.version_no, v.title, v.created_at, m.display_name FROM recipe_versions v LEFT JOIN members m ON m.id=v.created_by WHERE v.household_id=$1 ORDER BY v.version_no",
      [actor.householdId],
    );
    const prefs = (await c.query("SELECT recipe_id, member_id, value FROM recipe_preferences WHERE household_id=$1", [actor.householdId])).rows;
    const favs = (await c.query("SELECT recipe_id, member_id FROM favorites WHERE household_id=$1", [actor.householdId])).rows;
    const interests = (
      await c.query(
        "SELECT i.id, i.recipe_id, i.saved_at, m.display_name FROM interests i JOIN members m ON m.id=i.member_id WHERE i.household_id=$1 AND i.archived_at IS NULL ORDER BY i.saved_at DESC",
        [actor.householdId],
      )
    ).rows;
    const notes = (
      await c.query(
        "SELECT n.id, n.recipe_id, n.body, n.created_at, m.display_name FROM recipe_notes n JOIN members m ON m.id=n.member_id WHERE n.household_id=$1 ORDER BY n.created_at DESC",
        [actor.householdId],
      )
    ).rows;
    const cooked = (
      await c.query(
        "SELECT v.recipe_id, cr.cooked_on, m.display_name FROM cook_records cr JOIN recipe_versions v ON v.id=cr.recipe_version_id JOIN members m ON m.id=cr.recorded_by WHERE cr.household_id=$1 ORDER BY cr.cooked_on DESC",
        [actor.householdId],
      )
    ).rows;

    // Baseline for additional basket cost: the current accepted week, if any.
    const weekStart = weekStartOf(localDate(nowInstant(), h.timezone));
    const week = await findWeek(c, actor.householdId, weekStart);
    const baseline = week && week.acceptedChoiceRevision > 0 ? await projectionInput(c, actor.householdId, week.id) : null;
    const baselineResult = baseline ? computeProjection(baseline.input) : null;

    const recipes = [];
    for (const r of recipesQ.rows) {
      const rv = current.get(r.current_version_id);
      if (!rv) continue;
      const plate = defaultPlate(rv);
      const nut = plateNutrition(rv, plate, nutrition);
      // Serving cost: usage value of one default plate at current mapped package prices.
      let servingKnown = new D(0);
      const servingMissing: string[] = [];
      for (const ing of rv.ingredients) {
        const prod = baseline?.input.products.get(ing.ingredientKey);
        const qty = new D(ing.quantity).mul(plate[ing.componentKey] ?? 0);
        const pkg = prod?.product.packageQty && prod.product.packageUnit ? convert(prod.product.packageQty, prod.product.packageUnit, ing.unit) : null;
        if (!prod?.price || !pkg) servingMissing.push(ingredients.get(ing.ingredientKey)?.name ?? ing.ingredientKey);
        else servingKnown = servingKnown.plus(qty.div(pkg).mul(prod.price.amountMinor));
      }
      let additional: { minor: number | null; known: boolean; baseline: string; unknownCount: number } = {
        minor: null, known: false, baseline: "no accepted week this week", unknownCount: 0,
      };
      if (baseline && baselineResult) {
        const extraEvent = {
          event: { id: `explore:${rv.id}`, recipeVersionId: rv.id, status: "scheduled" as const, cookNight: weekStart, revision: 1 },
          recipe: rv,
          allocations: members.map((m) => ({ cookingEventId: `explore:${rv.id}`, memberId: m.id, kind: "dinner" as const, night: weekStart, componentPortions: plate })),
        };
        const withIt = computeProjection({ ...baseline.input, events: [...baseline.input.events, extraEvent] });
        const known = withIt.pickupSpending.complete && baselineResult.pickupSpending.complete;
        additional = {
          minor: known ? withIt.pickupSpending.knownMinor - baselineResult.pickupSpending.knownMinor : null,
          known,
          baseline: "current accepted week",
          unknownCount: withIt.pickupSpending.unknownCount,
        };
      }
      const check = checkRecipe(rv, members.map((m) => m.id), exclusions, ingredients);
      recipes.push({
        recipeId: r.id,
        archived: !!r.archived_at,
        version: {
          id: rv.id, versionNo: rv.versionNo, title: rv.title, cuisine: rv.cuisine, summary: rv.summary, effortMinutes: rv.effortMinutes, effortLevel: rv.effortLevel,
          leftoverFriendly: rv.leftoverFriendly, instructions: rv.instructions, reheatInstructions: rv.reheatInstructions, provenance: rv.provenance,
          sourceLabel: rv.sourceLabel, estimate: rv.estimate, components: rv.components,
          ingredients: rv.ingredients.map((i) => ({ ...i, name: ingredients.get(i.ingredientKey)?.name ?? i.ingredientKey })),
        },
        versions: versionsQ.rows.filter((v) => v.recipe_id === r.id).map((v) => ({ id: v.id, versionNo: v.version_no, title: v.title, createdAt: v.created_at.toISOString(), by: v.display_name })),
        preferences: Object.fromEntries(prefs.filter((p) => p.recipe_id === r.id).map((p) => [p.member_id, p.value])),
        favoriteOf: favs.filter((f) => f.recipe_id === r.id).map((f) => f.member_id),
        interest: interests.find((i) => i.recipe_id === r.id) ?? null,
        notes: notes.filter((n) => n.recipe_id === r.id).map((n) => ({ id: n.id, body: n.body, by: n.display_name, at: n.created_at.toISOString() })),
        cooked: cooked.filter((x) => x.recipe_id === r.id).map((x) => ({ on: x.cooked_on, by: x.display_name })),
        nutritionPerPlate: nut,
        servingCost: { knownMinor: Number(servingKnown.toDecimalPlaces(0)), missing: servingMissing, complete: servingMissing.length === 0 },
        additionalBasketCost: additional,
        constraint: check,
        ingredientNames: rv.ingredients.map((i) => ingredients.get(i.ingredientKey)?.name ?? i.ingredientKey),
      });
    }
    return {
      members,
      me: actor.memberId,
      recipes,
      interests: interests.map((i) => ({ id: i.id, recipeId: i.recipe_id, savedAt: i.saved_at.toISOString(), by: i.display_name })),
      ingredients: [...ingredients.values()],
    };
  });
}

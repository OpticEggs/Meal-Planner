import { pool, readSnapshot } from "../db/pool";
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
        "SELECT v.recipe_id, cr.cooked_on, m.display_name FROM cook_records_effective cr JOIN recipe_versions v ON v.id=cr.recipe_version_id JOIN members m ON m.id=cr.recorded_by WHERE cr.household_id=$1 ORDER BY cr.cooked_on DESC",
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
        const known = withIt.outstandingPurchase.complete && baselineResult.outstandingPurchase.complete;
        additional = {
          minor: known ? withIt.outstandingPurchase.knownMinor - baselineResult.outstandingPurchase.knownMinor : null,
          known,
          baseline: "current accepted week, after what is already ordered or received",
          unknownCount: withIt.outstandingPurchase.unknownCount,
        };
      }
      // Applicable received, unallocated goods this recipe would use (never inferred stock).
      const usesReceived = baselineResult
        ? [...new Set(rv.ingredients.map((i) => i.ingredientKey))]
            .filter((k) => baselineResult.lines.find((l) => l.key === k)?.receivedSurplus)
            .map((k) => ingredients.get(k)?.name ?? k)
        : [];
      const check = checkRecipe(rv, members.map((m) => m.id), exclusions, ingredients);
      recipes.push({
        recipeId: r.id,
        archived: !!r.archived_at,
        version: {
          id: rv.id, versionNo: rv.versionNo, title: rv.title, cuisine: rv.cuisine, summary: rv.summary, effortMinutes: rv.effortMinutes, effortLevel: rv.effortLevel,
          leftoverFriendly: rv.leftoverFriendly, instructions: rv.instructions, reheatInstructions: rv.reheatInstructions, provenance: rv.provenance,
          sourceLabel: rv.sourceLabel, sourceUrl: rv.sourceUrl ?? null, sourceDomain: domainOf(rv.sourceUrl), estimate: rv.estimate, components: rv.components,
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
        usesReceived,
        constraint: check,
        ingredientNames: rv.ingredients.map((i) => ingredients.get(i.ingredientKey)?.name ?? i.ingredientKey),
      });
    }
    const bookmarks = await loadBookmarks(c, actor.householdId);
    return {
      members,
      me: actor.memberId,
      recipes,
      bookmarks,
      interests: interests.map((i) => ({ id: i.id, recipeId: i.recipe_id, savedAt: i.saved_at.toISOString(), by: i.display_name })),
      ingredients: [...ingredients.values()],
    };
  });
}

/** Recipes this household has an effective "cooked" record for (corrected and duplicate records
 *  do not count) — the basis of "New to you". */
export async function effectiveCookedRecipeIds(householdId: string): Promise<Set<string>> {
  const r = await pool().query(
    "SELECT DISTINCT v.recipe_id FROM cook_records_effective cr JOIN recipe_versions v ON v.id=cr.recipe_version_id WHERE cr.household_id=$1",
    [householdId],
  );
  return new Set(r.rows.map((x) => x.recipe_id as string));
}

function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Shared saved links with every save (who, when, note) and the state of any import. A link is
 *  never a recipe: `recipeId` is set only after a member confirmed an import. */
async function loadBookmarks(c: import("../db/pool").Db, householdId: string) {
  const rows = (
    await c.query(
      `SELECT b.*, m.display_name AS created_by_name,
              d.id AS draft_id, d.revision AS draft_revision, d.method AS draft_method, d.title AS draft_title, d.yield_text AS draft_yield,
              d.servings AS draft_servings, d.effort_minutes AS draft_effort, d.lines AS draft_lines, d.problems AS draft_problems,
              d.household_instructions AS draft_instructions, d.source_has_instructions AS draft_has_instructions,
              d.source_has_nutrition AS draft_has_nutrition, d.fetched_url AS draft_fetched_url
       FROM recipe_bookmarks b JOIN members m ON m.id=b.created_by
       LEFT JOIN recipe_import_drafts d ON d.bookmark_id=b.id AND d.status='open'
       WHERE b.household_id=$1 ORDER BY b.created_at DESC, b.id`,
      [householdId],
    )
  ).rows;
  const saves = (
    await c.query(
      `SELECT s.bookmark_id, s.note, s.saved_at, m.display_name FROM recipe_bookmark_saves s JOIN members m ON m.id=s.member_id
       WHERE s.household_id=$1 ORDER BY s.saved_at, s.id`,
      [householdId],
    )
  ).rows;
  return rows.map((b) => ({
    id: b.id,
    url: b.url,
    domain: b.domain,
    sourceLabel: b.source_label,
    title: b.title,
    status: b.status,
    statusDetail: b.status_detail,
    recipeId: b.recipe_id,
    revision: b.revision,
    createdBy: b.created_by_name,
    createdAt: b.created_at.toISOString(),
    archived: !!b.archived_at,
    draft: b.draft_id
      ? {
          id: b.draft_id, revision: b.draft_revision, method: b.draft_method, title: b.draft_title, yieldText: b.draft_yield, servings: b.draft_servings,
          effortMinutes: b.draft_effort, lines: b.draft_lines, problems: b.draft_problems, householdInstructions: b.draft_instructions,
          sourceHasInstructions: b.draft_has_instructions, sourceHasNutrition: b.draft_has_nutrition, fetchedUrl: b.draft_fetched_url,
        }
      : null,
    saves: saves.filter((s) => s.bookmark_id === b.id).map((s) => ({ by: s.display_name, at: s.saved_at.toISOString(), note: s.note })),
  }));
}

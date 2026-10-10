import type { Db } from "../db/pool";
import type {
  Allocation,
  Assignment,
  CookingEvent,
  Exclusion,
  Ingredient,
  LeftoverObservation,
  Member,
  NutritionFacts,
  PlanState,
  RecipeVersion,
} from "@/domain/types";
import { nextDinnerDate } from "@/domain/dates";

export interface HouseholdRow {
  id: string;
  name: string;
  timezone: string;
  updateSeq: number;
  fixture: boolean;
}

export interface Settings {
  storeLabel: string | null;
  locationId: string | null;
  budgetScope: "pickup" | "dinner_ingredients" | null;
  budgetLimitMinor: number | null;
  budgetCurrency: string;
  budgetFirm: boolean;
  equipment: string[];
  cookingSessions: number | null;
  variety: "familiar" | "balanced" | "adventurous" | null;
  maxNewRecipes: number | null;
  maxEffort: "easy" | "medium" | "involved" | null;
  revision: number;
}

export async function loadHousehold(c: Db, householdId: string): Promise<HouseholdRow> {
  const r = await c.query("SELECT id, name, timezone, update_seq, fixture FROM households WHERE id=$1", [householdId]);
  if (!r.rowCount) throw new Error("household not found");
  const h = r.rows[0];
  return { id: h.id, name: h.name, timezone: h.timezone, updateSeq: h.update_seq, fixture: h.fixture };
}

export async function loadMembers(c: Db, householdId: string): Promise<Member[]> {
  const r = await c.query("SELECT id, display_name FROM members WHERE household_id=$1 ORDER BY created_at, display_name", [householdId]);
  return r.rows.map((m) => ({ id: m.id, displayName: m.display_name }));
}

export async function loadSettings(c: Db, householdId: string): Promise<Settings> {
  const r = await c.query("SELECT * FROM household_settings WHERE household_id=$1", [householdId]);
  const s = r.rows[0];
  if (!s) {
    return {
      storeLabel: null, locationId: null, budgetScope: null, budgetLimitMinor: null, budgetCurrency: "USD", budgetFirm: false,
      equipment: [], cookingSessions: null, variety: null, maxNewRecipes: null, maxEffort: null, revision: 0,
    };
  }
  return {
    storeLabel: s.store_label, locationId: s.location_id, budgetScope: s.budget_scope, budgetLimitMinor: s.budget_limit_minor,
    budgetCurrency: s.budget_currency, budgetFirm: s.budget_firm, equipment: s.equipment, cookingSessions: s.cooking_sessions,
    variety: s.variety, maxNewRecipes: s.max_new_recipes, maxEffort: s.max_effort, revision: s.revision,
  };
}

export async function loadExclusions(c: Db, householdId: string): Promise<Exclusion[]> {
  const r = await c.query("SELECT id, member_id, term FROM exclusions WHERE household_id=$1 AND removed_at IS NULL ORDER BY created_at", [householdId]);
  return r.rows.map((e) => ({ id: e.id, memberId: e.member_id, term: e.term }));
}

export async function loadIngredients(c: Db, householdId: string): Promise<Map<string, Ingredient>> {
  const r = await c.query("SELECT key, name, tags, allergen_info_known FROM ingredients WHERE household_id=$1", [householdId]);
  return new Map(r.rows.map((i) => [i.key, { key: i.key, name: i.name, tags: i.tags, allergenInfoKnown: i.allergen_info_known }]));
}

export async function loadNutrition(c: Db, householdId: string): Promise<Map<string, NutritionFacts>> {
  const r = await c.query("SELECT * FROM ingredient_nutrition WHERE household_id=$1", [householdId]);
  return new Map(
    r.rows.map((n) => [
      n.ingredient_key,
      {
        ingredientKey: n.ingredient_key, basisQty: n.basis_qty, basisUnit: n.basis_unit, calories: n.calories, proteinG: n.protein_g,
        carbsG: n.carbs_g, fatG: n.fat_g, source: n.source, synthetic: n.synthetic, form: n.form,
      },
    ]),
  );
}

/** Loads recipe versions by id (pinned versions) or, with ids=null, every current version. */
export async function loadRecipeVersions(c: Db, householdId: string, ids: string[] | null): Promise<Map<string, RecipeVersion>> {
  // The recipe's own photo (recipe-level) comes along with each version, pinned versions included.
  const photo = "r.member_photo_id, r.photo_revision, pm.display_name AS member_photo_by";
  const photoJoin = "LEFT JOIN recipe_images pi ON pi.id=r.member_photo_id LEFT JOIN members pm ON pm.id=pi.created_by";
  const vr = ids
    ? await c.query(
        `SELECT v.*, ${photo} FROM recipe_versions v JOIN recipes r ON r.id=v.recipe_id ${photoJoin}
         WHERE v.household_id=$1 AND v.id = ANY($2::uuid[])`,
        [householdId, ids],
      )
    : await c.query(
        `SELECT v.*, ${photo} FROM recipe_versions v JOIN recipes r ON r.current_version_id=v.id ${photoJoin}
         WHERE r.household_id=$1 AND r.archived_at IS NULL`,
        [householdId],
      );
  const vids = vr.rows.map((v) => v.id);
  const comps = await c.query("SELECT * FROM recipe_components WHERE recipe_version_id = ANY($1::uuid[]) ORDER BY sort, key", [vids]);
  const ings = await c.query("SELECT * FROM recipe_ingredients WHERE recipe_version_id = ANY($1::uuid[]) ORDER BY sort, ingredient_key", [vids]);
  const out = new Map<string, RecipeVersion>();
  for (const v of vr.rows) {
    out.set(v.id, {
      id: v.id, recipeId: v.recipe_id, versionNo: v.version_no, title: v.title, cuisine: v.cuisine, summary: v.summary,
      effortMinutes: v.effort_minutes, effortLevel: v.effort_level, leftoverFriendly: v.leftover_friendly, instructions: v.instructions,
      reheatInstructions: v.reheat_instructions, provenance: v.provenance, sourceLabel: v.source_label, sourceUrl: v.source_url ?? null, estimate: v.estimate,
      sourceAuthor: v.source_author ?? null, sourceSiteName: v.source_site_name ?? null, imageId: v.image_id ?? null,
      memberPhotoId: v.member_photo_id ?? null, memberPhotoBy: v.member_photo_by ?? null, photoRevision: v.photo_revision ?? 0,
      components: comps.rows.filter((x) => x.recipe_version_id === v.id).map((x) => ({ key: x.key, name: x.name, sort: x.sort })),
      ingredients: ings.rows
        .filter((x) => x.recipe_version_id === v.id)
        .map((x) => ({
          rowId: x.id, componentKey: x.component_key, ingredientKey: x.ingredient_key, quantity: x.quantity, unit: x.unit, form: x.form, note: x.note,
          ...(x.quantity_basis === "exact" ? { exactAmount: x.exact_amount, exactServings: x.exact_servings } : {}),
        })),
    });
  }
  return out;
}

export interface WeekRow {
  id: string;
  weekStart: string;
  acceptedChoiceRevision: number;
  adoptedBy: string | null;
  adoptedAt: string | null;
}

export async function findWeek(c: Db, householdId: string, weekStart: string): Promise<WeekRow | null> {
  const r = await c.query("SELECT * FROM weeks WHERE household_id=$1 AND week_start=$2", [householdId, weekStart]);
  if (!r.rowCount) return null;
  const w = r.rows[0];
  return { id: w.id, weekStart: w.week_start, acceptedChoiceRevision: w.accepted_choice_revision, adoptedBy: w.adopted_by, adoptedAt: w.adopted_at?.toISOString?.() ?? null };
}

export async function weekById(c: Db, householdId: string, weekId: string): Promise<WeekRow | null> {
  const r = await c.query("SELECT * FROM weeks WHERE household_id=$1 AND id=$2", [householdId, weekId]);
  if (!r.rowCount) return null;
  const w = r.rows[0];
  return { id: w.id, weekStart: w.week_start, acceptedChoiceRevision: w.accepted_choice_revision, adoptedBy: w.adopted_by, adoptedAt: w.adopted_at?.toISOString?.() ?? null };
}

export async function loadPlanState(c: Db, week: WeekRow): Promise<PlanState> {
  const a = await c.query("SELECT * FROM assignments WHERE week_id=$1 ORDER BY night", [week.id]);
  const e = await c.query("SELECT * FROM cooking_events WHERE week_id=$1 AND status <> 'retired' ORDER BY created_at, id", [week.id]);
  const eventIds = e.rows.map((x) => x.id);
  const al = await c.query("SELECT * FROM allocations WHERE cooking_event_id = ANY($1::uuid[]) ORDER BY night, kind, member_id", [eventIds]);
  const assignments: Assignment[] = a.rows.map((x) => ({
    id: x.id, night: x.night, kind: x.kind, cookingEventId: x.cooking_event_id, locked: x.locked, revision: x.revision, reason: x.reason,
  }));
  const events: CookingEvent[] = e.rows.map((x) => ({ id: x.id, recipeVersionId: x.recipe_version_id, status: x.status, cookNight: x.cook_night, revision: x.revision }));
  const allocations: Allocation[] = al.rows.map((x) => ({
    cookingEventId: x.cooking_event_id, memberId: x.member_id, kind: x.kind, night: x.night, componentPortions: x.component_portions,
  }));
  return { weekId: week.id, weekStart: week.weekStart, acceptedChoiceRevision: week.acceptedChoiceRevision, assignments, events, allocations };
}

export async function loadLeftoverObservations(c: Db, weekId: string, timeZone: string): Promise<LeftoverObservation[]> {
  const r = await c.query(
    `SELECT o.* FROM leftover_observations o JOIN cooking_events e ON e.id=o.cooking_event_id WHERE e.week_id=$1 ORDER BY o.observed_at`,
    [weekId],
  );
  return r.rows.map((o) => ({
    cookingEventId: o.cooking_event_id,
    portionsRemaining: o.portions_remaining,
    observedAt: o.observed_at.toISOString(),
    observedNight: nextDinnerDate(o.observed_at, timeZone),
  }));
}

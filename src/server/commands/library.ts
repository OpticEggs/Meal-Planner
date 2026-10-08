import { randomUUID } from "node:crypto";
import type { Db } from "../db/pool";
import { Reject, runCommand, type Actor } from "./framework";
import { normalizeUnit } from "@/domain/units";

// Preferences, interests, notes and recipe versions. None of these touch accepted
// assignments, portions or requirements: they emit change events (so the other member
// refreshes) but never recompute groceries.

async function recipeInHousehold(c: Db, householdId: string, recipeId: string) {
  const r = await c.query("SELECT id, current_version_id FROM recipes WHERE id=$1 AND household_id=$2", [recipeId, householdId]);
  if (!r.rowCount) throw new Reject("not_found", "Recipe not found");
  return r.rows[0];
}

export function saveInterestCommand(actor: Actor, operationId: string, p: { recipeId: string }) {
  return runCommand(actor, "SaveInterest", operationId, p, async (c) => {
    await recipeInHousehold(c, actor.householdId, p.recipeId);
    const existing = await c.query("SELECT id FROM interests WHERE recipe_id=$1 AND household_id=$2 AND archived_at IS NULL", [p.recipeId, actor.householdId]);
    if (existing.rowCount) return { status: "accepted", result: { interestId: existing.rows[0].id, alreadySaved: true } };
    const r = await c.query("INSERT INTO interests(household_id, recipe_id, member_id) VALUES ($1,$2,$3) RETURNING id", [actor.householdId, p.recipeId, actor.memberId]);
    return { status: "accepted", result: { interestId: r.rows[0].id }, change: { summary: { type: "interest", text: `${actor.displayName} saved a recipe to Sounds good` } } };
  });
}

export function archiveInterestCommand(actor: Actor, operationId: string, p: { interestId: string }) {
  return runCommand(actor, "ArchiveInterest", operationId, p, async (c) => {
    const r = await c.query("UPDATE interests SET archived_at=now() WHERE id=$1 AND household_id=$2 AND archived_at IS NULL RETURNING id", [p.interestId, actor.householdId]);
    if (!r.rowCount) throw new Reject("not_found", "Saved idea not found");
    return { status: "accepted", result: {}, change: { summary: { type: "interest", text: `${actor.displayName} cleared a Sounds good idea` } } };
  });
}

export function setRecipePreferenceCommand(actor: Actor, operationId: string, p: { recipeId: string; value: "make_again" | "occasionally" | "not_for_me" | null }) {
  return runCommand(actor, "SetRecipePreference", operationId, p, async (c) => {
    await recipeInHousehold(c, actor.householdId, p.recipeId);
    if (p.value === null) {
      await c.query("DELETE FROM recipe_preferences WHERE member_id=$1 AND recipe_id=$2", [actor.memberId, p.recipeId]);
    } else {
      if (!["make_again", "occasionally", "not_for_me"].includes(p.value)) throw new Reject("invalid", "Unknown preference");
      await c.query(
        `INSERT INTO recipe_preferences(member_id, recipe_id, household_id, value) VALUES ($1,$2,$3,$4)
         ON CONFLICT (member_id, recipe_id) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
        [actor.memberId, p.recipeId, actor.householdId, p.value],
      );
    }
    return { status: "accepted", result: {}, change: { summary: { type: "preference", text: `${actor.displayName} updated a recipe preference` } } };
  });
}

export function setFavoriteCommand(actor: Actor, operationId: string, p: { recipeId: string; favorite: boolean }) {
  return runCommand(actor, "SetFavorite", operationId, p, async (c) => {
    await recipeInHousehold(c, actor.householdId, p.recipeId);
    if (p.favorite) {
      await c.query("INSERT INTO favorites(member_id, recipe_id, household_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [actor.memberId, p.recipeId, actor.householdId]);
    } else {
      await c.query("DELETE FROM favorites WHERE member_id=$1 AND recipe_id=$2", [actor.memberId, p.recipeId]);
    }
    return { status: "accepted", result: {}, change: { summary: { type: "favorite", text: `${actor.displayName} ${p.favorite ? "favorited" : "unfavorited"} a recipe` } } };
  });
}

export function addRecipeNoteCommand(actor: Actor, operationId: string, p: { recipeId: string; body: string }) {
  return runCommand(actor, "AddRecipeNote", operationId, p, async (c) => {
    await recipeInHousehold(c, actor.householdId, p.recipeId);
    const body = String(p.body ?? "").trim().slice(0, 2000);
    if (!body) throw new Reject("invalid", "Note is empty");
    const r = await c.query("INSERT INTO recipe_notes(household_id, recipe_id, member_id, body) VALUES ($1,$2,$3,$4) RETURNING id", [actor.householdId, p.recipeId, actor.memberId, body]);
    return { status: "accepted", result: { noteId: r.rows[0].id }, change: { summary: { type: "note", text: `${actor.displayName} added a recipe note` } } };
  });
}

export interface RecipeDraft {
  recipeId?: string | null; // null -> new recipe
  title: string;
  cuisine?: string | null;
  summary?: string | null;
  effortMinutes?: number | null;
  effortLevel?: "easy" | "medium" | "involved" | null;
  leftoverFriendly?: boolean;
  instructions: string;
  reheatInstructions?: string;
  sourceLabel?: string | null;
  components: { key: string; name: string }[];
  ingredients: { componentKey: string; ingredientKey?: string | null; ingredientName: string; quantity: string; unit: string; form?: string }[];
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}

/** Manual structured recipe entry/edit. Every save creates a NEW immutable version; accepted
 *  meals stay pinned to the version they were chosen with. Text is stored as data, never markup. */
export function saveRecipeVersionCommand(actor: Actor, operationId: string, p: RecipeDraft) {
  return runCommand(actor, "SaveRecipeVersion", operationId, p, async (c) => {
    const title = String(p.title ?? "").trim().slice(0, 140);
    if (!title) throw new Reject("invalid", "Title required");
    if (!Array.isArray(p.components) || p.components.length === 0) throw new Reject("invalid", "At least one component (for example: main) is required");
    if (!Array.isArray(p.ingredients) || p.ingredients.length === 0) throw new Reject("invalid", "At least one ingredient is required");
    const compKeys = new Set<string>();
    const components = p.components.map((cmp, i) => {
      const key = slug(cmp.key || cmp.name) || `c${i}`;
      if (compKeys.has(key)) throw new Reject("invalid", `Duplicate component ${cmp.name}`);
      compKeys.add(key);
      return { key, name: String(cmp.name).trim().slice(0, 60) || key, sort: i };
    });
    const ings = p.ingredients.map((ing, i) => {
      const componentKey = slug(ing.componentKey);
      if (!compKeys.has(componentKey)) throw new Reject("invalid", `Ingredient ${ing.ingredientName} names an unknown component`);
      if (!/^\d+(\.\d+)?$/.test(String(ing.quantity)) || Number(ing.quantity) <= 0) throw new Reject("invalid", `Quantity for ${ing.ingredientName} must be a positive number`);
      const unit = normalizeUnit(String(ing.unit ?? ""));
      if (!unit) throw new Reject("invalid", `Unit for ${ing.ingredientName} is required`);
      const name = String(ing.ingredientName ?? "").trim().slice(0, 80);
      const key = ing.ingredientKey ? String(ing.ingredientKey) : slug(name);
      if (!key) throw new Reject("invalid", "Ingredient name required");
      return { componentKey, ingredientKey: key, name, quantity: String(ing.quantity), unit, form: ing.form ?? "raw", sort: i };
    });
    let recipeId = p.recipeId ?? null;
    let versionNo = 1;
    if (recipeId) {
      await recipeInHousehold(c, actor.householdId, recipeId);
      const v = await c.query("SELECT max(version_no) AS n FROM recipe_versions WHERE recipe_id=$1", [recipeId]);
      versionNo = (v.rows[0].n ?? 0) + 1;
    } else {
      recipeId = randomUUID();
      await c.query("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, actor.householdId, actor.memberId]);
    }
    for (const ing of ings) {
      // New ingredients from manual entry: allergen information is NOT known until reviewed.
      await c.query(
        "INSERT INTO ingredients(household_id, key, name, allergen_info_known) VALUES ($1,$2,$3,false) ON CONFLICT (household_id, key) DO NOTHING",
        [actor.householdId, ing.ingredientKey, ing.name || ing.ingredientKey],
      );
    }
    const vid = randomUUID();
    await c.query(
      `INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, cuisine, summary, effort_minutes, effort_level, leftover_friendly,
         instructions, reheat_instructions, provenance, source_label, estimate, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual',$13,true,$14)`,
      [
        vid, recipeId, actor.householdId, versionNo, title, p.cuisine ?? null, p.summary ?? null, p.effortMinutes ?? null, p.effortLevel ?? null,
        !!p.leftoverFriendly, String(p.instructions ?? "").slice(0, 10000), String(p.reheatInstructions ?? "").slice(0, 4000), p.sourceLabel ?? null, actor.memberId,
      ],
    );
    for (const cmp of components) {
      await c.query("INSERT INTO recipe_components(recipe_version_id, key, name, sort) VALUES ($1,$2,$3,$4)", [vid, cmp.key, cmp.name, cmp.sort]);
    }
    for (const ing of ings) {
      await c.query(
        "INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, form, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [vid, ing.componentKey, ing.ingredientKey, ing.quantity, ing.unit, ing.form, ing.sort],
      );
    }
    await c.query("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, vid]);
    return {
      status: "accepted",
      result: { recipeId, versionId: vid, versionNo },
      change: { summary: { type: "recipe", text: `${actor.displayName} saved ${title} (version ${versionNo})` } },
    };
  });
}

export function archiveRecipeCommand(actor: Actor, operationId: string, p: { recipeId: string; archived: boolean }) {
  return runCommand(actor, "ArchiveRecipe", operationId, p, async (c) => {
    await recipeInHousehold(c, actor.householdId, p.recipeId);
    await c.query("UPDATE recipes SET archived_at=$2 WHERE id=$1", [p.recipeId, p.archived ? new Date() : null]);
    return { status: "accepted", result: {}, change: { summary: { type: "recipe", text: `${actor.displayName} ${p.archived ? "archived" : "restored"} a recipe` } } };
  });
}

export function reviewIngredientCommand(actor: Actor, operationId: string, p: { key: string; name?: string; tags: string[]; allergenInfoKnown: boolean }) {
  return runCommand(actor, "ReviewIngredient", operationId, p, async (c) => {
    const tags = (Array.isArray(p.tags) ? p.tags : []).map((t) => slug(String(t))).filter(Boolean).slice(0, 20);
    const r = await c.query(
      "UPDATE ingredients SET tags=$3, allergen_info_known=$4, name=COALESCE($5, name) WHERE household_id=$1 AND key=$2 RETURNING key",
      [actor.householdId, p.key, tags, !!p.allergenInfoKnown, p.name ? String(p.name).slice(0, 80) : null],
    );
    if (!r.rowCount) throw new Reject("not_found", "Ingredient not found");
    return {
      status: "accepted", result: {},
      change: { summary: { type: "ingredient", text: `${actor.displayName} reviewed ingredient ${p.key}` } },
      purchasingInputsChanged: true,
    };
  });
}

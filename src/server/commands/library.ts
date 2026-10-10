import { randomUUID } from "node:crypto";
import type { Db } from "../db/pool";
import { Reject, runCommand, type Actor, type HandlerOutcome } from "./framework";
import { normalizeUnit } from "@/domain/units";
import { slug } from "@/domain/recipes/rebase";
import { Q } from "@/domain/exact";
import { parseAmount, perServing } from "@/domain/quantity";

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
  ingredients: {
    componentKey: string; ingredientKey?: string | null; ingredientName: string; quantity: string; unit: string; form?: string; note?: string | null;
    /** SERVER-INTERNAL (a confirmed import): the exact whole-recipe amount and its servings this row came
     *  from. Never accepted from a client — SaveRecipeVersion strips them (EQ, D134). */
    exactAmount?: string | null; exactServings?: number | null;
  }[];
  /** The version the member edited. REQUIRED when saving an existing recipe (RB17-03): a missing,
   *  malformed or stale expectation is refused with no write. Not used when creating a recipe. */
  expectedVersionNo?: number;
}


/** Manual structured recipe entry/edit. Every save creates a NEW immutable version; accepted
 *  meals stay pinned to the version they were chosen with. Text is stored as data, never markup. */
export function saveRecipeVersionCommand(actor: Actor, operationId: string, p: RecipeDraft) {
  return runCommand(actor, "SaveRecipeVersion", operationId, p, (c) =>
    writeRecipeVersion(c, actor, {
      ...p,
      // A client cannot declare a row exact (D134): the basis is decided here, from what was typed and from
      // the version being edited.
      ingredients: Array.isArray(p?.ingredients) ? p.ingredients.map(({ exactAmount: _a, exactServings: _s, ...i }) => i) : p?.ingredients,
    }),
  );
}

type Basis = { basis: "exact"; amount: string; servings: number } | { basis: "legacy" };
/** "n" or "n/d", reduced: what migration 015 stores. */
const fractionText = (q: Q) => q.toString();
const FITS = /^[1-9]\d{0,17}(\/[1-9]\d{0,17})?$/;

/**
 * The quantity basis of one row being saved (EQ, D134):
 *  - a confirmed import gives its exact whole-recipe amount and servings → exact (checked against the decimal);
 *  - a row whose number the member left as it was in the version being edited keeps that row's basis (also
 *    when its name or unit changed) — a title-only edit of an old recipe never relabels an inherited legacy
 *    approximation as exact, and an imported 2/3 stays 2/3;
 *  - anything else is the decimal the member typed for ONE portion, which is exact as typed (servings 1).
 */
function basisOf(
  ing: { componentKey: string; ingredientKey: string; unit: string; quantity: string; ingredientName: string; exactAmount?: string | null; exactServings?: number | null },
  previous: { component_key: string; ingredient_key: string; unit: string; q: string; quantity_basis: string; exact_amount: string | null; exact_servings: number | null }[],
): Basis {
  if (ing.exactAmount != null || ing.exactServings != null) {
    const r = parseAmount(String(ing.exactAmount ?? ""));
    const servings = Number(ing.exactServings);
    if (!r || !Number.isInteger(servings) || servings < 1 || servings > 1000) throw new Reject("invalid", `The exact amount for ${ing.ingredientName} is not valid`);
    if (perServing(String(ing.exactAmount), servings)?.value !== String(ing.quantity)) throw new Reject("invalid", `The amount for ${ing.ingredientName} does not match its exact amount`);
    return { basis: "exact", amount: fractionText(Q.frac(r.n, r.d)), servings };
  }
  // A row whose number is unchanged keeps the basis of the row it came from — the same ingredient, unit and
  // component first; failing that, any row of the edited version with that number (a renamed ingredient or a
  // changed unit still carries the same, possibly rounded, number). A legacy match always wins.
  const value = Q.of(ing.quantity);
  const sameNumber = previous.filter((x) => Q.of(x.q).eq(value));
  const sameRow = sameNumber.filter((x) => x.component_key === ing.componentKey && x.ingredient_key === ing.ingredientKey && x.unit === ing.unit);
  const same = sameRow.length ? sameRow : sameNumber;
  if (same.some((x) => x.quantity_basis !== "exact")) return { basis: "legacy" };
  if (same.length) return { basis: "exact", amount: same[0].exact_amount!, servings: same[0].exact_servings! };
  const typed = fractionText(Q.of(ing.quantity));
  if (!FITS.test(typed)) throw new Reject("invalid", `Quantity for ${ing.ingredientName} has too many digits`);
  return { basis: "exact", amount: typed, servings: 1 };
}

/** Writes one new immutable recipe version (the only path: manual saves and confirmed imports).
 *  An imported version records its source page and draft; later manual versions keep the source page. */
export async function writeRecipeVersion(
  c: Db, actor: Actor, p: RecipeDraft,
  origin: {
    provenance: "manual" | "imported"; sourceUrl?: string | null; importDraftId?: string | null;
    imageId?: string | null; sourceAuthor?: string | null; sourceSiteName?: string | null;
  } = { provenance: "manual" },
): Promise<HandlerOutcome> {
  {
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
      return {
        componentKey, ingredientKey: key, name, quantity: String(ing.quantity), unit, form: ing.form ?? "raw", note: ing.note ? String(ing.note).slice(0, 200) : null, sort: i,
        ingredientName: String(ing.ingredientName ?? key), exactAmount: ing.exactAmount, exactServings: ing.exactServings,
      };
    });
    let recipeId = p.recipeId ?? null;
    let versionNo = 1;
    if (recipeId) {
      await recipeInHousehold(c, actor.householdId, recipeId);
      const v = await c.query("SELECT max(version_no) AS n FROM recipe_versions WHERE recipe_id=$1", [recipeId]);
      const current = v.rows[0].n ?? 0;
      {
        // RB17-03: an edit of an existing recipe must say which version it was made from; nothing
        // is inferred for a caller that did not review the current version.
        if (p.expectedVersionNo === undefined || p.expectedVersionNo === null) {
          throw new Reject("version_required", "Say which version of this recipe you edited; nothing was saved.");
        }
        if (!Number.isInteger(p.expectedVersionNo) || p.expectedVersionNo < 1) throw new Reject("invalid", "Say which version you edited");
        if (current !== p.expectedVersionNo) {
          const last = await c.query(
            "SELECT v.title, m.display_name FROM recipe_versions v LEFT JOIN members m ON m.id=v.created_by WHERE v.recipe_id=$1 AND v.version_no=$2",
            [recipeId, current],
          );
          throw new Reject(
            "stale_version",
            `${last.rows[0]?.display_name ?? "Someone"} saved version ${current} (${last.rows[0]?.title ?? "untitled"}) while you were editing. Your changes were not saved; review that version, then save again.`,
            { current: { versionNo: current } },
          );
        }
      }
      versionNo = current + 1;
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
    // Where the recipe came from (page, author, site, a photo kept under permission) carries forward to later versions.
    let sourceUrl = origin.sourceUrl ?? null;
    let imageId = origin.imageId ?? null;
    let sourceAuthor = origin.sourceAuthor ?? null;
    let sourceSiteName = origin.sourceSiteName ?? null;
    if (versionNo > 1 && origin.provenance === "manual") {
      const prev = (await c.query("SELECT source_url, image_id, source_author, source_site_name FROM recipe_versions WHERE recipe_id=$1 AND version_no=$2", [recipeId, versionNo - 1])).rows[0];
      sourceUrl ??= prev?.source_url ?? null;
      imageId ??= prev?.image_id ?? null;
      sourceAuthor ??= prev?.source_author ?? null;
      sourceSiteName ??= prev?.source_site_name ?? null;
    }
    await c.query(
      `INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, cuisine, summary, effort_minutes, effort_level, leftover_friendly,
         instructions, reheat_instructions, provenance, source_label, estimate, created_by, source_url, import_draft_id, image_id, source_author, source_site_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,$15,$16,$17,$18,$19,$20)`,
      [
        vid, recipeId, actor.householdId, versionNo, title, p.cuisine ?? null, p.summary ?? null, p.effortMinutes ?? null, p.effortLevel ?? null,
        !!p.leftoverFriendly, String(p.instructions ?? "").slice(0, 10000), String(p.reheatInstructions ?? "").slice(0, 4000), origin.provenance, p.sourceLabel ?? null, actor.memberId,
        sourceUrl, origin.importDraftId ?? null, imageId, sourceAuthor?.slice(0, 200) ?? null, sourceSiteName?.slice(0, 120) ?? null,
      ],
    );
    for (const cmp of components) {
      await c.query("INSERT INTO recipe_components(recipe_version_id, key, name, sort) VALUES ($1,$2,$3,$4)", [vid, cmp.key, cmp.name, cmp.sort]);
    }
    // The rows of the version this one was edited from (empty for a new recipe): their basis is inherited by
    // rows left unchanged.
    const previous = versionNo > 1
      ? (await c.query(
          `SELECT ri.component_key, ri.ingredient_key, ri.unit, ri.quantity::text AS q, ri.quantity_basis, ri.exact_amount, ri.exact_servings
             FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.recipe_id=$1 AND v.version_no=$2`,
          [recipeId, versionNo - 1],
        )).rows
      : [];
    for (const ing of ings) {
      const b = basisOf(ing, previous);
      await c.query(
        `INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, form, note, sort, quantity_basis, exact_amount, exact_servings)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [vid, ing.componentKey, ing.ingredientKey, ing.quantity, ing.unit, ing.form, ing.note, ing.sort, b.basis, b.basis === "exact" ? b.amount : null, b.basis === "exact" ? b.servings : null],
      );
    }
    await c.query("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, vid]);
    return {
      status: "accepted",
      result: { recipeId, versionId: vid, versionNo },
      change: { summary: { type: "recipe", text: `${actor.displayName} saved ${title} (version ${versionNo})` } },
    };
  }
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

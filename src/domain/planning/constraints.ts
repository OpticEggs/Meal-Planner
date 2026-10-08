import type { Exclusion, Ingredient, PlanState, RecipeVersion } from "../types";

export type ConstraintStatus = "ok" | "violated" | "unknown";

export interface RecipeCheck {
  status: ConstraintStatus;
  reasons: string[];
}

/**
 * Hard exclusion check for one recipe for the given eaters. A match on an ingredient
 * key or tag is a violation. An ingredient whose allergen information is not known
 * cannot PASS while exclusions apply — it is "unknown", never "ok". A text match is
 * not allergen certification; the UI says so.
 */
export function checkRecipe(
  recipe: RecipeVersion,
  eaterIds: string[],
  exclusions: Exclusion[],
  ingredients: Map<string, Ingredient>,
): RecipeCheck {
  const applicable = exclusions.filter((e) => e.memberId === null || eaterIds.includes(e.memberId));
  if (applicable.length === 0) return { status: "ok", reasons: [] };
  const reasons: string[] = [];
  let unknown = false;
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientKey);
    const terms = new Set([ri.ingredientKey, ...(ing?.tags ?? [])].map((t) => t.toLowerCase()));
    for (const ex of applicable) {
      if (terms.has(ex.term.toLowerCase())) reasons.push(`${ing?.name ?? ri.ingredientKey} matches excluded "${ex.term}"`);
    }
    if (!ing || !ing.allergenInfoKnown) {
      unknown = true;
    }
  }
  if (reasons.length) return { status: "violated", reasons: [...new Set(reasons)] };
  if (unknown) {
    const names = recipe.ingredients
      .filter((ri) => !ingredients.get(ri.ingredientKey)?.allergenInfoKnown)
      .map((ri) => ingredients.get(ri.ingredientKey)?.name ?? ri.ingredientKey);
    return { status: "unknown", reasons: [`Ingredient information unknown: ${[...new Set(names)].join(", ")}`] };
  }
  return { status: "ok", reasons: [] };
}

export interface NightConstraint {
  night: string;
  status: ConstraintStatus;
  reasons: string[];
}

/** Flags current accepted dinners against current exclusions. Never replaces anything. */
export function checkPlan(
  state: PlanState,
  recipes: Map<string, RecipeVersion>,
  exclusions: Exclusion[],
  ingredients: Map<string, Ingredient>,
): NightConstraint[] {
  return state.assignments.map((a) => {
    if (!a.cookingEventId) return { night: a.night, status: "ok" as const, reasons: [] };
    const ev = state.events.find((e) => e.id === a.cookingEventId);
    const rv = ev ? recipes.get(ev.recipeVersionId) : undefined;
    if (!rv) return { night: a.night, status: "unknown" as const, reasons: ["Recipe version missing"] };
    const eaters = [...new Set(state.allocations.filter((al) => al.cookingEventId === ev!.id && al.night === a.night).map((al) => al.memberId))];
    const r = checkRecipe(rv, eaters, exclusions, ingredients);
    return { night: a.night, status: r.status, reasons: r.reasons };
  });
}

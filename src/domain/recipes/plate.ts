import { D, Dec, baseUnit, convert, normalizeUnit } from "../units";
import type { Allocation, NutritionFacts, RecipeVersion } from "../types";

export interface IngredientDemand {
  ingredientKey: string;
  unit: string; // base unit (g / ml / each) or a custom unit
  quantity: Dec;
}

/**
 * Ingredient demand for one cooking event, computed ONCE from all of its allocated
 * plates (tonight, planned leftover dinners, reserved lunches). Each ingredient
 * scales only with the portions of its own component.
 */
export function eventDemand(recipe: RecipeVersion, allocations: Allocation[]): {
  lines: IngredientDemand[];
  unconvertible: { ingredientKey: string; units: string[] }[];
} {
  const componentTotals = new Map<string, Dec>();
  for (const a of allocations) {
    for (const [k, p] of Object.entries(a.componentPortions)) {
      componentTotals.set(k, (componentTotals.get(k) ?? new D(0)).plus(p));
    }
  }
  const acc = new Map<string, Map<string, Dec>>(); // ingredient -> baseUnit -> qty
  for (const ing of recipe.ingredients) {
    const portions = componentTotals.get(ing.componentKey) ?? new D(0);
    if (portions.lte(0)) continue;
    const bu = baseUnit(ing.unit);
    const q = convert(new D(ing.quantity).mul(portions), ing.unit, bu);
    const qty = q ?? new D(ing.quantity).mul(portions);
    const byUnit = acc.get(ing.ingredientKey) ?? new Map<string, Dec>();
    byUnit.set(bu, (byUnit.get(bu) ?? new D(0)).plus(qty));
    acc.set(ing.ingredientKey, byUnit);
  }
  const lines: IngredientDemand[] = [];
  const unconvertible: { ingredientKey: string; units: string[] }[] = [];
  for (const [key, byUnit] of acc) {
    if (byUnit.size > 1) unconvertible.push({ ingredientKey: key, units: [...byUnit.keys()] });
    for (const [unit, quantity] of byUnit) lines.push({ ingredientKey: key, unit, quantity });
  }
  return { lines, unconvertible };
}

export interface NutrientTotal {
  value: string | null; // null = unknown (never zero)
  knownPart: string; // sum of the parts that are known
  missing: string[]; // ingredient keys lacking data or conversion
}

export interface PlateNutrition {
  calories: NutrientTotal;
  proteinG: NutrientTotal;
  carbsG: NutrientTotal;
  fatG: NutrientTotal;
  synthetic: boolean; // any contributing value comes from fixture data
}

const FIELDS = ["calories", "proteinG", "carbsG", "fatG"] as const;

/** Nutrition for one plate from explicit ingredient data. Missing values stay unknown. */
export function plateNutrition(
  recipe: RecipeVersion,
  componentPortions: Record<string, string>,
  nutrition: Map<string, NutritionFacts>,
): PlateNutrition {
  const known = Object.fromEntries(FIELDS.map((f) => [f, new D(0)])) as Record<(typeof FIELDS)[number], Dec>;
  const missing = Object.fromEntries(FIELDS.map((f) => [f, new Set<string>()])) as Record<(typeof FIELDS)[number], Set<string>>;
  let synthetic = false;
  for (const ing of recipe.ingredients) {
    const portions = new D(componentPortions[ing.componentKey] ?? "0");
    if (portions.lte(0)) continue;
    const facts = nutrition.get(ing.ingredientKey);
    const qty = new D(ing.quantity).mul(portions);
    const inBasis = facts ? convert(qty, ing.unit, facts.basisUnit) : null;
    for (const f of FIELDS) {
      const v = facts?.[f];
      if (!facts || inBasis === null || v === null || v === undefined || normalizeUnit(facts.basisUnit) === "") {
        missing[f].add(ing.ingredientKey);
        continue;
      }
      if (facts.synthetic) synthetic = true;
      known[f] = known[f].plus(inBasis.div(facts.basisQty).mul(v));
    }
  }
  const out = {} as PlateNutrition;
  for (const f of FIELDS) {
    const m = [...missing[f]];
    out[f] = { value: m.length ? null : known[f].toDecimalPlaces(1).toString(), knownPart: known[f].toDecimalPlaces(1).toString(), missing: m };
  }
  out.synthetic = synthetic;
  return out;
}

/** Default plate: one portion of every component. */
export function defaultPlate(recipe: RecipeVersion): Record<string, string> {
  return Object.fromEntries(recipe.components.map((c) => [c.key, "1"]));
}

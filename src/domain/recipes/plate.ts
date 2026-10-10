import { D, Dec, baseUnit, convert, normalizeUnit } from "../units";
import { Q, convertQ } from "../exact";
import type { RecipeIngredient } from "../types";
import type { Allocation, NutritionFacts, RecipeVersion } from "../types";
import { normalizeForm } from "../nutrition/form";

export interface IngredientDemand {
  ingredientKey: string;
  unit: string; // base unit (g / ml / each) or a custom unit
  /** decimal.js view of `exact` (40 digits), for code that only displays it. */
  quantity: Dec;
  /** The demand as an exact fraction — what purchasing computes with (EQ). */
  exact: Q;
  /** False when any contributing row is a legacy approximation (its stored decimal was used). */
  fromExactRows: boolean;
  /** True when at least one contributing row has an exact basis (EQR: part of the review identity). */
  anyExactRows: boolean;
}

/** One portion of a row: exact_amount ÷ exact_servings for a row saved with an exact basis, otherwise the
 *  stored decimal itself (a legacy approximation, used as stored — never "repaired" here). */
export function perPortionExact(ing: Pick<RecipeIngredient, "quantity" | "exactAmount" | "exactServings">): { value: Q; exact: boolean } {
  if (ing.exactAmount && ing.exactServings) return { value: Q.of(ing.exactAmount).div(ing.exactServings), exact: true };
  return { value: Q.of(String(ing.quantity)), exact: false };
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
  // Exact all the way: portions (decimal text) × the row's exact per-portion amount, converted to the base
  // unit with exact factors, summed as fractions.
  const acc = new Map<string, Map<string, { q: Q; exact: boolean; any: boolean }>>(); // ingredient -> baseUnit -> qty
  for (const ing of recipe.ingredients) {
    const portions = componentTotals.get(ing.componentKey) ?? new D(0);
    if (portions.lte(0)) continue;
    const bu = baseUnit(ing.unit);
    const per = perPortionExact(ing);
    const whole = per.value.mul(Q.of(portions.toFixed()));
    const qty = convertQ(whole, ing.unit, bu) ?? whole;
    const byUnit = acc.get(ing.ingredientKey) ?? new Map<string, { q: Q; exact: boolean; any: boolean }>();
    const was = byUnit.get(bu);
    byUnit.set(bu, { q: (was?.q ?? Q.zero).plus(qty), exact: (was?.exact ?? true) && per.exact, any: (was?.any ?? false) || per.exact });
    acc.set(ing.ingredientKey, byUnit);
  }
  const lines: IngredientDemand[] = [];
  const unconvertible: { ingredientKey: string; units: string[] }[] = [];
  for (const [key, byUnit] of acc) {
    if (byUnit.size > 1) unconvertible.push({ ingredientKey: key, units: [...byUnit.keys()] });
    for (const [unit, v] of byUnit) lines.push({ ingredientKey: key, unit, quantity: v.q.toDec(), exact: v.q, fromExactRows: v.exact, anyExactRows: v.any });
  }
  return { lines, unconvertible };
}

export interface NutrientTotal {
  value: string | null; // null = unknown (never zero)
  knownPart: string; // sum of the parts that are known
  missing: string[]; // ingredient keys lacking data or conversion
  /** Of `missing`: ingredients whose values describe another form than the recipe uses. */
  formMismatch?: string[];
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
  const formMismatch = new Set<string>();
  let synthetic = false;
  for (const ing of recipe.ingredients) {
    const portions = new D(componentPortions[ing.componentKey] ?? "0");
    if (portions.lte(0)) continue;
    const facts = nutrition.get(ing.ingredientKey);
    const qty = new D(ing.quantity).mul(portions);
    const inBasis = facts ? convert(qty, ing.unit, facts.basisUnit) : null;
    // Values for another form (e.g. raw values for a cooked use) are not applicable: unknown.
    const otherForm = !!facts && facts.form !== undefined && normalizeForm(facts.form) !== normalizeForm(ing.form);
    if (otherForm) formMismatch.add(ing.ingredientKey);
    for (const f of FIELDS) {
      const v = facts?.[f];
      if (!facts || otherForm || inBasis === null || v === null || v === undefined || normalizeUnit(facts.basisUnit) === "") {
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
    out[f] = { value: m.length ? null : known[f].toDecimalPlaces(1).toString(), knownPart: known[f].toDecimalPlaces(1).toString(), missing: m, formMismatch: [...formMismatch] };
  }
  out.synthetic = synthetic;
  return out;
}

/** Default plate: one portion of every component. */
export function defaultPlate(recipe: RecipeVersion): Record<string, string> {
  return Object.fromEntries(recipe.components.map((c) => [c.key, "1"]));
}

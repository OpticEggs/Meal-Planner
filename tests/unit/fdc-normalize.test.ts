/**
 * B7 FoodData Central normalization (pure). Inputs are the labeled fixtures under
 * tests/fixtures/fdc: fetched-demo (genuine DEMO_KEY records), official-example (spec examples),
 * synthetic (invented, one rule each).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { effectiveFacts, formHintOf, normalizeFood, normalizeForm, normalizeSearch, reviewDigest, type Candidate } from "@/domain/nutrition/fdc";
import { plateNutrition } from "@/domain/recipes/plate";
import type { NutritionFacts, RecipeVersion } from "@/domain/types";

const FX = path.resolve(__dirname, "../fixtures/fdc");
const json = (f: string) => JSON.parse(readFileSync(path.join(FX, f), "utf8"));
function food(f: string, id?: number): Candidate {
  const n = normalizeFood(json(f), id);
  if (!n.ok) throw new Error(`fixture ${f} did not normalize: ${n.reason}`);
  return n.value;
}

describe("B7 FDC detail mapping per data type", () => {
  it("SR Legacy (fetched demo r3): per 100 g, energy 208 kcal, macros with units, offered portions, raw hint", () => {
    const c = food("fetched-demo/r3-food-171077.json", 171077);
    expect(c).toMatchObject({ fdcId: 171077, dataType: "SR Legacy", publicationDate: "4/1/2019", basis: { qty: "100", unit: "g" }, formHint: "raw", serving: null });
    expect(c.nutrients.energy).toEqual({ amount: "120", unit: "kcal", number: "208", status: "ok" });
    expect(c.nutrients.protein).toEqual({ amount: "22.5", unit: "g", number: "203", status: "ok" });
    expect(c.nutrients.fat).toEqual({ amount: "2.62", unit: "g", number: "204", status: "ok" });
    expect(c.nutrients.carbs).toEqual({ amount: "0", unit: "g", number: "205", status: "ok" }); // FDC states 0 (assumed zero): a value, not a gap
    expect(c.portions.map((p) => [p.id, p.amount, p.unit, p.gramWeight])).toEqual([
      ["p87919", "4", "oz", "113"], ["p87921", "1", "package", "926"], ["p87920", "1", "piece", "272"],
    ]);
  });

  it("Foundation (official example 747448): portion from portionDescription; numeric modifier is not a unit; spec's example nutrient number 305 maps to nothing", () => {
    const c = food("official-example/foundation-747448.json", 747448);
    expect(c).toMatchObject({ dataType: "Foundation", description: "Strawberries, raw", publicationDate: "12/16/2019", formHint: "raw" });
    expect(c.portions).toEqual([{ id: "p135806", label: "1 cup = 91 g", amount: "1", unit: "cup", gramWeight: "91", source: "foodPortion" }]);
    for (const k of ["energy", "protein", "fat", "carbs"] as const) expect(c.nutrients[k]).toMatchObject({ amount: null, status: "missing" });
  });

  it("SR Legacy and Survey official examples map; Survey's `datatype` spelling is accepted", () => {
    expect(food("official-example/sr-legacy-170379.json", 170379)).toMatchObject({ dataType: "SR Legacy", description: "Broccoli, raw" });
    const s = food("official-example/survey-337985.json", 337985);
    expect(s).toMatchObject({ dataType: "Survey (FNDDS)", description: "Beef curry", basis: { qty: "100", unit: "g" }, formHint: null });
  });

  it("Survey (synthetic): values per 100 g; portions described only by text become their own units", () => {
    const c = food("synthetic/survey-food.json", 9000005);
    expect(c.nutrients.energy.amount).toBe("91");
    expect(c.portions.map((p) => p.unit)).toEqual(["cup", "can (15 oz), drained"]);
  });

  it("Branded (official example 534358): label values are per serving; never used as per-100 values", () => {
    const c = food("official-example/branded-534358.json", 534358);
    expect(c.serving).toEqual({ size: "28", unit: "g", grams: "28", householdText: "1 ONZ", label: { energy: "140", protein: "4.0012", fat: "8.9992", carbs: "12.0008" } });
    expect(c.nutrients.energy.amount).toBeNull(); // 140 is per 28 g serving, not per 100 g
    expect(c.brandOwner).toBe("Kar Nut Products Company");
  });
});

describe("B7 serving is not 100 g; ml is not grams", () => {
  it("a 30 g label serving is offered as a portion; default values stay per 100 g", () => {
    const c = food("synthetic/branded-g-serving.json", 9000004);
    expect(c.basis).toEqual({ qty: "100", unit: "g" });
    expect(c.nutrients.energy.amount).toBe("400");
    expect(c.serving?.label.energy).toBe("120");
    const def = effectiveFacts(c, null);
    expect(def.ok && def.value).toMatchObject({ basisQty: "100", basisUnit: "g", calories: "400", portion: null });
    const serving = effectiveFacts(c, "serving");
    expect(serving.ok && serving.value).toMatchObject({ basisQty: "1", basisUnit: "serving", calories: "120", proteinG: "3" });
  });

  it("a serving in ml has no gram weight and leaves the per-100 basis unknown", () => {
    const c = food("synthetic/branded-ml-serving.json", 9000003);
    expect(c.serving).toMatchObject({ size: "240", unit: "ml", grams: null });
    expect(c.basis).toBeNull();
    expect(c.basisNote).toMatch(/not grams/);
    expect(c.portions.find((p) => p.id === "serving")).toBeUndefined();
    for (const k of ["energy", "protein", "fat", "carbs"] as const) expect(c.nutrients[k].amount).toBeNull();
    expect(effectiveFacts(c, null)).toEqual({ ok: false, reason: "basis_unknown" });
  });
});

describe("B7 energy, missing and bad units", () => {
  it("no 208: energy from 958 (Atwater specific), and the number used is recorded; kJ is never converted", () => {
    const c = food("synthetic/foundation-atwater-only.json", 9000001);
    expect(c.nutrients.energy).toEqual({ amount: "211", unit: "kcal", number: "958", status: "ok" });
    expect(c.formHint).toBe("cooked"); // "roasted" — a hint only
  });

  it("no 208 or 958: energy from 957; a missing nutrient is unknown, never zero; unit case is ignored", () => {
    const c = food("synthetic/foundation-general-only.json", 9000006);
    expect(c.nutrients.energy).toEqual({ amount: "360", unit: "kcal", number: "957", status: "ok" });
    expect(c.nutrients.protein).toEqual({ amount: "6.6", unit: "g", number: "203", status: "ok" });
    expect(c.nutrients.fat).toEqual({ amount: null, unit: null, number: null, status: "missing" });
  });

  it("a non-kcal energy or non-g macro is bad_unit and unknown", () => {
    const c = food("synthetic/sr-bad-units.json", 9000002);
    expect(c.nutrients.energy).toEqual({ amount: null, unit: "kj", number: "208", status: "bad_unit" });
    expect(c.nutrients.protein).toEqual({ amount: null, unit: "mg", number: "203", status: "bad_unit" });
    expect(c.nutrients.fat.amount).toBe("0.37");
    expect(c.nutrients.carbs.status).toBe("missing");
    const f = effectiveFacts(c, null);
    expect(f.ok && [f.value.calories, f.value.proteinG, f.value.carbsG]).toEqual([null, null, null]);
  });
});

describe("B7 portions", () => {
  it("a chosen portion scales every known value exactly by its gram weight; unknown stays unknown", () => {
    const c = food("fetched-demo/r3-food-171077.json", 171077);
    const f = effectiveFacts(c, "p87919"); // 4 oz = 113 g
    expect(f.ok && f.value).toMatchObject({ basisQty: "4", basisUnit: "oz", calories: "135.6", proteinG: "25.425", fatG: "2.9606", carbsG: "0" });
    const g = effectiveFacts(food("synthetic/foundation-general-only.json", 9000006), null);
    expect(g.ok && g.value.fatG).toBeNull();
  });

  it("a portion without a positive gram weight is never offered; an unknown portion id is refused", () => {
    const c = food("synthetic/foundation-atwater-only.json", 9000001);
    expect(c.portions.map((p) => p.unit)).toEqual(["thigh", "cup diced"]);
    expect(effectiveFacts(c, "p3")).toEqual({ ok: false, reason: "portion_unknown" });
  });
});

describe("B7 search mapping and schema mismatch", () => {
  it("live search shape (fetched demo r1): items with data type and published date", () => {
    const s = normalizeSearch(json("fetched-demo/r1-search-chicken.json"));
    expect(s.ok && s.value.items.map((i) => [i.fdcId, i.dataType])).toEqual([
      [2646170, "Foundation"], [2727569, "Foundation"], [171474, "SR Legacy"], [171077, "SR Legacy"], [171116, "SR Legacy"],
    ]);
    expect(s.ok && s.value.items[0].publicationDate).toBe("2023-10-26");
  });

  it("the spec's array form is accepted; unsupported data types are left out; no foods is empty", () => {
    const s = normalizeSearch(json("official-example/search-broccoli.json"));
    expect(s.ok && s.value.items).toEqual([{ fdcId: 45001529, description: "BROCCOLI", dataType: "Branded", publicationDate: "4/1/2019", brandOwner: "Supervalu, Inc." }]);
    const syn = normalizeSearch(json("synthetic/search-synthetic.json"));
    expect(syn.ok && syn.value.items.map((i) => i.fdcId)).toEqual([9000001, 9000004, 9000005]);
    const none = normalizeSearch(json("synthetic/search-none.json"));
    expect(none.ok && none.value.items).toEqual([]);
  });

  it("wrong shapes are malformed, never partially used", () => {
    expect(normalizeFood(json("synthetic/schema-mismatch.json")).ok).toBe(false);
    expect(normalizeFood({ fdcId: 1, description: "x", dataType: "Experimental" }).ok).toBe(false);
    expect(normalizeFood(json("fetched-demo/r3-food-171077.json"), 999)).toEqual({ ok: false, reason: "asked for food 999, got 171077" });
    expect(normalizeFood({ fdcId: 1, description: "x", dataType: "Foundation", foodNutrients: [{ nutrient: { number: "208", unitName: "kcal" }, amount: "lots" }] }).ok).toBe(false);
    expect(normalizeSearch({ totalHits: 3 }).ok).toBe(false);
  });
});

describe("B7 review digest and form", () => {
  it("the digest covers exactly the shown values", () => {
    const a = food("fetched-demo/r3-food-171077.json", 171077);
    const b = structuredClone(a);
    expect(reviewDigest(a, "fixture_fetched_demo")).toBe(reviewDigest(b, "fixture_fetched_demo"));
    b.nutrients.protein.amount = "22.6";
    expect(reviewDigest(a, "fixture_fetched_demo")).not.toBe(reviewDigest(b, "fixture_fetched_demo"));
    expect(reviewDigest(a, "fixture_fetched_demo")).not.toBe(reviewDigest(a, "fdc_api"));
  });

  it("description words are only a hint", () => {
    expect(formHintOf("Chicken, broiler, breast, raw")).toBe("raw");
    expect(formHintOf("Rice, white, cooked")).toBe("cooked");
    expect(formHintOf("Beef curry")).toBeNull();
    expect(normalizeForm("as sold")).toBe("as_sold");
    expect(normalizeForm(undefined)).toBe("raw");
  });

  it("values for another form than the recipe uses are not applicable (unknown), not converted", () => {
    const recipe: RecipeVersion = {
      id: "v", recipeId: "r", versionNo: 1, title: "t", cuisine: null, summary: null, effortMinutes: null, effortLevel: null, leftoverFriendly: false,
      instructions: "", reheatInstructions: "", provenance: "manual", sourceLabel: null, estimate: true,
      components: [{ key: "main", name: "Main", sort: 0 }],
      ingredients: [{ componentKey: "main", ingredientKey: "chicken", quantity: "200", unit: "g", form: "cooked" }],
    };
    const facts = (form: string): Map<string, NutritionFacts> =>
      new Map([["chicken", { ingredientKey: "chicken", basisQty: "100", basisUnit: "g", calories: "120", proteinG: "22.5", carbsG: "0", fatG: "2.62", source: "t", synthetic: false, form }]]);
    const raw = plateNutrition(recipe, { main: "1" }, facts("raw"));
    expect(raw.calories.value).toBeNull();
    expect(raw.calories.missing).toEqual(["chicken"]);
    expect(raw.calories.formMismatch).toEqual(["chicken"]);
    const cooked = plateNutrition(recipe, { main: "1" }, facts("cooked"));
    expect(cooked.calories.value).toBe("240");
    const asSold = plateNutrition({ ...recipe, ingredients: [{ ...recipe.ingredients[0], form: "as sold" }] }, { main: "1" }, facts("as_sold"));
    expect(asSold.proteinG.value).toBe("45");
  });
});

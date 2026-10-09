/**
 * Household seasonings (import overhaul, 2026-10-09): ordinary salt and black pepper are never put on the
 * grocery list or into pickup calculations — the household has them — while the recipes that call for
 * them are left unchanged. Bell peppers, chilies, pepper sauces, flavoured salts and white pepper are
 * ingredients like any other.
 */
import { describe, expect, it } from "vitest";
import { isHouseholdSeasoning } from "@/domain/groceries/seasonings";
import { computeProjection, type ProjectionInput } from "@/domain/groceries/projection";
import type { Allocation, Ingredient, RecipeVersion } from "@/domain/types";

describe("isHouseholdSeasoning", () => {
  it.each([
    "salt", "Salt", "kosher salt", "sea salt", "fine sea salt", "flaky sea salt", "table salt", "coarse salt", "black pepper", "ground black pepper",
    "freshly ground black pepper", "cracked black pepper", "pepper", "salt and pepper", "salt & pepper", "Salt and black pepper", "kosher salt and freshly ground pepper",
    "salt (to taste)", "black pepper, to taste",
  ])("%j → seasoning", (name) => expect(isHouseholdSeasoning(name)).toBe(true));

  it.each([
    "red bell pepper", "bell pepper", "bell peppers", "peppers", "jalapeño pepper", "chili pepper", "chili peppers", "cayenne pepper", "red pepper flakes",
    "crushed red pepper", "hot pepper sauce", "pepper sauce", "white pepper", "pepper jack cheese", "peppercorns", "garlic salt", "celery salt", "seasoned salt",
    "salted butter", "salt pork", "unsalted butter", "lemon pepper", "pepperoni", "sweet peppers", "Szechuan pepper", "smoked salt",
  ])("%j → not a household seasoning", (name) => expect(isHouseholdSeasoning(name)).toBe(false));
});

describe("descriptors are part of the identity (RIO-02, original cases)", () => {
  it.each([
    "salt (smoked)", "pepper (white)", "salt (garlic)", "salt (smoked (hickory))", "kosher salt (smoked)", "salt (pink Himalayan)", "salt, smoked",
  ])("%j → not a household seasoning", (name) => {
    expect(isHouseholdSeasoning(name)).toBe(false);
    expect(isHouseholdSeasoning(name, "tsp")).toBe(false);
  });
  it.each([
    ["salt", "smoked"], ["pepper", "white"], ["salt", "garlic"], ["salt", "smoked (hickory)"], ["kosher salt", "smoked; divided"],
  ])("%j with descriptors %j → not a household seasoning", (name, descriptors) => expect(isHouseholdSeasoning(name, "tsp", descriptors)).toBe(false));
  it.each([
    "salt (to taste)", "salt (optional)", "kosher salt (plus more for the pasta water)", "black pepper (freshly ground)", "salt (about 1 1/2 teaspoons)",
    "salt, divided", "kosher salt (Diamond Crystal)", "salt (or to taste)", "pepper (to taste)",
  ])("%j → still a household seasoning", (name) => expect(isHouseholdSeasoning(name, "tsp")).toBe(true));
  it.each([
    ["salt", "to taste"], ["kosher salt", "divided"], ["black pepper", "freshly ground"], ["salt", "plus more for the pasta water"], ["salt", null],
  ])("%j with descriptors %j → still a household seasoning", (name, descriptors) => expect(isHouseholdSeasoning(name, "tsp", descriptors)).toBe(true));
});

describe("groceries leave household seasonings out (recipes unchanged)", () => {
  const ingredients = new Map<string, Ingredient>([
    ["chicken", { key: "chicken", name: "Chicken", tags: [], allergenInfoKnown: true }],
    ["kosher_salt", { key: "kosher_salt", name: "kosher salt", tags: [], allergenInfoKnown: true }],
    ["black_pepper", { key: "black_pepper", name: "ground black pepper", tags: [], allergenInfoKnown: true }],
    ["bell_pepper", { key: "bell_pepper", name: "red bell pepper", tags: [], allergenInfoKnown: true }],
  ]);
  const recipe: RecipeVersion = {
    id: "v1", recipeId: "r1", versionNo: 1, title: "Seasoned chicken", cuisine: null, summary: null, effortMinutes: 30, effortLevel: "easy", leftoverFriendly: false,
    instructions: "", reheatInstructions: "", provenance: "manual", sourceLabel: null, estimate: false,
    components: [{ key: "main", name: "Main", sort: 0 }],
    ingredients: [
      { componentKey: "main", ingredientKey: "chicken", quantity: "6", unit: "oz", form: "raw" },
      { componentKey: "main", ingredientKey: "kosher_salt", quantity: "0.25", unit: "tsp", form: "raw" },
      { componentKey: "main", ingredientKey: "black_pepper", quantity: "0.125", unit: "tsp", form: "raw" },
      { componentKey: "main", ingredientKey: "bell_pepper", quantity: "0.5", unit: "each", form: "raw" },
    ],
  };
  const allocation: Allocation = { cookingEventId: "e1", memberId: "j", kind: "dinner", night: "2026-10-14", componentPortions: { main: "1" } };
  const input: ProjectionInput = {
    events: [{ event: { id: "e1", recipeVersionId: "v1", status: "scheduled", cookNight: "2026-10-14", revision: 1 }, recipe, allocations: [allocation] }],
    ingredients, requests: [], availability: [], products: new Map(), batches: [], order: null, approvals: [],
    budget: { scope: null, limitMinor: null, firm: false, currency: "USD" },
  };

  it("salt and black pepper make no grocery line and no payload; the bell pepper does; both are named as left out", () => {
    const r = computeProjection(input);
    expect(r.lines.map((l) => l.key)).toEqual(["bell_pepper", "chicken"]);
    expect(r.householdSeasonings).toEqual([
      { key: "black_pepper", name: "ground black pepper", recipes: ["Seasoned chicken"] },
      { key: "kosher_salt", name: "kosher salt", recipes: ["Seasoned chicken"] },
    ]);
    expect(recipe.ingredients).toHaveLength(4); // the recipe itself is untouched
  });

  it("a member who asks for salt explicitly still gets it on the list", () => {
    const r = computeProjection({ ...input, requests: [{ id: "q1", ingredientKey: "kosher_salt", text: "kosher salt", quantity: null, unit: null, memberId: "j", productIntentId: null } as never] });
    expect(r.lines.map((l) => l.key)).toContain("kosher_salt");
    expect(r.lines.find((l) => l.key === "kosher_salt")!.meal).toBeNull();
  });
});

describe("'Have enough' binds to the amount shown (found by the URL-to-cart journey, 2026-10-09)", () => {
  it("a demand with more than 3 decimals is covered by the 3-decimal amount the member confirmed", () => {
    const ing = new Map<string, Ingredient>([["salsa", { key: "salsa", name: "salsa", tags: [], allergenInfoKnown: true }]]);
    const recipe: RecipeVersion = {
      id: "v1", recipeId: "r1", versionNo: 1, title: "Taco rice", cuisine: null, summary: null, effortMinutes: 30, effortLevel: "easy", leftoverFriendly: false,
      instructions: "", reheatInstructions: "", provenance: "imported", sourceLabel: null, estimate: false,
      components: [{ key: "main", name: "Main", sort: 0 }],
      ingredients: [{ componentKey: "main", ingredientKey: "salsa", quantity: "0.083333333333", unit: "cup", form: "raw" }], // ⅓ cup ÷ 4
    };
    const input: ProjectionInput = {
      events: [{ event: { id: "e1", recipeVersionId: "v1", status: "scheduled", cookNight: "2026-10-14", revision: 1 }, recipe, allocations: [
        { cookingEventId: "e1", memberId: "j", kind: "dinner", night: "2026-10-14", componentPortions: { main: "1" } },
        { cookingEventId: "e1", memberId: "a", kind: "dinner", night: "2026-10-14", componentPortions: { main: "1" } },
      ] }],
      ingredients: ing, requests: [], products: new Map(), batches: [], order: null, approvals: [],
      budget: { scope: null, limitMinor: null, firm: false, currency: "USD" }, availability: [],
    };
    const shown = computeProjection(input).lines.find((l) => l.key === "salsa")!.meal!;
    expect([shown.quantity, shown.unit]).toEqual(["39.431", "ml"]); // what the member sees (0.166666666666 cup = 39.4313…ml)
    const after = computeProjection({ ...input, availability: [{ ingredientKey: "salsa", state: "enough", quantity: null, unit: null, reviewedDemand: shown.quantity, reviewedUnit: shown.unit, memberName: "Alex" } as never] });
    const salsa = after.lines.find((l) => l.key === "salsa")!;
    expect(salsa.unresolved.join(" ")).not.toMatch(/Needed amount increased/);
    expect(Number(salsa.netMeal!.quantity)).toBe(0); // nothing left to buy for dinner
    // A real increase is still caught.
    const more = computeProjection({ ...input, availability: [{ ingredientKey: "salsa", state: "enough", quantity: null, unit: null, reviewedDemand: "0.1", reviewedUnit: "cup", memberName: "Alex" } as never] });
    expect(more.lines.find((l) => l.key === "salsa")!.unresolved.join(" ")).toMatch(/Needed amount increased/);
  });
});

describe("a bare 'pepper' depends on how it is measured (RIO-02, 2026-10-09)", () => {
  it.each([[null, true], [undefined, true], ["tsp", true], ["tbsp", true], ["ml", true], ["each", false], ["g", false], ["oz", false], ["lb", false]] as const)(
    "pepper measured in %s → seasoning %s", (unit, expected) => expect(isHouseholdSeasoning("pepper", unit)).toBe(expected));
  it("named table pepper and salt stay seasonings however they are measured", () => {
    for (const n of ["black pepper", "ground pepper", "freshly cracked pepper", "salt and pepper", "kosher salt"]) expect(isHouseholdSeasoning(n, "each"), n).toBe(true);
  });
});

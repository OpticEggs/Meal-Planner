/**
 * Conservative ingredient-line parsing: exact decimals, known units only, review for everything
 * a person must decide. Nothing is invented.
 */
import { describe, expect, it } from "vitest";
import { KNOWN_UNITS } from "@/domain/units";
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";

type Row = [line: string, quantity: string | null, unit: string | null, name: string];

describe("parseIngredientLine parsed lines", () => {
  it.each<Row>([
    ["2 cups flour", "2", "cup", "flour"],
    ["1/2 cup sugar", "0.5", "cup", "sugar"],
    ["3/4 tsp salt", "0.75", "tsp", "salt"],
    ["½ cup milk", "0.5", "cup", "milk"],
    ["⅛ tsp cayenne", "0.125", "tsp", "cayenne"],
    ["¾ cup oats", "0.75", "cup", "oats"],
    ["1½ cups water", "1.5", "cup", "water"],
    ["1 ½ cups water", "1.5", "cup", "water"],
    ["1 1/2 cups rice", "1.5", "cup", "rice"],
    ["2 1/4 cups flour", "2.25", "cup", "flour"],
    ["1⁄2 cup broth", "0.5", "cup", "broth"],
    ["5/8 cup cream", "0.625", "cup", "cream"],
    ["0.5 cup oil", "0.5", "cup", "oil"],
    [".5 cup oil", "0.5", "cup", "oil"],
    ["1.25 lb beef", "1.25", "lb", "beef"],
    ["1.50 lb beef", "1.5", "lb", "beef"],
    ["2 T butter", "2", "tbsp", "butter"],
    ["2 Tbsp butter", "2", "tbsp", "butter"],
    ["2 TBSP butter", "2", "tbsp", "butter"],
    ["1 tbsp. honey", "1", "tbsp", "honey"],
    ["2 tablespoons honey", "2", "tbsp", "honey"],
    ["1 t salt", "1", "tsp", "salt"],
    ["1 tsp salt", "1", "tsp", "salt"],
    ["1 teaspoon salt", "1", "tsp", "salt"],
    ["1 c milk", "1", "cup", "milk"],
    ["1 C milk", "1", "cup", "milk"],
    ["2 Cups Flour", "2", "cup", "Flour"],
    ["2 lbs chicken thighs", "2", "lb", "chicken thighs"],
    ["1 pound ground turkey", "1", "lb", "ground turkey"],
    ["8 oz cheddar", "8", "oz", "cheddar"],
    ["8 ounces cheddar", "8", "oz", "cheddar"],
    ["8 fl oz milk", "8", "fl_oz", "milk"],
    ["8 fl. oz. cream", "8", "fl_oz", "cream"],
    ["8 fluid ounces cream", "8", "fl_oz", "cream"],
    ["200g flour", "200", "g", "flour"],
    ["200 grams flour", "200", "g", "flour"],
    ["1.5kg potatoes", "1.5", "kg", "potatoes"],
    ["500 ml stock", "500", "ml", "stock"],
    ["500 mL stock", "500", "ml", "stock"],
    ["1 L water", "1", "l", "water"],
    ["1 litre water", "1", "l", "water"],
    ["2 eggs", "2", "each", "eggs"],
    ["3 large eggs", "3", "each", "eggs"], // "large" moves to the note
    ["1 onion, diced", "1", "each", "onion"], // "diced" moves to the note
    ["4 each tortillas", "4", "each", "tortillas"],
    ["2 cups of flour", "2", "cup", "flour"],
    ["- 2 cups flour", "2", "cup", "flour"],
    ["• 1 cup rice", "1", "cup", "rice"],
    ["  2   cups   flour  ", "2", "cup", "flour"],
    ["10000 g sugar", "10000", "g", "sugar"],
  ])("%j → %s %s %j", (line, quantity, unit, name) => {
    const r = parseIngredientLine(line);
    expect(r).toMatchObject({ raw: line, quantity, unit, name, status: "parsed", reasons: [] });
    expect(KNOWN_UNITS).toContain(r.unit);
  });
});

describe("parseIngredientLine review lines", () => {
  type ReviewRow = [line: string, reason: RegExp, quantity: string | null];
  it.each<ReviewRow>([
    ["salt", /no quantity/, null],
    ["salt to taste", /no fixed quantity/, null],
    ["Salt and pepper, to taste", /no fixed quantity/, null],
    ["fresh parsley, for serving", /no fixed quantity/, null],
    ["water as needed", /no fixed quantity/, null],
    ["1 tsp vanilla (optional)", /no fixed quantity/, null],
    ["optional: 1 cup nuts", /no fixed quantity/, null],
    ["one egg", /no quantity/, null],
    ["a pinch of salt", /no quantity/, null],
    ["2-3 cups broth", /range/, null],
    ["2 to 3 cups broth", /range/, null],
    ["2 – 3 tbsp oil", /range/, null],
    ["1/2-1 cup water", /range/, null],
    ["1 or 2 eggs", /alternatives/, null],
    ["1 cup milk or cream", /alternatives/, null],
    ["3 cloves garlic", /unit not supported: cloves/, "3"],
    ["1 clove garlic", /unit not supported: clove/, "1"],
    ["1 can black beans", /unit not supported: can/, "1"],
    ["2 cans tomatoes", /unit not supported: cans/, "2"],
    ["1 bunch cilantro", /unit not supported: bunch/, "1"],
    ["1 pinch salt", /unit not supported: pinch/, "1"],
    ["1 dash hot sauce", /unit not supported: dash/, "1"],
    ["1 handful spinach", /unit not supported: handful/, "1"],
    ["1 package tofu", /unit not supported: package/, "1"],
    ["1 jar salsa", /unit not supported: jar/, "1"],
    ["2 slices bread", /unit not supported: slices/, "2"],
    ["3 sprigs thyme", /unit not supported: sprigs/, "3"],
    ["1 head lettuce", /unit not supported: head/, "1"],
    ["2 stalks celery", /unit not supported: stalks/, "2"],
    ["4 pieces chicken", /unit not supported: pieces/, "4"],
    ["1 stick butter", /unit not supported: stick/, "1"],
    ["1 bag spinach", /unit not supported: bag/, "1"],
    ["1 box pasta", /unit not supported: box/, "1"],
    ["2 quarts water", /unit not supported: quarts/, "2"],
    ["1 (15 oz) can black beans", /parenthetical/, null],
    ["1 can (14.5 oz) diced tomatoes", /parenthetical/, null],
    ["1 lb 4 oz beef", /more than one quantity/, null],
    ["1 cup 2% milk", /more than one quantity/, null],
    ["1 cup ½ and ½", /more than one quantity/, null],
    ["1/3 cup sugar", /not exact as a decimal/, null],
    ["⅓ cup sugar", /not exact as a decimal/, null],
    ["⅔ cup milk", /not exact as a decimal/, null],
    ["1 1/3 cups flour", /not exact as a decimal/, null],
    ["1⅓ cups flour", /not exact as a decimal/, null],
    ["1/6 tsp pepper", /not exact as a decimal/, null],
    ["⅚ cup broth", /not exact as a decimal/, null],
    ["2/12 cup broth", /not exact as a decimal/, null],
    ["1/0 cup water", /invalid fraction/, null],
    ["0/4 cup water", /invalid fraction/, null],
    ["1 3/2 cup water", /invalid fraction/, null],
    ["0 cups flour", /non-positive/, null],
    ["0.0 cups flour", /non-positive/, null],
    ["20000 g sugar", /implausible/, null],
    ["123456789012 g sugar", /implausible/, null],
    ["1,5 cups milk", /unrecognized number/, null],
    ["1,000 g flour", /unrecognized number/, null],
    ["1. Preheat the oven", /unrecognized quantity/, null],
    ["2eggs", /unrecognized quantity/, null],
    ["1 cup", /no ingredient name/, null],
    ["", /empty line/, null],
    ["   ", /empty line/, null],
    ["-1 cup water", /no quantity/, null],
  ])("%j → review (%s)", (line, reason, quantity) => {
    const r = parseIngredientLine(line);
    expect(r.status).toBe("requires_review");
    expect(r.reasons.join("; ")).toMatch(reason);
    expect(r.quantity).toBe(quantity);
    expect(r.unit).toBeNull();
    expect(r.raw).toBe(line);
  });

  it("keeps the unit word in the name when the unit is unsupported", () => {
    expect(parseIngredientLine("3 cloves garlic, minced")).toMatchObject({ name: "cloves garlic", note: "minced" });
  });

  it("an unsupported unit alongside another reason drops the quantity too", () => {
    expect(parseIngredientLine("1 can tomatoes, or fresh")).toMatchObject({ quantity: null, unit: null, status: "requires_review" });
  });
});

describe("parseIngredientLine form and robustness", () => {
  it.each([
    ["3 cups cooked rice", "cooked"],
    ["2 cups rice, cooked", "cooked"],
    ["1 lb pre-cooked shrimp", "cooked"],
    ["1 lb raw shrimp", "raw"],
    ["1 cup uncooked rice", "raw"],
    ["1 cup Uncooked rice", "raw"],
    ["1 cup rice", null],
    ["2 cups strawberries", null],
    ["1 cup precooked rice", null],
  ])("%j → form %s", (line, form) => expect(parseIngredientLine(line).form).toBe(form));

  it("quantities are exact decimal strings, never floats", () => {
    expect(parseIngredientLine("0.1 cup water").quantity).toBe("0.1");
    expect(parseIngredientLine("1/1024 tsp salt").quantity).toBe("0.0009765625");
    expect(parseIngredientLine("0.000001 g saffron").quantity).toBe("0.000001");
    expect(parseIngredientLine("3/2 cups milk").quantity).toBe("1.5");
  });

  it("never throws on hostile input and stays fast", () => {
    const t0 = Date.now();
    for (const s of ["1".repeat(100_000), "1 ".repeat(50_000), `1 ${"(".repeat(10_000)}`, "½".repeat(10_000), "1/".repeat(10_000), `<script>alert(1)</script>`, "\u0000‮1 cup", null as unknown as string]) {
      expect(() => parseIngredientLine(s)).not.toThrow();
    }
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(parseIngredientLine(null as unknown as string).status).toBe("requires_review");
  });
});

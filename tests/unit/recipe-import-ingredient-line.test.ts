/**
 * Ingredient-line parsing (import overhaul, 2026-10-09). A line is split into an exact amount, a unit,
 * the ingredient name and a separate note; nothing is invented. Ordinary fractions are kept EXACTLY as
 * rationals ("1/3"), never rejected because their decimal repeats and never rounded. A line Table can't
 * read fully is marked for review with the reason — the whole original line is never put into the name.
 *
 * History: until 2026-10-09 thirds were refused ("fraction not exact as a decimal"), quantities were
 * decimals ("1/2" → "0.5"), unsupported count words and package sizes went to review with a separate
 * "suggestion", and nested parentheses left "(homemade )" in the name. Those expectations were replaced
 * by the ones below at the owner's direction; the case list keeps every earlier input.
 */
import { describe, expect, it } from "vitest";
import { KNOWN_UNITS } from "@/domain/units";
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";

type Row = [line: string, quantity: string, unit: string, name: string, note?: string | null];

describe("parsed lines: amount, unit, name and note separated", () => {
  it.each<Row>([
    // The reported line: exact third, nested parenthetical kept as the note.
    ["1/3 cup pesto (homemade (or store-bought))", "1/3", "cup", "pesto", "homemade (or store-bought)"],
    // Whole numbers, decimals, fractions, mixed numbers, Unicode fractions.
    ["2 cups flour", "2", "cup", "flour", null],
    ["1/2 cup sugar", "1/2", "cup", "sugar", null],
    ["3/4 tsp vanilla", "3/4", "tsp", "vanilla", null],
    ["½ cup milk", "1/2", "cup", "milk", null],
    ["⅛ tsp cayenne", "1/8", "tsp", "cayenne", null],
    ["⅓ cup salsa", "1/3", "cup", "salsa", null],
    ["⅔ cup milk", "2/3", "cup", "milk", null],
    ["1⅓ cups flour", "1 1/3", "cup", "flour", null],
    ["1 1/3 cups flour", "1 1/3", "cup", "flour", null],
    ["1/6 tsp nutmeg", "1/6", "tsp", "nutmeg", null],
    ["2/12 cup broth", "1/6", "cup", "broth", null],
    ["3/2 cups milk", "1 1/2", "cup", "milk", null],
    ["1½ cups water", "1 1/2", "cup", "water", null],
    ["1 ½ cups frozen peas", "1 1/2", "cup", "frozen peas", null],
    ["1 1/2 cups rice", "1 1/2", "cup", "rice", null],
    ["1-1/2 cups rice", "1 1/2", "cup", "rice", null],
    ["1⁄2 cup broth", "1/2", "cup", "broth", null],
    ["0.5 cup oil", "0.5", "cup", "oil", null],
    [".5 cup oil", "0.5", "cup", "oil", null],
    ["1.50 lb beef", "1.5", "lb", "beef", null],
    ["1,000 g flour", "1000", "g", "flour", null],
    ["10000 g sugar", "10000", "g", "sugar", null],
    // Units and their spellings.
    ["2 T butter", "2", "tbsp", "butter", null],
    ["2 Tbsp butter", "2", "tbsp", "butter", null],
    ["1 tbsp. honey", "1", "tbsp", "honey", null],
    ["2 tablespoons honey", "2", "tbsp", "honey", null],
    ["1 t cumin", "1", "tsp", "cumin", null],
    ["1 c milk", "1", "cup", "milk", null],
    ["2 Cups Flour", "2", "cup", "Flour", null],
    ["2 lbs chicken thighs", "2", "lb", "chicken thighs", null],
    ["1 pound ground turkey", "1", "lb", "ground turkey", null],
    ["8 ounces cheddar", "8", "oz", "cheddar", null],
    ["8 fl oz milk", "8", "fl_oz", "milk", null],
    ["8 fl. oz. cream", "8", "fl_oz", "cream", null],
    ["200g flour", "200", "g", "flour", null],
    ["1.5kg potatoes", "1.5", "kg", "potatoes", null],
    ["500 mL stock", "500", "ml", "stock", null],
    ["1 litre water", "1", "l", "water", null],
    ["2 cups of flour", "2", "cup", "flour", null],
    // Quarts, pints and gallons are exact volumes: converted to cups, never to a weight.
    ["1 pint cherry tomatoes, halved", "2", "cup", "cherry tomatoes", "halved"],
    ["2 quarts water", "8", "cup", "water", null],
    ["⅓ quart broth", "1 1/3", "cup", "broth", null],
    ["1 gallon milk", "16", "cup", "milk", null],
    // Counts; size words and preparation become the note.
    ["2 eggs", "2", "each", "eggs", null],
    ["3 large eggs", "3", "each", "eggs", "large"],
    ["1 large onion, diced", "1", "each", "onion", "large; diced"],
    ["one egg", "1", "each", "egg", null],
    ["1 red bell pepper, sliced", "1", "each", "red bell pepper", "sliced"],
    // Count words keep what was counted in the name.
    ["2 cloves garlic, minced", "2", "each", "garlic (clove)", "minced"],
    ["1 can black beans", "1", "each", "black beans (can)", null],
    ["1 bunch cilantro", "1", "each", "cilantro (bunch)", null],
    ["1 stick butter", "1", "each", "butter (stick)", null],
    // Package sizes: count × stated size, exactly.
    ["1 (15 oz) can black beans, drained", "15", "oz", "black beans", "drained"],
    ["2 (14.5 oz) cans diced tomatoes", "29", "oz", "diced tomatoes", null],
    ["1 (8 oz) container fresh mozzarella pearls, drained", "8", "oz", "fresh mozzarella pearls", "drained"],
    ["1 can (14.5 oz) diced tomatoes", "14.5", "oz", "diced tomatoes", null],
    ["2 cans (14.5 oz each) tomatoes", "29", "oz", "tomatoes", null],
    ["1 15-oz can chickpeas", "15", "oz", "chickpeas", null],
    ["½ (15 oz) can pumpkin", "7.5", "oz", "pumpkin", null],
    // A number inside a parenthetical is a note, not a second amount.
    ["¼ cup grated parmesan (about 1 oz)", "1/4", "cup", "grated parmesan", "about 1 oz"],
    ["1 tsp vanilla (optional)", "1", "tsp", "vanilla", "optional"],
    ["1 cup 2% milk", "1", "cup", "2% milk", null],
    // Price annotations are removed; bullets ignored; spacing normalized.
    ["2 tbsp olive oil ($0.16)", "2", "tbsp", "olive oil", null],
    ["- 2 cups flour", "2", "cup", "flour", null],
    ["• 1 cup rice", "1", "cup", "rice", null],
    ["  2   cups   flour  ", "2", "cup", "flour", null],
  ])("%j → %s %s %j (%j)", (line, quantity, unit, name, note = null) => {
    const r = parseIngredientLine(line);
    expect(r).toMatchObject({ raw: line, quantity, unit, name, note, status: "parsed", reasons: [] });
    expect(KNOWN_UNITS).toContain(r.unit);
  });
});

describe("lines that need a person: the reason is named and the name is still clean", () => {
  type ReviewRow = [line: string, reason: RegExp, name: string, quantity: string | null, unit: string | null];
  it.each<ReviewRow>([
    ["2-3 cloves garlic, minced", /range/i, "garlic (clove)", null, "each"],
    ["2 to 3 cups broth", /range/i, "broth", null, "cup"],
    ["2 – 3 tbsp oil", /range/i, "oil", null, "tbsp"],
    ["1/2-1 cup water", /range/i, "water", null, "cup"],
    ["1 or 2 eggs", /range/i, "eggs", null, "each"],
    ["fresh basil, for serving", /no amount/i, "fresh basil", null, null],
    ["water as needed", /no amount/i, "water", null, null],
    ["a pinch of nutmeg", /no fixed amount/i, "nutmeg", null, null],
    ["1 pinch red pepper flakes", /no fixed amount/i, "red pepper flakes", null, null],
    ["1 dash hot sauce", /no fixed amount/i, "hot sauce", null, null],
    ["1 handful spinach", /no fixed amount/i, "spinach", null, null],
    ["1 cup milk or cream", /choose/i, "", "1", "cup"],
    ["2 tbsp butter or olive oil", /choose/i, "", "2", "tbsp"],
    ["1 lb 4 oz beef", /two parts/i, "beef", null, null],
    ["1 cup plus 2 tbsp flour", /two parts/i, "flour", null, null],
    ["1/0 cup water", /amount can't be read/i, "water", null, null],
    ["0 cups flour", /amount can't be read/i, "flour", null, null],
    ["20000 g sugar", /too large/i, "sugar", null, null],
    ["1,5 cups milk", /amount can't be read/i, "milk", null, null],
    ["1. Preheat the oven", /not an ingredient/i, "Preheat the oven", null, null],
    ["1 cup", /no ingredient name/i, "", null, null],
    ["", /empty/i, "", null, null],
  ])("%j → review (%s)", (line, reason, name, quantity, unit) => {
    const r = parseIngredientLine(line);
    expect(r.status).toBe("requires_review");
    expect(r.reasons.join("; ")).toMatch(reason);
    expect(r.name).toBe(name);
    expect(r.quantity).toBe(quantity);
    expect(r.unit).toBe(unit);
    if (line.trim()) expect(r.name).not.toBe(line.trim()); // never the whole line as the name
  });

  it("a range keeps both stated ends for the person, and picks neither", () => {
    expect(parseIngredientLine("2-3 cloves garlic, minced")).toMatchObject({ range: ["2", "3"], quantity: null });
    expect(parseIngredientLine("1/2-1 cup water")).toMatchObject({ range: ["1/2", "1"], quantity: null });
  });

  it("alternatives are offered as stated, the shared word distributed", () => {
    expect(parseIngredientLine("1 cup milk or cream").alternatives).toEqual(["milk", "cream"]);
    expect(parseIngredientLine("2 cups chicken or vegetable broth").alternatives).toEqual(["chicken broth", "vegetable broth"]);
    expect(parseIngredientLine("2 tbsp butter or olive oil").alternatives).toEqual(["butter", "olive oil"]);
  });

  it("an 'or' inside a parenthetical is a note, not a choice", () => {
    const r = parseIngredientLine("1/3 cup pesto (homemade (or store-bought))");
    expect(r.alternatives ?? null).toBeNull();
    expect(r.status).toBe("parsed");
  });
});

describe("household seasonings are left out of groceries automatically", () => {
  it.each([
    "salt", "1 tsp kosher salt", "½ tsp freshly ground black pepper", "salt and pepper to taste", "Salt and pepper, to taste",
    "sea salt", "1/4 tsp fine sea salt", "black pepper", "ground black pepper", "pepper to taste", "salt & pepper", "kosher salt, to taste",
    "1 tsp salt", "freshly cracked black pepper",
  ])("%j → omitted", (line) => {
    const r = parseIngredientLine(line);
    expect(r.status).toBe("omitted");
    expect(r.reasons.join(" ")).toMatch(/household seasoning/i);
  });

  it.each([
    "1 red bell pepper, sliced", "2 jalapeño peppers", "1 tsp red pepper flakes", "1 tbsp hot pepper sauce", "1 chili pepper", "1/2 tsp cayenne pepper",
    "1 tsp garlic salt", "1 tsp celery salt", "1/4 tsp white pepper", "4 oz pepper jack cheese", "2 tbsp salted butter", "1 cup peppers",
  ])("%j → not a household seasoning", (line) => {
    expect(parseIngredientLine(line).status).not.toBe("omitted");
  });
});

describe("form and robustness", () => {
  it.each([
    ["3 cups cooked rice", "cooked"],
    ["2 cups rice, cooked", "cooked"],
    ["1 lb raw shrimp", "raw"],
    ["1 cup uncooked rice", "raw"],
    ["1 cup rice", null],
  ])("%j → form %s", (line, form) => expect(parseIngredientLine(line).form).toBe(form));

  it("never throws on hostile input, never puts the whole line in the name, and stays fast", () => {
    const t0 = Date.now();
    for (const s of ["1".repeat(100_000), "1 ".repeat(50_000), `1 ${"(".repeat(10_000)}`, "½".repeat(10_000), "1/".repeat(10_000), `<script>alert(1)</script>`, "\u0000‮1 cup", null as unknown as string]) {
      expect(() => parseIngredientLine(s)).not.toThrow();
    }
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(parseIngredientLine(null as unknown as string).status).toBe("requires_review");
  });
});

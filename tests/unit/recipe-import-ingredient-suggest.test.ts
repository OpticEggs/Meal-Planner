/**
 * Ingredient lines: price annotations removed before parsing, the name/note split, and honest
 * suggestions for lines that need review. A suggestion is only a proposal for a member; it never
 * invents an amount the line does not state. All lines are synthetic.
 */
import { describe, expect, it } from "vitest";
import { decisionProblem } from "@/domain/recipes/import";
import { KNOWN_UNITS } from "@/domain/units";
import { MAX_QUANTITY, parseIngredientLine, splitNote, type IngredientLine } from "@/server/integrations/recipe-import/ingredient-line";

const VULGAR = /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/;

/** Invariants that hold for every line, whatever it says. */
function expectInvariants(r: IngredientLine, input: unknown) {
  expect(r.raw).toBe(input);
  if (r.note !== null) expect(r.note).toBe(r.note.trim());
  if (r.note !== null) expect(r.note.length).toBeGreaterThan(0);
  if (r.status === "parsed") {
    expect(r.suggestion).toBeNull();
    expect(r.suggestionNote).toBeNull();
    expect(KNOWN_UNITS).toContain(r.unit);
    return;
  }
  expect(r.unit).toBeNull();
  if (r.suggestion === null) return void expect(r.suggestionNote).toBeNull();
  expect(r.suggestionNote).toMatch(/^\S.{0,199}$/);
  const s = r.suggestion;
  if (!s.use) return;
  expect(s.quantity).toMatch(/^\d+(\.\d+)?$/);
  expect(Number(s.quantity)).toBeGreaterThan(0);
  expect(Number(s.quantity)).toBeLessThanOrEqual(MAX_QUANTITY);
  expect(KNOWN_UNITS).toContain(s.unit);
  expect(s.name).toBe(s.name.trim());
  expect(s.name.length).toBeGreaterThan(0);
  expect(s.name).not.toMatch(/\d/);
  expect(s.name).toMatch(/\p{L}/u);
  expect(s.name).not.toMatch(VULGAR);
  expect(["raw", "cooked"]).toContain(s.form);
  // never invented: the line itself states an amount
  expect(String(input)).toMatch(/\d|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/);
  // and the member could accept it as it is
  expect(decisionProblem(s)).toBeNull();
}

describe("price annotations", () => {
  it.each([
    ["1 Tbsp olive oil ($0.16)", "1", "tbsp", "olive oil", null],
    ["1 yellow onion, diced ($0.42)", "1", "each", "yellow onion", "diced"],
    ["1 tsp smoked paprika ($.10)", "1", "tsp", "smoked paprika", null],
    ["2 cups long grain rice ($1.23*)", "2", "cup", "long grain rice", null],
    ["1/2 tsp salt ( $0.02 )", "0.5", "tsp", "salt", null],
    ["($0.50) 2 eggs", "2", "each", "eggs", null],
    ["1 cup milk ($0.25) ($0.25)", "1", "cup", "milk", null],
  ])("%j is parsed; the price is not a quantity", (line, quantity, unit, name, note) => {
    const r = parseIngredientLine(line);
    expect(r).toMatchObject({ raw: line, quantity, unit, name, note, status: "parsed", reasons: [], suggestion: null, suggestionNote: null });
  });

  it.each([
    ["1 cup milk ($0.25 each)", /parenthetical/],
    ["1 cup milk (about $1)", /parenthetical/],
    ["1 cup milk $0.25", /more than one quantity/],
    ["1 (15 oz) can beans ($0.89)", /parenthetical/],
  ])("%j: only a price-only parenthetical is removed", (line, reason) => {
    const r = parseIngredientLine(line);
    expect(r.status).toBe("requires_review");
    expect(r.reasons.join("; ")).toMatch(reason);
  });
});

describe("name and note", () => {
  it.each<[string, string, string | null]>([
    ["1 large onion, diced", "onion", "large; diced"],
    ["2 cups flour (packed)", "flour", "packed"],
    ["1 cup walnuts, chopped, toasted", "walnuts", "chopped, toasted"],
    ["2 medium carrots", "carrots", "medium"],
    ["3 small potatoes", "potatoes", "small"],
    ["3 extra large eggs", "eggs", "extra large"],
    ["2 Extra-Large eggs (room temperature)", "eggs", "extra-large; room temperature"],
    ["1 lb chicken thighs (boneless, skinless), cubed", "chicken thighs", "boneless, skinless; cubed"],
    ["1 large onion (yellow), diced", "onion", "large; yellow; diced"],
    ["2 cups flour", "flour", null],
    ["2 large", "large", null], // a size word alone stays the name
    ["1 cup largest berries", "largest berries", null],
    ["2 cups broth,", "broth", null],
  ])("%j → name %j, note %j (parsed)", (line, name, note) => {
    const r = parseIngredientLine(line);
    expect(r).toMatchObject({ raw: line, name, note, status: "parsed", suggestion: null });
  });

  it("review lines are split too, and raw is untouched", () => {
    expect(parseIngredientLine("Salt and pepper, to taste")).toMatchObject({ name: "Salt and pepper", note: "to taste", raw: "Salt and pepper, to taste" });
    expect(parseIngredientLine("1 tsp vanilla (optional)")).toMatchObject({ name: "1 tsp vanilla", note: "optional" });
    expect(parseIngredientLine("1 (15 oz) can black beans, drained")).toMatchObject({ name: "1 (15 oz) can black beans", note: "drained" });
  });

  it("splitNote keeps text when nothing would be left of the name", () => {
    expect(splitNote("(optional)")).toEqual({ name: "(optional)", note: null });
    expect(splitNote(", diced")).toEqual({ name: "diced", note: null });
    expect(splitNote("")).toEqual({ name: "", note: null });
    expect(splitNote("onion (1/2 cup)")).toEqual({ name: "onion (1/2 cup)", note: null });
  });
});

type Proposal = [line: string, quantity: string, unit: string, name: string, note: string];

describe("suggestions: use", () => {
  it.each<Proposal>([
    // 3: no exact decimal → rounded half-up to 4 places
    ["⅓ cup sugar", "0.3333", "cup", "sugar", "⅓ rounded to 0.3333"],
    ["⅔ cup milk", "0.6667", "cup", "milk", "⅔ rounded to 0.6667"],
    ["1/3 cup sugar", "0.3333", "cup", "sugar", "1/3 rounded to 0.3333"],
    ["1 1/3 cups flour", "1.3333", "cup", "flour", "1 1/3 rounded to 1.3333"],
    ["1⅓ cups flour", "1.3333", "cup", "flour", "1⅓ rounded to 1.3333"],
    ["1/6 tsp pepper", "0.1667", "tsp", "pepper", "1/6 rounded to 0.1667"],
    ["⅚ cup broth", "0.8333", "cup", "broth", "⅚ rounded to 0.8333"],
    ["2/12 cup broth", "0.1667", "cup", "broth", "2/12 rounded to 0.1667"],
    ["1/7 cup oats", "0.1429", "cup", "oats", "1/7 rounded to 0.1429"],
    ["1/3 cup chopped parsley ($0.30)", "0.3333", "cup", "chopped parsley", "1/3 rounded to 0.3333"],
    // 4: quarts, pints, gallons → cups exactly
    ["2 quarts water", "8", "cup", "water", "1 quart = 4 cups"],
    ["1 qt. stock", "4", "cup", "stock", "1 quart = 4 cups"],
    ["1 pint cream", "2", "cup", "cream", "1 pint = 2 cups"],
    ["1/2 gallon milk", "8", "cup", "milk", "1 gallon = 16 cups"],
    ["1/3 quart broth", "1.3333", "cup", "broth", "rounded to 1.3333; 1 quart = 4 cups"],
    // 5: count × stated size
    ["1 (15 oz) can black beans", "15", "oz", "black beans", "1 can × 15 oz"],
    ["1 (15 oz.) can black beans, drained ($0.89)", "15", "oz", "black beans", "1 can × 15 oz"],
    ["2 (14.5-ounce) cans diced tomatoes", "29", "oz", "diced tomatoes", "2 cans × 14.5 oz"],
    ["2 (14.5 oz) cans diced tomatoes ($1.78*)", "29", "oz", "diced tomatoes", "2 cans × 14.5 oz"],
    ["1 can (15 oz) black beans", "15", "oz", "black beans", "1 can × 15 oz"],
    ["1 can (14.5 oz) diced tomatoes", "14.5", "oz", "diced tomatoes", "1 can × 14.5 oz"],
    ["2 cans (14.5 oz each) tomatoes", "29", "oz", "tomatoes", "2 cans × 14.5 oz"],
    ["1 15-oz can chickpeas", "15", "oz", "chickpeas", "1 can × 15 oz"],
    ["2 28 ounce cans crushed tomatoes", "56", "oz", "crushed tomatoes", "2 cans × 28 oz"],
    ["1 12 fl oz bottle beer", "12", "fl_oz", "beer", "1 bottle × 12 fl oz"],
    ["1 (12 fl. oz) bottle seltzer", "12", "fl_oz", "seltzer", "1 bottle × 12 fl oz"],
    ["1 (400 g) tin chickpeas", "400", "g", "chickpeas", "1 tin × 400 g"],
    ["1 (1 lb) bag frozen peas", "1", "lb", "frozen peas", "1 bag × 1 lb"],
    ["2 (500 ml) cartons stock", "1000", "ml", "stock", "2 cartons × 500 ml"],
    ["1 (1.5 L) bottle water", "1.5", "l", "water", "1 bottle × 1.5 l"],
    ["3 (0.25 oz) packets yeast", "0.75", "oz", "yeast", "3 packets × 0.25 oz"],
    ["1 pkg (8 oz) cream cheese, softened", "8", "oz", "cream cheese", "1 package × 8 oz"],
    ["2 (6-ounce) salmon fillets", "12", "oz", "salmon fillets", "2 × 6 oz"],
    ["½ (15 oz) can beans", "7.5", "oz", "beans", "½ can × 15 oz"],
    ["1/3 (15 oz) can beans", "5", "oz", "beans", "1/3 can × 15 oz"],
    ["1 (2/3 oz) packet gelatin", "0.6667", "oz", "gelatin", "rounded to 0.6667; 1 packet × 2/3 oz"],
    // 6: count words without a size
    ["3 cloves garlic, minced", "3", "each", "garlic (clove)", "counted as cloves"],
    ["1 clove garlic", "1", "each", "garlic (clove)", "counted as cloves"],
    ["2 cloves of garlic", "2", "each", "garlic (clove)", "counted as cloves"],
    ["1 can black beans", "1", "each", "black beans (can)", "counted as cans"],
    ["2 cans tomatoes", "2", "each", "tomatoes (can)", "counted as cans"],
    ["1 bunch cilantro", "1", "each", "cilantro (bunch)", "counted as bunches"],
    ["1 head lettuce", "1", "each", "lettuce (head)", "counted as heads"],
    ["2 stalks celery", "2", "each", "celery (stalk)", "counted as stalks"],
    ["3 sprigs thyme", "3", "each", "thyme (sprig)", "counted as sprigs"],
    ["2 slices bread", "2", "each", "bread (slice)", "counted as slices"],
    ["4 pieces chicken", "4", "each", "chicken (piece)", "counted as pieces"],
    ["1 stick butter", "1", "each", "butter (stick)", "counted as sticks"],
    ["2 ears corn", "2", "each", "corn (ear)", "counted as ears"],
    ["3 leaves basil", "3", "each", "basil (leaf)", "counted as leaves"],
    ["1 loaf bread", "1", "each", "bread (loaf)", "counted as loaves"],
    ["1 package tofu", "1", "each", "tofu (package)", "counted as packages"],
    ["1 jar salsa", "1", "each", "salsa (jar)", "counted as jars"],
    ["1 bag spinach", "1", "each", "spinach (bag)", "counted as bags"],
    ["1 box pasta", "1", "each", "pasta (box)", "counted as boxes"],
    ["2 fillets cod", "2", "each", "cod (fillet)", "counted as fillets"],
    ["1 block tofu", "1", "each", "tofu (block)", "counted as blocks"],
    ["⅓ bunch parsley", "0.3333", "each", "parsley (bunch)", "⅓ rounded to 0.3333; counted as bunches"],
    // 7: ranges → the larger amount
    ["2-3 cups broth", "3", "cup", "broth", "range: used the larger amount"],
    ["2 to 3 cups broth", "3", "cup", "broth", "range: used the larger amount"],
    ["2 – 3 tbsp oil", "3", "tbsp", "oil", "range: used the larger amount"],
    ["1/2-1 cup water", "1", "cup", "water", "range: used the larger amount"],
    ["3-2 tbsp oil", "3", "tbsp", "oil", "range: used the larger amount"],
    ["1 or 2 eggs", "2", "each", "eggs", "range: used the larger amount"],
    ["2-3 cloves garlic", "3", "each", "garlic (clove)", "range: used the larger amount; counted as cloves"],
    ["1-2 quarts water", "8", "cup", "water", "range: used the larger amount; 1 quart = 4 cups"],
    ["⅓-⅔ cup sugar", "0.6667", "cup", "sugar", "⅔ rounded to 0.6667; range: used the larger amount"],
    // 8: alternatives where the amount leads → the first
    ["1 cup milk or cream", "1", "cup", "milk", "alternatives: used the first (milk)"],
    ["2 tbsp butter or 1 tbsp oil", "2", "tbsp", "butter", "alternatives: used the first (butter)"],
    ["1 cup whole milk or cream", "1", "cup", "whole milk", "alternatives: used the first (whole milk)"],
    // 9: numbered parentheticals that are not a package size
    ["1 cup (240 ml) milk", "1", "cup", "milk", "kept the first amount; dropped (240 ml)"],
    ["1 lb (450 g) chicken", "1", "lb", "chicken", "kept the first amount; dropped (450 g)"],
    ["2 (about 1 lb) potatoes", "2", "each", "potatoes", "kept the first amount; dropped (about 1 lb)"],
    ["1 pint (2 cups) cream", "2", "cup", "cream", "1 pint = 2 cups; kept the first amount; dropped (2 cups)"],
    // reviewed for a reason that does not change the stated amount
    ["1 tsp vanilla (optional)", "1", "tsp", "vanilla", "used the stated amount"],
    ["1 tsp salt, or to taste", "1", "tsp", "salt", "used the stated amount"],
    ["1 tsp salt to taste", "1", "tsp", "salt", "used the stated amount"],
    ["1 cup broth, or water", "1", "cup", "broth", "used the stated amount"],
    ["1 can tomatoes, or fresh", "1", "each", "tomatoes (can)", "counted as cans"],
  ])("%j → %s %s %j (%s)", (line, quantity, unit, name, note) => {
    const r = parseIngredientLine(line);
    expect(r.status).toBe("requires_review");
    expect(r.suggestion).toEqual({ use: true, quantity, unit, name, form: "raw" });
    expect(r.suggestionNote).toBe(note);
    expectInvariants(r, line);
  });

  it("carries the form", () => {
    expect(parseIngredientLine("⅓ cup cooked rice").suggestion).toMatchObject({ form: "cooked", name: "cooked rice" });
    expect(parseIngredientLine("⅓ cup uncooked rice").suggestion).toMatchObject({ form: "raw" });
    expect(parseIngredientLine("⅓ cup rice").suggestion).toMatchObject({ form: "raw" });
  });

  it("never touches the parsed fields of a review line", () => {
    const r = parseIngredientLine("⅓ cup sugar");
    expect(r).toMatchObject({ quantity: null, unit: null, status: "requires_review" });
    expect(r.reasons.join("; ")).toMatch(/not exact as a decimal/);
  });
});

describe("suggestions: leave out", () => {
  it.each([
    ["salt to taste", "no fixed amount: leave it out of grocery amounts"],
    ["Salt and pepper, to taste", "no fixed amount: leave it out of grocery amounts"],
    ["fresh parsley, for serving", "no fixed amount: leave it out of grocery amounts"],
    ["lime wedges, for garnish", "no fixed amount: leave it out of grocery amounts"],
    ["water as needed", "no fixed amount: leave it out of grocery amounts"],
    ["flour, for dusting", "no fixed amount: leave it out of grocery amounts"],
    ["oil for frying", "no fixed amount: leave it out of grocery amounts"],
    ["chili flakes (optional)", "no fixed amount: leave it out of grocery amounts"],
    ["a pinch of salt", "a pinch: no fixed amount; leave it out of grocery amounts"],
    ["Pinch of saffron", "a pinch: no fixed amount; leave it out of grocery amounts"],
    ["1 pinch salt", "a pinch: no fixed amount; leave it out of grocery amounts"],
    ["2 pinches salt", "a pinch: no fixed amount; leave it out of grocery amounts"],
    ["1 dash hot sauce", "a dash: no fixed amount; leave it out of grocery amounts"],
    ["a few drops vanilla", "a drop: no fixed amount; leave it out of grocery amounts"],
    ["2-3 drops food coloring", "a drop: no fixed amount; leave it out of grocery amounts"],
    ["a splash of milk", "a splash: no fixed amount; leave it out of grocery amounts"],
    ["2 splashes milk", "a splash: no fixed amount; leave it out of grocery amounts"],
    ["1 handful spinach", "a handful: no fixed amount; leave it out of grocery amounts"],
    ["a small handful of herbs", "a handful: no fixed amount; leave it out of grocery amounts"],
    ["a sprinkle of sesame seeds", "a sprinkle: no fixed amount; leave it out of grocery amounts"],
    ["2 sprinkles salt", "a sprinkle: no fixed amount; leave it out of grocery amounts"],
  ])("%j → leave out (%s)", (line, note) => {
    const r = parseIngredientLine(line);
    expect(r.status).toBe("requires_review");
    expect(r.suggestion).toEqual({ use: false });
    expect(r.suggestionNote).toBe(note);
    expectInvariants(r, line);
  });
});

describe("suggestions: none when unclear", () => {
  it.each([
    "salt", // no amount and no reason to leave it out
    "one egg", // number words are not read
    "Juice of 1 lemon",
    "optional: 1 cup nuts", // states an amount, not at the start
    "1 cup plus 2 tbsp flour", // two amounts
    "1 cup flour, plus 2 tbsp", // a second amount hidden in the note
    "1 onion, cut into 8 wedges",
    "1 lb 4 oz beef",
    "1 cup 2% milk",
    "1 cup ½ and ½",
    "1 cup chicken or vegetable broth", // which word is shared is unclear
    "2 tbsp butter or olive oil",
    "1 inch ginger", // a unit with no honest reading
    "1 knob butter",
    "2 scoops protein powder",
    "1/0 cup water",
    "0/4 cup water",
    "1 3/2 cup water",
    "0 cups flour",
    "20000 g sugar",
    "1,5 cups milk",
    "1,000 g flour",
    "1. Preheat the oven",
    "2eggs",
    "1 cup",
    "1 (15 oz) can", // no name
    "-1 cup water",
    "1 (15 oz) can beans (2 cups)", // dropped parenthetical, fine; see below
    "",
    "   ",
    "⅓ cup flour (", // unbalanced
    "1 (",
    "1 ...",
    "2 8 oz steaks", // a size without a container word, outside parentheses
    "1 15-oz can, crushed tomatoes",
    "1/30000 cup salt", // rounds to zero
  ])("%j → no suggestion", (line) => {
    const r = parseIngredientLine(line);
    expectInvariants(r, line);
    if (line === "1 (15 oz) can beans (2 cups)") {
      // the package size wins and the other numbered parenthetical is dropped and said so
      expect(r.suggestion).toEqual({ use: true, quantity: "15", unit: "oz", name: "beans", form: "raw" });
      expect(r.suggestionNote).toBe("1 can × 15 oz; kept the first amount; dropped (2 cups)");
      return;
    }
    expect(r.status).toBe("requires_review");
    expect(r.suggestion).toBeNull();
    expect(r.suggestionNote).toBeNull();
  });
});

describe("parsed lines never carry a suggestion", () => {
  it("a name needs at least one letter", () => {
    expect(parseIngredientLine("1 (")).toMatchObject({ status: "requires_review", reasons: ["no ingredient name"] });
    expect(parseIngredientLine("2 cups ...")).toMatchObject({ status: "requires_review", reasons: ["no ingredient name"] });
    expect(parseIngredientLine("2 cups crème fraîche")).toMatchObject({ status: "parsed", name: "crème fraîche" });
  });

  it.each(["2 cups flour", "1/2 cup sugar", "1½ cups water", "200g flour", "8 fl oz milk", "2 eggs", "3 large eggs", "1 onion, diced", "1 Tbsp olive oil ($0.16)", "1/1024 tsp salt"])(
    "%j",
    (line) => {
      const r = parseIngredientLine(line);
      expect(r.status).toBe("parsed");
      expect(r.suggestion).toBeNull();
      expect(r.suggestionNote).toBeNull();
      expectInvariants(r, line);
    },
  );
});

describe("property-style sweep", () => {
  const amounts = ["1", "2", "10", "0.25", ".5", "1/2", "3/4", "1/3", "2/3", "⅓", "½", "1 1/3", "1⅓", "1½", "2-3", "1 to 2", "1 or 2", "⅓-½", "0", "1/0", "12345", "1,5"];
  const units = ["", "cup", "cups", "Tbsp", "T", "tsp", "oz", "lb", "lbs", "g", "kg", "ml", "L", "fl oz", "quart", "pints", "gal", "can", "cans", "cloves", "bunch", "pinch", "dash", "slices", "stick", "knob", "(15 oz) can", "can (14.5 oz)", "(6-ounce)", "15-oz can", "(240 ml)", "large", "of"];
  const names = ["flour", "black beans", "garlic", "milk or cream", "chicken or vegetable broth", "onion", "cheddar (shredded)", "rice (1 cup)", "cooked rice", "2% milk", ""];
  const suffixes = ["", ", diced", ", to taste", " ($0.16)", " (optional)", ", plus 2 tbsp", " to taste", ", or 1 cup water", " ($1.23*)", ", divided"];
  const prefixes = ["", "- ", "• ", "optional: ", "a "];

  it("every line keeps the contract and every proposal satisfies the invariants", () => {
    let n = 0;
    let proposals = 0;
    let leaveOuts = 0;
    for (const [ai, a] of amounts.entries()) {
      for (const [ui, u] of units.entries()) {
        for (const [ni, name] of names.entries()) {
          const suffix = suffixes[(ai + ui + ni) % suffixes.length];
          const prefix = prefixes[(ai * 7 + ui * 3 + ni) % prefixes.length];
          const line = `${prefix}${a} ${u} ${name}${suffix}`.replace(/\s+/g, " ");
          const r = parseIngredientLine(line);
          expectInvariants(r, line);
          n++;
          if (r.suggestion?.use) proposals++;
          if (r.suggestion && !r.suggestion.use) leaveOuts++;
        }
      }
    }
    expect(n).toBe(amounts.length * units.length * names.length);
    expect(proposals).toBeGreaterThan(500); // the sweep exercises real proposals, not just nulls
    expect(leaveOuts).toBeGreaterThan(50);
  });

  it("a proposal's quantity is an exact decimal or carries a rounding note", () => {
    for (const line of ["⅓ cup a", "1/7 cup b", "2/9 tsp c", "5/6 quart d", "1/3 (15 oz) can e", "1/3 (2/3 oz) packet f", "3/11 cup g"]) {
      const r = parseIngredientLine(line);
      expectInvariants(r, line);
      expect(r.suggestion?.use).toBe(true);
      const q = (r.suggestion as { quantity: string }).quantity;
      if (q.includes(".") && q.split(".")[1].length === 4 && /rounded/.test(r.suggestionNote ?? "")) continue;
      expect(r.suggestionNote ?? "").not.toMatch(/rounded/);
    }
    expect(parseIngredientLine("1/3 (15 oz) can e").suggestion).toMatchObject({ quantity: "5" }); // exact after multiplying
    expect(parseIngredientLine("2/9 tsp c").suggestion).toMatchObject({ quantity: "0.2222" });
    expect(parseIngredientLine("5/6 quart d").suggestion).toMatchObject({ quantity: "3.3333", unit: "cup" });
    expect(parseIngredientLine("5/9 cup x").suggestion).toMatchObject({ quantity: "0.5556" }); // half-up
  });
});

describe("hostile input", () => {
  it("never throws, stays bounded and keeps the invariants", () => {
    const lines = [
      "1".repeat(100_000),
      `1 ${"(".repeat(10_000)}`,
      `1 ${"(15 oz) ".repeat(5_000)}can beans`,
      `1 can ${"(14.5 oz) ".repeat(5_000)}`,
      `${"1 or ".repeat(10_000)}2 eggs`,
      `${"2-".repeat(10_000)}3 cups`,
      `1 cup ${"milk or ".repeat(10_000)}cream`,
      `1 cup ${"a, ".repeat(10_000)}`,
      `1 cup flour ${"($0.16) ".repeat(10_000)}`,
      `($${"9".repeat(10_000)})`,
      `1 ${" ".repeat(100_000)}cup`,
      `⅓ ${"large ".repeat(10_000)}onion`,
      `1 15-oz ${"can ".repeat(10_000)}`,
      "<script>alert(1)</script> 1 cup",
      "\u0000‮1 cup milk",
      "½".repeat(10_000),
      "1/".repeat(10_000),
      `1 cup ${"(a(b(c".repeat(5_000)}`,
    ];
    const t0 = Date.now();
    for (const line of lines) {
      let r!: IngredientLine;
      expect(() => (r = parseIngredientLine(line))).not.toThrow();
      expectInvariants(r, line);
      expect(r.name.length).toBeLessThanOrEqual(500);
      if (r.note) expect(r.note.length).toBeLessThanOrEqual(500);
    }
    expect(Date.now() - t0).toBeLessThan(2_000);
    for (const bad of [null, undefined, 42, {}]) {
      const r = parseIngredientLine(bad as unknown as string);
      expect(r).toMatchObject({ status: "requires_review", suggestion: null, suggestionNote: null, note: null });
    }
  });
});

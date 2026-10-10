/**
 * semantic-v2: shapes found in independent review (round 1), each tested with the reviewer's lines and
 * further lines of the same shape. Every rule is general (no line is matched literally).
 */
import { describe, expect, it } from "vitest";
import { amountText, core, qText, read } from "./helpers";

describe("superscript and subscript fractions (B1)", () => {
  it.each([
    ["1¹⁄₂ cups flour", "1 1/2", "cup", "flour"], ["2¹⁄₂ cups flour", "2 1/2", "cup", "flour"], ["1¹/₂ cup sugar", "1 1/2", "cup", "sugar"],
    ["3¹⁄₄ lb beef", "3 1/4", "lb", "beef"], ["1¹⁄₃ cups milk", "1 1/3", "cup", "milk"], ["2²⁄₃ cups oats", "2 2/3", "cup", "oats"],
    ["1 ¹⁄₂ cups flour", "1 1/2", "cup", "flour"], ["3¹⁄₄ cups water", "3 1/4", "cup", "water"], ["1²/₃ cup cream", "1 2/3", "cup", "cream"],
    ["¹⁄₂ tsp salt", "1/2", "tsp", "salt"],
  ])("%s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });
});

describe("a bare count, then an amount with a unit (B2)", () => {
  it.each(["3 4 cups flour", "1 1 cup milk", "5 3 cups sugar", "2 2 tbsp butter", "2 1 lb beef"])("%s → needs review, no amount, the second amount noted", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null, packageSize: null });
    expect(r.reasons).toContain("quantity_unassigned");
    expect(r.note).not.toBeNull();
  });

  it("a size in brackets after a bare count is a package size only when a counted unit follows", () => {
    // semantic-v2 (CONTRACT §12.3): a per-piece weight is a note, never a package size, and the line is ready
    // (semantic-v1: "3 [6 oz] salmon fillets" had packageSize 6 oz; "2 (8 oz) chicken breasts" needed review)
    expect(read("3 [6 oz] salmon fillets")).toMatchObject({ status: "ready", unit: { canonical: "fillet" }, packageSize: null, note: "6 oz" });
    const r = read("2 (8 oz) chicken breasts");
    expect(r).toMatchObject({ status: "ready", quantity: { numerator: "2" }, packageSize: null, name: "chicken breasts", note: "8 oz" });
  });

  it.each([["a 1/2 cup sugar", "1/2", "sugar"], ["an 1/4 cup honey", "1/4", "honey"]])("an article before a written amount is not a count: %s", (line, q, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit: "cup" });
  });
});

describe("words between the amount and its unit (B3)", () => {
  it.each([
    ["2 (heaping) cups flour", "2", "cup", "flour", "heaping"], ["2 (packed) cups brown sugar", "2", "cup", "brown sugar", "packed"],
    ["1 (level) tbsp salt", "1", "tbsp", "salt", "level"], ["2 (heaped) tsp sugar", "2", "tsp", "sugar", "heaped"],
    ["1 (scant) cup milk", "1", "cup", "milk", "scant"], ["2 (US) cups flour", "2", "cup", "flour", "US"],
    ["2 (large) cans tomatoes", "2", "can", "tomatoes", "large"], ["1 (rounded) tsp cinnamon", "1", "tsp", "cinnamon", "rounded"],
    ["3 [packed] cups spinach", "3", "cup", "spinach", "packed"], ["2 (big) cans corn", "2", "can", "corn", "big"],
  ])("%s → the remark is a note, the unit is read", (line, q, unit, name, note) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "ready", name, quantity: q, unit });
    expect(r.note).toBe(note);
  });

  it("a bracketed 'about' makes the amount approximate", () => {
    expect(read("2 [about] cups flour")).toMatchObject({ status: "ready", approximate: true, name: "flour", unit: { canonical: "cup" } });
  });

  it.each([["1/2 of a cup milk", "1/2", "cup", "milk"], ["1/3 of a cup oil", "1/3", "cup", "oil"], ["1/4 of a teaspoon salt", "1/4", "tsp", "salt"]])("'of a' before the unit: %s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  // semantic-v2 (CONTRACT §12.1): "1 half cup milk" → 1/2 cup and "2 half cups milk" → 1 cup are amounts (semantic-v1: no amount)
  it.each([["1 half cup milk", "1/2"], ["2 half cups milk", "1"]])("a fraction word before the unit is the amount: %s", (line, q) => {
    expect(core(read(line))).toEqual({ status: "ready", name: "milk", quantity: q, unit: "cup" });
  });

  it.each(["1 (1/2) cup milk", "2 (1/4) tsp salt", "1 a cup milk", "2 a tbsp oil"])("a second number before the unit: %s → no amount, needs review", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null });
    expect(r.name).not.toMatch(/\b(?:cups?|tbsp|tsp|half|a)\b/i);
  });

  it.each([
    ["2 cans or jars tomato sauce", "can", "tomato sauce"], ["2 cans/jars tomato sauce", "can", "tomato sauce"], ["2 bags or boxes pasta", "bag", "pasta"],
    ["1 bottles or cans beer", "bottle", "beer"],
  ])("a second unit word is never part of the name: %s", (line, unit, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", unit: { canonical: unit }, name });
  });

  it.each(["1 (12-fl-oz) bottle beer", "1 (12 fl-oz) bottle beer", "1 (16-fl-oz) bottle soda"])("hyphenated fluid ounces: %s", (line) => {
    expect(read(line)).toMatchObject({ status: "ready", unit: { canonical: "bottle" }, packageSize: { unit: { canonical: "fl_oz" } } });
  });
});

describe("'and a half' and 'half-dozen' (B4)", () => {
  it.each([
    ["a cup and a half of flour", "1 1/2", "cup", "flour"], ["1 cup and a half milk", "1 1/2", "cup", "milk"], ["2 cups and a half water", "2 1/2", "cup", "water"],
    ["a teaspoon and a half salt", "1 1/2", "tsp", "salt"], ["a tablespoon and a half of oil", "1 1/2", "tbsp", "oil"],
    ["a half-dozen eggs", "6", "each", "eggs"], ["a half dozen eggs", "6", "each", "eggs"],
  ])("%s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });
});

describe("a number that is part of the food's name (B5)", () => {
  // semantic-v2 (CONTRACT §12.9): a number counting the product's components names it — the line is read as written
  // and is ready when it states an amount or "to taste" (semantic-v1 asked a person to confirm, `unclassified`)
  it.each([
    ["Five spice powder, to taste", "Five spice powder", null, "to_taste"], ["Three bean salad, to taste", "Three bean salad", null, "to_taste"],
    ["Three cheese blend, 1 cup", "Three cheese blend", "1 cup", null],
    ["5 spice powder, 1 tsp", "5 spice powder", "1 tsp", null], ["Twelve grain bread, 2 slices", "Twelve grain bread", "2 slice", null],
    ["Six grain cereal, 1 cup", "Six grain cereal", "1 cup", null],
  ])("%s → the number stays in the name; the amount after the comma is the amount", (line, name, amount, unstated) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", name, amountUnstated: unstated, equivalents: [] });
    expect(r.quantity === null ? null : amountText({ quantity: r.quantity as { numerator: string; denominator: string }, unit: r.unit! })).toBe(amount);
  });

  it("a number before a word that is not a counted component is still checked by a person: Seven Up, 1 can", () => {
    const r = read("Seven Up, 1 can");
    expect(r).toMatchObject({ status: "needs_review", name: "Seven Up" });
    expect(r.reasons).toContain("unclassified");
  });

  // semantic-v2 (CONTRACT §12.9, K4): with no other amount the product name is kept whole and the amount is missing
  it.each(["Five spice powder", "Seven spice blend", "Four cheese blend"])("%s → the full name, no amount", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: line, quantity: null, unit: null });
  });

  it.each([
    ["two tomato", "tomato"], ["Two egg", "egg"], ["Three onion", "onion"],
  ])("a count before a food that is not counted: %s → the count stays the amount, a person checks (never in the name)", (line, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name });
    expect(r.quantity).not.toBeNull();
    expect(r.reasons).toContain("unclassified");
  });

  it.each(["2 tomato", "4 cheese ravioli"])("a counted food that does not read as several: %s → needs review", (line) => {
    expect(read(line).status).toBe("needs_review");
  });

  it("plural or invariant foods are counted as usual", () => {
    for (const line of ["2 carrots, peeled and sliced", "12 shrimp", "twenty eggs", "3 garlic cloves", "4 boneless skinless chicken thighs"]) expect(read(line).status, line).toBe("ready");
  });

  it("a weight after a counted food is a second amount, not a restatement", () => {
    const r = read("2 chicken breasts, 1 lb");
    expect(r).toMatchObject({ status: "needs_review", quantity: { numerator: "2" }, equivalents: [], note: "1 lb" });
    expect(r.reasons).toContain("quantity_unassigned");
  });
});

describe("sizes in inches (B6)", () => {
  it.each([
    ["9-inch pie crust", "pie crust", "9-inch"], ["10-inch tortillas", "tortillas", "10-inch"], ["12 inch pizza crust", "pizza crust", "12 inch"],
    ["8 inch flour tortillas", "flour tortillas", "8 inch"], ["14-inch pizza stone", "pizza stone", "14-inch"],
  ])("%s → a note, no count invented", (line, name, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null, name, note });
    expect(r.reasons).toContain("quantity_missing");
  });

  it("equipment lines are not ingredients", () => {
    expect(read("Special equipment: 9-inch pan").status).toBe("unsupported");
  });
});

describe("restatements must agree (B7)", () => {
  // (semantic-v2, CONTRACT §12.6: "1 lb (500 g) beef" is 10.2 % off — beyond 7 %, a second amount; semantic-v1 kept it)
  it.each(["1 lb (12 oz) ground beef", "1 tbsp (1 tsp) salt", "1 cup (8 tbsp) butter", "1 quart (2 cups) stock", "1 liter (2 cups) water", "1 tsp (1 tbsp) baking soda", "2 cups (1 cup) milk", "1 kg (1 lb) flour", "1 lb (500 g) beef"])(
    "%s → a contradiction is not a restatement",
    (line) => {
      const r = read(line);
      expect(r).toMatchObject({ status: "needs_review", equivalents: [] });
      expect(r.reasons).toContain("quantity_unassigned");
    },
  );

  it.each(["1 lb flour, 4 oz", "Flour: 1 lb, 4 oz", "Sugar: 1 cup, 2 tbsp"])("%s → a second amount after a comma that disagrees", (line) => {
    expect(read(line).reasons).toContain("quantity_unassigned");
  });

  it.each([
    ["1 cup (240 ml) milk", "240 ml"], ["1 lb (450 g) carrots", "450 g"], ["1 cup (8 oz) sour cream", "8 oz"], ["1 kg (2.2 lb) flour", "2 1/5 lb"],
    ["500 ml (2 cups) water", "2 cup"],
  ])("%s → a rounded restatement across systems is kept (within RESTATEMENT_TOLERANCE)", (line, eq) => {
    const r = read(line);
    expect(r.status).toBe("ready");
    expect(r.equivalents.map(amountText)).toEqual([eq]);
  });
});

describe("recipe facts are not ingredients (B8)", () => {
  it.each([
    "Calories: 250", "Nutrition: 250 calories", "Serving size: 1 cup", "Per serving: 2 tbsp", "Portion: 200 g", "Weight: 500 g", "Total: 2 cups",
    "Special equipment: 2 baking sheets", "4 servings", "250 kcal", "Protein 20g", "Roll dough into 12 balls",
    "Fat: 10 g", "Saturated fat 3g", "Sugars: 12 g", "Total fat 10 g", "Sodium 200mg", "Fiber: 3 g", "Yield: 4 cups", "Serves 4", "Makes 12 cookies",
  ])("%s → unsupported", (line) => {
    expect(read(line).status).toBe("unsupported");
  });

  it.each([["Sugar: 1 cup", "Sugar"], ["Duck fat: 2 tbsp", "Duck fat"], ["Bacon fat, 2 tbsp", "Bacon fat"]])("a food label stays an ingredient: %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });
});

describe("number formats nobody can read for sure (B9, SF7)", () => {
  it.each(["1'000 g flour", "1e3 g flour", "2'500 g flour", "2e2 g sugar", "11/2 cups flour", "13/4 cups sugar", "21/2 cups flour", "31/3 cups oats", "1.000 g flour", "2.500 kg flour"])(
    "%s → number_format_ambiguous, no amount, a clean name",
    (line) => {
      const r = read(line);
      expect(r).toMatchObject({ status: "needs_review", quantity: null });
      expect(r.reasons).toContain("number_format_ambiguous");
      expect(r.name).toMatch(/^[a-z]+$/);
    },
  );

  it("a quoted grade still stays in the name", () => {
    expect(read('1 cup "00" flour')).toMatchObject({ status: "ready", name: '"00" flour' });
  });
});

describe("one amount for several foods (B10)", () => {
  // (semantic-v2, CONTRACT §12.7 g: no name for several foods sharing one amount; semantic-v1 kept them as the name)
  it.each(["1 tsp salt and pepper each", "1 tbsp each salt and pepper", "1 tbsp each oil and vinegar", "2 tsp sugar and salt each", "1/2 tsp garlic and onion powder each"])("%s → needs review, no name, 'each' not in the note", (line) => {
    const r = read(line);
    expect(r.status).toBe("needs_review");
    expect(r.reasons).toContain("unclassified");
    expect(r.name).toBeNull();
    expect(r.note).not.toMatch(/\beach\b/);
  });
});

describe("the name never holds the amount or the unit (B11)", () => {
  it.each([
    ["One-and-a-half cups rice", "1 1/2", "cup", "rice"], ["twenty eggs", "20", "each", "eggs"], ["thirteen cherries", "13", "each", "cherries"],
    ["forty almonds", "40", "each", "almonds"], ["three-quarters cup milk", "3/4", "cup", "milk"], ["１ cup milk", "1", "cup", "milk"], ["２ cups rice", "2", "cup", "rice"],
  ])("number words and full-width digits: %s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it.each([["tablespoon butter", "tbsp", "butter"], ["cups flour", "cup", "flour"], ["teaspoons sugar", "tsp", "sugar"], ["ounces cheese", "oz", "cheese"], ["tbsp butter", "tbsp", "butter"]])(
    "a unit with no number: %s → the unit is read, no amount",
    (line, unit, name) => {
      expect(read(line)).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: unit }, name });
    },
  );

  it.each([["pound cake", "pound cake"], ["gram flour", "gram flour"]])("a food named like a unit stays food: %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "needs_review", unit: null, name });
  });

  it.each([["2-15 oz cans black beans", "black beans"], ["3-14 oz cans beans", "beans"], ["1-28 oz can tomatoes", "tomatoes"]])("%s → needs review; the container word is not in the name", (line, name) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name });
  });
});

describe("count equivalents (SF2, CONTRACT §11.1)", () => {
  it("are stored beside a weight or volume", () => {
    expect(read("1/2 cup (1 stick) butter").equivalents.map(amountText)).toEqual(["1 stick"]);
    expect(read("8 tbsp (1 stick) butter").equivalents.map(amountText)).toEqual(["1 stick"]);
  });
});

describe("a no-fixed-amount phrase after 'or' (SF3)", () => {
  it.each([
    ["1/2 tsp salt or to taste", "salt", "to taste"], ["1 cup flour or as needed", "flour", "as needed"], ["1 tsp vanilla or to taste", "vanilla", "to taste"],
    ["1 cup cheese or more", "cheese", "or more"], ["1 tsp chili flakes or less", "chili flakes", "or less"],
  ])("%s → name %s, note %s", (line, name, note) => {
    expect(read(line)).toMatchObject({ status: "ready", name, note });
  });
});

describe("options are never made up (SF4)", () => {
  it.each([
    ["2 tbsp butter or olive oil", ["butter", "olive oil"]], ["1/4 cup honey or maple syrup", ["honey", "maple syrup"]],
    ["2 cups cheddar or Monterey Jack cheese", ["cheddar cheese", "Monterey Jack cheese"]], ["2 cups milk or almond milk", ["milk", "almond milk"]],
    ["1 cup ricotta or cottage cheese", ["ricotta cheese", "cottage cheese"]], ["2 tbsp margarine or vegetable oil", ["margarine", "vegetable oil"]],
    ["1 tbsp lemon or lime juice", ["lemon juice", "lime juice"]], ["4 cups chicken or vegetable broth", ["chicken broth", "vegetable broth"]],
    ["2 tbsp red or white wine vinegar", ["red wine vinegar", "white wine vinegar"]], ["2 cups fresh or frozen peas", ["fresh peas", "frozen peas"]],
    ["1 cup stock (chicken, beef or vegetable)", ["chicken stock", "beef stock", "vegetable stock"]],
    ["1 cup chicken, beef, or vegetable stock", ["chicken stock", "beef stock", "vegetable stock"]],
    ["1 cup flour (all-purpose (or bread (or cake)))", ["all-purpose flour", "bread flour", "cake flour"]],
    ["1 tbsp oil (vegetable, canola, or peanut)", ["vegetable oil", "canola oil", "peanut oil"]],
    ["1 cup cream (heavy or light)", ["heavy cream", "light cream"]], ["1 cup shredded cheese (cheddar, jack or colby)", ["shredded cheddar cheese", "shredded jack cheese", "shredded colby cheese"]],
    ["1 lb sausage, sweet or hot", ["sweet sausage", "hot sausage"]], ["2 cups milk (whole or 2%)", ["whole milk", "2% milk"]],
    ["2 lbs potatoes, russet or Yukon gold", ["russet", "Yukon gold"]],
    ["2 cups greens (spinach, kale or chard)", ["spinach", "kale", "chard"]], ["1 cup nuts (walnuts or pecans)", ["walnuts", "pecans"]],
  ])("%s", (line, options) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name: null, alternatives: options });
  });

  it.each([
    ["2 cups flour or 1 cup almond flour", ["flour", "almond flour"]], ["1 tsp salt or 2 tsp kosher salt", ["salt", "kosher salt"]],
    ["1 tsp oregano or 1 tbsp fresh oregano", ["oregano", "fresh oregano"]],
  ])("an option with its own amount is never merged: %s", (line, options) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", alternatives: options });
    expect(r.reasons).toContain("quantity_unassigned");
  });
});

describe("all-capital food lines (SF5)", () => {
  it.each(["SALT", "OLIVE OIL", "FRESH PARSLEY", "EGGS"])("%s → read as food (needs review: no amount)", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: line });
  });

  it("recipe-part headings in capitals are still headings", () => {
    for (const line of ["TOPPING", "FOR THE SAUCE", "FROSTING", "FILLING"]) expect(read(line).status, line).toBe("unsupported");
  });

  it("a food that begins with a preparation verb is food, for a person to check", () => {
    expect(read("Cut green beans, drained")).toMatchObject({ status: "needs_review", name: "Cut green beans", note: "drained" });
  });
});

describe("size words after a container (SF6)", () => {
  it.each([
    ["1 (16 oz) container small curd cottage cheese", "small curd cottage cheese"], ["1 cup small curd cottage cheese", "small curd cottage cheese"],
    ["1 (14 oz) can large white beans", "large white beans"], ["2 (15 oz) cans small red beans", "small red beans"],
  ])("%s → the size word names the product", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it("after a bare count or a counted portion it is still a note", () => {
    expect(read("2 large eggs")).toMatchObject({ name: "eggs", note: "large" });
    expect(read("2 large cloves garlic")).toMatchObject({ name: "garlic", note: "large" });
  });
});

describe("small things (nits)", () => {
  it.each(["2 eggs!!", "2 eggs ...", "3 eggs ...", "2 eggs…", "1 tsp vanilla!!!", "2 eggs?"])("trailing emphasis is not part of the name: %s", (line) => {
    expect(read(line).name).toMatch(/^[a-z]+$/);
  });

  it.each(["1 cup water, about", "1 cup (200 g) sugar (about)", "1 cup milk, approx.", "1 cup sugar ~", "1 cup sugar approx.", "1 tsp salt (about)"])("an 'about' remark makes the amount approximate: %s", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", approximate: true, note: null });
    expect(r.reasons).toContain("approximate_quantity");
  });

  it.each([["optional 1/2 cup walnuts", "walnuts"], ["Optional 2 tbsp honey", "honey"]])("an 'optional' prefix without a colon: %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", optional: true, name });
  });

  it.each([["1 tsp to taste salt", "salt"], ["2 tsp to taste pepper", "pepper"], ["1 cup a flour", "flour"], ["1 cup a sugar", "sugar"], ["1 tsp and salt", "salt"], ["1 cup with ice", "ice"]])(
    "left-overs before the food are taken off and the line goes to a person: %s",
    (line, name) => {
      expect(read(line)).toMatchObject({ status: "needs_review", name });
    },
  );

  it.each([["1 cup cream of", "cream"], ["salt and", "salt"], ["1 cup flour /", "flour"], ["2 tbsp butter for", "butter"]])("a name cut short goes to a person: %s", (line, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name });
    expect(r.reasons).toContain("unclassified");
  });

  it("names are never only a unit, only size words, only a number word, or only 'optional'", () => {
    expect(read("4 8-oz. cans medium")).toMatchObject({ status: "needs_review", name: null, note: "medium" });
    expect(read("3 large")).toMatchObject({ status: "needs_review", name: null, note: "large" });
    expect(read("2 cups one")).toMatchObject({ status: "needs_review", name: null, note: "one" });
    expect(read("10 cans of optional")).toMatchObject({ status: "needs_review", name: null, optional: true });
    expect(read("ounces -- mL").name).toBeNull();
    expect(read("2 eggs large")).toMatchObject({ status: "ready", name: "eggs", note: "large" });
  });

  it("a price before the amount is dropped like any other price", () => {
    expect(read("($0.50) 2 eggs")).toMatchObject({ status: "ready", name: "eggs", quantity: { numerator: "2" } });
  });

  // semantic-v2 (CONTRACT §12.3): an exact per-piece weight is a note and the line is ready ("2 (8 oz) steaks"); an
  // approximate one may be the total, so a person still checks (semantic-v1 sent all three to review)
  it("a weight between a count and the food: exact → a per-piece note; approximate → a person checks", () => {
    expect(read("2 (8 oz) steaks")).toMatchObject({ status: "ready", packageSize: null, equivalents: [], note: "8 oz" });
    for (const line of ["2 (about 1 lb) potatoes", "2 (about 8 oz) steaks"]) {
      const r = read(line);
      expect(r, line).toMatchObject({ status: "needs_review", packageSize: null, equivalents: [] });
      expect(r.reasons, line).toContain("quantity_unassigned");
    }
    // after the food, an approximate weight is the total
    expect(read("2 steaks (about 1 lb)").equivalents.map(amountText)).toEqual(["1 lb"]);
  });

  it("'a or b' is not a ready ingredient", () => {
    expect(read("a or b").status).toBe("needs_review");
  });

  it.each([["1 jalape‍ño, minced", "jalapeño"], ["2 jalape­ños", "jalapeños"], ["1 cup wa⁠ter", "water"], ["1 cup wa‌ter", "water"]])(
    "invisible joiners never split a word: %j",
    (line, name) => {
      const r = read(line);
      expect(r).toMatchObject({ status: "ready", name });
      expect(r.normalized).not.toMatch(/[­‌‍⁠]/);
    },
  );

  it("raw is the form (CONTRACT §7.6), as cooked/uncooked are", () => {
    expect(read("1 cup raw honey")).toMatchObject({ status: "ready", name: "honey", form: "raw" });
    expect(qText(read("1 cup uncooked rice").quantity)).toBe("1");
  });
});

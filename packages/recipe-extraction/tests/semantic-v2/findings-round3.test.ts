/**
 * semantic-v2: shapes found in independent review (round 3). Every finding is tested with the reviewer's
 * lines and further lines of the same shape; every rule is general (no line is matched literally).
 */
import { describe, expect, it } from "vitest";
import { amountText, core, qText, read } from "./helpers";

describe("an 'or' between product descriptors is a choice, not a note (N1)", () => {
  it.each([
    ["1 cup sugar (granulated or powdered)", ["granulated sugar", "powdered sugar"]],
    ["1 cup sugar, granulated or powdered", ["granulated sugar", "powdered sugar"]],
    ["1 can milk (evaporated or condensed)", ["evaporated milk", "condensed milk"]],
    ["1 cup cream (whipped or clotted)", ["whipped cream", "clotted cream"]],
    ["1/2 cup jalapeños (pickled or fresh)", ["pickled jalapeños", "fresh jalapeños"]],
    ["1 cup coconut oil (refined or unrefined)", ["refined coconut oil", "unrefined coconut oil"]],
    ["1 tbsp mustard (prepared or powdered)", ["prepared mustard", "powdered mustard"]],
    ["1 cup milk (skimmed or whole)", ["skimmed milk", "whole milk"]],
    ["1 cup flour (bleached or unbleached)", ["bleached flour", "unbleached flour"]],
    ["1 cup almonds (blanched or slivered)", ["blanched almonds", "slivered almonds"]],
    ["1 cup coconut (shredded or flaked)", ["shredded coconut", "flaked coconut"]],
    ["1 cup peanuts, roasted or raw", ["roasted peanuts", "raw peanuts"]],
    ["1 lb chicken (boneless or bone-in)", ["boneless chicken", "bone-in chicken"]],
    ["1 lb beef (ground or cubed)", ["ground beef", "cubed beef"]],
  ])("%s", (line, options) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: options });
  });

  it.each([
    ["1 cup tomatoes (canned or fresh)", "canned or fresh"], ["1 cup corn (frozen or canned)", "frozen or canned"],
    ["1 cup rice (cooked or uncooked)", "cooked or uncooked"], ["1/3 cup pesto (homemade or store-bought)", "homemade or store-bought"],
    ["2 cloves garlic, minced or pressed", "minced or pressed"], ["1 cup onion, diced or sliced", "diced or sliced"],
  ])("sourcing, form and preparation stay notes (CONTRACT §7.8): %s", (line, note) => {
    expect(read(line)).toMatchObject({ status: "ready", note, alternatives: [] });
  });
});

describe("a count, then a package size and a container (N2)", () => {
  it.each([
    ["2 400g cans chickpeas", "2", "can", "400 g", "chickpeas"], ["1 400 ml can coconut milk", "1", "can", "400 ml", "coconut milk"],
    ["2 200 g packs halloumi", "2", "package", "200 g", "halloumi"], ["1 500 g bag pasta", "1", "bag", "500 g", "pasta"],
    ["3 250 ml cartons stock", "3", "carton", "250 ml", "stock"], ["1 750 ml bottle wine", "1", "bottle", "750 ml", "wine"],
    ["4 125 g pots yogurt", "4", "container", "125 g", "yogurt"], ["2 100 g bars chocolate", "2", "block", "100 g", "chocolate"],
    ["6 150 g salmon fillets", "6", "fillet", "150 g", "salmon"], ["3 400 g tins tomatoes", "3", "tin", "400 g", "tomatoes"],
    ["1 330 ml can soda", "1", "can", "330 ml", "soda"], ["2 125 g balls mozzarella", "2", "ball", "125 g", "mozzarella"],
    ["1 900 g tub yogurt", "1", "container", "900 g", "yogurt"], ["2 12 fl oz bottles beer", "2", "bottle", "12 fl_oz", "beer"],
  ])("%s", (line, q, unit, pkg, name) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "ready", name, quantity: q, unit });
    expect(amountText(r.packageSize)).toBe(pkg);
  });

  it("a thousands group with no container is still ambiguous", () => {
    expect(read("1 000 g flour").reasons).toContain("number_format_ambiguous");
  });

  it.each([
    ["2 (or 3) cups flour", "2..3", "cup"], ["2 (to 3) cups flour", "2..3", "cup"], ["3 (or 4) tbsp butter", "3..4", "tbsp"],
    ["1 (or 2) cloves garlic", "1..2", "clove"], ["2 (to 4) cups water", "2..4", "cup"], ["1 (–2) tsp chili flakes", "1..2", "tsp"],
  ])("a bracketed range end before the unit: %s", (line, q, unit) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", unit: { canonical: unit } });
    expect(qText(r.quantity)).toBe(q);
    expect(r.reasons).toContain("quantity_range");
    expect(r.name).not.toMatch(/cups?|tbsp|tsp|cloves?/);
  });
});

describe("restatements within one measurement system are exact (N3)", () => {
  it.each([
    "1 lb (14 oz) beef", "1 lb (15 oz) beef", "1 lb (17 oz) beef", "1 lb (18 oz) beef", "2 lb (30 oz) beef", "1 cup (14 tbsp) butter", "1 cup (15 tbsp) butter",
    "1 quart (3 1/2 cups) stock", "1 gallon (15 cups) water", "1 pint (14 fl oz) cream", "1 cup (7 fl oz) milk", "1 cup (9 fl oz) milk", "2 cups (15 fl oz) milk",
    "1 lb (8 oz) cheese", "1 tbsp (2 tsp) sugar", "1/2 cup (4 tbsp) butter", "1 pint (3 cups) cream", "1 kg (900 g) potatoes", "1 l (750 ml) stock",
    "1 gallon (3 quarts) water",
  ])("%s → a contradiction", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", equivalents: [] });
    expect(r.reasons).toContain("quantity_unassigned");
  });

  it.each([
    ["1 lb (16 oz) beef", "16 oz"], ["1/2 cup (8 tbsp) butter", "8 tbsp"], ["1 pint (2 cups) cream", "2 cup"], ["1 gallon (4 quarts) water", "4 quart"],
    ["1 kg (1000 g) flour", "1000 g"], ["1 cup (240 ml) milk", "240 ml"], ["1 lb (454 g) beef", "454 g"], ["1 lb (500 g) beef", "500 g"],
    ["2 tbsp (30 ml) oil", "30 ml"], ["1 oz (28 g) cheese", "28 g"], ["1 stick (1/2 cup) butter", "1/2 cup"],
  ])("%s → kept (exact within a system; rounded across systems)", (line, eq) => {
    const r = read(line);
    expect(r.status).toBe("ready");
    expect(r.equivalents.map(amountText)).toEqual([eq]);
  });

  it("a package restated in another system restates the package, not the amount", () => {
    const r = read("2 (15 oz) cans (425 g) beans");
    expect(r).toMatchObject({ status: "ready", equivalents: [] });
    expect(amountText(r.packageSize)).toBe("15 oz");
    expect(read("2 cans (15 oz each) beans (3 cups)").reasons).toContain("quantity_unassigned");
  });
});

describe("a number after a comma is an amount nobody can place (N4)", () => {
  it.each([
    "2 eggs, 3", "1 cup flour, 2", "1 lb beef, 2", "1 cup sugar, 1/2", "2 cups flour, 3 eggs", "Seven layer bars, 12", "Two bite brownies, 12",
    "Four seasons pizza, 1", "Five guys burgers, 2", "1 cup milk, 4", "2 onions, 1", "3 tbsp oil, 2 tbsp", "Three musketeers bars, 6",
  ])("%s → needs review", (line) => {
    const r = read(line);
    expect(r.status).toBe("needs_review");
    expect(r.reasons).toContain("quantity_unassigned");
  });

  it.each(["1 lb chicken, cut into 1-inch pieces", "1 lb chicken, 1-inch cubes", "1 lemon, cut into 8 wedges", "1 lb chicken, 2 cm cubes"])("a size or a preparation after a comma stays a note: %s", (line) => {
    expect(read(line).status).toBe("ready");
  });
});

describe("number words and measures (N5, N7)", () => {
  it.each([
    ["a hundred grams flour", "100", "g", "flour"], ["one hundred grams flour", "100", "g", "flour"], ["two hundred fifty grams sugar", "250", "g", "sugar"],
    ["a thousand ml water", "1000", "ml", "water"], ["one-hundred grams butter", "100", "g", "butter"], ["1/2-dozen eggs", "6", "each", "eggs"],
    ["1/2-dozen bagels", "6", "each", "bagels"], ["quarter cup sugar", "1/4", "cup", "sugar"], ["third cup oil", "1/3", "cup", "oil"],
    ["quarter pound beef", "1/4", "lb", "beef"], ["quarter teaspoon salt", "1/4", "tsp", "salt"], ["quarter cup butter", "1/4", "cup", "butter"],
    ["third cup honey", "1/3", "cup", "honey"], ["quarter of a cup sugar", "1/4", "cup", "sugar"],
  ])("%s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it.each([["2 heaping spoonfuls sugar", "2 heaping spoonfuls"], ["2 (heaping) spoonfuls sugar", "2 spoonfuls; heaping"], ["3 generous glugs olive oil", "3 generous glugs"], ["2 heaping dsp sugar", "2 heaping dsp"]])(
    "a measure that is not a registry unit, after a measure word: %s",
    (line, note) => {
      const r = read(line);
      expect(r).toMatchObject({ status: "needs_review", quantity: null, unit: null, note });
      expect(r.reasons).toContain("unit_unknown");
    },
  );

  it.each(["quarter", "1 quarter onion"])("a bare 'quarter' before no unit is not an amount: %s", (line) => {
    expect(read(line).quantity === null || qText(read(line).quantity) === "1").toBe(true);
  });
});

describe("real ingredients are never refused as recipe facts (N6)", () => {
  it.each([
    ["Protein powder: 1 scoop", "Protein powder"], ["Protein powder, 2 scoops", "Protein powder"], ["Low sodium soy sauce: 2 tbsp", "Low sodium soy sauce"],
    ["Reduced sodium chicken broth: 2 cups", "Reduced sodium chicken broth"], ["Sodium bicarbonate, 1 tsp", "Sodium bicarbonate"], ["Sodium citrate, 2 tsp", "Sodium citrate"],
    ["Sodium alginate: 5 g", "Sodium alginate"], ["For serving: lemon wedges", "lemon wedges"], ["For serving: crusty bread", "crusty bread"],
    ["Fat: 2 tbsp bacon grease", "bacon grease"], ["Total cereal, 1 cup", "Total cereal"], ["Fiber One cereal: 1 cup", "Fiber One cereal"],
    ["Energy drink: 1 can", "Energy drink"], ["Low fat milk: 1 cup", "Low fat milk"], ["Sodium-free salt: 1 tsp", "Sodium-free salt"],
  ])("%s → food", (line, name) => {
    const r = read(line);
    expect(r.status).not.toBe("unsupported");
    expect(r.name).toBe(name);
  });

  it.each(["Per person: 200 g pasta", "4 portions of salmon", "4 portions salmon (150 g each)", "2 servings cooked rice", "1 serving instant oatmeal", "2 portions noodles", "You will need: 2 baking sheets", "Sugars: 1 cup"])(
    "a line that may be food but is unclear goes to a person, never refused: %s",
    (line) => {
      expect(read(line).status).not.toBe("unsupported");
    },
  );

  it.each(["BREAD", "STOCK", "SYRUP", "PIE CRUST", "SAUCE", "DRESSING", "CRUST"])("an all-capital line that may be food is food: %s", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: line });
  });

  it.each(["Calories: 250", "Serving size: 1 cup", "250 kcal", "Protein 20g", "Calories 200 per serving", "Energy: 450 kJ", "Carbs 30 g", "Nutrition: 250 calories", "MARINADE", "FROSTING", "Special equipment: 9-inch pan"])(
    "whole recipe-fact lines and part headings are still not ingredients: %s",
    (line) => {
      expect(read(line).status).toBe("unsupported");
    },
  );
});

describe("inch marks, dimensions and feet are sizes (N8)", () => {
  it.each([
    ['12" pizza crust', "pizza crust", '12"'], ['9" pie crust', "pie crust", '9"'], ['10" tortillas', "tortillas", '10"'], ["8″ springform pan", "springform pan", "8″"],
    ["9x13 inch pan", "pan", "9x13 inch"], ["13x9 pan", "pan", "13x9"], ["9 by 13 inch pan", "pan", "9 by 13 inch"], ['9 x 13" baking dish', "baking dish", '9 x 13"'],
    ["2 feet sausage casing", "sausage casing", "2 feet"], ["3 feet twine", "twine", "3 feet"], ["1 yard cheesecloth", "cheesecloth", "1 yard"],
  ])("%s → note, no amount", (line, name, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null, unit: null, name, note });
  });

  it('a size after a count: 2 12" pizza crusts', () => {
    expect(read('2 12" pizza crusts')).toMatchObject({ status: "ready", quantity: { numerator: "2" }, name: "pizza crusts", note: '12"' });
  });
});

describe("options are never invented, dropped or stripped of their food (SF-a)", () => {
  it.each([
    ["2 cups greens, spinach or kale", ["spinach", "kale"]], ["1 cup nuts, almonds or cashews", ["almonds", "cashews"]],
    ["2 lbs potatoes, russet or Yukon gold", ["russet", "Yukon gold"]], ["1 cup milk, dairy or non-dairy", ["dairy milk", "non-dairy milk"]],
    ["1 lb bacon (smoked or unsmoked)", ["smoked bacon", "unsmoked bacon"]], ["1 cup Greek or plain yogurt", ["Greek yogurt", "plain yogurt"]],
    ["2 tbsp maple or agave syrup", ["maple syrup", "agave syrup"]], ["1 cup pinto or black beans", ["pinto beans", "black beans"]],
    ["1 lb flank or skirt steak", ["flank steak", "skirt steak"]], ["1 cup oats (rolled or quick-cooking)", ["rolled oats", "quick-cooking oats"]],
    ["1 tbsp fresh or 1 tsp dried thyme", ["fresh thyme", "dried thyme"]], ["1 lb fresh or 12 oz frozen spinach", ["fresh spinach", "frozen spinach"]],
    ["1 cup cooked or 1/2 cup dry quinoa", ["cooked quinoa", "dry quinoa"]], ["1 cup Swiss or provolone cheese", ["Swiss cheese", "provolone cheese"]],
    ["2 tbsp white or yellow miso", ["white miso", "yellow miso"]], ["1 cup sweet or dry vermouth", ["sweet vermouth", "dry vermouth"]],
    ["1 lb sea or bay scallops", ["sea scallops", "bay scallops"]], ["1 tbsp fresh or 1 tsp ground ginger", ["fresh ginger", "ground ginger"]],
    ["1 cup yogurt, Greek or regular", ["Greek yogurt", "regular yogurt"]], ["2 cups milk, whole or low-fat", ["whole milk", "low-fat milk"]],
    ["1/4 cup honey or maple syrup", ["honey", "maple syrup"]], ["2 tbsp butter or olive oil", ["butter", "olive oil"]], ["1 cup milk or heavy cream", ["milk", "heavy cream"]],
  ])("%s", (line, options) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: options });
  });

  it.each([
    ["1 cup cheese, cheddar or Swiss", "cheese", "cheddar or Swiss"], ["1 lb fish, cod or haddock", "fish", "cod or haddock"],
    ["1 lb pasta, penne or rigatoni", "pasta", "penne or rigatoni"], ["1 lb beef, chuck or brisket", "beef", "chuck or brisket"],
    ["2 cups lettuce, romaine or iceberg", "lettuce", "romaine or iceberg"], ["1 cup milk, cream or half-and-half", "milk", "cream or half-and-half"],
  ])("unsure whether the food is one of the options: %s → the food, the choice as a note, a person decides", (line, name, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name, note, alternatives: [] });
    expect(r.reasons).toContain("unclassified");
  });

  it.each(["1 cup cheese (such as cheddar or Gruyère)", "1 cup cheese (like cheddar or Colby)", "1 cup cheese (e.g. cheddar or Colby)"])("examples in a remark are a note: %s", (line) => {
    expect(read(line)).toMatchObject({ status: "ready", name: "cheese", alternatives: [] });
  });
});

describe("number words inside names, unit words that begin names (SF-c, SF-d)", () => {
  it.each([
    ["1 cup half and half", "half and half"], ["1 cup Half & Half", "Half & Half"], ["half and half, 1 cup", "half and half"], ["2 tbsp half & half", "half & half"],
    ["1 cup half and half cream", "half and half cream"], ["1 slice pound cake", "pound cake"], ["2 slices pound cake", "pound cake"], ["1 lb pound cake", "pound cake"],
    ["1 package gram crackers", "gram crackers"], ["1 cup cup noodles", "cup noodles"], ["1 cup gram flour", "gram flour"],
  ])("%s → %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });
});

describe("a count never goes into the name (SF-e)", () => {
  it.each([["2 chicken breast, about 1 lb", "chicken breast", "2"], ["3 chicken thigh, about 1.5 lb", "chicken thigh", "3"], ["Two egg", "egg", "2"], ["Three onion", "onion", "3"], ["Four apple", "apple", "4"]])(
    "%s",
    (line, name, q) => {
      const r = read(line);
      expect(r).toMatchObject({ status: "needs_review", name });
      expect(qText(r.quantity)).toBe(q);
    },
  );
});

describe("dotted thousands, full-width separators, joiners between digits (SF-f, SF-h)", () => {
  it.each(["1.250 g flour", "1.750 kg potatoes", "2.500 kg flour", "1.125 kg sugar", "１，５ kg flour", "１，２５ kg flour"])("%s → ambiguous", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null });
    expect(r.reasons).toContain("number_format_ambiguous");
  });

  it.each([["1.125 cups flour", "1 1/8"], ["0.250 kg butter", "1/4"], ["１．５ kg flour", "1 1/2"]])("%s → exact", (line, q) => {
    expect(qText(read(line).quantity)).toBe(q);
  });

  it.each(["1­2 cups flour", "1‍2 cups flour", "1⁠2 cups flour", "1‌2 cups flour"])("a joiner between digits never makes one number: %j", (line) => {
    const r = read(line);
    expect(r.status).toBe("needs_review");
    expect(qText(r.quantity)).not.toBe("12");
  });

  it.each([["1⁠/2 cup sugar", "1/2"], ["2­1/2 cups flour", "2 1/2"]])("a joiner beside a slash is a space: %j", (line, q) => {
    expect(qText(read(line).quantity)).toBe(q);
  });
});

describe("a per-item weight of a whole item is not the amount (SF-g)", () => {
  it.each([["a 3 lb chicken", "chicken", "3 lb"], ["a 4 lb pork shoulder", "pork shoulder", "4 lb"], ["a 5 lb turkey", "turkey", "5 lb"], ["a 2-pound chicken", "chicken", "2-pound"]])(
    "%s → one item, the weight noted, a person checks",
    (line, name, note) => {
      const r = read(line);
      expect(r).toMatchObject({ status: "needs_review", name, note, unit: { canonical: "each" } });
      expect(qText(r.quantity)).toBe("1");
    },
  );

  it("an article before a fraction is not a count; before a container it is", () => {
    expect(core(read("a 1/4 cup butter"))).toEqual({ status: "ready", name: "butter", quantity: "1/4", unit: "cup" });
    expect(read("an 8 oz block cream cheese")).toMatchObject({ status: "ready", unit: { canonical: "block" }, packageSize: { quantity: { numerator: "8" } } });
  });
});

describe("nits", () => {
  it.each([["1 cup heaping flour", "flour", "heaping"], ["2 tbsp scant sugar", "sugar", "scant"], ["1 cup packed brown sugar", "brown sugar", "packed"], ["1 cup firmly packed brown sugar", "brown sugar", "firmly packed"]])(
    "a measure word after the unit is a note: %s",
    (line, name, note) => {
      expect(read(line)).toMatchObject({ status: "ready", name, note });
    },
  );

  it.each(["1 (UK) pint milk", "1 UK pint milk", "1 imperial gallon water", "1 pint (UK) milk", "1 (Australian) cup flour", "1 metric cup flour"])("a non-US measure is not the US size: %s → needs review", (line) => {
    const r = read(line);
    expect(r.status).toBe("needs_review");
    expect(r.reasons).toContain("unclassified");
  });

  it.each(["2 (US) cups flour", "1 (US) gallon milk"])("a US measure is the registry size: %s", (line) => {
    expect(read(line).status).toBe("ready");
  });

  it.each(["to taste", "as needed"])("a no-fixed-amount phrase alone names no food: %s", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null });
  });
});

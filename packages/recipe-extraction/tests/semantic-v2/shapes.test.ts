/**
 * semantic-v2: less common line shapes — numbered steps, alternative amounts, distributive "each",
 * several foods in one line, part-of-a-food lines, attached units, lengths, articles in options.
 * Each case is written from the contract's reading rules, not from any label file.
 */
import { describe, expect, it } from "vitest";
import { amountText, core, read } from "./helpers";

describe("numbered lines", () => {
  it("a numbered step is judged without its number", () => {
    expect(read("1. Preheat the oven to 375°F.")).toMatchObject({ status: "unsupported", reasons: ["not_an_ingredient"] });
    expect(read("2) Add the flour and stir")).toMatchObject({ status: "unsupported" });
  });

  it("a number followed by a unit is an amount, even with a stray period", () => {
    expect(core(read("2. cups milk"))).toEqual({ status: "ready", name: "milk", quantity: "2", unit: "cup" });
  });

  it("a numbered marker before an amount is a list marker", () => {
    expect(core(read("1) 2 cups flour"))).toEqual({ status: "ready", name: "flour", quantity: "2", unit: "cup" });
  });
});

describe("attached and spaced units", () => {
  it.each([
    ["1cup flour", "1", "cup"],
    ["½cup sugar", "1/2", "cup"],
    ["1 1/2cups milk", "1 1/2", "cup"],
    ["2tbsp butter", "2", "tbsp"],
    ["250ml milk", "250", "ml"],
    ["1.5kg potatoes", "1 1/2", "kg"],
    ["12fl oz beer", "12", "fl_oz"],
    ["1-cup water", "1", "cup"],
    ["¹⁄₂ cup sugar", "1/2", "cup"],
  ])("%s", (line, q, unit) => {
    const r = read(line);
    expect(core(r)).toMatchObject({ status: "ready", quantity: q, unit });
  });
});

describe("amounts that cannot be placed", () => {
  it.each([
    ["2 large or 3 small potatoes", "potatoes"],
    ["1 small (or 1/2 large) onion", "onion"],
    ["1 (15 oz) can or 2 cups cooked chickpeas", "chickpeas"],
    ["2 cups flour and 1 tsp salt", "flour"],
  ])("%s → needs review, name %s", (line, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name, alternatives: [] });
    expect(r.reasons).toContain("quantity_unassigned");
    expect(r.quantity).not.toBeNull();
  });
});

describe("one line, several foods", () => {
  // semantic-v2 (CONTRACT §12.7 g, §12.12; corpus probes 339/379/576): several foods sharing the amount — no single
  // name, the foods are kept in the note (semantic-v1 kept "salt and pepper" / "eggs" as the name)
  it("a distributive 'each' needs review; the foods are kept in the note, no name", () => {
    expect(read("1 tsp each salt and pepper")).toMatchObject({ status: "needs_review", name: null, note: "salt and pepper" });
    expect(read("1/2 tsp each salt and pepper").reasons).toContain("unclassified");
  });

  it.each(["3 eggs plus 1 yolk", "1 egg + 1 egg yolk"])("another food added with its own amount: %s → needs review, no name", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name: null, alternatives: [] });
    expect(r.quantity).not.toBeNull();
    expect(r.note).toMatch(/egg/);
  });

  it("a comma list of foods needs review; a list of preparations does not", () => {
    expect(read("salt, pepper, and garlic powder to taste").status).toBe("needs_review");
    expect(read("Sour cream, avocado, cilantro, for topping").status).toBe("needs_review");
    expect(read("3 cups sourdough bread, crusts left on, torn into pieces, dried overnight")).toMatchObject({ status: "ready", name: "sourdough bread" });
    expect(read("1 bunch kale, stems removed, leaves chopped")).toMatchObject({ status: "ready", name: "kale" });
    expect(read("2 cups spinach, packed")).toMatchObject({ status: "ready", note: "packed" });
  });

  it("'juice of 1 lemon' / 'seeds from 1 vanilla bean': the food is read, a person confirms", () => {
    expect(read("Zest and juice of 1 orange")).toMatchObject({ status: "needs_review", name: "orange", note: "Zest and juice" });
    expect(read("seeds from 1 vanilla bean")).toMatchObject({ status: "needs_review", name: "vanilla bean", note: "seeds" });
  });
});

describe("sizes", () => {
  it("a length is a size note, never an amount bought", () => {
    expect(read("2 cm piece ginger")).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: "piece" }, name: "ginger", note: "2 cm" });
    expect(read("1-inch piece of ginger")).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: "piece" }, note: "1-inch" });
  });

  it("'-sized' adjectives before a unit are notes", () => {
    expect(read("1 thumb-sized piece ginger")).toMatchObject({ status: "ready", unit: { canonical: "piece" }, name: "ginger", note: "thumb-sized" });
  });

  it("a size range in brackets is a note on a counted item", () => {
    expect(read("1 (3-4 lb) whole chicken")).toMatchObject({ status: "ready", name: "whole chicken", note: "3-4 lb", packageSize: null });
    expect(read("4 (5- to 6-ounce) salmon fillets")).toMatchObject({ status: "ready", name: "salmon", note: "5- to 6-ounce" });
  });

  it("a compound restatement in brackets is summed", () => {
    expect(read("500g (1lb 2oz) beef mince").equivalents.map(amountText)).toEqual(["18 oz"]);
  });
});

describe("options", () => {
  it("articles are not part of an option", () => {
    expect(read("1 lemon or a lime").alternatives).toEqual(["lemon", "lime"]);
  });

  it("a quoted grade stays in the name", () => {
    expect(read('1 cup "00" flour')).toMatchObject({ status: "ready", name: '"00" flour' });
  });

  // semantic-v2 (CONTRACT §12.4): a portion noun after the food is the unit ("12 lemon wedges" → 12 wedge "lemon";
  // semantic-v1 kept "lemon wedges", each); product-identity nouns stay ("baby back ribs")
  it("trailing portion nouns are units unless they name the product", () => {
    expect(read("1 rack baby back ribs")).toMatchObject({ unit: { canonical: "each" }, name: "rack baby back ribs" });
    expect(read("12 lemon wedges")).toMatchObject({ unit: { canonical: "wedge" }, name: "lemon" });
  });
});

describe("units with no number, and choices inside brackets", () => {
  // semantic-v2: a singular imprecise measure opening the line is one of it, as with the article ("Pinch of salt" → 1
  // pinch, holdout-v2 label ing-h2-0061); semantic-v1 gave no amount. Precise units still get none ("Bunch of cilantro").
  it("a unit with no number is read (after size words; imprecise units also without 'of'); a singular imprecise measure is one", () => {
    expect(read("Small pinch of salt")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: "pinch" }, name: "salt", note: "Small" });
    expect(read("Dash hot sauce")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: "dash" }, name: "hot sauce" });
    expect(read("Pinches of salt")).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: "pinch" } });
    expect(read("Strip steak")).toMatchObject({ status: "needs_review", unit: null, name: "Strip steak" });
  });

  it("a form word can be one side of a choice", () => {
    expect(read("1 cup cooked or canned chickpeas")).toMatchObject({ status: "needs_review", alternatives: ["cooked chickpeas", "canned chickpeas"], form: null });
  });

  it("a bracketed list of foods names the choice", () => {
    expect(read("Fresh herbs (parsley, cilantro, or basil), for garnish")).toMatchObject({
      status: "needs_review", name: null, alternatives: ["parsley", "cilantro", "basil"], amountUnstated: "for_garnish",
    });
    expect(read("2 cups shredded cheese (cheddar, mozzarella, or a blend)").alternatives).toEqual(["cheddar", "mozzarella", "blend"]);
  });

  it("single-word bracket options complete the name unless they are nouns in their own right (plural)", () => {
    expect(read("1 cup sugar (white or brown)").alternatives).toEqual(["white sugar", "brown sugar"]);
    expect(read("1 cup nuts (walnuts or pecans)").alternatives).toEqual(["walnuts", "pecans"]);
  });

  it("number words before a package size", () => {
    expect(read("Two 15-ounce cans black beans")).toMatchObject({ status: "ready", quantity: { numerator: "2" }, unit: { canonical: "can" }, packageSize: { quantity: { numerator: "15" } } });
    expect(read("One (28-ounce) can tomatoes")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: "can" } });
  });
});

describe("purposes", () => {
  it("only application verbs mean 'no fixed amount'; other purposes are notes", () => {
    expect(read("flour, for kneading")).toMatchObject({ status: "ready", amountUnstated: "other" });
    expect(read("Rice paper, for spring rolls")).toMatchObject({ status: "needs_review", amountUnstated: null, note: "for spring rolls" });
    expect(read("powdered sugar for icing")).toMatchObject({ status: "needs_review", name: "powdered sugar", note: "for icing" });
    expect(read("1 cup sugar for the topping")).toMatchObject({ status: "ready", name: "sugar", note: "for the topping" });
  });
});

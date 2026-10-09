/**
 * semantic-v1: units (CONTRACT §7.3, UNIT_REGISTRY). `source` is the unit as written; a bare count is
 * `each` with source ""; oz is mass and fl oz volume, never inferred from the food; quarts, pints and
 * gallons are kept; count nouns and imprecise units are units.
 */
import { describe, expect, it } from "vitest";
import { UNIT_REGISTRY } from "../../src/contract";
import { core, read } from "./helpers";

describe("written units", () => {
  it.each([
    ["2 tablespoons oil", "tbsp", "tablespoons"],
    ["2 Tbsp. oil", "tbsp", "Tbsp."],
    ["2 T butter", "tbsp", "T"],
    ["2 t salt", "tsp", "t"],
    ["1 tsp salt", "tsp", "tsp"],
    ["3/4 c. sugar", "cup", "c."],
    ["2 C flour", "cup", "C"],
    ["250 g yogurt", "g", "g"],
    ["200g flour", "g", "g"],
    ["2 kgs potatoes", "kg", "kgs"],
    ["500 mg saffron", "mg", "mg"],
    ["250 mL milk", "ml", "mL"],
    ["2,5 dl milk", "dl", "dl"],
    ["1 L stock", "l", "L"],
    ["2 litres stock", "l", "litres"],
    ["1.5 lb beef", "lb", "lb"],
    ["2 lbs. beef", "lb", "lbs."],
    ["1 pound beef", "lb", "pound"],
    ["1 quart chicken stock", "quart", "quart"],
    ["1 qt. buttermilk", "quart", "qt."],
    ["2 pints cherry tomatoes", "pint", "pints"],
    ["1/2 gallon whole milk", "gallon", "gallon"],
    ["1 gal water", "gallon", "gal"],
  ])("%s → %s (source %s)", (line, unit, source) => {
    const r = read(line);
    expect(r.unit).toEqual({ canonical: unit, dimension: UNIT_REGISTRY[unit as keyof typeof UNIT_REGISTRY].dimension, source });
  });

  it("quarts, pints and gallons are never converted to cups", () => {
    expect(core(read("1 quart chicken stock"))).toEqual({ status: "ready", name: "chicken stock", quantity: "1", unit: "quart" });
    expect(core(read("2 pints cherry tomatoes"))).toEqual({ status: "ready", name: "cherry tomatoes", quantity: "2", unit: "pint" });
  });
});

describe("oz is mass, fl oz is volume — from the words written only", () => {
  it.each([
    ["8 oz milk", "oz"],
    ["6 ounces orange juice", "oz"],
    ["16 oz. sour cream", "oz"],
    ["8 oz chicken broth", "oz"],
    ["2 fl oz broth", "fl_oz"],
    ["1 fl. oz. lime juice", "fl_oz"],
    ["4 fluid ounces heavy cream", "fl_oz"],
    ["2 floz cream", "fl_oz"],
    ["1 fl ounce rum", "fl_oz"],
  ])("%s → %s", (line, unit) => {
    expect(read(line).unit?.canonical).toBe(unit);
  });

  it("a package size keeps its own ounce kind", () => {
    expect(read("1 (12 fl oz) bottle beer").packageSize).toMatchObject({ unit: { canonical: "fl_oz", dimension: "volume" } });
    expect(read("1 (12 oz) bottle beer").packageSize).toMatchObject({ unit: { canonical: "oz", dimension: "mass" } });
  });
});

describe("counted things", () => {
  it.each([
    ["3 cloves garlic", "clove", "garlic"],
    ["2 sprigs fresh thyme", "sprig", "fresh thyme"],
    ["1 bunch cilantro", "bunch", "cilantro"],
    ["2 stalks celery, chopped", "stalk", "celery"],
    ["4 slices bacon", "slice", "bacon"],
    ["1 stick butter", "stick", "butter"],
    ["1 head cauliflower", "head", "cauliflower"],
    ["2 ears corn", "ear", "corn"],
    ["1 can black beans", "can", "black beans"],
    ["2 cans of tomatoes", "can", "tomatoes"],
    ["1 package cream cheese", "package", "cream cheese"],
    ["2 pkgs yeast", "package", "yeast"],
    ["1 envelope gelatin", "envelope", "gelatin"],
    ["1 large head garlic", "head", "garlic"],
  ])("%s → %s", (line, unit, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", name, unit: { canonical: unit, dimension: "count" } });
    expect(r.reasons).toContain("count_unit");
  });

  it.each([
    ["3 garlic cloves, minced", "clove", "garlic", "cloves"],
    ["5 garlic cloves", "clove", "garlic", "cloves"],
    ["4 bacon slices", "slice", "bacon", "slices"],
    ["2 celery stalks", "stalk", "celery", "stalks"],
    ["4 thyme sprigs", "sprig", "thyme", "sprigs"],
    ["2 salmon fillets", "fillet", "salmon", "fillets"],
  ])("a portion noun after the food is the unit: %s", (line, unit, name, source) => {
    expect(read(line)).toMatchObject({ status: "ready", name, unit: { canonical: unit, source } });
  });

  it("product-form nouns after the food stay in the name (the food alone could be another product)", () => {
    expect(read("4 cinnamon sticks")).toMatchObject({ name: "cinnamon sticks", unit: { canonical: "each", source: "" } });
    expect(read("2 bay leaves")).toMatchObject({ name: "bay leaves", unit: { canonical: "each" } });
    expect(read("2 cardamom pods")).toMatchObject({ name: "cardamom pods", unit: { canonical: "each" } });
  });

  it("a bare count is each with an empty source", () => {
    for (const line of ["2 eggs", "1 red bell pepper, diced", "4 boneless skinless chicken thighs, trimmed", "1 jalapeño, minced"]) {
      expect(read(line).unit, line).toEqual({ canonical: "each", dimension: "count", source: "" });
    }
    expect(read("4 ea. tortillas").unit).toEqual({ canonical: "each", dimension: "count", source: "ea." });
  });

  it("imprecise units are read, and the line is still ready when clean", () => {
    for (const [line, unit] of [["a pinch of salt", "pinch"], ["a dash of hot sauce", "dash"], ["a splash of vinegar", "splash"], ["1 handful baby spinach", "handful"], ["2 drops vanilla", "drop"], ["1 knob butter", "knob"]] as const) {
      const r = read(line);
      expect(r, line).toMatchObject({ status: "ready", unit: { canonical: unit, dimension: "imprecise" } });
      expect(r.reasons).toContain("imprecise_unit");
    }
  });

  it("an inch is a size, never an amount bought: noted, and no count is invented", () => {
    for (const [line, name, note] of [
      ["1 inch ginger", "ginger", "1 inch"], ["9-inch pie crust", "pie crust", "9-inch"], ["10-inch tortillas", "tortillas", "10-inch"],
      ["12 inch pizza crust", "pizza crust", "12 inch"], ["8 inch flour tortillas", "flour tortillas", "8 inch"], ["6 in. skewers", "skewers", "6 in"],
    ] as const) {
      const r = read(line);
      expect(r, line).toMatchObject({ status: "needs_review", quantity: null, unit: null, name, note });
      expect(r.reasons, line).toContain("quantity_missing");
    }
    // with a count, the size is a note on what is counted
    expect(read("2 (10-inch) flour tortillas")).toMatchObject({ status: "ready", quantity: { numerator: "2" }, name: "flour tortillas", note: "10-inch" });
  });

  it("a unit with no number is read but no amount is invented", () => {
    expect(read("Pinch of salt")).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: "pinch" }, name: "salt" });
    expect(read("Bunch of cilantro")).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: "bunch" }, name: "cilantro" });
  });

  it("case of unit words does not change the unit (except T/t, the cooking convention)", () => {
    for (const line of ["1 CUP FLOUR", "1 Cup flour", "1 cup flour", "1 cUp flour"]) expect(read(line).unit?.canonical, line).toBe("cup");
    for (const line of ["2 TBSP butter", "2 Tbsp butter", "2 tbsp butter", "2 T butter"]) expect(read(line).unit?.canonical, line).toBe("tbsp");
    expect(read("2 t butter").unit?.canonical).toBe("tsp");
  });
});

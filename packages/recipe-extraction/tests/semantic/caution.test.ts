/**
 * semantic-v1: shapes where a confident reading would be wrong. The engine states what it read and
 * asks a person, rather than inventing an amount, a unit or a choice.
 */
import { describe, expect, it } from "vitest";
import { amountText, read } from "./helpers";

describe("measure words that are not registry units", () => {
  it.each([
    ["a drizzle of olive oil", "olive oil", "a drizzle"],
    ["a dollop of sour cream", "sour cream", "a dollop"],
    ["2 rashers of bacon", "bacon", "2 rashers"],
    ["2 rashers bacon", "bacon", "2 rashers"],
    ["1 punnet of strawberries", "strawberries", "1 punnet"],
    ["1 dsp sugar", "sugar", "1 dsp"],
    ["a squeeze of lemon juice", "lemon juice", "a squeeze"],
  ])("%s → needs review (unit_unknown), amount kept in the note, none invented", (line, name, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name, note, quantity: null, unit: null });
    expect(r.reasons).toContain("unit_unknown");
  });

  it("registry units before 'of' are read as usual", () => {
    expect(read("a pinch of salt")).toMatchObject({ status: "ready", unit: { canonical: "pinch" } });
    expect(read("2 cans of tomatoes")).toMatchObject({ status: "ready", unit: { canonical: "can" } });
    expect(read("1 head of garlic")).toMatchObject({ status: "ready", unit: { canonical: "head" } });
    expect(read("1 pk yeast")).toMatchObject({ status: "ready", unit: { canonical: "package", source: "pk" } });
  });
});

describe("open-ended amounts", () => {
  it.each([["up to 1 cup sugar", "up to 1"], ["at least 2 cups broth", "at least 2"]])("%s → no single amount", (line, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null, note });
    expect(r.unit).not.toBeNull();
    expect(r.reasons).toContain("quantity_range");
  });
});

describe("a slash between foods offers a choice", () => {
  it.each([
    ["1 tbsp butter/ghee", ["butter", "ghee"]],
    ["2 cups milk/cream", ["milk", "cream"]],
    ["1/2 cup chicken/vegetable stock", ["chicken stock", "vegetable stock"]],
  ])("%s", (line, options) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: options });
  });

  it("but not 'w/' (with), a fraction, or a lean ratio", () => {
    expect(read("1 chicken breast w/ skin")).toMatchObject({ status: "ready", alternatives: [] });
    expect(read("1 lb 80/20 ground beef")).toMatchObject({ status: "ready", name: "80/20 ground beef" });
    expect(read("1/2 cup sugar").alternatives).toEqual([]);
  });
});

describe("size words", () => {
  it("describe counted items (→ note), but stay in the name after a weight or volume, where they often name a product", () => {
    expect(read("2 large eggs")).toMatchObject({ name: "eggs", note: "large" });
    expect(read("1 cup small curd cottage cheese")).toMatchObject({ status: "ready", name: "small curd cottage cheese", note: null });
    expect(read("8 oz large shells")).toMatchObject({ status: "ready", name: "large shells" });
  });
});

describe("temperatures, times and headings are not ingredients", () => {
  it.each(["350°F oven", "Oven: 350°F", "Prep time: 10 minutes", "Cook time 30 min", "10 minutes", "Dry ingredients", "Wet Ingredients:"])("%s", (line) => {
    expect(read(line).status).toBe("unsupported");
  });

  it("a temperature inside an ingredient line is a note, never an amount", () => {
    expect(read("1 cup warm water (110°F)")).toMatchObject({ status: "ready", name: "warm water", note: "110°F" });
    expect(read("Water, 110°F")).toMatchObject({ status: "needs_review", quantity: null, name: "Water" });
  });
});

describe("restating a container's contents", () => {
  it("in another unit is an equivalent, not a second amount", () => {
    const r = read("1 (12 oz) package frozen peas (about 2 cups)");
    expect(r.status).toBe("ready");
    expect(amountText(r.packageSize)).toBe("12 oz");
    expect(r.equivalents.map(amountText)).toEqual(["2 cup"]);
  });

  it("in the same unit with a different value needs review", () => {
    expect(read("1 (12 oz) package frozen peas (16 oz)").reasons).toContain("quantity_unassigned");
  });
});

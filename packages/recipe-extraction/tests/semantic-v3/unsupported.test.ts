/**
 * semantic-v2: lines that are not ingredients (CONTRACT §7.12) — and lines that look odd but are.
 */
import { describe, expect, it } from "vitest";
import { read } from "./helpers";

describe("not ingredients → unsupported, nothing read", () => {
  it.each([
    ["", "empty_line"],
    ["   ", "empty_line"],
    [" ", "empty_line"],
    ["​‮", "empty_line"],
    ["For the sauce:", "section_heading"],
    ["Marinade:", "section_heading"],
    ["Sauce (optional):", "section_heading"],
    ["For the dressing", "section_heading"],
    ["TOPPING", "section_heading"],
    ["FOR THE CAKE", "section_heading"],
    ["Ingredients", "section_heading"],
    ["# Sauce", "section_heading"],
    ["**Topping**", "section_heading"],
    ["Preheat the oven to 375°F.", "not_an_ingredient"],
    ["Bake for 25 minutes", "not_an_ingredient"],
    ["Season with salt and pepper", "not_an_ingredient"],
    ["Serves 4", "not_an_ingredient"],
    ["Makes 12 muffins", "not_an_ingredient"],
    ["Note: can be made ahead", "not_an_ingredient"],
    ["See https://www.example.com/basic-pesto for the pesto recipe", "not_an_ingredient"],
    ["Recipe adapted from www.example.org", "not_an_ingredient"],
    ["•", "not_an_ingredient"],
    ["()", "not_an_ingredient"],
    // semantic-v2 (CONTRACT §12.8): a generic component word alone is a heading in any case (semantic-v1: needs_review)
    ["Dressing", "section_heading"],
  ])("%j → %s", (line, reason) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "unsupported", name: null, quantity: null, unit: null, packageSize: null, reasons: [reason] });
  });

  it("a truncated non-ingredient stays unsupported", () => {
    const r = read(`Preheat the oven ${"and wait ".repeat(80)}`);
    expect(r.status).toBe("unsupported");
    expect(r.reasons).toEqual(["input_truncated", "not_an_ingredient"]);
  });
});

describe("ingredient lines that resemble them", () => {
  it.each([
    ["2 cups flour", "ready"],
    ["Mix of salad greens", "needs_review"],
    ["Season salt", "needs_review"],
    ["Garnish: chopped parsley", "ready"],
    ["1 cup pesto (see https://www.example.com/pesto)", "ready"],
    ["Pesto", "needs_review"],
    ["Hot sauce", "needs_review"],
    ["SALT TO TASTE", "ready"],
  ])("%s → %s", (line, status) => {
    expect(read(line).status).toBe(status);
  });
});

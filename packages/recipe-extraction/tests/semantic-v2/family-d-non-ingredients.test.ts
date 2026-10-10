/**
 * semantic-v2 · family D (CONTRACT §12.8): non-ingredient lines are refused by their whole-line SHAPE — nutrition facts,
 * diet points, ratings, recipe times, recipe-card metadata, page furniture, credit lines, method steps, equipment and
 * section headings — never by a word ban. Negative controls: foods whose names contain the same words stay food, and
 * unclear lines go to a person (needs_review), not to `unsupported`.
 */
import { describe, expect, it } from "vitest";
import {
  componentHeading, creditLine, dietPoints, equipmentPhrase, methodStep, nonIngredientReason, nutrientLabelEnd, pageFurniture, ratingLine, recipeTimeLine,
} from "../../src/ingredient/semantic-v2/classify";
import { lex } from "../../src/ingredient/semantic-v2/lexer";
import { read } from "./helpers";

const toks = (s: string) => lex(s).tokens;

describe("nutrition facts → unsupported (abbreviated or spelled-out units, vitamins, minerals, caffeine)", () => {
  it.each([
    "Protein: 20 grams", "Fat: 10 grams", "Sodium: 300 milligrams", "Carbohydrates: 30 grams", "Net carbs: 5 grams", "Total Carbohydrate 22 grams",
    "Potassium: 400 milligrams", "Vitamin C: 15 mg", "Vitamin D: 2 mcg", "Vitamin A: 10%", "Vitamin B12: 2.4 mcg", "Vitamin B12 2.4 mcg", "Magnesium: 40 mg",
    "Zinc 1 mg", "Caffeine: 95 mg", "Folic acid: 400 micrograms", "Fiber: 4 grams (14% DV)", "Calcium 100 mg", "Selenium: 20 mcg", "Iron: 2 milligrams",
    "Serving size: 1 cup (240 ml)", "Serving size: 2 cookies", "Servings: 4 people", "Calories: 250 per serving",
  ])("%s", (line) => {
    expect(read(line)).toMatchObject({ status: "unsupported", name: null, quantity: null, reasons: ["not_an_ingredient"] });
  });

  it.each([
    ["1 scoop protein powder", "protein powder"], ["2 tbsp vitamin C powder", "vitamin C powder"], ["1 tsp sodium bicarbonate", "sodium bicarbonate"],
    ["2 tbsp low-sodium soy sauce", "low-sodium soy sauce"], ["1 bottle vitamin water", "vitamin water"], ["Vitamin C powder: 2 tbsp", "Vitamin C powder"],
    ["Sodium bicarbonate: 1 tsp", "Sodium bicarbonate"], ["1 cup zinc-free broth", "zinc-free broth"], ["2 tbsp caffeine-free cola", "caffeine-free cola"],
  ])("food whose name holds a nutrient word stays food: %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it("the label test is a whole-label test, not a word ban", () => {
    expect(nutrientLabelEnd(toks("Vitamin C: 15 mg"))).toBe(2);
    expect(nutrientLabelEnd(toks("protein powder 1 scoop"))).toBe(0);
    expect(nutrientLabelEnd(toks("Total 2 cups"))).toBe(0); // "total" alone names no nutrient
    expect(nonIngredientReason(toks("Per person: 200 g pasta"))).toBeNull();
  });
});

describe("diet points, ratings, times → unsupported", () => {
  it.each(["Points: 5", "Weight Watchers points: 5", "WW Points: 4", "SmartPoints: 7", "WW Points 4", "4.8 stars (120 reviews)", "5 from 3 votes", "Rated 4.5 out of 5",
    "5 stars", "Prep 10 mins", "Cook 20 mins", "Total 30 mins", "Bake 25 minutes", "Chill for 2 hours", "Active time: 30 min"])("%s", (line) => {
    expect(read(line).status).toBe("unsupported");
  });

  it.each([["2 star anise pods", "star anise"], ["1 cup minute rice", "minute rice"], ["1 tbsp Five Star seasoning", "Five Star seasoning"]])("food near those words stays food: %s", (line, name) => {
    const r = read(line);
    expect(r.status).not.toBe("unsupported");
    expect(r.name).toBe(name);
  });

  it("named shapes decide on the whole line", () => {
    expect(ratingLine(toks("4.8 stars (120 reviews)"))).toBe(true);
    expect(ratingLine(toks("2 star anise"))).toBe(false);
    expect(recipeTimeLine(toks("Prep 10 mins"))).toBe(true);
    expect(recipeTimeLine(toks("1 cup 5-minute rice"))).toBe(false);
    expect(dietPoints(toks("SmartPoints"), toks("7"))).toBe(true);
    expect(dietPoints(toks("Points"), toks("5 cups flour"))).toBe(false);
  });
});

describe("metadata, page furniture, credits, method steps → unsupported", () => {
  it.each(["Course: dinner", "Cuisine: Italian", "Keyword: weeknight", "Print recipe", "Jump to recipe", "Watch the video below", "See recipe card below", "Nutrition Facts",
    "Advertisement", "Instructions", "Method", "Notes", "Recipe adapted from Example Kitchen", "Adapted from a family recipe", "Step 2", "Step 3: Add the onions", "STEP ONE"])("%s", (line) => {
    expect(read(line).status).toBe("unsupported");
  });

  it.each(["Recipe", "Mustard greens", "Notes of citrus zest", "Steak"])("lines that only share a word stay readable: %s", (line) => {
    expect(read(line).status).toBe("needs_review");
  });

  it("named shapes", () => {
    expect(pageFurniture(toks("Jump to recipe"))).toBe(true);
    expect(pageFurniture(toks("Jump to recipe 2"))).toBe(false);
    expect(creditLine(toks("Recipe adapted from Example Kitchen"))).toBe(true);
    expect(methodStep(toks("Step 2"))).toBe(true);
    expect(methodStep(toks("Steps"))).toBe(false);
  });
});

describe("equipment → unsupported; food in containers stays food", () => {
  it.each(["You will need: 2 baking sheets", "You'll need: 1 piping bag", "1 9x13-inch baking pan", "2 baking sheets", "Parchment paper", "1 large skillet", "1 food processor"])("%s", (line) => {
    expect(read(line).status).toBe("unsupported");
  });

  it.each([
    ["1 bag frozen peas", "ready"], ["2 sheets puff pastry", "ready"], ["2 tea bags", "ready"], ["2 chicken skewers", "ready"], ["1 burrito bowl", "ready"],
    ["You will need: 2 eggs", "needs_review"], ["You'll need: 1 bag frozen peas", "needs_review"],
  ])("%s → %s", (line, status) => {
    expect(read(line).status).toBe(status);
  });

  it("the equipment test needs an equipment head and, for an ambiguous head, an equipment modifier", () => {
    expect(equipmentPhrase(toks("2 baking sheets"))).toBe(true);
    expect(equipmentPhrase(toks("2 chicken skewers"))).toBe(false);
    expect(equipmentPhrase(toks("1 bag frozen peas"))).toBe(false);
  });
});

describe("section headings in any case (§12.8)", () => {
  it.each(["SAUCE", "Cake Layers", "Topping", "PIZZA DOUGH", "Filling", "Frosting"])("%s → section_heading", (line) => {
    expect(read(line)).toMatchObject({ status: "unsupported", reasons: ["section_heading"] });
  });

  it.each(["Dressing", "whipped topping", "SALT", "OLIVE OIL", "SALT TO TASTE", "Hot sauce"])("%s is not refused", (line) => {
    expect(read(line).status).not.toBe("unsupported");
  });

  it("componentHeading reads the last word and the case", () => {
    expect(componentHeading(toks("SAUCE"))).toBe(true);
    expect(componentHeading(toks("Sauce"))).toBe(false);
    expect(componentHeading(toks("2 SAUCE"))).toBe(false);
  });
});

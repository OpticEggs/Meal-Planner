/**
 * semantic-v2 · family D (CONTRACT §12.8): non-ingredient lines are refused by their whole-line SHAPE — nutrition facts,
 * diet points, ratings, recipe times, recipe-card metadata, page furniture, credit lines, method steps, equipment and
 * section headings — never by a word ban. Negative controls: foods whose names contain the same words stay food, and
 * unclear lines go to a person (needs_review), not to `unsupported`.
 */
import { describe, expect, it } from "vitest";
import {
  componentHeading, creditLine, dietPoints, equipmentPhrase, equipmentShape, methodStep, nonIngredientReason, nutrientLabelEnd, pageFurniture, ratingLine, recipeTimeLine,
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

  // R1 H7, H8: abbreviations and variants, a serving fact with no colon, a one-line panel, star ratings
  it.each([
    "Sat. fat: 3 g", "Sat Fat 2g", "Carb 30g", "Carbs 30g", "Prot 20 g", "Sugar alcohols 4 g", "Chol 30mg", "Fibre 4g", "Mono fat 2g", "Added sugar 5g", "Total sugar 10 g",
    "Serving size 2 cookies (40 g)", "Calories: 412kcal | Carbohydrates: 52g | Protein: 18g", "Calories 250 • Fat 10g", "★★★★★ (212)", "4.5 ★ (20 reviews)",
  ])("%s → unsupported", (line) => {
    expect(read(line)).toMatchObject({ status: "unsupported", name: null, quantity: null, unit: null });
  });

  it.each([["Sugar 10g", "needs_review"], ["Sugar: 1/2 cup", "ready"], ["Lycopene 2 mg", "needs_review"], ["Carb 2 tbsp", "ready"], ["1 cup milk | 2 eggs", "needs_review"]])(
    "negative controls and the unknown default: %s → %s",
    (line, status) => {
      expect(read(line).status).toBe(status);
    },
  );

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
    ["1 bag frozen peas", "ready"], ["2 sheets puff pastry", "ready"], ["2 tea bags", "ready"],
    ["You will need: 2 eggs", "needs_review"], ["You'll need: 1 bag frozen peas", "needs_review"],
    // (R1 H1, unknown default) a holder that is never eaten after a word that may name its contents: a person checks
    // (was: ready) — skewers of chicken, or skewers?
    ["2 chicken skewers", "needs_review"], ["1 burrito bowl", "needs_review"],
  ])("%s → %s", (line, status) => {
    expect(read(line).status).toBe(status);
  });

  // R1 H1 (CONTRACT §12.8): a tool noun is equipment whatever precedes it, spaced or hyphenated, with or without a size;
  // a count or package noun before a non-food item does not make it food
  it.each([
    "1 rolling pin", "1 (9-inch) pie plate", "1 large Dutch oven", "1 12-cup Bundt pan", "1 4-quart slow cooker", "1 2-quart baking dish", "1 cast iron skillet",
    "1 cast-iron skillet", "1 wok", "1 kitchen scale", "1 egg slicer", "1 potato masher", "1 instant-read thermometer", "1 mortar and pestle", "1 Dutch oven or large pot",
    "2 oven mitts", "1 roll kitchen twine", "1 box toothpicks", "2 sheets aluminum foil", "1 sheet of wax paper", "1 package wooden skewers", "1 roll plastic wrap",
    "6 popsicle sticks", "12 paper baking cups", "24 mini cupcake liners", "2 mason jars", "6 canning jars with lids", "1 piping bag fitted with a star tip",
    "1 large rimmed baking sheet, lined with parchment", "8″ springform pan", "6 in. skewers", "1 muffin tin", "1 can opener", "2 wine glasses", "1 large bowl",
  ])("equipment: %s", (line) => {
    expect(read(line)).toMatchObject({ status: "unsupported", reasons: ["not_an_ingredient"] });
  });

  it.each([
    ["4 lasagna sheets", "lasagna sheets"], ["4 puff pastry sheets", "puff pastry"], ["6 rice paper wrappers", "rice paper wrappers"], ["24 wonton wrappers", "wonton wrappers"],
    ["1 lb onion rings", "onion rings"], ["1 lamb rack", "lamb rack"], ["2 cinnamon sticks", "cinnamon"], ["6 mozzarella sticks", "mozzarella sticks"],
    ["2 cups pan drippings", "pan drippings"], ["1 pot roast", "pot roast"], ["2 pot stickers", "pot stickers"], ["1 bag kettle chips", "kettle chips"],
    ["1 (400 g) tin chopped tomatoes", "chopped tomatoes"], ["1 jar salsa", "salsa"], ["1 scoop vanilla ice cream", "vanilla ice cream"], ["1 bottle margarita mixer", "margarita mixer"],
  ])("negative control, food that shares a word with equipment: %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it("the equipment test: a tool head, or a vessel head after a material, use or purpose word", () => {
    expect(equipmentPhrase(toks("2 baking sheets"))).toBe(true);
    expect(equipmentPhrase(toks("1 garlic press"))).toBe(true);
    expect(equipmentShape(toks("2 chicken skewers"))).toBe("unsure");
    expect(equipmentShape(toks("2 tea bags"))).toBeNull();
    expect(equipmentShape(toks("1 bag frozen peas"))).toBeNull();
    expect(equipmentShape(toks("Oil for the pan"))).toBeNull();
    expect(equipmentShape(toks("1 cup pan drippings"))).toBeNull();
  });
});

describe("section headings in any case (§12.8)", () => {
  it.each(["SAUCE", "Sauce", "Dressing", "Cake Layers", "Topping", "PIZZA DOUGH", "Pie Crust", "Filling", "Frosting", "To serve", "Filling and topping"])("%s → section_heading", (line) => {
    expect(read(line)).toMatchObject({ status: "unsupported", reasons: ["section_heading"] });
  });

  it.each(["Pesto", "whipped topping", "Whipped cream", "Croutons", "SALT", "OLIVE OIL", "SYRUP", "SALT TO TASTE", "Hot sauce", "Soy sauce"])("%s is not refused", (line) => {
    expect(read(line).status).not.toBe("unsupported");
  });

  it("componentHeading needs only component words, optionally after dish words", () => {
    expect(componentHeading(toks("SAUCE"))).toBe(true);
    expect(componentHeading(toks("Pizza Dough"))).toBe(true);
    expect(componentHeading(toks("Hot sauce"))).toBe(false);
    expect(componentHeading(toks("2 SAUCE"))).toBe(false);
  });
});

/**
 * semantic-v2 · family B: choices of ingredients (CONTRACT §7.8, §12.7). Every option is kept, in order; an option is
 * never dropped, merged or invented; the only words added are words written in the line and shared by the grammar.
 * Sourcing and form remarks stay notes.
 */
import { describe, expect, it } from "vitest";
import { read } from "./helpers";

const choice = (line: string) => {
  const r = read(line);
  expect(r.status, line).toBe("needs_review");
  expect(r.name, line).toBeNull();
  expect(r.reasons, line).toContain("ingredient_alternatives");
  return r.alternatives;
};

describe("(a) as written when the first option names a food on its own", () => {
  it.each([
    ["1 cup kale or Swiss chard", ["kale", "Swiss chard"]], ["1 lb ham or smoked turkey", ["ham", "smoked turkey"]], ["1 cup tea or apple juice", ["tea", "apple juice"]],
    ["1 cup buttermilk or plain yogurt", ["buttermilk", "plain yogurt"]], ["1 (15 oz) can chickpeas or white beans", ["chickpeas", "white beans"]],
    ["2 tbsp tahini or peanut butter", ["tahini", "peanut butter"]], ["1 tbsp sriracha or hot sauce", ["sriracha", "hot sauce"]], ["1 cup feta or goat cheese", ["feta", "goat cheese"]],
    ["1 tsp cumin or chili powder", ["cumin", "chili powder"]], ["1 tbsp Dijon or whole grain mustard", ["Dijon", "whole grain mustard"]],
    ["2 tbsp butter or olive oil", ["butter", "olive oil"]], ["1/4 cup honey or maple syrup", ["honey", "maple syrup"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });
});

describe("(b) a shared trailing head", () => {
  it.each([
    ["1 tbsp lemon or lime juice", ["lemon juice", "lime juice"]], ["4 cups chicken or vegetable broth", ["chicken broth", "vegetable broth"]],
    ["3 cups beef or chicken stock", ["beef stock", "chicken stock"]], ["2 tbsp white or yellow miso", ["white miso", "yellow miso"]],
    ["4 hamburger or hot dog buns", ["hamburger buns", "hot dog buns"]], ["1/2 cup red or white wine", ["red wine", "white wine"]],
    ["1 red or yellow bell pepper", ["red bell pepper", "yellow bell pepper"]], ["1 tsp garlic or onion powder", ["garlic powder", "onion powder"]],
    ["1 cup frozen or fresh green beans", ["frozen green beans", "fresh green beans"]], ["1/4 cup red or white wine vinegar", ["red wine vinegar", "white wine vinegar"]],
    ["2 tbsp white or apple cider vinegar", ["white vinegar", "apple cider vinegar"]], ["1 can black or pinto beans", ["black beans", "pinto beans"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });
});

describe("(c) a shared leading modifier, (d) a forward head", () => {
  it.each([
    ["1 lb ground beef or turkey", ["ground beef", "ground turkey"]], ["1 tsp dried oregano or thyme", ["dried oregano", "dried thyme"]],
    ["1 tbsp chopped parsley or cilantro", ["chopped parsley", "chopped cilantro"]], ["1 cup shredded cheddar or Monterey Jack", ["shredded cheddar", "shredded Monterey Jack"]],
    ["1 cup whole milk or 2%", ["whole milk", "2% milk"]], ["1 tbsp fresh thyme (or 1 tsp dried)", ["fresh thyme", "dried thyme"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it("negative control: a last option with its own modifier is not given the first option's", () => {
    expect(choice("1 lb ground beef or smoked turkey")).toEqual(["ground beef", "smoked turkey"]);
  });
});

describe("(e) lists, (f) 'X, A or B'", () => {
  it.each([
    ["1 tbsp maple syrup, honey, or agave", ["maple syrup", "honey", "agave"]], ["1 cup pecans, walnuts, or almonds", ["pecans", "walnuts", "almonds"]],
    ["1/2 cup raisins, cranberries or cherries", ["raisins", "cranberries", "cherries"]], ["2 cups spinach, kale, or chard", ["spinach", "kale", "chard"]],
    ["1 cup milk, cream, or half-and-half", ["milk", "cream", "half-and-half"]], ["1 cup chicken, beef, or vegetable stock", ["chicken stock", "beef stock", "vegetable stock"]],
    ["1 cup beef, chicken, or vegetable stock", ["beef stock", "chicken stock", "vegetable stock"]], ["1 cup pecans or walnuts or almonds", ["pecans", "walnuts", "almonds"]],
    ["1 cup milk/cream", ["milk", "cream"]], ["2 tbsp butter and/or oil", ["butter", "oil"]],
    ["1 cup broth, chicken or vegetable", ["chicken broth", "vegetable broth"]], ["1 cup flour, all-purpose or bread", ["all-purpose flour", "bread flour"]],
    ["1 cup sugar, white or brown", ["white sugar", "brown sugar"]], ["4 slices bread, white or wheat", ["white bread", "wheat bread"]],
    ["1 cup nuts, pecans or walnuts", ["pecans", "walnuts"]], ["1 cup cheese, cheddar or Swiss", ["cheddar", "Swiss"]],
    ["1 tbsp oil (vegetable or canola)", ["vegetable oil", "canola oil"]], ["1 cup cream (heavy or whipping)", ["heavy cream", "whipping cream"]],
    ["1/2 cup chopped nuts (pecans or walnuts)", ["pecans", "walnuts"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it("every option written is kept: the alternatives contain each option's own words", () => {
    for (const line of ["1 cup pecans, walnuts, or almonds", "1 tbsp maple syrup, honey, or agave", "1 lb chicken, pork, or tofu"]) {
      const alts = choice(line).join(" ");
      for (const w of line.replace(/^[\d/ ]+(?:cup|tbsp|lb)\s+/, "").split(/[ ,]+/).filter((x) => x !== "or" && x !== "")) expect(alts, `${line}: ${w}`).toContain(w);
    }
  });
});

describe("sourcing and form remarks stay notes (§7.8, §12.7 f)", () => {
  it.each([
    ["1/3 cup pesto (homemade (or store-bought))", "pesto"], ["⅔ cup hummus (store-bought (or see recipe))", "hummus"],
    ["1 1/3 cups chicken stock (homemade (or low-sodium boxed))", "chicken stock"], ["2 cups spinach, fresh or frozen", "spinach"],
    ["1 cup tomato sauce (jarred or homemade)", "tomato sauce"], ["1 tbsp oil (such as canola or vegetable)", "oil"],
  ])("%s → ready, %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name, alternatives: [] });
  });

  it("negative control: 'fresh or frozen' before the food is a choice (§12.7 c)", () => {
    expect(choice("1 lb fresh or frozen cranberries")).toEqual(["fresh cranberries", "frozen cranberries"]);
  });
});

describe("(g) options with their own amounts; foods sharing one amount", () => {
  it("the first option's amount is the line's", () => {
    const r = read("1 tsp dried thyme or 1 tbsp fresh thyme");
    expect(r).toMatchObject({ status: "needs_review", name: null, quantity: { numerator: "1" }, unit: { canonical: "tsp" }, alternatives: ["dried thyme", "fresh thyme"] });
  });

  it.each(["1/2 tsp each salt and pepper", "1 cup carrots, celery and onion", "1 lb. each ground beef and ground pork"])("%s → needs review, no name", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: [] });
  });
});

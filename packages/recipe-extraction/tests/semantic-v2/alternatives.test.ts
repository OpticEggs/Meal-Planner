/**
 * semantic-v2: a choice of ingredients vs an "or" inside a remark vs "or" between amounts
 * (CONTRACT §7.8). A choice is never resolved silently: name null, every option, needs review.
 */
import { describe, expect, it } from "vitest";
import { distributeOptions, foodHead, isRemarkOption, uniqueOptions } from "../../src/ingredient/semantic-v2/alternatives";
import { qText, read } from "./helpers";

describe("a choice of ingredients", () => {
  it.each([
    ["1 cup milk or cream", ["milk", "cream"]],
    ["2 tbsp butter or margarine", ["butter", "margarine"]],
    ["4 cups chicken or vegetable broth", ["chicken broth", "vegetable broth"]],
    ["1 tbsp lemon or lime juice", ["lemon juice", "lime juice"]],
    ["2 cups fresh or frozen peas", ["fresh peas", "frozen peas"]],
    ["1/4 cup red or white wine vinegar", ["red wine vinegar", "white wine vinegar"]],
    ["1 lb ground beef or turkey", ["ground beef", "turkey"]],
    ["1 cup heavy cream or half-and-half", ["heavy cream", "half-and-half"]],
    ["2 tablespoons soy sauce (or tamari)", ["soy sauce", "tamari"]],
    ["1 cup milk (or use cream)", ["milk", "cream"]],
    ["1 cup broth, or water", ["broth", "water"]],
    ["1 cup broth (chicken or vegetable)", ["chicken broth", "vegetable broth"]],
    ["1 onion, red or white", ["red onion", "white onion"]],
    ["2 cups milk (whole or 2%)", ["whole milk", "2% milk"]],
    ["1 cup cheddar, Monterey Jack, or pepper jack", ["cheddar", "Monterey Jack", "pepper jack"]],
    ["2 cups chicken, beef or vegetable stock", ["chicken stock", "beef stock", "vegetable stock"]],
    ["salt and/or pepper", ["salt", "pepper"]],
  ])("%s", (line, options) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name: null, alternatives: options });
    expect(r.reasons).toContain("ingredient_alternatives");
  });

  it("keeps the shared amount and the rest of the line", () => {
    const r = read("1/2 cup walnuts or pecans, toasted");
    expect(qText(r.quantity)).toBe("1/2");
    expect(r).toMatchObject({ unit: { canonical: "cup" }, note: "toasted", alternatives: ["walnuts", "pecans"] });
  });

  it("an option with its own amount: both foods offered, the second amount reported", () => {
    for (const [line, options] of [
      ["1 cup milk or 1/2 cup cream", ["milk", "cream"]],
      ["1 tbsp fresh thyme leaves (or 1 tsp dried)", ["fresh thyme leaves", "dried thyme leaves"]],
      ["1 tbsp fresh thyme or 1 tsp dried", ["fresh thyme", "dried thyme"]],
      ["1 can (15 oz) black beans or 1 1/2 cups cooked beans", ["black beans", "cooked beans"]],
    ] as const) {
      const r = read(line);
      expect(r.alternatives, line).toEqual(options);
      expect(r.reasons).toEqual(expect.arrayContaining(["ingredient_alternatives", "quantity_unassigned"]));
      expect(r.name).toBeNull();
    }
  });
});

describe("or inside a remark is a note", () => {
  it.each([
    ["1/3 cup pesto (homemade (or store-bought))", "homemade or store-bought"],
    ["1 cup marinara sauce (homemade (or jarred))", "homemade or jarred"],
    ["1 cup corn kernels, fresh or frozen", "fresh or frozen"],
    ["2 cups spinach (fresh or frozen)", "fresh or frozen"],
    ["1/2 cup salsa, homemade or store-bought", "homemade or store-bought"],
    ["1/4 tsp cayenne pepper (or to taste)", "or to taste"],
    ["1/2 tsp red pepper flakes, or more to taste", "or more to taste"],
    ["1 cup cheese, such as cheddar or Gruyère", "such as cheddar or Gruyère"],
    ["1 large yellow onion, chopped or sliced", "large; chopped or sliced"],
  ])("%s → note %s", (line, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", note, alternatives: [] });
    expect(r.name).not.toBeNull();
  });

  it.each([
    ["1 tsp cumin seeds, whole or ground", ["whole cumin seeds", "ground cumin seeds"]],
    ["4 chicken thighs (bone-in or boneless)", ["bone-in chicken thighs", "boneless chicken thighs"]],
  ])("a cut or grind is a different product, so a choice: %s", (line, options) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: options });
  });

  it("a long remark that happens to contain 'or' stays a note", () => {
    const line = "3 cups bread, torn into pieces and dried so they soak up the custard without turning soggy or collapsing";
    expect(read(line)).toMatchObject({ status: "ready", name: "bread", alternatives: [] });
  });
});

describe("or between amounts is a range", () => {
  it("1 or 2 jalapeños", () => {
    expect(read("1 or 2 jalapeños, seeded")).toMatchObject({ status: "needs_review", name: "jalapeños", alternatives: [], quantity: { kind: "range" } });
  });
});

describe("option helpers", () => {
  it("distributes a shared head only when every earlier option is a single word", () => {
    expect(distributeOptions(["chicken", "vegetable broth"])).toEqual(["chicken broth", "vegetable broth"]);
    expect(distributeOptions(["red", "green bell pepper"])).toEqual(["red bell pepper", "green bell pepper"]);
    expect(distributeOptions(["milk", "cream"])).toEqual(["milk", "cream"]);
    expect(distributeOptions(["ground beef", "turkey"])).toEqual(["ground beef", "turkey"]);
    expect(distributeOptions(["olive oil", "melted butter"])).toEqual(["olive oil", "melted butter"]);
    expect(distributeOptions(["x"])).toEqual(["x"]);
  });

  it("recognises remark-only options and the food they refer to", () => {
    expect(isRemarkOption("dried")).toBe(true);
    expect(isRemarkOption("fresh or frozen")).toBe(false);
    expect(isRemarkOption("cream")).toBe(false);
    expect(foodHead("fresh thyme leaves")).toBe("thyme leaves");
    expect(foodHead("fresh")).toBe("fresh");
    expect(uniqueOptions(["Milk", "milk", "", "cream"])).toEqual(["Milk", "cream"]);
  });
});

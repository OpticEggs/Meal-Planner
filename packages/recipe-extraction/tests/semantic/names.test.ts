/**
 * semantic-v1: name, note and flags (CONTRACT §7.6, §7.7, §7.9–§7.11, §7.13). The name is the food as
 * shopped for — material qualifiers kept — and never holds the amount, unit or package size.
 */
import { describe, expect, it } from "vitest";
import { core, read } from "./helpers";

describe("names keep material qualifiers", () => {
  it.each([
    ["1 cup 2% milk", "2% milk"],
    ["2 tbsp unsalted butter", "unsalted butter"],
    ["2 tbsp salted butter", "salted butter"],
    ["1 cup low-sodium chicken broth", "low-sodium chicken broth"],
    ["2 tbsp extra-virgin olive oil", "extra-virgin olive oil"],
    ["1 red bell pepper, diced", "red bell pepper"],
    ["2 cups rolled oats", "rolled oats"],
    ["4 boneless skinless chicken thighs, trimmed", "boneless skinless chicken thighs"],
    ["1 pound boneless, skinless chicken breasts", "boneless skinless chicken breasts"],
    ["4 bone-in, skin-on chicken thighs", "bone-in skin-on chicken thighs"],
    ["1 (14.5-ounce) can diced tomatoes", "diced tomatoes"],
    ["1 cup shredded mozzarella", "shredded mozzarella"],
    ["1 cup frozen peas", "frozen peas"],
    ["1/2 cup crème fraîche", "crème fraîche"],
    ["1 tsp lemon pepper seasoning", "lemon pepper seasoning"],
    ["1/2 tsp garlic salt", "garlic salt"],
    ["salt and pepper to taste", "salt and pepper"],
    ["1 cup half-and-half", "half-and-half"],
    ["2 cups chopped onion", "chopped onion"],
  ])("%s → %s", (line, name) => {
    const r = read(line);
    expect(r.name).toBe(name);
    expect(r.status).toBe("ready");
  });

  it("never puts the amount, unit or package size in the name", () => {
    const cases: [string, string][] = [
      ["1/3 cup pesto (homemade (or store-bought))", "pesto"], ["2 (15 oz) cans black beans", "black beans"], ["1 cup 2% milk", "2% milk"],
      ["1 lb 4 oz ground pork", "ground pork"], ["1 cup / 240 ml milk", "milk"], ["3 garlic cloves", "garlic"], ["1 15-oz can chickpeas", "chickpeas"],
    ];
    for (const [line, name] of cases) {
      const r = read(line);
      expect(r.name, line).toBe(name);
      expect(r.name, line).not.toMatch(/\b(cup|cups|oz|lb|cans?|cloves?)\b/);
    }
  });
});

describe("notes", () => {
  it("size words, preparation and remarks in source order, '; '-joined", () => {
    expect(read("1 medium onion, diced").note).toBe("medium; diced");
    expect(read("2 large eggs").note).toBe("large");
    expect(read("1 large yellow onion, peeled, halved and sliced")).toMatchObject({ name: "yellow onion", note: "large; peeled, halved and sliced" });
    expect(read("2 carrots, peeled and sliced").note).toBe("peeled and sliced");
    expect(read("1 cup sugar, divided").note).toBe("divided");
    expect(read("2 cups flour, plus more for dusting").note).toBe("plus more for dusting");
    expect(read("1 cup flour (packed)").note).toBe("packed");
    expect(read("2 heaping tablespoons cocoa").note).toBe("heaping");
  });

  it("text after the first top-level comma is kept whole, including its own commas", () => {
    const line = "3 cups sourdough bread, crusts left on, torn into pieces, dried overnight";
    expect(read(line)).toMatchObject({ status: "ready", name: "sourdough bread", note: "crusts left on, torn into pieces, dried overnight" });
  });

  it("a preparation phrase after the food without a comma is a note", () => {
    expect(read("3 eggs beaten")).toMatchObject({ name: "eggs", note: "beaten" });
    expect(read("1 onion finely chopped")).toMatchObject({ name: "onion", note: "finely chopped" });
  });

  it("price annotations are dropped, not noted", () => {
    for (const line of ["1 Tbsp olive oil ($0.16)", "2 (14.5 oz) cans diced tomatoes ($1.78*)", "1 tsp smoked paprika ($.10)", "1 yellow onion, diced ($0.42)", "1 cup flour $0.25"]) {
      const r = read(line);
      expect(r.status, line).toBe("ready");
      expect(r.note ?? "", line).not.toMatch(/\$/);
      expect(r.name ?? "", line).not.toMatch(/\$/);
      expect(r.reasons).toContain("price_annotation_removed");
    }
  });

  it("list bullets are dropped", () => {
    for (const line of ["- 2 cups whole milk", "• 1 tsp vanilla extract", "* 1 cup flour", "1. 2 cups flour", "3) 1 cup sugar"]) {
      const r = read(line);
      expect(r.status, line).toBe("ready");
      expect(r.reasons).toContain("list_marker_removed");
    }
  });
});

describe("form, optional, approximate, no fixed amount", () => {
  it("cooked / raw / uncooked → form", () => {
    expect(read("2 cups cooked rice")).toMatchObject({ name: "rice", form: "cooked", status: "ready" });
    expect(read("1 cup uncooked quinoa")).toMatchObject({ name: "quinoa", form: "raw" });
    expect(read("1 lb raw shrimp, peeled and deveined")).toMatchObject({ name: "shrimp", form: "raw", note: "peeled and deveined" });
    expect(read("3 cups cooked chicken, shredded")).toMatchObject({ name: "chicken", form: "cooked", note: "shredded" });
    expect(read("1 cup rice, cooked")).toMatchObject({ name: "rice", form: "cooked", note: null });
  });

  it("optional in every written form", () => {
    for (const line of ["1 tsp vanilla (optional)", "2 tbsp capers, optional", "optional: 1 tsp chili flakes", "Optional - 1 tsp salt", "(optional) 1 tsp salt", "1 tsp salt optional", "1 jalapeño, seeded and finely chopped (optional)"]) {
      const r = read(line);
      expect(r, line).toMatchObject({ optional: true, status: "ready" });
      expect(r.note ?? "", line).not.toMatch(/optional/i);
    }
  });

  it("approximate amounts", () => {
    for (const line of ["about 2 cups chicken stock", "approximately 1 lb zucchini", "~3 tbsp water", "roughly 1/2 cup cilantro, chopped", "approx. 1 cup water", "around 2 cups broth"]) {
      expect(read(line), line).toMatchObject({ approximate: true, status: "ready" });
    }
    expect(read("1 onion, roughly chopped")).toMatchObject({ approximate: false, note: "roughly chopped" });
  });

  it.each([
    ["salt and pepper to taste", "to_taste", "salt and pepper"],
    ["salt and pepper, to taste", "to_taste", "salt and pepper"],
    ["Salt: to taste", "to_taste", "Salt"],
    ["olive oil, as needed", "as_needed", "olive oil"],
    ["grated Parmesan, as desired", "as_needed", "grated Parmesan"],
    ["honey, if needed", "as_needed", "honey"],
    ["sour cream, for serving", "for_serving", "sour cream"],
    ["To serve: lemon wedges", "for_serving", "lemon wedges"],
    ["sliced green onions, for garnish", "for_garnish", "sliced green onions"],
    ["parsley, to garnish", "for_garnish", "parsley"],
    ["powdered sugar, for dusting", "other", "powdered sugar"],
    ["vegetable oil for frying", "other", "vegetable oil"],
    ["oil for deep frying", "other", "oil"],
    ["butter, for greasing", "other", "butter"],
  ])("%s → %s", (line, kind, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", quantity: null, amountUnstated: kind, name, note: null });
    expect(r.reasons).toContain("amount_unstated");
  });

  it("with an amount, the phrase is a note and amountUnstated stays null", () => {
    expect(read("1 tsp salt, plus more to taste")).toMatchObject({ status: "ready", amountUnstated: null, note: "plus more to taste" });
    expect(read("1 tsp salt, to taste")).toMatchObject({ status: "ready", amountUnstated: null, note: "to taste" });
    expect(read("1/4 cup oil for frying")).toMatchObject({ status: "ready", amountUnstated: null, note: "for frying" });
  });

  it("no amount and no such phrase → needs review (quantity_missing), name kept", () => {
    for (const [line, name] of [["fresh parsley", "fresh parsley"], ["salt", "salt"], ["eggs", "eggs"], ["butter, softened", "butter"], ["cooking spray", "cooking spray"]]) {
      const r = read(line);
      expect(core(r), line).toEqual({ status: "needs_review", name, quantity: null, unit: null });
      expect(r.reasons).toContain("quantity_missing");
    }
  });
});

describe("amount after the name (CONTRACT §7, quantity_after_name)", () => {
  it.each([
    ["flour, 2 cups", "flour", "2", "cup", null],
    ["carrots, 3 medium, diced", "carrots", "3", "each", "medium; diced"],
    ["Parmesan cheese (1/2 cup), grated", "Parmesan cheese", "1/2", "cup", "grated"],
    ["Sugar: 1/2 cup", "Sugar", "1/2", "cup", null],
    ["Sugar - 2 cups", "Sugar", "2", "cup", null],
    ["Eggs: 2", "Eggs", "2", "each", null],
    ["tomatoes (2 large), diced", "tomatoes", "2", "each", "large; diced"],
    ["flour 2 cups", "flour", "2", "cup", null],
  ])("%s", (line, name, q, unit, note) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "ready", name, quantity: q, unit });
    expect(r.note).toBe(note);
  });

  it("'juice of 1 lemon': the food is read, a person confirms what to buy", () => {
    expect(read("Juice of 1 lemon")).toMatchObject({ status: "needs_review", name: "lemon", quantity: { numerator: "1" }, note: "Juice" });
  });
});

describe("evidence spans point at what was read", () => {
  it.each([
    ["1/3 cup pesto (homemade (or store-bought))", "1/3", "cup", "pesto"],
    ["2 (15 oz) cans black beans, drained", "2", "cans", "black beans"],
    ["- 1 1/2 cups milk", "1 1/2", "cups", "milk"],
    ["3 garlic cloves", "3", "cloves", "garlic"],
    ["1 lb 4 oz ground pork", "1 lb 4 oz", "oz", "ground pork"],
  ])("%s", (line, q, u, n) => {
    const r = read(line);
    const at = (k: "quantity" | "unit" | "name") => {
      const s = r.evidence.spans[k];
      return s ? r.normalized.slice(s[0], s[1]) : null;
    };
    expect(at("quantity")).toBe(q);
    expect(at("unit")).toBe(u);
    expect(at("name")).toBe(n);
  });

  it("the package size span covers the stated size", () => {
    const r = read("2 (15 oz) cans black beans");
    const s = r.evidence.spans.packageSize!;
    expect(r.normalized.slice(s[0], s[1])).toBe("15 oz");
  });
});

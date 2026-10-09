/**
 * Ingredient-line parsing: annotations, name/note splitting, a property sweep and hostile input.
 * Replaces `recipe-import-ingredient-suggest.test.ts` (2026-10-09): the owner removed the "suggestion"
 * workflow, so its proposal expectations went with it; its inputs are kept here against the new
 * contract (exact amounts, clean names, reasons instead of proposals).
 */
import { describe, expect, it } from "vitest";
import { KNOWN_UNITS } from "@/domain/units";
import { parseAmount } from "@/domain/quantity";
import { parseIngredientLine, type IngredientLine } from "@/server/integrations/recipe-import/ingredient-line";

function expectInvariants(r: IngredientLine, line: string) {
  expect(["parsed", "requires_review", "omitted"]).toContain(r.status);
  if (typeof line === "string") expect(r.raw).toBe(line);
  if (r.status === "parsed") {
    expect(parseAmount(r.quantity ?? ""), line).not.toBeNull();
    expect(KNOWN_UNITS, line).toContain(r.unit);
    expect(r.name, line).toMatch(/\p{L}/u);
    expect(r.reasons, line).toEqual([]);
  }
  if (r.status === "requires_review") expect(r.reasons.length, line).toBeGreaterThan(0);
  if (r.quantity !== null) expect(parseAmount(r.quantity), line).not.toBeNull();
  if (r.status !== "parsed" && r.quantity !== null) expect(r.status === "omitted" || !!r.alternatives, line).toBe(true);
  expect(r.name.length).toBeLessThanOrEqual(200);
  if (r.note) expect(r.note.length).toBeLessThanOrEqual(500);
  const t = typeof line === "string" ? line.replace(/\s+/g, " ").trim() : "";
  if (/^\d/.test(t)) expect(r.name, line).not.toBe(t); // never the whole line as the name
}

describe("price annotations", () => {
  it.each([
    ["1 Tbsp olive oil ($0.16)", "1", "tbsp", "olive oil", null],
    ["1 yellow onion, diced ($0.42)", "1", "each", "yellow onion", "diced"],
    ["1 tsp smoked paprika ($.10)", "1", "tsp", "smoked paprika", null],
    ["2 cups long grain rice ($1.23*)", "2", "cup", "long grain rice", null],
    ["1/2 tsp cumin ( $0.02 )", "1/2", "tsp", "cumin", null],
    ["($0.50) 2 eggs", "2", "each", "eggs", null],
    ["1 cup milk ($0.25) ($0.25)", "1", "cup", "milk", null],
    ["1 cup milk $0.25", "1", "cup", "milk", null],
    ["1 cup milk ($0.25 each)", "1", "cup", "milk", "$0.25 each"],
    ["1 (15 oz) can beans ($0.89)", "15", "oz", "beans", null],
  ])("%j is parsed; the price is not an amount", (line, quantity, unit, name, note) => {
    expect(parseIngredientLine(line)).toMatchObject({ raw: line, quantity, unit, name, note, status: "parsed", reasons: [] });
  });
});

describe("name and note", () => {
  it.each<[string, string, string | null]>([
    ["1 large onion, diced", "onion", "large; diced"],
    ["2 cups flour (packed)", "flour", "packed"],
    ["1 cup walnuts, chopped, toasted", "walnuts", "chopped, toasted"],
    ["2 medium carrots", "carrots", "medium"],
    ["3 extra large eggs", "eggs", "extra large"],
    ["2 Extra-Large eggs (room temperature)", "eggs", "extra-large; room temperature"],
    ["1 lb chicken thighs (boneless, skinless), cubed", "chicken thighs", "boneless, skinless; cubed"],
    ["1 large onion (yellow), diced", "onion", "large; yellow; diced"],
    ["1 cup largest berries", "largest berries", null],
    ["2 cups broth,", "broth", null],
    ["1 cup rice (1 cup dry makes 3 cooked)", "rice", "1 cup dry makes 3 cooked"],
    ["1/3 cup pesto (homemade (or store-bought))", "pesto", "homemade (or store-bought)"],
    ["1 cup cheddar (sharp (aged)), shredded", "cheddar", "sharp (aged); shredded"],
  ])("%j → name %j, note %j (parsed)", (line, name, note) => {
    expect(parseIngredientLine(line)).toMatchObject({ raw: line, name, note, status: "parsed" });
  });

  it("lines that need a person are split too, and raw is untouched", () => {
    expect(parseIngredientLine("fresh parsley, to taste")).toMatchObject({ name: "fresh parsley", note: "to taste", raw: "fresh parsley, to taste", status: "requires_review" });
    expect(parseIngredientLine("2-3 (15 oz) cans black beans, drained")).toMatchObject({ name: "black beans", note: "drained", unit: "oz", range: ["2", "3"] });
  });
});

describe("property-style sweep", () => {
  const amounts = ["1", "2", "10", "0.25", ".5", "1/2", "3/4", "1/3", "2/3", "⅓", "½", "1 1/3", "1⅓", "1½", "2-3", "1 to 2", "1 or 2", "⅓-½", "0", "1/0", "12345", "1,5"];
  const units = ["", "cup", "cups", "Tbsp", "T", "tsp", "oz", "lb", "lbs", "g", "kg", "ml", "L", "fl oz", "quart", "pints", "gal", "can", "cans", "cloves", "bunch", "pinch", "dash", "slices", "stick", "knob", "(15 oz) can", "can (14.5 oz)", "(6-ounce)", "15-oz can", "(240 ml)", "large", "of"];
  const names = ["flour", "black beans", "garlic", "milk or cream", "chicken or vegetable broth", "onion", "cheddar (shredded)", "rice (1 cup)", "cooked rice", "2% milk", "", "kosher salt", "red bell pepper"];
  const suffixes = ["", ", diced", ", to taste", " ($0.16)", " (optional)", ", plus 2 tbsp", " to taste", ", or 1 cup water", " ($1.23*)", ", divided"];
  const prefixes = ["", "- ", "• ", "optional: ", "a "];

  it("every line keeps the contract; most clean combinations parse with exact amounts", () => {
    let n = 0;
    let parsed = 0;
    for (const [ai, a] of amounts.entries()) {
      for (const [ui, u] of units.entries()) {
        for (const [ni, name] of names.entries()) {
          const suffix = suffixes[(ai + ui + ni) % suffixes.length];
          const prefix = prefixes[(ai * 7 + ui * 3 + ni) % prefixes.length];
          const line = `${prefix}${a} ${u} ${name}${suffix}`.replace(/\s+/g, " ");
          const r = parseIngredientLine(line);
          expectInvariants(r, line);
          n++;
          if (r.status === "parsed") parsed++;
        }
      }
    }
    expect(n).toBe(amounts.length * units.length * names.length);
    expect(parsed).toBeGreaterThan(2000);
  });

  it("amounts stay exact rationals through package sizes and volume conversions", () => {
    expect(parseIngredientLine("1/3 (15 oz) can e").quantity).toBe("5");
    expect(parseIngredientLine("2/9 tsp c").quantity).toBe("2/9");
    expect(parseIngredientLine("5/6 quart d")).toMatchObject({ quantity: "3 1/3", unit: "cup" });
    expect(parseIngredientLine("5/9 cup x").quantity).toBe("5/9");
    expect(parseIngredientLine("1/3 (2/3 oz) packet f")).toMatchObject({ quantity: "2/9", unit: "oz" });
  });
});

describe("hostile input", () => {
  it("never throws, stays bounded and keeps the invariants", () => {
    const lines = [
      "1".repeat(100_000),
      `1 ${"(".repeat(10_000)}`,
      `1 ${"(15 oz) ".repeat(5_000)}can beans`,
      `1 can ${"(14.5 oz) ".repeat(5_000)}`,
      `${"1 or ".repeat(10_000)}2 eggs`,
      `${"2-".repeat(10_000)}3 cups`,
      `1 cup ${"milk or ".repeat(10_000)}cream`,
      `1 cup ${"a, ".repeat(10_000)}`,
      `1 cup flour ${"($0.16) ".repeat(10_000)}`,
      `($${"9".repeat(10_000)})`,
      `1 ${" ".repeat(100_000)}cup`,
      `⅓ ${"large ".repeat(10_000)}onion`,
      `1 15-oz ${"can ".repeat(10_000)}`,
      "<script>alert(1)</script> 1 cup",
      "\u0000‮1 cup milk",
      "½".repeat(10_000),
      "1/".repeat(10_000),
      `1 cup ${"(a(b(c".repeat(5_000)}`,
    ];
    const t0 = Date.now();
    for (const line of lines) {
      let r!: IngredientLine;
      expect(() => (r = parseIngredientLine(line))).not.toThrow();
      expectInvariants(r, line);
    }
    expect(Date.now() - t0).toBeLessThan(2_000);
    for (const bad of [null, undefined, 42, {}]) {
      expect(parseIngredientLine(bad as unknown as string)).toMatchObject({ status: "requires_review", note: null, name: "" });
    }
  });
});

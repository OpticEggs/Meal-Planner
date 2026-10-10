/**
 * semantic-v2: package sizes (CONTRACT §7.4), compound amounts and restatements (§7.5). A package size
 * is never multiplied into the quantity; mass and volume never convert; a second amount that is
 * neither a sum nor a restatement is reported.
 */
import { describe, expect, it } from "vitest";
import { amountText, core, qText, read } from "./helpers";

describe("package sizes: quantity = count, unit = container, packageSize = the stated size", () => {
  it.each([
    ["2 (15 oz) cans black beans, drained", "2", "can", "15 oz", "black beans"],
    ["1 (14.5-ounce) can diced tomatoes", "1", "can", "14 1/2 oz", "diced tomatoes"],
    ["1 15-oz can chickpeas, rinsed", "1", "can", "15 oz", "chickpeas"],
    ["1 15 oz can chickpeas", "1", "can", "15 oz", "chickpeas"],
    ["2 cans (15 oz each) kidney beans, drained", "2", "can", "15 oz", "kidney beans"],
    ["1 can (14.5 oz) diced tomatoes", "1", "can", "14 1/2 oz", "diced tomatoes"],
    ["1 can black beans (15 oz)", "1", "can", "15 oz", "black beans"],
    ["1 (8 oz) package cream cheese, softened", "1", "package", "8 oz", "cream cheese"],
    ["1 (12 fl oz) bottle beer", "1", "bottle", "12 fl_oz", "beer"],
    ["2 x 400g tins chopped tomatoes", "2", "tin", "400 g", "chopped tomatoes"],
    ["A 15-ounce can chickpeas", "1", "can", "15 oz", "chickpeas"],
    ["2 (6-ounce) salmon fillets", "2", "fillet", "6 oz", "salmon"],
    ["4 salmon fillets (6 oz each)", "4", "fillet", "6 oz", "salmon"],
  ])("%s", (line, q, unit, pkg, name) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "ready", name, quantity: q, unit });
    expect(amountText(r.packageSize)).toBe(pkg);
    expect(r.reasons).toContain("package_size_stated");
  });

  it("never multiplies the size in, never states a counted line in mass or volume", () => {
    const r = read("2 (15 oz) cans black beans");
    expect(qText(r.quantity)).toBe("2");
    expect(r.unit?.dimension).toBe("count");
  });

  it("a size that is not mass or volume is a note ('9-inch')", () => {
    expect(read("1 (9-inch) pie crust")).toMatchObject({ status: "ready", name: "pie crust", unit: { canonical: "each" }, packageSize: null, note: "9-inch" });
    expect(read("8 (6-inch) corn tortillas")).toMatchObject({ status: "ready", name: "corn tortillas", note: "6-inch" });
    expect(read("2 8-inch flour tortillas")).toMatchObject({ status: "ready", name: "flour tortillas", note: "8-inch" });
  });

  it("a size with no count of containers: the size is read, no count is invented", () => {
    for (const line of ["400g tin chopped tomatoes", "16-ounce package spaghetti", "12 oz. bag frozen peas"]) {
      const r = read(line);
      expect(r.status, line).toBe("needs_review");
      expect(r.quantity).toBeNull();
      expect(r.unit?.dimension).toBe("count");
      expect(r.packageSize).not.toBeNull();
      expect(r.reasons).toContain("quantity_missing");
    }
  });

  it("'total' after the size restates the whole amount", () => {
    expect(read("2 cans (30 oz total) beans")).toMatchObject({ packageSize: null, equivalents: [{ quantity: { numerator: "30" }, unit: { canonical: "oz" } }] });
    expect(read("2 chicken breasts (about 1 lb total)")).toMatchObject({ packageSize: null, equivalents: [{ unit: { canonical: "lb" } }] });
  });
});

describe("compound amounts: summed exactly into the smallest stated unit", () => {
  it.each([
    ["1 lb 4 oz ground pork", "20", "oz", "ground pork"],
    ["1 pound 8 ounces potatoes", "24", "oz", "potatoes"],
    ["1 cup plus 2 tbsp flour", "18", "tbsp", "flour"],
    ["1/2 cup plus 1 tablespoon sugar", "9", "tbsp", "sugar"],
    ["2 tbsp + 1 tsp soy sauce", "7", "tsp", "soy sauce"],
    ["½ cup + 2 tbsp sugar", "10", "tbsp", "sugar"],
    ["1 cup and 2 tablespoons milk", "18", "tbsp", "milk"],
    ["1 kg 200 g flour", "1200", "g", "flour"],
    ["1 quart plus 1 cup stock", "5", "cup", "stock"],
    ["1 cup flour, plus 2 tbsp", "18", "tbsp", "flour"],
  ])("%s → %s %s", (line, q, unit, name) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "ready", name, quantity: q, unit });
    expect(r.reasons).toContain("compound_quantity_summed");
  });

  it("never sums across mass and volume", () => {
    const r = read("1 cup 8 oz cheese");
    expect(r.reasons).not.toContain("compound_quantity_summed");
    expect(r.status).toBe("needs_review");
  });
});

describe("restatements: the first amount, the other in equivalents", () => {
  it.each([
    ["1 cup (120 g) all-purpose flour", "1", "cup", ["120 g"]],
    ["1 cup / 240 ml milk", "1", "cup", ["240 ml"]],
    ["200 g (7 oz) dark chocolate, chopped", "200", "g", ["7 oz"]],
    ["1 lb (450 g) carrots, peeled", "1", "lb", ["450 g"]],
    ["250 ml (1 cup) vegetable stock", "250", "ml", ["1 cup"]],
    ["1 cup (8 oz) sour cream", "1", "cup", ["8 oz"]],
    ["200g/7oz butter", "200", "g", ["7 oz"]],
    ["2 lb (900 g / 32 oz) beef", "2", "lb", ["900 g", "32 oz"]],
    ["1 cup (about 140 g) flour", "1", "cup", ["140 g"]],
  ])("%s", (line, q, unit, eqs) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", unit: { canonical: unit } });
    expect(qText(r.quantity)).toBe(q);
    expect(r.equivalents.map(amountText)).toEqual(eqs);
    expect(r.reasons).toContain("equivalent_quantity_stated");
  });

  it.each([
    ["1/2 cup (1 stick) butter", "1/2", "cup", ["1 stick"]],
    ["1 cup (2 sticks) butter", "1", "cup", ["2 stick"]],
    ["8 tbsp (1 stick) butter", "8", "tbsp", ["1 stick"]],
    ["2 1/4 tsp (1 packet) yeast", "2 1/4", "tsp", ["1 packet"]],
    ["15 oz (1 can) tomato sauce", "15", "oz", ["1 can"]],
  ])("a restatement in a count unit is stored too (CONTRACT §11.1): %s", (line, q, unit, eqs) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", unit: { canonical: unit }, note: null });
    expect(qText(r.quantity)).toBe(q);
    expect(r.equivalents.map(amountText)).toEqual(eqs);
    expect(r.equivalents.every((e) => e.unit.dimension === "count")).toBe(true);
    expect(r.reasons).toContain("equivalent_quantity_stated");
  });

  it("a second amount that is neither a sum nor a restatement needs review", () => {
    for (const line of ["1 cup (2 cups) flour", "1 cup 30 ml milk", "1 cup flour, 2 tbsp sugar", "1 tsp salt, plus 1/2 tsp for the eggs", "1 cup 00 flour"]) {
      const r = read(line);
      expect(r.status, line).toBe("needs_review");
      expect(r.reasons, line).toContain("quantity_unassigned");
      expect(r.quantity, line).not.toBeNull();
    }
  });
});

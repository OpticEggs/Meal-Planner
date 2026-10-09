/**
 * semantic-v1: exact amounts (CONTRACT §7.1), ranges (§7.2) and refused numbers. Every quantity is a
 * reduced rational; nothing is rounded.
 */
import { describe, expect, it } from "vitest";
import { LIMITS } from "../../src/contract";
import { core, qText, read } from "./helpers";

describe("exact amounts", () => {
  it.each([
    ["2 cups flour", "2"],
    ["12 oz spaghetti", "12"],
    ["1.5 lb beef", "1 1/2"],
    [".5 tsp baking soda", "1/2"],
    ["0.75 cup water", "3/4"],
    ["0.125 tsp salt", "1/8"],
    ["1/2 cup sugar", "1/2"],
    ["1/3 cup oil", "1/3"],
    ["2/3 cup cream", "2/3"],
    ["1/6 cup syrup", "1/6"],
    ["2/6 cup syrup", "1/3"],
    ["1 1/2 cups flour", "1 1/2"],
    ["2 1/6 cups stock", "2 1/6"],
    ["1-1/2 cups milk", "1 1/2"],
    ["2-3/4 cups milk", "2 3/4"],
    ["1⅓ cups oats", "1 1/3"],
    ["1 ½ cups broth", "1 1/2"],
    ["2½ tbsp soy sauce", "2 1/2"],
    ["⅔ cup cream", "2/3"],
    ["⅛ tsp nutmeg", "1/8"],
    ["1⁄2 cup broth", "1/2"],
    ["1 1⁄4 tsp baking powder", "1 1/4"],
    ["1 / 3 cup sugar", "1/3"],
    ["10000 g flour", "10000"],
    ["0.000001 g salt", "1/1000000"],
  ])("%s → %s", (line, q) => {
    const r = read(line);
    expect(qText(r.quantity)).toBe(q);
    expect(r.status).toBe("ready");
  });

  it("keeps thirds exact (never 0.3333) and shows a decimal only when the line wrote one", () => {
    expect(read("1/3 cup milk").quantity).toEqual({ kind: "exact", numerator: "1", denominator: "3", display: "1/3" });
    expect(read("0.5 cup milk").quantity).toEqual({ kind: "exact", numerator: "1", denominator: "2", display: "0.5" });
    expect(read("1.50 cups milk").quantity).toEqual({ kind: "exact", numerator: "3", denominator: "2", display: "1.5" });
    expect(read("1 ⅓ cups milk").quantity).toEqual({ kind: "exact", numerator: "4", denominator: "3", display: "1 1/3" });
  });

  it.each([
    ["a pinch of salt", "1", "pinch", "salt"],
    ["an egg", "1", "each", "egg"],
    ["one onion, chopped", "1", "each", "onion"],
    ["two cloves garlic", "2", "clove", "garlic"],
    ["Twelve eggs", "12", "each", "eggs"],
    ["half a lemon", "1/2", "each", "lemon"],
    ["half an onion", "1/2", "each", "onion"],
    ["a dozen eggs", "12", "each", "eggs"],
    ["2 dozen eggs", "24", "each", "eggs"],
    ["half a dozen eggs", "6", "each", "eggs"],
    ["one and a half cups flour", "1 1/2", "cup", "flour"],
    ["1 and 1/2 cups flour", "1 1/2", "cup", "flour"],
    ["a quarter cup sugar", "1/4", "cup", "sugar"],
    ["two-thirds cup milk", "2/3", "cup", "milk"],
    ["three quarters cup sugar", "3/4", "cup", "sugar"],
  ])("number words: %s", (line, q, unit, name) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "ready", name, quantity: q, unit });
    expect(r.reasons).toContain("quantity_from_word");
  });

  it("half-and-half and 'half and half' are foods, not amounts", () => {
    expect(core(read("1 cup half-and-half"))).toEqual({ status: "ready", name: "half-and-half", quantity: "1", unit: "cup" });
    expect(read("half and half, for serving")).toMatchObject({ status: "ready", name: "half and half", quantity: null, amountUnstated: "for_serving" });
  });

  it("a percentage is never an amount", () => {
    expect(core(read("1 cup 2% milk"))).toEqual({ status: "ready", name: "2% milk", quantity: "1", unit: "cup" });
    expect(core(read("1 lb 93% lean ground turkey"))).toEqual({ status: "ready", name: "93% lean ground turkey", quantity: "1", unit: "lb" });
    expect(read("2% milk").quantity).toBeNull();
  });
});

describe("refused numbers: no amount, an honest reason, the rest still read", () => {
  it.each([
    ["0 cups shredded coconut", "quantity_not_positive", "cup", "shredded coconut"],
    ["0/4 cup flour", "quantity_not_positive", "cup", "flour"],
    ["-2 cups flour", "quantity_not_positive", "cup", "flour"],
    ["1/0 cup flour", "quantity_invalid", "cup", "flour"],
    ["1 3/2 cups flour", "quantity_invalid", "cup", "flour"],
    ["1 1/0 cups flour", "quantity_invalid", "cup", "flour"],
    ["1-3/2 cups flour", "quantity_invalid", "cup", "flour"],
    ["1.2.3 cups flour", "quantity_invalid", "cup", "flour"],
    ["½½ cup sugar", "quantity_invalid", "cup", "sugar"],
    ["1//3 cup sugar", "quantity_invalid", "cup", "sugar"],
    ["1/2/3 cup sugar", "quantity_invalid", "cup", "sugar"],
    ["1,5 kg potatoes", "number_format_ambiguous", "kg", "potatoes"],
    ["1,000 g flour", "number_format_ambiguous", "g", "flour"],
    ["2,5 dl milk", "number_format_ambiguous", "dl", "milk"],
    ["10001 g flour", "quantity_implausible", "g", "flour"],
    ["0.0000001 g salt", "quantity_implausible", "g", "salt"],
    ["123456789012345678901234567890 g flour", "quantity_implausible", "g", "flour"],
  ])("%s → %s", (line, reason, unit, name) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null, name });
    expect(r.unit?.canonical).toBe(unit);
    expect(r.reasons).toContain(reason);
  });

  it("vague amounts are recognised, never turned into a number", () => {
    for (const line of ["a few sprigs thyme", "several sprigs thyme", "a couple of eggs", "some salt", "a little olive oil", "a bit of butter"]) {
      const r = read(line);
      expect(r.quantity, line).toBeNull();
      expect(r.status).toBe("needs_review");
      expect(r.reasons).toContain("quantity_missing");
      expect(r.name).not.toBeNull();
    }
    expect(read("a few sprigs thyme")).toMatchObject({ name: "thyme", unit: { canonical: "sprig" } });
  });

  it("stays within the contract bounds", () => {
    expect(read(`${LIMITS.maxQuantity} g flour`).status).toBe("ready");
    expect(read("1/1000000 g salt").status).toBe("ready");
    expect(read("1/1000001 g salt").quantity).toBeNull();
  });
});

describe("ranges (CONTRACT §7.2): needs review, unit and name still read", () => {
  it.each([
    ["2-3 cloves garlic, minced", "2..3", "clove", "garlic"],
    ["1 to 2 tbsp olive oil", "1..2", "tbsp", "olive oil"],
    ["2–3 tbsp lemon juice", "2..3", "tbsp", "lemon juice"],
    ["2 — 3 tbsp lemon juice", "2..3", "tbsp", "lemon juice"],
    ["1 or 2 jalapeños, seeded", "1..2", "each", "jalapeños"],
    ["3-4 lb pork shoulder", "3..4", "lb", "pork shoulder"],
    ["1/2-1 tsp red pepper flakes", "1/2..1", "tsp", "red pepper flakes"],
    ["⅓-½ cup sugar", "1/3..1/2", "cup", "sugar"],
    ["1/4 to 1/2 tsp salt", "1/4..1/2", "tsp", "salt"],
    ["1 cup to 1 1/2 cups water", "1..1 1/2", "cup", "water"],
    ["2 tbsp - 3 tbsp water", "2..3", "tbsp", "water"],
    ["two to three eggs", "2..3", "each", "eggs"],
  ])("%s", (line, q, unit, name) => {
    const r = read(line);
    expect(core(r)).toEqual({ status: "needs_review", name, quantity: q, unit });
    expect(r.quantity?.kind).toBe("range");
    expect(r.reasons).toContain("quantity_range");
  });

  it("a hyphenated mixed number is not a range", () => {
    const r = read("1-1/2 cups milk");
    expect(r.quantity).toEqual({ kind: "exact", numerator: "3", denominator: "2", display: "1 1/2" });
    expect(r.reasons).not.toContain("quantity_range");
  });

  it("a range that does not increase is refused, not reordered", () => {
    for (const line of ["3-2 cups flour", "2-2 cups flour", "1 - 1/2 cups flour"]) {
      const r = read(line);
      expect(r.quantity, line).toBeNull();
      expect(r.reasons).toContain("quantity_invalid");
    }
  });

  it("an approximate range keeps both facts", () => {
    expect(read("about 2-3 cups broth")).toMatchObject({ approximate: true, status: "needs_review", quantity: { kind: "range" } });
  });
});

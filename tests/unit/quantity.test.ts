/**
 * Exact amounts (import overhaul, 2026-10-09): a typed or parsed amount is an exact rational; dividing by
 * servings is exact when it terminates and otherwise kept to 12 decimal places and flagged; amounts are
 * shown as kitchen fractions when they are one.
 */
import { describe, expect, it } from "vitest";
import { displayAmount, parseAmount, perServing } from "@/domain/quantity";

describe("parseAmount", () => {
  it.each([
    ["12", "12"], ["1.5", "3/2"], [".5", "1/2"], ["1/3", "1/3"], ["2/12", "1/6"], ["1 1/3", "4/3"], ["1½", "3/2"], ["1 ½", "3/2"], ["⅔", "2/3"], ["1-1/2", "3/2"],
  ])("%j → %s", (text, rat) => {
    const r = parseAmount(text);
    expect(r && `${r.n}/${r.d}`.replace(/\/1$/, "")).toBe(rat);
  });
  it.each(["", "0", "0/3", "1/0", "-1", "abc", "1 3/2", "1,5", "1/2/3", "1e3", "99999"])("%j → not an amount", (text) => expect(parseAmount(text)).toBeNull());
});

describe("perServing", () => {
  it("is exact when the division terminates", () => {
    expect(perServing("1 1/2", 4)).toEqual({ value: "0.375", exact: true });
    expect(perServing("12", 4)).toEqual({ value: "3", exact: true });
  });
  it("keeps 12 decimal places otherwise and says so", () => {
    expect(perServing("1/3", 4)).toEqual({ value: "0.083333333333", exact: false });
    expect(perServing("2/3", 1)).toEqual({ value: "0.666666666667", exact: false });
  });
  it("refuses what isn't an amount", () => expect(perServing("x", 4)).toBeNull());
});

describe("displayAmount", () => {
  it.each([
    ["0.5", "½"], ["0.333333333333", "⅓"], ["0.666666666667", "⅔"], ["1.5", "1 ½"], ["0.083333333333", "1/12"], ["0.375", "⅜"], ["2", "2"],
    ["0.0833", "1/12"], ["0.08", "0.08"], ["1.333333333333", "1 ⅓"], ["0.1", "0.1"], ["12.25", "12 ¼"], ["0.2", "⅕"], ["1/3", "⅓"], ["1 1/2", "1 ½"],
  ])("%j → %s", (q, shown) => expect(displayAmount(q)).toBe(shown));
});

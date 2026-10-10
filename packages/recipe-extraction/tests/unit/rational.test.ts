import { describe, expect, it } from "vitest";
import {
  add, cmp, div, eq, formatDecimal, formatMixed, fromDecimalString, fromExactQuantity, isTerminating, mul, parseRationalText, rational, toDecimal, toExactQuantity, withinBounds,
} from "../../src/rational";

const r = (n: number, d = 1) => rational(BigInt(n), BigInt(d));

describe("exact rationals", () => {
  it("reduces and compares exactly", () => {
    expect(r(2, 6)).toEqual({ n: BigInt(1), d: BigInt(3) });
    expect(eq(r(1, 3), r(2, 6))).toBe(true);
    expect(cmp(r(1, 3), r(333, 1000))).toBe(1);
    expect(add(r(1, 3), r(2, 3))).toEqual(r(1));
    expect(mul(r(2), r(1, 3))).toEqual(r(2, 3));
    expect(div(r(1, 3), r(4))).toEqual(r(1, 12));
    expect(() => rational(BigInt(1), BigInt(0))).toThrow();
    expect(() => div(r(1), r(0))).toThrow();
  });

  it("reads decimals and label text exactly", () => {
    expect(fromDecimalString("0.125")).toEqual(r(1, 8));
    expect(fromDecimalString(".5")).toEqual(r(1, 2));
    expect(fromDecimalString("1.50")).toEqual(r(3, 2));
    expect(fromDecimalString("0.3333")).toEqual(r(3333, 10000)); // a rounded third is NOT a third
    expect(eq(fromDecimalString("0.3333")!, r(1, 3))).toBe(false);
    for (const bad of ["", ".", "1.", "-1", "1e3", "1,5", " 1", "0x10", "1".repeat(41)]) expect(fromDecimalString(bad)).toBeNull();
    expect(parseRationalText("1/3")).toEqual(r(1, 3));
    expect(parseRationalText("1 1/3")).toEqual(r(4, 3));
    expect(parseRationalText("4/3")).toEqual(r(4, 3));
    expect(parseRationalText("2")).toEqual(r(2));
    for (const bad of ["1/0", "1 3/2", "1 1/0", "a/b", "1//3", "1 /3"]) expect(parseRationalText(bad)).toBeNull();
  });

  it("formats without pretending a third is a decimal", () => {
    expect(formatMixed(r(4, 3))).toBe("1 1/3");
    expect(formatMixed(r(1, 3))).toBe("1/3");
    expect(formatMixed(r(6, 3))).toBe("2");
    expect(formatDecimal(r(1, 3))).toBeNull();
    expect(formatDecimal(r(1, 8))).toBe("0.125");
    expect(formatDecimal(r(5, 2))).toBe("2.5");
    expect(isTerminating(r(1, 6))).toBe(false);
    expect(isTerminating(r(3, 40))).toBe(true);
  });

  it("rounds only in toDecimal, and says so", () => {
    expect(toDecimal(r(1, 3), 4)).toEqual({ value: "0.3333", exact: false });
    expect(toDecimal(r(2, 3), 4)).toEqual({ value: "0.6667", exact: false });
    expect(toDecimal(r(1, 12), 4)).toEqual({ value: "0.0833", exact: false });
    expect(toDecimal(r(1, 8), 4)).toEqual({ value: "0.125", exact: true });
    expect(toDecimal(r(1, 32), 4)).toEqual({ value: "0.0313", exact: false }); // 0.03125 half-up
    expect(toDecimal(r(5), 4)).toEqual({ value: "5", exact: true });
    expect(toDecimal(r(1, 30000), 4)).toEqual({ value: "0", exact: false }); // a tiny amount rounds to zero — callers must refuse that
  });

  it("enforces contract bounds and canonical strings", () => {
    expect(toExactQuantity(r(1, 3))).toEqual({ kind: "exact", numerator: "1", denominator: "3", display: "1/3" });
    expect(toExactQuantity(r(3, 2), "decimal")).toEqual({ kind: "exact", numerator: "3", denominator: "2", display: "1.5" });
    expect(toExactQuantity(r(4, 3), "decimal")?.display).toBe("1 1/3");
    expect(toExactQuantity(r(0))).toBeNull();
    expect(toExactQuantity(r(10001))).toBeNull();
    expect(toExactQuantity(r(1, 1_000_001))).toBeNull();
    expect(withinBounds(r(10000))).toBe(true);
    expect(fromExactQuantity({ kind: "exact", numerator: "2", denominator: "6", display: "1/3" })).toBeNull(); // unreduced
    expect(fromExactQuantity({ kind: "exact", numerator: "01", denominator: "3", display: "1/3" })).toBeNull();
    expect(fromExactQuantity({ kind: "exact", numerator: "1", denominator: "0", display: "x" })).toBeNull();
    expect(fromExactQuantity({ kind: "exact", numerator: "1", denominator: "3", display: "1/3" })).toEqual(r(1, 3));
  });
});

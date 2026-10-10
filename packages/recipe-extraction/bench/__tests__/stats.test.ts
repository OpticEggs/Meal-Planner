import { describe, expect, it } from "vitest";
import { percent, rate, round, wilsonInterval } from "../stats";

describe("Wilson 95% interval", () => {
  it("matches reference values (z = 1.959964), rounded to 4 places", () => {
    expect(rate(5, 10).ci95).toEqual([0.2366, 0.7634]);
    expect(rate(10, 10).ci95).toEqual([0.7225, 1]);
    expect(rate(0, 10).ci95).toEqual([0, 0.2775]);
    expect(rate(1, 1).ci95).toEqual([0.2065, 1]);
    expect(rate(0, 1).ci95).toEqual([0, 0.7935]);
    expect(rate(81, 263).ci95).toEqual([0.2553, 0.3662]);
  });

  it("a zero denominator has no rate and no interval", () => {
    expect(rate(0, 0)).toEqual({ num: 0, den: 0, rate: null, ci95: null });
    expect(wilsonInterval(0, 0)).toBeNull();
  });

  it("rates are rounded deterministically and stay inside [0, 1]", () => {
    expect(rate(1, 3).rate).toBe(0.3333);
    expect(rate(2, 3).rate).toBe(0.6667);
    for (let den = 1; den <= 40; den++)
      for (let num = 0; num <= den; num++) {
        const [lo, hi] = wilsonInterval(num, den)!;
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(1);
        expect(lo).toBeLessThanOrEqual(num / den + 1e-12);
        expect(hi).toBeGreaterThanOrEqual(num / den - 1e-12);
        expect(rate(num, den)).toEqual(rate(num, den));
      }
    expect(Object.is(round(-0.00001), 0)).toBe(true);
  });

  it("refuses impossible proportions", () => {
    expect(() => rate(3, 2)).toThrow(RangeError);
    expect(() => rate(-1, 2)).toThrow(RangeError);
    expect(() => rate(0.5, 2)).toThrow(RangeError);
  });

  it("formats percentages", () => {
    expect(percent(0.25)).toBe("25.0%");
    expect(percent(null)).toBe("—");
  });
});

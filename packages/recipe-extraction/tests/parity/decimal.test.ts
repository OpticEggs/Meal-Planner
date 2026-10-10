/**
 * Differential tests of the package's BigInt `D` (src/legacy/decimal.ts) against Table's decimal.js
 * clone (`D` in src/domain/units.ts: precision 40, ROUND_HALF_UP) for every operation the frozen
 * ingredient-line parser uses, over seeded random operands of the shapes it passes.
 */
import { describe, expect, it } from "vitest";
import { D as LiveD } from "@/domain/units";
import { D } from "../../src/legacy/decimal";
import { int, mulberry32, pick } from "./corpus";

type Operand = number | string;

function operands(seed: number, count: number): Operand[] {
  const rng = mulberry32(seed);
  const out: Operand[] = [0, 1, 2, 10, 10_000, 10_001, 9999, "0", "0.0", "1.50", ".5", "0.000001", "123456789012", "123456789012.123456", "0.3333", "007", "10000", "10000.000001"];
  for (let i = 0; i < count; i++) {
    const kind = int(rng, 0, 4);
    if (kind === 0) out.push(int(rng, 0, 999_999));
    else if (kind === 1) out.push(String(int(rng, 0, 999_999_999)) + "" + String(int(rng, 0, 999)));
    else if (kind === 2) out.push(`${int(rng, 0, 99_999)}.${String(int(rng, 0, 999_999)).padStart(int(rng, 1, 6), "0")}`);
    else if (kind === 3) out.push(`.${String(int(rng, 0, 999_999)).padStart(6, "0")}`);
    else out.push(pick(rng, ["1", "3", "7", "9", "11", "13", "17", "19", "23", "29", "31", "37", "41", "43", "47", "97", "9973", "8192", "1024", "30000"]));
  }
  return out;
}

const pairs = (xs: Operand[], seed: number, count: number): [Operand, Operand][] => {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => [pick(rng, xs), pick(rng, xs)] as [Operand, Operand]);
};

describe("legacy decimal D parity with decimal.js (precision 40, ROUND_HALF_UP)", () => {
  const xs = operands(0xdec1, 3_000);

  it("constructs and prints plain decimal text identically", () => {
    const bad: string[] = [];
    for (const x of xs) if (new D(x).toFixed() !== new LiveD(x).toFixed()) bad.push(String(x));
    expect(bad).toEqual([]);
  });

  it("div, then toFixed and toDecimalPlaces(4), are identical (40 significant digits, half-up)", () => {
    const bad: string[] = [];
    for (const [a, b] of pairs(xs, 0xd1f, 20_000)) {
      if (new LiveD(b).eq(0)) continue;
      const mine = new D(a).div(b);
      const theirs = new LiveD(a).div(b);
      if (mine.toFixed() !== theirs.toFixed()) bad.push(`${a}/${b}: ${mine.toFixed()} vs ${theirs.toFixed()}`);
      if (mine.toDecimalPlaces(4).toFixed() !== theirs.toDecimalPlaces(4).toFixed()) bad.push(`${a}/${b} dp4`);
      if (bad.length > 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("the parser's exact-fraction and decimalOf shapes match", () => {
    const bad: string[] = [];
    for (let num = 1; num <= 120; num++) {
      for (let den = 1; den <= 120; den++) {
        const a = new D(num).div(den);
        const b = new LiveD(num).div(den);
        if (a.toDecimalPlaces(4).toFixed() !== b.toDecimalPlaces(4).toFixed() || a.toFixed() !== b.toFixed()) bad.push(`${num}/${den}`);
        const w = new D(num).plus(a.toDecimalPlaces(4).toFixed()).toFixed();
        const v = new LiveD(num).plus(b.toDecimalPlaces(4).toFixed()).toFixed();
        if (w !== v) bad.push(`${num}+${num}/${den}`);
      }
    }
    for (const [n, d] of [["1", "30000"], ["5", "9"], ["1", "32"], ["2", "3"], ["999999999999", "7"], ["1", "1000000000000"], ["123456789", "1000000"]]) {
      const a = new D(n).div(d).toDecimalPlaces(4).toFixed();
      const b = new LiveD(n).div(d).toDecimalPlaces(4).toFixed();
      if (a !== b) bad.push(`${n}/${d}: ${a} vs ${b}`);
    }
    expect(bad).toEqual([]);
  });

  it("plus, lte, gt and eq agree", () => {
    const bad: string[] = [];
    for (const [a, b] of pairs(xs, 0xadd, 20_000)) {
      if (new D(a).plus(b).toFixed() !== new LiveD(a).plus(b).toFixed()) bad.push(`${a}+${b}`);
      for (const op of ["lte", "gt", "eq"] as const) if (new D(a)[op](b) !== new LiveD(a)[op](b)) bad.push(`${a} ${op} ${b}`);
      if (bad.length > 10) break;
    }
    for (const x of xs) {
      if (new D(x).lte(0) !== new LiveD(x).lte(0) || new D(x).gt(10_000) !== new LiveD(x).gt(10_000)) bad.push(`bounds ${x}`);
    }
    expect(bad).toEqual([]);
  });

  it("toDecimalPlaces rounds ties half-up", () => {
    for (const s of ["0.03125", "0.00005", "0.00004999", "1.99995", "0.33335", "2.5"]) {
      expect(new D(s).toDecimalPlaces(4).toFixed()).toBe(new LiveD(s).toDecimalPlaces(4).toFixed());
    }
    expect(new D("0.03125").toDecimalPlaces(4).toFixed()).toBe("0.0313");
  });

  it("refuses what decimal.js refuses", () => {
    for (const bad of ["", "abc", "1,5", " 1"]) {
      expect(() => new LiveD(bad)).toThrow();
      expect(() => new D(bad)).toThrow();
    }
    expect(() => new D(Number.NaN)).toThrow();
    expect(() => new D(1).div(0)).toThrow();
  });
});

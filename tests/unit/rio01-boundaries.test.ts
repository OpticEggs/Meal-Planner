/**
 * RIO-01 boundary matrix (2026-10-09). Package counts from the real path — per-serving storage
 * (`perServing`), plates × stored amount, unit conversion to the base unit, `packagesFor` ceiling —
 * compared with exact rational arithmetic from the source amounts.
 *
 * What this proves, and what it does not:
 * - Stored per-serving amounts are never above the exact value (ROUND_DOWN at 12 places), and conversion
 *   and the ceiling are exact decimal steps, so a count is never ABOVE the exact count (no overcount).
 * - A count could be BELOW the exact count only if the exact week demand passes a package boundary by less
 *   than 10⁻¹² of the ingredient's unit per planned plate (e.g. < 5.5×10⁻⁹ g for 12 plates measured in lb).
 *   Over this matrix (single recipes; pairs of recipes sharing an ingredient; count, volume and mass units
 *   with conversions; both sides of every boundary) that never happens.
 * - Stored decimals are NOT exact for non-terminating amounts (D131). Since migration 015 (EQ, D133) a newly saved
 *   row also keeps its exact amount and serving basis and purchasing uses that fraction; this matrix still pins
 *   the stored decimal itself, which legacy rows and the previous release rely on. Recipes saved before
 *   8e6bd6e (4 places, half-up) can over- AND under-count; the control below shows the matrix detects that class.
 */
import { describe, expect, it } from "vitest";
import { parseAmount, perServing } from "@/domain/quantity";
import { D, baseUnit, convert, packagesFor } from "@/domain/units";

type R = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === BigInt(0) ? (a < 0 ? -a : a) : gcd(b, a % b));
const mk = (n: bigint, d: bigint): R => { const k = gcd(n, d) || BigInt(1); return { n: n / k, d: d / k }; };
const mul = (a: R, b: R) => mk(a.n * b.n, a.d * b.d);
const add = (a: R, b: R) => mk(a.n * b.d + b.n * a.d, a.d * b.d);
const div = (a: R, b: R) => mk(a.n * b.d, a.d * b.n);
const ceil = (a: R) => Number(a.n % a.d === BigInt(0) ? a.n / a.d : a.n / a.d + BigInt(1));
const dec = (s: string): R => { const [i, f = ""] = s.split("."); return mk(BigInt(i + f), BigInt(10) ** BigInt(f.length)); };
const int = (n: number) => mk(BigInt(n), BigInt(1));
// The factors of src/domain/units.ts, restated so the reference does not trust the code under test.
const FACTOR: Record<string, string> = { g: "1", oz: "28.349523125", lb: "453.59237", ml: "1", l: "1000", tsp: "4.92892159375", tbsp: "14.78676478125", cup: "236.5882365", fl_oz: "29.5735295625", each: "1" };

const AMOUNTS = ["1", "2", "3", "1/2", "1/3", "2/3", "1/4", "3/4", "1/8", "1 1/2", "1 1/3", "2 1/2", "5"];
const UNITS: Record<string, string[]> = { count: ["each"], volume: ["tsp", "tbsp", "cup", "fl_oz", "ml"], mass: ["oz", "lb", "g"] };
const PACKAGES: Record<string, [string, string][]> = {
  count: [["1", "each"], ["3", "each"], ["6", "each"]],
  volume: [["1", "cup"], ["16", "fl_oz"], ["500", "ml"], ["1", "l"], ["2", "tbsp"]],
  mass: [["16", "oz"], ["1", "lb"], ["2", "lb"], ["500", "g"], ["8", "oz"]],
};
type Line = { amount: string; unit: string; servings: number; plates: number };
type Store = (amount: string, servings: number) => string;
const current: Store = (a, v) => perServing(a, v)!.value;
const halfUp12: Store = (a, v) => { const r = parseAmount(a)!; return new D(r.n.toString()).div(r.d.toString()).div(v).toDecimalPlaces(12, D.ROUND_HALF_UP).toFixed(); };

function compare(lines: Line[], pkg: [string, string], store: Store) {
  let exact = int(0);
  for (const l of lines) { const a = parseAmount(l.amount)!; exact = add(exact, div(mul(mul({ n: a.n, d: a.d }, int(l.plates)), dec(FACTOR[l.unit])), int(l.servings))); }
  const want = ceil(div(exact, mul(dec(pkg[0]), dec(FACTOR[pkg[1]]))));
  const bu = baseUnit(pkg[1]);
  let sum = new D(0);
  for (const l of lines) sum = sum.plus(convert(new D(store(l.amount, l.servings)).mul(l.plates), l.unit, bu)!);
  return { want, got: packagesFor(sum, convert(pkg[0], pkg[1], bu)!), onBoundary: div(exact, mul(dec(pkg[0]), dec(FACTOR[pkg[1]]))).d === BigInt(1) };
}

function matrix(store: Store) {
  const out = { cases: 0, onBoundary: 0, over: [] as unknown[], under: [] as unknown[] };
  const note = (lines: Line[], pkg: [string, string]) => {
    const r = compare(lines, pkg, store);
    out.cases++;
    if (r.onBoundary) out.onBoundary++;
    if (r.got > r.want) out.over.push({ lines, pkg, ...r });
    if (r.got < r.want) out.under.push({ lines, pkg, ...r });
  };
  for (const [dim, units] of Object.entries(UNITS)) for (const unit of units) for (const amount of AMOUNTS) for (let v = 1; v <= 12; v++) for (let p = 1; p <= 12; p++)
    note([{ amount, unit, servings: v, plates: p }], PACKAGES[dim][(v + p) % PACKAGES[dim].length]);
  let seed = 20261009;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  const dims = Object.keys(UNITS);
  for (let i = 0; i < 20000; i++) {
    const dim = dims[rnd(dims.length)];
    const line = (): Line => ({ amount: AMOUNTS[rnd(AMOUNTS.length)], unit: UNITS[dim][rnd(UNITS[dim].length)], servings: 1 + rnd(12), plates: 1 + rnd(12) });
    note([line(), line()], PACKAGES[dim][rnd(PACKAGES[dim].length)]);
  }
  return out;
}

describe("RIO-01 boundary matrix", () => {
  it("current storage: never more and never fewer packages than the exact source amounts (incl. exact boundaries)", () => {
    const m = matrix(current);
    expect(m.cases).toBeGreaterThan(30000);
    expect(m.onBoundary).toBeGreaterThan(500); // the matrix really sits on package boundaries
    expect(m.over).toEqual([]);
    expect(m.under).toEqual([]);
  });

  it("control: the same matrix catches half-up rounding (the defect fixed in bca110e)", () => {
    const m = matrix(halfUp12);
    expect(m.over.length).toBeGreaterThan(0);
    expect(m.over).toContainEqual(expect.objectContaining({ lines: [{ amount: "2", unit: "each", servings: 3, plates: 3 }], want: 2, got: 3 }));
  });

  it("the stored value is never above the exact per-serving amount, and below it by less than 10⁻¹²", () => {
    for (const a of AMOUNTS) for (let v = 1; v <= 100; v++) {
      const r = parseAmount(a)!;
      const exact = mk(r.n, r.d * BigInt(v));
      const diff = add(exact, mul(dec(current(a, v)), int(-1)));
      expect(diff.n >= BigInt(0), `${a} ÷ ${v}`).toBe(true);
      expect(diff.n * BigInt(10) ** BigInt(12) < diff.d, `${a} ÷ ${v}`).toBe(true);
      expect(perServing(a, v)!.exact).toBe(diff.n === BigInt(0));
    }
  });
});

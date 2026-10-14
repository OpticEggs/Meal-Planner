import { D, type Dec, baseUnit, normalizeUnit, unitFactor } from "./units";

/**
 * Exact rational quantities for purchasing (EQ, 2026-10-10). A recipe row saved with its exact
 * whole-recipe amount and serving basis ("2" for 3 servings) is carried as the fraction 2/3 through
 * plates, combined recipes, unit conversion, what is at home and the package count — never through a
 * rounded per-serving decimal. A legacy row enters as the exact value of the decimal it stored (its
 * approximation is kept, not repaired), so its results are what they were.
 *
 * Shown values (3 places), fingerprints (6 places) and costs are rounded only at the edge, half up, the
 * same as decimal.js `toDecimalPlaces` did for the same value.
 */

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);
const abs = (a: bigint) => (a < ZERO ? -a : a);
const gcd = (a: bigint, b: bigint): bigint => {
  a = abs(a);
  b = abs(b);
  while (b !== ZERO) [a, b] = [b, a % b];
  return a;
};

export class Q {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    if (d === ZERO) throw new Error("division by zero");
    if (d < ZERO) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || ONE;
    this.n = n / g;
    this.d = d / g;
  }

  static readonly zero = new Q(ZERO, ONE);

  static frac(n: bigint | number, d: bigint | number = 1): Q {
    return new Q(BigInt(n), BigInt(d));
  }

  /** A decimal string ("12", "0.666666666666", "-1.5", "1e-7"), an "n/d" fraction, a number, a decimal.js value or a Q. */
  static of(v: Q | Dec | string | number | bigint): Q {
    if (v instanceof Q) return v;
    if (typeof v === "bigint") return new Q(v, ONE);
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error(`not a finite number: ${v}`);
      return Q.of(new D(v).toFixed());
    }
    const s = typeof v === "string" ? v.trim() : (v as Dec).toFixed();
    const f = /^(-?\d+)\/(\d+)$/.exec(s);
    if (f) return new Q(BigInt(f[1]), BigInt(f[2]));
    const m = /^(-?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);
    if (!m || (!m[2] && !m[3])) throw new Error(`not a decimal: ${s}`);
    const frac = m[3] ?? "";
    let n = BigInt(`${m[2] || "0"}${frac}`);
    let d = TEN ** BigInt(frac.length);
    const e = Number(m[4] ?? 0);
    if (e > 0) n *= TEN ** BigInt(e);
    if (e < 0) d *= TEN ** BigInt(-e);
    return new Q(m[1] === "-" ? -n : n, d);
  }

  plus(o: Q | string | number): Q {
    const b = Q.of(o);
    return new Q(this.n * b.d + b.n * this.d, this.d * b.d);
  }
  minus(o: Q | string | number): Q {
    const b = Q.of(o);
    return new Q(this.n * b.d - b.n * this.d, this.d * b.d);
  }
  mul(o: Q | string | number): Q {
    const b = Q.of(o);
    return new Q(this.n * b.n, this.d * b.d);
  }
  div(o: Q | string | number): Q {
    const b = Q.of(o);
    return new Q(this.n * b.d, this.d * b.n);
  }
  cmp(o: Q | string | number): -1 | 0 | 1 {
    const b = Q.of(o);
    const l = this.n * b.d;
    const r = b.n * this.d;
    return l === r ? 0 : l > r ? 1 : -1;
  }
  eq(o: Q | string | number) { return this.cmp(o) === 0; }
  gt(o: Q | string | number) { return this.cmp(o) > 0; }
  gte(o: Q | string | number) { return this.cmp(o) >= 0; }
  lt(o: Q | string | number) { return this.cmp(o) < 0; }
  lte(o: Q | string | number) { return this.cmp(o) <= 0; }
  isZero() { return this.n === ZERO; }

  static max(a: Q, b: Q | string | number): Q { const c = Q.of(b); return a.gte(c) ? a : c; }
  static min(a: Q, b: Q | string | number): Q { const c = Q.of(b); return a.lte(c) ? a : c; }

  /** Smallest integer ≥ this. */
  ceil(): bigint {
    const q = this.n / this.d; // truncates toward zero
    return this.n > ZERO && q * this.d !== this.n ? q + ONE : q;
  }

  /** Largest integer ≤ this. */
  floor(): bigint {
    const q = this.n / this.d;
    return this.n < ZERO && q * this.d !== this.n ? q - ONE : q;
  }

  /** Rounded to `places` decimals, half away from zero (decimal.js ROUND_HALF_UP), as plain decimal text
   *  without trailing zeros — the same text `new D(x).toDecimalPlaces(places).toString()` gives. */
  toDecimal(places: number): string {
    const scale = TEN ** BigInt(places);
    const num = abs(this.n) * scale;
    let q = num / this.d;
    if ((num % this.d) * BigInt(2) >= this.d) q += ONE;
    if (q === ZERO) return "0";
    let s = q.toString().padStart(places + 1, "0");
    if (places > 0) s = `${s.slice(0, -places)}.${s.slice(-places)}`.replace(/\.?0+$/, "");
    return `${this.n < ZERO ? "-" : ""}${s}`;
  }

  /** Nearest integer, half away from zero. */
  roundHalfUp(): bigint {
    return BigInt(this.toDecimal(0));
  }

  /** Exact text: "2", "2/3". */
  toString(): string {
    return this.d === ONE ? this.n.toString() : `${this.n}/${this.d}`;
  }

  /** A decimal.js approximation (40 significant digits), for display code that still takes one. */
  toDec(): Dec {
    return new D(this.n.toString()).div(this.d.toString());
  }
}

/** Exact unit conversion over the factors of units.ts; null when the units cannot be converted. */
export function convertQ(qty: Q, from: string, to: string): Q | null {
  const f = normalizeUnit(from);
  const t = normalizeUnit(to);
  if (f === t) return qty;
  const uf = unitFactor(f);
  const ut = unitFactor(t);
  if (!uf || !ut || uf.dim !== ut.dim) return null;
  return qty.mul(Q.of(uf.factor)).div(Q.of(ut.factor));
}

/** ceiling(demand / package quantity), exact: a genuine amount above a package boundary always needs
 *  another package; nothing is tolerated away. 0 demand → 0 packages. */
export function packagesForQ(demand: Q, packageQty: Q): number {
  if (demand.lte(0)) return 0;
  if (packageQty.lte(0)) throw new Error("package quantity must be positive");
  return Number(demand.div(packageQty).ceil());
}

export { baseUnit };

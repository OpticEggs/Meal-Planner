import { LIMITS, type ExactQuantity } from "./contract";

/**
 * Exact non-negative rationals over BigInt. No binary floating point anywhere: a third stays 1/3.
 * Decimal text is converted exactly (0.125 → 1/8). Rounding exists only in `toDecimal`, which says
 * whether it rounded — the future Table adapter is the only intended caller.
 */

export interface Rational {
  readonly n: bigint; // numerator ≥ 0
  readonly d: bigint; // denominator ≥ 1
}

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < ZERO ? -a : a;
  let y = b < ZERO ? -b : b;
  while (y !== ZERO) [x, y] = [y, x % y];
  return x;
}

/** Reduced n/d. Throws on a zero or negative denominator or a negative numerator (programming errors). */
export function rational(n: bigint, d: bigint = ONE): Rational {
  if (d <= ZERO) throw new RangeError("denominator must be positive");
  if (n < ZERO) throw new RangeError("numerator must not be negative");
  if (n === ZERO) return { n: ZERO, d: ONE };
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export const add = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
export function div(a: Rational, b: Rational): Rational {
  if (b.n === ZERO) throw new RangeError("division by zero");
  return rational(a.n * b.d, a.d * b.n);
}
export const cmp = (a: Rational, b: Rational): -1 | 0 | 1 => {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l === r ? 0 : l > r ? 1 : -1;
};
export const eq = (a: Rational, b: Rational) => cmp(a, b) === 0;

const DIGITS = /^(?:0|[1-9]\d*)$/;

/** Exact value of a plain decimal string ("12", "0.125", ".5", "1.50"); null for anything else. Max 40 chars. */
export function fromDecimalString(s: string): Rational | null {
  if (typeof s !== "string" || s.length === 0 || s.length > 40) return null;
  const m = /^(\d*)(?:\.(\d+))?$/.exec(s);
  if (!m || (m[1] === "" && m[2] === undefined)) return null;
  const whole = m[1] === "" ? "0" : m[1];
  const frac = m[2] ?? "";
  return rational(BigInt(whole + frac), TEN ** BigInt(frac.length));
}

/**
 * Label/text syntax: "2", "0.5", "1/3", "1 1/3" (mixed). Exact; null when malformed or when a
 * denominator is zero. Max 40 chars. Used by fixtures and tests, not as an ingredient-line reader.
 */
export function parseRationalText(s: string): Rational | null {
  if (typeof s !== "string" || s.length === 0 || s.length > 40) return null;
  const t = s.trim();
  let m = /^(\d{1,12}) (\d{1,12})\/(\d{1,12})$/.exec(t);
  if (m) {
    const d = BigInt(m[3]);
    const num = BigInt(m[2]);
    if (d === ZERO || num >= d) return null;
    return rational(BigInt(m[1]) * d + num, d);
  }
  m = /^(\d{1,12})\/(\d{1,12})$/.exec(t);
  if (m) {
    const d = BigInt(m[2]);
    return d === ZERO ? null : rational(BigInt(m[1]), d);
  }
  return fromDecimalString(t);
}

/** True when the reduced value has a finite decimal expansion (denominator 2^a·5^b). */
export function isTerminating(r: Rational): boolean {
  let d = rational(r.n, r.d).d;
  while (d % BigInt(2) === ZERO) d /= BigInt(2);
  while (d % BigInt(5) === ZERO) d /= BigInt(5);
  return d === ONE;
}

/** "1 1/3", "1/3", "2". */
export function formatMixed(r: Rational): string {
  const { n, d } = rational(r.n, r.d);
  if (d === ONE) return n.toString();
  const whole = n / d;
  const rest = n % d;
  return whole === ZERO ? `${rest}/${d}` : `${whole} ${rest}/${d}`;
}

/** Exact decimal text when the value terminates ("0.125", "2"), else null. */
export function formatDecimal(r: Rational): string | null {
  if (!isTerminating(r)) return null;
  const { n, d } = rational(r.n, r.d);
  let places = 0;
  let scale = ONE;
  while ((n * scale) % d !== ZERO) {
    places++;
    scale *= TEN;
  }
  const digits = ((n * scale) / d).toString().padStart(places + 1, "0");
  return places === 0 ? digits : `${digits.slice(0, -places)}.${digits.slice(-places)}`;
}

/**
 * Decimal text with at most `places` decimals. Exact (and `exact: true`) when the value terminates
 * within `places`; otherwise rounded half-up and `exact: false`. The caller must disclose rounding.
 */
export function toDecimal(r: Rational, places: number): { value: string; exact: boolean } {
  if (!Number.isInteger(places) || places < 0 || places > 30) throw new RangeError("places must be an integer from 0 to 30");
  const { n, d } = rational(r.n, r.d);
  const scale = TEN ** BigInt(places);
  const scaled = n * scale;
  let q = scaled / d;
  const rem = scaled % d;
  if (rem * BigInt(2) >= d) q += ONE; // half-up
  const digits = q.toString().padStart(places + 1, "0");
  let value = places === 0 ? digits : `${digits.slice(0, -places)}.${digits.slice(-places)}`;
  if (value.includes(".")) value = value.replace(/0+$/, "").replace(/\.$/, "");
  return { value, exact: rem === ZERO };
}

/** Within the contract's bounds: positive, value ≤ LIMITS.maxQuantity, reduced denominator ≤ LIMITS.maxDenominator. */
export function withinBounds(r: Rational): boolean {
  const { n, d } = rational(r.n, r.d);
  return n > ZERO && d <= BigInt(LIMITS.maxDenominator) && n <= BigInt(LIMITS.maxQuantity) * d;
}

/**
 * The contract form, or null when out of bounds. `notation` "decimal" renders `display` as the exact
 * decimal when the value terminates; otherwise (or "fraction") as a mixed fraction.
 */
export function toExactQuantity(r: Rational, notation: "decimal" | "fraction" = "fraction"): ExactQuantity | null {
  if (!withinBounds(r)) return null;
  const { n, d } = rational(r.n, r.d);
  const decimal = notation === "decimal" ? formatDecimal({ n, d }) : null;
  return { kind: "exact", numerator: n.toString(), denominator: d.toString(), display: decimal ?? formatMixed({ n, d }) };
}

/** The rational of a contract quantity, or null when its strings are not canonical (unreduced, signed, zero denominator…). */
export function fromExactQuantity(q: ExactQuantity): Rational | null {
  if (!q || q.kind !== "exact" || typeof q.numerator !== "string" || typeof q.denominator !== "string") return null;
  if (q.numerator.length > 20 || q.denominator.length > 20) return null;
  if (!DIGITS.test(q.numerator) || !DIGITS.test(q.denominator)) return null;
  const n = BigInt(q.numerator);
  const d = BigInt(q.denominator);
  if (d === ZERO || gcd(n, d) !== ONE) return null;
  return { n, d };
}

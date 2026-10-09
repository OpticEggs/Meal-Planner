/**
 * Minimal, dependency-free stand-in for Table's `D` (a decimal.js clone with precision 40 and
 * ROUND_HALF_UP, `src/domain/units.ts` at cb7b56e). It implements only what the frozen
 * `./ingredient-line.ts` calls: `new D(number | string)`, `.div()`, `.plus()`, `.toFixed()` (no
 * argument: plain decimal text, never exponent form), `.toDecimalPlaces(dp)` (half-up), `.lte()`,
 * `.gt()` and `.eq()`.
 *
 * Values are exact BigInt rationals. As in decimal.js, the constructor and `toDecimalPlaces` never
 * round to the precision, while `div` and `plus` round their result to 40 significant digits
 * (half-up, i.e. ties away from zero). Every value is therefore a terminating decimal and `toFixed()`
 * is exact text. Differential tests against Table's decimal.js `D`: tests/parity/decimal.test.ts.
 */

interface Rat {
  n: bigint; // signed
  d: bigint; // > 0
}

type Arg = number | string | D;

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const FIVE = BigInt(5);
const TEN = BigInt(10);
const PRECISION = 40;
const MAX_EXPONENT = 1000; // the legacy parser never writes exponents; refuse absurd ones instead of hanging
const NUMERIC = /^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d{1,6}))?$/;

const abs = (x: bigint) => (x < ZERO ? -x : x);
const pow10 = (k: number) => TEN ** BigInt(k);

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== ZERO) [x, y] = [y, x % y];
  return x;
}

function reduce(n: bigint, d: bigint): Rat {
  if (d <= ZERO) throw new RangeError("[legacy decimal] denominator must be positive");
  if (n === ZERO) return { n: ZERO, d: ONE };
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function parseText(s: string): Rat {
  const m = NUMERIC.exec(s);
  if (!m) throw new Error(`[legacy decimal] Invalid argument: ${s.slice(0, 40)}`);
  const sign = m[1] === "-" ? -ONE : ONE;
  const whole = m[2] ?? "0";
  const frac = m[2] !== undefined ? (m[3] ?? "") : (m[4] ?? "");
  const exp = m[5] === undefined ? 0 : Number(m[5]);
  if (Math.abs(exp) > MAX_EXPONENT) throw new RangeError("[legacy decimal] exponent out of supported range");
  let n = BigInt(whole + frac) * sign;
  let d = pow10(frac.length);
  if (exp > 0) n *= pow10(exp);
  else if (exp < 0) d *= pow10(-exp);
  return reduce(n, d);
}

function toRat(v: Arg): Rat {
  if (v instanceof D) return v.rational();
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("[legacy decimal] Invalid argument: not a finite number");
    return parseText(String(v));
  }
  if (typeof v === "string") return parseText(v);
  throw new Error("[legacy decimal] Invalid argument");
}

const digitCount = (x: bigint) => x.toString().length;

/** Rounds to `sd` significant digits, half-up (ties away from zero). Exact values are returned unchanged. */
function roundSignificant(r: Rat, sd: number): Rat {
  if (r.n === ZERO) return r;
  const a = abs(r.n);
  // e = floor(log10(a / d))
  const k = digitCount(a) - digitCount(r.d);
  const atLeast = k >= 0 ? a >= r.d * pow10(k) : a * pow10(-k) >= r.d;
  const e = atLeast ? k : k - 1;
  const s = sd - 1 - e; // decimal places kept (negative: rounding left of the point)
  const num = s >= 0 ? a * pow10(s) : a;
  const den = s >= 0 ? r.d : r.d * pow10(-s);
  let q = num / den;
  const rem = num % den;
  if (rem === ZERO) return r;
  if (rem * TWO >= den) q += ONE;
  const sign = r.n < ZERO ? -ONE : ONE;
  return s >= 0 ? reduce(sign * q, pow10(s)) : reduce(sign * q * pow10(-s), ONE);
}

/** Rounds to `dp` decimal places, half-up (ties away from zero). */
function roundPlaces(r: Rat, dp: number): Rat {
  const a = abs(r.n);
  const scale = pow10(dp);
  const num = a * scale;
  let q = num / r.d;
  const rem = num % r.d;
  if (rem === ZERO) return r;
  if (rem * TWO >= r.d) q += ONE;
  return reduce((r.n < ZERO ? -ONE : ONE) * q, scale);
}

/** Exact plain decimal text of a terminating value (never exponent form). */
function plainText(r: Rat): string {
  let rest = r.d;
  let twos = 0;
  let fives = 0;
  while (rest % TWO === ZERO) (rest /= TWO), twos++;
  while (rest % FIVE === ZERO) (rest /= FIVE), fives++;
  if (rest !== ONE) throw new RangeError("[legacy decimal] value has no exact decimal text");
  const places = Math.max(twos, fives);
  const a = abs(r.n);
  const digits = ((a * pow10(places)) / r.d).toString().padStart(places + 1, "0");
  const text = places === 0 ? digits : `${digits.slice(0, -places)}.${digits.slice(-places)}`;
  return r.n < ZERO ? `-${text}` : text;
}

const compare = (a: Rat, b: Rat): number => {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l === r ? 0 : l > r ? 1 : -1;
};

export class D {
  #r: Rat;

  constructor(v: Arg) {
    this.#r = toRat(v);
  }

  static #of(r: Rat): D {
    const x = new D(0);
    x.#r = r;
    return x;
  }

  /** The exact value (for tests). */
  rational(): { n: bigint; d: bigint } {
    return { n: this.#r.n, d: this.#r.d };
  }

  div(v: Arg): D {
    const a = this.#r;
    const b = toRat(v);
    if (b.n === ZERO) throw new RangeError("[legacy decimal] division by zero");
    const sign = b.n < ZERO ? -ONE : ONE;
    return D.#of(roundSignificant(reduce(a.n * b.d * sign, a.d * abs(b.n)), PRECISION));
  }

  plus(v: Arg): D {
    const a = this.#r;
    const b = toRat(v);
    return D.#of(roundSignificant(reduce(a.n * b.d + b.n * a.d, a.d * b.d), PRECISION));
  }

  toDecimalPlaces(dp: number): D {
    if (!Number.isInteger(dp) || dp < 0 || dp > 1000) throw new RangeError("[legacy decimal] decimal places out of range");
    return D.#of(roundPlaces(this.#r, dp));
  }

  toFixed(): string {
    return plainText(this.#r);
  }

  lte(v: Arg): boolean {
    return compare(this.#r, toRat(v)) <= 0;
  }

  gt(v: Arg): boolean {
    return compare(this.#r, toRat(v)) > 0;
  }

  eq(v: Arg): boolean {
    return compare(this.#r, toRat(v)) === 0;
  }
}

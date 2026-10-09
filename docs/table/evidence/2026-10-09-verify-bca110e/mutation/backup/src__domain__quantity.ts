import { D } from "./units";

/**
 * Exact amounts. An amount a recipe states or a member types is an exact rational: "12", "1.5", "1/3",
 * "1 1/3", "1½". It is never rejected because its decimal repeats, and never rounded while it is an
 * amount for the whole recipe. Recipe ingredients are stored per ONE serving as decimals: exact when the
 * division terminates, otherwise to 12 decimal places (flagged), and shown again as a kitchen fraction.
 */

export type Rat = { n: bigint; d: bigint };

const ZERO = BigInt(0);
const TEN = BigInt(10);
const gcd = (a: bigint, b: bigint): bigint => {
  while (b !== ZERO) [a, b] = [b, a % b];
  return a < ZERO ? -a : a;
};
export const rat = (n: bigint, d: bigint): Rat => {
  const g = gcd(n, d) || BigInt(1);
  return { n: n / g, d: d / g };
};
export const ratMul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d);
export const ratDiv = (a: Rat, b: Rat): Rat => rat(a.n * b.d, a.d * b.n);
export const ratCmp = (a: Rat, b: Rat) => (a.n * b.d === b.n * a.d ? 0 : a.n * b.d > b.n * a.d ? 1 : -1);
export const ratInt = (n: number): Rat => ({ n: BigInt(n), d: BigInt(1) });

export const VULGAR: Record<string, [number, number]> = {
  "½": [1, 2], "⅓": [1, 3], "⅔": [2, 3], "¼": [1, 4], "¾": [3, 4], "⅕": [1, 5], "⅖": [2, 5], "⅗": [3, 5], "⅘": [4, 5],
  "⅙": [1, 6], "⅚": [5, 6], "⅐": [1, 7], "⅛": [1, 8], "⅜": [3, 8], "⅝": [5, 8], "⅞": [7, 8], "⅑": [1, 9], "⅒": [1, 10],
};
const VCLASS = Object.keys(VULGAR).join("");
/** The largest amount Table accepts for one ingredient line. */
export const MAX_AMOUNT = 10_000;

/** A leading amount at the start of `s`: mixed numbers ("1 1/2", "1-1/2", "1½", "1 ½"), fractions ("1/3",
 *  "1⁄2", "⅓"), decimals ("1.5", ".5"), whole numbers with thousands commas ("1,000"). `len` is how much of
 *  `s` it used; `decimal` says whether it was written as a decimal. "invalid" for 1/0, 0, 1 3/2, "1,5". */
export function readLeadingAmount(s: string): { rat: Rat; len: number; decimal: boolean } | "invalid" | null {
  let m: RegExpExecArray | null;
  const frac = (whole: bigint, num: number, den: number, len: number) => {
    if (den === 0 || num === 0 || (whole > ZERO && num >= den) || den > 1000) return "invalid" as const;
    return { rat: rat(whole * BigInt(den) + BigInt(num), BigInt(den)), len, decimal: false };
  };
  if ((m = /^(\d{1,6})(?:\s+|-)(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/⁄])/.exec(s))) return frac(BigInt(m[1]), Number(m[2]), Number(m[3]), m[0].length);
  if ((m = /^(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/⁄])/.exec(s))) return frac(ZERO, Number(m[1]), Number(m[2]), m[0].length);
  if ((m = new RegExp(`^(\\d{1,6})?\\s?([${VCLASS}])`, "u").exec(s))) {
    const [num, den] = VULGAR[m[2]];
    return frac(m[1] === undefined ? ZERO : BigInt(m[1]), num, den, m[0].length);
  }
  if ((m = /^(\d{1,3}(?:,\d{3})+)(?![\d.,])/.exec(s))) return { rat: rat(BigInt(m[1].replace(/,/g, "")), BigInt(1)), len: m[0].length, decimal: false };
  if ((m = /^(\d{1,12}(?:\.\d{1,6})?|\.\d{1,6})(?![\d/⁄])/.exec(s))) {
    if (/^[.,]\d/.test(s.slice(m[0].length))) return "invalid";
    const [whole, fraction = ""] = m[1].split(".");
    const r = rat(BigInt(`${whole || "0"}${fraction}`), TEN ** BigInt(fraction.length));
    return r.n === ZERO ? "invalid" : { rat: r, len: m[0].length, decimal: fraction.length > 0 };
  }
  return null;
}

/** A whole amount typed or stored as text; null when it is not a positive amount up to MAX_AMOUNT. */
export function parseAmount(text: string): Rat | null {
  const t = String(text ?? "").trim();
  if (!t || t.length > 30) return null;
  const a = readLeadingAmount(t);
  if (!a || a === "invalid" || t.slice(a.len).trim() !== "") return null;
  if (a.rat.n <= ZERO || ratCmp(a.rat, ratInt(MAX_AMOUNT)) > 0) return null;
  return a.rat;
}

const terminates = (d: bigint) => {
  let r = d;
  while (r % BigInt(2) === ZERO) r /= BigInt(2);
  while (r % BigInt(5) === ZERO) r /= BigInt(5);
  return r === BigInt(1);
};

/** Exact decimal text for a terminating rational, else null. */
function exactDecimal(r: Rat): string | null {
  if (!terminates(r.d)) return null;
  return new D(r.n.toString()).div(r.d.toString()).toFixed();
}

/** Canonical text: a whole number, a decimal when it was written as one and is exact, else a (mixed) fraction. */
export function formatAmount(r: Rat, preferDecimal = false): string {
  if (r.d === BigInt(1)) return r.n.toString();
  if (preferDecimal) {
    const dec = exactDecimal(r);
    if (dec) return dec;
  }
  const whole = r.n / r.d;
  const rest = r.n % r.d;
  return whole > ZERO ? `${whole} ${rest}/${r.d}` : `${rest}/${r.d}`;
}

/** The amount for ONE serving: exact when the division terminates, else 12 decimal places (exact: false),
 *  rounded TOWARD ZERO — so the plates of a whole recipe never add up to more than the recipe and never
 *  tip a package count over (RIO-01: 2 ÷ 3 rounded half-up, times 3 plates, was 2.000000000001). */
export function perServing(amount: string, servings: number): { value: string; exact: boolean } | null {
  const r = parseAmount(amount);
  if (!r || !Number.isInteger(servings) || servings < 1) return null;
  const each = ratDiv(r, ratInt(servings));
  const dec = exactDecimal(each);
  if (dec) return { value: dec, exact: true };
  return { value: new D(each.n.toString()).div(each.d.toString()).toDecimalPlaces(12, D.ROUND_DOWN).toFixed(), exact: false };
}

const GLYPH: Record<string, string> = Object.fromEntries(Object.entries(VULGAR).map(([g, [n, d]]) => [`${n}/${d}`, g]));
const DENOMINATORS = [2, 3, 4, 5, 6, 8, 12, 16];

/** How an amount is shown in the kitchen: "⅓", "1 ½", "1/12", "2", or a short decimal when it is not a
 *  common fraction. Accepts a stored decimal (12 or 4 places) or an amount text. */
export function displayAmount(q: string): string {
  const text = String(q ?? "").trim();
  let value: InstanceType<typeof D>;
  const exact = /[/⁄½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/.test(text) ? parseAmount(text) : null;
  if (exact) value = new D(exact.n.toString()).div(exact.d.toString());
  else {
    try {
      value = new D(text);
    } catch {
      return text;
    }
  }
  if (!value.isFinite() || value.lte(0)) return text;
  const whole = value.floor();
  const part = value.minus(whole);
  if (part.lt("0.00005")) return whole.toString();
  for (const den of DENOMINATORS) {
    const num = part.mul(den).toDecimalPlaces(0);
    if (num.isZero() || num.gte(den)) continue;
    if (part.minus(num.div(den)).abs().lte("0.00005")) {
      const g = Number(gcd(BigInt(num.toNumber()), BigInt(den)));
      const key = `${num.toNumber() / g}/${den / g}`;
      const f = GLYPH[key] ?? key;
      return whole.isZero() ? f : `${whole.toString()} ${f}`;
    }
  }
  return value.toDecimalPlaces(value.lt(1) ? 2 : 2).toString();
}

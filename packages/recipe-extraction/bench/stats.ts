/**
 * Proportions with Wilson score 95% intervals. Pure and deterministic: reported decimals are rounded
 * half-away-from-zero to `PLACES` places through `toFixed` on the exact binary value.
 */
export const PLACES = 4;
/** Two-sided 95% normal quantile. */
export const Z95 = 1.959963984540054;

export interface Rate {
  num: number;
  den: number;
  /** num/den rounded to PLACES; null when den is 0. */
  rate: number | null;
  /** Wilson 95% interval [low, high] rounded to PLACES; null when den is 0. */
  ci95: [number, number] | null;
}

export function round(x: number, places = PLACES): number {
  const v = Number(x.toFixed(places));
  return Object.is(v, -0) ? 0 : v;
}

/** Wilson score interval for num successes out of den trials (unrounded); null when den is 0. */
export function wilsonInterval(num: number, den: number, z = Z95): [number, number] | null {
  if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den < 0 || num > den) throw new RangeError(`invalid proportion ${num}/${den}`);
  if (den === 0) return null;
  const p = num / den;
  const z2 = z * z;
  const denom = 1 + z2 / den;
  const center = (p + z2 / (2 * den)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / den + z2 / (4 * den * den))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export function rate(num: number, den: number): Rate {
  const ci = wilsonInterval(num, den);
  return { num, den, rate: den === 0 ? null : round(num / den), ci95: ci ? [round(ci[0]), round(ci[1])] : null };
}

/** "12/40" */
export const fraction = (r: Rate) => `${r.num}/${r.den}`;

/** "30.0%" or "—" */
export const percent = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

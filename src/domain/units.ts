import Decimal from "decimal.js";

// Exact decimal arithmetic; no binary floating point in quantities or packages.
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof D>;

export type Dimension = "mass" | "volume" | "count";

// Factors to the dimension's base unit (g, ml, each). Mass ounces and fluid
// ounces are different dimensions and never convert into each other.
const UNITS: Record<string, { dim: Dimension; factor: string }> = {
  g: { dim: "mass", factor: "1" },
  kg: { dim: "mass", factor: "1000" },
  oz: { dim: "mass", factor: "28.349523125" },
  lb: { dim: "mass", factor: "453.59237" },
  ml: { dim: "volume", factor: "1" },
  l: { dim: "volume", factor: "1000" },
  tsp: { dim: "volume", factor: "4.92892159375" },
  tbsp: { dim: "volume", factor: "14.78676478125" },
  cup: { dim: "volume", factor: "236.5882365" },
  fl_oz: { dim: "volume", factor: "29.5735295625" },
  each: { dim: "count", factor: "1" },
};

export const KNOWN_UNITS = Object.keys(UNITS);

export function normalizeUnit(u: string): string {
  const s = u.trim().toLowerCase().replace(/\.$/, "");
  const alias: Record<string, string> = {
    gram: "g", grams: "g", kilogram: "kg", kilograms: "kg", ounce: "oz", ounces: "oz", lbs: "lb", pound: "lb", pounds: "lb",
    milliliter: "ml", milliliters: "ml", liter: "l", liters: "l", teaspoon: "tsp", teaspoons: "tsp", tablespoon: "tbsp",
    tablespoons: "tbsp", cups: "cup", "fl oz": "fl_oz", "fluid ounce": "fl_oz", "fluid ounces": "fl_oz", ea: "each", item: "each", items: "each",
  };
  return alias[s] ?? s;
}

/** A known unit's dimension and factor to its base unit (exact decimal text); null for other units. */
export function unitFactor(unit: string): { dim: Dimension; factor: string } | null {
  return UNITS[normalizeUnit(unit)] ?? null;
}

export function dimensionOf(unit: string): Dimension | null {
  return UNITS[normalizeUnit(unit)]?.dim ?? null;
}

/** Convert qty from one unit to another. Returns null when no explicit conversion exists
 *  (different dimensions, or a non-standard unit such as bunch/can/clamshell that only
 *  matches itself). Unknown conversion stays a review item, never a guess. */
export function convert(qty: Dec | string, from: string, to: string): Dec | null {
  const q = new D(qty);
  const f = normalizeUnit(from);
  const t = normalizeUnit(to);
  if (f === t) return q;
  const uf = UNITS[f];
  const ut = UNITS[t];
  if (!uf || !ut || uf.dim !== ut.dim) return null;
  return q.mul(uf.factor).div(ut.factor);
}

/** Base unit for an ingredient demand: the dimension base unit, or the custom unit itself. */
export function baseUnit(unit: string): string {
  const u = normalizeUnit(unit);
  const info = UNITS[u];
  if (!info) return u;
  return info.dim === "mass" ? "g" : info.dim === "volume" ? "ml" : "each";
}

/** ceiling(demand / usable package quantity), exact. 0 demand -> 0 packages. */
export function packagesFor(demand: Dec, packageQty: Dec): number {
  if (demand.lte(0)) return 0;
  if (packageQty.lte(0)) throw new Error("package quantity must be positive");
  return demand.div(packageQty).ceil().toNumber();
}

export function fmtQty(q: Dec | string, unit: string): string {
  const d = new D(q);
  const u = normalizeUnit(unit);
  // Present mass in oz/lb when demand was authored that way is a UI choice; keep 2dp.
  return `${d.toDecimalPlaces(2).toString()} ${u}`;
}

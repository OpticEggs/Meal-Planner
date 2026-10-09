// FROZEN COPY of src/domain/units.ts at cb7b56e for parity and baselines. Do not improve here; improvements go in new engines.
// Only the parts the frozen ingredient-line parser needs (the unit table, KNOWN_UNITS, normalizeUnit), with the
// same values; the decimal.js `D` is replaced by ./decimal. Provenance and edits: ./PROVENANCE.json

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

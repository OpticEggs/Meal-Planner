/**
 * Table unit -> Instacart unit string, using ONLY strings listed on the Developer Platform
 * "Units of measurement" page (read 2026-10-08):
 *   https://docs.instacart.com/developer_platform_api/api/units_of_measurement/
 *
 * Table's `oz` is mass (src/domain/units.ts), and the docs list "ounce, ounces, or oz" under
 * Weighed Items, so oz -> "oz". `tbsp` is not a listed spelling ("tablespoon, tablespoons, tb, or
 * tbs"), so it maps to the listed word "tablespoon"; same unit, no conversion.
 *
 * `fl_oz` is REFUSED: the page lists no plain fluid-ounce string, only container-qualified entries
 * ("fl oz can", "fl oz container", "fl oz jar", "fl oz pouch") and "fl oz ounce", whose meaning is
 * unclear. Choosing one would be a guess, and converting to ml would change what the member wrote.
 */

export type TableUnit = "g" | "kg" | "oz" | "lb" | "ml" | "l" | "tsp" | "tbsp" | "cup" | "fl_oz" | "each";
export const TABLE_UNITS: readonly TableUnit[] = ["g", "kg", "oz", "lb", "ml", "l", "tsp", "tbsp", "cup", "fl_oz", "each"];

export type UnitMapping = { supported: true; instacartUnit: string } | { supported: false; reason: string };

export const INSTACART_UNIT_MAP: Readonly<Record<TableUnit, UnitMapping>> = {
  g: { supported: true, instacartUnit: "g" },
  kg: { supported: true, instacartUnit: "kg" },
  oz: { supported: true, instacartUnit: "oz" },
  lb: { supported: true, instacartUnit: "lb" },
  ml: { supported: true, instacartUnit: "ml" },
  l: { supported: true, instacartUnit: "l" },
  tsp: { supported: true, instacartUnit: "tsp" },
  tbsp: { supported: true, instacartUnit: "tablespoon" },
  cup: { supported: true, instacartUnit: "cup" },
  fl_oz: {
    supported: false,
    reason: "Instacart's units page lists no plain fluid-ounce unit (only container-qualified forms such as \"fl oz jar\"); Table will not guess one.",
  },
  each: { supported: true, instacartUnit: "each" },
};

export function instacartUnitFor(unit: string): UnitMapping {
  if (!(TABLE_UNITS as readonly string[]).includes(unit)) return { supported: false, reason: `"${unit}" is not a Table unit.` };
  return INSTACART_UNIT_MAP[unit as TableUnit];
}

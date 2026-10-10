/**
 * Helpers over `UNIT_REGISTRY` (contract v1). Pure lookups: no conversion between mass and volume,
 * and no conversion at all for count or imprecise units.
 */
import { UNIT_REGISTRY, type Dimension, type UnitCode, type UnitV1 } from "./contract";

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** True when `code` is a canonical unit code of the registry (own keys only: "toString" is not a unit). */
export function isUnitCode(code: unknown): code is UnitCode {
  return typeof code === "string" && hasOwn(UNIT_REGISTRY, code);
}

/** The dimension of a canonical unit code, or null when the code is not in the registry. */
export function dimensionOf(code: string): Dimension | null {
  return isUnitCode(code) ? UNIT_REGISTRY[code].dimension : null;
}

/** A contract unit for a canonical code and the text the line wrote ("" when implicit). Throws on an unknown code. */
export function unitV1(canonical: UnitCode, source = ""): UnitV1 {
  if (!isUnitCode(canonical)) throw new RangeError(`unknown unit code: ${String(canonical).slice(0, 40)}`);
  return { canonical, dimension: UNIT_REGISTRY[canonical].dimension, source };
}

/** The contract unit for a code, or null when the code is not in the registry. */
export function tryUnitV1(code: string, source = ""): UnitV1 | null {
  return isUnitCode(code) ? unitV1(code, source) : null;
}

/** Every canonical unit code, in registry order. */
export const UNIT_CODES: readonly UnitCode[] = Object.keys(UNIT_REGISTRY) as UnitCode[];

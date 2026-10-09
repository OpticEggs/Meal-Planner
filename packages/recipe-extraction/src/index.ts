/**
 * Public API of @table/recipe-extraction (contract recipe-extraction/v1). Pure: no network, no
 * database, no environment, no logging. See CONTRACT-v1.md.
 *
 * Phase 1: the only engines are the frozen Table import 2 parsers (cb7b56e) translated into v1.
 */
import { REASONS, type ParsedIngredientV1 } from "./contract";
import { getEngine } from "./ingredient/engines";

export * from "./contract";

export * as rationalMath from "./rational";
export {
  add, cmp, div, eq, formatDecimal, formatMixed, fromDecimalString, fromExactQuantity, gcd, isTerminating, mul, parseRationalText, rational,
  toDecimal, toExactQuantity, withinBounds, type Rational,
} from "./rational";

export { dimensionOf, isUnitCode, tryUnitV1, UNIT_CODES, unitV1 } from "./units";
export { isHttpUrl, validateParsedIngredientV1, validateRecipeExtractionV1 } from "./validate";
export { DEFAULT_ENGINE_ID, ENGINES, getEngine } from "./ingredient/engines";
export { LEGACY_ENGINE_ID, LEGACY_SUGGESTION_ENGINE_ID } from "./ingredient/legacy";
export { extractRecipePage, PAGE_ENGINE_ID } from "./page/extract";

/** Reads one ingredient line with the chosen engine (default: DEFAULT_ENGINE_ID). Throws only for an unknown engine id. */
export function parseIngredientV1(line: string, opts: { engine?: string } = {}): ParsedIngredientV1 {
  return getEngine(opts.engine).parse(line);
}

/** The plain-words label of a reason code (labels may be reworded; codes never change meaning). */
export function reasonLabel(code: string): string {
  return Object.prototype.hasOwnProperty.call(REASONS, code) ? REASONS[code as keyof typeof REASONS].label : REASONS.unclassified.label;
}

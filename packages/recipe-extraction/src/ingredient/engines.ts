/**
 * Ingredient engines by id. Phase 1 has only the frozen legacy engines; the default is the faithful
 * one. A new engine gets a new id, and the default changes only with benchmark evidence.
 */
import type { IngredientEngine } from "../contract";
import { LEGACY_ENGINE_ID, legacyEngine, legacySuggestionEngine } from "./legacy";

export const DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID;

export const ENGINES: Readonly<Record<string, IngredientEngine>> = Object.freeze({
  [legacyEngine.id]: legacyEngine,
  [legacySuggestionEngine.id]: legacySuggestionEngine,
});

/** The engine with this id. Throws for an unknown id (own keys only: "toString" is not an engine). */
export function getEngine(id: string = DEFAULT_ENGINE_ID): IngredientEngine {
  if (typeof id === "string" && Object.prototype.hasOwnProperty.call(ENGINES, id)) return ENGINES[id];
  const known = Object.keys(ENGINES).join(", ");
  throw new RangeError(`unknown ingredient engine "${String(id).slice(0, 80)}" (known engines: ${known})`);
}

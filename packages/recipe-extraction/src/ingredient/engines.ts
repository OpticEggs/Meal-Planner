/**
 * Ingredient engines by id: the frozen legacy engines (Phase 1), the Phase 2 candidate `semantic-v1`
 * (frozen), the Phase 2B candidate `semantic-v2` (frozen) and the Phase 2C candidate `semantic-v3`. The default stays the faithful legacy engine; it changes
 * only with benchmark evidence.
 */
import type { IngredientEngine } from "../contract";
import { LEGACY_ENGINE_ID, legacyEngine, legacySuggestionEngine } from "./legacy";
import { semanticEngine } from "./semantic/engine";
import { semanticV2Engine } from "./semantic-v2/engine";
import { semanticV3Engine } from "./semantic-v3/engine";

export const DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID;

export const ENGINES: Readonly<Record<string, IngredientEngine>> = Object.freeze({
  [legacyEngine.id]: legacyEngine,
  [legacySuggestionEngine.id]: legacySuggestionEngine,
  [semanticEngine.id]: semanticEngine,
  [semanticV2Engine.id]: semanticV2Engine,
  [semanticV3Engine.id]: semanticV3Engine,
});

/** The engine with this id. Throws for an unknown id (own keys only: "toString" is not an engine). */
export function getEngine(id: string = DEFAULT_ENGINE_ID): IngredientEngine {
  if (typeof id === "string" && Object.prototype.hasOwnProperty.call(ENGINES, id)) return ENGINES[id];
  const known = Object.keys(ENGINES).join(", ");
  throw new RangeError(`unknown ingredient engine "${String(id).slice(0, 80)}" (known engines: ${known})`);
}

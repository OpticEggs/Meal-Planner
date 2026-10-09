/**
 * Engine lookup through the package's public API (`src/index.ts`). The benchmark never hard-codes a
 * parser: it reads `ENGINES` (Record<string, IngredientEngine>) and `extractRecipePage(html, input,
 * opts?: { engine?: string })` from the API at run time and refuses clearly when a build lacks them.
 */
import * as api from "../src/index";
import type { IngredientEngine, PageInputV1, RecipeExtractionV1 } from "../src/contract";

export const ENGINES_UNAVAILABLE = "engines not available in this build";

export class EnginesUnavailableError extends Error {
  constructor(detail: string) {
    super(`${ENGINES_UNAVAILABLE}: ${detail}`);
    this.name = "EnginesUnavailableError";
  }
}

export type PageExtractor = (html: string, input: PageInputV1, opts?: { engine?: string }) => RecipeExtractionV1;

const exported = (name: string): unknown => (api as unknown as Record<string, unknown>)[name];

const isEngine = (e: unknown): e is IngredientEngine =>
  typeof e === "object" && e !== null && typeof (e as IngredientEngine).id === "string" && typeof (e as IngredientEngine).parse === "function";

/** Every registered ingredient engine by id (sorted). Throws EnginesUnavailableError when the API has none. */
export function availableIngredientEngines(): Record<string, IngredientEngine> {
  const raw = exported("ENGINES");
  if (raw === undefined) throw new EnginesUnavailableError("src/index.ts does not export ENGINES");
  const list: unknown[] =
    raw instanceof Map ? [...raw.values()] : Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null ? Object.values(raw) : [];
  const engines = list.filter(isEngine);
  if (engines.length === 0 || engines.length !== list.length) throw new EnginesUnavailableError("ENGINES holds no valid IngredientEngine (id + parse)");
  const out: Record<string, IngredientEngine> = {};
  for (const e of [...engines].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) out[e.id] = e;
  return out;
}

/** The engines named by `ids` (in that order), or every registered engine when `ids` is empty. */
export function selectIngredientEngines(ids: readonly string[]): IngredientEngine[] {
  const all = availableIngredientEngines();
  if (ids.length === 0) return Object.values(all);
  const unknown = ids.filter((id) => !(id in all));
  if (unknown.length > 0) throw new Error(`unknown engine id(s): ${unknown.join(", ")} (registered: ${Object.keys(all).join(", ")})`);
  return [...new Set(ids)].map((id) => all[id]);
}

/** `extractRecipePage` from the API. Throws EnginesUnavailableError when the build lacks it. */
export function pageExtractor(): PageExtractor {
  const fn = exported("extractRecipePage");
  if (typeof fn !== "function") throw new EnginesUnavailableError("src/index.ts does not export extractRecipePage");
  return fn as PageExtractor;
}

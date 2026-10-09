/**
 * Household seasonings: ordinary salt and black pepper. Every household has them, so they are never put on
 * the grocery list or into pickup calculations, and an imported recipe leaves them out of its ingredients.
 * Recipes saved earlier keep them (they are left out of groceries, not deleted).
 *
 * Deliberately narrow: after removing the words that only describe ordinary salt or black pepper (kosher,
 * sea, fine, flaky, ground, freshly cracked, "to taste"...), nothing may remain but "salt" and "pepper".
 * So "red bell pepper", "cayenne pepper", "red pepper flakes", "pepper sauce", "white pepper", "garlic
 * salt", "smoked salt" and "peppers" stay ordinary ingredients.
 */
const QUALIFIERS = new Set([
  "kosher", "sea", "fine", "finely", "flaky", "flake", "table", "coarse", "coarsely", "iodized", "ground", "freshly", "fresh", "cracked", "black",
  "and", "&", "plus", "or", "to", "taste", "as", "needed", "for", "seasoning", "season", "more", "some", "a", "pinch", "of", "salt", "pepper",
]);

// A bare "pepper" (no "black", "ground", "cracked"… and no salt beside it) is table pepper only when it is
// measured like a seasoning — by the spoon, or with no amount ("pepper to taste"). Counted or weighed, it is
// a pepper you buy ("1 pepper, diced"; RIO-02).
const TABLE_PEPPER_WORDS = new Set(["black", "ground", "cracked", "freshly", "salt"]);
const BOUGHT_BY_PIECE_OR_WEIGHT = new Set(["each", "g", "kg", "oz", "lb"]);

/** `unit` is the amount's unit when known (a recipe line's, or a grocery demand's base unit). */
export function isHouseholdSeasoning(name: string, unit?: string | null): boolean {
  const words = String(name ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[,;:.!]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length || words.length > 10) return false;
  if (!words.includes("salt") && !words.includes("pepper")) return false;
  if (!words.every((w) => QUALIFIERS.has(w))) return false;
  // "black" only describes pepper; "sea", "kosher"... only describe salt.
  if (words.includes("black") && !words.includes("pepper")) return false;
  const barePepper = words.includes("pepper") && !words.some((w) => TABLE_PEPPER_WORDS.has(w));
  if (barePepper && unit && BOUGHT_BY_PIECE_OR_WEIGHT.has(unit)) return false;
  return true;
}

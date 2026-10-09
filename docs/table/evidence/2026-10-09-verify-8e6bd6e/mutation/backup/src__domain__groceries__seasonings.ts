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

export function isHouseholdSeasoning(name: string): boolean {
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
  return true;
}

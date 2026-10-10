/**
 * Household seasonings: ordinary salt and black pepper. Every household has them, so they are never put on
 * the grocery list or into pickup calculations, and an imported recipe leaves them out of its ingredients.
 * Recipes saved earlier keep them (they are left out of groceries, not deleted).
 *
 * Deliberately narrow: after removing the words that only describe ordinary salt or black pepper (kosher,
 * sea, fine, flaky, ground, freshly cracked, "to taste"...), nothing may remain but "salt" and "pepper" —
 * in the name, in its parentheses, after its comma, or in the descriptors beside it. So "red bell pepper",
 * "cayenne pepper", "red pepper flakes", "pepper sauce", "white pepper", "garlic salt", "smoked salt",
 * "salt (smoked)", "pepper (white)" and "peppers" stay ordinary ingredients.
 */
const QUALIFIERS = new Set([
  "kosher", "sea", "fine", "finely", "flaky", "flake", "table", "coarse", "coarsely", "iodized", "ground", "freshly", "fresh", "cracked", "black",
  "and", "&", "plus", "or", "to", "taste", "as", "needed", "for", "seasoning", "season", "more", "some", "a", "pinch", "of", "salt", "pepper",
]);

// Words that say how much, when or for what — never WHICH salt or pepper ("to taste", "divided",
// "about 1 1/2 teaspoons", "plus more for the pasta water"), and the brand names of ordinary kosher salt.
const NEUTRAL = new Set([
  "divided", "optional", "about", "approximately", "approx", "adjust", "if", "desired", "extra", "generous", "little", "dash", "the", "an", "i", "use", "used",
  "tsp", "tsps", "teaspoon", "teaspoons", "tbsp", "tbsps", "tablespoon", "tablespoons", "g", "gram", "grams", "pinches", "dashes", "diamond", "crystal", "morton",
]);

// A bare "pepper" (no "black", "ground", "cracked"… and no salt beside it) is table pepper only when it is
// measured like a seasoning — by the spoon, or with no amount ("pepper to taste"). Counted or weighed, it is
// a pepper you buy ("1 pepper, diced"; D119).
const TABLE_PEPPER_WORDS = new Set(["black", "ground", "cracked", "freshly", "salt"]);
const BOUGHT_BY_PIECE_OR_WEIGHT = new Set(["each", "g", "kg", "oz", "lb"]);

const wordsOf = (text: string) =>
  text.toLowerCase().replace(/[(),;:.!]/g, " ").split(/\s+/).filter(Boolean);
const isAmount = (w: string) => /^[\d½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚/.-]+$/.test(w);

/**
 * The words of a name's parentheses, and of a separate descriptor text (an imported line's note), that
 * change WHICH salt or pepper it is: "salt (smoked)" → ["smoked"], "pepper" + "white" → ["white"];
 * "salt (to taste)", "kosher salt, divided", "+ plus more for the pasta water" → []. A "for …" phrase in a
 * descriptor is a purpose, not an identity. Nothing is ever dropped silently: an unknown word counts (RIO-02).
 */
export function identityDescriptors(name: string, descriptors?: string | null): string[] {
  const inName = [...String(name ?? "").matchAll(/\(([^)]*)\)?/g)].map((m) => m[1]);
  const tail = String(name ?? "").replace(/\(.*$/s, "").split(",").slice(1);
  const out: string[] = [];
  for (const part of [...inName, ...tail, ...String(descriptors ?? "").split(/[;,()]/)]) {
    const w = wordsOf(part);
    const purpose = w.indexOf("for");
    for (const x of purpose < 0 ? w : w.slice(0, purpose)) {
      if (!QUALIFIERS.has(x) && !NEUTRAL.has(x) && !isAmount(x) && !out.includes(x)) out.push(x);
    }
  }
  return out;
}

/**
 * `unit` is the amount's unit when known (a recipe line's, or a grocery demand's base unit); `descriptors`
 * is text that describes the ingredient beside its name (an imported line's note). Ordinary salt and black
 * pepper only: any descriptor that changes the identity makes it an ingredient to buy (RIO-02).
 */
export function isHouseholdSeasoning(name: string, unit?: string | null, descriptors?: string | null): boolean {
  const base = String(name ?? "").replace(/\(.*$/s, "").split(",")[0];
  const words = wordsOf(base);
  if (!words.length || words.length > 10) return false;
  if (!words.includes("salt") && !words.includes("pepper")) return false;
  if (!words.every((w) => QUALIFIERS.has(w) || NEUTRAL.has(w))) return false;
  if (identityDescriptors(name, descriptors).length) return false;
  // "black" only describes pepper; "sea", "kosher"... only describe salt.
  const all = [...words, ...wordsOf(String(descriptors ?? "")), ...wordsOf(String(name ?? "").slice(base.length))];
  if (all.includes("black") && !words.includes("pepper")) return false;
  const barePepper = words.includes("pepper") && !all.some((w) => TABLE_PEPPER_WORDS.has(w));
  if (barePepper && unit && BOUGHT_BY_PIECE_OR_WEIGHT.has(unit)) return false;
  return true;
}

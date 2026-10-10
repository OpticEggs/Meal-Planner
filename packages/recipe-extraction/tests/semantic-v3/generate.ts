/**
 * A seeded generator of ingredient-like lines for semantic-v2 property tests: every amount form,
 * unit spelling (in varied case), package and restatement form, remark, flag phrase, price, bullet,
 * bracket shape and "or" construction the engine reads — combined at random. Deterministic.
 */
import { chance, int, mulberry32, pick, type Rng } from "../parity/corpus";

export const AMOUNTS = [
  "1", "2", "3", "12", "250", "0.5", ".25", "1.5", "1/2", "1/3", "2/3", "3/4", "1/6", "1 1/2", "2 1/3", "1-1/2", "½", "⅓", "1½", "1 ⅔", "1⁄2",
  "a", "an", "one", "two", "twelve", "half", "half a", "a dozen", "one and a half", "about 2", "~3", "2-3", "1 to 2", "1 or 2", "0", "1/0", "1 3/2",
  "1,5", "1,000", "10001", "a few",
];
export const UNITS = [
  "cup", "cups", "c.", "tbsp", "Tbsp.", "tablespoons", "T", "tsp", "teaspoon", "t", "oz", "oz.", "ounces", "fl oz", "fl. oz.", "fluid ounces", "lb", "lbs",
  "pound", "g", "grams", "kg", "ml", "mL", "l", "liter", "dl", "quart", "qt", "pint", "gallon", "can", "cans", "clove", "cloves", "bunch", "sprig", "sprigs",
  "slice", "slices", "stick", "head", "package", "pkg", "jar", "bag", "pinch", "dash", "handful", "splash", "drop", "inch", "each", "",
];
export const PACKAGES = ["(15 oz)", "(14.5-ounce)", "(12 fl oz)", "(400 g)", "15-oz", "(9-inch)", "(1 stick)", "(about 1 lb)", "(15 oz each)", "(2 cups)"];
export const FOODS = [
  "flour", "all-purpose flour", "sugar", "brown sugar", "milk", "2% milk", "whole milk", "black beans", "garlic", "onion", "yellow onion", "red bell pepper",
  "olive oil", "extra-virgin olive oil", "unsalted butter", "chicken broth", "low-sodium chicken broth", "eggs", "rice", "pesto", "half-and-half", "crème fraîche",
  "jalapeño", "parsley", "fresh thyme", "salt", "black pepper", "salt and pepper", "diced tomatoes", "shredded mozzarella", "chopped walnuts", "cream cheese",
  "boneless skinless chicken thighs", "rolled oats", "Greek yogurt", "maple syrup", "lemon juice", "baking soda",
];
export const OR_FOODS = ["milk or cream", "butter or margarine", "chicken or vegetable broth", "fresh or frozen peas", "honey or maple syrup", "lemon or lime juice"];
export const SIZES = ["large", "medium", "small", "extra-large", "extra large"];
export const FORMS = ["cooked", "uncooked", "raw"];
export const TAILS = [
  ", diced", ", minced", ", divided", ", drained and rinsed", ", plus more for dusting", ", to taste", ", for serving", ", for garnish", ", optional",
  ", fresh or frozen", ", homemade or store-bought", ", or water", ", softened", ", cut into 1-inch pieces", ", at room temperature", ", plus 2 tbsp",
  ", as needed", ", cooked", ", red or white", ", peeled, halved and thinly sliced",
];
export const GROUPS = [
  "(optional)", "(packed)", "(homemade (or store-bought))", "(fresh or frozen)", "(or cream)", "(about 2 cups)", "(120 g)", "($0.16)", "($1.78*)", "(to taste)",
  "(low-sodium (if possible))", "(sifted", "(such as cheddar or Gruyère)",
];
export const PREFIXES = ["", "", "", "- ", "• ", "* ", "1. ", "optional: ", "about ", "approximately ", "roughly "];
export const PHRASE_LINES = ["salt and pepper to taste", "olive oil, as needed", "sour cream, for serving", "vegetable oil for frying", "parsley, to garnish"];
export const NON_INGREDIENTS = ["For the sauce:", "TOPPING", "Preheat the oven to 375°F.", "See https://www.example.com/x", "", "Marinade:", "Serves 4"];

function amountLine(rng: Rng): string {
  const parts: string[] = [pick(rng, PREFIXES), pick(rng, AMOUNTS)];
  const p = rng();
  if (p < 0.12) parts.push(" ", pick(rng, PACKAGES));
  else if (p < 0.16) parts.push(" ", pick(rng, ["15-oz", "28-ounce", "8 oz", "x 400g"]));
  const u = pick(rng, UNITS);
  if (u) parts.push(" ", u);
  if (chance(rng, 0.06)) parts.push(" ", pick(rng, ["(240 ml)", "(120 g)", "(15 oz each)", "/ 240 ml", "plus 2 tbsp", "4 oz"]));
  if (chance(rng, 0.1)) parts.push(" of");
  if (chance(rng, 0.15)) parts.push(" ", pick(rng, SIZES));
  if (chance(rng, 0.08)) parts.push(" ", pick(rng, FORMS));
  parts.push(" ", chance(rng, 0.12) ? pick(rng, OR_FOODS) : pick(rng, FOODS));
  if (chance(rng, 0.2)) parts.push(" ", pick(rng, GROUPS));
  if (chance(rng, 0.35)) parts.push(pick(rng, TAILS));
  if (chance(rng, 0.1)) parts.push(pick(rng, TAILS));
  if (chance(rng, 0.05)) parts.push(" ", pick(rng, ["($0.42)", "$0.25"]));
  return parts.join("");
}

function nameFirstLine(rng: Rng): string {
  const food = pick(rng, FOODS);
  return pick(rng, [`${food}, ${pick(rng, AMOUNTS)} ${pick(rng, UNITS)}`, `${food}: ${pick(rng, AMOUNTS)} ${pick(rng, UNITS)}`, `${food} (${pick(rng, AMOUNTS)} ${pick(rng, UNITS)}), diced`, `${food}${pick(rng, TAILS)}`, food]);
}

/** `count` seeded lines: ~80% amount-first, ~12% name-first, the rest phrase lines and non-ingredients. */
export function generateLines(seed: number, count: number): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng();
    let line = r < 0.8 ? amountLine(rng) : r < 0.92 ? nameFirstLine(rng) : r < 0.96 ? pick(rng, PHRASE_LINES) : pick(rng, NON_INGREDIENTS);
    if (chance(rng, 0.05)) line = line.toUpperCase();
    out.push(line.replace(/\s+/g, " ").trim().length === 0 ? line : line.replace(/ {2,}/g, " ").replace(/^ /, ""));
  }
  return out;
}

export { int };

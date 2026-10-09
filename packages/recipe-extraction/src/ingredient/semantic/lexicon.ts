/**
 * semantic-v1 · the engine's small, general vocabularies. Every list here is a closed class of
 * measuring or function words (units, number words, size words, preparation participles, remark
 * markers, imperative verbs); none of them names a food. They are documented so a reviewer can see
 * exactly which words change a reading.
 */
import type { AmountUnstated, UnitCode } from "../../contract";

const words = (s: string): string[] => s.trim().split(/\s+/);
const setOf = (s: string): ReadonlySet<string> => new Set(words(s));
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

// --- Units ---------------------------------------------------------------------------------------

/** Unit spellings (lower case, without a trailing period) → canonical code. Plurals listed explicitly. */
const UNIT_SPELLINGS: Record<UnitCode, string> = {
  mg: "mg mgs milligram milligrams milligramme milligrammes",
  g: "g gs gr grs gm gms gram grams gramme grammes",
  kg: "kg kgs kilo kilos kilogram kilograms kilogramme kilogrammes",
  oz: "oz ozs ounce ounces",
  lb: "lb lbs pound pounds",
  ml: "ml mls milliliter milliliters millilitre millilitres",
  dl: "dl dls deciliter deciliters decilitre decilitres",
  l: "l ls lt lts ltr ltrs liter liters litre litres",
  tsp: "tsp tsps tspn tspns teaspoon teaspoons teaspoonful teaspoonfuls",
  tbsp: "tbsp tbsps tbs tbl tbls tblsp tblsps tblspn tb tablespoon tablespoons tablespoonful tablespoonfuls",
  fl_oz: "floz",
  cup: "c cup cups cupful cupfuls",
  pint: "pt pts pint pints",
  quart: "qt qts quart quarts",
  gallon: "gal gals gallon gallons",
  each: "each ea",
  bag: "bag bags",
  ball: "ball balls",
  block: "block blocks",
  bottle: "bottle bottles btl btls",
  box: "box boxes",
  bulb: "bulb bulbs",
  bunch: "bunch bunches",
  can: "can cans",
  carton: "carton cartons ctn ctns",
  clove: "clove cloves",
  container: "container containers",
  cube: "cube cubes",
  ear: "ear ears",
  envelope: "envelope envelopes env envs",
  fillet: "fillet fillets filet filets",
  head: "head heads",
  jar: "jar jars",
  leaf: "leaf leaves",
  link: "link links",
  loaf: "loaf loaves",
  package: "package packages pkg pkgs pack packs",
  packet: "packet packets pkt pkts",
  piece: "piece pieces pc pcs",
  pod: "pod pods",
  rib: "rib ribs",
  sheet: "sheet sheets",
  slice: "slice slices",
  sprig: "sprig sprigs",
  stalk: "stalk stalks",
  stick: "stick sticks",
  strip: "strip strips",
  tin: "tin tins",
  tube: "tube tubes",
  wedge: "wedge wedges",
  dash: "dash dashes",
  drop: "drop drops",
  handful: "handful handfuls",
  inch: "inch inches",
  knob: "knob knobs",
  pinch: "pinch pinches",
  scoop: "scoop scoops",
  splash: "splash splashes",
  sprinkle: "sprinkle sprinkles",
};

const UNIT_BY_WORD: Record<string, UnitCode> = Object.create(null);
for (const [code, spellings] of Object.entries(UNIT_SPELLINGS) as [UnitCode, string][]) {
  for (const w of words(spellings)) UNIT_BY_WORD[w] = code;
}

/** Spellings whose case decides the unit: `T` is a tablespoon, `t` a teaspoon (cooking convention). */
const UNIT_BY_CASED_WORD: Record<string, UnitCode> = Object.assign(Object.create(null), { T: "tbsp", t: "tsp", Tb: "tbsp", TB: "tbsp", Tbs: "tbsp", TBS: "tbsp" });

/** The unit code a single written word names, or null. "fl"/"fluid" + "oz" is read by the unit reader. */
export function unitOfWord(text: string): UnitCode | null {
  if (hasOwn(UNIT_BY_CASED_WORD, text)) return UNIT_BY_CASED_WORD[text];
  if (text === "t") return "tsp";
  const lower = text.toLowerCase();
  return hasOwn(UNIT_BY_WORD, lower) ? UNIT_BY_WORD[lower] : null;
}

/** Words that, with "oz"/"ounce(s)" after them, make a fluid ounce. */
export const FLUID_WORDS = setOf("fl fluid");
export const OUNCE_WORDS = setOf("oz ozs ounce ounces");

/** Count units that are packaging: a stated size after them ("1 can (15 oz)") is the container's contents. */
export const CONTAINER_UNITS: ReadonlySet<UnitCode> = new Set<UnitCode>([
  "bag", "block", "bottle", "box", "can", "carton", "container", "envelope", "jar", "package", "packet", "tin", "tube",
]);

/**
 * Count nouns that are read as the unit when written AFTER the food ("3 garlic cloves", "4 bacon
 * slices", "2 celery stalks"): portions of a food that is bought as itself. Product-form nouns (sticks,
 * leaves, pods, cubes, sheets, pieces) and packaging are NOT read this way: "4 cinnamon sticks" keeps
 * its name, because "cinnamon" alone could be a different product.
 */
export const TRAILING_COUNT_UNITS: ReadonlySet<UnitCode> = new Set<UnitCode>([
  "clove", "stalk", "rib", "sprig", "slice", "strip", "fillet", "link", "ear", "head", "bulb", "wedge",
]);

// --- Numbers -------------------------------------------------------------------------------------

/** Unicode vulgar fractions → [numerator, denominator]. ↉ (0/3) reads as zero. */
export const VULGAR: Readonly<Record<string, readonly [number, number]>> = Object.assign(Object.create(null), {
  "½": [1, 2], "⅓": [1, 3], "⅔": [2, 3], "¼": [1, 4], "¾": [3, 4], "⅕": [1, 5], "⅖": [2, 5], "⅗": [3, 5], "⅘": [4, 5], "⅙": [1, 6],
  "⅚": [5, 6], "⅐": [1, 7], "⅛": [1, 8], "⅜": [3, 8], "⅝": [5, 8], "⅞": [7, 8], "⅑": [1, 9], "⅒": [1, 10], "↉": [0, 3],
});

/** Cardinal number words (CONTRACT §7.1: one … twelve). */
export const CARDINALS: Readonly<Record<string, number>> = Object.assign(Object.create(null), {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
});

/** Fraction nouns: "half", "a third", "two thirds", "three quarters". */
export const FRACTION_WORDS: Readonly<Record<string, number>> = Object.assign(Object.create(null), {
  half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4,
});

/** Words that state an amount without a number ("a few sprigs"): read, never turned into a number. */
export const VAGUE_AMOUNT_WORDS = setOf("few several some couple little bit");

/** Slash characters that write a fraction: solidus, fraction slash, division slash. */
export const FRACTION_SLASHES = new Set(["/", "⁄", "∕"]);

/** Dashes that join a range ("2-3", "2–3"). */
export const RANGE_DASHES = new Set(["-", "‐", "‑", "‒", "–", "—", "−", "~"]);

// --- Words around the amount ---------------------------------------------------------------------

/** Approximation markers before an amount (CONTRACT §7.11 plus "approx." and "around"). */
export const APPROX_WORDS = setOf("about approximately approx roughly around");
export const APPROX_SYMBOLS = new Set(["~", "≈"]);

/** Size words (CONTRACT §7.6/§7.7: → note). Abbreviations lg/sm/med included. */
export const SIZE_WORDS = setOf(
  "small medium large big jumbo extra-large x-large xl extra-small medium-size medium-sized large-size large-sized small-size small-sized " +
    "medium-large small-medium lg lrg sm med",
);

/**
 * Measure adjectives that qualify a unit ("2 heaping tbsp", "1 scant cup", "2 thick slices") — read as a
 * note only when a unit follows them.
 */
export const MEASURE_ADJECTIVES = setOf("heaping heaped scant level rounded generous good full thick thin small medium large big");

/** cooked / raw words (CONTRACT §7.6: → `form`). */
export const FORM_WORDS: Readonly<Record<string, "cooked" | "raw">> = Object.assign(Object.create(null), {
  cooked: "cooked", precooked: "cooked", "pre-cooked": "cooked", uncooked: "raw", raw: "raw",
});

// --- Remarks ---------------------------------------------------------------------------------------

/**
 * Words that describe sourcing, form, state, temperature or preparation — the vocabulary of a remark.
 * An `or` whose options use only these words (plus function words) is a remark, so it is a note
 * ("homemade or store-bought", "fresh or frozen"), never a choice of ingredients.
 */
export const REMARK_WORDS = setOf(
  // sourcing
  "homemade home-made store-bought storebought store-made bought purchased prepared premade pre-made ready-made readymade jarred bottled canned " +
    "boxed packaged fresh freshly frozen thawed defrosted dried dry leftover organic conventional scratch local " +
    // form, state, temperature
    "cooked uncooked raw precooked pre-cooked warm warmed cold chilled hot lukewarm room temperature softened melted whole ground " +
    "bone-in boneless skin-on skinless peeled unpeeled shelled unshelled " +
    // preparation
    "sliced chopped diced minced grated shredded crushed cubed halved quartered julienned torn crumbled mashed " +
    // amount remarks
    "more less so extra additional plenty taste needed desired necessary preferred possible available " +
    // preference
    "favorite favourite preferably ideally optional kind brand type variety style",
);

/** Function words that may appear inside a remark without making it about an ingredient. */
export const FUNCTION_WORDS = setOf("a an the or and of in from to your my any if as for with use using can be is you prefer like such e.g i.e etc");

/** A remark that starts with one of these is a remark even when it names foods ("such as cheddar or Gruyère"). */
export const REMARK_OPENERS: readonly (readonly string[])[] = [
  ["such", "as"], ["like"], ["preferably"], ["ideally"], ["e.g"], ["eg"], ["i.e"], ["ie"], ["see"], ["i", "like"], ["i", "use"], ["we", "use"],
  ["you", "can", "use"], ["any"], ["your", "favorite"], ["your", "favourite"], ["recipe"], ["store-bought", "is", "fine"],
];

/**
 * Preparation participles and adverbs that, at the END of the name with no comma ("2 eggs beaten"),
 * are a preparation note. A participle at the start of the name stays in the name (CONTRACT §7.6).
 */
export const TRAILING_PREP_WORDS = setOf(
  "chopped diced minced sliced grated shredded crushed peeled cubed halved quartered julienned trimmed seeded cored pitted rinsed drained " +
    "beaten melted softened divided separated sifted toasted juiced zested mashed pureed puréed thawed torn smashed crumbled deveined shelled " +
    "stemmed hulled scrubbed washed patted squeezed",
);
export const PREP_ADVERBS = setOf("finely thinly roughly coarsely lightly well very thickly freshly");

/** Phrases that say there is no fixed amount (CONTRACT §7.10), as word sequences (lower case). */
export const UNSTATED_PHRASES: readonly [readonly string[], AmountUnstated][] = [
  [["to", "taste"], "to_taste"],
  [["to", "your", "taste"], "to_taste"],
  [["according", "to", "taste"], "to_taste"],
  [["as", "needed"], "as_needed"],
  [["as", "desired"], "as_needed"],
  [["if", "needed"], "as_needed"],
  [["as", "required"], "as_needed"],
  [["as", "necessary"], "as_needed"],
  [["if", "necessary"], "as_needed"],
  [["for", "serving"], "for_serving"],
  [["to", "serve"], "for_serving"],
  [["for", "garnish"], "for_garnish"],
  [["for", "garnishing"], "for_garnish"],
  [["to", "garnish"], "for_garnish"],
  [["as", "a", "garnish"], "for_garnish"],
  [["as", "garnish"], "for_garnish"],
  [["for", "decoration"], "other"],
  [["for", "the", "pan"], "other"],
  [["for", "the", "pans"], "other"],
  [["for", "the", "grill"], "other"],
  [["for", "the", "skillet"], "other"],
  [["for", "the", "dish"], "other"],
  [["for", "the", "tray"], "other"],
  [["for", "the", "griddle"], "other"],
  [["to", "finish"], "other"],
  [["to", "drizzle"], "other"],
  [["to", "sprinkle"], "other"],
  [["to", "dust"], "other"],
  [["to", "brush"], "other"],
  [["to", "grease"], "other"],
  [["to", "fry"], "other"],
  [["to", "coat"], "other"],
];
/** "if desired": optional, and no fixed amount (like "as desired"). */
export const IF_DESIRED: readonly string[] = ["if", "desired"];

// --- Non-ingredient lines --------------------------------------------------------------------------

/** Imperative verbs that open an instruction ("Preheat the oven…"). Words that also open food names (brown, roast, grill) are left out. */
export const INSTRUCTION_VERBS = setOf(
  "preheat heat bake cook stir mix combine add place bring whisk serve let cover remove transfer pour season chill refrigerate simmer boil " +
    "fry saute sauté blend beat fold knead spread sprinkle drain rinse chop dice mince peel grate put arrange divide repeat allow make prepare " +
    "wash pat toss melt soak marinate grease wrap reduce return turn flip microwave pulse puree purée strain squeeze spoon layer " +
    "set line whip cut slice garnish drizzle brush discard reserve meanwhile then once while when",
);
/** Words that open a yield line ("Serves 4", "Makes 12 cookies"). */
export const YIELD_WORDS = setOf("serves serve makes yields yield servings");
export const NOTE_LABELS = setOf("note notes tip tips equipment instructions directions method step steps");
export const HEADING_WORDS = setOf("ingredients ingredient");

/** List markers removed from the start of a line. */
export const BULLETS = new Set(["-", "•", "·", "*", "–", "—", "‣", "◦", "▪", "▫", "■", "□", "●", "○", "►", "▸", "➤", "→", "✓", "✔", "+"]);

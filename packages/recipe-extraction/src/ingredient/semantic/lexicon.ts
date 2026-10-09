/**
 * semantic-v1 · the engine's small, general vocabularies, documented so a reviewer can see exactly which
 * words change a reading. Most lists are closed classes of measuring or function words (units, number
 * words, size and measure words, preparation participles, remark markers, imperative verbs, nutrition
 * labels). Three lists DO name foods and say so where they are defined: STANDALONE_INGREDIENTS (pantry
 * staples offered whole as a substitute), INVARIANT_PLURALS (zero-plural nouns) and the food-like
 * words that RECIPE_PART_WORDS deliberately leaves out. No list was chosen from a label set.
 */
import type { AmountUnstated, UnitCode } from "../../contract";

const words = (s: string): string[] => s.trim().split(/\s+/);
const setOf = (s: string): ReadonlySet<string> => new Set(words(s));
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

// --- Units ---------------------------------------------------------------------------------------

/**
 * Unit spellings (lower case, without a trailing period) → canonical code. Plurals listed explicitly.
 * "tub(s)" and "pots" are containers and "bars" a block ("4 125 g pots yogurt", "2 100 g bars chocolate");
 * the singulars "pot" and "bar" are left out because they begin food names ("pot roast", "bar cookies").
 */
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
  fl_oz: "floz fl-oz",
  cup: "c cup cups cupful cupfuls",
  pint: "pt pts pint pints",
  quart: "qt qts quart quarts",
  gallon: "gal gals gallon gallons",
  each: "each ea",
  bag: "bag bags",
  ball: "ball balls",
  block: "block blocks bars",
  bottle: "bottle bottles btl btls",
  box: "box boxes",
  bulb: "bulb bulbs",
  bunch: "bunch bunches",
  can: "can cans",
  carton: "carton cartons ctn ctns",
  clove: "clove cloves",
  container: "container containers tub tubs pots",
  cube: "cube cubes",
  ear: "ear ears",
  envelope: "envelope envelopes env envs",
  fillet: "fillet fillets filet filets",
  head: "head heads",
  jar: "jar jars",
  leaf: "leaf leaves",
  link: "link links",
  loaf: "loaf loaves",
  package: "package packages pkg pkgs pk pks pck pack packs",
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

/**
 * Unit spellings that also begin food names ("pound cake", "gram crackers", "gram flour", "cup noodles",
 * "pint glass"): written with no number of their own, they are read as food, not as a unit.
 */
export const UNIT_WORDS_IN_FOOD_NAMES = setOf("pound gram cup pint quart liter litre");

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
 * slices", "2 celery stalks"): portions of a food that is bought as itself. Nouns that often ARE the
 * product after another noun (ribs, strips, wedges, heads, sticks, leaves, pods, cubes, sheets,
 * pieces) and packaging are NOT read this way: "4 cinnamon sticks" and "1 rack baby back ribs" keep
 * their names, because the first word alone could be a different product.
 */
export const TRAILING_COUNT_UNITS: ReadonlySet<UnitCode> = new Set<UnitCode>(["clove", "stalk", "sprig", "slice", "fillet", "link", "ear", "bulb"]);

// --- Numbers -------------------------------------------------------------------------------------

/** Unicode vulgar fractions → [numerator, denominator]. ↉ (0/3) reads as zero. */
export const VULGAR: Readonly<Record<string, readonly [number, number]>> = Object.assign(Object.create(null), {
  "½": [1, 2], "⅓": [1, 3], "⅔": [2, 3], "¼": [1, 4], "¾": [3, 4], "⅕": [1, 5], "⅖": [2, 5], "⅗": [3, 5], "⅘": [4, 5], "⅙": [1, 6],
  "⅚": [5, 6], "⅐": [1, 7], "⅛": [1, 8], "⅜": [3, 8], "⅝": [5, 8], "⅞": [7, 8], "⅑": [1, 9], "⅒": [1, 10], "↉": [0, 3],
});

/** Cardinal number words (CONTRACT §7.1: one … twelve, continued through the teens and the tens). */
export const CARDINALS: Readonly<Record<string, number>> = Object.assign(Object.create(null), {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90,
});
/** Tens that combine with a unit word ("twenty-four", "thirty two"). */
export const TENS = setOf("twenty thirty forty fifty sixty seventy eighty ninety");

/** Fraction nouns: "half", "a third", "two thirds", "three quarters". */
export const FRACTION_WORDS: Readonly<Record<string, number>> = Object.assign(Object.create(null), {
  half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4,
});

/** Words that state an amount without a number ("a few sprigs"): read, never turned into a number. */
export const VAGUE_AMOUNT_WORDS = setOf("few several some couple little bit");

/** Slash characters that write a fraction: solidus, fraction slash, division slash. */
export const FRACTION_SLASHES = new Set(["/", "⁄", "∕", "／"]);

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

/**
 * Measure nouns that are NOT in UNIT_REGISTRY ("a drizzle of", "2 rashers", "1 dsp"): the amount is read
 * as stated but cannot be carried without a unit, so the line needs review (`unit_unknown`).
 */
export const UNKNOWN_MEASURES = setOf(
  "dsp dsps dessertspoon dessertspoons dollop dollops glug glugs drizzle drizzles squeeze squeezes rasher rashers punnet punnets " +
    "sachet sachets glass glasses mug mugs spoonful spoonfuls shot shots jigger jiggers cl cls centiliter centiliters centilitre centilitres " +
    "peck pecks bushel bushels dab dabs pat pats lump lumps sliver slivers twist twists nub nubs smidgen smidgens",
);

/** Words after a number that make it a temperature or a time, never an amount ("350°F", "10 minutes"). */
export const TIME_WORDS = setOf("minute minutes min mins hour hours hr hrs second seconds sec secs degree degrees");

/** Bounds that make an amount open-ended ("up to 1 cup", "at least 2 cups"): no single amount is stated. */
export const BOUND_PHRASES: readonly (readonly string[])[] = [["up", "to"], ["at", "least"], ["at", "most"], ["no", "more", "than"], ["not", "more", "than"], ["no", "less", "than"]];

/** Length words: a size, never a unit of the registry ("2 cm piece ginger"). */
/** Lengths right after a number: sizes, never amounts ("2 cm piece", "6 in. skewers": "in" only directly after the number). */
export const LENGTH_WORDS = setOf(
  "cm cms centimeter centimeters centimetre centimetres mm millimeter millimeters millimetre millimetres in foot feet ft yard yards yd yds " +
    "meter meters metre metres",
);

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

/**
 * Adjectives that describe a version of a food — colour, taste, heat, fat and salt level, texture, grade and
 * processing ("red", "unsalted", "low-fat", "extra-virgin", "rolled"). None of them is a food. With the
 * structural tests in alternatives.ts (past participles "granulated", "un-"/"non-" forms, "-ing" compounds,
 * percentages) they tell that the options of a choice are versions of the named food: "sugar (granulated or
 * powdered)" → granulated sugar, powdered sugar; "1 onion, red or white" → red onion, white onion.
 * General English adjectives, not chosen from any label set.
 */
export const ADJECTIVE_WORDS = setOf(
  "red white green yellow black brown purple golden pink orange dark light sweet unsweetened sweetened semisweet bittersweet hot mild spicy " +
    "smoked plain skim whole low-fat nonfat non-fat fat-free full-fat reduced-fat lowfat low-sodium reduced-sodium salted unsalted regular wild long " +
    "short coarse fine kosher flat-leaf curly seedless unbleached bleached toasted roasted instant quick old-fashioned rolled steel-cut " +
    "large-curd small-curd extra-virgin virgin light-brown dark-brown fresh frozen dried canned cooked uncooked raw firm soft silken extra-firm " +
    "thick thin sharp aged mature creamy chunky crunchy smooth natural organic heavy double single strong extra-sharp lean extra-lean ripe " +
    "bone-in boneless skin-on skinless seedless",
);

/**
 * Basic ingredients that are routinely offered WHOLE as a substitute for a compound ingredient ("butter or
 * olive oil", "honey or maple syrup", "water or chicken stock", "milk or heavy cream"). A word from this
 * list before "or" is its own option, so the last option's head is not shared with it ("butter oil" and
 * "honey syrup" would be made up). This is a list of foods, kept short and general (pantry staples and
 * liquids), not chosen from any label set; any other single word before "or" shares the last option's
 * head ("maple or agave syrup", "Greek or plain yogurt", "chicken or vegetable broth").
 */
export const STANDALONE_INGREDIENTS = setOf(
  "water butter margarine ghee lard shortening oil honey sugar salt milk cream stock broth wine beer vinegar juice yogurt yoghurt " +
    "mayonnaise mayo ketchup molasses jam jelly cheese flour cornstarch eggs egg tofu",
);

/**
 * Nouns whose plural is the same word (zero plural: "12 shrimp", "4 salmon"). A count before them is a count,
 * not a number inside a name. A linguistic list (fish, shellfish and game names with zero plurals), general.
 */
export const INVARIANT_PLURALS = setOf("shrimp fish salmon trout cod tuna squid sheep deer halibut tilapia moose bison prawn scampi haddock pollock venison");

/** Words that cannot start a food name; at the start of a name they are left-overs of a misread amount or a purpose ("or b", "for topping"). */
export const LEADING_JUNK = setOf("or and nor with to plus but for");

/** Function words that may appear inside a remark without making it about an ingredient. */
export const FUNCTION_WORDS = setOf("a an the or and of in from to your my any if as for with use using can be is you prefer like such e.g i.e etc");

/**
 * Preparation participles and adverbs that, at the END of the name with no comma ("2 eggs beaten"),
 * are a preparation note. A participle at the start of the name stays in the name (CONTRACT §7.6).
 */
export const TRAILING_PREP_WORDS = setOf(
  "chopped diced minced sliced grated shredded crushed peeled cubed halved quartered julienned trimmed seeded cored pitted rinsed drained " +
    "beaten melted softened divided separated sifted toasted juiced zested mashed pureed puréed thawed torn smashed crumbled deveined shelled " +
    "stemmed hulled scrubbed washed patted squeezed pressed snipped",
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
/**
 * "for <…ing>" phrases that say how a food is applied, with no fixed amount (CONTRACT §7.10 "other":
 * for dusting, greasing, frying, drizzling…). A component noun ("for icing", "for the filling") or a
 * dish ("for spring rolls") is NOT one of these.
 */
export const APPLICATION_GERUNDS = setOf(
  "dusting greasing frying deep-frying pan-frying stir-frying shallow-frying drizzling brushing sprinkling topping coating dipping rolling " +
    "kneading shaping sautéing sauteing searing basting finishing glazing oiling buttering flouring dredging breading misting spraying " +
    "decorating cooking baking roasting grilling broiling poaching boiling blanching lining smearing spreading",
);

/** "if desired": optional, and no fixed amount (like "as desired"). */
export const IF_DESIRED: readonly string[] = ["if", "desired"];

// --- Non-ingredient lines --------------------------------------------------------------------------

/**
 * Imperative verbs that open an instruction ("Preheat the oven…"). Words that also open food names (brown,
 * roast, grill, cool, store, top) are left out. WEAK verbs also name foods or forms ("Cut green beans",
 * "Season salt", "Roll", "Mince pie"), so a line opening with one is an instruction only when it reads like
 * a sentence (INSTRUCTION_CUES or a closing period).
 */
export const INSTRUCTION_VERBS = setOf(
  "preheat heat bake cook stir mix combine add place bring whisk serve let cover remove transfer pour chill refrigerate simmer boil " +
    "saute sauté blend beat fold knead sprinkle drain rinse put arrange divide repeat allow make prepare wash pat toss melt soak marinate grease " +
    "wrap reduce return turn flip microwave pulse puree purée strain squeeze spoon discard reserve meanwhile then once while when shape press " +
    "scatter sift measure weigh",
);
export const WEAK_INSTRUCTION_VERBS = setOf("season whip line spread roll slice set cut chop dice mince peel grate garnish drizzle brush layer fry");
/** Words that open a yield line ("Serves 4", "Makes 12 cookies"). */
export const YIELD_WORDS = setOf("serves serve makes yields yield servings");

/**
 * Nutrition-fact labels. A line is a nutrition fact only when the WHOLE label is made of these words and
 * the value is only a number with a nutrient unit (FACT_UNITS): "Calories: 250", "Fat: 10 g", "Saturated
 * fat 3g", "Protein 20g". Any food word makes the line food again ("Protein powder: 1 scoop", "Low sodium
 * soy sauce: 2 tbsp", "Fat: 2 tbsp bacon grease"); "sugar" alone is food, "sugars" is a nutrient.
 */
export const NUTRIENT_WORDS = setOf(
  "calories calorie kcal kj kilojoules energy nutrition nutritional protein proteins carbs carbohydrates carbohydrate fiber fibre cholesterol " +
    "sodium potassium calcium iron fat fats saturated unsaturated monounsaturated polyunsaturated trans sugars added total dietary net per serving",
);
/** Units of a nutrition value ("250 kcal", "10 g", "200 mg", "15%"). */
export const FACT_UNITS = setOf("g mg mcg µg kcal cal calories calorie kj iu % dv");

/**
 * Serving and size labels ("Serving size: 1 cup", "Per serving: 2 tbsp", "Portion: 200 g", "Total: 2 cups"):
 * a recipe fact only when the whole label is made of these words and the value is a bare amount with no
 * food after it. "Per person: 200 g pasta" is food (an amount per person: a person checks it).
 */
export const SERVING_LABEL_WORDS = setOf("serving servings size per portion portions weight total yield yields person people makes serves");
/** Equipment labels: what follows is never food ("Special equipment: 9-inch pan"). */
export const EQUIPMENT_LABEL_WORDS = setOf("equipment tools utensils");
/** Nouns that, right after a number and ending the line, count something other than food ("4 servings", "250 kcal"). */
export const META_NOUNS = setOf("servings serving portions portion people persons person kcal calories calorie cal kj");

/**
 * Words that name a part or step of a recipe and are never bought as food; an all-capitals line made only
 * of these (with "for", "the", "and", "to") is a heading ("TOPPING", "FOR THE FILLING"). Parts that can also
 * be bought or named as food (sauce, crust, dressing, dough, bread, stock, syrup…) are left out: "BREAD" or
 * "PIE CRUST" may be food, and an unsure line goes to a person rather than being refused.
 */
export const RECIPE_PART_WORDS = setOf(
  "topping toppings filling fillings garnish garnishes marinade glaze frosting icing assembly streusel decoration decorations main sides " +
    "extras serve serving finish finishing decorate for the and to ingredients ingredient dry wet",
);

/** Words that, after an opening verb, show the line is an instruction ("Season with…", "Roll into…", "Mix all…"). */
export const INSTRUCTION_CUES = setOf("the a an all into onto with until in to for over on at together then from off each well");
export const NOTE_LABELS = setOf("note notes tip tips equipment instructions directions method step steps");
export const HEADING_WORDS = setOf("ingredients ingredient");

/** List markers removed from the start of a line. */
export const BULLETS = new Set(["-", "•", "·", "*", "–", "—", "‣", "◦", "▪", "▫", "■", "□", "●", "○", "►", "▸", "➤", "→", "✓", "✔", "+"]);

/**
 * semantic-v2 · the engine's small, general vocabularies, documented so a reviewer can see exactly which
 * words change a reading. Most lists are closed classes of measuring or function words (units, number
 * words, size and measure words, preparation participles, remark markers, imperative verbs, nutrition
 * labels). Lists that DO name foods say so where they are defined: INVARIANT_PLURALS (zero-plural nouns),
 * PRODUCT_IDENTITY_NOUNS (§12.4), SHARED_HEAD_MODIFIERS (modifier words per product head, §12.7 b),
 * CATEGORY_NOUNS, COUNTED_COMPONENT_NOUNS, LENGTH_MEASURED_FOODS, SIZE_GRADED_NOUNS and DISH_WORDS. Each is a
 * closed class chosen from what the words mean (CONTRACT §12), never a list of corpus inputs.
 */
import type { AmountUnstated, UnitCode } from "../../contract";
import { FLUID_OUNCE_WORDS, UNIT_ALIASES, unitOfAlias } from "../../unit-aliases";

const words = (s: string): string[] => s.trim().split(/\s+/);
const setOf = (s: string): ReadonlySet<string> => new Set(words(s));
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

// --- Units ---------------------------------------------------------------------------------------

/**
 * semantic-v3 (CONTRACT §13.1): unit words come ONLY from the declared table `src/unit-aliases.ts` (`unitOfAlias`).
 * This engine has no private unit spellings: a word the table does not declare (`tub`, `pot`, `bar`, `rasher`,
 * `punnet`, `stem`, `cob`…) is never a unit here — in the measure slot it is an unresolved measure (§12.14, §13.2).
 */
/**
 * Unit spellings that also begin food names ("pound cake", "gram crackers", "gram flour", "cup noodles",
 * "pint glass"): written with no number of their own, they are read as food, not as a unit.
 */
export const UNIT_WORDS_IN_FOOD_NAMES = setOf("pound gram cup pint quart liter litre");

/** The unit code a single written word declares (CONTRACT §13.1, `unitOfAlias`), or null. "fl"/"fluid" + "oz" is read by the unit reader. */
export function unitOfWord(text: string): UnitCode | null {
  return unitOfAlias(text);
}

/** Words that, with an `oz` alias after them, make a fluid ounce (the declared FLUID_OUNCE_WORDS). */
export const FLUID_WORDS: ReadonlySet<string> = new Set(FLUID_OUNCE_WORDS);
/** The declared `oz` aliases. */
export const OUNCE_WORDS: ReadonlySet<string> = new Set(UNIT_ALIASES.oz);

/** Count units that are packaging: a stated size after them ("1 can (15 oz)") is the container's contents. */
export const CONTAINER_UNITS: ReadonlySet<UnitCode> = new Set<UnitCode>([
  "bag", "block", "bottle", "box", "can", "carton", "container", "envelope", "jar", "package", "packet", "tin", "tube",
]);

/**
 * semantic-v2 COUNT-NOUN RULE (CONTRACT §12.4, labelling guide "3 garlic cloves"): count nouns that are read as the
 * unit when written AFTER the food with a bare count — portions of a food that is bought as itself ("3 garlic cloves",
 * "2 celery ribs", "4 lemon wedges", "2 cinnamon sticks", "8 cardamom pods", "2 lettuce heads"). Packaging (cans,
 * bags…) and "bars" (a block) are not portions and are not read this way.
 */
export const TRAILING_COUNT_UNITS: ReadonlySet<UnitCode> = new Set<UnitCode>([
  "clove", "stalk", "sprig", "slice", "fillet", "link", "ear", "bulb", "pod", "rib", "wedge", "stick", "strip", "head", "sheet", "leaf", "cube", "piece", "bunch",
]);

/**
 * PRODUCT-IDENTITY NOUNS (CONTRACT §12.4 exceptions): after these words the count noun is part of the product sold
 * under that name ("fish sticks", "bay leaves", "ice cubes", "short ribs", "whole cloves" — the spice), so it stays in
 * the name and the count is `each`. A closed list per noun (the word right before it), not a list of inputs.
 */
export const PRODUCT_IDENTITY_NOUNS: Readonly<Partial<Record<UnitCode, ReadonlySet<string>>>> = {
  stick: setOf("fish mozzarella cheese string pretzel bread crab"),
  leaf: setOf("bay curry banana grape vine lime makrut kaffir fig pandan shiso perilla tea"),
  cube: setOf("ice stock bouillon"),
  rib: setOf("short spare back pork beef lamb veal country-style plate chuck flanken dino dinosaur louis prime standing english kalbi galbi"),
  sheet: setOf("lasagna"),
  strip: setOf("york city"),
  clove: setOf("whole ground"),
};

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
    "medium-large small-medium lg lrg sm med colossal giant little",
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
    "peck pecks bushel bushels dab dabs pat pats lump lumps sliver slivers twist twists nub nubs smidgen smidgens " +
    // semantic-v2 (§12.14): packaging and batch words outside the registry ("1 sleeve saltine crackers", "1 recipe pie dough")
    "sleeve sleeves recipe recipes batch batches roll rolls " +
    // household vessels and spoons used as measures ("1 teacup sugar", "2 ladles stock", "1 bowl rice", "1 saucer milk")
    "teacup teacups coffeecup coffeecups tumbler tumblers beaker beakers jug jugs pitcher pitchers carafe carafes decanter decanters bowl bowls " +
    "saucer saucers ladle ladles spoon spoons soupspoon soupspoons tablespoonful bucket buckets pail pails crate crates pottle pottles sack sacks " +
    "basket baskets barrel barrels keg kegs flagon flagons tray trays " +
    // archaic and foreign units ("1 gill cream", "2 drams vanilla", "1 stone potatoes", "1 catty pork")
    "gill gills dram drams drachm drachms minim minims noggin noggins pony ponies firkin firkins stone stones catty catties tael taels " +
    // informal lumps and portions ("1 hunk Parmesan", "1 thumb ginger", "1 slab tofu", "a blob of butter")
    "hunk hunks chunk chunks slab slabs thumb thumbs blob blobs wodge wodges swig swigs slug slugs smidge tad wineglass wineglasses thimble " +
    "thimbles net nets wheel wheels log logs brick bricks measure measures finger fingers seer seers rack racks leg legs " +
    // semantic-v2 round 2 (§12.14): more portions and vessels ("1 shake paprika", "1 knuckle ginger", "2 clusters grapes")
    "shake shakes knuckle knuckles cluster clusters squirt squirts swirl swirls tot tots nip nips snifter snifters flask flasks twig twigs " +
    "bundle bundles smear smears eggcup eggcups dribble dribbles splosh drizzle drizzles sprig-full fistful scrap scraps morsel shaving " +
    "jar-full canful trickle trickles nugget " +
    // containers outside the registry ("1 pouch tuna", "1 canister oats", "1 clamshell spring mix")
    "pouch pouches canister canisters clamshell clamshells tablet tablets portion portions " +
    // a singular "bar" before a food ("1 bar cream cheese"; "bars" is a registry block)
    "bar growler growlers " +
    // semantic-v2 round 3 (R1 item 1): vessels, and food words that are also measures, right after a count ("1 pot chili",
    // "1 kettle boiling water", "1 casserole dish baked ziti", "1 square baking chocolate", "1 bouquet flat-leaf parsley",
    // "1 spritz lime juice", "2 sips dark rum", "1 gulp lemonade", "1 hand bananas"); a compound food after them stays food
    // ("pot roast", "bouquet garni", "hand pies")
    "pot pots pan pans kettle kettles dish dishes casserole casseroles square squares bouquet bouquets spritz spritzes sip sips gulp gulps " +
    "hand hands serving servings helping helpings slosh sloshes " +
    // collective and cut nouns before a food ("1 flat strawberries", "1 string chilies", "1 side salmon", "1 joint lamb",
    // "1 case beer", "1 rope garlic"); compound foods after them stay food ("string beans", "side salad")
    "flat flats string strings side sides joint joints braid braids case cases trug trugs hank hanks rope ropes ristra ristras " +
    // vessels and tools that hold an amount ("1 shaker salt", "1 platter cold cuts")
    "shaker shakers grinder grinders mill mills plate plates platter platters tray trays dish dishes ramekin ramekins " +
    // layers and coats ("1 layer cream", "1 thin coating flour")
    "layer layers coating coatings",
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

/** Form and sourcing words that offer a food in another form when they open a choice ("fresh … or dried", §12.7 d). */
export const FORM_CHOICE_WORDS = setOf(
  "fresh frozen thawed dried dry canned tinned jarred bottled boxed packaged homemade home-made store-bought storebought bought cooked uncooked raw " +
    "precooked pre-cooked smoked roasted toasted salted unsalted sweetened unsweetened",
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
 * SOURCE CLASSES (semantic-v2, CONTRACT §12.7 b, f): attributive nouns that name what a product is made from — meats,
 * nuts and seeds, fruits, vegetables, grains. None of them is, on its own, a product of the heads it is listed for below
 * ("chicken" is not a broth, "almond" is not a butter, "lemon" is not a juice, "pork" is not a sausage). General food
 * classes, not lists of inputs.
 */
const MEAT_SOURCES = "chicken beef pork turkey lamb veal duck goose venison bison buffalo ham fish seafood shrimp crab lobster salmon tuna clam rabbit goat";
const NUT_SEED_SOURCES = "almond cashew peanut pecan walnut hazelnut pistachio macadamia pine brazil sunflower pumpkin sesame flax flaxseed chia hemp poppy soy soybean";
const FRUIT_SOURCES = "apple pear lemon lime orange grapefruit tangerine pineapple cranberry grape cherry pomegranate peach mango apricot plum blueberry raspberry strawberry blackberry coconut tomato passion date fig banana kiwi papaya guava lychee nectarine quince rhubarb watermelon melon";
const VEGETABLE_SOURCES = "onion garlic celery carrot mushroom vegetable veggie beet ginger chili chile shallot leek spinach tomato pumpkin squash kale pepper potato corn pea";
const GRAIN_SOURCES = "rice oat wheat corn rye spelt barley buckwheat millet chickpea tapioca potato quinoa sorghum teff arrowroot";

/**
 * SHARED-HEAD MODIFIERS (semantic-v2, CONTRACT §12.7 b, f): for a product head, the source classes and the kind words
 * that do NOT name a product of that kind on their own. Before "or … <head>" such a word shares the head ("lemon or lime
 * juice" → lemon juice, lime juice; "almond or cashew butter"; "pork or chicken sausage"; "chicken, beef, or vegetable
 * broth"); a word that is a product of the kind by itself ("feta or goat cheese", "sriracha or hot sauce", "tahini or
 * peanut butter", "tea or apple juice", "honey or maple syrup") is not listed, so those options stay as written. "_" is a
 * space ("hot_dog", "whole_wheat"); `$MEAT`, `$NUT`, `$FRUIT`, `$VEG`, `$GRAIN` stand for the source classes above.
 */
const SHARED_HEADS: Readonly<Record<string, string>> = {
  broth: "$MEAT $VEG bone miso",
  stock: "$MEAT $VEG bone",
  bouillon: "$MEAT $VEG",
  juice: "$FRUIT $VEG",
  zest: "lemon lime orange grapefruit tangerine",
  nectar: "$FRUIT",
  cider: "$FRUIT hard",
  jam: "$FRUIT",
  jelly: "$FRUIT",
  preserves: "$FRUIT",
  marmalade: "$FRUIT",
  curd: "$FRUIT",
  sorbet: "$FRUIT",
  cheese: "cottage cream goat sheep blue string farmer farmer's",
  extract: "$FRUIT vanilla almond peppermint mint maple anise",
  butter: "$NUT apple pumpkin cookie seed",
  milk: "$NUT $GRAIN coconut goat cow sheep dairy",
  oil: "$NUT olive vegetable canola coconut avocado grapeseed corn safflower",
  flour: "$GRAIN $NUT all-purpose bread cake pastry self-rising whole_wheat semolina",
  sausage: "$MEAT italian breakfast andouille chorizo kielbasa bratwurst polish",
  tenderloin: "$MEAT",
  chops: "$MEAT",
  salt: "$VEG sea kosher table seasoned truffle smoked pink himalayan flaky",
  sugar: "coconut cane palm date maple turbinado demerara caster confectioners confectioners' icing",
  vinegar: "rice wine cider apple_cider white_wine red_wine rice_wine balsamic sherry malt champagne distilled coconut",
  tomatoes: "cherry grape plum roma heirloom beefsteak vine campari",
  buns: "hamburger burger hot_dog hotdog slider hoagie sub brioche dinner sandwich potato kaiser",
  rolls: "hamburger burger hot_dog hotdog slider hoagie sub brioche dinner sandwich potato kaiser hawaiian crescent",
  nuts: "$NUT",
  seeds: "$NUT caraway fennel cumin coriander mustard nigella",
  noodles: "$GRAIN egg glass udon soba",
  powder: "$VEG curry cocoa baking mustard",
  paste: "$VEG curry",
  sauce: "$FRUIT soy fish tomato barbecue bbq pizza pasta",
  rice: "jasmine basmati arborio sushi",
  beans: "kidney pinto navy cannellini lima garbanzo great_northern refried",
  bread: "wheat whole_wheat rye sourdough multigrain french italian pita",
  yogurt: "$FRUIT greek coconut soy vanilla goat sheep",
  greens: "collard mustard turnip beet salad",
  tortillas: "corn flour",
  scallops: "sea bay",
  seasoning: "taco cajun creole poultry steak fajita",
  potatoes: "russet yukon_gold new fingerling baking",
  // semantic-v2 round 2: more product heads by their source classes
  syrup: "$FRUIT date fig maple corn simple agave golden brown_rice rice malt",
  chips: "chocolate butterscotch peanut_butter white caramel cinnamon mint toffee carob potato tortilla corn pita bagel kale veggie banana apple coconut plantain sweet_potato",
  squash: "acorn butternut delicata kabocha spaghetti summer winter yellow pattypan hubbard buttercup calabaza",
  honey: "clover wildflower orange_blossom manuka buckwheat acacia raw local hot lavender tupelo sage alfalfa",
  tea: "chamomile mint peppermint spearmint green black herbal jasmine earl_grey oolong white rooibos hibiscus ginger lemon chai matcha fruit",
  ham: "black_forest honey smoked country virginia spiral deli maple baked cooked",
  bacon: "$MEAT canadian applewood hickory maple thick-cut center-cut peppered",
  wine: "$FRUIT $GRAIN rose dessert cooking table palm",
  pudding: "vanilla chocolate butterscotch banana rice tapioca bread coconut pistachio lemon",
  chutney: "$FRUIT $VEG",
  pasta: "$VEG egg whole_wheat semolina rice gluten-free",
  fettuccine: "$VEG egg whole_wheat semolina",
  linguine: "$VEG egg whole_wheat",
  spaghetti: "$VEG whole_wheat",
  ravioli: "$VEG $MEAT cheese mushroom",
  tortellini: "$VEG $MEAT cheese",
  chorizo: "mexican spanish pork beef chicken soy",
  water: "lavender rose orange_blossom coconut tonic soda sparkling mineral spring",
  soda: "$FRUIT cream root lemon-lime club",
  cream: "vanilla chocolate strawberry coffee mint pistachio coconut",
  burgers: "$MEAT veggie bean black_bean",
  patties: "$MEAT veggie bean",
  meatballs: "$MEAT",
  dumplings: "$MEAT $VEG",
  soup: "$MEAT $VEG",
  salsa: "$FRUIT $VEG",
  pie: "$FRUIT $MEAT",
  muffins: "$FRUIT bran corn",
  cookies: "$NUT oatmeal chocolate sugar",
  tortilla: "corn flour wheat whole_wheat",
  wraps: "$VEG spinach tomato whole_wheat",
  steak: "$MEAT flank skirt hanger flat_iron strip sirloin round cube minute tri-tip porterhouse t-bone",
};
/**
 * PART HEADS: nouns that name a part or cut taken from a food ("broccoli or cauliflower florets", "salmon or cod
 * fillets", "walnut or pecan halves", "mango or pineapple chunks"). No single food word is a product of such a head's
 * kind by itself, so a one-word earlier option always shares it (CONTRACT §12.7 b).
 */
export const PART_HEADS = setOf(
  "halves pieces chunks bits florets fillets filets slices wedges rings spears tips strips cubes segments kernels leaves sprigs stalks ribs hearts " +
    "crumbs flakes shavings nibs shoots sprouts puree purée seeds",
);
const SOURCE_CLASSES: Readonly<Record<string, string>> = { $MEAT: MEAT_SOURCES, $NUT: NUT_SEED_SOURCES, $FRUIT: FRUIT_SOURCES, $VEG: VEGETABLE_SOURCES, $GRAIN: GRAIN_SOURCES };
export const SHARED_HEAD_MODIFIERS: Readonly<Record<string, ReadonlySet<string>>> = Object.fromEntries(
  Object.entries(SHARED_HEADS).flatMap(([head, mods]) => {
    // ("hot_dog": a two-word source, written with a space in a line)
    const expanded = words(mods).flatMap((w) => (SOURCE_CLASSES[w] !== undefined ? words(SOURCE_CLASSES[w]) : [w]));
    const set = new Set(expanded.map((w) => w.replace(/_/g, " ")));
    const singular = head.endsWith("es") && head !== "tomatoes" && head !== "potatoes" ? head.slice(0, -1) : head.endsWith("s") ? head.slice(0, -1) : `${head}s`;
    const forms = head === "tomatoes" || head === "potatoes" ? [head, head.slice(0, -2)] : [head, singular];
    return forms.map((f) => [f, set] as const);
  }),
);

/**
 * COMPOUND MODIFIERS: two-word modifiers written before a head ("whole wheat flour", "white wine vinegar", "apple cider
 * vinegar", "hot dog buns", "Yukon Gold potatoes", "extra virgin olive oil"), so a choice "white or whole wheat flour"
 * shares only the head "flour". Every two-word source above, and the usual compound modifiers of product names.
 */
export const COMPOUND_MODIFIERS: ReadonlySet<string> = new Set([
  ...Object.values(SHARED_HEADS).flatMap((m) => words(m).filter((w) => w.includes("_")).map((w) => w.replace(/_/g, " "))),
  "whole wheat", "whole grain", "all purpose", "extra virgin", "stone ground", "self rising", "white wine", "red wine", "rice wine",
]);

/**
 * FIXED "AND" COMPOUNDS (CONTRACT §7.6, §12.A A4): names of one food or flavour written with "and" — a closed list of
 * dish, product and flavour names, matched as whole word sequences.
 */
export const AND_COMPOUNDS: readonly string[] = [
  "salt and pepper", "half and half", "macaroni and cheese", "mac and cheese", "sweet and sour", "hot and sour", "sweet and spicy", "oil and vinegar",
  "pork and beans", "franks and beans", "beans and franks", "peanut butter and jelly", "cookies and cream", "peaches and cream", "surf and turf",
  "fish and chips", "bangers and mash", "bread and butter", "salt and vinegar", "sour cream and onion", "spinach and artichoke", "chicken and dumplings",
  "biscuits and gravy", "corned beef and cabbage", "liver and onions", "pb and j", "pigs in a blanket", "sweet and salty", "salt and pepper seasoning",
  // a mixed product sold under one name (debatable in §12.A A4; read as the product)
  "peas and carrots",
];
/** Product heads whose name may open with a flavour pair ("salt and vinegar potato chips", "garlic and herb seasoning"). */
export const FLAVOUR_HEADS = setOf(
  "sauce sauces dressing dip dips soup soups chips crisps seasoning rub marinade mix blend spread glaze sausage sausages crackers cereal granola bars " +
    "yogurt bread paste",
);

/**
 * Category nouns (CONTRACT §12.7 f): "X, A or B" with X one of these lists kinds of X ("nuts, pecans or walnuts",
 * "cheese, cheddar or Swiss", "greens, spinach or kale") — the options are A and B, not X.
 */
export const CATEGORY_NOUNS = setOf(
  "nuts nut cheese cheeses greens herbs herb berries beans mushrooms fish seafood meat beef pork lamb veal protein vegetables veggies fruit fruits liquor spirits " +
    "sweetener sweeteners cereal grains lettuce squash citrus chiles chilies chillies peppers pasta noodles wine",
);

/**
 * Leading words a choice shares forward (CONTRACT §12.7 c: product-form, variety or preparation words): "ground beef or
 * turkey" → ground beef, ground turkey; "dried oregano or thyme"; "chopped parsley or cilantro"; "shredded cheddar or
 * Monterey Jack".
 */
export const LEADING_SHARE_WORDS = setOf(
  "ground dried fresh frozen smoked low-sodium reduced-sodium unsalted salted sweetened unsweetened lean extra-lean boneless skinless organic " +
    "chopped minced diced sliced shredded grated crushed cubed toasted roasted canned jarred",
);

/**
 * Nouns whose plural is the same word (zero plural: "12 shrimp", "4 salmon"). A count before them is a count,
 * not a number inside a name. A linguistic list (fish, shellfish and game names with zero plurals), general.
 */
export const INVARIANT_PLURALS = setOf(
  "shrimp fish salmon trout cod tuna squid sheep deer halibut tilapia moose bison prawn scampi haddock pollock venison " +
    // semantic-v2: Italian plurals used as English plurals, and star anise (counted as it is)
    "zucchini broccolini panini biscotti cannoli anise " +
    // zero plurals of foods counted as they are ("4 baby bok choy", "6 bratwurst", "2 naan", "4 quail", "2 snapper")
    "choy choi bratwurst naan roti paratha chapati kohlrabi quail grouse venison elk mackerel snapper grouper bass seabass perch pike carp " +
    "branzino bream sole flounder mahi monkfish swordfish sturgeon sablefish whiting pollock catfish walleye herring sardine anchovy " +
    "edamame sushi sashimi squash porcini mantou bao bocconcini ciliegine perline " +
    // more zero and foreign plurals counted as they are ("4 pepperoncini", "2 kiwifruit", "4 whole allspice", "8 shiitake", "6 pierogi")
    "kiwifruit grapefruit jackfruit breadfruit starfruit dragonfruit passionfruit pepperoncini peperoncini allspice okra shiitake enoki maitake " +
    "shimeji pierogi gyoza crawfish crayfish whitefish shellfish lionfish pheasant partridge cardamom " +
    // fixed dish names counted as they are ("2 corn on the cob", "2 pan dulce")
    "cob dulce bagnat " +
    // "fruit" is its own plural in two-word fruit names ("3 passion fruit", "2 dragon fruit", "2 star fruit")
    "fruit",
);

/**
 * Nouns whose SIZE a size word grades inside a product name ("small curd cottage cheese", "large flake oats", "small
 * pearl tapioca", "jumbo lump crab"): a size word right before one of them stays in the name (CONTRACT §12.10 keeps
 * material qualifiers); any other size word after a weight or volume is a note ("1 lb large shrimp").
 */
export const SIZE_GRADED_NOUNS = setOf(
  "curd curds flake flakes pearl pearls lump lumps grain grains crystal crystals shell shells couscous gem " +
    // a heat or grade, not a size (§12.10 "medium salsa")
    "salsa curry chili chile enchilada",
);

/**
 * Foods measured by the length cut from them ("1 inch ginger", "2 inch turmeric"): with no hyphen and no counted unit
 * after it, an inch before one of them is the amount (an imprecise unit), not the size of one item ("12 inch pizza crust").
 */
export const LENGTH_MEASURED_FOODS = setOf("ginger turmeric galangal horseradish lemongrass cinnamon licorice liquorice kombu");

/**
 * Components a product name counts (CONTRACT §12.9: "five spice powder", "seven grain bread", "three cheese blend",
 * "three-bean salad", "Chinese 5 spice"): after a count of two or more, one of these singular nouns makes the number
 * part of the name. Any other singular noun after a count is not read this way ("2 chicken breast" is a count).
 */
export const COUNTED_COMPONENT_NOUNS = setOf("spice grain cheese bean berry seed nut herb fruit vegetable veggie pepper mushroom citrus meat layer flavor flavour color colour");

/** Parts of a fruit named before "of" ("Juice of 2 limes", "Zest of ½ orange"): the fruit is counted, the part is the note. */
export const FRUIT_PART_WORDS = setOf("juice zest rind peel grated finely freshly squeezed and");

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
/**
 * Imperative verbs that also open food names ("Brown sugar", "Roast chicken", "Top sirloin", "Toast", "Cool Whip"): a line
 * opening with one is an instruction only when a determiner, preposition or adverb follows it at once in the first
 * comma segment ("Brown the beef", "Roast for 20 minutes", "Top with cheese", "Cool completely"), or a lone verb ends
 * with "!" ("Enjoy!") — semantic-v2 (R1 L2).
 */
export const FOOD_NAME_VERBS = setOf("brown roast grill cool store top toast sear steam braise crack shake taste enjoy broil poach char flip rest stuff pipe");
/** Words right after such a verb that make the line a sentence. */
export const IMPERATIVE_CUES = setOf("the a an all with in into onto over under for until on at to from completely thoroughly well briefly gently lightly immediately again it them each both half remaining slightly");
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
    "sodium potassium calcium iron fat fats saturated unsaturated monounsaturated polyunsaturated trans sugars added total dietary net per serving " +
    // semantic-v2 (CONTRACT §12.8): the rest of a nutrition panel's vocabulary — vitamins, minerals, caffeine, daily value
    "vitamin vitamins mineral minerals magnesium zinc phosphorus selenium copper manganese iodine chromium molybdenum chloride fluoride " +
    "folate folic acid niacin riboflavin thiamin thiamine biotin pantothenic choline caffeine omega-3 omega-6 daily value dv amount " +
    // abbreviations and spelling variants of a nutrition panel ("Sat. fat", "Carb", "Prot", "Chol", "Sugar alcohols", "Fibre")
    "sat satfat sat-fat carb prot chol cholest sod fibres fibers alcohols polyols mono poly monounsat polyunsat unsat kcals cal cals " +
    "saturates monounsaturates polyunsaturates which kilocalories kilocalorie fatty acid acids trans-fat",
);
/**
 * Words that name a nutrient AND a food bought by weight in UK recipes ("Sugar 10g", "Glucose 50g", "Starch 10 g"): a
 * line made of one of them and only a mass in g/mg is uncertain (CONTRACT §12.8) — a person checks.
 */
export const NUTRIENT_FOOD_WORDS = setOf("sugar sugars salt glucose fructose lactose sucrose maltose dextrose starch alcohol");
/**
 * Units of a nutrition value ("250 kcal", "10 g", "200 mg", "15%"), abbreviated or spelled out ("20 grams", "300
 * milligrams", "2 micrograms"). Written after a nutrient label only; never read as food units here.
 */
export const FACT_UNITS = setOf(
  "g gs gram grams mg mgs milligram milligrams mcg µg ug microgram micrograms kcal kcals cal cals calories calorie kilocalorie kilocalories " +
    "kj kilojoule kilojoules iu % dv",
);
/** Words of a diet-points label ("WW Points: 4", "SmartPoints: 7", "Weight Watchers points: 5"); the value is a bare number. */
export const DIET_POINT_WORDS = setOf("points point smartpoints pointsplus ww weight watchers freestyle personal myww smart plus value values blue green purple");
export const DIET_POINT_HEADS = setOf("points point smartpoints pointsplus");
/**
 * Rating and vote vocabulary ("4.8 stars (120 reviews)", "5 from 3 votes", "Rated 4.5 out of 5"). A line made only of
 * these words and numbers is a rating, never food; "2 star anise" names a food, so the singular "star" alone is not
 * enough (a RATING_HEADS word must appear).
 */
export const RATING_WORDS = setOf("stars star votes vote ratings rating reviews review rated from out of based on average by users user people readers");
export const RATING_HEADS = setOf("stars votes ratings reviews rated rating");
/**
 * Labels of a recipe-time line ("Prep 10 mins", "Cook 20 mins", "Total 30 mins", "Active time: 30 min"): with only
 * these words, imperative verbs and time amounts, a line states a time, never food.
 */
export const TIME_LABEL_WORDS = setOf(
  "prep preparation cook cooking total active inactive hands-on passive ready rest resting chill chilling bake baking rise rising proof proofing " +
    "marinate marinating freeze freezing soak soaking setting cool cooling time times in for about approximately approx and plus or to up at least overnight wait " +
    "pressure slow high low",
);
/** Recipe-card metadata labels before a colon ("Course: dinner", "Cuisine: Italian", "Keyword: …"): the value is never food. */
export const META_LABEL_WORDS = setOf("course courses cuisine cuisines keyword keywords author authors diet diets category categories difficulty level skill tags tag occasion occasions season cost");
/**
 * Page furniture around a recipe card ("Print recipe", "Jump to recipe", "Watch the video below", "Nutrition Facts",
 * "Advertisement"): a line with no number made only of PAGE_WORDS, at least one of them a PAGE_KEYWORDS word.
 */
export const PAGE_WORDS = setOf(
  "print jump skip to the a an this our my your recipe recipes see below above card watch video videos nutrition facts fact information info " +
    "instructions instruction directions method notes note advertisement advertisements ad ads sponsored share pin save rate comment comments review " +
    "reviews tips tip faq faqs here click tap scroll continue reading read more back top full post page shopping list add get follow us and for of " +
    "on in it with how make amount per serving servings information " +
    // semantic-v2 (R1 L2): recipe-card controls and prompts ("Cook Mode", "Save to Recipe Box", "Hide Images", "No reviews yet")
    "mode box content get hide show images image photos photo steps step mark complete did you yet no keep screen awake tried subscribe newsletter " +
    "email cart cook or as made friendly version printable pinterest facebook twitter instagram whatsapp yummly flipboard tiktok youtube " +
    "less view views related posts post recipes newsletter sign up login log account bookmark bookmarked saved collections",
);
export const PAGE_KEYWORDS = setOf(
  "print jump skip card watch video videos nutrition facts instructions directions method notes advertisement advertisements sponsored share pin save " +
    "rate comments reviews tips faq faqs click tap scroll continue amount mode hide show images subscribe newsletter tried did get read screen awake " +
    "pinterest facebook twitter instagram whatsapp yummly version related",
);
/** Credit lines ("Recipe adapted from …", "Adapted from …", "Recipe by …", "Photo by …"), as opening word sequences. */
export const CREDIT_OPENERS: readonly (readonly string[])[] = [
  ["recipe", "adapted"], ["adapted", "from"], ["adapted", "by"], ["recipe", "by"], ["recipe", "from"], ["recipe", "courtesy"], ["courtesy", "of"],
  ["photo", "by"], ["photos", "by"], ["photography", "by"], ["inspired", "by"], ["recipe", "source"], ["recipe", "credit"],
];
/**
 * EQUIPMENT (semantic-v2, CONTRACT §12.8 non-food items): kitchen TOOLS are nouns that name an implement, a vessel or a
 * wrapping that is never eaten — pans, dishes, plates, pots, ovens, cookers, skillets, woks, racks of the oven, moulds,
 * ramekins, liners, foil, twine, wrap, towels, mitts, scales, slicers, peelers, blenders, thermometers… With such a noun
 * as the head of a line (whatever the words before it say: "1 potato masher", "1 egg slicer", "1 cast iron skillet"),
 * the line is equipment. A general English class of utensil nouns, not a list of inputs.
 */
export const EQUIPMENT_TOOL_HEADS = setOf(
  "pan pans skillet skillets wok woks saucepan saucepans stockpot stockpots pot pots oven ovens cooker cookers maker makers iron irons griddle " +
    "griddles dish dishes plate plates platter platters ramekin ramekins mold molds mould moulds tray trays board boards stone stones steel steels " +
    "mat mats liner liners parchment foil twine towel towels mitt mitts glove gloves scale scales slicer slicers peeler peelers blender blenders " +
    "processor processors thermometer thermometers grater graters zester zesters masher mashers press presses juicer juicers reamer reamers " +
    "spinner spinners scraper scrapers torch torches mallet mallets needle needles timer timers spatula spatulas whisk whisks tongs ladle ladles " +
    "sieve sieves strainer strainers colander colanders mandoline mandolines mandolin knife knives cutter cutters brush brushes pin pins grinder " +
    "grinders mill mills shaker shakers funnel funnels pestle pestles mortar mortars microplane microplanes toothpick toothpicks cheesecloth " +
    "kettle kettles baster basters spoon spoons fork forks trivet trivets dehydrator dehydrators opener openers ramekin thermometer cleaver cleavers " +
    "scissors shears tweezers grill grills smoker smokers chopsticks spiralizer spiralizers baller ballers corer corers sifter sifters squeezer " +
    "squeezers nutcracker nutcrackers skimmer skimmers silpat springform stand stands spider spiders machine machines circulator circulators",
);
/**
 * KITCHEN ACTION VERBS whose agent nouns ("-er"/"-or": slicer, crusher, pitter, separator, ricer, muddler, sharpener)
 * name a tool (`agentNounTool`). Verbs whose agent noun names a food are left out: roast, broil, fry, boil, stew, bake
 * (roaster, broiler, fryer: chickens), cream (creamer), crack (crackers), cool (wine cooler), wrap (wonton wrappers),
 * dip, fill, season.
 */
export const KITCHEN_ACTION_VERBS = setOf(
  "slice peel grate zest mash juice spin scrape time mix blend open cut pit crush separate beat rice muddle test steam smoke cook make shake grind " +
    "sift squeeze skim ball core dehydrate spiralize strain dispense sharpen warm poach toast chop dice mince whisk stir press measure scoop " +
    "pour spread strip divide knead roll seal infuse aerate baste carve scale shuck crimp stuff dredge drain chill freeze shred whip melt grill " +
    "julienne zest hull stem devein debone fillet",
);

/**
 * VESSEL HEADS (semantic-v2, CONTRACT §12.8): nouns that are equipment only in some compounds, because they also hold,
 * portion or name food ("tea bags", "puff pastry sheets", "cinnamon sticks", "rice paper", "onion rings", "lamb rack",
 * "peanut butter cups", "wonton wrappers"). Such a head is equipment when the word right before it is a material or
 * kitchen-use word (EQUIPMENT_MATERIAL_WORDS) or one of the purpose words of that head below ("piping bag", "popsicle
 * sticks", "wax paper", "tart ring", "cooling rack", "paper baking cups", "mason jars"). With any other word before it,
 * a `food` head stays food and an `unsure` head (one that holds food but is never eaten: skewers, picks, bowls, jars,
 * glasses) goes to a person; with no word, or only size and shape words, before them, BARE_EQUIPMENT_HEADS are
 * equipment ("6 skewers", "1 large bowl"). Each purpose list is a closed class of what that vessel is made for.
 */
const VESSEL_HEADS: Readonly<Record<string, [policy: "food" | "unsure", purposes: string]>> = {
  bag: ["food", "piping pastry icing decorating zip-top ziptop ziplock zip-lock ziploc resealable freezer storage sandwich snack gallon-size quart-size sandwich-size snack-size gallon quart treat oven roasting brining vacuum sous-vide trash garbage cheesecloth jelly nut-milk"],
  boat: ["food", "gravy sauce"],
  cup: ["food", "muffin cupcake baking custard souffle soufflé measuring dixie espresso shot egg tea coffee"],
  sheet: ["food", "baking cookie rimmed"],
  stick: ["food", "popsicle lollipop lolly pop craft cocktail treat"],
  wrap: ["food", "plastic cling saran beeswax"],
  wrapper: ["food", "cupcake muffin baking"],
  paper: ["food", "wax waxed parchment baking kitchen tissue butcher greaseproof cupcake muffin"],
  ring: ["food", "tart cake pastry mousse egg cookie biscuit flan crumpet muffin pancake"],
  rack: ["food", "wire cooling roasting baking oven drying steaming bacon rib dish wine spice plate pot pan egg"],
  // (semantic-v2 round 3) more heads that are food in some compounds and equipment in others ("1 tea ball", "1 fish slice",
  // "1 lobster cracker", "1 bag hickory wood chips")
  ball: ["food", "tea infuser mesh"],
  slice: ["food", "fish"],
  cracker: ["food", "lobster crab seafood shellfish shell nut walnut pecan claw"],
  chip: ["food", "wood smoking smoker hickory mesquite applewood alder oak"],
  tin: ["food", "muffin loaf cake baking tart pie roasting bundt springform cupcake patty"],
  bottle: ["food", "spray squeeze"],
  box: ["food", "cake pizza bento lunch storage cardboard"],
  container: ["food", "storage freezer"],
  scoop: ["food", "cookie cream melon portion"],
  steamer: ["food", "bamboo vegetable electric rice"],
  mixer: ["food", "stand hand handheld electric"],
  fryer: ["food", "air deep electric"],
  string: ["food", "kitchen butcher butcher's baker's cotton"],
  basket: ["food", "frying fry steamer bread wire"],
  peel: ["food", "pizza bread baking"],
  tip: ["food", "piping star round decorating icing pastry"],
  skewer: ["unsure", "kebab kabob shish long flat"],
  pick: ["unsure", "cocktail party"],
  bowl: ["unsure", "salad soup cereal dessert serving mixing"],
  jar: ["unsure", "mason canning jelly jam kilner preserving storage spice half-pint pint quart sterilized sterilised clean empty"],
  glass: ["unsure", "wine shot martini highball champagne coupe pint rocks old-fashioned collins drinking tall"],
};
const PLURAL_OF: Readonly<Record<string, string>> = { box: "boxes", glass: "glasses" };
export const EQUIPMENT_VESSEL_HEADS: Readonly<Record<string, { policy: "food" | "unsure"; purposes: ReadonlySet<string> }>> = Object.assign(
  Object.create(null),
  Object.fromEntries(
    Object.entries(VESSEL_HEADS).flatMap(([head, [policy, purposes]]) => {
      const entry = { policy, purposes: setOf(purposes) };
      return [[head, entry], [PLURAL_OF[head] ?? `${head}s`, entry]];
    }),
  ),
);
/** Vessel heads that are equipment with no modifier at all ("6 skewers", "2 bowls", "Cocktail picks"). */
export const BARE_EQUIPMENT_HEADS = setOf("skewer skewers pick picks bowl bowls");
/**
 * Materials and kitchen uses that make ANY vessel head equipment ("wooden skewers", "plastic bag", "glass jars",
 * "silicone cups", "baking sheets", "mixing bowl", "measuring cups", "kitchen string"). General classes of words.
 */
export const EQUIPMENT_MATERIAL_WORDS = setOf(
  "wooden wood bamboo metal steel stainless stainless-steel aluminum aluminium plastic paper parchment foil silicone glass ceramic cast-iron enamel " +
    "enameled enamelled nonstick non-stick copper rubber nylon disposable reusable heatproof heat-proof ovenproof oven-proof oven-safe microwave-safe " +
    "dishwasher-safe freezer-safe airtight muslin mesh fine-mesh " +
    "baking roasting mixing cutting cooling piping measuring serving storage canning preserving decorating icing kitchen",
);
/** Size and shape words of an equipment item ("1 large heavy-bottomed pot", "1 9-inch square pan"): never decide the head. */
export const EQUIPMENT_SHAPE_WORDS = setOf("deep shallow heavy heavy-bottomed heavy-duty rimmed square round oval rectangular tall wide narrow flat extra");
/** Count and package nouns before an equipment item ("1 roll kitchen twine", "1 box toothpicks", "2 sheets aluminum foil", "1 pair tongs"). */
export const EQUIPMENT_COUNT_NOUNS = setOf("roll rolls set sets pair pairs box boxes package packages pack packs packet packets bag bags sheet sheets piece pieces length lengths");
/** Words that continue an equipment line after its head ("1 piping bag fitted with a star tip", "6 jars with lids"). */
export const EQUIPMENT_CONTINUATIONS = setOf("with fitted lined greased sprayed for about to that which set placed coated brushed covered");
/** Words of a label that introduces what to have ready ("You will need:", "You'll need:", "What you'll need:"). */
export const NEED_WORDS = setOf("need needed needs require required");
/**
 * Serving-fact labels ("Serving size: 1 cup (240 ml)", "Servings: 4 people", "Yield: 2 loaves", "Makes: 1 loaf"): with
 * a number after the colon the line states a recipe fact, whatever follows. ("Per person: 200 g pasta" is not one.)
 */
export const SERVING_FACT_WORDS = setOf("serving servings size portion portions yield yields makes serves number of");
export const SERVING_FACT_HEADS = setOf("size servings serves yield yields makes portions");

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
    "extras serve serving finish finishing decorate for the and to ingredients ingredient dry wet layers components",
);

/** Words that, after an opening verb, show the line is an instruction ("Season with…", "Roll into…", "Mix all…"). */
export const INSTRUCTION_CUES = setOf("the a an all into onto with until in to for over on at together then from off each well");
export const NOTE_LABELS = setOf("note notes tip tips equipment instructions directions method step steps");
export const HEADING_WORDS = setOf("ingredients ingredient");

/** List markers removed from the start of a line (semantic-v2 adds the checkbox glyphs ▢ ☐ ◻ ❏ of recipe cards, §12.13). */
export const BULLETS = new Set(["-", "•", "·", "*", "–", "—", "‣", "◦", "▪", "▫", "■", "□", "●", "○", "►", "▸", "➤", "→", "✓", "✔", "+", "▢", "☐", "◻", "◽", "❏", "❑"]);

/**
 * REMARK SECOND-AMOUNT MARKERS (CONTRACT §12.11, §12.A A3): an amount inside a remark measures another product or a
 * substitute when the remark says what it becomes ("makes", "yields") or names a substitution ("use", "substitute",
 * "instead"), and another state of the food when it names one (dry, uncooked, cooked, soaked) that the name does not.
 * "from" alone decides nothing ("1 cup chopped onion (from 1 large onion)" restates the amount, §12.A A3).
 */
export const REMARK_SOURCE_WORDS = setOf("makes make yields yield using use substitute substituting instead replace replacing");
export const REMARK_STATE_WORDS = setOf("dry dried uncooked cooked raw");
/**
 * Parts EXTRACTED from a food (CONTRACT §12.A A3): an amount of the whole food in a remark measures the source, not the
 * part ("2 tbsp lime juice (1 lime)", "1 tbsp zest (from 2 oranges)", "1/2 cup egg whites (from 4 eggs)").
 */
export const EXTRACTED_PART_WORDS = setOf("juice juices zest zests peel peels rind rinds pulp seeds arils pith flesh whites yolks");

/**
 * Generic recipe components (CONTRACT §12.8): a line with no amount made only of these words, optionally after dish
 * words ("Cake Layers", "Pie Crust", "Pizza Dough"), is a section heading in any case ("SAUCE", "Dressing").
 */
export const GENERIC_COMPONENT_WORDS = setOf(
  "sauce sauces dressing dressings glaze topping toppings filling fillings frosting icing crust crusts dough batter marinade garnish garnishes " +
    "base layer layers assembly streusel decoration decorations",
);
export const DISH_WORDS = setOf(
  "cake cakes pie pies pizza pizzas tart tarts salad salads bread cookie cookies cupcake cupcakes cheesecake brownie brownies muffin muffins pancake " +
    "pancakes waffle waffles crepe crepes quiche galette cobbler crisp crumble bar bars loaf roll rolls bun buns biscuit biscuits scone scones dumpling " +
    "dumplings taco tacos burger burgers sandwich sandwiches soup stew pasta noodle noodles bowl bowls wrap wraps enchilada enchiladas casserole lasagna " +
    "dessert main side trifle pudding sundae shortcake focaccia flatbread pretzel pretzels donut donuts doughnut doughnuts",
);

// --- semantic-v3 (Phase 2C): the measure slot (CONTRACT §13.2) -----------------------------------------------------

/**
 * PART NOUNS (semantic-v3, CONTRACT §13.2): nouns that name a part, piece, shape, strand or dispensed portion OF a food —
 * plant parts, cut-off pieces, shapes and forms, strands, sprays — never a food by themselves. After the food they can be a
 * name's head ("saffron threads", "lemongrass stems", "corn cob", "fennel fronds"); written between a count and the food
 * ("3 stems lemongrass", "1 cob corn", "1 heel sourdough", "2 sprays cooking oil") they are an unresolved measure. A general
 * English word class (with plurals), not a list of inputs; registry units (stalk, sprig, leaf, piece…) are read before it.
 */
export const PART_NOUNS = setOf(
  // plant parts
  "stem stems stalklet stalklets frond fronds cob cobs husk husks shuck shucks blade blades needle needles spear spears floret florets tip tips " +
    "crown crowns heart hearts core cores kernel kernels hull hulls rind rinds peel peels skin skins tendril tendrils shoot shoots runner runners " +
    "pad pads " +
    // cut-off pieces and ends
    "heel heels end ends butt butts nub crust crusts shard shards sliver slivers shaving shavings shred shreds flake flakes crumb crumbs " +
    "segment segments morsel morsels bit bits lobe lobes " +
    // shapes and forms
    "disc discs disk disks cone cones coin coins round rounds cylinder cylinders ribbon ribbons curl curls nest nests " +
    "square squares triangle triangles slab slabs block-shaped " +
    // strands
    "thread threads strand strands filament filaments fiber fibers fibre fibres " +
    // dispensed portions
    "spray sprays mist mists pump pumps spritz squirt squirts dropper droppers dropperful",
);

/**
 * SHAPE FOODS (semantic-v3, CONTRACT §13.2): food nouns that also name a shape or a grain OF another food ("1 cake tofu",
 * "1 grain rice"). Only in the measure slot (they stay food heads: "rice cakes", "griddle cakes").
 */
export const SHAPE_FOOD_NOUNS = setOf("cake cakes grain grains");

/**
 * CUT WORDS (semantic-v3): part nouns that also name a cut of meat before its head ("blade steak", "crown roast", "heel of
 * round", "tip roast"): a modifier only before a meat, poultry or fish head; before any other food they are a measure.
 */
export const CUT_PART_WORDS = setOf("blade blades heel heels crown crowns tip tips heart hearts end ends butt butts round rounds");

/**
 * APPLIANCES (semantic-v3, CONTRACT §13.2): kitchen machines and fixed cooking places — they say how or where a food is
 * made or kept ("icebox cake", "toaster waffles", "oven fries", "fridge pickles") and never hold a measured amount, so they
 * are modifiers before a food. A vessel or utensil that holds food (saucepan, wok, colander, sieve, skillet, pot) is a
 * measure in the same place ("1 saucepan water"). A general class of nouns.
 */
export const APPLIANCE_WORDS = setOf(
  "oven ovens toaster toasters griddle griddles grill grills icebox iceboxes fridge fridges refrigerator refrigerators freezer freezers " +
    "microwave microwaves broiler broilers stovetop stovetops stove stoves campfire campfires hearth smoker smokers rotisserie",
);

/**
 * BOTTLE SIZES (semantic-v3, CONTRACT §13.2): the trade names of drink-bottle sizes ("1 split prosecco", "1 magnum rosé",
 * "1 fifth vodka"): before a drink they count bottles of an unstated size — an unresolved measure, never a registry unit.
 */
export const BOTTLE_SIZE_WORDS = setOf(
  "split splits magnum magnums jeroboam jeroboams rehoboam methuselah salmanazar balthazar nebuchadnezzar fifth fifths nip nips pony ponies " +
    "piccolo piccolos half-bottle half-bottles tallboy tallboys crowler crowlers growler growlers miniature miniatures mini minis",
);

/** Romance joiners after a noun that heads a dish name ("pots de crème", "pan de bono", "eggs en cocotte", "pot au feu"). */
export const ROMANCE_JOINERS = setOf("de du des d' en au aux à la al alla all' alle di del della dei con");

/**
 * PACKAGING NOUNS (semantic-v3, CONTRACT §13.1–§13.2): containers a food is sold in that the registry does not declare
 * (beside the contract's NOT_ALIASES: tub, pot, bar, punnet). After a weight or volume and before the food ("8 oz tub
 * whipped topping", "200 g pouch tuna") the size is the container's, not an amount of the food — an unresolved measure.
 */
export const PACKAGING_NOUNS = setOf(
  "pouch pouches canister canisters clamshell clamshells sachet sachets tray trays crate crates sack sacks net nets sleeve sleeves jug jugs " +
    "bucket buckets pail pails keg kegs tetra tetrapak tetra-pak brick bricks cartridge cartridges capsule capsules case cases",
);

/**
 * COOKING VESSELS NAMED IN ONE OR TWO WORDS (semantic-v3, CONTRACT §13.2): pots and pans whose name is a compound or a
 * trade name ("dutch oven", "slow cooker", "crockpot", "sheet pan", "stock pot"). In the measure slot they are an
 * unresolved measure ("1 dutch oven stew", "1 crockpot chili"), like any holding vessel.
 */
export const VESSEL_COMPOUNDS = setOf("dutch-oven slow-cooker pressure-cooker rice-cooker instant-pot crock-pot crockpot crockpots sheet-pan roasting-pan stock-pot stockpot frying-pan saute-pan sauté-pan cast-iron baking-dish casserole-dish pie-dish pie-plate loaf-pan cake-pan tart-pan");

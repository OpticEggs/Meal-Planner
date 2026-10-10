/**
 * semantic-v2 · RECOGNISED FOOD (PHASE-2B-PLAN §6.1, Decision 1; the owner's binding rules for round 2) and the other
 * candidate-review R1 round-2 items (CONTRACT §12.A A5, A6; H8′; the listed regressions).
 *
 * On a counted line (a bare count, a count unit or an imprecise unit) the reading is `ready` only when the name's head is a
 * recognised food and every word before it is recognised. Otherwise a person checks: `needs_review`, never `unsupported`,
 * with no quantity, unit or package, and the text after the number kept as the name pre-fill. Mass and volume lines are
 * unchanged. A known food after an unresolved measure word never inherits a count. Valid foods named with equipment or
 * measure words are never `unsupported`. Unknown words in these tests are invented ("zorble"), so they stay unknown.
 *
 * Round 3 (R1 round-3 review): the word right after a count is a measure when it is a measure gerund ("helping"), a
 * vessel ("pot", "kettle", "casserole dish") or a food-or-measure word ("square", "bouquet", "spritz", "sip") unless a
 * compound food follows; on a Title Case line capitals carry no brand signal; a capitalised plural opening the name is not a
 * variety; equipment homographs (mixer, wrap, egg, cracker, chips, ring, rack, ball, cup, slice…) need a compound or a
 * drink word / food container; a trailing multiplier gets the same measure check. The plain and overlap data carry
 * expected fields (data/*.jsonl), so a measure read into the name with a count is caught.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { equipmentNamesFood, equipmentPhrase } from "../../src/ingredient/semantic-v3/classify";
import { compoundFoodEnding, foodWord, measureGerund, recognisedFoodHead, recognisedFoodNoun } from "../../src/ingredient/semantic-v3/foods";
import { lex } from "../../src/ingredient/semantic-v3/lexer";
import { core, read } from "./helpers";

const toks = (s: string) => lex(s).tokens;
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
/** A data row: a valid food line written by the implementation worker, and its expected reading (CONTRACT §12.14 included). */
interface DataRow { line: string; status: string; name: string | null; quantity: string | null; unit: string | null }
const dataRows = (file: string): DataRow[] => readFileSync(path.join(DATA, file), "utf8").split("\n").filter((l) => l.trim().length > 0).map((l) => JSON.parse(l) as DataRow);
const qText = (q: ParsedIngredientV1["quantity"]): string | null => (q === null ? null : q.kind === "exact" ? (q.denominator === "1" ? q.numerator : `${q.numerator}/${q.denominator}`) : "range");

/** A safe abstention: a person checks, and no amount, unit, package, equivalent or choice is carried. */
function expectAbstention(r: ParsedIngredientV1) {
  expect(r).toMatchObject({ status: "needs_review", quantity: null, unit: null, packageSize: null, equivalents: [], alternatives: [] });
}
/** The line went to review only because its food (or a word before it) was not recognised. */
const recognitionAbstention = (r: ParsedIngredientV1) => r.status === "needs_review" && r.reasons.includes("unclassified") && r.quantity === null && r.unit === null && !r.reasons.includes("unit_unknown");

describe("recognisedFoodHead (named safeguard): the head is a food and every word before it is recognised", () => {
  it.each([
    "chicken thighs", "boneless skinless chicken thighs", "baby back ribs", "Granny Smith apples", "leg of lamb", "three cheese pizzas", "San Marzano tomatoes",
    "Thai bird chilies", "globe eggplant", "silken tofu", "fingerling potatoes", "haricots verts", "spiral ham", "top round roast", "saltines", "Rice Krispies",
    "penne rigate", "premade pizza crust", "street taco tortillas", "burrito-size tortillas", "petite diced tomatoes", "sun-dried tomatoes", "jalapeño poppers",
    "M&Ms", "Kraft Singles", "extra-virgin olive oil", "2% milk", "very ripe plantains", "pig's trotters", "prosciutto di Parma", "5-minute rice",
    "slice-and-bake cookies", "pinch-pleated dumplings", "griddle cakes", "toaster waffles", "boiler onions", "crusty rolls", "whey protein isolate",
    "barista oat milk", "straw mushrooms", "fiddlehead ferns", "mug cakes", "pan rolls", "cocktail mixer", "onion rings", "cinnamon sticks", "80/20 ground beef", "oysters on the half shell", "chicken breast w/ skin", "hearts of palm",
    "tea bags", "wonton cups", "bread bowls", "chicken pot pie", "short plate", "Italian grinders", "jello mold", "Egg Beaters", "veggie tray", "chashu pork",
  ])("%s → recognised", (name) => {
    expect(recognisedFoodHead(name)).toBe(true);
  });

  it.each([
    // unknown heads: equipment, measures, invented words
    "comal", "dough hook", "cocktail umbrellas", "popcorn popper", "apron", "xyzzy", "zorbles", "burrito bowl", "mixing bowls", "piping tips",
    // a known head after an unknown lower-case word
    "zorble chicken thighs", "tot dark rum", "twig rosemary", "glugs olive oil",
    // a unit or measure word is not a proper name, even capitalised ("2 BUNCH black beans")
    "BUNCH black beans", "Bunch black beans", "SPRIG chicken thighs",
    // a food noun, then an adjective that only stands before a noun: a measure ("1 cake fresh yeast")
    "cake fresh yeast", "swirl heavy cream", "bar dark chocolate", "drop boneless chicken thighs",
    // a portion head with no food before it; a portion head that is also an equipment head, outside a compound name
    "tidbits", "slab", "egg cup", "tea ball", "crumpet ring", "bacon rack", "banana hanger",
    // equipment homographs: a mixer without a drink word, a brand before a wrap, a capitalised plural opening the name
    "Sunbeam mixer", "mixer", "Glad wrap", "Reynolds Wrap", "Sips dark rum",
    // a vessel word before a singular food (after a count of one it is a measure: "1 pot chili")
    "pot chili", "shaker salt",
  ])("%s → not recognised", (name) => {
    expect(recognisedFoodHead(name)).toBe(false);
  });

  it("a capitalised word is accepted as a proper name or brand before a food head, a lower-case unknown word is not", () => {
    expect(recognisedFoodHead("Zorble chicken thighs")).toBe(true);
    expect(recognisedFoodHead("zorble chicken thighs")).toBe(false);
  });

  it("a portion head counts after a food (recognisedFoodHead), but only a food head overrides equipment (recognisedFoodNoun)", () => {
    for (const n of ["pineapple tidbits", "pork belly slab", "chicken fingers", "egg noodle nest", "applesauce cups", "banana boats"]) expect(recognisedFoodHead(n), n).toBe(true);
    for (const n of ["popsicle sticks", "tart ring", "pizza peel", "muffin cups", "oak chunks"]) expect(recognisedFoodHead(n) && recognisedFoodNoun(n), n).toBe(false);
    for (const n of ["short plate", "Italian grinders", "jello mold", "chicken thighs"]) expect(recognisedFoodNoun(n), n).toBe(true);
  });

  it("food words that are also equipment heads are not foods by themselves", () => {
    for (const w of ["sheet", "pan", "pot", "rack", "ring", "stick", "tray", "board", "grinder", "skewer", "bowl", "steamer", "fryer", "mixer", "joe", "hanger", "wood", "chunks", "pieces"]) expect(foodWord(w), w).toBe(false);
    for (const w of ["wrap", "crackers", "cheese", "tortillas", "chips", "egg"]) expect(foodWord(w), w).toBe(true);
    expect(compoundFoodEnding(["chicken", "pot", "pie"])).toBe(true);
    expect(compoundFoodEnding(["pineapple", "tidbits"])).toBe(true); // a hyphenated lexicon entry ("pineapple-tidbits") written with a space
  });
});

describe("a counted line whose food is not recognised: needs_review, no amount, the text after the number kept (Decision 1, owner rule 1)", () => {
  it.each([
    ["1 comal", "comal"], ["1 xyzzy", "xyzzy"], ["2 blorps", "blorps"], ["3 zorbleberry chicken thighs", "zorbleberry chicken thighs"],
    // the unit or measure word that is no longer read stays in the pre-fill: nothing is trimmed to known words
    ["4 slices zorble pork", "slices zorble pork"], ["1 bag zorble mix", "bag zorble mix"], ["2 large zorbles, seasoned", "large zorbles"],
    ["1 (4 oz) bar zorble", "bar zorble"], ["2 pinch zorble", "pinch zorble"],
  ])("%s → needs_review, name pre-fill %j", (line, name) => {
    const r = read(line);
    expectAbstention(r);
    expect(r.name).toBe(name);
    expect(r.reasons).toContain("unclassified");
    expect(r.raw).toBe(line);
    expect(r.normalized).toBe(line);
  });

  it("a remark after a comma and a package size no longer read stay in the note", () => {
    expect(read("2 large zorbles, seasoned").note).toBe("seasoned");
    expect(read("1 (4 oz) bar zorble").note).toBe("4 oz");
    expect(read("2 (15 oz) cans zorbles").note).toContain("15 oz");
  });

  it("never unsupported, never dropped: an unrecognised head is not a non-ingredient shape", () => {
    for (const line of ["1 zorble", "6 zorbles", "1 bunch zorble", "Zorble", "Zorble, to taste", "2 Zorble Blorps", "1 jar zorble paste", "1 lb zorble"]) {
      const r = read(line);
      expect(r.status, line).not.toBe("unsupported");
      expect(r.name, line).not.toBeNull();
    }
  });

  it("a mass or volume line keeps today's reading", () => {
    expect(core(read("2 cups zorbleberries"))).toEqual({ status: "ready", name: "zorbleberries", quantity: "2", unit: "cup" });
    expect(core(read("200 g zorble"))).toEqual({ status: "ready", name: "zorble", quantity: "200", unit: "g" });
  });

  it("negative controls: recognised counted foods stay ready with their amount", () => {
    expect(core(read("4 slices chashu pork"))).toEqual({ status: "ready", name: "chashu pork", quantity: "4", unit: "slice" });
    expect(core(read("6 Thai bird chilies"))).toEqual({ status: "ready", name: "Thai bird chilies", quantity: "6", unit: "each" });
    expect(core(read("1 block silken tofu"))).toEqual({ status: "ready", name: "silken tofu", quantity: "1", unit: "block" });
    expect(core(read("1 box Rice Krispies"))).toEqual({ status: "ready", name: "Rice Krispies", quantity: "1", unit: "box" });
  });
});

describe("a known food after an unresolved measure word never inherits a count (owner rule 2)", () => {
  it.each(["1 tot dark rum", "2 squirts lemon juice", "1 twig rosemary", "1 cake fresh yeast", "1 bar cream cheese", "1 pouch tuna", "1 canister oats", "1 tablet Mexican chocolate", "1 growler IPA"])(
    "%s → needs_review, no quantity or unit",
    (line) => {
      expectAbstention(read(line));
    },
  );

  it("negative controls: a cut or compound named with a measure word is food", () => {
    expect(core(read("1 rack of ribs"))).toEqual({ status: "ready", name: "rack of ribs", quantity: "1", unit: "each" });
    expect(core(read("1 eye of round roast"))).toEqual({ status: "ready", name: "eye of round roast", quantity: "1", unit: "each" });
    expect(core(read("2 hearts of romaine"))).toEqual({ status: "ready", name: "hearts of romaine", quantity: "2", unit: "each" });
    expect(core(read("1 crown roast of pork"))).toEqual({ status: "ready", name: "crown roast of pork", quantity: "1", unit: "each" });
    expect(core(read("1 spoon bread"))).toEqual({ status: "ready", name: "spoon bread", quantity: "1", unit: "each" });
  });
});

describe("equipment and food that share a word (owner rule 3)", () => {
  it.each(["2 pepper grinders", "6 popsicle sticks", "1 tart ring", "1 pizza peel", "1 egg beater", "1 stand mixer", "12 muffin cups", "1 baking tray", "1 cutting board", "1 gravy boat", "2 mixing bowls"])(
    "%s → unsupported (known equipment)",
    (line) => {
      expect(read(line).status).toBe("unsupported");
    },
  );

  it.each([
    ["1 lb short plate", "short plate"], ["4 Italian grinders", "Italian grinders"], ["1 jello mold", "jello mold"], ["1 charcuterie board", "charcuterie board"],
    ["1 bottle margarita mixer", "margarita mixer"], ["1 carton Egg Beaters", "Egg Beaters"], ["1 veggie tray", "veggie tray"], ["6 applesauce cups", "applesauce cups"],
    ["2 banana boats", "banana boats"],
  ])("%s → ready, a food", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it("a serving piece after a food word, or a sure equipment shape whose words name a generic food, goes to a person", () => {
    for (const line of ["1 cookie tray", "1 cheese board"]) expectAbstention(read(line));
    expect(equipmentPhrase(toks("2 pepper grinders"))).toBe(true);
    expect(equipmentNamesFood(toks("1 lb short plate"))).toBe(true);
    expect(equipmentPhrase(toks("1 lb short plate"))).toBe(false);
  });
});

describe("the plain and overlap data: expected readings, never unsupported, rarely sent to a person for an unrecognised food", () => {
  for (const [file, maxShare] of [["plain-food-lines.jsonl", 0.005], ["overlap-food-lines.jsonl", 0.03]] as const) {
    it(`${file}: every line reads as expected (status, name, quantity, unit); 0 unsupported; recognition reviews at most ${maxShare * 100}%`, () => {
      const rows = dataRows(file);
      expect(rows.length).toBeGreaterThan(250);
      const wrong: string[] = [];
      let unrecognised = 0;
      for (const row of rows) {
        const r = read(row.line);
        const got = { status: r.status, name: r.name, quantity: qText(r.quantity), unit: r.unit?.canonical ?? null };
        if (JSON.stringify(got) !== JSON.stringify({ status: row.status, name: row.name, quantity: row.quantity, unit: row.unit })) wrong.push(`${row.line} → ${JSON.stringify(got)}`);
        expect(r.status, row.line).not.toBe("unsupported");
        if (recognitionAbstention(r)) unrecognised++;
      }
      expect(wrong).toEqual([]);
      expect(unrecognised / rows.length).toBeLessThanOrEqual(maxShare);
    });
  }

  it("the data's expectations follow CONTRACT §12.14: a measure word after a count is never read into the name with a count", () => {
    // written independently of the engine's lexicons: measure, container and vessel nouns, and measure gerunds
    const MEASURE_NOUNS = new Set(("wheel log rack sleeve shot pat roll chunk pouch canister clamshell tablet portion serving helping square bouquet spritz sip " +
      "gulp pot pan kettle dish casserole bowl mug glass jug pitcher keg growler tray platter plate slab brick hunk thumb knuckle nub dollop glug drizzle " +
      "splosh swig slug tot nip jigger punnet crate sack case trug hank rope braid string flat side joint coating dusting sprinkling smattering bar").split(" "));
    // food names that open with such a word (compound names, or a cut named with "of") stay readable foods
    const COMPOUND_OPENERS = /^(?:\S+ (?:of|garni)\b|pot (?:roast|pie|sticker)|pan (?:pizza|dulce|bagnat|roll)|flat iron|string (?:cheese|bean)|slab pie|roll[s]?$|bar cookie|casserole$|side salad)/i;
    const bad: string[] = [];
    for (const file of ["plain-food-lines.jsonl", "overlap-food-lines.jsonl"]) {
      for (const row of dataRows(file)) {
        const m = /^\d[\d/ .]*\s+(?:(?:small|medium|large)\s+)?(\S+)\s+(.+)$/.exec(row.line);
        if (m === null || !MEASURE_NOUNS.has(m[1].toLowerCase().replace(/e?s$/, "")) && !MEASURE_NOUNS.has(m[1].toLowerCase())) continue;
        if (COMPOUND_OPENERS.test(`${m[1]} ${m[2]}`)) continue;
        // (a registry unit read as the unit is not this: "2 bars dark chocolate" → 2 block)
        if (row.quantity !== null && (row.name ?? "").toLowerCase().startsWith(m[1].toLowerCase())) bad.push(row.line);
        if (row.status === "ready" && row.unit === "each" && (row.name ?? "").toLowerCase().startsWith(m[1].toLowerCase())) bad.push(row.line);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("R1 round 2: A5, A6, H8′ and the listed regressions", () => {
  it.each([
    ["6 drop biscuits", "drop biscuits", "6"], ["12 drop cookies", "drop cookies", "12"], ["4 sprinkle donuts", "sprinkle donuts", "4"],
  ])("A5: %s → %s, %s each", (line, name, q) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit: "each" });
  });

  it("A5 negative controls: a sloppy plural of a measure stays the unit; mass and volume words are excluded", () => {
    expect(core(read("2 handful cherry tomatoes"))).toEqual({ status: "ready", name: "cherry tomatoes", quantity: "2", unit: "handful" });
    expect(core(read("2 pound ground beef"))).toMatchObject({ quantity: "2", unit: "lb" });
  });

  it("A6: a mass or volume size in brackets after the food on a container line is its package size", () => {
    const r = read("1 can tomatoes (14.5 oz, undrained)");
    expect(core(r)).toEqual({ status: "ready", name: "tomatoes", quantity: "1", unit: "can" });
    expect(r.packageSize).toMatchObject({ quantity: { numerator: "29", denominator: "2" }, unit: { canonical: "oz" } });
    expect(r.note).toBe("undrained");
    expect(read("1 jar salsa (16 oz)").packageSize).toMatchObject({ unit: { canonical: "oz" } });
  });

  it.each(["Vit. C 12 mg", "Vit. D 2mcg", "Energy 1200 kJ", "% Daily Value*", "Amount Per Serving", "Print Recipe", "Jump to Recipe", "Step 3: Add the onions"])(
    "H8′ and R1's non-ingredient lines: %s → unsupported",
    (line) => {
      expect(read(line).status).toBe("unsupported");
    },
  );

  it.each([
    ["1 leg of lamb", "leg of lamb", "1"], ["1 rack of lamb", "rack of lamb", "1"], ["2 racks of lamb", "racks of lamb", "2"], ["12 finger sandwiches", "finger sandwiches", "12"],
    ["3 stone crab claws", "stone crab claws", "3"], ["2 slab pies", "slab pies", "2"], ["1 chicken pot pie", "chicken pot pie", "1"], ["4 bread bowls", "bread bowls", "4"],
    ["4 tortilla bowls", "tortilla bowls", "4"], ["12 wonton cups", "wonton cups", "12"], ["6 lettuce cups", "lettuce cups", "6"], ["8 phyllo cups", "phyllo cups", "8"],
    ["2 rolls, split", "rolls", "2"], ["4 Italian grinders", "Italian grinders", "4"],
  ])("regression: %s → %s, %s each", (line, name, q) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit: "each" });
  });

  it("regressions: A4 modifier compounds before the 'and' rule, count designations, vanilla yogurt", () => {
    expect(core(read("2 tbsp lemon and lime juice"))).toEqual({ status: "ready", name: "lemon and lime juice", quantity: "2", unit: "tbsp" });
    expect(core(read("1 jar black bean and corn salsa"))).toEqual({ status: "ready", name: "black bean and corn salsa", quantity: "1", unit: "jar" });
    expect(read("1 lb shrimp (21-25 count)")).toMatchObject({ status: "ready", name: "shrimp", note: "21-25 count" });
    expect(read("1 cup vanilla or plain yogurt").alternatives).toEqual(["vanilla yogurt", "plain yogurt"]);
  });

  it.each([
    ["1 cup maple or corn syrup", ["maple syrup", "corn syrup"]], ["1/2 cup potato or tortilla chips", ["potato chips", "tortilla chips"]],
    ["1 butternut or acorn squash", ["butternut squash", "acorn squash"]], ["2 tbsp clover or wildflower honey", ["clover honey", "wildflower honey"]],
    ["2 cups green or black tea", ["green tea", "black tea"]], ["4 slices turkey or pork bacon", ["turkey bacon", "pork bacon"]],
    ["1 cup red or white wine", ["red wine", "white wine"]], ["1 box chocolate or vanilla pudding", ["chocolate pudding", "vanilla pudding"]],
    ["2 tbsp mango or apple chutney", ["mango chutney", "apple chutney"]], ["4 oz Spanish or Mexican chorizo", ["Spanish chorizo", "Mexican chorizo"]],
  ])("shared heads by class: %s", (line, options) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: options });
  });

  it.each([["1 #10 can tomatoes", "#10"], ["1 No. 2 1/2 can peaches", "No. 2 1/2"], ["1 (#2.5) can pumpkin", "#2.5"], ["1 large No. 10 can beans", "large; No. 10"]])(
    "can designations with fractions or size words: %s → 1 can, note %j",
    (line, note) => {
      expect(read(line)).toMatchObject({ status: "ready", quantity: { numerator: "1", denominator: "1" }, unit: { canonical: "can" }, note });
    },
  );

  it("Scant cup sugar → the unit with no amount, the measure word a note, a person checks", () => {
    expect(read("Scant cup sugar")).toMatchObject({ status: "needs_review", name: "sugar", quantity: null, unit: { canonical: "cup" }, note: "Scant" });
  });

  it("an ampersand between capitals is part of a brand word; between foods it is 'and'", () => {
    expect(core(read("1 bag M&Ms"))).toEqual({ status: "ready", name: "M&Ms", quantity: "1", unit: "bag" });
    expect(core(read("1 can A&W root beer"))).toEqual({ status: "ready", name: "A&W root beer", quantity: "1", unit: "can" });
    expect(read("2 cups strawberries & blueberries")).toMatchObject({ status: "needs_review", name: null });
  });
});

describe("R1 round 3, item 1: the word right after a count", () => {
  it.each([
    "1 helping mashed potatoes", "1 dusting cocoa powder", "1 sprinkling brown sugar", "1 smattering chopped chives", "1 scattering sesame seeds",
    "1 slathering softened butter", "1 drizzling warm honey", "1 dousing hot sauce", "1 square baking chocolate", "1 bouquet flat-leaf parsley",
    "1 spritz lime juice", "2 Sips Dark Rum", "1 Gulp Lemonade", "1 pot chili", "1 casserole dish baked ziti", "1 large pot salted water",
    "1 kettle boiling water", "1 zorbling apple", "2 squares unsweetened chocolate", "1 braid onions", "1 string chilies", "1 hand bananas",
  ])("%s → needs_review, the measure in the note, no quantity or unit", (line) => {
    const r = read(line);
    expectAbstention(r);
    expect(r.reasons).toContain("unit_unknown");
  });

  it("measureGerund: a measure noun in -ing, not a culinary-purpose word or a food", () => {
    for (const w of ["helping", "dusting", "sprinkling", "smattering", "slathering", "drizzling", "dousing", "zorbling", "helpings"]) expect(measureGerund(w), w).toBe(true);
    for (const w of ["baking", "frying", "roasting", "pickling", "eating", "dipping", "standing", "canning", "pudding", "dumpling", "stuffing", "icing", "herring", "spring", "string"]) expect(measureGerund(w), w).toBe(false);
  });

  it.each([
    ["1 pot roast", "pot roast", "1"], ["2 pot pies", "pot pies", "2"], ["1 bouquet garni", "bouquet garni", "1"], ["4 hand pies", "hand pies", "4"],
    ["2 mug cakes", "mug cakes", "2"], ["1 pan pizza", "pan pizza", "1"], ["6 baking potatoes", "baking potatoes", "6"], ["1 standing rib roast", "standing rib roast", "1"],
    ["4 Roma Tomatoes", "Roma Tomatoes", "4"], ["1 Large Egg", "Egg", "1"], ["3 passion fruit", "passion fruit", "3"],
    ["1 dragon fruit", "dragon fruit", "1"], ["2 string beans", "string beans", "2"], ["1 side of salmon", "side of salmon", "1"],
  ])("negative control, a food: %s → %s, %s each", (line, name, q) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit: "each" });
  });

  it("a Title Case line carries no brand signal; elsewhere a capitalised name before a food is a brand or variety", () => {
    expectAbstention(read("2 Zorble Apples"));
    // semantic-v3 (R1 §5 paths 2–3): with a bare count an unknown capitalised word or an "-ed" word of no known verb is an
    // unrecognised word (§13.2), never a brand or a modifier by its form; after a declared unit a brand is read
    expectAbstention(read("2 Zorble apples"));
    expectAbstention(read("2 glorped apples"));
    expect(core(read("1 can Zorble tomatoes"))).toEqual({ status: "ready", name: "Zorble tomatoes", quantity: "1", unit: "can" });
    expect(core(read("2 Hass avocados"))).toEqual({ status: "ready", name: "Hass avocados", quantity: "2", unit: "each" });
  });
});

describe("R1 round 3, items 2–3: equipment look-alikes and the trailing multiplier", () => {
  it.each([
    "1 Sunbeam mixer", "1 Kenwood Chef mixer", "1 Bosch mixer", "1 Hamilton Beach mixer", "1 Big Green Egg", "1 Kamado Joe", "1 crumpet ring", "1 bacon rack",
    "1 fish slice", "1 tea ball", "1 egg cup", "1 lobster cracker", "2 crab crackers", "1 bag hickory wood chips", "1 bag mesquite chips", "1 banana hanger",
    "1 Glad wrap", "1 box Reynolds Wrap", "4 pint jars",
  ])("%s → never a ready food with an amount", (line) => {
    const r = read(line);
    expect(r.status).not.toBe("ready");
    expect(r.quantity).toBeNull();
    expect(r.unit).toBeNull();
  });

  it("recognised equipment shapes are rejected exactly", () => {
    for (const line of ["1 crumpet ring", "1 bacon rack", "1 fish slice", "1 tea ball", "1 egg cup", "1 lobster cracker", "1 bag hickory wood chips", "4 pint jars"]) {
      expect(read(line).status, line).toBe("unsupported");
    }
  });

  it("mixer is a food with a drink word or a food container; chips, crackers and cups are foods outside their equipment purposes", () => {
    expect(core(read("1 bottle mixer"))).toEqual({ status: "ready", name: "mixer", quantity: "1", unit: "bottle" });
    expect(core(read("2 cans cocktail mixer"))).toEqual({ status: "ready", name: "cocktail mixer", quantity: "2", unit: "can" });
    expect(core(read("1 bag tortilla chips"))).toEqual({ status: "ready", name: "tortilla chips", quantity: "1", unit: "bag" });
    expect(core(read("1 bag apple chips"))).toEqual({ status: "ready", name: "apple chips", quantity: "1", unit: "bag" });
    expect(core(read("1 box Ritz crackers"))).toEqual({ status: "ready", name: "Ritz crackers", quantity: "1", unit: "box" });
    expect(core(read("4 pudding cups"))).toEqual({ status: "ready", name: "pudding cups", quantity: "4", unit: "each" });
  });

  it("a multiplier after a measure word gets the measure check (R1 item 4)", () => {
    const r = read("tots of rum x 2");
    expectAbstention(r);
    expect(r.reasons).toContain("unit_unknown");
    expect(core(read("eggs x 3"))).toEqual({ status: "ready", name: "eggs", quantity: "3", unit: "each" });
  });
});

describe("R1 round 3, item 5: the review burden on valid foods", () => {
  it.each([
    ["2 pig's trotters", "pig's trotters", "2", "each"], ["1 carton barista oat milk", "barista oat milk", "1", "carton"],
    ["4 slices prosciutto di Parma", "prosciutto di Parma", "4", "slice"], ["12 fiddlehead ferns", "fiddlehead ferns", "12", "each"],
    ["2 very ripe plantains", "very ripe plantains", "2", "each"], ["4 griddle cakes", "griddle cakes", "4", "each"], ["4 Jell-O shots", "Jell-O shots", "4", "each"],
    ["1 can straw mushrooms", "straw mushrooms", "1", "can"], ["6 toaster waffles", "toaster waffles", "6", "each"], ["6 boiler onions", "boiler onions", "6", "each"],
    ["6 pinch-pleated dumplings", "pinch-pleated dumplings", "6", "each"], ["2 beef plate ribs", "beef plate ribs", "2", "each"], ["2 pan bagnat", "pan bagnat", "2", "each"],
    ["1 box 5-minute rice", "5-minute rice", "1", "box"], ["1 pack 2-minute noodles", "2-minute noodles", "1", "package"], ["2 funnel cakes", "funnel cakes", "2", "each"],
    ["1 package toaster pastries", "toaster pastries", "1", "package"], ["4 crusty rolls", "crusty rolls", "4", "each"], ["4 slice-and-bake cookies", "slice-and-bake cookies", "4", "each"],
    ["1 scoop whey protein isolate", "whey protein isolate", "1", "scoop"], ["2 slightly green bananas", "slightly green bananas", "2", "each"],
  ])("%s → ready %s", (line, name, q, unit) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it("two varieties share their head; a same-food remark restates the amount", () => {
    expect(read("1 cup Thai or Genovese basil").alternatives).toEqual(["Thai basil", "Genovese basil"]);
    expect(read("2 cups butter or iceberg lettuce").alternatives).toEqual(["butter lettuce", "iceberg lettuce"]);
    expect(read("1 tbsp honey or maple syrup").alternatives).toEqual(["honey", "maple syrup"]);
    expect(read("1/2 cup Parmesan or Pecorino Romano").alternatives).toEqual(["Parmesan", "Pecorino Romano"]);
    expect(read("1/2 cup chopped dates (8 Medjool)").status).toBe("ready");
    expect(read("3 cups cubed watermelon (1/4 melon)").status).toBe("ready");
    expect(read("2 tbsp lime juice (1 lime)").status).toBe("needs_review");
  });
});

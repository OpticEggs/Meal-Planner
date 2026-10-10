/**
 * semantic-v2 · RECOGNISED FOOD (PHASE-2B-PLAN §6.1, Decision 1; the owner's binding rules for round 2) and the other
 * candidate-review R1 round-2 items (CONTRACT §12.A A5, A6; H8′; the listed regressions).
 *
 * On a counted line (a bare count, a count unit or an imprecise unit) the reading is `ready` only when the name's head is a
 * recognised food and every word before it is recognised. Otherwise a person checks: `needs_review`, never `unsupported`,
 * with no quantity, unit or package, and the text after the number kept as the name pre-fill. Mass and volume lines are
 * unchanged. A known food after an unresolved measure word never inherits a count. Valid foods named with equipment or
 * measure words are never `unsupported`. Unknown words in these tests are invented ("zorble"), so they stay unknown.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { equipmentNamesFood, equipmentPhrase } from "../../src/ingredient/semantic-v2/classify";
import { compoundFoodEnding, foodWord, recognisedFoodHead, recognisedFoodNoun } from "../../src/ingredient/semantic-v2/foods";
import { lex } from "../../src/ingredient/semantic-v2/lexer";
import { core, read } from "./helpers";

const toks = (s: string) => lex(s).tokens;
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const dataLines = (file: string) => readFileSync(path.join(DATA, file), "utf8").split("\n").filter((l) => l.trim().length > 0 && !l.startsWith("#"));

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
    "M&Ms", "Kraft Singles", "extra-virgin olive oil", "2% milk", "80/20 ground beef", "oysters on the half shell", "chicken breast w/ skin", "hearts of palm",
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
    // a portion head with no food before it
    "tidbits", "slab",
  ])("%s → not recognised", (name) => {
    expect(recognisedFoodHead(name)).toBe(false);
  });

  it("a capitalised word is accepted as a proper name or brand before a food head, a lower-case unknown word is not", () => {
    expect(recognisedFoodHead("Zorble chicken thighs")).toBe(true);
    expect(recognisedFoodHead("zorble chicken thighs")).toBe(false);
  });

  it("a portion head counts after a food (recognisedFoodHead), but only a food head overrides equipment (recognisedFoodNoun)", () => {
    for (const n of ["pineapple tidbits", "pork belly slab", "popsicle sticks", "tart ring", "applesauce cups", "banana boats"]) expect(recognisedFoodHead(n), n).toBe(true);
    for (const n of ["popsicle sticks", "tart ring", "pizza peel", "muffin cups"]) expect(recognisedFoodNoun(n), n).toBe(false);
    for (const n of ["short plate", "Italian grinders", "jello mold", "chicken thighs"]) expect(recognisedFoodNoun(n), n).toBe(true);
  });

  it("food words that are also equipment heads are not foods by themselves", () => {
    for (const w of ["sheet", "pan", "pot", "rack", "ring", "stick", "tray", "board", "grinder", "skewer", "bowl", "steamer", "fryer"]) expect(foodWord(w), w).toBe(false);
    for (const w of ["mixer", "wrap", "crackers", "cheese", "tortillas"]) expect(foodWord(w), w).toBe(true);
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

describe("burden on valid foods (owner rule 3): never unsupported, rarely sent to a person for an unrecognised food", () => {
  for (const [file, maxShare] of [["plain-food-lines.txt", 0.005], ["overlap-food-lines.txt", 0.03]] as const) {
    it(`${file}: 0 unsupported, recognition reviews at most ${maxShare * 100}%`, () => {
      const lines = dataLines(file);
      expect(lines.length).toBeGreaterThan(250);
      const unsupported: string[] = [];
      const unrecognised: string[] = [];
      for (const line of lines) {
        const r = read(line);
        if (r.status === "unsupported") unsupported.push(line);
        if (recognitionAbstention(r)) unrecognised.push(line);
        // an abstention never carries an amount; a ready line always has a name
        if (r.status === "ready") expect(r.name, line).not.toBeNull();
      }
      expect(unsupported).toEqual([]);
      expect(unrecognised.length / lines.length, unrecognised.join(" | ")).toBeLessThanOrEqual(maxShare);
    });
  }
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

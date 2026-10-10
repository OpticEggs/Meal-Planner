/**
 * semantic-v3 · THE MEASURE SLOT (CONTRACT §13.1, §13.2, §12.14).
 *
 * Every word between a bare count and the food must be accounted for: a declared unit word (read before this, through
 * `src/unit-aliases.ts` only), a size or degree word (skipped before this), a modifier of the food, or part of the food's
 * own name. This module decides, for the word right after the count and any size words, whether it is instead an
 * UNRESOLVED MEASURE — a noun that names what is counted when it is not the food. It is, when a food follows it and:
 *
 *  1. it is a noun the contract declares is NOT a unit alias (`NOT_ALIASES`: tub, pot, bar, rasher, punnet; §13.1);
 *  2. NUMBER AGREEMENT: the count is above one, the word is a regular plural and the food's head is a singular food noun
 *     ("3 stems lemongrass", "2 sprays cooking oil", "2 saucepans water", "2 bars cream cheese") — the count agrees with
 *     the word, so the word is what is counted;
 *  3. it is a PART noun (a part, piece, shape, strand or spray of a food: `PART_NOUNS`) — "1 cob corn", "1 heel sourdough",
 *     "1 disk Ibarra chocolate", "1 blade mace" — except a cut word before a meat or fish head ("1 blade steak");
 *  4. it is a VESSEL or UTENSIL that holds food (`EQUIPMENT_TOOL_HEADS`, VESSEL_LIKE, unsure vessel heads) and not an
 *     appliance (`APPLIANCE_WORDS`) — "1 saucepan water", "1 wok oil", "1 colander pasta", "1 skillet cornbread batter";
 *  5. it is a bottle-size name before a drink (`BOTTLE_SIZE_WORDS`: "1 split prosecco", "1 magnum rosé").
 *
 * Rules 2–5 yield when the word is the head of the name, when it begins a compound food name ("pot roast", "kettle corn"),
 * when it heads a dish name before a Romance joiner ("pots de crème", "pan de bono"), and — for 3 and 4 — when the count
 * is above one and agrees with a plural food head ("6 pan rolls", "4 griddle cakes"). A recognised food after the word
 * never validates it (§13.2). The caller keeps the number and the noun in the note and reads no quantity, unit or package
 * (owner requirement 2).
 */
import { cmp, rational, type Rational } from "../../rational";
import { NOT_ALIASES } from "../../unit-aliases";
import { bakedWord, drinkWord, foodWord, meatOrFishWord, plainWord, twoWordFood, vesselLikeWord } from "./foods";
import { isWord, type Tok } from "./lexer";
import {
  APPLIANCE_WORDS, BOTTLE_SIZE_WORDS, CUT_PART_WORDS, EQUIPMENT_TOOL_HEADS, EQUIPMENT_VESSEL_HEADS, FUNCTION_WORDS, INVARIANT_PLURALS, PART_NOUNS, ROMANCE_JOINERS, SHAPE_FOOD_NOUNS, VESSEL_COMPOUNDS,
} from "./lexicon";

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** A regular plural by its form ("stems", "sprays", "saucepans"; not "asparagus", "swiss", "hummus", "Hellmann's"). */
export function regularPlural(w: string): boolean {
  return w.length > 2 && w.endsWith("s") && !/(?:ss|us|is|'s|’s)$/.test(w);
}

/** A noun that reads as several: a regular plural or a zero plural ("shrimp", "squash"). */
function readsPlural(w: string): boolean {
  return regularPlural(w) || INVARIANT_PLURALS.has(w);
}

/** A vessel or utensil that holds food — never an appliance (a measure in the measure slot, §13.2). */
export function holdingUtensil(w: string): boolean {
  if (APPLIANCE_WORDS.has(w)) return false;
  if (EQUIPMENT_TOOL_HEADS.has(w) || vesselLikeWord(w)) return true;
  const v = EQUIPMENT_VESSEL_HEADS[w];
  return v !== undefined && v.policy === "unsure";
}

/** A vessel that holds a measured amount (VESSEL_LIKE, or a vessel head that is never eaten: jar, glass, bowl…), not a tool. */
export function holdingVessel(w: string): boolean {
  const v = EQUIPMENT_VESSEL_HEADS[w];
  return vesselLikeWord(w) || (v !== undefined && v.policy === "unsure");
}

/** The index of the last word of the plain run of words starting at `a` (stops at a bracket, symbol or function word). */
function runEnd(toks: readonly Tok[], a: number): number {
  let k = a;
  while (isWord(toks[k + 1]) && !FUNCTION_WORDS.has((toks[k + 1] as { lower: string }).lower)) k++;
  return k;
}

/**
 * Where an unresolved measure word stands at `a` (after the count and any size words), the index after it; else `a`.
 * `count` is the bare count before it.
 */
/**
 * (semantic-v3) NUMBER AGREEMENT for a measure word (§13.2): with a count above one, a singular word before a plural food
 * head is not what is counted — it describes the items ("4 shot-glass desserts", "6 mug cakes"). `at` is the measure word.
 */
export function countAgreesPastMeasure(toks: readonly Tok[], at: number, count: Rational): boolean {
  const w = toks[at];
  if (!isWord(w) || cmp(count, rational(BigInt(1))) <= 0 || regularPlural(w.lower)) return false;
  const end = runEnd(toks, at);
  return end > at && regularPlural((toks[end] as { lower: string }).lower);
}

export function unresolvedMeasureAt(toks: readonly Tok[], a: number, count: Rational): number {
  const w = toks[a];
  const next = toks[a + 1];
  if (!isWord(w) || !isWord(next)) return a;
  // ("1 cob of corn" is read by the "of" measure rule; a function word ends the name)
  if (FUNCTION_WORDS.has(next.lower)) return a;
  const lw = plainWord(w.lower);
  // a dish name headed by the word ("pots de crème", "pan de bono", "eggs en cocotte")
  if (ROMANCE_JOINERS.has(plainWord(next.lower)) && isWord(toks[a + 2])) return a;
  if (twoWordFood(lw, next.lower)) return a;
  // 1. a noun the contract declares is not a unit
  if (hasOwn(NOT_ALIASES, lw)) return a + 1;
  // (a cooking vessel named in one or two words: "1 dutch oven stew", "1 crockpot chili", "1 sheet pan vegetables")
  if (VESSEL_COMPOUNDS.has(lw) && runEnd(toks, a) > a) return a + 1;
  const pair = `${lw}-${plainWord(next.lower)}`;
  if (VESSEL_COMPOUNDS.has(pair) && runEnd(toks, a) > a + 1) return a + 2;
  const end = runEnd(toks, a);
  if (end === a) return a; // the word is the head itself ("4 waffle cones", "2 sprays")
  const head = plainWord((toks[end] as { lower: string }).lower);
  const above1 = cmp(count, rational(BigInt(1))) > 0;
  // 2. number agreement: the count counts the plural word, not the singular food after it
  if (above1 && regularPlural(lw) && foodWord(head) && !readsPlural(head) && !foodWord(lw)) return a + 1;
  if (above1 && regularPlural(lw) && foodWord(head) && !readsPlural(head) && (PART_NOUNS.has(lw) || holdingUtensil(lw) || BOTTLE_SIZE_WORDS.has(lw))) return a + 1;
  // (a count above one that agrees with a plural food head: the word describes the items — "6 pan rolls", "4 griddle cakes")
  const agrees = above1 && readsPlural(head);
  // 3. a part, piece, shape, strand or spray of a food (a shape food only after a count of one: "Seven grain cereal" names
  // a product by its components, §12.9)
  if (PART_NOUNS.has(lw) && !agrees && !(CUT_PART_WORDS.has(lw) && meatOrFishWord(head))) return a + 1;
  if (SHAPE_FOOD_NOUNS.has(lw) && !above1) return a + 1;
  // 4. a vessel or utensil that holds food — not a baked dish named after the vessel it is baked in ("1 skillet cookie",
  // "1 skillet cornbread"; "1 skillet cornbread batter" is a measure of batter)
  if (holdingUtensil(lw) && !agrees && !(end === a + 1 && bakedWord(head))) return a + 1;
  // 5. a bottle size before a drink
  if (BOTTLE_SIZE_WORDS.has(lw) && drinkWord(head)) return a + 1;
  return a;
}

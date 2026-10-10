/**
 * semantic-v2 · lines that are not ingredients (CONTRACT §7.12, §12.8): headings, instructions, links,
 * yield lines and notes, and (semantic-v2) nutrition facts, diet points, ratings, recipe times, recipe-card
 * metadata, page furniture, credit lines, method steps and equipment lists. Each of these has its own named
 * test below (`nutritionFact`, `dietPoints`, `ratingLine`, `recipeTimeLine`, `metadataLine`, `pageFurniture`,
 * `creditLine`, `methodStep`, `equipmentLine`, `componentHeading`), composed by `nonIngredientReason`.
 *
 * None of them bans a word: each needs the WHOLE line to have its shape (a label made only of its vocabulary and a
 * value of the right form), so a food whose name contains such a word stays food ("1 scoop protein powder", "2 tbsp
 * vitamin C powder", "1 tsp sodium bicarbonate", "1 bottle vitamin water"). A line that opens with an amount is
 * refused only by the shapes that read the whole line (a rating, a time, a nutrient label after the number).
 */
import { UNIT_REGISTRY, type ReasonCode } from "../../contract";
import { adjacent, hasNumber, isGroup, isNumberish, isSym, isWord, type Tok } from "./lexer";
import {
  APPROX_SYMBOLS, APPROX_WORDS, BARE_EQUIPMENT_HEADS, CARDINALS, CREDIT_OPENERS, DISH_WORDS, GENERIC_COMPONENT_WORDS, DIET_POINT_HEADS, DIET_POINT_WORDS,
  EQUIPMENT_CONTINUATIONS, EQUIPMENT_COUNT_NOUNS, EQUIPMENT_LABEL_WORDS, EQUIPMENT_MATERIAL_WORDS, EQUIPMENT_SHAPE_WORDS, EQUIPMENT_TOOL_HEADS, EQUIPMENT_VESSEL_HEADS,
  FACT_UNITS, FUNCTION_WORDS, LENGTH_WORDS, SIZE_WORDS, HEADING_WORDS, INSTRUCTION_CUES, INSTRUCTION_VERBS, META_LABEL_WORDS, META_NOUNS, NEED_WORDS, NOTE_LABELS, NUTRIENT_WORDS,
  PAGE_KEYWORDS, PAGE_WORDS, RATING_HEADS, RATING_WORDS, RECIPE_PART_WORDS, SERVING_FACT_HEADS, SERVING_FACT_WORDS, SERVING_LABEL_WORDS,
  TIME_LABEL_WORDS, TIME_WORDS, WEAK_INSTRUCTION_VERBS, YIELD_WORDS, unitOfWord,
} from "./lexicon";
import { findUnstated, unstatedAt } from "./remarks";
import { canSizeDesignationAt, isTemperatureOrTime } from "./amount";

/** True when the line opens with a numeral, a vulgar fraction or a cardinal/fraction word (after "about", "~"). */
export function numericLead(toks: readonly Tok[]): boolean {
  let i = 0;
  while ((isWord(toks[i]) && APPROX_WORDS.has((toks[i] as { lower: string }).lower)) || (isSym(toks[i]) && APPROX_SYMBOLS.has((toks[i] as { text: string }).text))) i++;
  const t = toks[i];
  if (isNumberish(t)) return !temperatureOrTimeAt(toks, i);
  return isWord(t) && (Object.prototype.hasOwnProperty.call(CARDINALS, t.lower) || t.lower === "half");
}

/** The number at `i` is a temperature or a time ("350°F", "10 minutes"), possibly a written fraction or range. */
function temperatureOrTimeAt(toks: readonly Tok[], i: number): boolean {
  let k = i;
  while (k < toks.length && (isNumberish(toks[k]) || isSym(toks[k], "/", "-", "–", "."))) k++;
  return isTemperatureOrTime(toks, k);
}

/** Length words of a size ("10 inch", "20 cm"). */
const LENGTH_UNIT_WORDS = new Set([...LENGTH_WORDS, "inch", "inches", "quart", "quarts", "cup", "cups", "liter", "litre", "l"]);

const words = (toks: readonly Tok[]) => toks.filter((t) => t.kind === "word") as { lower: string; text: string }[];

/** Total number of words, groups included. */
function wordCount(toks: readonly Tok[]): number {
  let n = 0;
  for (const t of toks) {
    if (t.kind === "word") n++;
    else if (t.kind === "group") n += wordCount(t.children);
  }
  return n;
}

function hasUrl(toks: readonly Tok[]): boolean {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (isWord(t, "http", "https") && isSym(toks[i + 1], ":")) return true;
    if (isWord(t, "www") && isSym(toks[i + 1], ".")) return true;
    if (t.kind === "group" && hasUrl(t.children)) return true;
  }
  return false;
}

/** The unsupported reason for a line (tokens after any list marker), or null when it may be an ingredient. */
export function nonIngredientReason(toks: readonly Tok[]): ReasonCode | null {
  if (toks.length === 0) return "empty_line";
  if (nutritionPanel(toks)) return "not_an_ingredient"; // "Calories: 412kcal | Carbohydrates: 52g | Protein: 18g"
  if (!toks.some((t) => t.kind === "word" || isNumberish(t) || (isGroup(t) && (wordCount(t.children) > 0 || hasNumber(t.children))))) return "not_an_ingredient";
  if (isNumberish(toks[0]) && temperatureOrTimeAt(toks, 0)) return "not_an_ingredient"; // "350°F oven", "10 minutes"
  if (isNumberish(toks[0]) && metaNounAt(toks, 0)) return "not_an_ingredient"; // "4 servings", "250 kcal"
  // whole-line shapes that may open with a number ("4.8 stars (120 reviews)", "Prep 10 mins", "Bake 25 minutes")
  if (ratingLine(toks) || recipeTimeLine(toks)) return "not_an_ingredient";
  // "Calories: 250", "Serving size: 1 cup", "Special equipment: 2 baking sheets": a recipe fact, not food —
  // only when the whole label is a fact label and the value is only a value (no food word after it)
  const colon = toks.findIndex((t) => isSym(t, ":"));
  if (colon > 0) {
    const label = toks.slice(0, colon);
    const value = toks.slice(colon + 1);
    const labelWords = words(label);
    const only = (set: ReadonlySet<string>) => labelWords.length > 0 && label.every((t) => isWord(t) && (set.has(t.lower) || ["of", "the", "a"].includes(t.lower)));
    if (labelWords.some((w) => EQUIPMENT_LABEL_WORDS.has(w.lower))) return "not_an_ingredient";
    if (nutrientLabelEnd(label) === label.length && factValue(value, true)) return "not_an_ingredient";
    if (only(SERVING_LABEL_WORDS) && factValue(value, false)) return "not_an_ingredient";
    if (servingFact(label, value) || dietPoints(label, value) || metadataLabel(label)) return "not_an_ingredient";
    if (labelWords.some((w) => NEED_WORDS.has(w.lower)) && equipmentPhrase(value)) return "not_an_ingredient"; // "You will need: 2 baking sheets"
  }
  if (numericLead(toks)) return equipmentPhrase(toks) || scalingControls(toks) ? "not_an_ingredient" : null; // "1 9x13-inch baking pan", "1x 2x 3x"
  if (hasUrl(toks)) return "not_an_ingredient";
  // "Oven: 350°F", "Prep time: 10 minutes"
  if (colon > 0 && isNumberish(toks[colon + 1]) && temperatureOrTimeAt(toks, colon + 1)) return "not_an_ingredient";

  const ws = words(toks);
  const first = ws[0];
  const last = toks[toks.length - 1];
  // "Serving size 2 cookies (40 g)", "Yield 12 muffins": a serving-fact label with no colon, then its value
  const firstNumber = toks.findIndex((t) => !isWord(t));
  if (firstNumber > 0 && servingFact(toks.slice(0, firstNumber), toks.slice(firstNumber))) return "not_an_ingredient";
  // "Protein 20g", "Calories 250", "Saturated fat 3g", "Zinc 1 mg", "Vitamin B12 2 mcg": a nutrient label, then only a value
  const lead = nutrientLabelEnd(toks);
  if (lead > 0 && lead < toks.length && factValue(toks.slice(lead), true)) return "not_an_ingredient";
  const pointsLead = toks.findIndex((t) => !isWord(t));
  if (pointsLead > 0 && dietPoints(toks.slice(0, pointsLead), toks.slice(pointsLead))) return "not_an_ingredient"; // "WW Points 4"
  if (methodStep(toks) || creditLine(toks) || pageFurniture(toks) || equipmentPhrase(toks) || scalingControls(toks)) return "not_an_ingredient";
  // headings
  if (isSym(last, ":")) return "section_heading"; // "For the sauce:", "Marinade:"
  if (isSym(toks[0], "#") && canSizeDesignationAt(toks, 0) === 0) return "section_heading"; // ("#10 can tomatoes" is a can size)
  if (first && HEADING_WORDS.has(first.lower) && !hasNumber(toks)) return "section_heading";
  const lastWord = ws[ws.length - 1];
  if (lastWord && HEADING_WORDS.has(lastWord.lower) && ws.length <= 4 && !hasNumber(toks) && !toks.some(isGroup)) return "section_heading"; // "Dry ingredients"
  const noComma = !toks.some((t) => isSym(t, ",", ";"));
  if (first && first.lower === "for" && noComma && !hasNumber(toks) && wordCount(toks) <= 6 && findUnstated(toks)?.at !== 0) return "section_heading";
  // "TOPPING", "FOR THE SAUCE": all capitals and only recipe-part words. "SALT" or "OLIVE OIL" may be food.
  const letters = ws.map((w) => w.text).join("");
  if (letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase() && ws.length <= 4 && noComma && !hasNumber(toks) && ws.every((w) => RECIPE_PART_WORDS.has(w.lower))) {
    return "section_heading";
  }
  if (componentHeading(toks)) return "section_heading"; // "SAUCE", "Cake Layers", "Topping"
  if (isSym(toks[0], "*", "_") && isSym(last, "*", "_") && !hasNumber(toks)) return "section_heading"; // "**Sauce**"
  // notes, yields, instructions
  if (first && NOTE_LABELS.has(first.lower) && isSym(toks[1], ":")) return "not_an_ingredient";
  if (first && YIELD_WORDS.has(first.lower) && toks[0] === (first as unknown as Tok)) return "not_an_ingredient";
  // An instruction opens with a verb and reads like a sentence: a determiner or preposition after the verb
  // ("Season with salt", "Roll dough into 12 balls"), or a closing period. "Cut green beans, drained" may be food.
  const opensWithVerb = first && toks[0] === (first as unknown as Tok) && !isWord(toks[1], "of") && !isSym(toks[1], ":");
  if (opensWithVerb && INSTRUCTION_VERBS.has(first.lower) && (wordCount(toks) >= 3 || isSym(last, ".", "!"))) return "not_an_ingredient";
  if (opensWithVerb && WEAK_INSTRUCTION_VERBS.has(first.lower) && wordCount(toks) >= 2 && (sentenceCue(toks) || isSym(last, ".", "!"))) return "not_an_ingredient";
  return null;
}

// --- semantic-v2: named non-ingredient shapes (CONTRACT §12.8) -------------------------------------------

/** Tokens with every bracket group flattened into its children (a rating's "(120 reviews)" is read like the rest). */
function flat(toks: readonly Tok[]): Tok[] {
  const out: Tok[] = [];
  const walk = (list: readonly Tok[]) => {
    for (const t of list) {
      if (t.kind === "group") walk(t.children);
      else out.push(t);
    }
  };
  walk(toks);
  return out;
}

/**
 * Where a nutrient label ends: the index after a run of nutrient words ("Total Carbohydrate", "Net carbs", "Dietary
 * Fiber"), where "vitamin" may be followed by its letter ("Vitamin C", "Vitamin B12": a single letter, optionally with
 * digits glued to it). 0 when the run is empty or a word outside the vocabulary follows ("protein powder").
 */
/** Nutrient-label words that qualify a nutrient and name none by themselves ("Total", "Saturated", "Sat."). */
const NUTRIENT_QUALIFIERS = new Set(["total", "added", "net", "per", "serving", "daily", "value", "amount", "dietary", "saturated", "unsaturated", "trans", "sat", "mono", "poly", "free"]);

export function nutrientLabelEnd(toks: readonly Tok[]): number {
  let k = 0;
  let sawNutrient = false;
  while (k < toks.length) {
    const t = toks[k];
    if (!isWord(t)) break;
    if (t.lower === "vitamin" || t.lower === "vitamins") {
      sawNutrient = true;
      k++;
      const letter = toks[k];
      if (isWord(letter) && /^[a-km-z]$/i.test(letter.text) && /^\p{Lu}$/u.test(letter.text)) {
        k++;
        if (toks[k]?.kind === "num" && adjacent(letter, toks[k])) k++; // "B12", "D3"
      }
      continue;
    }
    if (NUTRIENT_WORDS.has(t.lower)) {
      if (!NUTRIENT_QUALIFIERS.has(t.lower)) sawNutrient = true;
      k++;
      // "Sat. fat", "Carb.", "Chol.": an abbreviation keeps its period
      if (isSym(toks[k], ".") && adjacent(t, toks[k]) && isWord(toks[k + 1])) k++;
      continue;
    }
    // "Sugar alcohols", "Added sugar", "Total sugar": "sugar" is food on its own, a nutrient beside nutrient words
    if (t.lower === "sugar" && ((k > 0 && NUTRIENT_QUALIFIERS.has((toks[k - 1] as { lower: string }).lower)) || (isWord(toks[k + 1]) && NUTRIENT_WORDS.has((toks[k + 1] as { lower: string }).lower)))) {
      sawNutrient = true;
      k++;
      continue;
    }
    if (["of", "the", "a"].includes(t.lower) && k > 0) {
      k++;
      continue;
    }
    break;
  }
  if (!sawNutrient) return 0;
  // the label must end where the value begins: a word that is not nutrient vocabulary means food ("protein powder")
  const after = toks[k];
  return isWord(after) && !FACT_UNITS.has(after.lower) ? 0 : k;
}

/**
 * NUTRITION / SERVING FACT: "Serving size: 1 cup (240 ml)", "Servings: 4 people", "Yield: 2 loaves" — a serving-fact
 * label (SERVING_FACT_WORDS with one of SERVING_FACT_HEADS) and a value that opens with a number states a recipe fact.
 */
export function servingFact(label: readonly Tok[], value: readonly Tok[]): boolean {
  const lw = words(label);
  if (lw.length === 0 || label.some((t) => !isWord(t)) || !lw.every((w) => SERVING_FACT_WORDS.has(w.lower)) || !lw.some((w) => SERVING_FACT_HEADS.has(w.lower))) return false;
  let k = 0;
  while (isWord(value[k]) && APPROX_WORDS.has((value[k] as { lower: string }).lower)) k++;
  return isNumberish(value[k]) || (isWord(value[k]) && Object.prototype.hasOwnProperty.call(CARDINALS, (value[k] as { lower: string }).lower));
}

/** Separators of a one-line nutrition panel ("Calories: 412kcal | Carbs: 52g", "Fat 10g • Protein 18g"). */
const PANEL_SEPARATORS = ["|", "•", "·", "/"];

/**
 * NUTRITION PANEL on one line: two or more parts separated by "|", "•" or "·", every part a nutrition fact on its own
 * ("Calories: 412kcal | Carbohydrates: 52g | Protein: 18g").
 */
export function nutritionPanel(toks: readonly Tok[]): boolean {
  const parts: Tok[][] = [[]];
  for (const t of toks) {
    if (isSym(t) && PANEL_SEPARATORS.includes(t.text) && t.text !== "/") parts.push([]);
    else parts[parts.length - 1].push(t);
  }
  const filled = parts.filter((p) => p.length > 0);
  return filled.length >= 2 && filled.every((p) => nutritionFact(p));
}

/** One nutrition fact: "Calories: 412kcal", "Protein 18g", "Fat: 10 g" (a nutrient label, then only a value). */
function nutritionFact(toks: readonly Tok[]): boolean {
  const colon = toks.findIndex((t) => isSym(t, ":"));
  if (colon > 0) {
    const label = toks.slice(0, colon);
    return nutrientLabelEnd(label) === label.length && factValue(toks.slice(colon + 1), true);
  }
  const lead = nutrientLabelEnd(toks);
  return lead > 0 && lead < toks.length && factValue(toks.slice(lead), true);
}

/** DIET POINTS: "WW Points: 4", "SmartPoints: 7", "Weight Watchers points: 5" — a points label and a bare number. */
export function dietPoints(label: readonly Tok[], value: readonly Tok[]): boolean {
  const lw = words(label);
  if (lw.length === 0 || label.some((t) => !isWord(t)) || !lw.every((w) => DIET_POINT_WORDS.has(w.lower)) || !lw.some((w) => DIET_POINT_HEADS.has(w.lower))) return false;
  const v = value.filter((t) => !isSym(t, ":", "."));
  return v.length >= 1 && isNumberish(v[0]) && v.slice(1).every((t) => isWord(t) && DIET_POINT_HEADS.has(t.lower));
}

/** RECIPE METADATA: "Course: dinner", "Cuisine: Italian", "Keyword: weeknight" — the label alone says the value is not food. */
export function metadataLabel(label: readonly Tok[]): boolean {
  const lw = words(label);
  return lw.length > 0 && label.every((t) => isWord(t)) && lw.every((w) => META_LABEL_WORDS.has(w.lower));
}

/** Star glyphs of a rating ("★★★★☆ (212)"). */
const STAR_GLYPHS = new Set(["★", "☆", "⭐", "✩", "✪", "✫", "✬", "✭", "✮", "✯", "✰", "🌟"]);

/**
 * RATING: "4.8 stars (120 reviews)", "5 from 3 votes", "Rated 4.5 out of 5" — only numbers, punctuation and rating
 * words (brackets included), with a number and a rating head ("stars", "votes", "reviews"…). "2 star anise" is food.
 */
export function ratingLine(toks: readonly Tok[]): boolean {
  const all = flat(toks);
  // ("★★★★★ (212)": star glyphs are a rating head)
  const stars = all.some((t) => isSym(t) && STAR_GLYPHS.has(t.text));
  if (!(all.some(isNumberish) || stars) || !(stars || all.some((t) => isWord(t) && RATING_HEADS.has(t.lower)))) return false;
  return all.every((t) => isNumberish(t) || (isSym(t) && !["$", "€", "£"].includes(t.text)) || (isWord(t) && RATING_WORDS.has(t.lower)));
}

/**
 * RECIPE TIME: "Prep 10 mins", "Cook 20 mins", "Total 30 mins", "Bake 25 minutes", "Chill for 2 hours" — every word is
 * a time word, a time label or an imperative verb, and some number is followed by a time word.
 */
export function recipeTimeLine(toks: readonly Tok[]): boolean {
  const all = flat(toks);
  let timed = false;
  for (let i = 0; i < all.length; i++) {
    const t = all[i];
    if (isNumberish(t)) {
      let k = i + 1;
      while (k < all.length && (isNumberish(all[k]) || isSym(all[k], "/", "-", "–", "."))) k++;
      if (isWord(all[k]) && TIME_WORDS.has((all[k] as { lower: string }).lower) && !["degree", "degrees"].includes((all[k] as { lower: string }).lower)) timed = true;
      continue;
    }
    if (isWord(t) && !(TIME_WORDS.has(t.lower) || TIME_LABEL_WORDS.has(t.lower) || INSTRUCTION_VERBS.has(t.lower))) return false;
  }
  return timed;
}

/** SCALING CONTROLS of a recipe card: "1x 2x 3x", "½x 1x 2x" — only numbers each followed by "x" (§12.2 iii, page furniture). */
export function scalingControls(toks: readonly Tok[]): boolean {
  let pairs = 0;
  for (let i = 0; i < toks.length; i += 2) {
    if (!isNumberish(toks[i]) || !(isWord(toks[i + 1], "x") || isSym(toks[i + 1], "×"))) return false;
    pairs++;
  }
  return pairs >= 2;
}

/** METHOD STEP: "Step 2", "Step 3: Add the onions", "STEP ONE" — "step" and its number open the line. */
export function methodStep(toks: readonly Tok[]): boolean {
  const n = toks[1];
  return isWord(toks[0], "step") && (isNumberish(n) || (isWord(n) && Object.prototype.hasOwnProperty.call(CARDINALS, n.lower)));
}

/** CREDIT LINE: "Recipe adapted from Example Kitchen", "Adapted from …", "Photo by …". */
export function creditLine(toks: readonly Tok[]): boolean {
  return CREDIT_OPENERS.some((seq) => seq.every((w, k) => isWord(toks[k], w)));
}

/**
 * PAGE FURNITURE: "Print recipe", "Jump to recipe", "Watch the video below", "Nutrition Facts", "Advertisement",
 * "Instructions", "Notes" — no number or bracket, every word from PAGE_WORDS, at least one of them a PAGE_KEYWORDS word.
 */
export function pageFurniture(toks: readonly Tok[]): boolean {
  if (hasNumber(toks) || toks.some(isGroup)) return false;
  const ws = words(toks);
  return ws.length > 0 && ws.length <= 6 && ws.every((w) => PAGE_WORDS.has(w.lower)) && ws.some((w) => PAGE_KEYWORDS.has(w.lower)) && toks.every((t) => isWord(t) || isSym(t, ".", "!", ":", "-", "|", "»", "›", ">"));
}

/** Words that never stand inside an equipment name before its head ("Oil for the pan", "Butter to grease the dish"). */
const EQUIPMENT_STOPS = new Set(["of", "for", "the", "with", "in", "into", "to", "from", "and", "or", "per", "on", "at", "your", "this", "plus", "&"]);

/**
 * EQUIPMENT (CONTRACT §12.8 non-food items, with or without "You will need:"). The part before any comma is
 *   [count] [size] [count noun ("roll", "box", "package", "sheets", "pieces"…) [of]] [words] HEAD [continuation]
 * where sizes are bracket groups, "12-cup", "9x13-inch", "4-quart", and the continuation is nothing, a bracket, "with …",
 * "fitted …", "lined …", or "and"/"or" before another equipment item ("1 mortar and pestle"). The HEAD decides:
 *  - a TOOL noun (EQUIPMENT_TOOL_HEADS: pan, dish, plate, pot, oven, cooker, skillet, wok, ramekin, liner, foil, twine,
 *    towel, mitt, scale, slicer, peeler, blender, thermometer, mould, rack…) → equipment, whatever words precede it
 *    ("1 cast iron skillet", "1 egg slicer", "1 potato masher");
 *  - a VESSEL noun (EQUIPMENT_VESSEL_HEADS: bag, cup, sheet, stick, paper, ring, jar, bowl, skewer…) → equipment when the
 *    word right before it is a material/kitchen-use word or one of that vessel's purpose words ("piping bag", "paper
 *    baking cups", "popsicle sticks", "wax paper", "mason jars"); a vessel word before it is judged the same way in turn
 *    ("rice paper wrappers" is food); with no word before it (or only sizes), a BARE head is equipment ("6 skewers");
 *    otherwise the vessel's policy: food ("2 tea bags", "4 lasagna sheets") or unsure ("2 chicken skewers": a person).
 * A measured amount (a mass or volume unit after the count) is never equipment.
 */
export function equipmentShape(toks: readonly Tok[]): "equipment" | "unsure" | null {
  const end = toks.findIndex((t) => isSym(t, ",", ";"));
  const seg = end < 0 ? toks : toks.slice(0, end);
  // the content words, with the count, the sizes and the brackets left out
  const content: { lower: string; at: number }[] = [];
  let counted = false;
  for (let i = 0; i < seg.length; i++) {
    const t = seg[i];
    if (isGroup(t)) continue;
    if (isNumberish(t)) {
      // "12-cup", "9-inch", "9x13-inch", "9 x 13", "10 inch": a size; otherwise a count
      if (isSym(seg[i + 1], "-", "–") && isWord(seg[i + 2])) {
        i += 2;
        continue;
      }
      if (isWord(seg[i + 1], "x", "by") && isNumberish(seg[i + 2])) {
        i += 2;
        if (isSym(seg[i + 1], "-", "–") && isWord(seg[i + 2])) i += 2;
        else if (isWord(seg[i + 1]) && (LENGTH_UNIT_WORDS.has((seg[i + 1] as { lower: string }).lower))) i++;
        continue;
      }
      const sizeWord = seg[i + 1];
      if (isWord(sizeWord) && (LENGTH_WORDS.has(sizeWord.lower) || sizeWord.lower === "inch" || sizeWord.lower === "inches" || (counted && (LENGTH_UNIT_WORDS.has(sizeWord.lower) || unitOfWord(sizeWord.text) !== null)))) {
        i++; // "6 in. skewers", "1 12 cup Bundt pan", "1 10 inch skillet"
        continue;
      }
      if (content.length > 0) return null; // a number after the words: an amount of something
      counted = true;
      continue;
    }
    if (isSym(t)) {
      if (["-", "–", "/", ".", '"', "″", "”", "“", "'"].includes(t.text)) continue; // ("8″ springform pan": an inch mark)
      if (t.text === "&") content.push({ lower: "and", at: i });
      else return null;
      continue;
    }
    if (!isWord(t)) return null;
    if (content.length === 0 && (APPROX_WORDS.has(t.lower) || ((t.lower === "a" || t.lower === "an") && !counted) || Object.prototype.hasOwnProperty.call(CARDINALS, t.lower))) {
      counted = counted || !APPROX_WORDS.has(t.lower);
      continue;
    }
    content.push({ lower: t.lower, at: i });
  }
  if (content.length === 0) return null;
  let k = 0;
  // a count noun before the item ("1 roll kitchen twine", "1 box toothpicks", "2 sheets aluminum foil", "1 sheet of wax paper")
  if (content.length >= 2 && EQUIPMENT_COUNT_NOUNS.has(content[0].lower)) {
    k = 1;
    if (content[1].lower === "of" && content.length >= 3) k = 2;
  } else {
    // a measured amount ("1 cup …", "2 tbsp …", "a pinch …") is never equipment
    const u = unitOfWord(content[0].lower);
    if (u !== null && content.length >= 2) {
      const dim = UNIT_REGISTRY[u].dimension;
      if (dim === "mass" || dim === "volume" || dim === "imprecise") return null;
    }
  }
  for (let j = k; j < content.length; j++) {
    const w = content[j].lower;
    if (EQUIPMENT_STOPS.has(w) || (FUNCTION_WORDS.has(w) && w !== "can")) return null; // ("can" is a container: "1 can opener")
    const tool = EQUIPMENT_TOOL_HEADS.has(w);
    const vessel = EQUIPMENT_VESSEL_HEADS[w];
    if (!tool && vessel === undefined) continue;
    // the head must end the item, or be followed by a continuation
    let n = content[j].at + 1;
    while (n < seg.length && isGroup(seg[n])) n++;
    const nt = seg[n];
    let ends = nt === undefined;
    if (isWord(nt) && EQUIPMENT_CONTINUATIONS.has(nt.lower)) ends = true;
    else if (isWord(nt, "and", "or", "plus") || isSym(nt, "&")) ends = equipmentShape(seg.slice(n + 1)) === "equipment";
    if (!ends) continue;
    if (tool) return "equipment";
    return vesselVerdict(content.slice(k, j).map((c) => c.lower), w);
  }
  return null;
}

/** A vessel head with the words before it (CONTRACT §12.8; see `equipmentShape`). */
function vesselVerdict(before: readonly string[], head: string): "equipment" | "unsure" | null {
  const entry = EQUIPMENT_VESSEL_HEADS[head];
  const mods = before.filter((w) => !SIZE_WORDS.has(w) && !EQUIPMENT_SHAPE_WORDS.has(w));
  if (mods.length === 0) return BARE_EQUIPMENT_HEADS.has(head) ? "equipment" : null;
  const prev = mods[mods.length - 1];
  if (EQUIPMENT_VESSEL_HEADS[prev] !== undefined && !EQUIPMENT_MATERIAL_WORDS.has(prev) && !entry.purposes.has(prev)) {
    // "rice paper wrappers": the vessel word before is judged in turn ("rice paper" is food)
    const inner = vesselVerdict(mods.slice(0, -1), prev);
    return inner === "equipment" || mods.length === 1 ? "equipment" : entry.policy === "unsure" ? "unsure" : null;
  }
  if (EQUIPMENT_MATERIAL_WORDS.has(prev) || entry.purposes.has(prev)) {
    // ("rice paper wrappers": a material word that is itself a vessel noun takes its own modifier into account)
    if (EQUIPMENT_VESSEL_HEADS[prev] !== undefined && mods.length >= 2) {
      const inner = vesselVerdict(mods.slice(0, -1), prev);
      if (inner === null) return null;
    }
    return "equipment";
  }
  return entry.policy === "unsure" ? "unsure" : null;
}

/** True when the line is an equipment item (`equipmentShape` is sure of it). */
export function equipmentPhrase(toks: readonly Tok[]): boolean {
  return equipmentShape(toks) === "equipment";
}

/**
 * SECTION HEADING by its words (CONTRACT §12.8): a line with no amount, comma or bracket made only of generic component
 * words (GENERIC_COMPONENT_WORDS: sauce, dressing, glaze, topping, filling, frosting, crust, dough, batter, marinade,
 * garnish, base, layers, assembly), optionally after dish words (DISH_WORDS: "Cake Layers", "Pie Crust", "Pizza Dough"),
 * in any case ("SAUCE", "Dressing"); also "To serve". A specific food ("Pesto", "Hot sauce", "Whipped topping") is not one.
 */
export function componentHeading(toks: readonly Tok[]): boolean {
  if (hasNumber(toks) || toks.some((t) => isGroup(t) || isSym(t, ",", ";"))) return false;
  if (!toks.every((t) => isWord(t) || isSym(t, "&", "-", "–", "*", "_", "#", ".", "/"))) return false;
  const ws = words(toks).map((w) => w.lower);
  if (ws.length === 0 || ws.length > 5) return false;
  if (["to serve", "for serving", "to garnish", "for garnish", "for garnishing", "to finish", "for decoration", "to decorate"].includes(ws.join(" "))) return true;
  if (findUnstated(toks) !== null) return false;
  let k = 0;
  while (k < ws.length && (DISH_WORDS.has(ws[k]) || ws[k] === "the" || ws[k] === "for")) k++;
  const rest = ws.slice(k);
  return rest.length > 0 && rest.every((w) => GENERIC_COMPONENT_WORDS.has(w) || w === "and") && GENERIC_COMPONENT_WORDS.has(rest[rest.length - 1]);
}

/** A determiner or preposition after the first word, outside a no-fixed-amount phrase ("to taste" is not a cue). */
function sentenceCue(toks: readonly Tok[]): boolean {
  const covered = new Set<number>();
  for (let i = 0; i < toks.length; i++) {
    const m = unstatedAt(toks, i);
    if (m) for (let k = 0; k < m.len; k++) covered.add(i + k);
  }
  return toks.some((t, i) => i > 0 && !covered.has(i) && isWord(t) && INSTRUCTION_CUES.has(t.lower));
}

/**
 * The number at `i` counts servings, people or energy and nothing follows ("4 servings", "250 kcal", "250
 * kcal per serving"). With a food after it ("2 servings cooked rice") the line may be food.
 */
function metaNounAt(toks: readonly Tok[], i: number): boolean {
  let k = i;
  while (k < toks.length && (isNumberish(toks[k]) || isSym(toks[k], "/", "-", "–", "."))) k++;
  const t = toks[k];
  if (!(isWord(t) && META_NOUNS.has(t.lower))) return false;
  const rest = toks.slice(k + 1);
  return rest.length === 0 || (isWord(rest[0], "per", "each") && rest.length <= 2);
}

/**
 * A recipe-fact value and nothing else: an optional approximation, a number (or range), and a unit —
 * a nutrient unit ("10 g", "250 kcal", "15%") when `nutrient`, else any unit word ("1 cup", "200 g") — with no
 * word after it that could name food.
 */
function factValue(toks: readonly Tok[], nutrient: boolean): boolean {
  let k = 0;
  while (isWord(toks[k]) && APPROX_WORDS.has((toks[k] as { lower: string }).lower)) k++;
  if (!isNumberish(toks[k])) return false;
  while (k < toks.length && (isNumberish(toks[k]) || isSym(toks[k], "/", "-", "–", ".", ",", "~"))) k++;
  // (semantic-v2) a bracket after the value that only restates it ("(240 ml)", "(15% DV)") is part of the value
  const rest = toks.slice(k).filter((t) => !(isGroup(t) && t.children.length > 0 && t.children.every((c) => isNumberish(c) || isSym(c, "%", ".", "/", ",") || (isWord(c) && (FACT_UNITS.has(c.lower) || unitOfWord(c.text) !== null || APPROX_WORDS.has(c.lower))))));
  const ok = (t: Tok) =>
    (isSym(t) && ["%", ".", ")", "("].includes(t.text)) ||
    (isWord(t) && (FACT_UNITS.has(t.lower) || SERVING_LABEL_WORDS.has(t.lower) || ["each", "of", "a", "an"].includes(t.lower) || (!nutrient && unitOfWord(t.text) !== null)));
  return rest.length <= 3 && rest.every(ok);
}

/**
 * semantic-v1 · lines that are not ingredients (CONTRACT §7.12): headings, instructions, links,
 * yield lines and notes. Only lines that do NOT open with a numeric amount are considered, so
 * "2 cups flour" is never refused whatever follows it.
 */
import type { ReasonCode } from "../../contract";
import { hasNumber, isGroup, isNumberish, isSym, isWord, type Tok } from "./lexer";
import {
  APPROX_SYMBOLS, APPROX_WORDS, CARDINALS, EQUIPMENT_LABEL_WORDS, FACT_UNITS, HEADING_WORDS, INSTRUCTION_CUES, INSTRUCTION_VERBS, META_NOUNS, NOTE_LABELS, NUTRIENT_WORDS,
  RECIPE_PART_WORDS, SERVING_LABEL_WORDS, WEAK_INSTRUCTION_VERBS, YIELD_WORDS, unitOfWord,
} from "./lexicon";
import { findUnstated, unstatedAt } from "./remarks";
import { isTemperatureOrTime } from "./amount";

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
  if (!toks.some((t) => t.kind === "word" || isNumberish(t) || (isGroup(t) && (wordCount(t.children) > 0 || hasNumber(t.children))))) return "not_an_ingredient";
  if (isNumberish(toks[0]) && temperatureOrTimeAt(toks, 0)) return "not_an_ingredient"; // "350°F oven", "10 minutes"
  if (isNumberish(toks[0]) && metaNounAt(toks, 0)) return "not_an_ingredient"; // "4 servings", "250 kcal"
  // "Calories: 250", "Serving size: 1 cup", "Special equipment: 2 baking sheets": a recipe fact, not food —
  // only when the whole label is a fact label and the value is only a value (no food word after it)
  const colon = toks.findIndex((t) => isSym(t, ":"));
  if (colon > 0) {
    const label = toks.slice(0, colon);
    const value = toks.slice(colon + 1);
    const labelWords = words(label);
    const only = (set: ReadonlySet<string>) => labelWords.length > 0 && label.every((t) => isWord(t) && (set.has(t.lower) || ["of", "the", "a"].includes(t.lower)));
    if (labelWords.some((w) => EQUIPMENT_LABEL_WORDS.has(w.lower))) return "not_an_ingredient";
    if (only(NUTRIENT_WORDS) && factValue(value, true)) return "not_an_ingredient";
    if (only(SERVING_LABEL_WORDS) && factValue(value, false)) return "not_an_ingredient";
  }
  if (numericLead(toks)) return null;
  if (hasUrl(toks)) return "not_an_ingredient";
  // "Oven: 350°F", "Prep time: 10 minutes"
  if (colon > 0 && isNumberish(toks[colon + 1]) && temperatureOrTimeAt(toks, colon + 1)) return "not_an_ingredient";

  const ws = words(toks);
  const first = ws[0];
  const last = toks[toks.length - 1];
  // "Protein 20g", "Calories 250", "Saturated fat 3g": a nutrient label, then only a nutrition value
  const lead = toks.findIndex((t) => !isWord(t));
  if (lead > 0 && toks.slice(0, lead).every((t) => isWord(t) && NUTRIENT_WORDS.has(t.lower)) && factValue(toks.slice(lead), true)) return "not_an_ingredient";
  // headings
  if (isSym(last, ":")) return "section_heading"; // "For the sauce:", "Marinade:"
  if (isSym(toks[0], "#")) return "section_heading";
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
  const rest = toks.slice(k);
  const ok = (t: Tok) =>
    (isSym(t) && ["%", ".", ")", "("].includes(t.text)) ||
    (isWord(t) && (FACT_UNITS.has(t.lower) || SERVING_LABEL_WORDS.has(t.lower) || ["each", "of", "a", "an"].includes(t.lower) || (!nutrient && unitOfWord(t.text) !== null)));
  return rest.length <= 3 && rest.every(ok);
}

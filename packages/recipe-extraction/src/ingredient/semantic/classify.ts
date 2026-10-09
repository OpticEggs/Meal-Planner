/**
 * semantic-v1 · lines that are not ingredients (CONTRACT §7.12): headings, instructions, links,
 * yield lines and notes. Only lines that do NOT open with a numeric amount are considered, so
 * "2 cups flour" is never refused whatever follows it.
 */
import type { ReasonCode } from "../../contract";
import { hasNumber, isGroup, isNumberish, isSym, isWord, type Tok } from "./lexer";
import { APPROX_SYMBOLS, APPROX_WORDS, CARDINALS, HEADING_WORDS, INSTRUCTION_VERBS, NOTE_LABELS, YIELD_WORDS } from "./lexicon";
import { findUnstated } from "./remarks";

/** True when the line opens with a numeral, a vulgar fraction or a cardinal/fraction word (after "about", "~"). */
export function numericLead(toks: readonly Tok[]): boolean {
  let i = 0;
  while ((isWord(toks[i]) && APPROX_WORDS.has((toks[i] as { lower: string }).lower)) || (isSym(toks[i]) && APPROX_SYMBOLS.has((toks[i] as { text: string }).text))) i++;
  const t = toks[i];
  if (isNumberish(t)) return true;
  return isWord(t) && (Object.prototype.hasOwnProperty.call(CARDINALS, t.lower) || t.lower === "half");
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
  if (numericLead(toks)) return null;
  if (hasUrl(toks)) return "not_an_ingredient";

  const ws = words(toks);
  const first = ws[0];
  const last = toks[toks.length - 1];
  // headings
  if (isSym(last, ":")) return "section_heading"; // "For the sauce:", "Marinade:"
  if (isSym(toks[0], "#")) return "section_heading";
  if (first && HEADING_WORDS.has(first.lower) && !hasNumber(toks)) return "section_heading";
  const noComma = !toks.some((t) => isSym(t, ",", ";"));
  if (first && first.lower === "for" && noComma && !hasNumber(toks) && wordCount(toks) <= 6 && findUnstated(toks)?.at !== 0) return "section_heading";
  const letters = ws.map((w) => w.text).join("");
  if (letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase() && ws.length <= 4 && noComma && !hasNumber(toks) && findUnstated(toks) === null) {
    return "section_heading"; // "TOPPING"
  }
  if (isSym(toks[0], "*", "_") && isSym(last, "*", "_") && !hasNumber(toks)) return "section_heading"; // "**Sauce**"
  // notes, yields, instructions
  if (first && NOTE_LABELS.has(first.lower) && isSym(toks[1], ":")) return "not_an_ingredient";
  if (first && YIELD_WORDS.has(first.lower) && toks[0] === (first as unknown as Tok)) return "not_an_ingredient";
  if (first && toks[0] === (first as unknown as Tok) && INSTRUCTION_VERBS.has(first.lower) && !isWord(toks[1], "of") && !isSym(toks[1], ":")) {
    if (wordCount(toks) >= 3 || isSym(last, ".", "!")) return "not_an_ingredient";
  }
  return null;
}

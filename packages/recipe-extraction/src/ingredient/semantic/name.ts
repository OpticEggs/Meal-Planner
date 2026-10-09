/**
 * semantic-v1 · step 7: the name region — the words after the amount phrase and before the first
 * top-level comma (CONTRACT §7.6–§7.8).
 *
 *  - bracket groups: a stated amount is placed (package size / restatement), anything else is a remark;
 *  - a leading "of", size words (→ note) and cooked/raw words (→ form) are taken off the front;
 *  - a trailing remark with no comma ("to taste", "for frying", "optional", "plus more …") and a
 *    trailing preparation phrase ("eggs beaten") are taken off the end;
 *  - a number left inside the name is not part of the food: the name stops there and the rest is noted
 *    (`quantity_unassigned`), except percentages ("2% milk") and sizes ("9-inch", → note);
 *  - "or" splits the name into options ("chicken or vegetable broth" → chicken broth / vegetable broth);
 *  - a counted portion written after the food ("3 garlic cloves") is the unit.
 */
import { adjacent, isGroup, isNumberish, isSym, isWord, type Tok } from "./lexer";
import { FORM_WORDS, PREP_ADVERBS, SIZE_WORDS, TRAILING_COUNT_UNITS, TRAILING_PREP_WORDS, unitOfWord } from "./lexicon";
import { groupAmounts, isPriceGroup, placeSecondary, readAmountPhrase, readStatedAmount, type AmountSlots } from "./amount";
import { classifyGroup, classifyPiece, dropBarePrices, splitOr, textOf, trimEdges, unstatedAt } from "./remarks";
import type { Effects } from "./types";
import { foodHead, isRemarkOption } from "./alternatives";
import { readUnit, type UnitRead } from "./unit";

export interface NameContext {
  text: string;
  /** Where stated amounts in brackets go; null when the line has no amount (they are then unassigned). */
  slots: AmountSlots | null;
  /** The amount phrase read a unit word. */
  unitWritten: boolean;
  /** The amount phrase read a usable quantity. */
  hasQuantity: boolean;
  /** The amount phrase ended with a unit or an amount word, so a leading "of" belongs to it. */
  dropLeadingOf: boolean;
}

export interface NameReading {
  name: string | null;
  nameSpan: [number, number] | null;
  /** "milk or cream" → ["milk", "cream"] (≥ 2), else null. */
  options: string[] | null;
  /** A counted portion written after the food ("3 garlic cloves" → clove). */
  trailingUnit: UnitRead | null;
  /** A "plus …" remark with no comma ("flour plus 2 tbsp"); the caller decides compound vs note. */
  plusRemark: Tok[] | null;
}

const isSizeWordAt = (toks: readonly Tok[], i: number): number => {
  const t = toks[i];
  if (!isWord(t)) return 0;
  if (SIZE_WORDS.has(t.lower)) return 1;
  if (t.lower === "extra" && isWord(toks[i + 1]) && SIZE_WORDS.has((toks[i + 1] as { lower: string }).lower)) return 2;
  return 0;
};

/** A dimension written in the name ("9-inch", "1 inch") — a size, so a note. */
function dimensionAt(text: string, toks: readonly Tok[], i: number): number {
  const sa = readStatedAmount(text, toks, i);
  return sa && sa.unit.canonical === "inch" ? sa.next : -1;
}

/** Name text of kept tokens: runs of neighbouring tokens copied as written, joined by one space. */
function nameText(text: string, toks: readonly Tok[]): string {
  return trimEdges(textOf(text, toks));
}

/** "chicken or vegetable broth": a one-word option shares the last option's words after its first. */
function distribute(text: string, options: Tok[][]): string[] {
  if (options.length < 2) return options.map((o) => nameText(text, o));
  const words = (o: Tok[]) => o.filter((t) => t.kind === "word" || t.kind === "num");
  const last = options[options.length - 1];
  const lastWords = words(last);
  const shareable = lastWords.length >= 2 && options.slice(0, -1).every((o) => o.length === 1 && isWord(o[0]));
  if (!shareable) return options.map((o) => nameText(text, o));
  const tail = nameText(text, last.slice(last.indexOf(lastWords[1])));
  return options.map((o, k) => (k === options.length - 1 ? nameText(text, o) : `${nameText(text, o)} ${tail}`));
}

/**
 * A number left inside a name is not part of the food: the name stops there and the rest is noted
 * (`quantity_unassigned`). Percentages ("2% milk"), numbers glued to letters ("V8") and sizes
 * ("9-inch" → note) are kept or placed.
 */
function stopAtNumber(text: string, toks: readonly Tok[], fx: Effects): Tok[] {
  const kept: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!isNumberish(t)) {
      kept.push(t);
      continue;
    }
    const glued = adjacent(toks[i - 1], t) && isWord(toks[i - 1]);
    const percent = isSym(toks[i + 1], "%") && adjacent(t, toks[i + 1]);
    if (glued || percent) {
      kept.push(t);
      continue;
    }
    const dim = dimensionAt(text, toks, i);
    if (dim > i) {
      fx.notes.push({ s: t.s, text: text.slice(t.s, toks[dim - 1].e) });
      i = dim - 1;
      continue;
    }
    fx.notes.push({ s: t.s, text: textOf(text, toks.slice(i)) });
    fx.unassigned++;
    // a name cut before a second ingredient does not end in a conjunction ("flour and | 1 tsp salt")
    while (kept.length > 0 && (isWord(kept[kept.length - 1], "and", "or", "with", "plus") || isSym(kept[kept.length - 1], "&", "+"))) kept.pop();
    break;
  }
  return kept;
}

export function readNameRegion(region: readonly Tok[], ctx: NameContext, fx: Effects): NameReading {
  const { text } = ctx;
  // 1. bracket groups and bare prices
  let toks: Tok[] = [];
  for (const t of region) {
    if (!isGroup(t)) {
      toks.push(t);
      continue;
    }
    if (isPriceGroup(t)) {
      if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
      continue;
    }
    const list = groupAmounts(text, t);
    if (list) {
      if (ctx.slots) for (const sa of list) placeSecondary(text, ctx.slots, { sa, position: "after" });
      else fx.unassigned++;
      continue;
    }
    classifyGroup(text, t, fx);
  }
  toks = dropBarePrices(toks, fx);

  // 2. the front: "of", size words, cooked/raw, a distributive "each", and an alternative amount
  //    ("2 large or 3 small potatoes": the second amount cannot be placed)
  let a = 0;
  if (ctx.dropLeadingOf && isWord(toks[a], "of")) a++;
  if (ctx.hasQuantity && ctx.unitWritten && isWord(toks[a], "each")) {
    // "1 tsp each salt and pepper": one amount for several foods — a person must split it
    if (!fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");
    a++;
    if (isSym(toks[a], ":")) a++;
  }
  for (let guard = 0; guard < 8 && a < toks.length; guard++) {
    if (isWord(toks[a], "or", "to") && (isNumberish(toks[a + 1]) || isWord(toks[a + 1], "a", "an"))) {
      const alt = readAmountPhrase(text, toks, a + 1);
      if (alt && alt.next < toks.length) {
        fx.unassigned++;
        fx.notes.push({ s: toks[a].s, text: textOf(text, toks.slice(a, alt.next)) });
        a = alt.next;
        if (isWord(toks[a], "of")) a++;
        continue;
      }
    }
    const size = isSizeWordAt(toks, a);
    if (size > 0) {
      fx.notes.push({ s: toks[a].s, text: text.slice(toks[a].s, toks[a + size - 1].e) });
      a += size;
      if (isWord(toks[a], "of")) a++;
      continue;
    }
    const t = toks[a];
    if (isWord(t) && Object.prototype.hasOwnProperty.call(FORM_WORDS, t.lower)) {
      fx.form ??= FORM_WORDS[t.lower];
      a++;
      continue;
    }
    break;
  }
  toks = toks.slice(a);

  // 3. the end: a trailing remark with no comma
  let plusRemark: Tok[] | null = null;
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    const phrase = unstatedAt(toks, i);
    const optionalWord = isWord(t, "optional") && i === toks.length - 1;
    const plus = isWord(t, "plus") || (isSym(t, "+") && i > 0);
    if (!phrase && !optionalWord && !plus) continue;
    const remark = toks.slice(i);
    toks = toks.slice(0, i);
    if (plus) plusRemark = remark;
    else classifyPiece(text, remark, fx);
    break;
  }
  // trailing preparation ("2 eggs beaten", "1 onion finely chopped")
  let p = toks.length;
  let sawPrep = false;
  while (p > 1) {
    const t = toks[p - 1];
    if (isWord(t) && TRAILING_PREP_WORDS.has(t.lower)) sawPrep = true;
    else if (!(isWord(t) && (PREP_ADVERBS.has(t.lower) || t.lower === "and"))) break;
    p--;
  }
  while (p < toks.length && isWord(toks[p], "and")) p++;
  if (sawPrep && p < toks.length && p >= 1) {
    fx.notes.push({ s: toks[p].s, text: textOf(text, toks.slice(p)) });
    toks = toks.slice(0, p);
  }

  // 4. options ("milk or cream", "black beans or 1 1/2 cups cooked beans")
  const parts = splitOr(toks).filter((o) => o.some((t) => t.kind === "word"));
  let options: string[] | null = null;
  if (parts.length >= 2) {
    const cleaned = parts.map((o) => {
      // an option with its own amount: the amount is a second amount nobody can place
      if (isNumberish(o[0]) || isWord(o[0], "a", "an")) {
        const amt = readAmountPhrase(text, o, 0);
        if (amt && amt.next < o.length) {
          fx.unassigned++;
          return isWord(o[amt.next], "of") ? o.slice(amt.next + 1) : o.slice(amt.next);
        }
      }
      return stopAtNumber(text, o, fx);
    });
    let texts = distribute(text, cleaned.filter((o) => o.length > 0)).filter((x) => x.length > 0);
    // "fresh thyme or 1 tsp dried": a remark-only option names the first option's food in another form
    texts = texts.map((x, k) => (k > 0 && isRemarkOption(x) ? `${x} ${foodHead(texts[0])}` : x));
    if (texts.length >= 2) options = texts;
  }

  if (options === null) {
    // 5. cooked/raw anywhere in the name
    toks = toks.filter((t) => {
      if (isWord(t) && Object.prototype.hasOwnProperty.call(FORM_WORDS, t.lower)) {
        fx.form ??= FORM_WORDS[t.lower];
        return false;
      }
      return true;
    });
    // 6. numbers inside the name
    toks = stopAtNumber(text, toks, fx);
  }

  // 7. a counted portion after the food ("3 garlic cloves")
  let trailingUnit: UnitRead | null = null;
  if (options === null && !ctx.unitWritten && ctx.hasQuantity && toks.length >= 2) {
    const last = toks[toks.length - 1];
    const code = isWord(last) ? unitOfWord(last.text) : null;
    if (code !== null && TRAILING_COUNT_UNITS.has(code) && isWord(toks[toks.length - 2])) {
      trailingUnit = readUnit(text, toks, toks.length - 1);
      if (trailingUnit) toks = toks.slice(0, -1);
    }
  }

  const name = options === null ? nameText(text, toks) : "";
  const span: [number, number] | null = options === null && toks.length > 0 && name.length > 0 ? [toks[0].s, toks[toks.length - 1].e] : null;
  return { name: name.length > 0 ? name : null, nameSpan: span, options, trailingUnit, plusRemark };
}

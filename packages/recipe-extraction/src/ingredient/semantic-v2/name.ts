/**
 * semantic-v2 · step 7: the name region — the words after the amount phrase and before the first
 * top-level comma (CONTRACT §7.6–§7.8).
 *
 *  - bracket groups: a stated amount is placed (package size / restatement), anything else is a remark;
 *  - a leading "of", size words (→ note) and cooked/raw words (→ form) are taken off the front;
 *  - a trailing remark with no comma ("to taste", "for frying", "for the icing", "optional", "plus more …") and a
 *    trailing preparation phrase ("eggs beaten") are taken off the end;
 *  - a number left inside the name is not part of the food: the name stops there and the rest is noted
 *    (`quantity_unassigned`), except percentages ("2% milk") and sizes ("9-inch", → note);
 *  - "or" splits the name into options ("chicken or vegetable broth" → chicken broth / vegetable broth);
 *  - a counted portion written after the food ("3 garlic cloves") is the unit.
 */
import { adjacent, isGroup, isNumberish, isSym, isWord, type Tok } from "./lexer";
import {
  APPROX_WORDS, BULLETS, CARDINALS, CONTAINER_UNITS, FUNCTION_WORDS, META_NOUNS, PRODUCT_IDENTITY_NOUNS, REMARK_WORDS, SIZE_GRADED_NOUNS, UNIT_WORDS_IN_FOOD_NAMES, FORM_WORDS, LEADING_JUNK, PREP_ADVERBS,
  SIZE_WORDS, TRAILING_COUNT_UNITS, TRAILING_PREP_WORDS, unitOfWord,
} from "./lexicon";
import { amountStartsAt, groupAmounts, isPriceGroup, placeSecondary, readAmountPhrase, readStatedAmount, type AmountSlots } from "./amount";
import { classifyGroup, classifyPiece, dropBarePrices, remarkOnly, splitOr, textOf, trimEdges, unstatedAt } from "./remarks";
import { readNumber } from "./quantity";
import type { Effects } from "./types";
import { distributeOptions, foodHead, isRemarkOption } from "./alternatives";
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
  /**
   * Size words describe counted items ("2 large eggs", "1 medium onion") and go to the note; after a mass
   * or volume unit, or a container, they usually name a product ("1 cup small curd cottage cheese") and stay.
   */
  sizeWordsAreNotes: boolean;
  /** An amount phrase was read before this region (left-overs of it at the front are not food). */
  amountRead: boolean;
  /** Keep numbers in the name as written ("5 spice powder, 1 tsp": the leading number is not the amount). */
  verbatim: boolean;
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
  /** A second number sat right after the amount ("1 half cup milk"): the amount is not clear. */
  amountUnclear: boolean;
}

const isSizeWordAt = (toks: readonly Tok[], i: number): number => {
  const t = toks[i];
  if (!isWord(t)) return 0;
  if (SIZE_WORDS.has(t.lower)) return 1;
  if (t.lower === "extra" && isWord(toks[i + 1]) && SIZE_WORDS.has((toks[i + 1] as { lower: string }).lower)) return 2;
  return 0;
};

/** A size word at `i` that grades the next noun, a material of the product ("small curd", "large flake", "jumbo lump"). */
function sizeGradesMaterial(toks: readonly Tok[], i: number): boolean {
  const n = isSizeWordAt(toks, i);
  const next = toks[i + n];
  return n > 0 && isWord(next) && SIZE_GRADED_NOUNS.has(next.lower) && toks[i + n + 1] !== undefined;
}

/** A dimension written in the name ("9-inch", "1 inch") — a size, so a note. */
function dimensionAt(text: string, toks: readonly Tok[], i: number): number {
  const sa = readStatedAmount(text, toks, i);
  return sa && sa.unit.canonical === "inch" ? sa.next : -1;
}

/** Name text of kept tokens: runs of neighbouring tokens copied as written, joined by one space. */
function nameText(text: string, toks: readonly Tok[]): string {
  return trimEdges(textOf(text, toks));
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
    const glued = adjacent(toks[i - 1], t) && isWord(toks[i - 1]); // "V8"
    // a lean-to-fat ratio ("80/20 ground beef") is part of the product
    const den = toks[i + 2];
    if (t.kind === "num" && t.form === "int" && isSym(toks[i + 1], "/") && den?.kind === "num" && den.form === "int" && adjacent(t, toks[i + 1]) && adjacent(toks[i + 1], den) && Number(t.text) + Number(den.text) === 100) {
      kept.push(t, toks[i + 1], den);
      i += 2;
      continue;
    }
    // a quoted grade ('"00" flour'): quotes on both sides, the opening one not glued to a number ("1'000")
    const open = toks[i - 1];
    const close = toks[i + 1];
    if (isSym(open, '"', "“", "'", "‘") && adjacent(open, t) && isSym(close, '"', "”", "'", "’") && adjacent(t, close) && !(isNumberish(toks[i - 2]) && adjacent(toks[i - 2], open))) {
      kept.push(t);
      continue;
    }
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

/** True when the name region starts with a stray amount ("half cup milk" after "1"): a number that was not placed. */
function strayAmountAt(text: string, toks: readonly Tok[], a: number): number {
  const t = toks[a];
  if (!(isNumberish(t) || isWord(t))) return -1;
  if (isWord(t) && !amountStartsAt(text, toks, a)) return -1;
  const r = readNumber(toks, a);
  return r && r.next > a ? r.next : -1;
}

export function readNameRegion(region: readonly Tok[], ctx: NameContext, fx: Effects): NameReading {
  const { text } = ctx;
  const flag = () => {
    if (!fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");
  };
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

  // 2. the front. Expected: "of", size words, cooked/raw. Left-overs of a misread amount are taken off and
  //    reported, never kept in the name (CONTRACT §2: the name never holds the amount or unit):
  //    a distributive "each", a stray number or number word ("1 half cup"), a stray unit, an alternative
  //    amount ("2 large or 3 small potatoes"), an article ("1 cup a flour"), a conjunction ("a or b"),
  //    a no-fixed-amount phrase before the food ("1 tsp to taste salt").
  let a = 0;
  let amountUnclear = false;
  if (ctx.dropLeadingOf && isWord(toks[a], "of")) {
    a++;
    // "1/2 of a lemon", "half of an onion": a share of one item — the article is not a stray amount
    if (ctx.hasQuantity && !ctx.unitWritten && isWord(toks[a], "a", "an") && a + 1 < toks.length) a++;
  }
  if (ctx.hasQuantity && ctx.unitWritten && isWord(toks[a], "each")) {
    // "1 tsp each salt and pepper": one amount for several foods — a person must split it
    flag();
    a++;
    if (isSym(toks[a], ":")) a++;
  }
  for (let guard = 0; guard < 12 && a < toks.length; guard++) {
    const t = toks[a];
    if (isWord(t, "or", "to") && amountStartsAt(text, toks, a + 1)) {
      const alt = readAmountPhrase(text, toks, a + 1);
      if (alt && alt.next < toks.length) {
        fx.unassigned++;
        fx.notes.push({ s: t.s, text: textOf(text, toks.slice(a, alt.next)) });
        a = alt.next;
        if (isWord(toks[a], "of")) a++;
        continue;
      }
    }
    if (!ctx.verbatim && ctx.amountRead && !ctx.unitWritten && a + 1 < toks.length) {
      const stray = strayAmountAt(text, toks, a);
      if (stray > a) {
        // "1 half cup milk", "1 cup 3 eggs": a number after the amount — the amount is not clear
        amountUnclear = true;
        fx.unassigned++;
        let e = stray;
        const u = readUnit(text, toks, e);
        if (u) e = u.next;
        fx.notes.push({ s: t.s, text: textOf(text, toks.slice(a, e)) });
        a = e;
        if (isWord(toks[a], "of")) a++;
        continue;
      }
    }
    if (isWord(t) && a + 1 < toks.length) {
      // (with no amount read before the name, only a weight or volume word: "ounces (1 lb) water")
      const u = readUnit(text, toks, a);
      if (u && u.next < toks.length && strayUnitWord(text, u, ctx.unitWritten || !ctx.amountRead) && (ctx.amountRead || u.unit.dimension === "mass" || u.unit.dimension === "volume")) {
        // "2 (1 stick) cups butter", "2-15 oz cans black beans": a unit the amount phrase did not take
        flag();
        fx.notes.push({ s: u.s, text: text.slice(u.s, u.e) });
        a = u.next;
        if (isWord(toks[a], "of")) a++;
        continue;
      }
    }
    const lead = unstatedAt(toks, a);
    if (lead && a + lead.len === toks.length) {
      // the phrase is all there is ("to taste"): no food is named
      fx.unstated.push({ kind: lead.kind, s: t.s, text: textOf(text, toks.slice(a, a + lead.len)), alone: true });
      a += lead.len;
      continue;
    }
    if (lead && a + lead.len < toks.length) {
      flag(); // "1 tsp to taste salt": the phrase sits before the food
      fx.unstated.push({ kind: lead.kind, s: t.s, text: textOf(text, toks.slice(a, a + lead.len)), alone: true });
      a += lead.len;
      continue;
    }
    if (ctx.unitWritten && isWord(t, "heaping", "heaped", "scant", "level", "rounded", "generous", "packed", "loosely", "firmly", "lightly") && a + 1 < toks.length) {
      // "1 cup heaping flour", "1 cup packed brown sugar": how the unit is filled, not the food
      let e = a + 1;
      if (isWord(t, "loosely", "firmly", "lightly") && isWord(toks[e], "packed")) e++;
      if (e > a + 1 || !isWord(t, "loosely", "firmly", "lightly")) {
        fx.notes.push({ s: t.s, text: text.slice(t.s, toks[e - 1].e) });
        a = e;
        continue;
      }
    }
    if (ctx.amountRead && isWord(t) && META_NOUNS.has(t.lower) && a + 1 < toks.length) {
      // "2 servings cooked rice": the number counts servings, not the food — a person checks
      flag();
      fx.notes.push({ s: t.s, text: t.text });
      a++;
      if (isWord(toks[a], "of")) a++;
      continue;
    }
    const bullet = t.kind === "sym" && BULLETS.has(t.text);
    if (bullet || isSym(t, "-", "–", "—", "*", "•", ":", ".", ",", ";", "⁄", "|", "~")) {
      a++; // punctuation before the food
      continue;
    }
    if ((isWord(t) && LEADING_JUNK.has(t.lower)) || isSym(t, "&", "/", "+")) {
      flag();
      a++;
      continue;
    }
    if (isWord(t, "a", "an") && a + 1 < toks.length) {
      flag(); // "1 cup a flour": an article after the amount
      a++;
      continue;
    }
    if (isWord(t, "the") && a + 1 < toks.length) {
      a++;
      continue;
    }
    // (a size word that grades a material inside the product name stays: "small curd cottage cheese", §12.10)
    const size = ctx.sizeWordsAreNotes && !sizeGradesMaterial(toks, a) ? isSizeWordAt(toks, a) : 0;
    if (size > 0) {
      fx.notes.push({ s: t.s, text: text.slice(t.s, toks[a + size - 1].e) });
      a += size;
      if (isWord(toks[a], "of")) a++;
      continue;
    }
    // (a form word that is itself one side of a choice stays: "cooked or canned chickpeas")
    if (isWord(t) && Object.prototype.hasOwnProperty.call(FORM_WORDS, t.lower) && !isWord(toks[a + 1], "or")) {
      fx.form ??= FORM_WORDS[t.lower];
      a++;
      continue;
    }
    break;
  }
  toks = toks.slice(a);

  // 3. the end: "1 cup sugar ~", "1 cup sugar approx." — the amount is approximate
  {
    let e = toks.length;
    if (isSym(toks[e - 1], ".") && e >= 2) e--;
    const last = toks[e - 1];
    if (ctx.hasQuantity && e >= 2 && (isSym(last, "~", "≈") || (isWord(last) && APPROX_WORDS.has(last.lower)))) {
      fx.approximate = true;
      toks = toks.slice(0, e - 1);
    }
  }
  // a trailing remark with no comma ("salt or to taste": the "or" goes with the remark)
  let plusRemark: Tok[] | null = null;
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    const phrase = unstatedAt(toks, i);
    const optionalWord = isWord(t, "optional") && i === toks.length - 1;
    const plus = isWord(t, "plus") || (isSym(t, "+") && i > 0);
    const purpose = isWord(t, "for") && i + 1 < toks.length; // "powdered sugar for icing": a purpose is a note
    const remarkOr = isWord(t, "or") && i + 1 < toks.length && unstatedAt(toks, i + 1) === null && remarkOnly(toks.slice(i + 1)) && !toks.slice(i + 1).some(isNumberish); // "cheese or more"
    if (!phrase && !optionalWord && !plus && !purpose && !remarkOr) continue;
    // "salt or to taste", "flour or as needed": the conjunction joins the phrase to the food and is dropped
    let from = i;
    if (!remarkOr && i > 1 && (isWord(toks[i - 1], "or", "and") || isSym(toks[i - 1], "&"))) from = i - 1;
    const remark = toks.slice(from);
    toks = toks.slice(0, from);
    if (plus) plusRemark = remark;
    else if (remarkOr) fx.notes.push({ s: remark[0].s, text: textOf(text, remark) });
    else classifyPiece(text, phrase && from < i ? remark.slice(1) : remark, fx);
    break;
  }
  // "1 tsp salt and pepper each": a distributive "each" at the end
  if (ctx.hasQuantity && toks.length > 1 && isWord(toks[toks.length - 1], "each")) {
    flag();
    toks = toks.slice(0, -1);
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
    let ownAmount = false;
    const cleaned = parts.map((o) => {
      // an option with its own amount: the amount is a second amount nobody can place
      if (amountStartsAt(text, o, 0)) {
        const amt = readAmountPhrase(text, o, 0);
        if (amt && amt.next < o.length) {
          fx.unassigned++;
          ownAmount = true;
          return isWord(o[amt.next], "of") ? o.slice(amt.next + 1) : o.slice(amt.next);
        }
        if (amt) {
          // an option that is only an amount ("flour or 2 1/4 cups"): an amount nobody can place, no food
          fx.unassigned++;
          fx.notes.push({ s: o[0].s, text: textOf(text, o) });
          return [];
        }
      }
      // an article opening an option is not part of the food ("a lemon or a lime")
      return stopAtNumber(text, isWord(o[0], "a", "an", "the") && o.length > 1 ? o.slice(1) : o, fx);
    });
    // an option that still opens with a number is not clearly a food: an amount nobody can place
    const usable = cleaned.filter((o) => {
      const lead = o.find((t) => t.kind !== "sym");
      if (lead !== undefined && (isNumberish(lead) || !o.some((t) => t.kind === "word")) && !/^\d+(?:\.\d+)?%/.test(text.slice(lead.s))) {
        fx.unassigned++;
        fx.notes.push({ s: o[0].s, text: textOf(text, o) });
        return false;
      }
      // a conjunction, a phrase or a bare unit word is not a food ("onion or plus", "salt or to", "beans or floz")
      if (o.length > 0 && ((isWord(o[0]) && LEADING_JUNK.has(o[0].lower)) || unstatedAt(o, 0) !== null || massOrVolumeWord(text, o, lead))) {
        flag();
        return false;
      }
      return o.length > 0;
    });
    const written = usable.map((o) => nameText(text, o)).filter((x) => x.length > 0);
    // a shared head ("chicken or vegetable broth", "1 tbsp fresh or 1 tsp dried thyme"); never when the
    // earlier option is a whole ingredient or already in the head ("2 cups flour or 1 cup almond flour")
    let texts = distributeOptions(written);
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
    if (!ctx.verbatim) toks = stopAtNumber(text, toks, fx);
  }

  // 7. a counted portion after the food ("3 garlic cloves", "2 celery ribs", "4 lemon wedges")
  let trailingUnit: UnitRead | null = null;
  if (options === null && !ctx.unitWritten && ctx.hasQuantity) {
    trailingUnit = postFoodCountUnit(text, toks);
    if (trailingUnit) toks = toks.slice(0, -1);
  }

  // a conjunction or preposition left at the end ("cream of", "salt and") is not part of the food, and the
  // line looks cut short: a person checks
  // (a lower-case "a" too: "pesto a"; "vitamin A" and "grade A" are written in capitals)
  const DANGLING = ["or", "and", "with", "plus", "nor", "but", "to", "of", "for"];
  const dangling = (t: Tok) => (t.kind === "word" && (DANGLING.includes(t.lower) || t.text === "a")) || isSym(t, "&", "/", "+");
  while (options === null && toks.length > 0 && dangling(toks[toks.length - 1])) {
    toks = toks.slice(0, -1);
    flag();
  }
  // size words after the food ("water small") describe it; size words alone are no food at all ("4 cans medium")
  if (options === null && toks.length > 0) {
    let k = toks.length;
    while (k > 0 && isWord(toks[k - 1]) && (SIZE_WORDS.has((toks[k - 1] as { lower: string }).lower) || isWord(toks[k - 1], "extra"))) k--;
    if (k < toks.length) {
      fx.notes.push({ s: toks[k].s, text: textOf(text, toks.slice(k)) });
      toks = toks.slice(0, k);
    }
  }
  // "optional" alone is the flag, not a name
  if (options === null && toks.length === 1 && isWord(toks[0], "optional")) {
    fx.optional = true;
    toks = [];
  }
  // a weight or volume word alone is a unit, not a food ("ounces -- mL")
  if (options === null && toks.length >= 1 && toks.length <= 3) {
    const u = readUnit(text, toks, 0);
    if (u && u.next === toks.length && (u.unit.dimension === "mass" || u.unit.dimension === "volume")) {
      flag();
      fx.notes.push({ s: u.s, text: text.slice(u.s, u.e) });
      toks = [];
    }
  }
  // a number word that is the whole name ("2 cups one"): an amount nobody can place. Inside a name a number
  // word is part of it ("half and half", "Four seasons pizza").
  const tail = toks[toks.length - 1];
  if (options === null && !ctx.verbatim && toks.length === 1 && isWord(tail) && (Object.prototype.hasOwnProperty.call(CARDINALS, tail.lower) || tail.lower === "half")) {
    fx.unassigned++;
    fx.notes.push({ s: tail.s, text: tail.text });
    toks = toks.slice(0, -1);
  }
  // a count word after the food ("rice one"): kept in the name, but it may be a misplaced amount
  const end = toks[toks.length - 1];
  if (options === null && !ctx.verbatim && toks.length > 1 && isWord(end) && Object.prototype.hasOwnProperty.call(CARDINALS, end.lower) && !isWord(toks[toks.length - 2], "and")) flag();
  // no word left at all ("123456789012"): not a name
  if (options === null && !toks.some((t) => t.kind === "word")) {
    if (toks.some(isNumberish)) {
      fx.unassigned++;
      fx.notes.push({ s: toks[0].s, text: textOf(text, toks) });
    }
    toks = [];
  }
  const name = options === null ? nameText(text, toks) : "";
  const span: [number, number] | null = options === null && toks.length > 0 && name.length > 0 ? [toks[0].s, toks[toks.length - 1].e] : null;
  return { name: name.length > 0 ? name : null, nameSpan: span, options, trailingUnit, plusRemark, amountUnclear };
}

/**
 * COUNT-NOUN RULE (semantic-v2, CONTRACT §12.4): with a bare count, a portion noun written after the food is the unit
 * ("2 celery ribs" → 2 rib, "celery"; "4 lemon wedges" → 4 wedge, "lemon"). Not when the noun is part of the product's
 * identity (PRODUCT_IDENTITY_NOUNS: "fish sticks", "bay leaves", "ice cubes", "whole cloves"), when nothing but
 * describing words would be left before it ("4 whole cloves", "2 large heads"), or when it is not the last word. The
 * caller applies it only when no unit was written and a count was read ("1 cup basil leaves", "lime wedges, to serve"
 * keep the noun).
 */
export function postFoodCountUnit(text: string, toks: readonly Tok[]): UnitRead | null {
  if (toks.length < 2) return null;
  const last = toks[toks.length - 1];
  const prev = toks[toks.length - 2];
  const code = isWord(last) ? unitOfWord(last.text) : null;
  if (code === null || !TRAILING_COUNT_UNITS.has(code) || !isWord(prev)) return null;
  if (PRODUCT_IDENTITY_NOUNS[code]?.has(prev.lower)) return null;
  // the words before it must name a food, not only describe one ("4 whole cloves", "2 fresh sprigs")
  const before = toks.slice(0, -1).filter((t) => t.kind === "word") as { lower: string }[];
  if (!before.some((w) => !REMARK_WORDS.has(w.lower) && !SIZE_WORDS.has(w.lower) && !TRAILING_PREP_WORDS.has(w.lower) && !FUNCTION_WORDS.has(w.lower))) return null;
  return readUnit(text, toks, toks.length - 1);
}

/** The option's first word is a weight or volume unit ("floz precooked", "kg"): no food is named by it. */
function massOrVolumeWord(text: string, o: readonly Tok[], lead: Tok | undefined): boolean {
  if (lead === undefined || !isWord(lead)) return false;
  const u = readUnit(text, o, o.indexOf(lead));
  if (u === null || (u.unit.dimension !== "mass" && u.unit.dimension !== "volume")) return false;
  const written = text.slice(u.s, u.e).toLowerCase().replace(/\.$/, "");
  return written.length > 1 && !UNIT_WORDS_IN_FOOD_NAMES.has(written);
}

/**
 * A unit word that should have been part of the amount: any unit when none was written; after a written
 * unit, only weights, volumes and containers ("2-15 oz cans") — counted portions ("leaf lettuce", "strip
 * steak") may begin a food's name.
 */
function strayUnitWord(text: string, u: UnitRead, unitWritten: boolean): boolean {
  // "1 slice pound cake", "1 cup cup noodles", "1 package gram crackers": after a written unit, a unit word that
  // begins a food name is food. With no unit written yet ("2 (1 stick) cup rolled oats") it is the stray unit.
  const written = text.slice(u.s, u.e).toLowerCase().replace(/\.$/, "");
  if (unitWritten && UNIT_WORDS_IN_FOOD_NAMES.has(written)) return false;
  if (!unitWritten) return u.unit.canonical !== "each";
  return u.unit.dimension === "mass" || u.unit.dimension === "volume" || CONTAINER_UNITS.has(u.unit.canonical);
}

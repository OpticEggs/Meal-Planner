/**
 * semantic-v2 · step 8: the options of a choice of ingredients (CONTRACT §7.8, §12.7).
 *
 * The OPTION-PRESERVATION RULE (`shareOptions`): options are kept one for one, in source order — never dropped,
 * merged or invented. The only words added to an option are words written in the same line that the grammar shares:
 * a trailing head (version words before it, or SHARED_HEAD_MODIFIERS sources of it), a leading product-form word
 * (LEADING_SHARE_WORDS), or the first option's head for an option made only of version words. Options written after
 * the named food ("X, A or B", "X (A or B)") are varieties of it (`varietiesOf`), kinds of a category (`categoryNoun`),
 * or — otherwise — every item of a list. Unlike semantic-v1, no list of foods decides whether a head is shared
 * (semantic-v1's STANDALONE_INGREDIENTS); the lexicons here list modifier words per head, as CONTRACT §12.7 b asks
 * ("whether M1 alone is a product of H's kind").
 *
 * A remark-only option ("or 1 tsp dried") names the same food in another form ("dried thyme").
 */
import { ADJECTIVE_WORDS, AND_COMPOUNDS, CATEGORY_NOUNS, COMPOUND_MODIFIERS, FLAVOUR_HEADS, FORM_CHOICE_WORDS, FUNCTION_WORDS, LEADING_SHARE_WORDS, PART_HEADS, PREP_ADVERBS, REMARK_WORDS, SHARED_HEAD_MODIFIERS, SIZE_WORDS } from "./lexicon";

const LEADING_JUNK_WORDS = FUNCTION_WORDS;
import { foodWord } from "./foods";

const wordsOf = (s: string) => s.split(" ").filter((w) => w.length > 0);
const lower = (s: string) => s.toLowerCase();
const capitalised = (w: string) => /^\p{Lu}/u.test(w);

/**
 * OPTION-PRESERVATION RULE (semantic-v2, CONTRACT §12.7): the options of a choice are returned one for one, in order —
 * never dropped, merged or invented; the only words added are words written in the line and shared by the grammar:
 *  (b)  a shared trailing head — the last option is a modifier then a head (`trailingHeadSplit`: "Dijon | mustard",
 *       "whole wheat | flour", "Yukon Gold | potatoes", "white | wine vinegar") and every earlier option is one
 *       modifier that is not a product of the head's kind by itself: version words ("white or yellow miso", "dark or
 *       milk chocolate", "red, green, or yellow bell pepper") or a source of the head (SHARED_HEAD_MODIFIERS, by source
 *       classes: "lemon or lime juice", "almond or cashew butter", "pork or chicken sausage", "onion or garlic salt");
 *  (c)  a leading product-form/variety/preparation word shared forward to bare foods (LEADING_SHARE_WORDS): "ground
 *       beef or turkey", "dried oregano or thyme", "shredded cheddar or Monterey Jack";
 *  (d)  a later option that is only version words replaces the first option's leading modifier (`afterFirstModifier`):
 *       "whole milk or 2%" → 2% milk, "fresh oregano or dried" → dried oregano, "Yukon Gold potatoes or red" → red
 *       potatoes, "fresh green beans or frozen" → frozen green beans.
 * Anything else stays as written ("kale or Swiss chard", "peas or green beans", "feta or goat cheese", "tea or apple juice").
 */
export function shareOptions(options: readonly string[]): string[] {
  if (options.length < 2) return [...options];
  const ws = options.map(wordsOf);
  const n = options.length;
  const last = ws[n - 1];
  const firsts = ws.slice(0, -1);
  // (b)
  const split = trailingHeadSplit(firsts, last);
  if (split !== null) return options.map((o, k) => (k === n - 1 ? o : `${o} ${split.head}`));
  // (c)
  const first = ws[0];
  let p = 0;
  while (p < first.length - 1 && LEADING_SHARE_WORDS.has(lower(first[p]))) p++;
  if (p >= 1 && ws.slice(1).every(bareFood)) {
    const lead = first.slice(0, p).join(" ");
    return options.map((o, k) => (k === 0 ? o : `${lead} ${o}`));
  }
  // (d)
  const later = ws.slice(1);
  const forms = later.every((o) => o.length > 0 && o.every((w) => FORM_CHOICE_WORDS.has(lower(w))));
  const rest = forms ? afterFormWord(first) : afterFirstModifier(first);
  if (rest !== null && later.every((o) => o.length > 0 && o.every((w) => versionWord(w) || REMARK_WORDS.has(lower(w))))) {
    return options.map((o, k) => (k === 0 ? o : `${o} ${rest}`));
  }
  return [...options];
}

/**
 * (§12.7 b) Where the last option's own modifier ends and the shared head begins, when the earlier options can share it:
 * the modifier is a known compound ("whole wheat", "apple cider", "hot dog" — unless the earlier option makes a compound
 * with the second word too: "red or white wine vinegar" shares "wine vinegar"), a run of capitalised words ("Yukon Gold",
 * "Dijon"), or one word. Every earlier option must be one modifier word (or a capitalised run) that is version words or a
 * source of the head, and must not repeat a word of the head ("flour or almond flour" stays).
 */
function trailingHeadSplit(firsts: readonly string[][], last: readonly string[]): { head: string } | null {
  if (last.length < 2) return null;
  // sources of the last word (a noun before its product, or any food before a part: "apple or white grape juice" shares
  // "juice", "walnut or pecan halves" shares "halves") share that word alone
  const lastWord = lower(last[last.length - 1]);
  const oneWordFood = (o: readonly string[]) => o.length === 1 && !versionWord(o[0]) && lower(o[0]) !== lastWord && !LEADING_JUNK_WORDS.has(lower(o[0]));
  // the longest tail of the last option whose first word has every earlier option as a source ("goat or sheep milk
  // yogurt" shares "milk yogurt", "chamomile or mint tea bags" shares "tea bags", "apple or white grape juice" shares "juice")
  const sourceOf = (o: readonly string[], w: string) => {
    const src = SHARED_HEAD_MODIFIERS[lower(w)];
    return src !== undefined && src.has(lower(o.join(" "))) && !o.every(versionWord);
  };
  for (let k = 1; k < last.length; k++) {
    const tail = last.slice(k);
    if (firsts.every((o) => sourceOf(o, tail[0]) || (tail.length === 1 && PART_HEADS.has(lastWord) && oneWordFood(o)))) return { head: tail.join(" ") };
  }
  let m = 1;
  const pair = `${lower(last[0])} ${lower(last[1] ?? "")}`;
  if (last.length >= 3 && COMPOUND_MODIFIERS.has(pair) && !firsts.every((o) => o.length === 1 && COMPOUND_MODIFIERS.has(`${lower(o[0])} ${lower(last[1])}`))) m = 2;
  else if (capitalised(last[0])) while (m < last.length - 1 && capitalised(last[m])) m++;
  const head = last.slice(m);
  const headLower = head.map(lower);
  const sources = SHARED_HEAD_MODIFIERS[headLower[headLower.length - 1]];
  const shareable = (o: readonly string[]) => {
    if (o.length === 0 || o.some((w) => headLower.includes(lower(w)))) return false;
    const one = o.length === 1 || (o.length <= 3 && o.every(capitalised)) || COMPOUND_MODIFIERS.has(lower(o.join(" ")));
    if (!one) return false;
    return o.every(versionWord) || (sources !== undefined && sources.has(lower(o.join(" "))));
  };
  return firsts.every(shareable) ? { head: head.join(" ") } : null;
}

/**
 * (§12.7 d) For a later option made of form words ("or dried", "or frozen"): the first option after its last leading form
 * word ("fresh | oregano", "chopped fresh | parsley", "fresh | green beans"); null when it has none.
 */
function afterFormWord(first: readonly string[]): string | null {
  let last = -1;
  for (let k = 0; k < first.length - 1 && versionWord(first[k]); k++) if (FORM_CHOICE_WORDS.has(lower(first[k]))) last = k;
  return last >= 0 ? first.slice(last + 1).join(" ") : afterFirstModifier(first);
}

/**
 * (§12.7 d) The first option without its first modifier — one version word, a known compound modifier or a run of
 * capitalised variety words ("fresh | green beans", "whole | milk", "Yukon Gold | potatoes"); null when nothing is left
 * or the option does not open with a modifier.
 */
function afterFirstModifier(first: readonly string[]): string | null {
  if (first.length < 2) return null;
  let m = 0;
  if (COMPOUND_MODIFIERS.has(`${lower(first[0])} ${lower(first[1])}`) && first.length >= 3) m = 2;
  else if (versionWord(first[0])) m = 1;
  else if (capitalised(first[0])) {
    m = 1;
    while (m < first.length - 1 && capitalised(first[m])) m++;
  }
  return m > 0 && m < first.length ? first.slice(m).join(" ") : null;
}

/** Gerunds that name a version of a food ("whipping cream", "baking potatoes", "cooking apples"). */
const VERSION_GERUNDS = new Set(["whipping", "baking", "cooking", "eating", "frying", "roasting", "boiling", "stewing", "pickling", "dipping", "drinking", "sparkling"]);

/** A word that names a version of a food (adjectival, a version gerund, or a remark word such as fresh/frozen/dried). */
export function versionWord(w: string): boolean {
  return adjectival(w) || VERSION_GERUNDS.has(lower(w)) || (REMARK_WORDS.has(lower(w)) && !["more", "less", "so", "taste", "needed", "desired", "optional", "kind", "brand", "type", "variety", "style"].includes(lower(w)));
}

/** A bare food option: one word, or a run of capitalised words ("Monterey Jack"), with no version word of its own. */
function bareFood(o: readonly string[]): boolean {
  if (o.length === 0 || o.some(versionWord)) return false;
  return o.length === 1 || (o.length <= 3 && o.every(capitalised));
}

/** The head of an option without its leading version words ("whole milk" → "milk", "fresh thyme leaves" → "thyme leaves"). */
export function headOf(option: string): string {
  const ws = wordsOf(option);
  let k = 0;
  while (k < ws.length - 1 && versionWord(ws[k])) k++;
  return ws.slice(k).join(" ");
}

/**
 * (§12.7 f) Options written after a comma or in brackets are VARIETIES of the named food when each is version words or
 * a SHARED_HEAD_MODIFIERS word of its head ("broth, chicken or vegetable", "flour, all-purpose or bread", "sugar, white
 * or brown", "oil (vegetable or canola)").
 */
export function varietiesOf(options: readonly string[], base: string): boolean {
  // (the named item must name a food: in "red, green, or yellow bell pepper" the first item is one option of a list)
  if (wordsOf(base).every(versionWord)) return false;
  const head = lower(wordsOf(base).pop() ?? "");
  const sources = SHARED_HEAD_MODIFIERS[head];
  // a capitalised name is a variety of a food that is not a category ("apples, Granny Smith or Honeycrisp"); of a
  // category it is a kind ("cheese, Cheddar or Swiss")
  const named = (ws: readonly string[]) => !categoryNoun(base) && ws.length <= 3 && ws.every(capitalised);
  const variety = (o: string) => {
    const ws = wordsOf(o);
    return ws.length > 0 && (ws.every((w) => versionWord(w) || (sources !== undefined && sources.has(lower(w)))) || (sources !== undefined && sources.has(lower(o))) || named(ws));
  };
  // every option a variety — or one bare version word among them, which cannot be a food by itself ("bread, white or
  // wheat" → white bread, wheat bread)
  return options.length >= 2 && (options.every(variety) || options.some((o) => wordsOf(o).length === 1 && versionWord(o)));
}

/** (§12.7 f) The named food is a category whose kinds are listed ("nuts, pecans or walnuts"). */
export function categoryNoun(base: string): boolean {
  const ws = wordsOf(base);
  return ws.length > 0 && ws.length <= 2 && CATEGORY_NOUNS.has(lower(ws[ws.length - 1]));
}

/** semantic-v1 compatibility name: the options with shared words completed (now `shareOptions`). */
export function distributeOptions(options: readonly string[]): string[] {
  return shareOptions(options);
}

/** A word that describes a version of a food: an adjective, a past participle, an "un-"/"non-" form, an "-ing" compound, a percentage. */
export function adjectival(word: string): boolean {
  const w = lower(word);
  return (
    ADJECTIVE_WORDS.has(w) ||
    (w.length >= 5 && w.endsWith("ed")) ||
    /^(?:un|non)-?\p{L}{3,}/u.test(w) ||
    /\p{L}-\p{L}+ing$/u.test(w) ||
    /^\d+(?:\.\d+)?%$/.test(w)
  );
}

/** A kind placed in a name, after its leading remark words: "cheddar" + "shredded cheese" → "shredded cheddar cheese". */
export function withKind(kind: string, base: string): string {
  const ws = wordsOf(base);
  let k = 0;
  while (k < ws.length - 1 && REMARK_WORDS.has(lower(ws[k]))) k++;
  return [...ws.slice(0, k), kind, ...ws.slice(k)].join(" ");
}

/** The food a name refers to without its leading remark words ("fresh thyme leaves" → "thyme leaves"). */
export function foodHead(name: string): string {
  const ws = wordsOf(name);
  let k = 0;
  while (k < ws.length - 1 && REMARK_WORDS.has(lower(ws[k]))) k++;
  return ws.slice(k).join(" ");
}

/** True when every word of an option is a remark word ("dried", "fresh", "frozen"). */
export function isRemarkOption(option: string): boolean {
  const ws = wordsOf(option);
  return ws.length > 0 && ws.every((w) => REMARK_WORDS.has(lower(w)));
}

/** Unique options, compared case-insensitively, in order. */
export function uniqueOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of options) {
    const k = lower(o);
    if (o.length === 0 || seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  return out;
}

/**
 * FOODS JOINED BY "AND" (semantic-v2, CONTRACT §12.A A4, §12.7 g): a name "A and B" (no comma) names two foods sharing one
 * amount — "strawberries and blueberries", "chopped celery and carrots", "butter and oil", "sesame and flax seeds" — so
 * no single name is privileged and a person splits it. It stays one food when it is a fixed compound (AND_COMPOUNDS: salt
 * and pepper, half and half, macaroni and cheese, sweet and sour, oil and vinegar, pork and beans…), when the words before
 * "and" are only modifiers of one head ("red and yellow bell peppers", "peeled and diced potatoes"), or when the pair
 * names the flavour of a product after it ("salt and vinegar potato chips", "spinach and artichoke dip": FLAVOUR_HEADS).
 */
export function andJoinsTwoFoods(name: string): boolean {
  // ("M&Ms", "A&W": an ampersand between capitals is part of a brand word, not "and")
  const ws = wordsOf(name.replace(/\s*&\s*/g, (m, at: number) => (m === "&" && /\p{Lu}/u.test(name[at - 1] ?? "") && /\p{Lu}/u.test(name[at + 1] ?? "") ? m : " and ")));
  const at = ws.findIndex((w) => lower(w) === "and");
  if (at <= 0 || at >= ws.length - 1) return false;
  const text = ` ${ws.map(lower).join(" ")} `;
  if (AND_COMPOUNDS.some((c) => text.includes(` ${c} `))) return false;
  const left = ws.slice(0, at);
  const right = ws.slice(at + 1);
  const describing = (w: string) => versionWord(w) || SIZE_WORDS.has(lower(w)) || PREP_ADVERBS.has(lower(w));
  if (left.every(describing)) return false; // modifiers of one head
  // ("kosher salt and black pepper": the seasoning pair, however each is described)
  if (lower(left[left.length - 1]) === "salt" && /^pepper(?:corns)?$/.test(lower(right[right.length - 1]))) return false;
  if (right.length >= 2 && FLAVOUR_HEADS.has(lower(right[right.length - 1]))) return false; // a flavour of one product
  // (§12.A A4) two food nouns joined by "and" before one head that is not a part noun name one food by what it is made of
  // or flavoured with: "lemon and lime juice", "black bean and corn salsa", "bacon and cheese pierogies"; a part head
  // ("broccoli and cauliflower florets", "sesame and flax seeds") lists two foods; "onion and bell pepper" is not parallel
  if (right.length >= 2) {
    const head = right[right.length - 1];
    const b = right[right.length - 2];
    const a = left[left.length - 1];
    if (!PART_HEADS.has(lower(head)) && !PART_HEADS.has(lower(head).replace(/s$/, "")) && foodWord(head) && foodWord(a) && foodWord(b) && !describing(a) && !describing(b)) return false;
  }
  return right.some((w) => !describing(w) && lower(w) !== "and");
}

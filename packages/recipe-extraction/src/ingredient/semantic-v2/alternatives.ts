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
import { ADJECTIVE_WORDS, CATEGORY_NOUNS, LEADING_SHARE_WORDS, REMARK_WORDS, SHARED_HEAD_MODIFIERS } from "./lexicon";

const wordsOf = (s: string) => s.split(" ").filter((w) => w.length > 0);
const lower = (s: string) => s.toLowerCase();
const capitalised = (w: string) => /^\p{Lu}/u.test(w);

/**
 * OPTION-PRESERVATION RULE (semantic-v2, CONTRACT §12.7): the options of a choice are returned one for one, in order —
 * never dropped, merged or invented; the only words added are words written in the line and shared by the grammar:
 *  (b1) versions before one head — every earlier option is only version words (adjectives, participles, "un-"/"non-",
 *       %), the last option's leading version words then its head: "white or yellow miso", "fresh or frozen peas", "red
 *       or yellow bell pepper", "1/4 cup red or white wine vinegar";
 *  (b2) sources of the head — every earlier option is a SHARED_HEAD_MODIFIERS word of the last option's head: "lemon or
 *       lime juice", "chicken, beef, or vegetable broth", "hamburger or hot dog buns";
 *  (c)  a leading product-form/variety/preparation word shared forward to bare foods (LEADING_SHARE_WORDS): "ground
 *       beef or turkey", "dried oregano or thyme", "shredded cheddar or Monterey Jack";
 *  (d)  a later option that is only version words takes the first option's head: "whole milk or 2%" → 2% milk, "fresh
 *       thyme or dried" → dried thyme.
 * Anything else stays as written ("kale or Swiss chard", "ham or smoked turkey", "feta or goat cheese").
 */
export function shareOptions(options: readonly string[]): string[] {
  if (options.length < 2) return [...options];
  const ws = options.map(wordsOf);
  const n = options.length;
  const last = ws[n - 1];
  const firsts = ws.slice(0, -1);
  // (b1) — the last option's own modifier is its first word (the rest, "bell pepper", "green beans", is the head)
  if (last.length >= 2 && versionWord(last[0]) && firsts.every((o) => o.length >= 1 && o.every(versionWord))) {
    const head = last.slice(1).join(" ");
    return options.map((o, k) => (k === n - 1 ? o : `${o} ${head}`));
  }
  // (b2)
  if (last.length >= 2) {
    const head = last[last.length - 1];
    const sources = SHARED_HEAD_MODIFIERS[lower(head)];
    if (sources !== undefined && firsts.every((o) => sources.has(lower(o.join(" "))))) return options.map((o, k) => (k === n - 1 ? o : `${o} ${head}`));
  }
  // (c)
  const first = ws[0];
  let p = 0;
  while (p < first.length - 1 && LEADING_SHARE_WORDS.has(lower(first[p]))) p++;
  if (p >= 1 && ws.slice(1).every(bareFood)) {
    const lead = first.slice(0, p).join(" ");
    return options.map((o, k) => (k === 0 ? o : `${lead} ${o}`));
  }
  // (d)
  const head = headOf(options[0]);
  if (head !== options[0] && ws.slice(1).every((o) => o.length > 0 && o.every((w) => versionWord(w) || REMARK_WORDS.has(lower(w))))) {
    return options.map((o, k) => (k === 0 ? o : `${o} ${head}`));
  }
  return [...options];
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
  const head = lower(wordsOf(base).pop() ?? "");
  const sources = SHARED_HEAD_MODIFIERS[head];
  const variety = (o: string) => {
    const ws = wordsOf(o);
    return ws.length > 0 && (ws.every(versionWord) || (sources !== undefined && sources.has(lower(o))));
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

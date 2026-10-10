/**
 * semantic-v1 · step 8: the options of a choice of ingredients (CONTRACT §7.8).
 *
 * Options are kept in source order and as written; a word is never invented, and an option is never
 * dropped. Two grammatical shapes complete elided words:
 *
 *  - options BEFORE one head noun ("chicken or vegetable broth", "Greek or plain yogurt", "red or green
 *    bell pepper", "1 tbsp fresh or 1 tsp dried thyme"): each earlier option is one modifier — a single
 *    word or a run of capitalised words ("Monterey Jack") — and shares the head of the last option, which
 *    is everything after the last option's own modifier. Not shared when the earlier option is a basic
 *    ingredient offered whole (STANDALONE_INGREDIENTS: "butter or olive oil", "honey or maple syrup") or
 *    already a word of that head ("flour or almond flour", "salt or kosher salt").
 *  - options AFTER the named food, in brackets or after a comma ("sugar (granulated or powdered)", "1 onion,
 *    red or white"): versions of that food when they describe it (adjectives, participles, "un-"/"non-"
 *    forms, percentages); the caller decides the other cases (see `versionsOf`).
 *
 * A remark-only option ("or 1 tsp dried") names the same food in another form ("dried thyme").
 */
import { ADJECTIVE_WORDS, REMARK_WORDS, STANDALONE_INGREDIENTS } from "./lexicon";

const wordsOf = (s: string) => s.split(" ").filter((w) => w.length > 0);
const lower = (s: string) => s.toLowerCase();
const capitalised = (w: string) => /^\p{Lu}/u.test(w);

/** One modifier: a single word, or a run of capitalised words ("Monterey Jack"). */
function oneModifier(option: string): boolean {
  const ws = wordsOf(option);
  return ws.length === 1 || (ws.length <= 3 && ws.every(capitalised));
}

/** "chicken or vegetable broth" → ["chicken broth", "vegetable broth"]; otherwise the options unchanged. */
export function distributeOptions(options: readonly string[]): string[] {
  if (options.length < 2) return [...options];
  const last = wordsOf(options[options.length - 1]);
  // the last option's own modifier: its first word, and any capitalised words right after a capitalised first word
  let m = 1;
  if (capitalised(last[0] ?? "")) while (m < last.length - 1 && capitalised(last[m])) m++;
  const head = last.slice(m);
  if (head.length === 0) return [...options];
  const headLower = head.map(lower);
  const firsts = options.slice(0, -1);
  const shareable = firsts.every((o) => oneModifier(o) && !STANDALONE_INGREDIENTS.has(lower(o)) && !wordsOf(o).some((w) => headLower.includes(lower(w))));
  if (!shareable) return [...options];
  const tail = head.join(" ");
  return options.map((o, k) => (k === options.length - 1 ? o : `${o} ${tail}`));
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

export const plural = (w: string) => w.length > 2 && /[^s]s$/i.test(w);
const lastWord = (s: string) => wordsOf(s).pop() ?? "";

/**
 * How options written AFTER a named food relate to it:
 *  - "versions": they describe it ("sugar (granulated or powdered)", "1 onion, red or white", "oats (rolled
 *    or quick-cooking)") — at least one option describes, and every option is at most two words;
 *  - "kinds": in brackets, single singular words beside a singular food ("pasta (penne or rigatoni)" →
 *    penne pasta, rigatoni pasta) — the brackets say which food is meant;
 *  - "members": the options are the food themselves (plural options "(walnuts or pecans)", a plural
 *    food "greens, spinach or kale", "potatoes, russet or Yukon gold", or any other bracketed choice) — the
 *    named food is not added as an option;
 *  - "unsure": after a comma, singular nouns beside a singular food ("cheese, cheddar or Swiss", "milk,
 *    cream or half-and-half"): the grammar does not say whether the food is one of the options.
 */
export function versionsOf(options: readonly string[], base: string, inBrackets: boolean): "versions" | "kinds" | "members" | "unsure" {
  if (options.every((o) => wordsOf(o).length <= 2) && options.some((o) => wordsOf(o).every(adjectival))) return "versions";
  const singles = options.every((o) => wordsOf(o).length === 1 && !plural(o));
  if (inBrackets && singles && !plural(lastWord(base))) return "kinds";
  if (options.every((o) => plural(lastWord(o))) || plural(lastWord(base)) || inBrackets) return "members";
  return "unsure";
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

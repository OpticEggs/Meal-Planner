/**
 * semantic-v1 · step 8: the options of a choice of ingredients (CONTRACT §7.8).
 *
 * Options are kept in source order and as written. One shared rule completes elided words: when every
 * option but the last is a single modifier or kind word (MODIFIER_WORDS) and the last has several, starting
 * with such a word, the single words share the last option's head ("chicken or vegetable broth" → chicken broth, vegetable
 * broth; "red or green bell pepper" → red bell pepper, green bell pepper). A food noun before "or" is not
 * completed ("butter or olive oil", "honey or maple syrup", "cheddar or Monterey Jack cheese" stay as
 * written), nor is a word the last option already holds ("flour or almond flour"). A remark-only option
 * ("or 1 tsp dried") names the same food in another form ("dried thyme").
 */
import { MODIFIER_WORDS, REMARK_WORDS } from "./lexicon";

const wordsOf = (s: string) => s.split(" ").filter((w) => w.length > 0);

/** "chicken or vegetable broth" → ["chicken broth", "vegetable broth"]; otherwise the options unchanged. */
export function distributeOptions(options: readonly string[]): string[] {
  if (options.length < 2) return [...options];
  const last = wordsOf(options[options.length - 1]);
  const lastLower = last.map((w) => w.toLowerCase());
  const firsts = options.slice(0, -1);
  // the last option must itself start with such a word, so that only its head is shared
  const shareable = last.length >= 2 && modifiersOf([...firsts, last[0]]) && firsts.every((o) => !lastLower.includes(o.toLowerCase()));
  if (!shareable) return [...options];
  const tail = last.slice(1).join(" ");
  return options.map((o, k) => (k === options.length - 1 ? o : `${o} ${tail}`));
}

/** True when every option is one modifier or kind word ("red", "fresh", "chicken", "canola", "2%"). */
export function modifiersOf(options: readonly string[]): boolean {
  // a fat percentage is a modifier too ("whole or 2% milk")
  return options.length > 0 && options.every((o) => wordsOf(o).length === 1 && (MODIFIER_WORDS.has(o.toLowerCase()) || /^\d+(?:\.\d+)?%$/.test(o)));
}

/** True when every option is made only of modifier or kind words ("white", "apple cider", "extra-virgin"). */
export function kindPhrases(options: readonly string[]): boolean {
  return options.length > 0 && options.every((o) => wordsOf(o).every((w) => MODIFIER_WORDS.has(w.toLowerCase()) || /^\d+(?:\.\d+)?%$/.test(w)));
}

/** A kind placed in a name, after its leading remark words: "cheddar" + "shredded cheese" → "shredded cheddar cheese". */
export function withKind(kind: string, base: string): string {
  const ws = wordsOf(base);
  let k = 0;
  while (k < ws.length - 1 && REMARK_WORDS.has(ws[k].toLowerCase())) k++;
  return [...ws.slice(0, k), kind, ...ws.slice(k)].join(" ");
}

const plural = (w: string) => w.length > 2 && /[^s]s$/i.test(w);

/**
 * A bracketed list names kinds of the food ("cream (heavy or light)", "oil (vegetable, canola, or peanut)")
 * when its items are modifier words, or single singular words beside a singular food; beside a plural
 * category ("fresh herbs (parsley, cilantro, or basil)", "nuts (walnuts or pecans)") the items are the food.
 */
export function listNamesKinds(items: readonly string[], base: string): boolean {
  if (kindPhrases(items)) return true;
  const last = wordsOf(base).pop() ?? "";
  return items.every((x) => wordsOf(x).length === 1 && !plural(x)) && !plural(last);
}

/** The food a name refers to without its leading remark words ("fresh thyme leaves" → "thyme leaves"). */
export function foodHead(name: string): string {
  const ws = wordsOf(name);
  let k = 0;
  while (k < ws.length - 1 && REMARK_WORDS.has(ws[k].toLowerCase())) k++;
  return ws.slice(k).join(" ");
}

/** True when every word of an option is a remark word ("dried", "fresh", "frozen"). */
export function isRemarkOption(option: string): boolean {
  const ws = wordsOf(option);
  return ws.length > 0 && ws.every((w) => REMARK_WORDS.has(w.toLowerCase()));
}

/** Unique options, compared case-insensitively, in order. */
export function uniqueOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of options) {
    const k = o.toLowerCase();
    if (o.length === 0 || seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  return out;
}

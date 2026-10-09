/**
 * semantic-v1 · step 8: the options of a choice of ingredients (CONTRACT §7.8).
 *
 * Options are kept in source order and as written. One shared rule completes elided words: when every
 * option but the last is a single word and the last has several, the single words are alternative
 * modifiers of the last option's head ("chicken or vegetable broth" → chicken broth, vegetable broth;
 * "red or green bell pepper" → red bell pepper, green bell pepper). Otherwise options are literal
 * ("milk or heavy cream", "ground beef or turkey"). A remark-only option ("or 1 tsp dried") names the
 * same food in another form ("dried thyme").
 */
import { REMARK_WORDS } from "./lexicon";

const wordsOf = (s: string) => s.split(" ").filter((w) => w.length > 0);

/** "chicken or vegetable broth" → ["chicken broth", "vegetable broth"]; otherwise the options unchanged. */
export function distributeOptions(options: readonly string[]): string[] {
  if (options.length < 2) return [...options];
  const last = wordsOf(options[options.length - 1]);
  const shareable = last.length >= 2 && options.slice(0, -1).every((o) => wordsOf(o).length === 1);
  if (!shareable) return [...options];
  const tail = last.slice(1).join(" ");
  return options.map((o, k) => (k === options.length - 1 ? o : `${o} ${tail}`));
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

/**
 * semantic-v1 · step 6: remarks — bracket groups, text after a comma, and trailing phrases.
 *
 * A remark is classified piece by piece (a group's own commas split it again):
 *   price ("$0.16")             → dropped (`price_annotation_removed`)
 *   "optional"                  → `optional`
 *   to taste / as needed / for serving / for garnish / for <…ing> → a "no fixed amount" phrase
 *   "if desired"                → optional, and no fixed amount (as desired)
 *   cooked / raw / uncooked     → `form`
 *   "or …"                      → a note when every option is a sourcing/form/preparation remark
 *                                 ("homemade or store-bought", "fresh or frozen"); otherwise a choice of
 *                                 ingredients ("(or cream)", ", or water") — never silently dropped
 *   anything else               → note text, nested brackets flattened
 */
import type { AmountUnstated } from "../../contract";
import { allWords, hasNumber, isGroup, isSym, isWord, wordsAt, type GroupTok, type Tok } from "./lexer";
import { APPLICATION_GERUNDS, FORM_WORDS, FUNCTION_WORDS, IF_DESIRED, REMARK_WORDS, SIZE_WORDS, UNSTATED_PHRASES } from "./lexicon";
import { amountStartsAt, isPriceGroup, readAmountPhrase } from "./amount";
import { emptyEffects, mergeEffects, type Effects } from "./types";

// --- Text -------------------------------------------------------------------------------------------

/**
 * The text of a token run as written: brackets removed (nested groups flattened), price groups left
 * out, one space wherever the source had a gap, no space before , ; : . ! ?
 */
export function textOf(text: string, toks: readonly Tok[]): string {
  const pieces: string[] = [];
  let prevEnd = -1;
  const walk = (list: readonly Tok[]) => {
    for (const t of list) {
      if (t.kind === "group") {
        if (isPriceGroup(t)) continue;
        prevEnd = Math.max(prevEnd, t.s);
        walk(t.children);
        prevEnd = Math.max(prevEnd, t.e); // a gap after a closing bracket
        continue;
      }
      if (pieces.length > 0 && t.s > prevEnd) pieces.push(" ");
      pieces.push(text.slice(t.s, t.e));
      prevEnd = t.e;
    }
  };
  walk(toks);
  return pieces.join("").replace(/\s+/g, " ").replace(/\s+([,;:.!?])/g, "$1").trim();
}

/** Trims punctuation (not letters, digits, % or a closing quote) from both ends of a name or note. */
export function trimEdges(s: string): string {
  return s.replace(/^[\s,;:.\-–—*•·_/|+&]+/u, "").replace(/[\s,;:\-–—*•·_/|+&]+$/u, "").replace(/(?<![A-Za-z]\.[A-Za-z])\.$/u, "").trim();
}

// --- Phrases ----------------------------------------------------------------------------------------

export interface PhraseMatch {
  kind: AmountUnstated;
  len: number;
  optional: boolean;
}

const FRYING_STYLE = new Set(["deep", "shallow", "pan", "stir"]);

/** A "no fixed amount" phrase starting at token `i` (CONTRACT §7.10), or null. */
export function unstatedAt(toks: readonly Tok[], i: number): PhraseMatch | null {
  for (const [seq, kind] of UNSTATED_PHRASES) if (wordsAt(toks, i, seq)) return { kind, len: seq.length, optional: false };
  if (wordsAt(toks, i, IF_DESIRED)) return { kind: "as_needed", len: 2, optional: true };
  if (isWord(toks[i], "for")) {
    const w1 = toks[i + 1];
    if (isWord(w1) && APPLICATION_GERUNDS.has(w1.lower)) return { kind: "other", len: 2, optional: false };
    const w2 = toks[i + 2];
    if (isWord(w1) && FRYING_STYLE.has(w1.lower) && isWord(w2) && APPLICATION_GERUNDS.has(w2.lower)) return { kind: "other", len: 3, optional: false };
  }
  return null;
}

/** First "no fixed amount" phrase anywhere in the run (top level), or null. */
export function findUnstated(toks: readonly Tok[]): (PhraseMatch & { at: number }) | null {
  for (let i = 0; i < toks.length; i++) {
    const m = unstatedAt(toks, i);
    if (m) return { ...m, at: i };
  }
  return null;
}

// --- Remark classification --------------------------------------------------------------------------

/** Splits a run at top-level commas and semicolons (groups are single tokens, so their commas stay inside). */
export function splitTopLevel(toks: readonly Tok[]): Tok[][] {
  const out: Tok[][] = [[]];
  for (const t of toks) {
    if (isSym(t, ",", ";")) out.push([]);
    else out[out.length - 1].push(t);
  }
  return out;
}

/** Splits a run on the word "or" (and "and/or", and a slash between words); empty options are kept so the caller can refuse them. */
export function splitOr(toks: readonly Tok[]): Tok[][] {
  const out: Tok[][] = [[]];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (isWord(t, "or")) {
      out.push([]);
      continue;
    }
    if (isWord(t, "and") && isSym(toks[i + 1], "/") && isWord(toks[i + 2], "or")) {
      out.push([]);
      i += 2;
      continue;
    }
    // "butter/ghee", "chicken / vegetable stock": a slash between words offers a choice ("w/" means with)
    if (isSym(t, "/") && isWord(toks[i - 1]) && isWord(toks[i + 1]) && !isWord(toks[i - 1], "w") && !isWord(toks[i + 1], "or")) {
      out.push([]);
      continue;
    }
    out[out.length - 1].push(t);
  }
  return out;
}

const REMARK_OPENER = /^(?:such as|like|preferably|ideally|e\.?\s?g\.?|i\.?\s?e\.?|see|i like|i use|we use|you can use|any|your favou?rite|recipe)\b/i;

/** True when every word of the run is remark vocabulary or a function word (no food is named). */
export function remarkOnly(toks: readonly Tok[]): boolean {
  const ws = allWords(toks);
  return ws.length > 0 && ws.every((w) => REMARK_WORDS.has(w) || FUNCTION_WORDS.has(w) || Object.prototype.hasOwnProperty.call(FORM_WORDS, w));
}

/** Leading words that introduce a substitute ("or use vegetable broth"). */
const SUBSTITUTE_LEAD = new Set(["use", "substitute", "try", "even"]);

/**
 * Classifies one remark piece (no top-level commas). A piece that is exactly a flag phrase sets the
 * flag; a choice of ingredients is reported in `effects.options`; everything else is note text.
 */
export function classifyPiece(text: string, piece: readonly Tok[], fx: Effects): void {
  // Brackets inside the piece: a price is dropped; a group that only carries flags or a choice
  // ("(optional)", "(or tamari)") is taken out and applied; any other group stays in the text, flattened.
  const toks: Tok[] = [];
  for (const t of piece) {
    if (!isGroup(t)) {
      toks.push(t);
      continue;
    }
    if (isPriceGroup(t)) {
      if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
      continue;
    }
    if (piece.length === 1) {
      classifyGroup(text, t, fx);
      return;
    }
    const sub = emptyEffects();
    classifyGroup(text, t, sub);
    if (sub.notes.length === 0) {
      mergeEffects(fx, sub);
      continue;
    }
    fx.optional ||= sub.optional;
    fx.form ??= sub.form;
    toks.push(t);
  }
  const bare = dropBarePrices(toks, fx);
  if (bare.length === 0) return;
  const s = bare[0].s;
  const words = bare.filter((t) => t.kind === "word");

  // "optional" (also "optional:" / "optional.")
  if (words.length === 1 && isWord(words[0], "optional", "optionally") && bare.every((t) => t.kind === "word" || isSym(t, ":", ".", "!"))) {
    fx.optional = true;
    return;
  }
  // a phrase that is the whole piece
  const m = unstatedAt(bare, 0);
  if (m && m.len === bare.length) {
    fx.unstated.push({ kind: m.kind, s, text: textOf(text, bare), alone: true });
    if (m.optional) fx.optional = true;
    return;
  }
  // cooked / raw alone
  if (bare.length === 1 && isWord(bare[0]) && Object.prototype.hasOwnProperty.call(FORM_WORDS, bare[0].lower)) {
    fx.form ??= FORM_WORDS[bare[0].lower];
    return;
  }
  const flat = textOf(text, bare);
  // "or": a remark about sourcing/form, or a choice of ingredients
  const options = splitOr(bare);
  if (options.length >= 2 && !REMARK_OPENER.test(flat)) {
    const explicit = options[0].length === 0; // "or cream", "(or 1 cup water)"
    const opts = explicit ? options.slice(1) : options;
    const complete = opts.every((o) => o.length > 0);
    const isRemark = complete && opts.every((o) => remarkOnly(o) && !hasNumber(o));
    const short = opts.every((o) => o.filter((t) => t.kind === "word").length <= 3 && !o.some(isGroup));
    if (complete && !isRemark && (explicit || short)) {
      const read = opts.map((o) => {
        let k = 0;
        while (isWord(o[k]) && SUBSTITUTE_LEAD.has((o[k] as { lower: string }).lower)) k++;
        const amt = amountStartsAt(text, o, k) ? readAmountPhrase(text, o, k) : null;
        let rest = amt ? o.slice(amt.next) : o.slice(k);
        if (isWord(rest[0], "of")) rest = rest.slice(1);
        if (isWord(rest[0], "a", "an", "the") && rest.length > 1) rest = rest.slice(1);
        return { o, amt, rest };
      });
      // "(or 1/2 large)", "(or 2 cups)": another amount of the same food — reported, not a choice of foods
      if (read.every((x) => x.amt !== null && x.rest.every((t) => isWord(t) && SIZE_WORDS.has(t.lower)))) {
        fx.unassigned++;
        fx.notes.push({ s, text: flat });
        return;
      }
      for (const { o, amt, rest } of read) {
        fx.options.push({ text: trimEdges(textOf(text, rest)), s: o[0].s, hasAmount: amt !== null, mode: explicit ? "additional" : "variants", remarkOnly: rest.length > 0 && remarkOnly(rest) });
      }
      return;
    }
  }
  // a longer remark: note text; a phrase inside it still says "no fixed amount" when no amount is stated
  const inner = findUnstated(bare);
  if (inner) {
    fx.unstated.push({ kind: inner.kind, s, text: flat, alone: false });
    if (inner.optional) fx.optional = true;
  }
  fx.notes.push({ s, text: flat });
}

/** Removes bare price annotations ("$0.25", "$1.23*") from a run. */
export function dropBarePrices(toks: readonly Tok[], fx: Effects): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (isSym(t, "$", "€", "£") && toks[i + 1]?.kind === "num") {
      i++;
      while (isSym(toks[i + 1], "*")) i++;
      if (isWord(toks[i + 1], "each")) i++;
      if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
      continue;
    }
    out.push(t);
  }
  return out;
}

/** Classifies a bracket group's content (its own commas split it again). */
export function classifyGroup(text: string, g: GroupTok, fx: Effects): void {
  if (isPriceGroup(g)) {
    if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
    return;
  }
  const pieces = splitTopLevel(g.children).filter((p) => p.length > 0);
  // "(parsley, cilantro, or basil)": a list of foods ending in an "or" option names the choice
  const last = pieces[pieces.length - 1];
  if (pieces.length >= 3 && isWord(last[0], "or") && [...pieces.slice(0, -1), last.slice(1)].every(plainItem)) {
    for (const p of [...pieces.slice(0, -1), last.slice(1)]) {
      const item = isWord(p[0], "a", "an") && p.length > 1 ? p.slice(1) : p;
      fx.options.push({ text: textOf(text, item), s: p[0].s, hasAmount: false, mode: "list", remarkOnly: false });
    }
    return;
  }
  for (const piece of pieces) classifyPiece(text, piece, fx);
}

/** A short run of plain words that is not only remark vocabulary ("cheddar", "a blend", "Monterey Jack"). */
function plainItem(p: readonly Tok[]): boolean {
  return p.length > 0 && p.length <= 3 && p.every((t) => t.kind === "word") && !remarkOnly(p);
}

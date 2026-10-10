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
import { UNIT_REGISTRY, type AmountUnstated } from "../../contract";
import { allWords, hasNumber, isGroup, isSym, isWord, wordsAt, type GroupTok, type Tok } from "./lexer";
import { APPLICATION_GERUNDS, APPROX_WORDS, LEADING_JUNK, PREP_ADVERBS, TRAILING_PREP_WORDS, unitOfWord, FORM_WORDS, FUNCTION_WORDS, IF_DESIRED, REMARK_WORDS, SIZE_WORDS, UNSTATED_PHRASES } from "./lexicon";
import { amountStartsAt, isPriceGroup, readAmountPhrase } from "./amount";
import { readUnit } from "./unit";
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
  return s
    .replace(/^[\s,;:.\-–—*•·_/|+&]+/u, "")
    .replace(/[\s,;:\-–—*•·_/|+&]+$/u, "")
    .replace(/(?:\s*(?:[!?…]|\.{2,}))+$/u, "") // "2 eggs!!", "2 eggs ...": emphasis and trailing dots
    .replace(/(?<![A-Za-z]\.[A-Za-z])\.$/u, "")
    .replace(/[\s,;:\-–—*•·_/|+&]+$/u, "")
    .trim();
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

/**
 * True when every word of the run is remark vocabulary (sourcing, form, state: REMARK_WORDS), a listed
 * preparation word ("minced or pressed": TRAILING_PREP_WORDS) or a function word — no food and no product
 * version is named. Both lists are explicit: any other word ("granulated or powdered", "evaporated or
 * condensed") describes a different product, so an "or" between such words is a choice (CONTRACT §7.8).
 */
export function remarkOnly(toks: readonly Tok[]): boolean {
  const ws = allWords(toks);
  const prep = (w: string) => TRAILING_PREP_WORDS.has(w) || PREP_ADVERBS.has(w);
  const remark = (w: string) => REMARK_WORDS.has(w) && !PRODUCT_CUT_WORDS.has(w);
  return ws.length > 0 && ws.every((w) => remark(w) || FUNCTION_WORDS.has(w) || Object.prototype.hasOwnProperty.call(FORM_WORDS, w) || prep(w));
}

/** Remark words that name a different product when offered as a choice ("boneless or bone-in", "whole or ground"). */
const PRODUCT_CUT_WORDS = new Set(["bone-in", "boneless", "skin-on", "skinless", "whole", "ground", "shelled", "unshelled", "unpeeled"]);

/** Leading words that introduce a substitute ("or use vegetable broth"). */
const SUBSTITUTE_LEAD = new Set(["use", "substitute", "try", "even"]);

/**
 * Classifies one remark piece (no top-level commas). A piece that is exactly a flag phrase sets the
 * flag; a choice of ingredients is reported in `effects.options`; everything else is note text.
 */
export function classifyPiece(text: string, piece: readonly Tok[], fx: Effects): void {
  // Brackets inside the piece: a price is dropped; a group that only carries flags or a choice
  // ("(optional)", "(or tamari)") is taken out and applied after the piece's own words, so options stay in
  // source order ("all-purpose (or bread (or cake))"); any other group stays in the text, flattened.
  const toks: Tok[] = [];
  const later: Effects[] = [];
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
      later.push(sub);
      continue;
    }
    fx.optional ||= sub.optional;
    fx.form ??= sub.form;
    toks.push(t);
  }
  // "all-purpose (or bread (or cake))": one plain word, then only other single words offered with "or" —
  // the same choice written with nested brackets, kept in source order
  const kinds = later.flatMap((e) => e.options);
  const onlyOptions = later.every((e) => e.notes.length === 0 && e.unstated.length === 0 && e.unassigned === 0 && !e.optional && e.form === null);
  if (toks.length === 1 && isWord(toks[0]) && !remarkOnly(toks) && kinds.length > 0 && onlyOptions && kinds.every((o) => o.mode === "additional" && !o.hasAmount && !o.text.includes(" "))) {
    fx.options.push({ text: toks[0].text, s: toks[0].s, hasAmount: false, mode: "list", remarkOnly: false });
    for (const o of kinds) fx.options.push({ ...o, mode: "list" });
    for (const e of later) for (const r of e.reasons) if (!fx.reasons.includes(r)) fx.reasons.push(r);
    return;
  }
  classifyBare(text, toks, fx);
  for (const e of later) mergeEffects(fx, e);
}

function classifyBare(text: string, toks: readonly Tok[], fx: Effects): void {
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
  // "about", "approx.", "roughly": the amount is approximate (CONTRACT §7.11)
  if (words.length === 1 && APPROX_WORDS.has(words[0].lower) && bare.every((t) => t.kind === "word" || isSym(t, ".", "~"))) {
    fx.approximate = true;
    return;
  }
  if (bare.length === 1 && isSym(bare[0], "~")) {
    fx.approximate = true;
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
    // an option that is a phrase or starts with a conjunction ("container/to taste") is not a food
    const junk = opts.some((o) => {
      if (unstatedAt(o, 0) !== null || (isWord(o[0]) && LEADING_JUNK.has(o[0].lower))) return true;
      const u = readUnit(text, o, 0);
      return u !== null && u.next === o.length && u.unit.dimension !== "count"; // "toasted/kg": a unit alone is not a food
    });
    if (complete && !isRemark && !junk && (explicit || short)) {
      const read = opts.map((o) => {
        let k = 0;
        while (isWord(o[k]) && SUBSTITUTE_LEAD.has((o[k] as { lower: string }).lower)) k++;
        const amt = amountStartsAt(text, o, k) ? readAmountPhrase(text, o, k) : null;
        let rest = amt ? o.slice(amt.next) : o.slice(k);
        if (isWord(rest[0], "of")) rest = rest.slice(1);
        // a weight or volume word with no number before the food ("tbl broth") is not part of the food
        const u = amt ? null : readUnit(text, rest, 0);
        if (u && u.next < rest.length && (u.unit.dimension === "mass" || u.unit.dimension === "volume")) {
          if (!fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");
          rest = rest.slice(u.next);
          if (isWord(rest[0], "of")) rest = rest.slice(1);
        }
        if (isWord(rest[0], "a", "an", "the") && rest.length > 1) rest = rest.slice(1);
        return { o, amt, rest };
      });
      // "(or 1/2 large)", "(or 2 cups)": another amount of the same food — reported, not a choice of foods;
      // an option that still starts with a number after its amount is not clearly a food either
      if (read.every((x) => x.amt !== null && x.rest.every((t) => isWord(t) && SIZE_WORDS.has(t.lower))) || read.some((x) => x.rest.length > 0 && (x.rest[0].kind === "num" || x.rest[0].kind === "vulgar") && !isSym(x.rest[1], "%"))) {
        fx.unassigned++;
        fx.notes.push({ s, text: flat });
        return;
      }
      // an option left with no food after its amount or unit ("gm to") is not an option: the remark is a note
      const empty = read.some((x) => x.rest.length === 0 || (isWord(x.rest[0]) && LEADING_JUNK.has(x.rest[0].lower)) || unstatedAt(x.rest, 0) !== null);
      if (empty && !read.every((x) => x.amt !== null)) {
        if (!fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");
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
  // "(parsley, cilantro, or basil)", "(chicken, beef or vegetable)": a list of foods ending in an "or"
  // option names the choice
  const last = pieces[pieces.length - 1];
  const lastParts = last && !isWord(last[0], "or") ? splitOr(last) : [];
  // ("(penne or rigatoni)", "(heavy or light)": a bracket that only offers a choice of plain words is a list too)
  const items =
    pieces.length >= 3 && isWord(last[0], "or") ? [...pieces.slice(0, -1), last.slice(1)]
    : lastParts.length === 2 || (pieces.length === 1 && lastParts.length > 2) ? [...pieces.slice(0, -1), ...lastParts]
    : null;
  // ("(such as cheddar or Gruyère)", "(preferably …)": a remark that gives examples is a note)
  if (items !== null && items.every(plainItem) && !REMARK_OPENER.test(textOf(text, g.children))) {
    for (const p of items) {
      const item = isWord(p[0], "a", "an") && p.length > 1 ? p.slice(1) : p;
      fx.options.push({ text: textOf(text, item), s: p[0].s, hasAmount: false, mode: "list", remarkOnly: false });
    }
    return;
  }
  // a choice written inside brackets is about the named food: mark its versions as a bracketed list
  const sub = emptyEffects();
  for (const piece of pieces) classifyPiece(text, piece, sub);
  for (const o of sub.options) if (o.mode === "variants") o.mode = "list";
  mergeEffects(fx, sub);
}

/** A short run of plain words that is not only remark vocabulary and does not open with a unit ("cheddar", "a blend", "Monterey Jack"). */
function plainItem(p: readonly Tok[]): boolean {
  const unitFirst = p[0] !== undefined && isWord(p[0]) && /^(?:mass|volume)$/.test(dimensionOfWord(p[0].text));
  return p.length > 0 && p.length <= 3 && p.every((t) => t.kind === "word") && !remarkOnly(p) && !unitFirst;
}

function dimensionOfWord(w: string): string {
  const c = unitOfWord(w);
  return c === null ? "" : UNIT_REGISTRY[c].dimension;
}

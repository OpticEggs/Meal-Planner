/**
 * semantic-v2 · step 6: remarks — bracket groups, text after a comma, and trailing phrases.
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
import { REASONS, UNIT_REGISTRY, type AmountUnstated } from "../../contract";
import { allWords, hasNumber, isGroup, isSym, isWord, wordsAt, type GroupTok, type Tok } from "./lexer";
import { ADJECTIVE_WORDS, APPLICATION_GERUNDS, APPROX_WORDS, CARDINALS, EXTRACTED_PART_WORDS, LEADING_JUNK, PART_HEADS, PREP_ADVERBS, REMARK_SOURCE_WORDS, REMARK_STATE_WORDS, TIME_WORDS, TRAILING_PREP_WORDS, unitOfWord, FORM_WORDS, FUNCTION_WORDS, IF_DESIRED, REMARK_WORDS, SIZE_WORDS, UNSTATED_PHRASES } from "./lexicon";
import { amountStartsAt, isPriceGroup, readAmountPhrase } from "./amount";
import { readUnit } from "./unit";
import { emptyEffects, mergeEffects, type AmountReading, type Effects } from "./types";

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

/** Sourcing words: where the food comes from (§7.8, §12.7 f) — an option naming one is about sourcing, not another food. */
const SOURCING_WORDS = new Set(["homemade", "home-made", "store-bought", "storebought", "store-made", "bought", "purchased", "premade", "pre-made", "ready-made", "readymade", "jarred", "bottled", "canned", "boxed", "packaged", "scratch"]);

/** An option that names a sourcing word and otherwise only version words ("low-sodium boxed", "organic store-bought"). */
function sourcingRemark(toks: readonly Tok[]): boolean {
  const ws = allWords(toks);
  return ws.some((w) => SOURCING_WORDS.has(w)) && ws.every((w) => SOURCING_WORDS.has(w) || REMARK_WORDS.has(w) || ADJECTIVE_WORDS.has(w) || FUNCTION_WORDS.has(w) || /^(?:low|reduced|no|un|non)-/.test(w));
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
    // (semantic-v2, §12.7 f) "(or see recipe)", "(or low-sodium boxed)": an option that opens like a remark, or a choice
    // of sourcing (homemade, boxed, jarred…) described only by version words, is a note, not another ingredient
    const isRemark = complete && opts.every((o) => (remarkOnly(o) || REMARK_OPENER.test(textOf(text, o)) || sourcingRemark(o)) && !hasNumber(o));
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
  // (semantic-v2, §12.11, §12.A A3) a remark with an amount is decided once the name is known (`remarkSecondAmount`)
  if (remarkHasAmount(bare)) fx.amountRemarks.push({ s, toks: [...bare] });
  // a longer remark: note text; a phrase inside it still says "no fixed amount" when no amount is stated
  const inner = findUnstated(bare);
  if (inner) {
    fx.unstated.push({ kind: inner.kind, s, text: flat, alone: false });
    if (inner.optional) fx.optional = true;
  }
  fx.notes.push({ s, text: flat });
}

/** The remark states an amount: a number not followed by "%", or "half"/"one"/"two"/"three" ("85% lean" states none). */
export function remarkHasAmount(toks: readonly Tok[]): boolean {
  const flatToks: Tok[] = [];
  const walk = (list: readonly Tok[]) => list.forEach((t) => (isGroup(t) ? walk(t.children) : flatToks.push(t)));
  walk(toks);
  const amountNumber = flatToks.some((t, k) => (t.kind === "num" || t.kind === "vulgar") && !isSym(flatToks[k + 1], "%"));
  return amountNumber || allWords(toks).some((w) => w === "half" || w === "one" || w === "two" || w === "three");
}

/** Singular of a plural noun by its form ("carrots" → "carrot", "tomatoes" → "tomato", "berries" → "berry"). */
const singularOf = (w: string) => (w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/**
 * REMARK SECOND AMOUNT (CONTRACT §12.11): the remark states an amount (a number, or "half"/"one"…) and its own words mark
 * it as the amount of another product, a substitute or another state — "(1 cup dry makes 3 cooked)", "use half for table
 * salt", "(from 1/3 cup dry)", "(about 6 oz uncooked)", "(juice of 1 lime)". A remark that only restates or describes
 * ("about 2 medium", "1 cup chopped", "cut into 6 pieces") is not one. What the remark measures relative to the NAME
 * (an extracted part's whole, another food) is decided by `remarkMeasuresAnother` (§12.A A3).
 */
export function remarkSecondAmount(toks: readonly Tok[]): boolean {
  if (!remarkHasAmount(toks)) return false;
  const ws = allWords(toks);
  if (ws.some((w, k) => EXTRACTED_PART_WORDS.has(w) && ws[k + 1] === "of")) return true; // "(juice of 1 lime)"
  return ws.some((w) => REMARK_SOURCE_WORDS.has(w) || REMARK_STATE_WORDS.has(w));
}

/**
 * REMARK MEASURING ANOTHER THING (CONTRACT §12.A A3): an amount remark — one that opens with its amount ("(1 lime)", "(about
 * 2 cups chopped)", "from 3 ears") — is a second amount when, beside the NAME, it measures
 *  - the source of an extracted part: the name is a juice, zest, peel, pulp, seeds… (EXTRACTED_PART_WORDS) — "2 tbsp lime
 *    juice (1 lime)", "(about 1 lemon)", "1 tbsp zest (from 2 oranges)", with or without a marker word;
 *  - another state the name does not have ("soaked", "rehydrated");
 *  - another food — a word that is neither describing, a unit, nor a word of the name ("(from 2 slices bread)" for
 *    breadcrumbs).
 * Cutting or mashing does not change the food: a count of whole items or a measure of the prepared food restates the
 * amount, with or without "from" ("1 cup chopped onion (1 medium onion)", "1 large onion (about 2 cups chopped)", "2 cups
 * corn kernels (from 3 ears)") — see `remarkRestatement`. A remark that describes with a number ("cut into 6 pieces") is
 * neither.
 */
export function remarkMeasuresAnother(toks: readonly Tok[], name: string | null, text: string): boolean {
  if (!remarkHasAmount(toks) || !opensWithAmount(text, toks)) return false;
  const ws = allWords(toks);
  const nameWs = (name ?? "").toLowerCase().split(/[^\p{L}'-]+/u).filter((w) => w.length > 0);
  if (ws.some((w) => STATE_CHANGE_WORDS.has(w) && !nameWs.includes(w))) return true;
  if (nameWs.some((w) => EXTRACTED_PART_WORDS.has(w))) return true;
  return otherFoodIn(ws, nameWs);
}

/** States a food is brought to before it is measured (§12.A A3: "soaked", "rehydrated"), beside the REMARK_STATE_WORDS. */
const STATE_CHANGE_WORDS = new Set(["dry", "dried", "uncooked", "cooked", "raw", "soaked", "rehydrated", "reconstituted"]);

/** Words that may open an amount remark before its number ("about 1 lemon", "from 3 ears", "made from 1/2 cup dry"). */
const AMOUNT_REMARK_OPENERS = new Set(["about", "approximately", "approx", "roughly", "around", "from", "made", "of", "~"]);

/** The remark opens with an amount, after any AMOUNT_REMARK_OPENERS (a temperature or a time is not an amount). */
function opensWithAmount(text: string, toks: readonly Tok[]): boolean {
  let k = 0;
  while ((isWord(toks[k]) && AMOUNT_REMARK_OPENERS.has((toks[k] as { lower: string }).lower)) || isSym(toks[k], "~", ".")) k++;
  // (a size is not an amount: "2 cm cubes", "1-inch pieces")
  return amountStartsAt(text, toks, k) && readAmountPhrase(text, toks, k)?.quantity != null;
}

/** A word of the remark that names something other than the food: not describing, not a unit or number word, not in the name. */
function otherFoodIn(ws: readonly string[], nameWs: readonly string[]): boolean {
  const names = new Set(nameWs.flatMap((w) => [w, singularOf(w)]));
  return ws.some((w) => {
    if (names.has(w) || names.has(singularOf(w))) return false;
    if (FUNCTION_WORDS.has(w) || APPROX_WORDS.has(w) || SIZE_WORDS.has(w) || REMARK_WORDS.has(w) || ADJECTIVE_WORDS.has(w) || TRAILING_PREP_WORDS.has(w) || PREP_ADVERBS.has(w)) return false;
    // (parts taken whole — kernels, leaves, florets — are the same food, §12.A A3: "3 ears corn (about 2 cups kernels)")
    if (PART_HEADS.has(w) && !EXTRACTED_PART_WORDS.has(w)) return false;
    if (unitOfWord(w) !== null || Object.prototype.hasOwnProperty.call(CARDINALS, w) || TIME_WORDS.has(w) || ["half", "each", "total", "whole", "about", "approximately", "roughly", "around", "x", "made", "times", "count", "ct", "per", "size", "sized"].includes(w)) return false;
    return true;
  });
}

/**
 * The amount a restating remark gives ("(1 medium onion)" → 1, "(about 2 cups chopped)" → 2 cups, "(from 3 ears)" → 3
 * ears): the first amount phrase after any "about"/"from", when the rest of the remark only describes the food. Null when
 * the remark describes something else ("cut into 6 pieces") or states no single amount.
 */
export function remarkRestatement(text: string, toks: readonly Tok[]): { amount: AmountReading; leftover: Tok[] } | null {
  let k = 0;
  while ((isWord(toks[k]) && AMOUNT_REMARK_OPENERS.has((toks[k] as { lower: string }).lower)) || isSym(toks[k], "~")) k++;
  if (!amountStartsAt(text, toks, k)) return null;
  // ("(80/20)", "(90/10)": a lean ratio — two whole numbers that sum to 100 — is a note, never a count, §12.9)
  const [a, slash, b] = [toks[k], toks[k + 1], toks[k + 2]];
  if (a?.kind === "num" && isSym(slash, "/") && b?.kind === "num" && Number(a.text) + Number(b.text) === 100) return null;
  // ("(16/20)", "(21/25 count)": a shrimp count per pound — two numbers of ten or more — is a size designation)
  if (a?.kind === "num" && isSym(slash, "/") && b?.kind === "num" && Number(a.text) >= 10 && Number(b.text) >= 10) return null;
  const amount = readAmountPhrase(text, toks, k);
  if (amount === null || amount.quantity === null || amount.quantity.kind !== "exact" || amount.effects.reasons.some((r) => REASONS[r].class !== "info")) return null;
  const rest = toks.slice(amount.next);
  if (rest.some((t) => !isWord(t) || ["into", "in", "to", "for", "or", "and", "plus"].includes(t.lower))) return null;
  return { amount, leftover: rest };
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

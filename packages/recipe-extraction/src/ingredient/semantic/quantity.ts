/**
 * semantic-v1 · step 3: reading ONE stated number at a token position, exactly.
 *
 * Grammar (spaces as the lexer saw them):
 *   mixed      int ␣ int / int            "1 1/2"   (proper fraction only; "1 3/2" is invalid)
 *   hyphen     int - int / int (no space) "1-1/2"   a mixed number, never a range
 *   and-mixed  int and (int/int | vulgar | a half)  "1 and 1/2"
 *   vulgar     [int[␣]] vulgar            "1⅓", "1 ½", "½"
 *   fraction   int / int                  "1/3", "1⁄2", "1 / 3"
 *   decimal    "1.5", ".5", "0.75"        exact (0.125 = 1/8)
 *   words      a/an/one…twelve, half (a), a quarter, two thirds, one and a half, a dozen, 2 dozen
 * Comma numbers ("1,5", "1,000") are ambiguous; zero is read (the caller refuses it); malformed text
 * ("1/0", "1.2.3", "½½", "1//3") is invalid. Vague words ("a few", "several") are recognised and
 * consumed but never become a number.
 */
import { type ReasonCode } from "../../contract";
import { add, mul, rational, type Rational } from "../../rational";
import { adjacent, isNumberish, isSym, isWord, type NumTok, type Tok } from "./lexer";
import { CARDINALS, FRACTION_SLASHES, FRACTION_WORDS, VAGUE_AMOUNT_WORDS } from "./lexicon";

export type NumberRead =
  | {
      ok: true;
      value: Rational;
      /** The source wrote a decimal point (display as a decimal). */
      decimal: boolean;
      /** The amount was written (at least partly) as a word. */
      word: boolean;
      s: number;
      e: number;
      /** Token index after the number. */
      next: number;
    }
  | { ok: false; reason: ReasonCode; vague: boolean; s: number; e: number; next: number };

const BIG = BigInt;
const TWELVE = rational(BIG(12));
/** Digits beyond these are refused before any arithmetic (the value would be out of bounds anyway). */
const MAX_INT_DIGITS = 15;
const MAX_FRACTION_DIGITS = 12;

function intValue(t: NumTok): Rational | null {
  if (t.form !== "int" || t.text.length > MAX_INT_DIGITS) return null;
  return rational(BIG(t.text));
}

/** Exact value of an int or decimal numeral; null when malformed/ambiguous/too long. */
function numeralValue(t: NumTok): Rational | null {
  if (t.form === "int") return intValue(t);
  if (t.form !== "dec") return null;
  const [whole, frac] = t.text.split(".");
  if (whole.length > MAX_INT_DIGITS || frac.length > MAX_FRACTION_DIGITS) return null;
  return rational(BIG((whole || "0") + frac), BIG(10) ** BIG(frac.length));
}

/** A refused number; the rest of a malformed numeral cluster ("1//3", "1/2/3", "1.2.3") is consumed with it. */
function fail(reason: ReasonCode, toks: readonly Tok[], i: number, next: number, vague = false): NumberRead {
  let n = next;
  if (!vague) {
    while (n < toks.length && adjacent(toks[n - 1], toks[n])) {
      const t = toks[n];
      if (t.kind === "num" || t.kind === "vulgar" || (t.kind === "sym" && (FRACTION_SLASHES.has(t.text) || t.text === "." || t.text === ","))) n++;
      else break;
    }
  }
  return { ok: false, reason, vague, s: toks[i].s, e: toks[Math.max(i, n - 1)].e, next: n };
}

/** An int/int fraction at i (int, slash, int — spaces allowed around the slash). */
function fractionAt(toks: readonly Tok[], i: number): { value: Rational | null; next: number; invalid: boolean } | null {
  const a = toks[i];
  const slash = toks[i + 1];
  if (a?.kind !== "num" || !isSym(slash) || !FRACTION_SLASHES.has(slash.text)) return null;
  const b = toks[i + 2];
  if (b?.kind !== "num") return { value: null, next: i + 2, invalid: true }; // "1/", "1//3"
  const after = toks[i + 3];
  if (isSym(after) && FRACTION_SLASHES.has(after.text) && adjacent(b, after)) return { value: null, next: i + 4, invalid: true }; // "1/2/3"
  const n = intValue(a);
  const d = intValue(b);
  if (n === null || d === null || d.n === BIG(0)) return { value: null, next: i + 3, invalid: true }; // "1/0", "1.5/2"
  return { value: rational(n.n, d.n), next: i + 3, invalid: false };
}

/** "a half", "half", "two thirds", "three quarters", "one-third": [value, tokens used] or null. */
function fractionWords(toks: readonly Tok[], i: number): { value: Rational; next: number } | null {
  const t = toks[i];
  if (!isWord(t)) return null;
  // hyphenated: "one-half", "two-thirds", "three-quarters"
  const parts = t.lower.split(/[-‐‑]/);
  if (parts.length === 2 && Object.prototype.hasOwnProperty.call(CARDINALS, parts[0]) && Object.prototype.hasOwnProperty.call(FRACTION_WORDS, parts[1])) {
    return { value: rational(BIG(CARDINALS[parts[0]]), BIG(FRACTION_WORDS[parts[1]])), next: i + 1 };
  }
  let k = i;
  let numerator = 1;
  if (isWord(toks[k], "a", "an")) k++;
  else if (isWord(toks[k]) && Object.prototype.hasOwnProperty.call(CARDINALS, (toks[k] as { lower: string }).lower) && isWord(toks[k + 1])) {
    const w = (toks[k + 1] as { lower: string }).lower;
    if (Object.prototype.hasOwnProperty.call(FRACTION_WORDS, w)) {
      numerator = CARDINALS[(toks[k] as { lower: string }).lower];
      k++;
    }
  }
  const f = toks[k];
  if (!isWord(f) || !Object.prototype.hasOwnProperty.call(FRACTION_WORDS, f.lower)) return null;
  const d = FRACTION_WORDS[f.lower];
  if (numerator >= d && d !== 2) return null; // "four quarters" is not a reading we offer
  return { value: rational(BIG(numerator), BIG(d)), next: k + 1 };
}

/** "half and half" / "half & half" is the dairy product, not an amount. */
const isHalfAndHalf = (toks: readonly Tok[], i: number) =>
  isWord(toks[i], "half") && (isWord(toks[i + 1], "and") || isSym(toks[i + 1], "&")) && isWord(toks[i + 2], "half");

/** Optional "dozen" after a value: × 12. */
function withDozen(toks: readonly Tok[], r: NumberRead): NumberRead {
  if (!r.ok || !isWord(toks[r.next], "dozen")) return r;
  return { ...r, value: mul(r.value, TWELVE), word: true, decimal: false, e: toks[r.next].e, next: r.next + 1 };
}

/** "and a half" / "and 1/2" / "and ½" after a whole number. */
function andFraction(toks: readonly Tok[], i: number): { value: Rational; next: number } | null {
  if (!isWord(toks[i], "and")) return null;
  const fw = fractionWords(toks, i + 1);
  if (fw && fw.value.n < fw.value.d) return fw;
  const v = toks[i + 1];
  if (v?.kind === "vulgar" && v.n > 0 && v.n < v.d) return { value: rational(BIG(v.n), BIG(v.d)), next: i + 2 };
  const fr = fractionAt(toks, i + 1);
  if (fr && fr.value && fr.value.n < fr.value.d && fr.value.n > BIG(0)) return { value: fr.value, next: fr.next };
  return null;
}

/** Reads one number (numerals or number words) at token `i`, or returns null when none starts there. */
export function readNumber(toks: readonly Tok[], i: number): NumberRead | null {
  const t = toks[i];
  if (t === undefined) return null;

  if (t.kind === "num") {
    if (isSym(toks[i + 1], "%") && adjacent(t, toks[i + 1])) return null; // "2% milk": a percentage, not an amount
    if (t.form === "comma") {
      // "1,5" / "1,000": a decimal comma or a thousands separator — ambiguous. A fraction after it is read past.
      const fr = fractionAt(toks, i);
      return fail("number_format_ambiguous", toks, i, fr ? fr.next : i + 1);
    }
    if (t.form === "malformed") return fail("quantity_invalid", toks, i, i + 1);
    const fr = fractionAt(toks, i);
    if (fr) {
      if (fr.invalid || fr.value === null) return fail("quantity_invalid", toks, i, fr.next);
      return withDozen(toks, { ok: true, value: fr.value, decimal: false, word: false, s: t.s, e: toks[fr.next - 1].e, next: fr.next });
    }
    const whole = numeralValue(t);
    if (whole === null) return fail(t.text.replace(/\D/g, "").length > MAX_INT_DIGITS ? "quantity_implausible" : "quantity_invalid", toks, i, i + 1);
    const nx = toks[i + 1];
    // vulgar right after ("1⅓", "1 ½")
    if (nx?.kind === "vulgar") {
      if (t.form !== "int") return fail("quantity_invalid", toks, i, i + 2); // "1.5½"
      const after = toks[i + 2];
      if (after?.kind === "vulgar" && adjacent(nx, after)) return fail("quantity_invalid", toks, i, i + 3); // "1⅓⅓"
      if (nx.n === 0 || nx.n >= nx.d) return fail("quantity_invalid", toks, i, i + 2);
      const value = add(whole, rational(BIG(nx.n), BIG(nx.d)));
      return withDozen(toks, { ok: true, value, decimal: false, word: false, s: t.s, e: nx.e, next: i + 2 });
    }
    // hyphenated mixed number "1-1/2" (no spaces anywhere)
    if (t.form === "int" && isSym(nx, "-", "‐", "‑") && adjacent(t, nx) && toks[i + 2]?.kind === "num" && adjacent(nx, toks[i + 2])) {
      const fr2 = fractionAt(toks, i + 2);
      if (fr2 && adjacent(toks[i + 2], toks[i + 3]) && adjacent(toks[i + 3], toks[i + 4])) {
        if (fr2.invalid || fr2.value === null) return fail("quantity_invalid", toks, i, fr2.next);
        if (fr2.value.n === BIG(0) || fr2.value.n >= fr2.value.d) return fail("quantity_invalid", toks, i, fr2.next); // "1-3/2"
        return withDozen(toks, { ok: true, value: add(whole, fr2.value), decimal: false, word: false, s: t.s, e: toks[fr2.next - 1].e, next: fr2.next });
      }
    }
    // mixed number "1 1/2" (a space between the whole and the fraction)
    if (t.form === "int" && nx?.kind === "num" && !adjacent(t, nx)) {
      const fr2 = fractionAt(toks, i + 1);
      if (fr2) {
        if (fr2.invalid || fr2.value === null) return fail("quantity_invalid", toks, i, fr2.next); // "1 1/0"
        if (fr2.value.n === BIG(0) || fr2.value.n >= fr2.value.d) return fail("quantity_invalid", toks, i, fr2.next); // "1 3/2"
        return withDozen(toks, { ok: true, value: add(whole, fr2.value), decimal: false, word: false, s: t.s, e: toks[fr2.next - 1].e, next: fr2.next });
      }
    }
    // "1 and 1/2", "1 and a half"
    if (t.form === "int") {
      const af = andFraction(toks, i + 1);
      if (af) return withDozen(toks, { ok: true, value: add(whole, af.value), decimal: false, word: true, s: t.s, e: toks[af.next - 1].e, next: af.next });
    }
    return withDozen(toks, { ok: true, value: whole, decimal: t.form === "dec", word: false, s: t.s, e: t.e, next: i + 1 });
  }

  if (t.kind === "vulgar") {
    const nx = toks[i + 1];
    if (nx?.kind === "vulgar" && adjacent(t, nx)) return fail("quantity_invalid", toks, i, i + 2); // "½½"
    if (isSym(nx) && FRACTION_SLASHES.has(nx.text) && adjacent(t, nx)) return fail("quantity_invalid", toks, i, i + 2);
    return withDozen(toks, { ok: true, value: rational(BIG(t.n), BIG(t.d)), decimal: false, word: false, s: t.s, e: t.e, next: i + 1 });
  }

  if (t.kind !== "word") return null;
  const w = t.lower;
  if (isHalfAndHalf(toks, i)) return null;

  // "a few", "several", "some", "a couple of" — an amount is stated, but no number.
  if ((w === "a" || w === "an") && isWord(toks[i + 1]) && VAGUE_AMOUNT_WORDS.has((toks[i + 1] as { lower: string }).lower)) {
    let next = i + 2;
    if (isWord(toks[next], "of")) next++;
    return fail("quantity_missing", toks, i, next, true);
  }
  if (w === "few" || w === "several" || w === "some" || w === "couple") {
    let next = i + 1;
    if (isWord(toks[next], "of")) next++;
    return fail("quantity_missing", toks, i, next, true);
  }

  // half (a/an/of a) [dozen]
  if (w === "half" && !isNumberish(toks[i + 1])) {
    let next = i + 1;
    if (isWord(toks[next], "of") && isWord(toks[next + 1], "a", "an")) next += 2;
    else if (isWord(toks[next], "a", "an") && !isWord(toks[next + 1], "dozen")) next++;
    else if (isWord(toks[next], "a") && isWord(toks[next + 1], "dozen")) next++; // "half a dozen" → dozen applies below
    return withDozen(toks, { ok: true, value: rational(BIG(1), BIG(2)), decimal: false, word: true, s: t.s, e: toks[next - 1].e, next });
  }

  // fraction words: "a quarter", "a third", "two thirds", "one-half", "a half"
  const fw = fractionWords(toks, i);
  if (fw) {
    let value = fw.value;
    let next = fw.next;
    if (isWord(toks[next], "of") && isWord(toks[next + 1], "a", "an")) next += 2; // "a quarter of a cup"
    return withDozen(toks, { ok: true, value, decimal: false, word: true, s: t.s, e: toks[next - 1].e, next });
  }

  // a / an / one … twelve [and a half] [dozen]
  let base: number | null = null;
  if (w === "a" || w === "an") base = 1;
  else if (Object.prototype.hasOwnProperty.call(CARDINALS, w)) base = CARDINALS[w];
  if (base === null) return null;
  // "a" is an amount only when something follows it
  if (toks[i + 1] === undefined) return null;
  let value = rational(BIG(base));
  let next = i + 1;
  const af = andFraction(toks, next);
  if (af) {
    value = add(value, af.value);
    next = af.next;
  }
  return withDozen(toks, { ok: true, value, decimal: false, word: true, s: t.s, e: toks[next - 1].e, next });
}

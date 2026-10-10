/**
 * semantic-v2 · step 3: reading ONE stated number at a token position, exactly.
 *
 * Grammar (spaces as the lexer saw them):
 *   mixed      int ␣ int / int            "1 1/2"   (proper fraction only; "1 3/2" is invalid)
 *   hyphen     int - int / int (no space) "1-1/2"   a mixed number, never a range
 *   script     int ¹/₂ (glued)            "1¹⁄₂"    superscript/subscript fraction after a whole number
 *   and-mixed  int and (int/int | vulgar | a half)  "1 and 1/2"
 *   vulgar     [int[␣]] vulgar            "1⅓", "1 ½", "½"
 *   fraction   int / int                  "1/3", "1⁄2", "1 / 3"
 *   decimal    "1.5", ".5", "0.75"        exact (0.125 = 1/8)
 *   words      a/an, one … ninety (also "twenty-four"), hundreds and thousands ("a hundred", "two hundred
 *              fifty"), half (a), a quarter, quarter/third before a unit, two thirds, one and a half,
 *              "one-and-a-half", a dozen, a half-dozen, 2 dozen, "1/2-dozen"
 * Refused with an honest reason (no amount is given):
 *   number_format_ambiguous  "1,5", "1,000", "1'000", "1e3", "1 000 g", "1.000", "1.250 g" (a thousands
 *                            separator or a decimal comma?), "11/2", "13/4" (a lost space in "1 1/2"?).
 *                            "2 400 g cans" is a count and a package size, not a thousands group.
 *   quantity_invalid         "1/0", "1.2.3", "½½", "1//3", "1 3/2"
 *   quantity_implausible     more digits than any amount could need
 * Zero is read (the caller refuses it). Vague words ("a few", "several") are recognised and consumed but
 * never become a number.
 */
import { type ReasonCode, UNIT_REGISTRY } from "../../contract";
import { add, mul, rational, type Rational } from "../../rational";
import { adjacent, isNumberish, isSym, isWord, type NumTok, type Tok } from "./lexer";
import { CARDINALS, FRACTION_SLASHES, FRACTION_WORDS, TENS, VAGUE_AMOUNT_WORDS, unitOfWord } from "./lexicon";

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
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

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

/** A refused number; the rest of a malformed numeral cluster ("1//3", "1/2/3", "1.2.3", "1'000") is consumed with it. */
function fail(reason: ReasonCode, toks: readonly Tok[], i: number, next: number, vague = false): NumberRead {
  let n = next;
  if (!vague) {
    while (n < toks.length && adjacent(toks[n - 1], toks[n])) {
      const t = toks[n];
      const glued = t.kind === "num" || t.kind === "vulgar" || (t.kind === "sym" && (FRACTION_SLASHES.has(t.text) || [".", ",", "'", "’"].includes(t.text)));
      const exponent = t.kind === "word" && /^e$/i.test(t.text) && toks[n + 1]?.kind === "num" && adjacent(t, toks[n + 1]);
      if (glued || exponent) n++;
      else break;
    }
  }
  return { ok: false, reason, vague, s: toks[i].s, e: toks[Math.max(i, n - 1)].e, next: n };
}

/**
 * A numeral written in a way that does not tell its value: a decimal comma or thousands separator
 * ("1,5", "1,000", "1'000"), scientific notation ("1e3"), a dot before exactly three digits ending in
 * "00" ("1.000", "1.500": a European thousands separator?), or a whole number followed by a group of
 * three digits ("1 000 g").
 */
function ambiguousFormat(toks: readonly Tok[], i: number): boolean {
  const t = toks[i] as NumTok;
  const nx = toks[i + 1];
  if (t.form === "comma") return true;
  if (isSym(nx, "'", "’") && adjacent(t, nx) && toks[i + 2]?.kind === "num" && adjacent(nx, toks[i + 2])) return true;
  if (isWord(nx) && /^e$/i.test(nx.text) && adjacent(t, nx) && toks[i + 2]?.kind === "num" && adjacent(nx, toks[i + 2])) return true;
  if (t.form === "dec" && /^[1-9]\d{0,2}\.\d00$/.test(t.text)) return true;
  // "1.250 g", "1.750 kg": a dot before exactly three digits, then a metric unit (a European thousands group?)
  if (t.form === "dec" && /^[1-9]\d{0,2}\.\d{3}$/.test(t.text) && isWord(nx) && METRIC_CODES.has(unitOfWord(nx.text) ?? "")) return true;
  if (t.form === "int" && !t.script && nx?.kind === "num" && nx.form === "int" && !nx.script && /^\d{3}$/.test(nx.text) && !adjacent(t, nx) && !(isSym(toks[i + 2]) && FRACTION_SLASHES.has((toks[i + 2] as { text: string }).text))) {
    // "2 400 g cans", "6 150 g salmon fillets": a count, then a package size and the food — not a
    // thousands group ("1 000 g flour" stays ambiguous: a size never starts with 0)
    return !(nx.text[0] !== "0" && packageSizeAt(toks, i + 2));
  }
  return false;
}

const METRIC_CODES = new Set(["mg", "g", "kg", "ml", "dl", "l"]);

/** A weight or volume unit at `k` ("g", "ml", "fl oz") with a word after it: the number before it is a package size. */
function packageSizeAt(toks: readonly Tok[], k: number): boolean {
  let u = toks[k];
  if (isWord(u) && /^(?:fl|fluid)$/i.test(u.text)) {
    k += isSym(toks[k + 1], ".") ? 2 : 1;
    u = toks[k];
  }
  if (!isWord(u)) return false;
  const code = unitOfWord(u.text);
  if (code === null || (UNIT_REGISTRY[code].dimension !== "mass" && UNIT_REGISTRY[code].dimension !== "volume")) return false;
  const after = isSym(toks[k + 1], ".") ? toks[k + 2] : toks[k + 1];
  return isWord(after);
}

/** An int/int fraction at i (int, slash, int — spaces allowed around the slash). */
function fractionAt(toks: readonly Tok[], i: number): { value: Rational | null; next: number; invalid: boolean; n: string; d: string } | null {
  const a = toks[i];
  const slash = toks[i + 1];
  if (a?.kind !== "num" || !isSym(slash) || !FRACTION_SLASHES.has(slash.text)) return null;
  const b = toks[i + 2];
  if (b?.kind !== "num") return { value: null, next: i + 2, invalid: true, n: a.text, d: "" }; // "1/", "1//3"
  const after = toks[i + 3];
  if (isSym(after) && FRACTION_SLASHES.has(after.text) && adjacent(b, after)) return { value: null, next: i + 4, invalid: true, n: a.text, d: b.text }; // "1/2/3"
  const n = intValue(a);
  const d = intValue(b);
  if (n === null || d === null || d.n === BIG(0)) return { value: null, next: i + 3, invalid: true, n: a.text, d: b.text }; // "1/0", "1.5/2"
  return { value: rational(n.n, d.n), next: i + 3, invalid: false, n: a.text, d: b.text };
}

/**
 * "11/2", "13/4", "21/2": an improper fraction whose numerator's last digit makes a proper fraction
 * with the denominator — most likely "1 1/2" with the space lost. Ambiguous, never read as 5 1/2.
 */
function lostSpace(n: string, d: string): boolean {
  if (n.length < 2 || !/^\d+$/.test(n) || !/^\d+$/.test(d)) return false;
  const last = Number(n[n.length - 1]);
  const den = Number(d);
  return Number(n) > den && last >= 1 && last < den;
}

// --- Number words -------------------------------------------------------------------------------------

interface Part {
  w: string;
  /** Index of the token the word came from (a hyphenated token gives several parts). */
  ti: number;
}

const NUMBER_PARTS = new Set(["a", "an", "and", "of", "dozen", "hundred", "thousand", ...Object.keys(CARDINALS), ...Object.keys(FRACTION_WORDS)]);

/**
 * Word parts from token i on: a hyphenated token whose every part is a number word ("one-and-a-half",
 * "two-thirds", "half-dozen", "twenty-four") is split into its parts; any other word is one part.
 */
function wordParts(toks: readonly Tok[], i: number): Part[] {
  const out: Part[] = [];
  for (let k = i; k < toks.length && out.length < 12; k++) {
    const t = toks[k];
    if (!isWord(t)) break;
    const pieces = t.lower.split(/[-‐‑]/);
    const numeric = pieces.length > 1 && pieces.every((p) => NUMBER_PARTS.has(p)) && t.lower !== "half-and-half";
    if (numeric) for (const p of pieces) out.push({ w: p, ti: k });
    else out.push({ w: t.lower, ti: k });
  }
  return out;
}

/** A cardinal below one hundred at parts[p]: "seven", "twenty", "twenty four"; [value, next] or null. */
function smallCardinalAt(ws: readonly Part[], p: number): [number, number] | null {
  const w = ws[p]?.w;
  if (w === undefined || !hasOwn(CARDINALS, w)) return null;
  const v = CARDINALS[w];
  const u = ws[p + 1]?.w;
  if (TENS.has(w) && u !== undefined && hasOwn(CARDINALS, u) && CARDINALS[u] < 10) return [v + CARDINALS[u], p + 2];
  return [v, p + 1];
}

/**
 * "hundred" / "thousand" after a count ("one hundred", "two hundred fifty", "three thousand"): the count
 * multiplied, plus an optional smaller cardinal ("and fifty"). [value, next].
 */
function scaled(ws: readonly Part[], v: number, p: number): [number, number] {
  for (const [word, factor] of [["thousand", 1000], ["hundred", 100]] as const) {
    if (ws[p]?.w !== word) continue;
    v *= factor;
    p++;
    const q = ws[p]?.w === "and" ? p + 1 : p;
    const rest = smallCardinalAt(ws, q);
    if (rest && rest[0] < factor) {
      v += rest[0];
      p = rest[1];
    }
  }
  return [v, p];
}

/**
 * A cardinal at parts[p]: "seven", "twenty four", "one hundred", "two hundred fifty" (CONTRACT §7.1 lists
 * one … twelve; the teens, tens, hundreds and thousands are read the same way). [value, next] or null.
 */
function cardinalAt(ws: readonly Part[], p: number): [number, number] | null {
  const c = smallCardinalAt(ws, p);
  if (c === null) return null;
  return scaled(ws, c[0], c[1]);
}

/** "a half", "one third", "two thirds", "three quarters": [value, next] or null. */
function fractionPhraseAt(ws: readonly Part[], p: number): [Rational, number] | null {
  const w = ws[p]?.w;
  let num = 0;
  let q = p;
  if (w === "a" || w === "an") {
    num = 1;
    q++;
  } else {
    const c = cardinalAt(ws, p);
    if (c === null) return null;
    [num, q] = c;
  }
  const f = ws[q]?.w;
  if (f === undefined || !hasOwn(FRACTION_WORDS, f)) return null;
  const d = FRACTION_WORDS[f];
  if (num >= d && d !== 2) return null; // "four quarters" is not a reading we offer
  return [rational(BIG(num), BIG(d)), q + 1];
}

/**
 * A number written in words, over word parts: [one … ninety | a | an] [and a half] [dozen],
 * half [of] [a|an] [dozen], a half/third/quarter [of a], two thirds, three quarters.
 */
function wordNumber(ws: readonly Part[]): { value: Rational; used: number } | null {
  if (ws.length === 0) return null;
  const w0 = ws[0].w;
  let value: Rational;
  let p: number;
  if (w0 === "half") {
    if (ws[1]?.w === "and" && ws[2]?.w === "half") return null; // half and half (the dairy product)
    value = rational(BIG(1), BIG(2));
    p = 1;
    if (ws[p]?.w === "of" && (ws[p + 1]?.w === "a" || ws[p + 1]?.w === "an")) p += 2;
    else if ((ws[p]?.w === "a" || ws[p]?.w === "an") && ws[p + 1]?.w !== "dozen") p++;
    else if (ws[p]?.w === "a" && ws[p + 1]?.w === "dozen") p++;
  } else {
    const fr = fractionPhraseAt(ws, 0);
    if (fr) {
      [value, p] = fr;
      if (ws[p]?.w === "of" && (ws[p + 1]?.w === "a" || ws[p + 1]?.w === "an")) p += 2; // "a quarter of a cup"
    } else if ((w0 === "a" || w0 === "an") && (ws[1]?.w === "hundred" || ws[1]?.w === "thousand")) {
      // "a hundred grams", "a thousand"
      const [v, q] = scaled(ws, 1, 1);
      value = rational(BIG(v));
      p = q;
    } else if (w0 === "a" || w0 === "an") {
      value = rational(BIG(1));
      p = 1;
    } else if ((w0 === "quarter" || w0 === "third") && ws.length > 1) {
      // "quarter cup sugar", "third cup oil": a fraction word with no article (the caller checks a unit follows)
      value = rational(BIG(1), BIG(FRACTION_WORDS[w0]));
      p = 1;
      if (ws[p]?.w === "of" && (ws[p + 1]?.w === "a" || ws[p + 1]?.w === "an")) p += 2;
    } else {
      const c = cardinalAt(ws, 0);
      if (c === null) return null;
      value = rational(BIG(c[0]));
      p = c[1];
    }
    // "one and a half", "two and a quarter"
    if (ws[p]?.w === "and") {
      const f = fractionPhraseAt(ws, p + 1);
      if (f && f[0].n < f[0].d) {
        value = add(value, f[0]);
        p = f[1];
      }
    }
  }
  if (ws[p]?.w === "dozen") {
    value = mul(value, TWELVE);
    p++;
  }
  return { value, used: p };
}

/** "and a half" / "and 1/2" / "and ½" after a whole number (or after a unit: "1 cup and a half"). */
export function andFraction(toks: readonly Tok[], i: number): { value: Rational; next: number } | null {
  if (!isWord(toks[i], "and")) return null;
  const ws = wordParts(toks, i + 1);
  const f = fractionPhraseAt(ws, 0);
  if (f && f[0].n < f[0].d && (f[1] === ws.length || ws[f[1]].ti > ws[f[1] - 1].ti)) return { value: f[0], next: ws[f[1] - 1].ti + 1 };
  const v = toks[i + 1];
  if (v?.kind === "vulgar" && v.n > 0 && v.n < v.d) return { value: rational(BIG(v.n), BIG(v.d)), next: i + 2 };
  const fr = fractionAt(toks, i + 1);
  if (fr && fr.value && fr.value.n < fr.value.d && fr.value.n > BIG(0)) return { value: fr.value, next: fr.next };
  return null;
}

/** Optional "dozen" after a numeral: × 12 ("2 dozen", "1/2 dozen", "1/2-dozen"). */
function withDozen(toks: readonly Tok[], r: NumberRead): NumberRead {
  if (!r.ok) return r;
  let d = r.next;
  if (isSym(toks[d], "-", "‐", "‑") && adjacent(toks[d - 1], toks[d]) && isWord(toks[d + 1], "dozen") && adjacent(toks[d], toks[d + 1])) d++;
  if (!isWord(toks[d], "dozen")) return r;
  return { ...r, value: mul(r.value, TWELVE), word: true, decimal: false, e: toks[d].e, next: d + 1 };
}

// --- The reader -------------------------------------------------------------------------------------

/** Reads one number (numerals or number words) at token `i`, or returns null when none starts there. */
export function readNumber(toks: readonly Tok[], i: number): NumberRead | null {
  const t = toks[i];
  if (t === undefined) return null;

  if (t.kind === "num") {
    if (isSym(toks[i + 1], "%") && adjacent(t, toks[i + 1])) return null; // "2% milk": a percentage, not an amount
    if (t.script === "sub") return null; // a subscript digit never starts an amount
    if (ambiguousFormat(toks, i)) {
      const fr = fractionAt(toks, i);
      const groupNext = toks[i + 1]?.kind === "num" && !adjacent(t, toks[i + 1]) ? i + 2 : i + 1;
      return fail("number_format_ambiguous", toks, i, fr ? fr.next : groupNext);
    }
    if (t.form === "malformed") return fail("quantity_invalid", toks, i, i + 1);
    const fr = fractionAt(toks, i);
    if (fr) {
      if (fr.invalid || fr.value === null) return fail("quantity_invalid", toks, i, fr.next);
      if (lostSpace(fr.n, fr.d)) return fail("number_format_ambiguous", toks, i, fr.next);
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
    // superscript fraction glued to a whole number ("1¹⁄₂", "2²/₃"), or a mixed number "1 1/2"
    const scriptFraction = nx?.kind === "num" && nx.script === "super" && adjacent(t, nx);
    if (t.form === "int" && nx?.kind === "num" && (scriptFraction || !adjacent(t, nx))) {
      const fr2 = fractionAt(toks, i + 1);
      if (fr2) {
        if (fr2.invalid || fr2.value === null) return fail("quantity_invalid", toks, i, fr2.next); // "1 1/0"
        if (fr2.value.n === BIG(0) || fr2.value.n >= fr2.value.d) return fail("quantity_invalid", toks, i, fr2.next); // "1 3/2"
        return withDozen(toks, { ok: true, value: add(whole, fr2.value), decimal: false, word: false, s: t.s, e: toks[fr2.next - 1].e, next: fr2.next });
      }
      if (scriptFraction) return fail("quantity_invalid", toks, i, i + 2); // "1²" — a power, not an amount
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

  // "half and half", "half & half": the dairy product, not an amount
  if (w === "half" && (isWord(toks[i + 1], "and") || isSym(toks[i + 1], "&")) && isWord(toks[i + 2], "half")) return null;
  // "quarter" / "third" without an article is an amount only before a unit ("quarter cup", "third cup")
  if ((w === "quarter" || w === "third") && !(isWord(toks[i + 1]) && (unitOfWord((toks[i + 1] as { text: string }).text) !== null || isWord(toks[i + 1], "of")))) return null;

  const ws = wordParts(toks, i);
  const r = wordNumber(ws);
  if (r === null || r.used === 0) return null;
  // the words read must end at a token boundary (never half of a hyphenated word)
  const lastTi = ws[r.used - 1].ti;
  if (r.used < ws.length && ws[r.used].ti === lastTi) return null;
  const next = lastTi + 1;
  // "a" (and a lone cardinal) is an amount only when something follows it
  if (toks[next] === undefined && (ws[0].w === "a" || ws[0].w === "an") && r.used === 1) return null;
  return withDozen(toks, { ok: true, value: r.value, decimal: false, word: true, s: t.s, e: toks[lastTi].e, next });
}

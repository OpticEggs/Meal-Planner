/**
 * semantic-v2 · step 5: the amount phrase — quantity, range, unit, package size, compound amounts and
 * restatements (CONTRACT §7.1–§7.5).
 *
 *   [about|~] [heaping|scant…] NUMBER [(-|–|to|or) NUMBER]
 *       [ "(15 oz)" | "15-oz" | "x 400 g" ]            package size written before the unit (per item)
 *       [size words] [UNIT]
 *       [(to|-) NUMBER UNIT]                             range with the unit repeated
 *       [(plus|+|and)? NUMBER UNIT]*                     compound, same dimension → summed exactly
 *       [ "(120 g)" | "/ 240 ml" | "(15 oz each)" ]*     restatement → equivalents, or a container's contents
 *
 * Nothing is converted between mass and volume, a package size is never multiplied in, and a second
 * amount that is neither a sum, a range, a package size nor a restatement is reported
 * (`quantity_unassigned`), never guessed.
 */
import { UNIT_REGISTRY, type EquivalentV1, type ExactQuantity, type QuantityV1, type ReasonCode, type UnitV1 } from "../../contract";
import { add, cmp, div, fromDecimalString, fromExactQuantity, mul, rational, toExactQuantity, type Rational } from "../../rational";
import { adjacent, isGroup, isSym, isWord, type GroupTok, type Tok } from "./lexer";
import {
  APPROX_SYMBOLS, APPROX_WORDS, BOUND_PHRASES, CARDINALS, CONTAINER_UNITS, FORM_WORDS, FRACTION_WORDS, FUNCTION_WORDS, LENGTH_WORDS, MEASURE_ADJECTIVES,
  RANGE_DASHES, REMARK_WORDS, SIZE_WORDS, TIME_WORDS, UNKNOWN_MEASURES,
} from "./lexicon";
import { andFraction, readNumber, type NumberRead } from "./quantity";
import { emptyEffects, type AmountReading, type Effects } from "./types";
import { readUnit, type UnitRead } from "./unit";

const isMassOrVolume = (u: UnitV1) => u.dimension === "mass" || u.dimension === "volume";
const hyphen = (t: Tok | undefined) => isSym(t, "-", "‐", "‑");
const LEADING_MEASURE = new Set(["heaping", "heaped", "scant", "generous", "good", "level", "rounded", "full"]);
/** Measurement systems named beside a unit; all but US change the size of a cup, pint, quart, gallon or spoon. */
const SYSTEM_WORDS = new Set(["us", "u.s", "american", "uk", "imperial", "british", "australian", "aus", "metric", "canadian"]);
const OTHER_SYSTEM_WORDS = new Set(["uk", "imperial", "british", "australian", "aus", "metric", "canadian"]);
/** US customary volume units whose size differs in other systems. */
const US_VOLUME = new Set(["tsp", "tbsp", "fl_oz", "cup", "pint", "quart", "gallon"]);

function exactOf(value: Rational, decimal: boolean): ExactQuantity | null {
  return toExactQuantity(value, decimal ? "decimal" : "fraction");
}

/** Reason for a value that cannot be carried: zero, or beyond the contract's bounds. */
const outOfBoundsReason = (value: Rational): ReasonCode => (value.n === BigInt(0) ? "quantity_not_positive" : "quantity_implausible");

// --- Stated amounts ("15 oz", "14.5-ounce", "about 1 lb", "15 oz each") -----------------------------

export interface StatedAmount {
  value: Rational;
  decimal: boolean;
  unit: UnitV1;
  /** Span of the unit word(s). */
  unitSpan: [number, number];
  s: number;
  e: number;
  next: number;
  each: boolean;
  total: boolean;
  approx: boolean;
}

/** [about] NUMBER [-] UNIT [each | total | in total | combined], exact numbers only. */
export function readStatedAmount(text: string, toks: readonly Tok[], i: number): StatedAmount | null {
  let j = i;
  let approx = false;
  while ((isWord(toks[j]) && APPROX_WORDS.has((toks[j] as { lower: string }).lower)) || (isSym(toks[j]) && APPROX_SYMBOLS.has((toks[j] as { text: string }).text))) {
    approx = true;
    j++;
    if (isSym(toks[j], ".") && adjacent(toks[j - 1], toks[j])) j++;
  }
  const n = readNumber(toks, j);
  if (!n || !n.ok) return null;
  let k = n.next;
  if (hyphen(toks[k]) && adjacent(toks[k - 1], toks[k])) k++;
  const u = readUnit(text, toks, k);
  if (!u) return null;
  k = u.next;
  let each = false;
  let total = false;
  if (isWord(toks[k], "each", "apiece")) {
    each = true;
    k++;
  } else if (isWord(toks[k], "total", "combined")) {
    total = true;
    k++;
  } else if (isWord(toks[k], "in") && isWord(toks[k + 1], "total")) {
    total = true;
    k += 2;
  }
  return { value: n.value, decimal: n.decimal, unit: u.unit, unitSpan: [u.s, u.e], s: toks[j].s, e: toks[k - 1].e, next: k, each, total, approx };
}

/** The stated amount a bracket group consists of, exactly and only ("(15 oz)", "(about 1 lb)"), or null. */
export function groupAmount(text: string, g: GroupTok): StatedAmount | null {
  const all = groupAmounts(text, g);
  return all && all.length === 1 ? all[0] : null;
}

/** Restatements a bracket group consists of: one stated amount, or several joined by "/", ",", ";" or "=" ("(900 g / 32 oz)"). */
export function groupAmounts(text: string, g: GroupTok): StatedAmount[] | null {
  const out: StatedAmount[] = [];
  let k = 0;
  const c = g.children;
  for (let guard = 0; guard < 8; guard++) {
    const sa = readStatedAmount(text, c, k) === null ? null : compoundAt(text, c, k) ?? readStatedAmount(text, c, k);
    if (!sa) return null;
    out.push(sa);
    k = sa.next;
    if (k === c.length) return out;
    if (!isSym(c[k], "/", ",", ";", "=")) return null;
    k++;
  }
  return null;
}

/** A compound restatement ("1lb 2oz") read as one stated amount in its smallest unit, or null. */
function compoundAt(text: string, toks: readonly Tok[], i: number): StatedAmount | null {
  const first = readStatedAmount(text, toks, i);
  if (!first || first.each || first.total || !isMassOrVolume(first.unit)) return null;
  const parts = [{ value: first.value, unit: first.unit, sa: first }];
  let k = first.next;
  for (let guard = 0; guard < 3; guard++) {
    let c = k;
    if (isWord(toks[c], "plus", "and") || isSym(toks[c], "+")) c++;
    const nx = readStatedAmount(text, toks, c);
    if (!nx || nx.unit.dimension !== first.unit.dimension || nx.unit.canonical === parts[parts.length - 1].unit.canonical) break;
    parts.push({ value: nx.value, unit: nx.unit, sa: nx });
    k = nx.next;
  }
  if (parts.length < 2) return null;
  const sum = sumInSmallest(parts);
  if (!sum) return null;
  const smallest = parts.find((p) => p.unit.canonical === sum.unit.canonical)!.sa;
  return { ...smallest, value: sum.value, decimal: false, s: first.s, e: toks[k - 1].e, next: k, each: false, total: false };
}

/** A price annotation: "($0.16)", "($1.23*)", "( $0.02 )", "(about $1)", "($0.25 each)". */
export function isPriceGroup(g: GroupTok): boolean {
  const c = g.children.filter((t) => !isSym(t, "*"));
  let k = 0;
  while (isWord(c[k]) && APPROX_WORDS.has((c[k] as { lower: string }).lower)) k++;
  if (!isSym(c[k], "$", "€", "£")) return false;
  k++;
  if (c[k]?.kind !== "num") return false;
  k++;
  if (isWord(c[k], "each")) k++;
  else if (isWord(c[k], "per") && isWord(c[k + 1])) k += 2;
  return k === c.length;
}

// --- Placing a second amount ----------------------------------------------------------------------

export interface Secondary {
  sa: StatedAmount;
  /** "between": written between the count and what is counted ("2 (15 oz) cans"); "after": after the unit or the name. */
  position: "between" | "after";
}

/** Mutable target of `placeSecondary`. */
export interface AmountSlots {
  quantity: QuantityV1 | null;
  unit: UnitV1 | null;
  packageSize: { quantity: ExactQuantity; unit: UnitV1 } | null;
  packageSpan: [number, number] | null;
  equivalents: EquivalentV1[];
  effects: Effects;
}

/** The exact value of a contract quantity in the dimension's base unit, or null (count/imprecise units have no base). */
function inBase(q: ExactQuantity, u: UnitV1): Rational | null {
  const b = UNIT_REGISTRY[u.canonical].base;
  const r = fromExactQuantity(q);
  return b === null || r === null ? null : mul(r, fromDecimalString(b)!);
}

/** The measurement system of a weight or volume unit: metric, or US customary (avoirdupois and US liquid). */
const METRIC = new Set(["mg", "g", "kg", "ml", "dl", "l"]);
const systemOf = (u: UnitV1): "metric" | "us" => (METRIC.has(u.canonical) ? "metric" : "us");

/**
 * The largest relative difference accepted between an amount and its restatement in the OTHER measurement
 * system (metric ↔ US customary): 1/8 (12.5 %). Recipes round across systems ("1 cup (240 ml)" is 1.4 % off,
 * "1 lb (450 g)" 0.8 %, "1 lb (500 g)" 9.3 %, "4 cups (1 liter)" 5.4 %). Within one system the sizes are
 * definitional (16 oz to the pound, 16 tbsp to the cup, 1000 g to the kilogram), so a restatement there must
 * be exact (CONTRACT §5): "1 lb (15 oz)", "1 cup (14 tbsp)", "1 quart (3 1/2 cups)" are contradictions.
 * Exact arithmetic on the definitional sizes of UNIT_REGISTRY; mass and volume are never compared.
 */
export const RESTATEMENT_TOLERANCE: Rational = { n: BigInt(1), d: BigInt(8) };

/** true / false when two amounts of the same dimension can be compared; null when they cannot (count, imprecise, mass vs volume). */
export function sameAmount(a: ExactQuantity, ua: UnitV1, b: ExactQuantity, ub: UnitV1): boolean | null {
  if (ua.dimension !== ub.dimension) return null;
  if (ua.canonical === ub.canonical) return a.numerator === b.numerator && a.denominator === b.denominator;
  const x = inBase(a, ua);
  const y = inBase(b, ub);
  if (x === null || y === null) return null;
  if (systemOf(ua) === systemOf(ub)) return cmp(x, y) === 0;
  const big = cmp(x, y) >= 0 ? x : y;
  const small = big === x ? y : x;
  // (big - small) / big ≤ tolerance  ⇔  big - small ≤ tolerance · big
  const diff = { n: big.n * small.d - small.n * big.d, d: big.d * small.d };
  return cmp(diff, mul(RESTATEMENT_TOLERANCE, big)) <= 0;
}

/**
 * Decides what a second stated amount is, given the line's main amount:
 *  - an imprecise size ("9-inch") → note;
 *  - main counted (can, clove, bare count): written between count and item, after a container, or with
 *    "each" → the item's contents (`packageSize`); otherwise ("2 chicken breasts (about 1 lb)") → `equivalents`;
 *  - otherwise a restatement (`equivalents`, CONTRACT §2/§11: mass, volume or count — "1/2 cup (1 stick)");
 *  - a restatement in the same dimension must agree with the amount (RESTATEMENT_TOLERANCE); one that does
 *    not ("1 lb (12 oz)") is a second amount nobody can place (`quantity_unassigned`).
 */
export function placeSecondary(text: string, slots: AmountSlots, sec: Secondary): void {
  const { sa } = sec;
  const fx = slots.effects;
  if (sa.unit.dimension === "imprecise") {
    fx.notes.push({ s: sa.s, text: text.slice(sa.s, sa.e) });
    return;
  }
  const q = exactOf(sa.value, sa.decimal);
  if (q === null) {
    fx.unassigned++;
    return;
  }
  const main = slots.unit;
  const counted = main === null || main.dimension === "count";
  const asPackage = isMassOrVolume(sa.unit) && counted && !sa.total && (sec.position === "between" || sa.each || (main !== null && CONTAINER_UNITS.has(main.canonical)));
  if (asPackage) {
    if (slots.packageSize === null) {
      slots.packageSize = { quantity: q, unit: sa.unit };
      slots.packageSpan = [sa.s, sa.e];
      if (!fx.reasons.includes("package_size_stated")) fx.reasons.push("package_size_stated");
      return;
    }
    // the contents restated ("2 (15 oz) cans (425 g)") restate the package, not the amount: nothing new to
    // store; contents that disagree are a second amount nobody can place
    const agrees = sameAmount(slots.packageSize.quantity, slots.packageSize.unit, q, sa.unit);
    if (agrees === false) {
      fx.unassigned++;
      return;
    }
    if (agrees === true) return;
    // in another dimension ("1 (12 oz) package frozen peas (about 2 cups)"): with one package the contents
    // are the amount; with several, per package or in all? (a person decides)
    const one = slots.quantity?.kind === "exact" && slots.quantity.numerator === slots.quantity.denominator;
    if (!one) {
      fx.notes.push({ s: sa.s, text: text.slice(sa.s, sa.e) });
      fx.unassigned++;
      return;
    }
  } else if (main !== null && slots.quantity?.kind === "exact" && sameAmount(slots.quantity, main, q, sa.unit) === false) {
    fx.unassigned++; // "1 lb (12 oz)", "1 cup (8 tbsp)": not a restatement
    return;
  }
  if (main !== null && main.canonical === sa.unit.canonical) return; // the same amount written twice
  if (slots.equivalents.some((x) => x.unit.canonical === sa.unit.canonical)) {
    fx.unassigned++;
    return;
  }
  slots.equivalents.push({ quantity: q, unit: sa.unit });
  if (!fx.reasons.includes("equivalent_quantity_stated")) fx.reasons.push("equivalent_quantity_stated");
}

/**
 * True when an amount clearly starts at `i`: a numeral, a vulgar fraction, a cardinal word or "half" —
 * or "a"/"an" before a unit, a size word, "dozen" or a fraction word ("a pinch", "a large", "a dozen").
 * Used where an article is more likely just an article ("or a blend", "olive oil, a drizzle").
 */
export function amountStartsAt(text: string, toks: readonly Tok[], i: number): boolean {
  const t = toks[i];
  if (t === undefined) return false;
  if (t.kind === "num" || t.kind === "vulgar") return true;
  if (!isWord(t)) return false;
  if (Object.prototype.hasOwnProperty.call(CARDINALS, t.lower) || t.lower === "half") return readNumber(toks, i) !== null;
  if ((t.lower === "quarter" || t.lower === "third") && readNumber(toks, i) !== null) return true;
  if (t.lower !== "a" && t.lower !== "an") return false;
  let k = i + 1;
  while (isWord(toks[k]) && (SIZE_WORDS.has((toks[k] as { lower: string }).lower) || MEASURE_ADJECTIVES.has((toks[k] as { lower: string }).lower))) k++;
  const w = toks[k];
  if (w?.kind === "num" || w?.kind === "vulgar" || readUnit(text, toks, k) !== null) return true;
  return isWord(w) && (w.lower === "dozen" || Object.prototype.hasOwnProperty.call(FRACTION_WORDS, w.lower));
}

// --- The amount phrase ----------------------------------------------------------------------------

const isRangeSep = (t: Tok | undefined) => (isSym(t) && RANGE_DASHES.has(t.text)) || isWord(t, "to", "or");

/** A range's second end must be written as a numeral or a cardinal word ("1 or 2", "2 to three"), never "a". */
function rangeEnd(toks: readonly Tok[], k: number): NumberRead | null {
  const t = toks[k];
  if (t === undefined) return null;
  const numeric = t.kind === "num" || t.kind === "vulgar" || (t.kind === "word" && Object.prototype.hasOwnProperty.call(CARDINALS, t.lower));
  return numeric ? readNumber(toks, k) : null;
}

const base = (u: UnitV1): Rational => fromDecimalString(UNIT_REGISTRY[u.canonical].base as string)!;

interface Part {
  value: Rational;
  decimal: boolean;
  unit: UnitRead;
}

/** A between-position size and how it was written: in brackets, hyphenated ("15-oz") or after "x" (marked), or bare ("3 4 cups"). */
interface Between {
  sec: Secondary;
  marked: boolean;
}

/** The note-able text of a bracket group with no number in it, when only remark words are inside ("(heaping)", "(US)"). */
function remarkGroup(g: GroupTok): boolean {
  return g.children.length > 0 && g.children.every((t) => t.kind === "word" || isSym(t, ".", "-", ",", "&"));
}

/** Reads the amount phrase starting at token `i`; null when no number (or number word) starts there. */
export function readAmountPhrase(text: string, toks: readonly Tok[], i: number): AmountReading | null {
  const fx = emptyEffects();
  let j = i;
  let approximate = false;
  for (let guard = 0; guard < 8; guard++) {
    const t = toks[j];
    const afterPeriod = isSym(toks[j + 1], ".") && adjacent(t, toks[j + 1]) ? j + 2 : j + 1;
    if (isWord(t) && APPROX_WORDS.has(t.lower) && readNumber(toks, afterPeriod)) {
      approximate = true;
      j = afterPeriod;
    } else if (isSym(t) && APPROX_SYMBOLS.has(t.text) && readNumber(toks, j + 1)) {
      approximate = true;
      j++;
    } else if (isWord(t) && LEADING_MEASURE.has(t.lower) && readNumber(toks, j + 1)) {
      fx.notes.push({ s: t.s, text: t.text });
      j++;
    } else break;
  }
  // "up to 1 cup", "at least 2 cups": an open-ended amount — no single amount is stated
  let bound: number | null = null;
  for (const seq of BOUND_PHRASES) {
    if (seq.every((w, q) => isWord(toks[j + q], w)) && readNumber(toks, j + seq.length)) {
      bound = toks[j].s;
      j += seq.length;
      break;
    }
  }
  // "a 1/2 cup sugar": an article before a written amount is not a count ("a 15-oz can" and "a 15 oz can" are)
  if (isWord(toks[j], "a", "an") && (toks[j + 1]?.kind === "num" || toks[j + 1]?.kind === "vulgar")) {
    const n = readNumber(toks, j + 1);
    const sa = readStatedAmount(text, toks, j + 1);
    const hyphenated = n !== null && hyphen(toks[n.next]) && adjacent(toks[n.next - 1], toks[n.next]);
    const container = sa !== null && readUnit(text, toks, sa.next)?.unit.dimension === "count";
    // (only a fraction: "a 1/2 cup sugar" is half a cup, but "a 3 lb chicken" is one chicken of 3 lb)
    const fraction = n !== null && n.ok && cmp(n.value, rational(BigInt(1))) < 0;
    if (sa !== null && !hyphenated && !container && fraction) j++;
  }
  const article = isWord(toks[j], "a", "an");
  const n1 = readNumber(toks, j);
  if (!n1) return null;
  if (isTemperatureOrTime(toks, n1.next)) return null; // "350°F", "10 minutes" are not amounts

  let qStart = n1.s;
  let qEnd = n1.e;
  let k = n1.next;
  // "2. cups": a stray period right after a whole number
  if (n1.ok && isSym(toks[k], ".") && adjacent(toks[k - 1], toks[k]) && !adjacent(toks[k], toks[k + 1])) k++;
  let max: NumberRead | null = null;
  if (!n1.ok) fx.reasons.push(n1.reason);
  if (isRangeSep(toks[k])) {
    const n2 = rangeEnd(toks, k + 1);
    if (n2) {
      max = n2;
      qEnd = n2.e;
      k = n2.next;
      if (!n2.ok && !fx.reasons.includes(n2.reason)) fx.reasons.push(n2.reason);
    }
  }

  const slots: AmountSlots = { quantity: null, unit: null, packageSize: null, packageSpan: null, equivalents: [], effects: fx };
  const between: Between[] = [];
  /** Something unexpected sat between the amount and its unit ("1 (15) oz can"): the amount is not clear. */
  let irregular = false;
  /** A non-US measurement system was named for the unit ("1 (UK) pint", "1 imperial gallon"). */
  let otherSystem = false;

  // Package sizes, size descriptors and remarks written before the unit.
  for (let guard = 0; guard < 6; guard++) {
    const t = toks[k];
    if (isGroup(t)) {
      if (isPriceGroup(t)) {
        if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
        k++;
        continue;
      }
      // "2 (or 3) cups", "2 (to 3) cups": the other end of a range, in brackets (CONTRACT §7.2)
      if (n1.ok && max === null && between.length === 0 && isRangeSep(t.children[0])) {
        const n2 = rangeEnd(t.children, 1);
        if (n2 && n2.next === t.children.length) {
          max = n2;
          qEnd = t.e;
          if (!n2.ok && !fx.reasons.includes(n2.reason)) fx.reasons.push(n2.reason);
          k++;
          continue;
        }
      }
      const sa = groupAmount(text, t);
      if (sa && (isMassOrVolume(sa.unit) || sa.unit.dimension === "imprecise")) {
        between.push({ sec: { sa, position: "between" }, marked: true });
        k++;
        continue;
      }
      // "1 (15) oz can": a bare number in brackets, then a unit — a size written irregularly
      const bare = readNumber(t.children, 0);
      const u = bare && bare.ok && bare.next === t.children.length ? readUnit(text, toks, k + 1) : null;
      if (bare && bare.ok && u && isMassOrVolume(u.unit)) {
        const size: StatedAmount = { value: bare.value, decimal: bare.decimal, unit: u.unit, unitSpan: [u.s, u.e], s: t.s, e: u.e, next: u.next, each: false, total: false, approx: false };
        between.push({ sec: { sa: size, position: "between" }, marked: true });
        irregular = true;
        k = u.next;
        continue;
      }
      if (bare && bare.next === t.children.length && n1.ok) {
        // "1 (1/2) cup milk": a second number before the unit — not clearly one amount
        irregular = true;
        fx.notes.push({ s: t.s, text: text.slice(t.innerS, t.innerE) });
        fx.unassigned++;
        k++;
        continue;
      }
      // "2 (heaping) cups", "1 (US) cup", "2 (large) cans": a remark between the amount and its unit
      if (remarkGroup(t)) {
        let a = k + 1;
        while (isWord(toks[a]) && (MEASURE_ADJECTIVES.has((toks[a] as { lower: string }).lower) || SIZE_WORDS.has((toks[a] as { lower: string }).lower))) a++;
        if (readUnit(text, toks, a) || (isWord(toks[a]) && UNKNOWN_MEASURES.has((toks[a] as { lower: string }).lower))) {
          const words = t.children.filter((c) => c.kind === "word") as { lower: string }[];
          if (words.some((w) => OTHER_SYSTEM_WORDS.has(w.lower))) otherSystem = true;
          if (words.length === 1 && APPROX_WORDS.has(words[0].lower)) approximate = true;
          else fx.notes.push({ s: t.s, text: text.slice(t.innerS, t.innerE).trim() });
          k++;
          continue;
        }
      }
      break;
    }
    if (isWord(t, "by") && n1.ok && max === null && between.length === 0) {
      // "9 by 13 inch pan"
      const dims = dimensionsEnd(text, toks, k);
      if (dims > k) return sizeOnly(text, toks, fx, n1.s, dims, approximate);
    }
    if ((isWord(t, "x") || isSym(t, "×")) && n1.ok && max === null) {
      // "9x13 inch pan", "9 x 13\" dish", "13x9 pan": dimensions are a size, never an amount
      const dims = dimensionsEnd(text, toks, k);
      if (dims > k && between.length === 0) return sizeOnly(text, toks, fx, n1.s, dims, approximate);
      const sa = readStatedAmount(text, toks, k + 1);
      if (sa && isMassOrVolume(sa.unit)) {
        between.push({ sec: { sa, position: "between" }, marked: true });
        k = sa.next;
        continue;
      }
      break;
    }
    if (t?.kind === "num" && n1.ok && max === null && isSym(toks[k + 1], '"', "″", "”") && adjacent(t, toks[k + 1])) {
      fx.notes.push({ s: t.s, text: text.slice(t.s, toks[k + 1].e) }); // '2 9" pie crusts': a size of what is counted
      k += 2;
      continue;
    }
    if (t?.kind === "num" && n1.ok && max === null) {
      const sa = readStatedAmount(text, toks, k);
      if (sa && (isMassOrVolume(sa.unit) || sa.unit.canonical === "inch")) {
        const n = readNumber(toks, k);
        // marked: hyphenated ("1 15-oz can"), or after an article ("a 3 lb chicken": one, of 3 lb)
        const marked = article || (n !== null && hyphen(toks[n.next]) && adjacent(toks[n.next - 1], toks[n.next]));
        between.push({ sec: { sa, position: "between" }, marked });
        k = sa.next;
        continue;
      }
      break;
    }
    break;
  }

  // "16-ounce", "15-oz": a unit joined to the number by a hyphen.
  if (hyphen(toks[k]) && adjacent(toks[k - 1], toks[k]) && adjacent(toks[k], toks[k + 1]) && readUnit(text, toks, k + 1)) k++;

  // "2 cm piece ginger": a length is a size, not an amount of anything bought.
  // '12" pizza crust', "9″ pie crust": an inch mark after the number is a size
  if (n1.ok && between.length === 0 && isSym(toks[k], '"', "″", "”", "“") && adjacent(toks[k - 1], toks[k])) return sizeOnly(text, toks, fx, n1.s, k + 1, approximate);
  const lengthWord = toks[k];
  if (n1.ok && between.length === 0 && isWord(lengthWord) && LENGTH_WORDS.has(lengthWord.lower)) {
    let c = k + 1;
    if (isSym(toks[c], ".") && adjacent(toks[c - 1], toks[c])) c++;
    return sizeOnly(text, toks, fx, n1.s, c, approximate);
  }

  // Size and measure adjectives (also "thumb-sized"), then the unit ("1/2 of a cup" too).
  let a = k;
  const sizeLike = (t: Tok | undefined) =>
    isWord(t) && (MEASURE_ADJECTIVES.has(t.lower) || SIZE_WORDS.has(t.lower) || t.lower === "extra" || /-sized?$/.test(t.lower) || SYSTEM_WORDS.has(t.lower));
  while (sizeLike(toks[a])) a++;
  // ("1 UK pint": a measurement-system word before the unit is read with it)
  if (a > k && !readUnit(text, toks, a) && toks.slice(k, a).some((t) => isWord(t) && SYSTEM_WORDS.has(t.lower))) a = k;
  if (toks.slice(k, a).some((t) => isWord(t) && OTHER_SYSTEM_WORDS.has(t.lower))) otherSystem = true;
  let unitRead = readUnit(text, toks, a);
  if (!unitRead && a === k && isWord(toks[k], "of") && isWord(toks[k + 1], "a", "an") && n1.ok) {
    const u = readUnit(text, toks, k + 2);
    if (u) {
      unitRead = u;
      a = k + 2;
    }
  }
  if (unitRead && a > k && !isWord(toks[k], "of")) {
    fx.notes.push({ s: toks[k].s, text: text.slice(toks[k].s, toks[a - 1].e) });
  }
  if (unitRead) k = unitRead.next;
  // "1 pint (UK) milk": the system written right after the unit
  const afterUnit = toks[k];
  if (unitRead && isGroup(afterUnit) && afterUnit.children.length === 1 && isWord(afterUnit.children[0]) && OTHER_SYSTEM_WORDS.has(afterUnit.children[0].lower)) otherSystem = true;
  // A UK, imperial, Australian or metric pint/cup/… is not the US size of UNIT_REGISTRY: a person checks
  if (unitRead && otherSystem && US_VOLUME.has(unitRead.unit.canonical) && !fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");

  // An inch is a size ("9-inch pie crust", "12 inch pizza crust", "1-inch piece ginger"), never an amount bought.
  if (unitRead && unitRead.unit.canonical === "inch" && between.length === 0) return sizeOnly(text, toks, fx, n1.s, k, approximate);

  // "400 g tin", "16-ounce package": a size followed by its container. The size is the container's
  // contents; how many containers is not stated, so no quantity is given.
  if (unitRead && n1.ok && max === null && between.length === 0 && n1.value.n > BigInt(0)) {
    const c = readUnit(text, toks, k);
    if (c && c.unit.dimension === "count" && CONTAINER_UNITS.has(c.unit.canonical) && isMassOrVolume(unitRead.unit)) {
      const size: StatedAmount = {
        value: n1.value, decimal: n1.decimal, unit: unitRead.unit, unitSpan: [unitRead.s, unitRead.e], s: n1.s, e: unitRead.e, next: c.next, each: false, total: false, approx: false,
      };
      fx.reasons.push("quantity_missing");
      const slots0: AmountSlots = { quantity: null, unit: c.unit, packageSize: null, packageSpan: null, equivalents: [], effects: fx };
      placeSecondary(text, slots0, { sa: size, position: "between" });
      return {
        quantity: null, quantitySpan: null, amountWritten: true, unit: c.unit, unitSpan: [c.s, c.e], packageSize: slots0.packageSize, packageSpan: slots0.packageSpan,
        packageProvisional: null, equivalents: [], approximate, fromWord: false, effects: fx, next: c.next,
      };
    }
  }

  // "a drizzle of olive oil", "2 rashers bacon", "1 dsp sugar", "1 leg of lamb": a measure word that is not
  // a registry unit. The amount cannot be carried without its unit: it is kept in the note, not invented.
  if (!unitRead && n1.ok && max === null && between.length === 0) {
    // (after any measure adjectives: "2 heaping spoonfuls sugar")
    const w = toks[a];
    const known = isWord(w) && UNKNOWN_MEASURES.has(w.lower);
    const beforeOf = a === k && isWord(w) && isWord(toks[k + 1], "of") && toks[k + 2] !== undefined && !isWord(toks[k + 2], "the") && isPlainNoun(w.lower);
    if (known || beforeOf) {
      let c = a + 1;
      if (isSym(toks[c], ".") && adjacent(toks[c - 1], toks[c])) c++;
      // (a bracketed remark before it is already a note of its own: "2 (heaping) spoonfuls")
      const measure = k > n1.next ? `${text.slice(n1.s, n1.e)} ${text.slice(toks[k].s, toks[c - 1].e)}` : text.slice(n1.s, toks[c - 1].e);
      fx.notes.push({ s: n1.s, text: measure });
      fx.reasons.push("unit_unknown");
      if (isWord(toks[c], "of")) c++;
      return {
        quantity: null, quantitySpan: null, amountWritten: true, unit: null, unitSpan: null, packageSize: null, packageSpan: null, packageProvisional: null,
        equivalents: [], approximate, fromWord: false, effects: fx, next: c,
      };
    }
  }

  let v1 = n1.ok ? n1.value : null;
  if (unitRead && v1 !== null && max === null) {
    // "a cup and a half", "1 cup and a half": the fraction belongs to the amount (not "1 cup and 1/2 tbsp")
    const af = andFraction(toks, k);
    if (af && !readUnit(text, toks, af.next)) {
      v1 = add(v1, af.value);
      qEnd = toks[af.next - 1].e;
      k = af.next;
    }
    // "2 cans or jars", "2 cans/jars": a choice of container — read, but a person decides
    if ((isWord(toks[k], "or") || isSym(toks[k], "/")) && isWord(toks[k + 1])) {
      const alt = readUnit(text, toks, k + 1);
      if (alt && !readNumber(toks, k + 1)) {
        fx.notes.push({ s: toks[k].s, text: text.slice(toks[k].s, alt.e) });
        if (!fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");
        k = alt.next;
      }
    }
  }

  const parts: Part[] = [];
  if (unitRead && v1 !== null) parts.push({ value: v1, decimal: n1.ok && n1.decimal, unit: unitRead });

  if (unitRead) {
    // Range with the unit repeated: "1 cup to 1 1/2 cups".
    if (max === null && v1 !== null && isRangeSep(toks[k])) {
      const n2 = rangeEnd(toks, k + 1);
      const u2 = n2 && n2.ok ? readUnit(text, toks, n2.next) : null;
      if (n2 && u2 && u2.unit.canonical === unitRead.unit.canonical) {
        max = n2;
        qEnd = u2.e;
        k = u2.next;
      }
    }
    // Compound: "1 lb 4 oz", "1 cup plus 2 tbsp", "2 tbsp + 1 tsp".
    if (max === null && v1 !== null && isMassOrVolume(unitRead.unit)) {
      for (let guard = 0; guard < 4; guard++) {
        let c = k;
        let connector = false;
        if (isWord(toks[c], "plus", "and") || isSym(toks[c], "+", "&")) {
          connector = true;
          c++;
        }
        const t = toks[c];
        if (!(t?.kind === "num" || t?.kind === "vulgar")) break;
        const n2 = readNumber(toks, c);
        if (!n2 || !n2.ok) break;
        const u2 = readUnit(text, toks, n2.next);
        const last = parts[parts.length - 1].unit.unit;
        if (!u2 || u2.unit.dimension !== unitRead.unit.dimension || u2.unit.canonical === last.canonical) break;
        if (!connector && cmp(base(u2.unit), base(last)) >= 0) break;
        parts.push({ value: n2.value, decimal: n2.decimal, unit: u2 });
        qEnd = u2.e;
        k = u2.next;
      }
    }
  }

  // The main quantity.
  let quantity: QuantityV1 | null = null;
  let unit: UnitV1 | null = unitRead ? unitRead.unit : null;
  let unitSpan: [number, number] | null = unitRead ? [unitRead.s, unitRead.e] : null;
  if (max !== null) {
    if (n1.ok && max.ok) {
      const lo = exactOf(n1.value, n1.decimal);
      const hi = exactOf(max.value, max.decimal);
      if (lo === null) fx.reasons.push(outOfBoundsReason(n1.value));
      else if (hi === null) fx.reasons.push(outOfBoundsReason(max.value));
      else if (cmp(n1.value, max.value) >= 0) fx.reasons.push("quantity_invalid");
      else {
        quantity = { kind: "range", min: lo, max: hi, display: `${lo.display} to ${hi.display}` };
        fx.reasons.push("quantity_range");
      }
    }
  } else if (parts.length > 1) {
    const sum = sumInSmallest(parts.map((p) => ({ value: p.value, unit: p.unit.unit })));
    const smallest = parts.find((p) => sum !== null && p.unit.unit.canonical === sum.unit.canonical)!;
    const q = sum ? toExactQuantity(sum.value, parts.every((p) => p.decimal) ? "decimal" : "fraction") : null;
    if (q === null) {
      // Not representable within the bounds: keep the first amount, report the rest.
      quantity = v1 !== null ? exactOf(v1, n1.ok && n1.decimal) : null;
      fx.unassigned++;
    } else {
      quantity = q;
      unit = smallest.unit.unit;
      unitSpan = [smallest.unit.s, smallest.unit.e];
      fx.reasons.push("compound_quantity_summed");
    }
  } else if (v1 !== null) {
    quantity = exactOf(v1, n1.ok && n1.decimal && v1 === n1.value);
    if (quantity === null) fx.reasons.push(outOfBoundsReason(v1));
  }
  if (bound !== null) {
    // the bound and its number are kept as a note; no amount is given
    fx.notes.push({ s: bound, text: text.slice(bound, qEnd) });
    if (quantity !== null) fx.reasons.push("quantity_range");
    quantity = null;
  }
  if (irregular) {
    // the amount is not clearly one amount: keep what was read, give none
    if (!fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");
    quantity = null;
  }
  if (unit === null && quantity !== null) unit = { canonical: "each", dimension: "count", source: "" };
  slots.quantity = quantity;
  slots.unit = unitRead ? unitRead.unit : null;

  // Sizes written between the count and the unit: a container's contents only beside a counted unit
  // (CONTRACT §7.4: "2 (15 oz) cans"). With no unit yet the engine decides once the whole line is read
  // ("2 (6-ounce) salmon fillets"); beside a weight or volume ("1 1 cup milk") it is a second amount.
  let packageProvisional: { marked: boolean } | null = null;
  for (const { sec, marked } of between) {
    if (sec.sa.unit.dimension === "imprecise" || (unitRead && unitRead.unit.dimension === "count" && unitRead.unit.canonical !== "each")) {
      placeSecondary(text, slots, sec);
    } else if (!unitRead && isMassOrVolume(sec.sa.unit)) {
      placeSecondary(text, slots, sec);
      if (slots.packageSize !== null) packageProvisional = { marked };
    } else {
      fx.notes.push({ s: sec.sa.s, text: text.slice(sec.sa.s, sec.sa.e) });
      fx.unassigned++;
      if (!marked) slots.quantity = quantity = null;
    }
  }

  // Restatements and container contents after the unit.
  if (unitRead) {
    for (let guard = 0; guard < 6; guard++) {
      const t = toks[k];
      if (isGroup(t)) {
        if (isPriceGroup(t)) {
          if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
          k++;
          continue;
        }
        const list = groupAmounts(text, t);
        if (!list) break;
        for (const sa of list) placeSecondary(text, slots, { sa, position: "after" });
        k++;
        continue;
      }
      if (isSym(t, "/") && quantity !== null) {
        const sa = readStatedAmount(text, toks, k + 1);
        if (!sa) break;
        placeSecondary(text, slots, { sa, position: "after" });
        k = sa.next;
        continue;
      }
      if (t?.kind === "num" && CONTAINER_UNITS.has(unitRead.unit.canonical)) {
        const sa = readStatedAmount(text, toks, k);
        if (!sa || !isMassOrVolume(sa.unit)) break;
        placeSecondary(text, slots, { sa, position: "after" });
        k = sa.next;
        continue;
      }
      break;
    }
  }

  return {
    quantity: slots.quantity,
    quantitySpan: [qStart, qEnd],
    amountWritten: true,
    unit,
    unitSpan,
    packageSize: slots.packageSize,
    packageSpan: slots.packageSpan,
    packageProvisional,
    equivalents: slots.equivalents,
    approximate,
    fromWord: n1.ok && n1.word,
    effects: fx,
    next: k,
  };
}

/**
 * The end of a dimensions phrase starting with "x" at `k` ("x13 inch", "x 13\"", "x 9 x 2 cm"), or `k` when
 * there is none: numbers joined by "x", ending in an inch mark, "inch" or a length word.
 */
function dimensionsEnd(text: string, toks: readonly Tok[], k: number): number {
  let c = k;
  let glued = true;
  for (let guard = 0; guard < 3 && (isWord(toks[c], "x", "by") || isSym(toks[c], "×")); guard++) {
    const n = readNumber(toks, c + 1);
    if (!n || !n.ok) return k;
    if (!adjacent(toks[c - 1], toks[c]) || !adjacent(toks[c], toks[c + 1]) || isWord(toks[c], "by")) glued = false;
    c = n.next;
    if (hyphen(toks[c]) && adjacent(toks[c - 1], toks[c])) c++;
  }
  if (c === k) return k;
  const u = toks[c];
  if (isSym(u, '"', "″", "”") && adjacent(toks[c - 1], u)) return c + 1;
  if (isWord(u) && (LENGTH_WORDS.has(u.lower) || readUnit(text, toks, c)?.unit.canonical === "inch")) return isSym(toks[c + 1], ".") && adjacent(u, toks[c + 1]) ? c + 2 : c + 1;
  // "13x9 pan": numbers written together with an "x" and no unit are dimensions too
  if (glued && isWord(u) && readUnit(text, toks, c) === null) return c;
  return k;
}

/** A size with no amount ("9-inch", "2 cm"): noted; a counted unit right after it is read ("1-inch piece"); no quantity. */
function sizeOnly(text: string, toks: readonly Tok[], fx: Effects, s: number, k: number, approximate: boolean): AmountReading {
  fx.notes.push({ s, text: text.slice(s, toks[k - 1].e) });
  if (!fx.reasons.includes("quantity_missing")) fx.reasons.push("quantity_missing");
  const u = readUnit(text, toks, k);
  const counted = u !== null && u.unit.dimension === "count";
  return {
    quantity: null, quantitySpan: null, amountWritten: true, unit: counted ? u.unit : null, unitSpan: counted ? [u.s, u.e] : null, packageSize: null,
    packageSpan: null, packageProvisional: null, equivalents: [], approximate, fromWord: false, effects: fx, next: counted ? u.next : k,
  };
}

/** True when the number ending before `k` is a temperature or a time ("350°F", "350 degrees", "10 minutes"). */
export function isTemperatureOrTime(toks: readonly Tok[], k: number): boolean {
  const t = toks[k];
  return isSym(t, "°", "℉", "℃") || (isWord(t) && TIME_WORDS.has(t.lower));
}

/** A word that can be a measure noun before "of" (not a size, form, remark or function word). */
function isPlainNoun(w: string): boolean {
  return !SIZE_WORDS.has(w) && !MEASURE_ADJECTIVES.has(w) && !REMARK_WORDS.has(w) && !FUNCTION_WORDS.has(w) && !Object.prototype.hasOwnProperty.call(FORM_WORDS, w) && w !== "each";
}

/** Exact sum of amounts in related units (same dimension, mass or volume), in the smallest stated unit. */
export function sumInSmallest(parts: { value: Rational; unit: UnitV1 }[]): { value: Rational; unit: UnitV1 } | null {
  if (parts.length === 0) return null;
  const dim = parts[0].unit.dimension;
  if (parts.some((p) => p.unit.dimension !== dim || UNIT_REGISTRY[p.unit.canonical].base === null)) return null;
  let smallest = parts[0].unit;
  for (const p of parts) if (cmp(base(p.unit), base(smallest)) < 0) smallest = p.unit;
  let total: Rational = { n: BigInt(0), d: BigInt(1) };
  for (const p of parts) total = add(total, mul(p.value, div(base(p.unit), base(smallest))));
  return { value: total, unit: smallest };
}


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
  APPROX_SYMBOLS, APPROX_WORDS, BOUND_PHRASES, CARDINALS, CONTAINER_UNITS, FORM_WORDS, FRACTION_WORDS, FUNCTION_WORDS, LENGTH_MEASURED_FOODS, LENGTH_WORDS, MEASURE_ADJECTIVES,
  RANGE_DASHES, REMARK_WORDS, SIZE_WORDS, TIME_WORDS, UNKNOWN_MEASURES, unitOfWord,
} from "./lexicon";
import { andFraction, fractionUnitWord, readNumber, type NumberRead } from "./quantity";
import { emptyEffects, type AmountReading, type Effects } from "./types";
import { readUnit, type UnitRead } from "./unit";
import { unitV1 } from "../../units";

const isMassOrVolume = (u: UnitV1) => u.dimension === "mass" || u.dimension === "volume";
const hyphen = (t: Tok | undefined) => isSym(t, "-", "‐", "‑");
const LEADING_MEASURE = new Set(["heaping", "heaped", "scant", "generous", "good", "level", "rounded", "full"]);
/** Measurement systems named beside a unit; all but US change the size of a cup, pint, quart, gallon or spoon. */
const SYSTEM_WORDS = new Set(["us", "u.s", "american", "uk", "imperial", "british", "australian", "aus", "metric", "canadian"]);
const OTHER_SYSTEM_WORDS = new Set(["uk", "imperial", "british", "australian", "aus", "metric", "canadian"]);
/** US customary volume units whose size differs in other systems. */
const US_VOLUME = new Set(["tsp", "tbsp", "fl_oz", "cup", "pint", "quart", "gallon"]);

/**
 * FOREIGN-UNIT REMARK (CONTRACT §12.14): a bracket anywhere in the line that names only a non-US measurement system
 * ("1 pint milk (UK)", "2 cups flour (metric)") when the unit is a US volume whose size differs elsewhere.
 */
export function foreignSystemRemark(toks: readonly Tok[], unit: UnitV1 | null): boolean {
  if (unit === null || !US_VOLUME.has(unit.canonical)) return false;
  return toks.some((t) => isGroup(t) && t.children.length > 0 && t.children.every((c) => (isWord(c) && (OTHER_SYSTEM_WORDS.has(c.lower) || ["measure", "measures", "measurements", "cup", "cups", "pint", "pints", "size"].includes(c.lower))) || isSym(c, ".")) && t.children.some((c) => isWord(c) && OTHER_SYSTEM_WORDS.has(c.lower)));
}

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

/**
 * RESTATEMENT TOLERANCE (semantic-v2, CONTRACT §12.6): a same-dimension amount in brackets or after "/" restates the
 * first-stated amount when it is within 7 % of it — |restated − first| ≤ 7/100 · first, in exact arithmetic on the
 * definitional sizes of UNIT_REGISTRY, whatever the measurement systems: "1/3 cup (5 tbsp)" (6.25 %), "1 cup (250 ml)"
 * (5.7 %), "2 cups (500 ml / 17 fl oz)", "14 oz (400 g)", "1 lb (15 oz)" (6.25 %). Beyond it is a second amount: "1 lb
 * (14 oz)" (12.5 %), "1 lb (12 oz)". Mass and volume are never compared (no densities): they stay equivalents.
 */
export const RESTATEMENT_TOLERANCE: Rational = { n: BigInt(7), d: BigInt(100) };

/**
 * Whether `b` restates `a` (`a` is the first-stated amount): true / false when the two amounts have the same dimension
 * and can be compared; null when they cannot (count, imprecise, mass vs volume).
 */
export function sameAmount(a: ExactQuantity, ua: UnitV1, b: ExactQuantity, ub: UnitV1): boolean | null {
  if (ua.dimension !== ub.dimension) return null;
  if (ua.canonical === ub.canonical && a.numerator === b.numerator && a.denominator === b.denominator) return true;
  const x = inBase(a, ua);
  const y = inBase(b, ub);
  if (x === null || y === null) return null;
  return withinRestatementTolerance(x, y) || roundedConversion(x, ua, b, ub);
}

/**
 * The second restatement test of §12.6 — the ROUNDING ALLOWANCE, as amended by CONTRACT §12.A A2 and refined after the
 * label check: the restated number is a whole number equal to the exact conversion of the first-stated amount rounded
 * HALF UP to a whole number of the restated unit, and the restated unit is a fine metric unit (`ml` or `g`) — or `lb`
 * restating `kg` ("1/4 tsp (1 ml)", "3/4 tsp (4 ml)", "1 lb (454 g)", "1 kg (2 lb)"). A restated unit larger than the
 * first never gets the allowance (§12.A A2: a whole number of a larger unit hides more than it states — "2 lb (1 kg)",
 * "100 g (4 oz)"), nor does a coarse kitchen unit ("1/2 tbsp (2 tsp)", "1/6 cup (3 tbsp)": only the 7 % test applies).
 * `firstBase` is the first amount in the dimension's base unit.
 */
export function roundedConversion(firstBase: Rational, ua: UnitV1, restated: ExactQuantity, ub: UnitV1): boolean {
  if (restated.denominator !== "1" || ua.canonical === ub.canonical || cmp(base(ub), base(ua)) >= 0) return false;
  if (!ROUNDING_UNITS.has(ub.canonical) && !(ub.canonical === "lb" && ua.canonical === "kg")) return false;
  const converted = div(firstBase, base(ub)); // exact, in the restated unit
  const twice = BigInt(2) * converted.n + converted.d; // round half up: floor((2n + d) / 2d)
  const rounded = twice / (BigInt(2) * converted.d);
  return rounded > BigInt(0) && rounded.toString() === restated.numerator;
}

/** The fine metric units a rounded conversion is written in (§12.6 rounding allowance); `lb` only restating `kg`. */
export const ROUNDING_UNITS: ReadonlySet<string> = new Set(["ml", "g"]);

/** |restated − first| ≤ RESTATEMENT_TOLERANCE · first (both positive, in the same base unit). */
export function withinRestatementTolerance(first: Rational, restated: Rational): boolean {
  const big = cmp(first, restated) >= 0 ? first : restated;
  const small = big === first ? restated : first;
  const diff = { n: big.n * small.d - small.n * big.d, d: big.d * small.d };
  return cmp(diff, mul(RESTATEMENT_TOLERANCE, first)) <= 0;
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
  // (semantic-v2, §12.3) only packaging units — and a bare count, decided once the line is read — take a package
  // size; the weight of one fillet, slice or piece is a per-piece weight: a note, or with one item a restatement
  const packageable = main === null || main.canonical === "each" || PACKAGE_UNITS.has(main.canonical);
  if (isMassOrVolume(sa.unit) && counted && !packageable && !sa.total && (sec.position === "between" || sa.each)) {
    const one = slots.quantity?.kind === "exact" && slots.quantity.numerator === slots.quantity.denominator;
    // (a part of one item with a weight per item, "1/2 (8 oz) fillet", is not clear)
    if (slots.quantity?.kind === "exact" && slots.quantity.denominator !== "1") {
      fx.notes.push({ s: sa.s, text: text.slice(sa.s, sa.e) });
      fx.unassigned++;
      return;
    }
    if (one && !slots.equivalents.some((x) => x.unit.canonical === sa.unit.canonical)) {
      slots.equivalents.push({ quantity: q, unit: sa.unit });
      if (!fx.reasons.includes("equivalent_quantity_stated")) fx.reasons.push("equivalent_quantity_stated");
    } else fx.notes.push({ s: sa.s, text: text.slice(sa.s, sa.e) });
    return;
  }
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
    if (agrees === true) {
      // (semantic-v2, CONTRACT §12.3) the restated package size is kept in the note, not as an equivalent
      fx.notes.push({ s: sa.s, text: text.slice(sa.s, sa.e) });
      return;
    }
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
  /** Subtracted ("1 cup minus 2 tbsp"). */
  minus?: boolean;
}

/** A between-position size and how it was written: in brackets, hyphenated ("15-oz") or after "x" (marked), or bare ("3 4 cups"). */
interface Between {
  sec: Secondary;
  marked: boolean;
  /** Written after a multiplier "x" ("2 x 400 g"): the count is of packages, so it is never a per-piece weight. */
  viaX?: boolean;
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
  // "between 2 and 3 cups": a range (CONTRACT §7.2)
  let betweenRange = false;
  if (isWord(toks[j], "between") && readNumber(toks, j + 1)) {
    betweenRange = true;
    j++;
  }
  const article = isWord(toks[j], "a", "an");
  // FRACTION-UNIT COMPOUND (§12.1): "a half-cup milk", "1 half-cup butter", "2 half-cups milk", "a quarter-pound beef"
  const compound = fractionUnitAt(text, toks, j);
  if (numberNamesProductAt(toks, j)) return null; // "7-Up", "5-spice powder", "93/7 ground turkey", "10X sugar": part of the name
  const n1 = compound !== null ? compound.n1 : readNumber(toks, j);
  if (!n1) return null;
  if (isTemperatureOrTime(toks, n1.next)) return null; // "350°F", "10 minutes" are not amounts

  let qStart = n1.s;
  let qEnd = n1.e;
  let k = n1.next;
  // "2. cups": a stray period right after a whole number
  if (n1.ok && isSym(toks[k], ".") && adjacent(toks[k - 1], toks[k]) && !adjacent(toks[k], toks[k + 1])) k++;
  let max: NumberRead | null = null;
  if (!n1.ok) fx.reasons.push(n1.reason);
  if (compound !== null) {
    // the compound is the amount and its unit; nothing sits between them
  } else if (isRangeSep(toks[k]) || (betweenRange && isWord(toks[k], "and"))) {
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
  /** Restatements of a package size written in its bracket ("(15 oz / 425 g)"): checked once the package is placed. */
  const restatedPackage: StatedAmount[] = [];
  /** Something unexpected sat between the amount and its unit ("1 (15) oz can"): the amount is not clear. */
  let irregular = false;
  /** A non-US measurement system was named for the unit ("1 (UK) pint", "1 imperial gallon"). */
  let otherSystem = false;

  // Package sizes, size descriptors and remarks written before the unit.
  for (let guard = 0; guard < 6 && compound === null; guard++) {
    const t = toks[k];
    // "2 quarter-pound beef patties": a fraction-unit after a count of two or more sizes what is counted (§12.1)
    const fw = fractionUnitWord(t);
    if (fw !== null && isWord(t) && !fw.plural && n1.ok && max === null && between.length === 0) {
      const after = readUnit(text, toks, k + 1);
      if (after !== null && CONTAINER_UNITS.has(after.unit.canonical)) {
        // "1 half-gallon carton milk": the size of the container
        const sa: StatedAmount = { value: fw.value, decimal: false, unit: unitV1(unitOfWord(fw.unitWord)!, fw.unitWord), unitSpan: [t.s + fw.unitOffset, t.e], s: t.s, e: t.e, next: k + 1, each: false, total: false, approx: false };
        between.push({ sec: { sa, position: "between" }, marked: true });
        k++;
        continue;
      }
      // (only after a whole count of two or more: "1/2 half-cup milk" is not clear)
      fx.notes.push({ s: t.s, text: t.text });
      if (!(n1.value.d === BigInt(1) && n1.value.n >= BigInt(2))) {
        fx.unassigned++;
        irregular = true;
      }
      k++;
      continue;
    }
    // "1 large (28 oz) can", "1 lg. (28 oz) can": a size word before a bracketed package size describes the container
    if (isWord(t) && SIZE_WORDS.has(t.lower) && n1.ok && max === null && between.length === 0) {
      let c = k + 1;
      if (isSym(toks[c], ".") && adjacent(toks[c - 1], toks[c])) c++;
      const g = toks[c];
      const inner = isGroup(g) ? groupAmounts(text, g) : null;
      if (inner && isMassOrVolume(inner[0].unit)) {
        fx.notes.push({ s: t.s, text: t.text });
        k = c;
        continue;
      }
    }
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
      // "1 (15 oz / 425 g) can": a package size restated in the same bracket — the first-stated size is the package,
      // a restatement that agrees is a note (CONTRACT §12.3), one that does not is a second amount
      const several = groupAmounts(text, t);
      if (several && several.length >= 2 && several.every((x) => isMassOrVolume(x.unit) && !x.each && !x.total)) {
        between.push({ sec: { sa: several[0], position: "between" }, marked: true });
        restatedPackage.push(...several.slice(1));
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
      // "9x13 inch pan", "9 x 13\" dish", "13x9 pan": dimensions are a size, never an amount — but before a plural food
      // ("2 x 13-inch pizza bases") the first number counts the items and the length is a note (§12.2 ii)
      const dims = dimensionsEnd(text, toks, k);
      if (dims > k && between.length === 0 && pluralFoodAfter(toks, dims) && !isWord(toks[dims - 1], "x")) {
        fx.notes.push({ s: toks[k + 1].s, text: text.slice(toks[k + 1].s, toks[dims - 1].e) });
        k = dims;
        break;
      }
      if (dims > k && between.length === 0) return sizeOnly(text, toks, fx, n1.s, dims, approximate);
      const sa = readStatedAmount(text, toks, k + 1);
      if (sa && isMassOrVolume(sa.unit)) {
        between.push({ sec: { sa, position: "between" }, marked: true, viaX: true });
        k = sa.next;
        continue;
      }
      // MULTIPLIER RULE (§12.2): "1x cup milk", "2x cans chickpeas", "1 x can chickpeas", "3x eggs" — a count before
      // "x" and a unit, container or food is the count; the "x" is consumed and never stays in the name
      if (between.length === 0 && multiplierAt(toks, k)) {
        k++;
        break;
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
  while (sizeLike(toks[a])) {
    a++;
    // "1 lg. can": an abbreviated size word keeps its period
    if (isSym(toks[a], ".") && adjacent(toks[a - 1], toks[a]) && SIZE_WORDS.has((toks[a - 1] as { lower: string }).lower) && readUnit(text, toks, a + 1)) a++;
  }
  // ("1 UK pint": a measurement-system word before the unit is read with it)
  if (a > k && !readUnit(text, toks, a) && toks.slice(k, a).some((t) => isWord(t) && SYSTEM_WORDS.has(t.lower))) a = k;
  if (toks.slice(k, a).some((t) => isWord(t) && OTHER_SYSTEM_WORDS.has(t.lower))) otherSystem = true;
  let unitRead = compound !== null ? compound.unit : readUnit(text, toks, a);
  if (compound !== null) a = k;
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
  // CONTAINER-CUP RULE (CONTRACT §12.5): "3 (5.3 oz) cups vanilla Greek yogurt" — a package size between the count and
  // "cup(s)" makes the cup a container (a measuring cup never carries a package size)
  if (unitRead && n1.ok && n1.value.d === BigInt(1) && max === null && containerCup(unitRead, between)) unitRead = { ...unitRead, unit: unitV1("container", unitRead.unit.source) };
  if (unitRead) k = unitRead.next;
  // "1 pint (UK) milk": the system written right after the unit
  const afterUnit = toks[k];
  if (unitRead && isGroup(afterUnit) && afterUnit.children.length === 1 && isWord(afterUnit.children[0]) && OTHER_SYSTEM_WORDS.has(afterUnit.children[0].lower)) otherSystem = true;
  // A UK, imperial, Australian or metric pint/cup/… is not the US size of UNIT_REGISTRY: a person checks
  if (unitRead && otherSystem && US_VOLUME.has(unitRead.unit.canonical) && !fx.reasons.includes("unclassified")) fx.reasons.push("unclassified");

  // An inch is a size ("9-inch pie crust", "12 inch pizza crust", "1-inch piece ginger"), never an amount bought.
  // (semantic-v2) "1 inch ginger": an unhyphenated inch before a food measured by its length is the amount
  if (unitRead && unitRead.unit.canonical === "inch" && between.length === 0 && !inchMeasuresFood(toks, n1.next, k)) return sizeOnly(text, toks, fx, n1.s, k, approximate);

  // PACKAGE SIZE WITH NO COUNT (CONTRACT §12.3): "28 oz can tomatoes", "400 g can chickpeas", "8-ounce package cream
  // cheese" — a size directly before a SINGULAR container is one container of that size (quantity 1); before a plural
  // container ("15 oz cans beans") the count is missing. A restatement of the size before the container ("400 g (14 oz)
  // can", "400g/14oz can") keeps the first-stated size and goes to the note; one that disagrees is a second amount.
  if (unitRead && n1.ok && max === null && between.length === 0 && n1.value.n > BigInt(0) && isMassOrVolume(unitRead.unit)) {
    const pk = packageBeforeContainer(text, toks, k);
    if (pk !== null) {
      const size: StatedAmount = {
        value: n1.value, decimal: n1.decimal, unit: unitRead.unit, unitSpan: [unitRead.s, unitRead.e], s: n1.s, e: unitRead.e, next: pk.container.next, each: false, total: false, approx: false,
      };
      const one = !pk.plural;
      const quantity1 = one ? toExactQuantity(rational(BigInt(1))) : null;
      if (!one) fx.reasons.push("quantity_missing");
      const slots0: AmountSlots = { quantity: quantity1, unit: pk.container.unit, packageSize: null, packageSpan: null, equivalents: [], effects: fx };
      placeSecondary(text, slots0, { sa: size, position: "between" });
      for (const r of pk.restated) placeSecondary(text, slots0, { sa: r, position: "between" });
      return {
        quantity: quantity1, quantitySpan: null, amountWritten: true, unit: pk.container.unit, unitSpan: [pk.container.s, pk.container.e], packageSize: slots0.packageSize,
        packageSpan: slots0.packageSpan, packageProvisional: null, equivalents: [], approximate, fromWord: false, effects: fx, next: pk.container.next,
      };
    }
  }

  // "a drizzle of olive oil", "2 rashers bacon", "1 dsp sugar", "1 leg of lamb": a measure word that is not
  // a registry unit. The amount cannot be carried without its unit: it is kept in the note, not invented.
  if (!unitRead && n1.ok && max === null && between.length === 0) {
    // (after any measure adjectives: "2 heaping spoonfuls sugar")
    const m = unknownMeasureAt(toks, a);
    if (m > a) {
      let c = m;
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
        let minus = false;
        if (isWord(toks[c], "plus", "and") || isSym(toks[c], "+", "&")) {
          connector = true;
          c++;
        } else if (isWord(toks[c], "minus", "less") && parts.length === 1) {
          // "1 cup minus 2 tbsp", "1 cup less 2 tbsp" → 14 tbsp (§12.12)
          connector = true;
          minus = true;
          c++;
        }
        const t = toks[c];
        if (!(t?.kind === "num" || t?.kind === "vulgar")) break;
        const n2 = readNumber(toks, c);
        if (!n2 || !n2.ok) break;
        const u2 = readUnit(text, toks, n2.next);
        const last = parts[parts.length - 1].unit.unit;
        if (!u2 || u2.unit.dimension !== unitRead.unit.dimension) break;
        // the same unit again is summed only after an explicit "plus"/"+" ("2 tsp + ½ tsp", "1 cup plus 1/3 cup")
        if (u2.unit.canonical === last.canonical && !connector) break;
        if (!connector && cmp(base(u2.unit), base(last)) >= 0) break;
        if (minus && cmp(base(u2.unit), base(last)) >= 0) break;
        parts.push({ value: n2.value, decimal: n2.decimal, unit: u2, minus });
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
    const sum = sumInSmallest(parts.map((p) => ({ value: p.value, unit: p.unit.unit })), parts.map((p) => p.minus === true));
    const smallest = parts.find((p) => sum !== null && p.unit.unit.canonical === sum.unit.canonical)!;
    const q = sum && sum.value.n > BigInt(0) ? toExactQuantity(sum.value, parts.every((p) => p.decimal) ? "decimal" : "fraction") : null;
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
  // (semantic-v2) a restatement is compared with the amount in the unit it is stated in — after a compound, the
  // smallest unit ("1 Tbsp + 1 tsp (20 ml)" → 4 tsp vs 20 ml)
  slots.unit = unitRead ? (parts.length > 1 && unit !== null ? unit : unitRead.unit) : null;

  // Sizes written between the count and the unit: a container's contents only beside a counted unit
  // (CONTRACT §7.4: "2 (15 oz) cans"). With no unit yet the engine decides once the whole line is read
  // ("2 (6-ounce) salmon fillets"); beside a weight or volume ("1 1 cup milk") it is a second amount.
  let packageProvisional: { marked: boolean; approx?: boolean; viaX?: boolean } | null = null;
  for (const { sec, marked } of between) {
    if (sec.sa.unit.dimension === "imprecise" || (unitRead && unitRead.unit.dimension === "count" && unitRead.unit.canonical !== "each")) {
      placeSecondary(text, slots, sec);
    } else if (!unitRead && isMassOrVolume(sec.sa.unit)) {
      placeSecondary(text, slots, sec);
      if (slots.packageSize !== null) packageProvisional = { marked, approx: sec.sa.approx, viaX: between.some((b) => b.viaX === true) };
    } else {
      fx.notes.push({ s: sec.sa.s, text: text.slice(sec.sa.s, sec.sa.e) });
      fx.unassigned++;
      if (!marked) slots.quantity = quantity = null;
    }
  }

  // restatements of the package size written in its bracket ("(15 oz / 425 g)")
  if (slots.packageSize !== null) for (const r of restatedPackage) placeSecondary(text, slots, { sa: r, position: "between" });
  else if (restatedPackage.length > 0) fx.unassigned++;

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
        // "3 cups (5.3 oz each) Greek yogurt": a per-item size after "cups" makes the cups containers (§12.5)
        if (unitRead.unit.canonical === "cup" && /^cups?$/i.test(unitRead.unit.source) && v1 !== null && v1.d === BigInt(1) && list.length === 1 && list[0].each && containerSize({ ...list[0], each: false }) && slots.packageSize === null && parts.length <= 1) {
          unit = unitV1("container", unitRead.unit.source);
          slots.unit = unit;
        }
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

/** Units that take a package size: the registry's packaging units plus the sold-by-weight block, loaf and ball (§12.3). */
export const PACKAGE_UNITS: ReadonlySet<string> = new Set([...CONTAINER_UNITS, "block", "loaf", "ball"]);

/**
 * FRACTION-UNIT COMPOUND at `j` (§12.1): [a | an | one | 1 | N] "half-cup" (one hyphenated word, see
 * `fractionUnitWord`), or "1 half cup" written apart. The article or "1" never multiplies; a count of two or more
 * multiplies only a plural compound ("2 half-cups milk" → 1 cup). Before a container, or after a count of two or more
 * with a singular compound, the compound is a size (read by the between loop instead). Returns the amount as a number
 * read and the unit read, or null.
 */
function fractionUnitAt(text: string, toks: readonly Tok[], j: number): { n1: NumberRead & { ok: true }; unit: UnitRead } | null {
  const t0 = toks[j];
  if (t0 === undefined) return null;
  const leadCount = t0.kind === "num" && t0.form === "int" && !t0.script && /^[1-9]\d?$/.test(t0.text) ? BigInt(t0.text) : null;
  const lead = isWord(t0, "a", "an", "one") || leadCount !== null;
  // "1 half cup milk", "one quarter cup": a fraction word written apart, then a weight or volume unit
  // "2 half cups milk" (a count before a plural unit multiplies, §12.1)
  if (leadCount !== null && isWord(toks[j + 1], "half", "quarter", "third")) {
    const u = readUnit(text, toks, j + 2);
    const pluralUnit = u !== null && /s\.?$/i.test(text.slice(u.s, u.e));
    if (u !== null && isMassOrVolume(u.unit) && (leadCount === BigInt(1) || pluralUnit)) {
      const value = mul(rational(BigInt(1), BigInt(FRACTION_WORDS[(toks[j + 1] as { lower: string }).lower])), rational(leadCount));
      return { n1: { ok: true, value, decimal: false, word: true, s: t0.s, e: toks[j + 1].e, next: j + 2 }, unit: u };
    }
  }
  const c = lead ? j + 1 : j;
  const t = toks[c];
  const fw = fractionUnitWord(t);
  if (fw === null || t === undefined) return null;
  if (leadCount !== null && leadCount > BigInt(1) && !fw.plural) return null;
  const after = readUnit(text, toks, c + 1);
  if (after !== null && PACKAGE_UNITS.has(after.unit.canonical)) return null;
  const value = leadCount !== null && leadCount > BigInt(1) ? mul(fw.value, rational(leadCount)) : fw.value;
  const unitS = t.s + fw.unitOffset;
  const unit: UnitRead = { unit: unitV1(unitOfWord(fw.unitWord)!, fw.unitWord), s: unitS, e: t.e, next: c + 1 };
  return { n1: { ok: true, value, decimal: false, word: leadCount === null, s: lead ? t0.s : t.s, e: unitS - 1, next: c }, unit };
}

/**
 * NUMBERS THAT NAME THE FOOD at `j` (§12.9): a number joined by a hyphen to a word that is not a unit ("7-Up",
 * "5-spice powder", "7-grain bread"), a lean ratio ("93/7 ground turkey", "80/20 beef": two whole numbers summing to
 * 100, the first the larger), or a sugar grade ("10X sugar", which is never a multiplier, §12.2 i). Such a number
 * starts no amount phrase.
 */
export function numberNamesProductAt(toks: readonly Tok[], j: number): boolean {
  const t = toks[j];
  if (t?.kind !== "num" || t.form !== "int" || t.script) return false;
  const n1 = toks[j + 1];
  const n2 = toks[j + 2];
  if (hyphen(n1) && adjacent(t, n1) && isWord(n2) && adjacent(n1, n2)) {
    const w = n2.lower;
    return unitOfWord(n2.text) === null && !LENGTH_WORDS.has(w) && !Object.prototype.hasOwnProperty.call(CARDINALS, w) && w !== "dozen" && !TIME_WORDS.has(w) && !/^(?:inch|in|ounce|pound)/.test(w);
  }
  if (isSym(n1, "/") && adjacent(t, n1) && n2?.kind === "num" && n2.form === "int" && adjacent(n1, n2) && isWord(toks[j + 3])) {
    const a = Number(t.text);
    const b = Number(n2.text);
    return a + b === 100 && a > b && unitOfWord((toks[j + 3] as { text: string }).text) === null;
  }
  if (isWord(n1, "x") && adjacent(t, n1) && (isWord(n2, "sugar", "powdered", "confectioners", "confectioner's", "icing"))) return true;
  return false;
}

/** MULTIPLIER RULE (§12.2): "x"/"×" at `k` after a count, followed by a unit, a container or a food word (not a number). */
export function multiplierAt(toks: readonly Tok[], k: number): boolean {
  const x = toks[k];
  const next = toks[k + 1];
  if (!(isWord(x, "x") || isSym(x, "×")) || !isWord(next) || isWord(next, "x")) return false;
  return !(isWord(next, "sugar", "powdered", "confectioners", "icing") && adjacent(toks[k - 1], x));
}

/** The words from `i` to the first comma or bracket end in a plural noun ("pizza bases", "tortillas"). */
function pluralFoodAfter(toks: readonly Tok[], i: number): boolean {
  let last: Tok | undefined;
  for (let c = i; c < toks.length && !isGroup(toks[c]) && !isSym(toks[c], ",", ";"); c++) last = toks[c];
  const plural = (t: Tok | undefined) => isWord(t) && t.lower.length > 2 && /[^s]s$/.test(t.lower);
  // ("2 x 4-inch pieces ginger": a plural counted unit right after the size counts the items too)
  const next = toks[i];
  return plural(last) || (plural(next) && unitOfWord((next as { text: string }).text) !== null && UNIT_REGISTRY[unitOfWord((next as { text: string }).text)!].dimension === "count");
}

/**
 * "1 inch ginger, grated", "2 inch fresh turmeric": the inch (not hyphenated to the number, at `unitAt`) is followed,
 * before any comma or bracket, by a food that is measured by the length cut from it (LENGTH_MEASURED_FOODS); with
 * another counted unit after it ("1 inch piece ginger") or any other food ("12 inch pizza crust") it is a size.
 */
function inchMeasuresFood(toks: readonly Tok[], unitAt: number, next: number): boolean {
  if (hyphen(toks[unitAt]) || isSym(toks[unitAt - 1], "-")) return false;
  const rest: Tok[] = [];
  for (let c = next; c < toks.length && !isGroup(toks[c]) && !isSym(toks[c], ",", ";"); c++) rest.push(toks[c]);
  const ws = rest.filter((t) => t.kind === "word") as { lower: string }[];
  if (ws.length === 0 || rest.length !== ws.length) return false;
  const head = ws[ws.length - 1].lower === "root" && ws.length >= 2 ? ws[ws.length - 2].lower : ws[ws.length - 1].lower;
  return LENGTH_MEASURED_FOODS.has(head) && ws.slice(0, -1).every((w) => REMARK_WORDS.has(w.lower) || LENGTH_MEASURED_FOODS.has(w.lower) || w.lower === "of" || w.lower === "root");
}

/**
 * CONTAINER-CUP RULE (CONTRACT §12.5): the unit read is "cup(s)" and a package size was written between the count and
 * it in brackets, hyphenated or after "x" ("3 (5.3 oz) cups yogurt") — the cup is a container.
 */
export function containerCup(unitRead: UnitRead, between: readonly { sec: Secondary; marked: boolean }[]): boolean {
  const sa = between.length === 1 ? between[0].sec.sa : null;
  return unitRead.unit.canonical === "cup" && /^cups?$/i.test(unitRead.unit.source) && sa !== null && between[0].marked && containerSize(sa);
}

/** A container's contents: a weight, or a metric or fluid volume, stated exactly ("5.3 oz", "150 g", "6 fl oz") — never cups or spoons. */
function containerSize(sa: StatedAmount): boolean {
  return (sa.unit.dimension === "mass" || ["ml", "l", "dl", "fl_oz"].includes(sa.unit.canonical)) && !sa.each && !sa.total && !sa.approx;
}

/**
 * After a weight or volume at `k`: optional restatements of it ("(14 oz)", "/ 14 oz") and then a container unit
 * ("can", "packages"). Null when no container follows. `plural`: the container was written in the plural.
 */
function packageBeforeContainer(text: string, toks: readonly Tok[], k: number): { container: UnitRead; plural: boolean; restated: StatedAmount[] } | null {
  let c = k;
  const restated: StatedAmount[] = [];
  for (let guard = 0; guard < 3; guard++) {
    const t = toks[c];
    if (isGroup(t)) {
      const list = groupAmounts(text, t);
      if (!list || !list.every((x) => isMassOrVolume(x.unit) && !x.each && !x.total)) return null;
      restated.push(...list);
      c++;
      continue;
    }
    if (isSym(t, "/")) {
      const sa = readStatedAmount(text, toks, c + 1);
      if (!sa || !isMassOrVolume(sa.unit) || sa.each || sa.total) return null;
      restated.push(sa);
      c = sa.next;
      continue;
    }
    break;
  }
  let container = readUnit(text, toks, c);
  // "8 oz bar chocolate": after a size, a bar is a block (alone, "bar" begins food names: "bar cookies")
  if (container === null && isWord(toks[c], "bar") && isWord(toks[c + 1])) container = { unit: unitV1("block", (toks[c] as { text: string }).text), s: toks[c].s, e: toks[c].e, next: c + 1 };
  if (container === null) return null;
  const written = text.slice(container.s, container.e).toLowerCase().replace(/\.$/, "");
  // "6 oz cup yogurt": a size right before a singular "cup" makes it a container (§12.5)
  // (the size is a weight or a metric/fluid volume, never another kitchen measure: "1 cup cup noodles" is food)
  const sizeUnit = toks[k - 1] !== undefined ? readUnitBefore(text, toks, k) : null;
  if (container.unit.canonical === "cup" && c === k && written === "cup" && sizeUnit !== null && (sizeUnit.dimension === "mass" || ["ml", "l", "dl", "fl_oz"].includes(sizeUnit.canonical))) {
    container = { ...container, unit: unitV1("container", text.slice(container.s, container.e)) };
  }
  if (container.unit.dimension !== "count" || !PACKAGE_UNITS.has(container.unit.canonical)) return null;
  return { container, plural: /s$/.test(written), restated };
}

/** The unit word that ends right before token `k` ("oz" in "6 oz cup"), or null. */
function readUnitBefore(text: string, toks: readonly Tok[], k: number): UnitV1 | null {
  for (let c = Math.max(0, k - 3); c < k; c++) {
    const u = readUnit(text, toks, c);
    if (u !== null && u.next === k) return u.unit;
  }
  return null;
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

/**
 * UNKNOWN MEASURE (semantic-v2, CONTRACT §12.14): where a measure word that is not a registry unit starts at `a` (right
 * after the number and any size or degree words), the index after it; else `a`. A measure word is
 *  - a word of UNKNOWN_MEASURES (household vessels and spoons, archaic and foreign units, informal lumps: "1 gill", "2
 *    drams", "1 tumbler", "2 ladles", "1 teacup", "1 hunk", "1 thumb", "1 stone", "1 pottle"…);
 *  - a "-ful(l)(s)" measure by its form ("2 fistfuls", "1 can-ful", "1 tub-full", "2 ladlefuls");
 *  - a vessel named by its use before the food ("1 coffee cup plain flour", "2 soup spoons sugar", "1 wine glass red
 *    wine", "1 yogurt pot sugar": a plain noun, then VESSEL_MEASURES, then the food);
 *  - any plain noun (or two) between the number and "of" ("1 hunk of Parmesan", "1 large pot of salted water", "1
 *    dessert spoon of cocoa") — the registry units were read before this test.
 */
export function unknownMeasureAt(toks: readonly Tok[], a: number): number {
  const w = toks[a];
  if (!isWord(w)) return a;
  const next = toks[a + 1];
  if (UNKNOWN_MEASURES.has(w.lower) || MEASURE_BY_FORM.test(w.lower)) return a + 1;
  if (!isPlainNoun(w.lower) || unitOfWord(w.text) !== null) return a;
  const food = (t: Tok | undefined) => isWord(t) && !FUNCTION_WORDS.has(t.lower);
  if (isWord(next) && VESSEL_MEASURES.has(next.lower) && (food(toks[a + 2]) || isWord(toks[a + 2], "of"))) return a + 2;
  if (isWord(next, "of") && toks[a + 2] !== undefined && !isWord(toks[a + 2], "the")) return a + 1;
  if (isWord(next) && isPlainNoun(next.lower) && unitOfWord(next.text) === null && isWord(toks[a + 2], "of") && food(toks[a + 3])) return a + 2;
  return a;
}
/** "-ful" measures by their form: "fistful", "spoonfuls", "can-ful", "tub-full" (registry ones — cupful, handful — are read before). */
const MEASURE_BY_FORM = /^\p{L}{2,}-?full?s?$/u;
/** Vessels that name a measure after a word saying which one ("coffee cup", "soup spoon", "wine glass", "yogurt pot"). */
const VESSEL_MEASURES = new Set(["cup", "cups", "spoon", "spoons", "glass", "glasses", "mug", "mugs", "bowl", "bowls", "pot", "pots", "jar", "jars", "tin", "tins"]);

/** A word that can be a measure noun before "of" (not a size, form, remark or function word). */
function isPlainNoun(w: string): boolean {
  return !SIZE_WORDS.has(w) && !MEASURE_ADJECTIVES.has(w) && !REMARK_WORDS.has(w) && !FUNCTION_WORDS.has(w) && !Object.prototype.hasOwnProperty.call(FORM_WORDS, w) && w !== "each";
}

/**
 * Exact sum of amounts in related units (same dimension, mass or volume), in the smallest stated unit. A part marked
 * in `minus` is subtracted ("1 cup minus 2 tbsp"); a sum that is not positive gives a zero value (refused by the caller).
 */
export function sumInSmallest(parts: { value: Rational; unit: UnitV1 }[], minus: readonly boolean[] = []): { value: Rational; unit: UnitV1 } | null {
  if (parts.length === 0) return null;
  const dim = parts[0].unit.dimension;
  if (parts.some((p) => p.unit.dimension !== dim || UNIT_REGISTRY[p.unit.canonical].base === null)) return null;
  let smallest = parts[0].unit;
  for (const p of parts) if (cmp(base(p.unit), base(smallest)) < 0) smallest = p.unit;
  let plus: Rational = { n: BigInt(0), d: BigInt(1) };
  let less: Rational = { n: BigInt(0), d: BigInt(1) };
  parts.forEach((p, k) => {
    const v = mul(p.value, div(base(p.unit), base(smallest)));
    if (minus[k]) less = add(less, v);
    else plus = add(plus, v);
  });
  if (cmp(plus, less) <= 0) return { value: { n: BigInt(0), d: BigInt(1) }, unit: smallest };
  const diff = rational(plus.n * less.d - less.n * plus.d, plus.d * less.d);
  return { value: diff, unit: smallest };
}

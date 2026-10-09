/**
 * semantic-v1 · step 5: the amount phrase — quantity, range, unit, package size, compound amounts and
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
import { add, cmp, div, fromDecimalString, mul, toExactQuantity, type Rational } from "../../rational";
import { adjacent, isGroup, isSym, isWord, type GroupTok, type Tok } from "./lexer";
import { APPROX_SYMBOLS, APPROX_WORDS, CARDINALS, CONTAINER_UNITS, FRACTION_WORDS, LENGTH_WORDS, MEASURE_ADJECTIVES, RANGE_DASHES, SIZE_WORDS } from "./lexicon";
import { readNumber, type NumberRead } from "./quantity";
import { emptyEffects, type AmountReading, type Effects } from "./types";
import { readUnit, type UnitRead } from "./unit";

const isMassOrVolume = (u: UnitV1) => u.dimension === "mass" || u.dimension === "volume";
const hyphen = (t: Tok | undefined) => isSym(t, "-", "‐", "‑");
const LEADING_MEASURE = new Set(["heaping", "heaped", "scant", "generous", "good", "level", "rounded", "full"]);

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

/**
 * Decides what a second stated amount is, given the line's main amount:
 *  - a size that is not mass/volume ("9-inch") → note;
 *  - a count restatement ("1/2 cup (1 stick)") → recorded as a restatement (`equivalent_quantity_stated`);
 *    `equivalents` only carries mass/volume, so the count itself is not stored;
 *  - main counted (can, clove, bare count): written between count and item, after a container, or with
 *    "each" → the item's contents (`packageSize`); otherwise ("2 chicken breasts (about 1 lb)") → `equivalents`;
 *  - main mass/volume/imprecise → `equivalents` (same unit: equal → nothing new; different → unassigned).
 */
export function placeSecondary(text: string, slots: AmountSlots, sec: Secondary): void {
  const { sa } = sec;
  const fx = slots.effects;
  if (!isMassOrVolume(sa.unit)) {
    if (sa.unit.dimension === "imprecise") fx.notes.push({ s: sa.s, text: text.slice(sa.s, sa.e) });
    else if (!fx.reasons.includes("equivalent_quantity_stated")) fx.reasons.push("equivalent_quantity_stated");
    return;
  }
  const q = exactOf(sa.value, sa.decimal);
  if (q === null) {
    fx.unassigned++;
    return;
  }
  const main = slots.unit;
  const counted = main === null || main.dimension === "count";
  const asPackage = counted && !sa.total && (sec.position === "between" || sa.each || (main !== null && CONTAINER_UNITS.has(main.canonical)));
  if (asPackage) {
    if (slots.packageSize === null) {
      slots.packageSize = { quantity: q, unit: sa.unit };
      slots.packageSpan = [sa.s, sa.e];
      if (!fx.reasons.includes("package_size_stated")) fx.reasons.push("package_size_stated");
    } else if (!(slots.packageSize.unit.canonical === sa.unit.canonical && slots.packageSize.quantity.numerator === q.numerator && slots.packageSize.quantity.denominator === q.denominator)) {
      fx.unassigned++;
    }
    return;
  }
  if (main !== null && main.canonical === sa.unit.canonical && slots.quantity?.kind === "exact") {
    if (!(slots.quantity.numerator === q.numerator && slots.quantity.denominator === q.denominator)) fx.unassigned++;
    return;
  }
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
  if (Object.prototype.hasOwnProperty.call(CARDINALS, t.lower) || t.lower === "half") return true;
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
  const n1 = readNumber(toks, j);
  if (!n1) return null;

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
  const between: Secondary[] = [];

  // Package sizes and size descriptors written before the unit.
  for (let guard = 0; guard < 6; guard++) {
    const t = toks[k];
    if (isGroup(t)) {
      if (isPriceGroup(t)) {
        if (!fx.reasons.includes("price_annotation_removed")) fx.reasons.push("price_annotation_removed");
        k++;
        continue;
      }
      const sa = groupAmount(text, t);
      if (sa) {
        if (isMassOrVolume(sa.unit) || sa.unit.dimension === "imprecise") {
          between.push({ sa, position: "between" });
          k++;
          continue;
        }
      }
      break;
    }
    if ((isWord(t, "x") || isSym(t, "×")) && n1.ok && max === null) {
      const sa = readStatedAmount(text, toks, k + 1);
      if (sa && isMassOrVolume(sa.unit)) {
        between.push({ sa, position: "between" });
        k = sa.next;
        continue;
      }
      break;
    }
    if (t?.kind === "num" && n1.ok && max === null) {
      const sa = readStatedAmount(text, toks, k);
      if (sa && (isMassOrVolume(sa.unit) || sa.unit.canonical === "inch")) {
        between.push({ sa, position: "between" });
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
  const lengthWord = toks[k];
  if (n1.ok && max === null && between.length === 0 && isWord(lengthWord) && LENGTH_WORDS.has(lengthWord.lower)) {
    let c = k + 1;
    if (isSym(toks[c], ".") && adjacent(toks[c - 1], toks[c])) c++;
    fx.notes.push({ s: n1.s, text: text.slice(n1.s, toks[c - 1].e) });
    fx.reasons.push("quantity_missing");
    const u = readUnit(text, toks, c);
    const counted = u !== null && u.unit.dimension === "count";
    return {
      quantity: null, quantitySpan: null, amountWritten: true, unit: counted ? u.unit : null, unitSpan: counted ? [u.s, u.e] : null, packageSize: null,
      packageSpan: null, equivalents: [], approximate, fromWord: false, effects: fx, next: counted ? u.next : c,
    };
  }

  // Size and measure adjectives (also "thumb-sized"), then the unit.
  let a = k;
  while (isWord(toks[a]) && (MEASURE_ADJECTIVES.has((toks[a] as { lower: string }).lower) || SIZE_WORDS.has((toks[a] as { lower: string }).lower) || isWord(toks[a], "extra") || /-sized?$/.test((toks[a] as { lower: string }).lower))) a++;
  let unitRead = readUnit(text, toks, a);
  if (unitRead && a > k) {
    fx.notes.push({ s: toks[k].s, text: text.slice(toks[k].s, toks[a - 1].e) });
  }
  if (unitRead) k = unitRead.next;

  // "400 g tin", "16-ounce package", "1-inch piece": a size followed by what it measures. The size is the
  // container's contents (or a size note); how many containers is not stated, so no quantity is given.
  if (unitRead && n1.ok && max === null && between.length === 0 && n1.value.n > BigInt(0)) {
    const c = readUnit(text, toks, k);
    const measured = c && c.unit.dimension === "count" && c.unit.canonical !== "each";
    const container = measured && CONTAINER_UNITS.has(c.unit.canonical) && isMassOrVolume(unitRead.unit);
    const sized = measured && unitRead.unit.canonical === "inch";
    if (c && (container || sized)) {
      const size: StatedAmount = {
        value: n1.value, decimal: n1.decimal, unit: unitRead.unit, unitSpan: [unitRead.s, unitRead.e], s: n1.s, e: unitRead.e, next: c.next, each: false, total: false, approx: false,
      };
      fx.reasons.push("quantity_missing");
      const slots0: AmountSlots = { quantity: null, unit: c.unit, packageSize: null, packageSpan: null, equivalents: [], effects: fx };
      placeSecondary(text, slots0, { sa: size, position: "between" });
      return {
        quantity: null, quantitySpan: null, amountWritten: true, unit: c.unit, unitSpan: [c.s, c.e], packageSize: slots0.packageSize, packageSpan: slots0.packageSpan,
        equivalents: [], approximate, fromWord: false, effects: fx, next: c.next,
      };
    }
  }

  const parts: Part[] = [];
  if (unitRead && n1.ok) parts.push({ value: n1.value, decimal: n1.decimal, unit: unitRead });

  if (unitRead) {
    // Range with the unit repeated: "1 cup to 1 1/2 cups".
    if (max === null && n1.ok && isRangeSep(toks[k])) {
      const n2 = rangeEnd(toks, k + 1);
      const u2 = n2 && n2.ok ? readUnit(text, toks, n2.next) : null;
      if (n2 && u2 && u2.unit.canonical === unitRead.unit.canonical) {
        max = n2;
        qEnd = u2.e;
        k = u2.next;
      }
    }
    // Compound: "1 lb 4 oz", "1 cup plus 2 tbsp", "2 tbsp + 1 tsp".
    if (max === null && n1.ok && isMassOrVolume(unitRead.unit)) {
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
      quantity = n1.ok ? exactOf(n1.value, n1.decimal) : null;
      fx.unassigned++;
    } else {
      quantity = q;
      unit = smallest.unit.unit;
      unitSpan = [smallest.unit.s, smallest.unit.e];
      fx.reasons.push("compound_quantity_summed");
    }
  } else if (n1.ok) {
    quantity = exactOf(n1.value, n1.decimal);
    if (quantity === null) fx.reasons.push(outOfBoundsReason(n1.value));
  }
  if (unit === null && quantity !== null) unit = { canonical: "each", dimension: "count", source: "" };
  slots.quantity = quantity;
  slots.unit = unitRead ? unitRead.unit : null;

  // Second amounts written between the count and the unit.
  for (const sec of between) placeSecondary(text, slots, sec);

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
    quantity,
    quantitySpan: [qStart, qEnd],
    amountWritten: true,
    unit,
    unitSpan,
    packageSize: slots.packageSize,
    packageSpan: slots.packageSpan,
    equivalents: slots.equivalents,
    approximate,
    fromWord: n1.ok && n1.word,
    effects: fx,
    next: k,
  };
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


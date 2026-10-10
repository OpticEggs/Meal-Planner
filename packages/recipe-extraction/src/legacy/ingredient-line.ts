// FROZEN COPY of src/server/integrations/recipe-import/ingredient-line.ts at cb7b56e for parity and baselines. Do not improve here; improvements go in new engines.
// Provenance, baseline hash and the exact list of edits: ./PROVENANCE.json
import { D } from "./decimal";
import { KNOWN_UNITS, normalizeUnit } from "./units";

/**
 * Conservative ingredient-line parsing. A line is `parsed` only when it is exactly
 * `<quantity> [<known unit>] <name>` with nothing else numeric; everything else goes to review.
 * Nothing is invented: no mass from a count, no quantity from "to taste".
 *
 * Fraction policy: quantities are exact decimals. A fraction whose reduced denominator has a prime
 * factor other than 2 or 5 (thirds, sixths, sevenths...) has no exact decimal, so the line goes to
 * review with quantity null rather than storing a rounded value.
 *
 * Before parsing, price-only annotations such as "($0.16)" are removed (they are not quantities).
 * Preparation text (after the first top-level comma, a leading size word, a parenthetical without
 * digits) is split off the name into `note`.
 *
 * A line that needs review may carry a `suggestion`: a proposal a member can accept, made only when
 * the reading is unambiguous (rounded thirds, quarts as cups, cans times their stated size, the
 * larger end of a range, the first of two alternatives, "to taste" left out of grocery amounts...).
 * It never invents an amount the line does not state, and `suggestionNote` says what it did.
 */

export type IngredientSuggestion = { use: true; quantity: string; unit: string; name: string; form: "raw" | "cooked" } | { use: false };

export interface IngredientLine {
  raw: string;
  quantity: string | null;
  unit: string | null;
  name: string;
  note: string | null;
  form: "raw" | "cooked" | null;
  status: "parsed" | "requires_review";
  reasons: string[];
  suggestion: IngredientSuggestion | null; // only on requires_review lines
  suggestionNote: string | null;
}

export const MAX_QUANTITY = 10_000;

const VULGAR: Record<string, [number, number]> = {
  "½": [1, 2], "⅓": [1, 3], "⅔": [2, 3], "¼": [1, 4], "¾": [3, 4], "⅕": [1, 5], "⅖": [2, 5], "⅗": [3, 5], "⅘": [4, 5],
  "⅙": [1, 6], "⅚": [5, 6], "⅐": [1, 7], "⅛": [1, 8], "⅜": [3, 8], "⅝": [5, 8], "⅞": [7, 8], "⅑": [1, 9], "⅒": [1, 10],
};
const V = Object.keys(VULGAR).join("");
const VULGAR_LEAD = new RegExp(`^(\\d{1,6})?\\s?([${V}])`, "u");
const RANGE_LEAD = new RegExp(`^(?:-|–|—|to\\b|or\\b)\\s*[\\d.${V}]`, "u");
const HAS_VULGAR = new RegExp(`[${V}]`, "u");

// Unit words that are real but not convertible here: the line needs a person.
const UNSUPPORTED_UNITS = new Set([
  "can", "cans", "tin", "tins", "bunch", "bunches", "clove", "cloves", "pinch", "pinches", "dash", "dashes", "handful", "handfuls",
  "package", "packages", "pkg", "pkgs", "packet", "packets", "jar", "jars", "slice", "slices", "sprig", "sprigs", "head", "heads",
  "stalk", "stalks", "piece", "pieces", "stick", "sticks", "bag", "bags", "box", "boxes", "bottle", "bottles", "container", "containers",
  "carton", "cartons", "envelope", "envelopes", "quart", "quarts", "qt", "pint", "pints", "pt", "gallon", "gallons", "gal",
  "drop", "drops", "splash", "splashes", "sprinkle", "sprinkles", "scoop", "scoops", "sheet", "sheets", "ear", "ears", "leaf", "leaves", "rib", "ribs", "loaf", "loaves",
  "bulb", "bulbs", "knob", "inch", "inches", "block", "blocks", "fillet", "fillets", "link", "links", "strip", "strips",
]);

// Extra spellings beyond units.ts normalizeUnit. Case matters only for T (tbsp) and t (tsp).
const EXTRA_UNITS: Record<string, string> = {
  tbs: "tbsp", tbl: "tbsp", tbsps: "tbsp", tblsp: "tbsp", tsps: "tsp", c: "cup", kgs: "kg", gr: "g", gm: "g", gms: "g",
  litre: "l", litres: "l", millilitre: "ml", millilitres: "ml", mls: "ml", lt: "l",
};

const NO_QUANTITY = /\b(to taste|for serving|for garnish|as needed|as desired|optional|if desired)\b/i;

function unitOf(word: string): string | null {
  const w = word.replace(/\.$/, "");
  if (w === "T" || w === "Tb" || w === "TB") return "tbsp";
  if (w === "t") return "tsp";
  const lower = w.toLowerCase();
  const u = EXTRA_UNITS[lower] ?? normalizeUnit(lower);
  return KNOWN_UNITS.includes(u) ? u : null;
}

/** Exact decimal for num/den, or null when it does not terminate. */
function exactFraction(num: number, den: number): string | null {
  let reduced = den / gcd(num, den);
  while (reduced % 2 === 0) reduced /= 2;
  while (reduced % 5 === 0) reduced /= 5;
  return reduced === 1 ? new D(num).div(den).toFixed() : null;
}
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

type Qty = { value: string | null; rest: string; reason?: string };

/** Leading quantity: mixed (1 1/2, 1½), fraction (1/2, ½), decimal or integer. */
function leadingQuantity(s: string): Qty | null {
  let m: RegExpExecArray | null;
  const frac = (whole: number, num: number, den: number, rest: string): Qty => {
    if (den === 0 || num === 0 || (whole > 0 && num >= den)) return { value: null, rest, reason: "invalid fraction" };
    const f = exactFraction(num, den);
    if (f === null) return { value: null, rest, reason: "fraction not exact as a decimal" };
    return { value: new D(whole).plus(f).toFixed(), rest };
  };
  if ((m = /^(\d{1,6})\s+(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/])/.exec(s))) return frac(Number(m[1]), Number(m[2]), Number(m[3]), s.slice(m[0].length));
  if ((m = /^(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/])/.exec(s))) return frac(0, Number(m[1]), Number(m[2]), s.slice(m[0].length));
  if ((m = VULGAR_LEAD.exec(s))) {
    const [num, den] = VULGAR[m[2]];
    return frac(m[1] === undefined ? 0 : Number(m[1]), num, den, s.slice(m[0].length));
  }
  if ((m = /^(\d{1,12}(?:\.\d{1,6})?|\.\d{1,6})(?![\d/⁄])/.exec(s))) {
    const rest = s.slice(m[0].length);
    if (/^[.,]\d/.test(rest)) return { value: null, rest, reason: "unrecognized number format" };
    return { value: new D(m[1]).toFixed(), rest };
  }
  return null;
}

function formOf(lower: string): "raw" | "cooked" | null {
  if (/\b(uncooked|raw)\b/.test(lower)) return "raw";
  if (/\bcooked\b/.test(lower)) return "cooked";
  return null;
}


// --- Pre-cleaning and the name/note split ---------------------------------------------------------

// A price-only parenthetical: ($0.16), ($1.23*), ($.32). Budget-style cost annotations, never amounts.
const PRICE = /\(\s*\$\s*(?:\d{1,6}(?:\.\d{1,2})?|\.\d{1,2})\s*\*{0,3}\s*\)/g;
const SIZE_WORD = /^(extra[- ]large|small|medium|large)\s+(?=\S)/i;
const HAS_DIGIT = (s: string) => /\d/.test(s) || HAS_VULGAR.test(s);

/** Index of the first comma outside parentheses, or -1. */
function topLevelComma(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) return i;
  }
  return -1;
}

const trimPunct = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s,;:]+|[\s,;:]+$/g, "");

/** Name and preparation note: "large onion (yellow), diced" → "onion" + "large; yellow; diced". */
export function splitNote(text: string): { name: string; note: string | null } {
  const comma = topLevelComma(text);
  let head = comma < 0 ? text : text.slice(0, comma);
  const tail = comma < 0 ? "" : trimPunct(text.slice(comma + 1));
  const parens: string[] = [];
  head = head.replace(/\(([^()]*)\)/g, (m, inner: string) => {
    if (HAS_DIGIT(inner)) return m;
    const t = trimPunct(inner);
    if (t) parens.push(t);
    return " ";
  });
  head = trimPunct(head);
  const size = SIZE_WORD.exec(head);
  if (size) head = head.slice(size[0].length);
  const name = trimPunct(head);
  if (!name) return { name: trimPunct(text), note: null };
  const parts = [size ? size[1].toLowerCase() : "", ...parens, tail].filter((p) => p.length > 0);
  return { name, note: parts.length ? parts.join("; ") : null };
}

// --- Parsing --------------------------------------------------------------------------------------

type BaseLine = Omit<IngredientLine, "note" | "suggestion" | "suggestionNote">;

export function parseIngredientLine(raw: string): IngredientLine {
  const text = (typeof raw === "string" ? raw : "").replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  const line = text
    .replace(/^[•·*\-–]\s+/, "") // list bullets
    .replace(PRICE, " ")
    .replace(/\s+/g, " ")
    .trim();
  const form = formOf(line.toLowerCase());
  const base = readLine(raw, line, form);
  const { name, note } = splitNote(base.name);
  const out: IngredientLine = { ...base, name, note, suggestion: null, suggestionNote: null };
  if (base.status === "requires_review" && line) {
    const s = suggest(line, form);
    if (s) {
      out.suggestion = s.suggestion;
      out.suggestionNote = s.note;
    }
  }
  return out;
}

function readLine(raw: string, line: string, form: "raw" | "cooked" | null): BaseLine {
  const review = (reasons: string[], name = line, quantity: string | null = null): BaseLine => ({
    raw, quantity, unit: null, name, form, status: "requires_review", reasons,
  });
  if (!line) return review(["empty line"]);

  const reasons: string[] = [];
  if (NO_QUANTITY.test(line)) reasons.push("no fixed quantity");
  if (/\bor\b/i.test(line)) reasons.push("alternatives (or)");
  if (/\([^)]*\d[^)]*\)/.test(line)) reasons.push("parenthetical package size or note with numbers");

  const q = leadingQuantity(line);
  if (!q) return review([...reasons, "no quantity"]);
  if (q.reason) return review([...reasons, q.reason]);
  let rest = q.rest.trim();
  if (RANGE_LEAD.test(rest)) return review([...reasons, "quantity range"]);
  const qty = new D(q.value!);
  if (qty.lte(0)) return review([...reasons, "non-positive quantity"]);
  if (qty.gt(MAX_QUANTITY)) return review([...reasons, "implausible quantity"]);

  // Unit: "fl oz" first, then one word (attached forms like 200g allowed only for known units).
  let unit: string | null = null;
  let m: RegExpExecArray | null;
  const separated = q.rest.length > 0 && /^\s/.test(q.rest);
  if ((m = /^(?:fl\.?\s?oz\.?|fluid\s+ounces?)(?=[\s,)]|$)/i.exec(rest))) {
    unit = "fl_oz";
    rest = rest.slice(m[0].length).trim();
  } else if ((m = /^([A-Za-z]{1,12}\.?)(?=[\s,)]|$)/.exec(rest))) {
    const word = m[1];
    unit = unitOf(word);
    if (unit) rest = rest.slice(m[0].length).trim();
    else if (UNSUPPORTED_UNITS.has(word.toLowerCase().replace(/\.$/, ""))) {
      return review([...reasons, `unit not supported: ${word.toLowerCase().replace(/\.$/, "")}`], rest, reasons.length ? null : q.value);
    } else if (!separated) return review([...reasons, "unrecognized quantity"]);
  } else if (!separated && rest.length > 0) return review([...reasons, "unrecognized quantity"]);

  const name = rest.replace(/^of\s+/i, "").replace(/^[,;:]\s*/, "").trim();
  if (!/\p{L}/u.test(name)) return review([...reasons, "no ingredient name"]); // empty, or only punctuation
  if (/\d/.test(name) || HAS_VULGAR.test(name)) return review([...reasons, "more than one quantity"]);
  if (reasons.length) return review(reasons);
  return { raw, quantity: q.value, unit: unit ?? "each", name, form, status: "parsed", reasons: [] };
}

// --- Suggestions for lines that need review -------------------------------------------------------

/** An exact rational amount n/d (positive integers). BigInt keeps the exactness test exact. */
type Rat = { n: bigint; d: bigint };
type Amount = { rat: Rat; text: string; rest: string };

const mul = (a: Rat, b: Rat): Rat => ({ n: a.n * b.n, d: a.d * b.d });
const cmp = (a: Rat, b: Rat) => (a.n * b.d === b.n * a.d ? 0 : a.n * b.d > b.n * a.d ? 1 : -1);
const ONE: Rat = { n: BigInt(1), d: BigInt(1) };
const int = (n: number): Rat => ({ n: BigInt(n), d: BigInt(1) });
const bigGcd = (a: bigint, b: bigint): bigint => {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
};

/** Leading amount as an exact rational (thirds included); "invalid" for 1/0, 1 3/2, 1,5... */
function readAmount(s: string): Amount | "invalid" | null {
  let m: RegExpExecArray | null;
  const frac = (whole: number, num: number, den: number, len: number): Amount | "invalid" => {
    if (den === 0 || num === 0 || (whole > 0 && num >= den)) return "invalid";
    return { rat: { n: BigInt(whole) * BigInt(den) + BigInt(num), d: BigInt(den) }, text: s.slice(0, len).trim(), rest: s.slice(len) };
  };
  if ((m = /^(\d{1,6})\s+(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/])/.exec(s))) return frac(Number(m[1]), Number(m[2]), Number(m[3]), m[0].length);
  if ((m = /^(\d{1,4})\s*[/⁄]\s*(\d{1,4})(?![\d.,/])/.exec(s))) return frac(0, Number(m[1]), Number(m[2]), m[0].length);
  if ((m = VULGAR_LEAD.exec(s))) {
    const [num, den] = VULGAR[m[2]];
    return frac(m[1] === undefined ? 0 : Number(m[1]), num, den, m[0].length);
  }
  if ((m = /^(\d{1,12}(?:\.\d{1,6})?|\.\d{1,6})(?![\d/⁄])/.exec(s))) {
    const rest = s.slice(m[0].length);
    if (/^[.,]\d/.test(rest)) return "invalid";
    const [whole, fraction = ""] = m[1].split(".");
    return { rat: { n: BigInt(`${whole || "0"}${fraction}`), d: BigInt(10) ** BigInt(fraction.length) }, text: m[1], rest };
  }
  return null;
}

/** Exact decimal when n/d terminates (reduced denominator 2^a·5^b), else rounded half-up to 4 places with D. */
function decimalOf(r: Rat): { value: string; rounded: boolean } {
  const g = bigGcd(r.n, r.d);
  const n = r.n / g;
  const d = r.d / g;
  let rest = d;
  let twos = 0;
  let fives = 0;
  while (rest % BigInt(2) === BigInt(0)) (rest /= BigInt(2)), twos++;
  while (rest % BigInt(5) === BigInt(0)) (rest /= BigInt(5)), fives++;
  if (rest !== BigInt(1)) return { value: new D(n.toString()).div(d.toString()).toDecimalPlaces(4).toFixed(), rounded: true };
  const places = Math.max(twos, fives);
  const digits = ((n * BigInt(10) ** BigInt(places)) / d).toString().padStart(places + 1, "0");
  if (places === 0) return { value: digits, rounded: false };
  const fraction = digits.slice(-places).replace(/0+$/, "");
  return { value: fraction ? `${digits.slice(0, -places)}.${fraction}` : digits.slice(0, -places), rounded: false };
}

// Count words: singular → plural (the plural spellings map back through COUNT_WORDS).
const COUNT_PLURAL: Record<string, string> = {
  can: "cans", clove: "cloves", bunch: "bunches", head: "heads", stalk: "stalks", sprig: "sprigs", slice: "slices", piece: "pieces",
  stick: "sticks", ear: "ears", leaf: "leaves", rib: "ribs", loaf: "loaves", bulb: "bulbs", fillet: "fillets", link: "links", strip: "strips",
  sheet: "sheets", package: "packages", jar: "jars", bag: "bags", box: "boxes", bottle: "bottles", container: "containers", carton: "cartons",
  envelope: "envelopes", packet: "packets", tin: "tins", block: "blocks",
};
const COUNT_WORDS: Record<string, string> = { pkg: "package", pkgs: "package" };
for (const [one, many] of Object.entries(COUNT_PLURAL)) COUNT_WORDS[one] = COUNT_WORDS[many] = one;

const TO_CUPS: Record<string, { factor: number; note: string }> = {};
for (const [words, factor, note] of [
  [["quart", "quarts", "qt", "qts"], 4, "1 quart = 4 cups"],
  [["pint", "pints", "pt", "pts"], 2, "1 pint = 2 cups"],
  [["gallon", "gallons", "gal", "gals"], 16, "1 gallon = 16 cups"],
] as const) for (const w of words) TO_CUPS[w] = { factor, note };

const SIZE_UNITS: Record<string, string> = {
  oz: "oz", ounce: "oz", ounces: "oz", g: "g", gr: "g", gram: "g", grams: "g", kg: "kg", kilogram: "kg", kilograms: "kg", lb: "lb", lbs: "lb",
  pound: "lb", pounds: "lb", ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", l: "l", liter: "l", liters: "l",
  litre: "l", litres: "l",
};

/** A package size: "15 oz", "14.5-ounce", "14.5 oz each", "12 fl oz", "400 g". */
function readSize(text: string): { rat: Rat; unit: string; label: string } | null {
  const a = readAmount(text.trim());
  if (!a || a === "invalid") return null;
  const m = /^\s*(?:-\s*)?(fl\.?\s?oz|fluid\s+ounces?|[A-Za-z]{1,11})\.?(?:\s+each)?\s*$/.exec(a.rest);
  if (!m) return null;
  const w = m[1].toLowerCase();
  const unit = /^(?:fl|fluid)/.test(w) ? "fl_oz" : SIZE_UNITS[w];
  if (!unit) return null;
  return { rat: a.rat, unit, label: `${a.text} ${unit === "fl_oz" ? "fl oz" : unit}` };
}

const NO_AMOUNT = /\b(to taste|for serving|for garnish(?:ing)?|as needed|as desired|optional|if desired|for dusting|for greasing|for frying|for drizzling|for topping)\b/i;
const VAGUE_UNIT = /^(pinch(?:es)?|dash(?:es)?|drops?|splash(?:es)?|handfuls?|sprinkles?)\b/i;
const VAGUE_LEAD = /^(?:(?:a|an|one|a few|few|several|a small|a large|a big|a generous|a good|small|large|big|generous)\s+)?(pinch(?:es)?|dash(?:es)?|drops?|splash(?:es)?|handfuls?|sprinkles?)\b/i;
const vagueNote = (word: string) => `a ${word.toLowerCase().replace(/(ch|sh)es$/, "$1").replace(/([^s])s$/, "$1")}: no fixed amount; leave it out of grocery amounts`;
const LEAVE_OUT = "no fixed amount: leave it out of grocery amounts";

/**
 * A proposal for a line that needs review, or null when the reading is not unambiguous. Every
 * `use: true` proposal has a positive exact decimal quantity, a known unit and a name without digits,
 * and every quantity comes from the line itself.
 */
function suggest(line: string, form: "raw" | "cooked" | null): { suggestion: IngredientSuggestion; note: string } | null {
  const leaveOut = (note: string) => ({ suggestion: { use: false } as const, note });
  const first = readAmount(line);

  // 1, 2: no leading amount
  if (first === null) {
    if (!HAS_DIGIT(line) && NO_AMOUNT.test(line)) return leaveOut(LEAVE_OUT);
    const v = VAGUE_LEAD.exec(line);
    return v ? leaveOut(vagueNote(v[1])) : null;
  }
  if (first === "invalid") return null;

  const notes: string[] = [];
  let amount = first.rat;
  let amountText = first.text;
  let rest = first.rest;

  // 7: a range ("2-3", "2 – 3", "2 to 3", "1 or 2") → the larger amount
  const sep = /^\s*(?:-|–|—|(?:to|or)(?=\s))\s*/i.exec(rest);
  if (sep) {
    const second = readAmount(rest.slice(sep[0].length));
    if (second === "invalid") return null;
    if (second) {
      if (cmp(second.rat, amount) > 0) {
        amount = second.rat;
        amountText = second.text;
      }
      rest = second.rest;
      notes.push("range: used the larger amount");
    }
  }
  if (rest && !/^[\s(]/.test(rest)) {
    // only a known unit may be attached to the number ("200g")
    const att = /^([A-Za-z]{1,12}\.?)(?=[\s,)]|$)/.exec(rest);
    if (!att || !unitOf(att[1])) return null;
  }
  rest = rest.trim();

  // 2: pinch, dash, drops... as the unit
  const vague = VAGUE_UNIT.exec(rest);
  if (vague) return leaveOut(vagueNote(vague[1]));

  let unit: string | null = null;
  let factor: Rat | null = null;
  let packaged = false;
  let countWord: string | null = null;
  const pack = (size: { rat: Rat; unit: string; label: string }, container: string | null) => {
    factor = size.rat;
    unit = size.unit;
    packaged = true;
    const word = container ? ` ${cmp(amount, ONE) > 0 ? COUNT_PLURAL[container] : container}` : "";
    notes.push(`${amountText}${word} × ${size.label}`);
  };
  const sizeInParens = (s: string) => {
    const close = s.indexOf(")");
    return s.startsWith("(") && close > 0 ? { size: readSize(s.slice(1, close)), after: s.slice(close + 1).trim() } : null;
  };
  const wordAt = (s: string) => /^([A-Za-z]{1,12})\.?(?=[\s,(]|$)/.exec(s);

  // 5: "(15 oz) can black beans", "(6-ounce) salmon fillets"
  const p = sizeInParens(rest);
  if (p?.size) {
    let after = p.after;
    const w = wordAt(after);
    const container = w ? (COUNT_WORDS[w[1].toLowerCase()] ?? null) : null;
    if (w && container) after = after.slice(w[0].length).trim();
    pack(p.size, container);
    rest = after;
  }
  // 5: "15-oz can chickpeas", "28 ounce can tomatoes"
  if (!packaged && /^\d/.test(rest)) {
    const words = rest.split(" ");
    for (let k = 1; k <= 3 && k < words.length; k++) {
      const cw = /^([A-Za-z]{1,12})\.?(,?)$/.exec(words[k]);
      const container = cw ? COUNT_WORDS[cw[1].toLowerCase()] : undefined;
      const size = container ? readSize(words.slice(0, k).join(" ")) : null;
      if (container && size) {
        pack(size, container);
        rest = `${cw![2]} ${words.slice(k + 1).join(" ")}`.trim();
        break;
      }
    }
  }
  if (!packaged) {
    let m: RegExpExecArray | null;
    if ((m = /^(?:fl\.?\s?oz\.?|fluid\s+ounces?)(?=[\s,)(]|$)/i.exec(rest))) {
      unit = "fl_oz";
      rest = rest.slice(m[0].length).trim();
    } else if ((m = wordAt(rest))) {
      const lw = m[1].toLowerCase();
      const after = rest.slice(m[0].length).trim();
      const known = unitOf(m[0]);
      if (known) {
        unit = known;
        rest = after;
      } else if (TO_CUPS[lw]) {
        // 4: quarts, pints, gallons → cups, exactly
        factor = int(TO_CUPS[lw].factor);
        unit = "cup";
        notes.push(TO_CUPS[lw].note);
        rest = after;
      } else if (COUNT_WORDS[lw]) {
        rest = after;
        const q = sizeInParens(rest);
        if (q?.size) {
          // 5: "can (15 oz) black beans", "cans (14.5 oz each)"
          pack(q.size, COUNT_WORDS[lw]);
          rest = q.after;
        } else {
          // 6: counted containers and pieces
          countWord = COUNT_WORDS[lw];
          unit = "each";
          notes.push(`counted as ${COUNT_PLURAL[countWord]}`);
        }
      } else if (UNSUPPORTED_UNITS.has(lw)) return null; // knob, inch, scoop...: no honest reading
      else unit = "each"; // the word starts the name
    } else unit = "each";
  }

  let name = rest.replace(/^of\s+/i, "");
  // The note (after the first top-level comma) must not hide a second amount.
  const comma = topLevelComma(name);
  if (comma >= 0) {
    if (HAS_DIGIT(name.slice(comma))) return null;
    name = name.slice(0, comma);
  }
  // 9: numbered parentheticals that are not a package size are dropped; others are notes
  const dropped: string[] = [];
  name = name.replace(/\(([^()]*)\)/g, (m, inner: string) => {
    if (HAS_DIGIT(inner)) dropped.push(m.replace(/\s+/g, " "));
    return " ";
  });
  if (dropped.length) notes.push(`kept the first amount; dropped ${dropped.join(" ")}`);
  const na = NO_AMOUNT.exec(name);
  if (na) name = name.slice(0, na.index).replace(/(?:\s+(?:or|and))?[\s,;:]*$/i, "");
  // 8: "A or B" → A, unless the shared word is unclear ("chicken or vegetable broth")
  const or = /\s+or\s+/i.exec(name);
  if (or) {
    const a = trimPunct(name.slice(0, or.index));
    const b = trimPunct(name.slice(or.index + or[0].length));
    const bHasAmount = readAmount(b) !== null;
    if (!bHasAmount && a.split(" ").length === 1 && b.split(" ").length > 1) return null;
    name = a;
    notes.push(`alternatives: used the first (${a})`);
  }
  name = trimPunct(name).replace(SIZE_WORD, "");
  name = trimPunct(name);
  if (!/\p{L}/u.test(name) || name.length > 200 || HAS_DIGIT(name) || /[()$]/.test(name)) return null; // e.g. "1 cup plus 2 tbsp"
  if (countWord) name = `${name} (${countWord})`;

  // 3: amounts with no exact decimal are rounded half-up to 4 places
  const value = decimalOf(factor ? mul(amount, factor) : amount);
  if (value.rounded) notes.unshift(packaged || factor ? `rounded to ${value.value}` : `${amountText} rounded to ${value.value}`);
  const q = new D(value.value);
  if (q.lte(0) || q.gt(MAX_QUANTITY) || unit === null || !KNOWN_UNITS.includes(unit)) return null;
  if (!notes.length) notes.push("used the stated amount");
  return { suggestion: { use: true, quantity: value.value, unit, name, form: form ?? "raw" }, note: notes.join("; ") };
}

import { D, KNOWN_UNITS, normalizeUnit } from "@/domain/units";

/**
 * Conservative ingredient-line parsing. A line is `parsed` only when it is exactly
 * `<quantity> [<known unit>] <name>` with nothing else numeric; everything else goes to review.
 * Nothing is invented: no mass from a count, no quantity from "to taste".
 *
 * Fraction policy: quantities are exact decimals. A fraction whose reduced denominator has a prime
 * factor other than 2 or 5 (thirds, sixths, sevenths...) has no exact decimal, so the line goes to
 * review with quantity null rather than storing a rounded value.
 */

export interface IngredientLine {
  raw: string;
  quantity: string | null;
  unit: string | null;
  name: string;
  form: "raw" | "cooked" | null;
  status: "parsed" | "requires_review";
  reasons: string[];
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
  "drop", "drops", "splash", "scoop", "scoops", "sheet", "sheets", "ear", "ears", "leaf", "leaves", "rib", "ribs", "loaf", "loaves",
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

export function parseIngredientLine(raw: string): IngredientLine {
  const text = (typeof raw === "string" ? raw : "").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  const line = text.replace(/^[•·*\-–]\s+/, ""); // list bullets
  const lower = line.toLowerCase();
  const form = formOf(lower);
  const review = (reasons: string[], name = line, quantity: string | null = null): IngredientLine => ({
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
  if (!name) return review([...reasons, "no ingredient name"]);
  if (/\d/.test(name) || HAS_VULGAR.test(name)) return review([...reasons, "more than one quantity"]);
  if (reasons.length) return review(reasons);
  return { raw, quantity: q.value, unit: unit ?? "each", name, form, status: "parsed", reasons: [] };
}

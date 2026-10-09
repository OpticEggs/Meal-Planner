import { KNOWN_UNITS, normalizeUnit } from "@/domain/units";
import { formatAmount, MAX_AMOUNT, ratCmp, ratInt, ratMul, readLeadingAmount, VULGAR, type Rat } from "@/domain/quantity";
import { isHouseholdSeasoning } from "@/domain/groceries/seasonings";

/**
 * Ingredient-line parsing (import overhaul, 2026-10-09). A line is split into an EXACT amount (a rational,
 * "1/3" stays a third), a unit Table converts, the ingredient name, and a note (preparation, size words and
 * every parenthetical, nested ones included). Nothing is invented: no weight from a volume, no amount for
 * "to taste", no pick from a range or between alternatives.
 *
 *  - parsed:          everything was read; the review starts it as "Use".
 *  - requires_review: a person must settle the amount (a range, no amount, a pinch, two-part amounts, an
 *                     unreadable number) or the ingredient (alternatives); `reasons` say which, the name is
 *                     still the clean name (never the whole line), and a range/alternatives are kept as stated.
 *  - omitted:         ordinary salt and black pepper — household seasonings, never bought.
 *
 * Exact conversions only: quarts, pints and gallons become cups; "1 (15 oz) can" is 15 oz. Count words
 * keep what was counted in the name ("garlic (clove)", unit each).
 */

export interface IngredientLine {
  raw: string;
  /** Exact amount for the whole recipe: "12", "1.5", "1/3", "1 1/3"; null when a person must give it. */
  quantity: string | null;
  unit: string | null;
  name: string;
  note: string | null;
  form: "raw" | "cooked" | null;
  status: "parsed" | "requires_review" | "omitted";
  reasons: string[];
  /** A stated range, low and high ("2", "3"), when the line gives one. */
  range: [string, string] | null;
  /** Stated alternatives ("milk", "cream"), when the line offers a choice of ingredient. */
  alternatives: string[] | null;
}

const VCLASS = Object.keys(VULGAR).join("");

// Words that count something: the amount is a count (unit each) and the name says what was counted.
const COUNT_PLURAL: Record<string, string> = {
  can: "cans", clove: "cloves", bunch: "bunches", head: "heads", stalk: "stalks", sprig: "sprigs", slice: "slices", piece: "pieces",
  stick: "sticks", ear: "ears", leaf: "leaves", rib: "ribs", loaf: "loaves", bulb: "bulbs", fillet: "fillets", link: "links", strip: "strips",
  sheet: "sheets", package: "packages", jar: "jars", bag: "bags", box: "boxes", bottle: "bottles", container: "containers", carton: "cartons",
  envelope: "envelopes", packet: "packets", tin: "tins", block: "blocks",
};
const COUNT_WORDS: Record<string, string> = { pkg: "package", pkgs: "package" };
for (const [one, many] of Object.entries(COUNT_PLURAL)) COUNT_WORDS[one] = COUNT_WORDS[many] = one;

// Amounts that are not amounts: a person decides (or leaves the line out).
const VAGUE = /^(pinch(?:es)?|dash(?:es)?|drops?|splash(?:es)?|handfuls?|sprinkles?|knobs?|scoops?)$/i;
const VAGUE_LEAD = /^(?:(?:a|an|one|a few|few|several|a small|a large|a big|a generous|a good|small|large|big|generous)\s+)?(pinch(?:es)?|dash(?:es)?|drops?|splash(?:es)?|handfuls?|sprinkles?)\b\s*(?:of\s+)?/i;

// Exact volume conversions to cups.
const TO_CUPS: Record<string, number> = { quart: 4, quarts: 4, qt: 4, qts: 4, pint: 2, pints: 2, pt: 2, pts: 2, gallon: 16, gallons: 16, gal: 16, gals: 16 };

// Extra spellings beyond units.ts normalizeUnit. Case matters only for T (tbsp) and t (tsp).
const EXTRA_UNITS: Record<string, string> = {
  tbs: "tbsp", tbl: "tbsp", tbsps: "tbsp", tblsp: "tbsp", tsps: "tsp", c: "cup", kgs: "kg", gr: "g", gm: "g", gms: "g",
  litre: "l", litres: "l", millilitre: "ml", millilitres: "ml", mls: "ml", lt: "l",
};

const SIZE_UNITS: Record<string, string> = {
  oz: "oz", ounce: "oz", ounces: "oz", g: "g", gr: "g", gram: "g", grams: "g", kg: "kg", kilogram: "kg", kilograms: "kg", lb: "lb", lbs: "lb",
  pound: "lb", pounds: "lb", ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", l: "l", liter: "l", liters: "l",
  litre: "l", litres: "l",
};

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

// Phrases that say there is no fixed amount; they move to the note.
const NO_AMOUNT = /\b(to taste|for serving|for garnish(?:ing)?|as needed|as desired|optional|if desired|for dusting|for greasing|for frying|for drizzling|for topping)\b/i;

// Words that only modify the head noun of an alternative ("chicken or vegetable broth").
const MODIFIERS = new Set([
  "chicken", "beef", "vegetable", "veggie", "turkey", "pork", "fish", "seafood", "white", "red", "brown", "yellow", "green", "black", "dark", "light",
  "whole", "skim", "fresh", "dried", "frozen", "canned", "sweet", "unsalted", "salted", "greek", "plain", "apple", "cider", "balsamic", "rice", "coconut",
  "almond", "soy", "oat", "regular", "low-sodium", "reduced-sodium", "full-fat", "low-fat", "nonfat", "baby", "spring",
]);

const PRICE = /\(\s*\$\s*(?:\d{1,6}(?:\.\d{1,2})?|\.\d{1,2})\s*\*{0,3}\s*\)/g;
const SIZE_WORD = /^(extra[- ]large|small|medium|large)\s+(?=\S)/i;

function unitOf(word: string): string | null {
  const w = word.replace(/\.$/, "");
  if (w === "T" || w === "Tb" || w === "TB") return "tbsp";
  if (w === "t") return "tsp";
  const lower = w.toLowerCase();
  const u = EXTRA_UNITS[lower] ?? normalizeUnit(lower);
  return KNOWN_UNITS.includes(u) ? u : null;
}

function formOf(lower: string): "raw" | "cooked" | null {
  if (/\b(uncooked|raw)\b/.test(lower)) return "raw";
  if (/\bcooked\b/.test(lower)) return "cooked";
  return null;
}

const trimPunct = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s,;:]+|[\s,;:]+$/g, "");

/** A package size: "15 oz", "14.5-ounce", "14.5 oz each", "12 fl oz", "400 g". */
function readSize(text: string): { rat: Rat; unit: string; decimal: boolean } | null {
  const t = text.trim();
  const a = readLeadingAmount(t);
  if (!a || a === "invalid") return null;
  const m = /^\s*(?:-\s*)?(fl\.?\s?oz|fluid\s+ounces?|[A-Za-z]{1,11})\.?(?:\s+each)?\s*$/.exec(t.slice(a.len));
  if (!m) return null;
  const w = m[1].toLowerCase();
  const unit = /^(?:fl|fluid)/.test(w) ? "fl_oz" : SIZE_UNITS[w];
  return unit ? { rat: a.rat, unit, decimal: a.decimal } : null;
}

/** Removes every top-level parenthetical (nested ones stay inside it) in one linear pass. */
function takeParentheticals(s: string): { rest: string; groups: string[] } {
  let depth = 0;
  let start = -1;
  let rest = "";
  const groups: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === ")" && depth > 0) {
      depth--;
      if (depth === 0) {
        groups.push(s.slice(start + 1, i));
        rest += " ";
      }
    } else if (c === ")") rest += " ";
    else if (depth === 0) rest += c;
  }
  if (depth > 0) rest += ` ${s.slice(start + 1).replace(/[()]/g, " ")}`; // an unclosed "(": its text stays, the bracket goes
  return { rest, groups: groups.map((g) => trimPunct(g)).filter(Boolean) };
}

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

/** Name and note: "large onion (yellow), diced" → "onion" + "large; yellow; diced". */
function nameAndNote(text: string): { name: string; notes: string[]; noAmount: string | null } {
  const comma = topLevelComma(text);
  const head = comma < 0 ? text : text.slice(0, comma);
  const tail = comma < 0 ? "" : trimPunct(text.slice(comma + 1));
  const { rest, groups } = takeParentheticals(head);
  let name = trimPunct(rest).replace(/^of\s+/i, "");
  let noAmount: string | null = null;
  const na = NO_AMOUNT.exec(name);
  if (na) {
    noAmount = na[1].toLowerCase();
    name = trimPunct(`${name.slice(0, na.index)} ${name.slice(na.index + na[0].length)}`).replace(/\s+(?:or|and)$/i, "");
  }
  const size = SIZE_WORD.exec(name);
  if (size) name = trimPunct(name.slice(size[0].length));
  const notes = [size ? size[1].toLowerCase() : "", ...groups, noAmount && !tail.toLowerCase().includes(noAmount) && !groups.some((g) => g.toLowerCase().includes(noAmount!)) ? noAmount : "", tail].filter(Boolean);
  const tailNa = NO_AMOUNT.exec(tail) ?? groups.map((g) => NO_AMOUNT.exec(g)).find(Boolean) ?? null;
  return { name: trimPunct(name), notes, noAmount: noAmount ?? (tailNa ? tailNa[1].toLowerCase() : null) };
}

/** "chicken or vegetable broth" → ["chicken broth", "vegetable broth"]; "milk or cream" → as stated. */
function alternativesOf(name: string): string[] | null {
  const parts = name.split(/\s+or\s+/i).map(trimPunct).filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].split(" ");
  const head = last[last.length - 1];
  return parts.map((p, i) => (i < parts.length - 1 && !p.includes(" ") && MODIFIERS.has(p.toLowerCase()) && last.length > 1 ? `${p} ${head}` : p));
}

const fmt = (r: Rat, decimal: boolean) => formatAmount(r, decimal);

export function parseIngredientLine(raw: string): IngredientLine {
  const original = typeof raw === "string" ? raw : "";
  const text = original
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500)
    .replace(/^[•·*\-–]\s+/, "")
    .replace(PRICE, " ")
    .replace(/(?<=\S)\s+\$\s?\d{1,6}(?:\.\d{1,2})?\*{0,3}(?=\s*(?:$|,))/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const form = formOf(text.toLowerCase());
  const out = (o: Partial<IngredientLine>): IngredientLine => ({
    raw: original, quantity: null, unit: null, name: "", note: null, form, status: "requires_review", reasons: [], range: null, alternatives: null, ...o,
  });
  if (!text) return out({ reasons: ["Empty line"] });

  const reasons: string[] = [];
  const preNotes: string[] = [];
  let s = text;
  if (/^optional:?\s+/i.test(s)) {
    preNotes.push("optional");
    s = s.replace(/^optional:?\s+/i, "");
  }
  const step = /^\d{1,2}[.)]\s+(?=[A-Za-z])/.exec(s);
  if (step) return out({ name: trimPunct(s.slice(step[0].length)).slice(0, 200), reasons: ["Looks like a recipe step, not an ingredient"] });
  const word = /^([A-Za-z]+)\s+/.exec(s);
  if (word && NUMBER_WORDS[word[1].toLowerCase()] !== undefined) s = `${NUMBER_WORDS[word[1].toLowerCase()]} ${s.slice(word[0].length)}`;

  // 1. The amount, and a range.
  let amount = null as Rat | null;
  let decimal = false;
  let range: [string, string] | null = null;
  let amountProblem = false;
  const a = readLeadingAmount(s);
  if (a === "invalid") {
    reasons.push("The amount can't be read");
    amountProblem = true;
    s = s.replace(new RegExp(`^[\\d.,/⁄${VCLASS}\\s-]+`, "u"), "");
  } else if (a) {
    amount = a.rat;
    decimal = a.decimal;
    s = s.slice(a.len);
    const sep = /^\s*(?:-|–|—|to(?=\s)|or(?=\s))\s*/i.exec(s);
    const b = sep ? readLeadingAmount(s.slice(sep[0].length)) : null;
    if (sep && b && b !== "invalid") {
      range = [fmt(amount, decimal), fmt(b.rat, b.decimal)];
      reasons.push(`The recipe gives a range (${range[0]}–${range[1]}) — say how much you'll use`);
      amount = null;
      s = s.slice(sep[0].length + b.len);
    }
    if (/^[A-Za-z]/.test(s)) {
      const att = /^([A-Za-z]{1,12}\.?)(?=[\s,()]|$)/.exec(s);
      if (!att || !(unitOf(att[1]) || (att[1].toLowerCase() === "fl" && /^fl\.?\s?oz/i.test(s)))) {
        reasons.push("The amount can't be read");
        amountProblem = true;
        amount = null;
      }
    }
    if (amount && ratCmp(amount, ratInt(MAX_AMOUNT)) > 0) {
      reasons.push("That amount is too large to be right");
      amountProblem = true;
      amount = null;
    }
  } else {
    const v = VAGUE_LEAD.exec(s);
    if (v) {
      reasons.push(`No fixed amount (a ${v[1].toLowerCase().replace(/(ch|sh)es$/, "$1").replace(/([^s])s$/, "$1")})`);
      s = s.slice(v[0].length);
      amountProblem = true;
    }
  }
  s = s.trim();

  // 2. A package size: "(15 oz) can …", "15-oz can …", "can (14.5 oz) …".
  let unit = null as string | null;
  let countWord = null as string | null;
  let packaged = false as boolean;
  const pack = (size: { rat: Rat; unit: string; decimal: boolean }) => {
    unit = size.unit;
    packaged = true;
    if (amount) {
      amount = ratMul(amount, size.rat);
      decimal = true;
    }
  };
  const paren = /^\(([^()]*)\)\s*/.exec(s);
  const parenSize = paren ? readSize(paren[1]) : null;
  if (paren && parenSize && (amount || range)) {
    s = s.slice(paren[0].length);
    const w = /^([A-Za-z]{1,12})\.?(?=[\s,(]|$)\s*/.exec(s);
    if (w && COUNT_WORDS[w[1].toLowerCase()]) s = s.slice(w[0].length);
    pack(parenSize);
  } else if ((amount || range) && /^\d/.test(s)) {
    const words = s.split(" ");
    for (let k = 1; k <= 3 && k < words.length; k++) {
      const cw = /^([A-Za-z]{1,12})\.?(,?)$/.exec(words[k]);
      const size = cw && COUNT_WORDS[cw[1].toLowerCase()] ? readSize(words.slice(0, k).join(" ")) : null;
      if (size) {
        pack(size);
        s = `${cw![2]} ${words.slice(k + 1).join(" ")}`.trim();
        break;
      }
    }
  }

  // 3. The unit.
  if (!packaged && (amount || range || amountProblem)) {
    let m: RegExpExecArray | null;
    if ((m = /^(?:fl\.?\s?oz\.?|fluid\s+ounces?)(?=[\s,)(]|$)/i.exec(s))) {
      unit = "fl_oz";
      s = s.slice(m[0].length).trim();
    } else if ((m = /^([A-Za-z]{1,12})\.?(?=[\s,(]|$)/.exec(s))) {
      const lw = m[1].toLowerCase();
      const after = s.slice(m[0].length).trim();
      const known = unitOf(m[0]);
      if (known) {
        unit = known;
        s = after;
      } else if (TO_CUPS[lw]) {
        unit = "cup";
        if (amount) amount = ratMul(amount, ratInt(TO_CUPS[lw]));
        if (range) range = [fmt(ratMul(readAmountOrOne(range[0]), ratInt(TO_CUPS[lw])), false), fmt(ratMul(readAmountOrOne(range[1]), ratInt(TO_CUPS[lw])), false)];
        s = after;
      } else if (COUNT_WORDS[lw]) {
        s = after;
        const q = /^\(([^()]*)\)\s*/.exec(s);
        const size = q ? readSize(q[1]) : null;
        if (q && size) {
          s = s.slice(q[0].length);
          pack(size);
        } else {
          countWord = COUNT_WORDS[lw];
          unit = "each";
        }
      } else if (VAGUE.test(lw)) {
        reasons.push(`No fixed amount (a ${lw.replace(/(ch|sh)es$/, "$1").replace(/([^s])s$/, "$1")})`);
        amountProblem = true;
        amount = null;
        s = after.replace(/^of\s+/i, "");
      } else unit = "each"; // the word starts the name
    } else if (amount || range) unit = "each";
  }

  // 4. A second amount ("1 lb 4 oz", "1 cup plus 2 tbsp") — the person gives the total.
  const second = /^(?:plus\s+|\+\s*|and\s+)?/i.exec(s)![0];
  const b = readLeadingAmount(s.slice(second.length));
  if (b && b !== "invalid" && (amount || range)) {
    const after = s.slice(second.length + b.len).trim();
    const u = /^(fl\.?\s?oz\.?|[A-Za-z]{1,12}\.?)(?=[\s,(]|$)/.exec(after);
    if (u && (unitOf(u[1]) || /^fl/i.test(u[1]))) {
      reasons.push(`The amount has two parts — enter the total`);
      amountProblem = true;
      amount = null;
      s = after.slice(u[0].length).trim();
    }
  }

  // 5. Name and note.
  const { name: rawName, notes, noAmount } = nameAndNote(s);
  let name = rawName.slice(0, 200);
  const note = [...preNotes, ...notes].filter((n, i, all) => all.indexOf(n) === i).join("; ").slice(0, 500) || null;
  const alternatives = alternativesOf(name);

  if (isHouseholdSeasoning(name, amount || range ? unit : null) && !alternatives) {
    return out({
      quantity: amount ? fmt(amount, decimal) : null, unit: amount ? unit : null, name, note, status: "omitted",
      reasons: ["Household seasoning — not added to groceries"],
    });
  }
  if (countWord && name) name = `${name} (${countWord})`;
  if (!amount && !range && !amountProblem) reasons.push(noAmount ? `No amount given (${noAmount})` : "No amount given");
  if (alternatives) {
    reasons.push(`Choose one: ${alternatives.join(" or ")}`);
    name = "";
  } else if (!name || !/\p{L}/u.test(name)) {
    reasons.push("No ingredient name");
    name = "";
    amount = null;
    range = null;
  }
  if (!reasons.length && amount && unit) {
    return out({ quantity: fmt(amount, decimal), unit, name, note, status: "parsed" });
  }
  const keepAmount = !!alternatives && amount !== null;
  return out({
    quantity: keepAmount && amount ? fmt(amount, decimal) : null,
    unit: keepAmount || range ? unit : null,
    name, note, reasons, range, alternatives,
  });
}

function readAmountOrOne(text: string): Rat {
  const a = readLeadingAmount(text);
  return a && a !== "invalid" ? a.rat : ratInt(1);
}

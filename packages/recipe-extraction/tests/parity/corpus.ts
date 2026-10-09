/**
 * The ingredient-line parity corpus: every string literal of Table's two ingredient-line test files,
 * the property sweep of Table's suggestion test (same arrays, same combination rule), the hostile
 * lines of both files, and a seeded pseudo-random generator (≥ 20 000 lines) built from tokens that
 * exercise every branch of the legacy parser. Deterministic: same seed → same lines.
 */
import { TABLE_TEST_LITERALS } from "./table-test-literals";

/** mulberry32: a small deterministic PRNG (32-bit state). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;
export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
export const chance = (rng: Rng, p: number) => rng() < p;
export const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

/** The property sweep of tests/unit/recipe-import-ingredient-suggest.test.ts (cb7b56e), reproduced. */
export function tableSweepLines(): string[] {
  const amounts = ["1", "2", "10", "0.25", ".5", "1/2", "3/4", "1/3", "2/3", "⅓", "½", "1 1/3", "1⅓", "1½", "2-3", "1 to 2", "1 or 2", "⅓-½", "0", "1/0", "12345", "1,5"];
  const units = ["", "cup", "cups", "Tbsp", "T", "tsp", "oz", "lb", "lbs", "g", "kg", "ml", "L", "fl oz", "quart", "pints", "gal", "can", "cans", "cloves", "bunch", "pinch", "dash", "slices", "stick", "knob", "(15 oz) can", "can (14.5 oz)", "(6-ounce)", "15-oz can", "(240 ml)", "large", "of"];
  const names = ["flour", "black beans", "garlic", "milk or cream", "chicken or vegetable broth", "onion", "cheddar (shredded)", "rice (1 cup)", "cooked rice", "2% milk", ""];
  const suffixes = ["", ", diced", ", to taste", " ($0.16)", " (optional)", ", plus 2 tbsp", " to taste", ", or 1 cup water", " ($1.23*)", ", divided"];
  const prefixes = ["", "- ", "• ", "optional: ", "a "];
  const out: string[] = [];
  for (const [ai, a] of amounts.entries()) {
    for (const [ui, u] of units.entries()) {
      for (const [ni, name] of names.entries()) {
        const suffix = suffixes[(ai + ui + ni) % suffixes.length];
        const prefix = prefixes[(ai * 7 + ui * 3 + ni) % prefixes.length];
        out.push(`${prefix}${a} ${u} ${name}${suffix}`.replace(/\s+/g, " "));
      }
    }
  }
  // The full cross product without the rotation, too (no suffix/prefix), for broader coverage.
  for (const a of amounts) for (const u of units) for (const name of names) out.push(`${a} ${u} ${name}`);
  return out;
}

/** The hostile lines of Table's two ingredient-line test files (built with template literals there). */
export function hostileLines(): string[] {
  return [
    "1".repeat(100_000),
    "1 ".repeat(50_000),
    `1 ${"(".repeat(10_000)}`,
    "½".repeat(10_000),
    "1/".repeat(10_000),
    `<script>alert(1)</script>`,
    "\u0000‮1 cup",
    `1 ${"(15 oz) ".repeat(5_000)}can beans`,
    `1 can ${"(14.5 oz) ".repeat(5_000)}`,
    `${"1 or ".repeat(10_000)}2 eggs`,
    `${"2-".repeat(10_000)}3 cups`,
    `1 cup ${"milk or ".repeat(10_000)}cream`,
    `1 cup ${"a, ".repeat(10_000)}`,
    `1 cup flour ${"($0.16) ".repeat(10_000)}`,
    `($${"9".repeat(10_000)})`,
    `1 ${" ".repeat(100_000)}cup`,
    `⅓ ${"large ".repeat(10_000)}onion`,
    `1 15-oz ${"can ".repeat(10_000)}`,
    "<script>alert(1)</script> 1 cup",
    "\u0000‮1 cup milk",
    `1 cup ${"(a(b(c".repeat(5_000)}`,
    // Truncation boundaries: exactly at, just over, and well over 500 characters after cleaning.
    `2 cups ${"a".repeat(493)}`,
    `2 cups ${"a".repeat(494)}`,
    `2 cups ${"a".repeat(600)}`,
    `${" ".repeat(1_000)}2 cups flour${" ".repeat(1_000)}`,
    `2 cups ${"​".repeat(1_000)}flour`,
    `1/3 cup ${"x".repeat(497)}`,
    `2 cups ${"😀".repeat(300)}`,
  ];
}

const T = {
  integers: ["0", "1", "2", "3", "4", "10", "12", "100", "250", "9999", "10000", "10001", "20000", "123456", "1234567", "123456789012", "1234567890123", "007", "00"],
  decimals: [".5", "0.5", "1.25", "1.50", "0.1", "0.000001", "0.0000001", "2.", "1.2.3", "1,5", "1,000", "0.0", "3.14159", "9999.999999", "10000.0", "10000.000001", ".", ".25"],
  fractions: ["1/2", "1/3", "2/3", "1/0", "0/4", "3/2", "5/8", "1/1024", "1/30000", "2/12", "1/7", "9999/9999", "1 / 3", "1/ 3", "1 /3", "1//3", "1/2/3", "10/4", "1/8192", "3/11"],
  mixed: ["1 1/2", "1 1/3", "2 3/4", "1 3/2", "1-1/2", "1 1⁄2", "2  1/4", "1 1/0", "123456 1/2", "1234567 1/2"],
  vulgar: ["½", "⅓", "⅔", "¼", "¾", "⅛", "⅜", "⅝", "⅞", "⅕", "⅖", "⅗", "⅘", "⅙", "⅚", "⅐", "⅑", "⅒", "1½", "2⅓", "1 ½", "1  ½", "½½", "1⅓⅓"],
  slash: ["1⁄2", "3⁄4", "1⁄3", "1 1⁄3", "⁄2"],
  rangeSep: ["-", "–", "—", " - ", " – ", " to ", " or ", "-", " TO ", "~"],
  units: [
    "cup", "cups", "c", "C", "c.", "T", "t", "Tb", "TB", "tb", "Tbsp", "TBSP", "tbsp.", "tbs", "tbl", "tablespoons", "tsp", "tsps", "teaspoon", "fl oz", "fl. oz.",
    "floz", "fl.oz", "fluid ounces", "fluid ounce", "oz", "oz.", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "g", "gr", "gm", "grams", "kg", "kgs", "ml", "mL",
    "mls", "L", "l", "lt", "litre", "litres", "liter", "millilitre", "quart", "quarts", "qt", "qts", "pint", "pints", "pt", "gallon", "gal", "each", "ea", "ea.",
    "item", "items", "Each", "unit",
  ],
  counts: [
    "can", "cans", "clove", "cloves", "bunch", "bunches", "head", "stalk", "sprig", "slice", "slices", "piece", "stick", "ear", "leaf", "leaves", "loaf", "loaves",
    "bulb", "fillet", "fillets", "link", "strip", "sheet", "package", "pkg", "pkgs", "jar", "bag", "box", "boxes", "bottle", "container", "carton", "envelope",
    "packet", "tin", "block", "pinch", "pinches", "dash", "dashes", "drop", "drops", "splash", "handful", "handfuls", "sprinkle", "knob", "inch", "inches", "scoop",
  ],
  prices: ["($0.16)", "($1.23*)", "( $0.02 )", "($.10)", "$0.25", "($0.25 each)", "(about $1)", "($1,000)", "($0.5)", "($ 2 )", "($0.16***)", "($0.16****)"],
  parens: [
    "(15 oz)", "(15 oz.)", "(14.5-ounce)", "(6-ounce)", "(240 ml)", "(optional)", "(packed)", "(homemade (or store-bought))", "(", "((", ")", "(a(b(c", "(2 cups)",
    "(12 fl. oz)", "(1 lb)", "(400 g)", "(about 1 lb)", "(2/3 oz)", "(15 oz each)", "(yellow)", "(boneless, skinless)", "()", "( )", "(½ cup)", "(1.5 L)", "(0.25 oz)",
  ],
  sizes: ["15-oz", "28 ounce", "12 fl oz", "14.5-ounce", "400 g", "1 lb", "8-oz.", "2/3 oz"],
  commas: [",", ", diced", ", to taste", ", divided", ", or 1 cup water", ", plus 2 tbsp", ", cut into 8 wedges", ", chopped, toasted", ", or fresh", ", drained and rinsed", ",,", ", (optional)"],
  words: [
    "flour", "sugar", "black beans", "garlic", "milk", "cream", "onion", "eggs", "rice", "broth", "chicken or vegetable broth", "milk or cream", "cheddar", "jalapeño",
    "crème fraîche", "pesto", "salt", "pepper", "olive oil", "2% milk", "half-and-half", "of", "large", "small", "medium", "extra large", "Extra-Large", "cooked",
    "uncooked", "raw", "pre-cooked", "precooked", "Uncooked", "butter", "salt and pepper", "lemon", "Juice of 1 lemon", "tomatoes", "beans", "water", "stock", "oats",
    "日本の米", "Жир", "ğa", "𝔘x", "Or", "OR", "for", "taste",
  ],
  phrases: [
    "to taste", "optional", "optional:", "Optional", "for serving", "for garnish", "for garnishing", "as needed", "as desired", "if desired", "for dusting", "for frying",
    "for drizzling", "for topping", "a", "an", "one", "a few", "several", "a pinch of", "a small handful of", "a splash of", "Pinch of", "about", "plus", "and", "or",
  ],
  bullets: ["-", "•", "·", "*", "–", "--", "1.", "a)"],
  controls: ["\u0000", "\u0007", "\t", "\n", "\r", "\u007f", "\u0085", "​", "‎", "‏", "‪", "‮", "⁦", "⁩", "﻿", " "],
  spaces: [" ", " ", " ", "  ", "", " ", " ", "　", "\t"],
  entities: ["&amp;", "&nbsp;", "&frac12;", "&#189;", "&lt;b&gt;"],
};

const ALL_TOKENS: readonly string[] = Object.values(T).flat();

function amount(rng: Rng): string {
  const pool = pick(rng, [T.integers, T.integers, T.decimals, T.fractions, T.mixed, T.vulgar, T.vulgar, T.slash]);
  return pick(rng, pool);
}

/** One structured line: [bullet] amount [range] [paren] [unit|count|size count] [of] name [suffix], with noise. */
function structuredLine(rng: Rng): string {
  const parts: string[] = [];
  const sp = () => (chance(rng, 0.85) ? " " : pick(rng, T.spaces));
  if (chance(rng, 0.12)) parts.push(pick(rng, T.bullets), sp());
  if (chance(rng, 0.06)) parts.push(pick(rng, T.prices), sp());
  if (chance(rng, 0.08)) parts.push(pick(rng, T.phrases), sp());
  if (chance(rng, 0.9)) {
    parts.push(amount(rng));
    if (chance(rng, 0.12)) parts.push(pick(rng, T.rangeSep), amount(rng));
  }
  const attached = chance(rng, 0.08);
  parts.push(attached ? "" : sp());
  const u = rng();
  if (u < 0.45) parts.push(pick(rng, T.units));
  else if (u < 0.65) parts.push(pick(rng, T.counts));
  else if (u < 0.72) parts.push(pick(rng, T.parens), " ", pick(rng, T.counts));
  else if (u < 0.78) parts.push(pick(rng, T.counts), " ", pick(rng, T.parens));
  else if (u < 0.83) parts.push(pick(rng, T.sizes), " ", pick(rng, T.counts));
  if (chance(rng, 0.1)) parts.push(sp(), "of");
  if (chance(rng, 0.1)) parts.push(sp(), pick(rng, T.parens));
  const nameWords = int(rng, 0, 3);
  for (let i = 0; i < nameWords; i++) parts.push(sp(), pick(rng, T.words));
  const s = rng();
  if (s < 0.15) parts.push(pick(rng, T.commas));
  else if (s < 0.25) parts.push(sp(), pick(rng, T.parens));
  else if (s < 0.33) parts.push(sp(), pick(rng, T.prices));
  else if (s < 0.43) parts.push(sp(), pick(rng, T.phrases));
  else if (s < 0.47) parts.push(sp(), "or", sp(), amount(rng), sp(), pick(rng, T.units), sp(), pick(rng, T.words));
  let line = parts.join("");
  // Noise: controls, bidi, NBSP and entity text at random positions.
  const noise = chance(rng, 0.12) ? int(rng, 1, 3) : 0;
  for (let i = 0; i < noise; i++) {
    const at = int(rng, 0, line.length);
    const tok = chance(rng, 0.7) ? pick(rng, T.controls) : chance(rng, 0.5) ? pick(rng, T.spaces) : pick(rng, T.entities);
    line = line.slice(0, at) + tok + line.slice(at);
  }
  return line;
}

/** A token soup line: 1–8 tokens from every pool, joined with random separators. */
function soupLine(rng: Rng): string {
  const n = int(rng, 1, 8);
  let s = "";
  for (let i = 0; i < n; i++) s += (i ? pick(rng, [...T.spaces, ",", "(", ")", "/", "-", "⁄"]) : "") + pick(rng, ALL_TOKENS);
  return s;
}

/** `count` seeded pseudo-random ingredient lines (90% structured, 10% token soup). */
export function randomLines(seed: number, count: number): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(chance(rng, 0.9) ? structuredLine(rng) : soupLine(rng));
  return out;
}

export const RANDOM_SEED = 0x7ab1e;
export const RANDOM_COUNT = 24_000;

export interface IngredientCorpus {
  literals: readonly string[];
  sweep: string[];
  hostile: string[];
  random: string[];
  /** Everything above, in that order (duplicates kept: each source is reported separately). */
  all: string[];
}

let cached: IngredientCorpus | null = null;

export function ingredientCorpus(): IngredientCorpus {
  if (cached) return cached;
  const literals = TABLE_TEST_LITERALS;
  const sweep = tableSweepLines();
  const hostile = hostileLines();
  const random = randomLines(RANDOM_SEED, RANDOM_COUNT);
  cached = { literals, sweep, hostile, random, all: [...literals, ...sweep, ...hostile, ...random] };
  return cached;
}

/** Non-string inputs a caller might pass by mistake. */
export const NON_STRING_INPUTS: readonly unknown[] = [null, undefined, 42, 0, true, {}, [], ["1 cup"], Symbol.for("x"), BigInt(1)];

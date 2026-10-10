/**
 * semantic-v2: properties and metamorphic relations over large generated inputs (the package's parity
 * corpus, ≥ 40 000 lines, plus this suite's own seeded generator).
 *
 *  - every output validates, and the engine's safety net is never what made it valid;
 *  - deterministic: the same line twice gives identical JSON;
 *  - extra whitespace / NBSP / tabs, and a list bullet, do not change the reading;
 *  - the case of unit words does not change the unit;
 *  - a line with no digit, fraction or number word never gets a quantity;
 *  - fl_oz only when "fl"/"fluid" is written; a package size only beside a counted unit;
 *  - evidence spans are inside the text and do not overlap.
 */
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { UNIT_REGISTRY } from "../../src/contract";
import { parseSemanticUnchecked, semanticV2Engine } from "../../src/ingredient/semantic-v2/engine";
import { UNIT_WORDS_IN_FOOD_NAMES, unitOfWord } from "../../src/ingredient/semantic-v2/lexicon";
import { validateParsedIngredientV1 } from "../../src/validate";
import { ingredientCorpus, NON_STRING_INPUTS } from "../parity/corpus";
import { FOODS, generateLines } from "./generate";

const corpus = ingredientCorpus();
const generated = generateLines(0x5e3a, 20_000);
const ALL = [...corpus.all, ...generated];
const parse = (l: string) => semanticV2Engine.parse(l);
const show = (s: unknown) => JSON.stringify(String(s).slice(0, 120));

/** The reading without the fields that legitimately change with the written form. */
function meaning(r: ParsedIngredientV1) {
  const { raw: _raw, normalized: _n, evidence: _e, ...rest } = r;
  return { ...rest, reasons: rest.reasons.filter((x) => x !== "list_marker_removed") };
}

const NUMBER_WORD = /^(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|halves|third|thirds|quarter|quarters|dozen)$/;
function mentionsNumber(normalized: string): boolean {
  if (/[0-9½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒↉]/u.test(normalized)) return true;
  return normalized.toLowerCase().split(/[^\p{L}]+/u).some((w) => NUMBER_WORD.test(w)) || /\b(?:one|two|three)-(?:half|thirds?|quarters?)\b/i.test(normalized);
}

describe("every output validates", () => {
  it(`over ${ALL.length} corpus and generated lines and non-string inputs; the safety net is never needed`, () => {
    const bad: string[] = [];
    for (const line of [...ALL, ...(NON_STRING_INPUTS as string[])]) {
      const unchecked = parseSemanticUnchecked(line);
      const problems = validateParsedIngredientV1(unchecked);
      if (problems.length) bad.push(`${show(line)}: ${problems.slice(0, 2).join("; ")}`);
      if (bad.length >= 20) break;
    }
    expect(bad).toEqual([]);
  });

  it("is deterministic: the same line twice gives identical JSON text", () => {
    const bad: string[] = [];
    for (const line of [...corpus.literals, ...corpus.hostile, ...corpus.random.slice(0, 4_000), ...generated.slice(0, 4_000)]) {
      if (JSON.stringify(parse(line)) !== JSON.stringify(parse(line))) bad.push(show(line));
    }
    expect(bad).toEqual([]);
  });
});

describe("metamorphic relations", () => {
  const sample = [...corpus.literals, ...generated.slice(0, 6_000)].filter((l) => typeof l === "string" && l.length < 400);

  it("extra spaces, NBSP and tabs between words, and around the line, change nothing but raw", () => {
    const bad: string[] = [];
    for (const line of sample) {
      const variant = `\t ${line.replace(/ /g, (_m, i: number) => (i % 3 === 0 ? "  " : i % 3 === 1 ? "  " : "\t"))}  `;
      const a = parse(line);
      const b = parse(variant);
      if (JSON.stringify({ ...a, raw: "" }) !== JSON.stringify({ ...b, raw: "" })) bad.push(show(line));
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("a list bullet in front changes nothing but the list_marker_removed reason and offsets", () => {
    const bad: string[] = [];
    for (const line of sample) {
      if (/^\s*[-•*·–—]/.test(line) || /^\s*(?:\d{1,2}|[A-Za-z])[.)] /.test(line) || line.trim() === "") continue;
      for (const bullet of ["- ", "• ", "* "]) {
        const a = meaning(parse(line));
        const b = meaning(parse(bullet + line));
        if (a.status === "unsupported" || b.status === "unsupported") {
          if (a.status !== b.status) bad.push(`${bullet}${show(line)}`);
          continue;
        }
        if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${bullet}${show(line)}`);
      }
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("the case of a unit word does not change the unit (T/t aside)", () => {
    const spellings = ["cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoons", "oz", "ounces", "fl oz", "fluid ounces", "lb", "pounds", "g", "grams", "kg", "ml", "liter", "quart", "pint", "gallon", "can", "cloves", "bunch", "pinch", "dash", "handful", "slices", "package"];
    const bad: string[] = [];
    for (const u of spellings) {
      for (const food of FOODS.slice(0, 12)) {
        const variants = [u, u.toUpperCase(), u[0].toUpperCase() + u.slice(1)].map((v) => parse(`2 ${v} ${food}`));
        const units = new Set(variants.map((r) => r.unit?.canonical ?? null));
        const names = new Set(variants.map((r) => r.name?.toLowerCase() ?? null));
        if (units.size !== 1 || names.size !== 1) bad.push(`${u} / ${food}: ${[...units].join(",")}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("safety properties", () => {
  it("a line with no digit, fraction or number word never gets a quantity", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const line of ALL) {
      const r = parse(line);
      if (mentionsNumber(r.normalized)) continue;
      checked++;
      // (semantic-v2) the one exception: a singular imprecise measure opening the line is one of it ("Pinch of salt" →
      // 1 pinch, holdout-v2 label ing-h2-0061)
      const impliedOne = r.quantity?.kind === "exact" && r.quantity.numerator === "1" && r.quantity.denominator === "1" && r.unit?.dimension === "imprecise" && r.packageSize === null && r.equivalents.length === 0
        && new RegExp(`^(?:(?:small|large|big|generous|good|heaping|scant)\\s+)*${r.unit.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(r.normalized.replace(/^[^\p{L}]+/u, ""));
      if (impliedOne) continue;
      if (r.quantity !== null || r.packageSize !== null || r.equivalents.length > 0) bad.push(show(line));
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
    expect(checked).toBeGreaterThan(1_000);
  });

  it("fl_oz only when 'fl' or 'fluid' is written; 'oz'/'ounce' alone is mass", () => {
    const bad: string[] = [];
    for (const line of ALL) {
      const r = parse(line);
      const units = [r.unit, r.packageSize?.unit, ...r.equivalents.map((e) => e.unit)].filter((u) => u !== null && u !== undefined);
      for (const u of units) {
        // the unit as written must be in the line and must say fl/fluid
        if (u!.canonical === "fl_oz" && (!/^(?:fl|fluid)/i.test(u!.source) || !r.normalized.includes(u!.source))) bad.push(`${show(line)}: fl_oz from "${u!.source}"`);
        if (/^(?:oz|ozs|ounces?)\.?$/i.test(u!.source) && u!.canonical !== "oz") bad.push(`${show(line)}: ${u!.source} read as ${u!.canonical}`);
      }
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("a package size only beside a counted unit; package counts never become mass or volume", () => {
    const bad: string[] = [];
    let packages = 0;
    for (const line of ALL) {
      const r = parse(line);
      if (r.packageSize === null) continue;
      packages++;
      if (r.unit === null || r.unit.dimension !== "count") bad.push(`${show(line)}: unit ${r.unit?.canonical}`);
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
    expect(packages).toBeGreaterThan(500);
  });

  it("ready readings are complete: a name, an exact quantity with a unit or a stated reason, no choice", () => {
    const bad: string[] = [];
    for (const line of ALL) {
      const r = parse(line);
      if (r.status !== "ready") continue;
      const ok = r.name !== null && r.alternatives.length === 0 && (r.quantity === null ? r.amountUnstated !== null : r.quantity.kind === "exact" && r.unit !== null);
      if (!ok) bad.push(show(line));
      if (r.name !== null && /^\s*$/.test(r.name)) bad.push(`${show(line)}: blank name`);
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("evidence spans lie inside the text and do not overlap", () => {
    const bad: string[] = [];
    for (const line of ALL) {
      const r = parse(line);
      const spans = Object.values(r.evidence.spans).filter((s): s is [number, number] => Array.isArray(s)).sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < spans.length; i++) {
        const [s, e] = spans[i];
        if (s < 0 || e > r.normalized.length || s > e) bad.push(`${show(line)}: span ${s}-${e}`);
        if (i > 0 && spans[i - 1][1] > s && !(r.evidence.spans.quantity && r.evidence.spans.unit && spans[i - 1] === r.evidence.spans.quantity)) bad.push(`${show(line)}: overlap`);
      }
      if (r.evidence.spans.unit && r.unit && r.unit.source !== "" && r.normalized.slice(...r.evidence.spans.unit) !== r.unit.source) bad.push(`${show(line)}: unit span ≠ source`);
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("never stuffs the raw line into the name, at any status", () => {
    const bad: string[] = [];
    for (const line of ALL) {
      const r = parse(line);
      if (r.name === null) continue;
      // a line that states an amount or a unit is never its own name
      if (r.name === r.normalized && (r.quantity !== null || r.unit !== null || r.packageSize !== null || r.equivalents.length > 0)) bad.push(`${show(line)}: whole line`);
      if (bad.length >= 10) break;
    }
    expect(bad).toEqual([]);
  });

  it("a name never begins with the unit, a unit word, an amount, a stray conjunction or article, or a number (unless a person is asked to check)", () => {
    const bad: string[] = [];
    const LEADING = /^(?:(?:or|and|nor|with|to|plus|but)(?![-\p{L}])|[&/+])/iu;
    const NUMBERISH = /^(?:\d[\d./]*|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|half|quarter|third|dozen)$/;
    const CARDINAL = /^(?:\d|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞]|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|dozen)(?=\s|$))/iu;
    for (const line of ALL) {
      const r = parse(line);
      const names = r.name !== null ? [r.name] : r.alternatives;
      for (const name of names) {
        const first = name.split(" ")[0].toLowerCase().replace(/\.$/, "");
        if (r.unit && r.unit.source !== "" && name.includes(" ") && first === r.unit.source.toLowerCase().replace(/\.$/, "") && r.unit.dimension !== "count") bad.push(`${show(line)}: name starts with the unit "${name}"`);
        if (LEADING.test(name)) bad.push(`${show(line)}: name starts with a conjunction "${name}"`);
        if (/^(?:a|an)\s/i.test(name)) bad.push(`${show(line)}: name starts with an article "${name}"`);
        // (semantic-v2, CONTRACT §12.9: numbers that name the food — "5-spice", "00 flour", "2 percent milk", "7 grain
        // cereal", "Five spice powder" — written here independently of the engine's lexicon)
        const productNumber = /^\d+-\p{L}/u.test(name) || /^0\d+ /.test(name) || /^\d+ percent\b/i.test(name)
          || /^(?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[ -](?:spice|grain|cheese|bean|berry|seed|nut|herb|fruit|vegetable|pepper|mushroom|layer|flavou?r)\b/i.test(name);
        if (CARDINAL.test(name) && !productNumber && !/^\d+(?:\.\d+)?%/.test(name) && !/^\d+\/\d+ /.test(name) && !(r.status === "needs_review" && r.reasons.includes("unclassified")) && !/^\w*\d\w*[a-z]/i.test(name)) bad.push(`${show(line)}: name starts with a number "${name}"`);
        // at every status, also when no amount was read: never "<number> <unit> …" ("hundred grams flour",
        // "quarter cup sugar"), never a weight or volume word first ("cups flour")
        const ws = name.split(" ").map((w) => w.toLowerCase().replace(/\.$/, ""));
        const unitWord = (w: string | undefined) => {
          if (w === undefined || w.length <= 1 || UNIT_WORDS_IN_FOOD_NAMES.has(w)) return false;
          const c = unitOfWord(w);
          return c !== null && (UNIT_REGISTRY[c].dimension === "mass" || UNIT_REGISTRY[c].dimension === "volume");
        };
        if (ws.length >= 2 && NUMBERISH.test(ws[0]) && unitWord(ws[1])) bad.push(`${show(line)}: name holds an amount and unit "${name}"`);
        if (ws.length >= 2 && unitWord(ws[0])) bad.push(`${show(line)}: name starts with a unit word "${name}"`);
      }
      if (bad.length >= 15) break;
    }
    expect(bad).toEqual([]);
  });
});

/**
 * semantic-v2 · the named safeguards, each tested directly so a mutation of one of them is caught here as well as by
 * the line-level tests: the remaining-token name guard, the multiplier rule, the restatement tolerance, the
 * option-preservation rule, the count-noun rule, the container-cup rule, the product-number rule and the
 * nutrition/non-ingredient classifier (family-d-non-ingredients.test.ts covers its sub-shapes).
 */
import { describe, expect, it } from "vitest";
import type { ExactQuantity, UnitV1 } from "../../src/contract";
import { rational } from "../../src/rational";
import { unitV1 } from "../../src/units";
import { categoryNoun, shareOptions, varietiesOf } from "../../src/ingredient/semantic-v2/alternatives";
import {
  containerCup, foreignSystemRemark, multiplierAt, numberNamesProductAt, PACKAGE_UNITS, RESTATEMENT_TOLERANCE, roundedConversion, sameAmount, withinRestatementTolerance,
} from "../../src/ingredient/semantic-v2/amount";
import { nonIngredientReason } from "../../src/ingredient/semantic-v2/classify";
import { lex } from "../../src/ingredient/semantic-v2/lexer";
import { nameLeftoverGuard, numberInProductName, postFoodCountUnit } from "../../src/ingredient/semantic-v2/name";
import { fractionUnitWord } from "../../src/ingredient/semantic-v2/quantity";
import { remarkSecondAmount } from "../../src/ingredient/semantic-v2/remarks";
import { read } from "./helpers";

const toks = (s: string) => lex(s).tokens;
const q = (n: number, d = 1): ExactQuantity => ({ kind: "exact", numerator: String(n), denominator: String(d), display: "" });
const u = (code: Parameters<typeof unitV1>[0]): UnitV1 => unitV1(code, code);

describe("nameLeftoverGuard (remaining-token name guard)", () => {
  it.each(["x cup milk", "half-cup milk", "cups flour", "milk × 2", "m sausage", "whole milk or 2%", "tbsp sugar"])("flags %s", (name) => {
    expect(nameLeftoverGuard(name, toks(name))).toBe(true);
  });
  it.each(["milk", "pound cake", "gram flour", "cup noodles", "vitamin C powder", "10X sugar", "half-and-half", "five-spice powder", "salt and pepper"])("passes %s", (name) => {
    expect(nameLeftoverGuard(name, toks(name))).toBe(false);
  });
  it("a reading whose name keeps a left-over is never ready", () => {
    for (const line of ["1 cup x cup milk", "1 m sausage", "2 k sugar"]) expect(read(line).status, line).toBe("needs_review");
  });
});

describe("multiplierAt (multiplier rule)", () => {
  it("x before a unit, container or food after a count", () => {
    expect(multiplierAt(toks("1 x cup milk"), 1)).toBe(true);
    expect(multiplierAt(toks("2x cans chickpeas"), 1)).toBe(true);
    expect(multiplierAt(toks("3 x eggs"), 1)).toBe(true);
  });
  it("not before a number (a dimension or a package size is read elsewhere), and never a sugar grade", () => {
    expect(multiplierAt(toks("9 x 13 pan"), 1)).toBe(false);
    expect(multiplierAt(toks("10X sugar"), 1)).toBe(false);
    expect(numberNamesProductAt(toks("10X sugar"), 0)).toBe(true);
  });
});

describe("restatement tolerance (RESTATEMENT_TOLERANCE, sameAmount, roundedConversion)", () => {
  it("is exactly 7/100, inclusive, against the first-stated amount", () => {
    expect(RESTATEMENT_TOLERANCE).toEqual({ n: BigInt(7), d: BigInt(100) });
    expect(withinRestatementTolerance(rational(BigInt(100)), rational(BigInt(107)))).toBe(true);
    expect(withinRestatementTolerance(rational(BigInt(100)), rational(BigInt(93)))).toBe(true);
    expect(withinRestatementTolerance(rational(BigInt(100)), rational(BigInt(10701), BigInt(100)))).toBe(false);
  });
  it("same-dimension restatements", () => {
    expect(sameAmount(q(1, 3), u("cup"), q(5), u("tbsp"))).toBe(true); // 6.25 %
    expect(sameAmount(q(1), u("lb"), q(15), u("oz"))).toBe(true);
    expect(sameAmount(q(1), u("lb"), q(14), u("oz"))).toBe(false); // 12.5 %
    expect(sameAmount(q(1), u("lb"), q(500), u("g"))).toBe(false); // 10.2 %
    expect(sameAmount(q(1, 4), u("tsp"), q(1), u("ml"))).toBe(true); // rounded conversion
    expect(sameAmount(q(2), u("lb"), q(1), u("kg"))).toBe(false); // a larger unit is not a rounding convention
    expect(sameAmount(q(1), u("cup"), q(120), u("g"))).toBeNull(); // mass vs volume: no density
  });
  // CONTRACT §12.6 as amended (§12.A A2, refined after the label check): only ml or g — or lb restating kg — rounded half up
  it("roundedConversion needs a whole restated number in ml or g (or lb for kg), smaller than the first unit", () => {
    const tbsp = rational(BigInt(1478676478125), BigInt(100000000000)); // 1 tbsp in ml
    const tsp = rational(BigInt(492892159375), BigInt(100000000000)); // 1 tsp in ml
    expect(roundedConversion(rational(BigInt(453592370), BigInt(1000000)), u("lb"), q(454), u("g"))).toBe(true);
    expect(roundedConversion(rational(BigInt(1000)), u("kg"), q(2), u("lb"))).toBe(true); // 1 kg (2 lb): 2.20 → 2
    expect(roundedConversion(tbsp, u("tbsp"), q(15), u("ml"))).toBe(true); // 14.79 → 15
    expect(roundedConversion(tsp, u("tsp"), q(5), u("ml"))).toBe(true);
    expect(roundedConversion(rational(BigInt(354882), BigInt(1000)), u("cup"), q(2), u("cup"))).toBe(false);
    // coarse restated units get only the 7 % test: 1/2 tbsp (2 tsp), 1 1/2 tbsp (4 tsp)
    expect(roundedConversion({ n: tbsp.n, d: tbsp.d * BigInt(2) }, u("tbsp"), q(2), u("tsp"))).toBe(false);
    expect(roundedConversion({ n: tbsp.n * BigInt(3), d: tbsp.d * BigInt(2) }, u("tbsp"), q(4), u("tsp"))).toBe(false);
    // a larger restated unit never: 100 g (4 oz)… is not even smaller; 2 lb (1 kg)
    expect(roundedConversion(rational(BigInt(100)), u("g"), q(4), u("oz"))).toBe(false);
    expect(roundedConversion(rational(BigInt(907184740), BigInt(1000000)), u("lb"), q(1), u("kg"))).toBe(false);
    // half up: 1/2 tsp = 2.46 ml → 2; 3/4 tsp = 3.70 ml → 4
    expect(roundedConversion({ n: tsp.n, d: tsp.d * BigInt(2) }, u("tsp"), q(2), u("ml"))).toBe(true);
    expect(roundedConversion({ n: tsp.n * BigInt(3), d: tsp.d * BigInt(4) }, u("tsp"), q(4), u("ml"))).toBe(true);
  });

  it.each(["1/2 tbsp (2 tsp) sugar", "1/6 cup (3 tbsp) oil", "1 1/2 tbsp (4 tsp) oil", "100 g (4 oz) butter", "500 g (1 lb) beef mince", "2 lb (1 kg) potatoes"])(
    "%s → needs review (§12.6 refined)",
    (line) => {
      expect(read(line).reasons).toContain("quantity_unassigned");
    },
  );
});

describe("shareOptions (option-preservation rule)", () => {
  const cases: [string[], string[]][] = [
    [["kale", "Swiss chard"], ["kale", "Swiss chard"]],
    [["lemon", "lime juice"], ["lemon juice", "lime juice"]],
    [["chicken", "beef", "vegetable stock"], ["chicken stock", "beef stock", "vegetable stock"]],
    [["white", "yellow miso"], ["white miso", "yellow miso"]],
    [["ground beef", "turkey"], ["ground beef", "ground turkey"]],
    [["ground beef", "smoked turkey"], ["ground beef", "smoked turkey"]],
    [["whole milk", "2%"], ["whole milk", "2% milk"]],
    [["feta", "goat cheese"], ["feta", "goat cheese"]],
    [["pecans", "walnuts", "almonds"], ["pecans", "walnuts", "almonds"]],
  ];
  it.each(cases)("%j → %j", (options, want) => {
    expect(shareOptions(options)).toEqual(want);
  });
  it("never changes the number or the order of options, and every option keeps its own words", () => {
    for (const [options] of cases) {
      const out = shareOptions(options);
      expect(out).toHaveLength(options.length);
      options.forEach((o, k) => expect(out[k].includes(o) || out[k].endsWith(o.split(" ").pop()!)).toBe(true));
    }
  });
  it("varietiesOf / categoryNoun decide 'X, A or B'", () => {
    expect(varietiesOf(["chicken", "vegetable"], "broth")).toBe(true);
    expect(varietiesOf(["red", "white"], "onion")).toBe(true);
    expect(varietiesOf(["pecans", "walnuts"], "nuts")).toBe(false);
    expect(categoryNoun("nuts")).toBe(true);
    expect(categoryNoun("raisins")).toBe(false);
  });
});

describe("postFoodCountUnit (count-noun rule)", () => {
  const unitOf = (s: string) => postFoodCountUnit(s, toks(s))?.unit.canonical ?? null;
  it.each([["celery ribs", "rib"], ["lemon wedges", "wedge"], ["cinnamon sticks", "stick"], ["cardamom pods", "pod"], ["garlic cloves", "clove"], ["kale bunches", "bunch"]])("%s → %s", (s, unit) => {
    expect(unitOf(s)).toBe(unit);
  });
  it.each(["fish sticks", "bay leaves", "lasagna sheets", "bouillon cubes", "whole cloves", "short ribs", "chicken thighs", "cans", "pizza loaves"])("%s → none", (s) => {
    expect(unitOf(s)).toBeNull();
  });
});

describe("containerCup (container-cup rule) and PACKAGE_UNITS", () => {
  it("only packaging units plus block, loaf and ball take a package size", () => {
    for (const code of ["can", "jar", "bag", "box", "package", "container", "block", "loaf", "ball"]) expect(PACKAGE_UNITS.has(code), code).toBe(true);
    for (const code of ["fillet", "slice", "piece", "stick", "each", "cup"]) expect(PACKAGE_UNITS.has(code), code).toBe(false);
  });
  it("a cup with a marked weight between count and unit is a container; a measuring cup is not", () => {
    const cups = { unit: unitV1("cup", "cups"), s: 0, e: 0, next: 0 };
    const size = (unit: Parameters<typeof unitV1>[0], approx = false) => ({ sec: { sa: { value: rational(BigInt(53), BigInt(10)), decimal: true, unit: unitV1(unit, unit), unitSpan: [0, 0] as [number, number], s: 0, e: 0, next: 0, each: false, total: false, approx }, position: "between" as const }, marked: true });
    expect(containerCup(cups, [size("oz")])).toBe(true);
    expect(containerCup(cups, [size("cup")])).toBe(false);
    expect(containerCup(cups, [size("oz", true)])).toBe(false);
    expect(containerCup({ ...cups, unit: unitV1("cup", "c.") }, [size("oz")])).toBe(false);
  });
});

describe("product numbers, fraction units, remark amounts, foreign units", () => {
  it("numberInProductName keeps product numbers and leaves counts", () => {
    const named = (s: string) => numberInProductName(toks(s), 0);
    expect(named("5-spice powder")).toBe(3);
    expect(named("00 flour")).toBe(1);
    expect(named("7 grain cereal")).toBe(1);
    expect(named("3 eggs")).toBe(0);
    expect(named("2 cheese pizzas")).toBe(0);
    expect(named("2 chicken breast")).toBe(0);
  });
  it("fractionUnitWord reads only fraction + weight/volume unit compounds", () => {
    expect(fractionUnitWord(toks("half-cup")[0])?.value).toEqual(rational(BigInt(1), BigInt(2)));
    expect(fractionUnitWord(toks("three-quarter-cup")[0])?.value).toEqual(rational(BigInt(3), BigInt(4)));
    for (const w of ["half-and-half", "five-spice", "half-dozen", "half-can"]) expect(fractionUnitWord(toks(w)[0]), w).toBeNull();
  });
  it("remarkSecondAmount needs both an amount and a source, state or substitution marker", () => {
    expect(remarkSecondAmount(toks("from 1/3 cup dry"))).toBe(true);
    expect(remarkSecondAmount(toks("use half for table salt"))).toBe(true);
    expect(remarkSecondAmount(toks("about 3 medium"))).toBe(false);
    expect(remarkSecondAmount(toks("from a jar"))).toBe(false);
  });
  it("foreignSystemRemark: a non-US system named for a US volume", () => {
    expect(foreignSystemRemark(toks("1 pint milk (UK)"), unitV1("pint", "pint"))).toBe(true);
    expect(foreignSystemRemark(toks("1 lb flour (UK)"), unitV1("lb", "lb"))).toBe(false);
  });
  it("nonIngredientReason refuses shapes, not words", () => {
    expect(nonIngredientReason(toks("Protein: 20 grams"))).toBe("not_an_ingredient");
    expect(nonIngredientReason(toks("1 scoop protein powder"))).toBeNull();
    expect(nonIngredientReason(toks("Sugar: 1/2 cup"))).toBeNull();
    expect(nonIngredientReason(toks("SAUCE"))).toBe("section_heading");
    expect(nonIngredientReason(toks("Hot sauce"))).toBeNull();
  });
});

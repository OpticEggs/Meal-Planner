#!/usr/bin/env python3
"""Generate tools/mutation/specs/parser.json (coordinator): one mutation per named semantic-v2 safeguard.

Each mutation disables or weakens exactly one safeguard and must be KILLED by an assertion in the safeguard's direct
test (tests/semantic-v2/safeguards.test.ts) or in the required regression harness for the lines it protects.
Usage: python3 -I make_parser_spec.py <repo-root>
"""
import json, os, sys
root = sys.argv[1]
pkg = os.path.join(root, "packages/recipe-extraction")
corpus = [json.loads(l) for l in open(os.path.join(pkg, "tests/regressions/exposed-regressions-2b.jsonl")) if l.strip()]
by_input = {c["input"]: c for c in corpus}
SAFE = "tests/semantic-v2/safeguards.test.ts"
HARNESS = "tests/regressions/semantic-v2-regressions.test.ts"
def reg(inp):
    c = by_input[inp]
    assert c["firm"], inp
    title = f'{c["id"]} [{c["family"]}] {c["origin"]["kind"]}:{c["origin"]["ref"]} {json.dumps(c["input"], ensure_ascii=False)[:70]}'
    return {"test": f"exposed regressions 2B — semantic-v2 (required) > {title}", "reason": "^AssertionError"}
def safe(describe, it):
    return {"test": f"{describe} > {it}", "reason": "^AssertionError"}
EXACT_FILE = "tests/regressions/exact-rejections.test.ts"
def exact(group, line):
    return {"test": f"exact rejections of recognised non-ingredient shapes (semantic-v2) > {group}: {json.dumps(line, ensure_ascii=False)} → unsupported, no amount", "reason": "^AssertionError"}
S = "src/ingredient/semantic-v2/"
def early_return(sig, value):  # insert an early return right after a function signature line
    return {"find": sig, "replace": sig + f"\n  if (Number.isFinite(0)) return {value};"}
M = []
def add(mid, desc, file, change, killers):
    M.append({"id": mid, "description": desc, "file": S + file, **change, "tests": [SAFE, HARNESS, EXACT_FILE], "killedBy": killers, "expect": "KILLED"})
G = "nameLeftoverGuard (remaining-token name guard)"
add("P-name-guard-off", "remaining-token name guard disabled: a name may keep a unit, multiplier, 'or' or stray letter while ready",
    "name.ts", early_return("export function nameLeftoverGuard(text: string, toks: readonly Tok[]): boolean {", "false"),
    [safe(G, "a reading whose name keeps a left-over is never ready"), reg("1 m sausage")])
G = "multiplierAt (multiplier rule)"
add("P-multiplier-off", "§12.2 multiplier rule disabled ('1x cup milk' leaves 'x cup' in the name)",
    "amount.ts", early_return("export function multiplierAt(toks: readonly Tok[], k: number): boolean {", "false"),
    [safe(G, "x before a unit, container or food after a count"), reg("1x cup milk"), reg("2x cans chickpeas"), reg("1 x can chickpeas")])
G = "restatement tolerance (RESTATEMENT_TOLERANCE, sameAmount, roundedConversion)"
add("P-tolerance-widened", "§12.6 tolerance widened from 7 % to 13 % (accepts the contradictory '1 lb (14 oz)')",
    "amount.ts", {"find": "export const RESTATEMENT_TOLERANCE: Rational = { n: BigInt(7), d: BigInt(100) };", "replace": "export const RESTATEMENT_TOLERANCE: Rational = { n: BigInt(13), d: BigInt(100) };"},
    [safe(G, "is exactly 7/100, inclusive, against the first-stated amount"), reg("1 lb (14 oz) ground beef")])
add("P-rounding-allowance-off", "§12.6 whole-unit rounding allowance removed ('1/2 tsp (2 ml)' becomes a second amount)",
    "amount.ts", early_return("export function roundedConversion(firstBase: Rational, ua: UnitV1, restated: ExactQuantity, ub: UnitV1): boolean {", "false"),
    [safe(G, "roundedConversion needs a whole restated number in ml or g (or lb for kg), smaller than the first unit"), reg("1/2 tsp (2 ml) vanilla extract") if "1/2 tsp (2 ml) vanilla extract" in by_input else safe(G, "same-dimension restatements")])
G = "shareOptions (option-preservation rule)"
add("P-invent-options", "§12.7 option preservation broken: the last option's head is shared with every option (semantic-v1's 'kale chard')",
    "alternatives.ts", {"find": "  if (options.length < 2) return [...options];",
                        "replace": "  if (options.length >= 2) { const h = options[options.length - 1].split(\" \").slice(-1)[0]; return options.map((o, k) => (k === options.length - 1 || o.split(\" \").slice(-1)[0] === h ? o : `${o} ${h}`)); }"},
    [safe(G, "never changes the number or the order of options, and every option keeps its own words"), reg("1 cup kale or Swiss chard"), reg("4 cups kale or Swiss chard (stems removed)")])
add("P-count-noun-off", "§12.4 post-food count unit disabled ('2 celery ribs' → 2 each 'celery ribs')",
    "name.ts", early_return("export function postFoodCountUnit(text: string, toks: readonly Tok[]): UnitRead | null {", "null"),
    [reg("2 celery ribs, diced"), reg("4 lemon wedges"), reg("eight cardamom pods")])
add("P-identity-list-off", "§12.4 product-identity exception removed ('2 fish sticks' → 2 stick 'fish')",
    "name.ts", {"find": "  if (PRODUCT_IDENTITY_NOUNS[code]?.has(prev.lower)) return null;\n", "replace": ""},
    [reg("2 fish sticks"), reg("3 bay leaves"), reg("4 kaffir lime leaves")])
G = "containerCup (container-cup rule) and PACKAGE_UNITS"
add("P-container-cup-off", "§12.5 container-cup rule disabled ('3 (5.3 oz) cups yogurt' read as volume cups)",
    "amount.ts", early_return("export function containerCup(unitRead: UnitRead, between: readonly { sec: Secondary; marked: boolean }[]): boolean {", "false"),
    [safe(G, "a cup with a marked weight between count and unit is a container; a measuring cup is not"), reg("3 (5.3 oz) cups vanilla Greek yogurt")])
add("P-package-units-widened", "§12.3 package units widened to fillets (per-piece weights become package sizes)",
    "amount.ts", {"find": 'export const PACKAGE_UNITS: ReadonlySet<string> = new Set([...CONTAINER_UNITS, "block", "loaf", "ball"]);',
                  "replace": 'export const PACKAGE_UNITS: ReadonlySet<string> = new Set([...CONTAINER_UNITS, "block", "loaf", "ball", "fillet"]);'},
    [safe(G, "only packaging units plus block, loaf and ball take a package size"), reg("4 (6-oz) salmon fillets")])
GP = "product numbers, fraction units, remark amounts, foreign units"
add("P-nutrition-off", "§12.8 nutrition-fact rule removed (nutrient + mass read as an ingredient)",
    "classify.ts", {"find": '    if (nutrientLabelEnd(label) === label.length && factValue(value, true)) return "not_an_ingredient";\n', "replace": ""},
    [safe(GP, "nonIngredientReason refuses shapes, not words"), reg("Vitamin C: 15 mg"), reg("Protein: 20 grams"), reg("Caffeine: 95 mg")])
add("P-remark-second-amount-off", "§12.11 second amount in a remark ignored ('(from 1/3 cup dry)' left ready: suppressed ambiguity)",
    "remarks.ts", early_return("export function remarkSecondAmount(toks: readonly Tok[]): boolean {", "false"),
    [safe(GP, "remarkSecondAmount needs both an amount and a source, state or substitution marker"), reg("1 cup cooked quinoa (from 1/3 cup dry)"), reg("1 cup rice (1 cup dry makes 3 cooked)")])
add("P-foreign-unit-off", "§12.14 non-US unit remark ignored ('1 pint milk (UK)' left ready)",
    "amount.ts", early_return("export function foreignSystemRemark(toks: readonly Tok[], unit: UnitV1 | null): boolean {", "false"),
    [safe(GP, "foreignSystemRemark: a non-US system named for a US volume"), reg("1 pint milk (UK)")])
add("P-fraction-unit-off", "§12.1 fraction-unit compounds not read ('a half-cup milk' → 1 each 'half-cup milk')",
    "quantity.ts", early_return("export function fractionUnitWord(t: Tok | undefined): { value: Rational; unitOffset: number; unitWord: string; plural: boolean } | null {", "null"),
    [safe(GP, "fractionUnitWord reads only fraction + weight/volume unit compounds"), reg("a half-cup milk"), reg("a quarter-pound beef")])
add("P-heading-off", "§12.8 component-heading rule disabled ('SAUCE', 'Cake Layers' read as foods)",
    "classify.ts", early_return("export function componentHeading(toks: readonly Tok[]): boolean {", "false"),
    [safe(GP, "nonIngredientReason refuses shapes, not words"), exact("section headings (componentHeading)", "SAUCE"), exact("section headings (componentHeading)", "Cake Layers")])
add("P-and-list-off", "§12.A A4 'A and B' after one amount read as one food again",
    "alternatives.ts", early_return("export function andJoinsTwoFoods(name: string): boolean {", "false"),
    [reg("2 cups strawberries and blueberries"), reg("1/4 cup chopped parsley and mint"), reg("2 cups chopped celery and carrots")])
add("P-count-word-name-off", "§12.A A1 count word that begins a product name taken as the unit again ('2 strip steaks' → 2 strip)",
    "amount.ts", early_return("export function countWordBeginsName(text: string, toks: readonly Tok[], unitRead: UnitRead, value: Rational): boolean {", "false"),
    [reg("2 strip steaks"), reg("4 cube steaks"), reg("2 sheet cakes")])
add("P-can-designation-off", "§12.9 can-size designation not recognised ('1 #10 can' read with the designation as an amount)",
    "amount.ts", early_return("export function canSizeDesignationAt(toks: readonly Tok[], k: number): number {", "k"),
    [reg("1 #10 can diced tomatoes"), reg("2 No. 303 cans cut green beans")])
add("P-unknown-measure-off", "§12.14 unknown measure words not recognised ('1 gill single cream' ready with the measure in the name)",
    "amount.ts", early_return("export function unknownMeasureAt(toks: readonly Tok[], a: number): number {", "a"),
    [reg("1 coffee cup plain flour"), reg("1 bowl cooked rice"), reg("2 squirts lemon juice"), reg("1 shake paprika")])
add("P-remark-source-off", "§12.A A3 remark measuring the source of an extracted part ignored ('(about 1 lemon)' left ready)",
    "remarks.ts", early_return("export function remarkMeasuresAnother(toks: readonly Tok[], name: string | null, text: string): boolean {", "false"),
    [safe(GP, "remarkMeasuresAnother: an amount remark measuring something other than the named food as prepared"), reg("3 tablespoons lemon juice (about 1 lemon)")])
add("P-equipment-off", "§12.8 equipment shape disabled (counted kitchen tools read as food)",
    "classify.ts", early_return('export function equipmentShape(toks: readonly Tok[]): "equipment" | "unsure" | null {', "null"),
    [reg("1 rolling pin"), reg("1 roll kitchen twine"), exact("equipment (equipmentShape)", "1 rolling pin"), exact("equipment (equipmentShape)", "6 popsicle sticks")])
add("P-nutrition-panel-off", "§12.8 one-line nutrition panel read as an ingredient (invented amount)",
    "classify.ts", early_return("export function nutritionPanel(toks: readonly Tok[]): boolean {", "false"),
    [exact("one-line nutrition panels (nutritionPanel)", "Calories: 412kcal | Carbohydrates: 52g | Protein: 18g"), exact("one-line nutrition panels (nutritionPanel)", "Calories 250 | Fat 10g | Carbs 30g")])
RF = "recognisedFoodHead (named safeguard): the head is a food and every word before it is recognised"
RU = "a counted line whose food is not recognised: needs_review, no amount, the text after the number kept (Decision 1, owner rule 1)"
M.append({"id": "P-food-head-off", "description": "recognised-food requirement disabled: every counted line counts as a recognised food (unknown heads and unknown leading words read ready)",
          "file": S + "foods.ts", **early_return("export function recognisedFoodHead(name: string): boolean {", "true"),
          "tests": ["tests/semantic-v2/recognised-food.test.ts", HARNESS],
          "killedBy": [safe(RF, "a capitalised word is accepted as a proper name or brand before a food head, a lower-case unknown word is not"),
                       safe(RU, "never unsupported, never dropped: an unrecognised head is not a non-ingredient shape")],
          "expect": "KILLED"})
spec = {"format": "recipe-extraction-mutations/v1", "owner": "coordinator (Phase 2B)",
        "description": "Parser mutations for the candidate semantic-v2: each disables or weakens one named safeguard and must be KILLED by an assertion in its direct test or in the required regression harness, for the stated reason.",
        "mutations": M}
dest = os.path.join(pkg, "tools/mutation/specs/parser.json")
json.dump(spec, open(dest, "w"), indent=1, ensure_ascii=False); open(dest, "a").write("\n")
print(len(M), "mutations ->", dest)

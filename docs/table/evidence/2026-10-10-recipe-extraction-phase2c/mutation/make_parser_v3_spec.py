#!/usr/bin/env python3
"""Generate tools/mutation/specs/parser-v3.json (coordinator): one mutation per Phase 2C safeguard of semantic-v3.

Each mutation disables exactly one safeguard and must be KILLED by assertions in the required 2C harness
(tests/regressions/semantic-v3-regressions.test.ts) for the lines it protects. Usage: python3 -I make_parser_v3_spec.py <repo-root>
"""
import json, os, sys
root = sys.argv[1]
pkg = os.path.join(root, "packages/recipe-extraction")
corpus = [json.loads(l) for l in open(os.path.join(pkg, "tests/regressions/exposed-regressions-2c.jsonl"), encoding="utf-8") if l.strip()]
by_input = {c["input"]: c for c in corpus}
HARNESS = "tests/regressions/semantic-v3-regressions.test.ts"
def reg(inp):
    c = by_input[inp]; assert c["firm"], inp
    title = f'{c["id"]} [{c["family"]}] {c["origin"]["kind"]}:{c["origin"]["ref"]} {json.dumps(c["input"], ensure_ascii=False)[:70]}'
    return {"test": f"exposed regressions 2C — semantic-v3 (required) > {title}", "reason": "^AssertionError"}
S = "src/ingredient/semantic-v3/"
def early(sig, value): return {"find": sig, "replace": sig + f"\n  if (Number.isFinite(0)) return {value};"}
M = []
def add(mid, desc, file, change, killers):
    M.append({"id": mid, "description": desc, "file": S + file, **change, "tests": [HARNESS], "killedBy": killers, "expect": "KILLED"})
add("P3-engine-alias-tub", "§13.1 bypassed: the engine reads 'tub(s)' as a container although the declared table does not (the Phase 2B 0075 fault)",
    "lexicon.ts", {"find": "  return unitOfAlias(text);", "replace": "  if (/^tubs?$/i.test(text)) return \"container\";\n  return unitOfAlias(text);"},
    [reg("1 tub sour cream"), reg("2 tubs Greek yogurt"), reg("1 small tub crème fraîche")])
add("P3-measure-slot-off", "§13.2 measure-slot accounting disabled: an undeclared measure, portion or vessel noun after a count is no longer an unresolved measure",
    "measure-slot.ts", early("export function unresolvedMeasureAt(toks: readonly Tok[], a: number, count: Rational): number {", "a"),
    [reg("1 saucepan water"), reg("1 knot fresh ginger"), reg("1 bite cheesecake")])
add("P3-sized-container-off", "§13.2 precedence over §12.3 disabled: a weight or volume before an undeclared serving vessel is read as the line's amount",
    "measure-slot.ts", early("export function sizedContainerWord(toks: readonly Tok[], at: number): boolean {", "false"),
    [reg("750 ml carafe white wine")])
add("P3-remark-another-off", "§13.3 disabled: a remark that brings in a separately measured other food (dissolved in, mixed with, soaked in) no longer makes the line needs_review",
    "remarks.ts", early("export function remarkCombinesAnother(toks: readonly Tok[], name: string | null, text: string): boolean {", "false"),
    [reg("1 tbsp tamarind paste, dissolved in 3 tbsp hot water"), reg("2 tsp instant yeast, dissolved in 1/4 cup warm water")])
add("P3-source-remark-off", "§12.A A3 disabled: a remark that measures the source of an extracted part ('(from 1 orange)') no longer makes the line needs_review",
    "remarks.ts", early("export function remarkMeasuresAnother(toks: readonly Tok[], name: string | null, text: string): boolean {", "false"),
    [reg("3 tbsp orange juice (from 1 orange)"), reg("1 tsp lime zest (1 lime)")])
add("P3-and-list-off", "§13.4 disabled: two foods joined by 'and' are read as one food",
    "alternatives.ts", early("export function andJoinsTwoFoods(name: string): boolean {", "false"),
    [reg("1 cup fresh peas and fava beans"), reg("2 tbsp lime juice and fish sauce")])
spec = {"format": "recipe-extraction-mutations/v1", "owner": "coordinator (Phase 2C)",
        "description": "Parser mutations for the candidate semantic-v3: each disables one Phase 2C safeguard and must be KILLED by an assertion in the required 2C regression harness, for the stated reason.",
        "mutations": M}
json.dump(spec, open(os.path.join(pkg, "tools/mutation/specs/parser-v3.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(M))

// Phase 2C: the exposed 2C regression corpus on the frozen engines (coordinator; reporting only, no assertions).
// Classification as the required harness: safe abstention (unsupported label) first, then field mismatches, then the noAmount rule.
// Usage (from packages/recipe-extraction): npx tsx <this file> [engine ...]
import { getEngine } from "../../../../../packages/recipe-extraction/src/ingredient/engines.ts";
import { CORPUS_FILE_2C, loadRegressions, mismatches, noAmountViolations, safeAbstention } from "../../../../../packages/recipe-extraction/tests/regressions/regression-match.ts";
const engines = process.argv.slice(2).length ? process.argv.slice(2) : ["legacy-table-import-2", "semantic-v1", "semantic-v2"];
const cases = loadRegressions(CORPUS_FILE_2C).filter((c) => c.firm);
const groupOf = (c: any) => c.origin.kind.startsWith("coordinator") ? `${c.origin.kind}:${c.origin.ref}` : c.origin.kind;
const rows = new Map<string, Record<string, number[]>>();
const fails: Record<string, string[]> = {};
for (const e of engines) {
  const eng = getEngine(e); fails[e] = [];
  for (const c of cases) {
    const got: any = eng.parse(c.input);
    const k = groupOf(c);
    const r = rows.get(k) ?? {}; const v = r[e] ?? [0, 0, 0]; rows.set(k, r); r[e] = v;
    if (safeAbstention(c, got)) v[1]++;
    else if (mismatches(c, got).length === 0 && noAmountViolations(c, got).length === 0) v[0]++;
    else { v[2]++; fails[e].push(`${c.id}\t${JSON.stringify(c.input)}\t${[...mismatches(c, got), ...noAmountViolations(c, got)].join("; ")}`); }
  }
}
console.log(`# 2C corpus (${cases.length} firm cases): exact / safe abstention / FAIL\n\n| group | n | ${engines.join(" | ")} |\n|---|---|${engines.map(() => "---").join("|")}|`);
for (const [k, r] of [...rows.entries()].sort()) console.log(`| ${k} | ${r[engines[0]].reduce((a, b) => a + b, 0)} | ${engines.map((e) => r[e].join(" / ")).join(" | ")} |`);
const tot = (e: string) => [...rows.values()].reduce((a, r) => a.map((x, i) => x + r[e][i]), [0, 0, 0]);
console.log(`| **all** | ${cases.length} | ${engines.map((e) => tot(e).join(" / ")).join(" | ")} |`);
for (const e of engines) console.log(`\n## ${e}: ${fails[e].length} failing firm cases\n\n` + fails[e].map((l) => "- " + l).join("\n"));

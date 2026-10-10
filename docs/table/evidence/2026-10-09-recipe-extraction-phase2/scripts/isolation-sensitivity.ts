/**
 * Informational (EVALUATION-PLAN-v2 change log; disclosed isolation flaw): holdout-v2 outcomes and
 * acceptance A1–A5 for an engine, on all cases and WITHOUT the holdout-v2 lines whose normalized input
 * exactly equals a string the implementation worker wrote (isolation-audit/audit-output.txt).
 * Run from packages/recipe-extraction:
 *   npx tsx ../../docs/table/evidence/2026-10-09-recipe-extraction-phase2/scripts/isolation-sensitivity.ts <engine-id>
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadIngredientCases } from "../../../../../packages/recipe-extraction/bench/labels";
import { acceptance, aggregate, classifyLines } from "../../../../../packages/recipe-extraction/bench/outcomes";
import { ENGINES } from "../../../../../packages/recipe-extraction/src/index";

const here = import.meta.dirname;
const audit = readFileSync(path.join(here, "../isolation-audit/audit-output.txt"), "utf8");
const line = audit.split("\n").find((l) => l.startsWith("exact matches with holdout-v2"))!;
const matched = new Set(JSON.parse(line.slice(line.indexOf("->") + 2).trim().replace(/'/g, '"')) as string[]);
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const engine = ENGINES[process.argv[2] ?? ""];
if (!engine) throw new Error(`engine? ${Object.keys(ENGINES).join(", ")}`);
const cases = loadIngredientCases(path.resolve(here, "../../../../../packages/recipe-extraction/fixtures"), ["holdout2"] as never);
const excluded = cases.filter((c) => matched.has(norm(c.input)));
for (const [label, set] of [["all holdout-v2", cases], [`holdout-v2 without the ${excluded.length} audit-matched lines`, cases.filter((c) => !matched.has(norm(c.input)))]] as const) {
  const acc = acceptance(aggregate(classifyLines(set, engine)));
  console.log(`\n## ${engine.id} — ${label} (${set.length} lines)`);
  console.log(JSON.stringify(acc, null, 1));
}
console.log(`\nexcluded ids: ${excluded.map((c) => c.id).join(", ")}`);

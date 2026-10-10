// Reproduce the exposed regression corpus against a registered engine (default: the frozen prior candidate
// semantic-v1). Separates SETUP errors (import/registry; exit 2), ENGINE errors (a throw on a line) and
// ASSERTION failures (a field mismatch against the label). Usage (repo root):
//   npx tsx docs/table/evidence/2026-10-10-recipe-extraction-phase2b/regressions/reproduce.ts [engine-id] [out.json]
import { writeFileSync } from "node:fs";
const engineId = process.argv[2] ?? "semantic-v1";
let getEngine: (id: string) => { parse(s: string): unknown };
let loadRegressions: () => any[];
let mismatches: (c: any, got: any) => string[];
try {
  ({ getEngine } = await import("../../../../../packages/recipe-extraction/src/ingredient/engines.ts"));
  ({ loadRegressions, mismatches } = await import("../../../../../packages/recipe-extraction/tests/regressions/regression-match.ts"));
  getEngine(engineId);
} catch (err) {
  console.error(`SETUP ERROR: ${(err as Error).message}`);
  process.exit(2);
}
const engine = getEngine(engineId);
const corpus = loadRegressions();
type Row = { id: string; input: string; family: string; firm: boolean; origin: string; outcome: "pass" | "assertion" | "engine-error"; detail: string[] };
const rows: Row[] = corpus.map((c) => {
  const origin = `${c.origin.kind}:${c.origin.ref}`;
  try {
    const got = engine.parse(c.input);
    const m = mismatches(c, got);
    return { id: c.id, input: c.input, family: c.family, firm: c.firm, origin, outcome: m.length ? "assertion" : "pass", detail: m };
  } catch (err) {
    return { id: c.id, input: c.input, family: c.family, firm: c.firm, origin, outcome: "engine-error", detail: [String((err as Error).message)] };
  }
});
const tally: Record<string, Record<string, number>> = {};
for (const r of rows) {
  const k = `${r.family}${r.firm ? "" : " (debatable)"}`;
  tally[k] ??= { total: 0, pass: 0, assertion: 0, "engine-error": 0 };
  tally[k].total++; tally[k][r.outcome]++;
}
const firm = rows.filter((r) => r.firm);
const summary = { engine: engineId, corpus: corpus.length, firm: firm.length,
  firmPass: firm.filter((r) => r.outcome === "pass").length, firmAssertion: firm.filter((r) => r.outcome === "assertion").length,
  engineErrors: rows.filter((r) => r.outcome === "engine-error").length, byFamily: tally };
console.log(JSON.stringify(summary, null, 1));
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify({ summary, rows }, null, 1) + "\n");

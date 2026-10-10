// Finding-by-finding dispositions on the exposed regression corpus (coordinator). Runs the frozen engines on
// exposed inputs only; uses the required harness's comparator (tests/regressions/regression-match.ts).
import { parseIngredientV1 } from "/home/user/Meal-Planner/packages/recipe-extraction/src/index.ts";
import { loadRegressions, mismatches, safeAbstention } from "/home/user/Meal-Planner/packages/recipe-extraction/tests/regressions/regression-match.ts";
const cases = loadRegressions();
const engines = ["legacy-table-import-2", "semantic-v1", "semantic-v2"];
type R = "exact" | "abstain" | "FAIL";
const cls = (c: any, e: string): [R, any] => {
  const got = parseIngredientV1(c.input, { engine: e });
  if (safeAbstention(c, got)) return ["abstain", got];
  if (mismatches(c, got).length === 0) return ["exact", got];
  return ["FAIL", got];
};
const short = (g: any) => `${g.status}${g.quantity ? " " + (g.quantity.kind === "range" ? `${g.quantity.min?.numerator}/${g.quantity.min?.denominator}..` : `${g.quantity.numerator}/${g.quantity.denominator}`) : ""}${g.unit ? " " + g.unit.canonical : ""}${g.name ? ` "${g.name}"` : ""}${g.alternatives?.length ? " [" + g.alternatives.join(" | ") + "]" : ""}`;
const groups = new Map<string, any[]>();
for (const c of cases) {
  if (!c.firm) continue;
  const k = c.origin.kind === "coordinator" || c.origin.kind === "holdout-v2" || c.origin.kind === "holdout-v1" ? `${c.origin.kind}:${c.origin.kind === "coordinator" ? c.origin.ref : c.origin.kind}` : c.origin.kind;
  (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
}
const out: string[] = ["| Group | firm cases | " + engines.map((e) => `${e} exact / abstain / FAIL`).join(" | ") + " |", "|---|---|" + engines.map(() => "---").join("|") + "|"];
const detail: string[] = [];
for (const [k, cs] of [...groups.entries()].sort()) {
  const row = engines.map((e) => { const r = cs.map((c) => cls(c, e)[0]); return `${r.filter((x) => x === "exact").length} / ${r.filter((x) => x === "abstain").length} / ${r.filter((x) => x === "FAIL").length}`; });
  out.push(`| ${k} | ${cs.length} | ${row.join(" | ")} |`);
  if (k.startsWith("coordinator:K") || k.startsWith("coordinator:FH-SF") || k.startsWith("holdout-v2")) {
    for (const c of cs) {
      const [r1, g1] = cls(c, "semantic-v1"); const [r2, g2] = cls(c, "semantic-v2");
      detail.push(`| ${k.replace("coordinator:", "")} ${c.origin.kind === "holdout-v2" ? c.origin.ref : ""} | \`${c.input}\` | ${c.expect.status}${c.expect.name ? ` "${c.expect.name}"` : ""} | ${r1}: ${short(g1)} | **${r2}**: ${short(g2)} |`);
    }
  }
}
console.log("## Firm regression cases by origin\n\n" + out.join("\n"));
console.log("\n## Line by line: K1–K4, final-head SF-1–SF-4 and the holdout-v2 failures\n\n| Finding | Input | Label | semantic-v1 | semantic-v2 |\n|---|---|---|---|---|\n" + detail.join("\n"));

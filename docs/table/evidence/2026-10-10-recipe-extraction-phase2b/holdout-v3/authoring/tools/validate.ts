// Format check of holdout-v3 with the scorer worktree's own frozen label loader (holdout3 rules). Reads the private
// fixtures copy only; prints counts, never case content.
import { loadIngredientCases } from "/home/user/rx2b-scorer/packages/recipe-extraction/bench/labels.ts";

const cases = loadIngredientCases("/home/user/rx-eval-v3/fixtures", ["holdout3"]);
const by = (f: (c: (typeof cases)[number]) => string) => {
  const m: Record<string, number> = {};
  for (const c of cases) m[f(c)] = (m[f(c)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort());
};
console.log(
  JSON.stringify({
    valid: true,
    cases: cases.length,
    status: by((c) => c.expect.status),
    family: by((c) => String(c.family)),
    debatable: cases.filter((c) => c.debatable).length,
    reliesOnNewReading: cases.filter((c) => c.reliesOnNewReading).length,
  }),
);

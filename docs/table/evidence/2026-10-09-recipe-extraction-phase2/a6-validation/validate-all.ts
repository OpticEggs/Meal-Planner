// A6 check: run every registered engine over every benchmark ingredient line and validate each output.
import { readFileSync } from "node:fs";
import { ENGINES, validateParsedIngredientV1 } from "/home/user/Meal-Planner/packages/recipe-extraction/src/index.ts";
const dir = "/home/user/Meal-Planner/packages/recipe-extraction/fixtures/ingredients/";
const files = ["dev.jsonl", "holdout.jsonl", "holdout-v2.jsonl"];
let lines = 0, outputs = 0, invalid = 0, nondet = 0;
for (const f of files) {
  for (const raw of readFileSync(dir + f, "utf8").split("\n")) {
    if (!raw.trim()) continue;
    const c = JSON.parse(raw); lines++;
    for (const [id, eng] of Object.entries(ENGINES)) {
      const a = (eng as any).parse(c.input); const b = (eng as any).parse(c.input); outputs++;
      const p = validateParsedIngredientV1(a);
      if (p.length) { invalid++; console.log("INVALID", id, c.id, p.join("; ")); }
      if (JSON.stringify(a) !== JSON.stringify(b)) { nondet++; console.log("NONDET", id, c.id); }
    }
  }
}
console.log(`engines=${Object.keys(ENGINES).join(",")} lines=${lines} outputs=${outputs} invalid=${invalid} nondeterministic=${nondet}`);

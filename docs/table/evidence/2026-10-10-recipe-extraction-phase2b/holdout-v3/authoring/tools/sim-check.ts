// Simulates the repository fixtures after the copy (private sim/ dir): invariants, freeze records and the whole
// label corpus (dev + holdout + holdout-v2 + holdout-v3, cross-file id/input uniqueness). Prints counts only.
import { checkInvariants } from "/home/user/rx2b-scorer/packages/recipe-extraction/bench/invariants.ts";
import { verifyFreeze, verifyFreezeV2, verifyFreezeV3 } from "/home/user/rx2b-scorer/packages/recipe-extraction/bench/freeze.ts";
import { loadIngredientCases } from "/home/user/rx2b-scorer/packages/recipe-extraction/bench/labels.ts";

const dir = "/home/user/rx-eval-v3/sim/packages/recipe-extraction/fixtures";
const inv = checkInvariants(dir);
const all = loadIngredientCases(dir, ["dev", "holdout", "holdout2", "holdout3"]);
const per: Record<string, number> = {};
for (const c of all) per[c.split] = (per[c.split] ?? 0) + 1;
console.log(JSON.stringify({ invariantsOk: inv.ok, problems: inv.problems, freeze: verifyFreeze(dir), freezeV2: verifyFreezeV2(dir), freezeV3: verifyFreezeV3(dir), corpus: per }));

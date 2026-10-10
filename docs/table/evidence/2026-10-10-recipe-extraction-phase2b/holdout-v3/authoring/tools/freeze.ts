// Computes FREEZE-v3.json over the private fixtures copy with the frozen bench/freeze.ts and verifies it.
import { writeFileSync } from "node:fs";
import { computeFreezeV3, verifyFreezeV3 } from "/home/user/rx2b-scorer/packages/recipe-extraction/bench/freeze.ts";

const dir = "/home/user/rx-eval-v3/fixtures";
const record = computeFreezeV3(dir, "2026-10-10");
writeFileSync(`${dir}/FREEZE-v3.json`, JSON.stringify(record, null, 2) + "\n");
const problems = verifyFreezeV3(dir);
console.log(JSON.stringify({ sha256: record.ingredients.sha256, cases: record.ingredients.cases, byStatus: record.ingredients.byStatus, bySourceKind: record.ingredients.bySourceKind, verifyFreezeV3: problems }));

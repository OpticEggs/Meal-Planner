import { readFileSync } from "node:fs";
import { ENGINES } from "./repo/packages/recipe-extraction/src/ingredient/engines";
const e = ENGINES["semantic-v1"];
const q = (x: any) => (x === null ? "-" : x.kind === "exact" ? `${x.numerator}/${x.denominator}`.replace(/\/1$/, "") : `${x.min.numerator}..${x.max.numerator}`);
const cs = readFileSync("repo/packages/recipe-extraction/fixtures/ingredients/holdout-v2.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const ids = ["0054","0072","0065","0165","0338","0164","0219","0087","0129","0130","0140","0040","0041","0151","0061","0212","0213","0253","0239","0232","0218","0220","0277","0286","0288","0297"];
for (const id of ids) { const c = cs.find((x: any) => x.id === "ing-h2-" + id); const r: any = e.parse(c.input);
  console.log(`${id} ${JSON.stringify(c.input)} → ${r.status} | ${r.name ?? "-"} | ${q(r.quantity)} | ${r.unit?.canonical ?? "-"} | pkg ${r.packageSize ? q(r.packageSize.quantity) + " " + r.packageSize.unit.canonical : "-"} | eq[${r.equivalents.map((x: any) => q(x.quantity) + " " + x.unit.canonical)}] | alts[${r.alternatives.join("; ")}] | note ${r.note ?? "-"}   ‖ label ${c.expect.status} ${c.expect.name} ${c.expect.quantity} ${c.expect.unit} ${c.expect.packageSize ? JSON.stringify(c.expect.packageSize) : ""} ${c.expect.alternatives.join("; ")}`); }

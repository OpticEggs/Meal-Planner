// Read-only analysis: exact rational → Table decimal storage. Compares two adapter bridges:
//  A) round the whole-recipe amount to 4 dp first (what the legacy suggestion does: "0.3333"), then perPortion();
//  B) divide the exact rational by servings, then round once to 4 dp (what perPortion would do with an exact input).
// Reports per-portion differences and the total demand error for a full recipe's portions.
import { perPortion } from "@/domain/recipes/import";
import { D } from "@/domain/units";
import { rational, toDecimal, div, mul, add } from "../../../../../packages/recipe-extraction/src/rational";
const big = BigInt;
let cases = 0, differ = 0, zeroA = 0, zeroB = 0;
let worstRel = { rel: 0, what: "" };
const dens = [3, 6, 7, 9, 12, 16, 32];
for (const d of dens) for (let whole = 0; whole <= 4; whole++) for (let n = 1; n < d; n++) for (let s = 1; s <= 12; s++) {
  const r = rational(big(whole * d + n), big(d));
  const a = perPortion(toDecimal(r, 4).value, s).value;      // bridge A
  const b = toDecimal(div(r, rational(big(s))), 4).value;    // bridge B
  cases++;
  if (a !== b) differ++;
  if (new D(a).lte(0)) zeroA++;
  if (new D(b).lte(0)) zeroB++;
  // total demand when all s portions are cooked, vs the exact amount
  const totalB = new D(b).mul(s);
  const exact = new D(r.n.toString()).div(r.d.toString());
  const rel = totalB.minus(exact).abs().div(exact).toNumber();
  if (rel > worstRel.rel) worstRel = { rel, what: `${whole ? whole + " " : ""}${n}/${d} over ${s} servings → ${b}/portion, total ${totalB.toFixed()} vs exact ${exact.toDecimalPlaces(6).toFixed()}` };
}
console.log(JSON.stringify({ cases, bridgesDiffer: differ, perPortionZeroA: zeroA, perPortionZeroB: zeroB, worstRelativeTotalErrorBridgeB: worstRel }, null, 2));
// The pesto line: 1/3 cup, 4 servings
const p = rational(big(1), big(3));
console.log("pesto 1/3 cup, 4 servings:", { A: perPortion(toDecimal(p, 4).value, 4), B: toDecimal(div(p, rational(big(4))), 4), totalB: new D(toDecimal(div(p, rational(big(4))), 4).value).mul(4).toFixed() });
// small amounts: 1/8 tsp over 12 and 100 servings; 1/3 tsp over 100
for (const [n, d, s] of [[1, 8, 12], [1, 8, 100], [1, 3, 100], [1, 16, 100]] as const) {
  const r = rational(big(n), big(d));
  console.log(`${n}/${d} over ${s}:`, perPortion(toDecimal(r, 4).value, s), toDecimal(div(r, rational(big(s))), 4));
}

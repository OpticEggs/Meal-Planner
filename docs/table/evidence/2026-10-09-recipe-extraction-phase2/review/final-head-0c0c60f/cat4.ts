import { ENGINES } from "./repo/packages/recipe-extraction/src/ingredient/engines";
const e = ENGINES["semantic-v1"];
const q = (x: any) => (x === null ? "-" : x.kind === "exact" ? `${x.numerator}/${x.denominator}`.replace(/\/1$/, "") : `${x.min.numerator}..${x.max.numerator}`);
for (const l of ["2 tbsp butter, ghee, or oil", "1 cup pecans, walnuts, or almonds", "1/2 cup raisins, cranberries or cherries", "2 (6 oz) cups yogurt", "4 (4 oz) cups applesauce", "between 1 and 2 tbsp sugar", "between 3 and 4 cups flour", "1 cup cooked farro (from 1/2 cup uncooked)", "2 cups cooked rice (from 2/3 cup raw)", "1 lb large shrimp", "2 lb small new potatoes", "1 lb jumbo sea scallops", "Dressing", "For the Crust", "STEP 1", "Glaze"]) {
  const r: any = e.parse(l);
  console.log(`${JSON.stringify(l)} → ${r.status} | ${r.name ?? "-"} | ${q(r.quantity)} | ${r.unit?.canonical ?? "-"} | pkg ${r.packageSize ? q(r.packageSize.quantity) + " " + r.packageSize.unit.canonical : "-"} | eq[${r.equivalents.map((x: any) => q(x.quantity) + " " + x.unit.canonical)}] | alts[${r.alternatives.join("; ")}] | note ${r.note ?? "-"} | ${r.reasons.join(",")}`);
}

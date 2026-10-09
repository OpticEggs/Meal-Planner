import { ENGINES } from "./repo/packages/recipe-extraction/src/ingredient/engines";
const e = ENGINES[process.argv[2] ?? "semantic-v1"];
const q = (x: any) => (x === null ? "-" : x.kind === "exact" ? `${x.numerator}/${x.denominator}`.replace(/\/1$/, "") : `${x.min.numerator}/${x.min.denominator}..${x.max.numerator}/${x.max.denominator}`);
const groups: Record<string, string[]> = {
  K1: ["a half-cup milk", "a quarter-cup sugar", "a quarter-pound beef", "a half-pound ground beef", "1 half-cup butter", "a half-cup of milk"],
  K2: ["400g (14oz) can chopped tomatoes", "400 g (14 oz) can tomatoes", "400g/14oz can chopped tomatoes", "400 g / 14 oz can tomatoes", "14 oz (400 g) can tomatoes", "15 oz (425 g) can black beans", "400ml (14fl oz) can coconut milk", "28 oz (794 g) can whole tomatoes", "8 oz (225 g) package cream cheese", "8-oz (225 g) package cream cheese", "16 oz (1 lb) bag frozen peas", "400ml can coconut milk", "1 x 400g (14oz) can tomatoes", "400 g can (14 oz) tomatoes"],
  K3: ["Protein: 20 grams", "Fat: 10 grams", "Sodium: 300 milligrams", "Carbohydrates: 30 grams", "Serving size: 1 cup (240 ml)", "Points: 5", "Weight Watchers points: 5", "Protein 20g", "Calories: 250 kcal", "Total Fat 10g", "Serving size: 1 cup"],
  K4: ["Five spice powder", "Seven spice blend", "Three cheese blend", "Four cheese pizza", "You will need: 2 baking sheets", "You'll need: 1 piping bag"],
  invented: ["1 lb ham or smoked turkey", "1 cup kale or Swiss chard", "1 cup chicken or vegetable broth", "1 lb sausage or ground beef"],
  bench_s3_fixes: ["1/3 cup pesto (homemade or store-bought)", "1-1/2 cups milk", "1 1/3 cups flour", "2-3 cups water", "1 (14.5 oz) can diced tomatoes", "8 fl oz milk", "8 oz cheddar", "1 cup ricotta (whole milk (not part-skim))", "1 cup chicken or vegetable broth", "2 cups cooked black beans", "1 cup uncooked arborio rice", "8 oz raw chicken breast, diced"],
};
for (const [k, lines] of Object.entries(groups)) {
  console.log(`== ${k}`);
  for (const l of lines) {
    const r: any = e.parse(l);
    console.log(`${JSON.stringify(l)} → ${r.status} | ${r.name ?? "-"} | ${q(r.quantity)} | ${r.unit?.canonical ?? "-"} | pkg ${r.packageSize ? q(r.packageSize.quantity) + " " + r.packageSize.unit.canonical : "-"} | eq[${r.equivalents.map((x: any) => q(x.quantity) + " " + x.unit.canonical)}] | alts[${r.alternatives.join("; ")}] | form ${r.form ?? "-"} | note ${r.note ?? "-"} | ${r.reasons.join(",")}`);
  }
}

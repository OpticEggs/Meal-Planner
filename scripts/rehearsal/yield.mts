// Upgrade rehearsal for migration 018 (B51, D159: a recipe version's own yield), DISPOSABLE LOCAL databases only.
// MODE (run with cwd=APP_ROOT, that release's code):
//   unset      → read: how many versions have a recorded yield, and the newest version of the rehearsal recipe
//   record     → this release records "makes 6" on a recipe the previous release wrote (all rows legacy), changing no amount
//   prev-title → the release at APP_ROOT (the previous one) saves a title-only edit of that recipe through its own command
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
const MODE = process.env.MODE ?? "read";
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const pg = (await import("pg")).default;
const c = new pg.Client({ connectionString: url });
await c.connect();
const hasCol = (await c.query("SELECT 1 FROM information_schema.columns WHERE table_name='recipe_versions' AND column_name='servings'")).rowCount === 1;
const [m] = (await c.query("SELECT id, household_id FROM members WHERE display_name='Jon' ORDER BY created_at LIMIT 1")).rows;
const actor = { memberId: m.id, householdId: m.household_id, displayName: "Jon" };
// The rehearsal recipe: the first current recipe (by title) whose rows are all legacy and that has at least one row.
const pick = async () =>
  (await c.query(
    `SELECT r.id AS recipe_id, v.id AS version_id, v.version_no, v.title FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id
      WHERE r.household_id=$1 AND EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_version_id=v.id)
        AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_version_id=v.id AND ri.quantity_basis<>'legacy')
      ORDER BY v.title LIMIT 1`, [m.household_id])).rows[0];
const rowsOf = async (vid: string) =>
  (await c.query("SELECT id, ingredient_key, component_key, quantity::text AS q, unit, form, note, quantity_basis, exact_amount, exact_servings FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [vid])).rows;
const comps = async (vid: string) => (await c.query("SELECT key, name FROM recipe_components WHERE recipe_version_id=$1 ORDER BY sort", [vid])).rows;
const sameRows = (a: any[], b: any[]) => JSON.stringify(a.map(({ id: _i, ...x }) => x)) === JSON.stringify(b.map(({ id: _i, ...x }) => x));
const marker = (await c.query("SELECT recipe_id FROM recipe_versions WHERE title LIKE 'B51 rehearsal:%' LIMIT 1")).rows[0]?.recipe_id ?? null;
const current = async (recipeId: string) =>
  (await c.query(`SELECT v.id, v.version_no, v.title${hasCol ? ", v.servings" : ""} FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE r.id=$1`, [recipeId])).rows[0];

let out: any;
if (MODE === "record") {
  const t = await pick();
  const before = await rowsOf(t.version_id);
  const { wholeAmountText } = await import(`${APP}/src/domain/recipes/whole-amount.ts`);
  const { saveRecipeVersionCommand } = await import(`${APP}/src/server/commands/library.ts`);
  const r = await saveRecipeVersionCommand(actor, "rehearsal-b51-record", {
    recipeId: t.recipe_id, expectedVersionNo: t.version_no, title: `B51 rehearsal: ${t.title}`, instructions: "", components: await comps(t.version_id), servings: 6,
    ingredients: before.map((x) => ({
      componentKey: x.component_key, ingredientName: x.ingredient_key, ingredientKey: x.ingredient_key, unit: x.unit, form: x.form, note: x.note, sourceRowId: x.id,
      amount: wholeAmountText({ quantity: x.q }, 6).text,
    })),
  });
  if (r.status !== "accepted") throw new Error(JSON.stringify(r));
  const v = await current(t.recipe_id);
  out = { recipeId: t.recipe_id, from: t.version_no, version: v.version_no, servings: v.servings, rows: before.length, rowsUnchanged: sameRows(before, await rowsOf(v.id)) };
} else if (MODE === "prev-title") {
  const v = await current(marker);
  const before = await rowsOf(v.id);
  const { saveRecipeVersionCommand } = await import(`${APP}/src/server/commands/library.ts`);
  const r = await saveRecipeVersionCommand(actor, "rehearsal-b51-prev-title", {
    recipeId: marker, expectedVersionNo: v.version_no, title: `${v.title} (edited by the previous release)`, instructions: "", components: await comps(v.id),
    ingredients: before.map((x) => ({ componentKey: x.component_key, ingredientName: x.ingredient_key, ingredientKey: x.ingredient_key, quantity: x.q, unit: x.unit, form: x.form, note: x.note, sourceRowId: x.id })),
  });
  if (r.status !== "accepted") throw new Error(JSON.stringify(r));
  const after = await current(marker);
  out = { version: after.version_no, rowsUnchanged: sameRows(before, await rowsOf(after.id)) };
} else {
  const recorded = hasCol ? Number((await c.query("SELECT count(*) FROM recipe_versions WHERE servings IS NOT NULL")).rows[0].count) : null;
  const versions = hasCol && marker
    ? (await c.query("SELECT version_no, servings FROM recipe_versions WHERE recipe_id=$1 ORDER BY version_no", [marker])).rows
    : [];
  out = { column: hasCol ? "present" : "absent", versionsWithYield: recorded, rehearsalRecipe: versions };
}
await c.end();
console.log(JSON.stringify(out));
process.exit(0);

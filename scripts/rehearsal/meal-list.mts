// Upgrade/rollback rehearsal (catalog-first, migration 017). MODE=populate (this release only): open a meal list with
// two selected meals and one "Needs a quantity" item, choose a product and approve a list line. MODE=check: print
// what the stored list projection says (lines that name a selected meal, approvals on the list) — read-only.
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const pg = (await import("pg")).default;
const q = async (sql: string, p: unknown[] = []) => {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try { return (await c.query(sql, p)).rows; } finally { await c.end(); }
};
const ok = (r: any, what: string) => {
  if (r?.status !== "accepted") throw new Error(`${what}: ${JSON.stringify(r)}`);
  return r.result;
};
if (process.env.MODE === "populate") {
  const ml = await import(`${APP}/src/server/commands/meal-lists.ts`);
  const groceries = await import(`${APP}/src/server/commands/groceries.ts`);
  const [m] = await q("SELECT id, household_id FROM members WHERE display_name='Jon' ORDER BY created_at LIMIT 1");
  const jon = { memberId: m.id, householdId: m.household_id, displayName: "Jon" };
  const recipes = await q(
    `SELECT r.id, r.current_version_id, v.title FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id
     WHERE r.household_id=$1 AND r.archived_at IS NULL AND v.title IN ('Fixture: Salmon rice bowls','Saved after the upgrade') ORDER BY v.title`,
    [m.household_id],
  );
  if (recipes.length !== 2) throw new Error(`expected two recipes, got ${JSON.stringify(recipes)}`);
  // The recipe saved after the upgrade also names an ingredient without an amount.
  await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,'flour_tortillas','flour tortillas') ON CONFLICT DO NOTHING", [m.household_id]);
  const saved = recipes.find((r: any) => r.title === "Saved after the upgrade");
  await q(
    "INSERT INTO recipe_unquantified_items(household_id, recipe_version_id, position, component_key, ingredient_key, name) VALUES ($1,$2,0,'main','flour_tortillas','flour tortillas')",
    [m.household_id, saved.current_version_id],
  );
  let weekId = "";
  for (const r of recipes) weekId = ok(await ml.addSelectedMealCommand(jon, `rehearsal-add-${r.id}`, { recipeId: r.id, versionId: r.current_version_id, servings: 2 }), "add").weekId;
  const [line] = await q("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.ingredient_key='salmon'", [weekId]);
  if (line.line.toSend > 0 && line.line.product && line.line.price) {
    ok(await groceries.approvePurchaseLinesCommand(jon, "rehearsal-approve-list", { weekId, lines: [{ key: "salmon", fingerprint: line.line.fingerprint, packages: line.line.toSend }] }), "approve");
  }
}
const lists = await q("SELECT l.id, l.week_id, l.status, w.week_start, w.kind FROM meal_lists l JOIN weeks w ON w.id=l.week_id");
const lines = await q(
  `SELECT r.ingredient_key, r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id JOIN meal_lists l ON l.week_id=g.week_id ORDER BY 1`,
);
const approvals = await q("SELECT a.ingredient_key, a.state FROM purchase_approvals a JOIN grocery_cycles g ON g.id=a.cycle_id JOIN meal_lists l ON l.week_id=g.week_id ORDER BY 1, 2");
const calendarNamingSelections = await q(
  `SELECT count(*)::int AS n FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id JOIN weeks w ON w.id=g.week_id
   WHERE w.kind='calendar' AND r.line::text LIKE '%selectedMealId%'`,
);
console.log(JSON.stringify({
  lists,
  listLines: lines.length,
  listLinesNamingSelectedMeals: lines.filter((l: any) => (l.line.meal?.sources ?? []).some((s: any) => s.selectedMealId)).length,
  needsQuantityUnknown: lines.filter((l: any) => l.ingredient_key === "flour_tortillas" && l.line.toSend === null).length,
  approvals,
  calendarLinesNamingSelectedMeals: calendarNamingSelections[0].n,
}, null, 1));
process.exit(0);

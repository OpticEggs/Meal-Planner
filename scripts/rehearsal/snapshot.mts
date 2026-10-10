// Upgrade rehearsal: recompute the grocery projection of every week with the code at APP_ROOT (run with
// cwd=APP_ROOT) and print what purchasing depends on — per line the shown amount, package counts, what is
// still to send, the fingerprint an approval binds to and whether the recorded approval is still valid.
// MODE=readonly prints the lines already stored without recomputing.
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const pg = (await import("pg")).default;
const c = new pg.Client({ connectionString: url });
await c.connect();
const weeks = (await c.query("SELECT w.id, w.household_id FROM weeks w JOIN grocery_cycles g ON g.week_id=w.id ORDER BY w.id")).rows;
if (process.env.MODE !== "readonly") {
  const { recomputeProjection } = await import(`${APP}/src/server/groceries/recompute.ts`);
  const { inTransaction } = await import(`${APP}/src/server/db/pool.ts`);
  for (const w of weeks) {
    await inTransaction(async (t: any) => {
      await t.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [w.household_id]);
      await recomputeProjection(t, w.household_id, w.id);
    });
  }
}
const rows = (await c.query(
  `SELECT g.week_id, r.ingredient_key, r.line_fingerprint, r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id ORDER BY g.week_id, r.ingredient_key`,
)).rows;
const out = rows.map((r: any) => ({
  week: r.week_id, key: r.ingredient_key, fingerprint: r.line_fingerprint, meal: r.line.meal?.quantity ?? null, unit: r.line.meal?.unit ?? null,
  packagesForMeal: r.line.packagesForMeal, packagesNeeded: r.line.packagesNeeded, toSend: r.line.toSend, sent: r.line.sent,
  approvalValid: r.line.approval?.valid ?? null, status: r.line.status,
}));
await c.end();
console.log(JSON.stringify(out, null, 1));
process.exit(0);

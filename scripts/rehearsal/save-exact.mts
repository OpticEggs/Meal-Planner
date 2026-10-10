// Upgrade rehearsal: the release at APP_ROOT saves one recipe through its own command (with this release, an
// exact row), so the rollback check can show the earlier release still reading the database afterwards.
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const pg = (await import("pg")).default;
const c = new pg.Client({ connectionString: url });
await c.connect();
const [m] = (await c.query("SELECT id, household_id FROM members WHERE display_name='Jon' ORDER BY created_at LIMIT 1")).rows;
await c.end();
const { saveRecipeVersionCommand } = await import(`${APP}/src/server/commands/library.ts`);
const r = await saveRecipeVersionCommand({ memberId: m.id, householdId: m.household_id, displayName: "Jon" }, "rehearsal-exact-save", {
  title: "Saved after the upgrade", instructions: "", components: [{ key: "main", name: "Main" }],
  ingredients: [{ componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.5", unit: "each" }],
});
if (r.status !== "accepted") throw new Error(JSON.stringify(r));
console.log(JSON.stringify(r.result));
process.exit(0);

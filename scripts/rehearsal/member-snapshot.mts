// Upgrade/rollback rehearsal: read Jon's household snapshot with the release at APP_ROOT (what its UI would load) and
// print which week and how many grocery lines it shows. Read-only.
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const pg = (await import("pg")).default;
const c = new pg.Client({ connectionString: url });
await c.connect();
const [m] = (await c.query("SELECT id, household_id FROM members WHERE display_name='Jon' ORDER BY created_at LIMIT 1")).rows;
await c.end();
const { householdSnapshot } = await import(`${APP}/src/server/queries/snapshot.ts`);
const s: any = await householdSnapshot({ memberId: m.id, householdId: m.household_id, displayName: "Jon" });
console.log(JSON.stringify({ weekId: s.week?.id ?? null, weekStart: s.clock.weekStart, groceryLines: s.groceries?.lines?.length ?? 0, mealList: s.mealList === undefined ? "absent (this release has no meal lists)" : s.mealList ? { meals: s.mealList.meals.length, lines: s.mealList.groceries?.lines?.length ?? 0 } : null }, null, 1));
process.exit(0);

// Upgrade rehearsal helpers (disposable LOCAL databases only), run with cwd=APP_ROOT:
//   columns                    → JSON {table: [columns]} of every base table
//   checksum <columns.json>    → JSON {table: md5} over exactly those columns (so new columns don't count)
//   export <householdId>       → the household export made by APP_ROOT's code
//   restore <export.json>      → restore that export with APP_ROOT's code into DATABASE_URL (an empty, migrated database)
//   basis                      → JSON counts of recipe_ingredients by quantity_basis (if the column exists)
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const pg = (await import("pg")).default;
const fs = await import("node:fs");
const [cmd, arg] = process.argv.slice(2);
const c = new pg.Client({ connectionString: url });
await c.connect();
let out: unknown;
if (cmd === "columns") {
  const r = await c.query(
    `SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN information_schema.tables t ON t.table_name=c.table_name AND t.table_schema=c.table_schema
      WHERE c.table_schema='public' AND t.table_type='BASE TABLE' ORDER BY c.table_name, c.ordinal_position`,
  );
  const m: Record<string, string[]> = {};
  for (const x of r.rows) (m[x.table_name] ??= []).push(x.column_name);
  out = m;
} else if (cmd === "checksum") {
  const cols: Record<string, string[]> = JSON.parse(fs.readFileSync(arg, "utf8"));
  const m: Record<string, string | null> = {};
  for (const [t, cs] of Object.entries(cols)) {
    if (t === "schema_migrations") continue;
    const list = cs.map((x) => `"${x}"`).join(", ");
    m[t] = (await c.query(`SELECT md5(string_agg(r::text, '|' ORDER BY r::text)) AS h FROM (SELECT ${list} FROM "${t}") r`)).rows[0].h;
  }
  out = m;
} else if (cmd === "export") {
  const { exportHousehold } = await import(`${APP}/src/server/export.ts`);
  const e = await exportHousehold(c, arg);
  out = { ...e, exportedAt: "(rehearsal)" };
} else if (cmd === "restore") {
  const { restoreHousehold } = await import(`${APP}/src/server/export.ts`);
  out = await restoreHousehold(c, JSON.parse(fs.readFileSync(arg, "utf8")));
} else if (cmd === "basis") {
  const has = (await c.query("SELECT 1 FROM information_schema.columns WHERE table_name='recipe_ingredients' AND column_name='quantity_basis'")).rowCount;
  out = has ? Object.fromEntries((await c.query("SELECT quantity_basis AS b, count(*)::int AS n FROM recipe_ingredients GROUP BY 1 ORDER BY 1")).rows.map((x) => [x.b, x.n])) : { column: "absent" };
} else throw new Error(`unknown command ${cmd}`);
await c.end();
console.log(JSON.stringify(out, null, 1));
process.exit(0);

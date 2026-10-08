import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

/** Applies migrations/NNN_*.sql in order, each in its own transaction.
 *  Refuses to continue if an already-applied file changed on disk. */
export async function migrate(connectionString: string, dir = path.resolve(process.cwd(), "migrations")): Promise<string[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Map<string, string>(
      (await client.query("SELECT name, sha256 FROM schema_migrations")).rows.map((r) => [r.name, r.sha256]),
    );
    const files = readdirSync(dir).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
    for (const f of files) {
      const sql = readFileSync(path.join(dir, f), "utf8");
      const sha = createHash("sha256").update(sql).digest("hex");
      if (done.has(f)) {
        if (done.get(f) !== sha) throw new Error(`migration ${f} changed after it was applied`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(name, sha256) VALUES ($1,$2)", [f, sha]);
        await client.query("COMMIT");
        applied.push(f);
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`migration ${f} failed: ${(e as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
  return applied;
}

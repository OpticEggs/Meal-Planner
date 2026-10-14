import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

/** Key of the PostgreSQL advisory lock that serializes migration runs between processes (two releases
 *  starting at once, or a start-time migration racing a manual `npm run db:migrate`). Any fixed bigint;
 *  nothing else in Table takes an advisory lock. */
export const MIGRATION_LOCK_KEY = 7_265_012_001;

/** Applies migrations/NNN_*.sql in order, each in its own transaction.
 *  Refuses to continue if an already-applied file changed on disk.
 *
 *  Concurrency: each transaction takes a TRANSACTION-level advisory lock on MIGRATION_LOCK_KEY and
 *  re-reads schema_migrations under it, so when two processes migrate at once every file is applied
 *  exactly once and the process that waited finds it applied and carries on. Transaction-level, not
 *  session-level: COMMIT/ROLLBACK releases it on the same server connection, so it stays correct behind
 *  a transaction-mode pooler (Neon's pooled URL does not support session-level advisory locks) and a
 *  failed run can never leave it held. */
export async function migrate(connectionString: string, dir = path.resolve(process.cwd(), "migrations")): Promise<string[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query("COMMIT");
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
      await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
      // Re-read under the lock: another process may have applied this file while we waited.
      const now = await client.query("SELECT sha256 FROM schema_migrations WHERE name = $1", [f]);
      if (now.rowCount) {
        await client.query("COMMIT");
        if (now.rows[0].sha256 !== sha) throw new Error(`migration ${f} changed after it was applied`);
        continue;
      }
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

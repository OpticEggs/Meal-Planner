/**
 * Start-time migrations (Render Free has no pre-deploy step, so the Start Command runs
 * `npm run db:migrate && exec next start`): two processes migrating the same database at once must
 * each finish, with every migration applied exactly once; a running migration makes the other wait;
 * a failing migration rolls back and leaves nothing held.
 *
 * Uses its OWN disposable databases, never the shared test database: MIGRATE_LOCK_DB_A / _B (default
 * table_deploy_a / table_deploy_b on the local test server). Each is dropped and recreated here, and
 * only a database whose name starts with `table_deploy_` is ever touched.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { MIGRATION_LOCK_KEY, migrate } from "@/server/db/migrate";

const SERVER = "postgres://table@127.0.0.1:54329";
const DB_A = process.env.MIGRATE_LOCK_DB_A ?? `${SERVER}/table_deploy_a`;
const DB_B = process.env.MIGRATE_LOCK_DB_B ?? `${SERVER}/table_deploy_b`;
const REAL = path.resolve(process.cwd(), "migrations");
const ALL = readdirSync(REAL).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
const LAST = ALL[ALL.length - 1];
const scratch: string[] = [];

async function recreate(url: string) {
  const u = new URL(url);
  const name = u.pathname.slice(1);
  if (!/^table_deploy_[a-z0-9_]+$/.test(name)) throw new Error(`refusing to recreate ${name}: only table_deploy_* databases`);
  u.pathname = "/postgres";
  const c = new pg.Client({ connectionString: u.toString() });
  await c.connect();
  try {
    await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await c.query(`CREATE DATABASE ${name}`);
  } finally {
    await c.end();
  }
}

/** A scratch migrations directory: the real files up to (excluding) `upTo`, plus optional extra files. */
function migrationsDir(upTo: string | null, extra: Record<string, string> = {}): string {
  const d = mkdtempSync(path.join(os.tmpdir(), "table-migrate-lock-"));
  scratch.push(d);
  for (const f of ALL) if (upTo === null || f < upTo) copyFileSync(path.join(REAL, f), path.join(d, f));
  for (const [f, sql] of Object.entries(extra)) writeFileSync(path.join(d, f), sql);
  return d;
}

async function q<T extends pg.QueryResultRow>(url: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query<T>(sql, params)).rows;
  } finally {
    await c.end();
  }
}

const why = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? String(r.reason) : "");
const appliedNames = (url: string) => q<{ name: string }>(url, "SELECT name FROM schema_migrations ORDER BY name").then((r) => r.map((x) => x.name));

beforeEach(async () => {
  await recreate(DB_A);
  await recreate(DB_B);
});
afterAll(() => {
  for (const d of scratch) rmSync(d, { recursive: true, force: true });
});

describe("migrate(): concurrent start-time runs", () => {
  it("two runs at once on the previous release's database: both finish and the newest migration is applied once", async () => {
    for (const url of [DB_A, DB_B]) {
      await migrate(url, migrationsDir(LAST)); // the database as the previous release left it
      const [a, b] = await Promise.allSettled([migrate(url), migrate(url)]);
      expect(a.status, why(a)).toBe("fulfilled");
      expect(b.status, why(b)).toBe("fulfilled");
      const runs = [a, b].map((r) => (r as PromiseFulfilledResult<string[]>).value);
      expect([...runs[0], ...runs[1]]).toEqual([LAST]); // exactly one of them applied it
      expect(await appliedNames(url)).toEqual(ALL);
    }
  });

  it("two runs at once on an empty database: both finish and every migration is applied exactly once", async () => {
    const [a, b] = await Promise.allSettled([migrate(DB_B), migrate(DB_B)]);
    expect(a.status, why(a)).toBe("fulfilled");
    expect(b.status, why(b)).toBe("fulfilled");
    const runs = [a, b].map((r) => (r as PromiseFulfilledResult<string[]>).value);
    expect([...runs[0], ...runs[1]].sort()).toEqual(ALL);
    expect(await appliedNames(DB_B)).toEqual(ALL);
  });

  it("a run that holds the lock makes another wait; the waiter then applies what is still pending", async () => {
    await migrate(DB_A, migrationsDir(LAST));
    const holder = new pg.Client({ connectionString: DB_A });
    await holder.connect();
    try {
      await holder.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
      let settled = false;
      const waiting = migrate(DB_A).finally(() => {
        settled = true;
      });
      await new Promise((r) => setTimeout(r, 800));
      expect(settled).toBe(false);
      expect(await appliedNames(DB_A)).not.toContain(LAST);
      await holder.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
      expect(await waiting).toEqual([LAST]);
    } finally {
      await holder.end();
    }
    expect(await appliedNames(DB_A)).toEqual(ALL);
  });

  it("a failing migration rolls back, reports the file, and leaves the lock free and the schema unchanged", async () => {
    await migrate(DB_A, migrationsDir(LAST));
    const before = await q<{ n: string }>(DB_A, "SELECT count(*)::text AS n FROM information_schema.tables WHERE table_schema='public'");
    const bad = migrationsDir(LAST, { "999_rehearsal_bad.sql": "CREATE TABLE rehearsal_half_done(id int);\nSELECT * FROM no_such_table;" });
    await expect(migrate(DB_A, bad)).rejects.toThrow(/migration 999_rehearsal_bad\.sql failed: relation "no_such_table" does not exist/);
    expect(await appliedNames(DB_A)).toEqual(ALL.filter((f) => f < LAST));
    expect(await q(DB_A, "SELECT to_regclass('rehearsal_half_done') AS t")).toEqual([{ t: null }]);
    expect(await q<{ n: string }>(DB_A, "SELECT count(*)::text AS n FROM information_schema.tables WHERE table_schema='public'")).toEqual(before);
    expect(await q(DB_A, "SELECT pg_try_advisory_lock($1) AS free", [MIGRATION_LOCK_KEY])).toEqual([{ free: true }]);
  });

  it("still refuses a migration file that changed after it was applied", async () => {
    await migrate(DB_B, migrationsDir(LAST));
    const changed = migrationsDir(LAST);
    writeFileSync(path.join(changed, ALL[0]), "-- edited after it was applied\n");
    await expect(migrate(DB_B, changed)).rejects.toThrow(`migration ${ALL[0]} changed after it was applied`);
  });
});

import pg from "pg";
import { databaseUrl } from "../env";

// numeric -> string (exact decimals stay exact); int8 -> number is safe for our counters.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

const globalForPool = globalThis as unknown as { __tablePool?: pg.Pool };

export function pool(): pg.Pool {
  if (!globalForPool.__tablePool) {
    globalForPool.__tablePool = new pg.Pool({ connectionString: databaseUrl(), max: 10 });
  }
  return globalForPool.__tablePool;
}

export type Db = pg.PoolClient;

export async function withClient<T>(fn: (c: Db) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

/** Coherent read: one REPEATABLE READ snapshot for every query inside fn. */
export async function readSnapshot<T>(fn: (c: Db) => Promise<T>): Promise<T> {
  return withClient(async (c) => {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      const r = await fn(c);
      await c.query("COMMIT");
      return r;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    }
  });
}

export async function inTransaction<T>(fn: (c: Db) => Promise<T>): Promise<T> {
  return withClient(async (c) => {
    await c.query("BEGIN");
    try {
      const r = await fn(c);
      await c.query("COMMIT");
      return r;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    }
  });
}

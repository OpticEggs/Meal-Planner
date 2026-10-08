import pg from "pg";
import { randomUUID } from "node:crypto";
import { seedFixture, type Fixture, USERS } from "../fixtures/household";
import type { Actor } from "@/server/commands/framework";

export const url = () => process.env.DATABASE_URL!;

export async function db(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: url() });
  await c.connect();
  return c;
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await db();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export async function fresh(opts?: Parameters<typeof seedFixture>[1]): Promise<{ fx: Fixture; jon: Actor; alex: Actor; other: Actor }> {
  const fx = await seedFixture(url(), opts);
  return {
    fx,
    jon: { memberId: fx.members.jon, householdId: fx.householdId, displayName: USERS.jon.name },
    alex: { memberId: fx.members.alex, householdId: fx.householdId, displayName: USERS.alex.name },
    other: { memberId: fx.members.other, householdId: fx.otherHouseholdId, displayName: USERS.other.name },
  };
}

export const op = () => `op-${randomUUID()}`;

/** Every accepted-plan and active-requirement row, for before/after equality checks. */
export async function protectedState(weekId: string) {
  return {
    week: await q("SELECT accepted_choice_revision, adopted_proposal_id FROM weeks WHERE id=$1", [weekId]),
    assignments: await q("SELECT id, night, kind, cooking_event_id, locked, revision FROM assignments WHERE week_id=$1 ORDER BY night", [weekId]),
    events: await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [weekId]),
    allocations: await q(
      "SELECT a.cooking_event_id, a.member_id, a.kind, a.night, a.component_portions FROM allocations a JOIN cooking_events e ON e.id=a.cooking_event_id WHERE e.week_id=$1 ORDER BY 1,2,3,4",
      [weekId],
    ),
    requirements: await q(
      "SELECT r.ingredient_key, r.line_fingerprint, r.line->'meal' AS meal, r.line->'packagesNeeded' AS packages FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 ORDER BY 1",
      [weekId],
    ),
    orders: await q("SELECT count(*)::int AS n FROM orders"),
    retailerCalls: await q("SELECT count(*)::int AS n FROM fake_retailer_calls"),
  };
}

export async function line(weekId: string, key: string) {
  const r = await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.ingredient_key=$2", [weekId, key]);
  return r[0]?.line;
}

export async function retailerCalls(): Promise<number> {
  return (await q<{ n: number }>("SELECT count(*)::int AS n FROM fake_retailer_calls"))[0].n;
}

/**
 * Deterministic race ordering at the database: hold the household coordination row, start
 * commands in a chosen order, wait until each is genuinely blocked on that lock, then release.
 * PostgreSQL grants the row lock to waiters in arrival order.
 */
export async function holdHousehold(householdId: string) {
  const c = await db();
  await c.query("BEGIN");
  await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
  return {
    async release() {
      await c.query("COMMIT");
      await c.end();
    },
  };
}

export async function waitForLockWaiters(n: number, timeoutMs = 10_000) {
  const start = Date.now();
  for (;;) {
    const r = await q<{ n: number }>(
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE '%FROM households WHERE id=%FOR UPDATE%'",
    );
    if (r[0].n >= n) return;
    if (Date.now() - start > timeoutMs) throw new Error(`expected ${n} lock waiters, saw ${r[0].n}`);
    await new Promise((res) => setTimeout(res, 10));
  }
}

/** Runs two command thunks so that `first` acquires the household lock before `second`. */
export async function race<A, B>(householdId: string, first: () => Promise<A>, second: () => Promise<B>): Promise<[A, B]> {
  const hold = await holdHousehold(householdId);
  const pa = first();
  await waitForLockWaiters(1);
  const pb = second();
  await waitForLockWaiters(2);
  await hold.release();
  return Promise.all([pa, pb]);
}

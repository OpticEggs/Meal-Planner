/**
 * B21 — the database itself keeps at most one effective cooking record per cooking event, across
 * generations and for writers outside Table's command framework (raw SQL, any isolation level).
 * B22 — RecordCooked refuses an event that is no longer scheduled in its accepted plan (replaced,
 * removed or set aside), keeps the accepted week and cooking history, and still accepts a past
 * dinner that remains scheduled. Real PostgreSQL.
 */
import { afterEach, describe, expect, it } from "vitest";
import pg from "pg";
import { db, fresh, op, protectedState, q, race } from "./helpers";
import * as plan from "@/server/commands/plan";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";

type Fx = Awaited<ReturnType<typeof fresh>>["fx"];

const effective = async (eventId: string) =>
  (await q<{ n: number }>("SELECT count(*)::int AS n FROM cook_records_effective WHERE cooking_event_id=$1", [eventId]))[0].n;
const rows = async (eventId: string) =>
  q<{ id: string; generation: number }>("SELECT id, generation FROM cook_records WHERE cooking_event_id=$1 ORDER BY generation, recorded_at, id", [eventId]);

/** A raw INSERT of a cook record for the event, copying the household/recipe/member of an existing one. */
const RAW = (extra = "") =>
  `INSERT INTO cook_records(household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on, generation${extra ? `, ${extra}` : ""})
   SELECT e.household_id, e.id, e.recipe_version_id, m.id, e.cook_night, $2${extra ? ", $3" : ""}
   FROM cooking_events e JOIN members m ON m.household_id=e.household_id WHERE e.id=$1 ORDER BY m.display_name LIMIT 1`;

/** A command's result, a thrown error captured as a value, so a defect fails an assertion, not the runner. */
const cmd = (p: Promise<unknown>): Promise<any> => p.then((r) => r, (e: Error) => ({ status: "threw", code: `threw: ${e.message}`, message: e.message }));

/** Outcome of a statement, an error included, so assertions run on the value (never a thrown runner error). */
const outcome = (p: Promise<unknown>) => p.then(() => "ok", (e: Error) => `refused: ${e.message}`);

async function begin(isolation: "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE") {
  const c = await db();
  await c.query(`BEGIN ISOLATION LEVEL ${isolation}`);
  return c;
}
async function finish(c: pg.Client, commit: boolean) {
  const r = await outcome(c.query(commit ? "COMMIT" : "ROLLBACK"));
  await c.end();
  return r;
}
/** Waits until some other session is blocked on a lock (the second writer is genuinely waiting). */
async function waitForBlocked() {
  for (let i = 0; i < 500; i++) {
    const r = await q<{ n: number }>("SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE 'INSERT INTO cook_records%'");
    if (r[0].n > 0) return;
    await new Promise((res) => setTimeout(res, 10));
  }
  throw new Error("the second writer never blocked");
}

describe("B21: one effective cooking record per event, enforced by the database", () => {
  it("a direct insert of a second effective record under a different generation is refused", async () => {
    const { fx, jon } = await fresh();
    expect((await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }))).status).toBe("accepted");
    const r = await outcome(q(RAW(), [fx.events.salmon, 2]));
    expect(r).toMatch(/^refused/);
    expect(await effective(fx.events.salmon)).toBe(1);
    expect(await rows(fx.events.salmon)).toHaveLength(1);
  });

  for (const isolation of ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"] as const) {
    it(`two writers outside the command framework, concurrently, different generations (${isolation}): at most one commits`, async () => {
      const { fx } = await fresh();
      const a = await begin(isolation);
      const b = await begin(isolation);
      expect(await outcome(a.query(RAW(), [fx.events.salmon, 1]))).toBe("ok");
      const bInsert = outcome(b.query(RAW(), [fx.events.salmon, 2])); // must not slip past A's uncommitted record
      await waitForBlocked().catch(() => undefined); // a design may refuse at commit instead of blocking
      const aCommit = await finish(a, true);
      const bResult = await bInsert;
      const bCommit = await finish(b, bResult === "ok");
      expect(aCommit).toBe("ok");
      expect([bResult, bCommit].some((x) => x.startsWith("refused"))).toBe(true);
      expect(await effective(fx.events.salmon)).toBe(1);
    });
  }

  it("a correction followed by legitimate re-recording still succeeds, and only the new record is effective", async () => {
    const { fx, jon, alex } = await fresh();
    await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    const [first] = await rows(fx.events.salmon);
    expect((await cmd(plan.correctCookRecordCommand(alex, op(), { cookRecordId: first.id, reason: "not_cooked" }))).status).toBe("accepted");
    const again = await cmd(plan.recordCookedCommand(alex, op(), { eventId: fx.events.salmon }));
    expect(again.status, JSON.stringify(again)).toBe("accepted");
    expect(await effective(fx.events.salmon)).toBe(1);
    // and once more after correcting the second: a third generation
    const [, second] = await rows(fx.events.salmon);
    expect((await cmd(plan.correctCookRecordCommand(jon, op(), { cookRecordId: second.id, reason: "not_cooked" }))).status).toBe("accepted");
    expect((await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }))).status).toBe("accepted");
    expect((await rows(fx.events.salmon)).map((r) => r.generation)).toEqual([1, 2, 3]);
    expect(await effective(fx.events.salmon)).toBe(1);
  });

  it("a direct re-record names the corrected record it replaces; naming an uncorrected one, or a second successor, is refused", async () => {
    const { fx, jon, alex } = await fresh();
    await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    const [first] = await rows(fx.events.salmon);
    // the record is not corrected: a successor is refused (checked when the transaction commits)
    expect(await outcome(q(RAW("replaces"), [fx.events.salmon, 2, first.id]))).toMatch(/^refused/);
    await cmd(plan.correctCookRecordCommand(alex, op(), { cookRecordId: first.id, reason: "not_cooked" }));
    // a new first record for the event is refused even now: a re-record must say what it replaces
    expect(await outcome(q(RAW(), [fx.events.salmon, 2]))).toMatch(/^refused/);
    expect(await outcome(q(RAW("replaces"), [fx.events.salmon, 2, first.id]))).toBe("ok");
    expect(await outcome(q(RAW("replaces"), [fx.events.salmon, 3, first.id]))).toMatch(/^refused/); // one successor per record
    expect(await effective(fx.events.salmon)).toBe(1);
  });

  it("two writers re-record the same corrected record concurrently: one succeeds", async () => {
    const { fx, jon, alex } = await fresh();
    await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    const [first] = await rows(fx.events.salmon);
    await cmd(plan.correctCookRecordCommand(alex, op(), { cookRecordId: first.id, reason: "not_cooked" }));
    const a = await begin("READ COMMITTED");
    const b = await begin("READ COMMITTED");
    expect(await outcome(a.query(RAW("replaces"), [fx.events.salmon, 2, first.id]))).toBe("ok");
    const bInsert = outcome(b.query(RAW("replaces"), [fx.events.salmon, 2, first.id]));
    await waitForBlocked();
    expect(await finish(a, true)).toBe("ok");
    const bResult = await bInsert;
    await finish(b, bResult === "ok");
    expect(bResult).toMatch(/^refused/);
    expect(await effective(fx.events.salmon)).toBe(1);
  });

  it("a re-record racing an uncommitted correction is refused; after the correction commits it is accepted", async () => {
    const { fx, jon } = await fresh();
    await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    const [first] = await rows(fx.events.salmon);
    const corr = await begin("READ COMMITTED");
    await corr.query(
      "INSERT INTO cook_record_corrections(household_id, cook_record_id, reason, corrected_by) SELECT household_id, id, 'not_cooked', recorded_by FROM cook_records WHERE id=$1",
      [first.id],
    );
    expect(await outcome(q(RAW("replaces"), [fx.events.salmon, 2, first.id]))).toMatch(/^refused/); // correction not committed yet
    expect(await finish(corr, true)).toBe("ok");
    expect(await outcome(q(RAW("replaces"), [fx.events.salmon, 2, first.id]))).toBe("ok");
    expect(await effective(fx.events.salmon)).toBe(1);
  });

  it("corrections and records stay append-only", async () => {
    const { fx, jon } = await fresh();
    await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    expect(await outcome(q("UPDATE cook_records SET generation=5 WHERE cooking_event_id=$1", [fx.events.salmon]))).toMatch(/^refused/);
    expect(await outcome(q("DELETE FROM cook_records WHERE cooking_event_id=$1", [fx.events.salmon]))).toMatch(/^refused/);
  });

  it("export and restore keep a corrected chain and a historical duplicate, in the worst row order", async () => {
    const { fx, jon, alex } = await fresh();
    await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    const [first] = await rows(fx.events.salmon);
    await q(
      "INSERT INTO cook_records(household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on, generation, duplicate_of) SELECT household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on, 1, id FROM cook_records WHERE id=$1",
      [first.id],
    );
    await cmd(plan.correctCookRecordCommand(alex, op(), { cookRecordId: first.id, reason: "not_cooked" }));
    await cmd(plan.recordCookedCommand(alex, op(), { eventId: fx.events.salmon }));
    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    expect(data.tables.cook_records).toHaveLength(3);
    data.tables.cook_records.reverse(); // the successor and the duplicate before the record they point at
    data.tables.cook_record_corrections.reverse();
    const restoreUrl = "postgres://table@127.0.0.1:54329/table_restore_check";
    await migrate(restoreUrl);
    const dst = new pg.Client({ connectionString: restoreUrl });
    await dst.connect();
    try {
      const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      const restored = await restoreHousehold(dst, JSON.parse(JSON.stringify(data))).then((c) => c, (e: Error) => `threw: ${e.message}`);
      expect(restored).toMatchObject({ cook_records: 3, cook_record_corrections: 1 });
      const eff = (await dst.query("SELECT generation FROM cook_records_effective WHERE cooking_event_id=$1", [fx.events.salmon])).rows;
      expect(eff).toEqual([{ generation: 2 }]);
    } finally {
      await dst.end();
    }
  });
});

describe("B22: cooking is recorded only for a dinner still scheduled in its accepted plan", () => {
  const fixedNow = process.env.TABLE_FIXED_NOW;
  afterEach(() => {
    process.env.TABLE_FIXED_NOW = fixedNow;
  });

  async function preview(actor: any, fx: Fx, operation: unknown) {
    const p = await plan.createPreviewCommand(actor, op(), { weekId: fx.weekId, operation: operation as any });
    if (p.status !== "accepted") throw new Error(JSON.stringify(p));
    return { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) };
  }
  const status = async (eventId: string) => (await q<{ status: string }>("SELECT status FROM cooking_events WHERE id=$1", [eventId]))[0].status;
  const cookRows = async () => (await q<{ n: number }>("SELECT count(*)::int AS n FROM cook_records"))[0].n;

  const CHANGES = {
    "replaced (Friday gets another recipe)": (fx: Fx) => ({ type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId }),
    "set aside as a backup (deferred)": (fx: Fx) => ({ type: "backup", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId }),
    "removed (Friday set to out)": (fx: Fx) => ({ type: "set_kind", assignmentId: fx.assignments.fri, kind: "out" }),
  } as const;

  for (const [label, change] of Object.entries(CHANGES)) {
    it(`an event no longer scheduled — ${label} — is refused as stale; the week and history are unchanged and the event is not restored`, async () => {
      const { fx, jon, alex } = await fresh();
      const pv = await preview(jon, fx, change(fx));
      expect((await cmd(plan.applyPlanChangeCommand(jon, op(), pv))).status).toBe("accepted");
      const before = await protectedState(fx.weekId);
      const eventStatus = await status(fx.events.salmon);
      expect(eventStatus).not.toBe("scheduled");
      const r: any = await cmd(plan.recordCookedCommand(alex, op(), { eventId: fx.events.salmon }));
      expect(r.status === "rejected" && r.code).toBe("stale_event");
      expect(r.message).toMatch(/no longer|not on/i);
      expect(await cookRows()).toBe(0);
      expect(await protectedState(fx.weekId)).toEqual(before);
      expect(await status(fx.events.salmon)).toBe(eventStatus);
    });
  }

  it("a dinner moved to another night is still scheduled and can be recorded", async () => {
    const { fx, jon } = await fresh();
    const pv = await preview(jon, fx, { type: "move", assignmentId: fx.assignments.fri, toNight: "2026-10-13" });
    const moved = await cmd(plan.applyPlanChangeCommand(jon, op(), pv));
    expect(moved.status, JSON.stringify(moved)).toBe("accepted");
    expect((await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }))).status).toBe("accepted");
  });

  it("a past dinner still scheduled in its accepted week can be recorded retrospectively, on its own date", async () => {
    const { fx, jon } = await fresh();
    process.env.TABLE_FIXED_NOW = "2026-10-24T19:00:00Z"; // the next week; Friday 16 October is in the past
    const r = await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect((await q<{ cooked_on: string }>("SELECT cooked_on::text FROM cook_records WHERE cooking_event_id=$1", [fx.events.salmon]))[0].cooked_on).toBe("2026-10-16");
  });

  for (const order of ["replacement first", "recording first"] as const) {
    it(`replacement and recording at the same moment — ${order}`, async () => {
      const { fx, jon, alex } = await fresh();
      const pv = await preview(jon, fx, CHANGES["replaced (Friday gets another recipe)"](fx));
      const replace = () => cmd(plan.applyPlanChangeCommand(jon, op(), pv));
      const record = () => cmd(plan.recordCookedCommand(alex, op(), { eventId: fx.events.salmon }));
      if (order === "replacement first") {
        const [rep, rec]: any[] = await race(fx.householdId, replace, record);
        expect(rep.status).toBe("accepted");
        expect(rec.status === "rejected" && rec.code).toBe("stale_event");
        expect(await cookRows()).toBe(0);
      } else {
        const [rec, rep]: any[] = await race(fx.householdId, record, replace);
        expect(rec.status).toBe("accepted");
        expect(rep.status, JSON.stringify(rep)).toBe("accepted");
        // the cooking happened: its record stays in history; the replaced event stays retired
        expect(await cookRows()).toBe(1);
        expect(await effective(fx.events.salmon)).toBe(1);
      }
      expect(await status(fx.events.salmon)).toBe("retired");
      const again: any = await cmd(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
      expect(again.status === "rejected" && again.code).toBe("stale_event");
    });
  }
});

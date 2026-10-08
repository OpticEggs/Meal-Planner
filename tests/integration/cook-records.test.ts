/**
 * Cook-record idempotency (delivery review of fb4d771, gate 2): one cooking event has at most one
 * effective "cooked" record. Repeated presses, retries and both members at once never add another;
 * the existing record is reported instead. A mistaken record is corrected by an appended
 * correction (nothing is deleted), after which cooking can be recorded again. Real PostgreSQL.
 */
import { describe, expect, it } from "vitest";
import pg from "pg";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";
import { fresh, op, q, race } from "./helpers";
import * as plan from "@/server/commands/plan";
import * as snapshot from "@/server/queries/snapshot";
import * as library from "@/server/queries/library";

const records = async (eventId: string) =>
  q<{ id: string; recorded_by: string }>("SELECT id, recorded_by FROM cook_records WHERE cooking_event_id=$1 ORDER BY recorded_at, id", [eventId]);
/** A command's result with a thrown error captured as a value: since migration 009 the database itself
 *  refuses a second effective record, so a command defect surfaces as an error the assertion must see. */
const outcomeOf = (p: Promise<unknown>): Promise<any> => p.then((r) => r, (e: Error) => ({ status: "threw", code: `threw: ${e.message}`, message: e.message }));
const cmd = (name: string) => (plan as any)[name] as ((a: unknown, o: string, p: unknown) => Promise<any>) | undefined;

describe("cook-record idempotency: one effective record per cooking event", () => {
  it("a second press by the same member (a new operation id) adds nothing and reports who recorded it and when", async () => {
    const { fx, jon } = await fresh();
    const first = await plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon });
    expect(first.status).toBe("accepted");
    const second = await outcomeOf(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    expect(second.status === "rejected" && second.code).toBe("already_recorded");
    expect((second as any).message).toMatch(/Jon/);
    expect(await records(fx.events.salmon)).toHaveLength(1);
  });

  it("replaying the same operation id returns the original receipt and adds nothing", async () => {
    const { fx, jon } = await fresh();
    const id = op();
    const a = await plan.recordCookedCommand(jon, id, { eventId: fx.events.salmon });
    const b = await plan.recordCookedCommand(jon, id, { eventId: fx.events.salmon });
    expect([a.status, b.status]).toEqual(["accepted", "accepted"]);
    expect(await records(fx.events.salmon)).toHaveLength(1);
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`both members press at the same moment: exactly one record, the other is told it is already recorded — ${order}`, async () => {
      const { fx, jon, alex } = await fresh();
      const j = () => outcomeOf(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
      const a = () => outcomeOf(plan.recordCookedCommand(alex, op(), { eventId: fx.events.salmon }));
      const [x, y] = order === "Jon first" ? await race(fx.householdId, j, a) : await race(fx.householdId, a, j);
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("already_recorded");
      const rows = await records(fx.events.salmon);
      expect(rows).toHaveLength(1);
      expect(rows[0].recorded_by).toBe(order === "Jon first" ? fx.members.jon : fx.members.alex);
    });
  }

  it("the household snapshot shows the night as already cooked, by whom", async () => {
    const { fx, jon, alex } = await fresh();
    await plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon });
    const s: any = await snapshot.householdSnapshot(alex);
    const fri = s.week.nights.find((n: any) => n.event?.id === fx.events.salmon && n.kind === "cook");
    expect(fri.event.cooked).toMatchObject({ by: "Jon" });
    expect(typeof fri.event.cooked.recordId).toBe("string");
    const tue = s.week.nights.find((n: any) => n.event?.id === fx.events.stirfry && n.kind === "cook");
    expect(tue.event.cooked).toBeNull();
  });

  it("a mistaken record is corrected by an appended correction; history and 'new to you' ignore it; cooking can then be recorded again", async () => {
    const { fx, jon, alex } = await fresh();
    const correct = cmd("correctCookRecordCommand");
    expect(typeof correct, "a correction command must exist").toBe("function");
    await plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon });
    const [rec] = await records(fx.events.salmon);
    const cooked = (library as any).effectiveCookedRecipeIds as (householdId: string) => Promise<Set<string>>;
    expect((await cooked(fx.householdId)).has(fx.recipes.salmon.recipeId)).toBe(true);

    const r = await correct!(alex, op(), { cookRecordId: rec.id, reason: "not_cooked" });
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect(await records(fx.events.salmon)).toHaveLength(1); // nothing deleted
    expect((await q("SELECT count(*)::int n FROM cook_record_corrections WHERE cook_record_id=$1", [rec.id]))[0]).toEqual({ n: 1 });
    expect((await cooked(fx.householdId)).has(fx.recipes.salmon.recipeId)).toBe(false); // "new to you" again
    const lib: any = await library.librarySnapshot(jon);
    expect(lib.recipes.find((x: any) => x.recipeId === fx.recipes.salmon.recipeId).cooked).toEqual([]);
    const s: any = await snapshot.householdSnapshot(jon);
    expect(s.week.nights.find((n: any) => n.event?.id === fx.events.salmon && n.kind === "cook").event.cooked).toBeNull();

    const again = await outcomeOf(plan.recordCookedCommand(alex, op(), { eventId: fx.events.salmon }));
    expect(again.status).toBe("accepted");
    expect(await records(fx.events.salmon)).toHaveLength(2);
    const lib2: any = await library.librarySnapshot(jon);
    expect(lib2.recipes.find((x: any) => x.recipeId === fx.recipes.salmon.recipeId).cooked).toEqual([expect.objectContaining({ by: "Alex" })]);
    const third = await outcomeOf(plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon }));
    expect(third.status === "rejected" && third.code).toBe("already_recorded");
  });

  it("a correction is refused for a record already corrected, another household's record, or an unknown reason — and writes nothing", async () => {
    const { fx, jon, alex, other } = await fresh();
    const correct = cmd("correctCookRecordCommand");
    expect(typeof correct).toBe("function");
    await plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon });
    const [rec] = await records(fx.events.salmon);
    // Capture each outcome (a thrown error included), then assert on it.
    const outcome = async (actor: unknown, p: unknown) => {
      try {
        const r = await correct!(actor, op(), p);
        return r.status === "accepted" ? "accepted" : r.code;
      } catch (e) {
        return `threw: ${(e as Error).message}`;
      }
    };
    expect(await outcome(other, { cookRecordId: rec.id, reason: "not_cooked" })).toBe("not_found");
    expect(await outcome(jon, { cookRecordId: rec.id, reason: "burnt" })).toBe("invalid");
    expect(await outcome(jon, { cookRecordId: rec.id, reason: "not_cooked" })).toBe("accepted");
    expect(await outcome(alex, { cookRecordId: rec.id, reason: "not_cooked" })).toBe("stale");
    expect((await q("SELECT count(*)::int n FROM cook_record_corrections"))[0]).toEqual({ n: 1 });
  });

  it("the database refuses a second effective record for one event even if a command were bypassed", async () => {
    const { fx, jon } = await fresh();
    await plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon });
    const insert = q(
      "INSERT INTO cook_records(household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on) SELECT household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on FROM cook_records WHERE cooking_event_id=$1",
      [fx.events.salmon],
    ).then(() => "inserted", (e: Error) => e.message);
    expect(await insert).toMatch(/duplicate key|unique/i);
    expect(await records(fx.events.salmon)).toHaveLength(1);
  });

  it("export and restore keep corrections and pre-existing duplicates, in any row order", async () => {
    const { fx, jon, alex } = await fresh();
    await plan.recordCookedCommand(jon, op(), { eventId: fx.events.salmon });
    const [rec] = await records(fx.events.salmon);
    // A duplicate as an older database could hold it (marked by migration 008), and a corrected record.
    await q(
      "INSERT INTO cook_records(household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on, duplicate_of) SELECT household_id, cooking_event_id, recipe_version_id, recorded_by, cooked_on, id FROM cook_records WHERE id=$1",
      [rec.id],
    );
    await plan.recordCookedCommand(alex, op(), { eventId: fx.events.stirfry });
    const [stir] = await records(fx.events.stirfry);
    expect((await (plan as any).correctCookRecordCommand(alex, op(), { cookRecordId: stir.id, reason: "not_cooked" })).status).toBe("accepted");

    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    expect(data.tables.cook_records).toHaveLength(3);
    expect(data.tables.cook_record_corrections).toHaveLength(1);
    // Worst case for the restore: the duplicate comes before the record it points to.
    data.tables.cook_records.sort((a: any, b: any) => (a.duplicate_of ? -1 : 0) - (b.duplicate_of ? -1 : 0));
    expect(data.tables.cook_records[0].duplicate_of).toBe(rec.id);

    const restoreUrl = "postgres://table@127.0.0.1:54329/table_restore_check";
    await migrate(restoreUrl);
    const dst = new pg.Client({ connectionString: restoreUrl });
    await dst.connect();
    try {
      const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      const restored = await restoreHousehold(dst, JSON.parse(JSON.stringify(data))).then((c) => c, (e: Error) => `threw: ${e.message}`);
      expect(restored).toMatchObject({ cook_records: 3, cook_record_corrections: 1 });
      const eff = (await dst.query("SELECT cooking_event_id FROM cook_records_effective ORDER BY 1")).rows.map((r) => r.cooking_event_id);
      expect(eff).toEqual([fx.events.salmon]); // the duplicate and the corrected record are not effective
    } finally {
      await dst.end();
    }
  });
});

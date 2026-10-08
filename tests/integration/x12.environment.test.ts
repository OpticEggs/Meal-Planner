/**
 * X12 export/restore, secrets and environment separation; X01 at the query layer.
 */
import { afterEach, describe, expect, it } from "vitest";
import pg from "pg";
import { fresh, op, q, retailerCalls } from "./helpers";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";
import { nowInstant } from "@/server/env";
import { retailer, waitForBarrier } from "@/server/integrations/retailer";
import { startHandoff } from "@/server/commands/purchasing";
import { approvePurchaseLinesCommand } from "@/server/commands/groceries";
import { seedFixture } from "../fixtures/household";

const saved = { ...process.env };
afterEach(() => {
  for (const k of ["TABLE_ENV", "TABLE_RETAILER", "TABLE_FIXED_NOW", "KROGER_CLIENT_ID", "KROGER_CLIENT_SECRET", "KROGER_REDIRECT_URI", "KROGER_LOCATION_ID"]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("X12 test helpers are blocked outside the test environment", () => {
  it("refuses a fixed clock, fixture seeding and test barriers in production", async () => {
    process.env.TABLE_ENV = "production";
    process.env.TABLE_FIXED_NOW = "2026-10-12T19:00:00Z";
    expect(() => nowInstant()).toThrow(/test-only/);
    await expect(seedFixture(process.env.DATABASE_URL!)).rejects.toThrow(/TABLE_ENV=test/);
    await expect(seedFixture("postgres://table@127.0.0.1:54329/table_dev")).rejects.toThrow(/non-test database/);
    // A held barrier is ignored in production (returns immediately instead of waiting).
    const t = Date.now();
    await waitForBarrier("never-released", 5_000);
    expect(Date.now() - t).toBeLessThan(500);
  });
});

describe("X12 incomplete real retailer configuration never reports mock success as live", () => {
  it("Kroger mode without configuration (or without verified authorization) refuses handoff with zero calls", async () => {
    const { fx, alex } = await fresh();
    const lines = (await q<{ line: any }>("SELECT line FROM requirement_lines")).map((r) => r.line).filter((l) => l.toSend > 0 && l.product && l.price);
    await approvePurchaseLinesCommand(alex, op(), { weekId: fx.weekId, lines: lines.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
    const s = (await q<{ projection_summary: any }>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].projection_summary;
    process.env.TABLE_RETAILER = "kroger";
    expect(retailer().mode).toBe("kroger");
    expect(retailer().status().ready).toBe(false);
    expect(retailer().status().reason).toMatch(/not configured/);
    let r = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
    expect(r.status === "rejected" && r.code).toBe("retailer_not_ready");
    // Even with every credential variable present, live transfer stays disabled until verified.
    Object.assign(process.env, { KROGER_CLIENT_ID: "x", KROGER_CLIENT_SECRET: "y", KROGER_REDIRECT_URI: "http://localhost/cb", KROGER_LOCATION_ID: "1" });
    expect(retailer().status().reason).toMatch(/not verified or authorized/);
    r = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
    expect(r.status === "rejected" && r.code).toBe("retailer_not_ready");
    expect(await retailerCalls()).toBe(0);
    expect((await q("SELECT 1 FROM handoff_batches")).length).toBe(0);
  });
});

describe("X12 export omits secrets and round-trips into an isolated database", () => {
  it("exports household data without credentials and restores it faithfully", async () => {
    const { fx } = await fresh();
    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    const text = JSON.stringify(data);
    for (const forbidden of ["password", "fixture-jon-password", "accessToken", "refreshToken", "BETTER_AUTH_SECRET", "\"token\"", "user_id"]) {
      expect(text.includes(forbidden), forbidden).toBe(false);
    }
    expect(Object.keys(data.tables)).not.toContain("session");
    expect(text).not.toContain(fx.otherHouseholdId); // only this household
    expect(data.tables.recipe_versions.length).toBe(8);
    expect(data.tables.assignments.length).toBe(7);

    const restoreUrl = "postgres://table@127.0.0.1:54329/table_restore_check";
    await migrate(restoreUrl);
    const dst = new pg.Client({ connectionString: restoreUrl });
    await dst.connect();
    const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
    await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
    const counts = await restoreHousehold(dst, JSON.parse(text));
    expect(counts.recipe_versions).toBe(8);
    const again = await exportHousehold(dst, fx.householdId);
    await dst.end();
    // Everything round-trips except the export timestamp.
    expect(JSON.parse(JSON.stringify(again.tables))).toEqual(JSON.parse(JSON.stringify(data.tables)));
  });
});

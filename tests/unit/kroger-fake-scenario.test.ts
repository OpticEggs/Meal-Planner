/**
 * The file-scripted Kroger fake used by the browser tests is test-only: production refuses its
 * switches, it answers only with the fake transport switch in the test environment, and its log holds
 * method and path only (never headers).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configProblems } from "@/server/deploy";
import { krogerFake, transportFor } from "@/server/integrations/kroger/transport";
import { saveEnv } from "../fixtures/kroger/env";

const SCENARIO = path.resolve(__dirname, "../fixtures/kroger/scenario-e2e.json");
let restore: () => void;
let dir: string;
beforeEach(() => {
  restore = saveEnv();
  dir = mkdtempSync(path.join(tmpdir(), "kroger-scenario-"));
});
afterEach(() => {
  restore();
  delete process.env.TABLE_KROGER_FAKE_SCENARIO;
  delete process.env.TABLE_KROGER_FAKE_LOG;
  rmSync(dir, { recursive: true, force: true });
});

describe("file-scripted Kroger fake (browser tests only)", () => {
  it("KF-01: production refuses the scenario and log switches", () => {
    const base = { TABLE_ENV: "production", DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "s".repeat(40), BETTER_AUTH_URL: "https://table.example.com" };
    expect(configProblems({ ...base, TABLE_KROGER_FAKE_SCENARIO: SCENARIO })).toContain("TABLE_KROGER_FAKE_SCENARIO_set_in_production");
    expect(configProblems({ ...base, TABLE_KROGER_FAKE_LOG: "/tmp/x" })).toContain("TABLE_KROGER_FAKE_LOG_set_in_production");
  });

  it("KF-02: with the test switch, it answers product reads from the file, 404s anything else, and logs method and path only", async () => {
    process.env.TABLE_KROGER_FAKE_TRANSPORT = "1";
    process.env.TABLE_KROGER_FAKE_SCENARIO = SCENARIO;
    process.env.TABLE_KROGER_FAKE_LOG = path.join(dir, "log.jsonl");
    krogerFake.reset(null);
    const t = transportFor();
    const r = await t.request("GET", "https://api.kroger.com/v1/products?filter.term=rice&filter.locationId=TEST0001", { Authorization: "Bearer secret-looking" }, null, 1000);
    expect(JSON.parse(r.bodyText).data.map((p: any) => p.productId)).toEqual(["0003000000001", "0003000000002", "0003000000005"]);
    expect((await t.request("PUT", "https://api.kroger.com/v1/cart/add", {}, "{}", 1000)).status).toBe(404);
    const log = readFileSync(path.join(dir, "log.jsonl"), "utf8");
    expect(log).not.toMatch(/Bearer|secret-looking|Authorization/);
    expect(log.trim().split("\n").map((l) => JSON.parse(l).path)).toEqual(["/v1/products", "/v1/cart/add"]);
  });

  it("KF-03: outside the test environment the fake switch is refused", () => {
    process.env.TABLE_ENV = "production";
    process.env.TABLE_KROGER_FAKE_TRANSPORT = "1";
    process.env.TABLE_KROGER_FAKE_SCENARIO = SCENARIO;
    expect(() => transportFor()).toThrow(/test-only/);
  });
});

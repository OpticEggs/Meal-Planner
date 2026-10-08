/**
 * B9: the production configuration check and the health route a host uses to refuse a misconfigured
 * or unmigrated release. Real PostgreSQL (the test database is fully migrated).
 */
import { describe, expect, it } from "vitest";
import { configProblems } from "@/server/deploy";
import { GET } from "@/app/api/health/route";

const good = {
  TABLE_ENV: "production", DATABASE_URL: "postgres://u@db.internal/table", BETTER_AUTH_SECRET: "x".repeat(48),
  BETTER_AUTH_URL: "https://table.example.onrender.com", TABLE_RETAILER: "simulated",
};

describe("B9 production configuration", () => {
  it("a complete production configuration has no problems; development and test are not judged by it", () => {
    expect(configProblems(good)).toEqual([]);
    expect(configProblems({ TABLE_ENV: "test", TABLE_FIXED_NOW: "2026-01-01T00:00:00Z" })).toEqual([]);
  });
  it("refuses missing or weak secrets, a non-HTTPS or path-bearing auth URL, and every test convenience", () => {
    expect(configProblems({ ...good, BETTER_AUTH_SECRET: "replace-me-please-with-something-long-enough" })).toContain("BETTER_AUTH_SECRET_weak_or_missing");
    expect(configProblems({ ...good, BETTER_AUTH_SECRET: "short" })).toContain("BETTER_AUTH_SECRET_weak_or_missing");
    expect(configProblems({ ...good, BETTER_AUTH_URL: undefined })).toContain("BETTER_AUTH_URL_missing");
    expect(configProblems({ ...good, BETTER_AUTH_URL: "http://table.example.com" })).toContain("BETTER_AUTH_URL_not_https");
    expect(configProblems({ ...good, BETTER_AUTH_URL: "https://table.example.com/app" })).toContain("BETTER_AUTH_URL_not_an_origin");
    expect(configProblems({ ...good, DATABASE_URL: undefined })).toContain("DATABASE_URL_missing");
    for (const k of ["TABLE_FIXED_NOW", "TABLE_DISPATCH_TIMEOUT_MS", "TABLE_FDC_FIXTURES", "TABLE_KROGER_FAKE_TRANSPORT"]) {
      expect(configProblems({ ...good, [k]: "1" })).toContain(`${k}_set_in_production`);
    }
    expect(configProblems({ ...good, TABLE_RETAILER: "kroger-live" })).toContain("TABLE_RETAILER_invalid");
    // Problems are codes: no configured value is ever echoed.
    expect(JSON.stringify(configProblems({ ...good, BETTER_AUTH_SECRET: "short-secret-value" }))).not.toContain("short-secret-value");
  });
});

describe("B9 health route", () => {
  it("reports ready when the database answers and every migration on disk is applied (test environment)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, problems: [] });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

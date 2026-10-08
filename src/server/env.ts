// Environment validation. Fails closed: production refuses test conveniences
// and refuses to call a retailer it cannot honestly identify.

export type TableEnv = "development" | "test" | "production";

export function tableEnv(): TableEnv {
  const v = process.env.TABLE_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
  if (v !== "development" && v !== "test" && v !== "production") {
    throw new Error(`TABLE_ENV must be development, test or production (got ${v})`);
  }
  return v;
}

export function isTestEnv(): boolean {
  return tableEnv() === "test";
}

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function authSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s || s.length < 32 || s.startsWith("replace-me")) {
    if (tableEnv() === "production") throw new Error("BETTER_AUTH_SECRET must be set to 32+ random characters in production");
    return "table-local-development-secret-not-for-production-use-0000";
  }
  return s;
}

export type RetailerMode = "simulated" | "kroger";

export function retailerMode(): RetailerMode {
  const v = process.env.TABLE_RETAILER ?? "simulated";
  if (v !== "simulated" && v !== "kroger") throw new Error(`TABLE_RETAILER must be simulated or kroger (got ${v})`);
  return v;
}

/** Household clock. A fixed clock is honored only in the test environment. */
export function nowInstant(): Date {
  const fixed = process.env.TABLE_FIXED_NOW;
  if (fixed) {
    if (!isTestEnv()) throw new Error("TABLE_FIXED_NOW is a test-only setting and is refused outside TABLE_ENV=test");
    return new Date(fixed);
  }
  return new Date();
}

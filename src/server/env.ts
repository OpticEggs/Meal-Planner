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

/**
 * Upper bound on one retailer dispatch (B9). A dispatch with no answer within it is recorded as
 * uncertain; recovery treats a dispatch as interrupted only after `dispatchRecoveryAfterMs()`, which
 * is longer, so a process starting while another is still sending never marks that send uncertain.
 * A shorter bound is honored only in the test environment.
 */
export function dispatchTimeoutMs(): number {
  const v = process.env.TABLE_DISPATCH_TIMEOUT_MS;
  if (v) {
    if (!isTestEnv()) throw new Error("TABLE_DISPATCH_TIMEOUT_MS is a test-only setting and is refused outside TABLE_ENV=test");
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new Error("TABLE_DISPATCH_TIMEOUT_MS must be a positive whole number of milliseconds");
    return n;
  }
  return 90_000;
}
/** Recovery treats a send as interrupted only after the dispatch bound plus a margin for recording
 *  its outcome (default 90 s + 60 s). */
export function dispatchRecoveryAfterMs(): number {
  const t = dispatchTimeoutMs();
  return t + Math.min(60_000, t);
}
/** How often a running server sweeps for interrupted sends (default every 30 s). */
export function recoverySweepIntervalMs(): number {
  return Math.min(30_000, Math.max(250, Math.floor(dispatchRecoveryAfterMs() / 2)));
}

// ---------------------------------------------------------------------------------------------
// Kroger (B5). Server-side configuration and staged activation. Every value is read from the
// server environment only; nothing here is ever sent to a client bundle.

export type KrogerCapability = "connect" | "products" | "cart";
export const KROGER_CAPABILITIES: readonly KrogerCapability[] = ["connect", "products", "cart"];

/** Raw Kroger settings. Empty strings count as absent. */
export function krogerEnv() {
  const v = (k: string) => {
    const x = process.env[k];
    return x && x.trim() ? x.trim() : null;
  };
  return {
    clientId: v("KROGER_CLIENT_ID"),
    clientSecret: v("KROGER_CLIENT_SECRET"),
    redirectUri: v("KROGER_REDIRECT_URI"),
    locationId: v("KROGER_LOCATION_ID"),
    tokenKey: v("TABLE_TOKEN_KEY"),
    // Scope names are assigned to an app at registration and conflict across Kroger's public
    // pages, so they are owner-supplied and have NO default.
    customerScopes: v("KROGER_CUSTOMER_SCOPES"),
    productScopes: v("KROGER_PRODUCT_SCOPES"),
    locationScopes: v("KROGER_LOCATION_SCOPES"),
  };
}

/**
 * Staged activation: KROGER_ACTIVATE is a comma list of connect, products, cart (absent = none).
 * An unknown name is a configuration error (fail loudly, never guess). Production refuses any
 * activation unless TABLE_RETAILER=kroger.
 */
export function krogerActivation(): Set<KrogerCapability> {
  const raw = process.env.KROGER_ACTIVATE ?? "";
  const names = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const out = new Set<KrogerCapability>();
  for (const n of names) {
    if (!(KROGER_CAPABILITIES as readonly string[]).includes(n)) {
      throw new Error(`KROGER_ACTIVATE accepts only connect, products, cart (got ${n})`);
    }
    out.add(n as KrogerCapability);
  }
  if (out.size && tableEnv() === "production" && retailerMode() !== "kroger") {
    throw new Error("KROGER_ACTIVATE is refused in production unless TABLE_RETAILER=kroger");
  }
  return out;
}

/** Test-only: TABLE_KROGER_FAKE_TRANSPORT routes Kroger HTTP to the in-process recording fake.
 *  Refused (throws) outside TABLE_ENV=test. */
export function krogerFakeTransportEnabled(): boolean {
  const v = process.env.TABLE_KROGER_FAKE_TRANSPORT;
  if (!v) return false;
  if (!isTestEnv()) throw new Error("TABLE_KROGER_FAKE_TRANSPORT is a test-only setting and is refused outside TABLE_ENV=test");
  return v === "1" || v === "true";
}

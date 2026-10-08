/**
 * TEST-ONLY Kroger configuration. Every value is an obvious placeholder: no real client id,
 * secret, token, store or account. The token key is generated per process.
 */
import { randomBytes } from "node:crypto";
import { vi } from "vitest";

export const FAKE = {
  clientId: "fake-client-id-b5",
  clientSecret: "fake-client-secret-b5-NOT-REAL",
  redirectUri: "http://127.0.0.1:3600/api/kroger/callback",
  locationId: "TEST0001",
  customerScopes: "fake.cart:test fake.profile:test",
  productScopes: "fake.product:test",
  locationScopes: "fake.location:test",
  tokenKey: randomBytes(32).toString("base64"),
};

export const KROGER_ENV_KEYS = [
  "TABLE_ENV", "TABLE_RETAILER", "KROGER_ACTIVATE", "TABLE_KROGER_FAKE_TRANSPORT", "TABLE_TOKEN_KEY", "KROGER_CLIENT_ID", "KROGER_CLIENT_SECRET",
  "KROGER_REDIRECT_URI", "KROGER_LOCATION_ID", "KROGER_CUSTOMER_SCOPES", "KROGER_PRODUCT_SCOPES", "KROGER_LOCATION_SCOPES", "TABLE_LOG",
] as const;

/** Full configuration with the given activation; `fake` routes HTTP to the recording fake. */
export function krogerEnv(activate: string, opts: { fake?: boolean; retailer?: "kroger" | "simulated" } = {}) {
  Object.assign(process.env, {
    TABLE_RETAILER: opts.retailer ?? "kroger",
    KROGER_ACTIVATE: activate,
    KROGER_CLIENT_ID: FAKE.clientId,
    KROGER_CLIENT_SECRET: FAKE.clientSecret,
    KROGER_REDIRECT_URI: FAKE.redirectUri,
    KROGER_LOCATION_ID: FAKE.locationId,
    KROGER_CUSTOMER_SCOPES: FAKE.customerScopes,
    KROGER_PRODUCT_SCOPES: FAKE.productScopes,
    KROGER_LOCATION_SCOPES: FAKE.locationScopes,
    TABLE_TOKEN_KEY: FAKE.tokenKey,
  });
  if (opts.fake ?? true) process.env.TABLE_KROGER_FAKE_TRANSPORT = "1";
  else delete process.env.TABLE_KROGER_FAKE_TRANSPORT;
}

export function saveEnv() {
  const saved = Object.fromEntries(KROGER_ENV_KEYS.map((k) => [k, process.env[k]]));
  return () => {
    for (const k of KROGER_ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  };
}

/** Recurring tests are offline: any real fetch fails the test loudly. */
export function forbidNetwork() {
  vi.stubGlobal("fetch", () => {
    throw new Error("network access is forbidden in Kroger tests");
  });
}

export const json = (status: number, body: unknown) => ({ status, headers: { "content-type": "application/json" }, bodyText: JSON.stringify(body) });
export const empty = (status: number) => ({ status, headers: {}, bodyText: "" });

/** Fake token response with obviously fake values. */
export const tokenBody = (n: number, expiresIn: number | null = 1800) => ({
  access_token: `fake-access-token-${n}`,
  refresh_token: `fake-refresh-token-${n}`,
  token_type: "bearer",
  ...(expiresIn === null ? {} : { expires_in: expiresIn }),
});

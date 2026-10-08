/**
 * Instacart Developer Platform configuration and staged activation (all off by default).
 *
 * Sources (public docs, read 2026-10-08; read-only, no request was ever sent to Instacart):
 *   https://docs.instacart.com/developer_platform_api/              (Developer Platform, not Instacart Connect)
 *   https://docs.instacart.com/developer_platform_api/api/overview/  (bearer API key; dev and production servers)
 *
 * Documented: development server https://connect.dev.instacart.tools, production server
 * https://connect.instacart.com, paths under /idp/v1/, HTTPS required, `Authorization: Bearer <API-key>`.
 *
 * Read from the environment passed in (default process.env). This module does not edit or depend on
 * src/server/env.ts or src/server/deploy.ts; `instacartConfigProblems` is exported for the deployment
 * checks to call. Nothing here is ever provider-verified and no status claims it.
 */

export type InstacartCapability = "retailers" | "list";
export const INSTACART_CAPABILITIES: readonly InstacartCapability[] = ["retailers", "list"];

export type InstacartEnvironment = "development" | "production";

/** Documented base URLs (API overview). */
export const INSTACART_BASE_URLS: Readonly<Record<InstacartEnvironment, string>> = {
  development: "https://connect.dev.instacart.tools",
  production: "https://connect.instacart.com",
};

/** Test-only settings: refused (throw / config problem) anywhere but TABLE_ENV=test. */
export const INSTACART_TEST_ONLY_ENV = ["TABLE_INSTACART_FAKE_TRANSPORT"] as const;

type Env = Record<string, string | undefined>;

const value = (env: Env, k: string): string | null => {
  const v = env[k];
  return v === undefined || v.trim() === "" ? null : v.trim();
};

function tableEnvOf(env: Env): string {
  return env.TABLE_ENV ?? (env.NODE_ENV === "production" ? "production" : "development");
}

/** Test-only: TABLE_INSTACART_FAKE_TRANSPORT=1 routes Instacart HTTP to the in-process recording
 *  fake. Honored only when TABLE_ENV=test; throws anywhere else (mirrors the Kroger switch). */
export function instacartFakeTransportEnabled(env: Env = process.env): boolean {
  const v = value(env, "TABLE_INSTACART_FAKE_TRANSPORT");
  if (!v) return false;
  if (tableEnvOf(env) !== "test") throw new Error("TABLE_INSTACART_FAKE_TRANSPORT is a test-only setting and is refused outside TABLE_ENV=test");
  return v === "1";
}

/**
 * Codes only, never a value (the deployment checks' convention). The main session can append these
 * to `configProblems`. Unlike `configProblems`, the test switch is reported in every non-test
 * environment, not only production.
 */
export function instacartConfigProblems(env: Env = process.env): string[] {
  const p: string[] = [];
  if (value(env, "TABLE_INSTACART_FAKE_TRANSPORT") && tableEnvOf(env) !== "test") p.push("TABLE_INSTACART_FAKE_TRANSPORT_set_outside_test");
  const raw = value(env, "INSTACART_ACTIVATE");
  if (raw) {
    for (const n of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!(INSTACART_CAPABILITIES as readonly string[]).includes(n)) {
        p.push("INSTACART_ACTIVATE_invalid");
        break;
      }
    }
  }
  const e = value(env, "INSTACART_ENV");
  if (e && e !== "development" && e !== "production") p.push("INSTACART_ENV_invalid");
  return p;
}

export interface InstacartConfig {
  activated: Set<InstacartCapability>;
  /** Server-side secret. Never logged, returned in an outcome, or placed in evidence. */
  apiKey: string | null;
  environment: InstacartEnvironment | null;
  baseUrl: string | null;
  fakeTransport: boolean;
  problems: string[];
}

/** Never throws: an invalid setting becomes a problem and every capability stays off. */
export function instacartConfig(env: Env = process.env): InstacartConfig {
  const problems = instacartConfigProblems(env);
  const activated = new Set<InstacartCapability>();
  if (!problems.includes("INSTACART_ACTIVATE_invalid")) {
    for (const n of (value(env, "INSTACART_ACTIVATE") ?? "").split(",").map((s) => s.trim()).filter(Boolean)) activated.add(n as InstacartCapability);
  }
  const e = value(env, "INSTACART_ENV");
  const environment = e === "development" || e === "production" ? e : null;
  let fakeTransport = false;
  try {
    fakeTransport = instacartFakeTransportEnabled(env);
  } catch {
    fakeTransport = false; // already reported in problems
  }
  return {
    activated: problems.length ? new Set() : activated,
    apiKey: value(env, "INSTACART_API_KEY"),
    environment,
    baseUrl: environment ? INSTACART_BASE_URLS[environment] : null,
    fakeTransport,
    problems,
  };
}

/**
 * Factual capability status. There is no "verified" value: no request has ever been made to
 * Instacart from this build.
 *   not_configured          – not activated, missing settings, or a refused setting
 *   configured_fixture_only – activated and configured, HTTP routed to the test recording fake
 *   configured_not_verified – activated, key and environment present, never provider-verified
 */
export type InstacartCapabilityState = "not_configured" | "configured_fixture_only" | "configured_not_verified";

export interface InstacartCapabilityStatus {
  capability: InstacartCapability;
  status: InstacartCapabilityState;
  activated: boolean;
  missing: string[];
  problems: string[];
  providerVerified: false;
  reason: string;
}

export function instacartCapabilityStatus(cap: InstacartCapability, env: Env = process.env): InstacartCapabilityStatus {
  const c = instacartConfig(env);
  const missing: string[] = [];
  if (!c.apiKey) missing.push("INSTACART_API_KEY");
  if (!c.environment) missing.push("INSTACART_ENV");
  const base = { capability: cap, activated: c.activated.has(cap), missing, problems: c.problems, providerVerified: false as const };
  const off = (reason: string): InstacartCapabilityStatus => ({ ...base, status: "not_configured", reason });
  if (c.problems.length) return off(`Instacart is refused by its configuration (${c.problems.join(", ")}).`);
  if (!c.activated.has(cap)) return off(`The Instacart ${cap} capability is not activated (INSTACART_ACTIVATE).`);
  if (missing.length) return off(`Instacart ${cap} is not configured (missing ${missing.join(", ")}).`);
  if (c.fakeTransport) return { ...base, status: "configured_fixture_only", reason: `Instacart ${cap} is routed to the test recording fake; only doc-shaped synthetic fixtures have been exercised.` };
  return { ...base, status: "configured_not_verified", reason: `Instacart ${cap} is activated and configured; it has never been verified against Instacart.` };
}

export function instacartCapabilities(env: Env = process.env): InstacartCapabilityStatus[] {
  return INSTACART_CAPABILITIES.map((c) => instacartCapabilityStatus(c, env));
}

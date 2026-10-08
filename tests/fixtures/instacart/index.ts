/**
 * TEST-ONLY: doc-shaped synthetic Instacart fixtures (see README.md — not recorded from a live
 * call) as recording-fake steps, plus offline helpers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import type { FakeStep } from "@/server/integrations/instacart/transport";

export const SCENARIOS = {
  retailersOk: ["retailers-ok.json", 200],
  linkOk: ["products-link-ok.json", 200],
  linkUntrusted: ["products-link-untrusted.json", 200],
  validation400: ["error-400-validation.json", 400],
  unauthorized401: ["error-401.json", 401],
  forbidden403: ["error-403.json", 403],
  rateLimited429: ["error-429.json", 429],
  serverError500: ["error-500.json", 500],
} as const;

export type Scenario = keyof typeof SCENARIOS;

export function fixtureBody(name: Scenario): string {
  return readFileSync(path.join(__dirname, SCENARIOS[name][0]), "utf8");
}

export function scenario(name: Scenario): FakeStep {
  return { status: SCENARIOS[name][1], headers: { "content-type": "application/json" }, body: fixtureBody(name) };
}

/** Obvious placeholder; not a real key. */
export const FAKE_KEY = "fake-instacart-key-NOT-REAL-0001";

/** Environment for the client under test (passed as deps.env; process.env is not touched). */
export function instacartTestEnv(activate: string, extra: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return { TABLE_ENV: "test", INSTACART_ACTIVATE: activate, INSTACART_API_KEY: FAKE_KEY, INSTACART_ENV: "development", ...extra };
}

/** Recurring tests are offline: any real fetch fails the test loudly. */
export function forbidNetwork() {
  vi.stubGlobal("fetch", () => {
    throw new Error("network access is forbidden in Instacart tests");
  });
}

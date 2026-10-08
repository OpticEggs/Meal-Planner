/**
 * Instacart staged activation: off by default, factual capability statuses (never "verified"),
 * the test-only fake-transport switch refused outside TABLE_ENV=test, and the unit mapping.
 * Offline: fetch is stubbed to throw.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  INSTACART_BASE_URLS, INSTACART_TEST_ONLY_ENV, instacartCapabilities, instacartCapabilityStatus, instacartConfig, instacartConfigProblems,
  instacartFakeTransportEnabled,
} from "@/server/integrations/instacart/config";
import { recordingTransport, sharedInstacartFake, transportFor } from "@/server/integrations/instacart/transport";
import { INSTACART_UNIT_MAP, TABLE_UNITS, instacartUnitFor } from "@/server/integrations/instacart/units";
import { KNOWN_UNITS } from "@/domain/units";
import { FAKE_KEY, forbidNetwork, instacartTestEnv } from "../fixtures/instacart";

beforeAll(() => forbidNetwork());

describe("Instacart configuration (staged, all off by default)", () => {
  it("nothing is activated or configured with an empty environment", () => {
    const env = { TABLE_ENV: "test" };
    expect(instacartConfig(env).activated.size).toBe(0);
    for (const s of instacartCapabilities(env)) {
      expect(s.status).toBe("not_configured");
      expect(s.activated).toBe(false);
      expect(s.providerVerified).toBe(false);
    }
  });

  it("documented base URLs per environment", () => {
    expect(INSTACART_BASE_URLS).toEqual({ development: "https://connect.dev.instacart.tools", production: "https://connect.instacart.com" });
    expect(instacartConfig(instacartTestEnv("list", { INSTACART_ENV: "production" })).baseUrl).toBe("https://connect.instacart.com");
  });

  it("activation without a key (or environment) is not configured", () => {
    const noKey = instacartCapabilityStatus("list", { TABLE_ENV: "test", INSTACART_ACTIVATE: "list", INSTACART_ENV: "development" });
    expect(noKey).toMatchObject({ status: "not_configured", activated: true, missing: ["INSTACART_API_KEY"] });
    const noEnv = instacartCapabilityStatus("list", { TABLE_ENV: "test", INSTACART_ACTIVATE: "list", INSTACART_API_KEY: FAKE_KEY });
    expect(noEnv).toMatchObject({ status: "not_configured", missing: ["INSTACART_ENV"] });
  });

  it("activated + key + environment is configured_not_verified, never verified", () => {
    const env = { TABLE_ENV: "production", INSTACART_ACTIVATE: "retailers, list", INSTACART_API_KEY: FAKE_KEY, INSTACART_ENV: "production" };
    const all = instacartCapabilities(env);
    expect(all.map((s) => s.status)).toEqual(["configured_not_verified", "configured_not_verified"]);
    expect(all.every((s) => s.providerVerified === false)).toBe(true);
    expect(JSON.stringify(all)).not.toContain(FAKE_KEY);
    expect(JSON.stringify(all)).not.toMatch(/"verified"/);
  });

  it("only the activated capability is configured", () => {
    const env = instacartTestEnv("retailers");
    expect(instacartCapabilityStatus("retailers", env).status).toBe("configured_not_verified");
    expect(instacartCapabilityStatus("list", env).status).toBe("not_configured");
  });

  it("the fake transport in tests reports configured_fixture_only", () => {
    const env = instacartTestEnv("list", { TABLE_INSTACART_FAKE_TRANSPORT: "1" });
    expect(instacartCapabilityStatus("list", env).status).toBe("configured_fixture_only");
  });

  it("an unknown capability or environment refuses everything", () => {
    const bad = instacartTestEnv("list,checkout");
    expect(instacartConfigProblems(bad)).toEqual(["INSTACART_ACTIVATE_invalid"]);
    expect(instacartCapabilityStatus("list", bad).status).toBe("not_configured");
    expect(instacartConfigProblems(instacartTestEnv("list", { INSTACART_ENV: "staging" }))).toEqual(["INSTACART_ENV_invalid"]);
  });
});

describe("TABLE_INSTACART_FAKE_TRANSPORT is test-only", () => {
  it("is listed as test-only", () => {
    expect(INSTACART_TEST_ONLY_ENV).toEqual(["TABLE_INSTACART_FAKE_TRANSPORT"]);
  });
  it("is honored in test", () => {
    expect(instacartFakeTransportEnabled({ TABLE_ENV: "test", TABLE_INSTACART_FAKE_TRANSPORT: "1" })).toBe(true);
    expect(instacartFakeTransportEnabled({ TABLE_ENV: "test" })).toBe(false);
  });
  it.each(["production", "development"])("is refused in %s (throws, is a config problem, keeps capabilities off)", (t) => {
    const env = { TABLE_ENV: t, TABLE_INSTACART_FAKE_TRANSPORT: "1", INSTACART_ACTIVATE: "list", INSTACART_API_KEY: FAKE_KEY, INSTACART_ENV: "production" };
    expect(() => instacartFakeTransportEnabled(env)).toThrow(/test-only/);
    expect(instacartConfigProblems(env)).toContain("TABLE_INSTACART_FAKE_TRANSPORT_set_outside_test");
    expect(instacartCapabilityStatus("list", env).status).toBe("not_configured");
    expect(() => transportFor(env)).toThrow(/test-only/);
    expect(() => recordingTransport([], env)).toThrow(/test-only/);
  });
  it("is refused when NODE_ENV=production and TABLE_ENV is absent", () => {
    expect(() => instacartFakeTransportEnabled({ NODE_ENV: "production", TABLE_INSTACART_FAKE_TRANSPORT: "1" })).toThrow(/test-only/);
  });
  it("routes transportFor to the shared recording fake only under the switch", async () => {
    const env = { TABLE_ENV: "test", TABLE_INSTACART_FAKE_TRANSPORT: "1" };
    const fake = sharedInstacartFake(env);
    fake.script([{ status: 204, body: "" }]);
    const before = fake.calls.length;
    await transportFor(env)({ method: "GET", url: "https://connect.dev.instacart.tools/x", headers: {}, signal: new AbortController().signal });
    expect(fake.calls.length).toBe(before + 1);
    // Without the switch it is the fetch transport, and fetch is stubbed to throw here.
    await expect(transportFor({ TABLE_ENV: "test" })({ method: "GET", url: "https://connect.dev.instacart.tools/x", headers: {}, signal: new AbortController().signal })).rejects.toThrow(/forbidden/);
  });
});

describe("Table unit -> Instacart unit (documented strings only)", () => {
  it("covers exactly Table's units", () => {
    expect([...TABLE_UNITS].sort()).toEqual([...KNOWN_UNITS].sort());
  });
  it("maps to documented strings and refuses fl_oz", () => {
    const supported = Object.fromEntries(Object.entries(INSTACART_UNIT_MAP).map(([k, v]) => [k, v.supported ? v.instacartUnit : null]));
    expect(supported).toEqual({ g: "g", kg: "kg", oz: "oz", lb: "lb", ml: "ml", l: "l", tsp: "tsp", tbsp: "tablespoon", cup: "cup", fl_oz: null, each: "each" });
    expect(instacartUnitFor("fl_oz")).toMatchObject({ supported: false, reason: expect.stringMatching(/fluid-ounce/) });
    expect(instacartUnitFor("bunch")).toMatchObject({ supported: false });
  });
});

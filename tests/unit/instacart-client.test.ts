/**
 * Instacart Developer Platform client against the in-process recording fake and doc-shaped
 * synthetic fixtures (tests/fixtures/instacart/README.md). Offline: fetch is stubbed to throw, and
 * every request goes to an injected recording transport.
 */
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildShoppingListPayload, createShoppingListLink, nearbyRetailers, type InstacartDeps, type ShoppingListLinkInput,
} from "@/server/integrations/instacart/client";
import { recordingTransport, type FakeStep } from "@/server/integrations/instacart/transport";
import { FAKE_KEY, forbidNetwork, instacartTestEnv, scenario } from "../fixtures/instacart";

beforeAll(() => forbidNetwork());

const NOW = new Date("2026-10-12T19:00:00Z");
function rig(activate: string, steps: FakeStep[], extra: Record<string, string | undefined> = {}, timeoutMs?: number) {
  const fake = recordingTransport(steps, { TABLE_ENV: "test" });
  const deps: InstacartDeps = { transport: fake.transport, env: instacartTestEnv(activate, extra), now: () => NOW, timeoutMs };
  return { fake, deps };
}
const noKeyLeak = (v: unknown) => expect(JSON.stringify(v)).not.toContain(FAKE_KEY);

const LIST: ShoppingListLinkInput = {
  title: "Table — week of 12 Oct",
  lines: [
    { name: "whole milk", quantity: "1.5", unit: "l" },
    { name: "flour", quantity: "2.250", unit: "lb", displayText: "All-purpose flour" },
    { name: "olive oil", quantity: "2", unit: "tbsp" },
    { name: "lemons", quantity: "3", unit: "each" },
  ],
  linkbackUrl: "https://table.example/groceries",
};

describe("off by default: no transport call", () => {
  it("no activation -> unavailable for both capabilities", async () => {
    const fake = recordingTransport([scenario("retailersOk"), scenario("linkOk")], { TABLE_ENV: "test" });
    const deps: InstacartDeps = { transport: fake.transport, env: { TABLE_ENV: "test", INSTACART_API_KEY: FAKE_KEY, INSTACART_ENV: "development" } };
    expect(await nearbyRetailers(deps, { postalCode: "94105", countryCode: "US" })).toMatchObject({ kind: "unavailable", reason: "not_activated" });
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "unavailable", reason: "not_activated" });
    expect(fake.calls).toHaveLength(0);
  });
  it("activation without a key -> unavailable (not configured)", async () => {
    const { fake, deps } = rig("retailers,list", [scenario("linkOk")], { INSTACART_API_KEY: undefined });
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "unavailable", reason: "not_configured" });
    expect(await nearbyRetailers(deps, { postalCode: "94105", countryCode: "US" })).toMatchObject({ kind: "unavailable", reason: "not_configured" });
    expect(fake.calls).toHaveLength(0);
  });
  it("activating one capability does not open the other", async () => {
    const { fake, deps } = rig("retailers", [scenario("linkOk")]);
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "unavailable", reason: "not_activated" });
    expect(fake.calls).toHaveLength(0);
  });
  it("the fake switch outside test refuses the call (config_refused)", async () => {
    const fake = recordingTransport([scenario("linkOk")], { TABLE_ENV: "test" });
    const env = { ...instacartTestEnv("list"), TABLE_ENV: "production", TABLE_INSTACART_FAKE_TRANSPORT: "1" };
    expect(await createShoppingListLink({ transport: fake.transport, env }, LIST)).toMatchObject({ kind: "unavailable", reason: "config_refused" });
    expect(fake.calls).toHaveLength(0);
  });
});

describe("nearbyRetailers (GET /idp/v1/retailers)", () => {
  it("valid ZIP -> retailer brands, documented request, no location fields", async () => {
    const { fake, deps } = rig("retailers", [scenario("retailersOk")]);
    const out = await nearbyRetailers(deps, { postalCode: "94105", countryCode: "US" });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") return;
    expect(out.retailers).toEqual([
      { key: "fixture-retailer-a", name: "Fixture Retailer A", logoUrl: "https://fixture.invalid/logo-a.png" },
      { key: "fixture-retailer-b", name: "Fixture Retailer B", logoUrl: null }, // docs' scheme-less example value
    ]);
    for (const r of out.retailers) expect(Object.keys(r).sort()).toEqual(["key", "logoUrl", "name"]);
    expect(JSON.stringify(out.retailers)).not.toMatch(/address|pickup|slot|price|stock|location/i);
    expect(out.evidence.meaning).toMatch(/Not store locations, pickup slots, stock or prices/);
    expect(out.evidence).toMatchObject({ provider: "instacart", endpoint: "GET /idp/v1/retailers", httpStatus: 200, retailerCount: 2, url: "https://connect.dev.instacart.tools/idp/v1/retailers?[redacted]" });
    expect(JSON.stringify(out.evidence)).not.toContain("94105");
    noKeyLeak(out);
    expect(fake.calls).toHaveLength(1);
    const call = fake.calls[0];
    expect(call.method).toBe("GET");
    const u = new URL(call.url);
    expect(u.origin + u.pathname).toBe("https://connect.dev.instacart.tools/idp/v1/retailers");
    expect(Object.fromEntries(u.searchParams)).toEqual({ postal_code: "94105", country_code: "US" });
    expect(call.headers).toEqual({ Accept: "application/json", Authorization: `Bearer ${FAKE_KEY}` });
    expect(call.body).toBeUndefined();
  });
  it("accepts ZIP+4 and Canadian A1A 1A1", async () => {
    const { fake, deps } = rig("retailers", [scenario("retailersOk"), scenario("retailersOk")]);
    expect((await nearbyRetailers(deps, { postalCode: "94105-1234", countryCode: "US" })).kind).toBe("ok");
    expect((await nearbyRetailers(deps, { postalCode: "k1a 0b1", countryCode: "CA" })).kind).toBe("ok");
    expect(new URL(fake.calls[1].url).searchParams.get("postal_code")).toBe("K1A0B1");
  });
  it.each([
    ["9410", "US"], ["941050", "US"], ["94105-12", "US"], ["K1A 0B1", "US"], ["94105", "CA"], ["K1A-0B1", "CA"], ["", "US"], ["94105", "GB"],
  ])("refuses %j/%s before any transport call", async (postalCode, countryCode) => {
    const { fake, deps } = rig("retailers", [scenario("retailersOk")]);
    const out = await nearbyRetailers(deps, { postalCode, countryCode: countryCode as "US" });
    expect(out.kind).toBe("refused");
    expect(fake.calls).toHaveLength(0);
  });
  it.each([
    ["unauthorized401", 401, "unauthorized"], ["forbidden403", 403, "forbidden"], ["rateLimited429", 429, "rate_limited"], ["serverError500", 500, "server_error"],
  ] as const)("%s -> failed with no results", async (name, status, code) => {
    const { fake, deps } = rig("retailers", [scenario(name)]);
    const out = await nearbyRetailers(deps, { postalCode: "94105", countryCode: "US" });
    expect(out).toMatchObject({ kind: "failed", status, code, providerError: { code: 1001 } });
    expect(out).not.toHaveProperty("retailers");
    noKeyLeak(out);
    expect(fake.calls).toHaveLength(1);
  });
  it.each([
    ["not json", "{retailers:"], ["no retailers array", JSON.stringify({ data: [] })], ["retailers not an array", JSON.stringify({ retailers: {} })],
  ])("malformed body (%s) -> failed, never fabricated", async (_n, body) => {
    const { deps } = rig("retailers", [{ status: 200, body }]);
    expect(await nearbyRetailers(deps, { postalCode: "94105", countryCode: "US" })).toMatchObject({ kind: "failed", status: 200, code: "malformed_response" });
  });
  it("entries without key or name are dropped and counted, not invented", async () => {
    const body = JSON.stringify({ retailers: [{ name: "No key" }, { retailer_key: "k" }, { retailer_key: "ok", name: "Ok", street: "1 Main St" }] });
    const { deps } = rig("retailers", [{ status: 200, body }]);
    const out = await nearbyRetailers(deps, { postalCode: "94105", countryCode: "US" });
    expect(out).toMatchObject({ kind: "ok", retailers: [{ key: "ok", name: "Ok", logoUrl: null }], evidence: { droppedEntries: 2 } });
    expect(JSON.stringify(out)).not.toContain("Main St");
  });
  it("timeout and network errors -> failed", async () => {
    const t = rig("retailers", [{ hang: true }], {}, 20);
    expect(await nearbyRetailers(t.deps, { postalCode: "94105", countryCode: "US" })).toMatchObject({ kind: "failed", code: "timeout" });
    const n = rig("retailers", [{ networkError: `connect ECONNREFUSED Bearer ${FAKE_KEY}` }]);
    const out = await nearbyRetailers(n.deps, { postalCode: "94105", countryCode: "US" });
    expect(out).toMatchObject({ kind: "failed", code: "network_error" });
    noKeyLeak(out);
  });
});

describe("createShoppingListLink (POST /idp/v1/products/products_link)", () => {
  it("prepares a link with line_item_measurements and exact decimals", async () => {
    const { fake, deps } = rig("list", [scenario("linkOk")]);
    const out = await createShoppingListLink(deps, LIST);
    expect(out).toMatchObject({ kind: "link_prepared", url: "https://www.instacart.com/store/shopping_lists/0000000-fixture", expiresAt: null });
    expect(fake.calls).toHaveLength(1);
    const call = fake.calls[0];
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://connect.dev.instacart.tools/idp/v1/products/products_link");
    expect(call.headers).toEqual({ Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${FAKE_KEY}` });
    // Decimal tokens are written verbatim (normalized), never through a float.
    expect(call.body).toContain('"quantity":1.5');
    expect(call.body).toContain('"quantity":2.25');
    const body = JSON.parse(call.body!);
    expect(body).toEqual({
      title: "Table — week of 12 Oct",
      link_type: "shopping_list",
      landing_page_configuration: { partner_linkback_url: "https://table.example/groceries" },
      line_items: [
        { name: "whole milk", line_item_measurements: [{ quantity: 1.5, unit: "l" }] },
        { name: "flour", display_text: "All-purpose flour", line_item_measurements: [{ quantity: 2.25, unit: "lb" }] },
        { name: "olive oil", line_item_measurements: [{ quantity: 2, unit: "tablespoon" }] },
        { name: "lemons", line_item_measurements: [{ quantity: 3, unit: "each" }] },
      ],
    });
    for (const li of body.line_items) {
      expect(li).not.toHaveProperty("quantity"); // deprecated bare fields are never sent
      expect(li).not.toHaveProperty("unit");
    }
    expect(body).not.toHaveProperty("expires_in");
    if (out.kind !== "link_prepared") return;
    expect(out.requestHash).toBe(createHash("sha256").update(call.body!).digest("hex"));
    expect(out.evidence).toMatchObject({ linkHost: "www.instacart.com", lineCount: 4, httpStatus: 200 });
    expect(out.evidence.meaning).toMatch(/Not a cart write, not an order/);
    noKeyLeak(out);
  });

  it("preserves precision exactly in the reviewed preview (strings)", () => {
    const p = buildShoppingListPayload({ title: "t", lines: [{ name: "salt", quantity: "0.125000", unit: "tsp" }, { name: "rice", quantity: "123456789.000001", unit: "g" }] });
    expect(p).toMatchObject({ ok: true, lines: [{ quantity: "0.125", instacartUnit: "tsp" }, { quantity: "123456789.000001", instacartUnit: "g" }] });
    if (p.ok) expect(p.body).toContain('"quantity":123456789.000001');
  });

  it("refuses the WHOLE request when any line is unsupported, listing every offending line; no request", async () => {
    const { fake, deps } = rig("list", [scenario("linkOk")]);
    const out = await createShoppingListLink(deps, {
      title: "t",
      lines: [
        { name: "milk", quantity: "12", unit: "fl_oz" },
        { name: "eggs", quantity: "12", unit: "each" },
        { name: "basil", quantity: "1", unit: "bunch" as never },
        { name: "rice", quantity: "1.0000001", unit: "kg" },
        { name: "", quantity: "0", unit: "g" },
      ],
    });
    expect(out.kind).toBe("refused");
    if (out.kind !== "refused") return;
    expect(out.problems.map((p) => [p.line, p.field])).toEqual([[0, "unit"], [2, "unit"], [3, "quantity"], [4, "name"], [4, "quantity"]]);
    expect(out.problems[0].reason).toMatch(/fluid-ounce/);
    expect(fake.calls).toHaveLength(0);
  });

  it.each([
    [{ title: " ", lines: LIST.lines }, "title"], [{ title: "t", lines: [] }, "lines"], [{ ...LIST, linkbackUrl: "http://table.example/x" }, "linkbackUrl"],
    [{ ...LIST, expiresInDays: 366 }, "expiresInDays"], [{ ...LIST, expiresInDays: 0 }, "expiresInDays"],
    [{ title: "t", lines: [{ name: "x", quantity: "1e3", unit: "g" }] }, "quantity"], [{ title: "t", lines: [{ name: "x", quantity: "-1", unit: "g" }] }, "quantity"],
  ] as [ShoppingListLinkInput, string][])("refuses invalid input (%#: %s) before any request", async (input, field) => {
    const { fake, deps } = rig("list", [scenario("linkOk")]);
    const out = await createShoppingListLink(deps, input);
    expect(out).toMatchObject({ kind: "refused", problems: expect.arrayContaining([expect.objectContaining({ field })]) });
    expect(fake.calls).toHaveLength(0);
  });

  it("expires_in is sent only when asked, and expiresAt is computed from it", async () => {
    const { fake, deps } = rig("list", [scenario("linkOk")]);
    const out = await createShoppingListLink(deps, { ...LIST, expiresInDays: 30 });
    expect(JSON.parse(fake.calls[0].body!).expires_in).toBe(30);
    expect(out).toMatchObject({ kind: "link_prepared", expiresAt: "2026-11-11T19:00:00.000Z" });
  });

  it("400 -> failed with the documented error summary, no retry", async () => {
    const { fake, deps } = rig("list", [scenario("validation400"), scenario("linkOk")]);
    const out = await createShoppingListLink(deps, LIST);
    expect(out).toMatchObject({ kind: "failed", status: 400, code: "bad_request", providerError: { code: 9999, errorCount: 1, message: "There were issues with your request" } });
    expect(fake.calls).toHaveLength(1);
    noKeyLeak(out);
  });

  it.each([
    ["unauthorized401", 401, "unauthorized"], ["forbidden403", 403, "forbidden"], ["rateLimited429", 429, "rate_limited"],
  ] as const)("%s -> failed, transport called once", async (name, status, code) => {
    const { fake, deps } = rig("list", [scenario(name), scenario("linkOk")]);
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "failed", status, code });
    expect(fake.calls).toHaveLength(1);
  });

  it.each([
    ["timeout", [{ hang: true }] as FakeStep[], "timeout"],
    ["network error", [{ networkError: "socket hang up" }] as FakeStep[], "network_error"],
    ["500", [scenario("serverError500")], "server_error"],
    ["503", [{ status: 503, body: "" }] as FakeStep[], "server_error"],
    ["302", [{ status: 302, headers: { location: "https://x" }, body: "" }] as FakeStep[], "unexpected_redirect"],
    ["201", [{ status: 201, body: "{}" }] as FakeStep[], "undocumented_success_status"],
    ["200 unreadable", [{ status: 200, body: "<html>" }] as FakeStep[], "unreadable_success_body"],
  ])("%s -> uncertain (list MAY exist), transport called exactly once, never retried", async (_n, steps, reason) => {
    const { fake, deps } = rig("list", [...steps, scenario("linkOk"), scenario("linkOk")], {}, 20);
    const out = await createShoppingListLink(deps, LIST);
    expect(out).toMatchObject({ kind: "uncertain", reason });
    if (out.kind === "uncertain") expect(out.requestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fake.calls).toHaveLength(1);
    noKeyLeak(out);
  });

  it("a transport that ignores its abort signal still times out at the bound", async () => {
    const deps: InstacartDeps = { transport: () => new Promise(() => {}), env: instacartTestEnv("list"), timeoutMs: 20 };
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "uncertain", reason: "timeout" });
  });

  it.each([
    ["example.com placeholder", "https://example.com/store/shopping_lists/1"],
    ["http", "http://www.instacart.com/store/shopping_lists/1"],
    ["look-alike host", "https://www.instacart.com.evil.example/store/1"],
    ["credentials", "https://user:pw@www.instacart.com/store/1"],
    ["port", "https://www.instacart.com:8443/store/1"],
    ["not a url", "www.instacart.com/store/1"],
  ])("untrusted returned URL (%s) -> failed untrusted_link", async (_n, url) => {
    const { deps } = rig("list", [{ status: 200, body: JSON.stringify({ products_link_url: url }) }]);
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "failed", status: 200, code: "untrusted_link" });
  });
  it("untrusted fixture (docs' example.com placeholder) -> failed untrusted_link", async () => {
    const { deps } = rig("list", [scenario("linkUntrusted")]);
    expect(await createShoppingListLink(deps, LIST)).toMatchObject({ kind: "failed", code: "untrusted_link" });
  });

  it("request hash: stable for the same payload, changes with quantity, ignores the key and environment", () => {
    const a = buildShoppingListPayload(LIST);
    const b = buildShoppingListPayload(JSON.parse(JSON.stringify(LIST)));
    const trailing = buildShoppingListPayload({ ...LIST, lines: LIST.lines.map((l, i) => (i === 0 ? { ...l, quantity: "1.50" } : l)) });
    const changed = buildShoppingListPayload({ ...LIST, lines: LIST.lines.map((l, i) => (i === 0 ? { ...l, quantity: "1.6" } : l)) });
    if (!a.ok || !b.ok || !trailing.ok || !changed.ok) throw new Error("expected payloads");
    expect(a.requestHash).toBe(b.requestHash);
    expect(trailing.requestHash).toBe(a.requestHash); // same exact decimal
    expect(changed.requestHash).not.toBe(a.requestHash);
    expect(a.body).not.toContain(FAKE_KEY);
  });

  it("outcome kinds never read as a cart write or an order", async () => {
    const { deps } = rig("list", [scenario("linkOk")]);
    const out = await createShoppingListLink(deps, LIST);
    expect(["link_prepared", "refused", "failed", "uncertain", "unavailable"]).toContain(out.kind);
    expect(JSON.stringify(out)).not.toMatch(/"kind":"(sent|ordered|added|acknowledged)"/);
  });
});

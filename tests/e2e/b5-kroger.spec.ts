/**
 * B5 Kroger routes through the real production server (TABLE_RETAILER=simulated, no Kroger
 * configuration, no activation): authentication and CSRF/origin rules match /api/commands/*,
 * nothing is stored while connect is not activated, the status never claims live-verified and
 * carries no secrets. No request reaches Kroger: the server has no activated capability.
 */
import { expect, test } from "@playwright/test";
import { member, q, seed } from "./helpers";

test("B5: Kroger connect start follows the command route rules and stores nothing while not activated", async ({ browser, request }) => {
  const fx = await seed();
  // Unauthenticated.
  expect((await request.post("/api/kroger/connect", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/kroger/status")).status()).toBe(401);
  const anonCb = await request.get("/api/kroger/callback?code=fake-code&state=fake-state", { maxRedirects: 0 });
  expect(anonCb.status()).toBe(303);
  expect(anonCb.headers().location).toMatch(/\/household\?kroger=refused$/);

  const jon = await member(browser, "jon");
  const evil = await jon.context.request.post("/api/kroger/connect", { headers: { origin: "https://evil.example", "content-type": "application/json" }, data: {} });
  expect(evil.status()).toBe(403);
  const crossSite = await jon.context.request.post("/api/kroger/connect", { headers: { "sec-fetch-site": "cross-site", "content-type": "application/json" }, data: {} });
  expect(crossSite.status()).toBe(403);
  const plain = await jon.page.evaluate(async () => (await fetch("/api/kroger/connect", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" })).status);
  expect(plain).toBe(415);
  const start = await jon.page.evaluate(async () => {
    const r = await fetch("/api/kroger/connect", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    return { status: r.status, body: await r.json() };
  });
  expect(start.status).toBe(409);
  expect(start.body.code).toBe("not_activated");

  const cb = await jon.context.request.get("/api/kroger/callback?code=fake-code&state=fake-state", { maxRedirects: 0 });
  expect(cb.status()).toBe(303);
  expect(cb.headers().location).toMatch(/\/household\?kroger=not_activated$/);
  expect(cb.headers().location).not.toContain("fake-code");

  const status = await jon.page.evaluate(async () => (await fetch("/api/kroger/status")).json());
  expect(status.retailer).toBe("simulated");
  expect(status.liveVerified).toBe(false);
  expect(status.capabilities.map((c: any) => [c.capability, c.ready, c.liveVerified])).toEqual([["connect", false, false], ["products", false, false], ["cart", false, false]]);
  expect(status.connection.status).toBe("not_connected");
  expect(status.cartHandoff.ready).toBe(false);
  expect(JSON.stringify(status)).not.toMatch(/sealed|"v1:|Bearer |Basic [A-Za-z0-9+/=]{8,}|access_token|refresh_token/); // names of missing settings only, never values

  // Household settings that need no network still work through the command route.
  const loc = await jon.page.evaluate(async () => {
    const r = await fetch("/api/commands/SetKrogerLocation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `b5-${crypto.randomUUID()}`, payload: { locationId: "TEST0001" } }) });
    return r.status;
  });
  expect(loc).toBe(200);
  const disc = await jon.page.evaluate(async () => {
    const r = await fetch("/api/commands/DisconnectKroger", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `b5-${crypto.randomUUID()}`, payload: {} }) });
    return { status: r.status, body: await r.json() };
  });
  expect(disc.status).toBe(409);
  expect(disc.body.code).toBe("not_connected");

  // The other household sees none of it.
  const other = await member(browser, "other");
  const os = await other.page.evaluate(async () => (await fetch("/api/kroger/status")).json());
  expect(os.connection).toEqual({ status: "not_connected", locationId: null, connectedAt: null, connectedBy: null, accessExpiresAt: null });

  expect(await q("SELECT 1 FROM kroger_auth_states")).toHaveLength(0);
  expect(await q("SELECT status, location_id, access_token_sealed FROM kroger_connections WHERE household_id=$1", [fx.householdId])).toEqual([{ status: "not_connected", location_id: "TEST0001", access_token_sealed: null }]);
});

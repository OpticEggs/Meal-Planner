/**
 * B5 products/locations adapter calls through the recording fake: not activated -> no network;
 * activated -> a client-credentials token (product scopes) and the documented GET.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgetAppTokens, searchKrogerLocations, searchKrogerProducts } from "@/server/integrations/kroger/adapter";
import { krogerFake } from "@/server/integrations/kroger/transport";
import { FAKE, forbidNetwork, json, krogerEnv, saveEnv } from "../fixtures/kroger/env";

let restore: () => void;
beforeAll(() => forbidNetwork());
beforeEach(() => {
  restore = saveEnv();
  forgetAppTokens();
});
afterEach(() => restore());

const productsBody = { data: [{ productId: "0000000000001", upc: "0000000000001", description: "Fixture Milk", items: [{ price: { regular: 2.79, promo: 0 }, size: "1 gal", soldBy: "Unit", fulfillment: { curbside: true } }] }] };

describe("B5 product and location lookup", () => {
  it("not activated (or retailer simulated): answers not_activated with zero transport calls", async () => {
    krogerEnv("connect,cart", { fake: true });
    krogerFake.reset(() => json(200, {}));
    expect(await searchKrogerProducts({ term: "milk" })).toMatchObject({ ok: false, code: "not_activated" });
    expect(await searchKrogerLocations({ zipCode: "00000" })).toMatchObject({ ok: false, code: "not_activated" });
    krogerEnv("products", { fake: true, retailer: "simulated" });
    expect(await searchKrogerProducts({ term: "milk" })).toMatchObject({ ok: false, code: "not_activated" });
    expect(krogerFake.calls()).toHaveLength(0);
  });

  it("activated: client-credentials token with the configured scopes, then GET /products with the location; candidates mapped", async () => {
    krogerEnv("products", { fake: true });
    krogerFake.reset((c) => (c.url.endsWith("/token") ? json(200, { access_token: "fake-app-token-1", expires_in: 1800, token_type: "bearer" }) : json(200, productsBody)));
    const r = await searchKrogerProducts({ term: "milk", locationId: FAKE.locationId });
    expect(r).toMatchObject({ ok: true, candidates: [{ productId: "0000000000001", price: { regularMinor: 279, promoMinor: null }, package: { quantity: "3785.411784", unit: "ml" } }] });
    const [tok, get] = krogerFake.calls();
    expect(Object.fromEntries(new URLSearchParams(tok.body!))).toEqual({ grant_type: "client_credentials", scope: FAKE.productScopes });
    expect(tok.headers.Authorization).toMatch(/^Basic /);
    const u = new URL(get.url);
    expect(u.pathname).toBe("/v1/products");
    expect(Object.fromEntries(u.searchParams)).toEqual({ "filter.term": "milk", "filter.locationId": FAKE.locationId, "filter.limit": "10" });
    expect(get.headers.Authorization).toBe("Bearer fake-app-token-1");
    // The app token is reused while valid.
    await searchKrogerProducts({ productIds: ["0000000000001"] });
    expect(krogerFake.calls().filter((c) => c.url.endsWith("/token"))).toHaveLength(1);
  });

  it("locations need their own (undocumented) scope configured; invalid inputs never reach the network", async () => {
    krogerEnv("products", { fake: true });
    delete process.env.KROGER_LOCATION_SCOPES;
    krogerFake.reset(() => json(200, {}));
    expect(await searchKrogerLocations({ zipCode: "00000" })).toMatchObject({ ok: false, code: "not_configured" });
    process.env.KROGER_LOCATION_SCOPES = FAKE.locationScopes;
    expect(await searchKrogerLocations({ zipCode: "abc" })).toMatchObject({ ok: false, code: "invalid" });
    expect(await searchKrogerProducts({ term: "milk", locationId: "123" })).toMatchObject({ ok: false, code: "invalid" });
    expect(await searchKrogerProducts({ term: "  " })).toMatchObject({ ok: false, code: "invalid" });
    expect(krogerFake.calls()).toHaveLength(0);
  });

  it("a token or search failure is reported, not turned into an empty result", async () => {
    krogerEnv("products", { fake: true });
    krogerFake.reset(() => json(401, { error: "invalid_client" }));
    expect(await searchKrogerProducts({ term: "milk" })).toMatchObject({ ok: false, code: "failed" });
    krogerFake.reset((c) => (c.url.endsWith("/token") ? json(200, { access_token: "fake-app-token-2", expires_in: 1800 }) : json(500, {})));
    expect(await searchKrogerProducts({ term: "milk" })).toMatchObject({ ok: false, code: "failed", reason: expect.stringMatching(/HTTP 500/) });
  });
});

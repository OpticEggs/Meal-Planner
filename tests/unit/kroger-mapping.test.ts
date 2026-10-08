/**
 * B5 pure mapping: products/locations (documented shapes), size parsing, prices, cart outcomes.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { dollarsToMinor, mapLocations, mapProducts, parsePackageSize } from "@/server/integrations/kroger/products";
import { cartAddBody, cartAddRequest, mapCartResponse } from "@/server/integrations/kroger/cart";
import { forbidNetwork } from "../fixtures/kroger/env";

beforeAll(() => forbidNetwork());

// Shape from the Products tutorial / Product Search pages (values are fixture values).
const productsBody = {
  data: [
    {
      productId: "0000000000001", upc: "0000000000001", brand: "Fixture Brand", description: "Fixture® 2% Reduced Fat Milk",
      items: [{ itemId: "0000000000001", inventory: { stockLevel: "HIGH" }, favorite: false, fulfillment: { curbside: true, delivery: true }, price: { regular: 1.49, promo: 0 }, size: "1/2 Gallon", soldBy: "Unit" }],
    },
    {
      productId: "0000000000002", upc: "0000000000002", brand: "Fixture Brand", description: "Fixture Chicken Thighs",
      items: [{ itemId: "0000000000002", fulfillment: { curbside: false }, price: { regular: 4.99, promo: 3.99 }, size: "about 1.5 lb", soldBy: "Weight" }],
    },
    { productId: "0000000000003", upc: "0000000000003", description: "Fixture Bananas", items: [{ size: "each" }] },
    { upc: "no product id is skipped" },
  ],
  meta: { pagination: { start: 0, limit: 10, total: 3 } },
};

describe("B5 products mapping", () => {
  it("maps documented fields with a location; unknown stays null, never zero", () => {
    const c = mapProducts(productsBody, "TEST0001");
    expect(c).toHaveLength(3);
    expect(c[0]).toMatchObject({
      productId: "0000000000001", upc: "0000000000001", description: "Fixture® 2% Reduced Fat Milk", brand: "Fixture Brand",
      sizeText: "1/2 Gallon", package: { quantity: "1892.705892", unit: "ml" }, soldBy: "Unit", locationId: "TEST0001",
      price: { regularMinor: 149, promoMinor: null, currency: "USD", currencyAssumed: true },
      fulfillment: { curbside: true, delivery: true, instore: null, shiptohome: null },
      stockLevel: "HIGH",
    });
    // Sold by weight: the size is not a package quantity.
    expect(c[1].package).toBeNull();
    expect(c[1].price).toEqual({ regularMinor: 499, promoMinor: 399, currency: "USD", currencyAssumed: true });
    expect(c[1].stockLevel).toBeNull(); // omitted when unavailable
    // No price object at all: price unknown (null), not 0.
    expect(c[2].price).toBeNull();
    expect(c[2].package).toEqual({ quantity: "1", unit: "each" });
  });

  it("without a locationId, price, fulfillment and stock are not claimed even if present", () => {
    const c = mapProducts(productsBody, null);
    for (const x of c) {
      expect(x.price).toBeNull();
      expect(x.fulfillment).toBeNull();
      expect(x.stockLevel).toBeNull();
    }
    expect(c[0].description).toBe("Fixture® 2% Reduced Fat Milk"); // verbatim
  });

  it("product details (single object) and junk are handled without inventing data", () => {
    expect(mapProducts({ data: productsBody.data[0] }, null)).toHaveLength(1);
    expect(mapProducts({ data: "nope" }, null)).toEqual([]);
    expect(mapProducts(null, null)).toEqual([]);
    expect(mapProducts({ data: [{ productId: "x", items: [{ price: { regular: "1.49" }, inventory: { stockLevel: "PLENTY" } }] }] }, "TEST0001")[0])
      .toMatchObject({ price: { regularMinor: null, promoMinor: null }, stockLevel: null, package: null });
  });

  it("dollars become exact integer cents only when unambiguous", () => {
    expect(dollarsToMinor(1.49)).toBe(149);
    expect(dollarsToMinor(0.1 + 0.2)).toBeNull(); // 0.30000000000000004 has more than 2 decimals
    expect(dollarsToMinor(2.79)).toBe(279);
    expect(dollarsToMinor(0)).toBeNull();
    expect(dollarsToMinor(-1)).toBeNull();
    expect(dollarsToMinor(Number.NaN)).toBeNull();
    expect(dollarsToMinor(1.499)).toBeNull();
    expect(dollarsToMinor(undefined)).toBeNull();
  });

  it("maps locations from the documented shape", () => {
    const l = mapLocations({ data: [{ locationId: "TEST0001", chain: "FIXTURE", name: "Fixture Store", address: { addressLine1: "1 Test Way", city: "Testville", state: "OH", zipCode: "00000" } }, { chain: "no id" }] });
    expect(l).toEqual([{ locationId: "TEST0001", chain: "FIXTURE", name: "Fixture Store", address: { addressLine1: "1 Test Way", city: "Testville", state: "OH", zipCode: "00000" } }]);
  });
});

describe("B5 package size parsing (only when unambiguous)", () => {
  const ok: [string, string, string][] = [
    ["1 gal", "3785.411784", "ml"], ["1/2 Gallon", "1892.705892", "ml"], ["2 lb", "2", "lb"], ["12 fl oz", "12", "fl_oz"], ["16 FL. OZ.", "16", "fl_oz"],
    ["500 ml", "500", "ml"], ["1.5 l", "1.5", "l"], ["454 g", "454", "g"], ["each", "1", "each"], ["10 ct", "10", "each"], ["1 qt", "946.352946", "ml"],
  ];
  for (const [t, q, u] of ok) it(`"${t}" -> ${q} ${u}`, () => expect(parsePackageSize(t)).toEqual({ quantity: q, unit: u }));
  const ambiguous = ["16 oz", "6 ct / 12 oz", "about 1.5 lb", "per lb", "1.5 lb avg", "2-3 lb", "12 oz pack", "0 lb", "1/0 gal", "", "Family Size", "2 x 8 oz", "1 bunch"];
  for (const t of ambiguous) it(`"${t}" stays unknown`, () => expect(parsePackageSize(t)).toBeNull());
});

describe("B5 cart add request and outcome mapping", () => {
  const items = [{ productRef: "0000000000001", quantity: 2 }, { productRef: "0000000000003", quantity: 1 }];
  const mod = { value: "FIXTURE_MODALITY_NOT_A_KROGER_VALUE", fixture: true };

  it("builds PUT /v1/cart/add from exactly the given lines", () => {
    expect(JSON.parse(cartAddBody(items, mod.value))).toEqual({ items: [
      { upc: "0000000000001", quantity: 2, modality: mod.value }, { upc: "0000000000003", quantity: 1, modality: mod.value },
    ] });
    const r = cartAddRequest(items, mod.value, "fake-access-token-1");
    expect(r.method).toBe("PUT");
    expect(r.url).toBe("https://api.kroger.com/v1/cart/add");
    expect(r.headers.Authorization).toBe("Bearer fake-access-token-1");
  });

  it("204 is a batch-level acknowledgment only — no per-line result, no order", () => {
    const o = mapCartResponse({ status: 204, headers: {}, bodyText: "" }, { items: 2, modality: mod });
    expect(o.kind).toBe("acknowledged");
    expect(o.evidence).toMatchObject({ httpStatus: 204, granularity: "batch" });
    expect(Object.keys(o.evidence)).not.toContain("lines");
    expect(JSON.stringify(o.evidence)).toMatch(/Not an order, not a pickup reservation/);
  });

  it("documented 4xx -> failed; 401 -> failed needing reauthorization, never retried", () => {
    for (const s of [400, 403, 404, 409]) {
      const o = mapCartResponse({ status: s, headers: {}, bodyText: JSON.stringify({ errors: { code: "CART-0000-400", reason: "fixture reason", timestamp: 1 } }) }, { items: 2, modality: mod });
      expect(o.kind, String(s)).toBe("failed");
      expect(o.evidence.error).toEqual({ code: "CART-0000-400", reason: "fixture reason" });
    }
    const u = mapCartResponse({ status: 401, headers: {}, bodyText: JSON.stringify({ error: "invalid_token", error_description: "The access token is invalid or has expired" }) }, { items: 2, modality: mod });
    expect(u.kind).toBe("failed");
    expect(u.reauthorize).toBe(true);
    expect(u.evidence).toMatchObject({ reauthorizationRequired: true, retried: false });
  });

  it("5xx, undocumented statuses and unreadable responses are uncertain", () => {
    for (const s of [500, 502, 503, 200, 201, 202, 429, 418]) {
      expect(mapCartResponse({ status: s, headers: {}, bodyText: "<html>" }, { items: 2, modality: mod }).kind, String(s)).toBe("uncertain");
    }
    expect(mapCartResponse({ status: Number.NaN, headers: {}, bodyText: "" }, { items: 2, modality: mod }).kind).toBe("uncertain");
  });
});

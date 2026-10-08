/**
 * URL-to-cart P3 — ingredient → actual Kroger product. Offline: Kroger HTTP goes only to the
 * recording fake (TABLE_ENV=test); any real fetch fails the test. Matching uses the `products`
 * capability only — never the household's account and never a cart.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fresh, op, q } from "./helpers";
import { FAKE, forbidNetwork, json, krogerEnv, saveEnv } from "../fixtures/kroger/env";
import { krogerFake, type RecordedCall } from "@/server/integrations/kroger/transport";
import { forgetAppTokens } from "@/server/integrations/kroger/adapter";
import { setKrogerLocationCommand } from "@/server/commands/kroger";
import { approvePurchaseLinesCommand, chooseKrogerProductCommand } from "@/server/commands/groceries";
import { chooseKrogerProduct, matchKrogerLines, searchKrogerForIngredient, MAX_MATCH_LINES } from "@/server/kroger-mapping-service";
import { recomputeProjection } from "@/server/groceries/recompute";
import { inTransaction } from "@/server/db/pool";

let restore: () => void;
beforeAll(() => forbidNetwork());
beforeEach(() => {
  restore = saveEnv();
  forgetAppTokens();
  krogerEnv("connect,products", { fake: true });
  krogerFake.reset();
});
afterEach(() => restore());

/** Kroger products the fake knows, by product id. Every value is synthetic. */
const CATALOG: Record<string, unknown> = {
  "0001111041700": { productId: "0001111041700", upc: "0001111041700", description: "Fixture Jasmine Rice", brand: "Fixture", items: [{ size: "2 lb", soldBy: "UNIT", price: { regular: 4.49, promo: 3.99 }, fulfillment: { curbside: true }, inventory: { stockLevel: "HIGH" } }] },
  "0001111041701": { productId: "0001111041701", upc: "0001111041701", description: "Fixture Rice Big Bag", items: [{ size: "1 bag", soldBy: "UNIT", price: { regular: 9.99, promo: 0 }, fulfillment: { curbside: true } }] },
  "0001111041702": { productId: "0001111041702", description: "Fixture Rice No UPC", items: [{ size: "1 lb", soldBy: "UNIT", price: { regular: 1.99 } }] },
};

function responder(opts: { catalog?: Record<string, unknown> } = {}) {
  const catalog = opts.catalog ?? CATALOG;
  return (c: RecordedCall) => {
    if (c.url.endsWith("/token")) return json(200, { access_token: "fake-app-token-km", expires_in: 1800, token_type: "bearer" });
    const u = new URL(c.url);
    if (u.pathname === "/v1/products") {
      const ids = u.searchParams.get("filter.productId");
      const data = ids ? ids.split(",").map((id) => catalog[id]).filter(Boolean) : Object.values(catalog);
      return json(200, { data });
    }
    return json(404, {});
  };
}

const productCalls = () => krogerFake.calls().filter((c) => new URL(c.url).pathname === "/v1/products");
const cartCalls = () => krogerFake.calls().filter((c) => c.url.includes("/cart"));
const counts = async () => ({
  products: (await q("SELECT 1 FROM products WHERE retailer='kroger'")).length,
  prices: (await q("SELECT 1 FROM price_observations WHERE source='kroger'")).length,
});

async function household() {
  const env = await fresh();
  expect((await setKrogerLocationCommand(env.jon, op(), { locationId: FAKE.locationId })).status).toBe("accepted");
  krogerFake.reset(responder());
  return env;
}

async function line(weekId: string, key: string) {
  return (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]))
    .map((r) => r.line).find((l) => l.key === key);
}

describe("P3 Kroger matching is gated", () => {
  it("KM-01: with the simulated store, or the products capability off, nothing is requested", async () => {
    const { jon } = await household();
    krogerEnv("connect,products", { fake: true, retailer: "simulated" });
    expect(await searchKrogerForIngredient(jon, { term: "rice" })).toMatchObject({ ok: false, code: "not_kroger" });
    krogerEnv("connect", { fake: true });
    expect(await searchKrogerForIngredient(jon, { term: "rice" })).toMatchObject({ ok: false, code: "not_activated" });
    expect(await matchKrogerLines(jon, { lines: [{ key: "rice", term: "rice" }] })).toMatchObject({ ok: false, code: "not_activated" });
    expect(krogerFake.calls()).toHaveLength(0);
  });

  it("KM-02: no store chosen and none configured → asked to choose one; nothing requested", async () => {
    const { jon } = await fresh();
    delete process.env.KROGER_LOCATION_ID;
    krogerFake.reset(responder());
    expect(await searchKrogerForIngredient(jon, { term: "rice" })).toMatchObject({ ok: false, code: "no_location" });
    expect(krogerFake.calls()).toHaveLength(0);
  });
});

describe("P3 search and choose", () => {
  it("KM-03: search asks Kroger for the term at the household's store and shows size, price and pickup — no cart call", async () => {
    const { jon } = await household();
    const r: any = await searchKrogerForIngredient(jon, { term: "  jasmine\nrice " });
    expect(r.ok).toBe(true);
    expect(r.candidates[0]).toMatchObject({ productId: "0001111041700", package: { quantity: "2", unit: "lb" }, regularMinor: 449, promoMinor: 399, pickup: true, choosable: true });
    expect(r.candidates.find((c: any) => c.productId === "0001111041702")).toMatchObject({ choosable: false });
    const u = new URL(productCalls()[0].url);
    expect(u.searchParams.get("filter.term")).toBe("jasmine rice");
    expect(u.searchParams.get("filter.locationId")).toBe(FAKE.locationId);
    expect(cartCalls()).toHaveLength(0);
  });

  it("KM-04: choosing re-reads the product by id and records product (UPC), package, the store price (promo as promo) and the mapping", async () => {
    const { jon, fx } = await household();
    const before = await line(fx.weekId, "rice");
    const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041700", expectedProductId: before.product?.id ?? null });
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const re = productCalls().at(-1)!;
    expect(new URL(re.url).searchParams.get("filter.productId")).toBe("0001111041700");
    const [p] = await q<any>("SELECT * FROM products WHERE id=$1", [r.result.productId]);
    expect(p).toMatchObject({ retailer: "kroger", product_ref: "0001111041700", ingredient_key: "rice", package_unit: "lb", variable_weight: false });
    expect(Number(p.package_qty)).toBe(2);
    const prices = await q<any>("SELECT amount_minor, price_kind, source, store_label FROM price_observations WHERE product_id=$1", [p.id]);
    expect(prices).toEqual([{ amount_minor: 399, price_kind: "promo", source: "kroger", store_label: `Kroger store ${FAKE.locationId}` }]);
    expect((await q<any>("SELECT product_id FROM product_mappings WHERE household_id=$1 AND ingredient_key='rice'", [fx.householdId]))[0].product_id).toBe(p.id);
    // The grocery line now shows the Kroger product and its price.
    const after = await line(fx.weekId, "rice");
    expect(after.product).toMatchObject({ id: p.id, retailer: "kroger" });
    expect(after.price).toMatchObject({ amountMinor: 399, source: "kroger" });
    expect(cartCalls()).toHaveLength(0);
  });

  it("KM-05: the price recorded is Kroger's, whatever the client sends — the command only accepts a product the server re-read", async () => {
    const { jon, fx } = await household();
    const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041700", priceMinor: 1, package: { quantity: "99", unit: "kg" } } as any);
    expect(r.status).toBe("accepted");
    const [p] = await q<any>("SELECT package_qty, package_unit FROM products WHERE id=$1", [r.result.productId]);
    expect([Number(p.package_qty), p.package_unit]).toEqual([2, "lb"]);
    expect((await q<any>("SELECT amount_minor FROM price_observations WHERE product_id=$1", [r.result.productId]))[0].amount_minor).toBe(399);
  });

  it("KM-06: a size Kroger states in words needs the member's package size; nothing is written until it is given", async () => {
    const { jon, fx } = await household();
    const c0 = await counts();
    const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041701" });
    expect(r).toMatchObject({ status: "rejected", code: "package_needed" });
    expect(await counts()).toEqual(c0);
    const bad: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041701", packageQty: "5", packageUnit: "bag" });
    expect(bad).toMatchObject({ status: "rejected", code: "invalid" });
    const ok: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041701", packageQty: "10", packageUnit: "lb" });
    expect(ok.status).toBe("accepted");
    expect(ok.result.package).toEqual({ quantity: "10", unit: "lb" });
  });

  it("KM-07: no UPC, gone from the store, or an unknown ingredient → refused and nothing written", async () => {
    const { jon, fx } = await household();
    const c0 = await counts();
    expect(await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041702" })).toMatchObject({ status: "rejected", code: "invalid" });
    expect(await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0009999999999" })).toMatchObject({ status: "rejected", code: "not_found" });
    expect(await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "no_such_thing", productId: "0001111041700" })).toMatchObject({ status: "rejected", code: "not_found" });
    expect(await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "../cart" })).toMatchObject({ status: "rejected", code: "invalid" });
    expect(await counts()).toEqual(c0);
  });

  it("KM-08: a choice made against an outdated view of the line is refused (B15), and a new choice withdraws the line's approval", async () => {
    const { jon, alex, fx } = await household();
    const l = await line(fx.weekId, "rice");
    const first: any = await chooseKrogerProduct(alex, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041700", expectedProductId: l.product?.id ?? null });
    expect(first.status).toBe("accepted");
    const stale: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041701", expectedProductId: l.product?.id ?? null, packageQty: "10", packageUnit: "lb" });
    expect(stale.status).toBe("rejected");
    expect((await line(fx.weekId, "rice")).product.id).toBe(first.result.productId);
    // Approve the Kroger line, then choose differently: the approval no longer matches.
    const cur = await line(fx.weekId, "rice");
    expect(cur.toSend).toBeGreaterThan(0);
    expect(cur.price).toBeTruthy();
    expect(cur.unresolved).toEqual([]);
    {
      expect((await approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: [{ key: "rice", fingerprint: cur.fingerprint, packages: cur.toSend }] })).status).toBe("accepted");
      expect((await line(fx.weekId, "rice")).approval?.valid).toBe(true);
      const again: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041701", expectedProductId: first.result.productId, packageQty: "10", packageUnit: "lb" });
      expect(again.status).toBe("accepted");
      expect((await line(fx.weekId, "rice")).approval?.valid ?? false).toBe(false);
    }
  });

  it("KM-09: the command refuses when the store isn't Kroger (direct call), and replaying an operation writes once", async () => {
    const { jon, fx } = await household();
    const product = { productId: "0001111041700", upc: "0001111041700", description: "Fixture Jasmine Rice", brand: null, sizeText: "2 lb", soldBy: "UNIT", package: { quantity: "2", unit: "lb" }, locationId: FAKE.locationId, price: { regularMinor: 449, promoMinor: null } };
    krogerEnv("connect,products", { fake: true, retailer: "simulated" });
    expect(await chooseKrogerProductCommand(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", product })).toMatchObject({ status: "rejected", code: "product_unavailable" });
    krogerEnv("connect,products", { fake: true });
    const id = op();
    const a: any = await chooseKrogerProductCommand(jon, id, { weekId: fx.weekId, ingredientKey: "rice", product });
    const b: any = await chooseKrogerProductCommand(jon, id, { weekId: fx.weekId, ingredientKey: "rice", product });
    expect(a.status).toBe("accepted");
    expect(b).toMatchObject({ status: "accepted", replayed: true });
    expect(await counts()).toEqual({ products: 1, prices: 1 });
    // Choosing the same product again later reuses it and adds a fresh price observation.
    await chooseKrogerProductCommand(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", product });
    expect(await counts()).toEqual({ products: 1, prices: 2 });
  });

  it("KM-11: the store changed after the search — the choice is re-read and priced at the store current when it is made", async () => {
    const { jon, fx } = await household();
    expect((await searchKrogerForIngredient(jon, { term: "rice" })).ok).toBe(true);
    expect((await setKrogerLocationCommand(jon, op(), { locationId: "TEST0002" })).status).toBe("accepted");
    const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: "0001111041700" });
    expect(r.status).toBe("accepted");
    expect(new URL(productCalls().at(-1)!.url).searchParams.get("filter.locationId")).toBe("TEST0002");
    expect((await q<any>("SELECT store_label FROM price_observations WHERE product_id=$1", [r.result.productId]))[0].store_label).toBe("Kroger store TEST0002");
    expect(cartCalls()).toHaveLength(0);
  });

  it("KM-10: matching several lines searches each (capped at 12) and chooses nothing by itself", async () => {
    const { jon, fx } = await household();
    const lines = Array.from({ length: 15 }, (_, i) => ({ key: `k${i}`, term: `item ${i}` }));
    const r: any = await matchKrogerLines(jon, { lines });
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(MAX_MATCH_LINES);
    expect(r.capped).toBe(true);
    expect(productCalls()).toHaveLength(MAX_MATCH_LINES);
    expect(await counts()).toEqual({ products: 0, prices: 0 });
    expect((await q<any>("SELECT count(*)::int AS n FROM product_mappings WHERE household_id=$1", [fx.householdId]))[0].n).toBeGreaterThan(0); // fixture mappings untouched
    await inTransaction(async (c) => {
      await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [fx.householdId]);
      await recomputeProjection(c, fx.householdId, fx.weekId);
    });
    expect(cartCalls()).toHaveLength(0);
  });
});

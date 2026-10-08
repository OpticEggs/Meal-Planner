/**
 * RUC-02 (recheck of 988c4d1) — a Kroger product becomes a fixed package with a price only when
 * Kroger says it is sold by the unit. Sold by weight, or an absent or unfamiliar sale basis, is
 * refused with a reason: a member's typed amount never turns a per-pound (or unknown-basis) price
 * into a fixed package price. Offline: Kroger HTTP goes only to the recording fake.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fresh, op, q } from "./helpers";
import { FAKE, forbidNetwork, json, krogerEnv, saveEnv } from "../fixtures/kroger/env";
import { krogerFake, type RecordedCall } from "@/server/integrations/kroger/transport";
import { forgetAppTokens } from "@/server/integrations/kroger/adapter";
import { setKrogerLocationCommand } from "@/server/commands/kroger";
import { chooseKrogerProduct, searchKrogerForIngredient } from "@/server/kroger-mapping-service";

let restore: () => void;
beforeAll(() => forbidNetwork());
beforeEach(() => {
  restore = saveEnv();
  forgetAppTokens();
  krogerEnv("connect,products", { fake: true });
  krogerFake.reset();
});
afterEach(() => restore());

const item = (o: Record<string, unknown>) => ({ fulfillment: { curbside: true }, ...o });
/** Synthetic products; every value is invented. */
const CATALOG: Record<string, any> = {
  "0002000000001": { productId: "0002000000001", upc: "0002000000001", description: "Synthetic chicken thighs", items: [item({ size: "per lb", soldBy: "WEIGHT", price: { regular: 4.99 } })] },
  "0002000000002": { productId: "0002000000002", upc: "0002000000002", description: "Synthetic thighs, no sale basis", items: [item({ size: "1.5 lb", price: { regular: 6.49 } })] },
  "0002000000003": { productId: "0002000000003", upc: "0002000000003", description: "Synthetic thighs, odd basis", items: [item({ size: "1.5 lb", soldBy: "BUNDLE", price: { regular: 6.49 } })] },
  "0002000000004": { productId: "0002000000004", upc: "0002000000004", description: "Synthetic thighs tray", items: [item({ size: "1.5 lb", soldBy: "UNIT", price: { regular: 7.29, promo: 5.99 } })] },
  "0002000000005": { productId: "0002000000005", upc: "0002000000005", description: "Synthetic thighs, no price", items: [item({ size: "1.5 lb", soldBy: "UNIT" })] },
  "0002000000006": { productId: "0002000000006", upc: "0002000000006", description: "Synthetic thighs family pack", items: [item({ size: "1 pack", soldBy: "Unit", price: { regular: 11.99 } })] },
};

function responder(c: RecordedCall) {
  if (c.url.endsWith("/token")) return json(200, { access_token: "fake-app-token-ruc02", expires_in: 1800, token_type: "bearer" });
  const u = new URL(c.url);
  if (u.pathname === "/v1/products") {
    const ids = u.searchParams.get("filter.productId");
    return json(200, { data: ids ? ids.split(",").map((id) => CATALOG[id]).filter(Boolean) : Object.values(CATALOG) });
  }
  return json(404, {});
}

async function household() {
  const env = await fresh();
  expect((await setKrogerLocationCommand(env.jon, op(), { locationId: FAKE.locationId })).status).toBe("accepted");
  krogerFake.reset(responder);
  return env;
}
const line = async (weekId: string, key: string) =>
  (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId])).map((r) => r.line).find((l) => l.key === key);
const summary = async (weekId: string) => (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
const written = async () => ({
  products: await q("SELECT * FROM products ORDER BY id"),
  prices: await q("SELECT * FROM price_observations ORDER BY id"),
  mappings: await q("SELECT * FROM product_mappings ORDER BY household_id, ingredient_key"),
});
const cartCalls = () => krogerFake.calls().filter((c) => c.url.includes("/cart"));

describe("RUC-02 a weight-priced or unknown-basis product is never recorded as a fixed, fully priced package", () => {
  it("R2-01: sold by weight + a typed 2 lb → refused with a reason; nothing written; the line and its estimate are unchanged", async () => {
    const { jon, fx } = await household();
    const before = { db: await written(), line: await line(fx.weekId, "chicken_thigh"), summary: await summary(fx.weekId) };
    for (const extra of [{ packageQty: "2", packageUnit: "lb" }, {}]) {
      const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", productId: "0002000000001", ...extra });
      expect(r, JSON.stringify(r)).toMatchObject({ status: "rejected", code: "sold_by_weight" });
      expect(r.message).toMatch(/weight/);
    }
    expect(await written()).toEqual(before.db);
    expect(await line(fx.weekId, "chicken_thigh")).toEqual(before.line);
    expect(await summary(fx.weekId)).toEqual(before.summary);
    expect(cartCalls()).toHaveLength(0);
  });

  it("R2-02: no sale basis, or one Table doesn't know → refused; a typed size doesn't make it a package", async () => {
    const { jon, fx } = await household();
    const before = await written();
    for (const productId of ["0002000000002", "0002000000003"]) {
      const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", productId, packageQty: "1.5", packageUnit: "lb" });
      expect(r, productId).toMatchObject({ status: "rejected", code: "sold_basis_unknown" });
    }
    expect(await written()).toEqual(before);
  });

  it("R2-03: search shows the basis and why such products can't be chosen yet", async () => {
    const { jon } = await household();
    const r: any = await searchKrogerForIngredient(jon, { term: "chicken thighs" });
    const by = Object.fromEntries(r.candidates.map((c: any) => [c.productId, c]));
    expect(by["0002000000001"]).toMatchObject({ basis: "weight", choosable: false });
    expect(by["0002000000001"].notChoosable).toMatch(/weight/);
    expect(by["0002000000002"]).toMatchObject({ basis: "unknown", choosable: false });
    expect(by["0002000000003"]).toMatchObject({ basis: "unknown", choosable: false });
    expect(by["0002000000004"]).toMatchObject({ basis: "unit", choosable: true, package: { quantity: "1.5", unit: "lb" } });
    expect(by["0002000000006"]).toMatchObject({ basis: "unit", choosable: true, package: null });
  });

  it("R2-04: fixed unit still works — readable size with a promotion, a member-stated size for a unit item, and no price stays unknown and keeps the estimate incomplete", async () => {
    const { jon, fx } = await household();
    const promo: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", productId: "0002000000004" });
    expect(promo.status, JSON.stringify(promo)).toBe("accepted");
    expect((await line(fx.weekId, "chicken_thigh")).price).toMatchObject({ amountMinor: 599, kind: "promo", source: "kroger" });
    const unitStated: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", productId: "0002000000006", packageQty: "3", packageUnit: "lb", expectedProductId: promo.result.productId });
    expect(unitStated.status, JSON.stringify(unitStated)).toBe("accepted");
    expect((await q<any>("SELECT variable_weight, package_qty, package_unit FROM products WHERE id=$1", [unitStated.result.productId]))[0]).toMatchObject({ variable_weight: false, package_unit: "lb" });
    const unpriced: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", productId: "0002000000005", expectedProductId: unitStated.result.productId });
    expect(unpriced.status).toBe("accepted");
    expect(unpriced.result.priced).toBe(false);
    const l = await line(fx.weekId, "chicken_thigh");
    expect(l.price).toBeNull();
    const s = await summary(fx.weekId);
    expect(s.pickupSpending.complete).toBe(false); // an unknown price never makes a complete total
    expect(cartCalls()).toHaveLength(0);
  });

  it("R2-05: choosing products never rewrites earlier products or price history", async () => {
    const { jon, fx } = await household();
    const before = await written();
    const r: any = await chooseKrogerProduct(jon, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", productId: "0002000000004" });
    expect(r.status).toBe("accepted");
    const after = await written();
    for (const p of before.products) expect(after.products).toContainEqual(p);
    for (const p of before.prices) expect(after.prices).toContainEqual(p);
    expect(after.prices.length).toBe(before.prices.length + 1);
  });
});

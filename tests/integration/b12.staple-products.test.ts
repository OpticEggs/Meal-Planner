/**
 * B12 — remembered staple products. A staple's remembered product (the last approved package)
 * changes only through the explicit ApproveStapleProduct decision; it is a product-suitability
 * decision, never a purchase-quantity approval. Real PostgreSQL, real command path.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fresh, line, op, q, race, retailerCalls } from "./helpers";
import {
  approvePurchaseLinesCommand, approveStapleProductCommand, captureHouseholdNeedCommand, chooseProductCommand, confirmOrderCommand,
} from "@/server/commands/groceries";
import { startHandoff } from "@/server/commands/purchasing";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";

const NEXT = "2026-10-19";
const YOGURT = "greek_yogurt";

async function addProduct(householdId: string, name: string, opts: { retailer?: "simulated" | "kroger"; qty?: string; priceMinor?: number | null; key?: string } = {}) {
  const id = randomUUID();
  await q(
    `INSERT INTO products(id, household_id, retailer, product_ref, name, ingredient_key, package_qty, package_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,'oz')`,
    [id, householdId, opts.retailer ?? "simulated", `test:${id}`, name, opts.key ?? YOGURT, opts.qty ?? "35"],
  );
  if (opts.priceMinor !== null) {
    await q("INSERT INTO price_observations(household_id, product_id, amount_minor, source, observed_at) VALUES ($1,$2,$3,'manual','2026-10-12T18:00:00Z')", [
      householdId, id, opts.priceMinor ?? 699,
    ]);
  }
  return id;
}
const staple = async (key = YOGURT) => (await q<any>("SELECT * FROM household_staples WHERE ingredient_key=$1", [key]))[0];
const weekRow = async (hh: string, ws: string) => (await q<any>("SELECT * FROM weeks WHERE household_id=$1 AND week_start=$2", [hh, ws]))[0];
const summary = async (weekId: string) => (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
const tap = (actor: Actor, where: { weekId?: string; weekStart?: string }, extra: Record<string, unknown> = {}) =>
  captureHouseholdNeedCommand(actor, op(), { ...where, text: "Plain Greek yogurt", ingredientKey: YOGURT, from: "week", ...extra } as any);
const approveStaple = (actor: Actor, productId: string, expectedRevision: number, opId = op()) =>
  approveStapleProductCommand(actor, opId, { ingredientKey: YOGURT, productId, expectedRevision });
async function approveAll(actor: Actor, weekId: string) {
  const ls = (await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]))
    .map((r) => r.line)
    .filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0 && !l.approval?.valid);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
}
/** Everything a staple decision must never touch. */
const purchasing = async () => ({
  approvals: await q("SELECT id, ingredient_key, product_id, packages, line_fingerprint, state FROM purchase_approvals ORDER BY id"),
  batches: await q("SELECT * FROM handoff_batches ORDER BY id"),
  batchLines: await q("SELECT * FROM handoff_batch_lines ORDER BY batch_id, ingredient_key"),
  statuses: await q("SELECT * FROM handoff_status_events ORDER BY id"),
  orders: await q("SELECT * FROM orders ORDER BY id"),
  orderLines: await q("SELECT * FROM order_lines ORDER BY id"),
  retailerCalls: await retailerCalls(),
});

describe("B12 remembered staple products", () => {
  it("B12a: approving a different product updates the remembered product and its revision, records the decision, and both members see it", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    const before = await staple();
    expect([before.product_id, before.product_revision]).toEqual([fx.products[YOGURT], 1]);
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");

    const r = await approveStaple(alex, fage, 1);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect(r.status === "accepted" && r.result).toMatchObject({ productId: fage, revision: 2 });
    const after = await staple();
    expect([after.product_id, after.product_revision, after.updated_by]).toEqual([fage, 2, fx.members.alex]);
    expect(after.usual_packages).toBe(before.usual_packages);
    const decisions = await q<any>("SELECT * FROM staple_product_decisions");
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ product_id: fage, previous_product_id: fx.products[YOGURT], staple_revision: 2, decided_by: fx.members.alex });
    // The decision history is append-only.
    await expect(q("UPDATE staple_product_decisions SET product_id=$1", [fx.products[YOGURT]])).rejects.toThrow();

    for (const who of [jon, alex]) {
      const s = await householdSnapshot(who);
      expect(s.staples.find((x: any) => x.ingredientKey === YOGURT)).toMatchObject({
        productId: fage, productName: "Fage Total 35 oz", productRevision: 2, productAvailable: true, updatedBy: "Alex",
      });
    }
    const ev = (await q<any>("SELECT summary FROM change_events ORDER BY seq DESC LIMIT 1"))[0];
    expect(ev.summary.text).toBe("Alex made Fage Total 35 oz your usual Plain Greek yogurt");

    // Same operation id + payload replays the recorded outcome without a second decision.
    const opId = op();
    const tesco = await addProduct(fx.householdId, "House brand 32 oz");
    const first = await approveStaple(jon, tesco, 2, opId);
    const replay = await approveStaple(jon, tesco, 2, opId);
    expect(first.status).toBe("accepted");
    expect(replay).toMatchObject({ status: "accepted", replayed: true });
    expect(await q("SELECT 1 FROM staple_product_decisions")).toHaveLength(2);
    const reused = await approveStaple(jon, fage, 2, opId);
    expect(reused.status === "rejected" && reused.code).toBe("operation_id_reused");
  });

  it("B12b: future one-tap requests use the latest approved product and usual quantity; the outstanding purchase and its approval are untouched", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId }, { packages: 2, rememberUsual: true })).status).toBe("accepted");
    await approveAll(alex, fx.weekId);
    const thisWeek = await line(fx.weekId, YOGURT);
    expect(thisWeek.product.id).toBe(fx.products[YOGURT]);
    expect(thisWeek.approval?.valid).toBe(true);
    const before = await purchasing();
    const reviewBefore = await summary(fx.weekId);

    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect((await approveStaple(alex, fage, 1)).status).toBe("accepted");

    // This pickup's outstanding request keeps the product it was captured with: nothing about the
    // reviewed purchase moved, so nothing was (re)authorized.
    expect(await purchasing()).toEqual(before);
    const still = await line(fx.weekId, YOGURT);
    expect([still.product.id, still.fingerprint, still.approval?.valid]).toEqual([fx.products[YOGURT], thisWeek.fingerprint, true]);
    expect((await summary(fx.weekId)).reviewFingerprint).toBe(reviewBefore.reviewFingerprint);
    expect(await q("SELECT 1 FROM purchase_approvals WHERE product_id=$1", [fage])).toHaveLength(0);

    // The next one-tap request (next week's pickup) asks for the newly approved package, usual ×2.
    const r = await tap(jon, { weekStart: NEXT });
    expect(r.status === "accepted" && r.result.productIntent).toBe(fage);
    const next = await weekRow(fx.householdId, NEXT);
    const nl = await line(next.id, YOGURT);
    expect(nl.product.id).toBe(fage);
    expect(nl.packagesUsual).toBe(2);
    expect(nl.price.amountMinor).toBe(699);
    expect(nl.status).toBe("needs_review"); // approving the product approved no purchase
    expect(nl.approval).toBeNull();
    expect(nl.unresolved).toEqual([]);

    // Choosing a different product for THIS pickup changes this pickup's line (its approval no
    // longer matches; the old review cannot be sent) and does not change the remembered staple.
    const old = await summary(fx.weekId);
    expect((await chooseProductCommand(alex, op(), { weekId: fx.weekId, ingredientKey: YOGURT, productId: fage })).status).toBe("accepted");
    const changed = await line(fx.weekId, YOGURT);
    expect(changed.product.id).toBe(fage);
    expect(changed.approval?.valid ?? false).toBe(false);
    expect(changed.status).toBe("needs_review");
    const s = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: old.reviewFingerprint, payloadHash: old.payloadHash });
    expect(s.status === "rejected" && s.code).toBe("stale_review");
    expect(await retailerCalls()).toBe(0);
    // Quantity approval is not a product decision: approving the new line leaves the staple alone.
    const house = await addProduct(fx.householdId, "House brand 32 oz");
    expect((await chooseProductCommand(alex, op(), { weekId: fx.weekId, ingredientKey: YOGURT, productId: house })).status).toBe("accepted");
    await approveAll(alex, fx.weekId);
    expect((await line(fx.weekId, YOGURT)).product.id).toBe(house);
    expect([(await staple()).product_id, (await staple()).product_revision]).toEqual([fage, 2]);
  });

  it("B12c: confirmed orders and transfers stay unchanged; later needs route to the next pickup with the new product", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    await approveAll(alex, fx.weekId);
    const sum = await summary(fx.weekId);
    expect((await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: sum.reviewFingerprint, payloadHash: sum.payloadHash })).status).toBe("accepted");
    const batches = await q<any>("SELECT payload FROM handoff_batches");
    const items = batches.flatMap((b) => b.payload);
    const prods = await q<any>("SELECT id, ingredient_key FROM products");
    const conf = await confirmOrderCommand(alex, op(), {
      weekId: fx.weekId, contentsKnown: true, pickupAt: "2026-10-12T21:00:00Z",
      lines: items.map((i: any) => ({ ingredientKey: i.ingredientKey, productId: prods.find((p) => p.ingredient_key === i.ingredientKey)?.id ?? null, name: i.ingredientKey, packages: i.packages })),
    } as any);
    expect(conf.status, JSON.stringify(conf)).toBe("accepted");
    const before = await purchasing();
    const lineBefore = await line(fx.weekId, YOGURT);

    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect((await approveStaple(jon, fage, 1)).status).toBe("accepted");
    expect(await purchasing()).toEqual(before);
    expect(await line(fx.weekId, YOGURT)).toEqual(lineBefore);

    const r = await tap(alex, { weekId: fx.weekId }, { addAnother: true });
    expect(r.status === "accepted" && r.result).toMatchObject({ destination: { weekStart: NEXT }, productIntent: fage });
    expect(await purchasing()).toEqual(before);
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`B12d: concurrent approvals cannot silently overwrite a newer decision — ${order}`, async () => {
      const { fx, jon, alex } = await fresh();
      expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
      const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
      const chobani = await addProduct(fx.householdId, "Chobani 32 oz");
      const jonDecides = () => approveStaple(jon, fage, 1);
      const alexDecides = () => approveStaple(alex, chobani, 1);
      const [x, y] = await race(fx.householdId, order === "Jon first" ? jonDecides : alexDecides, order === "Jon first" ? alexDecides : jonDecides);
      const [winner, loserName] = order === "Jon first" ? [fage, "Chobani 32 oz"] : [chobani, "Fage Total 35 oz"];
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("stale_staple");
      expect(y.status === "rejected" && y.details).toMatchObject({ current: { productId: winner, revision: 2 } });
      expect(y.status === "rejected" && y.message).toContain(order === "Jon first" ? "Jon already changed" : "Alex already changed");
      const s = await staple();
      expect([s.product_id, s.product_revision]).toEqual([winner, 2]);
      expect(await q("SELECT product_id FROM staple_product_decisions")).toEqual([{ product_id: winner }]);
      // The other member can still decide — deliberately, against what they now see.
      const loser = order === "Jon first" ? alex : jon;
      const retry = await approveStaple(loser, winner === fage ? chobani : fage, 2);
      expect(retry.status).toBe("accepted");
      expect((await householdSnapshot(jon)).staples.find((x: any) => x.ingredientKey === YOGURT)).toMatchObject({ productName: loserName, productRevision: 3 });
    });
  }

  it("B12e: unknown or unavailable products are refused, and a remembered product that is unavailable leaves the line unresolved", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    const unchanged = await staple();
    const kroger = await addProduct(fx.householdId, "Kroger Greek yogurt 32 oz", { retailer: "kroger" });
    const otherHousehold = await addProduct(fx.otherHouseholdId, "Other household's yogurt");
    for (const [productId, code] of [
      [randomUUID(), "unknown_product"],
      ["not-a-uuid", "unknown_product"],
      [fx.products.salmon, "unknown_product"], // a known product, but for another item
      [otherHousehold, "unknown_product"],
      [kroger, "product_unavailable"], // the active retailer is the simulated one
    ] as const) {
      const r = await approveStaple(alex, productId, 1);
      expect(r.status === "rejected" && r.code, String(productId)).toBe(code);
    }
    expect(await staple()).toEqual(unchanged);
    expect(await q("SELECT 1 FROM staple_product_decisions")).toHaveLength(0);
    // Not a staple at all.
    const r = await approveStapleProductCommand(alex, op(), { ingredientKey: "tofu", productId: fx.products.tofu, expectedRevision: 1 });
    expect(r.status === "rejected" && r.code).toBe("not_found");

    // A remembered product the active store does not sell (e.g. remembered under another
    // retailer) is never silently swapped for the current product choice: the line is unresolved.
    await q("UPDATE household_staples SET product_id=$1 WHERE ingredient_key=$2", [kroger, YOGURT]);
    const s = (await householdSnapshot(alex)).staples.find((x: any) => x.ingredientKey === YOGURT);
    expect(s).toMatchObject({ productId: kroger, productAvailable: false });
    expect((await tap(alex, { weekStart: NEXT })).status).toBe("accepted");
    const next = await weekRow(fx.householdId, NEXT);
    const nl = await line(next.id, YOGURT);
    expect(nl.product).toBeNull();
    expect(nl.unresolved.join(" ")).toContain("Your usual product (Kroger Greek yogurt 32 oz) is not available from the active store");
    expect(nl.toSend ?? 0).toBeLessThanOrEqual(nl.packagesNeeded ?? 0);
    const sum = await summary(next.id);
    expect(sum.ready).toBe(false);
    expect(sum.payload.map((x: any) => x.ingredientKey)).not.toContain(YOGURT);
    const ap = await approvePurchaseLinesCommand(alex, op(), { weekId: next.id, lines: [{ key: YOGURT, fingerprint: nl.fingerprint, packages: 1 }] });
    expect(ap.status).toBe("rejected");

    // A staple remembered with no product at all (nothing chosen for the item) stays unknown.
    await q("INSERT INTO ingredients(household_id, key, name, fixture) VALUES ($1,'oat_milk','Oat milk',true)", [fx.householdId]);
    const unmapped = { key: "oat_milk", name: "Oat milk" }; // an item nobody has chosen a product for
    expect((await captureHouseholdNeedCommand(jon, op(), { weekStart: NEXT, text: unmapped.name, ingredientKey: unmapped.key, from: "week" } as any)).status).toBe("accepted");
    expect((await staple(unmapped.key)).product_id).toBeNull();
    expect((await householdSnapshot(jon)).staples.find((x: any) => x.ingredientKey === unmapped.key)).toMatchObject({ productId: null, productAvailable: null });
    const ul = await line(next.id, unmapped.key);
    expect(ul.product).toBeNull();
    expect(ul.unresolved).toContain("No product chosen for this ingredient");
  });

  it("B12f: remembering a usual quantity never changes the remembered product", async () => {
    const { fx, jon } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect((await approveStaple(jon, fage, 1)).status).toBe("accepted");
    // The household's current product choice for the item is still the original tub...
    expect((await q<any>("SELECT product_id FROM product_mappings WHERE ingredient_key=$1", [YOGURT]))[0].product_id).toBe(fx.products[YOGURT]);
    // ...and setting the usual quantity (which used to copy that mapping) leaves the decision alone.
    expect((await tap(jon, { weekStart: NEXT }, { packages: 3, rememberUsual: true })).status).toBe("accepted");
    const s = await staple();
    expect([s.product_id, s.product_revision, s.usual_packages]).toEqual([fage, 2, 3]);
  });
});

/**
 * B16 — household staple management, and the cross-feature scenarios A–D from the B15/B16
 * directive, against real PostgreSQL through the real command path. Concurrency is ordered with
 * the database barrier (`race`) in both commit orders.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { fresh, line, op, q, race, retailerCalls } from "./helpers";
import { EXPORT_TABLES, NOT_EXPORTED, exportHousehold } from "@/server/export";
import {
  approvePurchaseLinesCommand, approveStapleProductCommand, captureHouseholdNeedCommand, chooseProductCommand, confirmOrderCommand, recordReceiptCommand,
  removeRequestCommand, validateSubstitutionCommand,
} from "@/server/commands/groceries";
import { addStapleCommand, setStapleActiveCommand, updateStapleCommand } from "@/server/commands/staples";
import { startHandoff } from "@/server/commands/purchasing";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";

const NEXT = "2026-10-19";
const codeOf = (r: any) => r.code as string | undefined;
const YOGURT = "greek_yogurt";

async function addProduct(householdId: string, name: string, opts: { retailer?: "simulated" | "kroger"; qty?: string; unit?: string; key?: string } = {}) {
  const id = randomUUID();
  await q(
    `INSERT INTO products(id, household_id, retailer, product_ref, name, ingredient_key, package_qty, package_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, householdId, opts.retailer ?? "simulated", `test:${id}`, name, opts.key ?? YOGURT, opts.qty ?? "35", opts.unit ?? "oz"],
  );
  await q("INSERT INTO price_observations(household_id, product_id, amount_minor, source, observed_at) VALUES ($1,$2,699,'manual','2026-10-12T18:00:00Z')", [householdId, id]);
  return id;
}
const staple = async (key = YOGURT) => (await q<any>("SELECT * FROM household_staples WHERE ingredient_key=$1", [key]))[0];
const snapStaple = async (who: Actor, key = YOGURT) => (await householdSnapshot(who)).staples.find((x: any) => x.ingredientKey === key);
const weekRow = async (hh: string, ws: string) => (await q<any>("SELECT * FROM weeks WHERE household_id=$1 AND week_start=$2", [hh, ws]))[0];
const summary = async (weekId: string) => (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
const tap = (actor: Actor, where: { weekId?: string; weekStart?: string }, key = YOGURT, text = "Plain Greek yogurt") =>
  captureHouseholdNeedCommand(actor, op(), { ...where, text, ingredientKey: key, from: "week" } as any);
const edit = (actor: Actor, rev: number, usual: { quantity: string; unit: string }, displayName: string | null = null, key = YOGURT) =>
  updateStapleCommand(actor, op(), { ingredientKey: key, expectedRevision: rev, displayName, usual });
async function approveAll(actor: Actor, weekId: string) {
  const ls = (await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]))
    .map((r) => r.line)
    .filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0 && !l.approval?.valid);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
}
const purchasing = async () => ({
  approvals: await q("SELECT id, ingredient_key, product_id, packages, line_fingerprint, state FROM purchase_approvals ORDER BY id"),
  batches: await q("SELECT * FROM handoff_batches ORDER BY id"),
  batchLines: await q("SELECT * FROM handoff_batch_lines ORDER BY batch_id, ingredient_key"),
  statuses: await q("SELECT * FROM handoff_status_events ORDER BY id"),
  orders: await q("SELECT * FROM orders ORDER BY id"),
  orderLines: await q("SELECT * FROM order_lines ORDER BY id"),
  receipts: await q("SELECT * FROM receipt_observations ORDER BY id"),
  validations: await q("SELECT * FROM substitution_validations ORDER BY id"),
  requests: await q("SELECT id, ingredient_key, kind, packages, product_id, state FROM household_requests ORDER BY id"),
  retailerCalls: await retailerCalls(),
});

describe("B16 staple management", () => {
  it("B16a: add, view, rename and set a usual amount in packages or a measured unit; future taps use it", async () => {
    const { fx, jon, alex } = await fresh();
    const r = await addStapleCommand(jon, op(), { ingredientKey: YOGURT, displayName: "Breakfast yogurt", usual: { quantity: "64", unit: "oz" } });
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    // 64 oz of a 32 oz tub = 2 packages; product = the household's current choice for the item.
    expect(await snapStaple(alex)).toMatchObject({
      name: "Breakfast yogurt", ingredientName: "Plain Greek yogurt", active: true, detailsRevision: 1, usual: { quantity: "64", unit: "oz" }, usualPackages: 2,
      productId: fx.products[YOGURT], productName: "Plain Greek yogurt 32 oz tub", productAvailable: true, updatedBy: "Jon", lastChange: { kind: "created", by: "Jon" },
    });
    expect(await q("SELECT 1 FROM staple_product_decisions")).toHaveLength(0); // no explicit product decision was made

    // Alex renames it and changes the amount to 40 oz (rounds up to 2 tubs, never down).
    const e = await edit(alex, 1, { quantity: "40", unit: "ounces" }, "  Morning   yogurt ");
    expect(e.status, JSON.stringify(e)).toBe("accepted");
    expect(await snapStaple(jon)).toMatchObject({ name: "Morning yogurt", detailsRevision: 2, usual: { quantity: "40", unit: "oz" }, usualPackages: 2, updatedBy: "Alex", lastChange: { kind: "edited", by: "Alex" } });
    // In packages.
    expect((await edit(jon, 2, { quantity: "3", unit: "package" }, "Morning yogurt")).status).toBe("accepted");
    expect(await snapStaple(jon)).toMatchObject({ usual: { quantity: "3", unit: "package" }, usualPackages: 3, detailsRevision: 3 });
    // A one-tap request uses the current product and usual quantity.
    expect((await tap(alex, { weekStart: NEXT }, YOGURT, "Morning yogurt")).status).toBe("accepted");
    const next = await weekRow(fx.householdId, NEXT);
    expect(await line(next.id, YOGURT)).toMatchObject({ packagesUsual: 3, product: { id: fx.products[YOGURT] } });

    // Field-tagged refusals; nothing changes.
    for (const [usual, field] of [
      [{ quantity: "2", unit: "fl_oz" }, "unit"], // a 32 oz (mass) tub cannot be measured in fluid ounces
      [{ quantity: "0", unit: "package" }, "quantity"],
      [{ quantity: "1.5", unit: "package" }, "quantity"],
      [{ quantity: "abc", unit: "oz" }, "quantity"],
      [{ quantity: "5000", unit: "oz" }, "quantity"],
      [{ quantity: "2", unit: "bushel" }, "unit"],
    ] as const) {
      const x = await edit(jon, 3, usual);
      expect(x.status === "rejected" && [x.code, (x.details as any)?.field], JSON.stringify(usual)).toEqual(["invalid", field]);
    }
    const long = await edit(jon, 3, { quantity: "1", unit: "package" }, "x".repeat(81));
    expect(long.status === "rejected" && (long.details as any)?.field).toBe("displayName");
    expect((await staple()).details_revision).toBe(3);
    // The change log is append-only and complete.
    expect((await q<any>("SELECT kind, details_revision FROM staple_changes ORDER BY id")).map((x) => `${x.kind}@${x.details_revision}`)).toEqual(["created@1", "edited@2", "edited@3"]);
    await expect(q("UPDATE staple_changes SET kind='edited'")).rejects.toThrow();
  });

  it("B16b: adding validates the item and product; an explicit product is a recorded decision", async () => {
    const { fx, jon } = await fresh();
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    const kroger = await addProduct(fx.householdId, "Kroger yogurt", { retailer: "kroger" });
    expect(codeOf(await addStapleCommand(jon, op(), { ingredientKey: "nope", usual: { quantity: "1", unit: "package" } }))).toBe("not_found");
    expect(codeOf(await addStapleCommand(jon, op(), { ingredientKey: YOGURT, productId: kroger }))).toBe("product_unavailable");
    expect(codeOf(await addStapleCommand(jon, op(), { ingredientKey: YOGURT, productId: fx.products.salmon }))).toBe("unknown_product");
    expect(await staple()).toBeUndefined();
    const r = await addStapleCommand(jon, op(), { ingredientKey: YOGURT, productId: fage, usual: { quantity: "1", unit: "package" } });
    expect(r.status).toBe("accepted");
    expect((await q<any>("SELECT product_id, previous_product_id, staple_revision FROM staple_product_decisions"))).toEqual([{ product_id: fage, previous_product_id: null, staple_revision: 1 }]);
    const again = await addStapleCommand(jon, op(), { ingredientKey: YOGURT });
    expect(again.status === "rejected" && [again.code, (again.details as any).field]).toEqual(["already_staple", "ingredientKey"]);
    // No product at all for an item: the staple is kept with an unknown product, and a measured amount is refused.
    await q("INSERT INTO ingredients(household_id, key, name, fixture) VALUES ($1,'oat_milk','Oat milk',true)", [fx.householdId]);
    const measured = await addStapleCommand(jon, op(), { ingredientKey: "oat_milk", usual: { quantity: "64", unit: "fl_oz" } });
    expect(measured.status === "rejected" && (measured.details as any).field).toBe("unit");
    expect((await addStapleCommand(jon, op(), { ingredientKey: "oat_milk" })).status).toBe("accepted");
    expect(await snapStaple(jon, "oat_milk")).toMatchObject({ productId: null, productAvailable: null, usual: { quantity: "1", unit: "package" } });
  });

  it("B16c: removing hides the shortcut only; restore brings it back; a removed staple cannot be edited or re-pointed", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await addStapleCommand(jon, op(), { ingredientKey: YOGURT, usual: { quantity: "2", unit: "package" } })).status).toBe("accepted");
    const off = await setStapleActiveCommand(alex, op(), { ingredientKey: YOGURT, expectedRevision: 1, active: false });
    expect(off.status).toBe("accepted");
    expect(await snapStaple(jon)).toMatchObject({ active: false, detailsRevision: 2, updatedBy: "Alex", lastChange: { kind: "deactivated", by: "Alex" } });
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect(codeOf(await approveStapleProductCommand(jon, op(), { ingredientKey: YOGURT, productId: fage, expectedRevision: 1 }))).toBe("staple_inactive");
    expect(codeOf(await edit(jon, 2, { quantity: "1", unit: "package" }))).toBe("staple_inactive");
    expect(codeOf(await addStapleCommand(jon, op(), { ingredientKey: YOGURT }))).toBe("staple_inactive");
    // A typed capture of the item is an ordinary request: no usual amount or remembered product, and no silent restore.
    const t = await tap(jon, { weekStart: NEXT });
    expect(t.status === "accepted" && t.result.productIntent).toBeNull();
    const next = await weekRow(fx.householdId, NEXT);
    expect((await line(next.id, YOGURT)).packagesUsual).toBe(1);
    expect((await staple()).active).toBe(false);
    // Restore against the current revision.
    expect((await setStapleActiveCommand(jon, op(), { ingredientKey: YOGURT, expectedRevision: 2, active: true })).status).toBe("accepted");
    expect(await snapStaple(alex)).toMatchObject({ active: true, detailsRevision: 3, usualPackages: 2, lastChange: { kind: "restored", by: "Jon" } });
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`Scenario A: concurrent edits of one staple — the first decision survives, the second sees a conflict with the current value — ${order}`, async () => {
      const { fx, jon, alex } = await fresh();
      expect((await addStapleCommand(jon, op(), { ingredientKey: YOGURT })).status).toBe("accepted");
      const jonEdit = () => edit(jon, 1, { quantity: "2", unit: "package" }, "Jon's yogurt");
      const alexEdit = () => edit(alex, 1, { quantity: "4", unit: "package" }, "Alex's yogurt");
      const [x, y] = await race(fx.householdId, order === "Jon first" ? jonEdit : alexEdit, order === "Jon first" ? alexEdit : jonEdit);
      const [winName, winQty, loser, loserEdit] = order === "Jon first" ? ["Jon's yogurt", "2", alex, () => edit(alex, 2, { quantity: "4", unit: "package" }, "Alex's yogurt")] : ["Alex's yogurt", "4", jon, () => edit(jon, 2, { quantity: "2", unit: "package" }, "Jon's yogurt")];
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("stale_staple");
      expect(y.status === "rejected" && y.details).toMatchObject({ current: { displayName: winName, usual: { quantity: winQty, unit: "package" }, revision: 2 } });
      expect(y.status === "rejected" && y.message).toContain(order === "Jon first" ? "Jon changed your usual Jon's yogurt" : "Alex changed your usual Alex's yogurt");
      expect(await snapStaple(loser)).toMatchObject({ name: winName, usualPackages: Number(winQty), detailsRevision: 2 });
      // Having reviewed the current value, the second member can resubmit deliberately.
      expect((await loserEdit()).status).toBe("accepted");
      expect((await staple()).details_revision).toBe(3);
    });

    it(`Scenario A: an edit racing a removal — whichever commits second is refused — ${order}`, async () => {
      const { fx, jon, alex } = await fresh();
      expect((await addStapleCommand(jon, op(), { ingredientKey: YOGURT })).status).toBe("accepted");
      const jonEdits = () => edit(jon, 1, { quantity: "3", unit: "package" });
      const alexRemoves = () => setStapleActiveCommand(alex, op(), { ingredientKey: YOGURT, expectedRevision: 1, active: false });
      const [x, y] = order === "Jon first" ? await race(fx.householdId, jonEdits, alexRemoves) : await race(fx.householdId, alexRemoves, jonEdits);
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("stale_staple");
      const s = await staple();
      expect([s.active, s.usual_packages, s.details_revision]).toEqual(order === "Jon first" ? [true, 3, 2] : [false, 1, 2]);
    });
  }

  it("Scenario B: staple changes during Alex's grocery review leave the reviewed purchase intact and sendable", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted"); // creates the staple with the current tub
    await approveAll(alex, fx.weekId);
    const review = await summary(fx.weekId);
    const before = await purchasing();
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect((await edit(jon, 1, { quantity: "3", unit: "package" }, "Yogurt")).status).toBe("accepted");
    expect((await approveStapleProductCommand(jon, op(), { ingredientKey: YOGURT, productId: fage, expectedRevision: 1 })).status).toBe("accepted");
    // What Alex reviewed is what she can send: same review, same approvals, same requests.
    expect(await purchasing()).toEqual(before);
    expect((await summary(fx.weekId)).reviewFingerprint).toBe(review.reviewFingerprint);
    const s = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: review.reviewFingerprint, payloadHash: review.payloadHash });
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(await retailerCalls()).toBe(1);
    const sent = (await q<any>("SELECT payload FROM handoff_batches"))[0].payload.find((i: any) => i.ingredientKey === YOGURT);
    expect(sent).toMatchObject({ packages: 1, productRef: (await q<any>("SELECT product_ref FROM products WHERE id=$1", [fx.products[YOGURT]]))[0].product_ref });
  });

  it("Scenario B: choosing the new product for this pickup withdraws only that line's approval; the old review cannot authorize Send", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    await approveAll(alex, fx.weekId);
    const review = await summary(fx.weekId);
    const approvedBefore = (await q<any>("SELECT ingredient_key, line_fingerprint FROM purchase_approvals WHERE state='active' ORDER BY ingredient_key")).filter((a) => a.ingredient_key !== YOGURT);
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    const r = await chooseProductCommand(jon, op(), { weekId: fx.weekId, ingredientKey: YOGURT, productId: fage, expectedProductId: fx.products[YOGURT] });
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const y = await line(fx.weekId, YOGURT);
    expect([y.product.id, y.status, y.approval?.valid ?? false]).toEqual([fage, "needs_review", false]);
    // Every other approval is untouched and still valid.
    const after = (await q<any>("SELECT ingredient_key, line_fingerprint FROM purchase_approvals WHERE state='active' ORDER BY ingredient_key")).filter((a) => a.ingredient_key !== YOGURT);
    expect(after).toEqual(approvedBefore);
    for (const a of after) expect((await line(fx.weekId, a.ingredient_key)).approval?.valid, a.ingredient_key).toBe(true);
    const s = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: review.reviewFingerprint, payloadHash: review.payloadHash });
    expect(s.status === "rejected" && s.code).toBe("stale_review");
    expect(await retailerCalls()).toBe(0);
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`Scenario B/E: two product choices for the same pickup line made against the same view — ${order}`, async () => {
      const { fx, jon, alex } = await fresh();
      expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
      const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
      const chobani = await addProduct(fx.householdId, "Chobani 32 oz");
      const seen = fx.products[YOGURT];
      const j = () => chooseProductCommand(jon, op(), { weekId: fx.weekId, ingredientKey: YOGURT, productId: fage, expectedProductId: seen });
      const a = () => chooseProductCommand(alex, op(), { weekId: fx.weekId, ingredientKey: YOGURT, productId: chobani, expectedProductId: seen });
      const [x, y] = order === "Jon first" ? await race(fx.householdId, j, a) : await race(fx.householdId, a, j);
      const winner = order === "Jon first" ? fage : chobani;
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("product_changed");
      expect(y.status === "rejected" && y.details).toMatchObject({ current: { productId: winner } });
      expect((await line(fx.weekId, YOGURT)).product.id).toBe(winner);
    });
  }

  it("Scenario C: removing a staple with outstanding demand removes its shortcut, not the grocery need", async () => {
    const { fx, jon, alex } = await fresh();
    // Rice is needed by this week's dinners AND requested as a usual item.
    expect((await tap(jon, { weekId: fx.weekId }, "rice", "Jasmine rice")).status).toBe("accepted");
    const before = await line(fx.weekId, "rice");
    expect(before.meal).not.toBeNull();
    expect(before.requests).toHaveLength(1);
    const rows = await purchasing();
    expect((await setStapleActiveCommand(alex, op(), { ingredientKey: "rice", expectedRevision: 1, active: false })).status).toBe("accepted");
    expect(await line(fx.weekId, "rice")).toEqual(before);
    expect(await purchasing()).toEqual(rows);
    expect(await snapStaple(jon, "rice")).toMatchObject({ active: false });
    // A later typed request still reaches the same list (merging with the existing one).
    const again = await tap(alex, { weekId: fx.weekId }, "rice", "Jasmine rice");
    expect(again.status === "accepted" && again.result.merged).toBe(true);
    expect((await line(fx.weekId, "rice")).meal).toEqual(before.meal);
  });

  it("Scenario D: after an order is confirmed and received, staple changes leave product identities, quantities, receipts and transfers unchanged", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    await approveAll(alex, fx.weekId);
    const sum = await summary(fx.weekId);
    expect((await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: sum.reviewFingerprint, payloadHash: sum.payloadHash })).status).toBe("accepted");
    const items = (await q<any>("SELECT payload FROM handoff_batches")).flatMap((b) => b.payload);
    const prods = await q<any>("SELECT id, ingredient_key FROM products");
    const conf = await confirmOrderCommand(alex, op(), {
      weekId: fx.weekId, contentsKnown: true, pickupAt: "2026-10-12T21:00:00Z",
      lines: items.map((i: any) => ({ ingredientKey: i.ingredientKey, productId: prods.find((p) => p.ingredient_key === i.ingredientKey)?.id ?? null, name: i.ingredientKey, packages: i.packages })),
    } as any);
    expect(conf.status, JSON.stringify(conf)).toBe("accepted");
    const ol = await q<any>("SELECT id, ingredient_key, packages FROM order_lines ORDER BY name");
    const yog = ol.find((l) => l.ingredient_key === YOGURT);
    const sub = await recordReceiptCommand(alex, op(), { orderLineId: yog.id, state: "substituted", packages: yog.packages, substituteText: "Skyr 32 oz" } as any);
    expect(sub.status).toBe("accepted");
    const subId = (await q<any>("SELECT id FROM receipt_observations WHERE order_line_id=$1", [yog.id]))[0].id;
    expect((await validateSubstitutionCommand(alex, op(), { receiptId: subId, suitable: true, quantity: "32", unit: "oz" })).status).toBe("accepted");
    const rice = ol.find((l) => l.ingredient_key === "rice");
    expect((await recordReceiptCommand(alex, op(), { orderLineId: rice.id, state: "received", packages: rice.packages } as any)).status).toBe("accepted");
    const history = await purchasing();
    const lineBefore = await line(fx.weekId, YOGURT);

    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect((await approveStapleProductCommand(jon, op(), { ingredientKey: YOGURT, productId: fage, expectedRevision: 1 })).status).toBe("accepted");
    expect((await edit(jon, 1, { quantity: "70", unit: "oz" })).status).toBe("accepted"); // 2 Fage tubs
    expect((await setStapleActiveCommand(alex, op(), { ingredientKey: YOGURT, expectedRevision: 2, active: false })).status).toBe("accepted");
    expect(await purchasing()).toEqual(history);
    expect(await line(fx.weekId, YOGURT)).toEqual(lineBefore);
  });

  it("re-pointing a staple with a measured usual amount re-expresses it in the new product's packages, or refuses an unconvertible product", async () => {
    const { fx, jon } = await fresh();
    expect((await addStapleCommand(jon, op(), { ingredientKey: YOGURT, usual: { quantity: "64", unit: "oz" } })).status).toBe("accepted");
    expect((await staple()).usual_packages).toBe(2);
    const small = await addProduct(fx.householdId, "Small tub 16 oz", { qty: "16" });
    expect((await approveStapleProductCommand(jon, op(), { ingredientKey: YOGURT, productId: small, expectedRevision: 1 })).status).toBe("accepted");
    expect((await staple()).usual_packages).toBe(4); // 64 oz in 16 oz tubs
    expect((await snapStaple(jon))!.usual).toEqual({ quantity: "64", unit: "oz" });
    const big = await addProduct(fx.householdId, "Big tub 48 oz", { qty: "48" });
    expect((await approveStapleProductCommand(jon, op(), { ingredientKey: YOGURT, productId: big, expectedRevision: 2 })).status).toBe("accepted");
    expect((await staple()).usual_packages).toBe(2); // 64/48 rounds up
    const cups = await addProduct(fx.householdId, "Yogurt cups (4)", { qty: "4", unit: "each" });
    const r = await approveStapleProductCommand(jon, op(), { ingredientKey: YOGURT, productId: cups, expectedRevision: 3 });
    expect(r.status === "rejected" && r.code).toBe("invalid");
    expect([(await staple()).product_id, (await staple()).product_revision]).toEqual([big, 3]);
  });

  it("line product issues are explicit: none chosen, unavailable, conflicting", async () => {
    const { fx, jon } = await fresh();
    await q("INSERT INTO ingredients(household_id, key, name, fixture) VALUES ($1,'oat_milk','Oat milk',true)", [fx.householdId]);
    expect((await tap(jon, { weekId: fx.weekId }, "oat_milk", "Oat milk")).status).toBe("accepted");
    expect((await line(fx.weekId, "oat_milk")).productIssue).toBe("none_chosen");
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    expect((await line(fx.weekId, YOGURT)).productIssue).toBeNull();
    const kroger = await addProduct(fx.householdId, "Kroger yogurt", { retailer: "kroger" });
    await q("UPDATE household_requests SET product_id=$1 WHERE ingredient_key=$2", [kroger, YOGURT]);
    expect(codeOf(await chooseProductCommand(jon, op(), { weekId: fx.weekId, ingredientKey: YOGURT, productId: kroger }))).toBe("product_unavailable");
    // (recompute through an unrelated purchasing input change)
    expect((await chooseProductCommand(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", productId: fx.products.rice })).status).toBe("accepted");
    expect((await line(fx.weekId, YOGURT)).productIssue).toBe("unavailable");
  });
});

// Findings from the independent review of the B15/B16 diff, each reproduced as a regression.
describe("B15/B16 review regressions", () => {
  it("a product choice naming another household's week is refused without revealing that week's product", async () => {
    const { fx, jon, other } = await fresh();
    const theirs = await q<any>("SELECT id FROM weeks WHERE household_id=$1 LIMIT 1", [fx.otherHouseholdId]);
    const weekId = theirs[0]?.id ?? (await q<any>("INSERT INTO weeks(household_id, week_start) VALUES ($1,'2026-10-12') RETURNING id", [fx.otherHouseholdId]))[0].id;
    const events = (await q("SELECT count(*)::int n FROM change_events WHERE household_id=$1", [fx.householdId]))[0];
    for (const expectedProductId of [undefined, "x", null]) {
      const r = await chooseProductCommand(jon, op(), { weekId, ingredientKey: YOGURT, productId: fx.products[YOGURT], ...(expectedProductId === undefined ? {} : { expectedProductId }) } as any);
      expect(r.status === "rejected" && [r.code, r.details ?? null]).toEqual(["not_found", null]);
    }
    expect((await q("SELECT count(*)::int n FROM change_events WHERE household_id=$1", [fx.householdId]))[0]).toEqual(events);
    void other;
  });

  it("'last changed by' includes product decisions", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await addStapleCommand(jon, op(), { ingredientKey: YOGURT })).status).toBe("accepted");
    expect((await edit(jon, 1, { quantity: "2", unit: "package" })).status).toBe("accepted");
    const fage = await addProduct(fx.householdId, "Fage Total 35 oz");
    expect((await approveStapleProductCommand(alex, op(), { ingredientKey: YOGURT, productId: fage, expectedRevision: 1 })).status).toBe("accepted");
    expect((await snapStaple(jon))!.lastChange).toMatchObject({ kind: "product", by: "Alex" });
  });

  it("a substitution decision made against an older view is refused, not silently replaced", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    const sum = await summary(fx.weekId);
    expect((await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: sum.reviewFingerprint, payloadHash: sum.payloadHash })).status).toBe("accepted");
    const items = (await q<any>("SELECT payload FROM handoff_batches")).flatMap((b) => b.payload);
    expect((await confirmOrderCommand(alex, op(), { weekId: fx.weekId, contentsKnown: true, pickupAt: null, lines: items.map((i: any) => ({ ingredientKey: i.ingredientKey, name: i.ingredientKey, packages: i.packages })) } as any)).status).toBe("accepted");
    const salmon = (await q<any>("SELECT id, packages FROM order_lines WHERE ingredient_key='salmon'"))[0];
    expect((await recordReceiptCommand(alex, op(), { orderLineId: salmon.id, state: "substituted", packages: salmon.packages, substituteText: "Arctic char" } as any)).status).toBe("accepted");
    const rid = (await q<any>("SELECT id FROM receipt_observations"))[0].id;
    // Both saw "not decided yet"; Alex decides first.
    expect((await validateSubstitutionCommand(alex, op(), { receiptId: rid, suitable: true, quantity: "12", unit: "oz", expectedValidationId: null })).status).toBe("accepted");
    const late = await validateSubstitutionCommand(jon, op(), { receiptId: rid, suitable: false, expectedValidationId: null });
    expect(late.status === "rejected" && [late.code, late.message]).toEqual(["stale_target", "Alex already decided this substitute works. Review it before deciding again."]);
    expect(await q<any>("SELECT suitable FROM substitution_validations")).toEqual([{ suitable: true }]);
    // A deliberate re-decision against the current one is allowed.
    const current = (await q<any>("SELECT id FROM substitution_validations"))[0].id;
    expect((await validateSubstitutionCommand(jon, op(), { receiptId: rid, suitable: false, expectedValidationId: current })).status).toBe("accepted");
  });

  it("removing a request is refused when someone joined it after the confirmation was shown", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await tap(jon, { weekId: fx.weekId })).status).toBe("accepted");
    const req = (await q<any>("SELECT id FROM household_requests WHERE ingredient_key=$1", [YOGURT]))[0].id;
    expect((await tap(alex, { weekId: fx.weekId })).status).toBe("accepted"); // Alex joins
    const r = await removeRequestCommand(jon, op(), { requestId: req, expectedContributorIds: [fx.members.jon] });
    expect(r.status === "rejected" && r.code).toBe("stale_target");
    expect((await q<any>("SELECT state FROM household_requests WHERE id=$1", [req]))[0].state).toBe("active");
    expect((await removeRequestCommand(jon, op(), { requestId: req, expectedContributorIds: [fx.members.alex, fx.members.jon] })).status).toBe("accepted");
  });

  it("the household export covers every household table (staples included) and restores them", async () => {
    const { fx, jon } = await fresh();
    const tables = (await q<any>("SELECT DISTINCT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='household_id'")).map((r) => r.table_name);
    const covered = new Set([...EXPORT_TABLES.map((s) => s.table), ...NOT_EXPORTED]);
    expect(tables.filter((t) => !covered.has(t))).toEqual([]);
    expect((await addStapleCommand(jon, op(), { ingredientKey: YOGURT, displayName: "Yogurt", usual: { quantity: "64", unit: "oz" } })).status).toBe("accepted");
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    try {
      const data = await exportHousehold(c, fx.householdId);
      expect(data.tables.household_staples).toHaveLength(1);
      expect(data.tables.household_staples[0]).toMatchObject({ display_name: "Yogurt", usual_unit: "oz" });
      expect(data.tables.staple_changes).toHaveLength(1);
    } finally {
      await c.end();
    }
  });
});

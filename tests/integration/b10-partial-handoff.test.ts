/**
 * B10 — explicit partial grocery handoff (simulated retailer, real PostgreSQL). The ordinary Send keeps
 * its whole-list readiness; "send supported items" is a separate, reviewed action bound to the subset AND
 * to the reviewed omissions. Only selected, approved, store-sold, priced lines are frozen and sent; their
 * approvals alone are consumed; everything else stays outstanding with its reason.
 */
import { describe, expect, it } from "vitest";
import { fresh, op, q, race } from "./helpers";
import { approvePurchaseLinesCommand, confirmOrderCommand, recordPriceCommand, recordAvailabilityCommand } from "@/server/commands/groceries";
import { resolveUncertainTransferCommand, startHandoff, startPartialHandoff } from "@/server/commands/purchasing";
import { setShoppingDestinationCommand } from "@/server/commands/destinations";
import { householdSnapshot } from "@/server/queries/snapshot";
import { recomputeProjection } from "@/server/groceries/recompute";
import { inTransaction } from "@/server/db/pool";
import { omissionsFor } from "@/domain/groceries/partial-handoff";
import type { Actor } from "@/server/commands/framework";

const cmd = (p: Promise<unknown>): Promise<any> => p.then((r) => r, (e: Error) => ({ status: "threw", code: `threw: ${e.message}` }));
const lines = async (weekId: string) =>
  (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId])).map((r) => r.line);
const line = async (weekId: string, key: string) => (await lines(weekId)).find((l) => l.key === key);
const calls = () => q<any>("SELECT request_body, behavior FROM fake_retailer_calls ORDER BY id");
const recompute = (householdId: string, weekId: string) =>
  inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
    await recomputeProjection(c, householdId, weekId);
  });

async function approve(actor: Actor, weekId: string, keys: string[]) {
  const ls = (await lines(weekId)).filter((l) => keys.includes(l.key));
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
}
async function review(actor: Actor) {
  const s: any = await householdSnapshot(actor);
  return { partial: s.groceries.partial, summary: s.groceries.summary, snapshot: s };
}
async function sendPartial(actor: Actor, weekId: string, selected: string[], over?: { ack?: string[]; partial?: any }) {
  const { partial } = over?.partial ? { partial: over.partial } : await review(actor);
  return startPartialHandoff(actor, op(), {
    weekId, reviewFingerprint: partial.reviewFingerprint, partialFingerprint: partial.partialFingerprint, selectedKeys: selected,
    acknowledgedOmissions: over?.ack ?? omissionsFor(partial, selected).map((o) => o.key),
  }) as Promise<any>;
}

/** Cheese has no price, cucumber has no product, olive oil isn't approved; seven lines are fully ready. */
async function mixed() {
  const env = await fresh({ unpricedCheese: true });
  const { fx, jon } = env;
  await q("DELETE FROM product_mappings WHERE household_id=$1 AND ingredient_key='cucumber'", [fx.householdId]);
  await recompute(fx.householdId, fx.weekId);
  await approve(jon, fx.weekId, ["black_beans", "broccoli", "rice", "salmon", "soy_sauce", "tofu", "tortillas"]);
  return env;
}
const READY = ["black_beans", "broccoli", "rice", "salmon", "soy_sauce", "tofu", "tortillas"];

describe("B10 partial handoff", () => {
  it("B10-01: mixed items — Send stays whole-list only; the partial review names exactly what can go and why the rest can't", async () => {
    const { jon, fx } = await mixed();
    const { partial, summary } = await review(jon);
    expect(summary.ready).toBe(false);
    expect((await startHandoff(jon, op(), { weekId: fx.weekId, reviewFingerprint: summary.reviewFingerprint, payloadHash: summary.payloadHash })).status).toBe("rejected");
    expect(partial.blockers).toEqual([]);
    expect(partial.eligible.map((e: any) => [e.key, e.packages, e.priceMinor])).toEqual([
      ["black_beans", 1, 109], ["broccoli", 2, 249], ["rice", 1, 399], ["salmon", 1, 1099], ["soy_sauce", 1, 279], ["tofu", 1, 229], ["tortillas", 1, 299],
    ]);
    expect(partial.omitted.map((o: any) => [o.key, o.code])).toEqual([
      ["cheese", "price_unknown"], ["chicken_thigh", "not_approved"], ["cucumber", "no_product"], ["greek_yogurt", "not_approved"],
      ["olive_oil", "not_approved"], ["pita", "not_approved"],
    ]);
    expect(await calls()).toEqual([]);
  });

  it("B10-02: the exact selected subset is frozen and sent; only its approvals are consumed; the remainder stays outstanding", async () => {
    const { jon, alex, fx } = await mixed();
    const selected = ["broccoli", "rice", "salmon"];
    const r = await sendPartial(jon, fx.weekId, selected);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect(r.dispatch.status).toBe("acknowledged");
    const sent = await calls();
    expect(sent).toHaveLength(1);
    expect(sent[0].request_body).toEqual({ items: [{ upc: "SIM-BROCCOLI", quantity: 2 }, { upc: "SIM-RICE", quantity: 1 }, { upc: "SIM-SALMON", quantity: 1 }] });
    const [b] = await q<any>("SELECT scope, payload, omissions FROM handoff_batches");
    expect(b.scope).toBe("partial");
    expect(b.payload).toEqual([
      { productRef: "SIM-BROCCOLI", ingredientKey: "broccoli", packages: 2 }, { productRef: "SIM-RICE", ingredientKey: "rice", packages: 1 }, { productRef: "SIM-SALMON", ingredientKey: "salmon", packages: 1 },
    ]);
    expect(b.omissions.omitted.map((o: any) => [o.key, o.code, o.toSend])).toEqual([
      ["black_beans", "not_selected", 1], ["cheese", "price_unknown", 1], ["chicken_thigh", "not_approved", 2], ["cucumber", "no_product", null],
      ["greek_yogurt", "not_approved", 1], ["olive_oil", "not_approved", 1], ["pita", "not_approved", 1], ["soy_sauce", "not_selected", 1],
      ["tofu", "not_selected", 1], ["tortillas", "not_selected", 1],
    ]);
    const ap = await q<any>("SELECT ingredient_key, state FROM purchase_approvals ORDER BY ingredient_key");
    expect(Object.fromEntries(ap.map((a) => [a.ingredient_key, a.state]))).toEqual({
      black_beans: "active", broccoli: "consumed", rice: "consumed", salmon: "consumed", soy_sauce: "active", tofu: "active", tortillas: "active",
    });
    // Sent demand is not offered again; deselected lines keep valid approvals; omitted demand is untouched.
    for (const k of selected) expect(await line(fx.weekId, k)).toMatchObject({ toSend: 0, status: "in_cart_transfer" });
    for (const k of ["black_beans", "tofu"]) expect((await line(fx.weekId, k)).approval?.valid).toBe(true);
    expect(await line(fx.weekId, "cucumber")).toMatchObject({ toSend: null, product: null });
    // Both members see the partial transfer and what remains.
    const a: any = await householdSnapshot(alex);
    expect(a.groceries.batches[0]).toMatchObject({ scope: "partial", status: "acknowledged" });
    expect(a.groceries.batches[0].omitted).toHaveLength(10);
    expect(a.groceries.partial.eligible.map((e: any) => e.key)).toEqual(["black_beans", "soy_sauce", "tofu", "tortillas"]);
  });

  it("B10-03: a changed omitted line, a changed selected line, a wrong acknowledgement or an unready pick → refused, zero retailer calls", async () => {
    const { jon, fx } = await mixed();
    const before = (await review(jon)).partial;
    // An omitted line changes (cheese gets a price): the reviewed omissions changed.
    const cheese = (await line(fx.weekId, "cheese")).product.id;
    expect((await recordPriceCommand(jon, op(), { weekId: fx.weekId, productId: cheese, amountMinor: 349 })).status).toBe("accepted");
    expect(await sendPartial(jon, fx.weekId, ["rice"], { partial: before })).toMatchObject({ status: "rejected", code: "stale_review" });
    // A selected line changes (a member says they have enough rice).
    const now = (await review(jon)).partial;
    const rice = await line(fx.weekId, "rice");
    expect((await recordAvailabilityCommand(jon, op(), { weekId: fx.weekId, ingredientKey: "rice", state: "enough", reviewed: { quantity: rice.meal.quantity, unit: rice.meal.unit, fingerprint: rice.fingerprint } })).status).toBe("accepted");
    expect(await sendPartial(jon, fx.weekId, ["rice"], { partial: now })).toMatchObject({ status: "rejected", code: "stale_review" });
    const fresh2 = (await review(jon)).partial;
    expect(await sendPartial(jon, fx.weekId, ["broccoli"], { partial: fresh2, ack: ["cheese"] })).toMatchObject({ status: "rejected", code: "invalid_selection" });
    expect(await sendPartial(jon, fx.weekId, ["cucumber"], { partial: fresh2 })).toMatchObject({ status: "rejected", code: "invalid_selection" });
    expect(await sendPartial(jon, fx.weekId, [], { partial: fresh2 })).toMatchObject({ status: "rejected", code: "invalid_selection" });
    expect(await calls()).toEqual([]);
    expect(await q("SELECT 1 FROM handoff_batches")).toEqual([]);
  });

  it("B10-04: another way of shopping, a firm budget that can't be confirmed, or a store that isn't ready → no partial send", async () => {
    const { jon, fx } = await mixed();
    const { partial } = await review(jon);
    const rev = (await q<any>("SELECT destination_revision FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].destination_revision;
    expect((await cmd(setShoppingDestinationCommand(jon, op(), { weekId: fx.weekId, destination: "manual", expectedRevision: rev }))).status).toBe("accepted");
    expect(await sendPartial(jon, fx.weekId, ["rice"], { partial })).toMatchObject({ status: "rejected", code: "stale_review" });
    const manual = (await review(jon)).partial;
    expect(manual.blockers.join(" ")).toMatch(/store cart/);
    expect(await sendPartial(jon, fx.weekId, ["rice"], { partial: manual })).toMatchObject({ status: "rejected" });
    // Back to the store cart, with a firm pickup budget while cheese has no price.
    const rev2 = (await q<any>("SELECT destination_revision FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].destination_revision;
    expect((await cmd(setShoppingDestinationCommand(jon, op(), { weekId: fx.weekId, destination: "retailer_cart", expectedRevision: rev2 }))).status).toBe("accepted");
    await q("UPDATE household_settings SET budget_scope='pickup', budget_limit_minor=100000, budget_firm=true WHERE household_id=$1", [fx.householdId]);
    await recompute(fx.householdId, fx.weekId);
    const firm = (await review(jon)).partial;
    expect(firm.blockers.join(" ")).toMatch(/firm budget/);
    expect(await sendPartial(jon, fx.weekId, ["rice"], { partial: firm })).toMatchObject({ status: "rejected", code: "not_ready" });
    // A store that can't take transfers refuses before anything is frozen.
    await q("UPDATE household_settings SET budget_firm=false WHERE household_id=$1", [fx.householdId]);
    await recompute(fx.householdId, fx.weekId);
    const saved = process.env.TABLE_RETAILER;
    process.env.TABLE_RETAILER = "kroger";
    try {
      expect(await sendPartial(jon, fx.weekId, ["rice"])).toMatchObject({ status: "rejected", code: "retailer_not_ready" });
    } finally {
      process.env.TABLE_RETAILER = saved;
    }
    expect(await calls()).toEqual([]);
    expect(await q("SELECT 1 FROM handoff_batches")).toEqual([]);
  });

  it("B10-05: two sends of the same demand at once, in both orders (partial/partial, partial/full, full/partial) → one batch, one call", async () => {
    for (const order of ["pp", "pf", "fp"] as const) {
      const { jon, alex, fx } = await fresh();
      const all = (await lines(fx.weekId)).map((l) => l.key);
      await approve(jon, fx.weekId, all);
      const { partial, summary } = await review(jon);
      const p = (a: Actor) => () => sendPartial(a, fx.weekId, ["rice", "tofu"], { partial });
      const f = (a: Actor) => () => startHandoff(a, op(), { weekId: fx.weekId, reviewFingerprint: summary.reviewFingerprint, payloadHash: summary.payloadHash }) as Promise<any>;
      const [first, second] = order === "pp" ? [p(jon), p(alex)] : order === "pf" ? [p(jon), f(alex)] : [f(jon), p(alex)];
      const [ra, rb] = await race(fx.householdId, first, second);
      expect([ra.status, rb.status].sort(), order).toEqual(["accepted", "rejected"]);
      expect((await q("SELECT 1 FROM handoff_batches")).length, order).toBe(1);
      expect((await calls()).length, order).toBe(1);
    }
  });

  it("B10-06: an uncertain partial transfer leaves its demand unresolved and never resent; the remainder stays actionable; resolving it touches nothing else", async () => {
    const { jon, fx } = await mixed();
    await q("INSERT INTO fake_retailer_script(household_id, behavior) VALUES ($1,'accept_then_timeout')", [fx.householdId]);
    const r = await sendPartial(jon, fx.weekId, ["rice"]);
    expect(r.dispatch.status).toBe("uncertain");
    const p1 = (await review(jon)).partial;
    expect(p1.omitted.find((o: any) => o.key === "rice")).toMatchObject({ code: "uncertain" });
    expect(p1.eligible.map((e: any) => e.key)).not.toContain("rice");
    const r2 = await sendPartial(jon, fx.weekId, ["broccoli", "tofu"]);
    expect(r2.dispatch.status).toBe("acknowledged");
    expect((await calls()).map((c) => c.request_body.items.map((i: any) => i.upc))).toEqual([["SIM-RICE"], ["SIM-BROCCOLI", "SIM-TOFU"]]);
    const before = { tofu: await line(fx.weekId, "tofu"), beans: await line(fx.weekId, "black_beans") };
    const batch1 = (await q<any>("SELECT id FROM handoff_batches ORDER BY authorized_at LIMIT 1"))[0].id;
    expect((await resolveUncertainTransferCommand(jon, op(), { batchId: batch1, observed: "in_cart" })).status).toBe("accepted");
    expect(await line(fx.weekId, "tofu")).toMatchObject({ toSend: before.tofu.toSend, status: before.tofu.status });
    expect((await line(fx.weekId, "black_beans")).approval?.valid).toBe(true);
    expect((await calls()).length).toBe(2); // nothing resent
  });

  it("B10-07: a previously omitted item can be sent later without resending acknowledged demand; confirmed-order history is never changed", async () => {
    const { jon, fx } = await mixed();
    expect((await sendPartial(jon, fx.weekId, READY)).dispatch.status).toBe("acknowledged");
    // Later: cheese gets a price, the rest get approved — the ordinary Send now sends only what is left.
    const cheese = (await line(fx.weekId, "cheese")).product.id;
    await recordPriceCommand(jon, op(), { weekId: fx.weekId, productId: cheese, amountMinor: 349 });
    await recompute(fx.householdId, fx.weekId);
    const left = (await lines(fx.weekId)).filter((l) => l.toSend > 0 && l.product).map((l) => l.key);
    expect(left.sort()).toEqual(["cheese", "chicken_thigh", "greek_yogurt", "olive_oil", "pita"]);
    await approve(jon, fx.weekId, ["cheese"]);
    expect((await sendPartial(jon, fx.weekId, ["cheese"])).dispatch.status).toBe("acknowledged");
    const bodies = (await calls()).map((c) => c.request_body.items.map((i: any) => i.upc));
    expect(bodies[1]).toEqual(["SIM-CHEESE"]); // acknowledged demand was not sent again
    // Confirm the order, then try more: the confirmed order and its lines stay exactly as they were.
    expect((await confirmOrderCommand(jon, op(), { weekId: fx.weekId, contentsKnown: false })).status).toBe("accepted");
    const history = async () => ({ orders: await q("SELECT * FROM orders"), lines: await q("SELECT * FROM order_lines ORDER BY id"), batches: await q("SELECT * FROM handoff_batches ORDER BY authorized_at"), events: await q("SELECT * FROM handoff_status_events ORDER BY id") });
    const h0 = await history();
    await approve(jon, fx.weekId, ["olive_oil"]).catch(() => undefined);
    await sendPartial(jon, fx.weekId, ["olive_oil"]).catch(() => undefined);
    const h1 = await history();
    expect(h1.orders).toEqual(h0.orders);
    expect(h1.lines).toEqual(h0.lines);
    for (const b of h0.batches) expect(h1.batches).toContainEqual(b);
    for (const e of h0.events) expect(h1.events).toContainEqual(e);
    await expect(q("UPDATE handoff_batches SET omissions='{}'::jsonb")).rejects.toThrow();
  });
});

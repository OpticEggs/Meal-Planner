/**
 * Stage 3 contract tests: requirements, approvals, handoff, orders and receipts against
 * real PostgreSQL and the recording fake retailer.
 */
import { describe, expect, it } from "vitest";
import { fresh, line, op, q, race, retailerCalls } from "./helpers";
import { NIGHT } from "../fixtures/household";
import { applyPlanChangeCommand, createPreviewCommand, setPlateCommand } from "@/server/commands/plan";
import {
  approvePurchaseLinesCommand, captureHouseholdNeedCommand, confirmOrderCommand, recordAvailabilityCommand, recordReceiptCommand,
} from "@/server/commands/groceries";
import { recoverInterruptedDispatches, resolveUncertainTransferCommand, startHandoff } from "@/server/commands/purchasing";
import { updateSettingsCommand } from "@/server/commands/household";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";

async function lines(weekId: string) {
  return (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 ORDER BY 1", [weekId])).map((r) => r.line);
}
async function summary(weekId: string) {
  return (await q<{ projection_summary: any }>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
}
async function approveAll(actor: Actor, weekId: string) {
  const ls = (await lines(weekId)).filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
  return ls;
}
async function send(actor: Actor, weekId: string, operationId = op()) {
  const s = await summary(weekId);
  return startHandoff(actor, operationId, { weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
}
async function replaceFriday(actor: Actor, fx: any, key = "penne") {
  const p = await createPreviewCommand(actor, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes[key].versionId } });
  if (p.status !== "accepted") throw new Error(JSON.stringify(p));
  const r = await applyPlanChangeCommand(actor, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
  return r;
}
const batchStatus = async (batchId: string) => (await q<{ status: string }>("SELECT status FROM handoff_status_events WHERE batch_id=$1 ORDER BY id DESC LIMIT 1", [batchId]))[0].status;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn: () => Promise<boolean>, ms = 10_000) {
  const t = Date.now();
  while (!(await fn())) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await sleep(25);
  }
}

describe("Fixture arithmetic (explicit expected grocery lines)", () => {
  it("computes the specified quantities and packages", async () => {
    const { fx } = await fresh();
    // Chicken: Wed batch protein portions 1.5+1 (Wed) + 1+1 (Thu) + 1 (Alex lunch) = 5.5 x 6 oz = 33 oz; Sun 2 x 5 oz = 10 oz.
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.meal.quantity).toBe("1219.029"); // 43 oz in g
    expect(chicken.packagesNeeded).toBe(2); // ceil(43 / 24)
    expect(chicken.estimate).toBe(true); // variable-weight tray
    // Rice is NOT multiplied by Jon's extra chicken: Mon 150 g + Wed batch 5 x 75 g + Fri 150 g = 675 g.
    expect((await line(fx.weekId, "rice")).meal.quantity).toBe("675");
    expect((await line(fx.weekId, "rice")).packagesNeeded).toBe(1);
    // Broccoli: Mon 200 g + Wed batch 5 x 100 g = 700 g -> 2 x 1 lb.
    expect((await line(fx.weekId, "broccoli")).packagesNeeded).toBe(2);
    // Salmon: Friday 2 x 6 oz = 12 oz -> 1 pkg; Alex's usual request shares that package.
    const salmon = await line(fx.weekId, "salmon");
    expect(salmon.packagesForMeal).toBe(1);
    expect(salmon.packagesUsual).toBe(1);
    expect(salmon.packagesNeeded).toBe(1);
    // Cans stay cans: 2 x 0.5 can.
    expect((await line(fx.weekId, "black_beans")).packagesNeeded).toBe(1);
    const s = await summary(fx.weekId);
    expect(s.pickupSpending.complete).toBe(true);
  });
});

describe("T05 dinners covered, product/price unresolved", () => {
  it("shows meals chosen without asserting grocery readiness or budget compliance", async () => {
    const { fx, jon } = await fresh({ unpricedCheese: true });
    expect((await updateSettingsCommand(jon, op(), { expectedRevision: 1, budgetScope: "pickup", budgetLimitMinor: 50000, budgetFirm: false })).status).toBe("accepted");
    await approveAll(jon, fx.weekId);
    const snap = await householdSnapshot(jon);
    expect(snap.week!.mealsChosen).toBe(true);
    const s = snap.groceries!.summary;
    expect(s.ready).toBe(false);
    expect(s.readyBlockers.join(" ")).toMatch(/Cheddar cheese: price unknown/);
    expect(s.pickupSpending.complete).toBe(false);
    expect(s.pickupSpending.unknownCount).toBe(1);
    expect(s.budget.status).toBe("unknown"); // not "within" — unknown is not zero
    const cheese = await line(fx.weekId, "cheese");
    expect(cheese.pickupCostMinor).toBeNull();
    const r = await send(jon, fx.weekId);
    expect(r.status === "rejected" && r.code).toBe("not_ready");
    expect(await retailerCalls()).toBe(0);
  });
});

describe("T13 accepted meal change while the other member's grocery review is open", () => {
  it("shows the delta, keeps unaffected approvals, and stale Send makes zero outbound calls", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    const reviewed = await summary(fx.weekId);
    expect(reviewed.ready).toBe(true);
    const approvalsBefore = await q<{ ingredient_key: string; id: string }>("SELECT ingredient_key, id FROM purchase_approvals WHERE state='active' ORDER BY 1");
    await replaceFriday(jon, fx);
    // Delta visible in Alex's current review (snapshot), not only on reload.
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.packagesNeeded).toBe(3); // 53 oz
    expect(chicken.approval.valid).toBe(false);
    const salmon = await line(fx.weekId, "salmon");
    expect(salmon.meal).toBeNull();
    expect(salmon.requests).toHaveLength(1); // independent request kept
    // Unaffected approvals persist (same ids, still active and valid).
    const approvalsAfter = await q<{ ingredient_key: string; id: string }>("SELECT ingredient_key, id FROM purchase_approvals WHERE state='active' ORDER BY 1");
    for (const k of ["broccoli", "tofu", "soy_sauce", "tortillas", "black_beans", "greek_yogurt", "pita", "olive_oil"]) {
      expect(approvalsAfter.find((a) => a.ingredient_key === k)?.id).toBe(approvalsBefore.find((a) => a.ingredient_key === k)?.id);
      expect((await line(fx.weekId, k)).approval.valid).toBe(true);
    }
    expect(approvalsAfter.find((a) => a.ingredient_key === "chicken_thigh")).toBeUndefined();
    // Send with the old review at the server boundary: rejected, nothing created, nothing called.
    const r = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: reviewed.reviewFingerprint, payloadHash: reviewed.payloadHash });
    expect(r.status === "rejected" && r.code).toBe("stale_review");
    await sleep(500); // no delayed job may slip through
    expect(await retailerCalls()).toBe(0);
    expect((await q("SELECT 1 FROM handoff_batches")).length).toBe(0);
  });
});

describe("T14 replacement after order confirmation", () => {
  it("changes current requirements but never the confirmed order; new chicken is not sent; stale Send makes zero calls", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    const sent = await send(alex, fx.weekId);
    expect(sent.status).toBe("accepted");
    expect(await retailerCalls()).toBe(1);
    // The store confirmed contents that DIFFER from the transfer: broccoli was not included.
    const transferred = (await summary(fx.weekId)) && (await q<{ payload: any[] }>("SELECT payload FROM handoff_batches"))[0].payload;
    const confirmed = transferred.filter((i: any) => i.ingredientKey !== "broccoli").map((i: any) => ({ ingredientKey: i.ingredientKey, name: i.ingredientKey, packages: i.packages }));
    const o = await confirmOrderCommand(alex, op(), { weekId: fx.weekId, contentsKnown: true, lines: confirmed, pickupAt: "2026-10-13T22:00:00Z" });
    expect(o.status).toBe("accepted");
    const orderBefore = await q("SELECT * FROM order_lines ORDER BY name");
    const batchBefore = await q("SELECT * FROM handoff_batch_lines ORDER BY ingredient_key");
    const reviewedAfterOrder = await summary(fx.weekId);
    expect((await line(fx.weekId, "broccoli")).status).toBe("not_sent_yet"); // confirmation, not the transfer, is the order
    await replaceFriday(jon, fx);
    expect(await q("SELECT * FROM order_lines ORDER BY name")).toEqual(orderBefore);
    expect(await q("SELECT * FROM handoff_batch_lines ORDER BY ingredient_key")).toEqual(batchBefore);
    await expect(q("UPDATE order_lines SET packages=99")).rejects.toThrow(/immutable/);
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.ordered).toBe(2);
    expect(chicken.toSend).toBe(1);
    expect(chicken.status).toBe("not_sent_yet");
    const salmon = await line(fx.weekId, "salmon");
    expect(salmon.ordered).toBe(1); // already ordered salmon remains ordered
    expect(salmon.requests).toHaveLength(1); // independent request remains
    expect(salmon.toSend).toBe(0);
    const r = await startHandoff(jon, op(), { weekId: fx.weekId, reviewFingerprint: reviewedAfterOrder.reviewFingerprint, payloadHash: reviewedAfterOrder.payloadHash });
    expect(r.status === "rejected" && r.code).toBe("stale_review");
    await sleep(300);
    expect(await retailerCalls()).toBe(1);
  });
});

describe("T15 (handoff) duplicate click or retry", () => {
  it("one batch and one outbound call for one operation id", async () => {
    const { fx, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    const id = op();
    const s = await summary(fx.weekId);
    const req = { weekId: fx.weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash };
    const [a, b] = await Promise.all([startHandoff(alex, id, req), startHandoff(alex, id, req)]);
    const c = await startHandoff(alex, id, req);
    expect([a.status, b.status, c.status]).toEqual(["accepted", "accepted", "accepted"]);
    // Re-reading the (now changed) review and reusing the id is a different request: refused.
    const d = await send(alex, fx.weekId, id);
    expect(d.status === "rejected" && d.code).toBe("operation_id_reused");
    expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
    expect(c.replayed).toBe(true);
    expect((await q("SELECT 1 FROM handoff_batches")).length).toBe(1);
    expect(await retailerCalls()).toBe(1);
  });
});

describe("X03 purchase deduplication across different operation ids", () => {
  for (const order of ["first", "second"] as const) {
    it(`concurrent sends of the same review produce one transfer (${order} wins)`, async () => {
      const { fx, jon, alex } = await fresh();
      await approveAll(alex, fx.weekId);
      const [x, y] = await race(fx.householdId, () => send(order === "first" ? jon : alex, fx.weekId), () => send(order === "first" ? alex : jon, fx.weekId));
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("stale_review");
      expect((await q("SELECT 1 FROM handoff_batches")).length).toBe(1);
      expect(await retailerCalls()).toBe(1);
      expect((await q<{ n: number }>("SELECT count(*)::int n FROM purchase_approvals WHERE state='consumed'"))[0].n).toBeGreaterThan(0);
    });
  }
});

describe("T16 / X05 external transfer times out after possible acceptance", () => {
  it("is uncertain and never replayed automatically; granularity stays batch-level", async () => {
    const { fx, alex } = await fresh();
    await q("INSERT INTO fake_retailer_script(household_id, behavior) VALUES ($1,'accept_then_timeout')", [fx.householdId]);
    await approveAll(alex, fx.weekId);
    const r = await send(alex, fx.weekId);
    expect(r.status).toBe("accepted");
    expect((r as any).dispatch.status).toBe("uncertain");
    const batch = (await q<{ id: string }>("SELECT id FROM handoff_batches"))[0];
    expect(await batchStatus(batch.id)).toBe("uncertain");
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.status).toBe("uncertain");
    expect(chicken.uncertain).toBe(2);
    expect(chicken.toSend).toBe(0); // the ambiguous packages are not offered for resend
    const s = await summary(fx.weekId);
    expect(s.ready).toBe(false);
    const again = await send(alex, fx.weekId);
    expect(again.status).toBe("rejected");
    await sleep(300);
    expect(await retailerCalls()).toBe(1);
    // Batch-only evidence: no per-line outcome is invented.
    const ev = await q<{ evidence: any }>("SELECT evidence FROM handoff_status_events WHERE batch_id=$1 AND status='uncertain'", [batch.id]);
    expect(Object.keys(ev[0].evidence)).not.toContain("lines");
    // A member checks the real cart: items are not there. Only then can they be re-approved and re-sent deliberately.
    expect((await resolveUncertainTransferCommand(alex, op(), { batchId: batch.id, observed: "not_in_cart" })).status).toBe("accepted");
    expect((await line(fx.weekId, "chicken_thigh")).toSend).toBe(2);
    expect((await line(fx.weekId, "chicken_thigh")).approval?.valid ?? false).toBe(false);
    expect(await retailerCalls()).toBe(1);
  });

  it("a process stop after dispatch-started becomes uncertain on recovery, with no replay", async () => {
    const { fx, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    // Freeze a batch exactly as T1/T2 would, then 'crash' before any adapter call.
    await q("INSERT INTO test_barriers(name) VALUES ($1)", [`hold-dispatch:${fx.householdId}`]);
    const pending = send(alex, fx.weekId);
    await waitFor(async () => (await q("SELECT 1 FROM handoff_batches")).length === 1);
    const batch = (await q<{ id: string }>("SELECT id FROM handoff_batches"))[0];
    await q("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'dispatch_started','{\"simulated\":\"process stopped here\"}')", [batch.id]);
    await q("UPDATE test_barriers SET released_at=now() WHERE name=$1", [`hold-dispatch:${fx.householdId}`]);
    const res: any = await pending; // the resumed dispatcher sees it is no longer 'authorized' and does nothing
    expect(res.dispatch.status).toBe("dispatch_started");
    expect(await recoverInterruptedDispatches(0)).toBe(1);
    expect(await batchStatus(batch.id)).toBe("uncertain");
    expect(await retailerCalls()).toBe(0);
    expect(await recoverInterruptedDispatches(0)).toBe(0);
  });
});

describe("T17 / X04 plan change after a valid batch has started sending", () => {
  it("keeps the exact started payload; revised needs are a separate delta; nothing is reversed", async () => {
    const { fx, jon, alex } = await fresh();
    await q("INSERT INTO fake_retailer_script(household_id, behavior, barrier) VALUES ($1,'delay_until_barrier','store-slow')", [fx.householdId]);
    await q("INSERT INTO test_barriers(name) VALUES ('store-slow')");
    await approveAll(alex, fx.weekId);
    const pending = send(alex, fx.weekId);
    await waitFor(async () => (await retailerCalls()) === 1);
    const batch = (await q<{ id: string; payload: any; payload_hash: string }>("SELECT id, payload, payload_hash FROM handoff_batches"))[0];
    expect(await batchStatus(batch.id)).toBe("dispatch_started");
    await replaceFriday(jon, fx); // commits while the retailer call is in flight
    await q("UPDATE test_barriers SET released_at=now() WHERE name='store-slow'");
    const res: any = await pending;
    expect(res.dispatch.status).toBe("acknowledged");
    const after = (await q<{ payload: any; payload_hash: string }>("SELECT payload, payload_hash FROM handoff_batches WHERE id=$1", [batch.id]))[0];
    expect(after).toEqual({ payload: batch.payload, payload_hash: batch.payload_hash });
    const call = (await q<{ request_body: any }>("SELECT request_body FROM fake_retailer_calls"))[0];
    expect(call.request_body.items.find((i: any) => i.upc === "SIM-CHICKEN_THIGH").quantity).toBe(2);
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.sent).toBe(2);
    expect(chicken.toSend).toBe(1); // the separate delta
    expect(chicken.status).toBe("needs_review");
    expect(await retailerCalls()).toBe(1);
  });

  it("superseded queued work is canceled before dispatch-started (other race order)", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    await q("INSERT INTO test_barriers(name) VALUES ($1)", [`hold-dispatch:${fx.householdId}`]);
    const pending = send(alex, fx.weekId);
    await waitFor(async () => (await q("SELECT 1 FROM handoff_batches")).length === 1);
    await replaceFriday(jon, fx);
    await q("UPDATE test_barriers SET released_at=now() WHERE name=$1", [`hold-dispatch:${fx.householdId}`]);
    const res: any = await pending;
    expect(res.dispatch.status).toBe("canceled_before_dispatch");
    expect(await retailerCalls()).toBe(0);
    // Unchanged lines keep an approval for renewed review; changed lines need a new decision.
    expect((await line(fx.weekId, "broccoli")).approval.valid).toBe(true);
    expect((await line(fx.weekId, "chicken_thigh")).approval?.valid ?? false).toBe(false);
    expect((await line(fx.weekId, "chicken_thigh")).toSend).toBe(3);
  });
});

describe("T18 repeated staple taps, overlapping recipe need, explicit extra", () => {
  it("dedupes the usual request with names, keeps reasons, keeps the extra", async () => {
    const { fx, jon, alex } = await fresh();
    const tap = (a: Actor, from: "week" | "groceries" | "cook", kind: "usual" | "extra" = "usual") =>
      captureHouseholdNeedCommand(a, op(), { weekId: fx.weekId, text: "Plain Greek yogurt", from, kind });
    expect((await tap(jon, "week")).status).toBe("accepted");
    expect((await tap(jon, "groceries")).status).toBe("accepted");
    expect((await tap(alex, "cook")).status).toBe("accepted");
    let y = await line(fx.weekId, "greek_yogurt");
    expect(y.requests).toHaveLength(1);
    expect(y.requests[0].contributors).toEqual([{ memberId: fx.members.jon, name: "Jon", taps: 2 }, { memberId: fx.members.alex, name: "Alex", taps: 1 }]);
    expect(y.meal.sources[0].recipeTitle).toBe("Fixture: Chicken shawarma bowls");
    expect(y.packagesNeeded).toBe(1); // 8 oz recipe + usual tub share one 32 oz tub
    expect(Number(y.leftAfterMeal.quantity)).toBeCloseTo(680.39, 1); // 24 oz left, shown for "Keep an extra"
    expect((await tap(alex, "groceries", "extra")).status).toBe("accepted");
    y = await line(fx.weekId, "greek_yogurt");
    expect(y.packagesNeeded).toBe(2);
    // Removing the recipe removes only its demand.
    const p = await createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.sun, recipeVersionId: fx.recipes.chili.versionId } });
    await applyPlanChangeCommand(jon, op(), { previewId: String(p.status === "accepted" && p.result.previewId), reviewedHash: String(p.status === "accepted" && p.result.contentHash) });
    y = await line(fx.weekId, "greek_yogurt");
    expect(y.meal).toBeNull();
    expect(y.requests.map((r: any) => r.kind).sort()).toEqual(["extra", "usual"]);
    expect(y.packagesNeeded).toBe(2);
    // Unfamiliar entries stay text until review.
    const t = await captureHouseholdNeedCommand(alex, op(), { weekId: fx.weekId, text: "that good hot sauce", from: "groceries" });
    expect(t.status === "accepted" && t.result.matchedIngredient).toBeNull();
    const text = (await q<{ line: any }>("SELECT line FROM requirement_lines WHERE ingredient_key LIKE 'text:%'"))[0].line;
    expect(text.unresolved[0]).toMatch(/Needs review/);
  });
});

describe("T19 'Have some' without a quantity, or reviewed demand increases", () => {
  it("never invents a pantry subtraction and reopens review visibly", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", state: "some" })).status).toBe("accepted");
    const c = await line(fx.weekId, "chicken_thigh");
    expect(c.packagesNeeded).toBe(2);
    expect(c.unresolved.join(" ")).toMatch(/Have some" without an amount/);
    expect(c.status).toBe("needs_review");
    // "Have enough" covers what was reviewed (700 g of broccoli) ...
    await recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "broccoli", state: "enough" });
    expect((await line(fx.weekId, "broccoli")).packagesNeeded).toBe(0);
    // ... not unlimited future demand: Jon doubles his Wednesday broccoli.
    const ev = (await q<{ revision: number }>("SELECT revision FROM cooking_events WHERE id=$1", [fx.events.chicken_rice]))[0];
    const r = await setPlateCommand(jon, op(), { eventId: fx.events.chicken_rice, expectedEventRevision: ev.revision, memberId: fx.members.jon, night: NIGHT.wed, kind: "dinner", componentPortions: { veg: "2" } });
    expect(r.status).toBe("accepted");
    const b = await line(fx.weekId, "broccoli");
    expect(b.unresolved.join(" ")).toMatch(/increased since Alex said "Have enough"/);
    expect(b.packagesNeeded).toBe(1); // only the 100 g beyond the reviewed amount
    // A quantity subtracts exactly that much.
    await recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", state: "some", quantity: "500", unit: "g" });
    const c2 = await line(fx.weekId, "chicken_thigh");
    expect(c2.homeSupply).toBe("500");
    expect(c2.unresolved).toEqual([]);
    expect(c2.packagesNeeded).toBe(2); // ceil((1360.776 - 500) g / 680.39 g) = 2
  });
});

describe("T20 confirm an order, then receive one item and report another missing", () => {
  it("confirmation does not imply receipt; received resolves; missing stays actionable", async () => {
    const { fx, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    await send(alex, fx.weekId);
    const payload = (await q<{ payload: any[] }>("SELECT payload FROM handoff_batches"))[0].payload;
    await confirmOrderCommand(alex, op(), { weekId: fx.weekId, contentsKnown: true, lines: payload.map((i) => ({ ingredientKey: i.ingredientKey, name: i.ingredientKey, packages: i.packages })), pickupAt: null });
    let chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.status).toBe("ordered");
    expect(chicken.received).toBe(0);
    const ol = await q<{ id: string; ingredient_key: string; packages: number }>("SELECT id, ingredient_key, packages FROM order_lines");
    const chickenLine = ol.find((l) => l.ingredient_key === "chicken_thigh")!;
    const salmonLine = ol.find((l) => l.ingredient_key === "salmon")!;
    expect((await recordReceiptCommand(alex, op(), { orderLineId: chickenLine.id, state: "received", packages: 2 })).status).toBe("accepted");
    expect((await recordReceiptCommand(alex, op(), { orderLineId: salmonLine.id, state: "missing", packages: 1 })).status).toBe("accepted");
    chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.status).toBe("received");
    const salmon = await line(fx.weekId, "salmon");
    expect(salmon.status).toBe("missing");
    expect(salmon.toSend).toBe(1);
    expect(salmon.requests).toHaveLength(1); // the request is not resolved by a missing package
    // Unlisted contents: an order exists, but it cannot establish what was included.
    const { fx: fx2, alex: alex2 } = await fresh();
    await confirmOrderCommand(alex2, op(), { weekId: fx2.weekId, contentsKnown: false, pickupAt: null });
    expect((await line(fx2.weekId, "chicken_thigh")).ordered).toBe(0);
  });
});

describe("X09 capture after confirmation", () => {
  it("identifies a staple already in the confirmed order before creating a duplicate; Add another is an explicit extra", async () => {
    const { fx, alex, jon } = await fresh();
    await approveAll(alex, fx.weekId);
    await send(alex, fx.weekId);
    const payload = (await q<{ payload: any[] }>("SELECT payload FROM handoff_batches"))[0].payload;
    await confirmOrderCommand(alex, op(), { weekId: fx.weekId, contentsKnown: true, lines: payload.map((i) => ({ ingredientKey: i.ingredientKey, name: i.ingredientKey, packages: i.packages })) });
    const before = await q("SELECT id FROM household_requests");
    const r = await captureHouseholdNeedCommand(jon, op(), { weekId: fx.weekId, text: "Plain Greek yogurt", from: "week" });
    expect(r.status === "rejected" && r.code).toBe("already_in_order");
    expect(await q("SELECT id FROM household_requests")).toEqual(before);
    const r2 = await captureHouseholdNeedCommand(jon, op(), { weekId: fx.weekId, text: "Plain Greek yogurt", from: "week", addAnother: true });
    expect(r2.status === "accepted" && r2.result.kind).toBe("extra");
    const y = await line(fx.weekId, "greek_yogurt");
    expect(y.ordered).toBe(1);
    expect(y.toSend).toBe(1);
    expect(y.status).toBe("not_sent_yet");
    // Received and ordered views of the same package are not double counted.
    const ol = (await q<{ id: string }>("SELECT id FROM order_lines WHERE ingredient_key='greek_yogurt'"))[0];
    await recordReceiptCommand(jon, op(), { orderLineId: ol.id, state: "received", packages: 1 });
    const y2 = await line(fx.weekId, "greek_yogurt");
    expect(y2.ordered).toBe(1);
    expect(y2.received).toBe(1);
    expect(y2.toSend).toBe(1);
  });
});

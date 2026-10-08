/**
 * B5 Kroger cart add through the EXISTING startHandoff/dispatchBatch path, with
 * TABLE_RETAILER=kroger and the recording fake transport (TABLE_ENV=test only). Offline.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fresh, op, q } from "./helpers";
import { FAKE, empty, forbidNetwork, json, krogerEnv, saveEnv, tokenBody } from "../fixtures/kroger/env";
import { connect } from "../fixtures/kroger/connect";
import { krogerFake, TransportError } from "@/server/integrations/kroger/transport";
import { krogerCartReadiness, krogerRetailer } from "@/server/integrations/kroger/adapter";
import { cartAddBody } from "@/server/integrations/kroger/cart";
import { FIXTURE_MODALITY } from "@/server/integrations/kroger/config";
import { retailer } from "@/server/integrations/retailer";
import { approvePurchaseLinesCommand, confirmOrderCommand } from "@/server/commands/groceries";
import { recoverInterruptedDispatches, startHandoff } from "@/server/commands/purchasing";
import { setKrogerLocationCommand } from "@/server/commands/kroger";
import { applyPlanChangeCommand, createPreviewCommand } from "@/server/commands/plan";
import { recomputeProjection } from "@/server/groceries/recompute";
import { inTransaction } from "@/server/db/pool";
import type { Actor } from "@/server/commands/framework";

let restore: () => void;
beforeAll(() => forbidNetwork());
beforeEach(() => {
  restore = saveEnv();
  krogerEnv("connect,products,cart", { fake: true });
  krogerFake.reset();
});
afterEach(() => restore());

async function summary(weekId: string) {
  return (await q<{ projection_summary: any }>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
}

/** The fixture household's products become Kroger products (fixture UPC-like refs). */
async function krogerHousehold() {
  const env = await fresh();
  const { fx, jon } = env;
  let n = 0;
  for (const pid of Object.values(fx.products)) {
    n += 1;
    await q("UPDATE products SET retailer='kroger', product_ref=$2 WHERE id=$1", [pid, `00000000${String(n).padStart(5, "0")}`]);
  }
  await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [fx.householdId]);
    await recomputeProjection(c, fx.householdId, fx.weekId);
  });
  await connect(jon, 1);
  expect((await setKrogerLocationCommand(jon, op(), { locationId: FAKE.locationId })).status).toBe("accepted");
  krogerFake.reset();
  return env;
}

async function approveAll(actor: Actor, weekId: string) {
  const ls = (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]))
    .map((r) => r.line).filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0);
  expect(ls.length).toBeGreaterThan(0);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
}

async function send(actor: Actor, weekId: string) {
  const s = await summary(weekId);
  return startHandoff(actor, op(), { weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash }) as Promise<any>;
}

const batches = () => q<any>("SELECT * FROM handoff_batches ORDER BY authorized_at");
const statusOf = async (batchId: string) => (await q<any>("SELECT status, evidence FROM handoff_status_events WHERE batch_id=$1 ORDER BY id DESC LIMIT 1", [batchId]))[0];
const cartCalls = () => krogerFake.calls().filter((c) => c.url.endsWith("/cart/add"));

describe("B5 cart handoff readiness", () => {
  it("stays false with full credentials present and no activation; zero calls, nothing frozen", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    for (const activate of ["", "connect", "connect,products"]) {
      krogerEnv(activate, { fake: true });
      expect(retailer().status().ready, activate).toBe(false);
      expect((await krogerCartReadiness(fx.householdId)).ready).toBe(false);
      const r = await send(jon, fx.weekId);
      expect(r.status === "rejected" && r.code).toBe("retailer_not_ready");
    }
    // Activated, configured, connected and located — but modality unsettled (no test fake): still not ready.
    krogerEnv("connect,products,cart", { fake: false });
    expect(retailer().status()).toMatchObject({ ready: false });
    expect(retailer().status().reason).toMatch(/modality/);
    krogerEnv("connect,products,cart", { fake: true });
    expect(await batches()).toHaveLength(0);
    expect(krogerFake.calls()).toHaveLength(0);
    expect((await krogerCartReadiness(fx.householdId)).ready).toBe(true);
  });

  it("per household: no connection or no store location means not ready and nothing sent", async () => {
    const { fx, other } = await krogerHousehold();
    expect(await krogerCartReadiness(other.householdId)).toMatchObject({ ready: false, reason: expect.stringMatching(/not connected/) });
    await q("UPDATE kroger_connections SET location_id=NULL WHERE household_id=$1", [fx.householdId]);
    expect(await krogerCartReadiness(fx.householdId)).toMatchObject({ ready: false, reason: expect.stringMatching(/store/) });
  });
  it("a household that is not ready is refused before anything is frozen (integration: startHandoff asks the household's readiness)", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    krogerEnv("connect,products,cart", { fake: true });
    await q("UPDATE kroger_connections SET location_id=NULL WHERE household_id=$1", [fx.householdId]);
    const r = await send(jon, fx.weekId);
    expect(r.status === "rejected" && r.code).toBe("retailer_not_ready");
    expect(r.message).toMatch(/store/);
    expect(await batches()).toHaveLength(0); // no frozen batch that could only fail later
    expect(krogerFake.calls()).toHaveLength(0);
  });
});

describe("B5 dispatch through startHandoff with the Kroger adapter", () => {
  it("204: one PUT built from the frozen batch bytes; approvals consumed once; batch-level acknowledgment only; no order", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    krogerFake.reset(() => empty(204));
    const r = await send(jon, fx.weekId);
    expect(r.status).toBe("accepted");
    expect(r.result.adapter).toBe("kroger");
    expect(r.dispatch.status).toBe("acknowledged");
    const [b] = await batches();
    const calls = cartCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].headers.Authorization).toBe("Bearer fake-access-token-1");
    expect(calls[0].timeoutMs).toBeLessThanOrEqual(30_000);
    // Exactly the frozen payload, in order, nothing added or dropped.
    const frozen: { productRef: string; packages: number }[] = b.payload;
    expect(calls[0].body).toBe(cartAddBody(frozen.map((i) => ({ productRef: i.productRef, quantity: i.packages })), FIXTURE_MODALITY));
    expect(JSON.parse(calls[0].body!).items).toEqual(frozen.map((i) => ({ upc: i.productRef, quantity: i.packages, modality: FIXTURE_MODALITY })));
    const st = await statusOf(b.id);
    expect(st.status).toBe("acknowledged");
    expect(st.evidence).toMatchObject({ httpStatus: 204, granularity: "batch", provider: "kroger", fixtureModality: true });
    expect(Object.keys(st.evidence)).not.toContain("lines");
    expect(JSON.stringify(st.evidence)).not.toMatch(/fake-access-token|Bearer/);
    const lines = await q<any>("SELECT * FROM handoff_batch_lines WHERE batch_id=$1", [b.id]);
    expect((await q<any>("SELECT count(*)::int n FROM purchase_approvals WHERE state='consumed' AND consumed_by_batch=$1", [b.id]))[0].n).toBe(lines.length);
    // Not an order and not a pickup: the existing explicit order confirmation is still required.
    expect(await q("SELECT 1 FROM orders")).toHaveLength(0);
    expect(await q("SELECT 1 FROM receipt_observations")).toHaveLength(0);
    // A second send of the same review is refused; still one call.
    const again = await send(jon, fx.weekId);
    expect(again.status).toBe("rejected");
    expect(cartCalls()).toHaveLength(1);
    const o = await confirmOrderCommand(jon, op(), { weekId: fx.weekId, contentsKnown: true, lines: frozen.map((i: any) => ({ ingredientKey: i.ingredientKey, name: i.ingredientKey, packages: i.packages })), pickupAt: "2026-10-13T22:00:00Z" });
    expect(o.status).toBe("accepted");
    expect(cartCalls()).toHaveLength(1); // confirming an order never calls the retailer
  });

  it("a stale grocery review makes no transport call", async () => {
    const { fx, jon, alex } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    const reviewed = await summary(fx.weekId);
    const p = await createPreviewCommand(alex, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId } });
    expect(p.status).toBe("accepted");
    if (p.status !== "accepted") return;
    expect((await applyPlanChangeCommand(alex, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) })).status).toBe("accepted");
    krogerFake.reset(() => empty(204));
    const r: any = await startHandoff(jon, op(), { weekId: fx.weekId, reviewFingerprint: reviewed.reviewFingerprint, payloadHash: reviewed.payloadHash });
    expect(r.status === "rejected" && r.code).toBe("stale_review");
    expect(krogerFake.calls()).toHaveLength(0);
    expect(await batches()).toHaveLength(0);
  });

  for (const [label, respond, why] of [
    ["a timeout", () => { throw new TransportError("timeout", "no response within 30000 ms"); }, /timeout/],
    ["a network error after sending", () => { throw new TransportError("network", "socket hang up"); }, /network/],
    ["a 500", () => json(500, { errors: { code: "CART-0000-500", reason: "fixture", timestamp: 1 } }), /server error/],
    ["an undocumented 200 with a body", () => json(200, { data: { lines: [] } }), /undocumented/],
  ] as const) {
    it(`${label} is uncertain at batch level and never replayed`, async () => {
      const { fx, jon } = await krogerHousehold();
      await approveAll(jon, fx.weekId);
      krogerFake.reset(respond as () => ReturnType<typeof json>);
      const r = await send(jon, fx.weekId);
      expect(r.dispatch.status).toBe("uncertain");
      const [b] = await batches();
      const st = await statusOf(b.id);
      expect(st.status).toBe("uncertain");
      expect(st.evidence.reason).toMatch(why);
      expect(st.evidence.granularity).toBe("batch");
      expect(Object.keys(st.evidence)).not.toContain("lines");
      expect(await recoverInterruptedDispatches(0)).toBe(0);
      const again = await send(jon, fx.weekId);
      expect(again.status).toBe("rejected"); // ambiguous packages are not offered for resend
      expect(cartCalls()).toHaveLength(1);
    });
  }

  it("a documented 400 is a definite failure of the whole batch", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    krogerFake.reset(() => json(400, { errors: { code: "CART-2011-400", reason: "fixture rejection", timestamp: 1 } }));
    const r = await send(jon, fx.weekId);
    expect(r.dispatch.status).toBe("failed");
    const st = await statusOf((await batches())[0].id);
    expect(st.evidence).toMatchObject({ httpStatus: 400, granularity: "batch", error: { code: "CART-2011-400", reason: "fixture rejection" } });
    expect(cartCalls()).toHaveLength(1);
  });

  it("a 401 fails without retrying the write and requires the household to connect again", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    krogerFake.reset(() => json(401, { error: "invalid_token", error_description: "The access token is invalid or has expired" }));
    const r = await send(jon, fx.weekId);
    expect(r.dispatch.status).toBe("failed");
    expect((await statusOf((await batches())[0].id)).evidence).toMatchObject({ httpStatus: 401, reauthorizationRequired: true, retried: false });
    expect(krogerFake.calls()).toHaveLength(1); // no refresh-and-retry of a write
    expect((await q<any>("SELECT status, access_token_sealed FROM kroger_connections WHERE household_id=$1", [fx.householdId]))[0]).toEqual({ status: "needs_reauthorization", access_token_sealed: null });
    expect((await krogerCartReadiness(fx.householdId)).ready).toBe(false);
  });

  it("an expired access token is refreshed before the single PUT", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
    krogerFake.reset((c) => (c.url.endsWith("/token") ? json(200, tokenBody(2)) : empty(204)));
    const r = await send(jon, fx.weekId);
    expect(r.dispatch.status).toBe("acknowledged");
    const calls = krogerFake.calls();
    expect(calls.map((c) => c.url.split("/").pop())).toEqual(["token", "add"]);
    expect(calls[1].headers.Authorization).toBe("Bearer fake-access-token-2");
  });

  it("a refresh failure at send time means nothing was sent: failed, not uncertain", async () => {
    const { fx, jon } = await krogerHousehold();
    await approveAll(jon, fx.weekId);
    await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
    krogerFake.reset(() => json(400, { error: "invalid_grant" }));
    const r = await send(jon, fx.weekId);
    expect(r.dispatch.status).toBe("failed");
    expect((await statusOf((await batches())[0].id)).evidence).toMatchObject({ notSent: true, networkCalls: 0, reauthorizationRequired: true });
    expect(cartCalls()).toHaveLength(0);
  });
});

describe("B5 household isolation at the adapter", () => {
  it("another household's send never uses this household's connection, tokens or location", async () => {
    const { fx, other } = await krogerHousehold();
    expect((await krogerRetailer.readiness!(fx.householdId)).ready).toBe(true);
    expect((await krogerRetailer.readiness!(other.householdId)).ready).toBe(false);
    krogerFake.reset(() => empty(204));
    const o = await krogerRetailer.addToCart({ householdId: other.householdId, batchId: "00000000-0000-0000-0000-000000000000", dispatchId: "x:1", items: [{ productRef: "0000000000001", quantity: 1 }] });
    expect(o.kind).toBe("failed");
    expect(o.evidence).toMatchObject({ notSent: true, networkCalls: 0 });
    expect(JSON.stringify(o.evidence)).not.toMatch(/TEST0001|fake-access-token/);
    expect(krogerFake.calls()).toHaveLength(0);
  });
});

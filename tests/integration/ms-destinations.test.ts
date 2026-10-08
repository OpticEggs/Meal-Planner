/**
 * Multi-source handoff — where to shop and the Instacart shopping-list link (acceptance GR-01..12,
 * IC-01..06, SEC-02/03). Real PostgreSQL, the recording fake retailer, and the Instacart recording
 * fake with doc-shaped synthetic fixtures; any real network use fails the test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { fresh, op, q, race, retailerCalls } from "./helpers";
import { approvePurchaseLinesCommand, captureHouseholdNeedCommand, confirmOrderCommand } from "@/server/commands/groceries";
import { startHandoff } from "@/server/commands/purchasing";
import { createPreviewCommand } from "@/server/commands/plan";
import { updateSettingsCommand } from "@/server/commands/household";
import { prepareInstacartListCommand, setShoppingDestinationCommand } from "@/server/commands/destinations";
import { householdSnapshot } from "@/server/queries/snapshot";
import { nearbyRetailers } from "@/server/integrations/instacart/client";
import { recordingTransport, type FakeStep } from "@/server/integrations/instacart/transport";
import { exportHousehold, NOT_EXPORTED } from "@/server/export";
import { FAKE_KEY, instacartTestEnv, scenario } from "../fixtures/instacart";
import type { Actor } from "@/server/commands/framework";

const cmd = (p: Promise<unknown>): Promise<any> => p.then((r) => r, (e: Error) => ({ status: "threw", code: `threw: ${e.message}`, message: e.message }));
const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;
const lines = async (weekId: string) =>
  (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 ORDER BY 1", [weekId])).map((r) => r.line);
const summary = async (weekId: string) => (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
const cycle = async (weekId: string) => (await q<any>("SELECT * FROM grocery_cycles WHERE week_id=$1", [weekId]))[0];
/** The accepted plan itself (meals, portions) — what a destination must never change. */
const plan = async (weekId: string) => ({
  week: await q("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [weekId]),
  assignments: await q("SELECT id, night, kind, cooking_event_id, locked, revision FROM assignments WHERE week_id=$1 ORDER BY night", [weekId]),
  events: await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [weekId]),
  allocations: await q("SELECT a.* FROM allocations a JOIN cooking_events e ON e.id=a.cooking_event_id WHERE e.week_id=$1 ORDER BY a.id", [weekId]),
  requests: await q("SELECT id, ingredient_key, kind, packages, state FROM household_requests ORDER BY id"),
});
async function approveAll(actor: Actor, weekId: string) {
  const ls = (await lines(weekId)).filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0 && !l.approval?.valid);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
  return ls;
}
async function setDest(actor: Actor, weekId: string, destination: "retailer_cart" | "instacart_list" | "manual", extra: Record<string, unknown> = {}) {
  const c = await cycle(weekId);
  return cmd(setShoppingDestinationCommand(actor, op(), { weekId, destination, expectedRevision: c?.destination_revision ?? 1, ...extra }));
}
function icDeps(steps: FakeStep[] | ((req: any, n: number) => FakeStep), activate = "list,retailers") {
  const env = instacartTestEnv(activate);
  const fake = recordingTransport(steps, env);
  return { deps: { transport: fake.transport, env, timeoutMs: 300 }, calls: fake.calls };
}
async function currentPreview(actor: Actor) {
  const s: any = await householdSnapshot(actor);
  return { preview: s.groceries.where.instacart.preview, revision: s.groceries.where.revision, s };
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network use in an offline test");
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("where to shop (GR-01..12)", () => {
  it("GR-01: by default the store cart is kept; the list can be built for copying; Instacart is not set up and nothing is called", async () => {
    const { fx, jon } = await fresh();
    const s: any = await householdSnapshot(jon);
    expect(s.groceries.where).toMatchObject({ destination: "retailer_cart", revision: 1 });
    expect(s.groceries.where.instacart.capabilities.map((c: any) => c.status)).toEqual(["not_configured", "not_configured"]);
    expect(s.groceries.shoppingList.items.length).toBeGreaterThan(0);
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    const r = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }));
    expect(r.code).toBe("not_configured");
    expect(await count("instacart_list_links")).toBe(0);
    expect(await retailerCalls()).toBe(0);
  });

  it("GR-02/03/06: switching to another store keeps meals, drops store products and prices, stales approvals and makes the old Send do nothing", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    const reviewed = await summary(fx.weekId);
    const before = await plan(fx.weekId);
    const sw = await setDest(jon, fx.weekId, "manual", { storeLabel: "Corner market" });
    expect(sw.status, JSON.stringify(sw)).toBe("accepted");
    expect(await plan(fx.weekId)).toEqual(before);
    const after = await summary(fx.weekId);
    expect(after.reviewFingerprint).not.toBe(reviewed.reviewFingerprint);
    expect(after.ready).toBe(false);
    expect(after.pickupSpending.complete).toBe(false); // unknown, never zero
    for (const l of await lines(fx.weekId)) {
      expect(l.product, l.key).toBeNull();
      expect(l.price, l.key).toBeNull();
    }
    expect(await count("purchase_approvals WHERE state='active'")).toBe(0);
    const old = await cmd(startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: reviewed.reviewFingerprint, payloadHash: reviewed.payloadHash }));
    expect(old.code).toBe("stale_review");
    expect(await retailerCalls()).toBe(0);
    expect(await count("handoff_batches")).toBe(0);
    // back to the store cart: its products and prices return, but the earlier approvals stay void
    await setDest(jon, fx.weekId, "retailer_cart");
    expect((await lines(fx.weekId)).some((l) => l.product && l.price)).toBe(true);
    expect(await count("purchase_approvals WHERE state='active'")).toBe(0);
    expect((await summary(fx.weekId)).reviewFingerprint).not.toBe(reviewed.reviewFingerprint);
  });

  it("GR-04: an open plan preview stays an unapplied idea; nothing in the accepted week or requests changes", async () => {
    const { fx, jon } = await fresh();
    const p = await createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId } });
    expect(p.status).toBe("accepted");
    const before = await plan(fx.weekId);
    const prev = await q("SELECT id, status FROM previews ORDER BY id");
    await setDest(jon, fx.weekId, "instacart_list");
    expect(await plan(fx.weekId)).toEqual(before);
    expect(await q("SELECT id, status FROM previews ORDER BY id")).toEqual(prev);
  });

  it("GR-05/11: after a transfer and a confirmed order, switching changes no history; a new need shows as still to buy, no second order", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    const s0 = await summary(fx.weekId);
    const send = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: s0.reviewFingerprint, payloadHash: s0.payloadHash });
    expect(send.status, JSON.stringify(send)).toBe("accepted");
    const payload = s0.payload as { ingredientKey: string; packages: number }[];
    await confirmOrderCommand(alex, op(), { weekId: fx.weekId, contentsKnown: true, lines: payload.map((i) => ({ ingredientKey: i.ingredientKey, name: i.ingredientKey, packages: i.packages })), pickupAt: null });
    const history = {
      batches: await q("SELECT * FROM handoff_batches ORDER BY id"),
      events: await q("SELECT batch_id, status FROM handoff_status_events ORDER BY id"),
      orders: await q("SELECT * FROM orders ORDER BY id"),
      orderLines: await q("SELECT * FROM order_lines ORDER BY id"),
    };
    const calls = await retailerCalls();
    await setDest(jon, fx.weekId, "manual");
    await captureHouseholdNeedCommand(jon, op(), { weekId: fx.weekId, text: "Coffee", kind: "extra", packages: 1, from: "groceries" });
    expect({
      batches: await q("SELECT * FROM handoff_batches ORDER BY id"),
      events: await q("SELECT batch_id, status FROM handoff_status_events ORDER BY id"),
      orders: await q("SELECT * FROM orders ORDER BY id"),
      orderLines: await q("SELECT * FROM order_lines ORDER BY id"),
    }).toEqual(history);
    expect(await retailerCalls()).toBe(calls);
    // Existing rule: a need captured after the order is confirmed goes to the next pickup — never a silent second order here.
    const coffee = await q<any>("SELECT w.week_start::text AS week FROM household_requests r JOIN grocery_cycles g ON g.id=r.cycle_id JOIN weeks w ON w.id=g.week_id WHERE r.text='Coffee'");
    expect(coffee).toEqual([{ week: "2026-10-19" }]);
    const s: any = await householdSnapshot(jon);
    const items = s.groceries.shoppingList.items;
    expect(items.find((i: any) => /coffee/i.test(i.name))).toBeUndefined();
    expect(items.filter((i: any) => i.state === "already_ordered").length).toBeGreaterThan(0);
    expect(await count("orders")).toBe(1);
  });

  it("GR-07: an unpriced line keeps the total incomplete and a firm budget unconfirmed", async () => {
    const { fx, jon } = await fresh({ unpricedCheese: true });
    expect((await updateSettingsCommand(jon, op(), { expectedRevision: 1, budgetScope: "pickup", budgetLimitMinor: 100000, budgetFirm: true })).status).toBe("accepted");
    const s = await summary(fx.weekId);
    expect(s.pickupSpending.complete).toBe(false);
    expect(["unknown", "over"]).toContain(s.budget.status);
    expect(s.ready).toBe(false);
  });

  it("GR-09: Jon switches while Alex is approving — Alex's approval of the old review is refused", async () => {
    const { fx, jon, alex } = await fresh();
    const ls = (await lines(fx.weekId)).filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0);
    await setDest(jon, fx.weekId, "manual");
    const r = await cmd(approvePurchaseLinesCommand(alex, op(), { weekId: fx.weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) }));
    expect(r.status).toBe("rejected");
    expect(await count("purchase_approvals WHERE state='active'")).toBe(0);
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`GR-10: both members choose at once — the later choice is refused, nothing is lost silently (${order})`, async () => {
      const { fx, jon, alex } = await fresh();
      await cycle(fx.weekId);
      const j = () => cmd(setShoppingDestinationCommand(jon, op(), { weekId: fx.weekId, destination: "manual", expectedRevision: 1 }));
      const a = () => cmd(setShoppingDestinationCommand(alex, op(), { weekId: fx.weekId, destination: "instacart_list", expectedRevision: 1 }));
      const [x, y] = order === "Jon first" ? await race(fx.householdId, j, a) : await race(fx.householdId, a, j);
      expect([x.status, y.code]).toEqual(["accepted", "stale"]);
      expect((await cycle(fx.weekId))).toMatchObject({ destination: order === "Jon first" ? "manual" : "instacart_list", destination_revision: 2 });
    });
  }

  it("GR-12: a nearby lookup without Instacart access returns nothing and calls nothing", async () => {
    const { deps, calls } = icDeps([], "");
    const r = await nearbyRetailers(deps, { postalCode: "45202", countryCode: "US" });
    expect(r.kind).toBe("unavailable");
    expect(calls).toHaveLength(0);
  });
});

describe("Instacart shopping-list link (IC-01..06, SEC-02/03)", () => {
  it("IC-01: nearby retailers are brands with keys, nothing about a branch, pickup or price", async () => {
    const { deps, calls } = icDeps([scenario("retailersOk")]);
    const r = await nearbyRetailers(deps, { postalCode: "45202", countryCode: "US" });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.retailers.map((b) => Object.keys(b).sort())).toEqual([["key", "logoUrl", "name"], ["key", "logoUrl", "name"]]);
    expect(calls).toHaveLength(1);
  });

  it("IC-02: a link is prepared from the frozen reviewed list — measurements, no product ids, no cart batch, no order", async () => {
    const { fx, jon } = await fresh();
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    expect(preview.lines.length).toBeGreaterThan(0);
    const { deps, calls } = icDeps([scenario("linkOk")]);
    const r = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect(r.link.status).toBe("link_prepared");
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].body!);
    for (const li of body.line_items) {
      expect(Object.keys(li).sort()).toEqual(["display_text", "line_item_measurements", "name"]);
      expect(li.line_item_measurements[0]).toEqual({ quantity: expect.any(Number), unit: expect.any(String) });
    }
    const row = (await q<any>("SELECT * FROM instacart_list_links"))[0];
    expect(row).toMatchObject({ status: "link_prepared", link_url: "https://www.instacart.com/store/shopping_lists/0000000-fixture" });
    expect(row.outcome.meaning).toMatch(/not a cart write, not an order/);
    expect(await count("handoff_batches")).toBe(0);
    expect(await count("orders")).toBe(0);
    expect(await retailerCalls()).toBe(0);
    // the same reviewed list: the existing link is shown again, no second request
    const again = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(again.result.reused).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("IC-03: a stale list or a changed destination makes zero provider calls", async () => {
    const { fx, jon, alex } = await fresh();
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    await captureHouseholdNeedCommand(alex, op(), { weekId: fx.weekId, text: "Coffee", kind: "extra", packages: 1, from: "groceries" });
    const { deps, calls } = icDeps([scenario("linkOk")]);
    const stale = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(stale.code).toBe("stale_review");
    const now = await currentPreview(jon);
    await setDest(alex, fx.weekId, "manual");
    const switched = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: now.preview.fingerprint, destinationRevision: now.revision }, deps));
    expect(switched.code).toBe("stale_review");
    expect(calls).toHaveLength(0);
    expect(await count("instacart_list_links")).toBe(0);
  });

  it("IC-04: a server error or timeout is uncertain and is not repeated; the same operation id replays without a call", async () => {
    const { fx, jon } = await fresh();
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    const { deps, calls } = icDeps([scenario("serverError500")]);
    const id = op();
    const r = await cmd(prepareInstacartListCommand(jon, id, { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(r.link.status).toBe("uncertain");
    const replay = await cmd(prepareInstacartListCommand(jon, id, { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(replay.replayed).toBe(true);
    expect(calls).toHaveLength(1);
    const t = icDeps([{ hang: true }]);
    const timed = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, t.deps));
    expect(timed.link.status).toBe("uncertain");
    expect(t.calls).toHaveLength(1);
    expect((await q<any>("SELECT status FROM instacart_list_links ORDER BY requested_at")).map((x) => x.status)).toEqual(["uncertain", "uncertain"]);
    expect(await count("instacart_list_links WHERE link_url IS NOT NULL")).toBe(0);
  });

  it("IC-05/SEC-02: 401/403 and an untrusted link are failures with no link stored; the key appears nowhere in the database or export", async () => {
    const { fx, jon } = await fresh();
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    for (const s of ["unauthorized401", "forbidden403", "linkUntrusted"] as const) {
      const { deps } = icDeps([scenario(s)]);
      const r = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
      expect(r.link.status, s).toBe("failed");
    }
    expect(await count("instacart_list_links WHERE link_url IS NOT NULL")).toBe(0);
    const dump = JSON.stringify(await q("SELECT * FROM instacart_list_links")) + JSON.stringify(await q("SELECT * FROM change_events")) + JSON.stringify(await q("SELECT * FROM command_receipts"));
    expect(dump).not.toContain(FAKE_KEY);
    expect(NOT_EXPORTED).toContain("instacart_list_links");
    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    expect(JSON.stringify(data)).not.toContain(FAKE_KEY);
    expect(JSON.stringify(data)).not.toContain("instacart.com");
  });

  it("IC-06: outside the test fake, an unconfigured installation refuses before recording or calling anything", async () => {
    const { fx, jon } = await fresh();
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    const { deps, calls } = icDeps([scenario("linkOk")], "");
    const r = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(r.code).toBe("not_configured");
    expect(calls).toHaveLength(0);
    expect(await count("instacart_list_links")).toBe(0);
  });

  it("SEC-03: an unreadable success body is uncertain — no link, no acknowledgement invented", async () => {
    const { fx, jon } = await fresh();
    await setDest(jon, fx.weekId, "instacart_list");
    const { preview, revision } = await currentPreview(jon);
    const { deps } = icDeps([{ status: 200, headers: { "content-type": "application/json" }, body: "{not json" }]);
    const r = await cmd(prepareInstacartListCommand(jon, op(), { weekId: fx.weekId, listFingerprint: preview.fingerprint, destinationRevision: revision }, deps));
    expect(r.link.status).toBe("uncertain");
    expect(await count("instacart_list_links WHERE link_url IS NOT NULL")).toBe(0);
  });
});

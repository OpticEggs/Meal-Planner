/**
 * B9 deployment readiness: more than one server process can be alive at once (a deploy that starts the
 * new instance before stopping the old one, or a crash-restart). Interrupted-dispatch recovery must not
 * mark a transfer another live process is still sending, and an outcome that arrives after a transfer
 * was marked uncertain must never overwrite that uncertainty (no silent "acknowledged" after a member
 * may already have checked the cart). Real PostgreSQL + the recording fake retailer.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fresh, line, op, q, retailerCalls } from "./helpers";
import { approvePurchaseLinesCommand } from "@/server/commands/groceries";
import { register } from "@/instrumentation";
import * as purchasing from "@/server/commands/purchasing";
import type { Actor } from "@/server/commands/framework";

async function lines(weekId: string) {
  return (await q<{ line: any }>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 ORDER BY 1", [weekId])).map((r) => r.line);
}
async function approveAll(actor: Actor, weekId: string) {
  const ls = (await lines(weekId)).filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
}
async function send(actor: Actor, weekId: string) {
  const s = (await q<{ projection_summary: any }>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
  return purchasing.startHandoff(actor, op(), { weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
}
const statuses = async (batchId: string) => (await q<{ status: string }>("SELECT status FROM handoff_status_events WHERE batch_id=$1 ORDER BY id", [batchId])).map((r) => r.status);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn: () => Promise<boolean>, ms = 10_000) {
  const t = Date.now();
  while (!(await fn())) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await sleep(25);
  }
}
/** A transfer the store is slow to answer: held at the fake retailer until `release`. */
async function slowTransfer() {
  const { fx, alex } = await fresh();
  await approveAll(alex, fx.weekId);
  await q("INSERT INTO fake_retailer_script(household_id, behavior, barrier) VALUES ($1,'delay_until_barrier','store-slow')", [fx.householdId]);
  await q("INSERT INTO test_barriers(name) VALUES ('store-slow')");
  const pending = send(alex, fx.weekId);
  await waitFor(async () => (await retailerCalls()) === 1); // the request is at the "store"
  const batchId = (await q<{ id: string }>("SELECT id FROM handoff_batches"))[0].id;
  const release = async () => {
    await q("UPDATE test_barriers SET released_at=now() WHERE name='store-slow'");
    return pending;
  };
  return { fx, alex, batchId, release };
}

afterEach(() => {
  delete process.env.TABLE_DISPATCH_TIMEOUT_MS;
});

describe("B9 overlapping server processes and interrupted-dispatch recovery", () => {
  it("a process starting while another is still sending does not mark that transfer uncertain", async () => {
    const { batchId, release } = await slowTransfer();
    const startup = (purchasing as any).startupRecovery as (() => Promise<number>) | undefined;
    expect(typeof startup, "startup recovery must exist and only recover transfers past the dispatch bound").toBe("function");
    expect(await startup!()).toBe(0);
    expect((await statuses(batchId)).at(-1)).toBe("dispatch_started");
    await release();
    expect((await statuses(batchId)).at(-1)).toBe("acknowledged");
    expect(await retailerCalls()).toBe(1);
  });

  it("an outcome that arrives after the transfer was marked uncertain never overwrites it", async () => {
    const { fx, batchId, release } = await slowTransfer();
    // Another process (or the sweep, once the bound has passed) marks it uncertain.
    expect(await purchasing.recoverInterruptedDispatches(0)).toBe(1);
    const before = await statuses(batchId);
    expect(before.at(-1)).toBe("uncertain");
    await release(); // the store's late "204" reaches the first process
    expect(await statuses(batchId)).toEqual(before); // no "acknowledged" appended after "uncertain"
    expect(await retailerCalls()).toBe(1); // and nothing resent
    // The late answer is not lost: it is reported to the household, labeled as late.
    const late = await q<{ summary: any }>("SELECT summary FROM change_events WHERE household_id=$1 AND command='Dispatch' ORDER BY seq DESC LIMIT 1", [fx.householdId]);
    expect(late[0].summary.text).toMatch(/late/i);
    expect(late[0].summary.lateOutcome?.kind).toBe("acknowledged");
    expect((await line(fx.weekId, "chicken_thigh")).toSend).toBeGreaterThanOrEqual(0); // projection still computable
  });

  it("a store that never answers becomes uncertain within the dispatch bound, and a later answer does not change it", async () => {
    process.env.TABLE_DISPATCH_TIMEOUT_MS = "400";
    const { batchId, release } = await slowTransfer();
    // Poll without throwing, then assert: a send that never ends is a failed expectation, not a timeout.
    const t = Date.now();
    while ((await statuses(batchId)).at(-1) === "dispatch_started" && Date.now() - t < 3_000) await sleep(25);
    const after = await statuses(batchId);
    expect(after.at(-1), "an unanswered send must become uncertain within the dispatch bound").toBe("uncertain");
    const ev = await q<{ evidence: any }>("SELECT evidence FROM handoff_status_events WHERE batch_id=$1 AND status='uncertain'", [batchId]);
    expect(JSON.stringify(ev[0].evidence)).toMatch(/no response within/);
    await release();
    await sleep(200);
    expect(await statuses(batchId)).toEqual(after);
    expect(await retailerCalls()).toBe(1);
  });

  it("a member's check of the cart is never overwritten by a late answer from the store", async () => {
    const { fx, alex, batchId, release } = await slowTransfer();
    expect(await purchasing.recoverInterruptedDispatches(0)).toBe(1); // marked uncertain while still in flight
    const r = await purchasing.resolveUncertainTransferCommand(alex, op(), { batchId, observed: "not_in_cart" });
    expect(r.status).toBe("accepted");
    const resolved = await statuses(batchId);
    expect(resolved.slice(-2)).toEqual(["uncertain", "failed"]); // the member's observation
    await release(); // the store's late "204" arrives after the member's check
    expect(await statuses(batchId)).toEqual(resolved);
    const ev = await q<{ evidence: any }>("SELECT evidence FROM handoff_status_events WHERE batch_id=$1 ORDER BY id DESC LIMIT 1", [batchId]);
    expect(ev[0].evidence.source).toBe("member observation of the retailer cart");
    expect(await retailerCalls()).toBe(1);
    void fx;
  });

  it("a timeout is not a rejection: the send stays uncertain (packages not offered again), a new send is refused, nothing is replayed", async () => {
    process.env.TABLE_DISPATCH_TIMEOUT_MS = "300";
    const { fx, alex, batchId, release } = await slowTransfer();
    const t = Date.now();
    while ((await statuses(batchId)).at(-1) === "dispatch_started" && Date.now() - t < 3_000) await sleep(25);
    expect((await statuses(batchId)).at(-1)).toBe("uncertain");
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect([chicken.status, chicken.toSend]).toEqual(["uncertain", 0]); // not treated as "failed, resend it"
    const again = await send(alex, fx.weekId);
    expect(again.status).toBe("rejected");
    await release();
    await sleep(200);
    expect(await retailerCalls()).toBe(1);
  });

  it("recovery is repeatable: running it again changes nothing, sends nothing and rewrites no history", async () => {
    const { fx, batchId, release } = await slowTransfer();
    expect(await purchasing.recoverInterruptedDispatches(0)).toBe(1);
    const events = await q("SELECT id, status, evidence FROM handoff_status_events WHERE batch_id=$1 ORDER BY id", [batchId]);
    const changes = (await q("SELECT count(*)::int AS n FROM change_events WHERE household_id=$1", [fx.householdId]))[0];
    for (let i = 0; i < 3; i++) expect(await purchasing.recoverInterruptedDispatches(0)).toBe(0);
    expect(await purchasing.startupRecovery()).toBe(0);
    expect(await q("SELECT id, status, evidence FROM handoff_status_events WHERE batch_id=$1 ORDER BY id", [batchId])).toEqual(events);
    expect((await q("SELECT count(*)::int AS n FROM change_events WHERE household_id=$1", [fx.householdId]))[0]).toEqual(changes);
    expect(await retailerCalls()).toBe(1);
    await release();
  });

  it("while the server keeps running, the periodic sweep marks a send whose process stopped, without a restart", async () => {
    const { fx, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const prev = process.env.NEXT_RUNTIME;
    process.env.NEXT_RUNTIME = "nodejs";
    try {
      await register(); // this server starts: nothing to recover yet
      // Another process froze a batch, recorded "dispatch started" 200 s ago and stopped (older than
      // the recovery bound). The held dispatcher here finds it no longer 'authorized' and does nothing.
      await q("INSERT INTO test_barriers(name) VALUES ($1)", [`hold-dispatch:${fx.householdId}`]);
      const pending = send(alex, fx.weekId);
      await waitFor(async () => (await q("SELECT 1 FROM handoff_batches")).length === 1);
      const batchId = (await q<{ id: string }>("SELECT id FROM handoff_batches"))[0].id;
      await q("INSERT INTO handoff_status_events(batch_id, status, evidence, at) VALUES ($1,'dispatch_started','{\"simulated\":\"process stopped here\"}', clock_timestamp() - interval '200 seconds')", [batchId]);
      await q("UPDATE test_barriers SET released_at=now() WHERE name=$1", [`hold-dispatch:${fx.householdId}`]);
      await pending;
      expect((await statuses(batchId)).at(-1)).toBe("dispatch_started");
      vi.advanceTimersByTime(30_000); // the sweep fires; the server was never restarted
      const t = Date.now();
      while ((await statuses(batchId)).at(-1) !== "uncertain" && Date.now() - t < 3_000) await sleep(25);
      expect((await statuses(batchId)).at(-1), "the running server's sweep must mark the abandoned send").toBe("uncertain");
      expect(await retailerCalls()).toBe(0); // never replayed
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      if (prev === undefined) delete process.env.NEXT_RUNTIME;
      else process.env.NEXT_RUNTIME = prev;
    }
  });
});

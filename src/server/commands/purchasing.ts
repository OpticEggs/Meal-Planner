import { hashOf } from "@/domain/hash";
import { inTransaction, pool, type Db } from "../db/pool";
import { dispatchRecoveryAfterMs, dispatchTimeoutMs, isTestEnv } from "../env";
import { log } from "../log";
import { Reject, runCommand, type Actor, type CommandReceipt } from "./framework";
import { batchStatuses, ensureCycle, recomputeProjection } from "../groceries/recompute";
import { currentLines } from "./groceries";
import { retailer, waitForBarrier } from "../integrations/retailer";

/**
 * Grocery handoff in three short transactions with a clear dispatch boundary:
 *  T1 (StartHandoff command): validate the reviewed fingerprint + payload under the
 *     household lock, freeze an immutable batch, consume the approvals. A stale review
 *     creates nothing, so it can never reach the adapter.
 *  T2: re-validate the authorized batch under the lock; superseded -> canceled before
 *     dispatch; otherwise commit "dispatch_started".
 *  network call outside any transaction
 *  T3: record the outcome at the granularity the adapter reports. Ambiguity -> uncertain,
 *     never replayed automatically.
 */

export interface StartHandoffPayload {
  weekId: string;
  reviewFingerprint: string;
  payloadHash: string;
}

export async function startHandoff(actor: Actor, operationId: string, p: StartHandoffPayload): Promise<CommandReceipt & { dispatch?: unknown }> {
  const adapter = retailer();
  const receipt = await runCommand(actor, "StartHandoff", operationId, p, async (c) => {
    const st = adapter.status();
    if (!st.ready) throw new Reject("retailer_not_ready", st.reason);
    const cycleId = await ensureCycle(c, actor.householdId, p.weekId);
    const w = await c.query("SELECT 1 FROM weeks WHERE id=$1 AND household_id=$2", [p.weekId, actor.householdId]);
    if (!w.rowCount) throw new Reject("not_found", "Week not found");
    const cyc = await c.query(
      "SELECT g.projection_summary, g.projection_inputs_revision, h.purchasing_revision FROM grocery_cycles g JOIN households h ON h.id=g.household_id WHERE g.id=$1",
      [cycleId],
    );
    const summary = cyc.rows[0].projection_summary;
    if (Number(cyc.rows[0].projection_inputs_revision) !== Number(cyc.rows[0].purchasing_revision)) {
      throw new Reject("stale_review", "Household products or prices changed; this list must be reviewed again. Nothing was sent.");
    }
    if (summary.reviewFingerprint !== p.reviewFingerprint || summary.payloadHash !== p.payloadHash) {
      throw new Reject("stale_review", "Groceries changed since this review. Nothing was sent; review the current list.", {
        currentReviewFingerprint: summary.reviewFingerprint,
      });
    }
    if (!summary.ready) throw new Reject("not_ready", `Groceries are not ready: ${summary.readyBlockers.join("; ")}`, { blockers: summary.readyBlockers });
    const lines = await currentLines(c, cycleId);
    const payload: { productRef: string; ingredientKey: string; packages: number }[] = summary.payload;
    if (hashOf(payload) !== p.payloadHash) throw new Reject("stale_review", "Payload does not match the reviewed list.");
    const batch = await c.query(
      `INSERT INTO handoff_batches(household_id, cycle_id, adapter, review_fingerprint, payload, payload_hash, authorized_by, operation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [actor.householdId, cycleId, adapter.mode, p.reviewFingerprint, JSON.stringify(payload), p.payloadHash, actor.memberId, operationId],
    );
    const batchId = batch.rows[0].id;
    for (const item of payload) {
      const l = lines.find((x) => x.key === item.ingredientKey)!;
      const ap = await c.query("SELECT id FROM purchase_approvals WHERE cycle_id=$1 AND ingredient_key=$2 AND state='active'", [cycleId, item.ingredientKey]);
      if (!ap.rowCount || !l.approval?.valid) throw new Reject("stale_review", `${l.name} is not approved for this quantity.`);
      await c.query(
        "INSERT INTO handoff_batch_lines(batch_id, ingredient_key, product_id, product_ref, packages, line_fingerprint, approval_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [batchId, item.ingredientKey, l.product!.id, item.productRef, item.packages, l.fingerprint, ap.rows[0].id],
      );
      // Consumed once: the same reviewed demand cannot be sent again under another operation id.
      await c.query("UPDATE purchase_approvals SET state='consumed', state_changed_at=now(), consumed_by_batch=$2 WHERE id=$1", [ap.rows[0].id, batchId]);
    }
    await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'authorized',$2)", [batchId, { by: actor.displayName }]);
    return {
      status: "accepted",
      result: { batchId, items: payload.length, adapter: adapter.mode, simulated: !adapter.live },
      change: { weekId: p.weekId, summary: { type: "handoff", text: `${actor.displayName} approved sending ${payload.length} item(s) to ${adapter.label}` } },
      recomputeWeeks: [p.weekId],
    };
  });
  if (receipt.status !== "accepted" || receipt.replayed) return receipt;
  const dispatch = await dispatchBatch(actor.householdId, String(receipt.result.batchId), p.weekId);
  return { ...receipt, dispatch };
}

async function currentStatus(c: Db, batchId: string): Promise<string> {
  const r = await c.query("SELECT status FROM handoff_status_events WHERE batch_id=$1 ORDER BY id DESC LIMIT 1", [batchId]);
  return r.rows[0]?.status;
}

async function emit(c: Db, householdId: string, weekId: string, text: string, extra: Record<string, unknown> = {}) {
  const u = await c.query("UPDATE households SET update_seq=update_seq+1 WHERE id=$1 RETURNING update_seq", [householdId]);
  const w = await c.query("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [weekId]);
  await c.query("INSERT INTO change_events(household_id, seq, actor_member_id, command, summary, accepted_choice_revision) VALUES ($1,$2,NULL,'Dispatch',$3,$4)", [
    householdId, u.rows[0].update_seq, { type: "handoff", text, weekId, ...extra }, w.rows[0].accepted_choice_revision,
  ]);
}

export async function dispatchBatch(householdId: string, batchId: string, weekId: string) {
  if (isTestEnv()) await waitForBarrier(`hold-dispatch:${householdId}`, 30_000);
  // T2: re-validate under the coordination lock.
  const decision = await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
    const status = await currentStatus(c, batchId);
    if (status !== "authorized") return { go: false as const, status };
    const b = await c.query("SELECT * FROM handoff_batches WHERE id=$1", [batchId]);
    const bl = await c.query("SELECT * FROM handoff_batch_lines WHERE batch_id=$1", [batchId]);
    const cycleId = b.rows[0].cycle_id;
    const lines = await currentLines(c, cycleId);
    const superseded = bl.rows.filter((x) => lines.find((l) => l.key === x.ingredient_key)?.fingerprint !== x.line_fingerprint);
    if (superseded.length) {
      await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'canceled_before_dispatch',$2)", [
        batchId, { reason: "requirements changed before dispatch", lines: superseded.map((x) => x.ingredient_key) },
      ]);
      // Unchanged lines keep their approval: re-issue it for the same fingerprint.
      for (const x of bl.rows.filter((y) => !superseded.includes(y))) {
        const ap = await c.query("SELECT * FROM purchase_approvals WHERE id=$1", [x.approval_id]);
        const a = ap.rows[0];
        await c.query(
          "INSERT INTO purchase_approvals(household_id, cycle_id, ingredient_key, product_id, packages, line_fingerprint, approved_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [a.household_id, a.cycle_id, a.ingredient_key, a.product_id, a.packages, a.line_fingerprint, a.approved_by],
        );
      }
      await recomputeProjection(c, householdId, weekId);
      await emit(c, householdId, weekId, "A queued transfer was canceled before sending because the list changed. Review again.");
      return { go: false as const, status: "canceled_before_dispatch" };
    }
    await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'dispatch_started',$2)", [batchId, { dispatchId: `${batchId}:1` }]);
    await emit(c, householdId, weekId, "Sending to the retailer…");
    return { go: true as const, payload: b.rows[0].payload as { productRef: string; packages: number }[] };
  });
  if (!decision.go) {
    log({ at: "dispatch", batchId, status: decision.status });
    return { status: decision.status };
  }
  // Network I/O outside any transaction, bounded: no answer within the dispatch bound is uncertain
  // (never retried). The bound is what lets recovery tell an interrupted send from a slow one.
  let outcome: { kind: "acknowledged" | "failed" | "uncertain"; evidence: Record<string, unknown> };
  const bound = dispatchTimeoutMs();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    outcome = await Promise.race([
      retailer().addToCart({
        householdId, batchId, dispatchId: `${batchId}:1`,
        items: decision.payload.map((i) => ({ productRef: i.productRef, quantity: i.packages })),
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DispatchBoundExceeded(`no response within ${Math.round(bound / 1000)} s; outcome unknown`)), bound);
      }),
    ]);
  } catch (e) {
    outcome = { kind: "uncertain" as const, evidence: e instanceof DispatchBoundExceeded ? { reason: e.message, boundMs: bound } : { error: (e as Error).message } };
  } finally {
    clearTimeout(timer);
  }
  const final = outcome.kind;
  const recorded = await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
    // Another process may already have marked this send uncertain (it outlived the recovery bound,
    // or a member may since have checked the cart). A late answer never overwrites that: it is
    // reported, labeled late, and the transfer stays uncertain.
    const now = await currentStatus(c, batchId);
    if (now !== "dispatch_started") {
      await emit(c, householdId, weekId, `A late retailer response (${final}) arrived for a transfer already marked ${now}. It stays ${now}; check the retailer cart.`, {
        lateOutcome: { kind: final, evidence: outcome.evidence, statusWhenArrived: now },
      });
      return false;
    }
    await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,$2,$3)", [batchId, final, outcome.evidence]);
    await recomputeProjection(c, householdId, weekId);
    const text = final === "acknowledged" ? "The retailer acknowledged the transfer (batch-level)." : final === "failed" ? "The transfer failed. Nothing was added." : "The transfer outcome is uncertain. Check the retailer cart; Table will not resend automatically.";
    await emit(c, householdId, weekId, text);
    return true;
  });
  if (!recorded) {
    log({ at: "dispatch", batchId, status: "late_outcome_ignored", outcome: final });
    return { status: "uncertain" as const };
  }
  log({ at: "dispatch", batchId, status: final });
  return { status: final };
}

class DispatchBoundExceeded extends Error {}

/** Server start: recover only sends older than the recovery bound — a process starting while another
 *  is still sending (an overlapping deploy) leaves that send alone. */
export async function startupRecovery(): Promise<number> {
  return recoverInterruptedDispatches(dispatchRecoveryAfterMs());
}

/** After a crash, a batch left in dispatch_started has an unknown external outcome. Mark it
 *  uncertain — never replay it. */
export async function recoverInterruptedDispatches(olderThanMs = 60_000): Promise<number> {
  const r = await pool().query(
    `SELECT b.id, b.household_id, g.week_id FROM handoff_batches b JOIN grocery_cycles g ON g.id=b.cycle_id
     WHERE (SELECT status FROM handoff_status_events s WHERE s.batch_id=b.id ORDER BY s.id DESC LIMIT 1) = 'dispatch_started'
       AND (SELECT at FROM handoff_status_events s WHERE s.batch_id=b.id ORDER BY s.id DESC LIMIT 1) < clock_timestamp() - ($1 || ' milliseconds')::interval`,
    [olderThanMs],
  );
  for (const b of r.rows) {
    await inTransaction(async (c) => {
      await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [b.household_id]);
      if ((await currentStatus(c, b.id)) !== "dispatch_started") return;
      await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'uncertain',$2)", [b.id, { reason: "process stopped after dispatch started; outcome unknown" }]);
      await recomputeProjection(c, b.household_id, b.week_id);
      await emit(c, b.household_id, b.week_id, "A transfer was interrupted. Its outcome is uncertain; check the retailer cart.");
    });
  }
  return r.rowCount ?? 0;
}

/** A member's explicit observation of what the retailer cart actually holds. */
export function resolveUncertainTransferCommand(actor: Actor, operationId: string, p: { batchId: string; observed: "in_cart" | "not_in_cart" }) {
  return runCommand(actor, "ResolveUncertainTransfer", operationId, p, async (c) => {
    const b = await c.query(
      "SELECT b.id, g.week_id FROM handoff_batches b JOIN grocery_cycles g ON g.id=b.cycle_id WHERE b.id=$1 AND b.household_id=$2",
      [p.batchId, actor.householdId],
    );
    if (!b.rowCount) throw new Reject("not_found", "Transfer not found");
    const statuses = await batchStatuses(c, (await c.query("SELECT cycle_id FROM handoff_batches WHERE id=$1", [p.batchId])).rows[0].cycle_id);
    if (statuses.get(p.batchId) !== "uncertain") throw new Reject("invalid", "Only an uncertain transfer can be resolved by observation");
    await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,$2,$3)", [
      p.batchId, p.observed === "in_cart" ? "acknowledged" : "failed", { source: "member observation of the retailer cart", by: actor.displayName },
    ]);
    return {
      status: "accepted", result: {},
      change: { weekId: b.rows[0].week_id, summary: { type: "handoff", text: `${actor.displayName} checked the cart: ${p.observed === "in_cart" ? "items are there" : "items are not there"}` } },
      recomputeWeeks: [b.rows[0].week_id],
    };
  });
}

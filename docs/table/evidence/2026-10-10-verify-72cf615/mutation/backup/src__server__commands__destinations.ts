import { inTransaction, type Db } from "../db/pool";
import { Reject, runCommand, type Actor } from "./framework";
import { ensureCycle, projectionInput } from "../groceries/recompute";
import { computeProjection, type Destination } from "@/domain/groceries/projection";
import { buildShoppingList } from "@/domain/groceries/shopping-list";
import { instacartPreview, instacartTransport } from "../groceries/instacart-list";
import { buildShoppingListPayload, createShoppingListLink, type InstacartDeps, type ShoppingListLinkOutcome } from "../integrations/instacart/client";
import { instacartCapabilityStatus } from "../integrations/instacart/config";
import { log } from "../log";

/**
 * Where to shop, per pickup cycle (multi-source handoff, phases 4–5). Changing it is a purchasing-
 * input change: the cycle's projection is recomputed for the new way of shopping, so the review
 * fingerprint changes, approvals bound to store products go stale, and an old Send or an old list
 * request does nothing. Meals, portions, requests, orders and transfer history are untouched.
 */

export const DESTINATIONS: Destination[] = ["retailer_cart", "instacart_list", "manual"];

async function cycleForWeek(c: Db, householdId: string, weekId: string) {
  const w = await c.query("SELECT id, accepted_choice_revision FROM weeks WHERE id=$1 AND household_id=$2", [weekId, householdId]);
  if (!w.rowCount) throw new Reject("not_found", "Week not found");
  const id = await ensureCycle(c, householdId, weekId);
  return (await c.query("SELECT * FROM grocery_cycles WHERE id=$1", [id])).rows[0];
}

export function setShoppingDestinationCommand(
  actor: Actor, operationId: string,
  p: { weekId: string; destination: Destination; expectedRevision: number; storeLabel?: string | null; remember?: boolean },
) {
  return runCommand(actor, "SetShoppingDestination", operationId, p, async (c) => {
    if (!DESTINATIONS.includes(p?.destination)) throw new Reject("invalid", "Choose a way to shop");
    const cyc = await cycleForWeek(c, actor.householdId, p.weekId);
    if (!Number.isInteger(p.expectedRevision)) throw new Reject("invalid", "Say which choice you saw");
    if (cyc.destination_revision !== p.expectedRevision) {
      throw new Reject("stale", "The other member changed where to shop while you were choosing. Nothing was changed; check the current choice.", {
        current: { destination: cyc.destination, revision: cyc.destination_revision },
      });
    }
    const label = p.destination === "manual" && typeof p.storeLabel === "string" && p.storeLabel.trim() ? p.storeLabel.trim().slice(0, 80) : null;
    if (cyc.destination === p.destination && (cyc.destination_store_label ?? null) === label) throw new Reject("stale", "That is already the choice.");
    await c.query(
      `UPDATE grocery_cycles SET destination=$2, destination_store_label=$3, destination_revision=destination_revision+1,
         destination_set_by=$4, destination_set_at=now() WHERE id=$1`,
      [cyc.id, p.destination, label, actor.memberId],
    );
    if (p.remember) await c.query("UPDATE households SET preferred_destination=$2 WHERE id=$1", [actor.householdId, p.destination]);
    const words = { retailer_cart: "the store cart", instacart_list: "an Instacart shopping list", manual: label ? `another store (${label})` : "another store (copy the list)" }[p.destination];
    return {
      status: "accepted",
      result: { destination: p.destination, revision: cyc.destination_revision + 1 },
      change: { weekId: p.weekId, summary: { type: "destination", text: `${actor.displayName} chose to shop with ${words}. The grocery review changed; review it again.` } },
      recomputeWeeks: [p.weekId],
    };
  });
}

/** Current list + Instacart preview for a cycle, computed exactly as the snapshot shows it. */
async function currentPreview(c: Db, householdId: string, weekId: string, cyc: { destination: Destination; destination_revision: number }) {
  const { input } = await projectionInput(c, householdId, weekId);
  const list = buildShoppingList(computeProjection(input).lines, cyc.destination);
  return instacartPreview(list, cyc.destination_revision);
}

export interface PrepareListPayload {
  weekId: string;
  listFingerprint: string;
  destinationRevision: number;
}

/**
 * Prepare an Instacart shopping-list LINK. T1 freezes the reviewed list under the household lock;
 * T2 re-checks it before any network call (changed → canceled, zero provider calls); the request
 * runs outside any transaction; T3 records the outcome once. A timeout or server error is uncertain
 * and is never repeated automatically. A link is not a cart write and not an order.
 */
export async function prepareInstacartListCommand(actor: Actor, operationId: string, p: PrepareListPayload, deps?: InstacartDeps) {
  const receipt = await runCommand(actor, "PrepareInstacartList", operationId, p, async (c) => {
    // Not set up (the default everywhere): refused before anything is recorded or requested.
    if (instacartCapabilityStatus("list", deps?.env ?? process.env).status === "not_configured") {
      throw new Reject("not_configured", "Instacart shopping lists aren't set up here (they need Instacart developer access). Nothing was sent; copy the list instead.");
    }
    const cyc = await cycleForWeek(c, actor.householdId, p?.weekId);
    if (cyc.destination !== "instacart_list") throw new Reject("stale_review", "The chosen way to shop is no longer an Instacart list. Nothing was requested.");
    if (cyc.destination_revision !== p.destinationRevision) throw new Reject("stale_review", "Where to shop changed since your review. Nothing was requested; review the list again.");
    const preview = await currentPreview(c, actor.householdId, p.weekId, cyc);
    if (preview.fingerprint !== p.listFingerprint) throw new Reject("stale_review", "The grocery list changed since your review. Nothing was requested; review it again.");
    if (!preview.lines.length) throw new Reject("not_ready", "Nothing on the list can be sent to Instacart.");
    const payload = { title: "Table groceries", lines: preview.lines.map(({ key: _k, ...l }) => l) };
    const built = buildShoppingListPayload(payload);
    if (!built.ok) throw new Reject("not_ready", "Some list lines can't be sent to Instacart. Nothing was requested.", { problems: built.problems });
    // The same reviewed list already has a link: show it again, no new request.
    const existing = await c.query(
      `SELECT id, link_url FROM instacart_list_links WHERE cycle_id=$1 AND list_fingerprint=$2 AND status='link_prepared'
         AND (expires_at IS NULL OR expires_at > now()) ORDER BY requested_at DESC LIMIT 1`,
      [cyc.id, p.listFingerprint],
    );
    if (existing.rowCount) return { status: "accepted", result: { linkId: existing.rows[0].id, reused: true } };
    const inflight = await c.query("SELECT 1 FROM instacart_list_links WHERE cycle_id=$1 AND status='requested'", [cyc.id]);
    if (inflight.rowCount) throw new Reject("in_progress", "A list request is already in progress.");
    const r = await c.query(
      `INSERT INTO instacart_list_links(household_id, cycle_id, destination_revision, list_fingerprint, request_hash, payload, requested_by, operation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [actor.householdId, cyc.id, cyc.destination_revision, p.listFingerprint, built.requestHash, JSON.stringify(payload), actor.memberId, operationId],
    );
    return {
      status: "accepted",
      result: { linkId: r.rows[0].id, reused: false },
      change: { weekId: p.weekId, summary: { type: "instacart", text: `${actor.displayName} asked for an Instacart shopping list (${payload.lines.length} items)` } },
    };
  });
  if (receipt.status !== "accepted" || receipt.replayed || receipt.result.reused) return receipt;
  const linkId = String(receipt.result.linkId);

  // T2: re-check before any network call.
  const go = await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [actor.householdId]);
    const l = (await c.query("SELECT * FROM instacart_list_links WHERE id=$1", [linkId])).rows[0];
    const cyc = (await c.query("SELECT * FROM grocery_cycles WHERE id=$1", [l.cycle_id])).rows[0];
    const preview = cyc.destination === "instacart_list" ? await currentPreview(c, actor.householdId, p.weekId, cyc) : null;
    if (!preview || cyc.destination_revision !== l.destination_revision || preview.fingerprint !== l.list_fingerprint) {
      await c.query("UPDATE instacart_list_links SET status='canceled_before_request', finished_at=now(), outcome=$2 WHERE id=$1", [linkId, { reason: "list or destination changed before the request" }]);
      return null;
    }
    return l.payload as { title: string; lines: { name: string; quantity: string; unit: string; displayText?: string }[] };
  });
  if (!go) return { ...receipt, link: { status: "canceled_before_request" } };

  let outcome: ShoppingListLinkOutcome;
  try {
    outcome = await createShoppingListLink(deps ?? { transport: instacartTransport() }, go as Parameters<typeof createShoppingListLink>[1]);
  } catch (e) {
    outcome = { kind: "uncertain", reason: "network_error", requestHash: "", evidence: { error: (e as Error).name } as never };
  }
  const status = outcome.kind === "link_prepared" ? "link_prepared" : outcome.kind === "uncertain" ? "uncertain" : "failed";
  const evidence =
    outcome.kind === "link_prepared" ? { meaning: "a shopping-list page; not a cart write, not an order" }
    : outcome.kind === "failed" ? { status: outcome.status ?? null, code: outcome.code, providerCode: outcome.providerError?.code ?? null }
    : outcome.kind === "uncertain" ? { reason: outcome.reason, status: outcome.status ?? null }
    : outcome.kind === "unavailable" ? { unavailable: outcome.reason }
    : { refused: outcome.problems.map((x) => x.reason) };
  // T3: the outcome is written once.
  await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [actor.householdId]);
    await c.query(
      "UPDATE instacart_list_links SET status=$2, link_url=$3, expires_at=$4, outcome=$5, finished_at=now() WHERE id=$1 AND status='requested'",
      [linkId, status, outcome.kind === "link_prepared" ? outcome.url : null, outcome.kind === "link_prepared" ? outcome.expiresAt : null, evidence],
    );
    const u = await c.query("UPDATE households SET update_seq=update_seq+1 WHERE id=$1 RETURNING update_seq", [actor.householdId]);
    const text = status === "link_prepared" ? "The Instacart shopping list is ready to open. Nothing was ordered."
      : status === "uncertain" ? "The Instacart list request has an unknown outcome. Table won't repeat it on its own."
      : outcome.kind === "unavailable" ? "Instacart lists aren't set up here. Nothing was sent." : "Instacart refused the list request. Nothing was ordered.";
    await c.query("INSERT INTO change_events(household_id, seq, actor_member_id, command, summary) VALUES ($1,$2,$3,'InstacartList',$4)", [
      actor.householdId, u.rows[0].update_seq, actor.memberId, { type: "instacart", text, weekId: p.weekId },
    ]);
  });
  log({ at: "instacart_list", linkId, status });
  return { ...receipt, link: { status } };
}

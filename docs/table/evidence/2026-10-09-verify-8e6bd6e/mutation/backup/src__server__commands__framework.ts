import { hashOf } from "@/domain/hash";
import { inTransaction, type Db } from "../db/pool";
import { recomputeProjection } from "../groceries/recompute";
import { log } from "../log";

export interface Actor {
  memberId: string;
  householdId: string;
  displayName: string;
}

export type Rejection = {
  status: "rejected";
  code: string;
  message: string;
  details?: unknown;
};

export type Acceptance = {
  status: "accepted";
  result: Record<string, unknown>;
};

export type CommandReceipt = (Acceptance | Rejection) & {
  operationId: string;
  command: string;
  replayed: boolean;
  seq: number | null;
  acceptedChoiceRevision?: number | null;
};

export interface HandlerOutcome {
  status: "accepted" | "rejected";
  result?: Record<string, unknown>;
  code?: string;
  message?: string;
  details?: unknown;
  /** Household change summary; when present a change event is committed and delivered. */
  change?: { summary: Record<string, unknown>; weekId?: string | null };
  /** Weeks whose grocery projection must be recomputed in this transaction. */
  recomputeWeeks?: string[];
  /** Household-wide purchasing inputs (products, mappings, prices, budget) changed: bump the
   *  purchasing revision and recompute every grocery cycle of the household. */
  purchasingInputsChanged?: boolean;
}

export class Reject extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * The one mutation path. Inside one short transaction:
 *  1. lock the household coordination row (orders commits; conflicts are decided per target)
 *  2. resolve the operation id (same id + same request -> recorded outcome; same id + different request -> reject)
 *  3. run the handler; a rejection rolls back every partial write
 *  4. recompute affected projections, append the change event, record the receipt, commit.
 * No network I/O happens inside the transaction.
 */
export async function runCommand(
  actor: Actor,
  command: string,
  operationId: string,
  payload: unknown,
  handler: (c: Db) => Promise<HandlerOutcome>,
): Promise<CommandReceipt> {
  if (typeof operationId !== "string" || !/^[A-Za-z0-9_.:-]{8,100}$/.test(operationId)) {
    return { status: "rejected", code: "invalid_operation_id", message: "operationId is required (8-100 safe characters)", operationId: String(operationId), command, replayed: false, seq: null };
  }
  const requestHash = hashOf({ command, payload });
  const receipt = await inTransaction(async (c) => {
    const h = await c.query("SELECT update_seq FROM households WHERE id=$1 FOR UPDATE", [actor.householdId]);
    if (!h.rowCount) throw new Error("household missing");
    const prior = await c.query(
      "SELECT command, request_hash, status, outcome, actor_member_id FROM command_receipts WHERE household_id=$1 AND operation_id=$2",
      [actor.householdId, operationId],
    );
    if (prior.rowCount) {
      const p = prior.rows[0];
      if (p.request_hash !== requestHash || p.actor_member_id !== actor.memberId) {
        return {
          status: "rejected" as const, code: "operation_id_reused",
          message: "This operation id was already used for a different request. Nothing was changed.",
          operationId, command, replayed: true, seq: null,
        };
      }
      return { ...(p.outcome as CommandReceipt), replayed: true };
    }

    await c.query("SAVEPOINT cmd");
    let outcome: HandlerOutcome;
    try {
      outcome = await handler(c);
    } catch (e) {
      if (e instanceof Reject) outcome = { status: "rejected", code: e.code, message: e.message, details: e.details };
      else throw e;
    }
    let seq: number | null = null;
    let acceptedChoiceRevision: number | null = null;
    if (outcome.status === "rejected") {
      await c.query("ROLLBACK TO SAVEPOINT cmd");
    } else {
      if (outcome.purchasingInputsChanged) {
        await c.query("UPDATE households SET purchasing_revision = purchasing_revision + 1 WHERE id=$1", [actor.householdId]);
        const cycles = await c.query("SELECT week_id FROM grocery_cycles WHERE household_id=$1", [actor.householdId]);
        for (const r of cycles.rows) await recomputeProjection(c, actor.householdId, r.week_id);
      } else {
        for (const weekId of new Set(outcome.recomputeWeeks ?? [])) {
          await recomputeProjection(c, actor.householdId, weekId);
        }
      }
      if (outcome.change) {
        const u = await c.query("UPDATE households SET update_seq = update_seq + 1 WHERE id=$1 RETURNING update_seq", [actor.householdId]);
        seq = u.rows[0].update_seq;
        if (outcome.change.weekId) {
          const w = await c.query("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [outcome.change.weekId]);
          acceptedChoiceRevision = w.rows[0]?.accepted_choice_revision ?? null;
        }
        await c.query(
          "INSERT INTO change_events(household_id, seq, actor_member_id, command, summary, accepted_choice_revision) VALUES ($1,$2,$3,$4,$5,$6)",
          [actor.householdId, seq, actor.memberId, command, { ...outcome.change.summary, actor: actor.displayName, weekId: outcome.change.weekId ?? null }, acceptedChoiceRevision],
        );
      }
    }
    const r: CommandReceipt =
      outcome.status === "accepted"
        ? { status: "accepted", result: outcome.result ?? {}, operationId, command, replayed: false, seq, acceptedChoiceRevision }
        : { status: "rejected", code: outcome.code ?? "rejected", message: outcome.message ?? "Rejected", details: outcome.details, operationId, command, replayed: false, seq: null };
    await c.query(
      "INSERT INTO command_receipts(household_id, operation_id, actor_member_id, command, request_hash, status, outcome) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [actor.householdId, operationId, actor.memberId, command, requestHash, r.status, r],
    );
    return r;
  });
  log({ at: "command", command, operationId, status: receipt.status, code: "code" in receipt ? receipt.code : undefined, seq: receipt.seq, replayed: receipt.replayed });
  return receipt;
}

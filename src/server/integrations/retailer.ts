import { pool } from "../db/pool";
import { isTestEnv, retailerMode, tableEnv } from "../env";

/**
 * One retailer interface. The recording fake ("Simulated retailer") is the default and
 * is always labeled. The Kroger adapter fails closed: no network code is enabled until
 * the capability is verified and a live write is explicitly authorized (Stage 5).
 */

export interface CartItem {
  productRef: string;
  quantity: number;
}

export type AddOutcome =
  | { kind: "acknowledged"; evidence: Record<string, unknown> } // batch-level acknowledgment only
  | { kind: "failed"; evidence: Record<string, unknown> }
  | { kind: "uncertain"; evidence: Record<string, unknown> };

export interface RetailerAdapter {
  mode: "simulated" | "kroger";
  label: string;
  live: boolean;
  status(): { ready: boolean; reason: string };
  addToCart(req: { householdId: string; batchId: string; dispatchId: string; items: CartItem[] }): Promise<AddOutcome>;
}

class TimeoutAfterAccept extends Error {}

export const simulatedRetailer: RetailerAdapter = {
  mode: "simulated",
  label: "Simulated retailer — nothing is sent to a store",
  live: false,
  status() {
    return { ready: true, reason: "Simulated retailer: transfers are recorded locally and never reach a store." };
  },
  async addToCart(req) {
    const p = pool();
    const script = await p.query(
      `UPDATE fake_retailer_script SET consumed_at=now() WHERE id = (
         SELECT id FROM fake_retailer_script WHERE household_id=$1 AND consumed_at IS NULL ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
       RETURNING behavior, barrier`,
      [req.householdId],
    );
    const behavior: string = script.rows[0]?.behavior ?? "ack";
    const barrier: string | null = script.rows[0]?.barrier ?? null;
    const body = { items: req.items.map((i) => ({ upc: i.productRef, quantity: i.quantity })) };
    // The record is written first: it is what the "store" received.
    const call = await p.query(
      "INSERT INTO fake_retailer_calls(household_id, batch_id, dispatch_id, request_body, behavior) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [req.householdId, req.batchId, req.dispatchId, body, behavior],
    );
    const callId = call.rows[0].id;
    const finish = async (result: Record<string, unknown>) => {
      await p.query("UPDATE fake_retailer_calls SET result=$2 WHERE id=$1", [callId, result]);
    };
    try {
      if (behavior === "delay_until_barrier" && barrier) {
        await waitForBarrier(barrier, 30_000);
      }
      if (behavior === "reject") {
        await finish({ httpStatus: 400, body: "simulated rejection" });
        return { kind: "failed", evidence: { simulated: true, httpStatus: 400, callId, granularity: "batch" } };
      }
      if (behavior === "accept_then_timeout") {
        await finish({ httpStatus: 204, note: "simulated: accepted, but the response is lost before reaching Table" });
        throw new TimeoutAfterAccept("response lost");
      }
      await finish({ httpStatus: 204 });
      return { kind: "acknowledged", evidence: { simulated: true, httpStatus: 204, callId, granularity: "batch" } };
    } catch (e) {
      if (e instanceof TimeoutAfterAccept) {
        return { kind: "uncertain", evidence: { simulated: true, reason: "timeout after possible acceptance", callId } };
      }
      throw e;
    }
  },
};

export const krogerRetailer: RetailerAdapter = {
  mode: "kroger",
  label: "Kroger",
  live: true,
  status() {
    const missing = ["KROGER_CLIENT_ID", "KROGER_CLIENT_SECRET", "KROGER_REDIRECT_URI", "KROGER_LOCATION_ID"].filter((k) => !process.env[k]);
    if (missing.length) return { ready: false, reason: `Kroger is not configured (missing ${missing.join(", ")}). No transfer is possible.` };
    return { ready: false, reason: "Kroger cart transfer is not verified or authorized yet (Stage 5). No transfer is possible." };
  },
  async addToCart() {
    throw new Error("Kroger adapter is disabled until verified and authorized");
  },
};

export function retailer(): RetailerAdapter {
  return retailerMode() === "kroger" ? krogerRetailer : simulatedRetailer;
}

/** Test barrier: waits until a named barrier is released. Only honored when TABLE_ENV=test. */
export async function waitForBarrier(name: string, timeoutMs: number): Promise<void> {
  if (!isTestEnv()) return;
  const start = Date.now();
  for (;;) {
    const r = await pool().query("SELECT released_at FROM test_barriers WHERE name=$1", [name]);
    if (!r.rowCount || r.rows[0].released_at) return;
    if (Date.now() - start > timeoutMs) throw new Error(`barrier ${name} not released`);
    await new Promise((res) => setTimeout(res, 40));
  }
}

export function retailerSummary() {
  const r = retailer();
  const s = r.status();
  return { mode: r.mode, label: r.label, live: r.live, ready: s.ready, reason: s.reason, env: tableEnv() };
}

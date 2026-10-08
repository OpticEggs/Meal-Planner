import { Reject, runCommand, type Actor } from "./framework";
import { connectionEvent } from "../integrations/kroger/connection";
import { isLocationId } from "../integrations/kroger/products";

/**
 * Household Kroger settings that are ordinary household decisions (lock, idempotency, receipt,
 * change event). Connecting itself happens through /api/kroger/connect and the OAuth callback.
 */

/** Discards this household's sealed Kroger tokens. Kroger documents no revocation endpoint, so
 *  this cannot revoke them at Kroger; it guarantees Table never uses them again. */
export function disconnectKrogerCommand(actor: Actor, operationId: string, _p: Record<string, never>) {
  return runCommand(actor, "DisconnectKroger", operationId, {}, async (c) => {
    const r = await c.query(
      `UPDATE kroger_connections SET status='disconnected', access_token_sealed=NULL, refresh_token_sealed=NULL, access_expires_at=NULL,
         refresh_lease_id=NULL, refresh_lease_until=NULL, token_revision=token_revision+1, updated_at=clock_timestamp()
       WHERE household_id=$1 AND status IN ('connected','needs_reauthorization') RETURNING 1`,
      [actor.householdId],
    );
    if (!r.rowCount) throw new Reject("not_connected", "Kroger is not connected for this household.");
    await connectionEvent(c, actor.householdId, "disconnected", actor.memberId, { revokedAtKroger: false });
    return {
      status: "accepted",
      result: { status: "disconnected", revokedAtKroger: false },
      change: { weekId: null, summary: { type: "kroger", text: `${actor.displayName} disconnected Kroger. Table deleted its copy of the authorization.` } },
    };
  });
}

/** The household's Kroger store. Kroger location ids are 8 characters. */
export function setKrogerLocationCommand(actor: Actor, operationId: string, p: { locationId: string }) {
  return runCommand(actor, "SetKrogerLocation", operationId, p, async (c) => {
    if (!isLocationId(p?.locationId)) throw new Reject("invalid", "A Kroger location id has 8 letters or digits.", { field: "locationId" });
    await c.query(
      `INSERT INTO kroger_connections(household_id, status, location_id, location_set_by) VALUES ($1,'not_connected',$2,$3)
       ON CONFLICT (household_id) DO UPDATE SET location_id=EXCLUDED.location_id, location_set_by=EXCLUDED.location_set_by, updated_at=clock_timestamp()`,
      [actor.householdId, p.locationId, actor.memberId],
    );
    await connectionEvent(c, actor.householdId, "location_set", actor.memberId, { locationId: p.locationId });
    return {
      status: "accepted",
      result: { locationId: p.locationId },
      change: { weekId: null, summary: { type: "kroger", text: `${actor.displayName} set the Kroger store to ${p.locationId}.` } },
    };
  });
}

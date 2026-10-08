import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { pool } from "@/server/db/pool";
import { connectionView } from "@/server/integrations/kroger/connection";
import { krogerStatusReport } from "@/server/integrations/kroger/config";
import { krogerCartReadiness } from "@/server/integrations/kroger/adapter";

export const dynamic = "force-dynamic";

/** Per-capability status (documented / implemented / fixture-tested; never live-verified) and the
 *  signed-in household's connection. Contains no tokens or secrets. */
export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const report = krogerStatusReport();
  const connection = await connectionView(pool(), actor.householdId);
  const cart = report.retailer === "kroger" ? await krogerCartReadiness(actor.householdId) : { ready: false, reason: "The active retailer is the simulated recording fake." };
  return NextResponse.json({ ...report, connection, cartHandoff: cart }, { headers: { "cache-control": "no-store" } });
}

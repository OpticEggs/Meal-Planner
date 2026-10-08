import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { nearbyRetailers } from "@/server/integrations/instacart/client";
import { instacartTransport } from "@/server/groceries/instacart-list";

export const dynamic = "force-dynamic";

/** Grocery brands Instacart lists for a ZIP code (only when the capability is set up; nothing is
 *  stored). A brand is not a store location, pickup slot, stock or price. */
export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const postalCode = (new URL(req.url).searchParams.get("postal_code") ?? "").slice(0, 12);
  const r = await nearbyRetailers({ transport: instacartTransport() }, { postalCode, countryCode: "US" });
  const body =
    r.kind === "ok" ? { kind: "ok", postalCode, retailers: r.retailers.map((b) => ({ key: b.key, name: b.name })) }
    : r.kind === "unavailable" ? { kind: "unavailable", message: "Retailer lookup isn't set up here; no nearby results are shown." }
    : r.kind === "refused" ? { kind: "refused", message: "Enter a 5-digit ZIP code." }
    : { kind: "failed", message: "Instacart didn't answer the lookup. Nothing is assumed about nearby stores." };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}

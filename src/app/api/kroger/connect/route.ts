import { NextResponse } from "next/server";
import { actorFrom, sameOrigin } from "@/server/session";
import { startAuthorization } from "@/server/integrations/kroger/connection";

export const dynamic = "force-dynamic";

/** Starts a Kroger customer authorization for the signed-in member's household. Same CSRF/origin
 *  rules as /api/commands/*. Answers with the Kroger authorize URL; nothing is fetched here. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const r = await startAuthorization(actor);
  if (!r.ok) return NextResponse.json({ code: r.code, message: r.message }, { status: 409, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ authorizeUrl: r.authorizeUrl }, { headers: { "cache-control": "no-store" } });
}

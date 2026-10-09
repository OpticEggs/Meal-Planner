import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { completeAuthorization } from "@/server/integrations/kroger/connection";

export const dynamic = "force-dynamic";

/** Kroger redirects the member's browser here. The member must be signed in; the state must be
 *  this member's, unexpired and unused. The code is never echoed back or logged. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // A same-origin relative Location: `req.url` carries the server's bind address (localhost, 0.0.0.0
  // behind a host's proxy), not the origin the member's browser used, so an absolute redirect built
  // from it lands on a host where the member's session cookie is not sent.
  const back = (result: string) =>
    new NextResponse(null, {
      status: 303,
      headers: { location: `/household?kroger=${encodeURIComponent(result)}`, "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  const actor = await actorFrom(req.headers);
  if (!actor) return back("refused");
  const result = await completeAuthorization(actor, {
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    error: url.searchParams.get("error"),
  });
  return back(result);
}

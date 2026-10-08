import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { completeAuthorization } from "@/server/integrations/kroger/connection";

export const dynamic = "force-dynamic";

/** Kroger redirects the member's browser here. The member must be signed in; the state must be
 *  this member's, unexpired and unused. The code is never echoed back or logged. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (result: string) => {
    const to = new URL("/household", url);
    to.searchParams.set("kroger", result);
    return NextResponse.redirect(to, { status: 303, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  };
  const actor = await actorFrom(req.headers);
  if (!actor) return back("refused");
  const result = await completeAuthorization(actor, {
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    error: url.searchParams.get("error"),
  });
  return back(result);
}

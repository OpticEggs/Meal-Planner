import { NextResponse } from "next/server";
import { actorFrom, sameOrigin } from "@/server/session";
import { krogerMatching, matchKrogerLines, searchKrogerForIngredient } from "@/server/kroger-mapping-service";

export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

/** GET ?term= — Kroger products at the household's store (products capability only; no account, no cart).
 *  GET without a term — whether matching is available here, and why not. */
export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const term = new URL(req.url).searchParams.get("term");
  if (term === null) {
    const m = await krogerMatching(actor.householdId);
    return NextResponse.json(m.ok ? { available: true } : { available: false, code: m.code, reason: m.reason }, { headers: noStore });
  }
  return NextResponse.json(await searchKrogerForIngredient(actor, { term }), { headers: noStore });
}

/** POST { lines: [{ key, term }] } — suggestions for several grocery lines (capped); the member still chooses each. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  let body: { lines?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  return NextResponse.json(await matchKrogerLines(actor, { lines: Array.isArray(body.lines) ? body.lines : [] }), { headers: noStore });
}

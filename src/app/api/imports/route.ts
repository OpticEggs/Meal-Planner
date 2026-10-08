import { NextResponse } from "next/server";
import { actorFrom, sameOrigin } from "@/server/session";
import { importFromLink } from "@/server/recipe-import-service";

export const dynamic = "force-dynamic";

/** "Import ingredients" for a saved link: a bounded, SSRF-checked page read (when enabled) that
 *  stages a draft for review. It never creates a recipe; confirming the draft is a separate command. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  let body: { bookmarkId?: unknown; operationId?: unknown; candidate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const operationId = String(body.operationId ?? "");
  if (!/^[A-Za-z0-9_.:-]{8,90}$/.test(operationId)) return NextResponse.json({ error: "operationId is required" }, { status: 400 });
  const r = await importFromLink(actor, {
    bookmarkId: String(body.bookmarkId ?? ""), operationId,
    candidate: typeof body.candidate === "number" ? body.candidate : null,
  });
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}

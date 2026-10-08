import { NextResponse } from "next/server";
import { actorFrom, sameOrigin } from "@/server/session";
import { addRecipeFromLink, importFromLink } from "@/server/recipe-import-service";

export const dynamic = "force-dynamic";

/** Add a recipe from a link (`url`: save it, then read it) or read an already-saved link (`bookmarkId`):
 *  a bounded, SSRF-checked page read (when enabled) that stages a draft for review. It never creates a
 *  recipe; confirming the draft is a separate command. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  let body: { bookmarkId?: unknown; url?: unknown; operationId?: unknown; candidate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const operationId = String(body.operationId ?? "");
  if (!/^[A-Za-z0-9_.:-]{8,90}$/.test(operationId)) return NextResponse.json({ error: "operationId is required" }, { status: 400 });
  const candidate = typeof body.candidate === "number" ? body.candidate : null;
  const r = typeof body.url === "string"
    ? await addRecipeFromLink(actor, { url: body.url.slice(0, 4096), operationId, candidate })
    : await importFromLink(actor, { bookmarkId: String(body.bookmarkId ?? ""), operationId, candidate });
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}

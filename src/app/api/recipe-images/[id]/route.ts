import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { pool } from "@/server/db/pool";

export const dynamic = "force-dynamic";

/** A recipe photo kept under a recorded content permission — served only to the household's members,
 *  with the type sniffed when it was stored, never re-interpreted by the browser. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = await pool().query("SELECT content_type, bytes, sha256 FROM recipe_images WHERE id=$1 AND household_id=$2", [id, actor.householdId]);
  if (!r.rowCount) return NextResponse.json({ error: "not found" }, { status: 404 });
  const img = r.rows[0];
  return new NextResponse(new Uint8Array(img.bytes), {
    headers: {
      "content-type": img.content_type,
      "cache-control": "private, max-age=86400, immutable",
      etag: `"${img.sha256}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "content-disposition": "inline",
    },
  });
}

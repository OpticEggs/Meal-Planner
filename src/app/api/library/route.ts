import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { librarySnapshot } from "@/server/queries/library";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  return NextResponse.json(await librarySnapshot(actor), { headers: { "cache-control": "no-store" } });
}

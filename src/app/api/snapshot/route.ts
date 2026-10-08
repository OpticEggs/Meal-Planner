import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { householdSnapshot, IncoherentSnapshot } from "@/server/queries/snapshot";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const week = new URL(req.url).searchParams.get("week");
  for (let attempt = 0; ; attempt++) {
    try {
      return NextResponse.json(await householdSnapshot(actor, week), { headers: { "cache-control": "no-store" } });
    } catch (e) {
      if (e instanceof IncoherentSnapshot && attempt < 2) continue;
      throw e;
    }
  }
}

import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { candidateView } from "@/server/integrations/fdc";
import { outcomeSentence } from "@/domain/nutrition/outcomes";

export const dynamic = "force-dynamic";

/** One FoodData Central food as a normalized candidate plus the digest of exactly those values. */
export async function GET(req: Request, ctx: { params: Promise<{ fdcId: string }> }) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { fdcId } = await ctx.params;
  if (!/^\d{1,10}$/.test(fdcId) || Number(fdcId) <= 0) return NextResponse.json({ outcome: "invalid", message: "Unknown food id." }, { status: 400 });
  const v = await candidateView(Number(fdcId));
  const body = v.outcome === "ok" ? v : { ...v, message: v.outcome === "no_matches" ? "FoodData Central has no food with that id." : outcomeSentence({ kind: v.outcome }) };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}

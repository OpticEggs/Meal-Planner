import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { searchView } from "@/server/integrations/fdc";
import { DATA_TYPES, type FdcDataType } from "@/domain/nutrition/fdc";
import { outcomeSentence } from "@/domain/nutrition/outcomes";

export const dynamic = "force-dynamic";

/** FoodData Central search, server-side (the key never leaves the server). Typed outcome. */
export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  if (!q) return NextResponse.json({ outcome: "invalid", message: "Enter words to search for." }, { status: 400 });
  const types = params.getAll("dataType").filter((t): t is FdcDataType => (DATA_TYPES as readonly string[]).includes(t));
  const v = await searchView(q, types.length ? types : undefined);
  const body = v.outcome === "ok" ? v : { ...v, message: outcomeSentence({ kind: v.outcome }) };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}

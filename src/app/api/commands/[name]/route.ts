import { NextResponse } from "next/server";
import { COMMANDS } from "@/server/commands/registry";
import { actorFrom, sameOrigin } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const handler = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
  if (!handler) return NextResponse.json({ error: "unknown command" }, { status: 404 });
  let body: { operationId?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const receipt = await handler(actor, String(body.operationId ?? ""), body.payload ?? {});
  return NextResponse.json(receipt, { status: receipt.status === "accepted" ? 200 : 409 });
}

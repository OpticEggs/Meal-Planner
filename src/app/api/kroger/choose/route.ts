import { NextResponse } from "next/server";
import { actorFrom, sameOrigin } from "@/server/session";
import { chooseKrogerProduct } from "@/server/kroger-mapping-service";

export const dynamic = "force-dynamic";

/** Match an ingredient to a Kroger product: the product is re-read from Kroger here, then recorded
 *  by the ChooseKrogerProduct command (product, package, store price, mapping). No cart write. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin request refused" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415 });
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  let body: { operationId?: unknown; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const p = body.payload ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const receipt = await chooseKrogerProduct(actor, String(body.operationId ?? ""), {
    weekId: String(p.weekId ?? ""), ingredientKey: String(p.ingredientKey ?? ""), productId: String(p.productId ?? ""),
    expectedProductId: str(p.expectedProductId), packageQty: str(p.packageQty), packageUnit: str(p.packageUnit),
  });
  return NextResponse.json(receipt, { status: receipt.status === "accepted" ? 200 : 409, headers: { "cache-control": "no-store" } });
}

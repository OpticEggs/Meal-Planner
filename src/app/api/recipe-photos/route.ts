import { NextResponse } from "next/server";
import { actorFrom, sameOrigin } from "@/server/session";
import { MEMBER_PHOTO_MAX_BYTES, storeMemberPhoto } from "@/server/recipe-photo-service";

export const dynamic = "force-dynamic";

/** Room for the form's other fields and the multipart boundaries around a photo at the cap. */
const BODY_LIMIT = MEMBER_PHOTO_MAX_BYTES + 64 * 1024;
const NO_STORE = { "cache-control": "no-store" };

const refuse = (status: number, message: string) => NextResponse.json({ error: message }, { status, headers: NO_STORE });

/** Reads at most `limit` bytes of the request body; null when it is longer. */
async function boundedBody(req: Request, limit: number): Promise<Uint8Array | null> {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const ch of chunks) {
    out.set(ch, at);
    at += ch.length;
  }
  return out;
}

/**
 * A member adds their own photo of a dish to a recipe (no publisher permission is involved: they took
 * it). Same CSRF/origin rules as /api/commands/*, with multipart/form-data in place of JSON:
 * fields `recipeId`, `expectedRevision`, `operationId`, `photo` (a file of at most 5 MB). The type is
 * decided by sniffing the bytes (JPEG, PNG, WebP or GIF); the declared type is ignored. Answers
 * `{ status: "accepted", imageId, revision }`, or the command receipt of a rejection (409).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return refuse(403, "cross-origin request refused");
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) return refuse(415, "multipart/form-data required");
  const actor = await actorFrom(req.headers);
  if (!actor) return refuse(401, "not signed in");
  const body = await boundedBody(req, BODY_LIMIT);
  if (!body) return refuse(413, "That photo is larger than 5 MB. Choose a smaller one.");
  let form: FormData;
  try {
    form = await new Response(body as BodyInit, { headers: { "content-type": contentType } }).formData();
  } catch {
    return refuse(400, "invalid form data");
  }
  const operationId = form.get("operationId");
  const recipeId = form.get("recipeId");
  const revisionText = form.get("expectedRevision");
  const photo = form.get("photo");
  if (typeof operationId !== "string" || !/^[A-Za-z0-9_.:-]{8,100}$/.test(operationId)) return refuse(400, "operationId is required");
  if (typeof recipeId !== "string" || !recipeId) return refuse(400, "recipeId is required");
  if (typeof revisionText !== "string" || !/^\d{1,9}$/.test(revisionText)) return refuse(400, "expectedRevision is required");
  if (!photo || typeof photo === "string") return refuse(400, "Choose a photo to add.");
  const bytes = Buffer.from(await photo.arrayBuffer());
  const r = await storeMemberPhoto(actor, operationId, { recipeId, expectedRevision: Number(revisionText), bytes });
  if (r.status === "refused") return NextResponse.json({ error: r.message, code: r.code }, { status: r.httpStatus, headers: NO_STORE });
  if (r.status === "rejected") return NextResponse.json(r, { status: 409, headers: NO_STORE });
  return NextResponse.json({ status: r.status, imageId: r.result.imageId, revision: r.result.revision }, { headers: NO_STORE });
}

import { createHash } from "node:crypto";
import type { Actor, CommandReceipt } from "./commands/framework";
import { storeMemberPhotoCommand } from "./commands/photos";
import { sniffImage } from "./integrations/recipe-import/fetcher";

/** The same cap recipe_images enforces in the database. */
export const MEMBER_PHOTO_MAX_BYTES = 5_242_880;

/** Refused before any command runs: nothing is stored and no receipt is recorded. */
export type PhotoRefusal = { status: "refused"; httpStatus: 400 | 413 | 415; code: "empty" | "too_large" | "not_a_photo"; message: string };

/**
 * A member adds their own photo of a dish to a recipe. The size is capped and the type is decided
 * by sniffing the bytes (JPEG, PNG, WebP or GIF); whatever type the upload declared is ignored.
 * The checked bytes are stored and made the recipe's own photo in ONE command, so the operation id's
 * idempotency, the household lock, the photo-revision check and the receipt all apply to the upload.
 */
export async function storeMemberPhoto(
  actor: Actor,
  operationId: string,
  p: { recipeId: string; expectedRevision: number; bytes: Buffer },
): Promise<PhotoRefusal | CommandReceipt> {
  const bytes = p.bytes;
  if (!bytes.length) return { status: "refused", httpStatus: 400, code: "empty", message: "The photo is empty." };
  if (bytes.length > MEMBER_PHOTO_MAX_BYTES) {
    return { status: "refused", httpStatus: 413, code: "too_large", message: "That photo is larger than 5 MB. Choose a smaller one." };
  }
  const contentType = sniffImage(bytes);
  if (!contentType) {
    return { status: "refused", httpStatus: 415, code: "not_a_photo", message: "That file isn't a photo Table can keep (JPEG, PNG, WebP or GIF)." };
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return storeMemberPhotoCommand(actor, operationId, { recipeId: p.recipeId, expectedRevision: p.expectedRevision }, { bytes, contentType, sha256 });
}

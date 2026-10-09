import { Reject, runCommand, type Actor, type HandlerOutcome } from "./framework";
import type { Db } from "../db/pool";

/**
 * A member's own photo of a dish. It lives on the RECIPE (recipes.member_photo_id), never on a version:
 * versions are immutable and the week pins them, so a photo added later shows on every version,
 * including the ones a week has pinned. Each change is bound to the photo revision the member saw.
 *
 * The bytes are stored in recipe_images (immutable) only by the upload route, through
 * `storeMemberPhotoCommand`; the client command `SetRecipePhoto` only selects an image the household
 * already holds, or removes the recipe's own photo.
 */

export const MEMBER_UPLOAD_PAGE_URL = "member-upload";
export const memberUploadSourceUrl = (sha256: string) => `member-upload:${sha256}`;
export const memberPhotoPermission = (displayName: string) => `member-provided photo (added by ${displayName})`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function photoTarget(c: Db, householdId: string, recipeId: unknown, expectedRevision: unknown) {
  if (typeof recipeId !== "string" || !UUID.test(recipeId)) throw new Reject("not_found", "Recipe not found");
  const r = await c.query(
    `SELECT r.id, r.archived_at, r.member_photo_id, r.photo_revision, v.title
     FROM recipes r LEFT JOIN recipe_versions v ON v.id=r.current_version_id
     WHERE r.id=$1 AND r.household_id=$2 FOR UPDATE OF r`,
    [recipeId, householdId],
  );
  if (!r.rowCount) throw new Reject("not_found", "Recipe not found");
  const rec = r.rows[0];
  if (rec.archived_at) throw new Reject("archived", "This recipe is archived; restore it before changing its photo.");
  if (!Number.isInteger(expectedRevision)) throw new Reject("invalid", "Say which revision of the recipe's photo you saw");
  if (rec.photo_revision !== expectedRevision) {
    throw new Reject("stale", "The recipe's photo changed while you were looking at it. Nothing was changed; check it again.", { current: rec.photo_revision });
  }
  return rec as { id: string; member_photo_id: string | null; photo_revision: number; title: string | null };
}

async function applyPhoto(c: Db, actor: Actor, rec: { id: string; member_photo_id: string | null; photo_revision: number; title: string | null }, imageId: string | null): Promise<HandlerOutcome> {
  if (imageId === null && rec.member_photo_id === null) {
    return { status: "accepted", result: { imageId: null, revision: rec.photo_revision, unchanged: true } };
  }
  const u = await c.query("UPDATE recipes SET member_photo_id=$2, photo_revision=photo_revision+1 WHERE id=$1 RETURNING photo_revision", [rec.id, imageId]);
  const revision: number = u.rows[0].photo_revision;
  const title = rec.title ?? "a recipe";
  const text = imageId ? `${actor.displayName} added a photo to ${title}` : `${actor.displayName} removed the photo from ${title}`;
  return { status: "accepted", result: { imageId, revision }, change: { summary: { type: "recipe", recipeId: rec.id, text } } };
}

/** Select one of the household's stored images as the recipe's own photo, or remove it (imageId null). */
export function setRecipePhotoCommand(actor: Actor, operationId: string, p: { recipeId: string; imageId: string | null; expectedRevision: number }) {
  return runCommand(actor, "SetRecipePhoto", operationId, p, async (c) => {
    const rec = await photoTarget(c, actor.householdId, p?.recipeId, p?.expectedRevision);
    let imageId: string | null = null;
    if (p.imageId !== null) {
      if (typeof p.imageId !== "string" || !UUID.test(p.imageId)) throw new Reject("not_found", "Photo not found");
      const img = await c.query("SELECT id FROM recipe_images WHERE id=$1 AND household_id=$2", [p.imageId, actor.householdId]);
      if (!img.rowCount) throw new Reject("not_found", "Photo not found");
      imageId = img.rows[0].id;
    }
    return applyPhoto(c, actor, rec, imageId);
  });
}

/** Server-side only (the upload route, not a client command): stores a member's checked photo and
 *  makes it the recipe's own photo in one command (the same checks and change as SetRecipePhoto).
 *  The bytes stay out of the command payload (the payload names their hash), so a retry with the same
 *  operation id replays the recorded outcome and stores nothing more. The caller has already capped
 *  the size and sniffed the type from the bytes. */
export function storeMemberPhotoCommand(actor: Actor, operationId: string, p: { recipeId: string; expectedRevision: number }, photo: { bytes: Buffer; contentType: string; sha256: string }) {
  const payload = { recipeId: p.recipeId, expectedRevision: p.expectedRevision, photo: { sha256: photo.sha256, contentType: photo.contentType, size: photo.bytes.length } };
  return runCommand(actor, "UploadRecipePhoto", operationId, payload, async (c) => {
    const rec = await photoTarget(c, actor.householdId, p.recipeId, p.expectedRevision);
    const ins = await c.query(
      `INSERT INTO recipe_images(household_id, content_type, bytes, sha256, source_url, page_url, permission, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [actor.householdId, photo.contentType, photo.bytes, photo.sha256, memberUploadSourceUrl(photo.sha256), MEMBER_UPLOAD_PAGE_URL, memberPhotoPermission(actor.displayName), actor.memberId],
    );
    return applyPhoto(c, actor, rec, ins.rows[0].id);
  });
}

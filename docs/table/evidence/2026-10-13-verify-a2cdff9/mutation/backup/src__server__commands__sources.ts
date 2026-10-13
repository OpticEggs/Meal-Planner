import { randomUUID } from "node:crypto";
import { Reject, runCommand, type Actor } from "./framework";
import type { Db } from "../db/pool";
import { validateLinkUrl } from "../integrations/recipe-import/url";

/**
 * Recipe sources: shared URL bookmarks. Saving a link never fetches it and never writes a recipe,
 * an interest, a grocery input or anything in an accepted week. The same page saved twice (by either
 * member, with different tracking parameters) is one bookmark; every save is kept with its note.
 */

// Posts on these sites are not recipe pages Table can read; the link still saves and opens.
const SOCIAL = ["instagram.com", "facebook.com", "fb.com", "tiktok.com", "x.com", "twitter.com", "pinterest.com", "youtube.com", "youtu.be", "threads.net", "reddit.com"];
const isSocial = (domain: string) => SOCIAL.some((d) => domain === d || domain.endsWith(`.${d}`));

const clean = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return s ? s.slice(0, max) : null;
};

export async function bookmarkInHousehold(c: Db, householdId: string, bookmarkId: string) {
  if (typeof bookmarkId !== "string" || !/^[0-9a-f-]{36}$/i.test(bookmarkId)) throw new Reject("not_found", "Saved link not found");
  const r = await c.query("SELECT * FROM recipe_bookmarks WHERE id=$1 AND household_id=$2", [bookmarkId, householdId]);
  if (!r.rowCount) throw new Reject("not_found", "Saved link not found");
  return r.rows[0];
}

export function saveLinkCommand(actor: Actor, operationId: string, p: { url: string; title?: string | null; note?: string | null }) {
  return runCommand(actor, "SaveLink", operationId, p, async (c) => {
    const v = validateLinkUrl(String(p?.url ?? ""));
    if (!v.ok) throw new Reject(v.code, v.message);
    const title = clean(p.title, 140);
    const note = clean(p.note, 500);
    const id = randomUUID();
    const inserted = await c.query(
      `INSERT INTO recipe_bookmarks(id, household_id, url_key, url, domain, source_label, title, status, status_detail, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (household_id, url_key) DO NOTHING RETURNING id`,
      [
        id, actor.householdId, v.key, v.url, v.domain, v.sourceLabel, title,
        isSocial(v.domain) ? "unsupported" : "saved",
        isSocial(v.domain) ? "Posts on this site can't be imported. Open the source to see the recipe." : null,
        actor.memberId,
      ],
    );
    let bookmarkId = id;
    let existed = false;
    let restored = false;
    if (!inserted.rowCount) {
      const b = (await c.query("SELECT id, title, archived_at FROM recipe_bookmarks WHERE household_id=$1 AND url_key=$2", [actor.householdId, v.key])).rows[0];
      bookmarkId = b.id;
      existed = true;
      // A repeat save never overwrites: a title fills in only if none was entered; an archived link comes back.
      if (b.archived_at || (title && !b.title)) {
        restored = !!b.archived_at;
        await c.query(
          "UPDATE recipe_bookmarks SET archived_at=NULL, archived_by=NULL, title=COALESCE(title, $2), revision=revision+1 WHERE id=$1",
          [bookmarkId, title],
        );
      }
    }
    await c.query(
      "INSERT INTO recipe_bookmark_saves(household_id, bookmark_id, member_id, submitted_url, note) VALUES ($1,$2,$3,$4,$5)",
      [actor.householdId, bookmarkId, actor.memberId, String(p.url).trim().slice(0, 2048), note],
    );
    const label = title ?? v.sourceLabel;
    return {
      status: "accepted",
      result: { bookmarkId, existed, restored },
      change: { summary: { type: "link", text: existed ? `${actor.displayName} saved a link already saved (${label})` : `${actor.displayName} saved a link (${label})` } },
    };
  });
}

/** Archive or restore a saved link. A recipe imported from it, and any dinner using that recipe, stay as they are. */
export function archiveLinkCommand(actor: Actor, operationId: string, p: { bookmarkId: string; archived: boolean; expectedRevision: number }) {
  return runCommand(actor, "ArchiveLink", operationId, p, async (c) => {
    const b = await bookmarkInHousehold(c, actor.householdId, p?.bookmarkId);
    if (!Number.isInteger(p.expectedRevision)) throw new Reject("invalid", "Say which revision of the link you saw");
    if (b.revision !== p.expectedRevision) throw new Reject("stale", "This link changed while you were looking at it. Nothing was changed; check it again.");
    if (!!b.archived_at === !!p.archived) throw new Reject("stale", p.archived ? "This link is already archived." : "This link is not archived.");
    await c.query(
      "UPDATE recipe_bookmarks SET archived_at=$2, archived_by=$3, revision=revision+1 WHERE id=$1",
      [b.id, p.archived ? new Date() : null, p.archived ? actor.memberId : null],
    );
    return {
      status: "accepted",
      result: { bookmarkId: b.id },
      change: { summary: { type: "link", text: `${actor.displayName} ${p.archived ? "archived" : "restored"} a saved link (${b.title ?? b.source_label})` } },
    };
  });
}

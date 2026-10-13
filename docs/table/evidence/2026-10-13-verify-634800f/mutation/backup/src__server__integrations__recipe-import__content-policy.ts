import type { RecipeContentConfig } from "../../env";
import { isBudgetBytes } from "./url";

/**
 * Three separate decisions about a recipe page, each made for the host that actually answers:
 *  1. network safety — `safeFetch` (public address, https, pinned connection, limits);
 *  2. READ policy — may Table request anything from this host at all? (`readRefusal`; Budget Bytes:
 *     never). Checked before every request, including each redirect hop and every photo request;
 *  3. RETENTION — may Table KEEP this page's own method text and photo? (`contentUse`). Decided for
 *     the site that supplied the content (the page's final address after redirects), never inherited
 *     from the site the link started on. Default: nothing kept — the recipe keeps facts and
 *     attribution and links to the original.
 *
 * Provenance is honest about what a setting is: the household-private mode is an OWNER-SELECTED use
 * mode, not a licence from the publisher; a per-site grant is an owner-recorded entry, not a document
 * Table has verified. Photos are requested only from the content's own site or from hosts the owner
 * listed for that site (a CDN) — a page naming an image elsewhere is not a grant for that image.
 */
export interface ContentUse {
  instructions: boolean;
  photos: boolean;
  /** In words, why — null when nothing is kept. */
  basis: string | null;
  /** What kind of setting allowed it. */
  kind: "none" | "owner_mode" | "owner_recorded_grant";
  /** The host that supplied the content this decision is about. */
  source: string | null;
}

export const NOTHING_KEPT: ContentUse = { instructions: false, photos: false, basis: null, kind: "none", source: null };

const bare = (h: string) => h.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");

/** `host` belongs to `site` (the site itself, its www. form, or a subdomain of it). */
export function sameSite(host: string, site: string): boolean {
  const h = bare(host);
  const s = bare(site);
  return h === s || h.endsWith(`.${s}`);
}

/** Why Table must not request anything from this host, or null when reading it is allowed. */
export function readRefusal(host: string): { code: "source_blocked"; message: string } | null {
  if (isBudgetBytes(host)) return { code: "source_blocked", message: `${bare(host)} asks for permission before its recipes are reused, so Table doesn't read it` };
  return null;
}

export function contentUse(sourceHost: string, cfg: RecipeContentConfig): ContentUse {
  const source = sourceHost.trim().toLowerCase();
  if (readRefusal(source)) return { ...NOTHING_KEPT, source }; // never read (D90)
  const grant = cfg.grants.find((g) => sameSite(source, g.domain));
  if (grant && (grant.instructions || grant.photos)) {
    return {
      instructions: grant.instructions, photos: grant.photos, kind: "owner_recorded_grant", source,
      basis: `owner-recorded grant for ${grant.domain}`,
    };
  }
  if (cfg.householdPrivate) {
    // The method text only. A household-private setting is not permission to copy or host a publisher's
    // photograph (owner direction 2026-10-09): a photo is kept only under a per-site grant, or is the
    // member's own photo.
    return { instructions: true, photos: false, kind: "owner_mode", source, basis: "owner-selected household-private mode (an owner setting, not a publisher licence)" };
  }
  return { ...NOTHING_KEPT, source };
}

/** May a photo for content from `sourceHost` be requested from `photoHost`? Its own site, or a host
 *  the owner listed for that site. */
export function photoHostAllowed(sourceHost: string, photoHost: string, cfg: RecipeContentConfig): boolean {
  if (readRefusal(photoHost)) return false;
  if (sameSite(photoHost, sourceHost)) return true;
  const h = photoHost.trim().toLowerCase().replace(/\.$/, "");
  return (cfg.photoHosts ?? []).some((e) => sameSite(sourceHost, e.domain) && e.hosts.includes(h));
}

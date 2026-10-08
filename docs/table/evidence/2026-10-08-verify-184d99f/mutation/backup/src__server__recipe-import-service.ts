import { readFileSync } from "node:fs";
import path from "node:path";
import { pool } from "./db/pool";
import { createHash } from "node:crypto";
import { recipeContentConfig, recipeFetchMode, type RecipeContentConfig } from "./env";
import type { Actor } from "./commands/framework";
import { createImportDraftFromPage, recordImportOutcome } from "./commands/imports";
import { saveLinkCommand } from "./commands/sources";
import { contentUse } from "./integrations/recipe-import/content-policy";
import { isBudgetBytes } from "./integrations/recipe-import/url";
import { nodeTransport, safeFetch, sniffImage, systemResolver, type Resolver, type Transport } from "./integrations/recipe-import/fetcher";
import { extractRecipes } from "./integrations/recipe-import/jsonld";

/**
 * "Import ingredients" for a saved link. Order matters:
 *  1. the link must be this household's and not imported yet;
 *  2. site policy: a site that asks for permission before reuse (Budget Bytes) is never read —
 *     the member pastes or types the ingredients they use;
 *  3. page reading is OFF unless configured (fixtures in tests; live only by a separate owner decision);
 *  4. the page is read through the SSRF-checked fetcher (validated public address, pinned connection,
 *     re-checked redirects, size/time limits) — outside any database transaction;
 *  5. structured recipe data only (JSON-LD, else schema.org microdata): ingredient lines, yield, times,
 *     description and attribution. The page's method and photo are KEPT only when the content policy
 *     allows it (off by default; owner gates C1/C2) — otherwise only their existence is recorded and the
 *     recipe links to the original. Nutrition claims are never used. Several recipes → the member
 *     chooses; none → unsupported, with the reason.
 */

export type ImportResult =
  | { kind: "draft"; bookmarkId?: string; draftId: string; existing?: boolean }
  | { kind: "choose"; bookmarkId?: string; options: { index: number; name: string; ingredientCount: number }[] }
  | {
      kind: "not_read"; bookmarkId?: string; recipeId?: string;
      status: "unsupported" | "unavailable" | "permission_blocked" | "fetch_off" | "already_imported" | "rejected";
      /** A stable code for the reason (fetch outcome, HTTP status, or what the page lacked). */
      reason: string;
      message: string;
    };

export interface ImportDeps {
  resolve: Resolver;
  transport: Transport;
  /** The content policy (what of the page's own content may be kept); defaults to the configured one. */
  content?: () => RecipeContentConfig;
}

export interface PageImage {
  bytes: Buffer;
  contentType: string;
  sourceUrl: string;
  sha256: string;
}

/** Test-only fixture network: hosts → addresses and URL → canned responses, from a manifest file. */
export function fixtureDeps(manifestPath: string, calls?: { ip: string; hostname: string; path: string }[]): ImportDeps {
  const m = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    hosts: Record<string, string[]>;
    pages: Record<string, { status: number; headers?: Record<string, string>; file?: string; body?: string }>;
  };
  const dir = path.dirname(manifestPath);
  return {
    resolve: async (host) => m.hosts[host.toLowerCase()] ?? [],
    transport: async (req) => {
      calls?.push({ ip: req.ip, hostname: req.hostname, path: req.path });
      const page = m.pages[`https://${req.hostname}${req.path}`];
      const body = page?.file ? readFileSync(path.join(dir, page.file)) : Buffer.from(page?.body ?? "");
      return {
        status: page?.status ?? 404,
        headers: page?.headers ?? { "content-type": "text/html" },
        body: (async function* () { yield new Uint8Array(body); })(),
      };
    },
  };
}

function configuredDeps(): ImportDeps | null {
  const f = recipeFetchMode();
  if (f.mode === "fixtures") return fixtureDeps(f.manifest);
  if (f.mode === "live") return { resolve: systemResolver(), transport: nodeTransport() };
  return null;
}

/** Why a page was not read, in words a member can act on. Keyed by fetch outcome code. */
const FETCH_MESSAGES: Record<string, string> = {
  private_address: "This link points at a private or local network address, so Table won't read it.",
  no_public_address: "This link's site couldn't be found on the public internet.",
  dns_failed: "This link's site couldn't be found right now. Try again later, or paste the ingredients.",
  connect_failed: "The site couldn't be reached right now. Try again later, or paste the ingredients.",
  redirect_refused: "The page redirected somewhere Table won't follow.",
  too_many_redirects: "The page redirected too many times.",
  bad_redirect: "The page redirected without saying where.",
  timeout: "The page took too long to answer. Try again later, or paste the ingredients.",
  too_large: "The page is too large to read safely. Paste the ingredients instead.",
  unsupported_content_type: "This link isn't a web page Table can read.",
  unsupported_charset: "This page uses a text encoding Table doesn't read. Paste the ingredients instead.",
  unsupported_encoding: "The site sent the page in a form Table doesn't read. Paste the ingredients instead.",
  bad_encoding: "The site sent a damaged page. Try again later, or paste the ingredients.",
  busy: "Another page is being read right now. Try again in a moment.",
};

/** HTTP answers: refused (login, bot protection, rate limit) vs gone vs a server problem. */
function httpMessage(status: number | undefined): { message: string; transient: boolean } {
  if (status === 401 || status === 403) return { message: `The site refused to let Table read the page (HTTP ${status}); it may need a login or block automated reading. Open the page and paste the ingredients.`, transient: false };
  if (status === 429) return { message: "The site asked Table to slow down (HTTP 429). Try again later, or paste the ingredients.", transient: true };
  if (status === 404 || status === 410) return { message: `The site says this page doesn't exist (HTTP ${status}). Check the link.`, transient: false };
  if (status !== undefined && status >= 500) return { message: `The site had a problem (HTTP ${status}). Try again later, or paste the ingredients.`, transient: true };
  return { message: `The site refused or couldn't find the page${status ? ` (HTTP ${status})` : ""}.`, transient: false };
}

const TRANSIENT = new Set(["busy", "dns_failed", "connect_failed", "timeout", "bad_encoding"]);

export async function importFromLink(
  actor: Actor, p: { bookmarkId: string; operationId: string; candidate?: number | null }, deps: ImportDeps | null = configuredDeps(),
): Promise<ImportResult> {
  if (typeof p.bookmarkId !== "string" || !/^[0-9a-f-]{36}$/i.test(p.bookmarkId)) return { kind: "not_read", status: "rejected", reason: "not_found", message: "Saved link not found" };
  const b = (await pool().query("SELECT * FROM recipe_bookmarks WHERE id=$1 AND household_id=$2", [p.bookmarkId, actor.householdId])).rows[0];
  if (!b) return { kind: "not_read", status: "rejected", reason: "not_found", message: "Saved link not found" };
  if (b.recipe_id) return { kind: "not_read", status: "already_imported", reason: "already_imported", message: "This link was already imported; edit the recipe in Our Recipes.", recipeId: b.recipe_id };
  const outcome = async (status: "unsupported" | "unavailable" | "permission_blocked", reason: string, message: string): Promise<ImportResult> => {
    await recordImportOutcome(actor, `${p.operationId}:outcome`, { bookmarkId: b.id, status, detail: message });
    return { kind: "not_read", status, reason, message };
  };
  if (b.status === "unsupported" && b.status_detail && SOCIAL_DETAIL.test(b.status_detail)) {
    return { kind: "not_read", status: "unsupported", reason: "social", message: b.status_detail };
  }
  if (isBudgetBytes(b.domain)) {
    return outcome("permission_blocked", "permission_blocked", "Budget Bytes asks for permission before its recipes are reused elsewhere, so Table doesn't read its pages. Paste or type the ingredients you use; the link stays.");
  }
  if (!deps) return { kind: "not_read", status: "fetch_off", reason: "fetch_off", message: "Reading recipe pages is turned off here. Paste the ingredient lines instead; the link stays saved." };

  const fetched = await safeFetch(b.url, deps);
  if (fetched.kind !== "ok") {
    if (fetched.code === "http_status") {
      const h = httpMessage(fetched.status);
      return h.transient
        ? { kind: "not_read", status: "unavailable", reason: `http_${fetched.status}`, message: h.message }
        : outcome("unavailable", `http_${fetched.status}`, h.message);
    }
    const why = FETCH_MESSAGES[fetched.code] ?? "The page couldn't be read.";
    // A passing problem (busy, timeout, unreachable) is not recorded on the link: trying again later may work.
    if (TRANSIENT.has(fetched.code)) return { kind: "not_read", status: "unavailable", reason: fetched.code, message: why };
    return outcome("unavailable", fetched.code, why);
  }
  const { candidates, stats } = extractRecipes(fetched.text, { baseUrl: fetched.finalUrl });
  const usable = candidates.filter((c) => c.ingredients.length > 0);
  if (!usable.length) {
    if (candidates.length) return outcome("unsupported", "no_ingredients", "The page has recipe data but no ingredient list Table can read. Paste the ingredients instead.");
    if (stats.jsonLdBlocks > 0) return outcome("unsupported", "no_recipe_data", "The page has structured data, but none of it is a recipe. Paste the ingredients instead.");
    return outcome("unsupported", "no_structured_data", "This page doesn't publish its recipe in a form Table can read (no structured recipe data). Paste the ingredients instead.");
  }
  let chosen = usable[0];
  if (usable.length > 1) {
    const i = p.candidate;
    if (i === undefined || i === null || !Number.isInteger(i) || i < 0 || i >= usable.length) {
      return { kind: "choose", bookmarkId: b.id, options: usable.map((c, index) => ({ index, name: c.name ?? `Recipe ${index + 1}`, ingredientCount: c.ingredients.length })) };
    }
    chosen = usable[i];
  }
  const use = contentUse(b.domain, (deps.content ?? recipeContentConfig)());
  // A photograph is read only when a permission allows keeping it, outside any transaction, bounded like the page.
  let image: PageImage | null = null;
  if (use.photos) {
    for (const src of chosen.images.slice(0, 2)) {
      const got = await safeFetch(src, deps, {}, { accept: "image" });
      if (got.kind !== "ok" || !got.bytes) continue;
      const type = sniffImage(got.bytes);
      if (!type) continue;
      image = { bytes: Buffer.from(got.bytes), contentType: type, sourceUrl: got.finalUrl, sha256: createHash("sha256").update(got.bytes).digest("hex") };
      break;
    }
  }
  const problems: string[] = [];
  if (usable.length > 1) problems.push(`The page has ${usable.length} recipes; this is the one chosen.`);
  if (chosen.source === "microdata") problems.push("Read from the page's older recipe markup; check the lines carefully.");
  if (use.photos && chosen.images.length && !image) problems.push("The page's photo couldn't be kept (not readable as a photo).");
  const r = await createImportDraftFromPage(actor, p.operationId, {
    bookmarkId: b.id,
    method: chosen.source,
    fetchedUrl: fetched.finalUrl,
    title: chosen.name,
    description: chosen.description,
    author: chosen.author,
    siteName: chosen.siteName,
    yieldText: chosen.yield,
    servings: chosen.servings,
    effortMinutes: chosen.totalMinutes ?? (chosen.prepMinutes !== null && chosen.cookMinutes !== null ? chosen.prepMinutes + chosen.cookMinutes : null),
    hasInstructions: chosen.hasInstructions,
    hasNutrition: chosen.hasNutrition,
    stepCount: chosen.instructions.length,
    imageCount: chosen.images.length,
    steps: use.instructions ? chosen.instructions : null,
    policy: use,
    lines: chosen.ingredients,
    problems,
  }, image);
  if (r.status !== "accepted") return { kind: "not_read", status: "rejected", reason: r.code, message: r.message };
  return { kind: "draft", bookmarkId: b.id, draftId: String(r.result.draftId) };
}

const SOCIAL_DETAIL = /^Posts on this site can't be imported/;

/**
 * The normal way in: paste a recipe's link. Saves the link for both members (or finds it if it was
 * already saved) and reads it straight away, so the member lands in the review. Anything that stops
 * the read leaves the link saved with the reason, and the paste fallback is offered.
 */
export async function addRecipeFromLink(
  actor: Actor, p: { url: string; operationId: string; candidate?: number | null }, deps: ImportDeps | null = configuredDeps(),
): Promise<ImportResult> {
  const saved = await saveLinkCommand(actor, `${p.operationId}:save`, { url: p.url });
  if (saved.status !== "accepted") return { kind: "not_read", status: "rejected", reason: saved.code, message: saved.message };
  const bookmarkId = String(saved.result.bookmarkId);
  const b = (await pool().query("SELECT recipe_id, status, status_detail FROM recipe_bookmarks WHERE id=$1", [bookmarkId])).rows[0];
  if (b.recipe_id) return { kind: "not_read", status: "already_imported", reason: "already_imported", bookmarkId, recipeId: b.recipe_id, message: "This recipe was already added from this link." };
  const open = (await pool().query("SELECT id FROM recipe_import_drafts WHERE bookmark_id=$1 AND status='open'", [bookmarkId])).rows[0];
  if (open) return { kind: "draft", bookmarkId, draftId: open.id, existing: true };
  const r = await importFromLink(actor, { bookmarkId, operationId: p.operationId, candidate: p.candidate }, deps);
  return { ...r, bookmarkId } as ImportResult;
}

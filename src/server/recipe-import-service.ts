import { readFileSync } from "node:fs";
import path from "node:path";
import { pool } from "./db/pool";
import { recipeFetchMode } from "./env";
import type { Actor } from "./commands/framework";
import { createImportDraftFromPage, recordImportOutcome } from "./commands/imports";
import { isBudgetBytes } from "./integrations/recipe-import/url";
import { nodeTransport, safeFetch, systemResolver, type Resolver, type Transport } from "./integrations/recipe-import/fetcher";
import { extractRecipes } from "./integrations/recipe-import/jsonld";

/**
 * "Import ingredients" for a saved link. Order matters:
 *  1. the link must be this household's and not imported yet;
 *  2. site policy: a site that asks for permission before reuse (Budget Bytes) is never read —
 *     the member pastes or types the ingredients they use;
 *  3. page reading is OFF unless configured (fixtures in tests; live only by a separate owner decision);
 *  4. the page is read through the SSRF-checked fetcher (validated public address, pinned connection,
 *     re-checked redirects, size/time limits) — outside any database transaction;
 *  5. only JSON-LD Recipe data is used: ingredient lines, yield, times. The method, photos and
 *     nutrition are not taken. Several recipes on one page → the member chooses; none → unsupported.
 */

export type ImportResult =
  | { kind: "draft"; draftId: string }
  | { kind: "choose"; options: { index: number; name: string; ingredientCount: number }[] }
  | { kind: "not_read"; status: "unsupported" | "unavailable" | "permission_blocked" | "fetch_off" | "already_imported" | "rejected"; message: string };

export interface ImportDeps {
  resolve: Resolver;
  transport: Transport;
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

const FETCH_MESSAGES: Record<string, string> = {
  private_address: "This link points at a private or local network address, so Table won't read it.",
  no_public_address: "This link's site couldn't be found on the public internet.",
  redirect_refused: "The page redirected somewhere Table won't follow.",
  too_many_redirects: "The page redirected too many times.",
  timeout: "The page took too long to answer.",
  too_large: "The page is too large to read safely.",
  unsupported_content_type: "This link isn't a web page Table can read.",
  http_status: "The site refused or couldn't find the page (it may need a login).",
};

export async function importFromLink(
  actor: Actor, p: { bookmarkId: string; operationId: string; candidate?: number | null }, deps: ImportDeps | null = configuredDeps(),
): Promise<ImportResult> {
  if (typeof p.bookmarkId !== "string" || !/^[0-9a-f-]{36}$/i.test(p.bookmarkId)) return { kind: "not_read", status: "rejected", message: "Saved link not found" };
  const b = (await pool().query("SELECT * FROM recipe_bookmarks WHERE id=$1 AND household_id=$2", [p.bookmarkId, actor.householdId])).rows[0];
  if (!b) return { kind: "not_read", status: "rejected", message: "Saved link not found" };
  if (b.recipe_id) return { kind: "not_read", status: "already_imported", message: "This link was already imported; edit the recipe in Our Recipes." };
  const outcome = async (status: "unsupported" | "unavailable" | "permission_blocked", message: string): Promise<ImportResult> => {
    await recordImportOutcome(actor, `${p.operationId}:outcome`, { bookmarkId: b.id, status, detail: message });
    return { kind: "not_read", status, message };
  };
  if (b.status === "unsupported") return { kind: "not_read", status: "unsupported", message: b.status_detail ?? "Import isn't available for this page." };
  if (isBudgetBytes(b.domain)) {
    return outcome("permission_blocked", "Budget Bytes asks for permission before its recipes are reused elsewhere, so Table doesn't read its pages. Paste or type the ingredients you use; the link stays.");
  }
  if (!deps) return { kind: "not_read", status: "fetch_off", message: "Reading recipe pages is turned off here. Paste the ingredient lines instead; the link stays saved." };

  const fetched = await safeFetch(b.url, deps);
  if (fetched.kind !== "ok") {
    const why = FETCH_MESSAGES[fetched.code] ?? "The page couldn't be read.";
    return outcome(fetched.kind === "refused" ? "unavailable" : "unavailable", why);
  }
  const { candidates } = extractRecipes(fetched.text);
  const usable = candidates.filter((c) => c.ingredients.length > 0);
  if (!usable.length) return outcome("unsupported", "No recipe ingredient list was found on this page. Paste the ingredients instead.");
  let chosen = usable[0];
  if (usable.length > 1) {
    const i = p.candidate;
    if (i === undefined || i === null || !Number.isInteger(i) || i < 0 || i >= usable.length) {
      return { kind: "choose", options: usable.map((c, index) => ({ index, name: c.name ?? `Recipe ${index + 1}`, ingredientCount: c.ingredients.length })) };
    }
    chosen = usable[i];
  }
  const r = await createImportDraftFromPage(actor, p.operationId, {
    bookmarkId: b.id,
    fetchedUrl: fetched.finalUrl,
    title: chosen.name,
    yieldText: chosen.yield,
    servings: chosen.servings,
    effortMinutes: chosen.totalMinutes ?? (chosen.prepMinutes !== null && chosen.cookMinutes !== null ? chosen.prepMinutes + chosen.cookMinutes : null),
    hasInstructions: chosen.hasInstructions,
    hasNutrition: chosen.hasNutrition,
    lines: chosen.ingredients,
    problems: usable.length > 1 ? [`The page has ${usable.length} recipes; this is the one chosen.`] : [],
  });
  if (r.status !== "accepted") return { kind: "not_read", status: "rejected", message: r.message };
  return { kind: "draft", draftId: String(r.result.draftId) };
}

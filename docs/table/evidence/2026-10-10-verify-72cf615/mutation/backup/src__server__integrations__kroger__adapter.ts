import { pool } from "../../db/pool";
import { log } from "../../log";
import type { AddOutcome, RetailerAdapter } from "../retailer";
import { cartAddRequest, mapCartResponse } from "./cart";
import { capabilityStatus, cartGlobalStatus, cartModality, KROGER, krogerConfig } from "./config";
import { accessTokenFor, requireReauthorization } from "./connection";
import { clientCredentialsRequest, parseTokenResponse } from "./oauth";
import { isLocationId, mapLocations, mapProducts, type LocationCandidate, type ProductCandidate } from "./products";
import { redactBody, redactHeaders, redactUrl } from "./redact";
import { TIMEOUTS, TransportError, transportFor } from "./transport";

/**
 * Kroger behind the closed live gate. Nothing reaches the network unless the capability for that
 * call is activated (KROGER_ACTIVATE) and configured; otherwise calls answer `not_activated`.
 * Cart readiness additionally needs a settled `modality` (not publicly documented, so false in
 * every non-test environment in this build), a valid household connection and a store location.
 */

/** Per-household half of cart readiness. */
export async function krogerCartReadiness(householdId: string): Promise<{ ready: boolean; reason: string }> {
  const g = cartGlobalStatus();
  if (!g.ready) return g;
  const r = await pool().query("SELECT status, location_id FROM kroger_connections WHERE household_id=$1", [householdId]);
  const row = r.rows[0];
  if (!row || row.status !== "connected") {
    return { ready: false, reason: row?.status === "needs_reauthorization" ? "The household's Kroger authorization expired or was rejected; connect again." : "The household has not connected a Kroger account." };
  }
  if (!row.location_id) return { ready: false, reason: "Choose the Kroger store (location) for this household first." };
  return { ready: true, reason: "Kroger cart transfer is activated for this household (not live-verified)." };
}

const notSent = (reason: string, extra: Record<string, unknown> = {}): AddOutcome => ({
  kind: "failed",
  evidence: { provider: "kroger", notSent: true, networkCalls: 0, reason, ...extra },
});

export const krogerRetailer: RetailerAdapter = {
  mode: "kroger",
  label: "Kroger",
  live: true,
  status() {
    return cartGlobalStatus();
  },
  readiness(householdId) {
    return krogerCartReadiness(householdId);
  },
  async addToCart(req) {
    // Everything that can be decided without the network is decided first: a refusal here is a
    // definite "nothing was sent".
    const readiness = await krogerCartReadiness(req.householdId);
    if (!readiness.ready) return notSent(readiness.reason);
    const modality = cartModality();
    if (!modality.settled) return notSent("modality is not settled");
    const token = await accessTokenFor(req.householdId);
    if (!token.ok) return notSent(`no usable Kroger authorization (${token.reason})`, { reauthorizationRequired: token.reason === "needs_reauthorization" });
    const http = cartAddRequest(req.items, modality.value, token.accessToken);
    let outcome: AddOutcome & { reauthorize?: boolean };
    try {
      const r = await transportFor().request(http.method, http.url, http.headers, http.body, TIMEOUTS.cartAdd);
      outcome = mapCartResponse(r, { items: req.items.length, modality });
    } catch (e) {
      // Sent, but no readable answer: the store may have added the items. Never replayed.
      const kind = e instanceof TransportError ? e.kind : "error";
      outcome = { kind: "uncertain", evidence: { provider: "kroger", endpoint: "PUT /v1/cart/add", items: req.items.length, granularity: "batch", reason: kind === "timeout" ? "no response within the request timeout" : "network error after sending" } };
    }
    log({
      at: "kroger", step: "cart_add", householdId: req.householdId, batchId: req.batchId, dispatchId: req.dispatchId, outcome: outcome.kind,
      request: { method: http.method, url: redactUrl(http.url), headers: redactHeaders(http.headers), body: redactBody(http.body) },
    });
    if (outcome.reauthorize) await requireReauthorization(req.householdId, { cause: "401 on cart add", batchId: req.batchId });
    const { reauthorize: _drop, ...clean } = outcome;
    void _drop;
    return clean as AddOutcome;
  },
};

// ---------------------------------------------------------------------------------------------
// Products and locations (client-credentials token, as Kroger recommends for the Products API).

type Lookup<T> = { ok: true; candidates: T[] } | { ok: false; reason: string; code: "not_activated" | "not_configured" | "invalid" | "failed" };

const appTokens = globalThis as unknown as { __krogerAppToken?: Map<string, { token: string; until: number }> };
function cache() {
  if (!appTokens.__krogerAppToken) appTokens.__krogerAppToken = new Map();
  return appTokens.__krogerAppToken;
}
export function forgetAppTokens() {
  cache().clear();
}

async function appToken(scopes: string): Promise<string | null> {
  const hit = cache().get(scopes);
  if (hit && hit.until > Date.now()) return hit.token;
  const cfg = krogerConfig();
  const req = clientCredentialsRequest({ clientId: cfg.clientId!, clientSecret: cfg.clientSecret!, scopes });
  try {
    const r = await transportFor().request(req.method, req.url, req.headers, req.body, TIMEOUTS.token);
    const p = parseTokenResponse(r.status, r.bodyText);
    log({ at: "kroger", step: "client_credentials", httpStatus: r.status, ok: p.ok, request: { url: req.url, headers: redactHeaders(req.headers), body: redactBody(req.body) } });
    if (!p.ok) return null;
    // Unknown lifetime: use once, do not cache.
    if (p.tokens.expiresInSeconds) cache().set(scopes, { token: p.tokens.accessToken, until: Date.now() + Math.max(0, p.tokens.expiresInSeconds - 60) * 1000 });
    return p.tokens.accessToken;
  } catch {
    return null;
  }
}

async function getJson(url: string, token: string): Promise<{ status: number; body: unknown } | null> {
  try {
    const r = await transportFor().request("GET", url, { Accept: "application/json", Authorization: `Bearer ${token}` }, null, TIMEOUTS.lookup);
    log({ at: "kroger", step: "lookup", url: redactUrl(url), httpStatus: r.status });
    let body: unknown = null;
    try {
      body = JSON.parse(r.bodyText);
    } catch {
      body = null;
    }
    return { status: r.status, body };
  } catch {
    return null;
  }
}

export async function searchKrogerProducts(p: { term?: string; productIds?: string[]; locationId?: string | null; limit?: number }): Promise<Lookup<ProductCandidate>> {
  const st = capabilityStatus("products");
  if (!st.ready) return { ok: false, code: st.activated ? "not_configured" : "not_activated", reason: st.reason };
  if (p.locationId != null && !isLocationId(p.locationId)) return { ok: false, code: "invalid", reason: "A Kroger location id has 8 characters." };
  const term = p.term?.trim();
  if (!term && !p.productIds?.length) return { ok: false, code: "invalid", reason: "Give a search term or product ids." };
  const token = await appToken(krogerConfig().productScopes!);
  if (!token) return { ok: false, code: "failed", reason: "Kroger did not issue an application token." };
  const u = new URL(`${KROGER.apiBase}/products`);
  if (p.productIds?.length) u.searchParams.set("filter.productId", p.productIds.join(","));
  else u.searchParams.set("filter.term", term!);
  if (p.locationId) u.searchParams.set("filter.locationId", p.locationId);
  u.searchParams.set("filter.limit", String(Math.min(Math.max(p.limit ?? 10, 1), 50)));
  const r = await getJson(u.toString(), token);
  if (!r || r.status !== 200) return { ok: false, code: "failed", reason: `Kroger product search failed${r ? ` (HTTP ${r.status})` : ""}.` };
  return { ok: true, candidates: mapProducts(r.body, p.locationId ?? null) };
}

export async function searchKrogerLocations(p: { zipCode: string; limit?: number }): Promise<Lookup<LocationCandidate>> {
  const st = capabilityStatus("products");
  if (!st.ready) return { ok: false, code: st.activated ? "not_configured" : "not_activated", reason: st.reason };
  const scopes = krogerConfig().locationScopes;
  if (!scopes) return { ok: false, code: "not_configured", reason: "The Locations API scope is not publicly documented; set KROGER_LOCATION_SCOPES from the app registration." };
  if (!/^\d{5}$/.test(p.zipCode)) return { ok: false, code: "invalid", reason: "A ZIP code has 5 digits." };
  const token = await appToken(scopes);
  if (!token) return { ok: false, code: "failed", reason: "Kroger did not issue an application token." };
  const u = new URL(`${KROGER.apiBase}/locations`);
  u.searchParams.set("filter.zipCode.near", p.zipCode);
  u.searchParams.set("filter.limit", String(Math.min(Math.max(p.limit ?? 10, 1), 50)));
  const r = await getJson(u.toString(), token);
  if (!r || r.status !== 200) return { ok: false, code: "failed", reason: `Kroger location search failed${r ? ` (HTTP ${r.status})` : ""}.` };
  return { ok: true, candidates: mapLocations(r.body) };
}

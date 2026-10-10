import { randomUUID } from "node:crypto";
import { inTransaction, pool, type Db } from "../../db/pool";
import { log } from "../../log";
import type { Actor } from "../../commands/framework";
import { capabilityStatus, krogerConfig } from "./config";
import { newState, pkcePair, seal, stateHash, unseal } from "./crypto";
import { authorizeUrl, codeExchangeRequest, parseTokenResponse, refreshRequest, type TokenSet } from "./oauth";
import { redactBody, redactHeaders, redactUrl } from "./redact";
import { TIMEOUTS, TransportError, transportFor } from "./transport";

/**
 * Customer connection (OAuth2 authorization code + PKCE S256, as documented) and token refresh.
 *
 * - The start step stores a single-use state (hash only) bound to household + member + redirect
 *   URI, with a sealed PKCE verifier and a 10-minute expiry.
 * - The callback consumes the state atomically: unknown, expired, replayed, or another
 *   household's/member's state is refused and nothing is stored.
 * - Tokens are sealed (AES-256-GCM, TABLE_TOKEN_KEY) with the household id as associated data.
 * - One refresh at a time per connection (lease + revision). Refresh tokens are single use, so
 *   the new pair is stored in one UPDATE; any failed refresh marks the connection
 *   needs_reauthorization and is never retried in a loop.
 */

const STATE_TTL = "10 minutes";
const REFRESH_LEASE = "45 seconds";
const EXPIRY_MARGIN = "60 seconds";
const WAIT_STEP_MS = 40;
const WAIT_LIMIT_MS = 20_000;

export const aad = (purpose: "access" | "refresh" | "verifier", householdId: string, extra = "") => `table:kroger:${purpose}:${householdId}${extra ? `:${extra}` : ""}`;

export type ConnectionStatus = "not_connected" | "connected" | "needs_reauthorization" | "disconnected";

async function event(c: Db | ReturnType<typeof pool>, householdId: string, kind: string, memberId: string | null, evidence: Record<string, unknown> = {}) {
  await c.query("INSERT INTO kroger_connection_events(household_id, kind, member_id, evidence) VALUES ($1,$2,$3,$4)", [householdId, kind, memberId, evidence]);
}

function logHttp(step: string, householdId: string | null, req: { method: string; url: string; headers: Record<string, string>; body: string | null }, extra: Record<string, unknown>) {
  log({ at: "kroger", step, householdId, request: { method: req.method, url: redactUrl(req.url), headers: redactHeaders(req.headers), body: redactBody(req.body) }, ...extra });
}

// ---------------------------------------------------------------------------------------------
// Start

export type StartResult = { ok: true; authorizeUrl: string } | { ok: false; code: "not_activated" | "not_configured"; message: string };

export async function startAuthorization(actor: Actor): Promise<StartResult> {
  const st = capabilityStatus("connect");
  if (!st.ready) return { ok: false, code: st.activated ? "not_configured" : "not_activated", message: st.reason };
  const cfg = krogerConfig();
  const { state, hash } = newState();
  const pkce = pkcePair();
  await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [actor.householdId]);
    await c.query(
      `INSERT INTO kroger_auth_states(state_hash, household_id, member_id, redirect_uri, verifier_sealed, expires_at)
       VALUES ($1,$2,$3,$4,$5, clock_timestamp() + interval '${STATE_TTL}')`,
      [hash, actor.householdId, actor.memberId, cfg.redirectUri, seal(cfg.key!, pkce.verifier, aad("verifier", actor.householdId, hash))],
    );
    await event(c, actor.householdId, "authorization_started", actor.memberId);
  });
  log({ at: "kroger", step: "authorization_started", householdId: actor.householdId });
  return { ok: true, authorizeUrl: authorizeUrl({ clientId: cfg.clientId!, redirectUri: cfg.redirectUri!, scopes: cfg.customerScopes!, state, codeChallenge: pkce.challenge }) };
}

// ---------------------------------------------------------------------------------------------
// Callback

export type CallbackResult = "connected" | "denied" | "refused" | "failed" | "not_activated";

export async function completeAuthorization(actor: Actor, q: { code?: string | null; state?: string | null; error?: string | null }): Promise<CallbackResult> {
  const st = capabilityStatus("connect");
  if (!st.ready) return "not_activated"; // nothing consumed, nothing stored
  const cfg = krogerConfig();
  if (!q.state) return "refused";
  const hash = stateHash(q.state);
  // Single use, bound to this household, this member and this redirect URI, unexpired.
  const consumed = await pool().query(
    `UPDATE kroger_auth_states SET consumed_at=clock_timestamp()
     WHERE state_hash=$1 AND household_id=$2 AND member_id=$3 AND redirect_uri=$4 AND consumed_at IS NULL AND expires_at > clock_timestamp()
     RETURNING verifier_sealed`,
    [hash, actor.householdId, actor.memberId, cfg.redirectUri],
  );
  if (!consumed.rowCount) {
    log({ at: "kroger", step: "callback_refused", householdId: actor.householdId });
    return "refused";
  }
  if (q.error) {
    const error = q.error === "access_denied" ? "access_denied" : "authorization_error";
    await inTransaction(async (c) => {
      await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [actor.householdId]);
      await c.query(
        `INSERT INTO kroger_connections(household_id, status) VALUES ($1,'not_connected')
         ON CONFLICT (household_id) DO UPDATE SET updated_at=clock_timestamp() WHERE kroger_connections.status <> 'connected'`,
        [actor.householdId],
      );
      await event(c, actor.householdId, "denied", actor.memberId, { error });
    });
    log({ at: "kroger", step: "authorization_denied", householdId: actor.householdId, error });
    return "denied";
  }
  if (!q.code) return "failed";
  let verifier: string;
  try {
    verifier = unseal(cfg.key!, consumed.rows[0].verifier_sealed, aad("verifier", actor.householdId, hash));
  } catch {
    await event(pool(), actor.householdId, "exchange_failed", actor.memberId, { error: "unreadable_verifier" });
    return "failed";
  }
  const req = codeExchangeRequest({ clientId: cfg.clientId!, clientSecret: cfg.clientSecret!, code: q.code, redirectUri: cfg.redirectUri!, codeVerifier: verifier });
  let parsed: ReturnType<typeof parseTokenResponse>;
  let httpStatus: number | null = null;
  try {
    const r = await transportFor().request(req.method, req.url, req.headers, req.body, TIMEOUTS.token);
    httpStatus = r.status;
    parsed = parseTokenResponse(r.status, r.bodyText);
  } catch (e) {
    parsed = { ok: false, error: e instanceof TransportError ? `transport_${e.kind}` : "transport_error" };
  }
  logHttp("code_exchange", actor.householdId, req, { httpStatus, ok: parsed.ok });
  if (!parsed.ok) {
    await event(pool(), actor.householdId, "exchange_failed", actor.memberId, { httpStatus, error: parsed.error });
    return "failed";
  }
  await storeTokens(actor.householdId, actor.memberId, parsed.tokens);
  return "connected";
}

async function storeTokens(householdId: string, memberId: string, t: TokenSet) {
  const cfg = krogerConfig();
  if (!cfg.key) throw new Error("TABLE_TOKEN_KEY is required to store Kroger tokens");
  await inTransaction(async (c) => {
    await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
    await c.query(
      `INSERT INTO kroger_connections(household_id, status, access_token_sealed, refresh_token_sealed, access_expires_at, scope, connected_by, connected_at, token_revision)
       VALUES ($1,'connected',$2,$3, CASE WHEN $4::int IS NULL THEN NULL ELSE clock_timestamp() + make_interval(secs => $4::int) END, $5, $6, clock_timestamp(), 1)
       ON CONFLICT (household_id) DO UPDATE SET status='connected', access_token_sealed=EXCLUDED.access_token_sealed, refresh_token_sealed=EXCLUDED.refresh_token_sealed,
         access_expires_at=EXCLUDED.access_expires_at, scope=EXCLUDED.scope, connected_by=EXCLUDED.connected_by, connected_at=EXCLUDED.connected_at,
         token_revision=kroger_connections.token_revision + 1, refresh_lease_id=NULL, refresh_lease_until=NULL, updated_at=clock_timestamp()`,
      [
        householdId, seal(cfg.key!, t.accessToken, aad("access", householdId)), t.refreshToken ? seal(cfg.key!, t.refreshToken, aad("refresh", householdId)) : null,
        t.expiresInSeconds, t.scope, memberId,
      ],
    );
    await event(c, householdId, "connected", memberId, { scope: t.scope, expiresInSeconds: t.expiresInSeconds, refreshTokenIssued: !!t.refreshToken });
  });
  log({ at: "kroger", step: "connected", householdId });
}

// ---------------------------------------------------------------------------------------------
// Access tokens and coordinated refresh

export type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "not_connected" | "needs_reauthorization" | "not_activated" | "refresh_busy" | "unreadable_credentials" };

export async function accessTokenFor(householdId: string): Promise<TokenResult> {
  const cfg = krogerConfig();
  if (!cfg.key) return { ok: false, reason: "not_activated" };
  const start = Date.now();
  for (;;) {
    const r = await pool().query(
      `SELECT status, access_token_sealed, token_revision,
              (refresh_lease_until IS NOT NULL AND refresh_lease_until > clock_timestamp()) AS leased,
              (access_expires_at IS NOT NULL AND access_expires_at > clock_timestamp() + interval '${EXPIRY_MARGIN}') AS fresh
       FROM kroger_connections WHERE household_id=$1`,
      [householdId],
    );
    const row = r.rows[0];
    if (!row || row.status === "not_connected" || row.status === "disconnected") return { ok: false, reason: "not_connected" };
    if (row.status === "needs_reauthorization") return { ok: false, reason: "needs_reauthorization" };
    if (row.fresh) {
      try {
        return { ok: true, accessToken: unseal(cfg.key, row.access_token_sealed, aad("access", householdId)) };
      } catch {
        // Wrong key, tampered value, or a value sealed for another household: never used.
        return { ok: false, reason: "unreadable_credentials" };
      }
    }
    if (!row.leased) {
      const done = await refreshOnce(householdId, Number(row.token_revision));
      if (done !== "lost_race") return done;
    } else if (Date.now() - start > WAIT_LIMIT_MS) {
      return { ok: false, reason: "refresh_busy" };
    } else {
      await new Promise((res) => setTimeout(res, WAIT_STEP_MS));
    }
  }
}

async function refreshOnce(householdId: string, seenRevision: number): Promise<TokenResult | "lost_race"> {
  if (!capabilityStatus("connect").ready) return { ok: false, reason: "not_activated" };
  const cfg = krogerConfig();
  const leaseId = randomUUID();
  const got = await pool().query(
    `UPDATE kroger_connections SET refresh_lease_id=$2, refresh_lease_until=clock_timestamp() + interval '${REFRESH_LEASE}'
     WHERE household_id=$1 AND status='connected' AND token_revision=$3 AND (refresh_lease_until IS NULL OR refresh_lease_until <= clock_timestamp())
     RETURNING refresh_token_sealed`,
    [householdId, leaseId, seenRevision],
  );
  if (!got.rowCount) return "lost_race";
  const markReauth = async (evidence: Record<string, unknown>) => {
    await inTransaction(async (c) => {
      await c.query(
        `UPDATE kroger_connections SET status='needs_reauthorization', access_token_sealed=NULL, refresh_token_sealed=NULL, access_expires_at=NULL,
           refresh_lease_id=NULL, refresh_lease_until=NULL, token_revision=token_revision+1, updated_at=clock_timestamp()
         WHERE household_id=$1 AND refresh_lease_id=$2`,
        [householdId, leaseId],
      );
      await event(c, householdId, "refresh_failed", null, evidence);
    });
    log({ at: "kroger", step: "refresh_failed", householdId, ...evidence });
    return { ok: false as const, reason: "needs_reauthorization" as const };
  };
  const sealedRefresh: string | null = got.rows[0].refresh_token_sealed;
  if (!sealedRefresh) return markReauth({ error: "no_refresh_token" });
  let refreshToken: string;
  try {
    refreshToken = unseal(cfg.key!, sealedRefresh, aad("refresh", householdId));
  } catch {
    return markReauth({ error: "unreadable_refresh_token" });
  }
  const req = refreshRequest({ clientId: cfg.clientId!, clientSecret: cfg.clientSecret!, refreshToken });
  let parsed: ReturnType<typeof parseTokenResponse>;
  let httpStatus: number | null = null;
  try {
    const r = await transportFor().request(req.method, req.url, req.headers, req.body, TIMEOUTS.token);
    httpStatus = r.status;
    parsed = parseTokenResponse(r.status, r.bodyText);
  } catch (e) {
    // The single-use refresh token may or may not have been consumed: never retry it.
    parsed = { ok: false, error: e instanceof TransportError ? `transport_${e.kind}` : "transport_error" };
  }
  logHttp("refresh", householdId, req, { httpStatus, ok: parsed.ok });
  if (!parsed.ok) return markReauth({ httpStatus, error: parsed.error });
  const t = parsed.tokens;
  // The new pair replaces the old one in one statement, only while this caller holds the lease.
  const stored = await inTransaction(async (c) => {
    const u = await c.query(
      `UPDATE kroger_connections SET access_token_sealed=$3, refresh_token_sealed=$4,
         access_expires_at=CASE WHEN $5::int IS NULL THEN NULL ELSE clock_timestamp() + make_interval(secs => $5::int) END,
         scope=COALESCE($6, scope), token_revision=token_revision+1, refresh_lease_id=NULL, refresh_lease_until=NULL, updated_at=clock_timestamp()
       WHERE household_id=$1 AND refresh_lease_id=$2 AND status='connected'`,
      [householdId, leaseId, seal(cfg.key!, t.accessToken, aad("access", householdId)), t.refreshToken ? seal(cfg.key!, t.refreshToken, aad("refresh", householdId)) : null, t.expiresInSeconds, t.scope],
    );
    if (u.rowCount) await event(c, householdId, "refreshed", null, { expiresInSeconds: t.expiresInSeconds, refreshTokenIssued: !!t.refreshToken });
    return !!u.rowCount;
  });
  if (!stored) return "lost_race";
  return { ok: true, accessToken: t.accessToken };
}

/** A 401 on a write: the token is not usable. No retry; the household must authorize again. */
export async function requireReauthorization(householdId: string, evidence: Record<string, unknown>) {
  await inTransaction(async (c) => {
    await c.query(
      `UPDATE kroger_connections SET status='needs_reauthorization', access_token_sealed=NULL, refresh_token_sealed=NULL, access_expires_at=NULL,
         refresh_lease_id=NULL, refresh_lease_until=NULL, token_revision=token_revision+1, updated_at=clock_timestamp()
       WHERE household_id=$1 AND status='connected'`,
      [householdId],
    );
    await event(c, householdId, "reauthorization_required", null, evidence);
  });
}

// ---------------------------------------------------------------------------------------------
// Read model (no secrets)

export interface ConnectionView {
  status: ConnectionStatus;
  locationId: string | null;
  connectedAt: string | null;
  connectedBy: string | null;
  accessExpiresAt: string | null;
}

export async function connectionView(c: Db | ReturnType<typeof pool>, householdId: string): Promise<ConnectionView> {
  const r = await c.query(
    `SELECT k.status, k.location_id, k.connected_at, k.access_expires_at, m.display_name
     FROM kroger_connections k LEFT JOIN members m ON m.id=k.connected_by WHERE k.household_id=$1`,
    [householdId],
  );
  const x = r.rows[0];
  if (!x) return { status: "not_connected", locationId: null, connectedAt: null, connectedBy: null, accessExpiresAt: null };
  return {
    status: x.status, locationId: x.location_id, connectedAt: x.connected_at?.toISOString() ?? null, connectedBy: x.display_name ?? null,
    accessExpiresAt: x.access_expires_at?.toISOString() ?? null,
  };
}

export { event as connectionEvent };

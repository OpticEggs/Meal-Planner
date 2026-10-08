import { KROGER } from "./config";

/** Pure builders/parsers for the documented OAuth2 requests (Customer Authentication page). */

export function authorizeUrl(p: { clientId: string; redirectUri: string; scopes: string; state: string; codeChallenge: string }): string {
  const u = new URL(KROGER.authorizeUrl);
  u.searchParams.set("scope", p.scopes);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", p.clientId);
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("code_challenge", p.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  // Not in Kroger's docs; RFC 6749 §4.1.1. Required back on the callback.
  u.searchParams.set("state", p.state);
  return u.toString();
}

export function basicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
}

const FORM = "application/x-www-form-urlencoded";

export function codeExchangeRequest(p: { clientId: string; clientSecret: string; code: string; redirectUri: string; codeVerifier: string }) {
  const body = new URLSearchParams({ grant_type: "authorization_code", code: p.code, redirect_uri: p.redirectUri, code_verifier: p.codeVerifier }).toString();
  return { method: "POST" as const, url: KROGER.tokenUrl, headers: { "Content-Type": FORM, Authorization: basicAuth(p.clientId, p.clientSecret), Accept: "application/json" }, body };
}

export function refreshRequest(p: { clientId: string; clientSecret: string; refreshToken: string }) {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: p.refreshToken }).toString();
  return { method: "POST" as const, url: KROGER.tokenUrl, headers: { "Content-Type": FORM, Authorization: basicAuth(p.clientId, p.clientSecret), Accept: "application/json" }, body };
}

export function clientCredentialsRequest(p: { clientId: string; clientSecret: string; scopes: string }) {
  const body = new URLSearchParams({ grant_type: "client_credentials", scope: p.scopes }).toString();
  return { method: "POST" as const, url: KROGER.tokenUrl, headers: { "Content-Type": FORM, Authorization: basicAuth(p.clientId, p.clientSecret), Accept: "application/json" }, body };
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number | null; // null = not stated / invalid: treated as already expired
  scope: string | null;
}

/** Parses a documented token response. Anything without an access token is a failure. */
export function parseTokenResponse(status: number, bodyText: string): { ok: true; tokens: TokenSet } | { ok: false; error: string } {
  let j: Record<string, unknown> | null = null;
  try {
    j = JSON.parse(bodyText);
  } catch {
    j = null;
  }
  if (status !== 200) {
    const err = j && typeof j.error === "string" ? j.error : `http_${status}`;
    return { ok: false, error: err };
  }
  if (!j || typeof j.access_token !== "string" || !j.access_token) return { ok: false, error: "unreadable_token_response" };
  const exp = typeof j.expires_in === "number" && Number.isFinite(j.expires_in) && j.expires_in > 0 ? Math.floor(j.expires_in) : null;
  return {
    ok: true,
    tokens: {
      accessToken: j.access_token,
      refreshToken: typeof j.refresh_token === "string" && j.refresh_token ? j.refresh_token : null,
      expiresInSeconds: exp,
      scope: typeof j.scope === "string" ? j.scope : null,
    },
  };
}

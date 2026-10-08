/**
 * Redaction for anything Kroger-related that is logged or kept as evidence: Authorization
 * headers, tokens, authorization codes, PKCE verifiers/challenges, state and the client secret.
 */

const SECRET_KEYS = new Set([
  "authorization", "access_token", "refresh_token", "id_token", "code", "code_verifier", "code_challenge", "state",
  "client_secret", "client_id", "accesstoken", "refreshtoken", "token",
]);
export const REDACTED = "[redacted]";

export function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) out[k] = SECRET_KEYS.has(k.toLowerCase()) || /bearer|basic/i.test(v) ? REDACTED : v;
  return out;
}

/** Form-encoded or JSON bodies; anything unparseable is dropped entirely rather than risked. */
export function redactBody(body: string | null): string | null {
  if (body === null || body === "") return body;
  const t = body.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.stringify(redactValue(JSON.parse(t)));
    } catch {
      return REDACTED;
    }
  }
  if (/^[\w.%-]+=/.test(t)) {
    const p = new URLSearchParams(t);
    for (const k of [...p.keys()]) if (SECRET_KEYS.has(k.toLowerCase())) p.set(k, REDACTED);
    return p.toString();
  }
  return REDACTED;
}

export function redactValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(redactValue);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET_KEYS.has(k.toLowerCase()) ? REDACTED : redactValue(x)]));
  }
  if (typeof v === "string" && /^(bearer|basic)\s/i.test(v)) return REDACTED;
  return v;
}

export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (SECRET_KEYS.has(k.toLowerCase())) u.searchParams.set(k, REDACTED);
    return u.toString();
  } catch {
    return REDACTED;
  }
}

/** Removes every occurrence of known secret values from free text (error messages). */
export function scrub(text: string, secrets: (string | null | undefined)[]): string {
  let out = text;
  for (const s of secrets) if (s && s.length >= 4) out = out.split(s).join(REDACTED);
  return out;
}

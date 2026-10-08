import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Secrets at rest (tokens, PKCE verifiers) are sealed with AES-256-GCM under TABLE_TOKEN_KEY
 * (32 random bytes, base64). The associated data binds a ciphertext to its household and purpose,
 * so a value copied into another household's row or another column does not decrypt.
 * No key -> nothing is stored (callers refuse).
 */

export class TokenKeyError extends Error {}

export function parseTokenKey(b64: string | null): Buffer | null {
  if (!b64) return null;
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32 || k.toString("base64").replace(/=+$/, "") !== b64.replace(/=+$/, "")) {
    throw new TokenKeyError("TABLE_TOKEN_KEY must be 32 random bytes, base64-encoded (openssl rand -base64 32)");
  }
  return k;
}

const PREFIX = "v1";

export function seal(key: Buffer, plaintext: string, aad: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return [PREFIX, iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function unseal(key: Buffer, sealed: string, aad: string): string {
  const [v, iv, tag, ct] = sealed.split(":");
  if (v !== PREFIX || !iv || !tag || ct === undefined) throw new Error("unreadable sealed value");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAAD(Buffer.from(aad, "utf8"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

export const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** RFC 7636: a high-entropy verifier (43 chars from 32 random bytes) and its S256 challenge. */
export function pkcePair(): { verifier: string; challenge: string; method: "S256" } {
  const verifier = b64url(randomBytes(32));
  return { verifier, challenge: s256(verifier), method: "S256" };
}

export function s256(verifier: string): string {
  return b64url(createHash("sha256").update(verifier, "ascii").digest());
}

/** Opaque single-use state. Only its hash is stored. */
export function newState(): { state: string; hash: string } {
  const state = b64url(randomBytes(32));
  return { state, hash: stateHash(state) };
}

export function stateHash(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

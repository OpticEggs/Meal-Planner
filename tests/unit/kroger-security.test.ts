/**
 * B5 security helpers and staged activation: sealing, PKCE (documented S256), state, redaction,
 * the activation matrix, the status legend and the refusal of test conveniences outside test.
 */
import { createHash, randomBytes } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { b64url, newState, parseTokenKey, pkcePair, s256, seal, stateHash, unseal } from "@/server/integrations/kroger/crypto";
import { REDACTED, redactBody, redactHeaders, redactUrl, scrub } from "@/server/integrations/kroger/redact";
import { authorizeUrl, codeExchangeRequest, parseTokenResponse, refreshRequest } from "@/server/integrations/kroger/oauth";
import { capabilityStatus, cartGlobalStatus, cartModality, krogerStatusReport } from "@/server/integrations/kroger/config";
import { krogerActivation, krogerFakeTransportEnabled } from "@/server/env";
import { retailer } from "@/server/integrations/retailer";
import { krogerFake, transportFor } from "@/server/integrations/kroger/transport";
import { FAKE, forbidNetwork, krogerEnv, saveEnv } from "../fixtures/kroger/env";

let restore: () => void = () => {};
beforeAll(() => forbidNetwork());
afterEach(() => restore());
const fresh = () => {
  restore = saveEnv();
  for (const k of ["KROGER_ACTIVATE", "TABLE_KROGER_FAKE_TRANSPORT", "TABLE_TOKEN_KEY", "KROGER_CLIENT_ID", "KROGER_CLIENT_SECRET", "KROGER_REDIRECT_URI", "KROGER_LOCATION_ID", "KROGER_CUSTOMER_SCOPES", "KROGER_PRODUCT_SCOPES", "KROGER_LOCATION_SCOPES"]) delete process.env[k];
  process.env.TABLE_ENV = "test";
};

describe("B5 sealing (AES-256-GCM) and key handling", () => {
  it("round-trips, binds to its associated data, and never contains the plaintext", () => {
    const key = parseTokenKey(FAKE.tokenKey)!;
    const s = seal(key, "fake-access-token-1", "table:kroger:access:H1");
    expect(s).not.toContain("fake-access-token-1");
    expect(unseal(key, s, "table:kroger:access:H1")).toBe("fake-access-token-1");
    expect(() => unseal(key, s, "table:kroger:access:H2")).toThrow(); // another household
    expect(() => unseal(key, s, "table:kroger:refresh:H1")).toThrow(); // another column
    expect(() => unseal(parseTokenKey(randomBytes(32).toString("base64"))!, s, "table:kroger:access:H1")).toThrow(); // another key
    expect(seal(key, "x", "a")).not.toBe(seal(key, "x", "a")); // fresh IV each time
  });
  it("accepts only 32 random bytes in base64", () => {
    expect(parseTokenKey(null)).toBeNull();
    expect(() => parseTokenKey(randomBytes(16).toString("base64"))).toThrow(/32 random bytes/);
    expect(() => parseTokenKey("not base64 at all!!")).toThrow(/32 random bytes/);
  });
});

describe("B5 PKCE (S256, as documented) and state", () => {
  it("derives the challenge from the verifier with SHA-256 / base64url (S256 = base64url(SHA-256(verifier)))", () => {
    // SHA-256("abc") = ba7816bf...15ad (FIPS 180-2 vector), base64url without padding.
    const expected = s256("abc");
    const p = pkcePair();
    expect(p.method).toBe("S256");
    expect(p.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(p.challenge).toBe(b64url(createHash("sha256").update(p.verifier).digest()));
    expect(expected).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });
  it("state is random and only its hash is meant for storage", () => {
    const a = newState();
    const b = newState();
    expect(a.state).not.toBe(b.state);
    expect(a.hash).toBe(stateHash(a.state));
    expect(a.hash).not.toContain(a.state);
  });
  it("authorize URL carries exactly the documented parameters plus state", () => {
    const u = new URL(authorizeUrl({ clientId: FAKE.clientId, redirectUri: FAKE.redirectUri, scopes: FAKE.customerScopes, state: "S", codeChallenge: "C" }));
    expect(u.origin + u.pathname).toBe("https://api.kroger.com/v1/connect/oauth2/authorize");
    expect(Object.fromEntries(u.searchParams)).toEqual({
      scope: FAKE.customerScopes, response_type: "code", client_id: FAKE.clientId, redirect_uri: FAKE.redirectUri, code_challenge: "C", code_challenge_method: "S256", state: "S",
    });
  });
  it("token requests use Basic auth and form bodies; the code exchange sends the verifier", () => {
    const x = codeExchangeRequest({ clientId: "id", clientSecret: "secret", code: "the-code", redirectUri: FAKE.redirectUri, codeVerifier: "the-verifier" });
    expect(x.headers.Authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(Object.fromEntries(new URLSearchParams(x.body))).toEqual({ grant_type: "authorization_code", code: "the-code", redirect_uri: FAKE.redirectUri, code_verifier: "the-verifier" });
    const r = refreshRequest({ clientId: "id", clientSecret: "secret", refreshToken: "rt" });
    expect(Object.fromEntries(new URLSearchParams(r.body))).toEqual({ grant_type: "refresh_token", refresh_token: "rt" });
    expect(r.headers.Authorization).toMatch(/^Basic /);
  });
  it("parses token responses; a missing expires_in is unknown, not a default", () => {
    expect(parseTokenResponse(200, JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 1800 }))).toEqual({ ok: true, tokens: { accessToken: "a", refreshToken: "r", expiresInSeconds: 1800, scope: null } });
    expect(parseTokenResponse(200, JSON.stringify({ access_token: "a" }))).toMatchObject({ ok: true, tokens: { refreshToken: null, expiresInSeconds: null } });
    expect(parseTokenResponse(400, JSON.stringify({ error: "invalid_grant" }))).toEqual({ ok: false, error: "invalid_grant" });
    expect(parseTokenResponse(200, "not json")).toEqual({ ok: false, error: "unreadable_token_response" });
  });
});

describe("B5 redaction", () => {
  it("removes Authorization, tokens, codes, verifiers, state and the client secret", () => {
    expect(redactHeaders({ Authorization: "Bearer abc", "Content-Type": "application/json", "X-Other": "Basic Zm9v" })).toEqual({ Authorization: REDACTED, "Content-Type": "application/json", "X-Other": REDACTED });
    const form = redactBody("grant_type=authorization_code&code=SECRETCODE&redirect_uri=x&code_verifier=SECRETVERIFIER&client_secret=SHH")!;
    expect(form).not.toMatch(/SECRETCODE|SECRETVERIFIER|SHH/);
    expect(form).toContain("grant_type=authorization_code");
    const j = redactBody(JSON.stringify({ access_token: "AT", refresh_token: "RT", nested: { token: "T", ok: 1 }, items: [{ upc: "1", quantity: 2 }] }))!;
    expect(j).not.toMatch(/"AT"|"RT"|"T"/);
    expect(JSON.parse(j).items).toEqual([{ upc: "1", quantity: 2 }]);
    expect(redactBody("garbage that is not json or a form")).toBe(REDACTED);
    expect(redactUrl("https://x.test/cb?code=SECRETCODE&state=STATE&kroger=1")).not.toMatch(/SECRETCODE|STATE/);
    expect(scrub("token fake-access-token-9 leaked", ["fake-access-token-9"])).toBe(`token ${REDACTED} leaked`);
  });
});

describe("B5 staged activation matrix", () => {
  it("absent activation = nothing active; full credentials are not enough", () => {
    fresh();
    krogerEnv("", { fake: false });
    expect([...krogerActivation()]).toEqual([]);
    for (const c of ["connect", "products", "cart"] as const) {
      const s = capabilityStatus(c);
      expect(s.ready, c).toBe(false);
      expect(s.activated).toBe(false);
      expect(s.configComplete).toBe(true);
      expect(s.reason).toMatch(/not activated/);
    }
    expect(cartGlobalStatus().ready).toBe(false);
    expect(retailer().status().ready).toBe(false);
    expect(retailer().status().reason).toMatch(/not verified or authorized/);
  });

  it("each capability is independent: connect alone never enables products or cart writes", () => {
    fresh();
    krogerEnv("connect", { fake: false });
    expect(capabilityStatus("connect").ready).toBe(true);
    expect(capabilityStatus("products").ready).toBe(false);
    expect(capabilityStatus("cart").ready).toBe(false);
    krogerEnv("products", { fake: false });
    expect(capabilityStatus("products").ready).toBe(true);
    expect(capabilityStatus("connect").ready).toBe(false);
    krogerEnv("cart", { fake: false });
    expect(capabilityStatus("cart").reason).toMatch(/needs the connect capability/);
  });

  it("cart stays not-ready while modality is unsettled, even fully activated and configured", () => {
    fresh();
    krogerEnv("connect,products,cart", { fake: false });
    expect(cartModality()).toEqual({ settled: false });
    const s = capabilityStatus("cart");
    expect(s).toMatchObject({ activated: true, configComplete: true, ready: false });
    expect(s.reason).toMatch(/modality/);
    expect(s.unsettled.join(" ")).toMatch(/modality/);
    expect(retailer().status().ready).toBe(false);
  });

  it("missing configuration is named per capability", () => {
    fresh();
    krogerEnv("connect,products,cart", { fake: true });
    delete process.env.TABLE_TOKEN_KEY;
    delete process.env.KROGER_PRODUCT_SCOPES;
    expect(capabilityStatus("connect").missing).toEqual(["TABLE_TOKEN_KEY"]);
    expect(capabilityStatus("products").missing).toEqual(["KROGER_PRODUCT_SCOPES"]);
    expect(capabilityStatus("cart").reason).toMatch(/missing TABLE_TOKEN_KEY/);
    process.env.TABLE_TOKEN_KEY = "too-short";
    expect(capabilityStatus("connect").missing).toEqual(["TABLE_TOKEN_KEY (invalid)"]);
  });

  it("the retailer must be kroger for any capability to be active", () => {
    fresh();
    krogerEnv("connect,products,cart", { fake: true, retailer: "simulated" });
    for (const c of ["connect", "products", "cart"] as const) expect(capabilityStatus(c).ready).toBe(false);
    expect(retailer().mode).toBe("simulated");
  });

  it("status never claims live-verified", () => {
    fresh();
    krogerEnv("connect,products,cart", { fake: true });
    const r = krogerStatusReport();
    expect(r.liveVerified).toBe(false);
    for (const c of r.capabilities) {
      expect(c.liveVerified).toBe(false);
      expect(["documented", "implemented", "fixture-tested"]).toContain(c.evidence);
    }
    expect(JSON.stringify(r)).not.toMatch(/"live-verified"/);
  });

  it("unknown activation names fail loudly", () => {
    fresh();
    krogerEnv("connect,checkout", { fake: false });
    expect(() => krogerActivation()).toThrow(/accepts only/);
  });

  it("production refuses activation unless TABLE_RETAILER=kroger, and refuses the test fake", () => {
    fresh();
    krogerEnv("connect", { fake: false, retailer: "simulated" });
    process.env.TABLE_ENV = "production";
    expect(() => krogerActivation()).toThrow(/refused in production/);
    expect(() => retailer()).toThrow(/refused in production/);
    process.env.TABLE_RETAILER = "kroger";
    expect([...krogerActivation()]).toEqual(["connect"]);
    process.env.TABLE_KROGER_FAKE_TRANSPORT = "1";
    expect(() => krogerFakeTransportEnabled()).toThrow(/test-only/);
    expect(() => transportFor()).toThrow(/test-only/);
    expect(() => krogerFake.calls()).toThrow(/test-only/);
    expect(() => cartModality()).toThrow(/test-only/);
    process.env.TABLE_ENV = "development";
    expect(() => krogerFakeTransportEnabled()).toThrow(/test-only/);
  });
});

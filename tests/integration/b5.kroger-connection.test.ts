/**
 * B5 Kroger customer connection against real PostgreSQL and the recording fake transport:
 * state binding/replay/expiry, PKCE, denied access, absent config, encrypted-at-rest tokens,
 * refresh coordination, disconnect, household isolation, export, log redaction.
 * Offline: global fetch throws in every test.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { fresh, op, q } from "./helpers";
import { FAKE, empty, forbidNetwork, json, krogerEnv, saveEnv, tokenBody } from "../fixtures/kroger/env";
import { connect, startFor } from "../fixtures/kroger/connect";
import { krogerFake, TransportError } from "@/server/integrations/kroger/transport";
import { accessTokenFor, completeAuthorization, connectionView, startAuthorization } from "@/server/integrations/kroger/connection";
import { s256, stateHash } from "@/server/integrations/kroger/crypto";
import { disconnectKrogerCommand, setKrogerLocationCommand } from "@/server/commands/kroger";
import { EXPORT_TABLES, NOT_EXPORTED, exportHousehold } from "@/server/export";
import { pool } from "@/server/db/pool";

let restore: () => void;
beforeAll(() => forbidNetwork());
beforeEach(() => {
  restore = saveEnv();
  krogerEnv("connect,products,cart", { fake: true });
  krogerFake.reset();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
});

const conn = async (householdId: string) => (await q<any>("SELECT * FROM kroger_connections WHERE household_id=$1", [householdId]))[0];
const states = async () => q<any>("SELECT * FROM kroger_auth_states ORDER BY created_at");
const events = async (householdId: string) => (await q<any>("SELECT kind, evidence FROM kroger_connection_events WHERE household_id=$1 ORDER BY id", [householdId]));

describe("B5 authorization start", () => {
  it("stores a single-use state bound to household, member and redirect URI — hash only, verifier sealed — and builds a PKCE S256 URL", async () => {
    const { jon } = await fresh();
    const { state, challenge, url } = await startFor(jon);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("client_id")).toBe(FAKE.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(FAKE.redirectUri);
    expect(url.searchParams.get("scope")).toBe(FAKE.customerScopes);
    const [row] = await states();
    expect(row).toMatchObject({ state_hash: stateHash(state), household_id: jon.householdId, member_id: jon.memberId, redirect_uri: FAKE.redirectUri, consumed_at: null });
    expect(JSON.stringify(row)).not.toContain(state);
    expect(row.expires_at.getTime() - row.created_at.getTime()).toBe(10 * 60_000);
    expect(krogerFake.calls()).toHaveLength(0); // starting never touches the network
    // The exchange later sends the verifier whose S256 is the challenge; the stored column never holds it.
    krogerFake.respond(() => json(200, tokenBody(1)));
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("connected");
    const sent = new URLSearchParams(krogerFake.calls()[0].body!);
    const verifier = sent.get("code_verifier")!;
    expect(s256(verifier)).toBe(challenge);
    expect(row.verifier_sealed).not.toContain(verifier);
  });

  it("absent configuration or activation refuses to start and stores nothing", async () => {
    const { jon } = await fresh();
    delete process.env.TABLE_TOKEN_KEY;
    expect(await startAuthorization(jon)).toMatchObject({ ok: false, code: "not_configured" });
    krogerEnv("products,cart", { fake: true });
    expect(await startAuthorization(jon)).toMatchObject({ ok: false, code: "not_activated" });
    krogerEnv("", { fake: true });
    expect(await startAuthorization(jon)).toMatchObject({ ok: false, code: "not_activated" });
    expect(await states()).toHaveLength(0);
    expect(await events(jon.householdId)).toHaveLength(0);
    expect(krogerFake.calls()).toHaveLength(0);
  });
});

describe("B5 authorization callback", () => {
  it("exchanges the code once with Basic auth and stores tokens sealed (raw columns hold no token)", async () => {
    const { jon } = await fresh();
    const { state } = await startFor(jon);
    krogerFake.respond(() => json(200, tokenBody(1)));
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("connected");
    const [call] = krogerFake.calls();
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://api.kroger.com/v1/connect/oauth2/token");
    expect(call.headers.Authorization).toBe(`Basic ${Buffer.from(`${FAKE.clientId}:${FAKE.clientSecret}`).toString("base64")}`);
    expect(Object.fromEntries(new URLSearchParams(call.body!))).toMatchObject({ grant_type: "authorization_code", code: "fake-auth-code-1", redirect_uri: FAKE.redirectUri });
    const c = await conn(jon.householdId);
    expect(c.status).toBe("connected");
    const raw = JSON.stringify(await q("SELECT * FROM kroger_connections"));
    expect(raw).not.toContain("fake-access-token-1");
    expect(raw).not.toContain("fake-refresh-token-1");
    expect(c.access_token_sealed).toMatch(/^v1:/);
    // Expiry comes from the response's expires_in, measured on the database clock.
    expect(c.access_expires_at.getTime() - Date.now()).toBeGreaterThan(1700_000);
    expect(await accessTokenFor(jon.householdId)).toEqual({ ok: true, accessToken: "fake-access-token-1" });
    expect((await events(jon.householdId)).map((e) => e.kind)).toEqual(["authorization_started", "connected"]);
  });

  it("a replayed state is refused with no exchange and nothing changed", async () => {
    const { jon } = await fresh();
    const { state } = await startFor(jon);
    krogerFake.respond(() => json(200, tokenBody(1)));
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("connected");
    const before = await conn(jon.householdId);
    krogerFake.respond(() => json(200, tokenBody(2)));
    expect(await completeAuthorization(jon, { code: "fake-auth-code-2", state })).toBe("refused");
    expect(krogerFake.calls()).toHaveLength(1);
    expect(await conn(jon.householdId)).toEqual(before);
  });

  it("an expired state is refused and nothing is stored", async () => {
    const { jon } = await fresh();
    const { state } = await startFor(jon);
    await q("UPDATE kroger_auth_states SET created_at=created_at - interval '1 hour', expires_at=expires_at - interval '1 hour'");
    krogerFake.respond(() => json(200, tokenBody(1)));
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("refused");
    expect(krogerFake.calls()).toHaveLength(0);
    expect(await conn(jon.householdId)).toBeUndefined();
  });

  it("another member's or another household's state is refused without consuming it; unknown and missing states are refused", async () => {
    const { jon, alex, other } = await fresh();
    const { state } = await startFor(jon);
    krogerFake.respond(() => json(200, tokenBody(1)));
    expect(await completeAuthorization(alex, { code: "fake-auth-code-1", state })).toBe("refused");
    expect(await completeAuthorization(other, { code: "fake-auth-code-1", state })).toBe("refused");
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state: "not-a-state-we-issued" })).toBe("refused");
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state: null })).toBe("refused");
    expect(krogerFake.calls()).toHaveLength(0);
    expect(await q("SELECT * FROM kroger_connections")).toHaveLength(0);
    expect((await states())[0].consumed_at).toBeNull();
    // The member who started it can still finish it.
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("connected");
    expect(await conn(other.householdId)).toBeUndefined();
  });

  it("a different redirect URI configured at callback time does not match the bound state", async () => {
    const { jon } = await fresh();
    const { state } = await startFor(jon);
    process.env.KROGER_REDIRECT_URI = "http://127.0.0.1:3600/somewhere-else";
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("refused");
    expect(krogerFake.calls()).toHaveLength(0);
  });

  it("denied access is recorded as not connected, with no exchange and no tokens", async () => {
    const { jon } = await fresh();
    const { state } = await startFor(jon);
    expect(await completeAuthorization(jon, { error: "access_denied", state })).toBe("denied");
    expect(krogerFake.calls()).toHaveLength(0);
    const c = await conn(jon.householdId);
    expect(c).toMatchObject({ status: "not_connected", access_token_sealed: null, refresh_token_sealed: null });
    expect((await events(jon.householdId)).at(-1)).toEqual({ kind: "denied", evidence: { error: "access_denied" } });
    expect(await completeAuthorization(jon, { error: "access_denied", state })).toBe("refused"); // single use
  });

  it("a callback while connect is not activated stores nothing and leaves the state unused", async () => {
    const { jon } = await fresh();
    const { state } = await startFor(jon);
    krogerEnv("products,cart", { fake: true });
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("not_activated");
    delete process.env.TABLE_TOKEN_KEY;
    krogerEnv("connect", { fake: true });
    delete process.env.TABLE_TOKEN_KEY;
    expect(await completeAuthorization(jon, { code: "fake-auth-code-1", state })).toBe("not_activated"); // no key -> refuse to store
    expect(krogerFake.calls()).toHaveLength(0);
    expect(await q("SELECT * FROM kroger_connections")).toHaveLength(0);
    expect((await states())[0].consumed_at).toBeNull();
  });

  it("a failed exchange stores no tokens", async () => {
    const { jon } = await fresh();
    for (const respond of [() => json(400, { error: "invalid_grant" }), () => { throw new TransportError("timeout", "slow"); }, () => json(200, { token_type: "bearer" })]) {
      const { state } = await startFor(jon);
      krogerFake.respond(respond);
      expect(await completeAuthorization(jon, { code: "fake-auth-code-x", state })).toBe("failed");
    }
    expect(await conn(jon.householdId)).toBeUndefined();
    expect((await events(jon.householdId)).filter((e) => e.kind === "exchange_failed").map((e) => e.evidence.error)).toEqual(["invalid_grant", "transport_timeout", "unreadable_token_response"]);
  });
});

describe("B5 token refresh coordination", () => {
  it("two concurrent callers with an expired token cause exactly one refresh and share its result", async () => {
    const { jon } = await fresh();
    await connect(jon, 1);
    await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
    krogerFake.reset(async () => {
      await new Promise((r) => setTimeout(r, 300));
      return json(200, tokenBody(2));
    });
    const [a, b] = await Promise.all([accessTokenFor(jon.householdId), accessTokenFor(jon.householdId)]);
    expect(a).toEqual({ ok: true, accessToken: "fake-access-token-2" });
    expect(b).toEqual(a);
    const calls = krogerFake.calls();
    expect(calls).toHaveLength(1);
    expect(Object.fromEntries(new URLSearchParams(calls[0].body!))).toEqual({ grant_type: "refresh_token", refresh_token: "fake-refresh-token-1" });
    expect(calls[0].headers.Authorization).toMatch(/^Basic /);
    // The single-use refresh token was replaced together with the access token.
    const c = await conn(jon.householdId);
    expect(c.refresh_lease_id).toBeNull();
    expect(c.token_revision).toBe(2);
    await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
    krogerFake.reset(() => json(200, tokenBody(3)));
    await accessTokenFor(jon.householdId);
    expect(new URLSearchParams(krogerFake.calls()[0].body!).get("refresh_token")).toBe("fake-refresh-token-2");
  });

  it("an unknown expiry is treated as expired: refresh before use", async () => {
    const { jon } = await fresh();
    await connect(jon, 1, null);
    expect((await conn(jon.householdId)).access_expires_at).toBeNull();
    krogerFake.reset(() => json(200, tokenBody(2)));
    expect(await accessTokenFor(jon.householdId)).toEqual({ ok: true, accessToken: "fake-access-token-2" });
    expect(krogerFake.calls()).toHaveLength(1);
  });

  for (const [label, respond] of [
    ["400 invalid refresh token", () => json(400, { error: "invalid_grant", error_description: "Missing/Invalid Refresh Token" })],
    ["a timeout (the token may have been consumed)", () => { throw new TransportError("timeout", "slow"); }],
    ["a 500", () => empty(500)],
  ] as const) {
    it(`a failed refresh (${label}) marks needs_reauthorization once and never loops`, async () => {
      const { jon } = await fresh();
      await connect(jon, 1);
      await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
      krogerFake.reset(respond as () => ReturnType<typeof json>);
      const [a, b] = await Promise.all([accessTokenFor(jon.householdId), accessTokenFor(jon.householdId)]);
      expect(a).toEqual({ ok: false, reason: "needs_reauthorization" });
      expect(b).toEqual(a);
      expect(await accessTokenFor(jon.householdId)).toEqual(a);
      expect(krogerFake.calls()).toHaveLength(1);
      expect(await conn(jon.householdId)).toMatchObject({ status: "needs_reauthorization", access_token_sealed: null, refresh_token_sealed: null, refresh_lease_id: null });
      expect((await events(jon.householdId)).filter((e) => e.kind === "refresh_failed")).toHaveLength(1);
    });
  }

  it("a refresh needs the connect capability: with it deactivated nothing is sent", async () => {
    const { jon } = await fresh();
    await connect(jon, 1);
    await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
    krogerEnv("cart", { fake: true });
    krogerFake.reset(() => json(200, tokenBody(2)));
    expect(await accessTokenFor(jon.householdId)).toEqual({ ok: false, reason: "not_activated" });
    expect(krogerFake.calls()).toHaveLength(0);
  });
});

describe("B5 household isolation, disconnect, location", () => {
  it("one household's tokens can never be used for another, even if copied", async () => {
    const { jon, other } = await fresh();
    await connect(jon, 1);
    expect(await accessTokenFor(other.householdId)).toEqual({ ok: false, reason: "not_connected" });
    expect((await connectionView(pool(), other.householdId)).status).toBe("not_connected");
    // Copy the sealed values into the other household's row: they do not decrypt there.
    await q(
      `INSERT INTO kroger_connections(household_id, status, access_token_sealed, refresh_token_sealed, access_expires_at, token_revision)
       SELECT $2, status, access_token_sealed, refresh_token_sealed, access_expires_at, 1 FROM kroger_connections WHERE household_id=$1`,
      [jon.householdId, other.householdId],
    );
    expect(await accessTokenFor(other.householdId)).toEqual({ ok: false, reason: "unreadable_credentials" });
  });

  it("disconnect discards the sealed tokens; location is per household and validated", async () => {
    const { jon, alex, other } = await fresh();
    await connect(jon, 1);
    expect((await setKrogerLocationCommand(alex, op(), { locationId: "TEST0001" })).status).toBe("accepted");
    const bad = await setKrogerLocationCommand(alex, op(), { locationId: "123" });
    expect(bad.status === "rejected" && bad.code).toBe("invalid");
    expect((await setKrogerLocationCommand(other, op(), { locationId: "OTHER001" })).status).toBe("accepted");
    expect((await conn(jon.householdId)).location_id).toBe("TEST0001");
    expect((await conn(other.householdId)).location_id).toBe("OTHER001");
    const d = await disconnectKrogerCommand(alex, op(), {});
    expect(d.status).toBe("accepted");
    expect(await conn(jon.householdId)).toMatchObject({ status: "disconnected", access_token_sealed: null, refresh_token_sealed: null, location_id: "TEST0001" });
    expect(await accessTokenFor(jon.householdId)).toEqual({ ok: false, reason: "not_connected" });
    const again = await disconnectKrogerCommand(alex, op(), {});
    expect(again.status === "rejected" && again.code).toBe("not_connected");
    expect(krogerFake.calls()).toHaveLength(1); // only the original exchange; no revocation call exists
  });
});

describe("B5 export and logging never carry secrets", () => {
  it("the household export excludes tokens, verifiers and states but keeps the non-secret history", async () => {
    const { fx, jon } = await fresh();
    await connect(jon, 1);
    await startFor(jon); // an open state + sealed verifier
    expect(NOT_EXPORTED).toEqual(expect.arrayContaining(["kroger_connections", "kroger_auth_states"]));
    expect(EXPORT_TABLES.map((t) => t.table)).toContain("kroger_connection_events");
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    try {
      const data = await exportHousehold(c, fx.householdId);
      const text = JSON.stringify(data);
      for (const forbidden of ["fake-access-token-1", "fake-refresh-token-1", "v1:", "sealed", "state_hash", "verifier", FAKE.clientSecret]) {
        expect(text.includes(forbidden), forbidden).toBe(false);
      }
      expect(data.tables.kroger_connection_events.map((e: any) => e.kind)).toEqual(["authorization_started", "connected", "authorization_started"]);
    } finally {
      await c.end();
    }
  });

  it("logs redact Authorization, tokens, codes, verifiers and the client secret", async () => {
    const { jon } = await fresh();
    process.env.TABLE_LOG = "1";
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void lines.push(a.map(String).join(" ")));
    const { state } = await startFor(jon);
    krogerFake.respond(() => json(200, tokenBody(1)));
    await completeAuthorization(jon, { code: "fake-auth-code-SECRET", state });
    await q("UPDATE kroger_connections SET access_expires_at = clock_timestamp() - interval '1 minute'");
    krogerFake.respond(() => json(200, tokenBody(2)));
    await accessTokenFor(jon.householdId);
    const verifier = new URLSearchParams(krogerFake.calls()[0].body!).get("code_verifier")!;
    const all = lines.join("\n");
    expect(all).toMatch(/code_exchange/);
    expect(all).toMatch(/refresh/);
    for (const secret of ["fake-auth-code-SECRET", verifier, state, "fake-access-token-1", "fake-refresh-token-1", "fake-access-token-2", "fake-refresh-token-2", FAKE.clientSecret, Buffer.from(`${FAKE.clientId}:${FAKE.clientSecret}`).toString("base64")]) {
      expect(all.includes(secret), secret).toBe(false);
    }
  });
});

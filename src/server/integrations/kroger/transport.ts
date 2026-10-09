import { appendFileSync, readFileSync } from "node:fs";
import { krogerFakeTransportEnabled } from "../../env";

/**
 * The only way Kroger HTTP leaves Table. The production transport (fetch) is constructed only by
 * `transportFor` after the caller has checked that the capability for that call is activated;
 * tests use the in-process recording fake, honored only when TABLE_ENV=test and
 * TABLE_KROGER_FAKE_TRANSPORT=1 (env.ts refuses the switch anywhere else).
 */

export type HttpMethod = "GET" | "POST" | "PUT";

export interface TransportResponse {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}

export class TransportError extends Error {
  constructor(public kind: "timeout" | "network", message: string) {
    super(message);
  }
}

export interface KrogerTransport {
  request(method: HttpMethod, url: string, headers: Record<string, string>, body: string | null, timeoutMs: number): Promise<TransportResponse>;
}

/** Per-call timeouts. The cart PUT stays well below the dispatch bound (90 s) in purchasing. */
export const TIMEOUTS = { token: 15_000, lookup: 15_000, cartAdd: 30_000 } as const;

export function fetchTransport(): KrogerTransport {
  return {
    async request(method, url, headers, body, timeoutMs) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const r = await fetch(url, { method, headers, body: body ?? undefined, signal: ac.signal, redirect: "manual", cache: "no-store" });
        const bodyText = await r.text();
        const h: Record<string, string> = {};
        r.headers.forEach((v, k) => (h[k] = v));
        return { status: r.status, headers: h, bodyText };
      } catch (e) {
        if (ac.signal.aborted) throw new TransportError("timeout", `no response within ${timeoutMs} ms`);
        throw new TransportError("network", (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// --- Test-only recording fake ------------------------------------------------------------------

export interface RecordedCall {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  timeoutMs: number;
}

export type FakeResponder = (call: RecordedCall) => Promise<TransportResponse> | TransportResponse;

const g = globalThis as unknown as { __krogerFake?: { calls: RecordedCall[]; responder: FakeResponder | null } };
function fakeState() {
  if (!g.__krogerFake) g.__krogerFake = { calls: [], responder: null };
  return g.__krogerFake;
}

/** Test helper: script the fake's answers and read what it received. Throws outside test. */
export const krogerFake = {
  reset(responder: FakeResponder | null = null) {
    assertFake();
    const s = fakeState();
    s.calls = [];
    s.responder = responder;
  },
  respond(responder: FakeResponder) {
    assertFake();
    fakeState().responder = responder;
  },
  calls(): RecordedCall[] {
    assertFake();
    return fakeState().calls;
  },
};

function assertFake() {
  if (!krogerFakeTransportEnabled()) throw new Error("the Kroger recording fake requires TABLE_ENV=test and TABLE_KROGER_FAKE_TRANSPORT=1");
}

const recordingFake: KrogerTransport = {
  async request(method, url, headers, body, timeoutMs) {
    const s = fakeState();
    const call = { method, url, headers: { ...headers }, body, timeoutMs };
    s.calls.push(call);
    logFakeCall(call);
    const responder = s.responder ?? scenarioResponder();
    if (!responder) throw new TransportError("network", "recording fake: no scripted response");
    return responder(call);
  },
};

/**
 * Test-only: a SEPARATE test server process (browser tests) can't be scripted from the test process,
 * so it may read its answers from a fixture file and append each request to a log file the test reads:
 *   TABLE_KROGER_FAKE_SCENARIO=<json: { products: [...] }>  TABLE_KROGER_FAKE_LOG=<jsonl path>
 * Honoured only together with TABLE_KROGER_FAKE_TRANSPORT (TABLE_ENV=test); production refuses both
 * (deploy.ts). No endpoint exposes or controls the fake. Answers: placeholder tokens, product searches
 * over the fixture (term words or product ids), and — only if the scenario declares `cart` — a cart add
 * with that status; anything else (including a cart call the scenario doesn't declare) is a 404, and is
 * logged so a test can prove what was and wasn't requested.
 */
function scenarioResponder(): FakeResponder | null {
  const file = process.env.TABLE_KROGER_FAKE_SCENARIO;
  if (!file) return null;
  assertFake();
  const scenario = JSON.parse(readFileSync(file, "utf8")) as { products: { productId: string; description?: string }[]; cart?: { status: number } };
  const json = (status: number, b: unknown): TransportResponse => ({ status, headers: { "content-type": "application/json" }, bodyText: JSON.stringify(b) });
  let n = 0;
  return (call) => {
    const u = new URL(call.url);
    if (u.pathname.endsWith("/token")) {
      // App tokens and (for the authorization-code and refresh grants) fake customer tokens — placeholders only.
      n += 1;
      return json(200, { access_token: `fake-scenario-access-${n}`, refresh_token: `fake-scenario-refresh-${n}`, expires_in: 1800, token_type: "bearer" });
    }
    if (u.pathname === "/v1/cart/add" && call.method === "PUT" && scenario.cart) return { status: scenario.cart.status, headers: {}, bodyText: "" };
    if (u.pathname === "/v1/products" && call.method === "GET") {
      const ids = u.searchParams.get("filter.productId");
      const words = (u.searchParams.get("filter.term") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      const data = ids
        ? scenario.products.filter((p) => ids.split(",").includes(p.productId))
        : scenario.products.filter((p) => words.some((w) => (p.description ?? "").toLowerCase().includes(w)));
      return json(200, { data });
    }
    return json(404, { error: "not in the test scenario" });
  };
}

function logFakeCall(call: RecordedCall) {
  const file = process.env.TABLE_KROGER_FAKE_LOG;
  if (!file) return;
  const u = new URL(call.url);
  // Method and path only — never headers (they would carry the fake token) and never token-request bodies.
  // A cart request's body (UPCs, quantities, modality) is kept so a test can assert exactly what was sent.
  const body = /\/cart\//.test(u.pathname) && call.body ? JSON.parse(call.body) : undefined;
  appendFileSync(file, `${JSON.stringify({ method: call.method, path: u.pathname, query: Object.fromEntries(u.searchParams), ...(body ? { body } : {}) })}\n`);
}

/** Called ONLY after the capability gate has passed. */
export function transportFor(): KrogerTransport {
  if (krogerFakeTransportEnabled()) return recordingFake;
  return fetchTransport();
}

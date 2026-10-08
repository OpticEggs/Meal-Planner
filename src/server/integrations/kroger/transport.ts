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
    if (!s.responder) throw new TransportError("network", "recording fake: no scripted response");
    return s.responder(call);
  },
};

/** Called ONLY after the capability gate has passed. */
export function transportFor(): KrogerTransport {
  if (krogerFakeTransportEnabled()) return recordingFake;
  return fetchTransport();
}

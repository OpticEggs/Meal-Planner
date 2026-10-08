import { instacartFakeTransportEnabled } from "./config";

/**
 * The only way Instacart HTTP leaves Table. Clients receive a Transport through their deps and
 * call it only after the capability gate has passed. Tests inject the in-process recording fake;
 * `fetchTransport` (global fetch) exists for production and is never used in tests.
 */

export interface TransportRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
  signal: AbortSignal;
}

export interface TransportReply {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type Transport = (req: TransportRequest) => Promise<TransportReply>;

/** Production transport. Redirects are not followed (a 3xx is reported as such). */
export function fetchTransport(): Transport {
  return async (req) => {
    const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body, signal: req.signal, redirect: "manual", cache: "no-store" });
    const body = await r.text();
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => (headers[k] = v));
    return { status: r.status, headers, body };
  };
}

// --- Test-only recording fake ------------------------------------------------------------------

/** One scripted answer: a response, a hang (only the caller's abort ends it), or a network error. */
export type FakeStep =
  | { status: number; headers?: Record<string, string>; body: string }
  | { hang: true }
  | { networkError: string };

export interface RecordedRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export interface RecordingTransport {
  transport: Transport;
  calls: RecordedRequest[];
  /** Replace the script (calls are kept). */
  script(steps: FakeStep[] | ((req: RecordedRequest, n: number) => FakeStep)): void;
}

function assertTestEnv(env: Record<string, string | undefined>) {
  const t = env.TABLE_ENV ?? (env.NODE_ENV === "production" ? "production" : "development");
  if (t !== "test") throw new Error("the Instacart recording fake is test-only and is refused outside TABLE_ENV=test");
}

/** In-process fake: records every request and replays scripted (fixture) responses in order. */
export function recordingTransport(
  steps: FakeStep[] | ((req: RecordedRequest, n: number) => FakeStep) = [],
  env: Record<string, string | undefined> = process.env,
): RecordingTransport {
  assertTestEnv(env);
  const calls: RecordedRequest[] = [];
  let script = steps;
  const transport: Transport = async (req) => {
    const rec: RecordedRequest = { method: req.method, url: req.url, headers: { ...req.headers }, body: req.body };
    calls.push(rec);
    const n = calls.length - 1;
    const step = typeof script === "function" ? script(rec, n) : script[n];
    if (!step) throw new Error("recording fake: no scripted response");
    if ("networkError" in step) throw new Error(step.networkError);
    if ("hang" in step) {
      return new Promise<TransportReply>((_, reject) => {
        const onAbort = () => reject(new Error("aborted"));
        if (req.signal.aborted) onAbort();
        else req.signal.addEventListener("abort", onAbort, { once: true });
      });
    }
    return { status: step.status, headers: step.headers ?? { "content-type": "application/json" }, body: step.body };
  };
  return { transport, calls, script: (s) => (script = s) };
}

const g = globalThis as unknown as { __instacartFake?: RecordingTransport };

/** The shared fake used by `transportFor` when TABLE_INSTACART_FAKE_TRANSPORT=1 (test only). */
export function sharedInstacartFake(env: Record<string, string | undefined> = process.env): RecordingTransport {
  if (!instacartFakeTransportEnabled(env)) throw new Error("the shared Instacart fake requires TABLE_ENV=test and TABLE_INSTACART_FAKE_TRANSPORT=1");
  if (!g.__instacartFake) g.__instacartFake = recordingTransport([], env);
  return g.__instacartFake;
}

/** Transport for wiring: the shared recording fake under the test switch, otherwise fetch.
 *  Throws if the test switch is set outside TABLE_ENV=test. */
export function transportFor(env: Record<string, string | undefined> = process.env): Transport {
  if (instacartFakeTransportEnabled(env)) return sharedInstacartFake(env).transport;
  return fetchTransport();
}

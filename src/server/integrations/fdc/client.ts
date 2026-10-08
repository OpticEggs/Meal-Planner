import {
  DATA_TYPES, normalizeFood, normalizeSearch, type Candidate, type FdcDataType, type ProvenanceKind, type SearchItem,
} from "@/domain/nutrition/fdc";
import { log } from "../../log";
import { redactKey, TransportError, type FdcRequest, type FdcResponse, type FdcTransport } from "./transport";

/**
 * FoodData Central adapter: typed outcomes, never a raw throw, never an automatic retry.
 *  ok | no_matches | not_configured | invalid_key | rate_limited | timeout | unavailable | malformed
 */

export interface RateLimit {
  limit: number | null;
  remaining: number | null;
}
export interface Meta {
  provenance: ProvenanceKind;
  retrievedAt: string;
  rateLimit: RateLimit;
}

export type FdcFailure =
  | { kind: "not_configured" }
  | { kind: "invalid_key"; code: string }
  | { kind: "rate_limited"; code: string | null; rateLimit: RateLimit; retryAfterSeconds: number | null }
  | { kind: "timeout"; afterMs: number }
  | { kind: "unavailable"; httpStatus: number | null; detail: string }
  | { kind: "malformed"; reason: string };

export type SearchOutcome = { kind: "ok"; totalHits: number; items: SearchItem[]; meta: Meta } | { kind: "no_matches"; meta: Meta } | FdcFailure;
export type DetailOutcome = { kind: "ok"; candidate: Candidate; meta: Meta } | { kind: "no_matches"; meta: Meta } | FdcFailure;
export type FdcOutcomeKind = SearchOutcome["kind"];

export interface FdcClient {
  search(query: string, opts?: { dataTypes?: FdcDataType[]; pageSize?: number }): Promise<SearchOutcome>;
  detail(fdcId: number): Promise<DetailOutcome>;
}

export const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TIMEOUT_MS = 15_000;

const int = (v: string | undefined): number | null => (v !== undefined && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null);
const rateLimitOf = (h: Record<string, string>): RateLimit => ({ limit: int(h["x-ratelimit-limit"]), remaining: int(h["x-ratelimit-remaining"]) });

function errorCode(text: string): string | null {
  try {
    const j = JSON.parse(text);
    const c = j?.error?.code;
    return typeof c === "string" ? c : null;
  } catch {
    return null;
  }
}

/** A client over a transport. `null` transport = lookup not configured (nothing is attempted). */
export function createFdcClient(transport: FdcTransport | null, opts: { timeoutMs?: number; now?: () => Date } = {}): FdcClient {
  const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1), MAX_TIMEOUT_MS);
  const now = opts.now ?? (() => new Date());

  type Sent = { res: FdcResponse; meta: Meta } | FdcFailure;
  async function send(op: "search" | "detail", req: FdcRequest): Promise<Sent> {
    if (!transport) return { kind: "not_configured" };
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => {
        ctl.abort();
        resolve("timeout");
      }, timeoutMs);
    });
    try {
      const r = await Promise.race([transport.send(req, ctl.signal), timedOut]);
      if (r === "timeout") return { kind: "timeout", afterMs: timeoutMs };
      const meta: Meta = { provenance: r.provenance ?? transport.provenance, retrievedAt: now().toISOString(), rateLimit: rateLimitOf(r.headers) };
      return { res: r, meta };
    } catch (e) {
      if (ctl.signal.aborted) return { kind: "timeout", afterMs: timeoutMs };
      const detail = redactKey(e instanceof TransportError ? e.message : String((e as Error)?.message ?? e));
      return { kind: "unavailable", httpStatus: null, detail: `network error: ${detail}`.slice(0, 200) };
    } finally {
      clearTimeout(timer);
    }
  }

  /** HTTP status → outcome for everything that is not a 200. */
  function failureOf(res: FdcResponse, meta: Meta): FdcFailure | "not_found" | null {
    if (res.status === 200) return null;
    const code = errorCode(res.text);
    if (res.status === 429) {
      return { kind: "rate_limited", code, rateLimit: meta.rateLimit, retryAfterSeconds: int(res.headers["retry-after"]) };
    }
    if (res.status === 403 && code && /^API_KEY_/.test(code)) return { kind: "invalid_key", code };
    if (res.status === 404) return "not_found";
    return { kind: "unavailable", httpStatus: res.status, detail: code ? `HTTP ${res.status} ${code}` : `HTTP ${res.status}` };
  }

  function parse(text: string): { ok: true; json: unknown } | { ok: false } {
    try {
      return { ok: true, json: JSON.parse(text) };
    } catch {
      return { ok: false };
    }
  }

  function done<T extends SearchOutcome | DetailOutcome>(op: string, outcome: T, extra: Record<string, unknown> = {}): T {
    log({ at: "fdc", op, outcome: outcome.kind, ...extra });
    return outcome;
  }

  return {
    async search(query, o = {}) {
      const q = String(query ?? "").trim().slice(0, 120);
      if (!q) return { kind: "malformed", reason: "empty query" };
      const dataTypes = (o.dataTypes ?? [...DATA_TYPES]).filter((t) => (DATA_TYPES as readonly string[]).includes(t));
      const pageSize = Math.min(Math.max(Math.trunc(o.pageSize ?? 10), 1), 25);
      const sent = await send("search", { method: "POST", path: "/v1/foods/search", query: {}, body: { query: q, dataType: dataTypes, pageSize, pageNumber: 1 } });
      if (!("res" in sent)) return done("search", sent);
      const f = failureOf(sent.res, sent.meta);
      if (f === "not_found") return done("search", { kind: "no_matches", meta: sent.meta }, { httpStatus: 404 });
      if (f) return done("search", f, { httpStatus: sent.res.status, rateLimitRemaining: sent.meta.rateLimit.remaining });
      const p = parse(sent.res.text);
      if (!p.ok) return done("search", { kind: "malformed", reason: "response is not JSON" });
      const n = normalizeSearch(p.json);
      if (!n.ok) return done("search", { kind: "malformed", reason: n.reason });
      if (!n.value.items.length) return done("search", { kind: "no_matches", meta: sent.meta });
      return done("search", { kind: "ok", totalHits: n.value.totalHits, items: n.value.items, meta: sent.meta }, { rateLimitRemaining: sent.meta.rateLimit.remaining });
    },

    async detail(fdcId) {
      if (!Number.isInteger(fdcId) || fdcId <= 0) return { kind: "malformed", reason: "fdcId must be a positive integer" };
      const sent = await send("detail", { method: "GET", path: `/v1/food/${fdcId}`, query: { format: "full" } });
      if (!("res" in sent)) return done("detail", sent);
      const f = failureOf(sent.res, sent.meta);
      if (f === "not_found") return done("detail", { kind: "no_matches", meta: sent.meta }, { httpStatus: 404 });
      if (f) return done("detail", f, { httpStatus: sent.res.status, rateLimitRemaining: sent.meta.rateLimit.remaining });
      const p = parse(sent.res.text);
      if (!p.ok) return done("detail", { kind: "malformed", reason: "response is not JSON" });
      const n = normalizeFood(p.json, fdcId);
      if (!n.ok) return done("detail", { kind: "malformed", reason: n.reason });
      return done("detail", { kind: "ok", candidate: n.value, meta: sent.meta }, { rateLimitRemaining: sent.meta.rateLimit.remaining });
    },
  };
}

export { outcomeSentence } from "@/domain/nutrition/outcomes";

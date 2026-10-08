import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import zlib from "node:zlib";
import { isPublicAddress } from "./ip";
import { checkImportUrl } from "./url";

/**
 * Bounded, SSRF-safe retrieval of one recipe page. The fetcher validates the URL, resolves the
 * name itself, refuses unless every considered address is public, and pins the connection to the
 * first validated address; the transport never resolves names. Redirects are followed by hand and
 * re-validated (URL, then a fresh resolution) before any connection. Bodies are counted while
 * decompressing, so a compression bomb stops at the cap. No rendering, no scripts, no subresources.
 */

export type Resolver = (hostname: string) => Promise<string[]>;

export interface TransportRequest {
  ip: string; // connect here (pinned, validated)
  port: number;
  hostname: string; // TLS SNI and Host
  path: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}
export interface TransportResponse {
  status: number;
  headers: Record<string, string>;
  body: AsyncIterable<Uint8Array>;
}
export type Transport = (req: TransportRequest) => Promise<TransportResponse>;

export interface FetchLimits {
  timeoutMs: number; // whole operation: DNS, every hop, the body
  maxBytes: number; // decoded body
  maxCompressedBytes: number; // body as received
  maxRedirects: number;
  maxDnsAnswers: number; // answers considered; all of them must be public
}
export const DEFAULT_LIMITS: FetchLimits = { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxCompressedBytes: 2 * 1024 * 1024, maxRedirects: 3, maxDnsAnswers: 8 };
/** Process-wide cap on imports in flight; extra callers get `busy` rather than queueing. */
export const MAX_IN_FLIGHT = 2;

export type RefusedCode =
  | "invalid_url" | "unsupported_scheme" | "credentials_in_url" | "invalid_host" | "too_long" | "import_requires_https" | "nonstandard_port"
  | "private_address" | "no_public_address" | "redirect_refused";
export type FailedCode =
  | "busy" | "dns_failed" | "connect_failed" | "timeout" | "too_many_redirects" | "bad_redirect" | "http_status"
  | "unsupported_content_type" | "unsupported_charset" | "unsupported_encoding" | "bad_encoding" | "too_large";

export type FetchOutcome =
  | { kind: "ok"; finalUrl: string; contentType: string; text: string }
  | { kind: "refused"; code: RefusedCode; message: string }
  | { kind: "failed"; code: FailedCode; message: string; status?: number };

export const REQUEST_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "User-Agent": "TableRecipeImport/1.0 (private household recipe app; one page per request)",
  Accept: "text/html,application/xhtml+xml,application/ld+json;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
});

const ACCEPTED_TYPES = new Set(["text/html", "application/xhtml+xml", "application/ld+json", "application/json"]);
const ACCEPTED_CHARSETS = new Set(["utf-8", "utf8", "us-ascii"]);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

let inFlight = 0;

/** Starts a step only if time remains, and races it against the deadline. */
type Bounded = <T>(start: () => Promise<T>) => Promise<T>;

/** Ends the operation early with a typed outcome. */
class Stop extends Error {
  constructor(public outcome: Exclude<FetchOutcome, { kind: "ok" }>) {
    super(outcome.message);
  }
}
const fail = (code: FailedCode, message: string, status?: number) => new Stop(status === undefined ? { kind: "failed", code, message } : { kind: "failed", code, message, status });
const refuse = (code: RefusedCode, message: string) => new Stop({ kind: "refused", code, message });

export async function safeFetch(rawUrl: string, deps: { resolve: Resolver; transport: Transport; now?: () => number }, limits: Partial<FetchLimits> = {}): Promise<FetchOutcome> {
  const lim = { ...DEFAULT_LIMITS, ...limits };
  const first = checkImportUrl(rawUrl);
  if (!first.ok) return { kind: "refused", code: first.code, message: first.message };
  if (inFlight >= MAX_IN_FLIGHT) return { kind: "failed", code: "busy", message: "another import is in progress; try again in a moment" };
  inFlight++;
  const now = deps.now ?? Date.now;
  const deadline = now() + lim.timeoutMs;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), lim.timeoutMs);
  // Every step starts only before the deadline and races it, so a stalled resolver, transport or
  // body cannot hold us, and nothing new (no connection) starts once time is up.
  const aborted = new Promise<never>((_, reject) => ac.signal.addEventListener("abort", () => reject(fail("timeout", `no complete answer within ${lim.timeoutMs} ms`)), { once: true }));
  aborted.catch(() => {});
  const bounded: Bounded = (start) => {
    if (now() > deadline) ac.abort();
    if (ac.signal.aborted) return aborted;
    return Promise.race([start(), aborted]);
  };
  try {
    let url = new URL(first.url);
    for (let hop = 0; ; hop++) {
      const ip = await pinnedAddress(url.hostname, deps.resolve, lim, bounded);
      let res: TransportResponse;
      try {
        res = await bounded(() => deps.transport({ ip, port: 443, hostname: url.hostname, path: url.pathname + url.search, headers: { ...REQUEST_HEADERS }, signal: ac.signal }));
      } catch (e) {
        if (e instanceof Stop) throw e;
        throw fail("connect_failed", "the site could not be reached");
      }
      const headers = lowerKeys(res.headers);
      if (REDIRECTS.has(res.status)) {
        discard(res.body);
        if (hop >= lim.maxRedirects) throw fail("too_many_redirects", `more than ${lim.maxRedirects} redirects`);
        const loc = headers["location"];
        if (!loc) throw fail("bad_redirect", "the site redirected without a location");
        let next: string;
        try {
          next = new URL(loc, url).href;
        } catch {
          throw refuse("redirect_refused", "the site redirected to an invalid address");
        }
        const checked = checkImportUrl(next);
        if (!checked.ok) throw refuse("redirect_refused", `the site redirected to an address that is not allowed: ${checked.message}`);
        url = new URL(checked.url);
        continue;
      }
      if (res.status !== 200) {
        discard(res.body);
        throw fail("http_status", `the site answered with HTTP ${res.status}`, res.status);
      }
      const ct = parseContentType(headers["content-type"]);
      if (!ct || !ACCEPTED_TYPES.has(ct.type)) {
        discard(res.body);
        throw fail("unsupported_content_type", `not a web page (${ct?.type ?? "no content type"})`);
      }
      if (ct.charset !== null && !ACCEPTED_CHARSETS.has(ct.charset)) {
        discard(res.body);
        throw fail("unsupported_charset", `unsupported character set ${ct.charset}`);
      }
      const bytes = await readBody(res.body, (headers["content-encoding"] ?? "identity").trim().toLowerCase(), lim, bounded);
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return { kind: "ok", finalUrl: url.href, contentType: ct.type, text };
    }
  } catch (e) {
    if (e instanceof Stop) return e.outcome;
    if (ac.signal.aborted) return { kind: "failed", code: "timeout", message: `no complete answer within ${lim.timeoutMs} ms` };
    return { kind: "failed", code: "connect_failed", message: "the page could not be retrieved" };
  } finally {
    clearTimeout(timer);
    ac.abort();
    inFlight--;
  }
}

async function pinnedAddress(hostname: string, resolve: Resolver, lim: FetchLimits, bounded: Bounded): Promise<string> {
  let answers: unknown;
  try {
    answers = await bounded(() => resolve(hostname));
  } catch (e) {
    if (e instanceof Stop) throw e;
    throw fail("dns_failed", `${hostname} could not be resolved`);
  }
  const list = Array.isArray(answers) ? answers.slice(0, lim.maxDnsAnswers) : [];
  if (list.length === 0) throw refuse("no_public_address", `${hostname} has no address`);
  for (const a of list) {
    if (typeof a !== "string" || !isPublicAddress(a)) throw refuse("private_address", `${hostname} resolves to an address that is not public`);
  }
  return list[0] as string;
}

const lowerKeys = (h: Record<string, string>) => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h ?? {})) if (typeof v === "string") out[k.toLowerCase()] = v;
  return out;
};

function parseContentType(v: string | undefined): { type: string; charset: string | null } | null {
  if (!v) return null;
  const [type, ...params] = v.split(";").map((p) => p.trim().toLowerCase());
  if (!type) return null;
  let charset: string | null = null;
  for (const p of params) if (p.startsWith("charset=")) charset = p.slice(8).replace(/^["']|["']$/g, "").trim();
  return { type, charset };
}

/** Releases a body we will not read (fire and forget). */
function discard(body: AsyncIterable<Uint8Array>) {
  try {
    void Promise.resolve(body?.[Symbol.asyncIterator]?.().return?.()).catch(() => {});
  } catch {
    /* nothing to release */
  }
}

function decompressor(encoding: string): zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress | null {
  if (encoding === "gzip" || encoding === "x-gzip") return zlib.createGunzip();
  if (encoding === "deflate") return zlib.createInflate();
  if (encoding === "br") return zlib.createBrotliDecompress();
  if (encoding === "identity" || encoding === "") return null;
  throw fail("unsupported_encoding", `unsupported content encoding ${encoding}`);
}

/**
 * Reads the body, decompressing as it streams. Both the received and the decoded byte counts are
 * capped; exceeding either destroys the decompressor at once (it stops between output chunks).
 */
async function readBody(body: AsyncIterable<Uint8Array>, encoding: string, lim: FetchLimits, bounded: Bounded): Promise<Buffer> {
  const it = body[Symbol.asyncIterator]();
  let z: ReturnType<typeof decompressor> = null;
  const out: Buffer[] = [];
  let outLen = 0;
  let inLen = 0;
  let stopped: Stop | null = null;
  let wake: (e: Stop) => void = () => {};
  const failure = new Promise<never>((_, reject) => (wake = reject));
  failure.catch(() => {});
  const stop = (e: Stop) => {
    stopped ??= e;
    z?.destroy();
    wake(stopped);
  };
  const take = (c: Buffer) => {
    if (stopped) return;
    outLen += c.length;
    if (outLen > lim.maxBytes) stop(fail("too_large", `the page is larger than ${lim.maxBytes} bytes`));
    else out.push(c);
  };
  // Waits on one step, the deadline and a decoding failure; then surfaces any failure seen meanwhile.
  const wait = async <T>(start: () => Promise<T>): Promise<T> => {
    const v = await bounded(() => Promise.race([start(), failure]));
    if (stopped) throw stopped;
    return v;
  };
  try {
    z = decompressor(encoding);
    let ended: Promise<void> = Promise.resolve();
    if (z) {
      const zz = z;
      zz.on("data", take);
      zz.on("error", () => stop(fail("bad_encoding", "the page's compressed body is corrupt")));
      ended = new Promise((res) => zz.once("end", () => res()));
    }
    for (;;) {
      const r = await wait(() => it.next());
      if (r.done) break;
      const chunk = Buffer.from(r.value.buffer, r.value.byteOffset, r.value.byteLength);
      inLen += chunk.length;
      if (inLen > lim.maxCompressedBytes) throw fail("too_large", `the page is larger than ${lim.maxCompressedBytes} bytes as received`);
      if (!z) take(Buffer.from(chunk));
      else if (!z.write(chunk)) {
        const zz = z;
        await wait(() => new Promise<void>((res) => zz.once("drain", () => res())));
      }
      if (stopped) throw stopped;
    }
    if (z) {
      z.end();
      await wait(() => ended);
    }
    return Buffer.concat(out);
  } finally {
    z?.destroy();
    void Promise.resolve().then(() => it.return?.()).catch(() => {});
  }
}

// --- Production wiring (not exercised by tests: tests inject fakes) ----------------------------

/**
 * HTTPS over node:https. The socket connects to the pinned address only (`lookup` returns it and
 * nothing else), the certificate is verified against `hostname` (SNI + Host), no shared agent,
 * no redirects followed here, no proxy, no cookies. The response body streams to the fetcher.
 */
export function nodeTransport(): Transport {
  return (req) =>
    new Promise<TransportResponse>((resolve, reject) => {
      const family = isIP(req.ip);
      if (family === 0 || isIP(req.hostname) !== 0) return reject(new Error("transport needs a pinned address and a host name"));
      const pinned: LookupFunction = (_host, options, cb) => {
        if (options.all) cb(null, [{ address: req.ip, family }]);
        else cb(null, req.ip, family);
      };
      const r = https.request(
        {
          host: req.hostname,
          servername: req.hostname,
          port: req.port,
          path: req.path,
          method: "GET",
          headers: req.headers,
          lookup: pinned,
          family,
          agent: false,
          rejectUnauthorized: true,
          signal: req.signal,
          maxHeaderSize: 16 * 1024,
        },
        (res) => {
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (v === undefined || k === "set-cookie") continue;
            headers[k] = Array.isArray(v) ? v.join(", ") : v;
          }
          resolve({ status: res.statusCode ?? 0, headers, body: res });
        },
      );
      r.on("error", reject);
      r.end();
    });
}

/** The system resolver (getaddrinfo, including /etc/hosts); every answer is classified by the fetcher. */
export function systemResolver(): Resolver {
  return async (hostname) => (await lookup(hostname, { all: true, verbatim: true })).map((a) => a.address);
}

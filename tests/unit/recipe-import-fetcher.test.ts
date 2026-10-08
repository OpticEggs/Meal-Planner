/**
 * The import fetcher with an injected resolver and transport. Offline: no real DNS, no sockets.
 * Every SSRF refusal asserts that the transport was never invoked.
 */
import zlib from "node:zlib";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  MAX_IN_FLIGHT, REQUEST_HEADERS, safeFetch, type FetchOutcome, type Resolver, type Transport, type TransportRequest, type TransportResponse,
} from "@/server/integrations/recipe-import/fetcher";

beforeAll(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network access is forbidden in recipe-import tests");
  });
});

const PUBLIC = "93.184.215.14"; // any public literal; nothing connects to it
const PUBLIC2 = "2606:4700:4700::1111";

type Body = { iter: AsyncIterable<Uint8Array>; pulled: () => number; returned: () => boolean };
function body(chunks: (Uint8Array | string)[], opts: { hangAfter?: number } = {}): Body {
  let pulled = 0;
  let returned = false;
  const iter: AsyncIterable<Uint8Array> = {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (opts.hangAfter !== undefined && i >= opts.hangAfter) return new Promise<IteratorResult<Uint8Array>>(() => {});
          if (i >= chunks.length) return { done: true, value: undefined };
          pulled++;
          const c = chunks[i++];
          return { done: false, value: typeof c === "string" ? new TextEncoder().encode(c) : c };
        },
        async return() {
          returned = true;
          return { done: true, value: undefined };
        },
      };
    },
  };
  return { iter, pulled: () => pulled, returned: () => returned };
}

const page = (html: string, headers: Record<string, string> = { "content-type": "text/html; charset=utf-8" }, status = 200): TransportResponse => ({
  status, headers, body: body([html]).iter,
});
const redirect = (location: string | null, status = 302): TransportResponse => ({
  status, headers: location === null ? {} : { Location: location }, body: body([]).iter,
});

/** A scripted transport: answers by `hostname + path`, records every request. */
function scripted(routes: Record<string, TransportResponse | (() => TransportResponse | Promise<TransportResponse>)>) {
  const calls: TransportRequest[] = [];
  const transport: Transport = async (req) => {
    calls.push(req);
    const r = routes[req.hostname + req.path];
    if (!r) throw new Error(`unscripted ${req.hostname}${req.path}`);
    return typeof r === "function" ? r() : r;
  };
  return { transport, calls };
}
function resolverOf(map: Record<string, string[] | (() => string[])>) {
  const asked: string[] = [];
  const resolve: Resolver = async (h) => {
    asked.push(h);
    const v = map[h];
    if (!v) throw new Error("ENOTFOUND");
    return typeof v === "function" ? v() : v;
  };
  return { resolve, asked };
}
const neverTransport = () => {
  const t = vi.fn<Transport>(async () => {
    throw new Error("transport must not be called");
  });
  return t;
};
const codeOf = (o: FetchOutcome) => (o.kind === "ok" ? "ok" : `${o.kind}:${o.code}`);

describe("safeFetch success path and request shape", () => {
  it("pins the connection to the validated address and sends only the fixed headers", async () => {
    const { transport, calls } = scripted({ "recipes.example.com/soup?id=7": page("<html>synthetic</html>") });
    const { resolve } = resolverOf({ "recipes.example.com": [PUBLIC, PUBLIC2] });
    const out = await safeFetch("https://Recipes.Example.com/soup?id=7&utm_source=x&fbclid=y#frag", { resolve, transport });
    expect(out).toEqual({ kind: "ok", finalUrl: "https://recipes.example.com/soup?id=7", contentType: "text/html", text: "<html>synthetic</html>" });
    expect(calls).toHaveLength(1);
    const req = calls[0];
    expect(req.ip).toBe(PUBLIC);
    expect(req.port).toBe(443);
    expect(req.hostname).toBe("recipes.example.com");
    expect(req.path).toBe("/soup?id=7");
    expect(req.headers).toEqual({ ...REQUEST_HEADERS });
    const names = Object.keys(req.headers).map((k) => k.toLowerCase());
    expect(names.sort()).toEqual(["accept", "accept-encoding", "user-agent"]);
    for (const banned of ["cookie", "authorization", "proxy-authorization", "host", "referer", "x-forwarded-for"]) expect(names).not.toContain(banned);
    expect(req.signal).toBeInstanceOf(AbortSignal);
  });

  it("accepts the JSON content types and charset spellings", async () => {
    for (const ct of ["application/ld+json", "application/json; charset=UTF-8", "application/xhtml+xml", "TEXT/HTML", 'text/html; charset="utf-8"', "text/html;charset=us-ascii"]) {
      const { transport } = scripted({ "a.example.com/": page("{}", { "Content-Type": ct }) });
      const out = await safeFetch("https://a.example.com/", { resolve: resolverOf({ "a.example.com": [PUBLIC] }).resolve, transport });
      expect(codeOf(out), ct).toBe("ok");
    }
  });

  it("decodes malformed UTF-8 with replacement characters instead of failing", async () => {
    const { transport } = scripted({ "a.example.com/": { status: 200, headers: { "content-type": "text/html" }, body: body([new Uint8Array([0x61, 0xff, 0xfe, 0x62])]).iter } });
    const out = await safeFetch("https://a.example.com/", { resolve: resolverOf({ "a.example.com": [PUBLIC] }).resolve, transport });
    expect(out.kind === "ok" && out.text).toBe("a��b");
  });

  it("decodes gzip, deflate and brotli bodies", async () => {
    const html = "<html>synthetic ünïcode page</html>".repeat(50);
    const encoders: Record<string, (b: Buffer) => Buffer> = { gzip: zlib.gzipSync, deflate: zlib.deflateSync, br: zlib.brotliCompressSync, "x-gzip": zlib.gzipSync };
    for (const [enc, f] of Object.entries(encoders)) {
      const packed = f(Buffer.from(html));
      const chunks = [packed.subarray(0, 10), packed.subarray(10, 25), packed.subarray(25)];
      const { transport } = scripted({ "a.example.com/": { status: 200, headers: { "content-type": "text/html", "content-encoding": enc }, body: body(chunks).iter } });
      const out = await safeFetch("https://a.example.com/", { resolve: resolverOf({ "a.example.com": [PUBLIC] }).resolve, transport });
      expect(out.kind === "ok" && out.text, enc).toBe(html);
    }
  });
});

describe("safeFetch refusals before any connection", () => {
  it.each([
    ["http://example.com/r", "refused:import_requires_https"],
    ["https://example.com:8443/r", "refused:nonstandard_port"],
    ["https://localhost/r", "refused:invalid_host"],
    ["https://127.0.0.1/r", "refused:invalid_host"],
    ["https://[::1]/r", "refused:invalid_host"],
    ["https://u:p@example.com/r", "refused:credentials_in_url"],
    ["file:///etc/passwd", "refused:unsupported_scheme"],
    ["javascript:alert(1)", "refused:unsupported_scheme"],
  ])("%s → %s, with no resolution and no transport call", async (raw, expected) => {
    const transport = neverTransport();
    const resolve = vi.fn<Resolver>(async () => [PUBLIC]);
    expect(codeOf(await safeFetch(raw, { resolve, transport }))).toBe(expected);
    expect(resolve).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    [["127.0.0.1"], "refused:private_address"],
    [["10.0.0.5"], "refused:private_address"],
    [["169.254.169.254"], "refused:private_address"],
    [["::1"], "refused:private_address"],
    [["::ffff:192.168.0.1"], "refused:private_address"],
    [["64:ff9b::a9fe:a9fe"], "refused:private_address"],
    [["2002:0a00:0001::1"], "refused:private_address"],
    [["fe80::1%eth0"], "refused:private_address"],
    [[PUBLIC, "10.0.0.5"], "refused:private_address"],
    [["192.168.1.1", PUBLIC], "refused:private_address"],
    [[PUBLIC2, "fd00::1"], "refused:private_address"],
    [["not-an-ip"], "refused:private_address"],
    [[], "refused:no_public_address"],
  ])("resolution %j → %s and the transport is never invoked", async (answers, expected) => {
    const transport = neverTransport();
    const out = await safeFetch("https://recipes.example.com/x", { resolve: async () => answers, transport });
    expect(codeOf(out)).toBe(expected);
    expect(transport).not.toHaveBeenCalled();
  });

  it("a resolver failure is dns_failed, a non-array answer is no_public_address", async () => {
    const transport = neverTransport();
    expect(codeOf(await safeFetch("https://nope.example.com/", { resolve: async () => Promise.reject(new Error("ENOTFOUND")), transport }))).toBe("failed:dns_failed");
    expect(codeOf(await safeFetch("https://nope.example.com/", { resolve: async () => "1.1.1.1" as unknown as string[], transport }))).toBe("refused:no_public_address");
    expect(transport).not.toHaveBeenCalled();
  });

  it("considers at most maxDnsAnswers answers and pins the first", async () => {
    const answers = [...Array(8).fill(PUBLIC), "10.0.0.1"]; // the 9th is beyond the considered set
    const { transport, calls } = scripted({ "a.example.com/": page("ok") });
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve: async () => answers, transport }))).toBe("ok");
    expect(calls[0].ip).toBe(PUBLIC);
    const strict = await safeFetch("https://a.example.com/", { resolve: async () => answers, transport }, { maxDnsAnswers: 9 });
    expect(codeOf(strict)).toBe("refused:private_address");
    expect(calls).toHaveLength(1);
  });
});

describe("safeFetch redirects", () => {
  it("follows a relative redirect after re-validating and re-resolving it", async () => {
    const { transport, calls } = scripted({
      "a.example.com/old": redirect("/new?x=1#f", 301),
      "a.example.com/new?x=1": redirect("https://www.example.org/final", 308),
      "www.example.org/final": page("final"),
    });
    const { resolve, asked } = resolverOf({ "a.example.com": [PUBLIC], "www.example.org": [PUBLIC2] });
    const out = await safeFetch("https://a.example.com/old", { resolve, transport });
    expect(out).toMatchObject({ kind: "ok", finalUrl: "https://www.example.org/final", text: "final" });
    expect(asked).toEqual(["a.example.com", "a.example.com", "www.example.org"]);
    expect(calls.map((c) => c.ip)).toEqual([PUBLIC, PUBLIC, PUBLIC2]);
  });

  it("DNS rebinding: a redirect target that now resolves privately is refused before connecting", async () => {
    const { transport, calls } = scripted({ "a.example.com/": redirect("https://b.example.com/") });
    const out = await safeFetch("https://a.example.com/", { resolve: resolverOf({ "a.example.com": [PUBLIC], "b.example.com": ["10.0.0.5"] }).resolve, transport });
    expect(codeOf(out)).toBe("refused:private_address");
    expect(calls).toHaveLength(1);
  });

  it("DNS rebinding on the same host: every hop resolves again", async () => {
    let n = 0;
    const { transport, calls } = scripted({ "a.example.com/1": redirect("/2"), "a.example.com/2": page("never") });
    const out = await safeFetch("https://a.example.com/1", { resolve: resolverOf({ "a.example.com": () => (n++ === 0 ? [PUBLIC] : ["127.0.0.1"]) }).resolve, transport });
    expect(codeOf(out)).toBe("refused:private_address");
    expect(calls).toHaveLength(1);
  });

  it.each([
    ["http://a.example.com/plain", "downgrade to http"],
    ["https://localhost/admin", "local host"],
    ["https://169.254.169.254/latest/meta-data/", "metadata IP literal"],
    ["https://[::1]/", "IPv6 literal"],
    ["https://a.example.com:8443/", "nonstandard port"],
    ["https://user:pw@a.example.com/", "credentials"],
    ["javascript:alert(1)", "script scheme"],
    ["file:///etc/passwd", "file scheme"],
    ["https://exa mple.com/", "invalid URL"],
  ])("refuses a redirect to %s (%s) without connecting again", async (location) => {
    const { transport, calls } = scripted({ "a.example.com/": redirect(location) });
    const resolve = vi.fn<Resolver>(async () => [PUBLIC]);
    const out = await safeFetch("https://a.example.com/", { resolve, transport });
    expect(codeOf(out)).toBe("refused:redirect_refused");
    expect(calls).toHaveLength(1);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("follows at most 3 redirects; a loop ends as too_many_redirects", async () => {
    const chain = scripted({ "a.example.com/0": redirect("/1"), "a.example.com/1": redirect("/2"), "a.example.com/2": redirect("/3"), "a.example.com/3": page("made it") });
    const resolve = resolverOf({ "a.example.com": [PUBLIC] }).resolve;
    expect(codeOf(await safeFetch("https://a.example.com/0", { resolve, transport: chain.transport }))).toBe("ok");
    const tooLong = scripted({ "a.example.com/0": redirect("/1"), "a.example.com/1": redirect("/2"), "a.example.com/2": redirect("/3"), "a.example.com/3": redirect("/4") });
    expect(codeOf(await safeFetch("https://a.example.com/0", { resolve, transport: tooLong.transport }))).toBe("failed:too_many_redirects");
    expect(tooLong.calls).toHaveLength(4);
    const loop = scripted({ "a.example.com/a": redirect("/b"), "a.example.com/b": redirect("/a") });
    expect(codeOf(await safeFetch("https://a.example.com/a", { resolve, transport: loop.transport }))).toBe("failed:too_many_redirects");
    expect(loop.calls).toHaveLength(4);
  });

  it("a redirect without Location is bad_redirect; other 3xx are http_status", async () => {
    const resolve = resolverOf({ "a.example.com": [PUBLIC] }).resolve;
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve, transport: scripted({ "a.example.com/": redirect(null, 307) }).transport }))).toBe("failed:bad_redirect");
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve, transport: scripted({ "a.example.com/": page("", {}, 304) }).transport }))).toBe("failed:http_status");
  });
});

describe("safeFetch response limits", () => {
  const resolve = resolverOf({ "a.example.com": [PUBLIC] }).resolve;
  const one = (r: TransportResponse | (() => Promise<TransportResponse>)) => scripted({ "a.example.com/": r }).transport;

  it.each([404, 500, 403, 204, 206])("HTTP %i is failed:http_status with the status", async (status) => {
    const out = await safeFetch("https://a.example.com/", { resolve, transport: one(page("err", { "content-type": "text/html" }, status)) });
    expect(out).toMatchObject({ kind: "failed", code: "http_status", status });
  });

  it.each([
    ["image/png", "failed:unsupported_content_type"],
    ["application/octet-stream", "failed:unsupported_content_type"],
    ["text/plain", "failed:unsupported_content_type"],
    ["application/javascript", "failed:unsupported_content_type"],
    ["", "failed:unsupported_content_type"],
    ["text/html; charset=iso-8859-1", "failed:unsupported_charset"],
    ["text/html; charset=utf-16", "failed:unsupported_charset"],
  ])("content type %j → %s", async (ct, expected) => {
    const b = body(["x"]);
    const out = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: ct ? { "content-type": ct } : {}, body: b.iter }) });
    expect(codeOf(out)).toBe(expected);
    expect(b.pulled()).toBe(0);
  });

  it("an unknown or corrupt content encoding fails", async () => {
    const zstd = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: { "content-type": "text/html", "content-encoding": "zstd" }, body: body(["x"]).iter }) });
    expect(codeOf(zstd)).toBe("failed:unsupported_encoding");
    const corrupt = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: { "content-type": "text/html", "content-encoding": "gzip" }, body: body(["this is not gzip at all"]).iter }) });
    expect(codeOf(corrupt)).toBe("failed:bad_encoding");
  });

  it("stops reading a plain body at the cap", async () => {
    const b = body(Array.from({ length: 100 }, () => "x".repeat(100)));
    const out = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: { "content-type": "text/html" }, body: b.iter }) }, { maxBytes: 1000, maxCompressedBytes: 1_000_000 });
    expect(codeOf(out)).toBe("failed:too_large");
    expect(b.pulled()).toBeLessThanOrEqual(11);
    await new Promise((r) => setTimeout(r, 0));
    expect(b.returned()).toBe(true);
  });

  it("caps the compressed byte count too", async () => {
    const packed = zlib.gzipSync(Buffer.from(Array.from({ length: 5000 }, (_, i) => String(i * 7919)).join(",")));
    const chunks = Array.from({ length: Math.ceil(packed.length / 100) }, (_, i) => packed.subarray(i * 100, (i + 1) * 100));
    const b = body(chunks);
    const out = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: { "content-type": "text/html", "content-encoding": "gzip" }, body: b.iter }) }, { maxCompressedBytes: 500 });
    expect(codeOf(out)).toBe("failed:too_large");
    expect(b.pulled()).toBe(6);
  });

  it("a gzip bomb aborts at the decoded cap without inflating the rest", async () => {
    // 256 MiB of zeros compress to ~250 KiB; delivered in 1 KiB chunks (~250 of them).
    const gz = zlib.createGzip({ level: 9 });
    const parts: Buffer[] = [];
    gz.on("data", (c: Buffer) => parts.push(c));
    const done = new Promise((r) => gz.on("end", r));
    const mib = Buffer.alloc(1024 * 1024);
    for (let i = 0; i < 256; i++) gz.write(mib);
    gz.end();
    await done;
    const bomb = Buffer.concat(parts);
    const chunks = Array.from({ length: Math.ceil(bomb.length / 1024) }, (_, i) => bomb.subarray(i * 1024, (i + 1) * 1024));
    const b = body(chunks);
    // Count what the fetcher's decompressor actually inflates.
    let inflated = 0;
    const real = zlib.createGunzip;
    const spy = vi.spyOn(zlib, "createGunzip").mockImplementation((o) => {
      const z = real(o);
      z.on("data", (c: Buffer) => (inflated += c.length));
      return z;
    });
    const started = Date.now();
    const out = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: { "content-type": "text/html", "content-encoding": "gzip" }, body: b.iter }) });
    const created = spy.mock.calls.length;
    spy.mockRestore();
    expect(created).toBe(1);
    expect(codeOf(out)).toBe("failed:too_large");
    expect(out.kind === "failed" && out.message).toMatch(/2097152/);
    expect(inflated).toBeGreaterThan(2 * 1024 * 1024);
    expect(inflated).toBeLessThan(3 * 1024 * 1024); // stopped at the cap, not 256 MiB
    expect(b.pulled()).toBeLessThan(chunks.length / 2); // and stopped reading the stream
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("a brotli bomb aborts at the decoded cap", async () => {
    const bomb = zlib.brotliCompressSync(Buffer.alloc(64 * 1024 * 1024), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 1 } });
    const chunks = Array.from({ length: Math.ceil(bomb.length / 16) }, (_, i) => bomb.subarray(i * 16, (i + 1) * 16));
    const out = await safeFetch("https://a.example.com/", { resolve, transport: one({ status: 200, headers: { "content-type": "text/html", "content-encoding": "br" }, body: body(chunks).iter }) }, { maxBytes: 100_000 });
    expect(codeOf(out)).toBe("failed:too_large");
  });

  it("times out on a stalled body, a stalled transport and a stalled resolver", async () => {
    const stalledBody = body(["<html>"], { hangAfter: 1 });
    let seen: AbortSignal | null = null;
    const t0 = Date.now();
    const out = await safeFetch("https://a.example.com/", {
      resolve,
      transport: async (req) => {
        seen = req.signal;
        return { status: 200, headers: { "content-type": "text/html" }, body: stalledBody.iter };
      },
    }, { timeoutMs: 50 });
    expect(codeOf(out)).toBe("failed:timeout");
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(seen!.aborted).toBe(true);

    expect(codeOf(await safeFetch("https://a.example.com/", { resolve, transport: () => new Promise(() => {}) }, { timeoutMs: 50 }))).toBe("failed:timeout");
    const transport = neverTransport();
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve: () => new Promise(() => {}), transport }, { timeoutMs: 50 }))).toBe("failed:timeout");
    expect(transport).not.toHaveBeenCalled();
  });

  it("an injected clock past the deadline stops the operation before any connection", async () => {
    let t = 0;
    const transport = neverTransport();
    const out = await safeFetch("https://a.example.com/", {
      resolve: async (h) => {
        t += 20_000; // the resolver "took" 20 s
        return resolve(h);
      },
      transport,
      now: () => t,
    });
    expect(codeOf(out)).toBe("failed:timeout");
    expect(transport).not.toHaveBeenCalled();
  });

  it("a transport error is connect_failed", async () => {
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve, transport: async () => Promise.reject(new Error("ECONNREFUSED")) }))).toBe("failed:connect_failed");
  });
});

describe("safeFetch concurrency", () => {
  it(`allows ${MAX_IN_FLIGHT} imports in flight; the next caller is told busy without resolving`, async () => {
    const releases: (() => void)[] = [];
    const transport: Transport = () => new Promise((res) => releases.push(() => res(page("ok"))));
    const resolve = resolverOf({ "a.example.com": [PUBLIC] }).resolve;
    const running = Array.from({ length: MAX_IN_FLIGHT }, () => safeFetch("https://a.example.com/", { resolve, transport }));
    await vi.waitFor(() => expect(releases).toHaveLength(MAX_IN_FLIGHT));
    const extraResolve = vi.fn<Resolver>(async () => [PUBLIC]);
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve: extraResolve, transport }))).toBe("failed:busy");
    expect(extraResolve).not.toHaveBeenCalled();
    // refusals do not take a slot
    expect(codeOf(await safeFetch("http://a.example.com/", { resolve, transport }))).toBe("refused:import_requires_https");
    releases.forEach((r) => r());
    expect((await Promise.all(running)).map(codeOf)).toEqual(Array(MAX_IN_FLIGHT).fill("ok"));
    // slots are released, including after failures
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve: async () => ["10.0.0.1"], transport }))).toBe("refused:private_address");
    expect(codeOf(await safeFetch("https://a.example.com/", { resolve, transport: async () => page("again") }))).toBe("ok");
  });
});

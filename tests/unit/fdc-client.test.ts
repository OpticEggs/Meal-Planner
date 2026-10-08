/**
 * B7 FoodData Central adapter outcomes. Offline: global fetch is stubbed to throw, so any real
 * network attempt fails loudly; every test injects its transport.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFdcClient, fixtureTransport, httpTransport } from "@/server/integrations/fdc";
import type { FdcTransport } from "@/server/integrations/fdc/transport";
import { fdcApiKey, fdcStatus } from "@/server/env";

const FX = path.resolve(__dirname, "../fixtures/fdc");
const SECRET = "SECRET-test-key-0123456789";
let networkAttempts = 0;
const saved = { ...process.env };

beforeEach(() => {
  networkAttempts = 0;
  vi.stubGlobal("fetch", () => {
    networkAttempts++;
    throw new Error("network access attempted in an offline test");
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const k of ["TABLE_ENV", "TABLE_FDC_FIXTURES", "FDC_API_KEY", "TABLE_LOG"]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  expect(networkAttempts).toBe(0);
});

const fx = () => createFdcClient(fixtureTransport(FX), { now: () => new Date("2026-10-12T19:00:00Z"), timeoutMs: 200 });

describe("B7 adapter typed outcomes", () => {
  it("ok: search and detail through the labeled fetched-demo records, with provenance and rate-limit headers", async () => {
    const s = await fx().search("chicken breast raw", { dataTypes: ["Foundation", "SR Legacy"] });
    expect(s.kind).toBe("ok");
    if (s.kind !== "ok") return;
    expect(s.items).toHaveLength(5);
    expect(s.meta).toEqual({ provenance: "fixture_fetched_demo", retrievedAt: "2026-10-12T19:00:00.000Z", rateLimit: { limit: 10, remaining: 2 } });
    const d = await fx().detail(171077);
    expect(d.kind === "ok" && d.candidate.nutrients.energy.amount).toBe("120");
  });

  it("no_matches: an empty search, and a food id FDC does not have (404)", async () => {
    expect((await fx().search("nothing like this")).kind).toBe("no_matches");
    expect((await fx().detail(424242)).kind).toBe("no_matches");
  });

  it("not_configured: no key means nothing is attempted", async () => {
    const c = createFdcClient(null);
    expect(await c.search("chicken")).toEqual({ kind: "not_configured" });
    expect(await c.detail(171077)).toEqual({ kind: "not_configured" });
  });

  it("invalid_key: 403 API_KEY_INVALID / API_KEY_MISSING", async () => {
    expect(await fx().detail(9000099)).toEqual({ kind: "invalid_key", code: "API_KEY_INVALID" });
    expect(await fx().detail(9000096)).toEqual({ kind: "invalid_key", code: "API_KEY_MISSING" });
    expect(await fx().search("bad key")).toEqual({ kind: "invalid_key", code: "API_KEY_INVALID" });
  });

  it("rate_limited: the genuine 429 OVER_RATE_LIMIT record keeps its X-RateLimit values; no retry", async () => {
    const t = fixtureTransport(FX);
    const send = vi.spyOn(t, "send");
    const r = await createFdcClient(t).detail(2646170);
    expect(r).toEqual({ kind: "rate_limited", code: "OVER_RATE_LIMIT", rateLimit: { limit: 10, remaining: 0 }, retryAfterSeconds: 41848 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("timeout: the request is aborted after the bounded time, even if the transport ignores the signal", async () => {
    const t0 = Date.now();
    expect(await fx().search("slow lookup")).toEqual({ kind: "timeout", afterMs: 200 });
    const deaf: FdcTransport = { provenance: "fixture_synthetic", send: () => new Promise(() => {}) };
    expect(await createFdcClient(deaf, { timeoutMs: 100 }).detail(1)).toEqual({ kind: "timeout", afterMs: 100 });
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it("unavailable: 5xx and network failure", async () => {
    expect(await fx().search("server down")).toMatchObject({ kind: "unavailable", httpStatus: 503 });
    const broken: FdcTransport = { provenance: "fdc_api", send: async () => { throw new Error("ECONNRESET"); } };
    expect(await createFdcClient(broken).search("x")).toMatchObject({ kind: "unavailable", httpStatus: null });
  });

  it("malformed: a body that is not JSON, valid JSON in the wrong shape, and the wrong food", async () => {
    expect(await fx().detail(9000098)).toEqual({ kind: "malformed", reason: "response is not JSON" });
    expect((await fx().detail(9000097)).kind).toBe("malformed");
    const wrong: FdcTransport = { provenance: "fdc_api", send: async () => ({ status: 200, headers: {}, text: readFileSync(path.join(FX, "fetched-demo/r3-food-171077.json"), "utf8") }) };
    expect(await createFdcClient(wrong).detail(999)).toEqual({ kind: "malformed", reason: "asked for food 999, got 171077" });
  });
});

describe("B7 live transport: server-side key, documented request shapes, nothing leaks", () => {
  it("sends the key only as the api_key query parameter to api.nal.usda.gov/fdc", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(readFileSync(path.join(FX, url.includes("/food/") ? "fetched-demo/r3-food-171077.json" : "synthetic/search-none.json")), { status: 200, headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "998" } });
    }) as unknown as typeof fetch;
    const c = createFdcClient(httpTransport(SECRET, fake));
    const s = await c.search("chicken breast", { dataTypes: ["SR Legacy"] });
    const d = await c.detail(171077);
    expect(s.kind).toBe("no_matches");
    expect(d.kind === "ok" && d.meta).toMatchObject({ provenance: "fdc_api", rateLimit: { limit: 1000, remaining: 998 } });
    expect(seen[0].url).toBe(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${SECRET}`);
    expect(seen[0].init.method).toBe("POST");
    expect(JSON.parse(String(seen[0].init.body))).toEqual({ query: "chicken breast", dataType: ["SR Legacy"], pageSize: 10, pageNumber: 1 });
    expect(seen[1].url).toBe(`https://api.nal.usda.gov/fdc/v1/food/171077?format=full&api_key=${SECRET}`);
    expect(seen[1].init.method).toBe("GET");
    expect(JSON.stringify(d)).not.toContain(SECRET);
  });

  it("errors and logs never carry the key or a keyed URL", async () => {
    process.env.TABLE_LOG = "1";
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void lines.push(a.map(String).join(" ")));
    const failing = (async (url: string) => {
      throw new Error(`request to ${url} failed, reason: getaddrinfo ENOTFOUND`);
    }) as unknown as typeof fetch;
    const r = await createFdcClient(httpTransport(SECRET, failing)).detail(171077);
    expect(r.kind).toBe("unavailable");
    const text = JSON.stringify(r);
    expect(text).not.toContain(SECRET);
    expect(text).toContain("api_key=REDACTED");
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(l).not.toContain(SECRET);
      expect(l).not.toMatch(/api_key=(?!REDACTED)/);
    }
  });
});

describe("B7 configuration", () => {
  it("the fixture switch is test-only; a real key is ignored in the test environment", () => {
    process.env.TABLE_ENV = "production";
    process.env.TABLE_FDC_FIXTURES = "1";
    expect(() => fdcStatus()).toThrow(/test-only/);
    delete process.env.TABLE_FDC_FIXTURES;
    expect(fdcStatus()).toBe("not_configured");
    process.env.FDC_API_KEY = SECRET;
    expect(fdcStatus()).toBe("configured");
    expect(fdcApiKey()).toBe(SECRET);
    process.env.TABLE_ENV = "test";
    expect(fdcApiKey()).toBeNull();
    expect(fdcStatus()).toBe("not_configured");
    process.env.TABLE_FDC_FIXTURES = "1";
    expect(fdcStatus()).toBe("fixture");
    process.env.TABLE_FDC_FIXTURES = "yes";
    expect(() => fdcStatus()).toThrow(/must be 1/);
  });

  it("fetched-demo records are byte-for-byte what the manifest hashes; every fixture directory is labeled", () => {
    const m = JSON.parse(readFileSync(path.join(FX, "fetched-demo/manifest.json"), "utf8"));
    expect(m.access).toBe("DEMO_KEY, documentation access, not production validation");
    for (const r of m.records) {
      for (const f of [r.body, r.headers]) {
        expect(createHash("sha256").update(readFileSync(path.join(FX, "fetched-demo", f.file))).digest("hex"), f.file).toBe(f.sha256);
      }
    }
    for (const dir of ["fetched-demo", "official-example", "synthetic"]) {
      const man = JSON.parse(readFileSync(path.join(FX, dir, "manifest.json"), "utf8"));
      expect(man.label).toMatch(/^FIXTURE/);
      const listed = new Set<string>([...man.records.flatMap((r: any) => [r.file, r.body?.file, r.headers?.file]), m.requestsLog.file, "manifest.json"].filter(Boolean));
      for (const f of readdirSync(path.join(FX, dir))) expect(listed.has(f), `${dir}/${f} is not in its manifest`).toBe(true);
    }
    const routes = JSON.parse(readFileSync(path.join(FX, "routes.json"), "utf8"));
    for (const r of [...routes.search, ...routes.detail]) {
      if (!r.body) continue;
      const dir = r.body.split("/")[0];
      expect(r.provenance).toBe({ "fetched-demo": "fixture_fetched_demo", "official-example": "fixture_official_example", synthetic: "fixture_synthetic" }[dir as string]);
    }
  });

  it("no browser module can reach the key: client components never import server code", () => {
    const ui = path.resolve(__dirname, "../../src/ui");
    for (const f of readdirSync(ui)) {
      const src = readFileSync(path.join(ui, f), "utf8");
      expect(src, f).not.toMatch(/from "@\/server\/|from "\.\.\/server\/|FDC_API_KEY|api\.nal\.usda\.gov/);
    }
  });
});

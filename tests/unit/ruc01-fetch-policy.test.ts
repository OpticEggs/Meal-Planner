/**
 * RUC-01: the fetcher asks the source policy before EVERY request — the first address and each
 * redirect target — and before resolving the name, so a refused host gets neither a DNS lookup nor
 * a connection. Network safety is unchanged and still applies to every allowed hop.
 */
import { describe, expect, it } from "vitest";
import { safeFetch, type Transport, type TransportRequest } from "@/server/integrations/recipe-import/fetcher";
import { readRefusal } from "@/server/integrations/recipe-import/content-policy";

function fake(pages: Record<string, { status: number; headers?: Record<string, string>; body?: string }>) {
  const resolved: string[] = [];
  const requested: string[] = [];
  const resolve = async (h: string) => {
    resolved.push(h);
    return ["93.184.215.14"];
  };
  const transport: Transport = async (req: TransportRequest) => {
    requested.push(`${req.hostname}${req.path}`);
    const p = pages[`https://${req.hostname}${req.path}`] ?? { status: 404 };
    return { status: p.status, headers: p.headers ?? { "content-type": "text/html" }, body: (async function* () { yield new TextEncoder().encode(p.body ?? ""); })() };
  };
  return { resolve, transport, resolved, requested };
}

describe("RUC-01 source policy in the fetcher", () => {
  it("FP-01: a refused first address: no DNS lookup, no request", async () => {
    const f = fake({});
    const out = await safeFetch("https://www.budgetbytes.com/x", { ...f, allowHost: readRefusal });
    expect(out).toMatchObject({ kind: "refused", code: "source_blocked", host: "www.budgetbytes.com" });
    expect(f.resolved).toEqual([]);
    expect(f.requested).toEqual([]);
  });

  it("FP-02: a redirect to a refused host stops before resolving or requesting it", async () => {
    const f = fake({ "https://ok.example.com/r": { status: 302, headers: { location: "https://budgetbytes.com/recipe" } } });
    const out = await safeFetch("https://ok.example.com/r", { ...f, allowHost: readRefusal });
    expect(out).toMatchObject({ kind: "refused", code: "source_blocked", host: "budgetbytes.com" });
    expect(f.resolved).toEqual(["ok.example.com"]);
    expect(f.requested).toEqual(["ok.example.com/r"]);
  });

  it("FP-03: allowed redirects still pass every network-safety check (a private target is refused as before)", async () => {
    const f = fake({ "https://ok.example.com/r": { status: 302, headers: { location: "https://10.0.0.1/inside" } } });
    expect(await safeFetch("https://ok.example.com/r", { ...f, allowHost: readRefusal })).toMatchObject({ kind: "refused", code: "redirect_refused" });
    const g = fake({ "https://ok.example.com/a": { status: 301, headers: { location: "https://www.ok.example.com/b" } }, "https://www.ok.example.com/b": { status: 200, body: "<html></html>" } });
    expect(await safeFetch("https://ok.example.com/a", { ...g, allowHost: readRefusal })).toMatchObject({ kind: "ok", finalUrl: "https://www.ok.example.com/b" });
    expect(g.requested).toEqual(["ok.example.com/a", "www.ok.example.com/b"]);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import type { ProvenanceKind } from "@/domain/nutrition/fdc";
import type { FdcRequest, FdcResponse, FdcTransport } from "./transport";

/**
 * The labeled fixture transport (test only). Serves files under tests/fixtures/fdc according to
 * routes.json; every response carries its own provenance (fetched demo / official example /
 * synthetic), so nothing it returns can be stored or shown as live FDC data. Never touches the
 * network. Selected by TABLE_FDC_FIXTURES=1, which env.ts refuses outside TABLE_ENV=test.
 */

type Route = { status?: number; body?: string; headers?: string; behavior?: "hang"; provenance: ProvenanceKind };
type Routes = { search: (Route & { match: string })[]; detail: (Route & { fdcId: number })[] };

export function fixtureDir(): string {
  return path.join(process.cwd(), "tests", "fixtures", "fdc");
}

/** Parses a recorded curl header dump: the LAST response block (after any proxy CONNECT block). */
export function parseHeaderDump(text: string): Record<string, string> {
  const blocks = text.split(/\r?\n\r?\n/).map((b) => b.trim()).filter((b) => /^HTTP\//.test(b));
  const last = blocks[blocks.length - 1] ?? "";
  const out: Record<string, string> = {};
  for (const line of last.split(/\r?\n/).slice(1)) {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

export function fixtureTransport(dir = fixtureDir()): FdcTransport {
  const routes = JSON.parse(readFileSync(path.join(dir, "routes.json"), "utf8")) as Routes;
  const serve = (r: Route, signal: AbortSignal): Promise<FdcResponse> => {
    if (r.behavior === "hang") {
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    }
    return Promise.resolve({
      status: r.status ?? 200,
      headers: r.headers ? parseHeaderDump(readFileSync(path.join(dir, r.headers), "utf8")) : { "content-type": "application/json" },
      text: r.body ? readFileSync(path.join(dir, r.body), "utf8") : "",
      provenance: r.provenance,
    });
  };
  return {
    provenance: "fixture_synthetic",
    send(req: FdcRequest, signal: AbortSignal) {
      if (req.method === "POST" && req.path === "/v1/foods/search") {
        const q = String((req.body as { query?: string } | undefined)?.query ?? "").trim().toLowerCase();
        const r = routes.search.find((x) => new RegExp(x.match, "i").test(q))!;
        return serve(r, signal);
      }
      const m = /^\/v1\/food\/(\d+)$/.exec(req.path);
      if (req.method === "GET" && m) {
        const id = Number(m[1]);
        const r = routes.detail.find((x) => x.fdcId === id) ?? routes.detail.find((x) => x.fdcId === 0)!;
        return serve(r, signal);
      }
      return Promise.resolve({ status: 404, headers: {}, text: "", provenance: "fixture_synthetic" });
    },
  };
}

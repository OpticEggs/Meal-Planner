import type { ProvenanceKind } from "@/domain/nutrition/fdc";

/** The one FoodData Central base URL (OpenAPI spec 1.0.0 `servers`). */
export const FDC_BASE_URL = "https://api.nal.usda.gov/fdc";
/** What the history records as the source: the endpoint template, never the key. */
export const DETAIL_URL_TEMPLATE = `${FDC_BASE_URL}/v1/food/{fdcId}`;

export interface FdcRequest {
  method: "GET" | "POST";
  path: string; // e.g. /v1/foods/search, /v1/food/171077
  query: Record<string, string>;
  body?: unknown;
}

export interface FdcResponse {
  status: number;
  headers: Record<string, string>; // lower-cased names
  text: string;
  /** Set by a fixture transport: what kind of data this response is (never "fdc_api"). */
  provenance?: ProvenanceKind;
}

export interface FdcTransport {
  /** Provenance for responses that do not state their own. */
  provenance: ProvenanceKind;
  send(req: FdcRequest, signal: AbortSignal): Promise<FdcResponse>;
}

/** Removes any api_key query value (and the key itself, when known) from a string. */
export function redactKey(s: string, key?: string | null): string {
  let out = s.replace(/(api_key=)[^&\s"']*/gi, "$1REDACTED");
  if (key) out = out.split(key).join("REDACTED");
  return out;
}

export class TransportError extends Error {
  constructor(public reason: "network" | "aborted", message: string) {
    super(message);
  }
}

/**
 * The live transport: HTTPS to api.nal.usda.gov with the key as the `api_key` query parameter
 * (the spec's ApiKeyAuth scheme). Server-side only. Errors it raises never carry the key or the
 * keyed URL. No retries: one request per call.
 */
export function httpTransport(apiKey: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): FdcTransport {
  return {
    provenance: "fdc_api",
    async send(req, signal) {
      const url = new URL(FDC_BASE_URL + req.path);
      for (const [k, v] of Object.entries(req.query)) url.searchParams.set(k, v);
      url.searchParams.set("api_key", apiKey);
      let res: Response;
      try {
        res = await fetchImpl(url.toString(), {
          method: req.method,
          headers: req.body !== undefined ? { "content-type": "application/json", accept: "application/json" } : { accept: "application/json" },
          body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
          signal,
          cache: "no-store",
        });
      } catch (e) {
        if (signal.aborted) throw new TransportError("aborted", "request aborted");
        throw new TransportError("network", redactKey(String((e as Error)?.message ?? e), apiKey));
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      let text: string;
      try {
        text = await res.text();
      } catch (e) {
        if (signal.aborted) throw new TransportError("aborted", "request aborted");
        throw new TransportError("network", redactKey(String((e as Error)?.message ?? e), apiKey));
      }
      return { status: res.status, headers, text };
    },
  };
}

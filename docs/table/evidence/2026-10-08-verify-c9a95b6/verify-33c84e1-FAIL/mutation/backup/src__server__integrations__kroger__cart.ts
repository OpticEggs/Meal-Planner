import type { AddOutcome, CartItem } from "../retailer";
import { KROGER } from "./config";
import type { TransportResponse } from "./transport";

/**
 * PUT /v1/cart/add, built ONLY from the frozen batch lines, and the mapping of its result onto
 * Table's AddOutcome. The documented success is a batch-level 204 with no body: it is recorded as
 * an acknowledgment of the whole batch, never as per-line success, an order or a pickup reservation.
 */

export function cartAddBody(items: CartItem[], modality: string): string {
  return JSON.stringify({ items: items.map((i) => ({ upc: i.productRef, quantity: i.quantity, modality })) });
}

export function cartAddRequest(items: CartItem[], modality: string, accessToken: string) {
  return {
    method: "PUT" as const,
    url: `${KROGER.apiBase}/cart/add`,
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    body: cartAddBody(items, modality),
  };
}

const ACK_MEANING = "Kroger accepted the cart-add request for the whole batch. Not an order, not a pickup reservation, no per-line result.";
/** 4xx statuses Kroger documents for its public APIs (API Basics; cart add lists 400 and 401). */
const DEFINITE_REJECTIONS = new Set([400, 401, 403, 404, 409]);

/** Kroger's two documented error shapes ({errors:{code,reason}} and {error,error_description}),
 *  reduced to short non-secret text. */
function errorSummary(bodyText: string): { code: string | null; reason: string | null } | null {
  try {
    const j = JSON.parse(bodyText);
    const e = j?.errors ?? j;
    if (!e || typeof e !== "object") return null;
    const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, 200) : null);
    return { code: text(e.code ?? e.error), reason: text(e.reason ?? e.error_description) };
  } catch {
    return null;
  }
}

export function mapCartResponse(r: TransportResponse, ctx: { items: number; modality: { value: string; fixture: boolean } }): AddOutcome & { reauthorize?: boolean } {
  const base = { provider: "kroger", endpoint: "PUT /v1/cart/add", items: ctx.items, modality: ctx.modality.value, fixtureModality: ctx.modality.fixture };
  if (!Number.isInteger(r.status)) return { kind: "uncertain", evidence: { ...base, reason: "unreadable response" } };
  if (r.status === 204) {
    return { kind: "acknowledged", evidence: { ...base, httpStatus: 204, granularity: "batch", meaning: ACK_MEANING } };
  }
  if (r.status === 401) {
    return {
      kind: "failed", reauthorize: true,
      evidence: { ...base, httpStatus: 401, granularity: "batch", error: errorSummary(r.bodyText), reauthorizationRequired: true, retried: false },
    };
  }
  if (DEFINITE_REJECTIONS.has(r.status)) {
    return { kind: "failed", evidence: { ...base, httpStatus: r.status, granularity: "batch", error: errorSummary(r.bodyText) } };
  }
  // 5xx, an undocumented 2xx (anything but 204) or any other status: the store may or may not
  // have added the items. Uncertain, never replayed automatically.
  return { kind: "uncertain", evidence: { ...base, httpStatus: r.status, granularity: "batch", reason: r.status >= 500 ? "server error after the request was sent" : "undocumented response" } };
}

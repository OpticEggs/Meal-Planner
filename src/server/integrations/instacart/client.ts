import { createHash } from "node:crypto";
import { D } from "../../../domain/units";
import { instacartConfig, type InstacartCapability, type InstacartEnvironment } from "./config";
import type { Transport, TransportReply, TransportRequest } from "./transport";
import { instacartUnitFor, type TableUnit } from "./units";

export type { Transport, TransportReply, TransportRequest } from "./transport";
export { fetchTransport, recordingTransport, transportFor } from "./transport";
export type { TableUnit } from "./units";

/**
 * Instacart Developer Platform client (staged, fail-closed, transport-injected).
 *
 * Public docs this follows (read-only, 2026-10-08; no request has ever been sent to Instacart):
 *   https://docs.instacart.com/developer_platform_api/
 *   https://docs.instacart.com/developer_platform_api/api/overview/
 *   https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers/
 *   https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/
 *   https://docs.instacart.com/developer_platform_api/api/units_of_measurement/
 *   https://docs.instacart.com/developer_platform_api/errors
 *   https://docs.instacart.com/developer_platform_api/guide/tutorials/create_a_recipe_page (link host)
 *
 * What Table does with Instacart is PREPARE A LINK to a shopping list page on Instacart Marketplace.
 * It is never a cart write, never an order, never a store choice, a pickup slot, stock or a price:
 * the member opens the link, picks a store and adds items themselves. Hence `link_prepared`.
 */

export const DEFAULT_TIMEOUT_MS = 15_000;

export const ENDPOINTS = {
  retailers: { method: "GET", path: "/idp/v1/retailers" },
  productsLink: { method: "POST", path: "/idp/v1/products/products_link" },
} as const;

/** Hosts a returned products_link_url may have. The docs' only real example host is
 *  www.instacart.com ("https://www.instacart.com/store/recipes/..."); the create page itself uses
 *  example.com placeholders and states no domain. A development-server link on any other host is
 *  refused as untrusted until there is evidence for it. */
export const TRUSTED_LINK_HOSTS: readonly string[] = ["www.instacart.com"];

export interface InstacartDeps {
  transport: Transport;
  /** Defaults to process.env. */
  env?: Record<string, string | undefined>;
  now?: () => Date;
  timeoutMs?: number;
}

export type UnavailableReason = "config_refused" | "not_activated" | "not_configured";

export type FailureCode =
  | "bad_request" | "unauthorized" | "forbidden" | "not_found" | "request_timeout" | "rate_limited"
  | "client_error" | "server_error" | "unexpected_status" | "unexpected_redirect" | "malformed_response"
  | "timeout" | "network_error" | "untrusted_link";

/** Instacart's documented error body ({error:{message,code,errors?},meta:{key}}), shortened. */
export interface ProviderError {
  code: number | null;
  message: string | null;
  key: string | null;
  errorCount: number | null;
}

interface CallEvidence {
  provider: "instacart";
  endpoint: string;
  environment: InstacartEnvironment;
  /** Query string removed (postal code); never carries the API key. */
  url: string;
  httpStatus: number | null;
  at: string;
}

// --- shared plumbing ---------------------------------------------------------------------------

type Gate =
  | { open: true; apiKey: string; baseUrl: string; environment: InstacartEnvironment }
  | { open: false; outcome: { kind: "unavailable"; reason: UnavailableReason; detail: string } };

function gate(cap: InstacartCapability, deps: InstacartDeps): Gate {
  const c = instacartConfig(deps.env ?? process.env);
  const shut = (reason: UnavailableReason, detail: string): Gate => ({ open: false, outcome: { kind: "unavailable", reason, detail } });
  if (c.problems.length) return shut("config_refused", `Instacart is refused by its configuration (${c.problems.join(", ")}).`);
  if (!c.activated.has(cap)) return shut("not_activated", `The Instacart ${cap} capability is not activated (INSTACART_ACTIVATE).`);
  const missing = [!c.apiKey && "INSTACART_API_KEY", !c.environment && "INSTACART_ENV"].filter(Boolean);
  if (missing.length || !c.apiKey || !c.environment || !c.baseUrl) return shut("not_configured", `Instacart ${cap} is not configured (missing ${missing.join(", ")}).`);
  return { open: true, apiKey: c.apiKey, baseUrl: c.baseUrl, environment: c.environment };
}

function redactQuery(url: string): string {
  const i = url.indexOf("?");
  return i === -1 ? url : `${url.slice(0, i)}?[redacted]`;
}

function scrubKey(text: string, apiKey: string): string {
  return apiKey.length >= 4 ? text.split(apiKey).join("[redacted]") : text;
}

type Sent = { ok: true; reply: TransportReply } | { ok: false; kind: "timeout" | "network" };

/** Calls the transport exactly once. The timeout aborts the signal AND stops waiting, so a
 *  transport that ignores its signal still cannot hold the caller past the bound. */
async function send(deps: InstacartDeps, req: Omit<TransportRequest, "signal">): Promise<Sent> {
  const ac = new AbortController();
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ac.abort();
      reject(new Error("timeout"));
    }, timeoutMs);
  });
  try {
    const reply = await Promise.race([deps.transport({ ...req, signal: ac.signal }), timedOut]);
    return { ok: true, reply };
  } catch {
    return { ok: false, kind: ac.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

function headersFor(apiKey: string, method: "GET" | "POST"): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${apiKey}` };
  if (method === "POST") h["Content-Type"] = "application/json";
  return h;
}

function failureCodeFor(status: number): FailureCode {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 408) return "request_timeout";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "client_error";
  if (status >= 500 && status < 600) return "server_error";
  if (status >= 300 && status < 400) return "unexpected_redirect";
  return "unexpected_status";
}

export function parseProviderError(body: string, apiKey = ""): ProviderError | null {
  try {
    const j = JSON.parse(body) as { error?: { message?: unknown; code?: unknown; errors?: unknown }; meta?: { key?: unknown } };
    const e = j?.error;
    if (!e || typeof e !== "object") return null;
    const text = (v: unknown) => (typeof v === "string" ? scrubKey(v, apiKey).slice(0, 200) : null);
    return {
      code: typeof e.code === "number" && Number.isInteger(e.code) ? e.code : null,
      message: text(e.message),
      key: text(j.meta?.key),
      errorCount: Array.isArray(e.errors) ? e.errors.length : null,
    };
  } catch {
    return null;
  }
}

const nowIso = (deps: InstacartDeps) => (deps.now ? deps.now() : new Date()).toISOString();

// --- Nearby retailers --------------------------------------------------------------------------

/**
 * A retailer BRAND that Instacart says serves a postal code area. Per the docs, `retailer_key`
 * identifies the retailer as a whole organization, not a store. A RetailerBrand is NOT a store
 * location, a pickup slot, stock or a price, and carries no address.
 */
export interface RetailerBrand {
  key: string;
  name: string;
  /** Only an https URL; the docs' example value ("www.logoUrl.com") would be null. */
  logoUrl: string | null;
}

export type CountryCode = "US" | "CA";

export type NearbyRetailersOutcome =
  | { kind: "ok"; retailers: RetailerBrand[]; evidence: CallEvidence & { retailerCount: number; droppedEntries: number; meaning: string } }
  | { kind: "unavailable"; reason: UnavailableReason; detail: string }
  | { kind: "refused"; reason: "invalid_postal_code" | "invalid_country_code" }
  | { kind: "failed"; status?: number; code: FailureCode; providerError: ProviderError | null; evidence: CallEvidence };

const US_POSTAL = /^\d{5}(?:-\d{4})?$/;
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/;

/** Validated, normalized postal code, or null. US: 12345 or 12345-6789. CA: A1A 1A1 (sent upper
 *  case without the space; the docs do not state a format). */
export function normalizePostalCode(postalCode: string, countryCode: CountryCode): string | null {
  const p = typeof postalCode === "string" ? postalCode.trim() : "";
  if (countryCode === "US") return US_POSTAL.test(p) ? p : null;
  if (countryCode === "CA") return CA_POSTAL.test(p) ? p.toUpperCase().replace(" ", "") : null;
  return null;
}

const BRAND_MEANING = "Retailer brands Instacart lists for this postal code. Not store locations, pickup slots, stock or prices.";

function httpsUrlOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}

export async function nearbyRetailers(deps: InstacartDeps, input: { postalCode: string; countryCode: CountryCode }): Promise<NearbyRetailersOutcome> {
  const g = gate("retailers", deps);
  if (!g.open) return g.outcome;
  if (input.countryCode !== "US" && input.countryCode !== "CA") return { kind: "refused", reason: "invalid_country_code" };
  const postal = normalizePostalCode(input.postalCode, input.countryCode);
  if (!postal) return { kind: "refused", reason: "invalid_postal_code" };

  const url = `${g.baseUrl}${ENDPOINTS.retailers.path}?${new URLSearchParams({ postal_code: postal, country_code: input.countryCode })}`;
  const sent = await send(deps, { method: "GET", url, headers: headersFor(g.apiKey, "GET") });
  const ev = (httpStatus: number | null): CallEvidence => ({
    provider: "instacart", endpoint: `GET ${ENDPOINTS.retailers.path}`, environment: g.environment, url: redactQuery(url), httpStatus, at: nowIso(deps),
  });
  if (!sent.ok) return { kind: "failed", code: sent.kind === "timeout" ? "timeout" : "network_error", providerError: null, evidence: ev(null) };
  const r = sent.reply;
  if (r.status !== 200) {
    return { kind: "failed", status: r.status, code: failureCodeFor(r.status), providerError: parseProviderError(r.body, g.apiKey), evidence: ev(r.status) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.body);
  } catch {
    return { kind: "failed", status: 200, code: "malformed_response", providerError: null, evidence: ev(200) };
  }
  const list = (parsed as { retailers?: unknown })?.retailers;
  if (!Array.isArray(list)) return { kind: "failed", status: 200, code: "malformed_response", providerError: null, evidence: ev(200) };
  const retailers: RetailerBrand[] = [];
  let dropped = 0;
  for (const x of list as Record<string, unknown>[]) {
    const key = typeof x?.retailer_key === "string" && x.retailer_key.trim() ? x.retailer_key : null;
    const name = typeof x?.name === "string" && x.name.trim() ? x.name : null;
    if (!key || !name) {
      dropped++;
      continue;
    }
    // Only the three documented fields are read; nothing else (address, hours, slots) is carried.
    retailers.push({ key, name, logoUrl: httpsUrlOrNull(x.retailer_logo_url) });
  }
  return { kind: "ok", retailers, evidence: { ...ev(200), retailerCount: retailers.length, droppedEntries: dropped, meaning: BRAND_MEANING } };
}

// --- Shopping list link ------------------------------------------------------------------------

export interface ShoppingListLine {
  name: string;
  /** Exact decimal, e.g. "1.5". Never a float. */
  quantity: string;
  unit: TableUnit;
  displayText?: string;
}

export interface ShoppingListLinkInput {
  title: string;
  lines: ShoppingListLine[];
  /** https link back to the list in Table (`landing_page_configuration.partner_linkback_url`). */
  linkbackUrl?: string;
  /** Optional `expires_in` (days, 1..365 per the docs). Absent: per the docs a shopping_list link
   *  has no default expiry. */
  expiresInDays?: number;
}

export interface InputProblem {
  /** Line index, or null for a list-level problem. */
  line: number | null;
  field: "title" | "lines" | "name" | "quantity" | "unit" | "displayText" | "linkbackUrl" | "expiresInDays";
  reason: string;
}

/** A JSON number token written verbatim from a validated decimal string (no float round-trip). */
class DecimalLiteral {
  constructor(readonly text: string) {}
}

type Canon = string | number | boolean | DecimalLiteral | Canon[] | { [k: string]: Canon };

/** Canonical JSON: object keys sorted, no whitespace, decimals written verbatim. */
export function canonicalJson(v: Canon): string {
  if (v instanceof DecimalLiteral) return v.text;
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v === "object" && v !== null) {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(",")}}`;
  }
  if (typeof v === "number" && !Number.isSafeInteger(v)) throw new Error("canonicalJson: only integers may be plain numbers");
  return JSON.stringify(v);
}

const QUANTITY = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/;

export type PreparedPayload =
  | { ok: true; body: string; requestHash: string; lines: { name: string; quantity: string; instacartUnit: string }[] }
  | { ok: false; problems: InputProblem[] };

/**
 * Builds the exact POST body (canonical JSON) and its sha256, without the API key. Policy: if ANY
 * line is unsupported or invalid the WHOLE request is refused with every offending line listed —
 * a partial list would silently drop food the member reviewed.
 */
export function buildShoppingListPayload(input: ShoppingListLinkInput): PreparedPayload {
  const problems: InputProblem[] = [];
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) problems.push({ line: null, field: "title", reason: "A title is required." });
  if (!Array.isArray(input.lines) || input.lines.length === 0) problems.push({ line: null, field: "lines", reason: "At least one line is required." });

  const items: Canon[] = [];
  const preview: { name: string; quantity: string; instacartUnit: string }[] = [];
  (Array.isArray(input.lines) ? input.lines : []).forEach((l, i) => {
    const name = typeof l?.name === "string" ? l.name.trim() : "";
    if (!name) problems.push({ line: i, field: "name", reason: "A name is required." });
    let quantity: string | null = null;
    if (typeof l?.quantity !== "string" || !QUANTITY.test(l.quantity.trim())) {
      problems.push({ line: i, field: "quantity", reason: "Quantity must be an exact positive decimal string (at most 9 integer and 6 fractional digits)." });
    } else {
      const d = new D(l.quantity.trim());
      if (d.lte(0)) problems.push({ line: i, field: "quantity", reason: "Quantity must be greater than 0." });
      else quantity = d.toFixed();
    }
    const mapping = instacartUnitFor(l?.unit);
    if (!mapping.supported) problems.push({ line: i, field: "unit", reason: mapping.reason });
    let displayText: string | null = null;
    if (l?.displayText !== undefined) {
      displayText = typeof l.displayText === "string" ? l.displayText.trim() : "";
      if (!displayText) problems.push({ line: i, field: "displayText", reason: "displayText, when given, must not be empty." });
    }
    if (!name || !quantity || !mapping.supported) return;
    const item: { [k: string]: Canon } = {
      name,
      line_item_measurements: [{ quantity: new DecimalLiteral(quantity), unit: mapping.instacartUnit }],
    };
    if (displayText) item.display_text = displayText;
    items.push(item);
    preview.push({ name, quantity, instacartUnit: mapping.instacartUnit });
  });

  const payload: { [k: string]: Canon } = { title, link_type: "shopping_list", line_items: items };
  if (input.linkbackUrl !== undefined) {
    if (!httpsUrlOrNull(input.linkbackUrl)) problems.push({ line: null, field: "linkbackUrl", reason: "linkbackUrl must be an https URL." });
    else payload.landing_page_configuration = { partner_linkback_url: input.linkbackUrl };
  }
  if (input.expiresInDays !== undefined) {
    const n = input.expiresInDays;
    if (!Number.isInteger(n) || n < 1 || n > 365) problems.push({ line: null, field: "expiresInDays", reason: "expiresInDays must be an integer from 1 to 365." });
    else payload.expires_in = n;
  }
  if (problems.length) return { ok: false, problems };
  const body = canonicalJson(payload);
  return { ok: true, body, requestHash: createHash("sha256").update(body).digest("hex"), lines: preview };
}

export function isTrustedLink(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && TRUSTED_LINK_HOSTS.includes(u.hostname) && u.port === "" && !u.username && !u.password;
  } catch {
    return false;
  }
}

const LINK_MEANING =
  "Instacart prepared a shopping list page. Not a cart write, not an order: no store, pickup slot, stock or price was chosen or confirmed.";

type LinkEvidence = CallEvidence & { requestHash: string; lineCount: number };

export type ShoppingListLinkOutcome =
  | {
      kind: "link_prepared";
      url: string;
      /** Null unless expiresInDays was sent; then computed from Table's clock at request time
       *  (Instacart returns no expiry). */
      expiresAt: string | null;
      requestHash: string;
      evidence: LinkEvidence & { linkHost: string; meaning: string };
    }
  | { kind: "refused"; problems: InputProblem[] }
  | { kind: "failed"; status?: number; code: FailureCode; providerError: ProviderError | null; requestHash: string; evidence: LinkEvidence }
  | {
      kind: "uncertain";
      /** The list MAY have been created. Never retried automatically. */
      reason: "timeout" | "network_error" | "server_error" | "unexpected_redirect" | "undocumented_success_status" | "unreadable_success_body";
      status?: number;
      requestHash: string;
      evidence: LinkEvidence;
    }
  | { kind: "unavailable"; reason: UnavailableReason; detail: string };

export async function createShoppingListLink(deps: InstacartDeps, input: ShoppingListLinkInput): Promise<ShoppingListLinkOutcome> {
  const g = gate("list", deps);
  if (!g.open) return g.outcome;
  const prepared = buildShoppingListPayload(input);
  if (!prepared.ok) return { kind: "refused", problems: prepared.problems };

  const url = `${g.baseUrl}${ENDPOINTS.productsLink.path}`;
  const startedAt = deps.now ? deps.now() : new Date();
  const sent = await send(deps, { method: "POST", url, headers: headersFor(g.apiKey, "POST"), body: prepared.body });
  const requestHash = prepared.requestHash;
  const ev = (httpStatus: number | null): LinkEvidence => ({
    provider: "instacart", endpoint: `POST ${ENDPOINTS.productsLink.path}`, environment: g.environment, url: redactQuery(url), httpStatus,
    at: nowIso(deps), requestHash, lineCount: prepared.lines.length,
  });
  if (!sent.ok) return { kind: "uncertain", reason: sent.kind === "timeout" ? "timeout" : "network_error", requestHash, evidence: ev(null) };
  const r = sent.reply;
  if (r.status >= 400 && r.status < 500) {
    return { kind: "failed", status: r.status, code: failureCodeFor(r.status), providerError: parseProviderError(r.body, g.apiKey), requestHash, evidence: ev(r.status) };
  }
  if (r.status >= 500) return { kind: "uncertain", reason: "server_error", status: r.status, requestHash, evidence: ev(r.status) };
  if (r.status >= 300) return { kind: "uncertain", reason: "unexpected_redirect", status: r.status, requestHash, evidence: ev(r.status) };
  if (r.status !== 200) return { kind: "uncertain", reason: "undocumented_success_status", status: r.status, requestHash, evidence: ev(r.status) };
  let link: unknown;
  try {
    link = (JSON.parse(r.body) as { products_link_url?: unknown })?.products_link_url;
  } catch {
    link = undefined;
  }
  if (typeof link !== "string" || link.trim() === "") return { kind: "uncertain", reason: "unreadable_success_body", status: 200, requestHash, evidence: ev(200) };
  if (!isTrustedLink(link)) return { kind: "failed", status: 200, code: "untrusted_link", providerError: null, requestHash, evidence: ev(200) };
  const expiresAt = input.expiresInDays !== undefined ? new Date(startedAt.getTime() + input.expiresInDays * 86_400_000).toISOString() : null;
  return { kind: "link_prepared", url: link, expiresAt, requestHash, evidence: { ...ev(200), linkHost: new URL(link).hostname, meaning: LINK_MEANING } };
}

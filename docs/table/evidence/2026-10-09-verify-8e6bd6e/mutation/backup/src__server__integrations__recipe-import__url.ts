/**
 * Recipe link validation and normalization. Pure: no DNS, no network. Every input is hostile.
 *
 * Dedup key rule (one saved link per page):
 *   lowercase host without a leading `www.` + `:port` only when non-default
 *   + path without trailing slash (root stays `/`)
 *   + remaining query params, tracking params removed, sorted by name (stable), re-encoded.
 * The scheme and the fragment are ignored, so http/https and tracking variants of one page share a key.
 */

export const MAX_URL_LENGTH = 2048;

export type LinkErrorCode = "invalid_url" | "unsupported_scheme" | "credentials_in_url" | "invalid_host" | "too_long";
export type ImportErrorCode = LinkErrorCode | "import_requires_https" | "nonstandard_port";

export interface LinkOk {
  ok: true;
  url: string;
  key: string;
  domain: string;
  sourceLabel: string;
}
export type LinkCheck = LinkOk | { ok: false; code: LinkErrorCode; message: string };
export type ImportCheck = LinkOk | { ok: false; code: ImportErrorCode; message: string };

const TRACKING_EXACT = new Set([
  "fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "igshid", "_ga", "_gl", "yclid", "ref", "ref_src", "ck_subscriber_id", "epik", "si",
]);
export const isTrackingParam = (name: string) => {
  const n = name.toLowerCase();
  return n.startsWith("utm_") || TRACKING_EXACT.has(n);
};

// Names that never resolve to a public recipe site (special-use and private-network suffixes).
const BLOCKED_SUFFIXES = ["local", "localhost", "internal", "home.arpa", "arpa", "test", "invalid", "onion", "lan", "localdomain", "intranet", "corp", "home", "example"];

const SOURCE_LABELS: Record<string, string> = { "budgetbytes.com": "Budget Bytes" };

export const isBudgetBytes = (domain: string) => {
  const d = domain.trim().toLowerCase().replace(/^www\./, "");
  return d === "budgetbytes.com" || d.endsWith(".budgetbytes.com");
};

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

function hostProblem(host: string): string | null {
  if (host.length === 0) return "the link has no host";
  if (host.startsWith("[") || /^[0-9.]+$/.test(host)) return "links to an IP address are not accepted; use the site's name";
  if (host.length > 253) return "the host name is too long";
  const labels = host.split(".");
  if (labels.length < 2) return "the host is not a public domain name";
  if (!labels.every((l) => LABEL.test(l))) return "the host name contains invalid characters";
  if (!TLD.test(labels[labels.length - 1])) return "the host is not a public domain name";
  for (const s of BLOCKED_SUFFIXES) if (host === s || host.endsWith(`.${s}`)) return "the host is a local or reserved name";
  return null;
}

/** Splits a raw query string into its pairs without re-encoding them. */
const pairsOf = (search: string) => (search.startsWith("?") ? search.slice(1) : search).split("&").filter((p) => p.length > 0);
const pairName = (pair: string) => {
  const raw = pair.split("=")[0].replace(/\+/g, " ");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export function validateLinkUrl(raw: string): LinkCheck {
  if (typeof raw !== "string") return { ok: false, code: "invalid_url", message: "the link is not text" };
  const s = raw.trim();
  if (s.length === 0) return { ok: false, code: "invalid_url", message: "the link is empty" };
  if (s.length > MAX_URL_LENGTH) return { ok: false, code: "too_long", message: `links are limited to ${MAX_URL_LENGTH} characters` };
  // The URL parser silently drops controls, tabs and newlines; refuse them instead.
  if (/[\u0000-\u001f\u007f]/.test(s)) return { ok: false, code: "invalid_url", message: "the link contains control characters" };
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, code: "invalid_url", message: "this is not a complete web address (it should start with https://)" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, code: "unsupported_scheme", message: "only http and https links are accepted" };
  if (u.username !== "" || u.password !== "") return { ok: false, code: "credentials_in_url", message: "links containing a user name or password are not accepted" };
  let host = u.hostname.toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1); // one trailing root dot is the same name
  const problem = hostProblem(host);
  if (problem) return { ok: false, code: "invalid_host", message: problem };
  u.hostname = host;
  u.hash = "";
  const kept = pairsOf(u.search).filter((p) => !isTrackingParam(pairName(p)));
  u.search = kept.length ? `?${kept.join("&")}` : "";
  const url = u.href;
  if (url.length > MAX_URL_LENGTH) return { ok: false, code: "too_long", message: `links are limited to ${MAX_URL_LENGTH} characters` };

  const domain = host.replace(/^www\./, "");
  let path = u.pathname;
  while (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  const params = new URLSearchParams(kept.join("&"));
  params.sort();
  const query = params.toString();
  const key = `${domain}${u.port ? `:${u.port}` : ""}${path}${query ? `?${query}` : ""}`;
  return { ok: true, url, key, domain, sourceLabel: SOURCE_LABELS[domain] ?? domain };
}

/** Stricter check for URLs the server will fetch: https on the default port only. */
export function checkImportUrl(raw: string): ImportCheck {
  const r = validateLinkUrl(raw);
  if (!r.ok) return r;
  const u = new URL(r.url);
  if (u.protocol !== "https:") return { ok: false, code: "import_requires_https", message: "recipes are only imported over https" };
  if (u.port !== "") return { ok: false, code: "nonstandard_port", message: "recipes are only imported from the standard https port" };
  return r;
}

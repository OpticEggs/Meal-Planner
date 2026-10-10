import { KROGER_CAPABILITIES, krogerActivation, krogerEnv, krogerFakeTransportEnabled, retailerMode, type KrogerCapability } from "../../env";
import { parseTokenKey } from "./crypto";

/**
 * Kroger configuration and the per-capability status legend:
 *   documented · implemented · fixture-tested · live-verified
 * Nothing here is live-verified, and `status()` never claims it.
 */

export const KROGER = {
  apiBase: "https://api.kroger.com/v1",
  authorizeUrl: "https://api.kroger.com/v1/connect/oauth2/authorize",
  tokenUrl: "https://api.kroger.com/v1/connect/oauth2/token",
} as const;

/** `modality` for PUT /v1/cart/add: values and requiredness are not in Kroger's public docs
 *  (2026-10-08). No value is guessed: the cart capability cannot become ready until a later,
 *  evidence-backed change sets this. */
export const DOCUMENTED_CART_MODALITY: string | null = null;

/** Test-only placeholder used with the recording fake. It is NOT a Kroger value. */
export const FIXTURE_MODALITY = "FIXTURE_MODALITY_NOT_A_KROGER_VALUE";

export function cartModality(): { settled: true; value: string; fixture: boolean } | { settled: false } {
  if (DOCUMENTED_CART_MODALITY) return { settled: true, value: DOCUMENTED_CART_MODALITY, fixture: false };
  if (krogerFakeTransportEnabled()) return { settled: true, value: FIXTURE_MODALITY, fixture: true }; // test-only (throws elsewhere)
  return { settled: false };
}

export type Legend = "documented" | "implemented" | "fixture-tested" | "live-verified";

export interface CapabilityStatus {
  capability: KrogerCapability;
  /** Highest level this build can honestly claim. Never "live-verified". */
  evidence: Exclude<Legend, "live-verified">;
  liveVerified: false;
  activated: boolean;
  configComplete: boolean;
  missing: string[];
  unsettled: string[];
  ready: boolean;
  reason: string;
}

const LEGACY_REQUIRED = [
  ["KROGER_CLIENT_ID", "clientId"],
  ["KROGER_CLIENT_SECRET", "clientSecret"],
  ["KROGER_REDIRECT_URI", "redirectUri"],
  ["KROGER_LOCATION_ID", "locationId"],
] as const;

export function krogerConfig() {
  const e = krogerEnv();
  let key: Buffer | null = null;
  let keyError: string | null = null;
  try {
    key = parseTokenKey(e.tokenKey);
  } catch (err) {
    keyError = (err as Error).message;
  }
  return { ...e, key, keyError };
}

function missingFor(cap: KrogerCapability, c: ReturnType<typeof krogerConfig>): string[] {
  const m: string[] = [];
  if (!c.clientId) m.push("KROGER_CLIENT_ID");
  if (!c.clientSecret) m.push("KROGER_CLIENT_SECRET");
  if (cap === "connect" || cap === "cart") {
    if (!c.redirectUri) m.push("KROGER_REDIRECT_URI");
    if (!c.key) m.push(c.keyError ? "TABLE_TOKEN_KEY (invalid)" : "TABLE_TOKEN_KEY");
    if (!c.customerScopes) m.push("KROGER_CUSTOMER_SCOPES");
  }
  if (cap === "products" && !c.productScopes) m.push("KROGER_PRODUCT_SCOPES");
  if (cap === "cart" && !c.locationId) m.push("KROGER_LOCATION_ID");
  return m;
}

const UNSETTLED: Record<KrogerCapability, string[]> = {
  connect: [
    "Kroger's docs do not mention `state`; Table requires it back on the callback (refused if absent)",
    "Basic auth on refresh is shown in the refresh tutorial but omitted on the customer page",
    "scope names for Table's registered app (owner-supplied KROGER_CUSTOMER_SCOPES)",
  ],
  products: [
    "scope names for Table's registered app (owner-supplied KROGER_PRODUCT_SCOPES)",
    "locations lookup scope is not documented (owner-supplied KROGER_LOCATION_SCOPES)",
    "soldBy values and price currency are not documented",
  ],
  cart: ["`modality` values and requiredness for PUT /v1/cart/add are not publicly documented"],
};

export function capabilityStatus(cap: KrogerCapability): CapabilityStatus {
  const active = retailerMode() === "kroger" ? krogerActivation() : new Set<KrogerCapability>();
  const c = krogerConfig();
  const missing = missingFor(cap, c);
  const unsettled = [...UNSETTLED[cap]];
  const base = { capability: cap, evidence: "fixture-tested" as const, liveVerified: false as const, activated: active.has(cap), configComplete: missing.length === 0, missing, unsettled };
  const no = (reason: string): CapabilityStatus => ({ ...base, ready: false, reason });
  if (retailerMode() !== "kroger") return no("The active retailer is the simulated recording fake; Kroger is not in use.");
  if (!active.has(cap)) return no(`The Kroger ${cap} capability is not activated (KROGER_ACTIVATE).`);
  if (missing.length) return no(`Kroger ${cap} is not configured (missing ${missing.join(", ")}).`);
  if (cap === "cart") {
    if (!active.has("connect")) return no("Kroger cart transfer needs the connect capability activated too (it uses the household's authorization).");
    const m = cartModality();
    if (!m.settled) return no("Kroger cart transfer is not verified: the `modality` value for cart add is not publicly documented.");
  }
  return { ...base, ready: true, reason: `Kroger ${cap} is activated and configured (not live-verified).` };
}

export function krogerStatusReport() {
  return {
    retailer: retailerMode(),
    liveVerified: false as const,
    capabilities: KROGER_CAPABILITIES.map((c) => capabilityStatus(c)),
  };
}

/** Global part of cart handoff readiness, keeping the long-standing wording of the fail-closed
 *  gate. Household connection and store location are checked per household (adapter.ts). */
export function cartGlobalStatus(): { ready: boolean; reason: string } {
  const e = krogerEnv();
  const legacyMissing = LEGACY_REQUIRED.filter(([, k]) => !e[k]).map(([n]) => n);
  if (legacyMissing.length) return { ready: false, reason: `Kroger is not configured (missing ${legacyMissing.join(", ")}). No transfer is possible.` };
  const s = capabilityStatus("cart");
  if (!s.ready) return { ready: false, reason: `Kroger cart transfer is not verified or authorized yet (Stage 5). ${s.reason} No transfer is possible.` };
  return { ready: true, reason: "Kroger cart transfer is activated (not live-verified). A household needs a valid Kroger connection and a store location; checked when sending." };
}

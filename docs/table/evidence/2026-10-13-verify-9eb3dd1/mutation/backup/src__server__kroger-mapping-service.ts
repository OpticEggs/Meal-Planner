import { pool } from "./db/pool";
import type { Actor } from "./commands/framework";
import { chooseKrogerProductCommand, type VerifiedKrogerProduct } from "./commands/groceries";
import { searchKrogerProducts } from "./integrations/kroger/adapter";
import { capabilityStatus, krogerConfig } from "./integrations/kroger/config";
import { saleBasis, type ProductCandidate, type SaleBasis } from "./integrations/kroger/products";
import { retailerMode } from "./env";

/**
 * Ingredient → actual Kroger product. Searching and choosing need the Kroger `products` capability
 * (KROGER_ACTIVATE, owner gates K1–K5) and the household's store; neither reads or writes the
 * household's Kroger account, and nothing here touches a cart (cart writes stay behind the separate
 * `cart` capability and purchase approval). A choice is re-read from Kroger by product id on the
 * server before it is recorded, so a client can't supply a product, size or price.
 */

export type MappingRefusal = { ok: false; code: "not_kroger" | "not_activated" | "not_configured" | "no_location" | "invalid" | "failed" | "not_found"; reason: string };

export interface CandidateView {
  productId: string;
  upc: string | null;
  description: string | null;
  brand: string | null;
  sizeText: string | null;
  soldBy: string | null;
  /** Package size Table read from Kroger's size text; null = the member must state it when choosing. */
  package: { quantity: string; unit: string } | null;
  regularMinor: number | null;
  promoMinor: number | null;
  pickup: boolean | null;
  stockLevel: string | null;
  /** What Kroger's price covers (RUC-02): only "unit" products can be chosen. */
  basis: SaleBasis;
  /** False when Kroger gave no UPC (it can't be named in a cart) or the product isn't sold by the unit. */
  choosable: boolean;
  /** Why it can't be chosen, in words; null when it can. */
  notChoosable: string | null;
}

const view = (c: ProductCandidate): CandidateView => {
  const basis = saleBasis(c.soldBy);
  const notChoosable = !c.upc || !/^\d{8,14}$/.test(c.upc)
    ? "Kroger gave no UPC for this product, so it can't go into a cart."
    : basis === "weight" ? "Sold by weight — Table can't price weight-sold items yet."
      : basis === "unknown" ? "Kroger doesn't say this is sold by the unit, so its price basis is unknown." : null;
  return {
    productId: c.productId, upc: c.upc, description: c.description, brand: c.brand, sizeText: c.sizeText, soldBy: c.soldBy,
    package: basis === "unit" ? c.package : null,
    regularMinor: c.price?.regularMinor ?? null, promoMinor: c.price?.promoMinor ?? null, pickup: c.fulfillment?.curbside ?? null,
    stockLevel: c.stockLevel, basis, choosable: notChoosable === null, notChoosable,
  };
};

/** Whether matching can run for this household, and at which store. Makes no request. */
export async function krogerMatching(householdId: string): Promise<{ ok: true; locationId: string } | MappingRefusal> {
  if (retailerMode() !== "kroger") return { ok: false, code: "not_kroger", reason: "The household's store is the simulated retailer here; Kroger product matching is used when the store is Kroger." };
  const st = capabilityStatus("products");
  if (!st.ready) return { ok: false, code: st.activated ? "not_configured" : "not_activated", reason: st.reason };
  const row = (await pool().query("SELECT location_id FROM kroger_connections WHERE household_id=$1", [householdId])).rows[0];
  const locationId: string | null = row?.location_id ?? krogerConfig().locationId ?? null;
  if (!locationId) return { ok: false, code: "no_location", reason: "Choose your Kroger store first (Household → Kroger), so products, prices and pickup availability are for that store." };
  return { ok: true, locationId };
}

const cleanTerm = (t: unknown) => (typeof t === "string" ? t.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) : "");

export async function searchKrogerForIngredient(actor: Actor, p: { term: string; limit?: number }): Promise<{ ok: true; locationId: string; candidates: CandidateView[] } | MappingRefusal> {
  const term = cleanTerm(p.term);
  if (term.length < 2) return { ok: false, code: "invalid", reason: "Type what to search for (at least 2 letters)." };
  const m = await krogerMatching(actor.householdId);
  if (!m.ok) return m;
  const r = await searchKrogerProducts({ term, locationId: m.locationId, limit: Math.min(Math.max(p.limit ?? 8, 1), 20) });
  if (!r.ok) return { ok: false, code: r.code, reason: r.reason };
  return { ok: true, locationId: m.locationId, candidates: r.candidates.map(view) };
}

export const MAX_MATCH_LINES = 12;

/** Suggestions for several grocery lines at once (searched one at a time, capped). The member still chooses each. */
export async function matchKrogerLines(actor: Actor, p: { lines: { key: string; term: string }[] }) {
  const lines = (Array.isArray(p.lines) ? p.lines : []).filter((l) => typeof l?.key === "string" && cleanTerm(l.term)).slice(0, MAX_MATCH_LINES);
  if (!lines.length) return { ok: false as const, code: "invalid" as const, reason: "No grocery lines to match." };
  const m = await krogerMatching(actor.householdId);
  if (!m.ok) return m;
  const out: { key: string; term: string; ok: boolean; reason?: string; candidates: CandidateView[] }[] = [];
  for (const l of lines) {
    const r = await searchKrogerProducts({ term: cleanTerm(l.term), locationId: m.locationId, limit: 5 });
    out.push(r.ok ? { key: l.key, term: cleanTerm(l.term), ok: true, candidates: r.candidates.map(view) } : { key: l.key, term: cleanTerm(l.term), ok: false, reason: r.reason, candidates: [] });
  }
  return { ok: true as const, locationId: m.locationId, lines: out, capped: (p.lines?.length ?? 0) > MAX_MATCH_LINES };
}

/** Re-reads the chosen product from Kroger (by id, at the household's store), then records the choice. */
export async function chooseKrogerProduct(
  actor: Actor, operationId: string,
  p: { weekId: string; ingredientKey: string; productId: string; expectedProductId?: string | null; packageQty?: string | null; packageUnit?: string | null },
) {
  if (typeof p.productId !== "string" || !/^[0-9A-Za-z]{1,20}$/.test(p.productId)) return { status: "rejected" as const, code: "invalid", message: "Unknown Kroger product" };
  const m = await krogerMatching(actor.householdId);
  if (!m.ok) return { status: "rejected" as const, code: m.code, message: m.reason };
  const r = await searchKrogerProducts({ productIds: [p.productId], locationId: m.locationId, limit: 5 });
  if (!r.ok) return { status: "rejected" as const, code: r.code, message: r.reason };
  const c = r.candidates.find((x) => x.productId === p.productId);
  if (!c) return { status: "rejected" as const, code: "not_found", message: "Kroger no longer lists that product at your store. Search again." };
  const product: VerifiedKrogerProduct = {
    productId: c.productId, upc: c.upc, description: c.description, brand: c.brand, sizeText: c.sizeText, soldBy: c.soldBy, package: c.package,
    locationId: c.locationId, price: c.price ? { regularMinor: c.price.regularMinor, promoMinor: c.price.promoMinor } : null,
  };
  return chooseKrogerProductCommand(actor, operationId, {
    weekId: p.weekId, ingredientKey: p.ingredientKey, expectedProductId: p.expectedProductId, product, packageQty: p.packageQty ?? null, packageUnit: p.packageUnit ?? null,
  });
}

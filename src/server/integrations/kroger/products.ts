import Decimal from "decimal.js";

/**
 * Pure mapping of documented Products / Locations response shapes into candidates.
 * Unknown is never zero: a price, package size, fulfillment flag or stock level that is absent or
 * ambiguous stays null. Price, fulfillment and stock are only meaningful with a locationId
 * (Kroger returns them only when `filter.locationId` is sent), so without one they are null.
 * Descriptions and brands are passed through verbatim (Kroger acceptable-use policy).
 */

export type StockLevel = "HIGH" | "LOW" | "TEMPORARILY_OUT_OF_STOCK";
const STOCK: readonly string[] = ["HIGH", "LOW", "TEMPORARILY_OUT_OF_STOCK"];

export interface PackageQuantity {
  quantity: string; // exact decimal
  unit: string; // Table unit vocabulary (src/domain/units.ts): g, kg, lb, ml, l, fl_oz, each
}

export interface ProductCandidate {
  productId: string;
  upc: string | null;
  itemId: string | null;
  description: string | null;
  brand: string | null;
  sizeText: string | null;
  package: PackageQuantity | null; // only when the size text is unambiguous
  soldBy: string | null; // verbatim; values are not documented
  locationId: string | null;
  price: { regularMinor: number | null; promoMinor: number | null; currency: "USD"; currencyAssumed: true } | null;
  fulfillment: { instore: boolean | null; curbside: boolean | null; delivery: boolean | null; shiptohome: boolean | null } | null;
  stockLevel: StockLevel | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

/** Decimal dollars -> integer cents, only for a finite positive amount with at most 2 decimals. */
export function dollarsToMinor(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  const d = new Decimal(String(v));
  if (d.decimalPlaces() > 2) return null;
  return d.mul(100).toNumber();
}

// Units Table understands (src/domain/units.ts). US liquid gallon/quart/pint convert exactly to ml.
// A bare "oz" is AMBIGUOUS on retailer labels (net weight or fluid ounces) and is not parsed.
const UNIT_ALIASES: Record<string, { unit: string; factor: string }> = {
  "fl oz": { unit: "fl_oz", factor: "1" }, "fl. oz": { unit: "fl_oz", factor: "1" }, "fl oz.": { unit: "fl_oz", factor: "1" },
  floz: { unit: "fl_oz", factor: "1" }, "fluid ounce": { unit: "fl_oz", factor: "1" }, "fluid ounces": { unit: "fl_oz", factor: "1" },
  lb: { unit: "lb", factor: "1" }, lbs: { unit: "lb", factor: "1" }, pound: { unit: "lb", factor: "1" }, pounds: { unit: "lb", factor: "1" },
  g: { unit: "g", factor: "1" }, gram: { unit: "g", factor: "1" }, grams: { unit: "g", factor: "1" },
  kg: { unit: "kg", factor: "1" }, ml: { unit: "ml", factor: "1" },
  l: { unit: "l", factor: "1" }, liter: { unit: "l", factor: "1" }, liters: { unit: "l", factor: "1" }, litre: { unit: "l", factor: "1" },
  gal: { unit: "ml", factor: "3785.411784" }, gallon: { unit: "ml", factor: "3785.411784" }, gallons: { unit: "ml", factor: "3785.411784" },
  qt: { unit: "ml", factor: "946.352946" }, quart: { unit: "ml", factor: "946.352946" }, quarts: { unit: "ml", factor: "946.352946" },
  pt: { unit: "ml", factor: "473.176473" }, pint: { unit: "ml", factor: "473.176473" }, pints: { unit: "ml", factor: "473.176473" },
  ct: { unit: "each", factor: "1" }, count: { unit: "each", factor: "1" },
};

/**
 * "1 gal" -> 3785.411784 ml; "1/2 Gallon" -> 1892.705892 ml; "2 lb" -> {2, lb}; "12 fl oz" -> {12, fl_oz};
 * "each" -> {1, each}. Anything else is ambiguous and returns null: a bare "oz" (weight or fluid?),
 * multipacks ("6 ct / 12 oz"), ranges, approximate or per-weight sizes ("about 1.5 lb", "per lb"),
 * several numbers, unknown units.
 */
export function parsePackageSize(text: string | null | undefined): PackageQuantity | null {
  if (!text) return null;
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (t === "each" || t === "1 each" || t === "1 ea") return { quantity: "1", unit: "each" };
  const m = /^(\d+(?:\.\d+)?|\d+\s*\/\s*\d+)\s*([a-z][a-z. ]*?)\.?$/.exec(t);
  if (!m) return null;
  const u = UNIT_ALIASES[m[2].trim()];
  if (!u) return null;
  let q: Decimal;
  if (m[1].includes("/")) {
    const [a, b] = m[1].split("/").map((x) => new Decimal(x.trim()));
    if (b.isZero()) return null;
    q = a.div(b);
    if (q.decimalPlaces() > 6) return null;
  } else q = new Decimal(m[1]);
  if (q.lte(0)) return null;
  return { quantity: q.mul(u.factor).toString(), unit: u.unit };
}

/**
 * What a Kroger price covers, from `soldBy` (values not documented publicly): "unit" — one item at a
 * fixed price, the only basis Table turns into a package with a price; "weight" — a per-weight price
 * for a variable amount; anything else, or nothing, is "unknown". RUC-02: a member's typed amount never
 * changes the basis.
 */
export type SaleBasis = "unit" | "weight" | "unknown";
export function saleBasis(soldBy: string | null | undefined): SaleBasis {
  const v = typeof soldBy === "string" ? soldBy.trim().toLowerCase() : "";
  if (v === "unit") return "unit";
  if (v === "weight") return "weight";
  return "unknown";
}

function soldByUnit(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim().toLowerCase() === "unit");
}

/** One candidate per item of each product in a documented `GET /v1/products` response. */
export function mapProducts(body: unknown, locationId: string | null): ProductCandidate[] {
  const data = (body as { data?: unknown })?.data;
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
  const out: ProductCandidate[] = [];
  for (const p of list as Record<string, unknown>[]) {
    const productId = str(p?.productId);
    if (!productId) continue;
    const items = Array.isArray(p.items) && p.items.length ? (p.items as Record<string, unknown>[]) : [null];
    for (const it of items) {
      const sizeText = str(it?.size);
      const priceObj = it?.price as Record<string, unknown> | undefined;
      const ful = it?.fulfillment as Record<string, unknown> | undefined;
      const inv = it?.inventory as Record<string, unknown> | undefined;
      const stock = str(inv?.stockLevel);
      out.push({
        productId,
        upc: str(p.upc),
        itemId: str(it?.itemId),
        description: str(p.description),
        brand: str(p.brand),
        sizeText,
        // A size is a package quantity only for an item sold by the unit (or with no soldBy):
        // soldBy values are not documented, and an item sold by weight has no fixed package.
        package: soldByUnit(it?.soldBy) ? parsePackageSize(sizeText) : null,
        soldBy: str(it?.soldBy),
        locationId,
        price: locationId && priceObj && typeof priceObj === "object"
          ? { regularMinor: dollarsToMinor(priceObj.regular), promoMinor: dollarsToMinor(priceObj.promo), currency: "USD", currencyAssumed: true }
          : null,
        fulfillment: locationId && ful && typeof ful === "object"
          ? { instore: bool(ful.instore), curbside: bool(ful.curbside), delivery: bool(ful.delivery), shiptohome: bool(ful.shiptohome) }
          : null,
        stockLevel: locationId && stock && STOCK.includes(stock) ? (stock as StockLevel) : null,
      });
    }
  }
  return out;
}

export interface LocationCandidate {
  locationId: string;
  chain: string | null;
  name: string | null;
  address: { addressLine1: string | null; city: string | null; state: string | null; zipCode: string | null } | null;
}

export function mapLocations(body: unknown): LocationCandidate[] {
  const data = (body as { data?: unknown })?.data;
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
  return (list as Record<string, unknown>[])
    .filter((l) => str(l?.locationId))
    .map((l) => {
      const a = l.address as Record<string, unknown> | undefined;
      return {
        locationId: str(l.locationId)!,
        chain: str(l.chain),
        name: str(l.name),
        address: a && typeof a === "object" ? { addressLine1: str(a.addressLine1), city: str(a.city), state: str(a.state), zipCode: str(a.zipCode) } : null,
      };
    });
}

export function isLocationId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9]{8}$/.test(v);
}

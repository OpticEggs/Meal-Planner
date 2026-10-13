import type { Db } from "../db/pool";
import { Reject, runCommand, type Actor } from "./framework";
import { retailer } from "../integrations/retailer";
import { D, KNOWN_UNITS, convert, normalizeUnit, packagesFor } from "@/domain/units";

/**
 * B16 — household staple management. A staple is a one-tap shortcut for "our usual X": a display
 * name, a usual amount and a remembered product (B12). It is not pantry inventory.
 *  - every edit names the details revision it was made against; a stale edit is refused with the
 *    current values, never applied over a newer decision;
 *  - removing a staple removes only the shortcut: captured requests, recipe demand, orders and
 *    transfers are untouched; a removed staple can be restored;
 *  - nothing here approves, sends or changes a purchase.
 */

/** A usual amount: `unit: "package"` means whole packages of the remembered product. */
export interface UsualAmount {
  quantity: string;
  unit: string;
}

export interface StapleProductRow {
  id: string;
  name: string;
  package_qty: string | null;
  package_unit: string | null;
  retailer: string;
}

/** Converts a usual amount to the package count of `product`. Field-tagged rejections let the
 *  UI attach the message to the field it concerns. */
export function usualFor(amount: UsualAmount | null | undefined, product: StapleProductRow | null): { packages: number; amount: string | null; unit: string | null } {
  const q = String(amount?.quantity ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(q) || new D(q).lte(0)) throw new Reject("invalid", "Usual amount must be a positive number", { field: "quantity" });
  const rawUnit = String(amount?.unit ?? "").trim();
  if (rawUnit === "package") {
    const n = Number(q);
    if (!Number.isInteger(n) || n < 1 || n > 50) throw new Reject("invalid", "Packages must be a whole number from 1 to 50", { field: "quantity" });
    return { packages: n, amount: null, unit: null };
  }
  const unit = normalizeUnit(rawUnit);
  if (!unit) throw new Reject("invalid", "Say which unit the usual amount is in", { field: "unit" });
  if (!product) throw new Reject("invalid", "A measured amount needs a remembered product to convert to packages; use packages, or choose a product first", { field: "unit" });
  if (!product.package_qty || !product.package_unit) {
    throw new Reject("invalid", `${product.name} has no known package size; give the usual amount in packages`, { field: "unit" });
  }
  if (!KNOWN_UNITS.includes(unit) && unit !== normalizeUnit(product.package_unit)) throw new Reject("invalid", `Unknown unit "${rawUnit}"`, { field: "unit" });
  const inPkgUnit = convert(q, unit, product.package_unit);
  if (!inPkgUnit) throw new Reject("invalid", `${unit} cannot be converted to ${product.name}'s package unit (${product.package_unit})`, { field: "unit" });
  const packages = packagesFor(inPkgUnit, new D(product.package_qty));
  if (packages < 1 || packages > 50) throw new Reject("invalid", `That is ${packages} packages of ${product.name}; the usual amount must be 1 to 50 packages`, { field: "quantity" });
  return { packages, amount: q, unit };
}

/** A product that may be remembered: known for this household and item, sold by the active retailer. */
export async function rememberableProduct(c: Db, householdId: string, ingredientKey: string, productId: unknown, itemName: string): Promise<StapleProductRow> {
  const id = typeof productId === "string" && /^[0-9a-f-]{36}$/i.test(productId) ? productId : null;
  const pr = await c.query("SELECT id, name, package_qty, package_unit, retailer FROM products WHERE id=$1 AND household_id=$2 AND ingredient_key=$3", [id, householdId, ingredientKey]);
  if (!pr.rowCount) throw new Reject("unknown_product", `That product is not known for ${itemName}. Your usual ${itemName} is unchanged.`);
  if (pr.rows[0].retailer !== retailer().mode) {
    throw new Reject("product_unavailable", `${pr.rows[0].name} is not available from the active store. Your usual ${itemName} is unchanged.`);
  }
  return pr.rows[0];
}

function cleanName(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, " ");
  if (!s) return null;
  if (s.length > 80) throw new Reject("invalid", "Name must be 80 characters or fewer", { field: "displayName" });
  return s;
}

async function loadStaple(c: Db, householdId: string, key: string) {
  const r = await c.query(
    `SELECT s.*, i.name AS ingredient_name, p.name AS product_name, p.package_qty, p.package_unit, p.retailer, m.display_name AS updated_by_name
     FROM household_staples s JOIN ingredients i ON i.household_id=s.household_id AND i.key=s.ingredient_key
     LEFT JOIN products p ON p.id=s.product_id LEFT JOIN members m ON m.id=s.updated_by
     WHERE s.household_id=$1 AND s.ingredient_key=$2`,
    [householdId, key],
  );
  return r.rows[0] ?? null;
}

/** What a staple's details look like, for conflicts and the append-only change log. */
function detailsOf(s: Record<string, any>) {
  return {
    displayName: s.display_name ?? null,
    usual: s.usual_unit ? { quantity: String(s.usual_amount), unit: s.usual_unit } : { quantity: String(s.usual_packages), unit: "package" },
    usualPackages: s.usual_packages,
    active: s.active,
  };
}

function staleDetails(s: Record<string, any>) {
  const label = s.display_name ?? s.ingredient_name;
  return new Reject("stale_staple", `${s.updated_by_name ?? "Someone"} changed your usual ${label} while you were editing. Review the current values, then save again if you still want your change.`, {
    current: { ...detailsOf(s), revision: s.details_revision, updatedBy: s.updated_by_name ?? null },
  });
}

async function logChange(c: Db, actor: Actor, key: string, kind: string, before: unknown, after: unknown, revision: number) {
  await c.query(
    "INSERT INTO staple_changes(household_id, ingredient_key, kind, before, after, details_revision, changed_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [actor.householdId, key, kind, before === null ? null : JSON.stringify(before), JSON.stringify(after), revision, actor.memberId],
  );
}

export function addStapleCommand(actor: Actor, operationId: string, p: { ingredientKey: string; displayName?: string | null; usual?: UsualAmount; productId?: string | null }) {
  return runCommand(actor, "AddStaple", operationId, p, async (c) => {
    const ing = await c.query("SELECT name FROM ingredients WHERE household_id=$1 AND key=$2", [actor.householdId, p.ingredientKey]);
    if (!ing.rowCount) throw new Reject("not_found", "Choose a known item", { field: "ingredientKey" });
    const itemName = ing.rows[0].name;
    const existing = await loadStaple(c, actor.householdId, p.ingredientKey);
    if (existing) {
      throw existing.active
        ? new Reject("already_staple", `${existing.display_name ?? itemName} is already one of your usual items`, { field: "ingredientKey" })
        : new Reject("staple_inactive", `${existing.display_name ?? itemName} was removed from your usual items; restore it instead`, { field: "ingredientKey" });
    }
    const displayName = cleanName(p.displayName);
    // The remembered product: the member's explicit choice, else the household's current product
    // choice for the item (as a first usual capture does). Either may be absent: unknown stays unknown.
    let product: StapleProductRow | null = null;
    const explicit = p.productId !== undefined && p.productId !== null && p.productId !== "";
    if (explicit) product = await rememberableProduct(c, actor.householdId, p.ingredientKey, p.productId, itemName);
    else {
      const m = await c.query(
        "SELECT p.id, p.name, p.package_qty, p.package_unit, p.retailer FROM product_mappings pm JOIN products p ON p.id=pm.product_id WHERE pm.household_id=$1 AND pm.ingredient_key=$2",
        [actor.householdId, p.ingredientKey],
      );
      product = m.rows[0] ?? null;
    }
    const usual = usualFor(p.usual ?? { quantity: "1", unit: "package" }, product);
    const ins = await c.query(
      `INSERT INTO household_staples(household_id, ingredient_key, usual_packages, product_id, updated_by, display_name, usual_amount, usual_unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [actor.householdId, p.ingredientKey, usual.packages, product?.id ?? null, actor.memberId, displayName, usual.amount, usual.unit],
    );
    await logChange(c, actor, p.ingredientKey, "created", null, detailsOf(ins.rows[0]), 1);
    if (explicit && product) {
      await c.query(
        "INSERT INTO staple_product_decisions(household_id, ingredient_key, product_id, previous_product_id, staple_revision, decided_by) VALUES ($1,$2,$3,NULL,1,$4)",
        [actor.householdId, p.ingredientKey, product.id, actor.memberId],
      );
    }
    return {
      status: "accepted",
      result: { ingredientKey: p.ingredientKey, detailsRevision: 1, productRevision: 1, usualPackages: usual.packages },
      change: { weekId: null, summary: { type: "staple", text: `${actor.displayName} added ${displayName ?? itemName} to your usual items` } },
    };
  });
}

export function updateStapleCommand(
  actor: Actor,
  operationId: string,
  p: { ingredientKey: string; expectedRevision: number; displayName?: string | null; usual: UsualAmount },
) {
  return runCommand(actor, "UpdateStaple", operationId, p, async (c) => {
    if (!Number.isInteger(p.expectedRevision) || p.expectedRevision < 1) throw new Reject("invalid", "Say which version of the staple you edited");
    const s = await loadStaple(c, actor.householdId, p.ingredientKey);
    if (!s) throw new Reject("not_found", "That item is not one of your usual items");
    if (s.details_revision !== p.expectedRevision) throw staleDetails(s);
    if (!s.active) throw new Reject("staple_inactive", `${s.display_name ?? s.ingredient_name} was removed from your usual items; restore it to edit it`);
    const displayName = cleanName(p.displayName);
    const product = s.product_id ? { id: s.product_id, name: s.product_name, package_qty: s.package_qty, package_unit: s.package_unit, retailer: s.retailer } : null;
    const usual = usualFor(p.usual, product);
    const before = detailsOf(s);
    if (displayName === (s.display_name ?? null) && usual.packages === s.usual_packages && usual.amount === (s.usual_amount === null ? null : String(s.usual_amount)) && usual.unit === (s.usual_unit ?? null)) {
      return { status: "accepted", result: { ingredientKey: p.ingredientKey, detailsRevision: s.details_revision, unchanged: true } };
    }
    const up = await c.query(
      `UPDATE household_staples SET display_name=$3, usual_packages=$4, usual_amount=$5, usual_unit=$6, details_revision=details_revision+1, updated_by=$7, updated_at=now()
       WHERE household_id=$1 AND ingredient_key=$2 AND details_revision=$8 RETURNING *`,
      [actor.householdId, p.ingredientKey, displayName, usual.packages, usual.amount, usual.unit, actor.memberId, p.expectedRevision],
    );
    const after = up.rows[0];
    await logChange(c, actor, p.ingredientKey, "edited", before, detailsOf(after), after.details_revision);
    return {
      status: "accepted",
      result: { ingredientKey: p.ingredientKey, detailsRevision: after.details_revision, usualPackages: usual.packages },
      change: { weekId: null, summary: { type: "staple", text: `${actor.displayName} changed your usual ${displayName ?? s.ingredient_name}` } },
    };
  });
}

/** Remove (active=false) or restore (active=true) a staple's shortcut. */
export function setStapleActiveCommand(actor: Actor, operationId: string, p: { ingredientKey: string; expectedRevision: number; active: boolean }) {
  return runCommand(actor, "SetStapleActive", operationId, p, async (c) => {
    if (!Number.isInteger(p.expectedRevision) || p.expectedRevision < 1) throw new Reject("invalid", "Say which version of the staple you saw");
    if (typeof p.active !== "boolean") throw new Reject("invalid", "Say whether to remove or restore it");
    const s = await loadStaple(c, actor.householdId, p.ingredientKey);
    if (!s) throw new Reject("not_found", "That item is not one of your usual items");
    if (p.expectedRevision !== s.details_revision) throw staleDetails(s);
    const label = s.display_name ?? s.ingredient_name;
    if (s.active === p.active) return { status: "accepted", result: { ingredientKey: p.ingredientKey, detailsRevision: s.details_revision, unchanged: true } };
    const up = await c.query(
      `UPDATE household_staples SET active=$3, details_revision=details_revision+1, updated_by=$4, updated_at=now()
       WHERE household_id=$1 AND ingredient_key=$2 AND details_revision=$5 RETURNING *`,
      [actor.householdId, p.ingredientKey, p.active, actor.memberId, p.expectedRevision],
    );
    await logChange(c, actor, p.ingredientKey, p.active ? "restored" : "deactivated", detailsOf(s), detailsOf(up.rows[0]), up.rows[0].details_revision);
    return {
      status: "accepted",
      result: { ingredientKey: p.ingredientKey, detailsRevision: up.rows[0].details_revision, active: p.active },
      change: { weekId: null, summary: { type: "staple", text: p.active ? `${actor.displayName} restored ${label} to your usual items` : `${actor.displayName} removed ${label} from your usual items` } },
    };
  });
}

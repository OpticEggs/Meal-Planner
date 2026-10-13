import { hashOf } from "../hash";
import type { ProjectionResult, RequirementLine } from "./projection";

/**
 * B10 — an explicit, reviewed PARTIAL grocery handoff. The ordinary Send stays whole-list only (its
 * readiness is unchanged); this is a separate action: the household sends a chosen subset of the lines
 * that are fully ready on their own, and every other line is named as left out, with the reason.
 *
 * A line can be sent on its own only if it is exactly what the whole-list Send would send for it: a
 * product sold by the active store, a known price, a valid approval for exactly the packages still to
 * send, and nothing unresolved. Nothing is invented for the rest (no price, no package, no product);
 * they stay outstanding. A known subtotal never proves the whole grocery budget: with a FIRM budget the
 * partial send is refused unless the whole pickup is known to be within it.
 */

export type OmissionCode =
  | "amount_unknown" | "unresolved" | "no_product" | "not_sold_here" | "price_unknown" | "not_approved" | "uncertain" | "not_selected";

export interface PartialEligible {
  key: string;
  name: string;
  productId: string;
  productRef: string;
  productName: string;
  packages: number;
  priceMinor: number;
  priceKind: string | null;
  estimate: boolean;
  lineFingerprint: string;
  approvalId: string;
}

export interface PartialOmission {
  key: string;
  name: string;
  /** Packages still needed (null = amount unknown); 0 for a line only waiting on an uncertain transfer. */
  toSend: number | null;
  code: OmissionCode;
  reason: string;
}

export interface PartialReview {
  /** The whole list's review identity this partial review was built from. */
  reviewFingerprint: string;
  /** Identity of everything the member reviews here: the sendable lines and every omission with its reason. */
  partialFingerprint: string;
  eligible: PartialEligible[];
  omitted: PartialOmission[];
  /** Why no partial send is possible right now (empty = possible). */
  blockers: string[];
}

function omissionOf(l: RequirementLine, activeRetailer: string): PartialOmission | null {
  const base = { key: l.key, name: l.name, toSend: l.toSend };
  if (!l.product) return { ...base, code: "no_product", reason: "No product chosen" };
  if ((l.product as { retailer?: string }).retailer && (l.product as { retailer?: string }).retailer !== activeRetailer) {
    return { ...base, code: "not_sold_here", reason: "The chosen product isn't sold by this store" };
  }
  if (l.toSend === null) return { ...base, code: "amount_unknown", reason: l.unresolved[0] ?? "The amount to buy can't be worked out" };
  if (l.unresolved.length) return { ...base, code: "unresolved", reason: l.unresolved[0] };
  if (!l.price) return { ...base, code: "price_unknown", reason: "Price unknown" };
  if (!l.approval?.valid) return { ...base, code: "not_approved", reason: `Not approved for ${l.toSend} package(s)` };
  return null;
}

export function partialReview(
  result: Pick<ProjectionResult, "lines" | "reviewFingerprint" | "budget">,
  destination: string,
  activeRetailer: string,
): PartialReview {
  const eligible: PartialEligible[] = [];
  const omitted: PartialOmission[] = [];
  for (const l of result.lines) {
    const sendable = l.toSend === null || l.toSend > 0;
    if (!sendable) {
      // Demand whose transfer outcome is unknown is never offered again; it is named, not resent.
      if (l.uncertain > 0) omitted.push({ key: l.key, name: l.name, toSend: 0, code: "uncertain", reason: "A transfer outcome is uncertain — check the cart; Table does not resend" });
      continue;
    }
    const o = omissionOf(l, activeRetailer);
    if (o) omitted.push(o);
    else {
      eligible.push({
        key: l.key, name: l.name, productId: l.product!.id, productRef: l.product!.ref, productName: l.product!.name, packages: l.toSend!,
        priceMinor: l.price!.amountMinor, priceKind: l.price!.kind ?? null, estimate: l.estimate, lineFingerprint: l.fingerprint, approvalId: l.approval!.id,
      });
    }
  }
  eligible.sort((a, b) => a.key.localeCompare(b.key));
  omitted.sort((a, b) => a.key.localeCompare(b.key));
  const blockers: string[] = [];
  if (destination !== "retailer_cart") blockers.push("Sending only some items is for the store cart; you chose another way to shop");
  if (result.budget.firm && result.budget.status === "over") blockers.push("Over your firm budget — a partial send can't be checked against it");
  if (result.budget.firm && result.budget.status === "unknown") blockers.push("Your firm budget can't be confirmed while some prices are unknown");
  if (!eligible.length) blockers.push("No item is ready to send on its own yet (each needs a store product, a price and an approval)");
  const partialFingerprint = hashOf({
    reviewFingerprint: result.reviewFingerprint,
    destination,
    eligible: eligible.map((e) => [e.key, e.lineFingerprint, e.packages, e.productId, e.priceMinor, e.approvalId]),
    omitted: omitted.map((o) => [o.key, o.code, o.toSend]),
  });
  return { reviewFingerprint: result.reviewFingerprint, partialFingerprint, eligible, omitted, blockers };
}

/** Everything that is NOT sent when exactly `selectedKeys` are sent: deselected sendable lines and every omission. */
export function omissionsFor(review: PartialReview, selectedKeys: string[]): PartialOmission[] {
  const chosen = new Set(selectedKeys);
  const left = review.eligible
    .filter((e) => !chosen.has(e.key))
    .map((e): PartialOmission => ({ key: e.key, name: e.name, toSend: e.packages, code: "not_selected", reason: "Left out by you" }));
  return [...left, ...review.omitted].sort((a, b) => a.key.localeCompare(b.key));
}

/** Checks a selection against the review: a non-empty subset of the sendable lines, no duplicates, and
 *  an acknowledged omission list equal to what would actually be left out. Null = valid. */
export function selectionProblem(review: PartialReview, selectedKeys: unknown, acknowledged: unknown): string | null {
  if (!Array.isArray(selectedKeys) || !selectedKeys.length) return "Choose at least one item to send";
  if (!selectedKeys.every((k) => typeof k === "string")) return "Unknown item";
  if (new Set(selectedKeys).size !== selectedKeys.length) return "An item was chosen twice";
  const eligible = new Set(review.eligible.map((e) => e.key));
  const bad = (selectedKeys as string[]).filter((k) => !eligible.has(k));
  if (bad.length) return `Not ready to send on its own: ${bad.join(", ")}`;
  if (!Array.isArray(acknowledged)) return "Confirm the items that will be left out";
  const want = omissionsFor(review, selectedKeys as string[]).map((o) => o.key).sort();
  const got = [...(acknowledged as unknown[])].map(String).sort();
  if (want.length !== got.length || want.some((k, i) => k !== got[i])) return "The items left out changed since you reviewed them";
  return null;
}

import { hashOf } from "../hash";
import { D, Dec, convert, normalizeUnit, packagesFor } from "../units";
import { eventDemand } from "../recipes/plate";
import type { Allocation, CookingEvent, Ingredient, RecipeVersion } from "../types";

/**
 * Current grocery requirements, derived from accepted choices plus facts. Pure: no I/O.
 *  - meal demand is computed from accepted cooking events only (never previews)
 *  - usual replenishment is a minimum purchase; explicit extras are additive
 *  - "have some" without a quantity subtracts nothing and stays a review item
 *  - confirmed-order and transfer history are counted, never rewritten
 *  - unknown prices stay unknown, never zero
 */

export interface ProjectionEventInput {
  event: CookingEvent;
  recipe: RecipeVersion;
  allocations: Allocation[];
}

export interface RequestInput {
  id: string;
  ingredientKey: string | null;
  text: string;
  kind: "usual" | "extra";
  packages: number | null;
  contributors: { memberId: string; name: string; taps: number }[];
}

export interface AvailabilityInput {
  id: string;
  ingredientKey: string;
  state: "enough" | "some" | "need";
  quantity: string | null;
  unit: string | null;
  reviewedDemand: string | null;
  reviewedUnit: string | null;
  memberName: string;
}

export interface ProductInput {
  id: string;
  ref: string;
  name: string;
  ingredientKey: string;
  packageQty: string | null;
  packageUnit: string | null;
  variableWeight: boolean;
  fixture: boolean;
  retailer: string;
}

export interface PriceInput {
  id: string;
  amountMinor: number;
  currency: string;
  kind: string;
  source: string;
  observedAt: string;
}

export interface BatchInput {
  id: string;
  status: "authorized" | "dispatch_started" | "acknowledged" | "failed" | "canceled_before_dispatch" | "uncertain";
  lines: { ingredientKey: string; packages: number }[];
}

export interface OrderInput {
  id: string;
  contentsKnown: boolean;
  pickupAt: string | null;
  lines: { id: string; ingredientKey: string | null; name: string; packages: number }[];
  receipts: { orderLineId: string; state: "received" | "missing" | "substituted"; packages: number }[];
}

export interface ApprovalInput {
  id: string;
  ingredientKey: string;
  productId: string;
  packages: number;
  lineFingerprint: string;
}

export interface ProjectionInput {
  events: ProjectionEventInput[];
  ingredients: Map<string, Ingredient>;
  requests: RequestInput[];
  availability: AvailabilityInput[]; // latest per ingredient
  products: Map<string, { product: ProductInput; price: PriceInput | null }>; // by ingredientKey
  batches: BatchInput[];
  order: OrderInput | null;
  approvals: ApprovalInput[];
  budget: { scope: "pickup" | "dinner_ingredients" | null; limitMinor: number | null; firm: boolean; currency: string };
}

export type LineStatus =
  | "nothing_needed"
  | "needs_review"
  | "approved"
  | "in_cart_transfer"
  | "uncertain"
  | "ordered"
  | "received"
  | "missing"
  | "not_sent_yet";

export interface RequirementLine {
  key: string;
  ingredientKey: string | null;
  name: string;
  meal: { quantity: string; unit: string; sources: { eventId: string; cookNight: string; recipeTitle: string; quantity: string; unit: string }[] } | null;
  mealUnitConflict: string[] | null;
  requests: { id: string; kind: "usual" | "extra"; packages: number | null; text: string; contributors: { memberId: string; name: string; taps: number }[] }[];
  availability: AvailabilityInput | null;
  homeSupply: string | null;
  product: ProductInput | null;
  price: PriceInput | null;
  packagesForMeal: number | null;
  packagesUsual: number;
  packagesExtra: number;
  packagesNeeded: number | null;
  estimate: boolean; // variable-weight package convention
  leftAfterMeal: { quantity: string; unit: string } | null;
  ordered: number;
  received: number;
  missing: number;
  sent: number;
  uncertain: number;
  toSend: number | null;
  unresolved: string[];
  approval: { id: string; packages: number; valid: boolean } | null;
  fingerprint: string;
  status: LineStatus;
  usageCostMinor: number | null;
  pickupCostMinor: number | null;
}

export interface CostView {
  knownMinor: number;
  unknownCount: number;
  complete: boolean;
  currency: string;
}

export interface ProjectionResult {
  lines: RequirementLine[];
  reviewFingerprint: string;
  payload: { productRef: string; ingredientKey: string; packages: number }[];
  payloadHash: string;
  ready: boolean;
  readyBlockers: string[];
  dinnerIngredientCost: CostView;
  pickupSpending: CostView;
  budget: { status: "unset" | "within" | "over" | "unknown"; scope: string | null; limitMinor: number | null; firm: boolean };
}

function costFrom(values: (number | null)[], currency: string): CostView {
  const known = values.filter((v): v is number => v !== null);
  const unknownCount = values.length - known.length;
  return { knownMinor: known.reduce((a, b) => a + b, 0), unknownCount, complete: unknownCount === 0, currency };
}

export function computeProjection(input: ProjectionInput): ProjectionResult {
  // 1. Meal demand from accepted, scheduled cooking events.
  type MealSource = { eventId: string; cookNight: string; recipeTitle: string; quantity: string; unit: string };
  const meal = new Map<string, { byUnit: Map<string, Dec>; sources: MealSource[] }>();
  for (const { event, recipe, allocations } of input.events) {
    if (event.status !== "scheduled" || !event.cookNight) continue;
    const { lines } = eventDemand(recipe, allocations);
    for (const l of lines) {
      const m = meal.get(l.ingredientKey) ?? { byUnit: new Map<string, Dec>(), sources: [] as MealSource[] };
      m.byUnit.set(l.unit, (m.byUnit.get(l.unit) ?? new D(0)).plus(l.quantity));
      m.sources.push({ eventId: event.id, cookNight: event.cookNight, recipeTitle: recipe.title, quantity: l.quantity.toDecimalPlaces(3).toString(), unit: l.unit });
      meal.set(l.ingredientKey, m);
    }
  }

  const keys = new Set<string>([...meal.keys()]);
  for (const r of input.requests) keys.add(r.ingredientKey ?? `text:${r.id}`);
  if (input.order) for (const ol of input.order.lines) if (ol.ingredientKey) keys.add(ol.ingredientKey);
  for (const b of input.batches) for (const l of b.lines) keys.add(l.ingredientKey);

  const orderActive = input.order !== null;
  const lines: RequirementLine[] = [];
  for (const key of [...keys].sort()) {
    const ingredientKey = key.startsWith("text:") ? null : key;
    const ing = ingredientKey ? input.ingredients.get(ingredientKey) : undefined;
    const reqs = input.requests.filter((r) => (r.ingredientKey ?? `text:${r.id}`) === key);
    const unresolved: string[] = [];
    const m = meal.get(key);
    let mealQty: Dec | null = null;
    let mealUnit: string | null = null;
    let mealUnitConflict: string[] | null = null;
    if (m) {
      if (m.byUnit.size > 1) {
        mealUnitConflict = [...m.byUnit.keys()];
        unresolved.push(`Recipe amounts use units that cannot be combined (${mealUnitConflict.join(", ")})`);
      } else {
        [[mealUnit, mealQty]] = [...m.byUnit.entries()];
      }
    }
    const prodEntry = ingredientKey ? input.products.get(ingredientKey) : undefined;
    const product = prodEntry?.product ?? null;
    const price = prodEntry?.price ?? null;
    if (!ingredientKey) unresolved.push("Needs review: match this request to an ingredient and product");
    else if (!product) unresolved.push("No product chosen for this ingredient");

    // 2. Home supply (availability observation for this cycle).
    const avail = ingredientKey ? input.availability.find((a) => a.ingredientKey === ingredientKey) ?? null : null;
    let homeSupply: Dec | null = null;
    if (avail && mealQty && mealUnit) {
      if (avail.state === "enough") {
        const reviewed = avail.reviewedDemand && avail.reviewedUnit ? convert(avail.reviewedDemand, avail.reviewedUnit, mealUnit) : null;
        if (reviewed && reviewed.gte(mealQty)) {
          homeSupply = mealQty;
        } else {
          homeSupply = reviewed ?? new D(0);
          unresolved.push(
            `Needed amount increased since ${avail.memberName} said "Have enough" (reviewed ${reviewed ? reviewed.toDecimalPlaces(2) : "?"} ${mealUnit}, now ${mealQty.toDecimalPlaces(2)} ${mealUnit})`,
          );
        }
      } else if (avail.state === "some") {
        if (avail.quantity && avail.unit) {
          const q = convert(avail.quantity, avail.unit, mealUnit);
          if (q) homeSupply = D.min(q, mealQty);
          else unresolved.push(`"Have some" amount is in ${avail.unit}, which cannot be compared with ${mealUnit}`);
        } else {
          unresolved.push(`"Have some" without an amount — nothing subtracted; say how much, or mark it Need`);
        }
      }
    }
    const netMeal = mealQty ? D.max(0, mealQty.minus(homeSupply ?? 0)) : null;

    // 3. Packages.
    let packagesForMeal: number | null = mealQty ? null : 0;
    let leftAfterMeal: RequirementLine["leftAfterMeal"] = null;
    let pkgInMealUnit: Dec | null = null;
    if (mealQty && mealUnit && product?.packageQty && product.packageUnit) {
      pkgInMealUnit = convert(product.packageQty, product.packageUnit, mealUnit);
      if (pkgInMealUnit) packagesForMeal = packagesFor(netMeal!, pkgInMealUnit);
      else unresolved.push(`Package size (${product.packageUnit}) cannot be converted to the recipe unit (${mealUnit})`);
    } else if (mealQty && product && !product.packageQty) {
      unresolved.push("Package size unknown");
    }
    const usual = reqs.filter((r) => r.kind === "usual");
    const extras = reqs.filter((r) => r.kind === "extra");
    const packagesUsual = usual.length ? Math.max(...usual.map((r) => r.packages ?? 1)) : 0;
    const packagesExtra = extras.reduce((a, r) => a + (r.packages ?? 1), 0);
    let packagesNeeded: number | null = packagesForMeal === null ? null : Math.max(packagesForMeal, packagesUsual) + packagesExtra;
    if (!ingredientKey) packagesNeeded = null;
    if (packagesNeeded !== null && pkgInMealUnit && netMeal && packagesUsual > 0) {
      const base = Math.max(packagesForMeal ?? 0, packagesUsual);
      const left = pkgInMealUnit.mul(base).minus(netMeal);
      leftAfterMeal = { quantity: left.toDecimalPlaces(2).toString(), unit: mealUnit! };
    }

    // 4. History: confirmed order (expected supply), receipts, transfers.
    const orderLines = input.order?.lines.filter((ol) => ol.ingredientKey === ingredientKey && ingredientKey) ?? [];
    const ordered = orderLines.reduce((a, ol) => a + ol.packages, 0);
    const receipts = input.order?.receipts.filter((r) => orderLines.some((ol) => ol.id === r.orderLineId)) ?? [];
    const received = receipts.filter((r) => r.state === "received").reduce((a, r) => a + r.packages, 0);
    const missing = receipts.filter((r) => r.state === "missing").reduce((a, r) => a + r.packages, 0);
    let sent = 0;
    let uncertain = 0;
    if (!orderActive) {
      for (const b of input.batches) {
        const n = b.lines.filter((l) => l.ingredientKey === ingredientKey).reduce((a, l) => a + l.packages, 0);
        if (b.status === "authorized" || b.status === "dispatch_started" || b.status === "acknowledged") sent += n;
        if (b.status === "uncertain") uncertain += n;
      }
    }
    if (uncertain > 0) unresolved.push("A transfer outcome is uncertain — check the retailer cart; Table does not resend automatically");
    const coveredByOrder = ordered - missing;
    const toSend = packagesNeeded === null ? null : Math.max(0, packagesNeeded - coveredByOrder - sent - uncertain);

    const fingerprint = hashOf({
      key,
      meal: mealQty ? [mealQty.toDecimalPlaces(6).toString(), mealUnit] : null,
      mealUnitConflict,
      requests: reqs.map((r) => [r.id, r.kind, r.packages]).sort(),
      availability: avail ? avail.id : null,
      product: product ? [product.id, product.packageQty, product.packageUnit] : null,
      packagesNeeded,
      coveredByOrder,
      unresolved: unresolved.filter((u) => !u.startsWith("A transfer outcome")),
    });
    const ap = input.approvals.find((a) => a.ingredientKey === key);
    const approval = ap
      ? { id: ap.id, packages: ap.packages, valid: ap.lineFingerprint === fingerprint && ap.packages === toSend && ap.productId === product?.id }
      : null;

    let status: LineStatus;
    if (missing > 0 && toSend && toSend > 0) status = "missing";
    else if (toSend === 0 && received > 0 && received >= ordered - missing && ordered > 0) status = "received";
    else if (toSend === 0 && coveredByOrder > 0) status = "ordered";
    else if (toSend === 0 && uncertain > 0) status = "uncertain";
    else if (toSend === 0 && sent > 0) status = "in_cart_transfer";
    else if (toSend === 0) status = "nothing_needed";
    else if (orderActive && toSend !== null && toSend > 0 && approval?.valid) status = "approved";
    else if (orderActive) status = "not_sent_yet";
    else if (approval?.valid && unresolved.length === 0) status = "approved";
    else status = "needs_review";

    const usageCostMinor =
      mealQty && pkgInMealUnit && price ? Number(mealQty.div(pkgInMealUnit).mul(price.amountMinor).toDecimalPlaces(0, D.ROUND_HALF_UP)) : mealQty ? null : 0;
    const pickupCostMinor = packagesNeeded === null ? null : packagesNeeded === 0 ? 0 : price ? packagesNeeded * price.amountMinor : null;

    lines.push({
      key,
      ingredientKey,
      name: ing?.name ?? reqs[0]?.text ?? key,
      meal: mealQty && mealUnit ? { quantity: mealQty.toDecimalPlaces(3).toString(), unit: normalizeUnit(mealUnit), sources: m!.sources } : null,
      mealUnitConflict,
      requests: reqs.map((r) => ({ id: r.id, kind: r.kind, packages: r.packages, text: r.text, contributors: r.contributors })),
      availability: avail,
      homeSupply: homeSupply ? homeSupply.toDecimalPlaces(3).toString() : null,
      product,
      price,
      packagesForMeal,
      packagesUsual,
      packagesExtra,
      packagesNeeded,
      estimate: !!product?.variableWeight,
      leftAfterMeal,
      ordered,
      received,
      missing,
      sent,
      uncertain,
      toSend,
      unresolved,
      approval,
      fingerprint,
      status,
      usageCostMinor,
      pickupCostMinor,
    });
  }

  // 5. Review identity and payload over lines that still need sending.
  const sendable = lines.filter((l) => l.toSend === null || l.toSend > 0);
  const reviewFingerprint = hashOf(
    sendable.map((l) => [l.key, l.fingerprint, l.toSend, l.product?.id ?? null, l.price ? [l.price.id, l.price.amountMinor] : null, l.approval?.valid ? l.approval.id : null]),
  );
  const payload = sendable
    .filter((l) => l.product && l.toSend && l.toSend > 0)
    .map((l) => ({ productRef: l.product!.ref, ingredientKey: l.ingredientKey!, packages: l.toSend! }))
    .sort((a, b) => a.productRef.localeCompare(b.productRef));
  const payloadHash = hashOf(payload);

  const currency = input.budget.currency;
  const dinnerIngredientCost = costFrom(lines.filter((l) => l.meal || l.mealUnitConflict).map((l) => l.usageCostMinor), currency);
  const pickupSpending = costFrom(lines.filter((l) => l.packagesNeeded !== 0).map((l) => l.pickupCostMinor), currency);

  let budgetStatus: ProjectionResult["budget"]["status"] = "unset";
  if (input.budget.scope && input.budget.limitMinor !== null) {
    const view = input.budget.scope === "pickup" ? pickupSpending : dinnerIngredientCost;
    if (view.knownMinor > input.budget.limitMinor) budgetStatus = "over";
    else if (!view.complete) budgetStatus = "unknown";
    else budgetStatus = "within";
  }

  const readyBlockers: string[] = [];
  for (const l of sendable) {
    if (l.unresolved.length) readyBlockers.push(`${l.name}: ${l.unresolved[0]}`);
    else if (!l.price) readyBlockers.push(`${l.name}: price unknown`);
    else if (!l.approval?.valid) readyBlockers.push(`${l.name}: purchase not approved for ${l.toSend} package(s)`);
  }
  for (const l of lines) if (l.uncertain > 0 && !sendable.includes(l)) readyBlockers.push(`${l.name}: transfer outcome uncertain`);
  if (input.budget.firm && budgetStatus === "over") readyBlockers.push("Over your firm budget");
  if (input.budget.firm && budgetStatus === "unknown") readyBlockers.push("Firm budget cannot be confirmed while prices are unknown");
  if (payload.length === 0) readyBlockers.push("Nothing left to send");
  return {
    lines,
    reviewFingerprint,
    payload,
    payloadHash,
    ready: readyBlockers.length === 0,
    readyBlockers,
    dinnerIngredientCost,
    pickupSpending,
    budget: { status: budgetStatus, scope: input.budget.scope, limitMinor: input.budget.limitMinor, firm: input.budget.firm },
  };
}

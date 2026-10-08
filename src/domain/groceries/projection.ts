import { hashOf } from "../hash";
import { D, Dec, convert, normalizeUnit, packagesFor } from "../units";
import { eventDemand } from "../recipes/plate";
import { dayName } from "../dates";
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
  /** Product intent recorded at capture (a staple's remembered product); null = none. */
  productId?: string | null;
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
  authorizedAt?: string;
  // Package basis of the exact product transferred (null = unknown basis).
  lines: { ingredientKey: string; packages: number; packageQty?: string | null; packageUnit?: string | null }[];
}

export interface OrderInput {
  id: string;
  contentsKnown: boolean;
  pickupAt: string | null;
  pickupDate: string | null; // household-local date of pickup, if known
  confirmedAt?: string;
  /** Transfers whose contents this confirmed order reconciles (empty when contents are unknown). */
  reconcilesBatchIds?: string[];
  lines: { id: string; ingredientKey: string | null; name: string; packages: number; productId?: string | null; packageQty?: string | null; packageUnit?: string | null }[];
  receipts: {
    id?: string;
    orderLineId: string;
    state: "received" | "missing" | "substituted";
    packages: number;
    correctsId?: string | null;
    substituteText?: string | null;
    validation?: { suitable: boolean; quantity: string | null; unit: string | null } | null;
  }[];
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
  /** Products named by request intents, by product id; `available` = sold by the active retailer. */
  intentProducts?: Map<string, { product: ProductInput; price: PriceInput | null; available: boolean }>;
  batches: BatchInput[];
  order: OrderInput | null;
  approvals: ApprovalInput[];
  budget: { scope: "pickup" | "dinner_ingredients" | null; limitMinor: number | null; firm: boolean; currency: string };
  /** Household-local today; dinners before today are history and need no timing check. */
  today?: string;
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
  requests: { id: string; kind: "usual" | "extra"; packages: number | null; text: string; contributors: { memberId: string; name: string; taps: number }[]; productId?: string | null }[];
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
  /** Why the line has no usable product, for status wording (B15): none chosen, the requested
   *  product is unknown or not sold by the active store, or requests name different products. */
  productIssue: "none_chosen" | "unknown" | "unavailable" | "conflict" | null;
  approval: { id: string; packages: number; valid: boolean } | null;
  fingerprint: string;
  status: LineStatus;
  usageCostMinor: number | null;
  pickupCostMinor: number | null;
  /** Cost of what still has to be bought (toSend x price): the basis of "additional basket cost". */
  outstandingCostMinor: number | null;
  /** Received goods not needed by the current plan or requests (physical, product unit). */
  receivedSurplus: { quantity: string; unit: string } | null;
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
  /** Still to buy after orders, receipts and transfers already accounted for. */
  outstandingPurchase: CostView;
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
    // Product: a request's product intent (the staple's remembered package at capture) decides;
    // otherwise the household's product choice for the ingredient. An intent that is
    // unknown or not sold by the active retailer leaves the line unresolved — never a silent
    // substitute.
    let prodEntry: { product: ProductInput; price: PriceInput | null } | undefined = ingredientKey ? input.products.get(ingredientKey) : undefined;
    const intents = [...new Set(reqs.filter((r) => r.productId).map((r) => r.productId as string))];
    let productIssue: RequirementLine["productIssue"] = null;
    if (ingredientKey && intents.length) {
      const intent = intents.length === 1 ? input.intentProducts?.get(intents[0]) : undefined;
      prodEntry = undefined;
      if (intents.length > 1) {
        productIssue = "conflict";
        unresolved.push("Requests for this item name different products — choose one for this pickup");
      } else if (!intent) {
        productIssue = "unknown";
        unresolved.push("Your usual product is no longer known — choose a product for this pickup");
      } else if (!intent.available) {
        productIssue = "unavailable";
        unresolved.push(`Your usual product (${intent.product.name}) is not available from the active store — choose a product for this pickup`);
      } else prodEntry = intent;
    }
    const product = prodEntry?.product ?? null;
    const price = prodEntry?.price ?? null;
    if (!ingredientKey) unresolved.push("Needs review: match this request to an ingredient and product");
    else if (!product && !intents.length) {
      productIssue = "none_chosen";
      unresolved.push("No product chosen for this ingredient");
    }

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

    // 4. History. A confirmed order is expected supply for the transfers it explicitly
    // reconciles; every other transfer (later, or under an order whose contents are unknown)
    // stays accounted as sent or uncertain. Quantities are physical, each on its own record's
    // package basis, so later product/mapping changes cannot rescale history.
    const order = input.order;
    const reconciled = new Set(order && order.contentsKnown ? order.reconcilesBatchIds ?? [] : []);
    const unitP = product?.packageQty && product.packageUnit ? product.packageUnit : null;
    const pkgP = product?.packageQty && product.packageUnit ? new D(product.packageQty) : null;
    let basisUnknown = false;
    const toP = (packages: number, qty: string | null | undefined, unit: string | null | undefined): Dec | null => {
      if (!pkgP || !unitP) return null;
      if (!qty || !unit) {
        basisUnknown = true;
        return pkgP.mul(packages); // unknown basis: counted as today's package, and flagged
      }
      const c = convert(new D(qty).mul(packages), unit, unitP);
      if (!c) basisUnknown = true;
      return c ?? pkgP.mul(packages);
    };
    const orderLines = order?.lines.filter((ol) => ol.ingredientKey === ingredientKey && ingredientKey) ?? [];
    const superseded = new Set((order?.receipts ?? []).map((r) => r.correctsId).filter(Boolean) as string[]);
    const receipts = (order?.receipts ?? []).filter((r) => orderLines.some((ol) => ol.id === r.orderLineId) && !(r.id && superseded.has(r.id)));
    let ordered = 0;
    let received = 0;
    let missing = 0;
    let coveredP: Dec = new D(0);
    let receivedP: Dec = new D(0);
    for (const ol of orderLines) {
      ordered += ol.packages;
      const rs = receipts.filter((r) => r.orderLineId === ol.id);
      const rec = rs.filter((r) => r.state === "received").reduce((a, r) => a + r.packages, 0);
      const mis = rs.filter((r) => r.state === "missing").reduce((a, r) => a + r.packages, 0);
      const subs = rs.filter((r) => r.state === "substituted");
      const sub = subs.reduce((a, r) => a + r.packages, 0);
      received += rec;
      missing += mis;
      // Original product still expected = packages not reported missing or substituted.
      coveredP = coveredP.plus(toP(ol.packages - mis - sub, ol.packageQty, ol.packageUnit) ?? 0);
      receivedP = receivedP.plus(toP(rec, ol.packageQty, ol.packageUnit) ?? 0);
      for (const r of subs) {
        const v = r.validation;
        if (!v) {
          unresolved.push(`Substituted with "${r.substituteText ?? "something else"}" — confirm whether it works for ${ing?.name ?? key}`);
        } else if (!v.suitable) {
          missing += r.packages; // an unsuitable substitute leaves the need actionable
        } else {
          const q = v.quantity && v.unit && unitP ? convert(v.quantity, v.unit, unitP) : null;
          if (q) {
            coveredP = coveredP.plus(q);
            receivedP = receivedP.plus(q);
            received += r.packages;
          } else unresolved.push(`Substitute "${r.substituteText ?? ""}" amount cannot be compared with ${ing?.name ?? key}`);
        }
      }
    }
    let sent = 0;
    let uncertain = 0;
    let sentP: Dec = new D(0);
    let preOrderUnknown = false;
    for (const b of input.batches) {
      if (reconciled.has(b.id)) continue;
      const ls = b.lines.filter((l) => l.ingredientKey === ingredientKey);
      const n = ls.reduce((a, l) => a + l.packages, 0);
      if (!n) continue;
      const counts = b.status === "authorized" || b.status === "dispatch_started" || b.status === "acknowledged" || b.status === "uncertain";
      if (!counts) continue;
      if (b.status === "uncertain") uncertain += n;
      else sent += n;
      for (const l of ls) sentP = sentP.plus(toP(l.packages, l.packageQty, l.packageUnit) ?? 0);
      if (order && !order.contentsKnown && b.authorizedAt && order.confirmedAt && b.authorizedAt <= order.confirmedAt) preOrderUnknown = true;
    }
    if (uncertain > 0) unresolved.push("A transfer outcome is uncertain — check the retailer cart; Table does not resend automatically");
    if (preOrderUnknown) unresolved.push(`Order confirmed with contents not listed — cannot tell whether the transferred ${ing?.name ?? key} is included`);
    if (basisUnknown) unresolved.push(`Package size of an earlier ${ing?.name ?? key} purchase is not recorded — counted as today's package`);
    const coveredByOrder = ordered - missing;
    // Expected supply only supports dinners on or after pickup. Unknown pickup is unresolved
    // availability, never proof that goods arrive in time.
    if (coveredByOrder > 0 && m && order) {
      const today = input.today ?? "";
      const upcoming = [...new Set(m.sources.map((x) => x.cookNight))].filter((n) => n >= today).sort();
      const pickup = order.pickupDate;
      const early = pickup === null ? upcoming : upcoming.filter((n) => n < pickup);
      if (early.length) {
        const days = early.map(dayName).join(", ");
        unresolved.push(
          pickup === null
            ? `Pickup time not recorded — cannot confirm the ordered ${ing?.name ?? key} arrives before ${days}'s dinner`
            : `Ordered ${ing?.name ?? key} is picked up ${dayName(pickup)}; ${days}'s dinner needs it earlier`,
        );
      }
    }
    let toSend: number | null;
    if (packagesNeeded === null) toSend = null;
    else if (pkgP) {
      const short = pkgP.mul(packagesNeeded).minus(coveredP).minus(sentP);
      toSend = packagesFor(D.max(0, short), pkgP);
    } else toSend = Math.max(0, packagesNeeded - coveredByOrder - sent - uncertain);

    const fingerprint = hashOf({
      key,
      meal: mealQty ? [mealQty.toDecimalPlaces(6).toString(), mealUnit] : null,
      mealUnitConflict,
      requests: reqs.map((r) => (r.productId ? [r.id, r.kind, r.packages, r.productId] : [r.id, r.kind, r.packages])).sort(),
      availability: avail ? avail.id : null,
      product: product ? [product.id, product.packageQty, product.packageUnit] : null,
      packagesNeeded,
      coveredByOrder,
      covered: coveredP.toDecimalPlaces(6).toString(),
      unresolved: unresolved.filter((u) => !u.startsWith("A transfer outcome")),
    });
    const ap = input.approvals.find((a) => a.ingredientKey === key);
    const approval = ap
      ? { id: ap.id, packages: ap.packages, valid: ap.lineFingerprint === fingerprint && ap.packages === toSend && ap.productId === product?.id }
      : null;

    let status: LineStatus;
    if (missing > 0 && toSend && toSend > 0) status = "missing";
    else if (toSend === 0 && uncertain > 0) status = "uncertain";
    else if (toSend === 0 && sent > 0) status = "in_cart_transfer";
    else if (toSend === 0 && received > 0 && received >= ordered - missing && ordered > 0) status = "received";
    else if (toSend === 0 && coveredByOrder > 0) status = "ordered";
    else if (toSend === 0) status = "nothing_needed";
    else if (orderActive && toSend !== null && toSend > 0 && approval?.valid && unresolved.length === 0) status = "approved";
    else if (orderActive) status = "not_sent_yet";
    else if (approval?.valid && unresolved.length === 0) status = "approved";
    else status = "needs_review";

    const usageCostMinor =
      mealQty && pkgInMealUnit && price ? Number(mealQty.div(pkgInMealUnit).mul(price.amountMinor).toDecimalPlaces(0, D.ROUND_HALF_UP)) : mealQty ? null : 0;
    const pickupCostMinor = packagesNeeded === null ? null : packagesNeeded === 0 ? 0 : price ? packagesNeeded * price.amountMinor : null;
    const outstandingCostMinor = toSend === null ? null : toSend === 0 ? 0 : price ? toSend * price.amountMinor : null;
    // Received goods beyond what the plan and requests need are applicable, unallocated supply.
    let receivedSurplus: RequirementLine["receivedSurplus"] = null;
    if (pkgP && unitP && receivedP.gt(0)) {
      const mealP = netMeal && mealUnit ? convert(netMeal, mealUnit, unitP) : new D(0);
      const wantP = D.max(mealP ?? new D(0), pkgP.mul(packagesUsual)).plus(pkgP.mul(packagesExtra));
      const surplus = receivedP.minus(wantP);
      if (surplus.gt(0)) receivedSurplus = { quantity: surplus.toDecimalPlaces(2).toString(), unit: unitP };
    }

    lines.push({
      key,
      ingredientKey,
      name: ing?.name ?? reqs[0]?.text ?? key,
      meal: mealQty && mealUnit ? { quantity: mealQty.toDecimalPlaces(3).toString(), unit: normalizeUnit(mealUnit), sources: m!.sources } : null,
      mealUnitConflict,
      requests: reqs.map((r) => ({ id: r.id, kind: r.kind, packages: r.packages, text: r.text, contributors: r.contributors, productId: r.productId ?? null })),
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
      productIssue,
      approval,
      fingerprint,
      status,
      usageCostMinor,
      pickupCostMinor,
      outstandingCostMinor,
      receivedSurplus,
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
  const outstandingPurchase = costFrom(lines.filter((l) => l.toSend !== 0).map((l) => l.outstandingCostMinor), currency);

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
    outstandingPurchase,
    budget: { status: budgetStatus, scope: input.budget.scope, limitMinor: input.budget.limitMinor, firm: input.budget.firm },
  };
}

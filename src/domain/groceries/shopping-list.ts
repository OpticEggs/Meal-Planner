import { hashOf } from "../hash";
import { D, normalizeUnit } from "../units";
import type { Destination, RequirementLine } from "./projection";
import type { ItemState, ShoppingItem, ShoppingList } from "./shopping-list-format";
export type { ItemState, ShoppingItem, ShoppingList } from "./shopping-list-format";
export { amountText, shoppingListCsv, shoppingListText } from "./shopping-list-format";

/**
 * The household's grocery list as words and amounts, for any way of shopping (multi-source
 * handoff, phase 4). It is built from the same requirement lines as the review, so it can never
 * disagree with it. Unknown stays unknown: an amount Table can't state is listed as unknown, a price
 * is shown only when the chosen way of shopping has one, and nothing here records a purchase.
 */

export function buildShoppingList(lines: RequirementLine[], destination: Destination): ShoppingList {
  const items: ShoppingItem[] = [];
  for (const l of lines) {
    const requests = l.requests;
    const packages = requests.reduce((a, r) => a + (r.packages ?? 1), 0);
    const contributors = [...new Set(requests.flatMap((r) => r.contributors.map((c) => c.name)))];
    const notes: string[] = [];
    // A line stored before netMeal existed falls back to the full meal amount (never to "covered").
    const netSrc = l.netMeal === undefined ? l.meal : l.netMeal;
    const net = netSrc && new D(netSrc.quantity).gt(0) ? { quantity: netSrc.quantity, unit: normalizeUnit(netSrc.unit) } : null;
    let state: ItemState = "to_buy";
    if (l.availability?.state === "enough" && packages === 0) {
      state = "have_enough";
      notes.push(`${l.availability.memberName} said you have enough`);
    } else if (!net && !l.mealUnitConflict && packages === 0 && l.meal) {
      state = "have_enough";
      notes.push("Covered by what you have at home");
    }
    if (l.mealUnitConflict) {
      state = "unknown_amount";
      notes.push(`Amounts in different units can't be added: ${l.mealUnitConflict.join(", ")}`);
    }
    if (l.ordered > 0) {
      state = "already_ordered";
      notes.push(`${l.ordered} package(s) are in the confirmed order — buy more only if you still need it`);
    } else if (l.sent > 0 || l.uncertain > 0) {
      state = "sent_to_cart";
      notes.push(l.uncertain > 0 ? "A cart transfer for this is uncertain — check that cart first" : "Already sent to a store cart");
    }
    if (l.availability?.state === "some" && l.homeSupply) notes.push(`${l.availability.memberName} has some at home; the amount accounts for it`);
    const store = destination === "retailer_cart" && l.product ? l : null;
    items.push({
      key: l.key,
      name: l.name,
      state,
      amount: net,
      packages,
      storePackages: store ? l.toSend : null,
      priceMinor: store && l.price ? l.price.amountMinor : null,
      notes,
      contributors,
    });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  const fingerprint = hashOf({ destination, items: items.map((i) => [i.key, i.state, i.amount, i.packages, i.storePackages, i.priceMinor]) });
  return { destination, items, fingerprint };
}


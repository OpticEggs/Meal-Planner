import type { Destination } from "./projection";

/** Shopping-list types and their plain-text/CSV forms. No hashing or server code here: the
 *  client renders and copies these (multi-source handoff, phase 4). */

export type ItemState = "to_buy" | "have_enough" | "already_ordered" | "sent_to_cart" | "unknown_amount";

export interface ShoppingItem {
  key: string;
  name: string;
  state: ItemState;
  /** Amount to buy in a cooking unit (the dinners' net need), when known. */
  amount: { quantity: string; unit: string } | null;
  /** Usual/extra requests counted in packages (no package size implied). */
  packages: number;
  /** Store packages and price — only for the store cart, where a product is chosen. */
  storePackages: number | null;
  priceMinor: number | null;
  notes: string[];
  contributors: string[];
}

export interface ShoppingList {
  destination: Destination;
  items: ShoppingItem[];
  /** Identity of exactly what a list request would contain (stale-review protection for links). */
  fingerprint: string;
}

const STATE_WORDS: Record<ItemState, string> = {
  to_buy: "to buy",
  have_enough: "have enough",
  already_ordered: "already ordered",
  sent_to_cart: "sent to a cart earlier",
  unknown_amount: "amount unknown",
};

export function amountText(i: ShoppingItem): string {
  const parts: string[] = [];
  if (i.amount) parts.push(`${i.amount.quantity} ${i.amount.unit}`);
  if (i.packages) parts.push(`${i.packages} package${i.packages === 1 ? "" : "s"} (requested)`);
  if (!parts.length) parts.push(i.state === "to_buy" || i.state === "unknown_amount" ? "amount unknown" : "—");
  return parts.join(" + ");
}

const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;

/** Plain text for copying. Says what it is: a list, not an order. */
export function shoppingListText(list: ShoppingList, meta: { title: string; destinationLabel: string; priceLabel: string | null }): string {
  const out = [`${meta.title} — ${meta.destinationLabel}`, "A shopping list only: copying it doesn't order, send or record anything.", ""];
  const groups: [string, ShoppingItem[]][] = [
    ["To buy", list.items.filter((i) => i.state === "to_buy" || i.state === "unknown_amount")],
    ["Check first", list.items.filter((i) => i.state === "already_ordered" || i.state === "sent_to_cart")],
    ["Already have", list.items.filter((i) => i.state === "have_enough")],
  ];
  for (const [label, items] of groups) {
    if (!items.length) continue;
    out.push(`${label}:`);
    for (const i of items) {
      const store = i.storePackages !== null ? ` — ${i.storePackages} store package(s)${i.priceMinor !== null ? ` at ${money(i.priceMinor)} each` : ", price unknown"}` : "";
      const who = i.contributors.length ? ` (asked by ${i.contributors.join(", ")})` : "";
      out.push(`- ${i.name}: ${amountText(i)}${store}${who}${i.notes.length ? ` — ${i.notes.join("; ")}` : ""}`);
    }
    out.push("");
  }
  if (meta.priceLabel) out.push(meta.priceLabel);
  return out.join("\n").trimEnd() + "\n";
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  // Quote every cell; neutralize spreadsheet formulas in text cells.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function shoppingListCsv(list: ShoppingList): string {
  const head = ["item", "state", "amount", "unit", "requested_packages", "store_packages", "price_each", "asked_by", "notes"];
  const rows = list.items.map((i) => [
    i.name, STATE_WORDS[i.state], i.amount?.quantity ?? (i.state === "to_buy" || i.state === "unknown_amount" ? "unknown" : ""), i.amount?.unit ?? "", i.packages || "",
    i.storePackages ?? "", i.priceMinor === null ? (i.storePackages !== null ? "unknown" : "") : (i.priceMinor / 100).toFixed(2), i.contributors.join("; "), i.notes.join("; "),
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

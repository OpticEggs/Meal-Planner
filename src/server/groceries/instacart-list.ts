import { readFileSync } from "node:fs";
import path from "node:path";
import { hashOf } from "@/domain/hash";
import { normalizeUnit } from "@/domain/units";
import { amountText, type ShoppingList } from "@/domain/groceries/shopping-list";
import { instacartUnitFor, type TableUnit } from "../integrations/instacart/units";
import type { ShoppingListLine } from "../integrations/instacart/client";
import { sharedInstacartFake, transportFor, type Transport } from "../integrations/instacart/transport";
import { instacartFakeTransportEnabled } from "../integrations/instacart/config";

/**
 * What an Instacart shopping-list link would contain, built from the reviewed shopping list:
 * names and measurements of what is still to buy. Lines whose amount Table can't state in a unit
 * Instacart lists are NOT sent and are named, so the member decides with the full picture. The
 * fingerprint binds a request to exactly this content (stale review → nothing is requested).
 */
export interface InstacartPreview {
  lines: (ShoppingListLine & { key: string })[];
  notIncluded: { key: string; name: string; reason: string }[];
  fingerprint: string;
}

export function instacartPreview(list: ShoppingList, destinationRevision: number): InstacartPreview {
  const lines: InstacartPreview["lines"] = [];
  const notIncluded: InstacartPreview["notIncluded"] = [];
  for (const i of list.items) {
    if (i.state === "have_enough") continue;
    if (i.state === "already_ordered" || i.state === "sent_to_cart") {
      notIncluded.push({ key: i.key, name: i.name, reason: i.notes[0] ?? "already bought another way" });
      continue;
    }
    if (i.amount) {
      const unit = normalizeUnit(i.amount.unit) as TableUnit;
      const m = instacartUnitFor(unit);
      if (!m.supported) {
        notIncluded.push({ key: i.key, name: i.name, reason: `amount in ${unit} isn't a unit Instacart lists` });
        continue;
      }
      lines.push({ key: i.key, name: i.name, quantity: i.amount.quantity, unit, displayText: `${i.name} — ${amountText(i)}` });
    } else if (i.packages > 0) {
      // A requested package count says how many, not how big: sent as a count, labeled as packages.
      lines.push({ key: i.key, name: i.name, quantity: String(i.packages), unit: "each", displayText: `${i.name} — ${i.packages} package${i.packages === 1 ? "" : "s"}` });
    } else {
      notIncluded.push({ key: i.key, name: i.name, reason: "amount unknown" });
    }
  }
  return { lines, notIncluded, fingerprint: hashOf({ destinationRevision, list: list.fingerprint, lines, notIncluded }) };
}

/** Transport for Instacart calls. In the test environment with TABLE_INSTACART_FAKE_TRANSPORT=1 the
 *  in-process recording fake replays the doc-shaped fixtures in tests/fixtures/instacart (scenario
 *  chosen by TABLE_INSTACART_FAKE_SCENARIO); otherwise the real transport, used only when a
 *  capability is activated and configured (never in tests). */
export function instacartTransport(): Transport {
  if (!instacartFakeTransportEnabled()) return transportFor();
  const fake = sharedInstacartFake();
  const dir = path.join(process.cwd(), "tests", "fixtures", "instacart");
  const file = (name: string) => readFileSync(path.join(dir, `${name}.json`), "utf8");
  fake.script((req) => {
    const scenario = process.env.TABLE_INSTACART_FAKE_SCENARIO ?? "ok";
    if (req.url.includes("/idp/v1/retailers")) return scenario === "retailers_401" ? { status: 401, body: file("error-401") } : { status: 200, body: file("retailers-ok") };
    if (scenario === "list_500") return { status: 500, body: file("error-500") };
    if (scenario === "list_403") return { status: 403, body: file("error-403") };
    if (scenario === "list_timeout") return { hang: true };
    return { status: 200, body: file("products-link-ok") };
  });
  return fake.transport;
}

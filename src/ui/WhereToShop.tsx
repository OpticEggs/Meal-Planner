"use client";
import { useState } from "react";
import { useStore } from "./store";
import { FormAlert } from "./forms";
import { amountText, shoppingListCsv, shoppingListText, type ShoppingList } from "@/domain/groceries/shopping-list-format";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CAP_WORDS: Record<string, string> = {
  not_configured: "Not set up here — it needs Instacart developer access. You can still choose it and copy the list.",
  configured_fixture_only: "Test setup only (recorded examples) — never checked with Instacart.",
  configured_not_verified: "Set up, but never checked with Instacart yet.",
};

export function destinationLabel(where: any, retailer: any): string {
  if (where.destination === "instacart_list") return "Instacart shopping list";
  if (where.destination === "manual") return where.storeLabel ? `Another store: ${where.storeLabel}` : "Another store (copy the list)";
  return `${retailer.live ? retailer.label : "Simulated retailer"} cart`;
}

/** Where to shop: a way of buying for this pickup, chosen deliberately. Switching changes the grocery
 *  review (store packages and prices belong to the store cart) — never the dinners. */
export function WhereToShop() {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const g = snapshot.groceries;
  const where = g.where;
  const [choice, setChoice] = useState<string>(where.destination);
  const [store, setStore] = useState<string>(where.storeLabel ?? "");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listCap = where.instacart.capabilities.find((c: any) => c.capability === "list");
  const cartName = snapshot.retailer.live ? snapshot.retailer.label : "Simulated retailer";
  const options = [
    { v: "retailer_cart", label: `${cartName} cart`, help: snapshot.retailer.live ? "Send the approved packages to the store's cart; checkout and pickup stay with the store." : "The simulated retailer: transfers are recorded here and never reach a store." },
    { v: "instacart_list", label: "Instacart shopping list", help: `A link to a shopping list on Instacart, where you pick the store, products and checkout. Not a cart transfer and not an order. ${CAP_WORDS[listCap?.status] ?? ""}` },
    { v: "manual", label: "Another store — copy the list", help: "Copy or download the list and shop anywhere. Copying doesn't order or record anything." },
  ];
  const changed = choice !== where.destination || (choice === "manual" && store.trim() !== (where.storeLabel ?? ""));
  return (
    <div className="card stack" data-testid="where-to-shop">
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="section-label" style={{ margin: 0 }}>Where to shop</legend>
        <p className="small" style={{ margin: 0 }} data-testid="destination-current">
          Now: <strong>{destinationLabel(where, snapshot.retailer)}</strong>{where.setBy ? ` · chosen by ${where.setBy}` : ""}
        </p>
        {options.map((o) => (
          <label key={o.v} className="row small" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <input type="radio" name="destination" value={o.v} checked={choice === o.v} onChange={() => setChoice(o.v)} aria-describedby={`dest-help-${o.v}`} />
            <span><strong>{o.label}</strong><br /><span id={`dest-help-${o.v}`} className="faint">{o.help}</span></span>
          </label>
        ))}
        {choice === "manual" && (
          <label className="small">Store name (optional)<input value={store} onChange={(e) => setStore(e.target.value)} maxLength={80} /></label>
        )}
      </fieldset>
      <FormAlert message={error} testId="destination-error" />
      {changed && (
        <div className="stack">
          <p className="small warn" style={{ margin: 0 }}>Switching changes the grocery review: store packages, prices and purchase approvals apply only to the store cart, so they must be reviewed again. Dinners and requests don&apos;t change.</p>
          <label className="row small"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Use this for future weeks too</label>
          <button type="button" className="btn primary" disabled={!writesAllowed} data-testid="destination-save" onClick={async () => {
            const r = await command("SetShoppingDestination", { weekId: snapshot.week.id, destination: choice, expectedRevision: where.revision, storeLabel: choice === "manual" ? store : null, remember });
            if (r.status === "accepted") {
              setError(null);
              announce(`Where to shop: ${options.find((o) => o.v === choice)!.label}. Review the groceries again.`);
            } else {
              setError(r.message);
              setChoice(where.destination);
            }
          }}>Switch to {options.find((o) => o.v === choice)!.label}</button>
        </div>
      )}
    </div>
  );
}

export function ShoppingListCard({ open = false }: { open?: boolean }) {
  const { snapshot, announce } = useStore();
  const g = snapshot.groceries;
  const list: ShoppingList = g.shoppingList;
  const label = destinationLabel(g.where, snapshot.retailer);
  const priceLabel = g.where.destination === "retailer_cart" ? (snapshot.retailer.live ? null : "Prices are simulated-store observations, not a real store's prices.") : `No prices are known for ${label}.`;
  const text = () => shoppingListText(list, { title: `Groceries for the week of ${snapshot.week.weekStart ?? ""}`.trim(), destinationLabel: label, priceLabel });
  const toBuy = list.items.filter((i) => i.state === "to_buy" || i.state === "unknown_amount");
  const [shown, setShown] = useState(open);
  return (
    <div className="card stack" data-testid="shopping-list" data-open={shown ? "true" : "false"}>
      <button type="button" className="link" aria-expanded={shown} aria-controls="shopping-list-body" data-testid="shopping-list-toggle" onClick={() => setShown(!shown)}
        style={{ textAlign: "left" }}>
        <strong>Grocery list</strong> <span className="faint small">({toBuy.length} to buy) — copy or download</span>
      </button>
      {shown && <div className="stack" id="shopping-list-body">
        <p className="small faint" style={{ margin: 0 }}>A list only: copying or downloading it doesn&apos;t order, send or record anything.</p>
        <div className="row">
          <button type="button" className="btn line small" data-testid="copy-list" onClick={async () => {
            try {
              await navigator.clipboard.writeText(text());
              announce("Grocery list copied. Nothing was ordered or sent.");
            } catch {
              announce("Copying isn't allowed here; use Download instead.");
            }
          }}>Copy grocery list</button>
          <a className="btn line small" data-testid="download-csv" download="table-groceries.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(shoppingListCsv(list))}`}>Download CSV</a>
        </div>
        <ul className="plain small" data-testid="shopping-items">
          {list.items.map((i) => (
            <li key={i.key} data-testid="shopping-item" data-state={i.state}>
              <strong>{i.name}</strong>: {amountText(i)}
              {i.storePackages !== null ? ` · ${i.storePackages} store package(s)${i.priceMinor !== null ? ` at $${(i.priceMinor / 100).toFixed(2)}` : ", price unknown"}` : ""}
              {i.state !== "to_buy" ? <span className="faint"> — {i.state === "have_enough" ? "have enough" : i.state === "already_ordered" ? "already ordered" : i.state === "sent_to_cart" ? "sent to a cart earlier" : "amount unknown"}</span> : null}
              {i.notes.length > 0 && <div className="faint">{i.notes.join("; ")}</div>}
            </li>
          ))}
        </ul>
      </div>}
    </div>
  );
}

const LINK_WORDS: Record<string, string> = {
  requested: "Requested — waiting for Instacart",
  canceled_before_request: "Not requested — the list changed first",
  link_prepared: "Shopping list ready on Instacart",
  failed: "Instacart refused the request — nothing was made",
  uncertain: "Unknown outcome — Instacart may or may not have made the list",
};

export function InstacartPanel() {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const g = snapshot.groceries;
  const ic = g.where.instacart;
  const preview = ic.preview;
  const listCap = ic.capabilities.find((c: any) => c.capability === "list");
  const retailersCap = ic.capabilities.find((c: any) => c.capability === "retailers");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [zip, setZip] = useState("");
  const [brands, setBrands] = useState<any>(null);
  const latest = ic.links[0];
  if (!preview) return null;
  return (
    <div className="card stack" data-testid="instacart-panel">
      <div className="section-label" style={{ margin: 0 }}>Instacart shopping list</div>
      <p className="small" style={{ margin: 0 }}>Table can make a link to a shopping list on Instacart with these items. On Instacart you choose the store, the products and checkout. Making the link doesn&apos;t add anything to a cart or place an order.</p>
      <p className="small faint" style={{ margin: 0 }} data-testid="instacart-capability">{CAP_WORDS[listCap?.status] ?? listCap?.reason}</p>
      <ul className="plain small" data-testid="instacart-lines">
        {preview.lines.map((l: any) => <li key={l.key}>{l.displayText}</li>)}
      </ul>
      {preview.notIncluded.length > 0 && (
        <div className="small warn" data-testid="instacart-not-included">
          Not included: {preview.notIncluded.map((x: any) => `${x.name} (${x.reason})`).join("; ")}
        </div>
      )}
      <FormAlert message={error} testId="instacart-error" />
      {latest && (
        <div className="small" data-testid="instacart-link" data-status={latest.status}>
          <strong>{LINK_WORDS[latest.status] ?? latest.status}</strong>{` · asked by ${latest.by}`}
          {latest.status === "link_prepared" && latest.url && latest.listFingerprint === preview.fingerprint && (
            <div><a className="btn line small" href={latest.url} target="_blank" rel="noopener noreferrer" data-testid="open-instacart">Open the shopping list on Instacart ↗</a> <span className="faint">Nothing has been ordered.</span></div>
          )}
          {latest.status === "link_prepared" && latest.listFingerprint !== preview.fingerprint && <div className="warn">That link is for an earlier list. Make a new one for the current list.</div>}
          {latest.status === "uncertain" && <div className="warn">Table won&apos;t repeat the request on its own. Check Instacart, or make a new list knowingly — it may create a second list.</div>}
        </div>
      )}
      <button type="button" className="btn primary" data-testid="make-instacart-list"
        disabled={busy || !writesAllowed || listCap?.status === "not_configured" || !preview.lines.length}
        onClick={async () => {
          setBusy(true);
          const r = await command("PrepareInstacartList", { weekId: snapshot.week.id, listFingerprint: preview.fingerprint, destinationRevision: g.where.revision });
          setBusy(false);
          if (r.status !== "accepted") setError(r.message);
          else {
            setError(null);
            announce(r.link?.status === "link_prepared" || r.result?.reused ? "The Instacart shopping list is ready to open. Nothing was ordered." : `Instacart list: ${LINK_WORDS[r.link?.status] ?? "requested"}.`);
          }
        }}>{latest?.status === "uncertain" ? "Make a new Instacart list" : "Make an Instacart shopping list"}</button>
      {listCap?.status === "not_configured" && <p className="small faint" style={{ margin: 0 }}>Not set up here, so nothing can be sent to Instacart. The list above can still be copied.</p>}
      <form className="stack" aria-label="Instacart retailers near a ZIP code" onSubmit={async (e) => {
        e.preventDefault();
        const r = await fetch(`/api/instacart/retailers?postal_code=${encodeURIComponent(zip)}`, { cache: "no-store" }).then((x) => x.json(), () => ({ kind: "failed" }));
        setBrands(r);
      }}>
        <label className="small">ZIP code — which grocery brands Instacart lists nearby<input value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" autoComplete="postal-code" maxLength={10} /></label>
        <button type="submit" className="btn line small" disabled={retailersCap?.status === "not_configured"}>Look up retailers</button>
        {retailersCap?.status === "not_configured" && <span className="small faint">Retailer lookup isn&apos;t set up here; no nearby results are shown.</span>}
        {brands && (
          <div className="small" role="status" data-testid="instacart-brands">
            {brands.kind === "ok"
              ? brands.retailers.length
                ? <>Brands Instacart lists for {brands.postalCode} (a brand, not a particular store; location, pickup and prices not checked): {brands.retailers.map((b: any) => b.name).join(", ")}</>
                : "Instacart listed no retailers for that ZIP code."
              : brands.message ?? "No results — the lookup didn't work. Nothing is assumed about nearby stores."}
          </div>
        )}
      </form>
    </div>
  );
}

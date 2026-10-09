"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { AlsoNeed } from "./AlsoNeed";
import { budgetText, costView, money, qty } from "./format";
import { focusFirst } from "./a11y";
import {
  CartCheckDialog, ConfirmOrderDialog, CorrectReceiptDialog, KrogerMatchDialog, PartialHandoffDialog, ProductDialog, RemoveRequestDialog, SubstituteDialog, ValidateSubstituteDialog,
  type GroceryDialog,
} from "./GroceryDialogs";
import { InstacartPanel, ShoppingListCard, WhereToShop, destinationLabel } from "./WhereToShop";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS: Record<string, string> = {
  nothing_needed: "Nothing to buy",
  needs_review: "Needs review",
  approved: "Approved",
  in_cart_transfer: "Sent to cart",
  uncertain: "Uncertain — check cart",
  ordered: "Ordered",
  received: "Received",
  missing: "Missing from pickup — still needed",
  not_sent_yet: "Not sent yet",
};

/** Transfer states in words (B15): never only a color or a raw code. */
export const BATCH_STATUS: Record<string, string> = {
  authorized: "Approved — not sent yet",
  dispatch_started: "Sending to the cart…",
  acknowledged: "Sent to cart — the store acknowledged the transfer",
  failed: "Not in the cart — the transfer failed",
  canceled_before_dispatch: "Not sent — canceled before sending",
  uncertain: "Uncertain — check the cart",
};

const ISSUE: Record<string, string> = {
  none_chosen: "No product chosen",
  unknown: "Product unknown",
  unavailable: "Product unavailable at this store",
  conflict: "Conflicting products requested",
};

type Opener = (d: GroceryDialog, e: React.SyntheticEvent<HTMLElement>) => void;

/** Where focus goes when a dialog's opener is gone (B15): a surviving control near what it was about. */
function groceryFallback(d: GroceryDialog): HTMLElement | null {
  const q = (sel: string) => () => document.querySelector<HTMLElement>(sel);
  const line = "key" in d ? `[data-testid="line-${d.key}"]` : null;
  return focusFirst(
    line ? q(`${line} button:not([disabled])`) : null,
    d.kind === "cart-check" ? q('[data-testid="transfers"] button:not([disabled])') : null,
    d.kind === "cart-check" ? q('[data-testid="transfers"]') : null,
    ["confirm-order", "substitute", "validate", "correct"].includes(d.kind) ? q('[data-testid="order"] button:not([disabled])') : null,
    ["confirm-order", "substitute", "validate", "correct"].includes(d.kind) ? q('[data-testid="order"]') : null,
    q('[data-testid="readiness"]'),
  );
}

function diffLines(before: any[], after: any[]): string[] {
  const out: string[] = [];
  const keys = new Set([...before.map((l) => l.key), ...after.map((l) => l.key)]);
  for (const k of keys) {
    const a = before.find((l) => l.key === k);
    const b = after.find((l) => l.key === k);
    const qa = a?.meal ? Number(a.meal.quantity) : 0;
    const qb = b?.meal ? Number(b.meal.quantity) : 0;
    const name = (b ?? a).name;
    if (qa === qb) {
      if ((a?.packagesNeeded ?? 0) !== (b?.packagesNeeded ?? 0)) out.push(`${name}: ${a?.packagesNeeded ?? 0} → ${b?.packagesNeeded ?? 0} package(s).`);
      continue;
    }
    if (qa === 0) out.push(`${name} is now needed for dinner.`);
    else if (qb === 0) out.push(`${name} is no longer required for dinner${b?.requests?.length ? " (your separate request stays)" : ""}.`);
    else out.push(`${name} ${qb > qa ? "increased" : "decreased"}.`);
  }
  return out;
}

export function GroceriesScreen() {
  const { snapshot, command, writesAllowed, lastChange } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const reviewBase = useRef<{ rev: number; lines: any[] } | null>(null);
  const [delta, setDelta] = useState<{ text: string | null; lines: string[] } | null>(null);
  const [dialog, setDialog] = useState<{ d: GroceryDialog; opener: HTMLElement | null } | null>(null);
  const g = snapshot?.groceries;
  const open: Opener = (d, e) => setDialog({ d, opener: e.currentTarget });

  // Keep what the reviewer last saw; when the projection changes underneath, show the delta.
  useEffect(() => {
    if (!g) return;
    if (!reviewBase.current) reviewBase.current = { rev: g.projectionRevision, lines: g.lines };
    else if (g.projectionRevision !== reviewBase.current.rev) {
      const d = diffLines(reviewBase.current.lines, g.lines);
      if (d.length) setDelta({ text: lastChange?.text ?? null, lines: d });
      reviewBase.current = { rev: g.projectionRevision, lines: g.lines };
    }
  }, [g, lastChange]);

  if (!snapshot) return <p className="muted">Loading…</p>;
  if (!g)
    return (
      <section aria-label="Groceries">
        <p className="muted">Nothing on this pickup list yet. Add what you need — dinners don’t have to be chosen first.</p>
        <AlsoNeed from="groceries" />
      </section>
    );
  const s = g.summary;
  const storeCart = !g.where || g.where.destination === "retailer_cart";
  // Lines whose packages have no recorded price (the same rule a line uses to say "price unknown").
  const unpriced = g.lines.filter((l: any) => (l.toSend ?? 0) > 0 && (!l.product || !l.price));
  const sendable = g.lines.filter((l: any) => l.toSend === null || l.toSend > 0);
  const approvable = sendable.filter((l: any) => l.product && l.price && l.toSend > 0 && l.unresolved.length === 0 && !l.approval?.valid);

  async function approve(lines: any[]) {
    const r = await command("ApprovePurchaseLines", { weekId: snapshot.week.id, lines: lines.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
    setMsg(r.status === "accepted" ? null : r.message);
  }
  async function send() {
    const r = await command("StartHandoff", { weekId: snapshot.week.id, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
    setMsg(r.status === "accepted" ? `Transfer ${r.dispatch?.status ?? "recorded"}${snapshot.retailer.live ? "" : " — simulated; nothing was sent to a store"}.` : r.message);
  }

  return (
    <section aria-label="Groceries" data-testid="groceries" data-projection-revision={g.projectionRevision}>
      <h2 className="page-title">Groceries</h2>
      {delta && (
        // Not a live region: the announcer says once that approved lines need review again; this
        // is the readable detail, and it never takes focus from what the member is doing.
        <div className="warnbox" role="group" aria-label="Changed since you started reviewing" data-testid="grocery-delta">
          {delta.text && <strong>{delta.text}. </strong>}
          {delta.lines.join(" ")}
          <button className="btn line small" onClick={() => { setDelta(null); focusFirst(document.querySelector<HTMLElement>('[data-testid="readiness"]')); }}>Got it</button>
        </div>
      )}
      {g.where && <WhereToShop />}
      {/* Pickup estimate (visual update): a large figure only when every package has a price; an
          incomplete estimate stays visibly incomplete and says which lines lack a price. */}
      <div className="card stack" data-testid="pickup-card">
        <div className="section-label" style={{ margin: 0 }}>Pickup estimate</div>
        <p className={s.pickupSpending?.complete ? "estimate-total" : "estimate-partial"} data-testid="groceries-pickup-estimate">{costView(s.pickupSpending)}</p>
        {storeCart
          ? <p className="faint small" style={{ margin: 0 }}>For the packages in this purchase, at {snapshot.retailer.live ? `${snapshot.retailer.label} prices` : "simulated store prices"}.</p>
          : <p className="faint small" style={{ margin: 0 }} data-testid="destination-prices">Table has no prices for {destinationLabel(g.where, snapshot.retailer)}: package sizes and prices are recorded only for the store cart.</p>}
        {!s.pickupSpending?.complete && unpriced.length > 0 && (
          <details className="small">
            <summary>Why isn&apos;t this a total?</summary>
            <p style={{ margin: "6px 0" }}>These lines have no recorded price, so the total can&apos;t be known yet:</p>
            <ul>{unpriced.map((l: any) => <li key={l.key}>{l.name}</li>)}</ul>
          </details>
        )}
        <details className="small">
          <summary>How this is estimated</summary>
          <p style={{ margin: "6px 0 0" }}>Prices are estimates from recorded observations, not a guaranteed checkout total; the store may change final charges.</p>
        </details>
        <div className="statrow">
          <div><span>Dinner ingredients</span><strong>{costView(s.dinnerIngredientCost)}</strong><em className="faint small">value used by planned dinners</em></div>
          <div><span>Still to buy</span><strong data-testid="still-to-buy" aria-describedby="still-to-buy-help">{costView(s.outstandingPurchase)}</strong><em id="still-to-buy-help" className="faint small">after what is sent, ordered or received</em></div>
          <div><span>Budget</span><strong>{budgetText(s.budget)}</strong></div>
        </div>
      </div>
      <div className={`card ${s.ready ? "ok" : ""}`} data-testid="readiness" role="group" aria-label="Grocery readiness" tabIndex={-1}>
        {s.ready ? <strong>Groceries ready to send.</strong> : (
          <>
            <strong>Not ready yet</strong>
            <ul className="small">{s.readyBlockers.slice(0, 8).map((b: string) => <li key={b}>{b}</li>)}</ul>
          </>
        )}
      </div>
      {msg && <p role="alert" className="warnbox" data-testid="grocery-msg">{msg}</p>}
      {!storeCart && <ShoppingListCard open />}
      {g.where?.destination === "instacart_list" && <InstacartPanel />}
      {storeCart && <div className="row">
        <button className="btn line" disabled={!approvable.length || !writesAllowed} onClick={() => approve(approvable)} data-testid="approve-all">Approve {approvable.length} reviewable</button>
        <button className="btn primary" disabled={!s.ready || !writesAllowed || !snapshot.retailer.ready} onClick={send} data-testid="send">
          Send to {snapshot.retailer.live ? snapshot.retailer.label : "Simulated retailer"}
        </button>
        {g.partial?.eligible.length > 0 && !s.ready && (
          <button className="btn line" aria-haspopup="dialog" disabled={!writesAllowed || !snapshot.retailer.ready} data-testid="prepare-partial"
            onClick={(e) => open({ kind: "partial" }, e)}>Prepare supported items…</button>
        )}
      </div>}
      {storeCart && !snapshot.retailer.ready && <p className="warn small">{snapshot.retailer.reason}</p>}
      {storeCart && g.shoppingList && <ShoppingListCard />}
      <div className="section-label">Also need</div>
      <AlsoNeed from="groceries" />
      <div className="section-label">This week’s list</div>
      {storeCart && snapshot.retailer.mode === "kroger" && g.lines.some((l: any) => l.ingredientKey && (!l.product || l.product.retailer !== snapshot.retailer.mode)) && (
        <button className="btn line small" aria-haspopup="dialog" data-testid="kroger-match" onClick={(e) => open({ kind: "kroger-match" }, e)}>Match products at Kroger…</button>
      )}
      <ul className="lines">
        {g.lines.map((l: any) => <Line key={l.key} l={l} open={open} />)}
      </ul>
      {(s.householdSeasonings ?? []).length > 0 && (
        <p className="small muted seasonings" data-testid="household-seasonings">
          Not on the list: {s.householdSeasonings.map((x: any) => x.name).join(", ")} — household seasonings you already have.
        </p>
      )}
      <Transfers open={open} />
      <Order open={open} />
      {dialog && <DialogFor d={dialog.d} onClose={() => setDialog(null)} returnFocus={() => focusFirst(dialog.opener) ?? groceryFallback(dialog.d)} />}
    </section>
  );
}

function DialogFor({ d, onClose, returnFocus }: { d: GroceryDialog; onClose: () => void; returnFocus: () => void }) {
  const common = { onClose, returnFocus };
  switch (d.kind) {
    case "product": return <ProductDialog itemKey={d.key} {...common} />;
    case "remove-request": return <RemoveRequestDialog itemKey={d.key} requestId={d.requestId} {...common} />;
    case "confirm-order": return <ConfirmOrderDialog {...common} />;
    case "substitute": return <SubstituteDialog orderLineId={d.orderLineId} {...common} />;
    case "validate": return <ValidateSubstituteDialog receiptId={d.receiptId} {...common} />;
    case "correct": return <CorrectReceiptDialog receiptId={d.receiptId} {...common} />;
    case "cart-check": return <CartCheckDialog batchId={d.batchId} {...common} />;
    case "kroger-match": return <KrogerMatchDialog {...common} />;
    case "partial": return <PartialHandoffDialog {...common} />;
  }
}

/** The line's state in words, for the line heading: status, unresolved, product issue. */
function lineState(l: any): string {
  return [STATUS[l.status] ?? l.status, l.productIssue ? ISSUE[l.productIssue] : null, l.unresolved.length ? "Unresolved" : null, l.approval?.valid ? `approved ×${l.approval.packages}` : null]
    .filter(Boolean)
    .join(", ");
}

function Line({ l, open }: { l: any; open: Opener }) {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const [some, setSome] = useState("");
  const [msg, setMsg] = useState<{ text: string; field?: string } | null>(null);
  const staple = l.ingredientKey ? snapshot.staples?.find((st: any) => st.ingredientKey === l.ingredientKey && st.active) : null;
  async function run(name: string, payload: any, field?: string) {
    const r = await command(name, payload);
    setMsg(r.status === "accepted" ? null : { text: r.message, field });
  }
  const weekId = snapshot.week.id;
  const msgId = `line-msg-${l.key}`;
  return (
    <li className={`line st-${l.status}`} data-testid={`line-${l.key}`} data-status={l.status} data-to-send={l.toSend ?? ""}>
      <div className="row between">
        <h3 className="line-name" aria-label={`${l.name}: ${lineState(l)}`}>{l.name}</h3>
        <span className="row" aria-hidden="true">
          <span className={`badge st-${l.status}`}>{STATUS[l.status] ?? l.status}</span>
          {l.productIssue && <span className="badge con-unknown">{ISSUE[l.productIssue]}</span>}
          {l.unresolved.length > 0 && <span className="badge con-unknown">Unresolved</span>}
        </span>
      </div>
      <div className="small">
        {l.meal && (
          <div>
            Dinners: {qty(l.meal.quantity, l.meal.unit)} —{" "}
            {l.meal.sources.map((s: any) => `${s.recipeTitle.replace("Fixture: ", "")} (${s.cookNight.slice(5)})`).join(", ")}
          </div>
        )}
        {l.requests.map((r: any) => (
          <div key={r.id}>
            {r.kind === "usual" ? "Usual amount" : `Extra ×${r.packages ?? 1}`} — requested by {r.contributors.map((c: any) => `${c.name}${c.taps > 1 ? ` ×${c.taps}` : ""}`).join(", ")}
            <button className="link small" aria-label={`Remove ${r.kind === "usual" ? "usual" : "extra"} request for ${l.name}`} aria-haspopup="dialog" onClick={(e) => open({ kind: "remove-request", key: l.key, requestId: r.id }, e)}>remove</button>
          </div>
        ))}
        {l.product ? (
          <div>
            {l.product.name} · {l.packagesNeeded ?? "?"} pkg needed{l.estimate ? " (variable weight — estimate)" : ""} · {l.price ? `${money(l.price.amountMinor)} each (${l.price.source}${l.product.fixture ? ", fixture" : ""})` : "price unknown"}
          </div>
        ) : null}
        {staple && (
          <div data-testid={`staple-${l.key}`}>
            Your usual: {staple.productName ?? "no product remembered"}
            {staple.productAvailable === false ? " (not available from this store)" : ""}
            {staple.usualPackages > 1 ? ` ×${staple.usualPackages}` : ""}
            {staple.updatedBy ? ` · last set by ${staple.updatedBy}` : ""}
            {l.product && staple.productId !== l.product.id && (
              <>
                {" "}
                <button
                  className="link small"
                  disabled={!writesAllowed}
                  aria-label={`Make ${l.product.name} your usual ${staple.name}`}
                  data-testid={`make-usual-${l.key}`}
                  onClick={async () => {
                    const r = await command("ApproveStapleProduct", { ingredientKey: l.ingredientKey, productId: l.product.id, expectedRevision: staple.productRevision });
                    setMsg(r.status === "accepted" ? null : { text: r.message });
                    if (r.status === "accepted") announce(`${l.product.name} is now your usual ${staple.name}. Future one-tap requests use it; nothing was approved for purchase.`);
                  }}
                >
                  Make this our usual
                </button>
              </>
            )}
          </div>
        )}
        {(l.ordered > 0 || l.sent > 0 || l.uncertain > 0) && (
          <div>History: {l.sent > 0 ? `${l.sent} sent to cart · ` : ""}{l.uncertain > 0 ? `${l.uncertain} uncertain · ` : ""}{l.ordered > 0 ? `${l.ordered} ordered · ` : ""}{l.received > 0 ? `${l.received} received · ` : ""}{l.missing > 0 ? `${l.missing} missing` : ""}</div>
        )}
        {l.toSend !== null && l.toSend > 0 && <div data-testid={`tosend-${l.key}`}>To send: {l.toSend} package(s){snapshot.groceries.order ? " — Not sent yet" : ""}</div>}
        {l.leftAfterMeal && <div>About {qty(l.leftAfterMeal.quantity, l.leftAfterMeal.unit)} left after dinners. <button className="link small" aria-label={`Keep an extra ${l.name}`} onClick={() => run("CaptureHouseholdNeed", { weekId, text: l.name, ingredientKey: l.ingredientKey, kind: "extra", packages: 1, from: "groceries" })}>Keep an extra</button></div>}
        {l.unresolved.map((u: string) => <div key={u} className="warn">{u}</div>)}
        {l.availability && <div className="faint">{l.availability.memberName}: {{ enough: "Have enough", some: `Have some${l.availability.quantity ? ` (${l.availability.quantity} ${l.availability.unit})` : ""}`, need: "Need" }[l.availability.state as string]}</div>}
      </div>
      {l.ingredientKey && l.meal && (
        <div className="row small">
          <input className="tiny" placeholder="amt" value={some} onChange={(e) => setSome(e.target.value)} aria-label={`Amount of ${l.name} on hand (${l.meal.unit})`}
            aria-invalid={msg?.field === "some" ? true : undefined} aria-describedby={msg?.field === "some" ? msgId : undefined} />
          <div className="seg" role="group" aria-label={`Availability for ${l.name}`}>
            <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "enough", reviewed: { quantity: l.meal.quantity, unit: l.meal.unit, fingerprint: l.fingerprint } })} aria-label={`Have enough ${l.name}`}>Have enough</button>
            <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "some", quantity: some || null, unit: some ? l.meal.unit : null }, "some")} aria-label={`Have some ${l.name}`}>Have some</button>
            <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "need" })} aria-label={`Need ${l.name}`}>Need</button>
          </div>
        </div>
      )}
      {!l.ingredientKey && (
        <div className="row small">
          <select aria-label={`Match "${l.name}" to an item`} onChange={(e) => e.target.value && run("MapRequest", { requestId: l.requests[0].id, ingredientKey: e.target.value })} defaultValue="">
            <option value="">Match to an item…</option>
            {snapshot.ingredients.map((i: any) => <option key={i.key} value={i.key}>{i.name}</option>)}
          </select>
        </div>
      )}
      {l.ingredientKey && (
        <div className="row small">
          <button className="link small" aria-haspopup="dialog" aria-label={`${l.product ? "Change product" : "Choose a product"} for ${l.name}`} data-testid={`product-${l.key}`} onClick={(e) => open({ kind: "product", key: l.key }, e)}>
            {l.product ? "change product…" : "choose product…"}
          </button>
          {l.toSend > 0 && l.product && l.price && l.unresolved.length === 0 && (
            l.approval?.valid
              ? <span className="badge">Approved ×{l.approval.packages}</span>
              : <button className="btn line small" disabled={!writesAllowed} onClick={() => run("ApprovePurchaseLines", { weekId, lines: [{ key: l.key, fingerprint: l.fingerprint, packages: l.toSend }] })} aria-label={`Approve ${l.toSend} package${l.toSend === 1 ? "" : "s"} of ${l.name}`}>Approve ×{l.toSend}</button>
          )}
        </div>
      )}
      {msg && <p role="alert" className="warnbox" id={msgId}>{msg.text}</p>}
    </li>
  );
}

function Transfers({ open }: { open: Opener }) {
  const { snapshot } = useStore();
  const batches = snapshot.groceries.batches;
  if (!batches.length) return null;
  return (
    <div className="card stack" data-testid="transfers" tabIndex={-1} role="group" aria-labelledby="transfers-h">
      <h3 className="section-label" id="transfers-h">Cart transfers ({snapshot.retailer.live ? snapshot.retailer.label : "simulated — nothing reached a store"})</h3>
      <ul className="lines">
        {batches.map((b: any, i: number) => (
          <li key={b.id} className="small" data-testid="batch" data-status={b.status}>
            <strong>Transfer {i + 1}{b.scope === "partial" ? " (partial)" : ""}: {BATCH_STATUS[b.status] ?? b.status}</strong> · approved by {b.authorizedBy} · {b.payload.map((x: any) => `${x.ingredientKey} ×${x.packages}`).join(", ")}
            {b.scope === "partial" && (
              <div data-testid="batch-left-out">Left out of this transfer ({b.omitted.length}): {b.omitted.map((o: any) => o.name).join(", ")} — still on your list.</div>
            )}
            <div className="faint">{b.history.map((h: any) => BATCH_STATUS[h.status] ?? h.status).join(" → ")}{b.status === "acknowledged" ? " (batch-level acknowledgment; not an order confirmation)" : ""}</div>
            {b.status === "uncertain" && (
              <div className="row">
                <span className="warn">Outcome unknown. Check the cart; Table will not resend automatically.</span>
                <button className="btn line small" aria-haspopup="dialog" aria-label={`Check the cart for transfer ${i + 1}`} onClick={(e) => open({ kind: "cart-check", batchId: b.id }, e)}>Check the cart…</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="faint small">Checkout and pickup time are chosen at the store’s site. Table does not remove cart items or place orders.</p>
    </div>
  );
}

function Order({ open }: { open: Opener }) {
  const { snapshot, command } = useStore();
  const g = snapshot.groceries;
  const [msg, setMsg] = useState<string | null>(null);
  if (g.order) {
    return (
      <div className="card stack" data-testid="order" tabIndex={-1} role="group" aria-labelledby="order-h">
        <h3 className="section-label" id="order-h">Confirmed order</h3>
        <p className="small">Confirmed by {g.order.confirmedBy}{g.order.pickupAt ? ` · pickup ${new Date(g.order.pickupAt).toLocaleString()}` : " · pickup time not recorded (availability unresolved)"}{g.order.contentsKnown ? "" : " · contents not listed — cannot show what was included"}</p>
        {msg && <p role="alert" className="warnbox">{msg}</p>}
        <ul className="small">
          {g.order.lines.map((l: any) => {
            const got = l.receipts.filter((r: any) => !r.correctedBy).reduce((a: number, r: any) => a + r.packages, 0);
            const record = async (state: "received" | "missing") => {
              const r = await command("RecordReceipt", { orderLineId: l.id, state, packages: l.packages - got });
              setMsg(r.status === "accepted" ? null : r.message);
            };
            return (
              <li key={l.id} data-testid={`order-line-${l.ingredientKey ?? l.name}`}>
                Confirmed: {l.name} ×{l.packages}{l.packageQty ? ` (${l.packageQty} ${l.packageUnit} each)` : l.productId ? "" : " (product not recorded)"}
                {l.receipts.length > 0 && (
                  <ul className="small">
                    {l.receipts.map((r: any) => (
                      <li key={r.id} className={r.correctedBy ? "faint" : ""}>
                        {r.packages} {r.state}{r.substituteText ? `: ${r.substituteText}` : ""}{r.correctsId ? " (correction)" : ""}{r.correctedBy ? " — corrected later" : ""}
                        {r.state === "substituted" && !r.correctedBy && (r.validation ? ` — ${r.validation.suitable ? `works (${r.validation.quantity} ${r.validation.unit})` : "does not work"}` : (
                          <>
                            {" — not yet judged "}
                            <button className="btn line small" aria-haspopup="dialog" aria-label={`Does ${r.substituteText} work for ${l.name}?`} onClick={(e) => open({ kind: "validate", receiptId: r.id }, e)}>Does it work?…</button>
                          </>
                        ))}
                        {!r.correctedBy && (
                          <button className="link small" aria-haspopup="dialog" aria-label={`Correct the receipt for ${l.name} (${r.packages} ${r.state})`} onClick={(e) => open({ kind: "correct", receiptId: r.id }, e)}>correct…</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {got < l.packages && (
                  <span className="row">
                    <button className="btn line small" aria-label={`Received ${l.name}`} onClick={() => record("received")}>Received</button>
                    <button className="btn line small" aria-label={`Missing ${l.name}`} onClick={() => record("missing")}>Missing</button>
                    <button className="btn line small" aria-haspopup="dialog" aria-label={`Substituted ${l.name}…`} onClick={(e) => open({ kind: "substitute", orderLineId: l.id }, e)}>Substituted…</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return (
    <div className="card stack" data-testid="after-checkout">
      <h3 className="section-label">After checkout</h3>
      <button className="btn line" aria-haspopup="dialog" onClick={(e) => open({ kind: "confirm-order" }, e)}>Confirm order contents…</button>
    </div>
  );
}

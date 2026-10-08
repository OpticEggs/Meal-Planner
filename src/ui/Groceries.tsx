"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { AlsoNeed } from "./AlsoNeed";
import { costView, money, qty } from "./format";

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
  const g = snapshot?.groceries;

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
  if (!g) return <p className="muted">Adopt a week to see its groceries.</p>;
  const s = g.summary;
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
      {delta && (
        <div className="warnbox" role="alert" data-testid="grocery-delta">
          {delta.text && <strong>{delta.text}. </strong>}
          {delta.lines.join(" ")}
          <button className="btn line small" onClick={() => setDelta(null)}>Got it</button>
        </div>
      )}
      <div className="stats">
        <div className="stat"><span>Pickup estimate</span><strong>{costView(s.pickupSpending)}</strong><em>packages in this purchase</em></div>
        <div className="stat"><span>Dinner ingredients</span><strong>{costView(s.dinnerIngredientCost)}</strong><em>value used by planned dinners</em></div>
        <div className="stat"><span>Budget</span><strong>{s.budget.status === "unset" ? "not set" : `${s.budget.status}${s.budget.limitMinor !== null ? ` · ${money(s.budget.limitMinor)}` : ""}`}</strong><em>{s.budget.scope ?? ""}{s.budget.firm ? " · firm" : ""}</em></div>
      </div>
      <p className="faint small">Prices are estimates from recorded observations, not a guaranteed checkout total; the store may change final charges.</p>
      <div className={`card ${s.ready ? "ok" : ""}`} data-testid="readiness">
        {s.ready ? <strong>Groceries ready to send.</strong> : (
          <>
            <strong>Not ready yet</strong>
            <ul className="small">{s.readyBlockers.slice(0, 8).map((b: string) => <li key={b}>{b}</li>)}</ul>
          </>
        )}
      </div>
      {msg && <p role="alert" className="warnbox" data-testid="grocery-msg">{msg}</p>}
      <div className="row">
        <button className="btn line" disabled={!approvable.length || !writesAllowed} onClick={() => approve(approvable)} data-testid="approve-all">Approve {approvable.length} reviewable</button>
        <button className="btn primary" disabled={!s.ready || !writesAllowed || !snapshot.retailer.ready} onClick={send} data-testid="send">
          Send to {snapshot.retailer.live ? snapshot.retailer.label : "Simulated retailer"}
        </button>
      </div>
      {!snapshot.retailer.ready && <p className="warn small">{snapshot.retailer.reason}</p>}
      <div className="section-label">Also need</div>
      <AlsoNeed from="groceries" />
      <div className="section-label">This week’s list</div>
      <ul className="lines">
        {g.lines.map((l: any) => <Line key={l.key} l={l} />)}
      </ul>
      <Transfers />
      <Order />
    </section>
  );
}

function Line({ l }: { l: any }) {
  const { snapshot, command, writesAllowed } = useStore();
  const [some, setSome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const products = snapshot.groceries.products.filter((p: any) => p.ingredientKey === l.ingredientKey);
  async function run(name: string, payload: any) {
    const r = await command(name, payload);
    setMsg(r.status === "accepted" ? null : r.message);
  }
  const weekId = snapshot.week.id;
  return (
    <li className={`line st-${l.status}`} data-testid={`line-${l.key}`} data-status={l.status} data-to-send={l.toSend ?? ""}>
      <div className="row between">
        <strong>{l.name}</strong>
        <span className={`badge st-${l.status}`}>{STATUS[l.status] ?? l.status}</span>
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
            <button className="link small" onClick={() => run("RemoveRequest", { requestId: r.id })}>remove</button>
          </div>
        ))}
        {l.product ? (
          <div>
            {l.product.name} · {l.packagesNeeded ?? "?"} pkg needed{l.estimate ? " (variable weight — estimate)" : ""} · {l.price ? `${money(l.price.amountMinor)} each (${l.price.source}${l.product.fixture ? ", fixture" : ""})` : "price unknown"}
          </div>
        ) : null}
        {(l.ordered > 0 || l.sent > 0 || l.uncertain > 0) && (
          <div>History: {l.sent > 0 ? `${l.sent} sent to cart · ` : ""}{l.uncertain > 0 ? `${l.uncertain} uncertain · ` : ""}{l.ordered > 0 ? `${l.ordered} ordered · ` : ""}{l.received > 0 ? `${l.received} received · ` : ""}{l.missing > 0 ? `${l.missing} missing` : ""}</div>
        )}
        {l.toSend !== null && l.toSend > 0 && <div data-testid={`tosend-${l.key}`}>To send: {l.toSend} package(s){snapshot.groceries.order ? " — Not sent yet" : ""}</div>}
        {l.leftAfterMeal && <div>About {qty(l.leftAfterMeal.quantity, l.leftAfterMeal.unit)} left after dinners. <button className="link small" onClick={() => run("CaptureHouseholdNeed", { weekId, text: l.name, ingredientKey: l.ingredientKey, kind: "extra", packages: 1, from: "groceries" })}>Keep an extra</button></div>}
        {l.unresolved.map((u: string) => <div key={u} className="warn">{u}</div>)}
        {l.availability && <div className="faint">{l.availability.memberName}: {{ enough: "Have enough", some: `Have some${l.availability.quantity ? ` (${l.availability.quantity} ${l.availability.unit})` : ""}`, need: "Need" }[l.availability.state as string]}</div>}
      </div>
      {l.ingredientKey && l.meal && (
        <div className="row small" aria-label={`Availability for ${l.name}`}>
          <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "enough" })}>Have enough</button>
          <input className="tiny" placeholder="amt" value={some} onChange={(e) => setSome(e.target.value)} aria-label="Amount on hand" />
          <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "some", quantity: some || null, unit: some ? l.meal.unit : null })}>Have some</button>
          <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "need" })}>Need</button>
        </div>
      )}
      {!l.ingredientKey && (
        <div className="row small">
          <select aria-label="Match to ingredient" onChange={(e) => e.target.value && run("MapRequest", { requestId: l.requests[0].id, ingredientKey: e.target.value })} defaultValue="">
            <option value="">Match to an item…</option>
            {snapshot.ingredients.map((i: any) => <option key={i.key} value={i.key}>{i.name}</option>)}
          </select>
        </div>
      )}
      {l.ingredientKey && (
        <div className="row small">
          {products.length > 1 && (
            <select aria-label="Product" value={l.product?.id ?? ""} onChange={(e) => run("ChooseProduct", { weekId, ingredientKey: l.ingredientKey, productId: e.target.value })}>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="link small" onClick={() => setAdding(!adding)}>{adding ? "close" : l.product ? "other product / price" : "choose product"}</button>
          {l.toSend > 0 && l.product && l.price && l.unresolved.length === 0 && (
            l.approval?.valid
              ? <span className="badge">Approved ×{l.approval.packages}</span>
              : <button className="btn line small" disabled={!writesAllowed} onClick={() => run("ApprovePurchaseLines", { weekId, lines: [{ key: l.key, fingerprint: l.fingerprint, packages: l.toSend }] })}>Approve ×{l.toSend}</button>
          )}
        </div>
      )}
      {adding && <ProductForm l={l} onDone={() => setAdding(false)} />}
      {msg && <p role="alert" className="warnbox">{msg}</p>}
    </li>
  );
}

function ProductForm({ l, onDone }: { l: any; onDone: () => void }) {
  const { snapshot, command } = useStore();
  const [f, setF] = useState({ name: "", packageQty: "", packageUnit: l.meal?.unit === "g" ? "oz" : l.meal?.unit ?? "each", price: "" });
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="stack small" onSubmit={async (e) => {
      e.preventDefault();
      const r = await command("AddProduct", {
        weekId: snapshot.week.id, ingredientKey: l.ingredientKey, name: f.name, packageQty: f.packageQty || null, packageUnit: f.packageUnit || null,
        priceMinor: f.price ? Math.round(Number(f.price) * 100) : null,
      });
      if (r.status === "accepted") onDone(); else setMsg(r.message);
    }}>
      <p className="faint">Products are recorded for the simulated retailer only; nothing here is a verified store product.</p>
      <label>Product name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
      <div className="row">
        <label>Package size<input value={f.packageQty} onChange={(e) => setF({ ...f, packageQty: e.target.value })} inputMode="decimal" /></label>
        <label>Unit<input value={f.packageUnit} onChange={(e) => setF({ ...f, packageUnit: e.target.value })} /></label>
        <label>Price ($, optional)<input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="decimal" /></label>
      </div>
      {msg && <p className="warn">{msg}</p>}
      <button className="btn line small">Save product</button>
    </form>
  );
}

function Transfers() {
  const { snapshot, command } = useStore();
  const batches = snapshot.groceries.batches;
  if (!batches.length) return null;
  return (
    <div className="card stack" data-testid="transfers">
      <div className="section-label">Cart transfers ({snapshot.retailer.live ? snapshot.retailer.label : "simulated — nothing reached a store"})</div>
      {batches.map((b: any) => (
        <div key={b.id} className="small" data-testid="batch" data-status={b.status}>
          <strong>{b.status.replace(/_/g, " ")}</strong> · approved by {b.authorizedBy} · {b.payload.map((i: any) => `${i.ingredientKey} ×${i.packages}`).join(", ")}
          <div className="faint">{b.history.map((h: any) => h.status).join(" → ")}{b.status === "acknowledged" ? " (batch-level acknowledgment; not an order confirmation)" : ""}</div>
          {b.status === "uncertain" && (
            <div className="row">
              <span className="warn">Outcome unknown. Check the cart; Table will not resend automatically.</span>
              <button className="btn line small" onClick={() => command("ResolveUncertainTransfer", { batchId: b.id, observed: "in_cart" })}>Items are in the cart</button>
              <button className="btn line small" onClick={() => command("ResolveUncertainTransfer", { batchId: b.id, observed: "not_in_cart" })}>Items are not there</button>
            </div>
          )}
        </div>
      ))}
      <p className="faint small">Checkout and pickup time are chosen at the store’s site. Table does not remove cart items or place orders.</p>
    </div>
  );
}

function Order() {
  const { snapshot, command } = useStore();
  const g = snapshot.groceries;
  const [lines, setLines] = useState<{ ingredientKey: string | null; name: string; packages: number }[] | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [pickup, setPickup] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (g.order) {
    return (
      <div className="card stack" data-testid="order">
        <div className="section-label">Confirmed order</div>
        <p className="small">Confirmed by {g.order.confirmedBy}{g.order.pickupAt ? ` · pickup ${new Date(g.order.pickupAt).toLocaleString()}` : " · pickup time not recorded (availability unresolved)"}{g.order.contentsKnown ? "" : " · contents not listed — cannot show what was included"}</p>
        <ul className="small">
          {g.order.lines.map((l: any) => {
            const got = l.receipts.reduce((a: number, r: any) => a + r.packages, 0);
            return (
              <li key={l.id} data-testid={`order-line-${l.ingredientKey ?? l.name}`}>
                {l.name} ×{l.packages} {l.receipts.length > 0 && <span className="faint">({l.receipts.map((r: any) => `${r.packages} ${r.state}`).join(", ")})</span>}
                {got < l.packages && (
                  <span className="row">
                    <button className="btn line small" onClick={() => command("RecordReceipt", { orderLineId: l.id, state: "received", packages: l.packages - got })}>Received</button>
                    <button className="btn line small" onClick={() => command("RecordReceipt", { orderLineId: l.id, state: "missing", packages: l.packages - got })}>Missing</button>
                    <button className="btn line small" onClick={() => {
                      const t = prompt("Substituted with?");
                      if (t) void command("RecordReceipt", { orderLineId: l.id, state: "substituted", packages: l.packages - got, substituteText: t });
                    }}>Substituted</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  const sentLines = () => {
    const acc = new Map<string, number>();
    for (const b of g.batches.filter((b: any) => b.status === "acknowledged")) for (const i of b.payload) acc.set(i.ingredientKey, (acc.get(i.ingredientKey) ?? 0) + i.packages);
    return [...acc].map(([k, n]) => ({ ingredientKey: k, name: snapshot.ingredients.find((i: any) => i.key === k)?.name ?? k, packages: n }));
  };
  return (
    <div className="card stack" data-testid="confirm-order">
      <div className="section-label">After checkout</div>
      {!lines ? (
        <button className="btn line" onClick={() => setLines(sentLines())}>Confirm order contents…</button>
      ) : (
        <form className="stack small" onSubmit={async (e) => {
          e.preventDefault();
          const r = await command("ConfirmOrder", { weekId: snapshot.week.id, contentsKnown: !unknown, lines: unknown ? [] : lines, pickupAt: pickup ? new Date(pickup).toISOString() : null });
          if (r.status !== "accepted") setMsg(r.message);
        }}>
          <p className="faint">List what the store confirmed. A transfer to the cart is not proof that everything was ordered.</p>
          <label className="row"><input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} /> I placed an order but don’t have its contents</label>
          {!unknown && lines.map((l, i) => (
            <div key={i} className="row">
              <input value={l.name} aria-label="Item" onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="tiny" type="number" min={1} value={l.packages} aria-label="Packages" onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, packages: Number(e.target.value) } : x)))} />
              <button type="button" className="link" onClick={() => setLines(lines.filter((_, j) => j !== i))}>remove</button>
            </div>
          ))}
          {!unknown && <button type="button" className="link" onClick={() => setLines([...lines, { ingredientKey: null, name: "", packages: 1 }])}>add line</button>}
          <label>Pickup time (optional)<input type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} /></label>
          {msg && <p className="warn">{msg}</p>}
          <button className="btn primary small">Confirm order</button>
        </form>
      )}
    </div>
  );
}

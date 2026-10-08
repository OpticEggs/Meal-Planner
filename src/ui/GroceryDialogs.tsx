"use client";
import { useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet } from "./a11y";
import { FieldError, FormAlert, fieldProps, focusFirstInvalid, isDecimal, isWhole, type Errors } from "./forms";
import { money } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * B15 — the Groceries dialogs. All use the B14 ModalSheet (one modal system): named by their
 * title, focus inside on open, Tab trapped, Escape / Close / backdrop close without saving, focus
 * returned to the control that opened them (or a survivor). Each keeps what the member typed
 * across live updates; a change made by someone else while a dialog is open is shown as a
 * conflict to review, never silently applied over or erased.
 */

export type GroceryDialog =
  | { kind: "product"; key: string }
  | { kind: "remove-request"; key: string; requestId: string }
  | { kind: "confirm-order" }
  | { kind: "substitute"; orderLineId: string }
  | { kind: "validate"; receiptId: string }
  | { kind: "correct"; receiptId: string }
  | { kind: "cart-check"; batchId: string }
  | { kind: "kroger-match" };

export const UNIT_CHOICES = ["each", "oz", "lb", "g", "kg", "fl_oz", "ml", "l", "cup", "tbsp", "tsp"];

type Common = { onClose: () => void; returnFocus: () => void };

function orderLineOf(snapshot: any, orderLineId: string) {
  return snapshot.groceries?.order?.lines.find((l: any) => l.id === orderLineId) ?? null;
}
function receiptOf(snapshot: any, receiptId: string) {
  for (const l of snapshot.groceries?.order?.lines ?? []) {
    const r = l.receipts.find((x: any) => x.id === receiptId);
    if (r) return { line: l, receipt: r };
  }
  return null;
}

// -------------------------------------------------------------------------------------------
// Product for this pickup: choose a known product, or record another one (simulated store).

export function ProductDialog({ itemKey, onClose, returnFocus }: Common & { itemKey: string }) {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const l = snapshot.groceries?.lines.find((x: any) => x.key === itemKey) ?? null;
  const [label] = useState<string>(l?.name ?? itemKey);
  const current: string | null = l?.product?.id ?? null;
  const currentName: string | null = l?.product?.name ?? null;
  // What this member last saw as the pickup's product. A different current product = conflict.
  const [seen, setSeen] = useState<{ id: string | null; name: string | null }>({ id: current, name: currentName });
  const [choice, setChoice] = useState<string | null>(current);
  const [f, setF] = useState({ name: "", packageQty: "", packageUnit: l?.meal?.unit === "g" ? "oz" : l?.meal?.unit ?? "each", price: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const mode = snapshot.retailer.mode;
  const products = (snapshot.groceries?.products ?? []).filter((p: any) => p.ingredientKey === itemKey);
  const conflict = !!l && current !== seen.id;
  const gone = !l;
  const approved = l?.approval?.valid ? l.approval.packages : null;

  async function choose() {
    if (!choice) {
      setErrors({ "pd-choice": "Choose a product" });
      focusFirstInvalid(formRef.current, { "pd-choice": "x" });
      return;
    }
    setBusy(true);
    const r = await command("ChooseProduct", { weekId: snapshot.week.id, ingredientKey: itemKey, productId: choice, expectedProductId: seen.id });
    setBusy(false);
    if (r.status !== "accepted") {
      setFormError(r.message);
      return;
    }
    const name = products.find((p: any) => p.id === choice)?.name ?? "That product";
    announce(`${name} chosen for this pickup.${approved && choice !== current ? " Its earlier approval no longer applies; approve it again." : ""}`);
    onClose();
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.name.trim()) errs["pd-name"] = "Enter the product's name";
    if (f.packageQty.trim() && (!isDecimal(f.packageQty) || Number(f.packageQty) <= 0)) errs["pd-size"] = "Package size must be a positive number, or left empty if unknown";
    if (f.packageQty.trim() && !f.packageUnit.trim()) errs["pd-unit"] = "Say which unit the package size is in";
    if (f.price.trim() && !isDecimal(f.price)) errs["pd-price"] = "Price must be a number such as 4.99, or left empty";
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstInvalid(formRef.current, errs);
      return;
    }
    setBusy(true);
    const r = await command("AddProduct", {
      weekId: snapshot.week.id, ingredientKey: itemKey, name: f.name.trim(), packageQty: f.packageQty.trim() || null, packageUnit: f.packageQty.trim() ? f.packageUnit.trim() : null,
      priceMinor: f.price.trim() ? Math.round(Number(f.price) * 100) : null, expectedProductId: seen.id,
    });
    setBusy(false);
    if (r.status !== "accepted") {
      setFormError(r.message);
      return;
    }
    announce(`${f.name.trim()} recorded and chosen for this pickup.${approved ? " Its earlier approval no longer applies; approve it again." : ""}`);
    onClose();
  }

  return (
    <ModalSheet title={`Product for ${label}`} subtitle={gone ? "No longer on this pickup's list" : `This pickup: ${currentName ?? "no product chosen"}${approved ? ` · approved ×${approved}` : ""}`}
      closeLabel={`Close product for ${label}`} onClose={onClose} returnFocus={returnFocus} testId="product-dialog">
      <div ref={formRef} className="stack">
        {gone && <p className="warnbox" data-testid="product-gone">{label} is no longer on this pickup's list. What you typed is kept; nothing will be saved for it.</p>}
        {conflict && (
          <div className="warnbox" data-testid="product-conflict">
            <p>While this was open, this pickup's product changed from <strong>{seen.name ?? "none"}</strong> to <strong>{currentName ?? "none"}</strong>. Nothing you chose or typed here has been saved or lost.</p>
            <button type="button" className="btn line small" onClick={() => { setSeen({ id: current, name: currentName }); setFormError(null); }}>
              I've reviewed the current product
            </button>
          </div>
        )}
        <FormAlert message={formError} testId="product-error" />
        <fieldset className="stack" id="pd-choice" aria-describedby={errors["pd-choice"] ? "pd-choice-error" : undefined}>
          <legend>Choose a product for this pickup</legend>
          {products.length === 0 && <p className="faint small">No products recorded for {label} yet. Add one below.</p>}
          {products.map((p: any, i: number) => {
            const available = p.retailer === mode;
            return (
              <label key={p.id} className="option-row">
                <input type="radio" name="pd-product" value={p.id} checked={choice === p.id} disabled={!available} data-autofocus={(choice ? choice === p.id : i === 0) ? "" : undefined}
                  onChange={() => setChoice(p.id)} />
                <span>
                  {p.name}{p.packageQty ? ` · ${p.packageQty} ${p.packageUnit} package` : " · package size unknown"}
                  {p.id === current ? " · current choice" : ""}
                  {available ? "" : " · not available from this store"}
                </span>
              </label>
            );
          })}
          <FieldError id="pd-choice" errors={errors} />
        </fieldset>
        {approved && <p className="faint small">Choosing a different product withdraws the approval for ×{approved}; the line must be approved again before Send.</p>}
        <button type="button" className="btn primary" disabled={busy || gone || conflict || !writesAllowed || !choice || choice === current} onClick={choose}>
          Use for this pickup
        </button>
        {mode === "kroger" && (
          <KrogerSearch itemKey={itemKey} label={label} expectedProductId={seen.id} disabled={busy || gone || conflict || !writesAllowed}
            onChosen={(name) => { announce(`${name} chosen for this pickup.${approved ? " Its earlier approval no longer applies; approve it again." : ""}`); onClose(); }} />
        )}
        {mode !== "kroger" && <form className="stack small" onSubmit={addProduct} noValidate aria-labelledby="pd-add-h">
          <h3 id="pd-add-h" className="section-label">Or record another product (simulated store)</h3>
          <label htmlFor="pd-name">Product name</label>
          <input {...fieldProps("pd-name", errors)} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <FieldError id="pd-name" errors={errors} />
          <div className="grid3">
            <span className="stack">
              <label htmlFor="pd-size">Package size</label>
              <input {...fieldProps("pd-size", errors)} inputMode="decimal" value={f.packageQty} onChange={(e) => setF({ ...f, packageQty: e.target.value })} />
              <FieldError id="pd-size" errors={errors} />
            </span>
            <span className="stack">
              <label htmlFor="pd-unit">Unit</label>
              <input {...fieldProps("pd-unit", errors)} list="pd-units" value={f.packageUnit} onChange={(e) => setF({ ...f, packageUnit: e.target.value })} />
              <datalist id="pd-units">{UNIT_CHOICES.map((u) => <option key={u} value={u} />)}</datalist>
              <FieldError id="pd-unit" errors={errors} />
            </span>
            <span className="stack">
              <label htmlFor="pd-price">Price ($, optional)</label>
              <input {...fieldProps("pd-price", errors)} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
              <FieldError id="pd-price" errors={errors} />
            </span>
          </div>
          <p className="faint">Recorded for the simulated retailer only; nothing here is a verified store product.</p>
          <button className="btn line small" disabled={busy || gone || conflict || !writesAllowed}>Save product</button>
        </form>}
      </div>
    </ModalSheet>
  );
}

// -------------------------------------------------------------------------------------------
// Remove a captured request (destructive: deliberate confirmation, safe default focused).

export function RemoveRequestDialog({ itemKey, requestId, onClose, returnFocus }: Common & { itemKey: string; requestId: string }) {
  const { snapshot, command, announce } = useStore();
  const l = snapshot.groceries?.lines.find((x: any) => x.key === itemKey);
  const r = l?.requests.find((x: any) => x.id === requestId);
  const [label] = useState(`${r?.kind === "extra" ? "extra" : "usual"} request for ${l?.name ?? "this item"}`);
  const ids = (r?.contributors ?? []).map((c: any) => c.memberId).sort().join(",");
  const who = r?.contributors.map((c: any) => c.name).join(" and ") ?? "";
  // Who the member saw asking for it; someone joining meanwhile must be reviewed first.
  const [seen, setSeen] = useState(ids);
  const changed = !!r && ids !== seen;
  const [err, setErr] = useState<string | null>(null);
  return (
    <ModalSheet title={`Remove the ${label}?`} closeLabel="Close without removing" onClose={onClose} returnFocus={returnFocus} testId="remove-request-dialog">
      <p>{who ? `Requested by ${who}. ` : ""}Removing it takes it off this pickup's list. Anything a dinner needs stays on the list. You can add it again later.</p>
      {!r && <p className="warnbox">This request is no longer on the list.</p>}
      {changed && (
        <div className="warnbox" data-testid="remove-conflict">
          <p>While this was open, the people asking for it changed: now {who}.</p>
          <button type="button" className="btn line small" onClick={() => setSeen(ids)}>I've seen who asked</button>
        </div>
      )}
      <FormAlert message={err} />
      <div className="row">
        <button type="button" className="btn line" data-autofocus="" onClick={onClose}>Keep it</button>
        <button type="button" className="btn danger" disabled={!r || changed} onClick={async () => {
          const res = await command("RemoveRequest", { requestId, expectedContributorIds: seen ? seen.split(",") : [] });
          if (res.status !== "accepted") return setErr(res.message);
          announce(`Removed the ${label}.`);
          onClose();
        }}>Remove request</button>
      </div>
    </ModalSheet>
  );
}

// -------------------------------------------------------------------------------------------
// Confirm order contents: edit, then review, then record (irreversible: two deliberate steps).

type OrderLine = { ingredientKey: string | null; productId?: string | null; name: string; packages: string };

export function sentLines(snapshot: any): OrderLine[] {
  const g = snapshot.groceries;
  const acc = new Map<string, number>();
  const refOf = new Map<string, string>();
  for (const b of g.batches.filter((b: any) => b.status === "acknowledged")) {
    for (const i of b.payload) {
      acc.set(i.ingredientKey, (acc.get(i.ingredientKey) ?? 0) + i.packages);
      refOf.set(i.ingredientKey, i.productRef);
    }
  }
  // The confirmed product is the one transferred, never inferred from today's mapping.
  return [...acc].map(([k, n]) => ({
    ingredientKey: k, productId: g.products.find((p: any) => p.ref === refOf.get(k))?.id ?? null,
    name: snapshot.ingredients.find((i: any) => i.key === k)?.name ?? k, packages: String(n),
  }));
}

export function ConfirmOrderDialog({ onClose, returnFocus }: Common) {
  const { snapshot, command, announce, writesAllowed } = useStore();
  const [lines, setLines] = useState<OrderLine[]>(() => sentLines(snapshot));
  const [unknown, setUnknown] = useState(false);
  const [pickup, setPickup] = useState("");
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const already = !!snapshot.groceries?.order;

  function validate(e: React.FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    if (!unknown) {
      if (!lines.length) errs["co-lines"] = "List at least one item, or say you don't have the contents";
      lines.forEach((l, i) => {
        if (!l.name.trim()) errs[`co-name-${i}`] = "Enter the item's name";
        if (!isWhole(l.packages, 1, 50)) errs[`co-pk-${i}`] = "Packages must be a whole number from 1 to 50";
      });
    }
    setErrors(errs);
    if (Object.keys(errs).length) return void focusFirstInvalid(formRef.current, errs);
    setStep("review");
    setTimeout(() => reviewRef.current?.focus(), 0);
  }

  async function record() {
    setBusy(true);
    const r = await command("ConfirmOrder", {
      weekId: snapshot.week.id, contentsKnown: !unknown,
      lines: unknown ? [] : lines.map((l) => ({ ingredientKey: l.ingredientKey, productId: l.productId ?? null, name: l.name.trim(), packages: Number(l.packages) })),
      pickupAt: pickup ? new Date(pickup).toISOString() : null,
    });
    setBusy(false);
    if (r.status !== "accepted") {
      setStep("edit");
      setFormError(r.message);
      return;
    }
    announce("Order recorded as confirmed. Record what arrives as receipts.");
    onClose();
  }

  return (
    <ModalSheet title="Confirm order contents" subtitle="What the store confirmed after checkout" closeLabel="Close order confirmation without saving" onClose={onClose} returnFocus={returnFocus} testId="confirm-order">
      {already && <p className="warnbox">Someone already recorded this pickup's confirmed order. Nothing here will be saved.</p>}
      <FormAlert message={formError} />
      {step === "edit" ? (
        <form ref={formRef} className="stack small" onSubmit={validate} noValidate>
          <p className="faint">List what the store confirmed. A transfer to the cart is not proof that everything was ordered.</p>
          <label className="row"><input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} data-autofocus="" /> I placed an order but don’t have its contents</label>
          {!unknown && (
            <div className="stack" id="co-lines" tabIndex={-1} role="group" aria-label="Confirmed items" aria-describedby={errors["co-lines"] ? "co-lines-error" : undefined}>
              {lines.map((l, i) => (
                <div key={i} className="row">
                  <span className="stack grow">
                    <input {...fieldProps(`co-name-${i}`, errors)} value={l.name} aria-label={`Item ${i + 1}`} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <FieldError id={`co-name-${i}`} errors={errors} />
                  </span>
                  <span className="stack">
                    <input {...fieldProps(`co-pk-${i}`, errors)} className="tiny" inputMode="numeric" value={l.packages} aria-label={`Packages of ${l.name || `item ${i + 1}`}`}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, packages: e.target.value } : x)))} />
                    <FieldError id={`co-pk-${i}`} errors={errors} />
                  </span>
                  <button type="button" className="link" aria-label={`Remove ${l.name || `item ${i + 1}`}`} onClick={() => setLines(lines.filter((_, j) => j !== i))}>remove</button>
                </div>
              ))}
              <FieldError id="co-lines" errors={errors} />
              <button type="button" className="link" onClick={() => setLines([...lines, { ingredientKey: null, name: "", packages: "1" }])}>add line</button>
            </div>
          )}
          <label htmlFor="co-pickup">Pickup time (optional)</label>
          <input id="co-pickup" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          <button className="btn primary small" disabled={already}>Confirm order…</button>
        </form>
      ) : (
        <div className="stack small" data-testid="confirm-order-review">
          <h3 ref={reviewRef} tabIndex={-1} className="section-label">Check before recording</h3>
          {unknown ? <p>An order was placed; its contents are not known. Nothing will be counted as ordered.</p> : (
            <ul>{lines.map((l, i) => <li key={i}>{l.name.trim()} ×{Number(l.packages)}</li>)}</ul>
          )}
          <p>{pickup ? `Pickup ${new Date(pickup).toLocaleString()}.` : "Pickup time not recorded."} A confirmed order can’t be edited afterwards; differences at pickup are recorded as receipts.</p>
          <div className="row">
            <button type="button" className="btn line" onClick={() => setStep("edit")}>Back to edit</button>
            <button type="button" className="btn primary" disabled={busy || already || !writesAllowed} onClick={record}>Yes, record this order</button>
          </div>
        </div>
      )}
    </ModalSheet>
  );
}

// -------------------------------------------------------------------------------------------
// Receipts: a substitute arrived; does a substitute work; correct an earlier receipt.

export function SubstituteDialog({ orderLineId, onClose, returnFocus }: Common & { orderLineId: string }) {
  const { snapshot, command, announce } = useStore();
  const line = orderLineOf(snapshot, orderLineId);
  const got = line ? line.receipts.filter((r: any) => !r.correctedBy).reduce((a: number, r: any) => a + r.packages, 0) : 0;
  const [label] = useState(line?.name ?? "this item");
  const [max] = useState(line ? line.packages - got : 1);
  const [f, setF] = useState({ text: "", packages: String(Math.max(1, max)) });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <ModalSheet title={`Record a substitute for ${label}`} closeLabel="Close without recording" onClose={onClose} returnFocus={returnFocus} testId="substitute-dialog">
      <FormAlert message={formError} />
      <form ref={ref} className="stack small" noValidate onSubmit={async (e) => {
        e.preventDefault();
        const errs: Errors = {};
        if (!f.text.trim()) errs["sub-text"] = "Say what arrived instead";
        if (!isWhole(f.packages, 1, Math.max(1, max))) errs["sub-pk"] = `Packages must be a whole number from 1 to ${Math.max(1, max)}`;
        setErrors(errs);
        if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
        const r = await command("RecordReceipt", { orderLineId, state: "substituted", packages: Number(f.packages), substituteText: f.text.trim() });
        if (r.status !== "accepted") return setFormError(r.message);
        announce(`Recorded: ${f.text.trim()} arrived instead of ${label}. It covers nothing until you say whether it works.`);
        onClose();
      }}>
        <label htmlFor="sub-text">What arrived instead</label>
        <input {...fieldProps("sub-text", errors)} data-autofocus="" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
        <FieldError id="sub-text" errors={errors} />
        <label htmlFor="sub-pk">Packages</label>
        <input {...fieldProps("sub-pk", errors)} className="tiny" inputMode="numeric" value={f.packages} onChange={(e) => setF({ ...f, packages: e.target.value })} />
        <FieldError id="sub-pk" errors={errors} />
        <button className="btn primary small" disabled={!line}>Record substitute</button>
      </form>
    </ModalSheet>
  );
}

export function ValidateSubstituteDialog({ receiptId, onClose, returnFocus }: Common & { receiptId: string }) {
  const { snapshot, command, announce } = useStore();
  const found = receiptOf(snapshot, receiptId);
  const [label] = useState(found ? `${found.receipt.substituteText} (for ${found.line.name})` : "the substitute");
  const [f, setF] = useState({ quantity: "", unit: found?.line.packageUnit ?? "" });
  const [seenValidation] = useState<string | null>(found?.receipt.validation?.id ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const decided = !!found?.receipt.validation || !!found?.receipt.correctedBy;
  return (
    <ModalSheet title={`Does ${label} work?`} subtitle="Say how much arrived so it can count toward the need" closeLabel="Close without deciding" onClose={onClose} returnFocus={returnFocus} testId="validate-dialog">
      {decided && <p className="warnbox">Someone already decided about this substitute or corrected the receipt. Nothing here will be saved.</p>}
      <FormAlert message={formError} />
      <form ref={ref} className="stack small" noValidate onSubmit={async (e) => {
        e.preventDefault();
        const errs: Errors = {};
        if (!isDecimal(f.quantity) || Number(f.quantity) <= 0) errs["val-qty"] = "Amount must be a positive number";
        if (!UNIT_CHOICES.includes(f.unit.trim())) errs["val-unit"] = "Choose a unit";
        setErrors(errs);
        if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
        const r = await command("ValidateSubstitution", { receiptId, suitable: true, quantity: f.quantity.trim(), unit: f.unit.trim(), expectedValidationId: seenValidation });
        if (r.status !== "accepted") return setFormError(r.message);
        announce(`Recorded: the substitute works and covers ${f.quantity} ${f.unit}.`);
        onClose();
      }}>
        <label htmlFor="val-qty">How much arrived</label>
        <input {...fieldProps("val-qty", errors)} data-autofocus="" inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        <FieldError id="val-qty" errors={errors} />
        <label htmlFor="val-unit">Unit</label>
        <select {...fieldProps("val-unit", errors)} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          <option value="">Choose…</option>
          {UNIT_CHOICES.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <FieldError id="val-unit" errors={errors} />
        <div className="row">
          <button className="btn primary small" disabled={decided}>It works</button>
          <button type="button" className="btn line small" disabled={decided} onClick={async () => {
            const r = await command("ValidateSubstitution", { receiptId, suitable: false, expectedValidationId: seenValidation });
            if (r.status !== "accepted") return setFormError(r.message);
            announce("Recorded: the substitute does not work; the original need stays open.");
            onClose();
          }}>It doesn’t work</button>
        </div>
      </form>
    </ModalSheet>
  );
}

export function CorrectReceiptDialog({ receiptId, onClose, returnFocus }: Common & { receiptId: string }) {
  const { snapshot, command, announce } = useStore();
  const found = receiptOf(snapshot, receiptId);
  const [label] = useState(found?.line.name ?? "this item");
  const [was] = useState<string>(found ? `${found.receipt.packages} ${found.receipt.state}` : "");
  const [f, setF] = useState({ state: "", packages: String(found?.receipt.packages ?? 1), text: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const superseded = !!found?.receipt.correctedBy;
  return (
    <ModalSheet title={`Correct the receipt for ${label}`} subtitle={was ? `Recorded: ${was}` : undefined} closeLabel="Close without correcting" onClose={onClose} returnFocus={returnFocus} testId="correct-dialog">
      {superseded && <p className="warnbox">This receipt was already corrected by someone else. Nothing here will be saved.</p>}
      <FormAlert message={formError} />
      <form ref={ref} className="stack small" noValidate onSubmit={async (e) => {
        e.preventDefault();
        const errs: Errors = {};
        if (!f.state) errs["cr-state"] = "Choose what actually happened";
        if (!isWhole(f.packages, 1, 50)) errs["cr-pk"] = "Packages must be a whole number from 1 to 50";
        if (f.state === "substituted" && !f.text.trim()) errs["cr-text"] = "Say what arrived instead";
        setErrors(errs);
        if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
        const r = await command("RecordReceipt", {
          orderLineId: found!.line.id, state: f.state, packages: Number(f.packages), substituteText: f.state === "substituted" ? f.text.trim() : undefined, correctsReceiptId: receiptId,
        });
        if (r.status !== "accepted") return setFormError(r.message);
        announce(`Corrected: ${label} ${f.state}. The earlier record is kept as history.`);
        onClose();
      }}>
        <fieldset id="cr-state" className="stack" aria-describedby={errors["cr-state"] ? "cr-state-error" : undefined}>
          <legend>What actually happened</legend>
          {(["received", "missing", "substituted"] as const).map((s, i) => (
            <label key={s} className="option-row">
              <input type="radio" name="cr-state" value={s} checked={f.state === s} data-autofocus={i === 0 ? "" : undefined} onChange={() => setF({ ...f, state: s })} /> {s}
            </label>
          ))}
          <FieldError id="cr-state" errors={errors} />
        </fieldset>
        <label htmlFor="cr-pk">Packages</label>
        <input {...fieldProps("cr-pk", errors)} className="tiny" inputMode="numeric" value={f.packages} onChange={(e) => setF({ ...f, packages: e.target.value })} />
        <FieldError id="cr-pk" errors={errors} />
        {f.state === "substituted" && (
          <>
            <label htmlFor="cr-text">What arrived instead</label>
            <input {...fieldProps("cr-text", errors)} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
            <FieldError id="cr-text" errors={errors} />
          </>
        )}
        <p className="faint">A correction is added alongside the original record; nothing is overwritten.</p>
        <button className="btn primary small" disabled={!found || superseded}>Record correction</button>
      </form>
    </ModalSheet>
  );
}

// -------------------------------------------------------------------------------------------
// An uncertain transfer: the member checks the store cart and records what they saw.

export function CartCheckDialog({ batchId, onClose, returnFocus }: Common & { batchId: string }) {
  const { snapshot, command, announce } = useStore();
  const b = snapshot.groceries?.batches.find((x: any) => x.id === batchId);
  const [items] = useState<string>(b ? b.payload.map((i: any) => `${i.ingredientKey} ×${i.packages}`).join(", ") : "");
  const [seen, setSeen] = useState<"" | "in_cart" | "not_in_cart">("");
  const [err, setErr] = useState<string | null>(null);
  const still = b?.status === "uncertain";
  return (
    <ModalSheet title="What is in the store cart?" subtitle={`Uncertain transfer: ${items}`} closeLabel="Close without recording" onClose={onClose} returnFocus={returnFocus} testId="cart-check-dialog">
      {!still && <p className="warnbox">This transfer is no longer uncertain (someone already recorded what they saw). Nothing here will be saved.</p>}
      <p className="small">Look at the cart on the store’s site. Table never resends an uncertain transfer by itself.</p>
      <FormAlert message={err} />
      <fieldset className="stack">
        <legend>What did you see?</legend>
        <label className="option-row"><input type="radio" name="cart" data-autofocus="" checked={seen === "in_cart"} onChange={() => setSeen("in_cart")} /> The items are in the cart</label>
        <label className="option-row"><input type="radio" name="cart" checked={seen === "not_in_cart"} onChange={() => setSeen("not_in_cart")} /> The items are not in the cart</label>
      </fieldset>
      {seen === "not_in_cart" && <p className="warnbox small">These items will become sendable again. If they are actually in the cart, sending again would add them twice — check carefully.</p>}
      <button type="button" className="btn primary" disabled={!seen || !still} onClick={async () => {
        const r = await command("ResolveUncertainTransfer", { batchId, observed: seen });
        if (r.status !== "accepted") return setErr(r.message);
        announce(seen === "in_cart" ? "Recorded: the items are in the cart." : "Recorded: the items are not in the cart; they can be sent again after review.");
        onClose();
      }}>Record what I saw</button>
    </ModalSheet>
  );
}

// -------------------------------------------------------------------------------------------
// Kroger products (store = Kroger and the products capability on): search at the household's
// store and choose one. The server re-reads the chosen product from Kroger before recording it;
// nothing here touches the household's Kroger account or a cart.

function candidateText(c: any): string {
  const price = c.promoMinor && (!c.regularMinor || c.promoMinor < c.regularMinor)
    ? `${money(c.promoMinor)} on sale (regular ${c.regularMinor ? money(c.regularMinor) : "unknown"})`
    : c.regularMinor ? money(c.regularMinor) : "price unknown";
  const size = c.package ? `${c.package.quantity} ${c.package.unit}` : c.sizeText ? `"${c.sizeText}" (size not readable)` : "size unknown";
  const pickup = c.pickup === true ? "pickup" : c.pickup === false ? "no pickup" : "pickup unknown";
  return [c.description ?? c.productId, size, price, pickup, c.stockLevel ? c.stockLevel.toLowerCase().replaceAll("_", " ") : null].filter(Boolean).join(" · ");
}

function ChooseCandidate({ c, itemKey, expectedProductId, disabled, onChosen, idPrefix }: {
  c: any; itemKey: string; expectedProductId: string | null; disabled: boolean; onChosen: (name: string) => void; idPrefix: string;
}) {
  const { snapshot, command } = useStore();
  const [pack, setPack] = useState({ qty: "", unit: "oz" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsSize = !c.package;
  const qtyId = `${idPrefix}-qty`;
  const errId = `${idPrefix}-error`;
  const qtyRef = useRef<HTMLInputElement>(null);
  const useRef_ = useRef<HTMLButtonElement>(null);
  // An error is attached to what it is about and focused there (the size field, else the button).
  const fail = (message: string, field: "size" | null) => {
    setError(message);
    requestAnimationFrame(() => (field === "size" && qtyRef.current ? qtyRef.current : useRef_.current)?.focus());
  };
  return (
    <li className="card stack" data-testid="kroger-candidate" data-product-id={c.productId}>
      <span className="small">{candidateText(c)}</span>
      {!c.choosable && <span className="small warn" data-testid="kroger-not-choosable">{c.notChoosable ?? "This product can't be chosen."}</span>}
      {c.choosable && needsSize && (
        <div className="row small">
          <label htmlFor={qtyId}>Package size</label>
          <input ref={qtyRef} id={qtyId} className="tiny" inputMode="decimal" value={pack.qty} onChange={(e) => setPack({ ...pack, qty: e.target.value })}
            aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} />
          <select aria-label="Package unit" value={pack.unit} onChange={(e) => setPack({ ...pack, unit: e.target.value })}>
            {UNIT_CHOICES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}
      {error && <p className="field-error small" role="alert" id={errId} data-testid="kroger-choose-error">{error}</p>}
      {c.choosable && (
        <button ref={useRef_} type="button" className="btn line small" disabled={disabled || busy} aria-label={`Use ${c.description ?? c.productId} for this pickup`}
          aria-describedby={error && !needsSize ? errId : undefined}
          onClick={async () => {
            if (needsSize && (!isDecimal(pack.qty) || Number(pack.qty) <= 0)) {
              fail("Enter the package size you'll buy (Kroger's size text isn't one Table can read).", "size");
              return;
            }
            setBusy(true);
            const r = await command("ChooseKrogerProduct", {
              weekId: snapshot.week.id, ingredientKey: itemKey, productId: c.productId, expectedProductId,
              packageQty: needsSize ? pack.qty : null, packageUnit: needsSize ? pack.unit : null,
            }, "/api/kroger/choose");
            setBusy(false);
            if (r.status === "accepted") onChosen(c.description ?? c.productId);
            else fail(r.message, (r.details as any)?.field === "packageQty" || (r.details as any)?.field === "packageUnit" ? "size" : null);
          }}>
          Use this
        </button>
      )}
    </li>
  );
}

function KrogerSearch({ itemKey, label, expectedProductId, disabled, onChosen }: {
  itemKey: string; label: string; expectedProductId: string | null; disabled: boolean; onChosen: (name: string) => void;
}) {
  const [term, setTerm] = useState(label);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const search = async () => {
    setBusy(true);
    const r = await fetch(`/api/kroger/products?term=${encodeURIComponent(term)}`, { cache: "no-store" })
      .then((x) => x.json(), () => ({ ok: false, reason: "Table couldn't be reached." }));
    setBusy(false);
    setResult(r);
  };
  return (
    <section className="stack small" aria-labelledby="pd-kroger-h" data-testid="kroger-search">
      <h3 id="pd-kroger-h" className="section-label">Find it at Kroger</h3>
      <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <input className="grow" aria-label={`Search Kroger for ${label}`} value={term} onChange={(e) => setTerm(e.target.value)} />
        <button className="btn line small" disabled={busy || term.trim().length < 2}>{busy ? "Searching…" : "Search"}</button>
      </form>
      {result && !result.ok && <p role="status" className="warn" data-testid="kroger-search-refused">{result.reason}</p>}
      {result?.ok && result.candidates.length === 0 && <p role="status" className="faint">No Kroger products found for "{term}" at your store.</p>}
      {result?.ok && result.candidates.length > 0 && (
        <ul className="plain stack" aria-label={`Kroger products for ${label}`}>
          {result.candidates.map((c: any, i: number) => (
            <ChooseCandidate key={`${c.productId}-${i}`} c={c} itemKey={itemKey} expectedProductId={expectedProductId} disabled={disabled} onChosen={onChosen} idPrefix={`kc-${i}`} />
          ))}
        </ul>
      )}
      <p className="faint">Prices and pickup availability are what Kroger reports for your store now; they're recorded with the time. Nothing is added to a cart here.</p>
    </section>
  );
}

/** Several lines at once: Kroger suggestions for each line that has no product yet; the member chooses each one. */
export function KrogerMatchDialog({ onClose, returnFocus }: Common) {
  const { snapshot, announce } = useStore();
  const [result, setResult] = useState<any>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  // Items with no product, or with one the Kroger store doesn't sell (e.g. recorded for the simulated store).
  const todo = (snapshot.groceries?.lines ?? []).filter((l: any) => l.ingredientKey && (!l.product || l.product.retailer !== snapshot.retailer.mode));
  // What each item showed when the dialog opened: a choice is bound to it (B15), like the product dialog.
  const [lines] = useState(() => todo.map((l: any) => ({ key: l.key, term: l.name, seen: (l.product?.id as string | undefined) ?? null })));
  const seenOf = (key: string) => lines.find((x: any) => x.key === key)?.seen ?? null;
  const load = async () => {
    const r = await fetch("/api/kroger/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: lines.map(({ key, term }: any) => ({ key, term })) }) })
      .then((x) => x.json(), () => ({ ok: false, reason: "Table couldn't be reached." }));
    setResult(r);
  };
  return (
    <ModalSheet title="Match products at Kroger" subtitle={`${lines.length} ${lines.length === 1 ? "item has" : "items have"} no Kroger product yet`} closeLabel="Close Kroger matching"
      onClose={onClose} returnFocus={returnFocus} testId="kroger-match-dialog">
      <div className="stack">
        {!result && (
          <>
            <p className="small">Table searches Kroger at your store for each item below (up to 12 at a time) and shows a few products for each. You choose; nothing is chosen for you and nothing goes into a cart.</p>
            <ul className="small">{lines.map((l: any) => <li key={l.key}>{l.term}</li>)}</ul>
            <button type="button" className="btn primary" data-autofocus="" disabled={!lines.length} onClick={load} data-testid="kroger-match-start">Search Kroger</button>
          </>
        )}
        {result && !result.ok && <p role="status" className="warn" data-testid="kroger-match-refused">{result.reason}</p>}
        {result?.ok && result.lines.map((l: any) => (
          <section key={l.key} className="stack" aria-label={`Kroger products for ${l.term}`} data-testid="kroger-match-line">
            <h3 className="section-label">{l.term}{chosen[l.key] ? ` — chose ${chosen[l.key]}` : ""}</h3>
            {!l.ok && <p className="small warn">{l.reason}</p>}
            {l.ok && !l.candidates.length && <p className="small faint">No products found. Open the item's product dialog to search with other words.</p>}
            {!chosen[l.key] && l.candidates.length > 0 && (
              <ul className="plain stack">
                {l.candidates.map((c: any, i: number) => (
                  <ChooseCandidate key={`${c.productId}-${i}`} c={c} itemKey={l.key} expectedProductId={seenOf(l.key)} disabled={false} idPrefix={`km-${l.key}-${i}`}
                    onChosen={(name) => { setChosen((x) => ({ ...x, [l.key]: name })); announce(`${name} chosen for ${l.term}.`); }} />
                ))}
              </ul>
            )}
          </section>
        ))}
        {result?.capped && <p className="small faint">Only the first 12 items were searched; run it again for the rest.</p>}
      </div>
    </ModalSheet>
  );
}

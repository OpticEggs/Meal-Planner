"use client";
import { useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet, focusFirst } from "./a11y";
import { FieldError, FormAlert, fieldProps, focusFirstInvalid, isDecimal, type Errors } from "./forms";
import { KNOWN_UNITS, dimensionOf, normalizeUnit } from "@/domain/units";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * B16 — usual items (staples) in Household. A staple is a one-tap shortcut, not a pantry count.
 * Every change is made against the revision the member saw; if the other member changed it
 * meanwhile, the dialog shows the current values (keeping what was typed) and saves only after
 * the member has reviewed them. Changing the remembered product is its own explicit decision and
 * never approves a purchase or changes a list already made.
 */

type StapleDialog =
  | { kind: "add" }
  | { kind: "edit"; key: string }
  | { kind: "product"; key: string }
  | { kind: "remove"; key: string };

const FIELD: Record<string, string> = { quantity: "st-qty", unit: "st-unit", displayName: "st-name", ingredientKey: "st-item" };

export function usualText(s: any): string {
  if (s.usual.unit === "package") return `${s.usual.quantity} package${s.usual.quantity === "1" ? "" : "s"}`;
  return `${s.usual.quantity} ${s.usual.unit} (${s.usualPackages} package${s.usualPackages === 1 ? "" : "s"} of the remembered product)`;
}

function availabilityText(s: any, storeLabel: string | null): string {
  const store = storeLabel ? `at ${storeLabel}` : "from the active store";
  if (s.productAvailable === null) return "no product remembered";
  return s.productAvailable ? `available ${store}` : `not available ${store}`;
}

function unitChoices(pkgUnit: string | null | undefined): string[] {
  if (!pkgUnit) return ["package"];
  const dim = dimensionOf(pkgUnit);
  const same = dim ? KNOWN_UNITS.filter((u) => dimensionOf(u) === dim) : [normalizeUnit(pkgUnit)];
  return ["package", ...same];
}

export function Staples() {
  const { snapshot, command, announce, writesAllowed } = useStore();
  const [dialog, setDialog] = useState<{ d: StapleDialog; opener: HTMLElement | null } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const staples = snapshot.staples ?? [];
  const active = staples.filter((s: any) => s.active);
  const removed = staples.filter((s: any) => !s.active);
  const storeLabel = snapshot.settings?.storeLabel ?? null;
  const open = (d: StapleDialog, e: React.SyntheticEvent<HTMLElement>) => setDialog({ d, opener: e.currentTarget });
  const fallback = (d: StapleDialog) =>
    focusFirst(
      "key" in d ? document.querySelector<HTMLElement>(`[data-testid="staple-row-${d.key}"] button:not([disabled])`) : null,
      document.querySelector<HTMLElement>('[data-testid="add-staple"]'),
      document.querySelector<HTMLElement>('[data-testid="staples"]'),
    );

  return (
    <section className="card stack" data-testid="staples" aria-labelledby="staples-h" tabIndex={-1}>
      <h2 id="staples-h" className="section-label">Usual items (staples)</h2>
      <p className="faint small">One-tap shortcuts for things you buy regularly — not a pantry count. Changing one never approves a purchase or changes a list already made; it changes what the next tap asks for.</p>
      {msg && <p role="alert" className="warnbox">{msg}</p>}
      {active.length === 0 && <p className="small muted">No usual items yet.</p>}
      <ul className="lines">
        {active.map((s: any) => (
          <li key={s.ingredientKey} className="staple" data-testid={`staple-row-${s.ingredientKey}`}>
            <h3>{s.name}{s.displayName ? <span className="faint small"> ({s.ingredientName})</span> : null}</h3>
            <div className="small">Usual amount: {usualText(s)}</div>
            <div className="small" data-testid={`staple-product-${s.ingredientKey}`}>
              Product: {s.productName ?? "none remembered"} — <span className={s.productAvailable === false ? "warn" : ""}>{availabilityText(s, storeLabel)}</span>
            </div>
            <div className="faint small">Last changed by {s.lastChange?.by ?? s.updatedBy ?? "—"}{s.lastChange ? ` (${s.lastChange.kind})` : ""}</div>
            <div className="row">
              <button className="btn line small" aria-haspopup="dialog" aria-label={`Edit ${s.name}`} disabled={!writesAllowed} onClick={(e) => open({ kind: "edit", key: s.ingredientKey }, e)}>Edit…</button>
              <button className="btn line small" aria-haspopup="dialog" aria-label={`Change product for ${s.name}`} disabled={!writesAllowed} onClick={(e) => open({ kind: "product", key: s.ingredientKey }, e)}>Product…</button>
              <button className="btn line small" aria-haspopup="dialog" aria-label={`Remove ${s.name} from usual items`} disabled={!writesAllowed} onClick={(e) => open({ kind: "remove", key: s.ingredientKey }, e)}>Remove…</button>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn line" aria-haspopup="dialog" data-testid="add-staple" disabled={!writesAllowed} onClick={(e) => open({ kind: "add" }, e)}>Add a usual item…</button>
      {removed.length > 0 && (
        <div className="stack" data-testid="removed-staples">
          <h3 className="section-label">Removed usual items</h3>
          <ul className="lines">
            {removed.map((s: any) => (
              <li key={s.ingredientKey} className="staple" data-testid={`staple-row-${s.ingredientKey}`}>
                <h3>{s.name} <span className="faint small">— removed by {s.lastChange?.by ?? s.updatedBy ?? "someone"}</span></h3>
                <div className="small">Was: {usualText(s)} · {s.productName ?? "no product"}</div>
                <button className="btn line small" aria-label={`Restore ${s.name} to usual items`} disabled={!writesAllowed} onClick={async () => {
                  const r = await command("SetStapleActive", { ingredientKey: s.ingredientKey, expectedRevision: s.detailsRevision, active: true });
                  if (r.status !== "accepted") return setMsg(r.message);
                  setMsg(null);
                  announce(`${s.name} restored to your usual items.`);
                  setTimeout(() => focusFirst(document.querySelector<HTMLElement>(`[data-testid="staple-row-${s.ingredientKey}"] button`)), 0);
                }}>Restore</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {dialog && (
        <StapleDialogFor d={dialog.d} onClose={() => setDialog(null)} returnFocus={() => focusFirst(dialog.opener) ?? fallback(dialog.d)} />
      )}
    </section>
  );
}

function StapleDialogFor({ d, onClose, returnFocus }: { d: StapleDialog; onClose: () => void; returnFocus: () => void }) {
  const c = { onClose, returnFocus };
  if (d.kind === "add") return <AddStapleDialog {...c} />;
  if (d.kind === "edit") return <EditStapleDialog itemKey={d.key} {...c} />;
  if (d.kind === "product") return <StapleProductDialog itemKey={d.key} {...c} />;
  return <RemoveStapleDialog itemKey={d.key} {...c} />;
}

type C = { onClose: () => void; returnFocus: () => void };

function serverErrors(r: any, setErrors: (e: Errors) => void, setFormError: (m: string | null) => void, root: HTMLElement | null) {
  const field = r.details?.field ? FIELD[r.details.field] : null;
  if (field) {
    const errs = { [field]: r.message };
    setErrors(errs);
    setFormError(null);
    focusFirstInvalid(root, errs);
  } else setFormError(r.message);
}

function AmountFields({ f, setF, errors, units }: { f: { quantity: string; unit: string }; setF: (v: { quantity: string; unit: string }) => void; errors: Errors; units: string[] }) {
  return (
    <div className="grid3">
      <span className="stack">
        <label htmlFor="st-qty">Usual amount</label>
        <input {...fieldProps("st-qty", errors)} inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        <FieldError id="st-qty" errors={errors} />
      </span>
      <span className="stack">
        <label htmlFor="st-unit">Unit</label>
        <select {...fieldProps("st-unit", errors)} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          {units.map((u) => <option key={u} value={u}>{u === "package" ? "packages" : u}</option>)}
        </select>
        <FieldError id="st-unit" errors={errors} />
      </span>
    </div>
  );
}

function validateAmount(f: { quantity: string; unit: string }, errs: Errors) {
  if (!isDecimal(f.quantity) || Number(f.quantity) <= 0) errs["st-qty"] = "Usual amount must be a positive number";
  else if (f.unit === "package" && (!/^\d+$/.test(f.quantity.trim()) || Number(f.quantity) > 50)) errs["st-qty"] = "Packages must be a whole number from 1 to 50";
}

function AddStapleDialog({ onClose, returnFocus }: C) {
  const { snapshot, command, announce } = useStore();
  const taken = new Set((snapshot.staples ?? []).map((s: any) => s.ingredientKey));
  const items = snapshot.ingredients.filter((i: any) => !taken.has(i.key));
  const [f, setF] = useState({ item: "", name: "", productId: "", amount: { quantity: "1", unit: "package" } });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const products = (snapshot.products ?? []).filter((p: any) => p.ingredientKey === f.item);
  const chosen = products.find((p: any) => p.id === f.productId);
  const units = unitChoices(chosen?.packageUnit);
  return (
    <ModalSheet title="Add a usual item" closeLabel="Close without adding" onClose={onClose} returnFocus={returnFocus} testId="add-staple-dialog">
      <FormAlert message={formError} />
      <form ref={ref} className="stack small" noValidate onSubmit={async (e) => {
        e.preventDefault();
        const errs: Errors = {};
        if (!f.item) errs["st-item"] = "Choose an item";
        if (f.name.trim().length > 80) errs["st-name"] = "Name must be 80 characters or fewer";
        validateAmount(f.amount, errs);
        setErrors(errs);
        if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
        const r = await command("AddStaple", { ingredientKey: f.item, displayName: f.name.trim() || null, usual: f.amount, productId: f.productId || null });
        if (r.status !== "accepted") return serverErrors(r, setErrors, setFormError, ref.current);
        announce(`${f.name.trim() || items.find((i: any) => i.key === f.item)?.name} added to your usual items.`);
        onClose();
      }}>
        <label htmlFor="st-item">Item</label>
        <select {...fieldProps("st-item", errors)} data-autofocus="" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value, productId: "", amount: { ...f.amount, unit: "package" } })}>
          <option value="">Choose an item…</option>
          {items.map((i: any) => <option key={i.key} value={i.key}>{i.name}</option>)}
        </select>
        <FieldError id="st-item" errors={errors} />
        <label htmlFor="st-name">Name on the shortcut (optional)</label>
        <input {...fieldProps("st-name", errors)} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <FieldError id="st-name" errors={errors} />
        <label htmlFor="st-product">Remembered product</label>
        <select id="st-product" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value, amount: { ...f.amount, unit: "package" } })} disabled={!f.item}>
          <option value="">The household’s current choice for this item</option>
          {products.map((p: any) => <option key={p.id} value={p.id} disabled={!p.available}>{p.name}{p.available ? "" : " — not available from this store"}</option>)}
        </select>
        <AmountFields f={f.amount} setF={(amount) => setF({ ...f, amount })} errors={errors} units={units} />
        <button className="btn primary small">Add usual item</button>
      </form>
    </ModalSheet>
  );
}

/** Shows the current values when the staple changed while the dialog was open (typed work kept). */
function Conflict({ s, onReviewed, what }: { s: any; onReviewed: () => void; what: string }) {
  return (
    <div className="warnbox" data-testid="staple-conflict">
      <p>
        {s.lastChange?.by ?? s.updatedBy ?? "Someone"} changed this usual item while this was open. Now: <strong>{s.name}</strong>, {usualText(s)}, product {s.productName ?? "none"}
        {s.active ? "" : " — removed from usual items"}. {what}
      </p>
      <button type="button" className="btn line small" onClick={onReviewed} disabled={!s.active}>I’ve reviewed the current values</button>
    </div>
  );
}

function EditStapleDialog({ itemKey, onClose, returnFocus }: C & { itemKey: string }) {
  const { snapshot, command, announce } = useStore();
  const s = snapshot.staples.find((x: any) => x.ingredientKey === itemKey);
  const [seen, setSeen] = useState<number>(s?.detailsRevision ?? 0);
  const [label] = useState<string>(s?.name ?? itemKey);
  const [f, setF] = useState({ name: s?.displayName ?? "", amount: { ...(s?.usual ?? { quantity: "1", unit: "package" }) } });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const conflict = !!s && s.detailsRevision !== seen;
  const units = unitChoices(s?.productPackage?.unit);
  if (!units.includes(f.amount.unit)) units.push(f.amount.unit);
  return (
    <ModalSheet title={`Edit ${label}`} subtitle={s ? `Item: ${s.ingredientName}` : undefined} closeLabel="Close without saving" onClose={onClose} returnFocus={returnFocus} testId="edit-staple-dialog">
      {conflict && <Conflict s={s} what="What you typed is kept below." onReviewed={() => { setSeen(s.detailsRevision); setFormError(null); }} />}
      <FormAlert message={formError} testId="staple-error" />
      <form ref={ref} className="stack small" noValidate onSubmit={async (e) => {
        e.preventDefault();
        const errs: Errors = {};
        if (f.name.trim().length > 80) errs["st-name"] = "Name must be 80 characters or fewer";
        validateAmount(f.amount, errs);
        setErrors(errs);
        if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
        const r = await command("UpdateStaple", { ingredientKey: itemKey, expectedRevision: seen, displayName: f.name.trim() || null, usual: { quantity: f.amount.quantity.trim(), unit: f.amount.unit } });
        if (r.status !== "accepted") return serverErrors(r, setErrors, setFormError, ref.current);
        announce(`${f.name.trim() || s?.ingredientName} saved.`);
        onClose();
      }}>
        <label htmlFor="st-name">Name on the shortcut (optional)</label>
        <input {...fieldProps("st-name", errors)} data-autofocus="" placeholder={s?.ingredientName} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <FieldError id="st-name" errors={errors} />
        <AmountFields f={f.amount} setF={(amount) => setF({ ...f, amount })} errors={errors} units={units} />
        {s?.productPackage && <p className="faint">{s.productName} comes in {s.productPackage.quantity} {s.productPackage.unit} packages; a measured amount is rounded up to whole packages.</p>}
        <button className="btn primary small" disabled={!s || conflict || !s.active}>Save</button>
      </form>
    </ModalSheet>
  );
}

function StapleProductDialog({ itemKey, onClose, returnFocus }: C & { itemKey: string }) {
  const { snapshot, command, announce } = useStore();
  const s = snapshot.staples.find((x: any) => x.ingredientKey === itemKey);
  const [seen, setSeen] = useState<number>(s?.productRevision ?? 0);
  const [label] = useState<string>(s?.name ?? itemKey);
  const [choice, setChoice] = useState<string>(s?.productId ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const products = (snapshot.products ?? []).filter((p: any) => p.ingredientKey === itemKey);
  const conflict = !!s && s.productRevision !== seen;
  return (
    <ModalSheet title={`Remembered product for ${label}`} subtitle={s ? `Now: ${s.productName ?? "none"}` : undefined} closeLabel="Close without changing" onClose={onClose} returnFocus={returnFocus} testId="staple-product-dialog">
      {conflict && <Conflict s={s} what="Your selection below is kept." onReviewed={() => { setSeen(s.productRevision); setFormError(null); }} />}
      <FormAlert message={formError} testId="staple-error" />
      <fieldset className="stack">
        <legend>Which product should a one-tap request ask for?</legend>
        {products.length === 0 && <p className="faint small">No products recorded for this item yet. Record one from a Groceries line first.</p>}
        {products.map((p: any, i: number) => (
          <label key={p.id} className="option-row">
            <input type="radio" name="st-product" checked={choice === p.id} disabled={!p.available} data-autofocus={(choice ? choice === p.id : i === 0) ? "" : undefined} onChange={() => setChoice(p.id)} />
            <span>{p.name}{p.packageQty ? ` · ${p.packageQty} ${p.packageUnit}` : ""}{p.id === s?.productId ? " · current" : ""}{p.available ? "" : " · not available from this store"}</span>
          </label>
        ))}
      </fieldset>
      <p className="faint small">This only changes what future one-tap requests ask for. It doesn’t approve buying anything or change lists already made.</p>
      <button type="button" className="btn primary" disabled={!s || !s.active || conflict || !choice || choice === s.productId} onClick={async () => {
        const r = await command("ApproveStapleProduct", { ingredientKey: itemKey, productId: choice, expectedRevision: seen });
        if (r.status !== "accepted") return setFormError(r.message);
        announce(`${products.find((p: any) => p.id === choice)?.name} is now your usual ${label}. Nothing was approved for purchase.`);
        onClose();
      }}>Make this our usual</button>
    </ModalSheet>
  );
}

function RemoveStapleDialog({ itemKey, onClose, returnFocus }: C & { itemKey: string }) {
  const { snapshot, command, announce } = useStore();
  const s = snapshot.staples.find((x: any) => x.ingredientKey === itemKey);
  const [seen, setSeen] = useState<number>(s?.detailsRevision ?? 0);
  const [label] = useState<string>(s?.name ?? itemKey);
  const [formError, setFormError] = useState<string | null>(null);
  const conflict = !!s && s.detailsRevision !== seen;
  return (
    <ModalSheet title={`Remove ${label} from usual items?`} closeLabel="Close without removing" onClose={onClose} returnFocus={returnFocus} testId="remove-staple-dialog">
      {conflict && <Conflict s={s} what="Decide again with the current values." onReviewed={() => { setSeen(s.detailsRevision); setFormError(null); }} />}
      <FormAlert message={formError} testId="staple-error" />
      <p>The one-tap shortcut goes away. Anything already on a pickup list, and anything a dinner needs, stays. You can restore it later from “Removed usual items”.</p>
      <div className="row">
        <button type="button" className="btn line" data-autofocus="" onClick={onClose}>Keep it</button>
        <button type="button" className="btn danger" disabled={!s || !s.active || conflict} onClick={async () => {
          const r = await command("SetStapleActive", { ingredientKey: itemKey, expectedRevision: seen, active: false });
          if (r.status !== "accepted") return setFormError(r.message);
          announce(`${label} removed from your usual items. Lists already made are unchanged.`);
          onClose();
        }}>Remove from usual items</button>
      </div>
    </ModalSheet>
  );
}

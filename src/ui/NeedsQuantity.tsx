"use client";
import { useState } from "react";
import { useStore } from "./store";
import { KNOWN_UNITS } from "@/domain/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Q6 (owner rule): ingredients a recipe names without an amount stay visible here until a member gives an amount for
 * the planned servings or marks Don't buy. Nothing is invented; while any remain, the list is not ready.
 */
export function NeedsQuantity() {
  const { snapshot } = useStore();
  const s = snapshot?.groceries?.summary;
  const needs: any[] = s?.needsQuantity ?? [];
  const notBuying: any[] = s?.notBuying ?? [];
  if (!needs.length && !notBuying.length) return null;
  return (
    <div className="stack" data-testid="needs-quantity">
      {needs.length > 0 && (
        <div className="card stack warn-card">
          <h3 className="section-label" style={{ margin: 0 }} id="nq-h">Needs a quantity ({needs.length})</h3>
          <p className="small muted" style={{ margin: 0 }}>
            These recipes name an ingredient without an amount. Give the amount you want for the servings you planned, or mark Don&apos;t buy. The list can&apos;t be sent until each one is answered.
          </p>
          <ul className="plain stack" aria-labelledby="nq-h">
            {needs.map((n) => <NeedRow key={`${n.selectedMealId}:${n.itemId}`} n={n} />)}
          </ul>
        </div>
      )}
      {notBuying.length > 0 && (
        <div className="small muted" data-testid="not-buying">
          <strong>Not buying:</strong>{" "}
          {notBuying.map((n, i) => (
            <span key={`${n.selectedMealId}:${n.itemId}`}>
              {i > 0 ? "; " : ""}
              {n.name} for {n.recipeTitle}
              {n.by ? ` (${n.by})` : ""} <UndoDontBuy n={n} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function mealOf(snapshot: any, id: string) {
  return snapshot?.mealList?.meals?.find((m: any) => m.id === id) ?? null;
}

function NeedRow({ n }: { n: any }) {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const [amount, setAmount] = useState(n.earlier?.quantity ?? "");
  const [unit, setUnit] = useState(n.earlier?.unit ?? "each");
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const meal = mealOf(snapshot, n.selectedMealId);
  const base = `nq-${n.selectedMealId}-${n.itemId}`;
  async function answer(a: any, what: string) {
    if (!meal) return;
    const r = await command("AnswerMissingQuantity", { selectedMealId: n.selectedMealId, expectedRevision: meal.revision, itemId: n.itemId, answer: a });
    if (r.status === "accepted") {
      setErr(null);
      announce(what);
    } else setErr({ text: r.message, field: r.details?.field });
  }
  return (
    <li className="nq-row" data-testid={`nq-${n.name}`}>
      <div>
        <strong>{n.name}</strong> <span className="muted">for {n.recipeTitle} · {n.servings} servings{n.note ? ` · ${n.note}` : ""}</span>
      </div>
      {n.earlier && (
        <p className="small warn" style={{ margin: "2px 0" }}>
          You gave {n.earlier.quantity} {n.earlier.unit} for {n.earlier.forServings} servings; {n.servings} are planned now. Give the amount again.
        </p>
      )}
      <form
        className="row small"
        onSubmit={(e) => {
          e.preventDefault();
          void answer({ quantity: amount.trim(), unit }, `${n.name}: ${amount.trim()} ${unit} for ${n.recipeTitle}`);
        }}
      >
        <label className="sr-only" htmlFor={`${base}-amt`}>Amount of {n.name} for {n.recipeTitle}</label>
        <Input id={`${base}-amt`} className="tiny" inputMode="decimal" placeholder="amount" value={amount} onChange={(e) => setAmount(e.target.value)}
          aria-invalid={err?.field === "quantity" ? true : undefined} aria-describedby={err ? `${base}-err` : undefined} />
        <label className="sr-only" htmlFor={`${base}-unit`}>Unit for {n.name}</label>
        <NativeSelect id={`${base}-unit`} value={unit} onChange={(e) => setUnit(e.target.value)} aria-invalid={err?.field === "unit" ? true : undefined}>
          {KNOWN_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </NativeSelect>
        <Button variant="outline" size="sm" type="submit" disabled={!writesAllowed || !amount.trim()} aria-label={`Set the amount of ${n.name} for ${n.recipeTitle}`}>Set amount</Button>
        <Button variant="outline" size="sm" type="button" disabled={!writesAllowed} aria-label={`Don't buy ${n.name} for ${n.recipeTitle}`}
          onClick={() => void answer({ dontBuy: true }, `${n.name} will not be bought for ${n.recipeTitle}`)}>Don&apos;t buy</Button>
      </form>
      {err && <p role="alert" className="warnbox small" id={`${base}-err`}>{err.text}</p>}
    </li>
  );
}

function UndoDontBuy({ n }: { n: any }) {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const meal = mealOf(snapshot, n.selectedMealId);
  return (
    <button className="link small" disabled={!writesAllowed || !meal} aria-label={`Ask again about ${n.name} for ${n.recipeTitle}`}
      onClick={async () => {
        const r = await command("AnswerMissingQuantity", { selectedMealId: n.selectedMealId, expectedRevision: meal.revision, itemId: n.itemId, answer: null });
        announce(r.status === "accepted" ? `${n.name} needs a quantity again` : r.message);
      }}>undo</button>
  );
}

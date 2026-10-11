"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SnapshotScope, useStore } from "./store";
import { GroceriesScreen } from "./Groceries";
import { PlaceholderTile } from "./Tile";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Catalog-first selection (CATALOG-FIRST-PLAN §0): one shared, day-free list of meals with planned servings. Every
 * change is a server command bound to the revision shown; another member's change is reported in words, never merged.
 */

const MAX = 48;

/** The open list's grocery scope: its undated week and its own cycle's groceries (never a calendar week's). */
function useListSnapshot() {
  const { snapshot } = useStore();
  return useMemo(() => {
    const l = snapshot?.mealList;
    if (!snapshot || !l) return null;
    return { ...snapshot, week: { id: l.weekId, kind: "meal_list", weekStart: null, acceptedChoiceRevision: 0 }, groceries: l.groceries };
  }, [snapshot]);
}

export function ListGroceriesScreen() {
  const { snapshot } = useStore();
  const scoped = useListSnapshot();
  if (!snapshot) return <p className="muted">Loading…</p>;
  if (!scoped)
    return (
      <section aria-label="Groceries" data-testid="groceries">
        <h2 className="page-title">Groceries</h2>
        <p className="muted" data-testid="groceries-empty">Nothing selected yet. Add meals from <Link href="/recipes">Recipes</Link> with +; their ingredients are combined here.</p>
      </section>
    );
  return (
    <SnapshotScope snapshot={scoped}>
      <GroceriesScreen variant="checklist" />
    </SnapshotScope>
  );
}

/** − n + with a visible number; commits on each press (a server command bound to what was shown). */
export function ServingsStepper({ value, onChange, label, disabled }: { value: number; onChange: (n: number) => void; label: string; disabled?: boolean }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="btn line small" disabled={disabled || value <= 1} aria-label={`Fewer servings (${label})`} onClick={() => onChange(value - 1)}>−</button>
      <output aria-live="off" data-testid="servings-value">{value}</output>
      <button type="button" className="btn line small" disabled={disabled || value >= MAX} aria-label={`More servings (${label})`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

/** The reviewed servings of a recipe version when its exact rows agree, else 2 (D141). */
export function defaultServings(version: any): number {
  const s = new Set<number>((version?.ingredients ?? []).map((i: any) => i.exactServings).filter((x: any) => typeof x === "number"));
  return s.size === 1 ? [...s][0] : 2;
}

/** Add a recipe to Selected Meals, or — when it is already there — change its servings (Q2: never a second copy). */
export function SelectControl({ recipe, compact }: { recipe: any; compact?: boolean }) {
  const { snapshot, command, writesAllowed, announce } = useStore();
  const selected = snapshot?.mealList?.meals?.find((m: any) => m.recipeId === recipe.recipeId) ?? null;
  const [servings, setServings] = useState<number>(() => defaultServings(recipe.version));
  const [msg, setMsg] = useState<string | null>(null);
  const title = recipe.version.title;
  async function add() {
    const r = await command("AddSelectedMeal", { recipeId: recipe.recipeId, versionId: recipe.version.id, servings });
    if (r.status === "accepted") {
      setMsg(null);
      announce(`${title} added to Selected Meals, ${servings} servings`);
    } else setMsg(r.message);
  }
  if (selected) return <SelectedServings meal={selected} compact={compact} />;
  return (
    <div className={compact ? "select-control compact" : "select-control"} data-testid="select-control">
      {!compact && <ServingsStepper value={servings} onChange={setServings} label={`Servings of ${title}`} disabled={!writesAllowed} />}
      <button className={compact ? "plus-btn" : "btn primary"} disabled={!writesAllowed} onClick={add} aria-label={`Add ${title} to Selected Meals${compact ? ` (${servings} servings)` : ""}`} data-testid="add-selected">
        {compact ? <span aria-hidden="true">+</span> : "Add to Selected Meals"}
      </button>
      {msg && <p role="alert" className="warnbox small">{msg}</p>}
    </div>
  );
}

function SelectedServings({ meal, compact }: { meal: any; compact?: boolean }) {
  const { command, writesAllowed, announce } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  async function set(n: number) {
    const r = await command("SetSelectedMealServings", { selectedMealId: meal.id, expectedRevision: meal.revision, servings: n });
    if (r.status === "accepted") {
      setMsg(null);
      announce(`${meal.title}: ${n} servings`);
    } else setMsg(r.message);
  }
  if (compact)
    return (
      <Link className="plus-btn on" href="/selected" aria-label={`${meal.title} is selected, ${meal.servings} servings — open Selected Meals`} data-testid="selected-mark">
        <span aria-hidden="true">✓{meal.servings}</span>
      </Link>
    );
  return (
    <div className="select-control" data-testid="select-control">
      <p className="small" style={{ margin: 0 }}>Selected · {meal.servings} servings (added by {meal.addedBy})</p>
      <ServingsStepper value={meal.servings} onChange={set} label={`Servings of ${meal.title}`} disabled={!writesAllowed} />
      {msg && <p role="alert" className="warnbox small">{msg}</p>}
    </div>
  );
}

export function SelectedMealsScreen() {
  const { snapshot } = useStore();
  if (!snapshot) return <p className="muted">Loading…</p>;
  const list = snapshot.mealList;
  const meals: any[] = list?.meals ?? [];
  const lines: any[] = list?.groceries?.lines ?? [];
  const toBuy = lines.filter((l) => l.toSend !== 0).length;
  const needs: any[] = list?.groceries?.summary?.needsQuantity ?? [];
  return (
    <section aria-label="Selected meals" data-testid="selected-meals" className="stack">
      <h2 className="page-title">Selected meals</h2>
      {!meals.length ? (
        <p className="muted" data-testid="selected-empty">Nothing selected yet. Tap + on a recipe in <Link href="/recipes">Recipes</Link> to add it with the servings you want — no day needed.</p>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            {meals.length} meal{meals.length === 1 ? "" : "s"} · {meals.reduce((a, m) => a + m.servings, 0)} servings. Both of you see and change this list.
          </p>
          <ul className="plain" aria-label="Selected meals">
            {meals.map((m) => <MealCard key={m.id} m={m} needs={needs.filter((n) => n.selectedMealId === m.id)} />)}
          </ul>
          <Link className="btn primary" href="/groceries" data-testid="review-groceries">
            Review groceries ({toBuy} item{toBuy === 1 ? "" : "s"}{needs.length ? `, ${needs.length} need a quantity` : ""})
          </Link>
        </>
      )}
      {list && <NewList list={list} />}
    </section>
  );
}

function MealCard({ m, needs }: { m: any; needs: any[] }) {
  const { command, writesAllowed, announce } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  async function run(name: string, payload: any, said: string) {
    const r = await command(name, payload);
    if (r.status === "accepted") {
      setMsg(null);
      announce(said);
    } else setMsg(r.message);
  }
  const newer = m.currentVersionId && m.currentVersionId !== m.versionId;
  return (
    <li className="card meal-card" data-testid="selected-meal" data-title={m.title}>
      <Link href={`/recipes/${m.recipeId}`} className="meal-thumb" tabIndex={-1} aria-hidden="true">
        <PlaceholderTile title={m.title} imageId={m.imageId} />
      </Link>
      <div className="stack meal-body">
        <h3 className="meal-title"><Link href={`/recipes/${m.recipeId}`}>{m.title}</Link></h3>
        <div className="row between">
          <ServingsStepper value={m.servings} label={`Servings of ${m.title}`} disabled={!writesAllowed}
            onChange={(n) => run("SetSelectedMealServings", { selectedMealId: m.id, expectedRevision: m.revision, servings: n }, `${m.title}: ${n} servings`)} />
          <button className="link small" disabled={!writesAllowed} aria-label={`Remove ${m.title} from Selected Meals`}
            onClick={() => run("RemoveSelectedMeal", { selectedMealId: m.id, expectedRevision: m.revision }, `${m.title} removed from Selected Meals`)}>Remove</button>
        </div>
        <p className="small faint" style={{ margin: 0 }}>
          Version {m.versionNo} · added by {m.addedBy}{m.updatedBy !== m.addedBy ? ` · changed by ${m.updatedBy}` : ""}
        </p>
        {newer && (
          <p className="small" style={{ margin: 0 }} data-testid="newer-version">
            This list uses version {m.versionNo}; the recipe now has version {m.currentVersionNo}.{" "}
            <button className="link small" disabled={!writesAllowed}
              onClick={() => run("UseRecipeVersion", { selectedMealId: m.id, expectedRevision: m.revision, versionId: m.currentVersionId }, `${m.title} now uses version ${m.currentVersionNo}`)}>
              Use version {m.currentVersionNo}
            </button>
          </p>
        )}
        {m.archived && <p className="small warn" style={{ margin: 0 }}>This recipe was archived; it stays on the list until you remove it.</p>}
        {needs.length > 0 && (
          <p className="small warn" style={{ margin: 0 }} data-testid="meal-needs-quantity">
            Needs a quantity: {needs.map((n) => n.name).join(", ")} · <Link href="/groceries">answer in Groceries</Link>
          </p>
        )}
        {msg && <p role="alert" className="warnbox small">{msg}</p>}
      </div>
    </li>
  );
}

function NewList({ list }: { list: any }) {
  const { command, writesAllowed, announce } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="small muted stack" data-testid="new-list">
      {!confirm ? (
        <button className="link small" disabled={!writesAllowed} onClick={() => setConfirm(true)}>Start a new list…</button>
      ) : (
        <div className="warnbox stack" role="group" aria-label="Start a new list">
          <p style={{ margin: 0 }}>This closes the current list for both of you. It is kept, with anything already sent or ordered; the next meal you add starts a new list.</p>
          <div className="row">
            <button className="btn line small" autoFocus onClick={() => setConfirm(false)}>Keep this list</button>
            <button className="btn line small" disabled={!writesAllowed} onClick={async () => {
              const r = await command("StartNewMealList", { listId: list.id, expectedRevision: list.revision });
              if (r.status === "accepted") {
                setConfirm(false);
                setMsg(null);
                announce("A new list has started");
              } else setMsg(r.message);
            }}>Start a new list</button>
          </div>
        </div>
      )}
      {msg && <p role="alert" className="warnbox">{msg}</p>}
    </div>
  );
}

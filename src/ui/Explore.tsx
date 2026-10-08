"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { money, nutrient } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

type SortKey = "title" | "effort" | "calories" | "protein" | "serving_cost" | "basket_cost";

const SORTS: { key: SortKey; label: string; value: (r: any) => number | null }[] = [
  { key: "title", label: "Name", value: () => 0 },
  { key: "effort", label: "Effort (minutes)", value: (r) => r.version.effortMinutes ?? null },
  { key: "calories", label: "Calories per plate", value: (r) => (r.nutritionPerPlate.calories.value === null ? null : Number(r.nutritionPerPlate.calories.value)) },
  { key: "protein", label: "Protein per plate (high first)", value: (r) => (r.nutritionPerPlate.proteinG.value === null ? null : -Number(r.nutritionPerPlate.proteinG.value)) },
  { key: "serving_cost", label: "Serving cost", value: (r) => (r.servingCost.complete ? r.servingCost.knownMinor : null) },
  { key: "basket_cost", label: "Additional basket cost", value: (r) => (r.additionalBasketCost.known ? r.additionalBasketCost.minor : null) },
];

export function ExploreScreen() {
  const { library, loadLibrary, command } = useStore();
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [effort, setEffort] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [passOnly, setPassOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("title");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const { known, unknown } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (library?.recipes ?? []).filter((r: any) => {
      if (r.archived) return false;
      const hay = [r.version.title, r.version.cuisine ?? "", r.version.summary ?? "", ...r.ingredientNames].join(" ").toLowerCase();
      if (q && !q.split(/\s+/).every((t) => hay.includes(t))) return false;
      if (cuisine && r.version.cuisine !== cuisine) return false;
      if (effort && r.version.effortLevel !== effort) return false;
      if (ingredient && !r.ingredientNames.some((n: string) => n.toLowerCase().includes(ingredient.toLowerCase()))) return false;
      if (passOnly && r.constraint.status !== "ok") return false;
      return true;
    });
    const s = SORTS.find((x) => x.key === sort)!;
    if (sort === "title") return { known: list.sort((a: any, b: any) => a.version.title.localeCompare(b.version.title)), unknown: [] };
    const k = list.filter((r: any) => s.value(r) !== null).sort((a: any, b: any) => s.value(a)! - s.value(b)! || a.version.title.localeCompare(b.version.title));
    const u = list.filter((r: any) => s.value(r) === null).sort((a: any, b: any) => a.version.title.localeCompare(b.version.title));
    return { known: k, unknown: u };
  }, [library, query, cuisine, effort, ingredient, passOnly, sort]);

  const cuisines = [...new Set((library?.recipes ?? []).map((r: any) => r.version.cuisine).filter(Boolean))].sort() as string[];
  return (
    <section aria-label="Explore">
      <div className="card stack">
        <label>
          Search recipes, cuisines and ingredients
          <input data-testid="explore-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. chicken rice" type="search" />
        </label>
        <div className="grid4">
          <label>Cuisine<select value={cuisine} onChange={(e) => setCuisine(e.target.value)}><option value="">Any</option>{cuisines.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Effort<select value={effort} onChange={(e) => setEffort(e.target.value)}><option value="">Any</option><option>easy</option><option>medium</option><option>involved</option></select></label>
          <label>Includes ingredient<input value={ingredient} onChange={(e) => setIngredient(e.target.value)} /></label>
          <label>Sort by<select data-testid="explore-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>{SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        </div>
        <label className="row small"><input type="checkbox" checked={passOnly} onChange={(e) => setPassOnly(e.target.checked)} /> Only recipes that pass our exclusions</label>
        <p className="faint small">Costs use recorded package prices (simulated store); additional basket cost compares adding one dinner for both of you to the current accepted week. Nutrition is per default plate from explicit ingredient data.</p>
      </div>
      {msg && <p role="status" className="small">{msg}</p>}
      {!library && <p className="muted">Loading…</p>}
      <ul className="recipes" data-testid="explore-results">
        {known.map((r: any) => <RecipeCard key={r.recipeId} r={r} onSave={async () => { const x = await command("SaveInterest", { recipeId: r.recipeId }); setMsg(x.status === "accepted" ? `Saved ${r.version.title} to Sounds good.` : x.message); }} />)}
      </ul>
      {unknown.length > 0 && (
        <>
          <div className="section-label" data-testid="unknown-group">Value unknown for this sort</div>
          <ul className="recipes">{unknown.map((r: any) => <RecipeCard key={r.recipeId} r={r} onSave={async () => { await command("SaveInterest", { recipeId: r.recipeId }); }} />)}</ul>
        </>
      )}
    </section>
  );
}

function RecipeCard({ r, onSave }: { r: any; onSave: () => void }) {
  return (
    <li className="card recipe" data-testid="recipe-card" data-title={r.version.title}>
      <div className="thumb" aria-hidden="true">{r.version.title.replace("Fixture: ", "").slice(0, 1)}</div>
      <div className="grow">
        <Link href={`/recipes/${r.recipeId}`}><strong>{r.version.title}</strong></Link>
        <div className="faint small">
          {r.version.cuisine ?? "—"} · {r.version.effortMinutes ? `${r.version.effortMinutes} min${r.version.estimate ? " (est.)" : ""}` : "time unknown"} · {nutrient(r.nutritionPerPlate.calories, " kcal")}
        </div>
        <div className="faint small">
          Serving {r.servingCost.complete ? money(r.servingCost.knownMinor) : "unknown"} · Adds {r.additionalBasketCost.known ? money(r.additionalBasketCost.minor) : "unknown"} to this week’s basket
          {r.constraint.status !== "ok" && <span className="warn"> · {r.constraint.status === "violated" ? "conflicts with an exclusion" : "ingredient info unknown"}</span>}
        </div>
      </div>
      <button className="btn line small" onClick={onSave} disabled={!!r.interest}>{r.interest ? "In Sounds good" : "Sounds good"}</button>
    </li>
  );
}

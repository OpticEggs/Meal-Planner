"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { money, nutrient } from "./format";
import { PlaceholderTile } from "./Tile";
import { AddFromLinkForm, BUDGET_BYTES_INDEX, SaveLinkForm, SavedLinksList } from "./SavedLinks";
import { budgetBytesSearchUrl } from "@/domain/recipes/import";
import { ImportReviewDialog } from "./ImportReview";
import { focusFirst } from "./a11y";

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
  const [source, setSource] = useState<"" | "budget_bytes" | "links">("");
  const [importing, setImporting] = useState<{ b: any; el: HTMLElement; result?: any } | null>(null);
  const [bbTerm, setBbTerm] = useState("");
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
      if (source === "budget_bytes" && r.version.sourceDomain !== "budgetbytes.com") return false;
      if (source === "links") return false; // saved links are listed below, recipes are not
      return true;
    });
    const s = SORTS.find((x) => x.key === sort)!;
    if (sort === "title") return { known: list.sort((a: any, b: any) => a.version.title.localeCompare(b.version.title)), unknown: [] };
    const k = list.filter((r: any) => s.value(r) !== null).sort((a: any, b: any) => s.value(a)! - s.value(b)! || a.version.title.localeCompare(b.version.title));
    const u = list.filter((r: any) => s.value(r) === null).sort((a: any, b: any) => a.version.title.localeCompare(b.version.title));
    return { known: k, unknown: u };
  }, [library, query, cuisine, effort, ingredient, passOnly, sort, source]);
  const links = (library?.bookmarks ?? []).filter((b: any) => !b.archived && (source === "links" || (source === "budget_bytes" && b.domain === "budgetbytes.com")));

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
          <label>Source<select data-testid="explore-source" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
            <option value="">Any (our recipes)</option><option value="budget_bytes">Budget Bytes</option><option value="links">Saved links (any site)</option>
          </select></label>
          <label>Sort by<select data-testid="explore-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>{SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        </div>
        <label className="row small"><input type="checkbox" checked={passOnly} onChange={(e) => setPassOnly(e.target.checked)} /> Only recipes that pass our exclusions</label>
        <p className="faint small">Costs use recorded package prices (simulated store); additional basket cost compares adding one dinner for both of you to the current accepted week. Nutrition is per default plate from explicit ingredient data.</p>
      </div>
      {source === "budget_bytes" && (
        <div className="card stack" data-testid="budget-bytes-lane">
          <h2 className="h3" style={{ margin: 0 }}>Budget Bytes</h2>
          <p className="small" style={{ margin: 0 }}>Find a recipe on Budget Bytes, then paste its link below. Budget Bytes asks for permission before its recipes are reused, so Table keeps only the link and the ingredient lines you paste — not its method, photos or posted prices (those are from when each recipe was published, not your store today).</p>
          <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); if (bbTerm.trim()) window.open(budgetBytesSearchUrl(bbTerm), "_blank", "noopener,noreferrer"); }} data-testid="bb-search">
            <input className="grow" type="search" aria-label="Search Budget Bytes (opens the Budget Bytes site)" placeholder="e.g. chicken, lentils, meal prep" value={bbTerm} onChange={(e) => setBbTerm(e.target.value)} />
            <button className="btn line small" disabled={!bbTerm.trim()}>Search on Budget Bytes ↗</button>
          </form>
          <a className="btn line" href={BUDGET_BYTES_INDEX} target="_blank" rel="noopener noreferrer" data-testid="browse-budget-bytes">Browse Budget Bytes ↗</a>
          <AddFromLinkForm onOpen={(b, el, result) => setImporting({ b, el, result })} />
          <SaveLinkForm idPrefix="bb-save-link" source="Budget Bytes" />
        </div>
      )}
      {source === "links" && <div className="card"><SaveLinkForm idPrefix="explore-save-link" /></div>}
      {source && (
        <>
          <div className="section-label">{source === "budget_bytes" ? "Budget Bytes links you saved" : "Saved links"}</div>
          <SavedLinksList links={links} empty={source === "budget_bytes" ? "No Budget Bytes links saved yet. Browse Budget Bytes, copy a recipe's link and save it here." : "No saved links yet."} onImport={(b, el) => setImporting({ b, el })} />
          {source === "budget_bytes" && <div className="section-label">Budget Bytes recipes in Our Recipes</div>}
        </>
      )}
      {importing && <ImportReviewDialog bookmark={importing.b} initial={importing.result} onClose={() => { const el = importing.el; setImporting(null); focusFirst(el, () => document.querySelector<HTMLElement>('[data-testid="explore-source"]')); }} />}
      {msg && <p role="status" className="small">{msg}</p>}
      {!library && <p className="muted">Loading…</p>}
      <ul className="recipes" data-testid="explore-results">
        {known.map((r: any) => <RecipeCard key={r.recipeId} r={r} onSave={async () => { const x = await command("SaveInterest", { recipeId: r.recipeId }); setMsg(x.status === "accepted" ? `Saved ${r.version.title} to Sounds good.` : x.message); }} />)}
      </ul>
      {unknown.length > 0 && (
        <>
          <div className="section-label" data-testid="unknown-group">Value unknown for this sort</div>
          <ul className="recipes">{unknown.map((r: any) => <RecipeCard key={r.recipeId} r={r} onSave={async () => { const x = await command("SaveInterest", { recipeId: r.recipeId }); setMsg(x.status === "accepted" ? `Saved ${r.version.title} to Sounds good.` : x.message); }} />)}</ul>
        </>
      )}
    </section>
  );
}

function RecipeCard({ r, onSave }: { r: any; onSave: () => void }) {
  return (
    <li className="card recipe" data-testid="recipe-card" data-title={r.version.title}>
      <PlaceholderTile title={r.version.title} imageId={r.version.imageId} />
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
      <button className="btn line small" onClick={onSave} disabled={!!r.interest} aria-label={`${r.interest ? "In Sounds good" : "Sounds good"}: ${r.version.title}`}>{r.interest ? "In Sounds good" : "Sounds good"}</button>
    </li>
  );
}

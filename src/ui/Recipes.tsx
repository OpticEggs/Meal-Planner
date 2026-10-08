"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "./store";
import { money, nutrient } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PREFS = [
  { v: "make_again", label: "Make again" },
  { v: "occasionally", label: "Occasionally" },
  { v: "not_for_me", label: "Not for me" },
] as const;

export function RecipesScreen() {
  const { library, loadLibrary, me, command } = useStore();
  const [filter, setFilter] = useState<"all" | "favorites" | "sounds_good">("all");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);
  if (!library) return <p className="muted">Loading…</p>;
  const list = library.recipes.filter((r: any) =>
    filter === "favorites" ? r.favoriteOf.includes(me.memberId) : filter === "sounds_good" ? !!r.interest : !r.archived,
  );
  return (
    <section aria-label="Our recipes">
      <div className="row">
        <div className="tabs" role="tablist">
          {(["all", "favorites", "sounds_good"] as const).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {{ all: "All", favorites: "My favorites", sounds_good: "Sounds good" }[f]}
            </button>
          ))}
        </div>
        <button className="btn line small" onClick={() => setCreating(!creating)} data-testid="new-recipe">{creating ? "Close" : "New recipe"}</button>
      </div>
      {creating && <RecipeEditor onDone={() => setCreating(false)} />}
      {filter === "sounds_good" && <p className="faint small">Shared near-term ideas. Saving one does not schedule it.</p>}
      <ul className="recipes" data-testid="recipe-list">
        {list.map((r: any) => (
          <li key={r.recipeId} className="card recipe" data-testid="recipe-row" data-title={r.version.title}>
            <div className="grow">
              <Link href={`/recipes/${r.recipeId}`}><strong>{r.version.title}</strong></Link>
              <div className="faint small">
                v{r.version.versionNo} · {r.version.provenance}
                {r.interest ? ` · Sounds good (${r.interest.display_name ?? r.interest.by ?? ""})` : ""}
                {r.preferences[me.memberId] ? ` · you: ${PREFS.find((p) => p.v === r.preferences[me.memberId])?.label}` : " · you: no feedback yet"}
              </div>
            </div>
            {r.interest && <button className="btn line small" onClick={() => command("ArchiveInterest", { interestId: r.interest.id })}>Clear idea</button>}
            <button className="btn line small" aria-pressed={r.favoriteOf.includes(me.memberId)} onClick={() => command("SetFavorite", { recipeId: r.recipeId, favorite: !r.favoriteOf.includes(me.memberId) })}>
              {r.favoriteOf.includes(me.memberId) ? "★ Favorite" : "☆ Favorite"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const { library, loadLibrary, me, command } = useStore();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);
  if (!library) return <p className="muted">Loading…</p>;
  const r = library.recipes.find((x: any) => x.recipeId === recipeId);
  if (!r) return <p className="muted">Recipe not found. <Link href="/recipes">Back</Link></p>;
  const v = r.version;
  return (
    <article className="stack" data-testid="recipe-detail">
      <Link href="/recipes" className="small">‹ Our Recipes</Link>
      <h2 className="h2" data-testid="recipe-title">{v.title}</h2>
      <p className="faint small">
        Version {v.versionNo} · {v.provenance === "fixture" ? "test fixture" : v.provenance}{v.sourceLabel ? ` · ${v.sourceLabel}` : ""}{v.estimate ? " · amounts/times are estimates" : ""}
      </p>
      <div className="row">
        {PREFS.map((p) => (
          <button key={p.v} className={`btn small ${r.preferences[me.memberId] === p.v ? "primary" : "line"}`} aria-pressed={r.preferences[me.memberId] === p.v}
            onClick={() => command("SetRecipePreference", { recipeId, value: r.preferences[me.memberId] === p.v ? null : p.v })}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="small">
        {library.members.map((m: any) => `${m.displayName}: ${PREFS.find((p) => p.v === r.preferences[m.id])?.label ?? "unknown"}`).join(" · ")}
      </p>
      <div className="row">
        <button className="btn line small" onClick={() => command("SetFavorite", { recipeId, favorite: !r.favoriteOf.includes(me.memberId) })}>{r.favoriteOf.includes(me.memberId) ? "★ Favorite" : "☆ Favorite"}</button>
        <button className="btn line small" disabled={!!r.interest} onClick={() => command("SaveInterest", { recipeId })}>{r.interest ? "In Sounds good" : "Sounds good"}</button>
        <button className="btn line small" onClick={() => setEditing(!editing)}>{editing ? "Close editor" : "Edit (new version)"}</button>
      </div>
      {editing && <RecipeEditor recipe={r} onDone={() => setEditing(false)} />}
      <div className="stats">
        <div className="stat"><span>Calories / plate</span><strong>{nutrient(v && r.nutritionPerPlate.calories)}</strong></div>
        <div className="stat"><span>Protein / plate</span><strong>{nutrient(r.nutritionPerPlate.proteinG, " g")}</strong></div>
        <div className="stat"><span>Serving cost</span><strong>{r.servingCost.complete ? money(r.servingCost.knownMinor) : "unknown"}</strong></div>
      </div>
      {r.nutritionPerPlate.synthetic && <p className="faint small">Nutrition uses synthetic test values.</p>}
      {r.constraint.status !== "ok" && <p className="warnbox">{r.constraint.reasons.join("; ")}</p>}
      <div className="section-label">Ingredients (per portion of each component)</div>
      <ul className="small">
        {v.components.map((c: any) => (
          <li key={c.key}><strong>{c.name}</strong>: {v.ingredients.filter((i: any) => i.componentKey === c.key).map((i: any) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}</li>
        ))}
      </ul>
      <div className="section-label">Steps</div>
      <pre className="instructions">{v.instructions || "No steps recorded."}</pre>
      {v.reheatInstructions && (<><div className="section-label">Reheat</div><pre className="instructions">{v.reheatInstructions}</pre></>)}
      <div className="section-label">Notes</div>
      <ul className="small" data-testid="notes">{r.notes.map((n: any) => <li key={n.id}>{n.body} <span className="faint">— {n.by}</span></li>)}</ul>
      <form className="row" onSubmit={async (e) => {
        e.preventDefault();
        const x = await command("AddRecipeNote", { recipeId, body: note });
        if (x.status === "accepted") setNote(""); else setMsg(x.message);
      }}>
        <input aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
        <button className="btn line small">Save note</button>
      </form>
      {msg && <p className="warn">{msg}</p>}
      <div className="section-label">Cooking history (recorded explicitly)</div>
      <ul className="small">{r.cooked.length ? r.cooked.map((c: any, i: number) => <li key={i}>{c.on} — {c.by}</li>) : <li className="faint">Nothing recorded.</li>}</ul>
      <div className="section-label">Versions</div>
      <ul className="small">{r.versions.map((x: any) => <li key={x.id}>v{x.versionNo} {x.title} {x.by ? `— ${x.by}` : ""}</li>)}</ul>
      <p className="faint small">Editing creates a new version. Dinners already accepted keep the version they were chosen with.</p>
    </article>
  );
}

type Row = { componentKey: string; ingredientName: string; ingredientKey: string | null; quantity: string; unit: string };

export function RecipeEditor({ recipe, onDone }: { recipe?: any; onDone: () => void }) {
  const { command } = useStore();
  const v = recipe?.version;
  const [title, setTitle] = useState(v?.title ?? "");
  const [cuisine, setCuisine] = useState(v?.cuisine ?? "");
  const [minutes, setMinutes] = useState(v?.effortMinutes?.toString() ?? "");
  const [level, setLevel] = useState(v?.effortLevel ?? "");
  const [leftovers, setLeftovers] = useState<boolean>(v?.leftoverFriendly ?? false);
  const [instructions, setInstructions] = useState(v?.instructions ?? "");
  const [reheat, setReheat] = useState(v?.reheatInstructions ?? "");
  const [components, setComponents] = useState<{ key: string; name: string }[]>(v?.components?.map((c: any) => ({ key: c.key, name: c.name })) ?? [{ key: "main", name: "Main" }]);
  const [rows, setRows] = useState<Row[]>(
    v?.ingredients?.map((i: any) => ({ componentKey: i.componentKey, ingredientName: i.name, ingredientKey: i.ingredientKey, quantity: i.quantity, unit: i.unit })) ?? [
      { componentKey: "main", ingredientName: "", ingredientKey: null, quantity: "", unit: "g" },
    ],
  );
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="card stack" data-testid="recipe-editor" onSubmit={async (e) => {
      e.preventDefault();
      const r = await command("SaveRecipeVersion", {
        recipeId: recipe?.recipeId ?? null, title, cuisine: cuisine || null, effortMinutes: minutes ? Number(minutes) : null, effortLevel: level || null,
        leftoverFriendly: leftovers, instructions, reheatInstructions: reheat, components, ingredients: rows.filter((x) => x.ingredientName.trim()),
      });
      if (r.status === "accepted") onDone(); else setMsg(r.message);
    }}>
      <p className="faint small">Structured entry: amounts are per ONE portion of their component, so plates can scale components independently. Text is stored as plain text.</p>
      <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
      <div className="grid4">
        <label>Cuisine<input value={cuisine} onChange={(e) => setCuisine(e.target.value)} /></label>
        <label>Minutes (estimate)<input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" /></label>
        <label>Effort<select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">unknown</option><option>easy</option><option>medium</option><option>involved</option></select></label>
        <label className="row"><input type="checkbox" checked={leftovers} onChange={(e) => setLeftovers(e.target.checked)} /> Leftover-friendly</label>
      </div>
      <div className="section-label">Components</div>
      {components.map((c, i) => (
        <div key={i} className="row">
          <input aria-label="Component name" value={c.name} onChange={(e) => setComponents(components.map((x, j) => (j === i ? { name: e.target.value, key: x.key || e.target.value.toLowerCase().replace(/\W+/g, "_") } : x)))} />
        </div>
      ))}
      <button type="button" className="link small" onClick={() => setComponents([...components, { key: `c${components.length}`, name: "" }])}>add component</button>
      <div className="section-label">Ingredients</div>
      {rows.map((row, i) => (
        <div key={i} className="row">
          <select aria-label="Component" value={row.componentKey} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, componentKey: e.target.value } : x)))}>
            {components.map((c) => <option key={c.key} value={c.key}>{c.name || c.key}</option>)}
          </select>
          <input aria-label="Quantity" className="tiny" value={row.quantity} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} inputMode="decimal" />
          <input aria-label="Unit" className="tiny" value={row.unit} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
          <input aria-label="Ingredient" value={row.ingredientName} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, ingredientName: e.target.value, ingredientKey: null } : x)))} />
        </div>
      ))}
      <button type="button" className="link small" onClick={() => setRows([...rows, { componentKey: components[0]?.key ?? "main", ingredientName: "", ingredientKey: null, quantity: "", unit: "g" }])}>add ingredient</button>
      <label>Steps<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} /></label>
      <label>Reheat and serve<textarea value={reheat} onChange={(e) => setReheat(e.target.value)} rows={2} /></label>
      {msg && <p className="warn" role="alert">{msg}</p>}
      <button className="btn primary">{recipe ? "Save new version" : "Save recipe"}</button>
    </form>
  );
}

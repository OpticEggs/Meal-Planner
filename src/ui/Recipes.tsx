"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { money, nutrient } from "./format";
import { focusFirst, tabKeyTarget } from "./a11y";
import { RecipeEditorDialog } from "./RecipeEditor";
import { PlaceholderTile } from "./Tile";

/* eslint-disable @typescript-eslint/no-explicit-any */

const FILTERS = ["all", "favorites", "sounds_good"] as const;

const PREFS = [
  { v: "make_again", label: "Make again" },
  { v: "occasionally", label: "Occasionally" },
  { v: "not_for_me", label: "Not for me" },
] as const;

export function RecipesScreen() {
  const { library, loadLibrary, me, command } = useStore();
  const [filter, setFilter] = useState<"all" | "favorites" | "sounds_good">("all");
  const [creating, setCreating] = useState<HTMLElement | null>(null);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
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
        <div className="tabs" role="tablist" aria-label="Show recipes">
          {FILTERS.map((f) => (
            <button key={f} role="tab" id={`rtab-${f}`} aria-selected={filter === f} aria-controls="recipe-panel" tabIndex={filter === f ? 0 : -1}
              ref={(el) => { tabs.current[f] = el; }} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}
              onKeyDown={(e) => {
                const to = tabKeyTarget(FILTERS, f, e.key);
                if (to) {
                  e.preventDefault();
                  setFilter(to);
                  tabs.current[to]?.focus();
                }
              }}>
              {{ all: "All", favorites: "My favorites", sounds_good: "Sounds good" }[f]}
            </button>
          ))}
        </div>
        <button className="btn line small" aria-haspopup="dialog" onClick={(e) => setCreating(e.currentTarget)} data-testid="new-recipe">New recipe</button>
      </div>
      {creating && (
        <RecipeEditorDialog recipeId={null} onClose={() => setCreating(null)}
          returnFocus={() => focusFirst(creating, () => document.querySelector<HTMLElement>('[data-testid="new-recipe"]'))} />
      )}
      <div role="tabpanel" id="recipe-panel" aria-labelledby={`rtab-${filter}`}>
      {filter === "sounds_good" && <p className="faint small">Shared near-term ideas. Saving one does not schedule it.</p>}
      {list.length === 0 && <p className="small muted">{filter === "favorites" ? "No favorites yet." : filter === "sounds_good" ? "No saved ideas yet." : "No recipes yet."}</p>}
      <ul className="recipes" data-testid="recipe-list">
        {list.map((r: any) => (
          <li key={r.recipeId} className="card recipe" data-testid="recipe-row" data-title={r.version.title}>
            <PlaceholderTile title={r.version.title} />
            <div className="grow">
              <Link href={`/recipes/${r.recipeId}`}><strong>{r.version.title}</strong></Link>
              <div className="faint small">
                v{r.version.versionNo} · {r.version.provenance}
                {r.interest ? ` · Sounds good (${r.interest.display_name ?? r.interest.by ?? ""})` : ""}
                {r.preferences[me.memberId] ? ` · you: ${PREFS.find((p) => p.v === r.preferences[me.memberId])?.label}` : " · you: no feedback yet"}
              </div>
            </div>
            {r.interest && <button className="btn line small" aria-label={`Clear the idea ${r.version.title}`} onClick={() => command("ArchiveInterest", { interestId: r.interest.id })}>Clear idea</button>}
            <button className="btn line small" aria-label={`Favorite ${r.version.title}`} aria-pressed={r.favoriteOf.includes(me.memberId)} onClick={() => command("SetFavorite", { recipeId: r.recipeId, favorite: !r.favoriteOf.includes(me.memberId) })}>
              <span aria-hidden="true">{r.favoriteOf.includes(me.memberId) ? "★" : "☆"}</span> Favorite
            </button>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const { library, loadLibrary, me, command, announce } = useStore();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<HTMLElement | null>(null);
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
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <PlaceholderTile title={v.title} large />
        <h2 className="page-title grow" data-testid="recipe-title">{v.title}</h2>
      </div>
      <p className="faint small">
        Version {v.versionNo} · {v.provenance === "fixture" ? "test fixture" : v.provenance}{v.sourceLabel ? ` · ${v.sourceLabel}` : ""}{v.estimate ? " · amounts/times are estimates" : ""}
      </p>
      <div className="section-label" style={{ margin: "4px 0 0" }}>To make</div>
      <div className="statrow" data-testid="recipe-make-stats">
        <div><span>Time</span><strong>{v.effortMinutes ? `${v.effortMinutes} min${v.estimate ? " (estimate)" : ""}` : "unknown"}</strong></div>
        <div><span>Effort</span><strong>{v.effortLevel ?? "unknown"}</strong></div>
        <div><span>Ingredients</span><strong>{new Set(v.ingredients.map((i: any) => i.ingredientKey)).size}</strong></div>
        <div><span>Leftovers</span><strong>{v.leftoverFriendly ? "leftover-friendly" : "not marked"}</strong></div>
      </div>
      <div className="seg" role="group" aria-label="Your feedback">
        {PREFS.map((p) => (
          <button key={p.v} className={`btn small ${r.preferences[me.memberId] === p.v ? "primary" : "line"}`} aria-pressed={r.preferences[me.memberId] === p.v} aria-label={`${p.label} (your feedback)`}
            onClick={() => command("SetRecipePreference", { recipeId, value: r.preferences[me.memberId] === p.v ? null : p.v })}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="small">
        {library.members.map((m: any) => `${m.displayName}: ${PREFS.find((p) => p.v === r.preferences[m.id])?.label ?? "unknown"}`).join(" · ")}
      </p>
      <div className="row">
        <button className="btn line small" aria-pressed={r.favoriteOf.includes(me.memberId)} onClick={() => command("SetFavorite", { recipeId, favorite: !r.favoriteOf.includes(me.memberId) })}>
          {r.favoriteOf.includes(me.memberId) ? "★ Favorite" : "☆ Favorite"}
        </button>
        <button className="btn line small" disabled={!!r.interest} onClick={() => command("SaveInterest", { recipeId })}>{r.interest ? "In Sounds good" : "Sounds good"}</button>
        <button className="btn line small" aria-haspopup="dialog" onClick={(e) => setEditing(e.currentTarget)}>Edit (new version)</button>
      </div>
      {editing && <RecipeEditorDialog recipeId={recipeId} onClose={() => setEditing(null)} returnFocus={() => focusFirst(editing, () => document.querySelector<HTMLElement>('[data-testid="recipe-title"]'))} />}
      <div className="stats">
        <div className="stat"><span>Calories / plate</span><strong>{nutrient(v && r.nutritionPerPlate.calories)}</strong></div>
        <div className="stat"><span>Protein / plate</span><strong>{nutrient(r.nutritionPerPlate.proteinG, " g")}</strong></div>
        <div className="stat"><span>Serving cost</span><strong>{r.servingCost.complete ? money(r.servingCost.knownMinor) : "unknown"}</strong></div>
      </div>
      {r.nutritionPerPlate.synthetic && <p className="faint small">Nutrition uses synthetic test values.</p>}
      {r.constraint.status !== "ok" && <p className="warnbox">{r.constraint.reasons.join("; ")}</p>}
      <div className="section-label">Ingredients (per portion of each component)</div>
      <ul className="plain" data-testid="recipe-ingredients">
        {v.components.map((c: any) => (
          <li key={c.key}>
            <strong>{c.name}</strong>
            <ul className="amounts small">
              {v.ingredients.filter((i: any) => i.componentKey === c.key).map((i: any, k: number) => (
                <li key={k}><span>{i.name}</span><span className="muted">{i.quantity} {i.unit}</span></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="section-label">Steps</div>
      <Steps text={v.instructions} />
      {v.reheatInstructions && (<><div className="section-label">Reheat</div><Steps text={v.reheatInstructions} /></>)}
      <div className="section-label">Notes</div>
      <ul className="small" data-testid="notes">{r.notes.map((n: any) => <li key={n.id}>{n.body} <span className="faint">— {n.by}</span></li>)}</ul>
      <form className="row" noValidate onSubmit={async (e) => {
        e.preventDefault();
        if (!note.trim()) {
          setMsg("Write the note first");
          document.getElementById("new-note")?.focus();
          return;
        }
        const x = await command("AddRecipeNote", { recipeId, body: note });
        if (x.status === "accepted") {
          setNote("");
          setMsg(null);
          announce("Note saved.");
        } else setMsg(x.message);
      }}>
        <input id="new-note" aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note"
          aria-invalid={msg ? true : undefined} aria-describedby={msg ? "new-note-error" : undefined} />
        <button className="btn line small">Save note</button>
      </form>
      {msg && <p className="field-error" id="new-note-error" role="alert">{msg}</p>}
      <div className="section-label">Cooking history (recorded explicitly)</div>
      <ul className="small">{r.cooked.length ? r.cooked.map((c: any, i: number) => <li key={i}>{c.on} — {c.by}</li>) : <li className="faint">Nothing recorded.</li>}</ul>
      <div className="section-label">Versions</div>
      <ul className="small">{r.versions.map((x: any) => <li key={x.id}>v{x.versionNo} {x.title} {x.by ? `— ${x.by}` : ""}</li>)}</ul>
      <p className="faint small">Editing creates a new version. Dinners already accepted keep the version they were chosen with.</p>
    </article>
  );
}

/** Steps as a numbered list when the text has several lines; otherwise the text as written. */
export function Steps({ text, testId }: { text: string | null | undefined; testId?: string }) {
  const lines = (text ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return <p className="faint small" data-testid={testId}>No steps recorded.</p>;
  if (lines.length === 1) return <p style={{ margin: 0, whiteSpace: "pre-wrap" }} data-testid={testId}>{lines[0]}</p>;
  // Steps written as "1. …" are shown in the numbered list without repeating their own number.
  const numbered = lines.every((l) => /^\d+[.)]\s+/.test(l));
  return <ol className="steps" data-testid={testId}>{lines.map((l, i) => <li key={i}>{numbered ? l.replace(/^\d+[.)]\s+/, "") : l}</li>)}</ol>;
}

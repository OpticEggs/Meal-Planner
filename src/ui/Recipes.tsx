"use client";
import Link from "next/link";
import { recipeYield } from "@/domain/recipes/whole-amount";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "./store";
import { ModalSheet, focusFirst, tabKeyTarget } from "./a11y";
import { RecipeEditorDialog } from "./RecipeEditor";
import { amountText } from "./ImportReview";
import { AddFromLinkForm, SaveLinkForm, SavedLinksList } from "./SavedLinks";
import { ImportReviewDialog } from "./ImportReview";
import { RecipeGallery, matchesSearch, useCatalogScroll } from "./Catalog";
import { SelectControl, defaultServings } from "./MealList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { perPortionExact } from "@/domain/recipes/plate";
import { BackIcon, ChevronIcon, ExternalIcon, MoreIcon, PlusIcon, SearchIcon, StarIcon } from "./icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

const FILTERS = ["all", "favorites", "sounds_good", "links"] as const;

const PREFS = [
  { v: "make_again", label: "Make again" },
  { v: "occasionally", label: "Occasionally" },
  { v: "not_for_me", label: "Not for me" },
] as const;

const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = { all: "All", favorites: "Favorites", sounds_good: "Sounds good", links: "Saved links" };

/** Recipes (owner-approved photo-first catalog, D151): a slim header with Search and Add, a quiet row of filters, then
 *  photographs edge to edge. Adding a recipe — paste a link (the existing reviewed import) or write one — opens under +. */
export function RecipesScreen({ initialFilter = "all" }: { initialFilter?: (typeof FILTERS)[number] }) {
  const { library, loadLibrary, me } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(initialFilter);
  const [importing, setImporting] = useState<{ b: any; el: HTMLElement; result?: any } | null>(null);
  const [creating, setCreating] = useState<HTMLElement | null>(null);
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(false);
  const { snapshot } = useStore();
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);
  useEffect(() => {
    if (searching) searchRef.current?.focus();
  }, [searching]);
  useCatalogScroll(!!library);
  if (!library) return <p className="muted">Loading…</p>;
  const list = library.recipes
    .filter((r: any) => (filter === "favorites" ? r.favoriteOf.includes(me.memberId) : filter === "sounds_good" ? !!r.interest : !r.archived))
    .filter((r: any) => matchesSearch(r, search) && (!quick || (r.version.effortMinutes != null && r.version.effortMinutes <= 30)));
  const meals: any[] = snapshot?.mealList?.meals ?? [];
  const servings = meals.reduce((a, m) => a + m.servings, 0);
  const showSearch = searching || !!search || quick;
  return (
    <section aria-label="Recipes" className="pf-catalog wide-page" data-testid="recipes">
      <div className="pf-head">
        <h2 className="pf-title">Recipes</h2>
        <div className="pf-head-actions">
          <button type="button" className="pf-icon" aria-label="Search recipes" aria-expanded={showSearch} aria-controls="pf-search"
            onClick={() => { if (showSearch && !search && !quick) setSearching(false); else setSearching(true); }}><SearchIcon /></button>
          <button type="button" className="pf-icon" aria-label="Add a recipe" aria-expanded={adding} aria-controls="pf-add" data-testid="add-recipe"
            onClick={() => setAdding(!adding)}><PlusIcon /></button>
        </div>
      </div>
      {adding && (
        <div id="pf-add" className="pf-panel">
          <AddFromLinkForm compact onOpen={(b, el, result) => setImporting({ b, el, result })} />
          <button type="button" className="pf-textlink" aria-haspopup="dialog" onClick={(e) => setCreating(e.currentTarget)} data-testid="new-recipe">Write a recipe yourself</button>
        </div>
      )}
      {showSearch && filter !== "links" && (
        <div id="pf-search" className="pf-panel pf-search">
          <label className="sr-only" htmlFor="recipe-search">Search recipes</label>
          <Input ref={searchRef} id="recipe-search" type="search" placeholder="Search recipes or ingredients" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="pf-toggle" aria-pressed={quick} onClick={() => setQuick(!quick)}>30 min or less</button>
        </div>
      )}
      <div className="pf-filters" role="tablist" aria-label="Show recipes">
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
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>
      {creating && (
        <RecipeEditorDialog recipeId={null} onClose={() => setCreating(null)}
          returnFocus={() => focusFirst(creating, () => document.querySelector<HTMLElement>('[data-testid="new-recipe"]'), () => document.querySelector<HTMLElement>('[data-testid="add-recipe"]'))} />
      )}
      {importing && <ImportReviewDialog bookmark={importing.b} initial={importing.result} onClose={() => setImporting(null)}
        returnFocus={() => { const el = importing.el; focusFirst(el, () => document.querySelector<HTMLElement>("#add-link-url"), () => document.querySelector<HTMLElement>('[data-testid="add-recipe"]')); }} />}
      <div role="tabpanel" id="recipe-panel" aria-labelledby={`rtab-${filter}`}>
      {filter === "links" ? (
        <div className="stack pf-pad">
          <div className="card"><SaveLinkForm idPrefix="recipes-save-link" /></div>
          <SavedLinksList links={(library.bookmarks ?? []).filter((b: any) => !b.archived)} empty="No saved links yet." onImport={(b, el) => setImporting({ b, el })} />
          {(library.bookmarks ?? []).some((b: any) => b.archived) && (
            <details>
              <summary>Archived links ({library.bookmarks.filter((b: any) => b.archived).length})</summary>
              <SavedLinksList links={library.bookmarks.filter((b: any) => b.archived)} empty="" />
            </details>
          )}
        </div>
      ) : (<>
      {filter === "sounds_good" && <p className="pf-note">Shared near-term ideas. Saving one does not schedule it.</p>}
      {list.length === 0 && !search && !quick && <p className="pf-note">{filter === "favorites" ? "No favorites yet." : filter === "sounds_good" ? "No saved ideas yet." : "No recipes yet."}</p>}
      {list.length === 0 && (search || quick) && <p className="pf-note">No recipes match. Clear the search or the filter.</p>}
      <RecipeGallery list={list} sounds={filter === "sounds_good"} />
      </>)}
      </div>
      {meals.length > 0 && (
        <Link className="selection-bar" href="/groceries" data-testid="selection-bar">
          <span>{meals.length} meal{meals.length === 1 ? "" : "s"} · {servings} serving{servings === 1 ? "" : "s"}</span>
          <span className="selection-go">Groceries <ChevronIcon /></span>
        </Link>
      )}
    </section>
  );
}

/** The recipe's original yield (B51: recorded on the version, else what its exact rows agree on); null when not known. */
const reviewedServings = (v: any): number | null => recipeYield(v);

/** Ingredients for the servings shown beside them (exact per-serving amounts × servings, displayed as kitchen
 *  fractions); a named ingredient without an amount says so. Grouped by part when the recipe has several. */
function IngredientsPanel({ v, servings }: { v: any; servings: number }) {
  const many = v.components.length > 1;
  return (
    <section className="pf-section" aria-labelledby="ing-h">
      <h3 id="ing-h" className="pf-label">Ingredients for {servings}</h3>
      <ul className="pf-ingredients" data-testid="recipe-ingredients">
        {v.components.map((c: any) => (
          <li key={c.key}>
            {many && <strong className="pf-part">{c.name}</strong>}
            <ul className="pf-lines">
              {v.ingredients.filter((i: any) => i.componentKey === c.key).map((i: any, k: number) => (
                <li key={k}><span>{i.name}</span><span className="amt">{amountText(perPortionExact(i).value.mul(servings).toString(), i.unit)}</span></li>
              ))}
              {/* CF Q6: named by the recipe without an amount — never given one here; asked when shopping. */}
              {(v.unquantified ?? []).filter((u: any) => u.componentKey === c.key).map((u: any) => (
                <li key={u.id} data-testid="recipe-unquantified"><span>{u.name}{u.note ? `, ${u.note}` : ""}</span><span className="amt">Needs a quantity (asked when shopping)</span></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Recipe overview (owner scope, 2026-10-13; D152): what choosing and shopping need — the photo when there is one, the
 *  title, the original yield, the servings to buy for, the ingredients for those servings, and the recipe's own website
 *  (cooking happens there). Editing and the photo are quiet; notes and feedback are folded away. Instructions, nutrition,
 *  cost and cooking history stay stored but are not shown here. */
export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const { library, loadLibrary } = useStore();
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);
  if (!library) return <p className="muted">Loading…</p>;
  const r = library.recipes.find((x: any) => x.recipeId === recipeId);
  if (!r) return <p className="muted pf-pad">Recipe not found. <Link href="/recipes">Back</Link></p>;
  return <RecipeOverview r={r} recipeId={recipeId} />;
}

function RecipeOverview({ r, recipeId }: { r: any; recipeId: string }) {
  const { library, me, command, announce } = useStore();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<HTMLElement | null>(null);
  // The "…" sheet: the element that opened it (focus returns there), or null when closed.
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [servings, setServings] = useState<number | null>(null);
  const onServings = useCallback((n: number) => setServings(n), []);
  const photo = usePhoto(r);
  const title = () => document.querySelector<HTMLElement>('[data-testid="recipe-title"]');
  // Back to "…" without scrolling: it sits under the page's scroll padding (for the header other screens show), so a
  // plain focus() would move the page a little on every close.
  const backTo = (el: HTMLElement | null) => () => {
    if (el?.isConnected) el.focus({ preventScroll: true });
    else focusFirst(title);
  };
  const v = r.version;
  const fav = r.favoriteOf.includes(me.memberId);
  const imageId = r.photo?.imageId ?? null;
  const credit = r.photo ? (r.photo.kind === "member" ? r.photo.label : `Photo: ${r.photo.label}`) : null;
  const yieldN = reviewedServings(v);
  const n = servings ?? defaultServings(v);
  const site = v.sourceSiteName ?? v.sourceLabel ?? v.sourceDomain;
  return (
    <article className="pf-detail" data-testid="recipe-detail">
      <figure className={`pf-hero ${imageId ? "has-photo" : "no-photo"}`} data-testid="recipe-hero">
        {imageId ? <img src={`/api/recipe-images/${imageId}`} alt="" decoding="async" data-testid="recipe-photo" /> : <span className="pf-nophoto" data-testid="hero-no-photo">No photo yet</span>}
        <div className="pf-hero-bar">
          <Link href="/recipes" className="pf-round" aria-label="Back to recipes"><span><BackIcon /></span></Link>
          <div className="pf-hero-actions">
            <button type="button" className={`pf-round ${fav ? "on" : ""}`} aria-label={`Favorite ${v.title}`} aria-pressed={fav}
              onClick={() => command("SetFavorite", { recipeId, favorite: !fav })}><span><StarIcon filled={fav} /></span></button>
            <button type="button" className="pf-round" aria-label="More: edit recipe or photo" aria-haspopup="dialog" aria-expanded={!!more}
              data-testid="recipe-more" onClick={(e) => setMore(e.currentTarget)}><span><MoreIcon /></span></button>
          </div>
        </div>
        {imageId && credit && (
          <figcaption className="pf-credit" data-testid="photo-credit">
            {r.photo?.kind === "source" && v.sourceUrl ? <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{credit}</a> : credit}
          </figcaption>
        )}
      </figure>
      <div className="pf-body">
        <h2 className="pf-recipe-title" data-testid="recipe-title">{v.title}</h2>
        <p className="pf-yield" data-testid="recipe-yield">{yieldN ? `Makes ${yieldN}` : "Original yield not recorded"}</p>
        {v.sourceUrl && (
          <>
            <a className="pf-website" href={v.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" data-testid="recipe-original"
              aria-label={`Open recipe website — ${site ?? "source page"} (new tab)`}>Open recipe website <ExternalIcon /></a>
            <p className="pf-source" data-testid="recipe-source">From {site}{v.sourceAuthor ? ` · by ${v.sourceAuthor}` : ""}</p>
          </>
        )}
        {!r.archived && <div className="pf-select" data-testid="add-to-selected"><SelectControl recipe={r} onServings={onServings} /></div>}
        {r.constraint.status !== "ok" && <p className="warnbox">{r.constraint.reasons.join("; ")}</p>}
        <IngredientsPanel v={v} servings={n} />
        <div className="pf-more">
          {photo.status}
          {more && (
            // A sheet, not a jump link: the page stays where it was, and closing returns focus to "…".
            <ModalSheet title={v.title} subtitle="Recipe and photo" closeLabel="Close recipe actions" testId="recipe-actions"
              onClose={() => setMore(null)} returnFocus={backTo(more)}>
              <div className="stack small">
                <Button variant="outline" aria-haspopup="dialog" data-testid="edit-recipe" onClick={() => { const opener = more; setMore(null); setEditing(opener); }}>Edit recipe</Button>
                <Button variant="outline" disabled={photo.busy} onClick={() => { setMore(null); photo.pick(); }}>{r.photo ? "Replace photo" : "Add a photo"}</Button>
                {photo.mine && <Button variant="outline" disabled={photo.busy} onClick={() => { setMore(null); void photo.remove(); }}>Remove photo</Button>}
              </div>
            </ModalSheet>
          )}
          {editing && <RecipeEditorDialog recipeId={recipeId} onClose={() => setEditing(null)} returnFocus={backTo(editing)} />}
          <details className="pf-extra" data-testid="notes-and-feedback">
            <summary>Notes and feedback</summary>
            <div className="pf-chips" role="group" aria-label="Your feedback">
              {PREFS.map((p) => (
                <button key={p.v} type="button" className="pf-toggle" aria-pressed={r.preferences[me.memberId] === p.v} aria-label={`${p.label} (your feedback)`}
                  onClick={() => command("SetRecipePreference", { recipeId, value: r.preferences[me.memberId] === p.v ? null : p.v })}>{p.label}</button>
              ))}
              <button type="button" className="pf-toggle" disabled={!!r.interest} onClick={() => command("SaveInterest", { recipeId })}>{r.interest ? "In Sounds good" : "Sounds good"}</button>
            </div>
            <p className="pf-fine">{library.members.map((m: any) => `${m.displayName}: ${PREFS.find((p) => p.v === r.preferences[m.id])?.label ?? "unknown"}`).join(" · ")}</p>
            <ul className="pf-fine-list" data-testid="notes">{r.notes.map((x: any) => <li key={x.id}>{x.body} <span className="faint">— {x.by}</span></li>)}</ul>
            <form className="pf-note-form" noValidate onSubmit={async (e) => {
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
              <Input id="new-note" aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note"
                aria-invalid={msg ? true : undefined} aria-describedby={msg ? "new-note-error" : undefined} />
              <Button variant="outline" size="sm">Save note</Button>
            </form>
            {msg && <p className="field-error" id="new-note-error" role="alert">{msg}</p>}
          </details>
        </div>
      </div>
    </article>
  );
}

/** Steps as a numbered list when the text has several lines; otherwise the text as written. */
export function Steps({ text, testId, sourceUrl }: { text: string | null | undefined; testId?: string; sourceUrl?: string | null }) {
  const lines = (text ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length && sourceUrl) {
    return (
      <p className="small" data-testid={testId ?? "method-link"}>
        The method is on the original page. <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow">Open the method ↗</a>
      </p>
    );
  }
  if (!lines.length) return <p className="faint small" data-testid={testId}>No steps recorded.</p>;
  if (lines.length === 1) return <p style={{ margin: 0, whiteSpace: "pre-wrap" }} data-testid={testId}>{lines[0]}</p>;
  // Steps written as "1. …" are shown in the numbered list without repeating their own number.
  const numbered = lines.every((l) => /^\d+[.)]\s+/.test(l));
  return <ol className="steps" data-testid={testId}>{lines.map((l, i) => <li key={i}>{numbered ? l.replace(/^\d+[.)]\s+/, "") : l}</li>)}</ol>;
}

/** The household's own photo of a dish: add, replace or remove it (the actions are in the "…" sheet). A photo from a
 *  recipe page is shown only under a recorded permission; a photo you took needs none. The file input lives outside the
 *  app (a portal on <body>): it stays mounted while the sheet opens and closes, and the sheet's inert background never
 *  covers it. */
function usePhoto(r: any) {
  const { loadLibrary, command, announce } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const upload = async (f: File) => {
    setBusy(true);
    setErr(null);
    const body = new FormData();
    body.set("recipeId", r.recipeId);
    body.set("expectedRevision", String(r.photoRevision ?? 0));
    body.set("operationId", `photo-${crypto.randomUUID()}`);
    body.set("photo", f);
    const res = await fetch("/api/recipe-photos", { method: "POST", body }).then((x) => x.json(), () => ({ error: "Table couldn't be reached. Nothing changed." }));
    setBusy(false);
    if (res.status === "accepted") {
      announce("Photo added.");
      await loadLibrary();
    } else setErr(res.message ?? res.error ?? "The photo wasn't saved.");
    if (file.current) file.current.value = "";
  };
  const remove = async () => {
    const x = await command("SetRecipePhoto", { recipeId: r.recipeId, imageId: null, expectedRevision: r.photoRevision ?? 0 });
    if (x.status === "accepted") { announce("Photo removed."); await loadLibrary(); } else setErr(x.message);
  };
  const input = (
    <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden tabIndex={-1} aria-hidden="true" disabled={busy} data-testid="photo-input"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
  );
  const status = (
    <div className="photo-controls" id="photo">
      {typeof document !== "undefined" && createPortal(input, document.body)}
      {busy && <span className="small muted" role="status">Saving photo…</span>}
      {err && <p className="field-error small" role="alert" data-testid="photo-error">{err}</p>}
    </div>
  );
  return { busy, mine: r.photo?.kind === "member", pick: () => file.current?.click(), remove, status };
}

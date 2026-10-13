"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "./store";
import { money } from "./format";
import { PlaceholderTile } from "./Tile";
import { SelectControl } from "./MealList";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Photo-first catalog (catalog-first, Q3/Q8). Every tile says what its picture is: the household's own photo, a source
 * photo kept under a recorded permission, or no photo (an illustration, never presented as a photograph). Essential
 * details are always visible under the title (nothing depends on hover). + adds the meal to Selected Meals.
 */

const SCROLL_KEY = "table.catalog.scroll";

export function photoKind(r: any): { kind: "member" | "source" | "none"; label: string } {
  if (r.photo?.kind === "member") return { kind: "member", label: "Our photo" };
  if (r.photo?.kind === "source" || r.version.imageId) return { kind: "source", label: `Photo: ${r.photo?.label ?? r.version.sourceSiteName ?? "source"}` };
  return { kind: "none", label: "No photo yet" };
}

function meta(r: any): string[] {
  const out: string[] = [];
  out.push(r.version.effortMinutes ? `${r.version.effortMinutes} min` : "time unknown");
  const c = r.servingCost;
  out.push(c?.complete ? `${money(c.knownMinor)}/serving` : "cost unknown");
  const kcal = r.nutritionPerPlate?.calories?.value;
  if (kcal != null) out.push(`${Math.round(Number(kcal))} kcal/serving`);
  return out;
}

function provenance(r: any): string {
  return r.version.provenance === "fixture" ? "test recipe" : r.version.provenance === "imported" ? `imported${r.version.sourceSiteName ? ` from ${r.version.sourceSiteName}` : ""}` : "ours";
}

/** Keeps the reader's place: remembered when a recipe is opened, restored once the gallery is back (per tab only). */
export function useCatalogScroll(ready: boolean) {
  const restored = useRef(false);
  useLayoutEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    try {
      const y = Number(sessionStorage.getItem(SCROLL_KEY) ?? "");
      if (y > 0) window.scrollTo(0, y);
    } catch { /* storage unavailable: start at the top */ }
  }, [ready]);
  // Remember the place as the reader scrolls (not on leaving: by then navigation may already have moved the page).
  useEffect(() => {
    if (!ready) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* ignore */ }
      }, 100);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      if (t) clearTimeout(t);
    };
  }, [ready]);
}

export function RecipeGallery({ list, sounds }: { list: any[]; sounds?: boolean }) {
  const { me, command } = useStore();
  return (
    <ul className="gallery" data-testid="recipe-list">
      {list.map((r: any) => {
        const pk = photoKind(r);
        const fav = r.favoriteOf.includes(me.memberId);
        const title = r.version.title;
        return (
          <li key={r.recipeId} className="gallery-tile" data-testid="recipe-row" data-title={title} data-photo={pk.kind}>
            <div className="gallery-media">
              <Link href={`/recipes/${r.recipeId}`} className="gallery-photo" tabIndex={-1} aria-hidden="true">
                <PlaceholderTile title={title} large imageId={r.photo?.imageId ?? r.version.imageId} />
              </Link>
              <span className={`photo-kind pk-${pk.kind}`} data-testid="photo-kind">{pk.label}</span>
              <div className="gallery-plus"><SelectControl recipe={r} compact /></div>
              <div className="gallery-fav">
                <button className={`icon-btn fav ${fav ? "on" : ""}`} aria-label={`Favorite ${title}`} aria-pressed={fav}
                  onClick={() => command("SetFavorite", { recipeId: r.recipeId, favorite: !fav })}>
                  <span aria-hidden="true">{fav ? "★" : "☆"}</span>
                </button>
              </div>
            </div>
            <Link href={`/recipes/${r.recipeId}`} className="recipe-link gallery-title"><strong>{title}</strong></Link>
            <div className="faint small gallery-meta">
              {meta(r).join(" · ")} · {provenance(r)}
              {r.interest ? ` · Sounds good (${r.interest.display_name ?? r.interest.by ?? ""})` : ""}
            </div>
            {sounds && r.interest && (
              <div className="row gallery-actions">
                <button className="btn line small" aria-label={`Clear the idea ${title}`} onClick={() => command("ArchiveInterest", { interestId: r.interest.id })}>Clear idea</button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Words a search matches: title, cuisine, source site and ingredient names. */
export function matchesSearch(r: any, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = [r.version.title, r.version.cuisine, r.version.sourceSiteName, ...(r.ingredientNames ?? [])].filter(Boolean).join(" ").toLowerCase();
  return t.split(/\s+/).every((w) => hay.includes(w));
}

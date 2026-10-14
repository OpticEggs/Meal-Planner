"use client";
import Link from "next/link";
import { recipeYield } from "@/domain/recipes/whole-amount";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "./store";
import { SelectControl } from "./MealList";
import { Button } from "@/components/ui/button";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Photo-first catalog (owner-approved preview, 2026-10-13; D151). Food photography fills the tile edge to edge; a recipe
 * without a photo says "No photo yet" on a plain tile — never an illustration that could pass for food. Under the title:
 * cooking time and the original yield when known (D152); nothing is required to save or select a recipe. + adds the
 * meal to Selected Meals; a selected meal shows ✓ and its servings and opens Selected Meals.
 */

const SCROLL_KEY = "table.catalog.scroll";

export function photoKind(r: any): { kind: "member" | "source" | "none"; label: string } {
  if (r.photo?.kind === "member") return { kind: "member", label: "Our photo" };
  if (r.photo?.kind === "source" || r.version.imageId) return { kind: "source", label: `Photo: ${r.photo?.label ?? r.version.sourceSiteName ?? "source"}` };
  return { kind: "none", label: "No photo yet" };
}

/** Cooking time as the recipe states it: "25 min", "3 h 30 min" (estimates say so). */
export function timeText(minutes: number | null | undefined, estimate?: boolean): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const t = h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
  return estimate ? `${t} (estimate)` : t;
}

/** The original yield (B51: recorded on the version, else what its exact rows agree on); else null. */
const yieldOf = (r: any): number | null => recipeYield(r.version);

/** Under the title: cooking time and the original yield, each only when known (D152: nothing else is required). */
function meta(r: any): string {
  const y = yieldOf(r);
  return [timeText(r.version.effortMinutes), y ? `makes ${y}` : null].filter(Boolean).join(" · ");
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
  const { command } = useStore();
  return (
    <ul className="pf-grid" data-testid="recipe-list">
      {list.map((r: any) => {
        const pk = photoKind(r);
        const title = r.version.title;
        const imageId = r.photo?.imageId ?? r.version.imageId ?? null;
        return (
          <li key={r.recipeId} className={`pf-tile ${imageId ? "has-photo" : "no-photo"}`} data-testid="recipe-row" data-title={title} data-photo={pk.kind}>
            {imageId && <img className="pf-tile-img" src={`/api/recipe-images/${imageId}`} alt="" loading="lazy" decoding="async" data-testid="recipe-photo" />}
            {!imageId && <span className="pf-nophoto" data-testid="photo-kind">No photo yet</span>}
            <div className="pf-tile-text">
              {/* Named by the title; the time, calories and cost line is its description. Its tap area stretches over the
                  whole tile (CSS ::after), so a finger can tap the photo while keyboard and screen readers meet one link. */}
              <Link href={`/recipes/${r.recipeId}`} className="recipe-link pf-tile-title" aria-describedby={meta(r) ? `meta-${r.recipeId}` : undefined}>{title}</Link>
              {meta(r) && <span className="pf-tile-meta gallery-meta" id={`meta-${r.recipeId}`}>{meta(r)}</span>}
              {sounds && r.interest && <span className="pf-tile-meta">Sounds good ({r.interest.display_name ?? r.interest.by ?? ""})</span>}
            </div>
            <div className="pf-tile-select"><SelectControl recipe={r} compact /></div>
            {sounds && r.interest && (
              <div className="pf-tile-actions">
                <Button variant="outline" size="sm" aria-label={`Clear the idea ${title}`} onClick={() => command("ArchiveInterest", { interestId: r.interest.id })}>Clear idea</Button>
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

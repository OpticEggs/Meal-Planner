"use client";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "./store";
import { LiveRegion, useChangeAnnouncer } from "./a11y";
import { isActiveTab } from "./nav";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Grocery lines that still need someone: review, sending, an uncertain transfer, a missing item. */
const OUTSTANDING = new Set(["needs_review", "not_sent_yet", "uncertain", "missing"]);

/**
 * Q4 (2026-10-11): Recipes · Selected · Groceries · More. The dinner calendar, Explore and Budget Bytes,
 * Saved links and Household live under More, so More is the active tab on those screens too.
 */
const TABS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/selected", label: "Selected" },
  { href: "/groceries", label: "Groceries" },
  { href: "/more", label: "More" },
] as const;

/**
 * Hook point for the Selected tab's count badge: the number of meals on the selected-meals list. The
 * integrator wires it to the list; until then it returns null and no badge is shown (nor for zero).
 */
function useSelectedCount(): number | null {
  const { snapshot } = useStore();
  return snapshot?.mealList?.meals?.length ?? null;
}

/**
 * Layout only (B18): the sticky header and the fixed nav change height with text size (labels
 * wrap at large text), so their real heights are published as CSS variables that the page's
 * scroll padding and bottom padding use; a focused or scrolled-to control then lands between
 * them at any text size. When large text makes the header taller than a quarter of the screen, it
 * scrolls away with the page instead of staying stuck over the content.
 */
function useBarMetrics(top: React.RefObject<HTMLElement | null>, nav: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      const th = top.current?.offsetHeight ?? 0;
      const nh = nav.current?.offsetHeight ?? 0;
      root.style.setProperty("--top-h", `${th}px`);
      root.style.setProperty("--nav-real-h", `${nh}px`);
      root.dataset.header = th > window.innerHeight * 0.25 ? "static" : "sticky";
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (top.current) ro.observe(top.current);
    if (nav.current) ro.observe(nav.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--top-h");
      root.style.removeProperty("--nav-real-h");
      delete root.dataset.header;
    };
  }, [top, nav]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const topRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useBarMetrics(topRef, navRef);
  const { snapshot, currency, me, error } = useStore();
  const retailer = snapshot?.retailer;
  useChangeAnnouncer();
  // The Groceries tab is the selected-meals list (catalog-first): its lines that need someone (an item that still needs
  // a quantity is one of them). The calendar week's pickup list is under More → Dinner calendar.
  const outstanding = (snapshot?.mealList?.groceries?.lines ?? []).filter((l: any) => OUTSTANDING.has(l.status)).length;
  const selected = useSelectedCount();
  // The photo-first screens (owner-approved catalog and recipe, D151) carry no app header: food fills the screen. Sync
  // status stays in the page and shows only when offline; identity and the retailer mode are on the other screens.
  const photoFirst = path === "/recipes" || path.startsWith("/recipes/");
  return (
    <>
    <div className={photoFirst ? "app pf" : "app"}>
      <header className="top" ref={topRef}>
        <div className="brand">
          <div>
            <h1 className="brand-title">Table</h1>
            <p className="muted small">
              Signed in as <strong data-testid="me">{me.displayName}</strong>
              {snapshot?.household?.fixture ? " · test household" : ""}
            </p>
          </div>
          {retailer && (
            <span className={`pill ${retailer.live ? "" : "sim"}`} data-testid="retailer-mode" title={retailer.reason}>
              {retailer.live ? retailer.label : "Simulated retailer"}
            </span>
          )}
        </div>
        {/* Not a live region: routine refetches flip this every poll. Going offline and coming
            back are announced once by the announcer instead. */}
        <div data-testid="currency" data-currency={currency} className={`currency ${currency}${photoFirst && currency !== "offline" ? " sr-only" : ""}`}>
          {currency === "current" ? "Up to date" : currency === "refreshing" ? "Checking for newer decisions…" : `Offline — showing last synced view; changes are paused${error ? ` (${error})` : ""}`}
        </div>
      </header>
      <main className="screen">{children}</main>
      <nav className="nav" aria-label="Main" ref={navRef}>
        {TABS.map((t) => {
          const on = isActiveTab(t.href, path);
          const count = t.href === "/groceries" ? outstanding : t.href === "/selected" ? (selected ?? 0) : 0;
          const name =
            count === 0 ? undefined
            : t.href === "/groceries" ? `Groceries, ${count} ${count === 1 ? "line needs" : "lines need"} attention`
            : `${t.label}, ${count} ${count === 1 ? "meal" : "meals"}`;
          return (
            <Link key={t.href} href={t.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}
              aria-label={name} data-testid={`nav-${t.href.slice(1)}`}>
              {t.label}
              {count > 0 && <span className="nav-count" aria-hidden="true">{count}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
    <LiveRegion />
    </>
  );
}

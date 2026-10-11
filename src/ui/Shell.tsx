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
  { href: "/recipes", label: "Recipes", icon: "recipes" },
  { href: "/selected", label: "Selected", icon: "selected" },
  { href: "/groceries", label: "Groceries", icon: "groceries" },
  { href: "/more", label: "More", icon: "more" },
] as const;

/**
 * Hook point for the Selected tab's count badge: the number of meals on the selected-meals list. The
 * integrator wires it to the list; until then it returns null and no badge is shown (nor for zero).
 */
function useSelectedCount(): number | null {
  return null;
}

/** Original line icons. Decorative: each tab's name is its text label. */
function NavIcon({ name }: { name: (typeof TABS)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === "recipes" && (<g {...common}><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" /><rect x="13" y="13" width="7.5" height="7.5" rx="2" /></g>)}
      {name === "selected" && (<g {...common}><path d="M4 9h16M5.5 9l1 10a1.6 1.6 0 0 0 1.6 1.4h7.8a1.6 1.6 0 0 0 1.6-1.4l1-10" /><path d="M8.5 9a3.5 3.5 0 0 1 7 0M9.5 14.5l2 2 3.5-4" /></g>)}
      {name === "groceries" && (<g {...common}><path d="M3.5 6h2l2 10h10.5l2-7.5H7" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></g>)}
      {name === "more" && (<g {...common}><circle cx="5.5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18.5" cy="12" r="1.5" /></g>)}
    </svg>
  );
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
  const outstanding = (snapshot?.groceries?.lines ?? []).filter((l: any) => OUTSTANDING.has(l.status)).length;
  const selected = useSelectedCount();
  return (
    <>
    <div className="app">
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
        <div data-testid="currency" data-currency={currency} className={`currency ${currency}`}>
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
              <span className="nav-icon">
                <NavIcon name={t.icon} />
                {count > 0 && <span className="nav-count" aria-hidden="true">{count}</span>}
              </span>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
    <LiveRegion />
    </>
  );
}

"use client";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "./store";
import { LiveRegion, useChangeAnnouncer } from "./a11y";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Grocery lines that still need someone: review, sending, an uncertain transfer, a missing item. */
const OUTSTANDING = new Set(["needs_review", "not_sent_yet", "uncertain", "missing"]);

const TABS = [
  { href: "/", label: "Week" },
  { href: "/explore", label: "Explore" },
  { href: "/recipes", label: "Our Recipes" },
  { href: "/groceries", label: "Groceries" },
  { href: "/household", label: "Household" },
];

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
          const on = t.href === "/" ? path === "/" || path.startsWith("/cook") : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}
              aria-label={t.href === "/groceries" && outstanding > 0 ? `Groceries, ${outstanding} ${outstanding === 1 ? "line needs" : "lines need"} attention` : undefined}
              data-testid={`nav-${t.href === "/" ? "week" : t.href.slice(1)}`}>
              {t.label}
              {t.href === "/groceries" && outstanding > 0 && (
                <span className="nav-count" aria-hidden="true">{outstanding}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
    <LiveRegion />
    </>
  );
}

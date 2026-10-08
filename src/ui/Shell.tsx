"use client";
import Link from "next/link";
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

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { snapshot, currency, me, error } = useStore();
  const retailer = snapshot?.retailer;
  useChangeAnnouncer();
  const outstanding = (snapshot?.groceries?.lines ?? []).filter((l: any) => OUTSTANDING.has(l.status)).length;
  return (
    <>
    <div className="app">
      <header className="top">
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
      <nav className="nav" aria-label="Main">
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

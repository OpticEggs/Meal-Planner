"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "./store";

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
  return (
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
        <div role="status" aria-live="polite" data-testid="currency" data-currency={currency} className={`currency ${currency}`}>
          {currency === "current" ? "Up to date" : currency === "refreshing" ? "Checking for newer decisions…" : `Offline — showing last synced view; changes are paused${error ? ` (${error})` : ""}`}
        </div>
      </header>
      <main className="screen">{children}</main>
      <nav className="nav" aria-label="Main">
        {TABS.map((t) => {
          const on = t.href === "/" ? path === "/" || path.startsWith("/cook") : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

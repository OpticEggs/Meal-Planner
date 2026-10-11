import Link from "next/link";

/** Q4 (2026-10-11): what lives outside the primary tabs. Each entry is a link named by its title alone, with a one-line description. */
const ITEMS = [
  { href: "/", id: "calendar", title: "Dinner calendar", text: "Plan dinners night by night, cook them, and shop for that week." },
  { href: "/explore", id: "explore", title: "Explore and Budget Bytes", text: "Search, sort and compare recipes; find Budget Bytes recipes to add." },
  { href: "/recipes?tab=links", id: "links", title: "Saved links", text: "Recipe pages you saved to read or import later." },
  { href: "/household", id: "household", title: "Household", text: "Settings, staples, targets, exclusions, connections and export." },
] as const;

export function MoreScreen() {
  return (
    <section aria-labelledby="more-title">
      <h2 className="page-title" id="more-title">More</h2>
      <ul className="more-list">
        {ITEMS.map((i) => (
          <li key={i.id}>
            <Link href={i.href} className="more-link" aria-describedby={`more-${i.id}-text`} data-testid={`more-${i.id}`}>
              {i.title}<span className="more-chev" aria-hidden="true">›</span>
            </Link>
            <p className="muted small" id={`more-${i.id}-text`}>{i.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

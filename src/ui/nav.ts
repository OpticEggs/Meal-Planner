/**
 * Q4 (2026-10-11): which primary tab is current for a path. Recipes, Selected and Groceries own their own
 * paths; More owns the screens reached through it — the dinner calendar ("/") with its cook and grocery
 * pages (`/cook/*`, `/week/*`), Explore and Household.
 */
const UNDER_MORE = ["/more", "/cook", "/explore", "/household", "/week"];

const within = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export function isActiveTab(href: string, path: string): boolean {
  if (href === "/more") return path === "/" || UNDER_MORE.some((b) => within(path, b));
  return within(path, href);
}

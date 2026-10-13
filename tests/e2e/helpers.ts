import { expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import pg from "pg";
import { seedFixture, USERS, type Fixture } from "../fixtures/household";

export const DB = () => process.env.DATABASE_URL!;

export async function q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB() });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export async function seed(opts?: Parameters<typeof seedFixture>[1]): Promise<Fixture> {
  return seedFixture(DB(), opts);
}

/**
 * A genuinely separate member: its own browser context (cookies/storage) and its own sign-in.
 * Signing in lands on Recipes (Q4); `start` is the screen the test begins on — the dinner calendar ("/")
 * unless a test asks otherwise, because most flows here exercise the calendar week.
 */
export async function member(
  browser: Browser,
  who: "jon" | "alex" | "other",
  opts: { viewport?: { width: number; height: number }; reducedMotion?: "reduce" | "no-preference"; init?: () => void; start?: string; hasTouch?: boolean } = {},
) {
  const context = await browser.newContext({
    ...(opts.viewport ? { viewport: opts.viewport } : {}),
    ...(opts.reducedMotion ? { reducedMotion: opts.reducedMotion } : {}),
    ...(opts.hasTouch ? { hasTouch: true, isMobile: true } : {}),
  });
  if (opts.init) await context.addInitScript(opts.init);
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS[who].email);
  await page.getByLabel("Password").fill(USERS[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByTestId("me")).toHaveText(USERS[who].name);
  const start = opts.start ?? "/";
  if (start !== "/recipes") {
    await page.goto(start);
    await expect(page.getByTestId("me")).toHaveText(USERS[who].name);
  }
  await expect(page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  return { context, page };
}

/** Q4: what More lists. */
export type MoreEntry = "Dinner calendar" | "Explore and Budget Bytes" | "Saved links" | "Household";

/** A screen under More, reached the way a member does: the More tab, then the entry (client-side, so the browsed week is kept). */
export async function viaMore(page: Page, entry: MoreEntry) {
  await page.getByTestId("nav-more").click();
  await expect(page.getByRole("heading", { name: "More", exact: true })).toBeVisible();
  await page.getByRole("link", { name: entry, exact: true }).click();
  const path = { "Dinner calendar": /\/$/, "Explore and Budget Bytes": /\/explore$/, "Saved links": /\/recipes\?tab=links$/, Household: /\/household$/ }[entry];
  await expect(page).toHaveURL(path);
}

/** The dinner calendar (Week), via More. */
export async function openWeek(page: Page) {
  await viaMore(page, "Dinner calendar");
  await expect(page.getByTestId("week-title")).toBeVisible();
}

/**
 * The calendar week's grocery list (/week/groceries): from the Week screen by its "Groceries for this week"
 * link, going to the Week screen through More first when needed. Client-side throughout, so the week being
 * browsed is the week whose groceries open — as the old Groceries tab did.
 */
export async function weekGroceries(page: Page) {
  if (new URL(page.url()).pathname !== "/") await openWeek(page);
  await page.getByTestId("week-groceries-link").click();
  await expect(page).toHaveURL(/\/week\/groceries$/);
}

export async function retailerCalls(): Promise<number> {
  return (await q<{ n: number }>("SELECT count(*)::int AS n FROM fake_retailer_calls"))[0].n;
}

export async function nightTitle(weekId: string, night: string) {
  return (
    await q<{ title: string | null; kind: string; revision: number }>(
      `SELECT v.title, a.kind, a.revision FROM assignments a LEFT JOIN cooking_events e ON e.id=a.cooking_event_id
       LEFT JOIN recipe_versions v ON v.id=e.recipe_version_id WHERE a.week_id=$1 AND a.night=$2`,
      [weekId, night],
    )
  )[0];
}

export async function protectedRows(weekId: string) {
  return {
    week: await q("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [weekId]),
    assignments: await q("SELECT id, night, kind, cooking_event_id, locked, revision FROM assignments WHERE week_id=$1 ORDER BY night", [weekId]),
    events: await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [weekId]),
    allocations: await q("SELECT a.cooking_event_id, a.member_id, a.kind, a.night, a.component_portions FROM allocations a JOIN cooking_events e ON e.id=a.cooking_event_id WHERE e.week_id=$1 ORDER BY 1,2,3,4", [weekId]),
    requirements: await q("SELECT r.ingredient_key, r.line_fingerprint FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 ORDER BY 1", [weekId]),
  };
}

/** Opens Change on a night and previews a replacement with the named recipe. */
export async function previewReplace(page: Page, night: string, recipeTitle: string) {
  await page.getByTestId(`change-${night}`).click();
  await page.getByTestId(`option-${recipeTitle}`).click();
  await expect(page.getByTestId("preview")).toBeVisible();
}

// Deterministic ordering at the database (same mechanism as the integration suite).
export async function holdHousehold(householdId: string) {
  const c = new pg.Client({ connectionString: DB() });
  await c.connect();
  await c.query("BEGIN");
  await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
  return { release: async () => { await c.query("COMMIT"); await c.end(); } };
}
export async function waitForLockWaiters(n: number, timeoutMs = 10_000) {
  const start = Date.now();
  for (;;) {
    const r = await q<{ n: number }>("SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query ILIKE '%FROM households WHERE id=%FOR UPDATE%'");
    if (r[0].n >= n) return;
    if (Date.now() - start > timeoutMs) throw new Error(`expected ${n} lock waiters, saw ${r[0].n}`);
    await new Promise((res) => setTimeout(res, 10));
  }
}

/** Simulate the app going to the background: hidden page, no event stream (offline). */
export async function background(ctx: BrowserContext, page: Page) {
  await ctx.setOffline(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
export async function foreground(ctx: BrowserContext, page: Page) {
  await ctx.setOffline(false);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
  });
}

/** Import review (2026-10-09 overhaul): open a line's editor by its source text (unless it is already open). */
async function openLine(review: Locator, raw: string) {
  const row = review.locator(`[data-testid="draft-line"][data-raw="${raw.replace(/"/g, '\\"')}"]`);
  const main = row.locator(".row-main");
  if ((await main.getAttribute("aria-expanded")) !== "true") await main.click();
  return row;
}
/** Correct a line's amount (and unit) and use it. */
export async function useLine(review: Locator, raw: string, amount: string, unit?: string) {
  const row = await openLine(review, raw);
  await row.getByRole("textbox", { name: /Amount for the whole recipe/ }).fill(amount);
  if (unit) await row.getByRole("combobox", { name: /^Unit, line/ }).selectOption(unit);
  await row.getByRole("button", { name: /^Use line/ }).click();
}
/** Leave a line out of groceries. */
export async function leaveOutLine(review: Locator, raw: string) {
  const row = await openLine(review, raw);
  await row.getByRole("button", { name: /^Leave out line/ }).click();
}

/** Opens Recipes' Add panel (+, D151): paste a link to import it, or write a recipe yourself. Idempotent. */
export async function openAddRecipe(page: Page) {
  const add = page.getByTestId("add-recipe");
  if ((await add.getAttribute("aria-expanded")) !== "true") await add.click();
  await expect(page.getByRole("textbox", { name: "Add a recipe from a link" })).toBeVisible();
}

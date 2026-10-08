import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
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

/** A genuinely separate member: its own browser context (cookies/storage) and its own sign-in. */
export async function member(browser: Browser, who: "jon" | "alex" | "other", opts: { viewport?: { width: number; height: number } } = {}) {
  const context = await browser.newContext(opts.viewport ? { viewport: opts.viewport } : {});
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS[who].email);
  await page.getByLabel("Password").fill(USERS[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("me")).toHaveText(USERS[who].name);
  await expect(page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  return { context, page };
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

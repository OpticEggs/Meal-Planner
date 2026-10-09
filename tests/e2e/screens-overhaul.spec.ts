/**
 * Screens for the import-and-design overhaul evidence (before/after): Week, Groceries, Our Recipes, a recipe,
 * the import review of a synthetic page that carries the reported pesto line, and (when the review can be
 * completed) the imported recipe with its hero photo. A separate test server records a test grant for the
 * synthetic site only, so its generated illustration may be kept. Screenshots go to TABLE_SCREENS_DIR when
 * set, otherwise to the test's output folder. Every view must fit its width (no horizontal page scroll).
 */
import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { TEST_ENV } from "../../playwright.config";
import { member, seed } from "./helpers";

const PORT = 3106;
const BASE = `http://127.0.0.1:${PORT}`;
const PESTO = "https://pesto.example.com/weeknight-pesto-pasta/";
let server: ChildProcess | null = null;

test.use({ baseURL: BASE });
test.setTimeout(240_000);
test.afterEach(() => {
  if (server?.pid) process.kill(-server.pid, "SIGKILL");
  server = null;
});

async function start() {
  server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    env: { ...process.env, ...TEST_ENV, BETTER_AUTH_URL: BASE, TABLE_RECIPE_CONTENT_GRANTS: "pesto.example.com=instructions+photos" },
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 300; i++) {
    try {
      if ((await fetch(`${BASE}/login`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}

const VIEWS = [
  { name: "390-light", viewport: { width: 390, height: 844 }, scheme: "light" as const, text: 1 },
  { name: "390-dark", viewport: { width: 390, height: 844 }, scheme: "dark" as const, text: 1 },
  { name: "320-light-200", viewport: { width: 320, height: 640 }, scheme: "light" as const, text: 2 },
];

for (const v of VIEWS) {
  test(`overhaul screens ${v.name}`, async ({ browser }, info) => {
    await seed();
    await start();
    const { context, page } = await member(browser, "jon", { viewport: v.viewport, reducedMotion: "reduce" });
    await page.emulateMedia({ colorScheme: v.scheme });
    if (v.text !== 1) await page.addStyleTag({ content: `html { font-size: ${v.text * 100}% !important; }` });
    await context.route((u) => u.hostname !== "127.0.0.1", (r) => r.abort());
    const shot = async (p: Page, name: string, full = true) => {
      await p.evaluate(() => document.fonts.ready);
      if (v.text !== 1) await p.addStyleTag({ content: `html { font-size: ${v.text * 100}% !important; }` });
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect.soft(overflow, `${name}: no horizontal page scroll`).toBeLessThanOrEqual(0);
      const dir = process.env.TABLE_SCREENS_DIR;
      for (const fullPage of full ? [false, true] : [false]) {
        const file = `${v.name}-${name}-${fullPage ? "full" : "top"}.png`;
        await p.screenshot({ path: dir ? path.join(dir, file) : info.outputPath(file), fullPage });
      }
    };

    await expect(page.getByTestId("status-sentence")).toBeVisible();
    await shot(page, "1-week");
    await page.getByRole("link", { name: "Groceries" }).first().click();
    await expect(page.getByTestId("still-to-buy")).toBeVisible();
    await shot(page, "2-groceries");
    await page.getByRole("link", { name: /Recipes/ }).first().click();
    await expect(page.getByTestId("recipe-row").first()).toBeVisible();
    await shot(page, "3-recipes");
    await page.getByTestId("recipe-row").first().getByRole("link").first().click();
    await expect(page.getByTestId("recipe-title")).toBeVisible();
    await shot(page, "4-recipe");

    await page.getByRole("link", { name: /Recipes/ }).first().click();
    await page.getByRole("textbox", { name: "Add a recipe from a link" }).fill(PESTO);
    await page.getByTestId("add-from-link-submit").click();
    const review = page.getByRole("dialog", { name: "Review the import" });
    await expect(review).toBeVisible();
    await page.waitForTimeout(300);
    await shot(page, "5-import-review", false);
    // The whole dialog, page by page: its scroll container is scrolled one screen at a time.
    for (let i = 0; i < 10; i++) {
      const more = await page.evaluate((k) => {
        const all = [document.querySelector<HTMLElement>('[role="dialog"]'), ...Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] *'))];
        const sc = all.find((e) => e && e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
        if (!sc) return k === 0;
        sc.scrollTop = k * sc.clientHeight * 0.85;
        return sc.scrollTop + sc.clientHeight < sc.scrollHeight + sc.clientHeight * 0.85 - 1 && (k === 0 || sc.scrollTop > (k - 1) * sc.clientHeight * 0.85);
      }, i);
      if (!more) break;
      const dir = process.env.TABLE_SCREENS_DIR;
      const file = `${v.name}-5-import-review-p${i + 1}.png`;
      await page.screenshot({ path: dir ? path.join(dir, file) : info.outputPath(file) });
    }
    // The redesigned review: settle the two uncertain lines (garlic range → 3 cloves; basil left out).
    const garlic = review.locator('[data-testid="draft-line"][data-raw="2-3 cloves garlic, minced"]');
    if (await garlic.count()) {
      await garlic.getByRole("textbox", { name: /Amount for the whole recipe/ }).fill("3");
      await garlic.getByRole("button", { name: /^Use line/ }).click();
      await review.locator('[data-testid="draft-line"][data-raw="fresh basil, for serving"]').getByRole("button", { name: /^Leave out line/ }).click();
      await shot(page, "5b-import-review-ready", false);
    }
    const confirm = review.getByTestId("import-confirm");
    if (await confirm.isEnabled()) {
      await confirm.click();
      await expect(review).toBeHidden();
      await page.getByRole("link", { name: /Weeknight Pesto Pasta/ }).first().click();
      await expect(page.getByTestId("recipe-title")).toContainText("Weeknight Pesto Pasta");
      await shot(page, "6-imported-recipe");
    }
    await context.close();
  });
}

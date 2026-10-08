/**
 * B7 — ingredient nutrition from USDA FoodData Central, reviewed and confirmed by a member.
 *
 * The suite's own server has no lookup configured (the test environment ignores any real key), so
 * it shows the not-configured state. The match flow runs on a second production server started
 * here with the test-only labeled fixture transport (TABLE_FDC_FIXTURES=1): it serves the fetched
 * DEMO_KEY records (including the genuine 429), spec examples and synthetic fixtures, and never
 * touches the network.
 */
import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { TEST_ENV } from "../../playwright.config";
import { member, q, seed } from "./helpers";

const MAIN_PORT = Number(new URL(TEST_ENV.BETTER_AUTH_URL).port);
const PORT2 = MAIN_PORT + 1;
const BASE2 = `http://127.0.0.1:${PORT2}`;
const CHICKEN_SR = "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw — SR Legacy";
const CHICKEN_FOUNDATION = "Chicken, breast, boneless, skinless, raw — Foundation";

async function household(page: Page) {
  await page.getByRole("link", { name: "Household" }).click();
  await expect(page.getByTestId("ingredient-nutrition")).toBeVisible();
}
const finder = (page: Page, name: string) => page.getByRole("button", { name: `Find nutrition… for ${name}` });

test.describe("not configured (no key on the server)", () => {
  test("the status line and the dialog say lookup is not configured; nothing pretends to search", async ({ browser }) => {
    await seed();
    const { page, context } = await member(browser, "jon");
    await household(page);
    await expect(page.getByTestId("connection-nutrition")).toHaveText(/not configured — there is no API key on the server, so nothing is searched/);
    await expect(page.getByTestId("nutrition-source-chicken_thigh")).toHaveText("Nutrition: synthetic test fixture values (not nutrition data)");
    await expect(page.getByTestId("nutrition-source-cheese")).toHaveText("Nutrition: unknown");
    await finder(page, "Chicken thighs").click();
    const dialog = page.getByRole("dialog", { name: "Nutrition for Chicken thighs" });
    await expect(dialog.getByTestId("nutrition-not-configured")).toContainText("Nutrition lookup is not configured on this server");
    await expect(dialog.getByRole("search")).toHaveCount(0);
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(finder(page, "Chicken thighs")).toBeFocused();
    expect(await q("SELECT 1 FROM nutrition_matches")).toHaveLength(0);
    await context.close();
  });

  test("the browser bundle carries no key, key name or FoodData Central endpoint", async () => {
    const root = path.resolve(".next/static");
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : files.push(path.join(d, f))));
    walk(root);
    expect(files.length).toBeGreaterThan(0);
    const key = process.env.FDC_API_KEY;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text.includes("FDC_API_KEY"), f).toBe(false);
      expect(text.includes("api.nal.usda.gov"), f).toBe(false);
      expect(/api_key=/.test(text), f).toBe(false);
      if (key) expect(text.includes(key), f).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// The labeled fixture transport, on a server started here.

let server: ChildProcess | null = null;
async function startFixtureServer() {
  const env: NodeJS.ProcessEnv = { ...process.env, ...TEST_ENV, BETTER_AUTH_URL: BASE2, TABLE_FDC_FIXTURES: "1" };
  delete env.FDC_API_KEY;
  server = spawn("npx", ["next", "start", "-p", String(PORT2), "-H", "127.0.0.1"], { env, stdio: "ignore", detached: true });
  for (let i = 0; i < 300; i++) {
    try {
      if ((await fetch(`${BASE2}/login`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("fixture server did not start");
}

test.describe("with the labeled fixture transport", () => {
  test.use({ baseURL: BASE2 });
  test.beforeAll(async () => {
    await startFixtureServer();
  });
  test.afterAll(() => {
    if (server?.pid) process.kill(-server.pid, "SIGKILL");
    server = null;
  });

  test("match review: search, candidate values per basis, deliberate form choice, confirm; the other member sees the new source live", async ({ browser }) => {
    const fx = await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    await household(jon.page);
    await household(alex.page);
    await expect(jon.page.getByTestId("connection-nutrition")).toHaveText(/test fixture transport — labeled fixture records, not live/);

    await finder(jon.page, "Chicken thighs").click();
    const dialog = jon.page.getByRole("dialog", { name: "Nutrition for Chicken thighs" });
    const box = dialog.getByRole("textbox", { name: "Search FoodData Central" });
    await expect(box).toBeFocused();
    await expect(box).toHaveValue("Chicken thighs");
    await box.fill("chicken breast raw");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await expect(dialog.getByTestId("nutrition-results")).toHaveText("Results (5)");
    await expect(dialog.getByTestId("nutrition-results")).toBeFocused();
    await dialog.getByRole("button", { name: CHICKEN_SR }).click();

    const cand = dialog.getByTestId("nutrition-candidate");
    await expect(cand.getByRole("heading", { name: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw" })).toBeFocused();
    await expect(cand).toContainText("FDC SR Legacy #171077 · published 4/1/2019 · retrieved 2026-10-12");
    await expect(cand.getByTestId("nutrition-fixture-label")).toHaveText("This is a test fixture: fetched demo record (DEMO_KEY), not live data.");
    await expect(cand.getByTestId("nutrition-values")).toContainText("Per 100 g of the food as described");
    await expect(cand.getByTestId("nutrient-energy")).toHaveText("Energy: 120 kcal");
    await expect(cand.getByTestId("nutrient-protein")).toHaveText("Protein: 22.5 g");
    await expect(cand).toContainText("The description says “raw” — only a hint.");
    const use = cand.getByRole("button", { name: "Use these values" });
    await expect(use).toBeDisabled(); // no form chosen yet: nothing is assumed
    await cand.getByRole("radio", { name: "Per 4 oz = 113 g (scaled by its gram weight)" }).check();
    await cand.getByRole("radio", { name: "raw" }).check();
    await expect(use).toBeEnabled();
    await use.click();

    await expect(dialog).toHaveCount(0);
    await expect(finder(jon.page, "Chicken thighs")).toBeFocused();
    const line = "Nutrition: FDC SR Legacy #171077, retrieved 2026-10-12, raw, per 4 oz = 113 g — test fixture: fetched demo record (DEMO_KEY), not live data";
    await expect(jon.page.getByTestId("nutrition-source-chicken_thigh")).toHaveText(line);
    await expect(alex.page.getByTestId("nutrition-source-chicken_thigh")).toHaveText(line); // live, no reload
    await expect(alex.page.getByTestId("announcer")).toContainText("Jon chose nutrition for Chicken thighs");
    const h = await q("SELECT revision, fdc_id, form, decided_by, provenance_kind FROM nutrition_matches");
    expect(h).toEqual([{ revision: 1, fdc_id: 171077, form: "raw", decided_by: fx.members.jon, provenance_kind: "fixture_fetched_demo" }]);
    expect((await q("SELECT allergen_info_known, tags FROM ingredients WHERE household_id=$1 AND key='chicken_thigh'", [fx.householdId]))[0]).toEqual({ allergen_info_known: true, tags: ["poultry"] });
    await jon.context.close();
    await alex.context.close();
  });

  test("error states are plain sentences, attached or focused, and change nothing", async ({ browser }) => {
    await seed();
    const { page, context } = await member(browser, "jon");
    await household(page);
    await finder(page, "Chicken thighs").click();
    const dialog = page.getByRole("dialog", { name: "Nutrition for Chicken thighs" });
    const box = dialog.getByRole("textbox", { name: "Search FoodData Central" });
    await box.fill("   ");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await expect(box).toHaveAttribute("aria-invalid", "true");
    await expect(box).toHaveAccessibleDescription("Enter words to search for, e.g. chicken breast raw");
    await expect(box).toBeFocused();

    await box.fill("xyzzy");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Nothing found. Try different words.");
    await expect(dialog.getByRole("alert")).toBeFocused();

    await box.fill("chicken breast raw");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await dialog.getByRole("button", { name: CHICKEN_FOUNDATION }).click(); // the recorded genuine 429
    await expect(dialog.getByRole("alert")).toHaveText("FoodData Central is limiting requests from this server right now. Nothing was changed; try again later.");
    await expect(dialog.getByRole("alert")).toBeFocused();
    await expect(dialog.getByTestId("nutrition-candidate")).toHaveCount(0);

    await box.fill("bad key");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText(/did not accept this server's API key/);
    await page.keyboard.press("Escape");
    await expect(finder(page, "Chicken thighs")).toBeFocused();
    expect(await q("SELECT 1 FROM nutrition_matches")).toHaveLength(0);
    await context.close();
  });

  test("another member's change while reviewing is shown live and must be reviewed before saving", async ({ browser }) => {
    const fx = await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    await household(alex.page);
    await finder(alex.page, "Jasmine rice").click();
    const dialog = alex.page.getByRole("dialog", { name: "Nutrition for Jasmine rice" });
    await dialog.getByRole("textbox", { name: "Search FoodData Central" }).fill("synthetic rice");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await dialog.getByRole("button", { name: /GRANOLA — Branded/ }).click();
    const cand = dialog.getByTestId("nutrition-candidate");
    await expect(cand.getByTestId("nutrition-serving")).toContainText("Label serving: 30 g (1/2 cup)");
    await expect(cand.getByTestId("nutrition-serving")).toContainText("A serving is not 100 g.");
    await expect(cand.getByTestId("nutrient-energy")).toHaveText("Energy: 400 kcal");
    await cand.getByRole("radio", { name: "as sold" }).check();

    // Jon clears rice's nutrition meanwhile.
    await household(jon.page);
    await finder(jon.page, "Jasmine rice").click();
    const jd = jon.page.getByRole("dialog", { name: "Nutrition for Jasmine rice" });
    await jd.getByRole("button", { name: "Clear Jasmine rice’s nutrition…" }).click();
    await expect(jd.getByRole("button", { name: "Keep it" })).toBeFocused();
    await jd.getByRole("button", { name: "Clear nutrition" }).click();
    await expect(jon.page.getByTestId("nutrition-source-rice")).toHaveText("Nutrition: unknown");

    await expect(dialog.getByTestId("nutrition-changed")).toContainText("Jon cleared the nutrition for Jasmine rice while you were looking. It is now: unknown.");
    await expect(cand.getByRole("radio", { name: "as sold" })).toBeChecked(); // the member's choice is kept
    const use = cand.getByRole("button", { name: "Use these values" });
    await expect(use).toBeDisabled();
    await dialog.getByRole("button", { name: "I’ve reviewed the current source" }).click();
    await expect(use).toBeEnabled();
    await use.click();
    await expect(dialog).toHaveCount(0);
    await expect(alex.page.getByTestId("nutrition-source-rice")).toHaveText(/^Nutrition: FDC Branded #9000004, retrieved 2026-10-12, as sold — test fixture: synthetic values/);
    expect((await q("SELECT revision, action, decided_by FROM nutrition_matches ORDER BY revision"))).toEqual([
      { revision: 1, action: "cleared", decided_by: fx.members.jon },
      { revision: 2, action: "matched", decided_by: fx.members.alex },
    ]);
    await jon.context.close();
    await alex.context.close();
  });

  for (const scale of [150, 200]) {
    test(`dialog states fit a 320 px phone at ${scale}% text with focus kept visible`, async ({ browser }) => {
      await seed();
      const { page, context } = await member(browser, "jon", { viewport: { width: 320, height: 640 } });
      await page.addStyleTag({ content: `html { font-size: ${scale}% !important; }` });
      await household(page);
      const fits = async (label: string) => {
        const r = await page.evaluate(() => {
          const d = document.querySelector<HTMLElement>('[role="dialog"]');
          const a = document.activeElement as HTMLElement | null;
          const rect = a?.getBoundingClientRect();
          return {
            page: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            dialog: !d || d.scrollWidth <= d.clientWidth,
            focusInDialog: !d || (!!a && d.contains(a)),
            focusOnScreen: !rect || (rect.left >= 0 && rect.right <= window.innerWidth + 1),
          };
        });
        expect(r, label).toEqual({ page: true, dialog: true, focusInDialog: true, focusOnScreen: true });
      };
      await fits("household");
      await finder(page, "Chicken thighs").click();
      const dialog = page.getByRole("dialog", { name: "Nutrition for Chicken thighs" });
      await fits("search");
      await dialog.getByRole("textbox", { name: "Search FoodData Central" }).fill("chicken breast raw");
      await dialog.getByRole("button", { name: "Search", exact: true }).click();
      await expect(dialog.getByTestId("nutrition-results")).toBeFocused();
      await fits("results");
      await dialog.getByRole("button", { name: CHICKEN_FOUNDATION }).click();
      await expect(dialog.getByRole("alert")).toBeFocused();
      await fits("rate-limited alert");
      await dialog.getByRole("button", { name: CHICKEN_SR }).click();
      await expect(dialog.getByTestId("nutrition-candidate")).toBeVisible();
      await fits("candidate");
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press("Tab");
        await fits(`candidate tab ${i + 1}`);
      }
      await page.keyboard.press("Escape");
      await expect(finder(page, "Chicken thighs")).toBeFocused();
      await context.close();
    });
  }
});

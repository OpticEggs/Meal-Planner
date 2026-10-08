/**
 * Where to shop, in the browser (GR-01/02/08, IC-01/02, E2E-03 parts). Two signed-in members.
 * The Instacart case runs on its own server with the test-only recording fake and doc-shaped
 * synthetic fixtures; nothing reaches Instacart or any store.
 */
import { expect, test, type Browser } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { TEST_ENV } from "../../playwright.config";
import { member, q, retailerCalls, seed } from "./helpers";

const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;
const plan = async (weekId: string) => ({
  assignments: await q("SELECT id, night, kind, cooking_event_id, revision FROM assignments WHERE week_id=$1 ORDER BY night", [weekId]),
  events: await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [weekId]),
  requests: await q("SELECT id, kind, packages, state FROM household_requests ORDER BY id"),
});

test("GR-01/02/08: Jon switches to another store; Alex sees it live, the Send button goes, the list copies; meals and history are untouched", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await alex.context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const m of [jon, alex]) await m.page.getByRole("link", { name: "Groceries" }).first().click();
  await expect(alex.page.getByTestId("destination-current")).toContainText("Simulated retailer cart");
  await expect(alex.page.getByTestId("send")).toBeVisible();
  const before = await plan(fx.weekId);
  const where = jon.page.getByTestId("where-to-shop");
  await where.getByRole("radio", { name: /Another store — copy the list/ }).check();
  await where.getByLabel("Store name (optional)").fill("Corner market");
  await where.getByTestId("destination-save").click();
  await expect(jon.page.getByTestId("announcer")).toContainText("Where to shop: Another store");
  await expect(alex.page.getByTestId("destination-current")).toContainText("Another store: Corner market"); // live
  await expect(alex.page.getByTestId("destination-current")).toContainText("chosen by Jon");
  await expect(alex.page.getByTestId("send")).toHaveCount(0);
  await expect(alex.page.getByTestId("destination-prices")).toContainText("Table has no prices for Another store: Corner market");
  const list = alex.page.getByTestId("shopping-list");
  await expect(list).toHaveAttribute("data-open", "true");
  await list.getByTestId("copy-list").click();
  await expect(alex.page.getByTestId("announcer")).toHaveText("Grocery list copied. Nothing was ordered or sent.");
  const copied = await alex.page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Another store: Corner market");
  expect(copied).toContain("A shopping list only: copying it doesn't order, send or record anything.");
  expect(await plan(fx.weekId)).toEqual(before);
  expect(await retailerCalls()).toBe(0);
  expect(await count("handoff_batches")).toBe(0);
  await jon.context.close();
  await alex.context.close();
});

test("E2E-03: Where to shop and the list fit 320 px at 200% text, in light and dark", async ({ browser }) => {
  await seed();
  for (const scheme of ["light", "dark"] as const) {
    const jon = await member(browser, "jon", { viewport: { width: 320, height: 640 } });
    await jon.page.emulateMedia({ colorScheme: scheme });
    await jon.page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await jon.page.getByRole("link", { name: "Groceries" }).first().click();
    await expect(jon.page.getByTestId("where-to-shop")).toBeVisible();
    await jon.page.getByTestId("shopping-list-toggle").click();
    expect(await jon.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), scheme).toBeLessThanOrEqual(0);
    await jon.context.close();
  }
});

test.describe("Instacart shopping list (fixture fake)", () => {
  const PORT = 3103;
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess | null = null;
  test.use({ baseURL: BASE });
  test.afterEach(() => {
    if (server?.pid) process.kill(-server.pid, "SIGKILL");
    server = null;
  });

  async function start() {
    server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
      env: {
        ...process.env, ...TEST_ENV, BETTER_AUTH_URL: BASE,
        TABLE_INSTACART_FAKE_TRANSPORT: "1", INSTACART_ACTIVATE: "list,retailers", INSTACART_API_KEY: "fake-e2e-key-NOT-REAL", INSTACART_ENV: "development",
      },
      stdio: "ignore",
      detached: true,
    });
    for (let i = 0; i < 200; i++) {
      try {
        if ((await fetch(`${BASE}/login`)).ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("server did not start");
  }

  async function run(browser: Browser) {
    const fx = await seed();
    await start();
    const jon = await member(browser, "jon");
    await jon.page.getByRole("link", { name: "Groceries" }).first().click();
    const where = jon.page.getByTestId("where-to-shop");
    await where.getByRole("radio", { name: /Instacart shopping list/ }).check();
    await where.getByTestId("destination-save").click();
    return { fx, jon };
  }

  test("IC-01/02: a link is prepared — it opens Instacart, says nothing was ordered, and no cart batch or order exists; ZIP lookup shows brands only", async ({ browser }) => {
    const { jon } = await run(browser);
    const panel = jon.page.getByTestId("instacart-panel");
    await expect(panel.getByTestId("instacart-capability")).toContainText("Test setup only");
    await expect(panel.getByTestId("instacart-lines").locator("li").first()).toBeVisible();
    await panel.getByTestId("make-instacart-list").click();
    await expect(panel.getByTestId("instacart-link")).toHaveAttribute("data-status", "link_prepared");
    await expect(panel.getByTestId("open-instacart")).toHaveAttribute("href", "https://www.instacart.com/store/shopping_lists/0000000-fixture");
    await expect(panel.getByTestId("instacart-link")).toContainText("Nothing has been ordered.");
    expect(await count("handoff_batches")).toBe(0);
    expect(await count("orders")).toBe(0);
    expect(await retailerCalls()).toBe(0);
    await panel.getByRole("textbox", { name: /ZIP code/ }).fill("45202");
    await panel.getByRole("button", { name: "Look up retailers" }).click();
    await expect(panel.getByTestId("instacart-brands")).toContainText("a brand, not a particular store");
    await expect(panel.getByTestId("instacart-brands")).toContainText("Fixture Retailer A");
    await jon.context.close();
  });
});

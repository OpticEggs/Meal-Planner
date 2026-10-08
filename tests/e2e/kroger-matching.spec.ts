/**
 * Kroger matching in the browser (closes the gap recorded at 184d99f: "typecheck and build only").
 * A separate TEST server runs with the store set to Kroger, only the `products` capability on, fake
 * placeholder credentials, and the in-process Kroger fake answering from a fixture file
 * (TABLE_KROGER_FAKE_SCENARIO) and logging every request it receives (TABLE_KROGER_FAKE_LOG). Both
 * switches are test-only and refused in production. Nothing reaches Kroger; the cart capability is
 * off, and every test proves no cart request was made — product-data reads are counted separately.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_ENV } from "../../playwright.config";
import { member, q, seed } from "./helpers";

const PORT = 3104;
const BASE = `http://127.0.0.1:${PORT}`;
const SCENARIO = fileURLToPath(new URL("../fixtures/kroger/scenario-e2e.json", import.meta.url));
let server: ChildProcess | null = null;
let dir = "";
let LOG = "";

test.use({ baseURL: BASE });
test.afterEach(() => {
  if (server?.pid) process.kill(-server.pid, "SIGKILL");
  server = null;
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function start() {
  dir = mkdtempSync(path.join(tmpdir(), "table-kroger-e2e-"));
  LOG = path.join(dir, "kroger-calls.jsonl");
  server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    env: {
      ...process.env, ...TEST_ENV, BETTER_AUTH_URL: BASE,
      TABLE_RETAILER: "kroger", KROGER_ACTIVATE: "products",
      KROGER_CLIENT_ID: "fake-client-id-e2e", KROGER_CLIENT_SECRET: "fake-client-secret-e2e-NOT-REAL",
      KROGER_PRODUCT_SCOPES: "fake.product:test", KROGER_LOCATION_ID: "TEST0001",
      TABLE_KROGER_FAKE_TRANSPORT: "1", TABLE_KROGER_FAKE_SCENARIO: SCENARIO, TABLE_KROGER_FAKE_LOG: LOG,
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

/** What the Kroger fake received: product-data reads and anything that touches a cart, kept apart. */
function krogerCalls() {
  const all = existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { products: all.filter((c) => c.path === "/v1/products"), cart: all.filter((c) => /cart/i.test(c.path)), all };
}

async function groceries(browser: Browser, who: "jon" | "alex", opts: Parameters<typeof member>[2] = {}) {
  const m = await member(browser, who, opts);
  await m.page.getByRole("link", { name: "Groceries" }).first().click();
  await expect(m.page.getByTestId("groceries")).toBeVisible();
  return m;
}

async function openRice(p: Page) {
  await p.getByTestId("product-rice").click();
  const dialog = p.getByRole("dialog", { name: "Product for Jasmine rice" });
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("kroger-search").getByRole("button", { name: "Search" }).click();
  await expect(dialog.getByTestId("kroger-candidate").first()).toBeVisible();
  return dialog;
}
const candidate = (dialog: ReturnType<Page["getByRole"]>, id: string) => dialog.locator(`[data-testid="kroger-candidate"][data-product-id="${id}"]`);

test("KM-E1: search at the store, choose a unit product — focus returns, the line shows it with its store price, no cart request", async ({ browser }) => {
  await seed();
  await start();
  const jon = await groceries(browser, "jon");
  const p = jon.page;
  const dialog = await openRice(p);
  await expect(dialog.getByRole("textbox", { name: "Search Kroger for Jasmine rice" })).toHaveValue("Jasmine rice");
  const bag = candidate(dialog, "0003000000001");
  await expect(bag).toContainText("2 lb");
  await expect(bag).toContainText("$3.99 on sale (regular $4.49)");
  await expect(bag).toContainText("pickup");
  await bag.getByRole("button", { name: /Use Synthetic Jasmine Rice 2 lb bag/ }).click();
  await expect(dialog).toBeHidden();
  await expect(p.getByTestId("product-rice")).toBeFocused();
  await expect(p.getByTestId("announcer")).toContainText("Synthetic Jasmine Rice 2 lb bag chosen for this pickup.");
  await expect(p.getByTestId("line-rice")).toContainText("Synthetic Jasmine Rice 2 lb bag");
  const [prod] = await q<any>("SELECT retailer, product_ref, package_qty, package_unit, variable_weight FROM products WHERE product_ref='0003000000001'");
  expect(prod).toMatchObject({ retailer: "kroger", package_unit: "lb", variable_weight: false });
  const calls = krogerCalls();
  expect(calls.products.length).toBeGreaterThanOrEqual(2); // the search, then the server's re-read by id
  expect(calls.products.some((c) => c.query["filter.productId"] === "0003000000001")).toBe(true);
  expect(calls.cart).toEqual([]);
  await jon.context.close();
});

test("KM-E2: a unit product whose size Kroger states in words needs the size — the error is on the field and focused; then it is chosen", async ({ browser }) => {
  await seed();
  await start();
  const jon = await groceries(browser, "jon");
  const p = jon.page;
  const dialog = await openRice(p);
  const value = candidate(dialog, "0003000000002");
  await expect(value).toContainText('"1 bag" (size not readable)');
  await value.getByRole("button", { name: /Use Synthetic Rice Value Bag/ }).click();
  const size = value.getByRole("textbox", { name: "Package size" });
  await expect(size).toBeFocused();
  await expect(size).toHaveAttribute("aria-invalid", "true");
  await expect(value.getByTestId("kroger-choose-error")).toContainText("Enter the package size");
  expect(await q("SELECT 1 FROM products WHERE retailer='kroger'")).toHaveLength(0);
  await size.fill("5");
  await value.getByRole("combobox", { name: "Package unit" }).selectOption("lb");
  await value.getByRole("button", { name: /Use Synthetic Rice Value Bag/ }).click();
  await expect(dialog).toBeHidden();
  const [prod] = await q<any>("SELECT package_qty, package_unit FROM products WHERE product_ref='0003000000002'");
  expect([Number(prod.package_qty), prod.package_unit]).toEqual([5, "lb"]);
  expect(krogerCalls().cart).toEqual([]);
  await jon.context.close();
});

test("KM-E3: weight-sold and unknown-basis products are shown with the reason and can't be chosen (RUC-02)", async ({ browser }) => {
  await seed();
  await start();
  const jon = await groceries(browser, "jon");
  const p = jon.page;
  await p.getByTestId("product-chicken_thigh").click();
  const dialog = p.getByRole("dialog", { name: "Product for Chicken thighs" });
  await dialog.getByTestId("kroger-search").getByRole("button", { name: "Search" }).click();
  const weight = candidate(dialog, "0003000000003");
  await expect(weight.getByTestId("kroger-not-choosable")).toContainText("Sold by weight");
  await expect(weight.getByRole("button")).toHaveCount(0);
  await expect(candidate(dialog, "0003000000004").getByRole("button", { name: /Use Synthetic Chicken Thighs Tray/ })).toBeEnabled();
  await p.keyboard.press("Escape");
  const rice = await openRice(p);
  await expect(candidate(rice, "0003000000005").getByTestId("kroger-not-choosable")).toContainText("doesn't say this is sold by the unit");
  await expect(candidate(rice, "0003000000005").getByRole("button")).toHaveCount(0);
  expect(await q("SELECT 1 FROM products WHERE retailer='kroger'")).toHaveLength(0);
  expect(krogerCalls().cart).toEqual([]);
  await jon.context.close();
});

test("KM-E4: a choice made while the other member changed the item is held back until reviewed; nothing is replaced silently", async ({ browser }) => {
  await seed();
  await start();
  const jon = await groceries(browser, "jon");
  const alex = await groceries(browser, "alex");
  const jd = await openRice(jon.page);
  const ad = await openRice(alex.page);
  await candidate(ad, "0003000000001").getByRole("button", { name: /Use Synthetic Jasmine Rice 2 lb bag/ }).click();
  await expect(ad).toBeHidden();
  // Jon's open dialog learns of it: conflict shown, his choices disabled, nothing saved for him.
  await expect(jd.getByTestId("product-conflict")).toContainText("Synthetic Jasmine Rice 2 lb bag");
  await expect(candidate(jd, "0003000000004").or(candidate(jd, "0003000000002")).first().getByRole("button").first()).toBeDisabled();
  const before = await q("SELECT id FROM products WHERE retailer='kroger'");
  expect(before).toHaveLength(1);
  await jd.getByRole("button", { name: "I've reviewed the current product" }).click();
  const value = candidate(jd, "0003000000002");
  await value.getByRole("textbox", { name: "Package size" }).fill("5");
  await value.getByRole("combobox", { name: "Package unit" }).selectOption("lb");
  await value.getByRole("button", { name: /Use Synthetic Rice Value Bag/ }).click();
  await expect(jd).toBeHidden();
  await expect(alex.page.getByTestId("line-rice")).toContainText("Synthetic Rice Value Bag");
  expect(krogerCalls().cart).toEqual([]);
  await jon.context.close();
  await alex.context.close();
});

test("KM-E5: matching several items at once, and the dialogs at 320 px with 200% text, without horizontal scrolling", async ({ browser }) => {
  await seed();
  await start();
  const jon = await groceries(browser, "jon", { viewport: { width: 320, height: 640 } });
  const p = jon.page;
  await p.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await p.getByTestId("kroger-match").click();
  const dialog = p.getByRole("dialog", { name: "Match products at Kroger" });
  await expect(dialog.getByTestId("kroger-match-start")).toBeFocused();
  await dialog.getByTestId("kroger-match-start").click();
  const riceSection = dialog.getByRole("region", { name: "Kroger products for Jasmine rice" });
  await expect(riceSection.getByTestId("kroger-candidate").first()).toBeVisible();
  const box = await dialog.evaluate((d) => ({ sw: d.scrollWidth, cw: d.clientWidth }));
  expect(box.sw).toBeLessThanOrEqual(box.cw);
  expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await riceSection.locator('[data-product-id="0003000000001"]').getByRole("button", { name: /Use Synthetic Jasmine Rice 2 lb bag/ }).click();
  await expect(dialog.getByRole("heading", { name: /Jasmine rice — chose Synthetic Jasmine Rice 2 lb bag/ })).toBeVisible();
  expect(await q("SELECT 1 FROM products WHERE retailer='kroger'")).toHaveLength(1); // only what was chosen
  const calls = krogerCalls();
  expect(calls.products.length).toBeGreaterThan(1);
  expect(calls.cart).toEqual([]);
  await jon.context.close();
});

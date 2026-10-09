/**
 * The continuous journey through the UI (simulated providers only): paste a recipe's link → the review
 * (method and photo kept under a test-configured per-site grant) → create the recipe → put it on Saturday in place of the fixture tacos
 * through the Change sheet and apply it deliberately → consolidated groceries → match Kroger products
 * (the other member changes a line meanwhile; a weight-sold product can't be chosen) → approve → an
 * explicit partial transfer → the fake Kroger cart acknowledges → the remaining list and the unchanged
 * accepted week.
 *
 * Everything external is a local fixture: recipe pages and the photo from tests/fixtures/import-site
 * (synthetic; provenance in its README), Kroger answers from tests/fixtures/kroger/scenario-journey.json
 * through the production-refused fake, Kroger's sign-in page answered by a local route. Every browser
 * request to a non-local host is aborted and counted. This is not evidence of any real site or provider.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_ENV } from "../../playwright.config";
import { NIGHT } from "../fixtures/household";
import { leaveOutLine, member, previewReplace, q, seed, useLine } from "./helpers";

const PORT = 3105;
const BASE = `http://127.0.0.1:${PORT}`;
const SCENARIO = fileURLToPath(new URL("../fixtures/kroger/scenario-journey.json", import.meta.url));
const WPRM = "https://wprm.example.com/skillet-taco-rice/";
let server: ChildProcess | null = null;
let dir = "";
let LOG = "";
const external: string[] = [];

test.use({ baseURL: BASE });
test.setTimeout(180_000);
test.afterEach(() => {
  if (server?.pid) process.kill(-server.pid, "SIGKILL");
  server = null;
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function start() {
  dir = mkdtempSync(path.join(tmpdir(), "table-journey-"));
  LOG = path.join(dir, "kroger-calls.jsonl");
  server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    env: {
      ...process.env, ...TEST_ENV, BETTER_AUTH_URL: BASE,
      // Kroger: every capability on, but only against the scripted fake (test-only switches, refused in production).
      TABLE_RETAILER: "kroger", KROGER_ACTIVATE: "connect,products,cart",
      KROGER_CLIENT_ID: "fake-client-id-journey", KROGER_CLIENT_SECRET: "fake-client-secret-journey-NOT-REAL",
      KROGER_REDIRECT_URI: `${BASE}/api/kroger/callback`, KROGER_CUSTOMER_SCOPES: "fake.cart:test", KROGER_PRODUCT_SCOPES: "fake.product:test",
      KROGER_LOCATION_ID: "TEST0001", TABLE_TOKEN_KEY: Buffer.alloc(32, 7).toString("base64"),
      TABLE_KROGER_FAKE_TRANSPORT: "1", TABLE_KROGER_FAKE_SCENARIO: SCENARIO, TABLE_KROGER_FAKE_LOG: LOG,
      // Recipe pages from local fixtures; the synthetic page's method and photo kept under a test grant.
      TABLE_RECIPE_CONTENT_GRANTS: "wprm.example.com=instructions+photos",
    },
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

/** No request leaves the machine: Kroger's sign-in page is answered locally; anything else external is aborted and counted. */
async function local(ctx: BrowserContext) {
  await ctx.route((u) => u.hostname !== "127.0.0.1", async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "api.kroger.com" && u.pathname === "/v1/connect/oauth2/authorize") {
      return route.fulfill({ status: 302, headers: { location: `${BASE}/api/kroger/callback?code=fake-journey-code&state=${u.searchParams.get("state")}` } });
    }
    external.push(u.href);
    return route.abort();
  });
}
const krogerLog = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const acceptedRevision = async (weekId: string) => (await q<any>("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [weekId]))[0].accepted_choice_revision;

async function chooseKroger(p: Page, key: string, title: string, productId: string, size?: [string, string]) {
  await p.getByTestId(`product-${key}`).click();
  const d = p.getByRole("dialog", { name: `Product for ${title}` });
  await d.getByTestId("kroger-search").getByRole("button", { name: "Search" }).click();
  const c = d.locator(`[data-testid="kroger-candidate"][data-product-id="${productId}"]`);
  if (size) {
    await c.getByRole("textbox", { name: "Package size" }).fill(size[0]);
    await c.getByRole("combobox", { name: "Package unit" }).selectOption(size[1]);
  }
  await c.getByRole("button", { name: /^Use / }).click();
  await expect(d).toBeHidden();
}

test("JOURNEY: link → recipe → Saturday → groceries → Kroger products → partial transfer acknowledged → what remains", async ({ browser }) => {
  const fx = await seed();
  await start();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  for (const m of [jon, alex]) await local(m.context);
  const p = jon.page;

  // 1. Connect the household's Kroger account (sign-in answered locally) and choose the store.
  await p.getByRole("link", { name: "Household" }).first().click();
  await p.getByRole("button", { name: "Connect Kroger account" }).click();
  // Back on the same origin the member signed in on (not the server's bind address), still signed in.
  await expect(p).toHaveURL(`${BASE}/household?kroger=connected`);
  await expect(p.getByTestId("kroger-connection-status")).toContainText("(by Jon)");
  await p.getByLabel("Kroger store id").fill("TEST0001");
  await p.getByRole("button", { name: "Save store" }).click();
  await expect(p.getByTestId("kroger-cart-readiness")).toContainText("ready");
  await expect(p.getByTestId("kroger-cart-readiness")).not.toContainText("not ready");

  // 2. Paste a recipe link; the review shows what was read; accept the suggestions, leave water out; create.
  await p.getByRole("link", { name: "Our Recipes" }).click();
  await p.getByRole("textbox", { name: "Add a recipe from a link" }).fill(WPRM);
  await p.getByTestId("add-from-link-submit").click();
  const review = p.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("draft-source")).toContainText("Read from Example Kitchen · by Sam Example");
  await expect(review.getByTestId("draft-kept")).toContainText("The page's method (3 steps) was kept (owner-recorded grant for wprm.example.com)");
  await expect(review.getByTestId("draft-kept")).toContainText("Its photo was kept");
  await expect(review.getByTestId("draft-servings")).toHaveValue("4");
  // 2026-10-09: every line is read cleanly and starts as Use (no suggestions to accept); salt and pepper are left
  // out as household seasonings. The page gives rice by volume; stores sell it by weight and Table never invents a
  // density, so the member states the amount by weight themself (1 cup dry ≈ 7 oz, their own reading of the bag).
  await expect(review.locator('[data-testid="draft-line"][data-raw="salt and pepper to taste"]')).toHaveAttribute("data-state", "out");
  await useLine(review, "1 cup long grain rice", "7", "oz");
  await leaveOutLine(review, "2 cups water");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const [v] = await q<any>("SELECT v.id, v.image_id, v.instructions, v.source_url FROM recipe_versions v WHERE v.title='Skillet Taco Rice'");
  expect(v.image_id).not.toBeNull();
  expect(v.source_url).toBe(WPRM);
  expect(v.instructions).toContain("Fold in the beans and salsa (synthetic).");
  const ings = await q<any>("SELECT ingredient_key, quantity, unit FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY ingredient_key", [v.id]);
  expect(ings.map((i) => [i.ingredient_key, Number(i.quantity), i.unit])).toEqual([
    ["black_beans", 3.75, "oz"], ["garlic_clove", 0.5, "each"], ["long_grain_rice", 1.75, "oz"], ["olive_oil", 0.5, "tbsp"], ["onion", 0.25, "each"], ["salsa", 0.083333333333, "cup"],
  ]);

  // 3. Swap Saturday's tacos for it deliberately (Change sheet → preview → apply).
  await p.getByRole("link", { name: "Week" }).first().click();
  const before = await acceptedRevision(fx.weekId);
  await previewReplace(p, NIGHT.sat, "Skillet Taco Rice");
  await p.getByTestId("apply").click();
  await expect.poll(() => acceptedRevision(fx.weekId)).toBe(before + 1);
  const accepted = await acceptedRevision(fx.weekId);

  // 4. Groceries: consolidated lines; match Kroger products. A weight-sold product can't be chosen.
  await p.getByRole("link", { name: "Groceries" }).first().click();
  await expect(p.getByTestId("line-long_grain_rice")).toBeVisible();
  // "15.5 oz" doesn't say weight or fluid, so Table asks; the member reads the can and enters it.
  await chooseKroger(p, "black_beans", "Black beans (canned)", "0004000000005", ["15.5", "oz"]);
  await chooseKroger(p, "long_grain_rice", "long grain rice", "0004000000001");
  await chooseKroger(p, "olive_oil", "Olive oil", "0004000000002");
  await chooseKroger(p, "onion", "onion", "0004000000003");
  await chooseKroger(p, "garlic_clove", "garlic (clove)", "0004000000004");
  await chooseKroger(p, "salsa", "salsa", "0004000000006");
  await p.getByTestId("product-chicken_thigh").click();
  const chicken = p.getByRole("dialog", { name: "Product for Chicken thighs" });
  await chicken.getByTestId("kroger-search").getByRole("button", { name: "Search" }).click();
  await expect(chicken.locator('[data-product-id="0004000000007"]').getByTestId("kroger-not-choosable")).toContainText("Sold by weight");
  await p.keyboard.press("Escape");

  // 5. Alex says there's enough salsa at home before anything is approved.
  await alex.page.getByRole("link", { name: "Groceries" }).first().click();
  await alex.page.getByRole("button", { name: "Have enough salsa" }).click();
  await expect(p.getByTestId("line-salsa")).not.toContainText("Approve");

  // 6. Jon approves what is ready, then sends only those items, explicitly.
  for (const [key, name] of [["black_beans", "Black beans (canned)"], ["garlic_clove", "garlic (clove)"], ["long_grain_rice", "long grain rice"], ["olive_oil", "Olive oil"], ["onion", "onion"]]) {
    await p.getByRole("button", { name: `Approve 1 package of ${name}` }).click();
    await expect(p.getByTestId(`line-${key}`)).toContainText("Approved ×1");
  }
  await expect(p.getByTestId("send")).toBeDisabled(); // the whole list isn't ready: the ordinary Send stays whole-list only
  await p.getByTestId("prepare-partial").click();
  const d = p.getByRole("dialog", { name: "Send only the ready items" });
  await expect(d.getByTestId("partial-item")).toHaveCount(5); // every grocery line of the imported recipe (salsa: Alex has enough)
  await expect(d.getByTestId("partial-left-out").locator('[data-key="chicken_thigh"]')).toContainText("isn't sold by this store");
  await d.getByTestId("partial-ack").check();
  await d.getByTestId("partial-send").click();
  await expect(d).toBeHidden();
  await expect(p.getByTestId("announcer")).toContainText("Partial transfer acknowledged: 5 item(s) sent");

  // 7. What Kroger's (fake) cart received, exactly; nothing else left the machine.
  const carts = krogerLog().filter((c) => c.path === "/v1/cart/add");
  expect(carts).toHaveLength(1);
  expect(carts[0].body).toEqual({ items: [
    { upc: "0004000000001", quantity: 1, modality: "FIXTURE_MODALITY_NOT_A_KROGER_VALUE" },
    { upc: "0004000000002", quantity: 1, modality: "FIXTURE_MODALITY_NOT_A_KROGER_VALUE" },
    { upc: "0004000000003", quantity: 1, modality: "FIXTURE_MODALITY_NOT_A_KROGER_VALUE" },
    { upc: "0004000000004", quantity: 1, modality: "FIXTURE_MODALITY_NOT_A_KROGER_VALUE" },
    { upc: "0004000000005", quantity: 1, modality: "FIXTURE_MODALITY_NOT_A_KROGER_VALUE" },
  ] });
  expect(external).toEqual([]);

  // 8. Both members see the partial transfer and what remains; the accepted week is unchanged by groceries.
  for (const m of [jon, alex]) {
    const batch = m.page.getByTestId("batch");
    await expect(batch).toContainText("Transfer 1 (partial): Sent to cart — the store acknowledged the transfer");
    await expect(batch.getByTestId("batch-left-out")).toHaveText(
      "Left out of this transfer (9): Broccoli, Chicken thighs, Cucumber, Plain Greek yogurt, Pita bread, Jasmine rice, Salmon fillet, Soy sauce, Firm tofu — still on your list.",
    );
    await expect(m.page.getByTestId("line-chicken_thigh")).toContainText("To send: 2 package(s)"); // still outstanding, not sent
  }
  expect(await acceptedRevision(fx.weekId)).toBe(accepted);
  const [b] = await q<any>("SELECT scope, omissions FROM handoff_batches");
  expect(b.scope).toBe("partial");
  expect(b.omissions.omitted.map((o: any) => [o.key, o.code, o.toSend])).toEqual([
    ["broccoli", "not_sold_here", 2], ["chicken_thigh", "not_sold_here", 2], ["cucumber", "not_sold_here", 2], ["greek_yogurt", "not_sold_here", 1],
    ["pita", "not_sold_here", 1], ["rice", "not_sold_here", 1], ["salmon", "not_sold_here", 1], ["soy_sauce", "not_sold_here", 1], ["tofu", "not_sold_here", 1],
  ]);
  await jon.context.close();
  await alex.context.close();
});

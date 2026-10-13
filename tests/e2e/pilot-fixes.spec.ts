/**
 * Household-pilot fixes (2026-10-13). PM-1: the recipe "…" opens a sheet in place (it was a jump link to #recipe-more):
 * the page does not move, focus returns to "…", and the editor opened from it keeps its discard guard. PM-2..PM-4: the
 * selected-meals grocery list as a simple checklist — ingredient, total required, Have it — with the recipe breakdown,
 * partial amounts and purchasing under Details, a missing amount kept in view and told apart from a store package not
 * chosen yet, and the existing bindings (exact Have-enough review, shared updates, approvals, stale-send refusal) intact.
 * Test data only; the retailer is the simulated fake.
 */
import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { member, q, retailerCalls, seed } from "./helpers";

const PHOTO = fileURLToPath(new URL("../fixtures/import-site/pesto-hero.jpg", import.meta.url));
const CHILI = "Fixture: Turkey chili";
const SALMON = "Fixture: Salmon rice bowls";
const CHICKEN_RICE = "Fixture: Sheet-pan chicken and rice";
const settled = (p: Page) => expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
const scrollY = (p: Page) => p.evaluate(() => Math.round(window.scrollY));
const focusedTestId = (p: Page) => p.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName ?? null);

async function select(p: Page, title: string) {
  await p.goto("/recipes");
  const tile = p.locator(`[data-testid="recipe-row"][data-title="${title}"]`);
  await tile.getByRole("button", { name: /^Add / }).click();
  await expect(tile.getByTestId("selected-mark")).toBeVisible();
}

test("PM-1: … opens a sheet in place — no jump, focus back on …; Edit keeps its discard guard; Add a photo opens the picker", async ({ browser }) => {
  const fx = await seed();
  const recipeId = (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title=$1", [CHILI]))[0].id;
  const { page: p, context } = await member(browser, "jon", { viewport: { width: 390, height: 480 }, start: `/recipes/${recipeId}` });
  await expect(p.getByTestId("recipe-title")).toHaveText(CHILI);
  const more = p.getByTestId("recipe-more");
  // A finger's tap where "…" is (no scrolling it into view first, as locator.click() would).
  const tapMore = async () => { const b = (await more.boundingBox())!; await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
  await p.evaluate(() => window.scrollTo({ top: 10, behavior: "instant" })); // scrolled a little, "…" still fully on screen
  const y0 = await scrollY(p);
  expect(y0).toBe(10);
  expect((await more.boundingBox())!.y).toBeGreaterThanOrEqual(0);

  // Open: a dialog, not navigation — no #fragment, the page stays where it was.
  await tapMore();
  const sheet = p.getByRole("dialog", { name: CHILI, exact: true });
  await expect(sheet).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  expect(new URL(p.url()).hash).toBe("");
  expect(await scrollY(p)).toBe(y0);
  await expect(sheet.getByRole("button", { name: "Edit recipe" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Add a photo" })).toBeVisible();
  // Escape closes it; focus returns to "…"; still the same place.
  await p.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => focusedTestId(p)).toBe("recipe-more");
  expect(await scrollY(p)).toBe(y0);
  // The close button too.
  await tapMore();
  await sheet.getByRole("button", { name: "Close recipe actions" }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => focusedTestId(p)).toBe("recipe-more");
  expect(await scrollY(p)).toBe(y0);

  // Edit recipe from the sheet: the editor opens; unsaved work is guarded as before; closing returns focus to "…".
  await tapMore();
  await sheet.getByRole("button", { name: "Edit recipe" }).click();
  const editor = p.getByRole("dialog", { name: `Edit ${CHILI} — new version` });
  await expect(editor).toBeVisible();
  await expect(sheet).toHaveCount(0);
  await editor.getByLabel("Title", { exact: true }).fill("Turkey chili (draft)");
  await p.keyboard.press("Escape");
  const guard = p.getByTestId("discard-confirm");
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Keep editing" }).click();
  await expect(editor.getByLabel("Title", { exact: true })).toHaveValue("Turkey chili (draft)");
  await p.keyboard.press("Escape");
  await guard.getByRole("button", { name: "Discard changes" }).click();
  await expect(editor).toHaveCount(0);
  await expect.poll(() => focusedTestId(p)).toBe("recipe-more");
  expect(await scrollY(p)).toBe(y0);
  expect((await q<any>("SELECT count(*)::int n FROM recipe_versions WHERE recipe_id=$1", [recipeId]))[0].n).toBe(1); // nothing saved

  // Add a photo: the sheet closes and the system file picker opens; the chosen photo is saved.
  await more.click();
  const [chooser] = await Promise.all([p.waitForEvent("filechooser"), sheet.getByRole("button", { name: "Add a photo" }).click()]);
  await expect(sheet).toHaveCount(0);
  await chooser.setFiles(PHOTO);
  await expect(p.getByTestId("recipe-hero").getByTestId("recipe-photo")).toBeVisible();
  await more.click();
  await expect(sheet.getByRole("button", { name: "Replace photo" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Remove photo" })).toBeVisible();
  void fx;
  await context.close();
});

test("PM-2: checklist rows — name, total, Have it; a missing amount stays in view; a package not chosen is said quietly; no status badges", async ({ browser }) => {
  const fx = await seed();
  // A recipe that names tortillas without an amount (as CF-E2), and salmon with no store product chosen.
  const [r] = await q<any>("INSERT INTO recipes(household_id, created_by) VALUES ($1,$2) RETURNING id", [fx.householdId, fx.members.jon]);
  const [v] = await q<any>("INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,1,'Brisket Tacos','','manual',false,$3) RETURNING id", [r.id, fx.householdId, fx.members.jon]);
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [v.id]);
  await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,'beef_brisket','beef brisket'),($1,'flour_tortillas','flour tortillas') ON CONFLICT DO NOTHING", [fx.householdId]);
  await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main','beef_brisket',0.375,'lb',0)", [v.id]);
  await q("INSERT INTO recipe_unquantified_items(household_id, recipe_version_id, position, component_key, ingredient_key, name, note) VALUES ($1,$2,0,'main','flour_tortillas','flour tortillas','for serving')", [fx.householdId, v.id]);
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [r.id, v.id]);
  await q("DELETE FROM product_mappings WHERE household_id=$1 AND ingredient_key='salmon'", [fx.householdId]);

  const { page: p, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  await select(p, SALMON);
  await select(p, "Brisket Tacos");
  await p.getByTestId("nav-groceries").click();
  await expect(p.getByTestId("groceries")).toHaveAttribute("data-scope", "list");

  // Recipe amount known, store package not chosen: the total and Have it, and one quiet line.
  const salmon = p.getByTestId("line-salmon");
  await expect(salmon.getByRole("heading", { name: "Salmon fillet" })).toBeVisible();
  await expect(p.getByTestId("buy-salmon")).toHaveText("12.0 oz (340 g)");
  await expect(salmon.getByRole("button", { name: "Have it: Salmon fillet" })).toBeVisible();
  await expect(p.getByTestId("package-note-salmon")).toHaveText("Recipe amount known · store package not chosen yet");
  await expect(p.getByTestId("amount-problem-salmon")).toHaveCount(0);

  // Ingredient amount unknown: said in place of the amount, the reason in view, no Have it to press.
  const tort = p.getByTestId("line-flour_tortillas");
  await expect(p.getByTestId("buy-flour_tortillas")).toHaveText("Amount unknown");
  await expect(p.getByTestId("amount-problem-flour_tortillas")).toContainText("Needs a quantity for Brisket Tacos");
  await expect(tort.getByRole("button", { name: /^Have it/ })).toHaveCount(0);

  // No purchasing-status badges or status words outside Details, on any row.
  for (const li of await p.locator('[data-testid^="line-"]').all()) {
    await expect(li.locator(":scope > :not(details) .badge")).toHaveCount(0);
    const outside = await li.evaluate((el) => [...el.children].filter((c) => c.tagName !== "DETAILS").map((c) => (c as HTMLElement).innerText).join(" "));
    expect(outside).not.toMatch(/Needs review|Unresolved|Not sent yet|Approved/);
  }

  // Details: where the amount comes from, and the package problem in full.
  await salmon.getByText("Details").click();
  await expect(p.getByTestId("sources-salmon")).toContainText("Salmon rice bowls: 12.0 oz (340 g)");
  await expect(p.getByTestId("details-salmon")).toContainText("No product chosen for this ingredient");
  // Nothing is claimed ready: the readiness card still names both problems.
  await expect(p.getByTestId("readiness")).toContainText("Not ready yet");
  await expect(p.getByTestId("readiness")).toContainText(/flour tortillas: Needs a quantity/);
  await expect(p.getByTestId("send")).toBeDisabled();
  await p.screenshot({ path: test.info().outputPath("checklist-states.png"), fullPage: true });
  await context.close();
});

test("PM-3: Have it binds to the exact requirement, moves the row and keeps focus, reaches the other member; partial amounts under Details", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  const alex = await member(browser, "alex", { viewport: { width: 390, height: 844 } });
  await select(jon.page, SALMON);
  await select(jon.page, CHICKEN_RICE);
  for (const m of [jon, alex]) {
    await m.page.getByTestId("nav-groceries").click();
    await expect(m.page.getByTestId("groceries")).toHaveAttribute("data-scope", "list");
  }
  const p = jon.page;
  await settled(p);
  // Rice is needed by both meals: one row, its total; the breakdown is under Details.
  await expect(p.getByTestId("buy-rice")).toHaveText("10.6 oz (300 g)");
  await p.getByTestId("line-rice").getByText("Details").click();
  await expect(p.getByTestId("sources-rice")).toContainText("Salmon rice bowls");
  await expect(p.getByTestId("sources-rice")).toContainText("Sheet-pan chicken and rice");

  // Have it: recorded as "Have enough" for exactly this requirement; the row moves to Have it, focus stays on it.
  const have = p.getByTestId("have-rice");
  await have.click();
  await expect(have).toHaveAttribute("aria-pressed", "true");
  await expect(p.getByRole("list", { name: /Have it or already bought/ }).getByTestId("line-rice")).toBeVisible();
  await expect(p.getByTestId("line-rice")).toHaveAttribute("data-to-send", "0");
  await expect.poll(() => focusedTestId(p)).toBe("have-rice");
  await expect(p.getByTestId("grocery-delta")).toHaveCount(0); // Jon's own answer is not "changed since you started"
  const obs = await q<any>("SELECT state, reviewed_exact, reviewed_unit, reviewed_binding FROM availability_observations WHERE ingredient_key='rice' ORDER BY observed_at DESC LIMIT 1");
  expect(obs[0]).toMatchObject({ state: "enough", reviewed_exact: "300", reviewed_unit: "g", reviewed_binding: "current_requirement" });
  // Shared: Alex sees it too.
  await expect(alex.page.getByTestId("have-rice")).toHaveAttribute("aria-pressed", "true");
  await expect(alex.page.getByTestId("line-rice")).toHaveAttribute("data-to-send", "0");
  await expect(alex.page.getByTestId("grocery-delta")).toContainText("Jasmine rice: 1 → 0 package(s)."); // news to Alex
  // Pressed again: Need — back on the list to buy.
  await settled(p);
  await have.click();
  await expect(p.getByTestId("have-rice")).toHaveAttribute("aria-pressed", "false");
  await expect(p.getByRole("list", { name: /^To buy/ }).getByTestId("line-rice")).toBeVisible();
  await expect.poll(() => focusedTestId(p)).toBe("have-rice");
  expect((await q<any>("SELECT state FROM availability_observations WHERE ingredient_key='rice' ORDER BY observed_at DESC LIMIT 1"))[0].state).toBe("need");

  // A partial amount on hand is under Details: the total stays the requirement; what is still to buy is shown there.
  const broc = p.getByTestId("line-broccoli");
  await broc.getByText("Details").click();
  await broc.getByLabel("Amount of Broccoli on hand (g)").fill("50");
  await settled(p);
  await broc.getByRole("button", { name: "Have some Broccoli" }).click();
  await expect(p.getByTestId("details-broccoli")).toContainText("Jon: Have some (50 g) · still to buy 5.3 oz (150 g)");
  await expect(p.getByTestId("buy-broccoli")).toHaveText("7.1 oz (200 g)");
  await expect(alex.page.getByTestId("details-broccoli")).toContainText("Jon: Have some (50 g)");
  await jon.context.close();
  await alex.context.close();
});

test("PM-4: approvals and sending from the checklist are unchanged; a send for a list that changed is refused with no retailer call", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  const p = jon.page;
  await select(p, SALMON);
  await p.getByTestId("nav-groceries").click();
  await settled(p);
  await p.getByTestId("approve-all").click();
  await expect(p.getByTestId("readiness")).toContainText("Groceries ready to send.");
  // What the screen was ready to send, then the list changes (Have it on one line) before it is sent.
  const list = async () => (await (await p.request.get("/api/snapshot")).json()).mealList; // the selected-meals list's own week
  const before = (await list()).groceries.summary;
  const listWeek = (await list()).weekId;
  await p.getByTestId("have-rice").click();
  await expect(p.getByTestId("line-rice")).toHaveAttribute("data-to-send", "0");
  const calls = await retailerCalls();
  const stale = await p.request.post("/api/commands/StartHandoff", { data: { operationId: `StartHandoff-${Date.now()}`, payload: { weekId: listWeek, reviewFingerprint: before.reviewFingerprint, payloadHash: before.payloadHash } } });
  const staleAnswer = await stale.json();
  expect(staleAnswer.status).not.toBe("accepted");
  expect(staleAnswer.code).toBe("stale_review");
  expect(await retailerCalls()).toBe(calls);
  expect((await q<any>("SELECT count(*)::int n FROM handoff_batches"))[0].n).toBe(0);
  // The current list sends (simulated), from the same screen.
  await settled(p);
  await expect(p.getByTestId("send")).toBeEnabled();
  await p.getByTestId("send").click();
  await expect(p.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
  const sent = (await q<any>("SELECT payload FROM handoff_batches"))[0].payload;
  expect(JSON.stringify(sent)).not.toContain("rice");
  await jon.context.close();
});

test("PM-5: 320 px at 200% text — the checklist and the … sheet fit: no sideways scroll, Have it ≥ 44 px, nothing cut off", async ({ browser }) => {
  await seed();
  const { page: p, context } = await member(browser, "jon", { viewport: { width: 320, height: 640 } });
  await select(p, SALMON);
  await select(p, CHICKEN_RICE);
  const big = () => p.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const fits = async (label: string) => {
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const clipped = [...document.querySelectorAll<HTMLElement>(".line-name, .line-buy, .check-note, .have-btn, .sheet-modal button")]
        .filter((e) => e.offsetParent && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) && getComputedStyle(e).overflow !== "visible")
        .map((e) => e.innerText.slice(0, 30));
      return { sideways: de.scrollWidth - de.clientWidth, clipped };
    });
    expect(r.sideways, label).toBeLessThanOrEqual(0);
    expect(r.clipped, label).toEqual([]);
  };
  await p.getByTestId("nav-groceries").click();
  await expect(p.getByTestId("groceries")).toHaveAttribute("data-scope", "list");
  await big();
  await fits("checklist");
  for (const b of await p.locator(".have-btn").all()) {
    const box = (await b.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await p.getByTestId("line-rice").getByText("Details").click();
  await fits("checklist with details open");
  const recipeId = (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title=$1", [SALMON]))[0].id;
  await p.goto(`/recipes/${recipeId}`);
  await big();
  await p.getByTestId("recipe-more").click();
  await expect(p.getByRole("dialog", { name: SALMON, exact: true })).toBeVisible();
  await fits("… sheet");
  await p.screenshot({ path: test.info().outputPath("sheet-320-200.png") });
  await context.close();
});

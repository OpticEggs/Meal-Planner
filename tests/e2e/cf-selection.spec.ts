/**
 * Catalog-first in the browser (CATALOG-FIRST-PLAN §0): browse the photo-first catalog, select meals without a date,
 * adjust servings, both members see one list, groceries combine it, missing quantities get answered, and the dinner
 * calendar is untouched. Real PostgreSQL (table_e2e), production build, simulated retailer.
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";
import { USERS } from "../fixtures/household";

const settled = (page: Page) => expect(page.getByTestId("currency")).toHaveAttribute("data-currency", "current");

/** Every accepted-calendar fact and the calendar week's requirement lines (must not change). */
async function calendar(weekId: string) {
  return {
    week: await q("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [weekId]),
    assignments: await q("SELECT id, night, kind, cooking_event_id, revision FROM assignments WHERE week_id=$1 ORDER BY night", [weekId]),
    events: await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [weekId]),
    lines: await q("SELECT r.ingredient_key, r.line_fingerprint FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 ORDER BY 1", [weekId]),
  };
}

const tile = (page: Page, title: string) => page.locator(`[data-testid="recipe-row"][data-title="${title}"]`);
const SALMON = "Fixture: Salmon rice bowls";
const PENNE = "Fixture: Chicken penne";
const CHICKEN_RICE = "Fixture: Sheet-pan chicken and rice";

test("CF-E1: two members select meals without a date, adjust servings, and shop one combined list; the calendar is untouched", async ({ browser }) => {
  const fx = await seed();
  const before = await calendar(fx.weekId);
  const jon = await member(browser, "jon", { start: "/recipes" });
  const alex = await member(browser, "alex", { start: "/selected" });
  await expect(alex.page.getByTestId("selected-empty")).toBeVisible();

  // Jon: + on two tiles of the gallery (no day is asked for).
  await expect(tile(jon.page, SALMON).getByTestId("photo-kind")).toHaveText("No photo yet");
  await tile(jon.page, SALMON).getByRole("button", { name: `Add ${SALMON} to Selected Meals (2 servings)` }).click();
  await expect(tile(jon.page, SALMON).getByTestId("selected-mark")).toBeVisible();
  await settled(jon.page);
  await tile(jon.page, CHICKEN_RICE).getByRole("button", { name: `Add ${CHICKEN_RICE} to Selected Meals (2 servings)` }).click();
  await expect(jon.page.getByTestId("selection-bar")).toContainText("2 meals · 4 servings");
  await expect(jon.page.getByTestId("nav-selected")).toHaveAccessibleName(/Selected, 2/);

  // Alex sees the same list without reloading, and changes the salmon to 3 servings.
  await expect(alex.page.getByTestId("selected-meal")).toHaveCount(2);
  const card = alex.page.locator(`[data-testid="selected-meal"][data-title="${SALMON}"]`);
  await settled(alex.page);
  await card.getByRole("button", { name: `More servings (Servings of ${SALMON})` }).click();
  await expect(card.getByTestId("servings-value")).toHaveText("3");
  await expect(card).toContainText("changed by Alex");
  // Re-adding the same recipe is a servings change, never a second copy: the tile now offers the list instead of +.
  await expect(tile(jon.page, SALMON).getByRole("link", { name: new RegExp(`${SALMON} is selected, 3 servings`) })).toBeVisible();
  expect((await q<any>("SELECT count(*)::int n FROM selected_meals WHERE status='active'"))[0].n).toBe(2);

  // Groceries: the list's own lines, combined across meals; Have enough takes salmon to zero.
  await jon.page.getByTestId("nav-groceries").click();
  const g = jon.page.getByTestId("groceries");
  await expect(g).toHaveAttribute("data-scope", "list");
  await expect(g).toContainText("For 2 selected meals");
  const salmon = jon.page.getByTestId("line-salmon");
  await expect(salmon).toContainText("Salmon rice bowls");
  await expect(salmon).not.toHaveAttribute("data-to-send", "0");
  await settled(jon.page);
  await salmon.getByRole("button", { name: "Have it: Salmon fillet" }).click(); // the checklist's Have it (= Have enough)
  await expect(salmon).toHaveAttribute("data-to-send", "0");
  // Rice is in both meals: one line whose sources name both.
  await expect(jon.page.getByTestId("line-rice")).toContainText(/Salmon rice bowls.*Sheet-pan chicken and rice|Sheet-pan chicken and rice.*Salmon rice bowls/);

  // The dinner calendar and its grocery list did not change.
  expect(await calendar(fx.weekId)).toEqual(before);
  for (const r of await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [fx.weekId]))
    for (const s of r.line.meal?.sources ?? []) expect(s.selectedMealId).toBeUndefined();

  // Start a new list: the old one is kept; both members now see an empty list.
  await alex.page.getByRole("button", { name: "Start a new list…" }).click();
  await alex.page.getByRole("button", { name: "Start a new list", exact: true }).click();
  await expect(alex.page.getByTestId("selected-empty")).toBeVisible();
  await jon.page.getByTestId("nav-selected").click();
  await expect(jon.page.getByTestId("selected-empty")).toBeVisible();
  expect((await q<any>("SELECT status FROM meal_lists ORDER BY opened_at"))).toEqual([{ status: "closed" }]);
  await jon.context.close();
  await alex.context.close();
});

test("CF-E2: an ingredient without an amount stays visible as Needs a quantity until answered; the list is not ready meanwhile", async ({ browser }) => {
  const fx = await seed();
  // A saved recipe that names tortillas without an amount (as an import with "Flour tortillas, for serving" saves it).
  const [r] = await q<any>("INSERT INTO recipes(household_id, created_by) VALUES ($1,$2) RETURNING id", [fx.householdId, fx.members.jon]);
  const [v] = await q<any>(
    "INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,1,'Brisket Tacos','','manual',false,$3) RETURNING id",
    [r.id, fx.householdId, fx.members.jon],
  );
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [v.id]);
  await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,'beef_brisket','beef brisket'),($1,'flour_tortillas','flour tortillas') ON CONFLICT DO NOTHING", [fx.householdId]);
  await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main','beef_brisket',0.375,'lb',0)", [v.id]);
  await q(
    "INSERT INTO recipe_unquantified_items(household_id, recipe_version_id, position, component_key, ingredient_key, name, note) VALUES ($1,$2,0,'main','flour_tortillas','flour tortillas','for serving')",
    [fx.householdId, v.id],
  );
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [r.id, v.id]);

  const jon = await member(browser, "jon", { start: `/recipes/${r.id}` });
  await expect(jon.page.getByTestId("recipe-unquantified")).toContainText("Needs a quantity");
  await jon.page.getByTestId("add-to-selected").getByRole("button", { name: "Add Brisket Tacos to Selected Meals" }).click();
  await expect(jon.page.getByTestId("add-to-selected")).toContainText("In your meals · 2 servings");
  await jon.page.getByTestId("nav-groceries").click();
  const nq = jon.page.getByTestId("nq-flour tortillas");
  await expect(nq).toContainText("for Brisket Tacos · 2 servings");
  await expect(jon.page.getByTestId("line-flour_tortillas")).toHaveAttribute("data-to-send", "");
  await expect(jon.page.getByTestId("readiness")).toContainText("flour tortillas: Needs a quantity");
  await settled(jon.page);
  await nq.getByLabel("Amount of flour tortillas for Brisket Tacos", { exact: true }).fill("8");
  await nq.getByRole("button", { name: "Set the amount of flour tortillas for Brisket Tacos" }).click();
  await expect(jon.page.getByTestId("needs-quantity")).toHaveCount(0);
  await expect(jon.page.getByTestId("buy-flour_tortillas")).toContainText("8");

  // Changing servings asks again (never rescaled), with the earlier answer shown.
  await jon.page.getByTestId("nav-selected").click();
  await settled(jon.page);
  await jon.page.getByRole("button", { name: "More servings (Servings of Brisket Tacos)" }).click();
  await expect(jon.page.getByTestId("meal-needs-quantity")).toContainText("flour tortillas");
  await jon.page.getByTestId("nav-groceries").click();
  await expect(jon.page.getByTestId("nq-flour tortillas")).toContainText("You gave 8 each for 2 servings; 3 are planned now");
  await settled(jon.page);
  await jon.page.getByRole("button", { name: "Don't buy flour tortillas for Brisket Tacos" }).click();
  await expect(jon.page.getByTestId("not-buying")).toContainText("flour tortillas for Brisket Tacos");
  await expect(jon.page.getByTestId("line-flour_tortillas")).toHaveCount(0);
  await jon.context.close();
});

test("CF-E3: phone with touch — tap + on a tile, open a recipe and come back to the same place in the gallery", async ({ browser }) => {
  await seed();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS.alex.email);
  await page.getByLabel("Password").fill(USERS.alex.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await settled(page);
  // Essential details are visible without hover on a touch screen.
  await expect(tile(page, PENNE).locator(".gallery-meta")).toContainText(/min|time unknown/);
  await tile(page, PENNE).getByRole("button", { name: `Add ${PENNE} to Selected Meals (2 servings)` }).tap();
  await expect(tile(page, PENNE).getByTestId("selected-mark")).toBeVisible();
  // No sideways scrolling at phone width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const y = await page.evaluate(() => window.scrollY);
  await tile(page, "Fixture: Turkey chili").getByRole("link", { name: "Fixture: Turkey chili", exact: true }).tap();
  await expect(page.getByTestId("recipe-title")).toHaveText("Fixture: Turkey chili");
  await page.goBack();
  await expect(tile(page, PENNE)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 120);
  await context.close();
});

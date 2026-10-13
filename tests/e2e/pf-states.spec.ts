/**
 * Photo-first catalog and recipe overview (owner-approved previews, 2026-10-13, D151; narrowed by D152 — cooking
 * happens on the recipe's own website): touch selection on the catalog, add then update the SAME selection
 * (SetSelectedMealServings, never a second copy), ingredients for the servings shown, and an overview that is only
 * photo, title, yield, servings, ingredients and the website — missing nutrition or price data never blocks saving or
 * selecting. Test data only (fixture household, synthetic values).
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

const STIRFRY = "Fixture: Tofu veggie stir-fry";
const CHILI = "Fixture: Turkey chili";
const SALMON = "Fixture: Salmon rice bowls";
const tile = (p: Page, title: string) => p.locator(`[data-testid="recipe-row"][data-title="${title}"]`);
const settled = (p: Page) => expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
const NOT_ON_OVERVIEW = ["Instructions", "Nutrition", "Ingredient cost", "Reheating", "Cooking history", "Versions"];

test("PF-1 catalog on a touch phone: photos or 'No photo yet', time and yield only, tap + selects, ✓N opens Selected", async ({ browser }) => {
  await seed();
  const { page, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, hasTouch: true, start: "/recipes" });
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible();
  // No app header above the photographs on this screen; the four filters are a tablist.
  await expect(page.getByTestId("me")).toBeHidden();
  await expect(page.getByRole("tab")).toHaveText(["All", "Favorites", "Sounds good", "Saved links"]);
  // No photo: said plainly, never an illustration. Meta is the recipe's time (and yield when recorded) — no calories or
  // cost, known or not (D152).
  await expect(tile(page, CHILI).getByTestId("photo-kind")).toHaveText("No photo yet");
  await expect(page.getByTestId("recipe-art")).toHaveCount(0);
  await expect(tile(page, CHILI).locator(".gallery-meta")).toContainText("50 min");
  for (const m of await page.locator(".gallery-meta").allTextContents()) expect(m).not.toMatch(/kcal|calories|\$/);
  // Touch: the whole tile opens the recipe (one link, its title; the photo area is part of its tap target).
  await expect(tile(page, CHILI).getByRole("link")).toHaveCount(1);
  await expect(tile(page, CHILI).getByRole("link")).toHaveAccessibleName(CHILI);
  await tile(page, CHILI).tap({ position: { x: 40, y: 60 } });
  await expect(page.getByTestId("recipe-title")).toHaveText(CHILI);
  await page.goBack();
  await expect(tile(page, SALMON)).toBeVisible();
  // Touch: tap + on a tile → the meal is selected with its servings; tapping ✓N opens Selected Meals.
  await tile(page, SALMON).getByRole("button", { name: `Add ${SALMON} to Selected Meals (2 servings)` }).tap();
  const mark = tile(page, SALMON).getByTestId("selected-mark");
  await expect(mark).toHaveAccessibleName(`${SALMON} is selected, 2 servings — open Selected Meals`);
  await expect(page.getByTestId("selection-bar")).toContainText("1 meal · 2 servings");
  const box = await mark.boundingBox();
  expect(box && box.height >= 44 && box.width >= 44).toBe(true);
  await mark.tap();
  await expect(page).toHaveURL(/\/selected$/);
  await expect(page.getByRole("list", { name: "Selected meals" })).toContainText(SALMON);
  await context.close();
});

test("PF-2 recipe overview: Add with servings, then update the same selection; ingredients follow the servings; nothing else on the page", async ({ browser }) => {
  const fx = await seed();
  const { recipeId } = fx.recipes.stirfry;
  const { page, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, start: `/recipes/${recipeId}` });
  const select = page.getByTestId("add-to-selected");
  const yieldText = await page.getByTestId("recipe-yield").textContent();
  // The overview: title, yield, servings, ingredients (and the website when the recipe has one — U2C-E1, CF-E1).
  for (const h of NOT_ON_OVERVIEW) await expect(page.getByRole("heading", { name: h, exact: true })).toHaveCount(0);
  await expect(page.getByText("Ingredients for 2")).toBeVisible();
  await expect(page.getByTestId("recipe-ingredients")).toContainText("240 g"); // tofu: 120 g a serving × 2
  await select.getByRole("button", { name: `More servings (Servings of ${STIRFRY})` }).click();
  await expect(page.getByText("Ingredients for 3")).toBeVisible();
  await select.getByRole("button", { name: `Add ${STIRFRY} to Selected Meals` }).click();
  await expect(select).toContainText("In your meals · 3 servings");
  await expect(select.getByRole("button", { name: /^Add / })).toHaveCount(0); // never a second Add
  await settled(page);
  const rows = () => q<any>("SELECT servings FROM selected_meals WHERE recipe_id=$1 AND status='active'", [recipeId]);
  expect(await rows()).toEqual([{ servings: 3 }]);
  await expect(page.getByTestId("recipe-ingredients")).toContainText("360 g");
  // Update: the same meal's servings change (SetSelectedMealServings) — still one row.
  await select.getByRole("button", { name: `More servings (Servings of ${STIRFRY})` }).click();
  await expect(select).toContainText("In your meals · 4 servings");
  await settled(page);
  expect(await rows()).toEqual([{ servings: 4 }]);
  await expect(page.getByText("Ingredients for 4")).toBeVisible();
  await expect(page.getByTestId("recipe-ingredients")).toContainText("480 g");
  // The original yield is the recipe's own; it never changes with the servings chosen.
  await expect(page.getByTestId("recipe-yield")).toHaveText(yieldText!);
  // Removal stays on Selected.
  await expect(select.getByRole("button", { name: /Remove/ })).toHaveCount(0);
  await context.close();
});

test("PF-3 missing nutrition and prices never block: the overview shows none of it and the meal is still selected", async ({ browser }) => {
  const fx = await seed();
  const h = fx.householdId;
  const { recipeId } = fx.recipes.stirfry;
  // Nothing known about this recipe's nutrition or prices (existing metadata elsewhere is left as it is).
  await q("DELETE FROM ingredient_nutrition WHERE household_id=$1 AND ingredient_key IN ('tofu','soy_sauce','rice','broccoli')", [h]);
  await q("DELETE FROM product_mappings WHERE household_id=$1 AND ingredient_key IN ('tofu','soy_sauce','rice','broccoli')", [h]);
  const { page, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, start: `/recipes/${recipeId}` });
  await expect(page.getByTestId("recipe-title")).toHaveText(STIRFRY);
  for (const h of NOT_ON_OVERVIEW) await expect(page.getByRole("heading", { name: h, exact: true })).toHaveCount(0);
  await expect(page.getByTestId("recipe-nutrition")).toHaveCount(0);
  await expect(page.getByTestId("recipe-cost")).toHaveCount(0);
  await expect(page.getByTestId("recipe-ingredients")).toContainText("240 g");
  const select = page.getByTestId("add-to-selected");
  await select.getByRole("button", { name: `Add ${STIRFRY} to Selected Meals` }).click();
  await expect(select).toContainText("In your meals · 2 servings");
  await settled(page);
  expect(await q<any>("SELECT servings FROM selected_meals WHERE recipe_id=$1 AND status='active'", [recipeId])).toEqual([{ servings: 2 }]);
  // The stored recipe is untouched by the narrower page: its instructions are still recorded (D152 deletes nothing).
  const v = await q<any>("SELECT instructions FROM recipe_versions rv JOIN recipes r ON r.current_version_id=rv.id WHERE r.id=$1", [recipeId]);
  expect(String(v[0].instructions).length).toBeGreaterThan(0);
  await context.close();
});

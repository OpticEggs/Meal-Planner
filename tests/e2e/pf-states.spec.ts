/**
 * Photo-first catalog and recipe (owner-approved previews, 2026-10-13; D151): the presentation over the existing
 * services, in the states the owner named — touch selection on the catalog, add then update the SAME selection
 * (SetSelectedMealServings, never a second copy), per-nutrient completeness (complete / "accounted for — incomplete"
 * with the missing ingredient / not available), an incomplete cost estimate, ingredients for the servings shown, and
 * cooking time and instructions that never change with servings. Test data only (fixture household, synthetic values).
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

const STIRFRY = "Fixture: Tofu veggie stir-fry";
const CHILI = "Fixture: Turkey chili";
const SALMON = "Fixture: Salmon rice bowls";
const tile = (p: Page, title: string) => p.locator(`[data-testid="recipe-row"][data-title="${title}"]`);
const settled = (p: Page) => expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");

test("PF-1 catalog on a touch phone: photos or 'No photo yet', honest meta, tap + selects, ✓N opens Selected", async ({ browser }) => {
  await seed();
  const { page, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, hasTouch: true, start: "/recipes" });
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible();
  // No app header above the photographs on this screen; the four filters are a tablist.
  await expect(page.getByTestId("me")).toBeHidden();
  await expect(page.getByRole("tab")).toHaveText(["All", "Favorites", "Sounds good", "Saved links"]);
  // No photo: said plainly, never an illustration. Unknown calories are said, never zero.
  await expect(tile(page, CHILI).getByTestId("photo-kind")).toHaveText("No photo yet");
  await expect(page.getByTestId("recipe-art")).toHaveCount(0);
  await expect(tile(page, CHILI).locator(".gallery-meta")).toContainText("50 min");
  await expect(tile(page, CHILI).locator(".gallery-meta")).toContainText("calories not known yet");
  await expect(tile(page, STIRFRY).locator(".gallery-meta")).toContainText(/est\. \$\d+\.\d\d\/serving/);
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

test("PF-2 recipe: Add with servings, then update the same selection; ingredients follow the servings, time and instructions do not", async ({ browser }) => {
  const fx = await seed();
  const { recipeId } = fx.recipes.stirfry;
  const { page, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, start: `/recipes/${recipeId}` });
  const select = page.getByTestId("add-to-selected");
  const facts = await page.getByTestId("recipe-make-stats").textContent();
  const steps = await page.getByRole("heading", { name: "Instructions" }).locator("xpath=..").textContent();
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
  // The recipe's own time and instructions are never rewritten for servings.
  await expect(page.getByTestId("recipe-make-stats")).toHaveText(facts!);
  await expect(page.getByRole("heading", { name: "Instructions" }).locator("xpath=..")).toHaveText(steps!);
  // Removal stays on Selected.
  await expect(select.getByRole("button", { name: /Remove/ })).toHaveCount(0);
  await context.close();
});

test("PF-3 nutrition per nutrient and the cost estimate: complete, incomplete with the missing ingredient, not available", async ({ browser }) => {
  const fx = await seed();
  const h = fx.householdId;
  const { recipeId } = fx.recipes.stirfry;
  // Complete: the one ingredient without values gets a row (synthetic test values, as all fixture nutrition).
  await q(`INSERT INTO ingredient_nutrition(household_id, ingredient_key, basis_qty, basis_unit, calories, protein_g, carbs_g, fat_g, source, synthetic)
           VALUES ($1,'soy_sauce',1,'tbsp',10,1.3,0.8,0,'fixture',true)`, [h]);
  const { page, context } = await member(browser, "jon", { viewport: { width: 390, height: 844 }, start: `/recipes/${recipeId}` });
  const nut = page.getByTestId("recipe-nutrition");
  const n = (k: string) => nut.getByTestId(`nutrient-${k}`);
  for (const k of ["calories", "proteinG", "carbsG", "fatG"]) await expect(n(k)).toHaveAttribute("data-state", "complete");
  await expect(n("calories")).toContainText("491"); // 172.8 + 10 + 273.75 + 34 kcal for one serving
  await expect(n("proteinG")).toContainText("30 g");
  await expect(nut.getByTestId("nutrition-missing")).toHaveCount(0);
  await expect(nut.getByTestId("per-serving-basis")).toContainText("Calculated from the nutrition values recorded for each ingredient");
  await expect(nut.getByTestId("per-serving-basis")).toContainText("synthetic test values");
  await expect(nut).not.toContainText(/confirmed/i); // no confirmation claimed: none is recorded for these rows
  const cost = page.getByTestId("recipe-cost");
  await expect(cost).toContainText(/\$\d+\.\d\d a serving/);
  await expect(cost).not.toContainText("incomplete");
  await expect(cost).toContainText("not a checkout total");

  // Incomplete calories only: one ingredient has no calorie value; the others stay complete.
  await q("UPDATE ingredient_nutrition SET calories=NULL WHERE household_id=$1 AND ingredient_key='broccoli'", [h]);
  // Incomplete cost: one ingredient has no recorded product price.
  await q("DELETE FROM product_mappings WHERE household_id=$1 AND ingredient_key='broccoli'", [h]);
  await page.reload();
  await expect(n("calories")).toHaveAttribute("data-state", "incomplete");
  await expect(n("calories")).toHaveText(/Calories\s*457 kcal accounted for — incomplete/);
  await expect(n("proteinG")).toHaveAttribute("data-state", "complete");
  await expect(nut.getByTestId("nutrition-missing")).toContainText(/calories value is recorded for broccoli/i);
  await expect(cost).toContainText("accounted for — incomplete");
  await expect(cost.getByTestId("cost-missing")).toContainText(/No recorded price for broccoli/i);
  await expect(cost).not.toContainText("$0.00");

  // Nothing known: every nutrient says so, never 0.
  await q("DELETE FROM ingredient_nutrition WHERE household_id=$1 AND ingredient_key IN ('tofu','soy_sauce','rice','broccoli')", [h]);
  await page.reload();
  for (const k of ["calories", "proteinG", "carbsG", "fatG"]) {
    await expect(n(k)).toHaveAttribute("data-state", "none");
    await expect(n(k)).toContainText("Not available");
  }
  await expect(nut).not.toContainText(/\b0 kcal/);
  await context.close();
});

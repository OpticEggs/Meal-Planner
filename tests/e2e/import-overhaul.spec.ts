/**
 * Import overhaul in the browser (2026-10-09), main test server (no content permission: the page's own
 * photo is not kept). The reported line `1/3 cup pesto (homemade (or store-bought))` reads as ⅓ cup pesto
 * with its note; clean lines are already in; only the range and the no-amount line open for a check, with
 * the source line shown; salt and pepper are left out. Saving gives a recipe page with the illustrated
 * fallback, then the member adds their own photo (shown with "Photo by Jon") and removes it again.
 */
import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { leaveOutLine, member, q, seed, useLine, openAddRecipe } from "./helpers";

const PESTO = "https://pesto.example.com/weeknight-pesto-pasta/";
const PHOTO = fileURLToPath(new URL("../fixtures/import-site/pesto-hero.jpg", import.meta.url));

test("IO-E1: the reported line reads cleanly; only uncertain lines ask; seasonings left out; own photo added and removed", async ({ browser }) => {
  await seed();
  const { context, page: p } = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  await p.getByRole("link", { name: "Recipes", exact: true }).click();
  await openAddRecipe(p);
  await p.getByRole("textbox", { name: "Add a recipe from a link" }).fill(PESTO);
  await p.getByTestId("add-from-link-submit").click();
  const review = p.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();

  const pesto = review.locator('[data-testid="draft-line"][data-raw="1/3 cup pesto (homemade (or store-bought))"]');
  await expect(pesto).toHaveAttribute("data-state", "use");
  await expect(pesto.locator(".row-main")).toContainText("⅓ cup pesto");
  await expect(pesto.locator(".row-main")).toContainText("homemade (or store-bought)");
  // The source line is kept with the row and shown when it is opened.
  await pesto.locator(".row-main").click();
  await expect(pesto.getByRole("textbox", { name: "Ingredient name, line 2" })).toHaveValue("pesto");
  await expect(pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" })).toHaveValue("1/3");
  await expect(pesto).toContainText("From the recipe 1/3 cup pesto (homemade (or store-bought))");
  await pesto.locator(".row-main").click();

  for (const raw of ["1 tsp kosher salt", "½ tsp freshly ground black pepper"]) {
    const row = review.locator(`[data-testid="draft-line"][data-raw="${raw}"]`);
    await expect(row).toHaveAttribute("data-state", "out");
    await expect(row).toContainText("Household seasoning");
  }
  await expect(review.locator('[data-testid="draft-line"][data-raw="1 red bell pepper, sliced"]')).toHaveAttribute("data-state", "use");

  // Only the uncertain line is open, at the top, with what the recipe said. CF Q6 (2026-10-11): the line with no
  // amount at all (basil) is kept as "Needs a quantity" instead of waiting — no amount is invented (was: 2 open lines).
  const check = review.getByTestId("draft-check");
  await expect(check.getByTestId("draft-line")).toHaveCount(1);
  await expect(check).toContainText("The recipe says 2–3");
  await expect(check).toContainText("From the recipe 2-3 cloves garlic, minced");
  const basil = review.getByTestId("draft-lines").locator('[data-testid="draft-line"][data-raw="fresh basil, for serving"]');
  await expect(basil).toHaveAttribute("data-state", "needs_quantity");
  await expect(basil).toContainText("Needs a quantity — you'll give an amount when shopping");
  await expect(review.getByTestId("draft-progress")).toContainText("1 needs a quantity");
  await expect(review.getByTestId("import-confirm")).toBeDisabled();
  await expect(review.getByTestId("draft-problems")).toContainText("1 ingredient line needs a quick check");
  await expect(review.getByText(/suggestion/i)).toHaveCount(0);

  await useLine(review, "2-3 cloves garlic, minced", "3");
  await leaveOutLine(review, "fresh basil, for serving");
  await expect(review.getByTestId("draft-check")).toHaveCount(0);
  await expect(review.getByTestId("draft-progress")).toContainText("9 ready");
  await expect(review.getByTestId("draft-progress")).toContainText("3 left out");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();

  const [v] = await q<any>("SELECT recipe_id, image_id, source_url FROM recipe_versions WHERE title='Weeknight Pesto Pasta'");
  expect(v.image_id).toBeNull(); // no permission recorded for the publisher's photo
  expect(v.source_url).toBe(PESTO);
  const keys = (await q<any>("SELECT ingredient_key FROM recipe_ingredients ri JOIN recipe_versions rv ON rv.id=ri.recipe_version_id WHERE rv.title='Weeknight Pesto Pasta'")).map((r) => r.ingredient_key);
  expect(keys.some((k: string) => /salt|black_pepper/.test(k))).toBe(false);

  await p.getByRole("tab", { name: "All" }).click();
  await p.locator('[data-testid="recipe-row"][data-title="Weeknight Pesto Pasta"]').getByRole("link").click();
  await expect(p.getByTestId("recipe-title")).toHaveText("Weeknight Pesto Pasta");
  await expect(p.getByTestId("recipe-hero").getByTestId("hero-no-photo")).toHaveText("No photo yet"); // D151: never an illustration
  // Amounts for the servings shown (the reviewed 4 by default): ⅓ cup ÷ 4 × 4, exact, as a kitchen fraction.
  await expect(p.getByText("Ingredients for 4")).toBeVisible();
  await expect(p.getByTestId("recipe-ingredients")).toContainText("⅓ cup");
  await expect(p.getByRole("link", { name: /Open recipe website — Garden Table Kitchen/ })).toHaveAttribute("href", PESTO);

  // The member's own photo: no publisher permission needed; credited to the member; removable.
  await p.getByTestId("photo-input").setInputFiles(PHOTO);
  await expect(p.getByTestId("recipe-hero").getByTestId("recipe-photo")).toBeVisible();
  await expect(p.getByTestId("photo-credit")).toHaveText("Photo by Jon");
  const [img] = await q<any>("SELECT content_type, permission FROM recipe_images");
  expect(img).toEqual({ content_type: "image/jpeg", permission: "member-provided photo (added by Jon)" });
  await p.getByTestId("recipe-more").click();
  await p.getByTestId("recipe-actions").getByRole("button", { name: "Remove photo" }).click();
  await expect(p.getByTestId("recipe-hero").getByTestId("hero-no-photo")).toBeVisible();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await context.close();
});

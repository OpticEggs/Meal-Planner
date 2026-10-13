/**
 * Catalog-first §4 in the browser: the three reference recipes through the current UI (Our Recipes → Add a recipe
 * from a link), served by the offline fixture manifest under the real host names (synthetic pages; nothing reaches
 * the network). Outcomes are checked in the database.
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed, openAddRecipe } from "./helpers";

const BB = "https://www.budgetbytes.com/one-pot-chicken-and-rice/";
const PW = "https://www.thepioneerwoman.com/food-cooking/recipes/a42389030/brisket-tacos-recipe/";
const KTML = "https://keytomylime.com/garlic-chicken-pasta-recipe/";
const TOPPINGS = ["Flour tortillas, for serving", "Fresh cilantro, for serving", "Lime wedges, for serving", "Crumbled cotija, for serving"];

async function addLink(page: Page, url: string) {
  await page.getByTestId("nav-recipes").click();
  await openAddRecipe(page);
  await page.getByRole("textbox", { name: "Add a recipe from a link" }).fill(url);
  await page.getByTestId("add-from-link-submit").click();
}
async function openRecipe(page: Page, title: string) {
  await page.getByRole("tab", { name: "All" }).click();
  await page.locator(`[data-testid="recipe-row"][data-title="${title}"]`).getByRole("link").click();
  await expect(page.getByTestId("recipe-title")).toHaveText(title);
}
const line = (review: any, raw: string) => review.locator(`[data-testid="draft-line"][data-raw="${raw}"]`);

test("CF-A-E: Budget Bytes — refused before reading, says why, paste (4 servings) makes a recipe with its source link, no photo, method on the source", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  await addLink(page, BB);
  const dialog = page.getByRole("dialog", { name: "Import ingredients" });
  await expect(dialog.getByTestId("import-not-read")).toContainText("Budget Bytes asks for permission before its recipes are reused elsewhere, so Table doesn't read its pages. Paste or type the ingredients you use");
  await expect(dialog.getByRole("button", { name: /Read ingredients from the page|Try reading/ })).toHaveCount(0);
  await expect(dialog.getByLabel("Recipe name")).toHaveValue("One pot chicken and rice");
  await expect(dialog.getByLabel("Recipe name")).toBeFocused();
  await dialog.getByLabel("Ingredients, one per line").fill("1 lb boneless skinless chicken thighs\n1 cup long grain white rice\n2 cups chicken broth\n1 yellow onion, diced\nsalt to taste");
  await dialog.getByTestId("import-paste-start").click();
  const review = page.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  await review.getByTestId("draft-servings").fill("4");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const [v] = await q<any>("SELECT source_url, image_id, instructions FROM recipe_versions WHERE title='One pot chicken and rice'");
  expect(v).toEqual({ source_url: BB, image_id: null, instructions: "" });
  expect(await q("SELECT 1 FROM recipe_import_drafts WHERE method <> 'user_pasted'")).toEqual([]); // the page was never read
  await openRecipe(page, "One pot chicken and rice");
  await expect(page.getByRole("link", { name: /Open original — Budget Bytes/ })).toHaveAttribute("href", BB);
  await expect(page.getByTestId("method-link").getByRole("link", { name: /Open the method/ })).toHaveAttribute("href", BB);
  await expect(page.getByTestId("recipe-hero").getByTestId("hero-no-photo")).toHaveText("No photo yet"); // no photo, no illustration
  await expect(page.getByRole("button", { name: "Add a photo" })).toBeVisible();
  await context.close();
});

test("CF-B-E1: Brisket tacos from the page — onions distinct, toppings Need a quantity (no amount), 8½ hours kept", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  await addLink(page, PW);
  const review = page.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  await expect(review.getByLabel("Time (minutes)")).toHaveValue("510");
  await expect(review.getByTestId("draft-servings")).toHaveValue("8");
  await expect(line(review, "1 red onion, thinly sliced").locator(".row-main")).toContainText("1 red onion");
  await expect(line(review, "1/2 yellow onion, diced").locator(".row-main")).toContainText("½ yellow onion");
  for (const raw of TOPPINGS) {
    await expect(line(review, raw)).toHaveAttribute("data-state", "needs_quantity");
    await expect(line(review, raw)).toContainText("Needs a quantity — you'll give an amount when shopping");
  }
  await expect(review.getByTestId("draft-progress")).toContainText("4 need a quantity");
  await expect(review.getByTestId("draft-check")).toHaveCount(0);
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const [v] = await q<any>("SELECT id, effort_minutes FROM recipe_versions WHERE title='Brisket Tacos'");
  expect(v.effort_minutes).toBe(510);
  const keys = (await q<any>("SELECT ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1", [v.id])).map((r) => r.ingredient_key);
  expect(keys).toEqual(expect.arrayContaining(["red_onion", "yellow_onion"]));
  expect(keys.filter((k: string) => /tortilla|cilantro|lime|cotija/.test(k))).toEqual([]);
  expect((await q<any>("SELECT name FROM recipe_unquantified_items WHERE recipe_version_id=$1 ORDER BY position", [v.id])).map((r) => r.name))
    .toEqual(["Flour tortillas", "Fresh cilantro", "Lime wedges", "Crumbled cotija"]);
  await openRecipe(page, "Brisket Tacos");
  const items = page.getByTestId("recipe-unquantified");
  await expect(items).toHaveCount(4);
  await expect(items.first()).toContainText("Flour tortillas, for serving");
  await expect(items.first()).toContainText("Needs a quantity (asked when shopping)");
  await expect(page.getByTestId("recipe-make-stats")).toContainText("8 h 30 min"); // 510 min, as the recipe states it
  await context.close();
});

test("CF-B-E2: the same recipe pasted with group headings → three groups; a heading can be turned into an ingredient and back", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  await addLink(page, PW);
  const review = page.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  // Throw the page reading away (asked first) and paste the lines with their groups.
  await review.getByRole("button", { name: "Discard import" }).click();
  await review.getByTestId("discard-import-confirm").getByRole("button", { name: "Discard import" }).click();
  const start = page.getByRole("dialog", { name: "Import ingredients" });
  await expect(start.getByLabel("Ingredients, one per line")).toBeVisible();
  await start.getByLabel("Recipe name").fill("Brisket Tacos");
  await start.getByLabel("Ingredients, one per line").fill([
    "For the brisket:", "3 lb beef brisket, trimmed", "1 tablespoon chili powder", "1 cup beef broth", "1/2 yellow onion, diced",
    "For the pickled onions:", "1 red onion, thinly sliced", "1/2 cup apple cider vinegar", "1 tablespoon sugar",
    "Toppings:", ...TOPPINGS,
  ].join("\n"));
  await start.getByTestId("import-paste-start").click();
  await expect(review.getByTestId("import-review")).toBeVisible();
  await expect(review.getByTestId("draft-heading")).toHaveCount(3);
  await expect(review.getByTestId("draft-heading")).toHaveText([/Brisket/, /Pickled onions/, /Toppings/]);
  // "This is an ingredient" makes the heading a line to decide (focus follows it); "Group heading" puts it back.
  await review.getByRole("button", { name: "This is an ingredient, not a group heading: Toppings:" }).click();
  const toppings = line(review, "Toppings:");
  await expect(review.getByTestId("draft-check").locator('[data-raw="Toppings:"]')).toBeVisible();
  await expect(toppings.locator(".row-main")).toBeFocused();
  await toppings.getByRole("button", { name: /^Group heading/ }).click();
  await expect(review.getByTestId("draft-heading")).toHaveCount(3);
  await review.getByTestId("draft-servings").fill("8");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const [v] = await q<any>("SELECT id FROM recipe_versions WHERE title='Brisket Tacos'");
  expect(await q("SELECT key, name FROM recipe_components WHERE recipe_version_id=$1 ORDER BY sort", [v.id])).toEqual([
    { key: "brisket", name: "Brisket" }, { key: "pickled_onions", name: "Pickled onions" }, { key: "toppings", name: "Toppings" },
  ]);
  await openRecipe(page, "Brisket Tacos");
  const groups = page.getByTestId("recipe-ingredients").locator(":scope > li");
  await expect(groups).toHaveCount(3);
  await expect(groups.nth(0)).toContainText("Brisket");
  await expect(groups.nth(1)).toContainText("Pickled onions");
  await expect(groups.nth(1)).toContainText("red onion");
  await expect(groups.nth(2)).toContainText("Toppings");
  await expect(groups.nth(2).getByTestId("recipe-unquantified")).toHaveCount(4);
  // The editor shows them read-only, and an edit keeps them.
  await page.getByRole("button", { name: "Edit recipe" }).click();
  const editor = page.getByRole("dialog", { name: /^Edit Brisket Tacos/ });
  await expect(editor.getByTestId("editor-unquantified")).toContainText("Needs a quantity when shopping: Flour tortillas (Toppings), Fresh cilantro (Toppings)");
  await expect(editor.getByRole("button", { name: /^Remove component 3 \(Toppings\)/ })).toBeDisabled();
  await editor.getByLabel("Title", { exact: true }).fill("Brisket Tacos (ours)");
  await editor.getByRole("button", { name: "Save new version" }).click();
  await expect(editor).toHaveCount(0);
  const [v2] = await q<any>("SELECT id FROM recipe_versions WHERE title='Brisket Tacos (ours)'");
  expect((await q<any>("SELECT component_key, name FROM recipe_unquantified_items WHERE recipe_version_id=$1 ORDER BY position", [v2.id])).map((r) => `${r.component_key}:${r.name}`))
    .toEqual(["toppings:Flour tortillas", "toppings:Fresh cilantro", "toppings:Lime wedges", "toppings:Crumbled cotija"]);
  await context.close();
});

test("CF-C-E: Garlic chicken pasta — every stated yield shown, servings required, the page's nutrition never used", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  await addLink(page, KTML);
  const review = page.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  await expect(review.getByTestId("draft-kept")).toContainText("The page says it makes: 4 · 6 servings.");
  await expect(review.getByTestId("draft-kept")).toContainText("The page's nutrition claims are not used.");
  await expect(review.getByTestId("draft-servings")).toHaveValue("");
  await expect(review.getByTestId("import-confirm")).toBeDisabled();
  await expect(review.getByTestId("draft-problems")).toContainText("Enter how many servings the ingredient amounts make.");
  await expect(review.getByTestId("draft-line").filter({ hasText: "garlic" })).toHaveCount(2); // both lines kept as rows
  await review.getByTestId("draft-servings").fill("4");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  await openRecipe(page, "Garlic Chicken Pasta");
  await expect(page.getByTestId("recipe-detail")).not.toContainText("777");
  await expect(page.getByTestId("recipe-detail")).not.toContainText("1 cup serving");
  const [v] = await q<any>("SELECT id FROM recipe_versions WHERE title='Garlic Chicken Pasta'");
  const garlic = await q<any>("SELECT quantity::text AS q FROM recipe_ingredients WHERE recipe_version_id=$1 AND ingredient_key='garlic_clove' ORDER BY sort", [v.id]);
  expect(garlic).toEqual([{ q: "1" }, { q: "0.75" }]); // 4 and 3 cloves ÷ 4 servings, two rows that add up in groceries
  await context.close();
});

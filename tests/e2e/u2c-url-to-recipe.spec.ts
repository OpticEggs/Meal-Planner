/**
 * URL-to-recipe in the browser (primary path): paste a recipe's link → the review opens with what
 * was read and from where → accept the suggestions after checking them → the recipe shows its
 * source and links to the method. Pages come only from local synthetic fixtures
 * (TABLE_RECIPE_FETCH_FIXTURES); nothing is fetched from the internet. The content policy is the
 * default (nothing of a page's own method or photo is kept).
 */
import { expect, test } from "@playwright/test";
import { member, q, seed } from "./helpers";

const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;

test("U2C-E1: paste a link on Our Recipes → review with source and suggestions → recipe with attribution and a link to the method", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Our Recipes" }).click();
  await p.getByRole("textbox", { name: "Add a recipe from a link" }).fill("https://wprm.example.com/skillet-taco-rice/?utm_source=feed");
  await p.getByTestId("add-from-link-submit").click();
  const review = p.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  await expect(review.getByTestId("draft-source")).toContainText("Read from Example Kitchen · by Sam Example");
  await expect(review.getByTestId("draft-kept")).toContainText("The method stays on the source site. The recipe links to it (3 steps).");
  await expect(review.getByTestId("draft-kept")).toContainText("Its photo isn't kept");
  await expect(review.getByTestId("draft-servings")).toHaveValue("4");
  await expect(review.getByTestId("import-confirm")).toBeDisabled();
  const beans = review.locator('[data-testid="draft-line"][data-raw="1 (15 oz) can black beans, drained"]');
  await expect(beans.getByTestId("line-suggestion")).toContainText("15 oz black beans");
  await expect(review.getByTestId("draft-suggestions")).toContainText("4 lines have a suggestion");
  expect(await count("recipe_versions WHERE provenance='imported'")).toBe(0); // nothing applied, nothing created
  await review.getByTestId("accept-suggestions").click();
  await expect(review.getByTestId("draft-problems")).toHaveCount(0);
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  await p.getByRole("tab", { name: "All" }).click();
  await p.locator('[data-testid="recipe-row"][data-title="Skillet Taco Rice"]').getByRole("link", { name: "Skillet Taco Rice" }).click();
  await expect(p.getByTestId("recipe-source")).toContainText("From Example Kitchen · by Sam Example");
  await expect(p.getByRole("link", { name: /Open the original recipe on Example Kitchen/ })).toHaveAttribute("href", "https://wprm.example.com/skillet-taco-rice/");
  await expect(p.getByTestId("method-link")).toContainText("The method is on the original page.");
  const v = (await q<any>("SELECT source_url, source_author, source_site_name, image_id, instructions FROM recipe_versions WHERE title='Skillet Taco Rice'"))[0];
  expect(v).toEqual({ source_url: "https://wprm.example.com/skillet-taco-rice/", source_author: "Sam Example", source_site_name: "Example Kitchen", image_id: null, instructions: "" });
  await jon.context.close();
});

test("U2C-E2: a page that can't be read says why, keeps the link, and offers paste with a starting name", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Our Recipes" }).click();
  await p.getByRole("textbox", { name: "Add a recipe from a link" }).fill("https://gone.example.com/recipe");
  await p.getByTestId("add-from-link-submit").click();
  const dialog = p.getByRole("dialog", { name: "Import ingredients" });
  await expect(dialog.getByTestId("import-not-read")).toContainText("doesn't exist");
  await expect(dialog.getByLabel("Recipe name")).toHaveValue("Recipe");
  await expect(dialog.getByLabel("Ingredients, one per line")).toBeVisible();
  expect(await count("recipe_bookmarks")).toBe(1);
  // An invalid link is an error on the field; nothing is saved.
  await p.keyboard.press("Escape");
  await p.getByRole("textbox", { name: "Add a recipe from a link" }).fill("http://127.0.0.1/x");
  await p.getByTestId("add-from-link-submit").click();
  await expect(p.getByRole("textbox", { name: "Add a recipe from a link" })).toHaveAttribute("aria-invalid", "true");
  expect(await count("recipe_bookmarks")).toBe(1);
  await jon.context.close();
});

test("U2C-E3: Budget Bytes lane — search opens Budget Bytes; a pasted link is saved, never read, and paste starts with a name from the link", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Explore" }).click();
  await p.getByTestId("explore-source").selectOption("budget_bytes");
  const lane = p.getByTestId("budget-bytes-lane");
  await expect(lane.getByRole("searchbox", { name: /Search Budget Bytes/ })).toBeVisible();
  await lane.getByRole("textbox", { name: "Add a recipe from a link" }).fill("https://www.budgetbytes.com/easy-synthetic-skillet-beans/");
  await lane.getByTestId("add-from-link-submit").click();
  const dialog = p.getByRole("dialog", { name: "Import ingredients" });
  await expect(dialog.getByTestId("import-not-read")).toContainText("Budget Bytes asks for permission");
  await expect(dialog.getByLabel("Recipe name")).toHaveValue("Easy synthetic skillet beans");
  await dialog.getByLabel("Ingredients, one per line").fill("1 cup rice\n1 (15 oz) can black beans");
  await dialog.getByTestId("import-paste-start").click();
  await expect(p.getByRole("dialog", { name: "Review the import" }).getByTestId("draft-source")).toContainText("From the lines you pasted");
  await jon.context.close();
});

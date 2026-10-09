/**
 * Multi-source handoff in the browser: saved links, reviewed import, the Budget Bytes lane
 * (URL-01/02/12, BB-01/02, E2E-03 parts). Two signed-in members; pages are read only from local
 * synthetic fixtures (TABLE_RECIPE_FETCH_FIXTURES) — nothing is fetched from the internet.
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;

async function savedLinksTab(p: Page) {
  await p.getByRole("link", { name: "Our Recipes" }).click();
  await p.getByRole("tab", { name: "Saved links" }).click();
}

test("URL-01/02: a link saved by Jon appears once for Alex, attributed, with a working source link; nothing else changes", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  await savedLinksTab(alex.page);
  await expect(alex.page.getByTestId("saved-links-empty")).toBeVisible();
  const versions = await count("recipe_versions");
  await savedLinksTab(jon.page);
  await jon.page.getByRole("textbox", { name: "Recipe link", exact: true }).fill("https://www.recipes.example.com/chili?utm_source=newsletter");
  await jon.page.getByRole("textbox", { name: "Note (optional)" }).fill("Friday?");
  await jon.page.getByRole("button", { name: "Save link" }).click();
  await expect(jon.page.getByTestId("announcer")).toHaveText("Link saved for both of you.");
  const card = alex.page.getByTestId("saved-link");
  await expect(card).toHaveCount(1); // delivered live
  await expect(card).toContainText("Saved by Jon");
  await expect(card).toContainText("Jon: Friday?");
  await expect(card.getByTestId("link-state")).toHaveText("Saved link — not imported");
  await expect(card.getByRole("link", { name: /Open source/ })).toHaveAttribute("href", "https://www.recipes.example.com/chili");
  // Alex saves a tracking variant: still one link, both notes
  await alex.page.getByRole("textbox", { name: "Recipe link", exact: true }).fill("http://recipes.example.com/chili/#top");
  await alex.page.getByRole("textbox", { name: "Note (optional)" }).fill("Yes");
  await alex.page.getByRole("button", { name: "Save link" }).click();
  await expect(alex.page.getByTestId("announcer")).toHaveText("That link was already saved; your note was added.");
  await expect(jon.page.getByTestId("saved-link")).toHaveCount(1);
  await expect(jon.page.getByTestId("saved-link")).toContainText("Saved by Jon and Alex");
  expect(await count("recipe_versions")).toBe(versions);
  // a refused link: the error is attached to the field and focused; nothing saved
  await jon.page.getByRole("textbox", { name: "Recipe link", exact: true }).fill("javascript:alert(1)");
  await jon.page.getByRole("button", { name: "Save link" }).click();
  await expect(jon.page.getByRole("textbox", { name: "Recipe link", exact: true })).toBeFocused();
  await expect(jon.page.getByRole("textbox", { name: "Recipe link", exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(await count("recipe_bookmarks")).toBe(1);
  await jon.context.close();
  await alex.context.close();
});

test("URL-12: Jon reads a recipe page, decides the unclear lines, and only then creates the recipe; the source stays linked", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await savedLinksTab(p);
  await p.getByRole("textbox", { name: "Recipe link", exact: true }).fill("https://recipes.example.com/chili");
  await p.getByRole("button", { name: "Save link" }).click();
  await p.getByRole("button", { name: /^Import ingredients: / }).click();
  const dialog = p.getByRole("dialog", { name: "Import ingredients" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Read ingredients from the page" })).toBeFocused();
  await dialog.getByRole("button", { name: "Read ingredients from the page" }).click();
  const review = p.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  await expect(review).toContainText("The method stays on the source site.");
  await expect(review.getByTestId("draft-servings")).toHaveValue("4");
  // 2026-10-09 (import overhaul): the can is read as its stated size and salt is a household seasoning, so every line
  // is settled on arrival (was: two lines undecided, decided here by hand).
  const tomatoes = review.locator('[data-testid="draft-line"][data-raw="1 (15 oz) can diced tomatoes"]');
  await expect(tomatoes).toContainText("15 oz diced tomatoes");
  await expect(review.locator('[data-testid="draft-line"][data-raw="salt to taste"]')).toHaveAttribute("data-state", "out");
  await expect(review.getByTestId("draft-problems")).toHaveCount(0);
  await expect(review.getByTestId("import-confirm")).toBeEnabled();
  expect(await count("recipe_versions WHERE provenance='imported'")).toBe(0);
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  await p.getByRole("tab", { name: "All" }).click();
  const row = p.locator('[data-testid="recipe-row"][data-title="Weeknight Bean Chili"]');
  await expect(row).toContainText("imported");
  const v = (await q<any>("SELECT source_url, provenance FROM recipe_versions WHERE title='Weeknight Bean Chili'"))[0];
  expect(v).toEqual({ source_url: "https://recipes.example.com/chili", provenance: "imported" });
  await jon.context.close();
});

test("BB-01/02: the Budget Bytes lane links to the official index, lists only what you saved, and never reads the page", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  for (const m of [jon, alex]) {
    await m.page.getByRole("link", { name: "Explore" }).click();
    await m.page.getByTestId("explore-source").selectOption("budget_bytes");
  }
  const lane = jon.page.getByTestId("budget-bytes-lane");
  await expect(lane.getByRole("link", { name: /Browse Budget Bytes/ })).toHaveAttribute("href", "https://www.budgetbytes.com/index/");
  await expect(jon.page.getByTestId("saved-links-empty")).toContainText("No Budget Bytes links saved yet");
  await expect(jon.page.getByTestId("recipe-card")).toHaveCount(0); // no catalog, no invented recipes
  await lane.getByRole("textbox", { name: /Recipe link/ }).fill("https://www.budgetbytes.com/some-synthetic-recipe/");
  await lane.getByRole("button", { name: "Save link" }).click();
  const card = alex.page.getByTestId("saved-link");
  await expect(card).toHaveCount(1);
  await expect(card.getByTestId("link-source")).toHaveText("Budget Bytes");
  await expect(card.getByRole("link", { name: /Open source/ })).toHaveAttribute("href", "https://www.budgetbytes.com/some-synthetic-recipe/");
  await card.getByRole("button", { name: /^Import ingredients/ }).click();
  const dialog = alex.page.getByRole("dialog", { name: "Import ingredients" });
  await dialog.getByRole("button", { name: "Read ingredients from the page" }).click();
  await expect(dialog.getByTestId("import-not-read")).toContainText("Budget Bytes asks for permission");
  await expect(dialog.getByRole("button", { name: "Read ingredients from the page" })).toHaveCount(0);
  await expect(dialog.getByLabel("Ingredients, one per line")).toBeVisible(); // paste stays available
  await alex.page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await jon.context.close();
  await alex.context.close();
});

test("E2E-03: Saved links and the import dialog fit 320 px at 200% text with no horizontal scroll", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon", { viewport: { width: 320, height: 640 } });
  const p = jon.page;
  await p.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await savedLinksTab(p);
  await p.getByRole("textbox", { name: "Recipe link", exact: true }).fill("https://recipes.example.com/chili-with-an-unusually-long-address-that-must-wrap-somewhere-on-a-phone");
  await p.getByRole("button", { name: "Save link" }).click();
  await expect(p.getByTestId("saved-link")).toHaveCount(1);
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await p.getByRole("button", { name: /^Import ingredients/ }).click();
  await expect(p.getByRole("dialog", { name: "Import ingredients" })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await jon.context.close();
});

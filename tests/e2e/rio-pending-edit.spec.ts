/**
 * RIO-03 (reconstructed: the owner's correction package did not reach this session) — a change typed into an
 * open ingredient row of the import review, but not applied with "Use", was silently dropped by "Save
 * recipe": the recipe was created with the old amount and nothing said so. Now saving is held while any row
 * has an unapplied change, the row is named and focused, and "Cancel" puts the row back as it was.
 */
import { expect, test } from "@playwright/test";
import { leaveOutLine, member, q, seed, useLine } from "./helpers";

const PESTO = "https://pesto.example.com/weeknight-pesto-pasta/";
const PESTO_LINE = "1/3 cup pesto (homemade (or store-bought))";

async function openReview(browser: any) {
  await seed();
  const m = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  await m.page.getByRole("link", { name: "Our Recipes" }).click();
  await m.page.getByRole("textbox", { name: "Add a recipe from a link" }).fill(PESTO);
  await m.page.getByTestId("add-from-link-submit").click();
  const review = m.page.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  await useLine(review, "2-3 cloves garlic, minced", "3");
  await leaveOutLine(review, "fresh basil, for serving");
  return { ...m, review };
}
const pestoPerServing = async () =>
  (await q<any>("SELECT ri.quantity::text AS q FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.title='Weeknight Pesto Pasta' AND ri.ingredient_key='pesto'"))[0]?.q ?? null;

test("RIO-03a: an unapplied change in an open row holds Save, names the row, and is kept when applied", async ({ browser }) => {
  const { context, review } = await openReview(browser);
  const row = review.locator(`[data-testid="draft-line"][data-raw="${PESTO_LINE}"]`);
  await row.locator(".row-main").click();
  await row.getByRole("textbox", { name: "Amount for the whole recipe, line 2" }).fill("1/2");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeVisible();
  await expect(review.getByTestId("draft-problems")).toContainText("Line 2 (pesto) has a change you haven't applied");
  await expect(row.getByRole("button", { name: /^Use line 2/ })).toBeFocused();
  expect(await pestoPerServing()).toBeNull(); // nothing was saved with the old amount
  await row.getByRole("button", { name: /^Use line 2/ }).click();
  await expect(row.locator(".row-main")).toContainText("½ cup pesto");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  expect(await pestoPerServing()).toBe("0.125"); // ½ cup ÷ 4 servings
  await context.close();
});

test("RIO-03b: Cancel puts an edited row back as it was; then the recipe saves the original amount", async ({ browser }) => {
  const { context, review } = await openReview(browser);
  const row = review.locator(`[data-testid="draft-line"][data-raw="${PESTO_LINE}"]`);
  await row.locator(".row-main").click();
  const amount = row.getByRole("textbox", { name: "Amount for the whole recipe, line 2" });
  await amount.fill("2");
  await row.getByRole("button", { name: /^Cancel changes to line 2/ }).click();
  await expect(row.locator(".row-main")).toContainText("⅓ cup pesto");
  await row.locator(".row-main").click();
  await expect(amount).toHaveValue("1/3");
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  expect(await pestoPerServing()).toBe("0.083333333333");
  await context.close();
});

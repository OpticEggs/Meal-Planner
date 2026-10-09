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

// ---- Edge cases named by the original correction package (added 2026-10-09 after it arrived) ----

const row = (review: any, raw: string) => review.locator(`[data-testid="draft-line"][data-raw="${raw}"]`);
const PEAS = "1 ½ cups frozen peas";
const GARLIC = "2-3 cloves garlic, minced";
const BASIL = "fresh basil, for serving";
const saved = async () =>
  q<any>("SELECT ri.ingredient_key AS key, ri.quantity::text AS q, ri.unit FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.title='Weeknight Pesto Pasta' ORDER BY 1");
const draftLines = async () => (await q<any>("SELECT lines, revision FROM recipe_import_drafts ORDER BY created_at DESC LIMIT 1"))[0];

test("RIO-03c: two rows with unapplied changes (name, unit and amount) — each is named and focused in turn; both changes are saved", async ({ browser }) => {
  const { context, review } = await openReview(browser);
  const pesto = row(review, PESTO_LINE);
  await pesto.locator(".row-main").click();
  await pesto.getByRole("textbox", { name: "Ingredient name, line 2" }).fill("basil pesto");
  await pesto.getByRole("combobox", { name: "Unit, line 2" }).selectOption("tbsp");
  await pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" }).fill("5");
  const peas = row(review, PEAS);
  await peas.locator(".row-main").click();
  await peas.getByRole("textbox", { name: "Amount for the whole recipe, line 3" }).fill("2");
  await review.getByTestId("import-confirm").click();
  await expect(review.getByTestId("draft-problems")).toContainText("Line 2 (basil pesto) has a change you haven't applied");
  await expect(review.getByTestId("draft-problems")).toContainText("Line 3 (frozen peas) has a change you haven't applied");
  await expect(pesto.getByRole("button", { name: /^Use line 2/ })).toBeFocused();
  expect(await saved()).toEqual([]);
  await pesto.getByRole("button", { name: /^Use line 2/ }).click();
  await review.getByTestId("import-confirm").click();
  await expect(review.getByTestId("draft-problems")).not.toContainText("Line 2");
  await expect(peas.getByRole("button", { name: /^Use line 3/ })).toBeFocused();
  expect(await saved()).toEqual([]);
  await peas.getByRole("button", { name: /^Use line 3/ }).click();
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const rows = await saved();
  expect(rows).toContainEqual({ key: "basil_pesto", q: "1.25", unit: "tbsp" }); // 5 tbsp ÷ 4 servings
  expect(rows).toContainEqual({ key: "frozen_peas", q: "0.5", unit: "cup" }); // 2 cups ÷ 4
  expect(rows.find((r) => r.key === "pesto")).toBeUndefined();
  await context.close();
});

test("RIO-03d: an invalid pending amount holds saving and focuses the amount; it never saves the older value", async ({ browser }) => {
  const { context, review } = await openReview(browser);
  const pesto = row(review, PESTO_LINE);
  await pesto.locator(".row-main").click();
  const amount = pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" });
  const before = (await draftLines()).revision;
  await amount.fill("a third");
  await expect(pesto.getByText("Use a number or fraction")).toBeVisible();
  await expect(pesto.getByRole("button", { name: /^Use line 2/ })).toBeDisabled();
  await review.getByTestId("import-confirm").click();
  await expect(review.getByTestId("draft-problems")).toContainText("Line 2 (pesto) has a change you haven't applied");
  await expect(amount).toBeFocused();
  await review.getByRole("button", { name: "Save review for later" }).click();
  expect(await saved()).toEqual([]);
  expect((await draftLines()).revision).toBe(before); // Save review for later was held as well
  await amount.fill("1/2");
  await pesto.getByRole("button", { name: /^Use line 2/ }).click();
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  expect(await pestoPerServing()).toBe("0.125");
  await context.close();
});

test("RIO-03e: Save review for later is held too; once applied it is kept, survives a reload, and the reopened review saves it", async ({ browser }) => {
  const { context, page, review } = await openReview(browser);
  const pesto = row(review, PESTO_LINE);
  await pesto.locator(".row-main").click();
  await pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" }).fill("1/2");
  const before = (await draftLines()).revision;
  await review.getByRole("button", { name: "Save review for later" }).click();
  await expect(review.getByTestId("draft-problems")).toContainText("Line 2 (pesto) has a change you haven't applied");
  expect((await draftLines()).revision).toBe(before);
  await pesto.getByRole("button", { name: /^Use line 2/ }).click();
  await review.getByRole("button", { name: "Save review for later" }).click();
  await expect.poll(async () => (await draftLines()).revision).toBe(before + 1);
  expect((await draftLines()).lines[1].decision).toMatchObject({ use: true, name: "pesto", quantity: "1/2", unit: "cup" });
  await page.reload();
  await page.getByRole("link", { name: "Our Recipes" }).click();
  await page.getByRole("tab", { name: "Saved links" }).click();
  await page.getByRole("button", { name: /^Continue import review:/ }).click();
  const again = page.getByRole("dialog", { name: "Review the import" });
  await expect(row(again, PESTO_LINE).locator(".row-main")).toContainText("½ cup pesto");
  await again.getByTestId("import-confirm").click();
  await expect(again).toBeHidden();
  expect(await pestoPerServing()).toBe("0.125");
  await context.close();
});

test("RIO-03f: rows regrouping around an unapplied change keep it; after Use or Cancel the focus stays on that row", async ({ browser }) => {
  await seed();
  const m = await member(browser, "jon", { viewport: { width: 390, height: 844 } });
  await m.page.getByRole("link", { name: "Our Recipes" }).click();
  await m.page.getByRole("textbox", { name: "Add a recipe from a link" }).fill(PESTO);
  await m.page.getByTestId("add-from-link-submit").click();
  const review = m.page.getByRole("dialog", { name: "Review the import" });
  const pesto = row(review, PESTO_LINE);
  await pesto.locator(".row-main").click();
  await pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" }).fill("1/2"); // typed, not applied
  // Garlic is fixed and moves from "Needs a quick check" into "Ingredients"; focus follows it.
  const garlic = row(review, GARLIC);
  await expect(garlic).toHaveAttribute("data-state", "check");
  await garlic.getByRole("textbox", { name: /Amount for the whole recipe/ }).fill("3");
  await garlic.getByRole("button", { name: /^Use line 5/ }).click();
  const moved = review.getByTestId("draft-lines").locator(`[data-raw="${GARLIC}"]`);
  await expect(moved.locator(".row-main")).toBeFocused();
  // Basil is left out and moves to "Not added to groceries"; focus follows it too.
  await row(review, BASIL).locator(".row-main").focus();
  await row(review, BASIL).getByRole("button", { name: /^Leave out line 12/ }).click();
  await expect(review.getByTestId("draft-left-out").locator(`[data-raw="${BASIL}"] .row-main`)).toBeFocused();
  // Through both regroupings the pesto row kept its typed change, and it still holds Save.
  await expect(pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" })).toHaveValue("1/2");
  await review.getByTestId("import-confirm").click();
  await expect(review.getByTestId("draft-problems")).toContainText("Line 2 (pesto) has a change you haven't applied");
  await expect(pesto.getByRole("button", { name: /^Use line 2/ })).toBeFocused();
  expect(await saved()).toEqual([]);
  // Cancel puts it back and returns focus to the row.
  await pesto.getByRole("button", { name: /^Cancel changes to line 2/ }).click();
  await expect(pesto.locator(".row-main")).toBeFocused();
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const rows = await saved();
  expect(rows).toContainEqual({ key: "garlic_clove", q: "0.75", unit: "each" });
  expect(await pestoPerServing()).toBe("0.083333333333");
  await m.context.close();
});

test("RIO-03g: the other member saves the review meanwhile — nothing stale is saved, and the unapplied change is still held after loading theirs", async ({ browser }) => {
  const { context, page, review } = await openReview(browser);
  const pesto = row(review, PESTO_LINE);
  await pesto.locator(".row-main").click();
  await pesto.getByRole("textbox", { name: "Amount for the whole recipe, line 2" }).fill("1/2"); // Jon: not applied yet
  // Alex opens the same review in her own browser, changes the peas and saves the review for later.
  const alex = await member(browser, "alex", { viewport: { width: 390, height: 844 } });
  await alex.page.getByRole("link", { name: "Our Recipes" }).click();
  await alex.page.getByRole("tab", { name: "Saved links" }).click();
  await alex.page.getByRole("button", { name: /^Continue import review:/ }).click();
  const theirs = alex.page.getByRole("dialog", { name: "Review the import" });
  await useLine(theirs, PEAS, "2");
  await theirs.getByRole("button", { name: "Save review for later" }).click();
  await expect.poll(async () => (await draftLines()).lines[2].decision?.quantity).toBe("2");
  // Jon's screen learns of it; saving is refused until he loads her version.
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(review.getByTestId("import-changed")).toBeVisible();
  await expect(review.getByTestId("import-confirm")).toBeDisabled();
  await review.getByRole("button", { name: "Load the current version" }).click();
  await expect(row(review, PEAS).locator(".row-main")).toContainText("2 cups frozen peas");
  // Her version is what loads: the two lines she left undecided are undecided again for Jon.
  await expect(row(review, GARLIC)).toHaveAttribute("data-state", "check");
  await useLine(review, GARLIC, "3");
  await leaveOutLine(review, BASIL);
  // His typed pesto change was not applied, so it is still held — not dropped, not silently saved.
  await review.getByTestId("import-confirm").click();
  await expect(review.getByTestId("draft-problems")).toContainText("Line 2 (pesto) has a change you haven't applied");
  expect(await saved()).toEqual([]);
  await pesto.getByRole("button", { name: /^Use line 2/ }).click();
  await review.getByTestId("import-confirm").click();
  await expect(review).toBeHidden();
  const rows = await saved();
  expect(rows).toContainEqual({ key: "pesto", q: "0.125", unit: "cup" });
  expect(rows).toContainEqual({ key: "frozen_peas", q: "0.5", unit: "cup" });
  await alex.context.close();
  await context.close();
});

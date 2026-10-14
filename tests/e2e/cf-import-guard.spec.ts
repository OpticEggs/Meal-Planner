/**
 * CF-G — the owner-reproduced import-review loss (catalog-first §5): a click or tap outside the sheet, Escape and
 * Close never lose edited work. Edited sheets route all three through one confirmation — Keep editing (focused,
 * every edit kept), Save for later (the import review only; it saves through the existing review save) and
 * Discard changes (the server draft is untouched). Untouched sheets close at once. The recipe editor uses the
 * same shared guard. Outcomes are checked in the database.
 */
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { USERS } from "../fixtures/household";
import { leaveOutLine, member, q, seed, openAddRecipe } from "./helpers";

const CHILI = "https://recipes.example.com/chili";
const BB = "https://www.budgetbytes.com/one-pot-chicken-and-rice/";
const RICE = "½ cup cooked rice";
type How = "backdrop" | "Escape" | "Close" | "tap";

async function focused(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    return {
      id: a?.id ?? null, testid: a?.getAttribute("data-testid") ?? null, label: a?.getAttribute("aria-label") ?? null,
      name: a?.getAttribute("aria-label") ?? a?.textContent?.trim().slice(0, 80) ?? null,
      inDialog: !!(dialog && a && dialog.contains(a)), isBody: a === document.body,
    };
  });
}
const draft = async () =>
  (await q<any>("SELECT id, status, revision, title, servings, effort_minutes, lines FROM recipe_import_drafts ORDER BY created_at DESC LIMIT 1"))[0];
const decisionOf = (d: any, raw: string) => d.lines.find((l: any) => l.raw === raw)?.decision ?? null;

/** Add (or re-open: an open draft of the same link comes back) the chili review from Our Recipes. */
async function openChili(page: Page) {
  await page.getByTestId("nav-recipes").click();
  await openAddRecipe(page);
  await page.getByRole("textbox", { name: "Add a recipe from a link" }).fill(CHILI);
  await page.getByTestId("add-from-link-submit").click();
  const review = page.getByRole("dialog", { name: "Review the import" });
  await expect(review.getByTestId("import-review")).toBeVisible();
  return review;
}
async function edit(review: Locator) {
  await review.getByLabel("Recipe name").fill("Our chili");
  await review.getByTestId("draft-servings").fill("6");
  await review.getByLabel("Time (minutes)").fill("50");
  await leaveOutLine(review, RICE);
}
async function expectEdited(review: Locator) {
  await expect(review.getByLabel("Recipe name")).toHaveValue("Our chili");
  await expect(review.getByTestId("draft-servings")).toHaveValue("6");
  await expect(review.getByLabel("Time (minutes)")).toHaveValue("50");
  await expect(review.locator(`[data-testid="draft-line"][data-raw="${RICE}"]`)).toHaveAttribute("data-state", "out");
}
async function ask(page: Page, review: Locator, how: How) {
  if (how === "Escape") await page.keyboard.press("Escape");
  else if (how === "Close") await review.getByTestId("close-sheet").click();
  else if (how === "backdrop") await page.mouse.click(5, 5); // the dimmed page above the sheet
  else await page.touchscreen.tap(195, 4);
}
async function expectUnchangedOnServer() {
  const d = await draft();
  expect(d).toMatchObject({ status: "open", revision: 1, title: "Weeknight Bean Chili", servings: 4, effort_minutes: 45 });
  expect(decisionOf(d, RICE)).toMatchObject({ use: true });
}

async function touchMember(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS.jon.email);
  await page.getByLabel("Password").fill(USERS.jon.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("me")).toHaveText(USERS.jon.name);
  return { context, page };
}

for (const how of ["backdrop", "Escape", "Close"] as const) {
  test(`CF-G1 (${how}): an edited import review asks first; Keep editing keeps every edit; Discard leaves the server draft as it was`, async ({ browser }) => {
    await seed();
    const { context, page } = await member(browser, "jon");
    const review = await openChili(page);
    await edit(review);
    const before = await focused(page);
    await ask(page, review, how);
    const confirm = review.getByTestId("discard-confirm");
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Save for later" })).toBeVisible();
    expect((await focused(page)).name).toBe("Keep editing");
    await confirm.getByRole("button", { name: "Keep editing" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(review).toBeVisible();
    await expectEdited(review);
    // Focus goes back to where it was (the Close button when that was pressed), never <body>.
    await expect.poll(async () => (await focused(page)).name).toBe(how === "Close" ? "Close import" : before.name);
    // The same way of closing again, then Discard: closed, the draft on the server untouched, focus on the opener.
    await ask(page, review, how);
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Discard changes" }).click();
    await expect(review).toHaveCount(0);
    await expectUnchangedOnServer();
    await expect.poll(async () => (await focused(page)).id).toBe("add-link-url"); // back on the opener
    // Reopening shows the saved draft, not the discarded edits.
    const again = await openChili(page);
    await expect(again.getByLabel("Recipe name")).toHaveValue("Weeknight Bean Chili");
    await expect(again.getByTestId("draft-servings")).toHaveValue("4");
    await context.close();
  });
}

test("CF-G2: Save for later from the confirmation saves through the review save and closes; reopening shows the edits", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  const review = await openChili(page);
  await edit(review);
  await page.keyboard.press("Escape");
  await review.getByTestId("discard-confirm").getByRole("button", { name: "Save for later" }).click();
  await expect(review).toHaveCount(0);
  const d = await draft();
  expect(d).toMatchObject({ status: "open", revision: 2, title: "Our chili", servings: 6, effort_minutes: 50 });
  expect(decisionOf(d, RICE)).toEqual({ use: false });
  const again = await openChili(page);
  await expectEdited(again);
  // Reopened and untouched: every way of closing closes at once.
  await page.mouse.click(5, 5);
  await expect(again).toHaveCount(0);
  await context.close();
});

test("CF-G3: an unapplied row edit counts as unsaved; Save for later saves it, or shows the row when it can't be used; Save failure keeps the sheet open", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  const BEANS = "1 1/2 cups dried black beans";
  let review = await openChili(page);
  let beans = review.locator(`[data-testid="draft-line"][data-raw="${BEANS}"]`);
  await beans.locator(".row-main").click();
  await beans.getByRole("textbox", { name: /Amount for the whole recipe/ }).fill("two"); // typed, not usable
  await review.getByTestId("close-sheet").click();
  const confirm = review.getByTestId("discard-confirm");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Save for later" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(review).toBeVisible();
  await expect(review.getByTestId("draft-problems")).toContainText("the amount isn't a number");
  await expect(beans.getByRole("textbox", { name: /Amount for the whole recipe/ })).toHaveValue("two");
  await expect(beans.getByRole("textbox", { name: /Amount for the whole recipe/ })).toBeFocused();
  expect((await draft()).revision).toBe(1); // nothing saved with the old amount
  // D158: corrected, Save for later saves the typed change (no separate Use) and closes.
  await beans.getByRole("textbox", { name: /Amount for the whole recipe/ }).fill("2");
  await review.getByTestId("close-sheet").click();
  await confirm.getByRole("button", { name: "Save for later" }).click();
  await expect(review).toHaveCount(0);
  expect(decisionOf(await draft(), BEANS)).toMatchObject({ use: true, quantity: "2", unit: "cup" });
  review = await openChili(page);
  beans = review.locator(`[data-testid="draft-line"][data-raw="${BEANS}"]`);
  // A save the server refuses (the other member changed the draft meanwhile): the sheet stays open with the edits.
  await review.getByLabel("Recipe name").fill("Mine");
  await q("UPDATE recipe_import_drafts SET revision = revision + 1, title = 'Theirs'");
  await page.keyboard.press("Escape");
  await confirm.getByRole("button", { name: "Save for later" }).click();
  await expect(review.getByTestId("import-review-error")).toBeVisible();
  await expect(review).toBeVisible();
  await expect(review.getByLabel("Recipe name")).toHaveValue("Mine");
  expect((await draft()).title).toBe("Theirs");
  expect((await focused(page)).inDialog).toBe(true);
  await context.close();
});

test("CF-G4: Discard import asks first; Keep the import keeps it; Discard import discards it", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  const review = await openChili(page);
  const discard = review.getByRole("button", { name: "Discard import" });
  await discard.click();
  const ask = review.getByTestId("discard-import-confirm");
  await expect(ask).toBeVisible();
  expect((await focused(page)).name).toBe("Keep the import");
  await ask.getByRole("button", { name: "Keep the import" }).click();
  await expect(ask).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).name).toBe("Discard import");
  expect((await draft()).status).toBe("open");
  await discard.click();
  await ask.getByRole("button", { name: "Discard import" }).click();
  await expect.poll(async () => (await draft()).status).toBe("discarded");
  await context.close();
});

test("CF-G5: the paste path — pasted lines or a changed name ask first (no Save for later); untouched closes", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  await page.getByTestId("nav-recipes").click();
  await openAddRecipe(page);
  await page.getByRole("textbox", { name: "Add a recipe from a link" }).fill(BB);
  await page.getByTestId("add-from-link-submit").click();
  const dialog = page.getByRole("dialog", { name: "Import ingredients" });
  await expect(dialog.getByTestId("import-not-read")).toContainText("Budget Bytes asks for permission");
  // Untouched (the name from the link is not an edit): Close closes at once.
  await dialog.getByTestId("close-sheet").click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: "Saved links" }).click();
  await page.getByRole("button", { name: /^Import ingredients:/ }).click();
  await dialog.getByLabel("Ingredients, one per line").fill("1 cup rice\n1 lb chicken thighs");
  await page.mouse.click(5, 5);
  const confirm = dialog.getByTestId("discard-confirm");
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("button", { name: "Save for later" })).toHaveCount(0);
  await confirm.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog.getByLabel("Ingredients, one per line")).toHaveValue("1 cup rice\n1 lb chicken thighs");
  await page.keyboard.press("Escape");
  await confirm.getByRole("button", { name: "Discard changes" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await q("SELECT 1 FROM recipe_import_drafts")).toEqual([]);
  await context.close();
});

test("CF-G6: mobile touch — a tap outside an edited review asks first; Keep editing keeps it; Discard leaves the server draft; untouched closes on a tap", async ({ browser }) => {
  await seed();
  const { context, page } = await touchMember(browser);
  const review = await openChili(page);
  // Untouched: a tap outside closes at once.
  await page.touchscreen.tap(195, 4);
  await expect(review).toHaveCount(0);
  const again = await openChili(page);
  await edit(again);
  await ask(page, again, "tap");
  const confirm = again.getByTestId("discard-confirm");
  await expect(confirm).toBeVisible();
  expect((await focused(page)).name).toBe("Keep editing");
  await confirm.getByRole("button", { name: "Keep editing" }).tap();
  await expect(confirm).toHaveCount(0);
  await expectEdited(again);
  // A tap outside while the question is showing also keeps editing.
  await ask(page, again, "tap");
  await expect(confirm).toBeVisible();
  await page.touchscreen.tap(195, 4);
  await expect(confirm).toHaveCount(0);
  await expectEdited(again);
  await ask(page, again, "tap");
  await confirm.getByRole("button", { name: "Discard changes" }).tap();
  await expect(again).toHaveCount(0);
  await expectUnchangedOnServer();
  // And Save for later by touch.
  const third = await openChili(page);
  await edit(third);
  await ask(page, third, "tap");
  await third.getByTestId("discard-confirm").getByRole("button", { name: "Save for later" }).tap();
  await expect(third).toHaveCount(0);
  expect(await draft()).toMatchObject({ revision: 2, title: "Our chili", servings: 6 });
  await context.close();
});

test("CF-G7: recipe editor — the backdrop and Close ask first with unsaved work (shared guard); untouched closes on the backdrop", async ({ browser }) => {
  await seed();
  const { context, page } = await member(browser, "jon");
  await page.getByTestId("nav-recipes").click();
  const recipes = async () => (await q("SELECT count(*)::int n FROM recipes"))[0].n;
  const before = await recipes();
  await openAddRecipe(page);
  const opener = page.getByTestId("new-recipe");
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "New recipe" });
  // Untouched: the backdrop closes it at once.
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
  await opener.click();
  await dialog.getByLabel("Title", { exact: true }).fill("Half-typed");
  for (const how of ["backdrop", "Close"] as const) {
    if (how === "backdrop") await page.mouse.click(5, 5);
    else await dialog.getByRole("button", { name: "Close the new recipe" }).click();
    const confirm = dialog.getByTestId("discard-confirm");
    await expect(confirm, how).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Save for later" })).toHaveCount(0); // the editor has no draft to save
    expect((await focused(page)).name).toBe("Keep editing");
    await confirm.getByRole("button", { name: "Keep editing" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue("Half-typed");
    // Focus returns to where it was: the title (a backdrop press never moves focus), or the Close button pressed.
    if (how === "Close") await expect.poll(async () => (await focused(page)).name).toBe("Close the new recipe");
    else await expect.poll(async () => (await focused(page)).id).toBe("re-title");
  }
  await dialog.getByRole("button", { name: "Close the new recipe" }).click();
  await dialog.getByTestId("discard-confirm").getByRole("button", { name: "Discard changes" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).testid).toBe("new-recipe");
  expect(await recipes()).toBe(before);
  await context.close();
});

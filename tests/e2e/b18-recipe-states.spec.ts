/**
 * B18 (with the B17 correction): the recipe editor's conflict, error and long-content states at
 * 320px with 150% and 200% text. Text must actually scale; nothing may be clipped or scroll
 * sideways; decision controls must be reachable by keyboard in order and hittable (not under a
 * sticky or fixed bar). Chromium only — WebKit/Safari/VoiceOver/devices are not covered here.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

const CHILI = "Fixture: Turkey chili";
const LONG_STEPS =
  "Brown the turkey in two batches so it sears rather than steams, then add onion, garlic and the spice mix. " +
  "Notes from the card: https://example.invalid/recipes/turkey-chili-with-black-beans-and-roasted-poblano-peppers-family-version " +
  "Simmer uncovered forty minutes, stirring every ten, until thick enough to hold a line drawn with a spoon.";

async function recipeIdOf(title: string) {
  return (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title=$1", [title]))[0].id as string;
}
async function saveVia(page: Page, recipeId: string, patch: (d: any) => void) {
  return page.evaluate(
    async ({ recipeId, patchSrc }) => {
      const lib = await (await fetch("/api/library", { cache: "no-store" })).json();
      const v = lib.recipes.find((x: any) => x.recipeId === recipeId).version;
      const d: any = {
        recipeId, expectedVersionNo: v.versionNo, title: v.title, cuisine: v.cuisine, summary: v.summary, sourceLabel: v.sourceLabel,
        effortMinutes: v.effortMinutes, effortLevel: v.effortLevel, leftoverFriendly: v.leftoverFriendly, instructions: v.instructions,
        reheatInstructions: v.reheatInstructions, components: v.components.map((c: any) => ({ key: c.key, name: c.name })),
        // EQR (2026-10-10): an edit names the stored row each row came from (rows a patch adds are new: null).
        ingredients: v.ingredients.map((i: any) => ({ componentKey: i.componentKey, ingredientKey: i.ingredientKey, ingredientName: i.name, quantity: i.quantity, unit: i.unit, form: i.form, note: i.note, sourceRowId: i.rowId ?? null })),
      };
      // eslint-disable-next-line no-new-func
      new Function("d", patchSrc)(d);
      for (const i of d.ingredients) if (!("sourceRowId" in i)) i.sourceRowId = null;
      const res = await fetch("/api/commands/SaveRecipeVersion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `t-${crypto.randomUUID()}`, payload: d }) });
      return res.json();
    },
    { recipeId, patchSrc: `(${patch.toString()})(d)` },
  );
}
/** The dialog and page fit the viewport: no sideways scroll, nothing wider than its box. */
async function fits(page: Page, dialog: Locator) {
  const r = await dialog.evaluate((d) => {
    const over = [...d.querySelectorAll<HTMLElement>("*")]
      .filter((e) => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 0.5)
      .map((e) => `${e.tagName}${e.id ? `#${e.id}` : ""}${e.dataset.testid ? `[${e.dataset.testid}]` : ""}`);
    return { sw: d.scrollWidth, cw: d.clientWidth, over };
  });
  expect(r.over, "elements past the right edge").toEqual([]);
  expect(r.sw).toBeLessThanOrEqual(r.cw);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}
/** Scrolled into view, the control's centre is the control itself (not a sticky/fixed bar). */
async function hittable(el: Locator) {
  await el.scrollIntoViewIfNeeded();
  return el.evaluate((b) => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.right <= innerWidth + 0.5 && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
}

for (const scale of [150, 200]) {
  test(`B18 recipe editor conflict with long content at 320px, ${scale}% text: full contents readable, decisions reachable in order`, async ({ browser }) => {
    await seed();
    const jon = await member(browser, "jon", { viewport: { width: 320, height: 640 }, reducedMotion: "reduce" });
    const alex = await member(browser, "alex");
    const p = jon.page;
    const id = await recipeIdOf(CHILI);
    await p.goto(`/recipes/${id}`);
    await p.addStyleTag({ content: `html { font-size: ${scale}% !important; }` });
    const base = await p.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    expect(base).toBeGreaterThanOrEqual(16 * (scale / 100) - 0.5); // the text really is larger
    await p.getByRole("button", { name: "Edit (new version)" }).click();
    const d = p.getByRole("dialog", { name: `Edit ${CHILI} — new version` });
    await d.getByLabel("Steps", { exact: true }).fill("Jon's short method.");
    await d.getByLabel("Title", { exact: true }).fill("Jon's chili");
    expect((await saveVia(alex.page, id, new Function("d", `d.instructions = ${JSON.stringify(LONG_STEPS)}; d.ingredients[0].note = "drained well, then patted dry";`) as any)).status).toBe("accepted");
    const card = d.getByTestId("recipe-conflict-instructions");
    await expect(card).toContainText("roasted-poblano-peppers-family-version");
    await expect(card).toContainText("Yours: Jon's short method.");
    await expect(d.getByTestId("recipe-rebased")).toContainText("drained well, then patted dry");
    await fits(p, d);
    const theirs = card.getByRole("button", { name: /^Use version \d+'s Steps$/ });
    const mine = card.getByRole("button", { name: "Keep my Steps" });
    for (const el of [theirs, mine, d.getByRole("button", { name: /^Start over from version/ })]) expect(await hittable(el)).toBe(true);
    await expect(d.getByRole("button", { name: "Save new version" })).toBeDisabled();
    await expect(p.locator("#re-save-held")).toBeVisible();
    // Keyboard order: "Use version N's Steps" → "Keep my Steps".
    await theirs.focus();
    await p.keyboard.press("Tab");
    expect(await p.evaluate(() => document.activeElement?.textContent)).toBe("Keep my Steps");
    await p.keyboard.press("Enter");
    // The block disappears; focus lands on Save (not the page body) and Save is visible and hittable.
    await expect.poll(() => p.evaluate(() => document.activeElement?.id)).toBe("re-save");
    expect(await hittable(d.getByRole("button", { name: "Save new version" }))).toBe(true);
    await fits(p, d);
    await jon.context.close();
    await alex.context.close();
  });

  test(`B18 recipe editor errors at 320px, ${scale}% text: field and form errors and a newer version's long text are readable and attached, nothing clipped`, async ({ browser }) => {
    await seed();
    const jon = await member(browser, "jon", { viewport: { width: 320, height: 640 }, reducedMotion: "reduce" });
    const alex = await member(browser, "alex");
    const p = jon.page;
    const id = await recipeIdOf(CHILI);
    await p.goto(`/recipes/${id}`);
    await p.addStyleTag({ content: `html { font-size: ${scale}% !important; }` });
    await p.getByRole("button", { name: "Edit (new version)" }).click();
    const d = p.getByRole("dialog", { name: `Edit ${CHILI} — new version` });
    // Field errors: blank title and a bad amount.
    await d.getByLabel("Title", { exact: true }).fill("");
    await d.getByRole("textbox", { name: "Ingredient 1 amount" }).fill("lots");
    await d.getByRole("button", { name: "Save new version" }).click();
    await expect(d.getByLabel("Title", { exact: true })).toBeFocused();
    await expect(d.getByLabel("Title", { exact: true })).toHaveAccessibleDescription(/Give the recipe a title/);
    await expect(d.getByRole("textbox", { name: "Ingredient 1 amount" })).toHaveAccessibleDescription(/positive number/);
    await fits(p, d);
    // A newer version with long text arrives while the errors are showing: brought in, readable.
    expect((await saveVia(alex.page, id, (x: any) => { x.reheatInstructions = "Alex's reheat: covered, low heat, stir once halfway, add a splash of stock if it has thickened overnight."; })).status).toBe("accepted");
    await expect(d.getByTestId("recipe-rebased")).toContainText("add a splash of stock");
    await fits(p, d);
    // A form-level error (the save cannot reach the server) is shown in full; nothing is written.
    await d.getByLabel("Title", { exact: true }).fill("A very long recipe title that a member might actually type when they are being descriptive about it");
    await d.getByRole("textbox", { name: "Ingredient 1 amount" }).fill("1");
    const before = (await q<any>("SELECT count(*)::int AS n FROM recipe_versions WHERE recipe_id=$1", [id]))[0].n;
    await p.route("**/api/commands/SaveRecipeVersion", (r) => r.abort());
    await d.getByRole("button", { name: "Save new version" }).click();
    const alert = d.getByTestId("recipe-error");
    await expect(alert).toContainText("Could not reach Table");
    expect(await alert.evaluate((e) => e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().right <= innerWidth + 0.5)).toBe(true);
    await fits(p, d);
    expect(await hittable(d.getByRole("button", { name: "Save new version" }))).toBe(true);
    expect((await q<any>("SELECT count(*)::int AS n FROM recipe_versions WHERE recipe_id=$1", [id]))[0].n).toBe(before);
    await jon.context.close();
    await alex.context.close();
  });
}

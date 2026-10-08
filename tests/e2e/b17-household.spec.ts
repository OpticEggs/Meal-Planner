/**
 * B17 — keyboard, focus and error pass over the Household screen's inline forms (settings,
 * targets, exclusions, ingredient review), with two signed-in members. Focus is read from
 * document.activeElement after real key presses; outcomes are checked in the database.
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

async function focused(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    return {
      testid: a?.getAttribute("data-testid") ?? null,
      id: a?.id ?? null,
      tag: a?.tagName ?? null,
      name: a?.getAttribute("aria-label") ?? a?.textContent?.trim().slice(0, 80) ?? null,
      value: (a as HTMLInputElement | null)?.value ?? null,
      inDialog: !!(dialog && a && dialog.contains(a)),
      isBody: a === document.body || a === null,
    };
  });
}
function recordAnnouncements() {
  (window as any).__announced = [];
  new MutationObserver(() => {
    const t = document.querySelector('[data-testid="announcer"]')?.textContent?.trim();
    const log = (window as any).__announced as string[];
    if (t && log[log.length - 1] !== t) log.push(t);
  }).observe(document, { subtree: true, childList: true, characterData: true });
}
const announced = (page: Page) => page.evaluate(() => ((window as any).__announced as string[]).join(" | "));
const noNativeDialogs = (page: Page) => page.on("dialog", (d) => { throw new Error(`native ${d.type()} dialog opened: ${d.message()}`); });
let householdId = "";
const settingsRow = async () =>
  (await q<any>("SELECT revision, budget_limit_minor, cooking_sessions, store_label, max_new_recipes FROM household_settings WHERE household_id=$1", [householdId]))[0];
async function toHousehold(page: Page) {
  await page.getByRole("link", { name: "Household" }).click();
  await expect(page.getByTestId("settings")).toBeVisible();
}

test("B17 settings: another member's save keeps what I typed, shows their values, holds Save until reviewed; my save lands on the reviewed revision", async ({ browser }) => {
  householdId = (await seed()).householdId;
  const alex = await member(browser, "alex", { init: recordAnnouncements });
  const jon = await member(browser, "jon");
  const a = alex.page;
  const j = jon.page;
  noNativeDialogs(a);
  await toHousehold(a);
  await toHousehold(j);
  const start = await settingsRow();
  const aForm = a.getByTestId("settings");
  const jForm = j.getByTestId("settings");

  // Not editing: Alex simply follows Jon's saved value, no conflict.
  await jForm.getByLabel("Store (label)").fill("Corner market");
  await jForm.getByRole("button", { name: "Save household inputs" }).click();
  await expect.poll(async () => (await settingsRow()).revision).toBe(start.revision + 1);
  await expect(aForm.getByLabel("Store (label)")).toHaveValue("Corner market");
  await expect(a.getByTestId("settings-conflict")).toHaveCount(0);

  // Alex starts typing; Jon saves different values meanwhile.
  await aForm.getByLabel("Budget ($)").fill("80");
  await aForm.getByLabel("Cooking sessions / week").fill("3");
  await expect.poll(async () => (await focused(a)).value).toBe("3");
  const alexFocus = await focused(a);
  await jForm.getByLabel("Budget ($)").fill("95.50");
  await jForm.getByLabel("Cooking sessions / week").fill("5");
  await jForm.getByLabel("Store (label)").fill("Jon's store");
  await jForm.getByRole("button", { name: "Save household inputs" }).click();
  await expect.poll(async () => (await settingsRow()).revision).toBe(start.revision + 2);

  const conflict = a.getByTestId("settings-conflict");
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText("Jon saved household inputs while you were editing");
  await expect(conflict).toContainText("95.50");
  await expect(conflict).toContainText("5");
  await expect(conflict).toContainText("Jon's store");
  // What Alex typed is kept, and the live update did not move focus.
  await expect(aForm.getByLabel("Budget ($)")).toHaveValue("80");
  await expect(aForm.getByLabel("Cooking sessions / week")).toHaveValue("3");
  expect(await focused(a)).toMatchObject({ id: alexFocus.id, value: "3", isBody: false });
  const save = aForm.getByRole("button", { name: "Save household inputs" });
  await expect(save).toBeDisabled();

  await conflict.getByRole("button", { name: "I’ve reviewed the current settings" }).click();
  await expect(a.getByTestId("settings-conflict")).toHaveCount(0);
  await expect(save).toBeEnabled();
  await expect(aForm.getByLabel("Budget ($)")).toHaveValue("80");
  await expect(aForm.getByLabel("Cooking sessions / week")).toHaveValue("3");
  // A field Alex never touched takes the current value instead of reverting Jon's change.
  await expect(aForm.getByLabel("Store (label)")).toHaveValue("Jon's store");
  await save.click();
  await expect.poll(async () => (await settingsRow()).revision).toBe(start.revision + 3);
  expect(await settingsRow()).toMatchObject({ budget_limit_minor: 8000, cooking_sessions: 3, store_label: "Jon's store" });
  await expect.poll(() => announced(a)).toContain("Household inputs saved.");
  await expect(a.getByTestId("settings-conflict")).toHaveCount(0);
  await expect(jForm.getByLabel("Budget ($)")).toHaveValue("80.00");
  await alex.context.close();
  await jon.context.close();
});

test("B17 settings: invalid budget, sessions and new-recipe limit are attached errors, the first takes focus, nothing is saved", async ({ browser }) => {
  householdId = (await seed()).householdId;
  const alex = await member(browser, "alex");
  const a = alex.page;
  await toHousehold(a);
  const before = await settingsRow();
  const form = a.getByTestId("settings");
  await form.getByLabel("Budget ($)").fill("12.345");
  await form.getByLabel("Cooking sessions / week").fill("9");
  await form.getByLabel("Max new recipes").fill("8");
  await form.getByLabel("Max new recipes").press("Enter");
  await expect.poll(async () => (await focused(a)).id).toBe("set-budget");
  await expect(form.getByLabel("Budget ($)")).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByLabel("Budget ($)")).toHaveAccessibleDescription(/at most 2 decimal places/);
  await expect(form.getByLabel("Cooking sessions / week")).toHaveAccessibleDescription(/whole number from 1 to 7/);
  await expect(form.getByLabel("Max new recipes")).toHaveAccessibleDescription(/whole number from 0 to 7/);
  expect(await settingsRow()).toEqual(before);
  // Fixing the budget moves focus to the next invalid field.
  await form.getByLabel("Budget ($)").fill("-4");
  await form.getByRole("button", { name: "Save household inputs" }).click();
  await expect.poll(async () => (await focused(a)).id).toBe("set-budget");
  await form.getByLabel("Budget ($)").fill("12.34");
  await form.getByRole("button", { name: "Save household inputs" }).click();
  await expect.poll(async () => (await focused(a)).id).toBe("set-sessions");
  await expect(form.getByLabel("Budget ($)")).not.toHaveAttribute("aria-invalid", "true");
  expect(await settingsRow()).toEqual(before);
  await form.getByLabel("Cooking sessions / week").fill("7");
  await form.getByLabel("Max new recipes").fill("0");
  await form.getByRole("button", { name: "Save household inputs" }).click();
  await expect.poll(async () => (await settingsRow()).revision).toBe(before.revision + 1);
  expect(await settingsRow()).toMatchObject({ budget_limit_minor: 1234, cooking_sessions: 7, max_new_recipes: 0 });
  await alex.context.close();
});

test("B17 settings: a server rejection is a focused alert", async ({ browser }) => {
  await seed();
  const alex = await member(browser, "alex");
  const a = alex.page;
  await toHousehold(a);
  await a.route("**/api/commands/UpdateSettings", (r) => r.fulfill({ json: { status: "rejected", code: "invalid", message: "Invalid setting: test rejection" } }));
  const form = a.getByTestId("settings");
  await form.getByLabel("Budget ($)").fill("50");
  await form.getByRole("button", { name: "Save household inputs" }).click();
  const alert = form.getByRole("alert");
  await expect(alert).toHaveText("Invalid setting: test rejection");
  await expect.poll(async () => (await focused(a)).name).toBe("Invalid setting: test rejection");
  await expect(form.getByLabel("Budget ($)")).toHaveValue("50");
  await alex.context.close();
});

test("B17 targets: distinct labels per scope, attached and focused errors, a valid save persists and is announced", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex", { init: recordAnnouncements });
  const a = alex.page;
  await toHousehold(a);
  const t = a.getByTestId("targets");
  await expect(t.getByLabel("Dinner calories (kcal)")).toHaveCount(1);
  await expect(t.getByLabel("Whole-day protein (g)")).toHaveCount(1);
  await t.getByLabel("Dinner calories (kcal)").fill("abc");
  await t.getByLabel("Dinner fat (g)").fill("-3");
  await t.getByRole("button", { name: "Save dinner targets" }).click();
  await expect.poll(async () => (await focused(a)).id).toBe("tg-dinner-calories");
  await expect(t.getByLabel("Dinner calories (kcal)")).toHaveAttribute("aria-invalid", "true");
  await expect(t.getByLabel("Dinner calories (kcal)")).toHaveAccessibleDescription(/number/);
  await expect(t.getByLabel("Dinner fat (g)")).toHaveAccessibleDescription(/number/);
  expect(await q("SELECT 1 FROM member_targets WHERE member_id=$1", [fx.members.alex])).toHaveLength(0);
  await t.getByLabel("Dinner calories (kcal)").fill("650");
  await t.getByLabel("Dinner protein (g)").fill("40.5");
  await t.getByLabel("Dinner fat (g)").fill("");
  await t.getByLabel("Dinner fat (g)").press("Enter");
  await expect.poll(async () => (await q<any>("SELECT calories::text, protein_g::text, fat_g FROM member_targets WHERE member_id=$1 AND scope='dinner'", [fx.members.alex]))[0]).toEqual({ calories: "650", protein_g: "40.5", fat_g: null });
  await expect.poll(() => announced(a)).toContain("Dinner targets saved.");
  await expect(t.getByLabel("Dinner calories (kcal)")).not.toHaveAttribute("aria-invalid", "true");
  // Whole-day targets are a separate form with their own errors.
  await t.getByLabel("Whole-day carbs (g)").fill("1.2.3");
  await t.getByRole("button", { name: "Save whole-day targets" }).click();
  await expect.poll(async () => (await focused(a)).id).toBe("tg-daily-carbsG");
  expect(await q("SELECT 1 FROM member_targets WHERE member_id=$1 AND scope='daily'", [fx.members.alex])).toHaveLength(0);
  await alex.context.close();
});

test("B17 exclusions: empty term is an attached error, server rejection is shown, removal is a confirmation with Keep it as default", async ({ browser }) => {
  await seed();
  const alex = await member(browser, "alex", { init: recordAnnouncements });
  const a = alex.page;
  noNativeDialogs(a);
  await toHousehold(a);
  const ex = a.getByTestId("exclusions");
  const term = ex.getByLabel("Exclusion", { exact: true });
  await ex.getByRole("button", { name: "Add exclusion" }).click();
  await expect.poll(async () => (await focused(a)).id).toBe("excl-term");
  await expect(term).toHaveAttribute("aria-invalid", "true");
  await expect(term).toHaveAccessibleDescription(/Enter an ingredient or tag/);
  expect(await q("SELECT 1 FROM exclusions")).toHaveLength(0);

  // A server rejection is shown (it used to be silently ignored) and what was typed stays.
  await a.route("**/api/commands/AddExclusion", (r) => r.fulfill({ json: { status: "rejected", code: "invalid", message: "Exclusion rejected for the test" } }));
  await term.fill("Shellfish");
  await term.press("Enter");
  await expect(ex.getByRole("alert")).toHaveText("Exclusion rejected for the test");
  await expect(term).toHaveValue("Shellfish");
  await a.unroute("**/api/commands/AddExclusion");

  await term.press("Enter");
  await expect.poll(async () => (await q<any>("SELECT term, removed_at FROM exclusions"))).toEqual([{ term: "shellfish", removed_at: null }]);
  await expect(term).toHaveValue("");
  await expect(term).not.toHaveAttribute("aria-invalid", "true");
  await expect(ex.getByRole("alert")).toHaveCount(0);
  await ex.getByLabel("Applies to").selectOption({ label: "Alex" });
  await term.fill("peanut");
  await term.press("Enter");
  await expect(ex.getByRole("button", { name: "Remove exclusion peanut (Alex)" })).toBeVisible();

  const opener = ex.getByRole("button", { name: "Remove exclusion shellfish (everyone)" });
  // Enter on the default "Keep it" keeps it; focus returns to the opener.
  await opener.focus();
  await a.keyboard.press("Enter");
  const dialog = a.getByRole("dialog", { name: "Remove the exclusion shellfish?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("could be proposed again");
  expect(await focused(a)).toMatchObject({ inDialog: true, name: "Keep it" });
  await a.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(a)).name).toBe("Remove exclusion shellfish (everyone)");
  expect((await q<any>("SELECT removed_at FROM exclusions WHERE term='shellfish'"))[0].removed_at).toBeNull();
  // Escape keeps it too.
  await a.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await a.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(a)).name).toBe("Remove exclusion shellfish (everyone)");
  expect((await q<any>("SELECT removed_at FROM exclusions WHERE term='shellfish'"))[0].removed_at).toBeNull();
  // Remove: the row (and its opener) goes; focus lands on a surviving control, not <body>.
  await a.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Remove exclusion", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await q<any>("SELECT removed_at FROM exclusions WHERE term='shellfish'"))[0].removed_at).not.toBeNull();
  await expect(opener).toHaveCount(0);
  await expect.poll(async () => (await focused(a)).isBody).toBe(false);
  expect((await focused(a)).id).toBe("excl-term");
  await expect.poll(() => announced(a)).toContain("Exclusion shellfish removed");
  expect((await q<any>("SELECT removed_at FROM exclusions WHERE term='peanut'"))[0].removed_at).toBeNull();
  await alex.context.close();
});

test("B17 ingredient review: no tags needs an explicit 'no allergen tags apply', else an attached error", async ({ browser }) => {
  const fx = await seed();
  const alex = await member(browser, "alex");
  const a = alex.page;
  await toHousehold(a);
  const name = "Basil pesto (store-bought)";
  const tags = a.getByLabel(`Tags for ${name}`);
  await expect(tags).toHaveValue("");
  await a.getByRole("button", { name: `Mark ${name} reviewed` }).click();
  await expect.poll(async () => (await focused(a)).id).toBe("rv-pesto-tags");
  await expect(tags).toHaveAttribute("aria-invalid", "true");
  await expect(tags).toHaveAccessibleDescription(/no allergen tags apply/i);
  expect((await q<any>("SELECT allergen_info_known FROM ingredients WHERE key='pesto' AND household_id=$1", [fx.householdId]))[0].allergen_info_known).toBe(false);
  await a.getByRole("checkbox", { name: `No allergen tags apply to ${name}` }).check();
  await a.getByRole("button", { name: `Mark ${name} reviewed` }).click();
  await expect.poll(async () => (await q<any>("SELECT allergen_info_known, tags FROM ingredients WHERE key='pesto' AND household_id=$1", [fx.householdId]))[0]).toEqual({ allergen_info_known: true, tags: [] });
  await expect(a.getByRole("button", { name: `Mark ${name} reviewed` })).toHaveCount(0);
  await expect.poll(async () => (await focused(a)).isBody).toBe(false);
  await alex.context.close();
});

test("B17 Household at 320px with 150% text: no horizontal overflow, errors and the exclusion dialog included", async ({ browser }) => {
  const fx = await seed();
  await q("INSERT INTO exclusions(household_id, member_id, term, created_by) VALUES ($1,$2,'extraordinarily_long_ingredient_or_tag_name_for_wrapping',$3)", [fx.householdId, fx.members.alex, fx.members.alex]);
  const jon = await member(browser, "jon", { viewport: { width: 320, height: 800 } });
  const p = jon.page;
  await p.goto("/household");
  await expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await p.addStyleTag({ content: "html { font-size: 150% !important; }" });
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow(), "household at 320px/150%").toBeLessThanOrEqual(0);
  // With field errors showing.
  const form = p.getByTestId("settings");
  await form.getByLabel("Budget ($)").fill("1.234");
  await form.getByRole("button", { name: "Save household inputs" }).click();
  await expect(form.getByLabel("Budget ($)")).toHaveAttribute("aria-invalid", "true");
  await p.getByTestId("targets").getByLabel("Dinner calories (kcal)").fill("x");
  await p.getByTestId("targets").getByRole("button", { name: "Save dinner targets" }).click();
  await p.getByTestId("exclusions").getByRole("button", { name: "Add exclusion" }).click();
  await expect(p.getByTestId("exclusions").getByLabel("Exclusion", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(await overflow(), "household with errors at 320px/150%").toBeLessThanOrEqual(0);
  // Inside the removal dialog.
  await p.getByRole("button", { name: /^Remove exclusion extraordinarily_long/ }).click();
  const dialog = p.getByRole("dialog", { name: /^Remove the exclusion extraordinarily_long/ });
  await expect(dialog).toBeVisible();
  expect(await overflow(), "dialog at 320px/150%").toBeLessThanOrEqual(0);
  const inner = await dialog.evaluate((d) => {
    const over = [d, ...d.querySelectorAll<HTMLElement>("*")].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible");
    const r = d.getBoundingClientRect();
    return { over: over.length, left: r.left, right: r.right, width: window.innerWidth };
  });
  expect(inner.over).toBe(0);
  expect(inner.left).toBeGreaterThanOrEqual(0);
  expect(inner.right).toBeLessThanOrEqual(inner.width);
  for (const name of ["Keep it", "Remove exclusion"]) {
    const box = (await dialog.getByRole("button", { name, exact: true }).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  await jon.context.close();
});

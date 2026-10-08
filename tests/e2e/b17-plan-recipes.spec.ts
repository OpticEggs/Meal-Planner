/**
 * B17 — keyboard, focus and error pass over the recipe editor, the recipe lists, deferred-dinner
 * placement and Explore. Focus is read from document.activeElement after real key presses;
 * outcomes are checked in the database.
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

async function focused(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    return {
      id: a?.id ?? null, testid: a?.getAttribute("data-testid") ?? null, role: a?.getAttribute("role") ?? null,
      name: a?.getAttribute("aria-label") ?? a?.textContent?.trim().slice(0, 80) ?? null,
      inDialog: !!(dialog && a && dialog.contains(a)), isBody: a === document.body,
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
const recipeCount = async () => (await q("SELECT count(*)::int n FROM recipes"))[0];
const noNativeDialogs = (page: Page) => page.on("dialog", (d) => { throw new Error(`native ${d.type()} dialog: ${d.message()}`); });

test("B17 new recipe: a dialog with focus inside, per-row names, attached errors, row add/remove focus, and a discard guard", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon", { init: recordAnnouncements });
  const p = jon.page;
  noNativeDialogs(p);
  await p.getByRole("link", { name: "Our Recipes" }).click();
  const before = await recipeCount();
  const opener = p.getByTestId("new-recipe");
  await opener.focus();
  await p.keyboard.press("Enter");
  const dialog = p.getByRole("dialog", { name: "New recipe" });
  await expect(dialog).toBeVisible();
  expect(await focused(p)).toMatchObject({ id: "re-title", inDialog: true });
  for (const key of ["Tab", "Shift+Tab"]) for (let i = 0; i < 25; i++) {
    await p.keyboard.press(key);
    expect((await focused(p)).inDialog, `${key} #${i}`).toBe(true);
  }
  // Errors attached to the exact fields; the first invalid field takes focus; nothing saved.
  await dialog.getByRole("textbox", { name: "Ingredient 1 name" }).fill("Rice");
  await dialog.getByRole("textbox", { name: "Ingredient 1 amount" }).fill("lots");
  await dialog.getByRole("button", { name: "Save recipe" }).click();
  await expect.poll(async () => (await focused(p)).id).toBe("re-title");
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveAccessibleDescription("Give the recipe a title");
  await expect(dialog.getByRole("textbox", { name: "Ingredient 1 amount" })).toHaveAccessibleDescription("Amount must be a positive number");
  expect(await recipeCount()).toEqual(before);
  // Adding a row moves focus into it; its controls are named by position.
  await dialog.getByRole("button", { name: "add ingredient" }).click();
  expect((await focused(p)).name).toBe("Ingredient 2 name");
  await p.keyboard.type("Broccoli");
  await dialog.getByRole("textbox", { name: "Ingredient 2 amount" }).fill("100");
  // Removing a row moves focus to a survivor, never <body> (the lone survivor's own remove
  // button is disabled, so focus goes to its name field).
  await dialog.getByRole("button", { name: "add ingredient" }).click();
  await p.keyboard.type("Garlic");
  await dialog.getByRole("button", { name: "Remove ingredient 3 (Garlic, Main)" }).click();
  expect((await focused(p)).name).toMatch(/^Remove ingredient 2 \(Broccoli/);
  await dialog.getByRole("button", { name: "Remove ingredient 1 (Rice, Main)" }).click();
  expect((await focused(p)).name).toBe("Ingredient 1 name");
  await expect(dialog.getByRole("textbox", { name: "Ingredient 1 name" })).toHaveValue("Broccoli");
  // Escape with unsaved work asks first; "Keep editing" has focus; Escape again keeps editing.
  await p.keyboard.press("Escape");
  await expect(dialog.getByTestId("discard-confirm")).toBeVisible();
  expect((await focused(p)).name).toBe("Keep editing");
  await p.keyboard.press("Escape");
  await expect(dialog.getByTestId("discard-confirm")).toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "Ingredient 1 name" })).toHaveValue("Broccoli");
  // Focus returns to where it was before the confirmation, never <body>.
  await expect.poll(async () => (await focused(p)).name).toBe("Ingredient 1 name");
  expect((await focused(p)).isBody).toBe(false);
  // Removing a component moves its rows (even empty ones) to a remaining component.
  await dialog.getByRole("button", { name: "add component" }).click();
  await p.keyboard.type("Sauce");
  await dialog.getByRole("combobox", { name: "Ingredient 1 component" }).selectOption({ label: "Sauce" });
  await expect(dialog.getByRole("button", { name: /^Remove component 2 \(Sauce\)/ })).toBeDisabled(); // in use by a filled row
  await dialog.getByRole("combobox", { name: "Ingredient 1 component" }).selectOption({ label: "Main" });
  await dialog.getByRole("button", { name: "add ingredient" }).click();
  await dialog.getByRole("combobox", { name: "Ingredient 2 component" }).selectOption({ label: "Sauce" });
  await dialog.getByRole("button", { name: "Remove component 2 (Sauce)" }).click();
  await expect(dialog.getByRole("combobox", { name: "Ingredient 2 component" })).toHaveValue("main");
  await dialog.getByRole("button", { name: "Remove ingredient 2" }).click();
  // Save works and returns focus to the opener.
  await dialog.getByLabel("Title", { exact: true }).fill("Broccoli rice");
  await dialog.getByRole("button", { name: "Save recipe" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).testid).toBe("new-recipe");
  expect(await recipeCount()).toEqual({ n: before.n + 1 });
  await expect.poll(() => announced(p)).toContain("Recipe Broccoli rice saved.");
  // Discarding: open, type, Escape, Discard → nothing saved, focus back on the opener.
  await opener.click();
  await dialog.getByLabel("Title", { exact: true }).fill("Never mind");
  await p.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Discard changes" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(p)).testid).toBe("new-recipe");
  expect(await recipeCount()).toEqual({ n: before.n + 1 });
  // An untouched editor closes on Escape without asking.
  await opener.click();
  await p.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await jon.context.close();
});

for (const order of ["Jon saves first", "Alex saves first"] as const) {
  test(`B17 editing the same recipe: the second editor sees the new version, keeps typed work and focus, and saves on top only after review — ${order}`, async ({ browser }) => {
    const fx = await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    const recipeId = (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title='Fixture: Turkey chili'"))[0].id;
    for (const m of [jon, alex]) {
      await m.page.goto(`/recipes/${recipeId}`);
      await m.page.getByRole("button", { name: "Edit (new version)" }).click();
    }
    const [first, second] = order === "Jon saves first" ? [jon, alex] : [alex, jon];
    const firstName = order === "Jon saves first" ? "Jon" : "Alex";
    const d1 = first.page.getByRole("dialog", { name: "Edit Fixture: Turkey chili — new version" });
    const d2 = second.page.getByRole("dialog", { name: "Edit Fixture: Turkey chili — new version" });
    const title2 = d2.getByLabel("Title", { exact: true });
    await title2.fill("Turkey chili (second)");
    await title2.focus();
    await d1.getByLabel("Title", { exact: true }).fill("Turkey chili (first)");
    await d1.getByRole("button", { name: "Save new version" }).click();
    await expect(d1).toHaveCount(0);
    await expect(d2.getByTestId("recipe-conflict")).toContainText(`${firstName} saved version 2 (Turkey chili (first))`);
    // The conflict says what the other version changed, not only that it exists.
    await expect(d2.getByTestId("recipe-conflict-changes")).toContainText("Title: Fixture: Turkey chili → Turkey chili (first)");
    await expect(title2).toHaveValue("Turkey chili (second)");
    expect(await focused(second.page)).toMatchObject({ id: "re-title", inDialog: true });
    await expect(d2.getByRole("button", { name: "Save new version" })).toBeDisabled();
    await d2.getByRole("button", { name: "Keep my edits (I’ve reviewed version 2)" }).click();
    await d2.getByRole("button", { name: "Save new version" }).click();
    await expect(d2).toHaveCount(0);
    expect((await q<any>("SELECT version_no, title FROM recipe_versions WHERE recipe_id=$1 ORDER BY version_no", [recipeId])).map((v) => `${v.version_no}:${v.title}`))
      .toEqual(["1:Fixture: Turkey chili", "2:Turkey chili (first)", "3:Turkey chili (second)"]);
    void fx;
    await jon.context.close();
    await alex.context.close();
  });
}

test("B17 recipe lists: filter tabs are a real tablist; each row's controls are named by recipe; notes errors are attached", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Our Recipes" }).click();
  const all = p.getByRole("tab", { name: "All" });
  await all.focus();
  await p.keyboard.press("ArrowRight");
  await expect(p.getByRole("tab", { name: "My favorites" })).toHaveAttribute("aria-selected", "true");
  expect((await focused(p)).name).toBe("My favorites");
  await expect(p.getByRole("tabpanel", { name: "My favorites" })).toContainText("No favorites yet.");
  await p.keyboard.press("Home");
  await expect(all).toHaveAttribute("aria-selected", "true");
  // Distinct, stateful names per row.
  const fav = p.getByRole("button", { name: "Favorite Fixture: Turkey chili", exact: true });
  await expect(fav).toHaveAttribute("aria-pressed", "false");
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  // Notes: an empty note is an attached error, not a silent no-op.
  await p.getByRole("link", { name: "Fixture: Turkey chili" }).click();
  await p.getByRole("button", { name: "Save note" }).click();
  await expect(p.getByLabel("New note")).toHaveAccessibleDescription("Write the note first");
  expect((await focused(p)).id).toBe("new-note");
  await p.getByLabel("New note").fill("Double the beans");
  await p.getByRole("button", { name: "Save note" }).click();
  await expect(p.getByTestId("notes")).toContainText("Double the beans");
  await expect(p.getByLabel("New note")).not.toHaveAttribute("aria-invalid", "true");
  await jon.context.close();
});

test("B17 Explore and deferred dinners: distinct names, results reported, a placement preview takes focus", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Explore" }).click();
  const save = p.getByRole("button", { name: "Sounds good: Fixture: Pesto pasta" });
  await save.click();
  await expect(p.getByRole("button", { name: "In Sounds good: Fixture: Pesto pasta" })).toBeDisabled();
  await expect(p.getByRole("status").filter({ hasText: "Saved Fixture: Pesto pasta to Sounds good." })).toHaveCount(1);
  // Defer Friday's dinner with a backup, then place it back by keyboard.
  await p.getByRole("link", { name: "Week" }).click();
  await p.getByTestId("change-2026-10-16").click();
  const sheet = p.getByRole("dialog", { name: "Change Friday dinner" });
  await sheet.getByRole("tab", { name: "Backup" }).click();
  await sheet.getByTestId("option-Fixture: Chicken penne").click();
  await sheet.getByTestId("apply").click();
  await expect(sheet).toHaveCount(0);
  const place = p.getByRole("combobox", { name: "Place Fixture: Salmon rice bowls on a night" });
  await expect(place).toBeVisible();
  const options = await place.locator("option").allTextContents();
  await place.selectOption({ label: options.find((o) => o !== "Place on…")! });
  await p.getByRole("button", { name: "Preview placing Fixture: Salmon rice bowls" }).click();
  await expect.poll(async () => (await focused(p)).id ?? "").toMatch(/^preview-h-/);
  await expect(p.getByRole("region", { name: /^Preview · .* — draft, not applied$/ })).toBeVisible();
  void fx;
  await jon.context.close();
});

for (const width of [320, 390]) {
  test(`B17 recipe editor at ${width}px with 150% text: fits, no sideways scroll, controls hittable`, async ({ browser }) => {
    await seed();
    const jon = await member(browser, "jon", { viewport: { width, height: 640 }, reducedMotion: "reduce" });
    const p = jon.page;
    await p.getByRole("link", { name: "Our Recipes" }).click();
    await p.addStyleTag({ content: "html { font-size: 150% !important; }" });
    await p.getByTestId("new-recipe").click();
    const dialog = p.getByRole("dialog", { name: "New recipe" });
    const box = await dialog.evaluate((d) => ({ sw: d.scrollWidth, cw: d.clientWidth, right: d.getBoundingClientRect().right, vw: innerWidth, anim: getComputedStyle(d).animationName }));
    expect(box.sw).toBeLessThanOrEqual(box.cw);
    expect(box.right).toBeLessThanOrEqual(box.vw + 0.5);
    expect(box.anim).toBe("none");
    for (const name of ["Close the new recipe", "add ingredient", "Save recipe"]) {
      const el = dialog.getByRole("button", { name, exact: true });
      await el.scrollIntoViewIfNeeded();
      expect(await el.evaluate((b) => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) && r.right <= innerWidth; }), name).toBe(true);
    }
    expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await jon.context.close();
  });
}

test("B17 starting over from the other member's version replaces the draft with it and saves on top of it", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const recipeId = (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title='Fixture: Turkey chili'"))[0].id;
  for (const m of [jon, alex]) {
    await m.page.goto(`/recipes/${recipeId}`);
    await m.page.getByRole("button", { name: "Edit (new version)" }).click();
  }
  const dj = jon.page.getByRole("dialog", { name: "Edit Fixture: Turkey chili — new version" });
  const da = alex.page.getByRole("dialog", { name: "Edit Fixture: Turkey chili — new version" });
  // Alex adds an ingredient and saves; Jon had only changed the title.
  await da.getByRole("button", { name: "add ingredient" }).click();
  await alex.page.keyboard.type("Cumin");
  const n = await da.getByRole("group", { name: /^Ingredient \d+: Cumin$/ }).getAttribute("aria-label");
  const idx = n!.match(/Ingredient (\d+)/)![1];
  await da.getByRole("textbox", { name: `Ingredient ${idx} amount` }).fill("1");
  await da.getByRole("textbox", { name: `Ingredient ${idx} unit` }).fill("tsp");
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  await da.getByRole("button", { name: "Save new version" }).click();
  await expect(da).toHaveCount(0);
  await expect(dj.getByTestId("recipe-conflict-changes")).toContainText("Added Cumin 1 tsp");
  await dj.getByRole("button", { name: "Start over from version 2" }).click();
  await expect(dj.getByLabel("Title", { exact: true })).toHaveValue("Fixture: Turkey chili");
  await expect(dj.getByTestId("recipe-conflict")).toHaveCount(0);
  expect((await focused(jon.page)).id).toBe("re-title");
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  // Version 3 keeps Alex's cumin and carries Jon's title.
  const v3 = (await q<any>(
    `SELECT v.title, array_agg(ri.ingredient_key ORDER BY ri.ingredient_key) AS keys FROM recipe_versions v JOIN recipe_ingredients ri ON ri.recipe_version_id=v.id
     WHERE v.recipe_id=$1 AND v.version_no=3 GROUP BY v.title`, [recipeId]))[0];
  expect(v3.title).toBe("Jon's chili");
  expect(v3.keys).toContain("cumin");
  await jon.context.close();
  await alex.context.close();
});

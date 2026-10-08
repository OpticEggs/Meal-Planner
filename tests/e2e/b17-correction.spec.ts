/**
 * B17 correction (independent review of 7220679): RB17-01 and RB17-02 through two independently
 * signed-in browsers and real PostgreSQL. Each test asserts the CORRECT behavior; on 7220679 they
 * reproduce the reported gaps by failing.
 */
import { expect, test, type Page } from "@playwright/test";
import { member, q, seed } from "./helpers";

const CHILI = "Fixture: Turkey chili";
const dialogName = (title: string) => `Edit ${title} — new version`;

async function recipeIdOf(title: string) {
  return (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title=$1", [title]))[0].id as string;
}
async function focused(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    return { id: a?.id ?? null, name: a?.getAttribute("aria-label") ?? a?.textContent?.trim().slice(0, 80) ?? null, inDialog: !!(dialog && a && dialog.contains(a)), isBody: a === document.body };
  });
}
/** Saves a new version through the public command API (as another client would), starting from
 *  the current version and applying `patch` to its full payload. */
async function saveVia(page: Page, recipeId: string, patch: (d: any) => void) {
  return page.evaluate(
    async ({ recipeId, patchSrc }) => {
      const lib = await (await fetch("/api/library", { cache: "no-store" })).json();
      const r = lib.recipes.find((x: any) => x.recipeId === recipeId);
      const v = r.version;
      const d: any = {
        recipeId, expectedVersionNo: v.versionNo, title: v.title, cuisine: v.cuisine, summary: v.summary, sourceLabel: v.sourceLabel,
        effortMinutes: v.effortMinutes, effortLevel: v.effortLevel, leftoverFriendly: v.leftoverFriendly, instructions: v.instructions,
        reheatInstructions: v.reheatInstructions, components: v.components.map((c: any) => ({ key: c.key, name: c.name })),
        ingredients: v.ingredients.map((i: any) => ({ componentKey: i.componentKey, ingredientKey: i.ingredientKey, ingredientName: i.name, quantity: i.quantity, unit: i.unit, form: i.form, note: i.note })),
      };
      // eslint-disable-next-line no-new-func
      new Function("d", patchSrc)(d);
      const res = await fetch("/api/commands/SaveRecipeVersion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `t-${crypto.randomUUID()}`, payload: d }) });
      return res.json();
    },
    { recipeId, patchSrc: `(${patch.toString()})(d)` },
  );
}
const versionRow = async (recipeId: string, n: number) =>
  (await q<any>("SELECT * FROM recipe_versions WHERE recipe_id=$1 AND version_no=$2", [recipeId, n]))[0];
const ingredientRows = async (recipeId: string, n: number) =>
  q<any>(
    `SELECT ri.ingredient_key, ri.quantity::text AS quantity, ri.unit, ri.form, ri.note FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id
     WHERE v.recipe_id=$1 AND v.version_no=$2 ORDER BY ri.sort`,
    [recipeId, n],
  );

for (const order of ["Jon wins", "Alex wins"] as const) {
  test(`RB17-01: the other member's new steps and reheat text are shown and kept; only the title edit is applied — ${order}`, async ({ browser }) => {
    await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    const id = await recipeIdOf(CHILI);
    const [winner, loser, winnerName] = order === "Jon wins" ? [jon, alex, "Jon"] : [alex, jon, "Alex"];
    for (const m of [winner, loser]) {
      await m.page.goto(`/recipes/${id}`);
      await m.page.getByRole("button", { name: "Edit (new version)" }).click();
    }
    const dw = winner.page.getByRole("dialog", { name: dialogName(CHILI) });
    const dl = loser.page.getByRole("dialog", { name: dialogName(CHILI) });
    const loserTitle = dl.getByLabel("Title", { exact: true });
    await loserTitle.fill("Chili (title only)");
    await loserTitle.focus();
    await dw.getByLabel("Steps", { exact: true }).fill("Brown the turkey. Add beans. Simmer 40 minutes.");
    await dw.getByLabel("Reheat and serve", { exact: true }).fill("Reheat covered, stirring once.");
    await dw.getByRole("button", { name: "Save new version" }).click();
    await expect(dw).toHaveCount(0);
    // The loser sees WHAT changed, with the actual new text, and the draft now holds it.
    const note = dl.getByTestId("recipe-rebased");
    await expect(note).toContainText(`${winnerName} saved version 2`);
    await expect(note).toContainText("Brown the turkey. Add beans. Simmer 40 minutes.");
    await expect(note).toContainText("Reheat covered, stirring once.");
    await expect(dl.getByLabel("Steps", { exact: true })).toHaveValue("Brown the turkey. Add beans. Simmer 40 minutes.");
    await expect(dl.getByLabel("Reheat and serve", { exact: true })).toHaveValue("Reheat covered, stirring once.");
    await expect(loserTitle).toHaveValue("Chili (title only)");
    expect(await focused(loser.page)).toMatchObject({ id: "re-title", inDialog: true });
    await dl.getByRole("button", { name: "Save new version" }).click();
    await expect(dl).toHaveCount(0);
    const v3 = await versionRow(id, 3);
    expect([v3.title, v3.instructions, v3.reheat_instructions]).toEqual(["Chili (title only)", "Brown the turkey. Add beans. Simmer 40 minutes.", "Reheat covered, stirring once."]);
    await jon.context.close();
    await alex.context.close();
  });
}

test("RB17-01: fields the editor does not show (summary, source, ingredient form/note) changed by a newer version survive a title-only save", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByLabel("Title", { exact: true }).fill("Chili (Jon)");
  const r = await saveVia(alex.page, id, (d: any) => {
    d.summary = "Smoky weeknight chili";
    d.sourceLabel = "Alex's notebook";
    d.ingredients[0].form = "cooked";
    d.ingredients[0].note = "drained";
  });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
  const note = dj.getByTestId("recipe-rebased");
  await expect(note).toContainText("Smoky weeknight chili");
  await expect(note).toContainText("Alex's notebook");
  await expect(note).toContainText("cooked; drained");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  const v2 = await versionRow(id, 2);
  const v3 = await versionRow(id, 3);
  expect([v3.title, v3.summary, v3.source_label]).toEqual(["Chili (Jon)", v2.summary, v2.source_label]);
  expect(await ingredientRows(id, 3)).toEqual(await ingredientRows(id, 2));
  await jon.context.close();
  await alex.context.close();
});

for (const order of ["keep mine", "use theirs"] as const) {
  test(`RB17-01: when both changed the steps, both full texts are shown and nothing is chosen for the member — ${order}`, async ({ browser }) => {
    await seed();
    const jon = await member(browser, "jon");
    const alex = await member(browser, "alex");
    const id = await recipeIdOf(CHILI);
    await jon.page.goto(`/recipes/${id}`);
    await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
    const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
    await dj.getByLabel("Steps", { exact: true }).fill("Jon's method: slow cooker 6 hours.");
    expect((await saveVia(alex.page, id, (d: any) => { d.instructions = "Alex's method: stovetop 40 minutes."; })).status).toBe("accepted");
    const block = dj.getByTestId("recipe-conflict-instructions");
    await expect(block).toContainText("Alex's method: stovetop 40 minutes.");
    await expect(block).toContainText("Jon's method: slow cooker 6 hours.");
    await expect(dj.getByLabel("Steps", { exact: true })).toHaveValue("Jon's method: slow cooker 6 hours."); // not decided for him
    await expect(dj.getByRole("button", { name: "Save new version" })).toBeDisabled();
    await block.getByRole("button", { name: order === "keep mine" ? "Keep my Steps" : "Use version 2's Steps" }).click();
    await expect(block).toHaveCount(0);
    // Focus does not fall to <body> when the decision block disappears.
    const f = await focused(jon.page);
    expect(f.isBody).toBe(false);
    expect(f.inDialog).toBe(true);
    await dj.getByRole("button", { name: "Save new version" }).click();
    await expect(dj).toHaveCount(0);
    expect((await versionRow(id, 3)).instructions).toBe(order === "keep mine" ? "Jon's method: slow cooker 6 hours." : "Alex's method: stovetop 40 minutes.");
    await jon.context.close();
    await alex.context.close();
  });
}

test("RB17-01: a third version after the member's decision is brought in again before Save; a stale decision cannot authorize the save", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  expect((await saveVia(alex.page, id, (d: any) => { d.title = "Alex's chili"; })).status).toBe("accepted");
  await dj.getByTestId("recipe-conflict-title").getByRole("button", { name: "Keep my Title" }).click();
  // Version 3 arrives before Jon saves: new steps are brought in; his title decision still stands.
  expect((await saveVia(alex.page, id, (d: any) => { d.instructions = "Third version steps."; })).status).toBe("accepted");
  await expect(dj.getByTestId("recipe-rebased")).toContainText("Alex saved version 3");
  await expect(dj.getByLabel("Steps", { exact: true })).toHaveValue("Third version steps.");
  // Version 4 changes the title again: Jon must decide again.
  expect((await saveVia(alex.page, id, (d: any) => { d.title = "Alex's newest chili"; })).status).toBe("accepted");
  await expect(dj.getByTestId("recipe-conflict-title")).toContainText("Alex's newest chili");
  await expect(dj.getByRole("button", { name: "Save new version" })).toBeDisabled();
  await dj.getByTestId("recipe-conflict-title").getByRole("button", { name: "Keep my Title" }).click();
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  const v5 = await versionRow(id, 5);
  expect([v5.title, v5.instructions]).toEqual(["Jon's chili", "Third version steps."]);
  await jon.context.close();
  await alex.context.close();
});

test("RB17-02: two occurrences of one ingredient stay distinct; a change to the first is shown and both rows survive", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  // Version 2 lists turkey twice in the same component (10 g and 100 g).
  expect((await saveVia(jon.page, id, (d: any) => {
    const t = d.ingredients.find((i: any) => i.ingredientKey === "ground_turkey");
    d.ingredients = [{ ...t, quantity: "10", unit: "g", form: null, note: null }, { ...t, quantity: "100", unit: "g", form: null, note: null }, ...d.ingredients.filter((i: any) => i !== t)];
  })).status).toBe("accepted");
  await alex.page.goto(`/recipes/${id}`);
  await alex.page.getByRole("button", { name: "Edit (new version)" }).click();
  const title = (await versionRow(id, 2)).title;
  const da = alex.page.getByRole("dialog", { name: dialogName(title) });
  await da.getByLabel("Title", { exact: true }).fill("Chili (Alex)");
  // Jon changes only the FIRST occurrence.
  expect((await saveVia(jon.page, id, (d: any) => { d.ingredients[0].quantity = "20"; })).status).toBe("accepted");
  const note = da.getByTestId("recipe-rebased");
  await expect(note).toContainText("Removed Ground turkey 10 g");
  await expect(note).toContainText("Added Ground turkey 20 g");
  await expect(da.getByRole("textbox", { name: "Ingredient 1 amount" })).toHaveValue("20");
  await expect(da.getByRole("textbox", { name: "Ingredient 2 amount" })).toHaveValue("100");
  await da.getByRole("button", { name: "Save new version" }).click();
  await expect(da).toHaveCount(0);
  const rows = (await ingredientRows(id, 4)).filter((r) => r.ingredient_key === "ground_turkey");
  expect(rows.map((r) => [r.quantity, r.unit])).toEqual([["20", "g"], ["100", "g"]]);
  expect((await versionRow(id, 4)).title).toBe("Chili (Alex)");
  await jon.context.close();
  await alex.context.close();
});

test("RB17-01: 'Start over' in a conflict replaces the whole draft with the current version and moves focus to the title", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  expect((await saveVia(alex.page, id, (d: any) => { d.title = "Alex's chili"; })).status).toBe("accepted");
  await dj.getByRole("button", { name: "Start over from version 2 (discard all my edits)" }).click();
  await expect(dj.getByLabel("Title", { exact: true })).toHaveValue("Alex's chili");
  await expect(dj.getByTestId("recipe-conflict")).toHaveCount(0);
  await expect(dj.getByTestId("recipe-rebased")).toHaveCount(0); // starting over leaves nothing to report
  await expect.poll(async () => (await focused(jon.page)).id).toBe("re-title");
  await jon.context.close();
  await alex.context.close();
});

test("RB17-01: a field left undecided stays undecided when a later version changes something else; Save stays held", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  expect((await saveVia(alex.page, id, (d: any) => { d.title = "Alex's chili"; })).status).toBe("accepted");
  await expect(dj.getByTestId("recipe-conflict-title")).toContainText("Alex's chili");
  // Jon has not decided. Version 3 changes only the steps.
  expect((await saveVia(alex.page, id, (d: any) => { d.instructions = "Version three steps."; })).status).toBe("accepted");
  await expect(dj.getByTestId("recipe-rebased")).toContainText("Alex saved version 3");
  await expect(dj.getByLabel("Steps", { exact: true })).toHaveValue("Version three steps.");
  await expect(dj.getByTestId("recipe-conflict-title")).toContainText("Version 3 (current): Alex's chili");
  await expect(dj.getByTestId("recipe-conflict-title")).toContainText("Yours: Jon's chili");
  await expect(dj.getByRole("button", { name: "Save new version" })).toBeDisabled();
  expect((await q<any>("SELECT count(*)::int AS n FROM recipe_versions WHERE recipe_id=$1", [id]))[0].n).toBe(3);
  await dj.getByTestId("recipe-conflict-title").getByRole("button", { name: "Use version 3's Title" }).click();
  await expect.poll(async () => (await focused(jon.page)).id).toBe("re-save");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  const v4 = await versionRow(id, 4);
  expect([v4.title, v4.instructions]).toEqual(["Alex's chili", "Version three steps."]);
  await jon.context.close();
  await alex.context.close();
});

test("RB17-01/02: an ingredient conflict shows both full ingredient lists, including the other version's note, and saves the choice exactly", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByRole("textbox", { name: "Ingredient 1 amount" }).fill("150");
  expect((await saveVia(alex.page, id, (d: any) => { d.ingredients[0].note = "drained well"; })).status).toBe("accepted");
  const card = dj.getByTestId("recipe-conflict-ingredients");
  await expect(card).toContainText("Version 2 (current):");
  await expect(card).toContainText("drained well");
  await expect(card).toContainText(/Yours:[\s\S]*150/);
  await expect(dj.getByRole("button", { name: "Save new version" })).toBeDisabled();
  await card.getByRole("button", { name: "Use version 2's Ingredients" }).click();
  await expect(dj.getByRole("textbox", { name: "Ingredient 1 amount" })).not.toHaveValue("150");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  const v3 = await ingredientRows(id, 3);
  const v2 = await ingredientRows(id, 2);
  expect(v3).toEqual(v2);
  expect(v3[0].note).toBe("drained well");
  await jon.context.close();
  await alex.context.close();
});

test("RB17-01: focus stays on the ingredient field the member is on when a newer version's ingredients are brought in", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  const amount2 = dj.getByRole("textbox", { name: "Ingredient 2 amount" });
  await amount2.focus();
  const before = await amount2.getAttribute("id");
  expect((await saveVia(alex.page, id, (d: any) => { d.ingredients[0].quantity = "333"; })).status).toBe("accepted");
  await expect(dj.getByRole("textbox", { name: "Ingredient 1 amount" })).toHaveValue("333");
  const now = await focused(jon.page);
  expect([now.id, now.inDialog]).toEqual([before, true]);
  await jon.context.close();
  await alex.context.close();
});

test("RB17-01: the member's own save is never reported as the other member's version", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const id = await recipeIdOf(CHILI);
  await jon.page.goto(`/recipes/${id}`);
  await jon.page.evaluate(() => {
    (window as any).__said = [];
    const el = document.querySelector('[data-testid="announcer"]')!;
    new MutationObserver(() => (window as any).__said.push(el.textContent)).observe(el, { childList: true, subtree: true, characterData: true });
    new MutationObserver(() => { if (document.querySelector('[data-testid="recipe-rebased"]')) (window as any).__said.push("REBASED-PANEL"); }).observe(document.body, { childList: true, subtree: true });
  });
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  const dj = jon.page.getByRole("dialog", { name: dialogName(CHILI) });
  await dj.getByLabel("Title", { exact: true }).fill("Jon's chili");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  await expect.poll(() => jon.page.evaluate(() => (window as any).__said.join(" | "))).toContain("Saved version 2");
  const said: string[] = await jon.page.evaluate(() => (window as any).__said);
  expect(said.filter((t) => /while you were editing|REBASED-PANEL/.test(t ?? ""))).toEqual([]);
  await jon.context.close();
});

/**
 * B51 / D159 — a recipe version's original yield, recorded on the version (migration 018), through the real screens:
 * recording "makes 6" on an all-legacy recipe with no amount changed survives saving and reopening, and the overview,
 * catalog and selection default read it; a meal already selected keeps its own servings; correcting a known yield keeps
 * the amounts as written; the other member's yield change is brought into a title-only draft, and both changing it is a
 * conflict decided explicitly.
 */
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { member, q, seed } from "./helpers";

async function legacyRecipe(fx: any, title: string) {
  const recipeId = randomUUID();
  const versionId = randomUUID();
  await q("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, fx.householdId, fx.members.jon]);
  await q("INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,$3,1,$4,'','manual',false,$5)", [
    versionId, recipeId, fx.householdId, title, fx.members.jon,
  ]);
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [versionId]);
  for (const [i, [k, qty, unit]] of [["onion", "0.6667", "each"], ["frozen_peas", "0.3333", "cup"]].entries()) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k.replace("_", " ")]);
    // As the release before migration 015 wrote them: legacy rows.
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main',$2,$3,$4,$5)", [versionId, k, qty, unit, i]);
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
  return { recipeId, versionId };
}
const rows = (recipeId: string, versionNo: number) =>
  q<any>(
    `SELECT ri.ingredient_key AS key, ri.quantity::text AS q, ri.quantity_basis AS basis, ri.exact_amount AS amount, ri.exact_servings AS servings
       FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.recipe_id=$1 AND v.version_no=$2 ORDER BY ri.sort`,
    [recipeId, versionNo],
  );
const yieldOf = async (recipeId: string, versionNo: number) =>
  (await q<any>("SELECT servings FROM recipe_versions WHERE recipe_id=$1 AND version_no=$2", [recipeId, versionNo]))[0]?.servings ?? null;
async function openEditor(page: any, recipeId: string) {
  await page.goto(`/recipes/${recipeId}`);
  await page.getByTestId("recipe-more").click();
  await page.getByRole("button", { name: "Edit recipe" }).click();
  return page.getByRole("dialog", { name: /^Edit .* — new version$/ });
}

test("B51-E1: 'makes 6' on an all-legacy recipe, no amount changed — saved, reopened and read everywhere; an existing selection keeps its servings", async ({ browser }) => {
  const fx = await seed();
  const old = await legacyRecipe(fx, "Old onion salad");
  const jon = await member(browser, "jon");
  const p = jon.page;
  // Selected before the yield is known (default 2) — and it stays 2.
  await p.goto(`/recipes/${old.recipeId}`);
  await expect(p.getByTestId("recipe-yield")).toHaveText("Original yield not recorded");
  await p.getByTestId("add-to-selected").getByRole("button", { name: /^Add / }).click();
  await expect.poll(async () => (await q<any>("SELECT servings FROM selected_meals WHERE recipe_id=$1 AND status='active'", [old.recipeId]))[0]?.servings).toBe(2);

  let d = await openEditor(p, old.recipeId);
  await d.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("6");
  await d.getByRole("button", { name: "Save new version" }).click();
  await expect(d).toHaveCount(0);
  expect(await yieldOf(old.recipeId, 2)).toBe(6);
  expect(await rows(old.recipeId, 2)).toEqual(await rows(old.recipeId, 1)); // every row unchanged, still legacy
  expect((await rows(old.recipeId, 2)).every((r: any) => r.basis === "legacy")).toBe(true);

  // Reopened: the editor, the overview, the catalog and a new selection's default all read 6.
  await expect(p.getByTestId("recipe-yield")).toHaveText("Makes 6");
  d = await openEditor(p, old.recipeId);
  await expect(d.getByRole("textbox", { name: "Servings the whole recipe makes" })).toHaveValue("6");
  await expect(d.getByTestId("editor-yield-unknown")).toHaveCount(0);
  await p.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await p.getByRole("link", { name: "Recipes", exact: true }).click();
  await expect(p.locator(`[data-testid="recipe-row"][data-title="Old onion salad"]`)).toContainText("makes 6");
  // The meal selected before keeps its 2 servings and its version.
  const [m] = await q<any>("SELECT servings, recipe_version_id FROM selected_meals WHERE recipe_id=$1 AND status='active'", [old.recipeId]);
  expect(m).toEqual({ servings: 2, recipe_version_id: old.versionId });
  // A recipe not selected yet starts at its recorded yield (the overview's stepper).
  const other = await legacyRecipe(fx, "Old pea soup");
  await p.goto(`/recipes/${other.recipeId}`);
  await expect(p.getByTestId("add-to-selected").getByTestId("servings-value")).toHaveText("2"); // not recorded: the D141 default
  d = await openEditor(p, other.recipeId);
  await d.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("6");
  await d.getByRole("button", { name: "Save new version" }).click();
  await expect(d).toHaveCount(0);
  await p.goto(`/recipes/${other.recipeId}`);
  await expect(p.getByTestId("add-to-selected").getByTestId("servings-value")).toHaveText("6");
  await jon.context.close();
});

test("B51-E2: correcting a known yield keeps the amounts as written — nothing is scaled", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Recipes", exact: true }).click();
  await p.getByTestId("add-recipe").click();
  await p.getByTestId("new-recipe").click();
  let d = p.getByRole("dialog", { name: "New recipe" });
  await d.getByLabel("Title", { exact: true }).fill("Lemon rice");
  await d.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("4");
  await d.getByRole("textbox", { name: "Ingredient 1 name" }).fill("lemon");
  await d.getByRole("textbox", { name: "Ingredient 1 amount for the whole recipe" }).fill("1/2");
  await d.getByRole("textbox", { name: "Ingredient 1 unit" }).fill("each");
  await d.getByRole("button", { name: "Save recipe" }).click();
  await expect(d).toHaveCount(0);
  const recipeId = (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title='Lemon rice'"))[0].id;
  expect(await yieldOf(recipeId, 1)).toBe(4);
  d = await openEditor(p, recipeId);
  await d.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("6");
  await expect(d.getByTestId("editor-yield-correction")).toContainText("The recipe made 4. The amounts below stay as written");
  await expect(d.getByRole("textbox", { name: "Ingredient 1 amount for the whole recipe" })).toHaveValue("1/2");
  await d.getByRole("button", { name: "Save new version" }).click();
  await expect(d).toHaveCount(0);
  expect(await yieldOf(recipeId, 2)).toBe(6);
  expect(await rows(recipeId, 2)).toEqual([{ key: "lemon", q: "0.083333333333", basis: "exact", amount: "1/2", servings: 6 }]);
  await jon.context.close();
});

test("B51-E3: the other member's recorded yield comes into a title-only draft; both changing it is decided explicitly", async ({ browser }) => {
  const fx = await seed();
  const old = await legacyRecipe(fx, "Old onion salad");
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  const dj = await openEditor(jon.page, old.recipeId);
  const da = await openEditor(alex.page, old.recipeId);
  await dj.getByLabel("Title", { exact: true }).fill("Onion salad (Jon)");
  await da.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("6");
  await da.getByRole("button", { name: "Save new version" }).click();
  await expect(da).toHaveCount(0);
  await jon.page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(dj.getByTestId("recipe-rebased")).toContainText("Alex saved version 2");
  await expect(dj.getByTestId("recipe-conflict")).toHaveCount(0);
  await expect(dj.getByRole("textbox", { name: "Servings the whole recipe makes" })).toHaveValue("6");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  expect(await yieldOf(old.recipeId, 3)).toBe(6);
  expect((await q<any>("SELECT title FROM recipe_versions WHERE recipe_id=$1 AND version_no=3", [old.recipeId]))[0].title).toBe("Onion salad (Jon)");
  expect(await rows(old.recipeId, 3)).toEqual(await rows(old.recipeId, 1));

  // Both change the yield: nothing is chosen for Jon.
  const dj2 = await openEditor(jon.page, old.recipeId);
  const da2 = await openEditor(alex.page, old.recipeId);
  await dj2.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("4");
  await da2.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("8");
  await da2.getByRole("button", { name: "Save new version" }).click();
  await expect(da2).toHaveCount(0);
  await jon.page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const card = dj2.getByTestId("recipe-conflict-ingredients");
  await expect(card).toContainText("makes 8 servings");
  await expect(card).toContainText("makes 4 servings");
  await expect(dj2.getByRole("button", { name: "Save new version" })).toBeDisabled();
  await card.getByRole("button", { name: /^Use version 4's Ingredients/ }).click();
  await expect(dj2.getByRole("textbox", { name: "Servings the whole recipe makes" })).toHaveValue("8");
  await dj2.getByRole("button", { name: "Save new version" }).click();
  await expect(dj2).toHaveCount(0);
  expect(await yieldOf(old.recipeId, 5)).toBe(8);
  await jon.context.close();
  await alex.context.close();
});

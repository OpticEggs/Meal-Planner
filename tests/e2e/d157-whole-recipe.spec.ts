/**
 * D157 — whole-recipe entry in the recipe editor (2026-10-14). A recipe is typed as the recipe gives it: what it
 * makes, and each ingredient's amount for the whole recipe ("1/2" lemon, "5" tomatoes). No unit is assumed for a new
 * row. Reopening shows the same amounts and yield; editing one amount of a recipe keeps its yield and its other rows
 * exactly. Rows saved for different servings are named, not guessed between.
 */
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { member, openAddRecipe, q, seed } from "./helpers";

const rowsOf = (recipeId: string, versionNo: number) =>
  q<any>(
    `SELECT ri.ingredient_key AS key, ri.quantity::text AS q, ri.unit, ri.quantity_basis AS basis, ri.exact_amount AS amount, ri.exact_servings AS servings
       FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.recipe_id=$1 AND v.version_no=$2 ORDER BY ri.sort`,
    [recipeId, versionNo],
  );

test("D157-E1: a new recipe typed as written — makes 4, ½ lemon, 5 tomatoes — no unit assumed; reopened as typed; one edit keeps the yield", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const p = jon.page;
  await p.getByRole("link", { name: "Recipes", exact: true }).click();
  await openAddRecipe(p);
  await p.getByTestId("new-recipe").click();
  const d = p.getByRole("dialog", { name: "New recipe" });
  await d.getByLabel("Title", { exact: true }).fill("Lemon tomatoes");
  await expect(d.getByRole("textbox", { name: "Ingredient 1 unit" })).toHaveValue(""); // no grams default
  await d.getByRole("textbox", { name: "Ingredient 1 name" }).fill("lemon");
  await d.getByRole("textbox", { name: "Ingredient 1 amount for the whole recipe" }).fill("1/2");
  await d.getByRole("button", { name: "Save recipe" }).click();
  // Nothing invented: the servings and the unit are asked for, attached to their fields.
  await expect(d.getByRole("textbox", { name: "Servings the whole recipe makes" })).toBeFocused();
  await expect(d.getByRole("textbox", { name: "Servings the whole recipe makes" })).toHaveAccessibleDescription(/how many servings the whole recipe makes/);
  await expect(d.getByRole("textbox", { name: "Ingredient 1 unit" })).toHaveAccessibleDescription(/Give a unit/);
  await d.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("4");
  await d.getByRole("textbox", { name: "Ingredient 1 unit" }).fill("each");
  await d.getByRole("button", { name: "add ingredient" }).click();
  await p.keyboard.type("Campari tomatoes");
  await d.getByRole("textbox", { name: "Ingredient 2 amount for the whole recipe" }).fill("5");
  await d.getByRole("textbox", { name: "Ingredient 2 unit" }).fill("each");
  await d.getByRole("button", { name: "Save recipe" }).click();
  await expect(d).toHaveCount(0);
  const recipeId = (await q<any>("SELECT r.id FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE v.title='Lemon tomatoes'"))[0].id;
  expect(await rowsOf(recipeId, 1)).toEqual([
    { key: "lemon", q: "0.125", unit: "each", basis: "exact", amount: "1/2", servings: 4 },
    { key: "campari_tomatoes", q: "1.25", unit: "each", basis: "exact", amount: "5", servings: 4 },
  ]);

  // Reopened: the yield and the amounts as typed. Correct one amount; the other row and the yield are kept.
  await p.goto(`/recipes/${recipeId}`);
  await p.getByTestId("recipe-more").click();
  await p.getByRole("button", { name: "Edit recipe" }).click();
  const e = p.getByRole("dialog", { name: "Edit Lemon tomatoes — new version" });
  await expect(e.getByRole("textbox", { name: "Servings the whole recipe makes" })).toHaveValue("4");
  await expect(e.getByRole("textbox", { name: "Ingredient 1 amount for the whole recipe" })).toHaveValue("1/2");
  await expect(e.getByRole("textbox", { name: "Ingredient 2 amount for the whole recipe" })).toHaveValue("5");
  await e.getByRole("textbox", { name: "Ingredient 2 amount for the whole recipe" }).fill("6");
  await e.getByRole("button", { name: "Save new version" }).click();
  await expect(e).toHaveCount(0);
  expect(await rowsOf(recipeId, 2)).toEqual([
    { key: "lemon", q: "0.125", unit: "each", basis: "exact", amount: "1/2", servings: 4 },
    { key: "campari_tomatoes", q: "1.5", unit: "each", basis: "exact", amount: "6", servings: 4 },
  ]);
  await jon.context.close();
});

test("D157-E2: rows an earlier editor saved for different servings are named; the member's stated yield shows them and becomes the one yield, nothing is guessed", async ({ browser }) => {
  const fx = await seed();
  const recipeId = randomUUID();
  const versionId = randomUUID();
  await q("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, fx.householdId, fx.members.jon]);
  await q("INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,$3,1,'Mixed brisket','','manual',false,$4)", [
    versionId, recipeId, fx.householdId, fx.members.jon,
  ]);
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [versionId]);
  // An import for 8 (3 lb brisket), and a broth row an earlier editor saved per ONE serving (0.25 cup).
  for (const [i, [k, qty, unit, amount, servings]] of ([["beef_brisket", "0.375", "lb", "3", 8], ["beef_broth", "0.25", "cup", "1/4", 1]] as const).entries()) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k.replace("_", " ")]);
    await q(
      "INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort, quantity_basis, exact_amount, exact_servings) VALUES ($1,'main',$2,$3,$4,$5,'exact',$6,$7)",
      [versionId, k, qty, unit, i, amount, servings],
    );
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
  const jon = await member(browser, "jon");
  await jon.page.goto(`/recipes/${recipeId}`);
  await jon.page.getByTestId("recipe-more").click();
  await jon.page.getByRole("button", { name: "Edit recipe" }).click();
  const d = jon.page.getByRole("dialog", { name: "Edit Mixed brisket — new version" });
  await expect(d.getByTestId("editor-yield-conflict")).toContainText("different servings (1 and 8)");
  await expect(d.getByRole("textbox", { name: "Servings the whole recipe makes" })).toHaveValue("");
  await d.getByRole("textbox", { name: "Servings the whole recipe makes" }).fill("8");
  await expect(d.getByRole("textbox", { name: "Ingredient 1 amount for the whole recipe" })).toHaveValue("3");
  await expect(d.getByRole("textbox", { name: "Ingredient 2 amount for the whole recipe" })).toHaveValue("2"); // ¼ cup a serving × 8
  await d.getByRole("button", { name: "Save new version" }).click();
  await expect(d).toHaveCount(0);
  // Both rows keep their per-serving amounts exactly; the broth is now recorded for the recipe of 8, so the recipe
  // has one yield again.
  expect(await rowsOf(recipeId, 2)).toEqual([
    { key: "beef_brisket", q: "0.375", unit: "lb", basis: "exact", amount: "3", servings: 8 },
    { key: "beef_broth", q: "0.25", unit: "cup", basis: "exact", amount: "2", servings: 8 },
  ]);
  await jon.context.close();
});

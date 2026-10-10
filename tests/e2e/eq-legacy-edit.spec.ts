/**
 * Exact quantities (EQ, 2026-10-10) through the real recipe editor: editing an OLD recipe — one whose rows were
 * saved before exact quantities, so they are legacy approximations — must not relabel those rows as exact when
 * only the title changes; an amount the member actually changes is that member's exact amount. The version the
 * accepted dinner uses is never touched.
 */
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { member, q, seed } from "./helpers";

async function legacyRecipe(fx: any) {
  const recipeId = randomUUID();
  const versionId = randomUUID();
  await q("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, fx.householdId, fx.members.jon]);
  await q("INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,$3,1,'Old onion salad','','manual',false,$4)", [
    versionId, recipeId, fx.householdId, fx.members.jon,
  ]);
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [versionId]);
  for (const [i, [k, qty, unit]] of [["onion", "0.6667", "each"], ["frozen_peas", "0.3333", "cup"]].entries()) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k.replace("_", " ")]);
    // As the release before migration 015 wrote it: no basis given → legacy.
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main',$2,$3,$4,$5)", [versionId, k, qty, unit, i]);
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
  return { recipeId, versionId };
}
const rows = (recipeId: string, versionNo: number) =>
  q<any>(
    `SELECT ri.ingredient_key AS key, ri.quantity::text AS q, ri.quantity_basis AS basis, ri.exact_amount AS amount, ri.exact_servings AS servings
       FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.recipe_id=$1 AND v.version_no=$2 ORDER BY 1`,
    [recipeId, versionNo],
  );

test("EQ-E1: a title-only edit of an old recipe keeps its rounded amounts labelled legacy; a changed amount is saved exact", async ({ browser }) => {
  const fx = await seed();
  const old = await legacyRecipe(fx);
  const jon = await member(browser, "jon");
  await jon.page.goto(`/recipes/${old.recipeId}`);
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  let d = jon.page.getByRole("dialog", { name: "Edit Old onion salad — new version" });
  await d.getByLabel("Title", { exact: true }).fill("Old onion salad (ours)");
  await d.getByRole("button", { name: "Save new version" }).click();
  await expect(d).toHaveCount(0);
  expect(await rows(old.recipeId, 2)).toEqual([
    { key: "frozen_peas", q: "0.3333", basis: "legacy", amount: null, servings: null },
    { key: "onion", q: "0.6667", basis: "legacy", amount: null, servings: null },
  ]);
  // Now the member changes one amount: that amount is theirs, exact; the untouched row stays legacy.
  await jon.page.getByRole("button", { name: "Edit (new version)" }).click();
  d = jon.page.getByRole("dialog", { name: "Edit Old onion salad (ours) — new version" });
  const onion = d.getByRole("group", { name: /^Ingredient \d+: onion$/ });
  await onion.getByRole("textbox", { name: /amount$/ }).fill("0.5");
  await d.getByRole("button", { name: "Save new version" }).click();
  await expect(d).toHaveCount(0);
  expect(await rows(old.recipeId, 3)).toEqual([
    { key: "frozen_peas", q: "0.3333", basis: "legacy", amount: null, servings: null },
    { key: "onion", q: "0.5", basis: "exact", amount: "1/2", servings: 1 },
  ]);
  expect(await rows(old.recipeId, 1)).toEqual([
    { key: "frozen_peas", q: "0.3333", basis: "legacy", amount: null, servings: null },
    { key: "onion", q: "0.6667", basis: "legacy", amount: null, servings: null },
  ]);
  await jon.context.close();
});

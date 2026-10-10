/**
 * EQR (2026-10-10), two members in two browsers, real server and PostgreSQL.
 *
 * EQR-E1  Jon edits an old recipe while Alex saves a new version of it; Jon's draft is brought up to Alex's
 *         version and saved. The amount Jon changed is his exact amount; the row he did not touch keeps ITS
 *         legacy basis through the rebase — even though both now show the same number.
 * EQR-E2  Alex says "Have enough" for exactly 3 cucumbers; Jon's later change makes the week need 3.0004 — still
 *         shown as 3. Alex's confirmation does not stretch to it: the line asks again and one is to be bought.
 */
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { member, q, seed } from "./helpers";

async function api(page: Page, name: string, payload: unknown) {
  return page.evaluate(async ({ name, payload, id }) => {
    const res = await fetch(`/api/commands/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: id, payload }) });
    return { status: res.status, body: await res.json() };
  }, { name, payload, id: `e2e-${randomUUID()}` });
}

test("EQR-E1: across a rebase onto the other member's version, an untouched row keeps its own legacy basis; the changed one is exact", async ({ browser }) => {
  const fx = await seed();
  const recipeId = randomUUID();
  const versionId = randomUUID();
  await q("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, fx.householdId, fx.members.jon]);
  await q("INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,$3,1,'Old salad','','manual',false,$4)", [
    versionId, recipeId, fx.householdId, fx.members.jon,
  ]);
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [versionId]);
  for (const [i, [k, qty]] of [["cucumber", "1"], ["onion", "0.5"]].entries()) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$2) ON CONFLICT DO NOTHING", [fx.householdId, k]);
    // As the release before migration 015 wrote them: legacy rows.
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main',$2,$3,'each',$4)", [versionId, k, qty, i]);
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  for (const m of [jon, alex]) {
    await m.page.goto(`/recipes/${recipeId}`);
    await m.page.getByRole("button", { name: "Edit (new version)" }).click();
  }
  const dj = jon.page.getByRole("dialog", { name: "Edit Old salad — new version" });
  const da = alex.page.getByRole("dialog", { name: "Edit Old salad — new version" });
  // Jon changes the cucumber to 0.5 — the same number the onion already has.
  await dj.getByRole("group", { name: /^Ingredient \d+: cucumber$/i }).getByRole("textbox", { name: /amount$/ }).fill("0.5");
  // Alex renames the recipe and saves version 2 first.
  await da.getByLabel("Title", { exact: true }).fill("Old salad (Alex)");
  await da.getByRole("button", { name: "Save new version" }).click();
  await expect(da).toHaveCount(0);
  await jon.page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(dj.getByTestId("recipe-rebased")).toContainText("Alex saved version 2");
  await dj.getByRole("button", { name: "Save new version" }).click();
  await expect(dj).toHaveCount(0);
  const v3 = await q<any>(
    `SELECT ri.ingredient_key AS key, ri.quantity::text AS q, ri.quantity_basis AS basis, ri.exact_amount AS amount, v.title
       FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.recipe_id=$1 AND v.version_no=3 ORDER BY ri.sort`,
    [recipeId],
  );
  expect(v3).toEqual([
    { key: "cucumber", q: "0.5", basis: "exact", amount: "1/2", title: "Old salad (Alex)" },
    { key: "onion", q: "0.5", basis: "legacy", amount: null, title: "Old salad (Alex)" },
  ]);
  await jon.context.close();
  await alex.context.close();
});

test("EQR-E2: Alex's 'Have enough' for exactly 3 does not cover Jon's later 3.0004 that still shows as 3", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const alex = await member(browser, "alex");
  // Friday: a bowl with 1 cucumber a plate (2 plates) → with the rest of the week, exactly 3.
  const bowls = await api(jon.page, "SaveRecipeVersion", {
    title: "Cucumber bowls", instructions: "", components: [{ key: "main", name: "Main" }],
    ingredients: [{ componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "1", unit: "each" }],
  });
  expect(bowls.status, JSON.stringify(bowls.body)).toBe(200);
  const onNight = async (assignmentId: string, versionId: string) => {
    const p = await api(jon.page, "CreatePreview", { weekId: fx.weekId, operation: { type: "replace", assignmentId, recipeVersionId: versionId } });
    expect(p.status, JSON.stringify(p.body)).toBe(200);
    const a = await api(jon.page, "ApplyPlanChange", { previewId: String(p.body.result.previewId), reviewedHash: String(p.body.result.contentHash) });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
  };
  await onNight(fx.assignments.fri, bowls.body.result.versionId);
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  const cuc = alex.page.getByTestId("line-cucumber");
  await expect(cuc).toBeVisible();
  // Alex's screen must show today's line (3 to buy) before she vouches for it — not the week before Jon's change.
  await alex.page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(cuc).toHaveAttribute("data-to-send", "3", { timeout: 15_000 });
  const seen = (await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.ingredient_key='cucumber'", [fx.weekId]))[0].line;
  expect([seen.meal.quantity, seen.meal.rational]).toEqual(["3", "3"]);
  await cuc.getByRole("button", { name: "Have enough" }).click();
  await expect(cuc).toContainText("Alex: Have enough");
  await expect(cuc).toHaveAttribute("data-to-send", "0", { timeout: 15_000 });
  // Jon adds a garnish on Thursday: 0.0002 a plate × 2 plates — the week now needs 3.0004, shown as 3.
  const garnish = await api(jon.page, "SaveRecipeVersion", {
    title: "Cucumber garnish", instructions: "", components: [{ key: "main", name: "Main" }],
    ingredients: [{ componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.0002", unit: "each" }],
  });
  await onNight(fx.assignments.thu, garnish.body.result.versionId);
  await alex.page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(cuc).toContainText(/increased since Alex said "Have enough"/, { timeout: 15_000 });
  await expect(cuc).toHaveAttribute("data-to-send", "1", { timeout: 15_000 });
  const now = (await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.ingredient_key='cucumber'", [fx.weekId]))[0].line;
  expect([now.meal.quantity, now.meal.rational, now.packagesForMeal]).toEqual(["3", "7501/2500", 1]);
  // What Alex certified is stored exactly: the requirement she reviewed (3), bound to that line as it was.
  expect((await q<any>("SELECT reviewed_exact, reviewed_binding FROM availability_observations WHERE ingredient_key='cucumber'"))[0]).toEqual({ reviewed_exact: "3", reviewed_binding: "current_requirement" });
  await jon.context.close();
  await alex.context.close();
});

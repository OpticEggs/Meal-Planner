/**
 * Catalog-first day-free selection (CATALOG-FIRST-PLAN §0; D140–D143) against real PostgreSQL (table_test).
 * Scope: a meal list's grocery cycle holds its selected meals only; calendar dinners never enter it (and vice versa).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { fresh, line, op, protectedState, q, retailerCalls } from "./helpers";
import { CUP, imported, legacyRecipe } from "./eq-helpers";
import * as ml from "@/server/commands/meal-lists";
import { addProductCommand, approvePurchaseLinesCommand, recordAvailabilityCommand } from "@/server/commands/groceries";
import { createPreviewCommand } from "@/server/commands/plan";
import { startHandoff } from "@/server/commands/purchasing";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";

let fx: any, jon: Actor, alex: Actor;
beforeEach(async () => {
  ({ fx, jon, alex } = await fresh());
});

const ok = (r: any) => {
  expect(r.status, JSON.stringify(r)).toBe("accepted");
  return r.result;
};
async function add(actor: Actor, recipe: { recipeId: string; versionId: string }, servings: number) {
  return ok(await ml.addSelectedMealCommand(actor, op(), { recipeId: recipe.recipeId, versionId: recipe.versionId, servings }));
}
const listWeek = async () => (await q<any>("SELECT week_id FROM meal_lists WHERE household_id=$1 AND status='open'", [fx.householdId]))[0]?.week_id as string;
const meal = async (id: string) => (await q<any>("SELECT * FROM selected_meals WHERE id=$1", [id]))[0];
const summary = async (weekId: string) => (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;

describe("CF-S scope: selected meals and calendar dinners never share a grocery list", () => {
  it("CF-S1 a list's undated cycle holds only its selections; the calendar week and its list are untouched", async () => {
    const before = await protectedState(fx.weekId);
    // The fixture's calendar has Fixture: Chicken & rice on Wednesday; select the same recipe in the list.
    const rec = fx.recipes.chicken_rice;
    const { selectedMealId, weekId } = await add(jon, rec, 2);
    const w = (await q<any>("SELECT kind, week_start, accepted_choice_revision FROM weeks WHERE id=$1", [weekId]))[0];
    expect(w).toEqual({ kind: "meal_list", week_start: null, accepted_choice_revision: 0 });
    // Calendar week: every accepted fact and requirement unchanged (no dinner date invented, nothing moved).
    expect(await protectedState(fx.weekId)).toEqual(before);
    // List lines come only from the selected meal: every source is that meal, none has a night or an event.
    const lines = await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]);
    expect(lines.length).toBeGreaterThan(0);
    for (const { line: l } of lines) for (const s of l.meal?.sources ?? []) expect(s).toMatchObject({ selectedMealId, eventId: null, cookNight: null });
    // A purchasing input change recomputes EVERY cycle: the calendar week still gets no selected meal, the list no dinner.
    ok(await addProductCommand(jon, op(), { weekId, ingredientKey: "rice", name: "Rice, 2 lb", packageQty: "907", packageUnit: "g", priceMinor: 299 }));
    for (const { line: l } of await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]))
      for (const s of l.meal?.sources ?? []) expect(s).toMatchObject({ selectedMealId, eventId: null, cookNight: null });
    // Calendar lines never name a selected meal.
    const cal = await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [fx.weekId]);
    for (const { line: l } of cal) for (const s of l.meal?.sources ?? []) expect(s.selectedMealId).toBeUndefined();
  });

  it("CF-S2 calendar facts are refused on a meal list's week (command and database)", async () => {
    const { weekId } = await add(jon, fx.recipes.salmon, 2);
    const p: any = await createPreviewCommand(jon, op(), { weekId, operation: { type: "replace", assignmentId: fx.assignments.mon, recipeVersionId: fx.recipes.salmon.versionId } });
    expect(p.status).toBe("rejected");
    await expect(
      q("INSERT INTO cooking_events(week_id, household_id, recipe_version_id, status, cook_night) VALUES ($1,$2,$3,'scheduled','2026-10-14')", [weekId, fx.householdId, fx.recipes.salmon.versionId]),
    ).rejects.toThrow(/calendar weeks only/);
    await expect(q("INSERT INTO meal_lists(household_id, week_id, opened_by) VALUES ($1,$2,$3)", [fx.householdId, fx.weekId, fx.members.jon])).rejects.toThrow(/undated week/);
  });

  it("CF-S3 the list is not tied to a date: it stays open and the same until a member starts a new list", async () => {
    const a = await add(jon, fx.recipes.salmon, 2);
    const b = await add(alex, fx.recipes.penne, 3);
    expect(b.listId).toBe(a.listId);
    const [l] = await q<any>("SELECT * FROM meal_lists WHERE id=$1", [a.listId]);
    const stale: any = await ml.startNewMealListCommand(jon, op(), { listId: a.listId, expectedRevision: l.revision - 1 });
    expect(stale.code).toBe("stale_selection");
    ok(await ml.startNewMealListCommand(jon, op(), { listId: a.listId, expectedRevision: l.revision }));
    const c = await add(alex, fx.recipes.salmon, 2);
    expect(c.listId).not.toBe(a.listId);
    expect(c.weekId).not.toBe(a.weekId);
    // The closed list keeps its meals and its own cycle (history), the new one starts empty but for this meal.
    expect((await q<any>("SELECT count(*)::int n FROM selected_meals WHERE list_id=$1 AND status='active'", [a.listId]))[0].n).toBe(2);
    expect((await q<any>("SELECT count(*)::int n FROM selected_meals WHERE list_id=$1 AND status='active'", [c.listId]))[0].n).toBe(1);
  });
});

describe("CF-Q quantities: combined before package rounding, exact, existing supply subtracted", () => {
  async function milkMeals() {
    const a = await imported(jon, "Milk Rice Pudding", 4, "3 cups milk\n1 cup rice");
    const b = await imported(jon, "Milk Pancakes", 2, "2 cups milk\n1 cup flour");
    const ma = await add(jon, a, 4);
    const mb = await add(alex, b, 2);
    return { a, b, ma, mb, weekId: ma.weekId as string };
  }

  it("CF-Q1 3 cups + 2 cups of milk with an 8-cup package needs ONE package; Have enough for 5 cups makes it zero", async () => {
    const { weekId } = await milkMeals();
    ok(await addProductCommand(jon, op(), { weekId, ingredientKey: "milk", name: "Milk, half gallon", packageQty: "8", packageUnit: "cup", priceMinor: 399 }));
    let l = await line(weekId, "milk");
    expect(l.meal.unit).toBe("ml");
    expect(l.meal.rational).toBe(CUP.mul(5).toString()); // exactly 5 cups
    expect(l.meal.sources.map((s: any) => s.recipeTitle).sort()).toEqual(["Milk Pancakes", "Milk Rice Pudding"]);
    expect(l.packagesNeeded).toBe(1);
    expect(l.toSend).toBe(1);
    ok(await recordAvailabilityCommand(alex, op(), { weekId, ingredientKey: "milk", state: "enough", reviewed: { quantity: l.meal.quantity, unit: l.meal.unit, fingerprint: l.fingerprint } }));
    l = await line(weekId, "milk");
    expect(l.toSend).toBe(0);
    expect(l.status).toBe("nothing_needed");
  });

  it("CF-Q2 servings scale exactly; crossing a package boundary needs a second package; Have enough then covers it", async () => {
    const { ma, weekId } = await milkMeals();
    ok(await addProductCommand(jon, op(), { weekId, ingredientKey: "milk", name: "Milk, half gallon", packageQty: "8", packageUnit: "cup", priceMinor: 399 }));
    // 3 cups for 4 servings → 12 servings = 9 cups; with the pancakes' 2 cups = 11 cups → 2 packages of 8 cups.
    let m = await meal(ma.selectedMealId);
    ok(await ml.setSelectedMealServingsCommand(jon, op(), { selectedMealId: m.id, expectedRevision: m.revision, servings: 12 }));
    let l = await line(weekId, "milk");
    expect(l.meal.rational).toBe(CUP.mul(11).toString());
    expect([l.packagesNeeded, l.toSend]).toEqual([2, 2]);
    ok(await recordAvailabilityCommand(alex, op(), { weekId, ingredientKey: "milk", state: "enough", reviewed: { quantity: l.meal.quantity, unit: l.meal.unit, fingerprint: l.fingerprint } }));
    expect((await line(weekId, "milk")).toSend).toBe(0);
    // Fewer servings again (5 cups): still covered by what was confirmed at home.
    m = await meal(ma.selectedMealId);
    ok(await ml.setSelectedMealServingsCommand(jon, op(), { selectedMealId: m.id, expectedRevision: m.revision, servings: 4 }));
    l = await line(weekId, "milk");
    expect(l.meal.rational).toBe(CUP.mul(5).toString());
    expect(l.toSend).toBe(0);
  });

  it("CF-Q3 shared ingredients across meals combine; different foods stay separate; seasonings are never bought", async () => {
    const a = await imported(jon, "Garlic Chicken", 4, "4 cloves garlic\n1 tbsp olive oil\n1 red onion\n1 tsp salt");
    const b = await imported(jon, "Garlic Pasta", 4, "3 cloves garlic\n2 tbsp olive oil\n1 yellow onion");
    const { weekId } = await add(jon, a, 4);
    await add(jon, b, 4);
    const garlic = await line(weekId, "garlic_clove");
    expect(garlic.meal.rational).toBe("7");
    const oil = await line(weekId, "olive_oil");
    expect(oil.meal.sources).toHaveLength(2);
    expect(await line(weekId, "red_onion")).toBeTruthy();
    expect(await line(weekId, "yellow_onion")).toBeTruthy();
    expect(await line(weekId, "salt")).toBeUndefined(); // left out at import (household seasoning)
    // A recipe that does list salt (saved before seasonings were left out): the list names it and never buys it.
    await add(jon, await legacyRecipe(fx, "Salted Rice", [["salt", "0.25", "tsp"], ["rice", "50", "g"]]), 2);
    expect(await line(weekId, "salt")).toBeUndefined();
    expect((await summary(weekId)).householdSeasonings).toEqual([{ key: "salt", name: "salt", recipes: ["Salted Rice"] }]);
  });
});

describe("CF-C concurrency and version binding", () => {
  it("CF-C1 two members change the same meal: the second sees what changed, nothing is merged silently", async () => {
    const { selectedMealId } = await add(jon, fx.recipes.salmon, 2);
    const m = await meal(selectedMealId);
    ok(await ml.setSelectedMealServingsCommand(jon, op(), { selectedMealId, expectedRevision: m.revision, servings: 4 }));
    const r: any = await ml.setSelectedMealServingsCommand(alex, op(), { selectedMealId, expectedRevision: m.revision, servings: 6 });
    expect(r.code).toBe("stale_selection");
    expect(r.details.current).toMatchObject({ servings: 4, updatedBy: "Jon" });
    expect((await meal(selectedMealId)).servings).toBe(4);
    const rm: any = await ml.removeSelectedMealCommand(alex, op(), { selectedMealId, expectedRevision: m.revision });
    expect(rm.code).toBe("stale_selection");
  });

  it("CF-C2 adding a recipe already selected is refused with its servings (never a second copy); after removal it can be added again", async () => {
    const first = await add(jon, fx.recipes.salmon, 2);
    const again: any = await ml.addSelectedMealCommand(alex, op(), { recipeId: fx.recipes.salmon.recipeId, versionId: fx.recipes.salmon.versionId, servings: 2 });
    expect(again.code).toBe("already_selected");
    expect(again.details).toMatchObject({ selectedMealId: first.selectedMealId, servings: 2 });
    expect((await q<any>("SELECT count(*)::int n FROM selected_meals WHERE status='active'"))[0].n).toBe(1);
    const m = await meal(first.selectedMealId);
    ok(await ml.removeSelectedMealCommand(alex, op(), { selectedMealId: m.id, expectedRevision: m.revision }));
    await add(alex, fx.recipes.salmon, 3);
    expect((await q<any>("SELECT count(*)::int n FROM selected_meals WHERE status='active'"))[0].n).toBe(1);
    expect((await q<any>("SELECT count(*)::int n FROM selected_meals"))[0].n).toBe(2); // the removed row is kept
  });

  it("CF-C3 a replayed operation id adds once", async () => {
    const id = op();
    const p = { recipeId: fx.recipes.salmon.recipeId, versionId: fx.recipes.salmon.versionId, servings: 2 };
    const a: any = await ml.addSelectedMealCommand(jon, id, p);
    const b: any = await ml.addSelectedMealCommand(jon, id, p);
    expect(a.status).toBe("accepted");
    expect(b.replayed).toBe(true);
    expect((await q<any>("SELECT count(*)::int n FROM selected_meals"))[0].n).toBe(1);
  });

  it("CF-C4 a selected meal stays on its version until a member switches; adding from a stale view is refused", async () => {
    const r = await imported(jon, "Lentil Soup", 4, "2 cups lentils\n1 onion");
    const { selectedMealId, weekId } = await add(jon, r, 4);
    const v1rows = await q<any>("SELECT id, ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [r.versionId]);
    const saved: any = await saveRecipeVersionCommand(alex, op(), {
      recipeId: r.recipeId, expectedVersionNo: 1, title: "Lentil Soup", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "lentils", ingredientKey: "lentils", quantity: "1", unit: "cup", sourceRowId: null },
        { componentKey: "main", ingredientName: "onion", ingredientKey: "onion", quantity: "0.25", unit: "each", sourceRowId: v1rows[1].id },
      ],
    });
    expect(saved.status, JSON.stringify(saved)).toBe("accepted");
    // Still version 1: 2 cups of lentils for 4 servings.
    expect((await line(weekId, "lentils")).meal.rational).toBe(CUP.mul(2).toString());
    expect((await meal(selectedMealId)).recipe_version_id).toBe(r.versionId);
    const stale: any = await ml.addSelectedMealCommand(alex, op(), { recipeId: r.recipeId, versionId: r.versionId, servings: 2 });
    expect(stale.code).toBe("recipe_changed");
    const m = await meal(selectedMealId);
    ok(await ml.useRecipeVersionCommand(jon, op(), { selectedMealId, expectedRevision: m.revision, versionId: saved.result.versionId }));
    expect((await meal(selectedMealId)).recipe_version_id).toBe(saved.result.versionId);
  });
});

describe("CF-N Needs a quantity (owner rule: never invented, never silently omitted)", () => {
  async function tacos() {
    const r = await imported(jon, "Brisket Tacos", 8, "3 lb beef brisket\n1 red onion");
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,'flour_tortillas','flour tortillas') ON CONFLICT DO NOTHING", [fx.householdId]);
    const [item] = await q<any>(
      `INSERT INTO recipe_unquantified_items(household_id, recipe_version_id, position, component_key, ingredient_key, name, note, raw)
       VALUES ($1,$2,0,'main','flour_tortillas','flour tortillas','for serving','Flour tortillas, for serving') RETURNING id`,
      [fx.householdId, r.versionId],
    );
    const s = await add(jon, r, 8);
    return { r, item, ...s };
  }

  it("CF-N1 an unanswered item leaves the amount to buy unknown and the list not ready", async () => {
    const { weekId, selectedMealId } = await tacos();
    const l = await line(weekId, "flour_tortillas");
    expect(l.toSend).toBeNull();
    expect(l.unresolved[0]).toMatch(/Needs a quantity for Brisket Tacos/);
    const s = await summary(weekId);
    expect(s.ready).toBe(false);
    expect(s.readyBlockers.join(" ")).toMatch(/flour tortillas: Needs a quantity/);
    expect(s.needsQuantity).toEqual([expect.objectContaining({ selectedMealId, name: "flour tortillas", recipeTitle: "Brisket Tacos", servings: 8, earlier: null })]);
  });

  it("CF-N2 an amount counts for the servings it was given for; a servings change asks again (never rescaled)", async () => {
    const { weekId, selectedMealId, item } = await tacos();
    let m = await meal(selectedMealId);
    const bad: any = await ml.answerMissingQuantityCommand(alex, op(), { selectedMealId, expectedRevision: m.revision, itemId: item.id, answer: { quantity: "lots", unit: "each" } });
    expect(bad.code).toBe("invalid");
    ok(await ml.answerMissingQuantityCommand(alex, op(), { selectedMealId, expectedRevision: m.revision, itemId: item.id, answer: { quantity: "16", unit: "each" } }));
    let l = await line(weekId, "flour_tortillas");
    expect(l.meal.rational).toBe("16");
    expect(l.meal.sources[0]).toMatchObject({ stated: true, selectedMealId });
    expect(l.unresolved.join(" ")).not.toMatch(/Needs a quantity/);
    expect((await summary(weekId)).needsQuantity).toEqual([]);
    m = await meal(selectedMealId);
    ok(await ml.setSelectedMealServingsCommand(jon, op(), { selectedMealId, expectedRevision: m.revision, servings: 4 }));
    l = await line(weekId, "flour_tortillas");
    expect(l.meal).toBeNull();
    expect(l.toSend).toBeNull();
    expect(l.unresolved[0]).toMatch(/given for 8 servings, now 4/);
    expect((await summary(weekId)).needsQuantity[0].earlier).toEqual({ quantity: "16", unit: "each", forServings: 8 });
  });

  it("CF-N3 Don't buy keeps the item visible and off the list; the list can become ready", async () => {
    const { weekId, selectedMealId, item } = await tacos();
    const m = await meal(selectedMealId);
    ok(await ml.answerMissingQuantityCommand(jon, op(), { selectedMealId, expectedRevision: m.revision, itemId: item.id, answer: { dontBuy: true } }));
    expect(await line(weekId, "flour_tortillas")).toBeUndefined();
    const s = await summary(weekId);
    expect(s.notBuying).toEqual([expect.objectContaining({ name: "flour tortillas", recipeTitle: "Brisket Tacos", by: "Jon" })]);
    expect(s.readyBlockers.join(" ")).not.toMatch(/Needs a quantity/);
  });
});

describe("CF-P purchasing protections hold for a meal list", () => {
  it("CF-P1 a servings change after approval makes the approval stale; the old review sends nothing", async () => {
    const r = await imported(jon, "Milk Rice Pudding", 4, "3 cups milk");
    const { selectedMealId, weekId } = await add(jon, r, 4);
    ok(await addProductCommand(jon, op(), { weekId, ingredientKey: "milk", name: "Milk, half gallon", packageQty: "8", packageUnit: "cup", priceMinor: 399 }));
    const l = await line(weekId, "milk");
    ok(await approvePurchaseLinesCommand(jon, op(), { weekId, lines: [{ key: "milk", fingerprint: l.fingerprint, packages: l.toSend }] }));
    const reviewed = await summary(weekId);
    expect(reviewed.ready).toBe(true);
    const m = await meal(selectedMealId);
    ok(await ml.setSelectedMealServingsCommand(alex, op(), { selectedMealId, expectedRevision: m.revision, servings: 16 }));
    expect((await q<any>("SELECT state FROM purchase_approvals WHERE ingredient_key='milk'"))[0].state).toBe("stale");
    const calls = await retailerCalls();
    const h: any = await startHandoff(jon, op(), { weekId, reviewFingerprint: reviewed.reviewFingerprint, payloadHash: reviewed.payloadHash });
    expect(h.status).toBe("rejected");
    expect(await retailerCalls()).toBe(calls);
  });

  it("CF-P2 the snapshot gives both members the same list with its own groceries", async () => {
    await add(jon, fx.recipes.salmon, 2);
    const sj: any = await householdSnapshot(jon);
    const sa: any = await householdSnapshot(alex);
    expect(sj.mealList.meals.map((m: any) => [m.title, m.servings, m.addedBy])).toEqual([["Fixture: Salmon rice bowls", 2, "Jon"]]);
    expect(sa.mealList).toEqual(sj.mealList);
    expect(sj.mealList.groceries.lines.length).toBeGreaterThan(0);
    expect(sj.mealList.weekId).not.toBe(sj.week.id);
    const listId = (await q<any>("SELECT id FROM meal_lists"))[0].id;
    expect(await listWeek()).toBe(sj.mealList.weekId);
    expect(listId).toBe(sj.mealList.id);
  });
});

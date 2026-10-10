/**
 * Exact quantities for new recipe versions (EQ, 2026-10-10), through the real commands and PostgreSQL.
 *
 * A newly saved ingredient row keeps its exact whole-recipe amount and serving basis (migration 015) and
 * purchasing computes with that fraction — plates, combined recipes, unit conversion, what is at home,
 * package counts, approvals and partial transfers — never with a truncated per-serving decimal, and with no
 * tolerance. Rows saved before stay legacy approximations: used as stored, labelled, never relabelled.
 */
import { describe, expect, it } from "vitest";
import { fresh, line, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import * as sources from "@/server/commands/sources";
import { applyPlanChangeCommand, createPreviewCommand, setPlateCommand } from "@/server/commands/plan";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { approvePurchaseLinesCommand, recordAvailabilityCommand } from "@/server/commands/groceries";
import { startPartialHandoff } from "@/server/commands/purchasing";
import { householdSnapshot } from "@/server/queries/snapshot";
import { omissionsFor } from "@/domain/groceries/partial-handoff";
import { Q } from "@/domain/exact";
import type { Actor } from "@/server/commands/framework";

const TBSP = Q.of("14.78676478125");
const CUP = Q.of("236.5882365");
const FL_OZ = Q.of("29.5735295625");

async function imported(actor: Actor, title: string, servings: number, text: string) {
  const s: any = await sources.saveLinkCommand(actor, op(), { url: `https://example.org/${title.toLowerCase().replace(/\W+/g, "-")}` });
  expect(s.status, JSON.stringify(s)).toBe("accepted");
  const p: any = await imports.pasteIngredientsCommand(actor, op(), { bookmarkId: s.result.bookmarkId, text, title });
  expect(p.status, JSON.stringify(p)).toBe("accepted");
  const u: any = await imports.updateImportDraftCommand(actor, op(), { draftId: p.result.draftId, expectedRevision: 1, servings });
  expect(u.status, JSON.stringify(u)).toBe("accepted");
  const c: any = await imports.confirmImportDraftCommand(actor, op(), { draftId: p.result.draftId, expectedRevision: u.result.revision });
  expect(c.status, JSON.stringify(c)).toBe("accepted");
  return c.result as { recipeId: string; versionId: string };
}

/** Put a recipe version on a night of the accepted week (reviewed preview), then set the plates. */
async function onNight(fx: any, actor: Actor, night: "thu" | "fri", versionId: string, plates?: { jon: string; alex: string }) {
  const p: any = await createPreviewCommand(actor, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments[night], recipeVersionId: versionId } });
  expect(p.status, JSON.stringify(p)).toBe("accepted");
  const a: any = await applyPlanChangeCommand(actor, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) });
  expect(a.status, JSON.stringify(a)).toBe("accepted");
  const [ev] = await q<any>("SELECT id, revision, cook_night::text AS night FROM cooking_events WHERE week_id=$1 AND recipe_version_id=$2 AND status='scheduled'", [fx.weekId, versionId]);
  if (plates) {
    let rev = ev.revision;
    for (const [m, n] of [["jon", plates.jon], ["alex", plates.alex]] as const) {
      const s: any = await setPlateCommand(actor, op(), { eventId: ev.id, expectedEventRevision: rev, memberId: fx.members[m], night: ev.night, kind: "dinner", componentPortions: { main: n } });
      expect(s.status, JSON.stringify(s)).toBe("accepted");
      rev = (await q<any>("SELECT revision FROM cooking_events WHERE id=$1", [ev.id]))[0].revision;
    }
  }
  return ev;
}

/** Exact meal demand of an ingredient from the nights NOT in `except`, read from the line's own sources. */
async function restOf(weekId: string, key: string, except: string[]) {
  const l = await line(weekId, key);
  const keep = (l?.meal?.sources ?? []).filter((s: any) => !except.includes(s.cookNight));
  return keep.reduce((a: Q, s: any) => a.plus(Q.of(s.rational ?? s.quantity)), Q.zero);
}

const manual = (actor: Actor, title: string, ingredients: { key: string; quantity: string; unit: string }[]) =>
  saveRecipeVersionCommand(actor, op(), {
    title, instructions: "", components: [{ key: "main", name: "Main" }],
    ingredients: ingredients.map((i) => ({ componentKey: "main", ingredientName: i.key.replace(/_/g, " "), ingredientKey: i.key, quantity: i.quantity, unit: i.unit })),
  }) as Promise<any>;

/** A row as the release before migration 015 wrote it (no exact columns given): legacy. */
async function legacyRecipe(fx: any, title: string, rows: [string, string, string][]) {
  const [r] = await q<any>("INSERT INTO recipes(household_id, created_by) VALUES ($1,$2) RETURNING id", [fx.householdId, fx.members.jon]);
  const [v] = await q<any>(
    "INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,1,$3,'','manual',false,$4) RETURNING id",
    [r.id, fx.householdId, title, fx.members.jon],
  );
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [v.id]);
  let sort = 0;
  for (const [k, qty, u] of rows) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k]);
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main',$2,$3,$4,$5)", [v.id, k, qty, u, sort++]);
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [r.id, v.id]);
  return { recipeId: r.id as string, versionId: v.id as string };
}

describe("exact quantities for new recipe versions", () => {
  it("EQ-01: an imported row keeps its exact whole-recipe amount and serving basis next to the stored decimal", async () => {
    const { jon } = await fresh();
    const r = await imported(jon, "Onion salad", 3, "2 each onion\n1/3 cup pesto\n1 1/2 cups frozen peas");
    const rows = await q<any>("SELECT ingredient_key AS key, quantity::text AS q, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY 1", [r.versionId]);
    expect(rows).toEqual([
      { key: "frozen_peas", q: "0.5", basis: "exact", amount: "3/2", servings: 3 },
      { key: "onion", q: "0.666666666666", basis: "exact", amount: "2", servings: 3 },
      { key: "pesto", q: "0.111111111111", basis: "exact", amount: "1/3", servings: 3 },
    ]);
  });

  it("EQ-02: 2 cucumbers for 3 servings, all 3 planned, need exactly 2 — next to the legacy salmon bowls' cucumbers", async () => {
    const { fx, jon } = await fresh();
    const rest = await restOf(fx.weekId, "cucumber", ["2026-10-16"]);
    const r = await imported(jon, "Cucumber salad", 3, "2 each cucumber");
    await onNight(fx, jon, "fri", r.versionId, { jon: "2", alex: "1" });
    const l = await line(fx.weekId, "cucumber");
    const salad = l.meal.sources.find((s: any) => s.recipeTitle === "Cucumber salad");
    expect(salad).toMatchObject({ rational: "2", exact: true });
    expect(l.meal.sources.filter((s: any) => s.recipeTitle !== "Cucumber salad").every((s: any) => s.exact === false)).toBe(true);
    expect(l.meal.rational).toBe(rest.plus(2).toString());
    expect(l.meal.exact).toBe(false); // the week also uses legacy rows
    expect(l.packagesForMeal).toBe(Number(rest.plus(2).ceil()));
  });

  it("EQ-03: a genuine amount above the package boundary needs another package — no tolerance", async () => {
    const { fx, jon } = await fresh();
    const rest = await restOf(fx.weekId, "cucumber", ["2026-10-15", "2026-10-16"]);
    const salad = await imported(jon, "Cucumber salad", 3, "2 each cucumber");
    await onNight(fx, jon, "fri", salad.versionId, { jon: "2", alex: "1" });
    const g: any = await manual(jon, "Cucumber garnish", [{ key: "cucumber", quantity: "0.000000000001", unit: "each" }]);
    expect(g.status, JSON.stringify(g)).toBe("accepted");
    await onNight(fx, jon, "thu", g.result.versionId, { jon: "1", alex: "1" });
    const l = await line(fx.weekId, "cucumber");
    const exact = rest.plus(2).plus(Q.of("0.000000000002"));
    expect(l.meal.rational).toBe(exact.toString());
    expect(l.packagesForMeal).toBe(Number(exact.ceil())); // one more than rest + 2
    expect(l.packagesForMeal).toBe(Number(rest.plus(2).ceil()) + (rest.plus(2).d === BigInt(1) ? 1 : 0));
  });

  it("EQ-04: a legacy row is used exactly as stored and labelled approximate — never silently repaired", async () => {
    const { fx, jon } = await fresh();
    const rest = await restOf(fx.weekId, "cucumber", ["2026-10-16"]);
    const old = await legacyRecipe(fx, "Old cucumber salad", [["cucumber", "0.6667", "each"]]);
    const [row] = await q<any>("SELECT quantity_basis AS basis, exact_amount, exact_servings FROM recipe_ingredients WHERE recipe_version_id=$1", [old.versionId]);
    expect(row).toEqual({ basis: "legacy", exact_amount: null, exact_servings: null });
    await onNight(fx, jon, "fri", old.versionId, { jon: "2", alex: "1" });
    const l = await line(fx.weekId, "cucumber");
    expect(l.meal.sources.find((s: any) => s.recipeTitle === "Old cucumber salad")).toMatchObject({ rational: "20001/10000", exact: false });
    expect(l.meal.rational).toBe(rest.plus(Q.of("2.0001")).toString());
    expect(l.packagesForMeal).toBe(Number(rest.plus(Q.of("2.0001")).ceil()));
  });

  it("EQ-05: a title-only edit of a legacy recipe keeps its rows legacy; a changed amount is the member's exact amount; the accepted dinner keeps its version", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old cucumber salad", [["cucumber", "0.6667", "each"], ["olive_oil", "0.3333", "tbsp"]]);
    const ev = await onNight(fx, jon, "fri", old.versionId);
    const t: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: old.recipeId, expectedVersionNo: 1, title: "Old cucumber salad (renamed)", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.6667", unit: "each" },
        { componentKey: "main", ingredientName: "olive_oil", ingredientKey: "olive_oil", quantity: "0.3333", unit: "tbsp" },
      ],
    });
    expect(t.status, JSON.stringify(t)).toBe("accepted");
    const v2 = await q<any>("SELECT ingredient_key AS key, quantity::text AS q, quantity_basis AS basis, exact_amount AS amount FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY 1", [t.result.versionId]);
    expect(v2).toEqual([
      { key: "cucumber", q: "0.6667", basis: "legacy", amount: null },
      { key: "olive_oil", q: "0.3333", basis: "legacy", amount: null },
    ]);
    const e: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: old.recipeId, expectedVersionNo: 2, title: "Old cucumber salad (renamed)", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.5", unit: "each" },
        { componentKey: "main", ingredientName: "olive_oil", ingredientKey: "olive_oil", quantity: "0.3333", unit: "tbsp" },
      ],
    });
    expect(e.status, JSON.stringify(e)).toBe("accepted");
    const v3 = await q<any>("SELECT ingredient_key AS key, quantity::text AS q, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY 1", [e.result.versionId]);
    expect(v3).toEqual([
      { key: "cucumber", q: "0.5", basis: "exact", amount: "1/2", servings: 1 },
      { key: "olive_oil", q: "0.3333", basis: "legacy", amount: null, servings: null },
    ]);
    // Version 1's rows and the accepted dinner are untouched.
    expect((await q<any>("SELECT quantity_basis AS b FROM recipe_ingredients WHERE recipe_version_id=$1", [old.versionId])).map((x) => x.b)).toEqual(["legacy", "legacy"]);
    expect((await q<any>("SELECT recipe_version_id AS v FROM cooking_events WHERE id=$1", [ev.id]))[0].v).toBe(old.versionId);
  });

  it("EQ-05b: an unchanged number keeps its basis when the row's unit or name changes — an imported 2/3 stays 2/3, a legacy 0.6667 stays legacy", async () => {
    const { fx, jon } = await fresh();
    const imp = await imported(jon, "Onion salad", 3, "2 each onion");
    const [row] = await q<any>("SELECT quantity::text AS q FROM recipe_ingredients WHERE recipe_version_id=$1", [imp.versionId]);
    const e: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: imp.recipeId, expectedVersionNo: 1, title: "Onion salad", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "red onion", quantity: row.q, unit: "each" }], // renamed, number unchanged
    });
    expect(e.status, JSON.stringify(e)).toBe("accepted");
    expect((await q<any>("SELECT ingredient_key AS key, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings FROM recipe_ingredients WHERE recipe_version_id=$1", [e.result.versionId]))[0])
      .toEqual({ key: "red_onion", basis: "exact", amount: "2", servings: 3 });
    const old = await legacyRecipe(fx, "Old salad", [["cucumber", "0.6667", "each"]]);
    const u: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: old.recipeId, expectedVersionNo: 1, title: "Old salad", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.6667", unit: "cup" }], // unit changed, number unchanged
    });
    expect(u.status, JSON.stringify(u)).toBe("accepted");
    expect((await q<any>("SELECT quantity_basis AS basis FROM recipe_ingredients WHERE recipe_version_id=$1", [u.result.versionId]))[0].basis).toBe("legacy");
  });

  it("EQ-06: a client cannot declare a row exact — exact fields in a save are ignored and the typed decimal is what is stored", async () => {
    const { jon } = await fresh();
    const s: any = await saveRecipeVersionCommand(jon, op(), {
      title: "Claims", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.6667", unit: "each", exactAmount: "2", exactServings: 3 } as any],
    });
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const [row] = await q<any>("SELECT quantity::text AS q, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings FROM recipe_ingredients WHERE recipe_version_id=$1", [s.result.versionId]);
    expect(row).toEqual({ q: "0.6667", basis: "exact", amount: "6667/10000", servings: 1 });
  });

  it("EQ-07: unit conversion stays exact — a new ⅓-cup recipe and the legacy tablespoon recipes combine in ml to the exact sum; packages from it", async () => {
    const { fx, jon } = await fresh();
    const restMl = await restOf(fx.weekId, "soy_sauce", ["2026-10-16"]);
    const restTbsp = restMl.div(TBSP);
    expect(restTbsp.d).toBe(BigInt(1)); // the fixture's soy sauce is whole tablespoons
    // Fill exactly to the next 10 fl oz (= 20 tbsp) boundary with a cup amount: (20k − rest) tbsp = (20k − rest)/16 cup.
    const k = restTbsp.div(20).ceil() + BigInt(1);
    const fillTbsp = Q.of(k * BigInt(20)).minus(restTbsp);
    const fillCup = fillTbsp.div(16);
    const r = await imported(jon, "Soy glaze", 3, `${fillCup.toString()} cup soy sauce`);
    await onNight(fx, jon, "fri", r.versionId, { jon: "2", alex: "1" });
    const l = await line(fx.weekId, "soy_sauce");
    const exact = restMl.plus(fillCup.mul(CUP));
    expect(l.meal.unit).toBe("ml");
    expect(l.meal.rational).toBe(exact.toString());
    expect(exact.div(FL_OZ.mul(10)).toString()).toBe(k.toString()); // exactly k packages
    expect(l.packagesForMeal).toBe(Number(k));
  });

  it("EQ-07b: a converted amount that does not end as a decimal (⅔ of a cup recipe planned for 2 of its 3 servings) stays an exact fraction", async () => {
    const { fx, jon } = await fresh();
    const restMl = await restOf(fx.weekId, "soy_sauce", ["2026-10-16"]);
    const r = await imported(jon, "Soy glaze", 3, "1/3 cup soy sauce");
    await onNight(fx, jon, "fri", r.versionId, { jon: "1", alex: "1" });
    const l = await line(fx.weekId, "soy_sauce");
    const glaze = Q.frac(1, 3).div(3).mul(2).mul(CUP); // 2/27 cup in ml: 2 × 236.5882365 / 9 — never ends as a decimal
    expect(glaze.d % BigInt(3)).toBe(BigInt(0));
    expect(l.meal.sources.find((s: any) => s.recipeTitle === "Soy glaze").rational).toBe(glaze.toString());
    expect(l.meal.rational).toBe(restMl.plus(glaze).toString());
    expect(l.packagesForMeal).toBe(Number(restMl.plus(glaze).div(FL_OZ.mul(10)).ceil()));
  });

  it("EQ-08: what is at home is subtracted exactly, across units", async () => {
    const { fx, jon } = await fresh();
    const r = await imported(jon, "Cucumber salad", 3, "2 each cucumber");
    await onNight(fx, jon, "fri", r.versionId, { jon: "2", alex: "1" });
    const before = await line(fx.weekId, "cucumber");
    const meal = Q.of(before.meal.rational);
    const a: any = await recordAvailabilityCommand(jon, op(), { weekId: fx.weekId, ingredientKey: "cucumber", state: "some", quantity: "1", unit: "each" });
    expect(a.status, JSON.stringify(a)).toBe("accepted");
    const l = await line(fx.weekId, "cucumber");
    expect(l.netMeal.rational).toBe(meal.minus(1).toString());
    expect(l.packagesForMeal).toBe(Number(meal.minus(1).ceil()));
  });

  it("EQ-09: an exact boundary line and a legacy line approve and go in one partial transfer with the counts shown", async () => {
    const { fx, jon } = await fresh();
    const r = await imported(jon, "Cucumber salad", 3, "2 each cucumber");
    await onNight(fx, jon, "fri", r.versionId, { jon: "2", alex: "1" });
    const cuc = await line(fx.weekId, "cucumber");
    const rice = await line(fx.weekId, "rice");
    const ap: any = await approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: [cuc, rice].map((l: any) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
    expect(ap.status, JSON.stringify(ap)).toBe("accepted");
    const s: any = await householdSnapshot(jon);
    const partial = s.groceries.partial;
    const res: any = await startPartialHandoff(jon, op(), {
      weekId: fx.weekId, reviewFingerprint: partial.reviewFingerprint, partialFingerprint: partial.partialFingerprint, selectedKeys: ["cucumber", "rice"],
      acknowledgedOmissions: omissionsFor(partial, ["cucumber", "rice"]).map((o) => o.key),
    });
    expect(res.status, JSON.stringify(res)).toBe("accepted");
    const sent = await q<any>("SELECT ingredient_key AS key, packages FROM handoff_batch_lines ORDER BY 1");
    expect(sent).toEqual([{ key: "cucumber", packages: cuc.toSend }, { key: "rice", packages: rice.toSend }]);
    expect(cuc.toSend).toBe(Number(Q.of(cuc.meal.rational).ceil()));
  });

  it("EQ-10: the database refuses an exact row without its basis, with a basis that does not match its decimal, or a legacy row claiming one", async () => {
    const { fx, jon } = await fresh();
    const r = await imported(jon, "Cucumber salad", 3, "2 each cucumber");
    const ins = (quantity: string, basis: string, amount: string | null, servings: number | null) =>
      q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, quantity_basis, exact_amount, exact_servings) VALUES ($1,'main','cucumber',$2,'each',$3,$4,$5)", [r.versionId, quantity, basis, amount, servings]).then(
        () => "inserted",
        (e: Error) => e.message,
      );
    expect(await ins("0.666666666666", "exact", null, 3)).toMatch(/check constraint/);
    expect(await ins("0.6667", "exact", "2", 3)).toMatch(/check constraint/);
    expect(await ins("0.6667", "legacy", "2", 3)).toMatch(/check constraint/);
    expect(await ins("0.666666666666", "exact", "4/6", 3)).toMatch(/check constraint/); // not reduced
    expect(fx).toBeTruthy();
  });
});

/**
 * Exact-quantity delivery correction (EQR, 2026-10-10), through the real commands and PostgreSQL.
 *
 * EQR-01  A row's quantity basis follows ITS OWN ingredient occurrence (server-verified lineage to the row it
 *         came from), never another row that happens to carry the same decimal: a changed amount is exact as
 *         typed, a new row is exact as typed, repeated occurrences keep their own bases through title-only
 *         saves, reorders and renames, and invalid lineage is refused.
 * EQR-02  "Have enough" certifies the exact requirement the member reviewed. An older confirmation never stretches
 *         to a larger exact requirement that merely displays the same 3-decimal number; an unchanged repeating
 *         requirement stays confirmed; the review identity includes the exact requirement and its basis, so a
 *         stale approval sends nothing.
 *
 * The quantities are deliberately precise synthetic values that exercise the contract (no epsilon); the expected
 * values below are worked out by hand as decimals, not computed with the Q type under test.
 */
import { describe, expect, it } from "vitest";
import { fresh, line, op, q, race } from "./helpers";
import { imported, legacyRecipe, manual, onNight, restOf } from "./eq-helpers";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { applyPlanChangeCommand, createPreviewCommand } from "@/server/commands/plan";
import { approvePurchaseLinesCommand, recordAvailabilityCommand } from "@/server/commands/groceries";
import { startHandoff } from "@/server/commands/purchasing";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";

type Row = { key: string; q: string; unit?: string; src: string | null; name?: string };
const rowsOf = (versionId: string) =>
  q<any>(
    `SELECT id, ingredient_key AS key, quantity::text AS q, unit, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings, sort
       FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort`,
    [versionId],
  );
const save = (actor: Actor, recipeId: string, expectedVersionNo: number, title: string, rows: Row[]) =>
  saveRecipeVersionCommand(actor, op(), {
    recipeId, expectedVersionNo, title, instructions: "", components: [{ key: "main", name: "Main" }],
    ingredients: rows.map((r) => ({ componentKey: "main", ingredientName: r.name ?? r.key.replace(/_/g, " "), ingredientKey: r.name ? null : r.key, quantity: r.q, unit: r.unit ?? "each", sourceRowId: r.src })),
  } as any) as Promise<any>;
const basisOf = (rows: any[]) => rows.map((r) => ({ key: r.key, q: r.q, basis: r.basis, amount: r.amount, servings: r.servings }));

describe("EQR-01: the basis follows the ingredient occurrence", () => {
  it("EQR-01a: a changed amount is exact as typed — it does not take another row's legacy label because the numbers match", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old salad", [["cucumber", "1", "each"], ["onion", "0.5", "each"]]);
    const [cuc, oni] = await rowsOf(old.versionId);
    const s = await save(jon, old.recipeId, 1, "Old salad", [{ key: "cucumber", q: "0.5", src: cuc.id }, { key: "onion", q: "0.5", src: oni.id }]);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(basisOf(await rowsOf(s.result.versionId))).toEqual([
      { key: "cucumber", q: "0.5", basis: "exact", amount: "1/2", servings: 1 }, // the member's new amount
      { key: "onion", q: "0.5", basis: "legacy", amount: null, servings: null }, // untouched: its own legacy basis
    ]);
  });

  it("EQR-01b: a new ingredient typed as 0.666666666666 is that decimal, not another row's 2-for-3", async () => {
    const { jon } = await fresh();
    const r = await imported(jon, "Onion salad", 3, "2 each onion");
    const [oni] = await rowsOf(r.versionId);
    const s = await save(jon, r.recipeId, 1, "Onion salad", [{ key: "onion", q: oni.q, src: oni.id }, { key: "cucumber", q: "0.666666666666", src: null }]);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(basisOf(await rowsOf(s.result.versionId))).toEqual([
      { key: "onion", q: "0.666666666666", basis: "exact", amount: "2", servings: 3 },
      { key: "cucumber", q: "0.666666666666", basis: "exact", amount: "333333333333/500000000000", servings: 1 },
    ]);
  });

  it("EQR-01c: two occurrences with the same decimal keep their own bases through a title-only save and a reorder — and the package count with them", async () => {
    const { fx, jon } = await fresh();
    const restCuc = await restOf(fx.weekId, "cucumber", ["2026-10-15", "2026-10-16"]);
    expect(restCuc.toString()).toBe("1"); // fixture: the rest of the week needs exactly 1 cucumber
    const r = await imported(jon, "Cucumber two ways", 3, "2 each cucumber"); // v1: 2 for 3
    const [c1] = await rowsOf(r.versionId);
    const v2 = await save(jon, r.recipeId, 1, "Cucumber two ways", [{ key: "cucumber", q: c1.q, src: c1.id }, { key: "cucumber", q: "0.666666666666", src: null }]);
    expect(v2.status, JSON.stringify(v2)).toBe("accepted");
    const two = await rowsOf(v2.result.versionId);
    const expected = [
      { key: "cucumber", q: "0.666666666666", basis: "exact", amount: "2", servings: 3 },
      { key: "cucumber", q: "0.666666666666", basis: "exact", amount: "333333333333/500000000000", servings: 1 },
    ];
    expect(basisOf(two)).toEqual(expected);
    // Title-only save: each row names the row it came from.
    const v3 = await save(jon, r.recipeId, 2, "Cucumber two ways (ours)", [{ key: "cucumber", q: two[0].q, src: two[0].id }, { key: "cucumber", q: two[1].q, src: two[1].id }]);
    expect(v3.status, JSON.stringify(v3)).toBe("accepted");
    const three = await rowsOf(v3.result.versionId);
    expect(basisOf(three)).toEqual(expected);
    // Reorder: each occurrence keeps its own basis in its new place.
    const v4 = await save(jon, r.recipeId, 3, "Cucumber two ways (ours)", [{ key: "cucumber", q: three[1].q, src: three[1].id }, { key: "cucumber", q: three[0].q, src: three[0].id }]);
    expect(v4.status, JSON.stringify(v4)).toBe("accepted");
    expect(basisOf(await rowsOf(v4.result.versionId))).toEqual([expected[1], expected[0]]);
    // Purchasing: 3 plates → 2/3·3 + 0.666666666666·3 = 2 + 1.999999999998 = 3.999999999998 cucumbers; a garnish
    // of 0.000000000001 per plate for 2 plates brings it to exactly 4.000000000000 → with the 1 from the rest of
    // the week, 5 packages. Had the second row collapsed onto 2/3 it would be 4.000000000002 + 1 → 6 packages.
    await onNight(fx, jon, "fri", v4.result.versionId, { jon: "2", alex: "1" });
    const g = await manual(jon, "Cucumber garnish", [{ key: "cucumber", quantity: "0.000000000001", unit: "each" }]);
    await onNight(fx, jon, "thu", g.result.versionId, { jon: "1", alex: "1" });
    const l = await line(fx.weekId, "cucumber");
    const fromRecipe = l.meal.sources.find((s: any) => s.recipeTitle === "Cucumber two ways (ours)");
    expect(fromRecipe.rational).toBe("1999999999999/500000000000"); // 3.999999999998
    expect(l.meal.rational).toBe("5");
    expect(l.packagesForMeal).toBe(5);
  });

  it("EQR-01d: a renamed or re-measured row whose number is unchanged keeps ITS basis — legacy stays legacy, ⅔ stays ⅔", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old salad", [["onion", "0.6667", "each"], ["cucumber", "0.6667", "each"]]);
    const [oni, cuc] = await rowsOf(old.versionId);
    const s = await save(jon, old.recipeId, 1, "Old salad", [{ key: "red_onion", name: "red onion", q: "0.6667", src: oni.id }, { key: "cucumber", q: "0.6667", unit: "cup", src: cuc.id }]);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect((await rowsOf(s.result.versionId)).map((r) => [r.key, r.unit, r.basis])).toEqual([["red_onion", "each", "legacy"], ["cucumber", "cup", "legacy"]]);
    const imp = await imported(jon, "Onion salad", 3, "2 each onion");
    const [o] = await rowsOf(imp.versionId);
    const t = await save(jon, imp.recipeId, 1, "Onion salad", [{ key: "shallot", name: "shallot", q: o.q, src: o.id }]);
    expect(t.status, JSON.stringify(t)).toBe("accepted");
    expect(basisOf(await rowsOf(t.result.versionId))).toEqual([{ key: "shallot", q: "0.666666666666", basis: "exact", amount: "2", servings: 3 }]);
  });

  it("EQR-01e: lineage that is missing, foreign, duplicated, unknown or from another household is refused and nothing is saved", async () => {
    const { fx, jon, other } = await fresh();
    const a = await legacyRecipe(fx, "Recipe A", [["onion", "0.5", "each"], ["cucumber", "1", "each"]]);
    const b = await legacyRecipe(fx, "Recipe B", [["onion", "0.5", "each"]]);
    const [a1, a2] = await rowsOf(a.versionId);
    const [b1] = await rowsOf(b.versionId);
    const otherRecipe = await saveRecipeVersionCommand(other, op(), {
      title: "Other household", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "onion", ingredientKey: "onion", quantity: "0.5", unit: "each" }],
    }) as any;
    const [o1] = await rowsOf(otherRecipe.result.versionId);
    const versions = async () => (await q<any>("SELECT count(*)::int AS n FROM recipe_versions WHERE recipe_id=$1", [a.recipeId]))[0].n;
    const attempts: [string, Row[], string][] = [
      ["from another recipe", [{ key: "onion", q: "0.5", src: b1.id }, { key: "cucumber", q: "1", src: a2.id }], "invalid_lineage"],
      ["the same row twice", [{ key: "onion", q: "0.5", src: a1.id }, { key: "onion", q: "0.5", src: a1.id }], "invalid_lineage"],
      ["an unknown row", [{ key: "onion", q: "0.5", src: "00000000-0000-4000-8000-000000000000" }], "invalid_lineage"],
      ["another household's row", [{ key: "onion", q: "0.5", src: o1.id }], "invalid_lineage"],
      ["not a row reference", [{ key: "onion", q: "0.5", src: "row-1" }], "invalid_lineage"],
    ];
    for (const [what, rows, code] of attempts) {
      const r = await save(jon, a.recipeId, 1, "Recipe A", rows);
      expect(r.status === "rejected" && r.code, `${what}: ${JSON.stringify(r)}`).toBe(code);
    }
    // An edit that does not say where its rows came from (an outdated screen) is refused rather than guessed.
    const missing = await saveRecipeVersionCommand(jon, op(), {
      recipeId: a.recipeId, expectedVersionNo: 1, title: "Recipe A", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "onion", ingredientKey: "onion", quantity: "0.5", unit: "each" }],
    }) as any;
    expect(missing.status === "rejected" && missing.code).toBe("lineage_required");
    expect(await versions()).toBe(1);
  });
});

describe("EQR-02: 'Have enough' certifies the exact requirement reviewed", () => {
  /** The cucumber salad (2 for 3, 3 plates) makes the week's cucumber exactly 3; a later garnish adds 0.0004. */
  async function week() {
    const env = await fresh();
    const { fx, jon } = env;
    const r = await imported(jon, "Cucumber salad", 3, "2 each cucumber");
    await onNight(fx, jon, "fri", r.versionId, { jon: "2", alex: "1" });
    const seen = await line(fx.weekId, "cucumber");
    expect([seen.meal.quantity, seen.meal.rational]).toEqual(["3", "3"]);
    const garnish = await manual(jon, "Cucumber garnish", [{ key: "cucumber", quantity: "0.0002", unit: "each" }]);
    // The reviewed change is prepared first, so the race below is between the ONE command that changes the requirement
    // (2 plates × 0.0002 = 0.0004 more, shown as "3" still) and Alex's observation.
    const pv: any = await createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.thu, recipeVersionId: garnish.result.versionId } });
    expect(pv.status, JSON.stringify(pv)).toBe("accepted");
    const raise = async () => {
      const a: any = await applyPlanChangeCommand(jon, op(), { previewId: String(pv.result.previewId), reviewedHash: String(pv.result.contentHash) });
      expect(a.status, JSON.stringify(a)).toBe("accepted");
      return a;
    };
    return { ...env, seen, raise };
  }
  const enough = (alex: Actor, weekId: string, seen: any) =>
    recordAvailabilityCommand(alex, op(), { weekId, ingredientKey: "cucumber", state: "enough", reviewed: { quantity: seen.meal.quantity, unit: seen.meal.unit, fingerprint: seen.fingerprint } }) as Promise<any>;

  it("EQR-02a: confirmed for exactly 3, then the requirement becomes 3.0004 — still shown as 3 — and the confirmation does not stretch to it", async () => {
    const { fx, alex, seen, raise } = await week();
    expect((await enough(alex, fx.weekId, seen)).status).toBe("accepted");
    expect((await line(fx.weekId, "cucumber")).packagesForMeal).toBe(0);
    await raise();
    const l = await line(fx.weekId, "cucumber");
    expect(l.meal.quantity).toBe("3"); // the display is unchanged …
    expect(l.meal.rational).toBe("7501/2500"); // … the requirement is 3.0004
    expect(l.unresolved.join(" ")).toMatch(/increased since Alex said "Have enough"/);
    expect(l.homeSupply).toBe("3");
    expect(l.netMeal.rational).toBe("1/2500"); // 0.0004 still needed
    expect(l.packagesForMeal).toBe(1);
    expect(l.status).toBe("needs_review");
  });

  for (const order of ["observation first", "change first"] as const) {
    it(`EQR-02b: a confirmation racing the increase never certifies the larger requirement (${order})`, async () => {
      const { fx, alex, seen, raise } = await week();
      const [a, b] = order === "observation first" ? await race(fx.householdId, () => enough(alex, fx.weekId, seen), raise) : await race(fx.householdId, raise, () => enough(alex, fx.weekId, seen));
      expect([a.status, b.status]).toEqual(["accepted", "accepted"]);
      // Which one the server applied first is what the order says.
      const [obs0] = await q<any>("SELECT reviewed_binding FROM availability_observations WHERE ingredient_key='cucumber'");
      expect(obs0.reviewed_binding).toBe(order === "observation first" ? "current_requirement" : "shown_decimal");
      const [obs] = await q<any>("SELECT reviewed_demand::text AS d, reviewed_unit AS u FROM availability_observations WHERE ingredient_key='cucumber'");
      expect([obs.d, obs.u]).toEqual(["3", "each"]);
      const l = await line(fx.weekId, "cucumber");
      expect(l.meal.rational).toBe("7501/2500");
      expect(l.packagesForMeal).toBe(1);
      expect(l.unresolved.join(" ")).toMatch(/increased since Alex said "Have enough"/);
    });
  }

  it("EQR-02c: an unchanged repeating requirement (⅔ cucumber on top of the week's 1) stays confirmed although its display is shorter", async () => {
    const { fx, jon, alex } = await fresh();
    const r = await imported(jon, "Cucumber side", 3, "1 each cucumber");
    await onNight(fx, jon, "fri", r.versionId, { jon: "1", alex: "1" }); // 2 plates × 1/3
    const seen = await line(fx.weekId, "cucumber");
    expect([seen.meal.quantity, seen.meal.rational]).toEqual(["1.667", "5/3"]);
    expect((await enough(alex, fx.weekId, seen)).status).toBe("accepted");
    // Something unrelated changes and everything is recomputed: the confirmation still covers the need.
    expect((await recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "rice", state: "need" })).status).toBe("accepted");
    const l = await line(fx.weekId, "cucumber");
    expect(l.unresolved).toEqual([]);
    expect(l.packagesForMeal).toBe(0);
  });

  it("EQR-02d: a change below the 6th decimal changes the review identity — the earlier approval goes stale and nothing is sent", async () => {
    const { fx, jon } = await fresh();
    const r = await imported(jon, "Soy glaze", 3, "1 tbsp soy sauce");
    await onNight(fx, jon, "fri", r.versionId, { jon: "2", alex: "1" });
    const before = await line(fx.weekId, "soy_sauce");
    const ap: any = await approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: [{ key: "soy_sauce", fingerprint: before.fingerprint, packages: before.toSend }] });
    expect(ap.status, JSON.stringify(ap)).toBe("accepted");
    const snap: any = await householdSnapshot(jon);
    // 2 plates × 0.00000001 ml: the requirement grows by 0.00000002 ml — the same to 6 decimals, the same packages.
    const g = await manual(jon, "Soy drop", [{ key: "soy_sauce", quantity: "0.00000001", unit: "ml" }]);
    await onNight(fx, jon, "thu", g.result.versionId);
    const after = await line(fx.weekId, "soy_sauce");
    expect(after.meal.quantity).toBe(before.meal.quantity);
    expect(after.toSend).toBe(before.toSend);
    expect(after.meal.rational).not.toBe(before.meal.rational);
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(after.approval?.valid ?? false).toBe(false);
    const calls = async () => (await q<any>("SELECT count(*)::int AS n FROM fake_retailer_calls"))[0].n;
    const n0 = await calls();
    const send: any = await startHandoff(jon, op(), { weekId: fx.weekId, reviewFingerprint: snap.groceries.summary.reviewFingerprint, payloadHash: snap.groceries.summary.payloadHash });
    expect(send.status).toBe("rejected");
    expect(await calls()).toBe(n0);
  });

  it("EQR-02e: a basis-only change (a legacy ½ cucumber per plate replaced by an exact ½) is a new review identity", async () => {
    const { fx, jon } = await fresh();
    const before = await line(fx.weekId, "cucumber");
    const fri = before.meal.sources.filter((s: any) => s.cookNight === "2026-10-16");
    expect(fri.map((s: any) => [s.rational, s.exact])).toEqual([["1", false]]); // the salmon bowls: legacy 0.5 × 2 plates
    const ap: any = await approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: [{ key: "cucumber", fingerprint: before.fingerprint, packages: before.toSend }] });
    expect(ap.status, JSON.stringify(ap)).toBe("accepted");
    const swap = await manual(jon, "Cucumber bowls", [{ key: "cucumber", quantity: "0.5", unit: "each" }]); // exact 1/2 per plate
    await onNight(fx, jon, "fri", swap.result.versionId);
    const after = await line(fx.weekId, "cucumber");
    expect(after.meal.rational).toBe(before.meal.rational); // same amount …
    expect(after.fingerprint).not.toBe(before.fingerprint); // … different basis, different identity
    expect(after.approval?.valid ?? false).toBe(false);
  });

  it("EQR-02f: equal exact requirements written differently (½ cup and 8 tbsp) share one review identity; the approval stays valid", async () => {
    const { fx, jon } = await fresh();
    const half = await manual(jon, "Glaze A", [{ key: "soy_sauce", quantity: "0.5", unit: "cup" }]);
    const tbsp = await manual(jon, "Glaze B", [{ key: "soy_sauce", quantity: "8", unit: "tbsp" }]);
    await onNight(fx, jon, "fri", half.result.versionId);
    const a = await line(fx.weekId, "soy_sauce");
    const ap: any = await approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: [{ key: "soy_sauce", fingerprint: a.fingerprint, packages: a.toSend }] });
    expect(ap.status, JSON.stringify(ap)).toBe("accepted");
    await onNight(fx, jon, "fri", tbsp.result.versionId);
    const b = await line(fx.weekId, "soy_sauce");
    expect(b.meal.rational).toBe(a.meal.rational);
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(b.approval?.valid).toBe(true);
  });
});

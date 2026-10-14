/**
 * D157 — whole-recipe entry (2026-10-14): SaveRecipeVersion with `servings` (what the recipe makes) and each row's
 * `amount` for the WHOLE recipe. Real commands against PostgreSQL (table_test). Storage is unchanged: per-serving
 * `quantity`, and exact rows' `exact_amount` / `exact_servings`. Untouched rows keep their stored basis (a legacy
 * approximation is never relabelled exact); a typed whole amount is exact for the stated servings. The earlier
 * per-serving contract (no `servings`) still works.
 */
import { describe, expect, it } from "vitest";
import { fresh, op, q } from "./helpers";
import { imported, legacyRecipe } from "./eq-helpers";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { wholeAmountText, storedYield } from "@/domain/recipes/whole-amount";
import type { Actor } from "@/server/commands/framework";

const rowsOf = (versionId: string) =>
  q<any>(
    `SELECT id, ingredient_key AS key, quantity::text AS q, unit, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings
       FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort`,
    [versionId],
  );
const shape = (rows: any[]) => rows.map((r) => ({ key: r.key, q: r.q, basis: r.basis, amount: r.amount, servings: r.servings }));
type W = { key: string; amount: string; unit?: string; src?: string | null };
const saveWhole = (actor: Actor, servings: number | undefined, rows: W[], recipeId?: string, expectedVersionNo?: number) =>
  saveRecipeVersionCommand(actor, op(), {
    ...(recipeId ? { recipeId, expectedVersionNo } : {}), title: "Whole", instructions: "", components: [{ key: "main", name: "Main" }], servings,
    ingredients: rows.map((r) => ({ componentKey: "main", ingredientName: r.key.replace(/_/g, " "), ingredientKey: r.key, amount: r.amount, unit: r.unit ?? "each", ...(recipeId ? { sourceRowId: r.src ?? null } : {}) })),
  } as any) as Promise<any>;

describe("D157 whole-recipe entry", () => {
  it("WR-01: a new recipe typed as the recipe gives it — ½ lemon and 5 tomatoes, makes 4 — is exact for 4", async () => {
    const { jon } = await fresh();
    const s = await saveWhole(jon, 4, [{ key: "lemon", amount: "1/2" }, { key: "campari_tomatoes", amount: "5" }]);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(shape(await rowsOf(s.result.versionId))).toEqual([
      { key: "lemon", q: "0.125", basis: "exact", amount: "1/2", servings: 4 },
      { key: "campari_tomatoes", q: "1.25", basis: "exact", amount: "5", servings: 4 },
    ]);
  });

  it("WR-02: editing one amount of an imported recipe keeps the others exactly and keeps the recipe's yield", async () => {
    const { jon } = await fresh();
    const r = await imported(jon, "Brisket", 8, "3 lb beef brisket\n1 cup beef broth");
    const [b, br] = await rowsOf(r.versionId);
    // What the editor shows: the whole-recipe amounts at the recipe's 8 servings.
    expect(wholeAmountText({ quantity: b.q, exactAmount: b.amount, exactServings: b.servings }, 8).text).toBe("3");
    const s = await saveWhole(jon, 8, [{ key: b.key, amount: "3", unit: "lb", src: b.id }, { key: br.key, amount: "2", unit: "cup", src: br.id }], r.recipeId, 1);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const after = await rowsOf(s.result.versionId);
    expect(shape(after)).toEqual([
      { key: b.key, q: b.q, basis: "exact", amount: "3", servings: 8 }, // untouched: the stored row exactly
      { key: br.key, q: "0.25", basis: "exact", amount: "2", servings: 8 }, // 2 cups for the recipe of 8
    ]);
    expect(storedYield(after.map((x) => ({ quantity: x.q, exactAmount: x.amount, exactServings: x.servings }))).servings).toBe(8);
  });

  it("WR-03: an untouched legacy row stays legacy (its per-serving decimal, not relabelled exact); a changed one becomes exact", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old salad", [["cucumber", "0.333333333333", "each"], ["onion", "0.5", "each"]]);
    const [cuc, oni] = await rowsOf(old.versionId);
    const shown = wholeAmountText({ quantity: cuc.q }, 3);
    expect(shown).toEqual({ text: "1", legacy: true, approx: true }); // 0.999999999999 shown as about 1
    const s = await saveWhole(jon, 3, [{ key: "cucumber", amount: shown.text, src: cuc.id }, { key: "onion", amount: "2", src: oni.id }], old.recipeId, 1);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(shape(await rowsOf(s.result.versionId))).toEqual([
      { key: "cucumber", q: "0.333333333333", basis: "legacy", amount: null, servings: null },
      { key: "onion", q: "0.666666666666", basis: "exact", amount: "2", servings: 3 },
    ]);
  });

  it("WR-04: correcting the yield of a recipe an earlier editor saved per 1 serving (\"Makes 1\") divides by the stated servings", async () => {
    const { jon } = await fresh();
    // The earlier editor: "4 lb brisket" typed into a per-serving field.
    const v1: any = await saveRecipeVersionCommand(jon, op(), {
      title: "Written", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "brisket flat", ingredientKey: "brisket_flat", quantity: "4", unit: "lb" }],
    });
    expect(v1.status, JSON.stringify(v1)).toBe("accepted");
    const [row] = await rowsOf(v1.result.versionId);
    expect(shape([row])).toEqual([{ key: "brisket_flat", q: "4", basis: "exact", amount: "4", servings: 1 }]);
    // The member says it makes 8 and leaves "4" lb as the recipe's amount.
    const s = await saveWhole(jon, 8, [{ key: "brisket_flat", amount: "4", unit: "lb", src: row.id }], v1.result.recipeId, 1);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(shape(await rowsOf(s.result.versionId))).toEqual([{ key: "brisket_flat", q: "0.5", basis: "exact", amount: "4", servings: 8 }]);
  });

  it("WR-05: rows saved for different servings give no single yield; the member's stated servings apply to what they type", async () => {
    const rows = [{ quantity: "0.125", exactAmount: "1", exactServings: 8 }, { quantity: "0.25", exactAmount: "1/4", exactServings: 1 }];
    expect(storedYield(rows)).toEqual({ servings: null, conflict: [1, 8] });
    expect(wholeAmountText(rows[1], 8).text).toBe("2"); // the per-1-serving row read at 8 servings
  });

  it("WR-08: a recipe whose exact rows were saved for different servings (8, and 1 by an earlier editor) gets one yield when the member states it; no per-serving amount changes", async () => {
    const { jon } = await fresh();
    const r = await imported(jon, "Brisket", 8, "3 lb beef brisket\n1 cup beef broth");
    const [b, br] = await rowsOf(r.versionId);
    // The earlier editor: the broth typed per serving (0.25) → exact 1/4 for 1 serving.
    const v2: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: r.recipeId, expectedVersionNo: 1, title: "Brisket", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "beef brisket", ingredientKey: b.key, quantity: b.q, unit: "lb", sourceRowId: b.id },
        { componentKey: "main", ingredientName: "beef broth", ingredientKey: br.key, quantity: "0.25", unit: "cup", sourceRowId: br.id },
      ],
    } as any);
    const mixed = await rowsOf(v2.result.versionId);
    expect(storedYield(mixed.map((x) => ({ quantity: x.q, exactAmount: x.amount, exactServings: x.servings })))).toEqual({ servings: null, conflict: [1, 8] });
    // The member says it makes 8 and leaves the amounts as shown (3 lb, 2 cups).
    const shown = mixed.map((x) => wholeAmountText({ quantity: x.q, exactAmount: x.amount, exactServings: x.servings }, 8).text);
    expect(shown).toEqual(["3", "2"]);
    const s = await saveWhole(jon, 8, [{ key: b.key, amount: shown[0], unit: "lb", src: mixed[0].id }, { key: br.key, amount: shown[1], unit: "cup", src: mixed[1].id }], r.recipeId, 2);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const after = await rowsOf(s.result.versionId);
    expect(shape(after)).toEqual([
      { key: b.key, q: b.q, basis: "exact", amount: "3", servings: 8 },
      { key: br.key, q: "0.25", basis: "exact", amount: "2", servings: 8 }, // the same 0.25 a serving, now for the recipe of 8
    ]);
    expect(storedYield(after.map((x) => ({ quantity: x.q, exactAmount: x.amount, exactServings: x.servings }))).servings).toBe(8);
  });

  it("WR-06: the earlier per-serving contract still works (an open screen from before this release)", async () => {
    const { jon } = await fresh();
    const s: any = await saveRecipeVersionCommand(jon, op(), {
      title: "Earlier screen", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "rice", ingredientKey: "rice", quantity: "75", unit: "g" }],
    });
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    expect(shape(await rowsOf(s.result.versionId))).toEqual([{ key: "rice", q: "75", basis: "exact", amount: "75", servings: 1 }]);
  });

  it("WR-07: refusals — servings out of range, an amount that is not a number, an amount too small for the servings", async () => {
    const { jon } = await fresh();
    expect((await saveWhole(jon, 0, [{ key: "rice", amount: "1" }])).code).toBe("invalid");
    expect((await saveWhole(jon, 4, [{ key: "rice", amount: "lots" }])).code).toBe("invalid");
    expect((await saveWhole(jon, 4, [{ key: "rice", amount: "" }])).code).toBe("invalid");
    expect((await q<any>("SELECT count(*)::int n FROM recipe_versions WHERE title='Whole'"))[0].n).toBe(0);
  });
});

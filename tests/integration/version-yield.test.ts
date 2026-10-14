/**
 * B51 / D159 — a recipe version's original yield recorded on the version (migration 018), independently of its
 * ingredient rows. Real commands against PostgreSQL (table_test). Recording a missing yield changes no quantity;
 * correcting a recorded one keeps the whole-recipe amounts as written (nothing is scaled); an earlier client that
 * omits the yield never erases it; versions stay immutable and selected meals stay pinned with their own servings.
 */
import { describe, expect, it } from "vitest";
import pg from "pg";
import { fresh, op, q } from "./helpers";
import { imported, legacyRecipe } from "./eq-helpers";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import * as ml from "@/server/commands/meal-lists";
import { loadRecipeVersions } from "@/server/queries/load";
import { withClient } from "@/server/db/pool";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";
import { recipeYield, wholeAmountText } from "@/domain/recipes/whole-amount";
import type { Actor } from "@/server/commands/framework";

const rowsOf = (versionId: string) =>
  q<any>(
    `SELECT id, ingredient_key AS key, quantity::text AS q, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings
       FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort`,
    [versionId],
  );
const shape = (rows: any[]) => rows.map((r) => ({ key: r.key, q: r.q, basis: r.basis, amount: r.amount, servings: r.servings }));
const versionOf = async (recipeId: string) =>
  (await q<any>("SELECT v.id, v.version_no, v.servings, v.title FROM recipes r JOIN recipe_versions v ON v.id=r.current_version_id WHERE r.id=$1", [recipeId]))[0];
/** What the editor would send: every row's whole amount as shown at `servings` (typed values override). */
async function saveShown(actor: Actor, recipeId: string, expectedVersionNo: number, servings: number | undefined, typed: Record<string, string> = {}, title = "Yield") {
  const v = await versionOf(recipeId);
  const rows = await rowsOf(v.id);
  return (await saveRecipeVersionCommand(actor, op(), {
    recipeId, expectedVersionNo, title, instructions: "", components: [{ key: "main", name: "Main" }],
    ...(servings === undefined ? {} : { servings }),
    ingredients: rows.map((r) => ({
      componentKey: "main", ingredientName: r.key, ingredientKey: r.key, unit: "each", sourceRowId: r.id,
      ...(servings === undefined
        ? { quantity: r.q } // an earlier client: the stored per-serving amount
        : { amount: typed[r.key] ?? wholeAmountText({ quantity: r.q, exactAmount: r.amount, exactServings: r.servings }, servings).text }),
    })),
  } as any)) as any;
}

describe("B51 recipe version yield", () => {
  it("VY-01: an all-legacy recipe — 'makes 6' saved with no amount changed is recorded on the version; every row is unchanged and still legacy; reopening shows 6", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old stew", [["onion", "0.6667", "each"], ["carrot", "0.333333333333", "each"]]);
    const before = shape(await rowsOf(old.versionId));
    const s = await saveShown(jon, old.recipeId, 1, 6);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const v2 = await versionOf(old.recipeId);
    expect(v2.servings).toBe(6);
    expect(shape(await rowsOf(v2.id))).toEqual(before); // same per-serving decimals, still legacy — nothing relabelled
    expect((await versionOf(old.recipeId)).version_no).toBe(2);
    expect((await q<any>("SELECT servings FROM recipe_versions WHERE id=$1", [old.versionId]))[0].servings).toBeNull(); // v1 untouched
    // Reopening: the snapshot carries the recorded yield, and it is what every surface reads.
    const loaded = (await withClient((c) => loadRecipeVersions(c, fx.householdId, [v2.id]))).get(v2.id)!;
    expect(loaded.servings).toBe(6);
    expect(recipeYield(loaded as any)).toBe(6);
  });

  it("VY-02: title-only saves keep the recorded yield — from the new editor (amounts as shown) and from an earlier client that omits it", async () => {
    const { fx, jon, alex } = await fresh();
    const old = await legacyRecipe(fx, "Old stew", [["onion", "0.5", "each"]]);
    expect((await saveShown(jon, old.recipeId, 1, 6)).status).toBe("accepted");
    // An earlier client: no `servings`, per-serving quantities — never erases the yield.
    const a = await saveShown(alex, old.recipeId, 2, undefined, {}, "Old stew (Alex)");
    expect(a.status, JSON.stringify(a)).toBe("accepted");
    const v3 = await versionOf(old.recipeId);
    expect(v3).toMatchObject({ version_no: 3, servings: 6, title: "Old stew (Alex)" });
    expect(shape(await rowsOf(v3.id))).toEqual([{ key: "onion", q: "0.5", basis: "legacy", amount: null, servings: null }]);
    // The new editor's title-only save: the yield field shows 6, amounts as shown.
    const b = await saveShown(jon, old.recipeId, 3, 6, {}, "Old stew (Jon)");
    expect(b.status, JSON.stringify(b)).toBe("accepted");
    expect(await versionOf(old.recipeId)).toMatchObject({ version_no: 4, servings: 6 });
    expect(shape(await rowsOf((await versionOf(old.recipeId)).id))).toEqual([{ key: "onion", q: "0.5", basis: "legacy", amount: null, servings: null }]);
  });

  it("VY-03: a confirmed import records its reviewed yield; exact rows unchanged", async () => {
    const { jon } = await fresh();
    const r = await imported(jon, "Brisket", 8, "3 lb beef brisket\n1 cup beef broth");
    expect((await q<any>("SELECT servings FROM recipe_versions WHERE id=$1", [r.versionId]))[0].servings).toBe(8);
    expect(shape(await rowsOf(r.versionId)).map((x) => [x.amount, x.servings])).toEqual([["3", 8], ["1", 8]]);
  });

  it("VY-04: correcting a recorded yield keeps the whole-recipe amounts as written — nothing is scaled; only the per-serving share changes", async () => {
    const { jon } = await fresh();
    const r = await imported(jon, "Brisket", 8, "3 lb beef brisket\n1 cup beef broth");
    const s = await saveShown(jon, r.recipeId, 1, 6, { beef_brisket: "3", beef_broth: "1" });
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const v2 = await versionOf(r.recipeId);
    expect(v2.servings).toBe(6);
    expect(shape(await rowsOf(v2.id))).toEqual([
      { key: "beef_brisket", q: "0.5", basis: "exact", amount: "3", servings: 6 },
      { key: "beef_broth", q: "0.166666666666", basis: "exact", amount: "1", servings: 6 },
    ]);
  });

  it("VY-05: mixed rows (exact and legacy) — recording a missing yield changes no quantity; the exact row is recorded for it at the same per-serving value", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Mixed", [["onion", "0.5", "each"], ["rice", "0.25", "cup"]]);
    // An earlier client changed the rice per serving (→ exact 1/3 for 1 serving), leaving onion legacy.
    const [on, ri] = await rowsOf(old.versionId);
    const e: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: old.recipeId, expectedVersionNo: 1, title: "Mixed", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "onion", ingredientKey: "onion", quantity: on.q, unit: "each", sourceRowId: on.id },
        { componentKey: "main", ingredientName: "rice", ingredientKey: "rice", quantity: "0.5", unit: "cup", sourceRowId: ri.id },
      ],
    });
    expect(e.status, JSON.stringify(e)).toBe("accepted");
    expect((await versionOf(old.recipeId)).servings).toBeNull(); // nothing recorded, nothing invented
    const mixed = shape(await rowsOf((await versionOf(old.recipeId)).id));
    expect(mixed).toEqual([
      { key: "onion", q: "0.5", basis: "legacy", amount: null, servings: null },
      { key: "rice", q: "0.5", basis: "exact", amount: "1/2", servings: 1 },
    ]);
    const s = await saveShown(jon, old.recipeId, 2, 4);
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const v3 = await versionOf(old.recipeId);
    expect(v3.servings).toBe(4);
    expect(shape(await rowsOf(v3.id))).toEqual([
      { key: "onion", q: "0.5", basis: "legacy", amount: null, servings: null },
      { key: "rice", q: "0.5", basis: "exact", amount: "2", servings: 4 }, // 0.5 a serving, as before
    ]);
  });

  it("VY-06: a selected meal stays pinned to its version with its own servings when the recipe's yield is recorded or corrected", async () => {
    const { fx, jon } = await fresh();
    const r = await imported(jon, "Brisket", 8, "3 lb beef brisket");
    const add: any = await ml.addSelectedMealCommand(jon, op(), { recipeId: r.recipeId, versionId: r.versionId, servings: 4 });
    expect(add.status, JSON.stringify(add)).toBe("accepted");
    expect((await saveShown(jon, r.recipeId, 1, 6, { beef_brisket: "3" })).status).toBe("accepted");
    const [m] = await q<any>("SELECT recipe_version_id, servings FROM selected_meals WHERE household_id=$1 AND status='active'", [fx.householdId]);
    expect(m).toEqual({ recipe_version_id: r.versionId, servings: 4 });
  });

  it("VY-07: refusals — a yield out of range writes nothing; the column refuses one too", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old stew", [["onion", "0.5", "each"]]);
    expect((await saveShown(jon, old.recipeId, 1, 0)).code).toBe("invalid");
    expect((await saveShown(jon, old.recipeId, 1, 1001)).code).toBe("invalid");
    expect((await versionOf(old.recipeId)).version_no).toBe(1);
    // A saved version's yield never changes afterwards (versions are immutable in the database) …
    await expect(q("UPDATE recipe_versions SET servings=6 WHERE id=$1", [old.versionId])).rejects.toThrow(/immutable record/);
    // … and the column refuses an out-of-range yield from any writer.
    await expect(q(
      "INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by, servings) VALUES ($1,$2,9,'x','','manual',false,$3,0)",
      [old.recipeId, fx.householdId, fx.members.jon],
    )).rejects.toThrow(/recipe_versions_servings_range/);
  });

  it("VY-08: export and restore carry the recorded yield, and a version without one stays without", async () => {
    const { fx, jon } = await fresh();
    const old = await legacyRecipe(fx, "Old stew", [["onion", "0.5", "each"]]);
    expect((await saveShown(jon, old.recipeId, 1, 6)).status).toBe("accepted");
    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    const exported = (data.tables.recipe_versions as any[]).filter((v) => v.recipe_id === old.recipeId).map((v) => [v.version_no, v.servings]);
    expect(exported.sort()).toEqual([[1, null], [2, 6]]);
    const restoreUrl = "postgres://table@127.0.0.1:54329/table_restore_check";
    await migrate(restoreUrl);
    const dst = new pg.Client({ connectionString: restoreUrl });
    await dst.connect();
    try {
      const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      await restoreHousehold(dst, JSON.parse(JSON.stringify(data)));
      const back = (await dst.query("SELECT version_no, servings FROM recipe_versions WHERE recipe_id=$1 ORDER BY version_no", [old.recipeId])).rows;
      expect(back).toEqual([{ version_no: 1, servings: null }, { version_no: 2, servings: 6 }]);
      // An export made before migration 018 (no `servings` key) restores as "not recorded".
      const older = JSON.parse(JSON.stringify(data));
      for (const v of older.tables.recipe_versions) delete v.servings;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      await restoreHousehold(dst, older);
      expect((await dst.query("SELECT count(*)::int n FROM recipe_versions WHERE servings IS NOT NULL")).rows[0].n).toBe(0);
    } finally {
      await dst.end();
    }
  });
});

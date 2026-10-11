/**
 * Catalog-first §4 — the three reference recipes, offline. Synthetic pages in tests/fixtures/import-site (no
 * publisher wording, no photos) served under the real host names by the in-process fixture transport; nothing
 * reaches the network. Real PostgreSQL.
 *
 * CF-A  Budget Bytes is refused before any request (D90); the paste fallback makes a recipe with its source link,
 *       no photo and the method left on the source.
 * CF-B  Brisket tacos: red and yellow onion stay distinct; toppings with no amount become "Needs a quantity" (no
 *       invented amount, never bought); an 8½-hour time is kept; pasted group headings become three components;
 *       edits carry the Needs-a-quantity items forward; export → restore keeps them.
 * CF-C  Garlic chicken pasta: conflicting yields are all shown and servings stay required; the page's nutrition is
 *       never used (D88); the two garlic and two oil lines sum in demand.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import pg from "pg";
import { fresh, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import * as library from "@/server/commands/library";
import { librarySnapshot } from "@/server/queries/library";
import { loadRecipeVersions } from "@/server/queries/load";
import type { Db } from "@/server/db/pool";
import { addRecipeFromLink, fixtureDeps, type ImportDeps } from "@/server/recipe-import-service";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";
import { eventDemand } from "@/domain/recipes/plate";
import { convertQ, Q } from "@/domain/exact";
import { titleFromUrl, type DraftLine } from "@/domain/recipes/import";
import type { RecipeContentConfig } from "@/server/env";

const MANIFEST = path.resolve(__dirname, "../fixtures/import-site/manifest.json");
const BB = "https://www.budgetbytes.com/one-pot-chicken-and-rice/";
const PW = "https://www.thepioneerwoman.com/food-cooking/recipes/a42389030/brisket-tacos-recipe/";
const KTML = "https://keytomylime.com/garlic-chicken-pasta-recipe/";
const OFF: RecipeContentConfig = { householdPrivate: false, grants: [] };
type Call = { ip: string; hostname: string; path: string };
const deps = (calls: Call[] = []): ImportDeps => ({ ...fixtureDeps(MANIFEST, calls), content: () => OFF });
const draftRow = async (id: string) => (await q<any>("SELECT * FROM recipe_import_drafts WHERE id=$1", [id]))[0];
const byRaw = (d: any) => Object.fromEntries((d.lines as DraftLine[]).map((l, index) => [l.raw, { ...l, index }]));
// This cluster's restore database (never another cluster's): TABLE_RESTORE_CHECK_URL, else beside DATABASE_URL.
const restoreUrl = () => process.env.TABLE_RESTORE_CHECK_URL ?? process.env.DATABASE_URL!.replace(/\/[^/]+$/, "/table_restore_check");

const TOPPINGS = ["Flour tortillas, for serving", "Fresh cilantro, for serving", "Lime wedges, for serving", "Crumbled cotija, for serving"];
const PASTED_WITH_HEADINGS = [
  "For the brisket:", "3 lb beef brisket, trimmed", "1 tablespoon chili powder", "2 teaspoons ground cumin", "1 teaspoon kosher salt", "1 cup beef broth",
  "1/2 yellow onion, diced", "3 cloves garlic, minced",
  "For the pickled onions:", "1 red onion, thinly sliced", "1/2 cup apple cider vinegar", "1 tablespoon sugar",
  "Toppings:", ...TOPPINGS,
].join("\n");

async function confirm(actor: any, draftId: string, patch: Record<string, unknown> = {}) {
  const d = await draftRow(draftId);
  const u: any = await imports.updateImportDraftCommand(actor, op(), { draftId, expectedRevision: d.revision, ...patch });
  expect(u.status, JSON.stringify(u)).toBe("accepted");
  const c: any = await imports.confirmImportDraftCommand(actor, op(), { draftId, expectedRevision: u.result.revision });
  expect(c.status, JSON.stringify(c)).toBe("accepted");
  return c.result as { recipeId: string; versionId: string };
}
const unquantifiedOf = (versionId: string) =>
  q<any>("SELECT position, component_key, ingredient_key, name, note, raw FROM recipe_unquantified_items WHERE recipe_version_id=$1 ORDER BY position", [versionId]);

describe("CF-A Budget Bytes, One Pot Chicken and Rice", () => {
  it("CF-A1: the page is never requested; the refusal says Budget Bytes asks for permission and to paste; the link stays", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: BB, operationId: op() }, deps(calls));
    expect(r).toMatchObject({ kind: "not_read", status: "permission_blocked" });
    expect(r.message).toMatch(/Budget Bytes asks for permission/);
    expect(r.message).toMatch(/Paste or type the ingredients/);
    expect(calls.filter((c) => /budgetbytes\.com$/.test(c.hostname))).toEqual([]);
    expect(calls).toEqual([]);
    const [b] = await q<any>("SELECT url, status, source_label FROM recipe_bookmarks WHERE id=$1", [r.bookmarkId]);
    expect(b).toMatchObject({ url: BB, status: "permission_blocked", source_label: "Budget Bytes" });
    expect(await q("SELECT 1 FROM recipe_import_drafts")).toEqual([]);
  });

  it("CF-A2: the paste fallback (name from the link, 4 servings) makes a recipe with its source link, no photo and the method on the source", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: BB, operationId: op() }, deps(calls));
    const title = titleFromUrl(BB);
    expect(title).toBe("One pot chicken and rice");
    const text = ["1 lb boneless skinless chicken thighs", "1 cup long grain white rice", "2 cups chicken broth", "1 yellow onion, diced", "2 cloves garlic, minced", "salt to taste"].join("\n");
    const p: any = await imports.pasteIngredientsCommand(jon, op(), { bookmarkId: r.bookmarkId, text, title });
    expect(p.status, JSON.stringify(p)).toBe("accepted");
    const { recipeId, versionId } = await confirm(jon, p.result.draftId, { servings: 4 });
    const [v] = await q<any>("SELECT title, source_url, source_label, image_id, instructions, provenance FROM recipe_versions WHERE id=$1", [versionId]);
    expect(v).toMatchObject({ title: "One pot chicken and rice", source_url: BB, source_label: "Budget Bytes", image_id: null, instructions: "", provenance: "imported" });
    expect(await q("SELECT 1 FROM recipe_images")).toEqual([]);
    const lib: any = await librarySnapshot(jon);
    const rec = lib.recipes.find((x: any) => x.recipeId === recipeId);
    expect(rec.photo).toBeNull();
    expect(rec.version).toMatchObject({ sourceUrl: BB, instructions: "" }); // the detail links to the method on the source
    const rows = await q<any>("SELECT ingredient_key, quantity::text AS q, unit FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [versionId]);
    expect(rows).toContainEqual({ ingredient_key: "long_grain_white_rice", q: "0.25", unit: "cup" }); // 1 cup ÷ 4 servings
    expect(calls).toEqual([]); // still nothing read from Budget Bytes
  });
});

describe("CF-B Brisket tacos", () => {
  it("CF-B1: read from the page — onions distinct, toppings Need a quantity (no amount invented), the long time kept", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: PW, operationId: op() }, deps(calls));
    expect(r.kind, JSON.stringify(r)).toBe("draft");
    expect(calls.map((c) => `${c.hostname}${c.path}`)).toEqual(["www.thepioneerwoman.com/food-cooking/recipes/a42389030/brisket-tacos-recipe/"]);
    const d = await draftRow(r.draftId);
    expect(d).toMatchObject({ servings: 8, effort_minutes: 510, yield_text: "8 servings", source_steps: null, image_id: null });
    const lines = byRaw(d);
    expect(lines["1 red onion, thinly sliced"].decision).toEqual({ use: true, name: "red onion", quantity: "1", unit: "each", form: "raw" });
    expect(lines["1/2 yellow onion, diced"].decision).toEqual({ use: true, name: "yellow onion", quantity: "1/2", unit: "each", form: "raw" });
    expect(lines["1 teaspoon kosher salt"].decision).toEqual({ use: false });
    for (const raw of TOPPINGS) {
      expect(lines[raw].decision, raw).toMatchObject({ use: false, kind: "needs_quantity" });
      expect(lines[raw].parsed.quantity, raw).toBeNull();
    }
    const { recipeId, versionId } = await confirm(jon, r.draftId);
    const [v] = await q<any>("SELECT effort_minutes, summary FROM recipe_versions WHERE id=$1", [versionId]);
    expect(v.effort_minutes).toBe(510);
    expect(v.summary).toBe("Not counted in groceries: 1 teaspoon kosher salt"); // toppings are not "left out"
    const rows = await q<any>("SELECT component_key, ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [versionId]);
    const keys = rows.map((x) => x.ingredient_key);
    expect(keys).toContain("red_onion");
    expect(keys).toContain("yellow_onion");
    expect(new Set(rows.map((x) => x.component_key))).toEqual(new Set(["main"]));
    expect(await q("SELECT key, name FROM recipe_components WHERE recipe_version_id=$1", [versionId])).toEqual([{ key: "main", name: "Main" }]);
    // Never an ingredient row (never bought) — kept as Needs a quantity, under its group, with what the recipe said.
    for (const k of ["flour_tortillas", "fresh_cilantro", "lime_wedges", "crumbled_cotija"]) expect(keys).not.toContain(k);
    expect(await unquantifiedOf(versionId)).toEqual([
      { position: 0, component_key: "main", ingredient_key: "flour_tortillas", name: "Flour tortillas", note: "for serving", raw: "Flour tortillas, for serving" },
      { position: 1, component_key: "main", ingredient_key: "fresh_cilantro", name: "Fresh cilantro", note: "for serving", raw: "Fresh cilantro, for serving" },
      { position: 2, component_key: "main", ingredient_key: "lime_wedges", name: "Lime wedges", note: "for serving", raw: "Lime wedges, for serving" },
      { position: 3, component_key: "main", ingredient_key: "crumbled_cotija", name: "Crumbled cotija", note: "for serving", raw: "Crumbled cotija, for serving" },
    ]);
    // The ingredients exist exactly as the row writer makes them (allergen information not yet known).
    const ing = await q<any>("SELECT key, allergen_info_known FROM ingredients WHERE key = ANY($1) ORDER BY key", [["crumbled_cotija", "flour_tortillas", "fresh_cilantro", "lime_wedges"]]);
    expect(ing.map((x) => x.key)).toEqual(["crumbled_cotija", "flour_tortillas", "fresh_cilantro", "lime_wedges"]);
    // Library and loaded versions carry them; demand never includes them.
    const lib: any = await librarySnapshot(jon);
    const rec = lib.recipes.find((x: any) => x.recipeId === recipeId);
    expect(rec.version.unquantified.map((u: any) => [u.componentKey, u.name, u.note])).toEqual(TOPPINGS.map((t) => ["main", t.split(",")[0], "for serving"]));
    const c = await client();
    const rv = (await loadRecipeVersions(c as unknown as Db, jon.householdId, [versionId])).get(versionId)!;
    await c.end();
    expect(rv.unquantified?.map((u) => u.name)).toEqual(["Flour tortillas", "Fresh cilantro", "Lime wedges", "Crumbled cotija"]);
    const demand = eventDemand(rv, [{ cookingEventId: "x", memberId: jon.memberId, kind: "dinner", night: "2026-10-12", componentPortions: { main: "8" } }]);
    expect(demand.lines.map((l) => l.ingredientKey)).not.toContain("flour_tortillas");
    expect(demand.lines.find((l) => l.ingredientKey === "red_onion")!.exact.eq(1)).toBe(true);
    expect(demand.lines.find((l) => l.ingredientKey === "yellow_onion")!.exact.eq(Q.frac(1, 2))).toBe(true);
  });

  it("CF-B2: pasted with group headings → three components; headings are never ingredients", async () => {
    const { jon } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: PW, operationId: op() }, deps());
    await imports.discardImportDraftCommand(jon, op(), { draftId: r.draftId, expectedRevision: 1 });
    const p: any = await imports.pasteIngredientsCommand(jon, op(), { bookmarkId: r.bookmarkId, text: PASTED_WITH_HEADINGS, title: "Brisket Tacos" });
    expect(p.status, JSON.stringify(p)).toBe("accepted");
    const d = await draftRow(p.result.draftId);
    const lines = byRaw(d);
    for (const h of ["For the brisket:", "For the pickled onions:", "Toppings:"]) expect(lines[h].decision, h).toEqual({ use: false, kind: "heading" });
    const { versionId } = await confirm(jon, p.result.draftId, { servings: 8 });
    expect(await q("SELECT key, name, sort FROM recipe_components WHERE recipe_version_id=$1 ORDER BY sort", [versionId])).toEqual([
      { key: "brisket", name: "Brisket", sort: 0 },
      { key: "pickled_onions", name: "Pickled onions", sort: 1 },
      { key: "toppings", name: "Toppings", sort: 2 },
    ]);
    const rows = await q<any>("SELECT component_key, ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [versionId]);
    expect(rows).toEqual([
      { component_key: "brisket", ingredient_key: "beef_brisket" },
      { component_key: "brisket", ingredient_key: "chili_powder" },
      { component_key: "brisket", ingredient_key: "ground_cumin" },
      { component_key: "brisket", ingredient_key: "beef_broth" },
      { component_key: "brisket", ingredient_key: "yellow_onion" },
      { component_key: "brisket", ingredient_key: "garlic_clove" },
      { component_key: "pickled_onions", ingredient_key: "red_onion" },
      { component_key: "pickled_onions", ingredient_key: "apple_cider_vinegar" },
      { component_key: "pickled_onions", ingredient_key: "sugar" },
    ]);
    expect((await unquantifiedOf(versionId)).map((u) => [u.component_key, u.ingredient_key])).toEqual([
      ["toppings", "flour_tortillas"], ["toppings", "fresh_cilantro"], ["toppings", "lime_wedges"], ["toppings", "crumbled_cotija"],
    ]);
    expect(await q("SELECT key FROM ingredients WHERE key LIKE 'for_%' OR key IN ('toppings', 'brisket', 'pickled_onions')")).toEqual([]);
  });

  it("CF-B3: 'This is an ingredient' turns a heading into a line to decide; only heading-shaped lines can be headings; a range can't Need a quantity", async () => {
    const { jon } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: PW, operationId: op() }, deps());
    await imports.discardImportDraftCommand(jon, op(), { draftId: r.draftId, expectedRevision: 1 });
    const p: any = await imports.pasteIngredientsCommand(jon, op(), { bookmarkId: r.bookmarkId, text: "Toppings:\n1 lb beef\n2-3 limes\nFresh cilantro, for serving", title: "T" });
    const d = await draftRow(p.result.draftId);
    const lines = byRaw(d);
    const asIngredient: any = await imports.updateImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 1, servings: 2, decisions: [{ index: lines["Toppings:"].index, decision: null }] });
    expect(asIngredient.status).toBe("accepted");
    const early: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 2 });
    expect(early.code).toBe("incomplete");
    expect(early.details.problems.join(" ")).toMatch(/2 ingredient lines need a quick check/); // the former heading and the range
    const notHeading: any = await imports.updateImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 2, decisions: [{ index: lines["1 lb beef"].index, decision: { use: false, kind: "heading" } }] });
    expect(notHeading).toMatchObject({ status: "rejected", code: "invalid" });
    const range: any = await imports.updateImportDraftCommand(jon, op(), {
      draftId: d.id, expectedRevision: 2, decisions: [{ index: lines["2-3 limes"].index, decision: { use: false, kind: "needs_quantity", name: "limes" } }],
    });
    expect(range).toMatchObject({ status: "rejected", code: "invalid" });
    // Back to a heading, and the range given an amount: the recipe saves.
    const done: any = await imports.updateImportDraftCommand(jon, op(), {
      draftId: d.id, expectedRevision: 2,
      decisions: [{ index: lines["Toppings:"].index, decision: { use: false, kind: "heading" } }, { index: lines["2-3 limes"].index, decision: { use: true, name: "limes", quantity: "2", unit: "each", form: "raw" } }],
    });
    expect(done.status, JSON.stringify(done)).toBe("accepted");
    const ok: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 3 });
    expect(ok.status, JSON.stringify(ok)).toBe("accepted");
    expect(await q("SELECT key, name FROM recipe_components WHERE recipe_version_id=$1", [ok.result.versionId])).toEqual([{ key: "toppings", name: "Toppings" }]);
  });

  it("CF-B4: an edit carries the Needs-a-quantity items forward unchanged (new rows, same content); their component can't be removed", async () => {
    const { jon, alex } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: PW, operationId: op() }, deps());
    await imports.discardImportDraftCommand(jon, op(), { draftId: r.draftId, expectedRevision: 1 });
    const p: any = await imports.pasteIngredientsCommand(jon, op(), { bookmarkId: r.bookmarkId, text: PASTED_WITH_HEADINGS, title: "Brisket Tacos" });
    const { recipeId, versionId } = await confirm(jon, p.result.draftId, { servings: 8 });
    const v1 = (await librarySnapshot(jon)).recipes.find((x: any) => x.recipeId === recipeId)!.version;
    const same = (v: any, title: string) => ({
      recipeId, title, instructions: v.instructions, expectedVersionNo: v.versionNo, components: v.components.map((c: any) => ({ key: c.key, name: c.name })),
      ingredients: v.ingredients.map((i: any) => ({ componentKey: i.componentKey, ingredientKey: i.ingredientKey, ingredientName: i.name, quantity: i.quantity, unit: i.unit, sourceRowId: i.rowId })),
    });
    const t: any = await library.saveRecipeVersionCommand(alex, op(), same(v1, "Brisket Tacos (ours)"));
    expect(t.status, JSON.stringify(t)).toBe("accepted");
    const before = await unquantifiedOf(versionId);
    const after = await unquantifiedOf(t.result.versionId);
    expect(after).toEqual(before);
    expect(after).toHaveLength(4);
    const ids = async (vid: string) => (await q<any>("SELECT id FROM recipe_unquantified_items WHERE recipe_version_id=$1", [vid])).map((x) => x.id);
    const oldIds = await ids(versionId);
    expect((await ids(t.result.versionId)).some((id) => oldIds.includes(id))).toBe(false);
    // A client cannot add or replace them through a save.
    const v2 = (await librarySnapshot(jon)).recipes.find((x: any) => x.recipeId === recipeId)!.version;
    const injected: any = await library.saveRecipeVersionCommand(jon, op(), { ...same(v2, "Brisket Tacos (ours)"), unquantified: [{ componentKey: "toppings", name: "Gold leaf" }] } as any);
    expect(injected.status).toBe("accepted");
    expect((await unquantifiedOf(injected.result.versionId)).map((u) => u.name)).toEqual(["Flour tortillas", "Fresh cilantro", "Lime wedges", "Crumbled cotija"]);
    // Removing the component that holds them is refused, with nothing written.
    const v3 = (await librarySnapshot(jon)).recipes.find((x: any) => x.recipeId === recipeId)!.version;
    const versions = (await q("SELECT count(*)::int AS n FROM recipe_versions WHERE recipe_id=$1", [recipeId]))[0];
    const draft = same(v3, "No toppings");
    draft.components = draft.components.filter((c: any) => c.key !== "toppings");
    const refused: any = await library.saveRecipeVersionCommand(jon, op(), draft);
    expect(refused).toMatchObject({ status: "rejected", code: "invalid" });
    expect(refused.message).toMatch(/needs a quantity/);
    expect((await q("SELECT count(*)::int AS n FROM recipe_versions WHERE recipe_id=$1", [recipeId]))[0]).toEqual(versions);
  });

  it("CF-B5: export → restore keeps the Needs-a-quantity items", async () => {
    const { jon, fx } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: PW, operationId: op() }, deps());
    const { versionId } = await confirm(jon, r.draftId);
    const before = await unquantifiedOf(versionId);
    const src = await client();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    expect(data.tables.recipe_unquantified_items).toHaveLength(4);
    for (const t of Object.keys(data.tables)) data.tables[t].reverse();
    await migrate(restoreUrl());
    const dst = new pg.Client({ connectionString: restoreUrl() });
    await dst.connect();
    try {
      const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      await restoreHousehold(dst, JSON.parse(JSON.stringify(data)));
      const restored = (await dst.query("SELECT position, component_key, ingredient_key, name, note, raw FROM recipe_unquantified_items WHERE recipe_version_id=$1 ORDER BY position", [versionId])).rows;
      expect(restored).toEqual(before);
    } finally {
      await dst.end();
    }
  });
});

describe("CF-C Garlic chicken pasta", () => {
  it("CF-C1: every stated yield is shown; servings stay empty and required; the page's nutrition is never used; garlic and oil sum", async () => {
    const { jon } = await fresh();
    const nutritionBefore = await q("SELECT count(*)::int AS n FROM nutrition_matches");
    const r: any = await addRecipeFromLink(jon, { url: KTML, operationId: op() }, deps());
    expect(r.kind, JSON.stringify(r)).toBe("draft");
    const d = await draftRow(r.draftId);
    expect(d).toMatchObject({ servings: null, yield_text: "4 · 6 servings", source_has_nutrition: true, effort_minutes: 30 });
    expect(JSON.stringify(d)).not.toMatch(/777|55 g|1 cup"/);
    const lib0: any = await librarySnapshot(jon);
    expect(lib0.bookmarks.find((b: any) => b.id === r.bookmarkId).draft).toMatchObject({ yieldText: "4 · 6 servings", servings: null, sourceHasNutrition: true });
    const early: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 1 });
    expect(early.code).toBe("incomplete");
    expect(early.details.problems).toContain("Enter how many servings the ingredient amounts make.");
    expect(await q("SELECT 1 FROM recipe_versions WHERE provenance='imported'")).toEqual([]);
    const { recipeId, versionId } = await confirm(jon, d.id, { servings: 4 });
    const [v] = await q<any>("SELECT * FROM recipe_versions WHERE id=$1", [versionId]);
    expect(JSON.stringify(v)).not.toMatch(/777|kcal/);
    expect(await q("SELECT count(*)::int AS n FROM nutrition_matches")).toEqual(nutritionBefore);
    const lib: any = await librarySnapshot(jon);
    const rec = lib.recipes.find((x: any) => x.recipeId === recipeId);
    expect(rec.nutritionPerPlate.calories).not.toBe("777");
    expect(JSON.stringify(rec)).not.toMatch(/777/);
    // Two garlic lines and two oil lines stay rows of their own and add up for one cooking of 4 servings.
    const rows = await q<any>("SELECT ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1 AND ingredient_key IN ('garlic_clove', 'olive_oil')", [versionId]);
    expect(rows).toHaveLength(4);
    const c = await client();
    const rv = (await loadRecipeVersions(c as unknown as Db, jon.householdId, [versionId])).get(versionId)!;
    await c.end();
    const demand = eventDemand(rv, [{ cookingEventId: "x", memberId: jon.memberId, kind: "dinner", night: "2026-10-12", componentPortions: { main: "4" } }]);
    const garlic = demand.lines.filter((l) => l.ingredientKey === "garlic_clove");
    const oil = demand.lines.filter((l) => l.ingredientKey === "olive_oil");
    expect(garlic).toHaveLength(1);
    expect(garlic[0].exact.eq(7)).toBe(true); // 4 + 3 cloves
    expect(oil).toHaveLength(1);
    expect(oil[0].exact.eq(convertQ(Q.of(3), "tbsp", oil[0].unit)!)).toBe(true); // 2 + 1 tbsp
    expect(demand.lines.map((l) => l.ingredientKey)).not.toContain("salt");
  });
});

async function client() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  return c;
}

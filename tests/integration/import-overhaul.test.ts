/**
 * Import overhaul (2026-10-09), real PostgreSQL, synthetic page `tests/fixtures/import-site/pesto.html`
 * through the in-process fixture transport (no network).
 *
 * IO-01  every cleanly read line starts as Use with its exact amount (the reported pesto line included);
 *        only a range and a line with no amount wait for a person; salt and pepper are left out.
 * IO-02  correcting the two lines and confirming makes a recipe whose amounts are the exact fractions
 *        divided by servings; the source link is kept; salt and pepper are not in the recipe.
 * IO-03  a member may type an exact fraction; nonsense is refused with the line named.
 * IO-04  the draft carries no "suggestion" workflow fields any more.
 * IO-05  household-private mode keeps the method but no longer copies the publisher's photo; a per-site
 *        grant for photos still does.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { fresh, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import { addRecipeFromLink, fixtureDeps, type ImportDeps } from "@/server/recipe-import-service";
import type { DraftLine } from "@/domain/recipes/import";
import type { RecipeContentConfig } from "@/server/env";

const MANIFEST = path.resolve(__dirname, "../fixtures/import-site/manifest.json");
const PESTO = "https://pesto.example.com/weeknight-pesto-pasta/";
const OFF: RecipeContentConfig = { householdPrivate: false, grants: [] };
const deps = (content: RecipeContentConfig): ImportDeps => ({ ...fixtureDeps(MANIFEST, []), content: () => content });
const draftRow = async (id: string) => (await q<any>("SELECT * FROM recipe_import_drafts WHERE id=$1", [id]))[0];

async function pestoDraft() {
  const f = await fresh();
  const r: any = await addRecipeFromLink(f.jon, { url: PESTO, operationId: op() }, deps(OFF));
  expect(r.kind, JSON.stringify(r)).toBe("draft");
  const d = await draftRow(r.draftId);
  const byRaw = Object.fromEntries((d.lines as DraftLine[]).map((l, i) => [l.raw, { ...l, index: i }]));
  return { ...f, d, byRaw };
}

describe("import overhaul", () => {
  it("IO-01: clean lines default to Use with exact amounts; only genuinely uncertain lines wait; seasonings are left out", async () => {
    const { byRaw } = await pestoDraft();
    const use = (raw: string) => byRaw[raw].decision;
    expect(use("1/3 cup pesto (homemade (or store-bought))")).toEqual({ use: true, name: "pesto", quantity: "1/3", unit: "cup", form: "raw" });
    expect(byRaw["1/3 cup pesto (homemade (or store-bought))"].parsed).toMatchObject({ note: "homemade (or store-bought)", status: "parsed" });
    expect(use("12 oz penne pasta")).toMatchObject({ use: true, quantity: "12", unit: "oz", name: "penne pasta" });
    expect(use("1 ½ cups frozen peas")).toMatchObject({ use: true, quantity: "1 1/2", unit: "cup", name: "frozen peas" });
    expect(use("1 pint cherry tomatoes, halved")).toMatchObject({ use: true, quantity: "2", unit: "cup", name: "cherry tomatoes" });
    expect(use("1 (8 oz) container fresh mozzarella pearls, drained")).toMatchObject({ use: true, quantity: "8", unit: "oz", name: "fresh mozzarella pearls" });
    expect(use("¼ cup grated parmesan (about 1 oz)")).toMatchObject({ use: true, quantity: "1/4", unit: "cup", name: "grated parmesan" });
    expect(use("1 red bell pepper, sliced")).toMatchObject({ use: true, quantity: "1", unit: "each", name: "red bell pepper" });
    expect(use("1 tbsp olive oil")).toMatchObject({ use: true, quantity: "1", unit: "tbsp", name: "olive oil" });
    expect(use("1 tsp kosher salt")).toEqual({ use: false });
    expect(use("½ tsp freshly ground black pepper")).toEqual({ use: false });
    expect(byRaw["1 tsp kosher salt"].parsed.status).toBe("omitted");
    for (const raw of ["2-3 cloves garlic, minced", "fresh basil, for serving"]) {
      expect(byRaw[raw].decision, raw).toBeNull();
      expect(byRaw[raw].parsed.status, raw).toBe("requires_review");
      expect(byRaw[raw].parsed.name, raw).not.toBe(raw);
    }
    expect(byRaw["2-3 cloves garlic, minced"].parsed).toMatchObject({ name: "garlic (clove)", range: ["2", "3"], unit: "each" });
  });

  it("IO-02: correct the two uncertain lines, confirm: exact amounts per serving, source kept, seasonings not in the recipe", async () => {
    const { jon, d, byRaw } = await pestoDraft();
    const garlic = byRaw["2-3 cloves garlic, minced"].index;
    const basil = byRaw["fresh basil, for serving"].index;
    const u: any = await imports.updateImportDraftCommand(jon, op(), {
      draftId: d.id, expectedRevision: 1,
      decisions: [{ index: garlic, decision: { use: true, name: "garlic (clove)", quantity: "3", unit: "each", form: "raw" } }, { index: basil, decision: { use: false } }],
    });
    expect(u.status, JSON.stringify(u)).toBe("accepted");
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 2 });
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    const [v] = await q<any>("SELECT * FROM recipe_versions WHERE id=$1", [c.result.versionId]);
    expect(v.source_url).toBe(PESTO);
    // Keys, not names: the household already knows "pesto" and "olive_oil" (fixture names), and the import maps to them.
    const ings = await q<any>("SELECT ingredient_key, quantity::text AS quantity, unit FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY ingredient_key", [c.result.versionId]);
    expect(ings.map((i) => [i.ingredient_key, i.quantity, i.unit])).toEqual([
      ["cherry_tomatoes", "0.5", "cup"],
      ["fresh_mozzarella_pearls", "2", "oz"],
      ["frozen_peas", "0.375", "cup"],
      ["garlic_clove", "0.75", "each"],
      ["grated_parmesan", "0.0625", "cup"],
      ["olive_oil", "0.25", "tbsp"],
      ["penne_pasta", "3", "oz"],
      ["pesto", "0.083333333333", "cup"],
      ["red_bell_pepper", "0.25", "each"],
    ]);
    expect(v.summary).toMatch(/Not counted in groceries: .*1 tsp kosher salt.*½ tsp freshly ground black pepper.*fresh basil, for serving/);
  });

  it("IO-03: an exact fraction may be typed; something that isn't an amount is refused with the line named", async () => {
    const { jon, d, byRaw } = await pestoDraft();
    const garlic = byRaw["2-3 cloves garlic, minced"].index;
    const ok: any = await imports.updateImportDraftCommand(jon, op(), {
      draftId: d.id, expectedRevision: 1, decisions: [{ index: garlic, decision: { use: true, name: "garlic (clove)", quantity: "2 1/2", unit: "each", form: "raw" } }],
    });
    expect(ok.status).toBe("accepted");
    for (const quantity of ["1/0", "abc", "0", "-1"]) {
      const bad: any = await imports.updateImportDraftCommand(jon, op(), {
        draftId: d.id, expectedRevision: 2, decisions: [{ index: garlic, decision: { use: true, name: "garlic (clove)", quantity, unit: "each", form: "raw" } }],
      });
      expect(bad, quantity).toMatchObject({ status: "rejected", code: "invalid" });
      expect(bad.message).toMatch(new RegExp(`Line ${garlic + 1}`));
    }
  });

  it("IO-04: no suggestion workflow is stored on a draft", async () => {
    const { d } = await pestoDraft();
    expect(JSON.stringify(d.lines)).not.toMatch(/suggestion/);
  });

  it("IO-05: household-private mode keeps the method but not the publisher's photo; a per-site photo grant still keeps it", async () => {
    const f = await fresh();
    const priv: any = await addRecipeFromLink(f.jon, { url: PESTO, operationId: op() }, deps({ householdPrivate: true, grants: [] }));
    const d1 = await draftRow(priv.draftId);
    expect(d1.content_policy).toMatchObject({ instructions: true, photos: false, kind: "owner_mode" });
    expect(d1.source_steps).toHaveLength(3);
    expect(d1.image_id).toBeNull();
    expect((await q<any>("SELECT count(*)::int AS n FROM recipe_images"))[0].n).toBe(0);
    await imports.discardImportDraftCommand(f.jon, op(), { draftId: d1.id, expectedRevision: 1 });
    const { importFromLink } = await import("@/server/recipe-import-service");
    const granted: any = await importFromLink(f.jon, { bookmarkId: priv.bookmarkId, operationId: op() }, deps({ householdPrivate: false, grants: [{ domain: "pesto.example.com", instructions: false, photos: true }] }));
    const d2 = await draftRow(granted.draftId);
    expect(d2.image_id).not.toBeNull();
    const [img] = await q<any>("SELECT content_type, permission FROM recipe_images WHERE id=$1", [d2.image_id]);
    expect(img).toEqual({ content_type: "image/jpeg", permission: "owner-recorded grant for pesto.example.com" });
  });
});

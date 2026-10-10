/**
 * URL-to-cart P1 — paste a recipe's link → structured details → reviewed draft → recipe. Real
 * PostgreSQL; every page and photo comes from the in-process fixture transport (no network).
 * The content policy (what of a page's own method and photos is KEPT) is injected per test; the
 * default is that nothing is kept.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { fresh, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import * as library from "@/server/commands/library";
import { librarySnapshot } from "@/server/queries/library";
import { addRecipeFromLink, fixtureDeps, importFromLink, type ImportDeps } from "@/server/recipe-import-service";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";
import type { DraftLine } from "@/domain/recipes/import";
import type { RecipeContentConfig } from "@/server/env";

const DIR = path.resolve(__dirname, "../fixtures/import-site");
const MANIFEST = path.join(DIR, "manifest.json");
const WPRM = "https://wprm.example.com/skillet-taco-rice/";
const OFF: RecipeContentConfig = { householdPrivate: false, grants: [] };
const PRIVATE: RecipeContentConfig = { householdPrivate: true, grants: [] };
// 2026-10-09: the household-private mode no longer keeps the publisher's photo; tests that need a kept photo use a
// per-site grant for method + photos instead (was PRIVATE).
const GRANTED = (domain: string): RecipeContentConfig => ({ householdPrivate: false, grants: [{ domain, instructions: true, photos: true }] });
const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;

function deps(content: RecipeContentConfig, calls: { ip: string; hostname: string; path: string }[] = []): ImportDeps {
  return { ...fixtureDeps(MANIFEST, calls), content: () => content };
}
const draftRow = async (id: string) => (await q<any>("SELECT * FROM recipe_import_drafts WHERE id=$1", [id]))[0];

describe("one step from a link (U-01..U-04)", () => {
  it("U-01: pasting a link saves it and reads it at once; attribution, description and counts are kept, the method and photo are not (default)", async () => {
    const { jon } = await fresh();
    const calls: { ip: string; hostname: string; path: string }[] = [];
    const r: any = await addRecipeFromLink(jon, { url: `${WPRM}?utm_source=x`, operationId: op() }, deps(OFF, calls));
    expect(r).toMatchObject({ kind: "draft" });
    expect(calls.map((c) => c.path)).toEqual(["/skillet-taco-rice/"]); // the page only — no photo request
    const d = await draftRow(r.draftId);
    expect(d).toMatchObject({
      method: "json_ld", title: "Skillet Taco Rice", servings: 4, effort_minutes: 35, source_author: "Sam Example", site_name: "Example Kitchen",
      description: "A one-pan weeknight rice with beans and salsa (synthetic test text).", source_step_count: 3, source_image_count: 1,
      source_steps: null, image_id: null, household_instructions: "", content_policy: { instructions: false, photos: false, basis: null },
    });
    expect(JSON.stringify(d)).not.toMatch(/soften the onion/);
    const lib: any = await librarySnapshot(jon);
    expect(lib.bookmarks).toHaveLength(1);
    expect(lib.bookmarks[0]).toMatchObject({ id: r.bookmarkId, status: "import_draft", draft: { siteName: "Example Kitchen", author: "Sam Example", stepCount: 3, stepsKept: false, imageId: null } });
  });

  it("U-02: with a per-site grant for method and photos, the method is kept as editable steps and one photo is stored (type sniffed, hash recorded); confirming carries both and the attribution", async () => {
    const { jon } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: WPRM, operationId: op() }, deps(GRANTED("wprm.example.com")));
    const d = await draftRow(r.draftId);
    // RUC-01: provenance names the kind of setting and the source it applies to (was a bare "owner setting" basis).
    expect(d.content_policy).toEqual({ instructions: true, photos: true, kind: "owner_recorded_grant", source: "wprm.example.com", basis: "owner-recorded grant for wprm.example.com" });
    expect(d.source_steps).toHaveLength(3);
    expect(d.household_instructions).toBe("Cook:\nWarm the oil in a skillet and soften the onion (synthetic).\nAdd the rice, garlic and water; simmer covered (synthetic).\nFinish:\nFold in the beans and salsa (synthetic).");
    const [img] = await q<any>("SELECT * FROM recipe_images WHERE id=$1", [d.image_id]);
    const png = readFileSync(path.join(DIR, "photo.png"));
    expect(img).toMatchObject({ content_type: "image/png", source_url: "https://wprm.example.com/img/taco-rice.png", page_url: WPRM, permission: "owner-recorded grant for wprm.example.com" });
    expect(img.sha256).toBe(createHash("sha256").update(png).digest("hex"));
    expect(Buffer.compare(img.bytes, png)).toBe(0);
    // Every line of this page is read cleanly (2026-10-09: no suggestions to accept); confirm as read.
    const lines: DraftLine[] = d.lines;
    expect(lines.every((l) => l.decision !== null)).toBe(true);
    const decisions = lines.map((l, index) => ({ index, decision: l.decision }));
    expect((await imports.updateImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 1, decisions })).status).toBe("accepted");
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 2 });
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    const [v] = await q<any>("SELECT * FROM recipe_versions WHERE id=$1", [c.result.versionId]);
    expect(v).toMatchObject({ provenance: "imported", source_url: WPRM, source_author: "Sam Example", source_site_name: "Example Kitchen", image_id: d.image_id });
    expect(v.instructions).toContain("Fold in the beans and salsa");
    // A later manual version keeps the source, author, site and photo.
    const lib: any = await librarySnapshot(jon);
    const rec = lib.recipes.find((x: any) => x.recipeId === c.result.recipeId);
    expect(rec.version).toMatchObject({ imageId: d.image_id, sourceAuthor: "Sam Example", sourceSiteName: "Example Kitchen", sourceUrl: WPRM });
    const v2: any = await library.saveRecipeVersionCommand(jon, op(), {
      recipeId: c.result.recipeId, expectedVersionNo: 1, title: "Skillet Taco Rice (ours)", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "rice", quantity: "0.25", unit: "cup", sourceRowId: null }], // EQR: a row stated afresh
    } as any);
    expect(v2.status).toBe("accepted");
    expect((await q<any>("SELECT image_id, source_author, source_site_name, source_url FROM recipe_versions WHERE id=$1", [v2.result.versionId]))[0])
      .toEqual({ image_id: d.image_id, source_author: "Sam Example", source_site_name: "Example Kitchen", source_url: WPRM });
  });

  it("U-03: a per-site grant keeps only what that site permitted; another site's grant keeps nothing", async () => {
    const { jon } = await fresh();
    const other: any = await addRecipeFromLink(jon, { url: WPRM, operationId: op() }, deps({ householdPrivate: false, grants: [{ domain: "elsewhere.example.com", instructions: true, photos: true }] }));
    expect(await draftRow(other.draftId)).toMatchObject({ source_steps: null, image_id: null });
    await imports.discardImportDraftCommand(jon, op(), { draftId: other.draftId, expectedRevision: 1 });
    const photos: any = await importFromLink(jon, { bookmarkId: other.bookmarkId, operationId: op() }, deps({ householdPrivate: false, grants: [{ domain: "wprm.example.com", instructions: false, photos: true }] }));
    const d = await draftRow(photos.draftId);
    expect(d.source_steps).toBeNull();
    expect(d.image_id).not.toBeNull();
    // RUC-01: an owner-entered grant is labelled as such (was "permission recorded for …").
    expect(d.content_policy).toEqual({ instructions: false, photos: true, kind: "owner_recorded_grant", source: "wprm.example.com", basis: "owner-recorded grant for wprm.example.com" });
  });

  it("U-04: a 'photo' that isn't one (HTML served as image/png) is not stored; the draft still opens and says so", async () => {
    const { jon } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: "https://fakephoto.example.com/skillet-taco-rice/", operationId: op() }, deps(GRANTED("fakephoto.example.com")));
    const d = await draftRow(r.draftId);
    expect(d.image_id).toBeNull();
    expect(d.problems).toContain("The page's photo couldn't be kept (not readable as a photo).");
    expect(await count("recipe_images")).toBe(0);
  });
});

describe("what stops a read, in words (U-05..U-08)", () => {
  it("U-05: Budget Bytes is never read, even with the household-private setting; the link stays and paste is offered", async () => {
    const { jon } = await fresh();
    const calls: { ip: string; hostname: string; path: string }[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://www.budgetbytes.com/some-synthetic-recipe/", operationId: op() }, deps(PRIVATE, calls));
    expect(r).toMatchObject({ kind: "not_read", status: "permission_blocked", reason: "permission_blocked" });
    expect(r.bookmarkId).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("U-06: 404 is recorded on the link; 429 and 500 are passing problems (not recorded; retry allowed); a page without recipe data says so", async () => {
    const { jon } = await fresh();
    const gone: any = await addRecipeFromLink(jon, { url: "https://gone.example.com/recipe", operationId: op() }, deps(OFF));
    expect(gone).toMatchObject({ kind: "not_read", status: "unavailable", reason: "http_404" });
    expect(gone.message).toMatch(/doesn't exist/);
    for (const [url, reason] of [["https://rate.example.com/recipe", "http_429"], ["https://broken.example.com/recipe", "http_500"]]) {
      const r: any = await addRecipeFromLink(jon, { url, operationId: op() }, deps(OFF));
      expect(r).toMatchObject({ kind: "not_read", status: "unavailable", reason });
    }
    const plain: any = await addRecipeFromLink(jon, { url: "https://plain.example.com/page", operationId: op() }, deps(OFF));
    expect(plain).toMatchObject({ kind: "not_read", status: "unsupported", reason: "no_recipe_data" }); // structured data, but no Recipe
    const lib: any = await librarySnapshot(jon);
    const by = Object.fromEntries(lib.bookmarks.map((b: any) => [b.domain, b.status]));
    expect(by).toEqual({ "gone.example.com": "unavailable", "rate.example.com": "saved", "broken.example.com": "saved", "plain.example.com": "unsupported" });
    // A page that had no recipe data can be read again later (sites change).
    const again: any = await importFromLink(jon, { bookmarkId: lib.bookmarks.find((b: any) => b.domain === "plain.example.com").id, operationId: op() }, deps(OFF));
    expect(again).toMatchObject({ kind: "not_read", reason: "no_recipe_data" });
  });

  it("U-07: an older-markup (microdata) page becomes a draft marked as such", async () => {
    const { jon } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: "https://micro.example.com/lentil-soup", operationId: op() }, deps(OFF));
    expect(r.kind).toBe("draft");
    const d = await draftRow(r.draftId);
    expect(d).toMatchObject({ method: "microdata", title: "Lemon Lentil Soup", servings: 6, effort_minutes: 40, source_author: "Pat Sample", source_step_count: 2 });
    expect(d.lines.map((l: DraftLine) => l.raw)).toEqual(["1 cup red lentils", "4 cups vegetable broth", "1 lemon, juiced"]);
    expect(d.problems).toContain("Read from the page's older recipe markup; check the lines carefully.");
  });

  it("U-08: adding the same link again opens the review in progress (no second read); once confirmed it points at the recipe", async () => {
    const { jon, alex } = await fresh();
    const first: any = await addRecipeFromLink(jon, { url: WPRM, operationId: op() }, deps(OFF));
    const calls: { ip: string; hostname: string; path: string }[] = [];
    const second: any = await addRecipeFromLink(alex, { url: "https://wprm.example.com/skillet-taco-rice", operationId: op() }, deps(OFF, calls));
    expect(second).toMatchObject({ kind: "draft", draftId: first.draftId, existing: true, bookmarkId: first.bookmarkId });
    expect(calls).toEqual([]);
    const d = await draftRow(first.draftId);
    const decisions = (d.lines as DraftLine[]).map((l, index) => ({ index, decision: l.decision ?? { use: false as const } })); // 2026-10-09: no suggestions
    await imports.updateImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 1, decisions });
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 2 });
    expect(c.status).toBe("accepted");
    expect(await addRecipeFromLink(alex, { url: WPRM, operationId: op() }, deps(OFF))).toMatchObject({ kind: "not_read", status: "already_imported", recipeId: c.result.recipeId });
  });

  it("U-09: with page reading off, the link is saved and paste is offered; an invalid link saves nothing", async () => {
    const { jon } = await fresh();
    expect(await addRecipeFromLink(jon, { url: WPRM, operationId: op() }, null)).toMatchObject({ kind: "not_read", status: "fetch_off" });
    expect(await count("recipe_bookmarks")).toBe(1);
    const bad: any = await addRecipeFromLink(jon, { url: "http://127.0.0.1/x", operationId: op() }, deps(OFF));
    expect(bad).toMatchObject({ kind: "not_read", status: "rejected" });
    expect(bad.bookmarkId).toBeUndefined();
    expect(await count("recipe_bookmarks")).toBe(1);
  });
});

describe("human review of uncertain lines (U-10)", () => {
  // Rewritten 2026-10-09 (owner direction): there are no suggestions. Lines read cleanly are decided as read
  // (exact amounts: ⅓ stays 1/3, a can is its stated size, cloves are counted); salt and pepper are left out;
  // only genuinely uncertain lines stay undecided and block the recipe until a person settles them.
  it("U-10: clean lines are decided as read, seasonings left out; an uncertain line blocks the recipe until it is decided", async () => {
    const { jon } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: WPRM, operationId: op() }, deps(OFF));
    const d = await draftRow(r.draftId);
    const byRaw = Object.fromEntries((d.lines as DraftLine[]).map((l) => [l.raw, l]));
    expect(byRaw["2 tbsp olive oil ($0.16)"].decision).toMatchObject({ use: true, quantity: "2", unit: "tbsp", name: "olive oil" });
    expect(byRaw["1 large onion, diced"].decision).toMatchObject({ use: true, quantity: "1", unit: "each", name: "onion" });
    expect(byRaw["2 cloves garlic, minced"].decision).toMatchObject({ use: true, quantity: "2", unit: "each", name: "garlic (clove)" });
    expect(byRaw["1 (15 oz) can black beans, drained"].decision).toMatchObject({ use: true, quantity: "15", unit: "oz", name: "black beans" });
    expect(byRaw["⅓ cup salsa"].decision).toMatchObject({ use: true, quantity: "1/3", unit: "cup", name: "salsa" });
    expect(byRaw["salt and pepper to taste"].decision).toEqual({ use: false });
    const pesto: any = await addRecipeFromLink(jon, { url: "https://pesto.example.com/weeknight-pesto-pasta/", operationId: op() }, deps(OFF));
    const refused: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: pesto.draftId, expectedRevision: 1 });
    expect(refused).toMatchObject({ status: "rejected", code: "incomplete" });
    expect(refused.details.problems.join(" ")).toMatch(/2 ingredient lines need a quick check/);
    expect(await count("recipe_versions WHERE provenance='imported'")).toBe(0);
  });
});

describe("export and restore keep kept photos (U-11)", () => {
  it("U-11: a stored photo round-trips through the household export as base64 and restores byte-identical", async () => {
    const { jon, fx } = await fresh();
    const r: any = await addRecipeFromLink(jon, { url: WPRM, operationId: op() }, deps(GRANTED("wprm.example.com")));
    const d = await draftRow(r.draftId);
    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    expect(data.tables.recipe_images).toHaveLength(1);
    expect(typeof data.tables.recipe_images[0].bytes).toBe("string");
    const restoreUrl = "postgres://table@127.0.0.1:54329/table_restore_check";
    await migrate(restoreUrl);
    const dst = new pg.Client({ connectionString: restoreUrl });
    await dst.connect();
    try {
      const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      await restoreHousehold(dst, JSON.parse(JSON.stringify(data)));
      const [img] = (await dst.query("SELECT bytes, sha256 FROM recipe_images WHERE id=$1", [d.image_id])).rows;
      expect(createHash("sha256").update(img.bytes).digest("hex")).toBe(img.sha256);
    } finally {
      await dst.end();
    }
  });
});

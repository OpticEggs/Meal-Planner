/**
 * Multi-source handoff — saved links, reviewed import, Budget Bytes lane (acceptance URL-01..16,
 * BB-02..04, SEC-01). Real PostgreSQL; page reading only through the in-process fixture transport
 * (any other network use fails the test).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import pg from "pg";
import { fresh, op, protectedState, q, race } from "./helpers";
import * as sources from "@/server/commands/sources";
import * as imports from "@/server/commands/imports";
import * as library from "@/server/commands/library";
import { librarySnapshot } from "@/server/queries/library";
import { fixtureDeps, importFromLink } from "@/server/recipe-import-service";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";

const MANIFEST = path.resolve(__dirname, "../fixtures/import-site/manifest.json");
const cmd = (p: Promise<unknown>): Promise<any> => p.then((r) => r, (e: Error) => ({ status: "threw", code: `threw: ${e.message}`, message: e.message }));
const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;

/** Everything a saved link must never touch. */
async function untouched(weekId: string) {
  return {
    plan: await protectedState(weekId),
    versions: await count("recipe_versions"),
    interests: await count("interests"),
    requests: await count("household_requests"),
    approvals: await count("purchase_approvals"),
    batches: await count("handoff_batches"),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network use in an offline test");
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("saved links (URL-01..04, BB-02, SEC-01)", () => {
  it("URL-01: saving a link writes one shared bookmark and nothing else; both members see it", async () => {
    const { fx, jon, alex } = await fresh();
    const before = await untouched(fx.weekId);
    const r = await cmd(sources.saveLinkCommand(jon, op(), { url: "https://www.recipes.example.com/chili?utm_source=x", note: "try this" }));
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect(await untouched(fx.weekId)).toEqual(before);
    for (const who of [jon, alex]) {
      const lib: any = await librarySnapshot(who);
      expect(lib.bookmarks).toHaveLength(1);
      expect(lib.bookmarks[0]).toMatchObject({ url: "https://www.recipes.example.com/chili", status: "saved", recipeId: null, createdBy: "Jon" });
      expect(lib.bookmarks[0].saves).toEqual([expect.objectContaining({ by: "Jon", note: "try this" })]);
    }
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`URL-02: both members save tracking variants of one page at once — one bookmark, both notes kept (${order})`, async () => {
      const { fx, jon, alex } = await fresh();
      const j = () => cmd(sources.saveLinkCommand(jon, op(), { url: "https://recipes.example.com/chili/?utm_campaign=a&fbclid=1", note: "Jon's note" }));
      const a = () => cmd(sources.saveLinkCommand(alex, op(), { url: "http://www.recipes.example.com/chili#top", note: "Alex's note" }));
      const [x, y] = order === "Jon first" ? await race(fx.householdId, j, a) : await race(fx.householdId, a, j);
      expect([x.status, y.status]).toEqual(["accepted", "accepted"]);
      expect([x.result.existed, y.result.existed]).toEqual([false, true]);
      expect(y.result.bookmarkId).toBe(x.result.bookmarkId);
      expect(await count("recipe_bookmarks")).toBe(1);
      const lib: any = await librarySnapshot(jon);
      expect(lib.bookmarks[0].saves.map((s: any) => s.note).sort()).toEqual(["Alex's note", "Jon's note"]);
      expect(lib.bookmarks[0].createdBy).toBe(order === "Jon first" ? "Jon" : "Alex");
    });
  }

  it("URL-02: the same operation id replays the same receipt", async () => {
    const { jon } = await fresh();
    const id = op();
    const a = await cmd(sources.saveLinkCommand(jon, id, { url: "https://recipes.example.com/chili" }));
    const b = await cmd(sources.saveLinkCommand(jon, id, { url: "https://recipes.example.com/chili" }));
    expect(b.replayed).toBe(true);
    expect(b.result.bookmarkId).toBe(a.result.bookmarkId);
    expect(await count("recipe_bookmark_saves")).toBe(1);
  });

  it("URL-03: a social-media post saves and opens, labeled as not importable", async () => {
    const { jon } = await fresh();
    const r = await cmd(sources.saveLinkCommand(jon, op(), { url: "https://www.instagram.com/p/abc123/" }));
    expect(r.status).toBe("accepted");
    const lib: any = await librarySnapshot(jon);
    expect(lib.bookmarks[0]).toMatchObject({ status: "unsupported" });
    expect(lib.bookmarks[0].statusDetail).toMatch(/can't be imported/);
    const imp = await importFromLink(jon, { bookmarkId: lib.bookmarks[0].id, operationId: op() }, fixtureDeps(MANIFEST));
    expect(imp).toMatchObject({ kind: "not_read", status: "unsupported" });
  });

  for (const bad of ["file:///etc/passwd", "javascript:alert(1)", "data:text/html,hi", "https://user:pw@recipes.example.com/x", "https://localhost/x", "http://127.0.0.1/x", "https://intranet/x", "not a url"]) {
    it(`URL-04: ${bad} is refused and writes nothing`, async () => {
      const { jon } = await fresh();
      const before = await count("recipe_bookmarks");
      const r = await cmd(sources.saveLinkCommand(jon, op(), { url: bad }));
      expect(r.status).toBe("rejected");
      expect(await count("recipe_bookmarks")).toBe(before);
      expect(await count("recipe_bookmark_saves")).toBe(0);
    });
  }

  it("SEC-01: another household can't archive, import or review this household's link or draft", async () => {
    const { jon, other } = await fresh();
    const b = (await cmd(sources.saveLinkCommand(jon, op(), { url: "https://recipes.example.com/chili" }))).result.bookmarkId;
    const d = (await cmd(imports.pasteIngredientsCommand(jon, op(), { bookmarkId: b, text: "1 cup rice", title: "Rice" }))).result.draftId;
    const outcomes = [
      await cmd(sources.archiveLinkCommand(other, op(), { bookmarkId: b, archived: true, expectedRevision: 2 })),
      await cmd(imports.pasteIngredientsCommand(other, op(), { bookmarkId: b, text: "1 cup rice" })),
      await cmd(imports.updateImportDraftCommand(other, op(), { draftId: d, expectedRevision: 1, title: "x" })),
      await cmd(imports.confirmImportDraftCommand(other, op(), { draftId: d, expectedRevision: 1 })),
      await cmd(imports.discardImportDraftCommand(other, op(), { draftId: d, expectedRevision: 1 })),
    ];
    expect(outcomes.map((o) => o.code)).toEqual(["not_found", "not_found", "not_found", "not_found", "not_found"]);
    expect(await importFromLink(other, { bookmarkId: b, operationId: op() }, fixtureDeps(MANIFEST))).toMatchObject({ kind: "not_read", status: "rejected" });
    const lib: any = await librarySnapshot(other);
    expect(lib.bookmarks).toEqual([]);
  });
});

describe("reviewed import (URL-05..15)", () => {
  async function saved(actor: any, url: string) {
    return (await cmd(sources.saveLinkCommand(actor, op(), { url }))).result.bookmarkId as string;
  }

  it("URL-05: links resolving to private, mixed, metadata or mapped addresses, or redirecting there, are refused before any connection", async () => {
    const { jon } = await fresh();
    for (const url of ["https://private.example.com/r", "https://mixed.example.com/r", "https://metadata.example.com/latest", "https://mapped.example.com/r", "https://hop.example.com/go"]) {
      const calls: { ip: string; hostname: string; path: string }[] = [];
      const b = await saved(jon, url);
      const r = await importFromLink(jon, { bookmarkId: b, operationId: op() }, fixtureDeps(MANIFEST, calls));
      expect(r, url).toMatchObject({ kind: "not_read", status: "unavailable" });
      // the only connection ever made is to the validated public address of the first hop
      expect(calls.every((c) => c.ip === "93.184.215.14"), JSON.stringify(calls)).toBe(true);
    }
    expect(await count("recipe_import_drafts")).toBe(0);
  });

  it("URL-03/06: a page that refuses (login) or has no recipe stays a saved link with a clear state", async () => {
    const { jon } = await fresh();
    const login = await saved(jon, "https://login.example.com/recipe");
    expect(await importFromLink(jon, { bookmarkId: login, operationId: op() }, fixtureDeps(MANIFEST))).toMatchObject({ kind: "not_read", status: "unavailable" });
    const plain = await saved(jon, "https://plain.example.com/page");
    expect(await importFromLink(jon, { bookmarkId: plain, operationId: op() }, fixtureDeps(MANIFEST))).toMatchObject({ kind: "not_read", status: "unsupported" });
    const lib: any = await librarySnapshot(jon);
    expect(lib.bookmarks.map((b: any) => b.status).sort()).toEqual(["unavailable", "unsupported"]);
    expect(await count("recipe_versions WHERE provenance='imported'")).toBe(0);
  });

  it("URL-08/07/10: JSON-LD is read as data — ingredients, yield, time; no method, nutrition or script; unclear lines need review", async () => {
    const { fx, jon } = await fresh();
    const before = await untouched(fx.weekId);
    const b = await saved(jon, "https://recipes.example.com/chili");
    const r = await importFromLink(jon, { bookmarkId: b, operationId: op() }, fixtureDeps(MANIFEST));
    expect(r.kind, JSON.stringify(r)).toBe("draft");
    const d = (await q<any>("SELECT * FROM recipe_import_drafts"))[0];
    expect(d).toMatchObject({ method: "json_ld", title: "Weeknight Bean Chili", servings: 4, effort_minutes: 45, source_has_instructions: true, source_has_nutrition: true });
    expect(JSON.stringify(d)).not.toMatch(/Synthetic step text|999 kcal|169\.254|alert\(|Ignore previous/);
    const byRaw = Object.fromEntries(d.lines.map((l: any) => [l.raw, l]));
    // 2026-10-09 (import overhaul): amounts are exact rationals ("1 1/2", was "1.5"); a can with a stated size is read
    // as that size and decided as read; salt is a household seasoning, left out (both used to wait for review).
    expect(byRaw["1 1/2 cups dried black beans"].parsed).toMatchObject({ quantity: "1 1/2", unit: "cup", status: "parsed" });
    expect(byRaw["1 1/2 cups dried black beans"].decision).toMatchObject({ use: true, quantity: "1 1/2", unit: "cup" });
    expect(byRaw["1 (15 oz) can diced tomatoes"].decision).toMatchObject({ use: true, quantity: "15", unit: "oz", name: "diced tomatoes" });
    expect(byRaw["salt to taste"].parsed.status).toBe("omitted");
    expect(byRaw["salt to taste"].decision).toEqual({ use: false });
    expect(byRaw["½ cup cooked rice"].parsed).toMatchObject({ quantity: "1/2", unit: "cup", form: "cooked" });
    // a draft is not a recipe and changes nothing planned or bought
    const after = await untouched(fx.weekId);
    expect(after).toEqual(before);
  });

  it("URL-09: a page with several recipes asks which one; it never mixes them", async () => {
    const { jon } = await fresh();
    const b = await saved(jon, "https://two.example.com/menu");
    const ask = await importFromLink(jon, { bookmarkId: b, operationId: op() }, fixtureDeps(MANIFEST));
    expect(ask).toMatchObject({ kind: "choose", options: [{ name: "Synthetic Salad" }, { name: "Synthetic Soup" }] });
    expect(await count("recipe_import_drafts")).toBe(0);
    const pick = await importFromLink(jon, { bookmarkId: b, operationId: op(), candidate: 1 }, fixtureDeps(MANIFEST));
    expect(pick.kind).toBe("draft");
    const d = (await q<any>("SELECT title, lines FROM recipe_import_drafts"))[0];
    expect(d.title).toBe("Synthetic Soup");
    expect(d.lines.map((l: any) => l.raw)).toEqual(["2 cups broth", "1 each onion", "3 cups water"]);
  });

  it("URL-11/12: an incomplete draft can't be confirmed; a complete one becomes one imported version with its source, changing no plan", async () => {
    const { fx, jon, alex } = await fresh();
    const b = await saved(jon, "https://recipes.example.com/chili");
    await importFromLink(jon, { bookmarkId: b, operationId: op() }, fixtureDeps(MANIFEST));
    const d = (await q<any>("SELECT id, revision, lines FROM recipe_import_drafts"))[0];
    const before = await protectedState(fx.weekId);
    // 2026-10-09: every line of this page is now read cleanly, so the draft is made incomplete by undeciding a line
    // (was: two lines started undecided).
    const idx = (raw: string) => d.lines.findIndex((l: any) => l.raw === raw);
    const undecide = await cmd(imports.updateImportDraftCommand(alex, op(), { draftId: d.id, expectedRevision: d.revision, decisions: [{ index: idx("1 (15 oz) can diced tomatoes"), decision: null }] }));
    const early = await cmd(imports.confirmImportDraftCommand(alex, op(), { draftId: d.id, expectedRevision: undecide.result.revision }));
    expect(early.code).toBe("incomplete");
    expect(early.details.problems.join(" ")).toMatch(/1 ingredient line needs a quick check/);
    expect(await count("recipe_versions WHERE provenance='imported'")).toBe(0);
    const upd = await cmd(imports.updateImportDraftCommand(alex, op(), {
      draftId: d.id, expectedRevision: undecide.result.revision, householdInstructions: "Our way: simmer longer.",
      decisions: [
        { index: idx("1 (15 oz) can diced tomatoes"), decision: { use: true, name: "diced tomatoes", quantity: "15", unit: "oz", form: "raw" } },
        { index: idx("salt to taste"), decision: { use: false } },
      ],
    }));
    expect(upd.status, JSON.stringify(upd)).toBe("accepted");
    const ok = await cmd(imports.confirmImportDraftCommand(alex, op(), { draftId: d.id, expectedRevision: upd.result.revision }));
    expect(ok.status, JSON.stringify(ok)).toBe("accepted");
    const v = (await q<any>("SELECT * FROM recipe_versions WHERE provenance='imported'"))[0];
    expect(v).toMatchObject({ title: "Weeknight Bean Chili", version_no: 1, source_url: "https://recipes.example.com/chili", import_draft_id: d.id, instructions: "Our way: simmer longer." });
    expect(v.summary).toMatch(/Not counted in groceries: salt to taste/);
    const ings = await q<any>("SELECT ingredient_key, quantity::text, unit, form FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [v.id]);
    expect(ings).toContainEqual({ ingredient_key: "dried_black_beans", quantity: "0.375", unit: "cup", form: "raw" }); // 1.5 cups / 4 servings
    expect(ings).toContainEqual({ ingredient_key: "diced_tomatoes", quantity: "3.75", unit: "oz", form: "raw" });
    expect(ings.find((i: any) => i.ingredient_key.includes("salt"))).toBeUndefined();
    // new ingredients carry no allergen information until reviewed
    expect((await q<any>("SELECT allergen_info_known FROM ingredients WHERE household_id=$1 AND key='diced_tomatoes'", [fx.householdId]))[0].allergen_info_known).toBe(false);
    expect(await protectedState(fx.weekId)).toEqual(before);
    const lib: any = await librarySnapshot(jon);
    expect(lib.bookmarks[0]).toMatchObject({ status: "imported", recipeId: ok.result.recipeId, draft: null });
    expect(lib.recipes.find((r: any) => r.recipeId === ok.result.recipeId).version).toMatchObject({ provenance: "imported", sourceDomain: "recipes.example.com" });
  });

  for (const order of ["Jon first", "Alex first"] as const) {
    it(`URL-14: both members edit the same draft at once — the second is refused, nothing is overwritten (${order})`, async () => {
      const { fx, jon, alex } = await fresh();
      const b = await saved(jon, "https://recipes.example.com/x");
      const d = (await cmd(imports.pasteIngredientsCommand(jon, op(), { bookmarkId: b, text: "1 cup rice\n2 tbsp oil", title: "Rice" }))).result.draftId;
      const j = () => cmd(imports.updateImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 1, servings: 2 }));
      const a = () => cmd(imports.updateImportDraftCommand(alex, op(), { draftId: d, expectedRevision: 1, servings: 3 }));
      const [x, y] = order === "Jon first" ? await race(fx.householdId, j, a) : await race(fx.householdId, a, j);
      expect([x.status, y.code]).toEqual(["accepted", "stale_draft"]);
      expect((await q<any>("SELECT servings, revision FROM recipe_import_drafts WHERE id=$1", [d]))[0]).toEqual({ servings: order === "Jon first" ? 2 : 3, revision: 2 });
    });
  }

  it("URL-13/15: editing an imported recipe keeps a scheduled dinner on its version; archiving the link keeps the recipe and dinner", async () => {
    const { fx, jon, alex } = await fresh();
    const b = await saved(jon, "https://recipes.example.com/x");
    const d = (await cmd(imports.pasteIngredientsCommand(jon, op(), { bookmarkId: b, text: "2 cups rice\n1 lb chicken thighs", title: "Rice bowl" }))).result.draftId;
    await cmd(imports.updateImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 1, servings: 2 }));
    const c = await cmd(imports.confirmImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 2 }));
    const v1 = c.result.versionId;
    // Simulate a dinner already pinned to version 1 (accepted through the plan commands elsewhere).
    await q("UPDATE cooking_events SET recipe_version_id=$2 WHERE id=$1", [fx.events.salmon, v1]);
    const edit = await cmd(library.saveRecipeVersionCommand(alex, op(), {
      recipeId: c.result.recipeId, expectedVersionNo: 1, title: "Rice bowl (ours)", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [{ componentKey: "main", ingredientName: "rice", quantity: "1", unit: "cup", sourceRowId: null }], // EQR: a row stated afresh
    }));
    expect(edit.status, JSON.stringify(edit)).toBe("accepted");
    expect((await q<any>("SELECT recipe_version_id FROM cooking_events WHERE id=$1", [fx.events.salmon]))[0].recipe_version_id).toBe(v1);
    expect((await q<any>("SELECT source_url, provenance FROM recipe_versions WHERE id=$1", [edit.result.versionId]))[0]).toEqual({ source_url: "https://recipes.example.com/x", provenance: "manual" });
    const rev = (await q<any>("SELECT revision FROM recipe_bookmarks WHERE id=$1", [b]))[0].revision;
    expect((await cmd(sources.archiveLinkCommand(alex, op(), { bookmarkId: b, archived: true, expectedRevision: rev }))).status).toBe("accepted");
    expect((await q<any>("SELECT archived_at IS NULL AS live FROM recipes WHERE id=$1", [c.result.recipeId]))[0].live).toBe(true);
    expect((await q<any>("SELECT recipe_version_id FROM cooking_events WHERE id=$1", [fx.events.salmon]))[0].recipe_version_id).toBe(v1);
    expect((await cmd(sources.archiveLinkCommand(jon, op(), { bookmarkId: b, archived: false, expectedRevision: rev + 1 }))).status).toBe("accepted");
  });
});

describe("Budget Bytes lane (BB-02..04)", () => {
  it("BB-02/03: a Budget Bytes link is saved once, attributed, and never read — the member pastes or types the ingredients", async () => {
    const { jon, alex } = await fresh();
    const r = await cmd(sources.saveLinkCommand(jon, op(), { url: "https://www.budgetbytes.com/some-recipe/" }));
    const again = await cmd(sources.saveLinkCommand(alex, op(), { url: "https://budgetbytes.com/some-recipe?utm_medium=social" }));
    expect(again.result.bookmarkId).toBe(r.result.bookmarkId);
    const calls: unknown[] = [];
    const imp = await importFromLink(alex, { bookmarkId: r.result.bookmarkId, operationId: op() }, fixtureDeps(MANIFEST, calls as never));
    expect(imp).toMatchObject({ kind: "not_read", status: "permission_blocked" });
    expect(calls).toEqual([]); // no request of any kind
    const lib: any = await librarySnapshot(alex);
    expect(lib.bookmarks).toHaveLength(1);
    expect(lib.bookmarks[0]).toMatchObject({ sourceLabel: "Budget Bytes", domain: "budgetbytes.com", status: "permission_blocked" });
    expect(lib.bookmarks[0].saves.map((s: any) => s.by)).toEqual(["Jon", "Alex"]);
  });

  it("BB-04: the member's own pasted list becomes a household recipe after review; its source stays linked", async () => {
    const { jon } = await fresh();
    const b = (await cmd(sources.saveLinkCommand(jon, op(), { url: "https://www.budgetbytes.com/some-recipe/" }))).result.bookmarkId;
    const d = (await cmd(imports.pasteIngredientsCommand(jon, op(), { bookmarkId: b, text: "1 cup rice\n1 each onion", title: "Our version" }))).result.draftId;
    await cmd(imports.updateImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 1, servings: 2 }));
    const c = await cmd(imports.confirmImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 2 }));
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    const v = (await q<any>("SELECT provenance, source_url, source_label FROM recipe_versions WHERE id=$1", [c.result.versionId]))[0];
    expect(v).toEqual({ provenance: "imported", source_url: "https://www.budgetbytes.com/some-recipe/", source_label: "Budget Bytes" });
    expect((await q<any>("SELECT method FROM recipe_import_drafts WHERE id=$1", [d]))[0].method).toBe("user_pasted");
  });
});

it("URL-16: export and restore keep links, saves, drafts and imported provenance, in reverse row order", async () => {
  const { fx, jon, alex } = await fresh();
  const b = (await cmd(sources.saveLinkCommand(jon, op(), { url: "https://recipes.example.com/x", note: "n" }))).result.bookmarkId;
  await cmd(sources.saveLinkCommand(alex, op(), { url: "https://recipes.example.com/x" }));
  const d = (await cmd(imports.pasteIngredientsCommand(jon, op(), { bookmarkId: b, text: "1 cup rice", title: "Rice" }))).result.draftId;
  await cmd(imports.updateImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 1, servings: 1 }));
  await cmd(imports.confirmImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 2 }));
  const b2 = (await cmd(sources.saveLinkCommand(alex, op(), { url: "https://recipes.example.com/y" }))).result.bookmarkId;
  await cmd(imports.pasteIngredientsCommand(alex, op(), { bookmarkId: b2, text: "salt to taste" })); // an open draft
  const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await src.connect();
  const data = await exportHousehold(src, fx.householdId);
  await src.end();
  expect(data.tables.recipe_bookmarks).toHaveLength(2);
  expect(data.tables.recipe_bookmark_saves).toHaveLength(3);
  expect(data.tables.recipe_import_drafts).toHaveLength(2);
  expect(JSON.stringify(data)).not.toMatch(/<html|<script/i);
  for (const t of Object.keys(data.tables)) data.tables[t].reverse();
  const restoreUrl = "postgres://table@127.0.0.1:54329/table_restore_check";
  await migrate(restoreUrl);
  const dst = new pg.Client({ connectionString: restoreUrl });
  await dst.connect();
  try {
    const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
    await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
    const restored = await restoreHousehold(dst, JSON.parse(JSON.stringify(data))).then((c) => c, (e: Error) => `threw: ${e.message}`);
    expect(restored).toMatchObject({ recipe_bookmarks: 2, recipe_bookmark_saves: 3, recipe_import_drafts: 2 });
    const v = (await dst.query("SELECT provenance, source_url FROM recipe_versions WHERE import_draft_id IS NOT NULL")).rows;
    expect(v).toEqual([{ provenance: "imported", source_url: "https://recipes.example.com/x" }]);
  } finally {
    await dst.end();
  }
});

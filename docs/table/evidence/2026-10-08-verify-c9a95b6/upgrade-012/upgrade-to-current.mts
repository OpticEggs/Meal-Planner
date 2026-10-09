// Upgrade check, step 2 (current code): migrate the populated 011 database, prove nothing existing
// changed, use the new paths (an import whose photo is kept under the owner-selected mode), then
// export → restore into a second disposable database → export again, and compare (photo bytes too).
import pg from "pg";
import path from "node:path";
import { createHash } from "node:crypto";
import { migrate } from "/home/user/table/src/server/db/migrate";
import { USERS } from "/home/user/table/tests/fixtures/household";
import { addRecipeFromLink, fixtureDeps } from "/home/user/table/src/server/recipe-import-service";
import * as imports from "/home/user/table/src/server/commands/imports";
import { librarySnapshot } from "/home/user/table/src/server/queries/library";
import { exportHousehold, restoreHousehold } from "/home/user/table/src/server/export";
import { suggestedDecision } from "/home/user/table/src/domain/recipes/import";

const SRC = process.env.DATABASE_URL!;
const DST = "postgres://table@127.0.0.1:54329/table_restore_check";
const q = async (url: string, sql: string, p: unknown[] = []) => {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try { return (await c.query(sql, p)).rows; } finally { await c.end(); }
};
const snapshotAll = async (url: string) => {
  const out: Record<string, unknown[]> = {};
  for (const r of await q(url, "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations' ORDER BY 1")) {
    out[r.tablename] = await q(url, `SELECT * FROM "${r.tablename}" t ORDER BY t::text`);
  }
  return out;
};
const check = (label: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!cond) process.exitCode = 1;
};

const before = await snapshotAll(SRC);
const applied = await migrate(SRC);
check("migrations applied on the populated 011 database", JSON.stringify(applied) === JSON.stringify(["012_recipe_content.sql"]), applied);
check("a second run applies nothing", (await migrate(SRC)).length === 0);
const after = await snapshotAll(SRC);
// Every existing row is unchanged in every column it had; new columns hold their defaults.
let changed = 0;
for (const [t, rows] of Object.entries(before)) {
  const now = after[t] as Record<string, unknown>[];
  if (now.length !== rows.length) { changed++; console.log(`  row count changed in ${t}`); continue; }
  rows.forEach((r: any, i) => { for (const k of Object.keys(r)) if (JSON.stringify(r[k]) !== JSON.stringify(now[i][k])) { changed++; console.log(`  ${t}.${k} changed`); } });
}
check("no existing row or column value changed by 012", changed === 0, changed);
const drafts = await q(SRC, "SELECT content_policy, source_step_count, image_id FROM recipe_import_drafts");
check("existing drafts read as 'nothing kept'", drafts.every((d) => d.content_policy.instructions === false && d.content_policy.photos === false && d.image_id === null), drafts.length);
const hh = (await q(SRC, "SELECT id FROM households ORDER BY created_at LIMIT 1"))[0].id;
const m = (await q(SRC, "SELECT id FROM members WHERE household_id=$1 ORDER BY display_name", [hh]));
const alex = { memberId: m[0].id, householdId: hh, displayName: USERS.alex.name };
const jon = { memberId: m[1].id, householdId: hh, displayName: USERS.jon.name };
const lib: any = await librarySnapshot(jon);
check("the library snapshot loads on the upgraded data", lib.recipes.length === 9 && lib.bookmarks.length === 3, { recipes: lib.recipes.length, bookmarks: lib.bookmarks.length });
// New path: one-step import with the photo kept under the owner-selected mode (test configuration only).
const deps = { ...fixtureDeps(path.resolve("/home/user/table/tests/fixtures/import-site/manifest.json")), content: () => ({ householdPrivate: true, grants: [], photoHosts: [] }) };
const r: any = await addRecipeFromLink(jon, { url: "https://wprm.example.com/skillet-taco-rice/", operationId: `up-${crypto.randomUUID()}` }, deps);
check("import with a kept photo on the upgraded database", r.kind === "draft", r);
const d = (await q(SRC, "SELECT * FROM recipe_import_drafts WHERE id=$1", [r.draftId]))[0];
const decisions = d.lines.map((l: any, index: number) => ({ index, decision: l.decision ?? suggestedDecision(l.parsed) ?? { use: false } }));
await imports.updateImportDraftCommand(alex, `up-${crypto.randomUUID()}`, { draftId: d.id, expectedRevision: 1, decisions });
const c: any = await imports.confirmImportDraftCommand(alex, `up-${crypto.randomUUID()}`, { draftId: d.id, expectedRevision: 2 });
check("confirmed into a recipe version carrying the photo", c.status === "accepted" && (await q(SRC, "SELECT image_id FROM recipe_versions WHERE id=$1", [c.result.versionId]))[0].image_id === d.image_id);
// Export → restore → export.
const src = new pg.Client({ connectionString: SRC }); await src.connect();
const data = await exportHousehold(src, hh); await src.end();
check("export carries the photo as base64", data.tables.recipe_images.length === 1 && typeof data.tables.recipe_images[0].bytes === "string");
await migrate(DST);
const tables = await q(DST, "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'");
await q(DST, `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
const dst = new pg.Client({ connectionString: DST }); await dst.connect();
const counts = await restoreHousehold(dst, JSON.parse(JSON.stringify(data)));
const again = await exportHousehold(dst, hh); await dst.end();
check("restore → export reproduces the export exactly", JSON.stringify(again.tables) === JSON.stringify(data.tables), counts);
const [img] = await q(DST, "SELECT bytes, sha256 FROM recipe_images");
check("restored photo bytes match their recorded hash", createHash("sha256").update(img.bytes).digest("hex") === img.sha256);
console.log(JSON.stringify({ restoredCounts: counts }));

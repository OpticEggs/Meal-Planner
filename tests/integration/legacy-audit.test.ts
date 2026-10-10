/**
 * The read-only legacy quantity audit (EQ, D135), on DISPOSABLE data only (table_test). The data below is
 * written the way earlier releases wrote it: legacy rows (no exact basis) from manual entry, an import of the
 * 8e6bd6e era (12 places, half up), a pre-overhaul import (4 places), a later version that inherited a row,
 * a row whose only trace is its "From:" line, and the two seasoning cases RIO-02 cannot repair alone.
 */
import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db, fresh, op, q, url } from "./helpers";
import * as sources from "@/server/commands/sources";
import * as imports from "@/server/commands/imports";
import { auditLegacyQuantities, auditTargetAllowed } from "@/server/audit/legacy-quantities";
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";

const run = promisify(execFile);

/** Everything a correction could touch, for a before/after equality check. */
const state = () =>
  q<any>(`SELECT
    (SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM recipe_ingredients t) AS ingredients,
    (SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM recipe_versions t) AS versions,
    (SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM recipe_import_drafts t) AS drafts,
    (SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM cooking_events t) AS events,
    (SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM recipes t) AS recipes`);

const line = (raw: string, decision: unknown, status?: string) => ({ raw, parsed: { ...parseIngredientLine(raw), ...(status ? { status } : {}) }, decision });

async function oldVersion(fx: any, recipeId: string | null, versionNo: number, title: string, provenance: string, draftId: string | null, rows: [string, string, string, string | null][]) {
  const rid = recipeId ?? (await q<any>("INSERT INTO recipes(household_id, created_by) VALUES ($1,$2) RETURNING id", [fx.householdId, fx.members.jon]))[0].id;
  const [v] = await q<any>(
    "INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by, import_draft_id) VALUES ($1,$2,$3,$4,'',$5,false,$6,$7) RETURNING id",
    [rid, fx.householdId, versionNo, title, provenance, fx.members.jon, draftId],
  );
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [v.id]);
  let sort = 0;
  for (const [k, qty, unit, note] of rows) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k.replace(/_/g, " ")]);
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, note, sort) VALUES ($1,'main',$2,$3,$4,$5,$6)", [v.id, k, qty, unit, note, sort++]);
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [rid, v.id]);
  return { recipeId: rid as string, versionId: v.id as string };
}

async function oldDraft(fx: any, jon: any, slugText: string, servings: number, lines: unknown[]) {
  const s: any = await sources.saveLinkCommand(jon, op(), { url: `https://example.org/${slugText}` });
  const [d] = await q<any>(
    `INSERT INTO recipe_import_drafts(household_id, bookmark_id, status, method, extractor_version, source_url, title, servings, lines, created_by)
     VALUES ($1,$2,'confirmed','user_pasted','table-import-2',$3,$4,$5,$6,$7) RETURNING id`,
    [fx.householdId, s.result.bookmarkId, `https://example.org/${slugText}`, slugText, servings, JSON.stringify(lines), fx.members.jon],
  );
  return d.id as string;
}

async function seedLegacy() {
  const env = await fresh();
  const { fx, jon } = env;
  // 1. Manual entry, 4 places, no source — on Friday's accepted dinner.
  const manual = await oldVersion(fx, null, 1, "Old onion salad", "manual", null, [["onion", "0.6667", "each", null], ["olive_oil", "0.5", "tbsp", null]]);
  const dinner = Object.values(fx.events)[0] as string; // disposable data: an accepted dinner on the old version
  await q("UPDATE cooking_events SET recipe_version_id=$2 WHERE id=$1", [dinner, manual.versionId]);
  // 2. An import of the 8e6bd6e era: 12 places half up; a member pressed Use on "1 tsp salt (garlic)" while it was
  //    read as plain salt; "1 tsp salt (smoked)" was left out.
  const d12 = await oldDraft(fx, jon, "old-rub", 3, [
    line("2 each onion", { use: true, name: "onion", quantity: "2", unit: "each", form: "raw" }),
    line("1 tsp salt (garlic)", { use: true, name: "salt", quantity: "1", unit: "tsp", form: "raw" }, "omitted"),
    line("1 tsp salt (smoked)", { use: false }, "omitted"),
  ]);
  const rub = await oldVersion(fx, null, 1, "Old rub", "imported", d12, [
    ["onion", "0.666666666667", "each", "From: 2 each onion"],
    ["salt", "0.333333333333", "tsp", "From: 1 tsp salt (garlic)"],
  ]);
  await q("UPDATE recipe_import_drafts SET confirmed_version_id=$2 WHERE id=$1", [d12, rub.versionId]);
  // 3. Version 2 of it (a title edit by the earlier release): the onion row inherited, no draft of its own.
  const rub2 = await oldVersion(fx, rub.recipeId, 2, "Old rub (ours)", "manual", null, [["onion", "0.666666666667", "each", "From: 2 each onion"]]);
  // 4. A pre-overhaul import: 4 places half up.
  const d4 = await oldDraft(fx, jon, "old-peas", 3, [line("1 cup frozen peas", { use: true, name: "frozen peas", quantity: "1", unit: "cup", form: "raw" })]);
  const peas = await oldVersion(fx, null, 1, "Old peas", "imported", d4, [["frozen_peas", "0.3333", "cup", "From: 1 cup frozen peas"]]);
  // 5. Only the original line survives (no draft linked): the servings are unknown.
  const milk = await oldVersion(fx, null, 1, "Old milk", "manual", null, [["milk", "0.0833", "cup", "From: 1/3 cup milk"]]);
  // 6. A new recipe with exact rows: not legacy, not reported.
  const s: any = await sources.saveLinkCommand(jon, op(), { url: "https://example.org/new-salad" });
  const p: any = await imports.pasteIngredientsCommand(jon, op(), { bookmarkId: s.result.bookmarkId, text: "2 each onion", title: "New salad" });
  const u: any = await imports.updateImportDraftCommand(jon, op(), { draftId: p.result.draftId, expectedRevision: 1, servings: 3 });
  const n: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: p.result.draftId, expectedRevision: u.result.revision });
  expect(n.status, JSON.stringify(n)).toBe("accepted");
  return { ...env, manual, rub, rub2, peas, milk, newVersion: n.result.versionId as string, d12, dinner };
}

describe("legacy quantity audit (read-only)", () => {
  it("LA-01: classifies legacy rows and separates recoverable evidence from patterns and missing information", async () => {
    const { fx, manual, rub, rub2, peas, milk, newVersion, dinner } = await seedLegacy();
    const c = await db();
    const report = await auditLegacyQuantities(c, { householdId: fx.householdId });
    await c.end();
    const find = (versionId: string, key: string) => report.rows.find((r) => r.versionId === versionId && r.ingredientKey === key)!;

    expect(find(manual.versionId, "onion")).toMatchObject({ risk: "rounded_4dp", pattern: "2/3", evidence: { kind: "missing" }, recoverable: false, proposal: null });
    expect(find(manual.versionId, "onion").scheduledDinners.map((d) => d.eventId)).toEqual([dinner]);
    expect(find(manual.versionId, "olive_oil")).toMatchObject({ risk: "short_decimal", pattern: null });

    expect(find(rub.versionId, "onion")).toMatchObject({ risk: "rounded_12dp", recoverable: true, evidence: { kind: "import_draft", amount: "2", servings: 3, matches: "12dp_half_up", line: "2 each onion" } });
    expect(find(rub.versionId, "onion").proposal).toMatch(/new version of "Old rub" could store onion as 2 each for 3 servings/);
    expect(find(rub2.versionId, "onion")).toMatchObject({ recoverable: true, evidence: { kind: "earlier_version", versionNo: 1, amount: "2", servings: 3 } });
    expect(find(peas.versionId, "frozen_peas")).toMatchObject({ risk: "rounded_4dp", recoverable: true, evidence: { kind: "import_draft", amount: "1", servings: 3, matches: "4dp_half_up" } });
    expect(find(milk.versionId, "milk")).toMatchObject({ risk: "rounded_4dp", recoverable: false, evidence: { kind: "source_line_only", line: "1/3 cup milk" } });

    // New exact rows are not legacy and are not reported; fixture rows (legacy, short decimals) are low risk.
    expect(report.rows.some((r) => r.versionId === newVersion)).toBe(false);
    expect(report.rows.filter((r) => r.provenance === "fixture").every((r) => r.risk === "short_decimal")).toBe(true);

    expect(report.seasonings).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "stored_as_plain_seasoning", versionId: rub.versionId, line: "1 tsp salt (garlic)", readsNowAs: "garlic salt" }),
      expect.objectContaining({ kind: "left_out_before_fix", versionId: rub.versionId, line: "1 tsp salt (smoked)", readsNowAs: "smoked salt" }),
    ]));
    // The salt row's amount is recoverable too (its identity problem is reported separately, below).
    expect(find(rub.versionId, "salt")).toMatchObject({ recoverable: true, evidence: { kind: "import_draft", amount: "1", servings: 3 } });
    expect(report.summary).toMatchObject({ recoverable: 4, sourceLineOnly: 1, conflicting: 0, seasoningFindings: 2 });
    expect(report.readOnly).toBe(true);
  });

  it("LA-02: it never writes — every statement is a read inside a READ ONLY transaction that is rolled back, and nothing changed", async () => {
    const { fx } = await seedLegacy();
    const before = await state();
    const c = await db();
    const seen: string[] = [];
    const original = c.query.bind(c);
    (c as any).query = (sql: any, ...rest: any[]) => {
      seen.push(typeof sql === "string" ? sql : sql.text);
      return (original as any)(sql, ...rest);
    };
    await auditLegacyQuantities(c, { householdId: fx.householdId });
    await c.end();
    expect(seen[0]).toMatch(/BEGIN TRANSACTION .*READ ONLY/);
    expect(seen.at(-1)).toBe("ROLLBACK");
    expect(seen.filter((s) => /^\s*(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|COPY)\b/i.test(s))).toEqual([]);
    expect(await state()).toEqual(before);
  });

  it("LA-03: the command runs against a local disposable database, refuses any other host, and changes nothing", async () => {
    await seedLegacy();
    const before = await state();
    const ok = await run("npx", ["tsx", "scripts/audit-legacy-quantities.ts"], { env: { ...process.env, DATABASE_URL: url() }, maxBuffer: 64 * 1024 * 1024 });
    expect(JSON.parse(ok.stdout).readOnly).toBe(true);
    expect(ok.stderr).toMatch(/Nothing was changed/);
    expect(await state()).toEqual(before);
    const remote = "postgres://user:secret@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const refused = await run("npx", ["tsx", "scripts/audit-legacy-quantities.ts"], { env: { ...process.env, DATABASE_URL: remote } }).then(
      () => null,
      (e: any) => e,
    );
    expect(refused?.code).toBe(2);
    expect(refused?.stderr).toMatch(/Refusing ep-example-123456\.us-east-2\.aws\.neon\.tech/);
    expect(auditTargetAllowed(remote, false).ok).toBe(false);
    expect(auditTargetAllowed("postgres://table@127.0.0.1:54329/x", false).ok).toBe(true);
    expect(auditTargetAllowed(remote, true).ok).toBe(true); // only when asked for on purpose
  }, 60_000);
});

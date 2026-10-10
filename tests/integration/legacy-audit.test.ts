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
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";
import { imported } from "./eq-helpers";

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

async function oldVersion(fx: any, recipeId: string | null, versionNo: number, title: string, provenance: string, draftId: string | null, rows: [string, string, string, string | null, string?][]) {
  const rid = recipeId ?? (await q<any>("INSERT INTO recipes(household_id, created_by) VALUES ($1,$2) RETURNING id", [fx.householdId, fx.members.jon]))[0].id;
  const [v] = await q<any>(
    "INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by, import_draft_id) VALUES ($1,$2,$3,$4,'',$5,false,$6,$7) RETURNING id",
    [rid, fx.householdId, versionNo, title, provenance, fx.members.jon, draftId],
  );
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [v.id]);
  let sort = 0;
  for (const [k, qty, unit, note, src] of rows) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k.replace(/_/g, " ")]);
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, note, sort, source_row_id) VALUES ($1,'main',$2,$3,$4,$5,$6,$7)", [v.id, k, qty, unit, note, sort++, src ?? null]);
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

  it("LA-04: ambiguous sources are reported as conflicting, never as a recoverable amount (EQR)", async () => {
    const { fx, jon } = await fresh();
    // a) One import draft, two different lines that both round to the stored 0.6667 per serving: which is which is unknowable.
    const dA = await oldDraft(fx, jon, "two-onions", 3, [
      line("2 each onion", { use: true, name: "onion", quantity: "2", unit: "each", form: "raw" }),
      line("2.0001 each onion", { use: true, name: "onion", quantity: "2.0001", unit: "each", form: "raw" }),
    ]);
    const a = await oldVersion(fx, null, 1, "Two onions", "imported", dA, [["onion", "0.6667", "each", "From: 2 each onion"], ["onion", "0.6667", "each", "From: 2.0001 each onion"]]);
    // b) A later version (earlier release, no lineage) has MORE same-looking rows than the version they could come from.
    const dB = await oldDraft(fx, jon, "one-cucumber", 3, [line("2 each cucumber", { use: true, name: "cucumber", quantity: "2", unit: "each", form: "raw" })]);
    const b1 = await oldVersion(fx, null, 1, "Cucumber", "imported", dB, [["cucumber", "0.6667", "each", "From: 2 each cucumber"]]);
    const b2 = await oldVersion(fx, b1.recipeId, 2, "Cucumber (ours)", "manual", null, [["cucumber", "0.6667", "each", null], ["cucumber", "0.6667", "each", null]]);
    // c) The unambiguous inheritance still counts: one row, one possible source.
    const dC = await oldDraft(fx, jon, "one-pea", 3, [line("1 cup frozen peas", { use: true, name: "frozen peas", quantity: "1", unit: "cup", form: "raw" })]);
    const c1 = await oldVersion(fx, null, 1, "Peas", "imported", dC, [["frozen_peas", "0.3333", "cup", null]]);
    const c2 = await oldVersion(fx, c1.recipeId, 2, "Peas (ours)", "manual", null, [["frozen_peas", "0.3333", "cup", null]]);
    // d) A row saved by this release with verified lineage follows that lineage, even beside a same-looking new row.
    const [b1row] = await q<any>("SELECT id FROM recipe_ingredients WHERE recipe_version_id=$1", [b1.versionId]);
    const d = await saveRecipeVersionCommand(jon, op(), {
      recipeId: b1.recipeId, expectedVersionNo: 2, title: "Cucumber (lineage)", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.6667", unit: "each", sourceRowId: b1row.id },
        { componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.6667", unit: "each", sourceRowId: null },
      ],
    } as any) as any;
    expect(d.status, JSON.stringify(d)).toBe("accepted");
    const c = await db();
    const report = await auditLegacyQuantities(c, { householdId: fx.householdId });
    await c.end();
    const of = (versionId: string) => report.rows.filter((r) => r.versionId === versionId);
    expect(of(a.versionId).map((r) => [r.evidence.kind, r.recoverable])).toEqual([["conflicting", false], ["conflicting", false]]);
    expect(of(b1.versionId).map((r) => [r.evidence.kind, r.recoverable])).toEqual([["import_draft", true]]);
    expect(of(b2.versionId).map((r) => [r.evidence.kind, r.recoverable])).toEqual([["conflicting", false], ["conflicting", false]]);
    expect(of(c2.versionId).map((r) => [r.evidence.kind, r.recoverable])).toEqual([["earlier_version", true]]);
    // d): the inherited row is legacy and traced through its lineage; the new row is exact and not reported.
    expect(of(d.result.versionId)).toEqual([expect.objectContaining({ recoverable: true, evidence: expect.objectContaining({ kind: "earlier_version", versionNo: 1, amount: "2", servings: 3, via: "lineage" }) })]);
  });

  it("LA-05: source evidence stops where a member changed the amount — a later legacy copy is not 'recoverable' to the superseded import (AUD-01)", async () => {
    const { fx, jon } = await fresh();
    // A) This release: import 2 cucumbers and 3 onions for 3 servings, then a member changes the cucumber to 0.5 a
    //    serving (the onion is kept as it was). The writer stores exact 1/2 with lineage back to the imported row.
    const v1 = await imported(jon, "Cucumber change", 3, "2 each cucumber\n3 each onion");
    const r1 = await q<any>("SELECT id, ingredient_key AS key, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [v1.versionId]);
    expect(r1.map((r) => [r.key, r.basis, r.amount, r.servings])).toEqual([["cucumber", "exact", "2", 3], ["onion", "exact", "3", 3]]);
    const v2: any = await saveRecipeVersionCommand(jon, op(), {
      recipeId: v1.recipeId, expectedVersionNo: 1, title: "Cucumber change", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "cucumber", ingredientKey: "cucumber", quantity: "0.5", unit: "each", sourceRowId: r1[0].id },
        { componentKey: "main", ingredientName: "onion", ingredientKey: "onion", quantity: "1", unit: "each", sourceRowId: r1[1].id },
      ],
    });
    expect(v2.status, JSON.stringify(v2)).toBe("accepted");
    const r2 = await q<any>("SELECT id, ingredient_key AS key, quantity::text AS q, quantity_basis AS basis, exact_amount AS amount, exact_servings AS servings, source_row_id AS src FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY sort", [v2.result.versionId]);
    expect(r2.map((r) => [r.key, r.q, r.basis, r.amount, r.servings, r.src])).toEqual([
      ["cucumber", "0.5", "exact", "1/2", 1, r1[0].id],
      ["onion", "1", "exact", "3", 3, r1[1].id],
    ]);
    // Later, an older release (after a rollback) saves version 3 as it always did: legacy decimals, no lineage.
    const v3 = await oldVersion(fx, v1.recipeId, 3, "Cucumber change (old app)", "manual", null, [["cucumber", "0.5", "each", null], ["onion", "1", "each", null]]);
    // And a legacy row that does carry lineage to the changed row (the direct path; constructed on disposable data).
    const v4 = await oldVersion(fx, v1.recipeId, 4, "Cucumber change (lineage)", "manual", null, [["cucumber", "0.5", "each", null, r2[0].id]]);

    // B) Lineage alone does not carry an amount across a change: a legacy import row (2 for 3, stored 0.6667) and a
    //    legacy row of a later version that names it as its source but stores 0.5 — then a legacy copy of that.
    const dB = await oldDraft(fx, jon, "beans-change", 3, [line("2 cup black beans", { use: true, name: "black beans", quantity: "2", unit: "cup", form: "raw" })]);
    const b1 = await oldVersion(fx, null, 1, "Beans", "imported", dB, [["black_beans", "0.6667", "cup", "From: 2 cup black beans"]]);
    const [b1row] = await q<any>("SELECT id FROM recipe_ingredients WHERE recipe_version_id=$1", [b1.versionId]);
    const b2 = await oldVersion(fx, b1.recipeId, 2, "Beans (less)", "manual", null, [["black_beans", "0.5", "cup", null, b1row.id]]);
    const b3 = await oldVersion(fx, b1.recipeId, 3, "Beans (old app)", "manual", null, [["black_beans", "0.5", "cup", null]]);

    const c = await db();
    const report = await auditLegacyQuantities(c, { householdId: fx.householdId });
    await c.end();
    const at = (versionId: string, key: string) => report.rows.find((r) => r.versionId === versionId && r.ingredientKey === key)!;
    // The member's deliberate 1/2 a serving is what a legacy copy of it goes back to — never the import's 2 for 3.
    expect(at(v3.versionId, "cucumber")).toMatchObject({ recoverable: true, evidence: { kind: "earlier_version", versionNo: 2, amount: "1/2", servings: 1, via: "same_row" } });
    expect(at(v4.versionId, "cucumber")).toMatchObject({ recoverable: true, evidence: { kind: "earlier_version", versionNo: 2, amount: "1/2", servings: 1, via: "lineage" } });
    // Genuine unchanged recovery is kept: the onion was never changed, so the import still applies.
    expect(at(v3.versionId, "onion")).toMatchObject({ recoverable: true, evidence: { kind: "earlier_version", amount: "3", servings: 3, via: "same_row" } });
    // B: the source's 2 for 3 does not give the stored 0.5 → conflicting, not recoverable; and nothing recoverable
    //    is passed on to the later copy.
    expect(at(b1.versionId, "black_beans")).toMatchObject({ recoverable: true, evidence: { kind: "import_draft", amount: "2", servings: 3 } });
    expect(at(b2.versionId, "black_beans")).toMatchObject({ recoverable: false, proposal: null, evidence: { kind: "conflicting" } });
    expect((at(b2.versionId, "black_beans").evidence as any).detail).toMatch(/2 for 3 servings.*0\.5/);
    expect(at(b3.versionId, "black_beans")).toMatchObject({ recoverable: false, evidence: { kind: "conflicting" } });
    // No reported row anywhere names the superseded 2/3 for a stored 0.5.
    expect(report.rows.filter((r) => r.quantity === "0.5" && r.recoverable && (r.evidence as any).amount === "2")).toEqual([]);
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

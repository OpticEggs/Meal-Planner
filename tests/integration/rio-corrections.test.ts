/**
 * Import-overhaul corrections (2026-10-09), reproduced through the real commands and PostgreSQL: a pasted
 * recipe is confirmed, put on the accepted week by a reviewed preview, its plates set, and the grocery
 * projection read back.
 *
 * The owner's correction package (Table-Import-Overhaul-Correction-12434c0.zip) did not reach this session;
 * RIO-01..03 below are reconstructed from the three named problems (package rounding, seasoning
 * classification, pending row edits — RIO-03 is in tests/e2e/rio-pending-edit.spec.ts) and must be
 * reconciled with the package's own wording when it is available.
 *
 * RIO-01  Per-serving amounts that do not terminate were stored rounded HALF-UP to 12 places, so the plates
 *         of a whole recipe added up to slightly MORE than the recipe (2 cucumbers ÷ 3 servings × 3 plates =
 *         2.000000000001) and a whole extra package was bought.
 * RIO-02  A bare "pepper" was always table pepper: "1 pepper, diced" was dropped from the import, and an
 *         ingredient called "pepper" bought by the piece vanished from groceries.
 */
import { describe, expect, it } from "vitest";
import { fresh, line, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import * as sources from "@/server/commands/sources";
import { applyPlanChangeCommand, createPreviewCommand, setPlateCommand } from "@/server/commands/plan";
import type { DraftLine } from "@/domain/recipes/import";
import type { Actor } from "@/server/commands/framework";

async function pasted(actor: Actor, title: string, servings: number, text: string) {
  const s: any = await sources.saveLinkCommand(actor, op(), { url: `https://example.org/${title.toLowerCase().replace(/\W+/g, "-")}` });
  expect(s.status, JSON.stringify(s)).toBe("accepted");
  const p: any = await imports.pasteIngredientsCommand(actor, op(), { bookmarkId: s.result.bookmarkId, text, title });
  expect(p.status, JSON.stringify(p)).toBe("accepted");
  const d = (await q<any>("SELECT * FROM recipe_import_drafts WHERE id=$1", [p.result.draftId]))[0];
  const u: any = await imports.updateImportDraftCommand(actor, op(), { draftId: d.id, expectedRevision: 1, servings });
  expect(u.status, JSON.stringify(u)).toBe("accepted");
  return { draftId: d.id as string, lines: d.lines as DraftLine[], revision: u.result.revision as number };
}

async function onFriday(fx: any, actor: Actor, versionId: string) {
  const p: any = await createPreviewCommand(actor, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: versionId } });
  expect(p.status, JSON.stringify(p)).toBe("accepted");
  const a: any = await applyPlanChangeCommand(actor, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) });
  expect(a.status, JSON.stringify(a)).toBe("accepted");
  const [ev] = await q<any>("SELECT id, revision FROM cooking_events WHERE week_id=$1 AND recipe_version_id=$2 AND status='scheduled'", [fx.weekId, versionId]);
  return ev as { id: string; revision: number };
}

describe("import-overhaul corrections (real harness)", () => {
  it("RIO-01: a whole recipe planned as its servings buys its packages, not one more", async () => {
    const { fx, jon } = await fresh();
    const before = await line(fx.weekId, "cucumber");
    const d = await pasted(jon, "Cucumber salad", 3, "2 each cucumber"); // maps to the fixture's cucumber (sold one each)
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.draftId, expectedRevision: d.revision });
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    const [ing] = await q<any>("SELECT ingredient_key, quantity::text AS quantity, unit FROM recipe_ingredients WHERE recipe_version_id=$1", [c.result.versionId]);
    expect(ing).toMatchObject({ ingredient_key: "cucumber", unit: "each" });
    // Friday's salmon (½ cucumber a plate) is replaced; Jon eats two plates, Alex one: three plates of a recipe for three.
    const ev = await onFriday(fx, jon, c.result.versionId);
    const s: any = await setPlateCommand(jon, op(), { eventId: ev.id, expectedEventRevision: ev.revision, memberId: fx.members.jon, night: "2026-10-16", kind: "dinner", componentPortions: { main: "2" } });
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    const after = await line(fx.weekId, "cucumber");
    // What the rest of the week needs (the salmon's half cucumbers are gone) plus exactly 2 for the salad.
    const salmon = Number(before.meal.sources.filter((x: any) => x.cookNight === "2026-10-16").reduce((a: number, x: any) => a + Number(x.quantity), 0));
    const rest = Number(before.meal.quantity) - salmon;
    expect(Number(after.meal.quantity)).toBeCloseTo(rest + 2, 6);
    expect(after.packagesNeeded).toBe(Math.ceil(rest + 2 - 1e-9));
  });

  it("RIO-02: a pepper bought by the piece is an ingredient; table pepper by the spoon is a seasoning", async () => {
    const { fx, jon } = await fresh();
    const d = await pasted(jon, "Stuffed pepper", 2, "1 pepper, diced\n1 tsp pepper\n1 large green pepper\n2 cups rice");
    const byRaw = Object.fromEntries(d.lines.map((l) => [l.raw, l]));
    expect(byRaw["1 pepper, diced"].decision).toMatchObject({ use: true, name: "pepper", quantity: "1", unit: "each" });
    expect(byRaw["1 large green pepper"].decision).toMatchObject({ use: true, name: "green pepper" });
    expect(byRaw["1 tsp pepper"].decision).toEqual({ use: false });
    expect(byRaw["1 tsp pepper"].parsed.status).toBe("omitted");
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.draftId, expectedRevision: d.revision });
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    await onFriday(fx, jon, c.result.versionId);
    // Groceries: the pepper bought by the piece is on the list; it is not reported as a household seasoning.
    const pepper = await line(fx.weekId, "pepper");
    expect(pepper?.meal).toMatchObject({ unit: "each" });
    const [cyc] = await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]);
    expect(cyc.projection_summary.householdSeasonings ?? []).toEqual([]);
  });
});

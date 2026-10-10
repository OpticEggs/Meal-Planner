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
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { approvePurchaseLinesCommand, captureHouseholdNeedCommand } from "@/server/commands/groceries";
import { startPartialHandoff } from "@/server/commands/purchasing";
import { householdSnapshot } from "@/server/queries/snapshot";
import { omissionsFor } from "@/domain/groceries/partial-handoff";
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

  /** The salad (2 cucumbers for 3 servings) on Friday with `plates` plates; the rest of the week's cucumber is read first. */
  async function salad(plates: { jon: string; alex: string }) {
    const env = await fresh();
    const { fx, jon } = env;
    const before = await line(fx.weekId, "cucumber");
    const salmon = Number(before.meal.sources.filter((x: any) => x.cookNight === "2026-10-16").reduce((a: number, x: any) => a + Number(x.quantity), 0));
    const rest = Number(before.meal.quantity) - salmon;
    const d = await pasted(jon, "Cucumber salad", 3, "2 each cucumber");
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.draftId, expectedRevision: d.revision });
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    let ev = await onFriday(fx, jon, c.result.versionId);
    for (const [m, n] of [["jon", plates.jon], ["alex", plates.alex]] as const) {
      const s: any = await setPlateCommand(jon, op(), { eventId: ev.id, expectedEventRevision: ev.revision, memberId: fx.members[m], night: "2026-10-16", kind: "dinner", componentPortions: { main: n } });
      expect(s.status, JSON.stringify(s)).toBe("accepted");
      ev = { ...ev, revision: s.result?.eventRevision ?? (await q<any>("SELECT revision FROM cooking_events WHERE id=$1", [ev.id]))[0].revision };
    }
    return { ...env, rest };
  }

  it("RIO-01b: exactly on a package boundary — the approval, the partial transfer and the retailer request all carry the exact count", async () => {
    const { fx, jon, rest } = await salad({ jon: "2", alex: "1" }); // 3 plates × ⅔ = exactly 2 cucumbers
    const l = await line(fx.weekId, "cucumber");
    const exact = Math.ceil(rest + 2 - 1e-9);
    expect(l.packagesNeeded).toBe(exact);
    expect(l.toSend).toBe(exact);
    const a: any = await approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: [{ key: "cucumber", fingerprint: l.fingerprint, packages: l.toSend }] });
    expect(a.status, JSON.stringify(a)).toBe("accepted");
    const s: any = await householdSnapshot(jon);
    const partial = s.groceries.partial;
    expect(partial.eligible.find((e: any) => e.key === "cucumber")).toMatchObject({ packages: exact });
    const r: any = await startPartialHandoff(jon, op(), {
      weekId: fx.weekId, reviewFingerprint: partial.reviewFingerprint, partialFingerprint: partial.partialFingerprint, selectedKeys: ["cucumber"],
      acknowledgedOmissions: omissionsFor(partial, ["cucumber"]).map((o) => o.key),
    });
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const [bl] = await q<any>("SELECT packages FROM handoff_batch_lines WHERE ingredient_key='cucumber'");
    expect(bl.packages).toBe(exact);
    const [call] = await q<any>("SELECT request_body FROM fake_retailer_calls ORDER BY id DESC LIMIT 1");
    expect(JSON.stringify(call.request_body)).toContain(`"quantity":${exact}`);
  });

  it("RIO-01c: a genuine overage still buys another package (four plates need 2⅔ cucumbers)", async () => {
    const { fx, rest } = await salad({ jon: "2", alex: "2" });
    const l = await line(fx.weekId, "cucumber");
    expect(Number(l.meal.quantity)).toBeCloseTo(rest + 8 / 3, 3); // the line shows 3 decimals
    expect(Number.isInteger(rest)).toBe(true); // the fixture's other cucumbers are whole, so 2 sits on a boundary
    expect(l.packagesNeeded).toBe(rest + 3); // one more than RIO-01b's exact boundary (rest + 2)
  });

  it("RIO-01d: one plate below the boundary (two plates, 1⅓ cucumbers) is not rounded up past what it needs", async () => {
    const { fx, rest } = await salad({ jon: "1", alex: "1" });
    const l = await line(fx.weekId, "cucumber");
    expect(l.packagesNeeded).toBe(Math.ceil(rest + 4 / 3));
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

/**
 * RIO-02 as originally assigned (the correction package arrived after bca110e): "1 tsp salt (smoked)",
 * "1 tsp pepper (white)" and "1 tsp salt (garlic)" were left out as household seasonings because the
 * descriptor was moved to the note before the decision; "smoked salt", "white pepper" were already kept.
 */
describe("RIO-02 (original): a descriptor that changes what salt or pepper is survives into groceries", () => {
  const ORIGINAL = ["1 tsp salt (smoked)", "1 tsp pepper (white)", "1 tsp salt (garlic)"];
  const ORDINARY = ["1 tsp kosher salt (plus more for the pasta water)", "1/2 tsp black pepper (freshly ground)", "salt (to taste)", "1 tsp salt, divided"];

  it("RIO-02a: a new import keeps the three specialty lines as ingredients and still leaves ordinary salt and pepper out", async () => {
    const { fx, jon } = await fresh();
    const d = await pasted(jon, "Smoky rub", 4, [...ORIGINAL, ...ORDINARY, "1 red bell pepper, diced", "1 chili pepper", "1 lb chicken thighs"].join("\n"));
    const byRaw = Object.fromEntries(d.lines.map((l) => [l.raw, l]));
    expect(byRaw["1 tsp salt (smoked)"].parsed).toMatchObject({ status: "parsed", name: "smoked salt", quantity: "1", unit: "tsp" });
    expect(byRaw["1 tsp pepper (white)"].parsed).toMatchObject({ status: "parsed", name: "white pepper", quantity: "1", unit: "tsp" });
    expect(byRaw["1 tsp salt (garlic)"].parsed).toMatchObject({ status: "parsed", name: "garlic salt", quantity: "1", unit: "tsp" });
    for (const raw of ORIGINAL) expect(byRaw[raw].decision, raw).toMatchObject({ use: true });
    for (const raw of ORDINARY) {
      expect(byRaw[raw].parsed.status, raw).toBe("omitted");
      expect(byRaw[raw].decision, raw).toEqual({ use: false });
    }
    const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.draftId, expectedRevision: d.revision });
    expect(c.status, JSON.stringify(c)).toBe("accepted");
    const keys = (await q<any>("SELECT ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1 ORDER BY 1", [c.result.versionId])).map((r) => r.ingredient_key);
    expect(keys).toEqual(expect.arrayContaining(["smoked_salt", "white_pepper", "garlic_salt", "red_bell_pepper", "chili_pepper"]));
    expect(keys.filter((k) => /^(salt|kosher_salt|black_pepper|pepper)$/.test(k))).toEqual([]);
    await onFriday(fx, jon, c.result.versionId);
    for (const k of ["smoked_salt", "white_pepper", "garlic_salt"]) expect((await line(fx.weekId, k))?.meal, k).toMatchObject({ unit: "ml" });
    const [cyc] = await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]);
    expect((cyc.projection_summary.householdSeasonings ?? []).map((s: any) => s.key)).toEqual([]);
  });

  it("RIO-02b: a recipe saved earlier with the descriptor in its ingredient name is bought; its ordinary salt and black pepper are not", async () => {
    const { fx, jon } = await fresh();
    const s: any = await saveRecipeVersionCommand(jon, op(), {
      title: "Saved smoky rub", instructions: "", components: [{ key: "main", name: "Main" }],
      ingredients: [
        { componentKey: "main", ingredientName: "salt (smoked)", quantity: "1.25", unit: "ml" },
        { componentKey: "main", ingredientName: "pepper (white)", quantity: "1.25", unit: "ml" },
        { componentKey: "main", ingredientName: "salt (garlic (granulated))", quantity: "1.25", unit: "ml" },
        { componentKey: "main", ingredientName: "salt (to taste)", quantity: "1.25", unit: "ml" },
        { componentKey: "main", ingredientName: "ground black pepper", quantity: "1.25", unit: "ml" },
        { componentKey: "main", ingredientName: "red bell pepper", quantity: "0.5", unit: "each" },
      ],
    });
    expect(s.status, JSON.stringify(s)).toBe("accepted");
    await onFriday(fx, jon, s.result.versionId);
    for (const k of ["salt_smoked", "pepper_white", "salt_garlic_granulated", "red_bell_pepper"]) expect((await line(fx.weekId, k))?.meal, k).toBeTruthy();
    const [cyc] = await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]);
    expect((cyc.projection_summary.householdSeasonings ?? []).map((x: any) => x.key).sort()).toEqual(["ground_black_pepper", "salt_to_taste"]);
    for (const k of ["ground_black_pepper", "salt_to_taste"]) expect(await line(fx.weekId, k), k).toBeUndefined();
  });

  it("RIO-02c: a member who asks for salt explicitly still gets it on the list", async () => {
    const { fx, jon } = await fresh();
    const r: any = await captureHouseholdNeedCommand(jon, op(), { weekId: fx.weekId, text: "kosher salt", from: "groceries", kind: "extra" });
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const [row] = await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1 AND r.line->'requests' @> '[{\"text\":\"kosher salt\"}]'", [fx.weekId]);
    expect(row?.line?.requests?.[0]).toMatchObject({ text: "kosher salt" });
  });
});

/**
 * Multi-source end to end (acceptance E2E-01/02) on real PostgreSQL: a Budget Bytes link → reviewed
 * import → Sounds good → the next week's proposal considers it → adoption → a different way to shop.
 * Only adoption changes the next week; the current week never changes; nothing is sent anywhere.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fresh, op, protectedState, q, retailerCalls } from "./helpers";
import * as sources from "@/server/commands/sources";
import * as imports from "@/server/commands/imports";
import { reviewIngredientCommand, saveInterestCommand } from "@/server/commands/library";
import { adoptWeekProposalCommand, generateProposalCommand } from "@/server/commands/plan";
import { setShoppingDestinationCommand } from "@/server/commands/destinations";
import { updateSettingsCommand } from "@/server/commands/household";

const NEXT = "2026-10-19";
const cmd = (p: Promise<unknown>): Promise<any> => p.then((r) => r, (e: Error) => ({ status: "threw", code: `threw: ${e.message}`, message: e.message }));

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network use in an offline test");
  });
});
afterEach(() => vi.unstubAllGlobals());

async function importRecipe(jon: any, url: string, text: string, confirm = true) {
  const b = (await cmd(sources.saveLinkCommand(jon, op(), { url }))).result.bookmarkId;
  const d = (await cmd(imports.pasteIngredientsCommand(jon, op(), { bookmarkId: b, text, title: "Our skillet beans" }))).result.draftId;
  if (!confirm) return { bookmarkId: b, draftId: d, recipeId: null, versionId: null };
  expect((await cmd(imports.updateImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 1, servings: 2, effortMinutes: 30 }))).status).toBe("accepted");
  const c = await cmd(imports.confirmImportDraftCommand(jon, op(), { draftId: d, expectedRevision: 2 }));
  expect(c.status, JSON.stringify(c)).toBe("accepted");
  return { bookmarkId: b, draftId: d, recipeId: c.result.recipeId as string, versionId: c.result.versionId as string };
}

describe("multi-source end to end", () => {
  it("E2E-01: Budget Bytes link → reviewed recipe → Sounds good → next-week proposal → adoption → another way to shop; the current week never changes", async () => {
    const { fx, jon, alex } = await fresh();
    const current = await protectedState(fx.weekId);
    const imp = await importRecipe(jon, "https://www.budgetbytes.com/some-synthetic-recipe/", "2 cups dried black beans\n1 lb ground turkey\n2 tbsp olive oil");
    // New ingredients have no allergen information until a member reviews them.
    const keys = (await q<any>("SELECT ingredient_key FROM recipe_ingredients WHERE recipe_version_id=$1", [imp.versionId])).map((r) => r.ingredient_key);
    for (const key of keys) {
      const known = (await q<any>("SELECT allergen_info_known FROM ingredients WHERE household_id=$1 AND key=$2", [fx.householdId, key]))[0].allergen_info_known;
      if (!known) expect((await cmd(reviewIngredientCommand(jon, op(), { key, tags: [], allergenInfoKnown: true }))).status).toBe("accepted");
    }
    expect((await cmd(saveInterestCommand(alex, op(), { recipeId: imp.recipeId! }))).status).toBe("accepted");
    expect(await protectedState(fx.weekId)).toEqual(current); // import, review, Sounds good: nothing planned changed

    const g = await cmd(generateProposalCommand(jon, op(), { weekStart: NEXT, inputs: { maxNewRecipes: 7 } }));
    expect(g.status, JSON.stringify(g)).toBe("accepted");
    const proposal = (await q<any>("SELECT content, explanation FROM proposals WHERE id=$1", [g.result.proposalId]))[0];
    expect(proposal.content.events.map((e: any) => e.recipeVersionId)).toContain(imp.versionId);
    // A proposal is not adoption: the next week has no accepted plan and no grocery demand yet.
    expect((await q<any>("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [g.result.weekId]))[0].accepted_choice_revision).toBe(0);
    expect(await protectedState(fx.weekId)).toEqual(current);

    const a = await cmd(adoptWeekProposalCommand(alex, op(), { proposalId: g.result.proposalId, reviewedHash: g.result.contentHash, expectedAcceptedChoiceRevision: 0 }));
    expect(a.status, JSON.stringify(a)).toBe("accepted");
    const nextLines = (await q<any>("SELECT r.ingredient_key FROM requirement_lines r JOIN grocery_cycles c ON c.id=r.cycle_id WHERE c.week_id=$1", [g.result.weekId])).map((r) => r.ingredient_key);
    for (const key of keys) expect(nextLines).toContain(key);
    expect(await protectedState(fx.weekId)).toEqual(current);

    const nextEvents = await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [g.result.weekId]);
    const sw = await cmd(setShoppingDestinationCommand(jon, op(), { weekId: g.result.weekId, destination: "manual", expectedRevision: 1 }));
    expect(sw.status, JSON.stringify(sw)).toBe("accepted");
    expect(await q("SELECT id, recipe_version_id, status, cook_night, revision FROM cooking_events WHERE week_id=$1 ORDER BY id", [g.result.weekId])).toEqual(nextEvents);
    expect(await protectedState(fx.weekId)).toEqual(current);
    expect(await retailerCalls()).toBe(0);
    expect((await q<any>("SELECT count(*)::int AS n FROM handoff_batches"))[0].n).toBe(0);
  });

  it("E2E-02: an incomplete import never becomes a recipe or a dinner; an unpriced line keeps the budget unconfirmed", async () => {
    const { fx, jon } = await fresh({ unpricedCheese: true });
    expect((await cmd(updateSettingsCommand(jon, op(), { expectedRevision: 1, budgetScope: "pickup", budgetLimitMinor: 100000, budgetFirm: false }))).status).toBe("accepted");
    const versions = (await q<any>("SELECT count(*)::int AS n FROM recipe_versions"))[0].n;
    const imp = await importRecipe(jon, "https://www.budgetbytes.com/another-synthetic-recipe/", "1 can black beans\nsalt to taste", false);
    const early = await cmd(imports.confirmImportDraftCommand(jon, op(), { draftId: imp.draftId, expectedRevision: 1 }));
    expect(early.code).toBe("incomplete");
    expect((await q<any>("SELECT count(*)::int AS n FROM recipe_versions"))[0].n).toBe(versions);
    const g = await cmd(generateProposalCommand(jon, op(), { weekStart: NEXT, inputs: { maxNewRecipes: 7 } }));
    const titles = (await q<any>("SELECT v.title FROM proposals p, jsonb_array_elements(p.content->'events') e JOIN recipe_versions v ON v.id=(e->>'recipeVersionId')::uuid WHERE p.id=$1", [g.result.proposalId])).map((r) => r.title);
    expect(titles).not.toContain("Our skillet beans");
    const s = (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].projection_summary;
    expect(s.pickupSpending.complete).toBe(false);
    expect(s.budget.status).not.toBe("within"); // never a green budget while a price is unknown
  });
});

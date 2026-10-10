/**
 * Shared steps for the exact-quantity suites (EQ, EQR): real commands against PostgreSQL (table_test).
 */
import { expect } from "vitest";
import { line, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import * as sources from "@/server/commands/sources";
import { applyPlanChangeCommand, createPreviewCommand, setPlateCommand } from "@/server/commands/plan";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import { Q } from "@/domain/exact";
import type { Actor } from "@/server/commands/framework";

export const TBSP = Q.of("14.78676478125");
export const CUP = Q.of("236.5882365");
export const FL_OZ = Q.of("29.5735295625");

export async function imported(actor: Actor, title: string, servings: number, text: string) {
  const s: any = await sources.saveLinkCommand(actor, op(), { url: `https://example.org/${title.toLowerCase().replace(/\W+/g, "-")}` });
  expect(s.status, JSON.stringify(s)).toBe("accepted");
  const p: any = await imports.pasteIngredientsCommand(actor, op(), { bookmarkId: s.result.bookmarkId, text, title });
  expect(p.status, JSON.stringify(p)).toBe("accepted");
  const u: any = await imports.updateImportDraftCommand(actor, op(), { draftId: p.result.draftId, expectedRevision: 1, servings });
  expect(u.status, JSON.stringify(u)).toBe("accepted");
  const c: any = await imports.confirmImportDraftCommand(actor, op(), { draftId: p.result.draftId, expectedRevision: u.result.revision });
  expect(c.status, JSON.stringify(c)).toBe("accepted");
  return c.result as { recipeId: string; versionId: string };
}

/** Put a recipe version on a night of the accepted week (reviewed preview), then set the plates. */
export async function onNight(fx: any, actor: Actor, night: "thu" | "fri", versionId: string, plates?: { jon: string; alex: string }) {
  const p: any = await createPreviewCommand(actor, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments[night], recipeVersionId: versionId } });
  expect(p.status, JSON.stringify(p)).toBe("accepted");
  const a: any = await applyPlanChangeCommand(actor, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) });
  expect(a.status, JSON.stringify(a)).toBe("accepted");
  const [ev] = await q<any>("SELECT id, revision, cook_night::text AS night FROM cooking_events WHERE week_id=$1 AND recipe_version_id=$2 AND status='scheduled'", [fx.weekId, versionId]);
  if (plates) {
    let rev = ev.revision;
    for (const [m, n] of [["jon", plates.jon], ["alex", plates.alex]] as const) {
      const s: any = await setPlateCommand(actor, op(), { eventId: ev.id, expectedEventRevision: rev, memberId: fx.members[m], night: ev.night, kind: "dinner", componentPortions: { main: n } });
      expect(s.status, JSON.stringify(s)).toBe("accepted");
      rev = (await q<any>("SELECT revision FROM cooking_events WHERE id=$1", [ev.id]))[0].revision;
    }
  }
  return ev;
}

/** Exact meal demand of an ingredient from the nights NOT in `except`, read from the line's own sources. */
export async function restOf(weekId: string, key: string, except: string[]) {
  const l = await line(weekId, key);
  const keep = (l?.meal?.sources ?? []).filter((s: any) => !except.includes(s.cookNight));
  return keep.reduce((a: Q, s: any) => a.plus(Q.of(s.rational ?? s.quantity)), Q.zero);
}

export const manual = (actor: Actor, title: string, ingredients: { key: string; quantity: string; unit: string }[]) =>
  saveRecipeVersionCommand(actor, op(), {
    title, instructions: "", components: [{ key: "main", name: "Main" }],
    ingredients: ingredients.map((i) => ({ componentKey: "main", ingredientName: i.key.replace(/_/g, " "), ingredientKey: i.key, quantity: i.quantity, unit: i.unit })),
  }) as Promise<any>;

/** A row as the release before migration 015 wrote it (no exact columns given): legacy. */
export async function legacyRecipe(fx: any, title: string, rows: [string, string, string][]) {
  const [r] = await q<any>("INSERT INTO recipes(household_id, created_by) VALUES ($1,$2) RETURNING id", [fx.householdId, fx.members.jon]);
  const [v] = await q<any>(
    "INSERT INTO recipe_versions(recipe_id, household_id, version_no, title, instructions, provenance, estimate, created_by) VALUES ($1,$2,1,$3,'','manual',false,$4) RETURNING id",
    [r.id, fx.householdId, title, fx.members.jon],
  );
  await q("INSERT INTO recipe_components(recipe_version_id, key, name) VALUES ($1,'main','Main')", [v.id]);
  let sort = 0;
  for (const [k, qty, u] of rows) {
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [fx.householdId, k, k]);
    await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,'main',$2,$3,$4,$5)", [v.id, k, qty, u, sort++]);
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [r.id, v.id]);
  return { recipeId: r.id as string, versionId: v.id as string };
}


/**
 * B17 — a recipe edit names the version it was made from; a version saved by the other member
 * meanwhile is never silently stacked over (both commit orders).
 */
import { describe, expect, it } from "vitest";
import { fresh, op, q, race } from "./helpers";
import { saveRecipeVersionCommand } from "@/server/commands/library";
import type { Actor } from "@/server/commands/framework";

const draft = (recipeId: string | null, title: string, expectedVersionNo?: number) => ({
  recipeId, title, instructions: "Cook it.", components: [{ key: "main", name: "Main" }],
  // EQR (2026-10-10): an edit says where each row came from; these rows are stated afresh (null = added here).
  ingredients: [{ componentKey: "main", ingredientName: "Rice", ingredientKey: "rice", quantity: "75", unit: "g", ...(recipeId ? { sourceRowId: null } : {}) }],
  ...(expectedVersionNo === undefined ? {} : { expectedVersionNo }),
});
const versions = async (recipeId: string) => (await q<any>("SELECT version_no, title FROM recipe_versions WHERE recipe_id=$1 ORDER BY version_no", [recipeId]));

describe("B17 recipe versions are edited against the version seen", () => {
  for (const order of ["Jon first", "Alex first"] as const) {
    it(`two edits made from the same version: the first saves, the second is refused with who saved what — ${order}`, async () => {
      const { jon, alex } = await fresh();
      const created = await saveRecipeVersionCommand(jon, op(), draft(null, "Rice bowl"));
      expect(created.status).toBe("accepted");
      const recipeId = (created as any).result.recipeId as string;
      const j = () => saveRecipeVersionCommand(jon, op(), draft(recipeId, "Rice bowl (Jon)", 1));
      const a = () => saveRecipeVersionCommand(alex, op(), draft(recipeId, "Rice bowl (Alex)", 1));
      const [x, y] = order === "Jon first" ? await race((jon as Actor).householdId, j, a) : await race((alex as Actor).householdId, a, j);
      expect(x.status).toBe("accepted");
      expect(y.status === "rejected" && y.code).toBe("stale_version");
      const winner = order === "Jon first" ? "Jon" : "Alex";
      expect(y.status === "rejected" && y.message).toContain(`${winner} saved version 2 (Rice bowl (${winner}))`);
      expect(y.status === "rejected" && y.details).toMatchObject({ current: { versionNo: 2 } });
      expect(await versions(recipeId)).toEqual([{ version_no: 1, title: "Rice bowl" }, { version_no: 2, title: `Rice bowl (${winner})` }]);
      // After reviewing version 2, the other member saves version 3 deliberately.
      const loser = order === "Jon first" ? alex : jon;
      const loserName = order === "Jon first" ? "Alex" : "Jon";
      expect((await saveRecipeVersionCommand(loser, op(), draft(recipeId, `Rice bowl (${loserName})`, 2))).status).toBe("accepted");
      expect((await versions(recipeId)).map((v) => v.version_no)).toEqual([1, 2, 3]);
    });
  }

  // RB17-03 (independent review of 7220679): this test used to assert that an edit WITHOUT an
  // expected version was accepted — it encoded the bypass. An existing recipe now requires one.
  it("RB17-03: an edit of an existing recipe must name its version; missing, malformed and stale ones write nothing", async () => {
    const { jon } = await fresh();
    const created = await saveRecipeVersionCommand(jon, op(), draft(null, "Soup")); // creating needs no version
    expect(created.status).toBe("accepted");
    const recipeId = (created as any).result.recipeId as string;
    const pointer = async () => (await q<any>("SELECT current_version_id FROM recipes WHERE id=$1", [recipeId]))[0].current_version_id;
    const before = { versions: await versions(recipeId), pointer: await pointer(), rows: (await q("SELECT count(*)::int n FROM recipe_ingredients"))[0] };
    const attempts: [unknown, string][] = [[undefined, "version_required"], [null, "version_required"], ["two", "invalid"], [0, "invalid"], [1.5, "invalid"], [2, "stale_version"]];
    for (const [expectedVersionNo, code] of attempts) {
      const d: any = draft(recipeId, "Soup (old draft)");
      if (expectedVersionNo !== undefined) d.expectedVersionNo = expectedVersionNo;
      const r = await saveRecipeVersionCommand(jon, op(), d);
      expect(r.status === "rejected" && r.code, JSON.stringify(expectedVersionNo)).toBe(code);
    }
    expect({ versions: await versions(recipeId), pointer: await pointer(), rows: (await q("SELECT count(*)::int n FROM recipe_ingredients"))[0] }).toEqual(before);
    const ok = await saveRecipeVersionCommand(jon, op(), draft(recipeId, "Soup 2", 1));
    expect(ok.status).toBe("accepted");
    expect((await versions(recipeId)).map((v) => v.version_no)).toEqual([1, 2]);
    expect(await pointer()).not.toBe(before.pointer);
  });

  it("RB17-02: repeated occurrences of one ingredient in a component are stored as separate rows, with their own form and note", async () => {
    const { jon } = await fresh();
    const d: any = draft(null, "Rice twice");
    d.ingredients = [
      { componentKey: "main", ingredientName: "Rice", ingredientKey: "rice", quantity: "10", unit: "g", form: "raw", note: "for the crust" },
      { componentKey: "main", ingredientName: "Rice", ingredientKey: "rice", quantity: "100", unit: "g", form: "cooked", note: null },
    ];
    const r = await saveRecipeVersionCommand(jon, op(), d);
    expect(r.status).toBe("accepted");
    const rows = await q<any>(
      "SELECT ri.quantity::text AS q, ri.form, ri.note FROM recipe_ingredients ri JOIN recipe_versions v ON v.id=ri.recipe_version_id WHERE v.recipe_id=$1 ORDER BY ri.sort",
      [(r as any).result.recipeId],
    );
    expect(rows).toEqual([{ q: "10", form: "raw", note: "for the crust" }, { q: "100", form: "cooked", note: null }]);
  });
});

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
  ingredients: [{ componentKey: "main", ingredientName: "Rice", ingredientKey: "rice", quantity: "75", unit: "g" }],
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

  it("callers that do not name a version keep the old behavior; a malformed expectation is refused", async () => {
    const { jon } = await fresh();
    const created = await saveRecipeVersionCommand(jon, op(), draft(null, "Soup"));
    const recipeId = (created as any).result.recipeId as string;
    expect((await saveRecipeVersionCommand(jon, op(), draft(recipeId, "Soup 2"))).status).toBe("accepted");
    const bad = await saveRecipeVersionCommand(jon, op(), { ...draft(recipeId, "Soup 3"), expectedVersionNo: "two" } as any);
    expect(bad.status === "rejected" && bad.code).toBe("invalid");
    expect((await versions(recipeId)).length).toBe(2);
  });
});

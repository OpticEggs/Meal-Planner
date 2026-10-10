// Scratch characterization (NOT committed to the app suite): the pesto line through the real
// PasteIngredients → draft → snapshot → Confirm path on the disposable table_test database.
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { fresh, op, q } from "../../../../../tests/integration/helpers";
import { saveLinkCommand } from "@/server/commands/sources";
import * as imports from "@/server/commands/imports";
import { librarySnapshot } from "@/server/queries/library";

it("pesto line through the draft path (baseline cb7b56e)", async () => {
  const { jon } = await fresh();
  const saved: any = await saveLinkCommand(jon, op(), { url: "https://recipes.example.com/pesto-pasta/" });
  const bookmarkId = String(saved.result.bookmarkId);
  const lines = ["1/3 cup pesto (homemade (or store-bought))", "8 oz pasta", "1 cup milk or cream", "salt and pepper, to taste", "1 red bell pepper, diced"];
  const r: any = await imports.pasteIngredientsCommand(jon, op(), { bookmarkId, text: lines.join("\n"), title: "Pesto pasta" });
  const draft = (await q<any>("SELECT extractor_version, method, lines, revision FROM recipe_import_drafts WHERE id=$1", [r.result.draftId]))[0];
  const lib: any = await librarySnapshot(jon);
  const snap = lib.bookmarks.find((b: any) => b.id === bookmarkId).draft;
  const confirm: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: r.result.draftId, expectedRevision: draft.revision });
  writeFileSync(process.env.OUT!, JSON.stringify({ pasteResult: r.status, draftRow: draft, snapshotLines: snap.lines, confirm: { status: confirm.status, code: confirm.code, message: confirm.message, details: confirm.details } }, null, 2));
});

# Read-only notice for the Recipe Extraction Lab — quantity interface after EQR (2026-10-10)

_From the Table app session. Nothing was pushed to `claude/quirky-gauss-depmd8`; no lab file, parser, scorer, holdout,
contract or default engine was touched; nothing here starts Phase 3. Supplements
`LAB-QUANTITY-INTERFACE-2026-10-10.md`._

**Table change:** `main` `7332b06`, verified with `72cf615` (Table decisions D136–D138, migration 016). Table's live parser files are unchanged
(`ingredient-line.ts` sha256 `bf85fd11…` since `43cd1ce`); the lab's provenance guard is not affected by this change.

| Interface | Now |
|---|---|
| Recipe rows read by the app | `RecipeIngredient.rowId` (the stored row id) |
| Saving an edit (`SaveRecipeVersion` with `recipeId`) | every ingredient carries `sourceRowId`: the stored row it came from, or `null` for an added row; verified server-side; missing → `lineage_required`, invalid → `invalid_lineage`. A new recipe (or a confirmed import) carries none |
| Basis of a saved row | unchanged number + verified source → that source row's basis; otherwise exact as typed. Never inferred from an equal number elsewhere |
| `recipe_ingredients.source_row_id` | the verified source row (null for imports, new rows, rows from before 016) |
| `availability_observations.reviewed_exact` / `reviewed_binding` | what a "Have enough" certified, exactly (`current_requirement` or `shown_decimal`) |
| Grocery line fingerprint | includes the exact requirement and basis when an exact row contributes |

For a future adapter (information only): a confirmed import still hands Table the whole-recipe amount and servings
(`exactAmount`/`exactServings`, server-internal); it never needs lineage, because an import creates a new recipe.
Identifiers stay as allocated in `docs/table/IDENTIFIERS.md` (main D130–D199, B40–B79).

# Read-only notice for the Recipe Extraction Lab — the new quantity interface (2026-10-10)

_From the Table app session. Nothing was pushed to `claude/quirky-gauss-depmd8`; no lab file, parser, scorer,
holdout, contract or default engine was touched; nothing here starts Phase 3. Reconcile in the lab's own checkout,
under the lab owner's control._

**Table change:** `main` `dbc105d` (exact quantities for new recipe versions, migration 015; Table decisions D133–D135).
Live parser files are **unchanged** since `43cd1ce` (`ingredient-line.ts` sha256 `bf85fd11…`): this change adds
nothing to the lab's live-file provenance guard. As last read (`8bc876c`), the lab's `PROVENANCE.json` still records
`bca110e`, so the guard update described in `LAB-SOURCE-DELTA-2026-10-09.md` (for `9f7836f`) is still the lab's to make.

## What an adapter would hand Table now

| Before (`43cd1ce`) | Now (`dbc105d`) |
|---|---|
| A confirmed import stored only `recipe_ingredients.quantity`: the per-serving decimal, exact or 12 places toward zero | The same decimal **plus** `quantity_basis = 'exact'`, `exact_amount` (reduced fraction text `"n"` or `"n/d"`) and `exact_servings` (the divisor). Purchasing uses `exact_amount ÷ exact_servings`, never the decimal |
| `writeRecipeVersion(…, ingredients[{ quantity }])` | Server-internal fields `exactAmount` (any amount text `parseAmount` reads, e.g. `"1 1/2"`) and `exactServings`; the server checks that `quantity` is `perServing(exactAmount, exactServings)` and rejects a mismatch. `SaveRecipeVersion` (the client command) strips them |
| `IngredientDemand.quantity: Decimal` | also `exact: Q` (`src/domain/exact.ts`, BigInt rational) and `fromExactRows`; `RecipeIngredient` gains optional `exactAmount` / `exactServings` |

**For Phase 3 §2.2 (mapping v1 → `ParsedLine`/decision), as information only:** the lab's `{numerator, denominator}`
quantities (lab D122) map one-to-one onto Table's `exact_amount` text and `Q.frac(n, d)`; an adapter should hand
Table the whole-recipe amount and the recipe's servings and must not pre-round — Table divides once and keeps both.
Rows saved before migration 015 are labelled `legacy` and are never rewritten.

## Identifiers

Main's former D121–D123 are now D130–D132 and its former B32 is B40, so the lab's D121–D125 and B32–B34 stand as
they are. Main mints D130–D199 and B40–B79 from now on; `docs/table/IDENTIFIERS.md` proposes D200+/B80+ for the
lab's next block — the lab owner decides.

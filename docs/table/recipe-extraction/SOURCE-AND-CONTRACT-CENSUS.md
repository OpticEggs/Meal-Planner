# Recipe Extraction Lab — source and contract census (Phase 0)

_2026-10-09. Read-only census of Table's recipe import at the baseline, before any extraction work.
Nothing here changes the Table app._

## 1. Identity

| What | Value |
|---|---|
| Baseline | `main` = `cb7b56eaa01832b75b2bdbf74031f9f45c75ec13` (matches the handoff; `origin/main` fetched 2026-10-09, unchanged) |
| Working branch | `claude/quirky-gauss-depmd8` (started at `cb7b56e`, clean tree) |
| Toolchain | Node v22.22.0, npm 10.9.4, `npm ci` from the committed lockfile, local PostgreSQL 16.15 (`scripts/db.sh`, disposable `table_test`) |
| Live pilot | Render Free + Neon, owner-reported. **Not inspected, not touched.** Nothing here infers its settings or migration level. |

## 2. Call path: URL → recipe

```
UI "Add a recipe from a link" ─► POST /api/imports ─► addRecipeFromLink (src/server/recipe-import-service.ts)
  saveLinkCommand (commands/sources.ts)              shared bookmark; never reads the page
  importFromLink
    Budget Bytes? → permission_blocked (no request)  url.ts isBudgetBytes / content-policy.ts readRefusal
    configuredDeps(): fetch OFF unless TABLE_RECIPE_IMPORT_FETCH=on (R1) or test fixtures
    safeFetch (fetcher.ts, ip.ts)                    SSRF checks; read policy asked before EVERY hop (D102)
    extractRecipes(html, { baseUrl: finalUrl })      jsonld.ts → RecipeCandidate[] (JSON-LD, else microdata; OG fallback)
    usable = candidates with ingredient lines; >1 → member chooses
    contentUse(final host) / photoHostAllowed        content-policy.ts — what may be KEPT (default nothing)
    createImportDraftFromPage → openDraft             commands/imports.ts
      draftLines(lines): parseIngredientLine(raw) → ParsedLine; initialDecision(parsed)
      INSERT recipe_import_drafts (extractor_version 'table-import-2', lines JSONB, problems, policy…)
Paste fallback: pasteIngredientsCommand → openDraft(method 'user_pasted')  (same draftLines)
Review UI: librarySnapshot → ImportReview.tsx DraftReview / LineRow
  "Use" prefill = suggestedDecision(parsed) if any, else { parsed.name, parsed.quantity ?? "", parsed.unit ?? "" }
UpdateImportDraft (revision-bound; decisionProblem: positive decimal string + Table unit)
ConfirmImportDraft: draftProblems → perPortion(quantity, servings) [4 dp, rounded flag]
  → writeRecipeVersion(provenance 'imported', note "From: <raw>", summary "Not counted in groceries: …")
  → recipe_ingredients(quantity numeric > 0, unit, form, note) — immutable rows → grocery projection
```

## 3. Contracts at the seams (as they are)

| Seam | Type / storage | Constraint that matters for a new extractor |
|---|---|---|
| Page reader | `RecipeCandidate` (`jsonld.ts`): name, ingredients `string[]`, yield, servings, times, author, siteName, description, instructions, images, category, cuisine, source | Pure text in, plain data out; limits in `JSONLD_LIMITS`. Reused unchanged in the package (frozen copy). |
| Line reader | `IngredientLine` (`ingredient-line.ts`): quantity **decimal string or null**, unit (Table unit), name, note, form, status `parsed`/`requires_review`, reasons (English), suggestion | Thirds/sixths → review (no exact decimal); suggestion rounds to 4 dp. |
| Draft line | `DraftLine { raw, parsed: ParsedLine, decision }` in `recipe_import_drafts.lines` (JSONB) | Old drafts must stay readable; `extractor_version` text column. No schema change needed to add optional fields. |
| Decision | `LineDecision` (`domain/recipes/import.ts`): `quantity` must match `^\d+(\.\d+)?$`, unit ∈ `KNOWN_UNITS` (g, kg, oz, lb, ml, l, tsp, tbsp, cup, fl_oz, each) | A member cannot type "1/3" either. No count nouns, quarts or packages. |
| Recipe ingredient | `recipe_ingredients.quantity numeric` per **one portion**, immutable | Rationals cannot be stored; the adapter must round once and say so (D89). |
| Units | `domain/units.ts`: decimal.js, mass/volume/count, `oz` ≠ `fl_oz`, `fmtQty` 2 dp | Never conflate oz/fl oz; no densities. |

## 4. Baseline evidence (actual, at `cb7b56e`)

| Check | Result | Evidence |
|---|---|---|
| Parser unit tests (`recipe-import-{ingredient-line,ingredient-suggest,jsonld,extract-details,url}`) | 5 files, **459/459 passed** | `evidence/2026-10-09-recipe-extraction-lab/baseline-parser-tests.log` |
| URL-import integration (`u2c-url-import`, real PostgreSQL) | **11/11 passed** | `baseline-u2c-integration.log` |
| Root typecheck | **pass** | `baseline-typecheck.log` |
| Pesto line, parser level | reproduced (below) | `pesto-baseline-cb7b56e.json` |
| Pesto line, real draft path (PasteIngredients → draft row → snapshot → Confirm) on `table_test` | reproduced (below) | `pesto-draft-db-baseline-cb7b56e.json` |
| Corner cases (plan §4 Phase 0.4) | table §5 | `corner-cases-baseline-cb7b56e.json` |

Full verify-all was **not** run in this pass (no app code changed); the last recorded clean run is on
`7c79eb6` (vitest 1129, Playwright 139, 93 mutations killed) — repository evidence, not rerun here.

### 4.1 The pesto defect — observed, not assumed

`parseIngredientLine("1/3 cup pesto (homemade (or store-bought))")` at `cb7b56e`:

```json
{ "quantity": null, "unit": null, "name": "1/3 cup pesto (homemade )", "note": "or store-bought",
  "status": "requires_review", "reasons": ["alternatives (or)", "fraction not exact as a decimal"],
  "suggestion": null }
```

Through the real command path the draft line is the same with `decision: null`; Confirm is refused
(`incomplete`) until a member decides it. Pressing **Use** pre-fills **name `1/3 cup pesto (homemade )`,
amount empty, unit empty** (`ImportReview.tsx` `LineRow`: no suggestion → `parsed.name`, `parsed.quantity ?? ""`).
That is exactly the owner's report.

Root causes (each independently sufficient for some line):

1. `readLine`'s review path uses the **whole cleaned line as the name** (`review(reasons, name = line)`), so any
   review line that has no suggestion shows its amount inside the name field.
2. **Thirds** are refused (`fraction not exact as a decimal`) because quantities must be exact decimals.
3. `\bor\b` **anywhere** adds `alternatives (or)` — including a sourcing remark inside parentheses.
4. `splitNote` and `suggest` remove only **innermost** parentheses (`/\(([^()]*)\)/`, one pass): the nested
   `(homemade (or store-bought))` leaves `(homemade )` in the name and `or store-bought` as the note.
5. `suggest` then refuses any name still containing `(` → **no suggestion**, so nothing better is offered.

The same line with `1/2` instead of `1/3` still fails (causes 1, 3, 4, 5), so fixing thirds alone would not fix it.

**Passing target for Phase 2** (in the package, default engine): `status: "ready"`, `name: "pesto"`,
`quantity: { numerator: "1", denominator: "3" }`, `unit: cup`, `note: "homemade or store-bought"`,
`alternatives: []` — recorded now as an expected-to-fail test (`tests/characterization/pesto.test.ts`).

## 5. Corner cases — actual baseline behaviour

| Line | Status | Qty | Unit | Name read | Note | Reasons | One-click suggestion |
|---|---|---|---|---|---|---|---|
| `1/3 cup pesto (homemade (or store-bought))` | review | – | – | `1/3 cup pesto (homemade )` | or store-bought | alternatives (or); fraction not exact | **none** |
| `⅓ cup sugar` | review | – | – | `⅓ cup sugar` | – | fraction not exact | 0.3333 cup sugar (rounded) |
| `1 1/3 cups flour` | review | – | – | `1 1/3 cups flour` | – | fraction not exact | 1.3333 cup flour |
| `1⅓ cups rolled oats` | review | – | – | `1⅓ cups rolled oats` | – | fraction not exact | 1.3333 cup rolled oats |
| `1-1/2 cups milk` | review | – | – | `1-1/2 cups milk` | – | quantity range | **1 cup milk — wrong amount (1½)** |
| `1⁄2 cup broth` | parsed | 0.5 | cup | broth | – | – | – |
| `2 (15 oz) cans black beans, drained` | review | – | – | `2 (15 oz) cans black beans` | drained | parenthetical number; more than one quantity | 30 oz black beans |
| `1 can (14.5 oz) diced tomatoes` | review | – | – | `can (14.5 oz) diced tomatoes` | – | parenthetical number; unit not supported: can | 14.5 oz diced tomatoes |
| `3 cloves garlic` | review | 3 | – | `cloves garlic` | – | unit not supported: cloves | 3 each garlic (clove) |
| `salt and pepper to taste` | review | – | – | `salt and pepper to taste` | – | no fixed quantity; no quantity | leave out |
| `salt and pepper, to taste` | review | – | – | salt and pepper | to taste | no fixed quantity; no quantity | leave out |
| `2-3 cups broth` | review | – | – | `2-3 cups broth` | – | quantity range | 3 cup broth (larger end) |
| `2 eggs` | parsed | 2 | each | eggs | – | – | – |
| `1 jalapeño, minced` | parsed | 1 | each | jalapeño | minced | – | – |
| `1 Tbsp olive oil ($0.16)` | parsed | 1 | tbsp | olive oil | – | – | – |
| `8 oz milk` / `8 fl oz milk` | parsed | 8 | oz / fl_oz | milk | – | – | – (kept distinct ✔) |
| `2 oz cheese` / `2 fl oz broth` | parsed | 2 | oz / fl_oz | cheese / broth | – | – | – |
| `3 cups cooked rice` | parsed | 3 | cup | cooked rice (form cooked) | – | – | – |
| `1 cup 2% milk` | review | – | – | `1 cup 2% milk` | – | more than one quantity | **none** |
| `1 cup milk or cream` | review | – | – | `1 cup milk or cream` | – | alternatives (or) | **1 cup milk — arbitrary first choice** |
| `1 red bell pepper, diced` | parsed | 1 | each | red bell pepper | diced | – | – |
| `1 cup flour (packed)` | parsed | 1 | cup | flour | packed | – | – |
| `1 lb 4 oz beef` | review | – | – | `1 lb 4 oz beef` | – | more than one quantity | **none** |
| `a pinch of salt` | review | – | – | `a pinch of salt` | – | no quantity | leave out |
| `1 tsp vanilla (optional)` | review | – | – | 1 tsp vanilla | optional | no fixed quantity | 1 tsp vanilla |
| `For the sauce:` | review | – | – | For the sauce | – | no quantity | none |

Findings beyond the pesto report: the amount-in-name pattern affects every review line without a suggestion
(`1 cup 2% milk`, `1 lb 4 oz beef`); the hyphenated mixed number `1-1/2` is mis-read as a range and its
suggestion is a **wrong amount**; ingredient alternatives get an arbitrary first choice; headings become
ingredient candidates. What is right today and must not regress: `oz`/`fl oz` stay distinct; nothing is
invented for "to taste"; bell pepper is an ordinary ingredient; price annotations are dropped.

## 6. Tests and contracts that must change intentionally later (not in Phase 1)

| Artefact | Encodes | Phase that may change it |
|---|---|---|
| `tests/unit/recipe-import-ingredient-line.test.ts` (thirds → review, cans/cloves → review, `1 cup 2% milk` → review, `1 lb 4 oz` → review, `1 cup milk or cream` → review) | legacy policy | Phase 3, when Table switches to the new engine — superseded with a before/after ledger, not deleted |
| `tests/unit/recipe-import-ingredient-suggest.test.ts`, `src/domain/recipes/import.ts suggestedDecision`, UI `draft-suggestions` / `accept-suggestions` / `line-suggestion`, e2e `u2c-url-to-recipe`, `ms-sources`, `journey-url-to-cart`, integration `u2c-url-import`, `ruc01-source-policy`, mutation `U2C_suggestion_applied_unreviewed` | D97 suggestions | Phase 3/4 (suggestion dependency removed only after adapter + concurrency + mutation tests are adapted) |
| `EXTRACTOR_VERSION = "table-import-2"` | draft provenance | Phase 3 (new id only after schema and adapter are proven) |
| `perPortion` 4 dp (D89) | storage rounding | Phase 3 decision (see `ADAPTER-IMPACT.md`) |

Must **not** change: SSRF/read policy/redirect checks, Budget Bytes refusal, content retention and photo
host rules (D95–D104), revision-bound drafts (`stale_draft`), immutable recipe versions, accepted-week and
purchasing contracts, `oz` ≠ `fl_oz`, unknown-never-zero.

## 7. Reversible change inventory (this pass)

Only additions: `packages/recipe-extraction/**` (not imported by the app; not in the root tsconfig, root vitest
include or the Next build) and `docs/table/recipe-extraction/**` + evidence. Revert = remove those paths.
No change to root `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `src/`, `tests/`,
`migrations/`, `scripts/`, deploy templates, environment variables or production settings.

## 8. Fixture provenance inventory

| Fixtures | Provenance | Use here |
|---|---|---|
| `tests/fixtures/recipe-pages/*.html` | Synthetic, hand-written for Table tests (README in folder); reserved example hosts | Parity tests (frozen page reader vs Table's) |
| `tests/fixtures/import-site/*` + `manifest.json` | Synthetic pages/photos for the import integration tests; the manifest maps reserved example hosts (and `www.budgetbytes.com` as a *host name only*, for the refusal tests) to fixed addresses answered only by the in-process fixture transport (no network); no third-party content | Parity tests |
| `packages/recipe-extraction/fixtures/**` | Synthetic benchmark corpus written for this package (manifest per file); one owner-reported ingredient line (the pesto line) | Benchmark |

No real recipe page, photo or publisher text is in source control; no page was fetched.

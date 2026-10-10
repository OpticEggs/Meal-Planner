# Recipe Extraction Lab — adapter impact analysis (read-only)

_2026-10-09, at `cb7b56e`. Design input for Phase 3 (Table adapter) and Phase 4 (review UI). **No Table code,
schema, setting or test was changed.** Decisions marked **(owner)** are product calls; the rest are
engineering defaults the integration owner proposes._

## 1. Where the package would plug in

`importFromLink` (`src/server/recipe-import-service.ts`) keeps everything it does before and after
extraction — saved link, Budget Bytes refusal, fetch switch, `safeFetch` with the read policy on every hop,
`contentUse`/`photoHostAllowed` for the **final** host, photo fetch and sniffing. Only two calls change:

| Today | Phase 3 (behind a switch, default off until G3) |
|---|---|
| `extractRecipes(fetched.text, { baseUrl: fetched.finalUrl })` | `extractRecipePage(fetched.text, { requestedUrl: b.url, finalUrl: fetched.finalUrl })` → map each `RecipeCandidateV1` back to today's `RecipeCandidate` fields (title→name, ingredientLines→ingredients, times, author, siteName, instructionCandidates→instructions, imageCandidates→images) |
| `draftLines(raws)` → `parseIngredientLine` | `draftLines` → `adaptLine(ParsedIngredientV1)` → today's `ParsedLine` + `decision`, with the full v1 reading kept alongside (`parsed.v1`) |

The content gates stay where they are. `instructionCandidates` reach the draft only when
`contentUse(...).instructions` is true; image URLs are requested only by Table's photo path. An adapter test
must assert `retention === "not_decided"` and that no gate decision is read from the package.

## 2. Line mapping proposal (`ParsedIngredientV1` → `ParsedLine` + initial decision)

| v1 reading | Draft `parsed` | Initial decision (member sees) |
|---|---|---|
| ready; unit ∈ Table units; quantity terminates | `parsed`, decimal quantity | **Use** (as today) |
| ready; quantity does not terminate (1/3 cup) | `parsed`, exact kept in `parsed.v1`; decimal shown rounded and labelled | **Use** — needs the quantity bridge in §3 |
| ready; `quart`/`pint`/`gallon` | `parsed`, exact cups (×4, ×2, ×16) | **Use**, note "1 quart = 4 cups" |
| ready; count noun without size (`3 cloves garlic`) | `parsed`, `each`, name per D97 convention `garlic (clove)` | **Use** — keeps D97's grocery keys; **(owner)** if `garlic` and `garlic (clove)` should ever merge |
| ready; container with size (`2 (15 oz) cans black beans`) | `parsed`, exact total 30 `oz`, note "2 cans × 15 oz" | **Use** (D97 already multiplies; now exact and disclosed) |
| ready; imprecise unit (`a pinch of salt`) or `amountUnstated` (`to taste`, `for serving`) | `parsed`, no quantity | **Leave out of groceries** (no member action; listed in "Not counted in groceries") |
| ready; `optional: true` with an amount | `parsed` | **(owner)** default Use or Leave out — proposed: Use, with "optional" visible |
| ready; ordinary salt / black pepper (§4) | `parsed` | **Leave out of groceries**, reason "household seasoning" |
| needs_review | `requires_review`; name/amount/unit pre-filled **only** with what was read (never the raw line as the name); reasons as words; alternatives offered as choices | **Undecided** — the only lines that ask for attention |
| unsupported (heading, empty, instruction) | `requires_review` | **Leave out of groceries**, collapsed ("not an ingredient") |

There is no suggestion field in v1. The legacy `suggestion` stays readable on old drafts only (§5).

## 3. Exact quantities against decimal storage

Storage facts: `LineDecision.quantity` must match `^\d+(\.\d+)?$` (a member can't type "1/3" either);
`recipe_ingredients.quantity` is `numeric` per **one portion**; `perPortion` divides by servings and rounds
to 4 dp, flagging `rounded` (D89).

Measured with Table's own `perPortion` and the package's exact arithmetic over 4 680 cases (whole 0–4 +
fractions with denominators 3, 6, 7, 9, 12, 16, 32; servings 1–12) — `evidence/2026-10-09-recipe-extraction-lab/adapter-rounding-analysis.txt`:

| Bridge | What it does | Result |
|---|---|---|
| A — round the whole-recipe amount to 4 dp, then `perPortion` (what accepting today's suggestion does: `0.3333`) | double rounding | differs from B in **181 / 4 680** per-portion values |
| B — divide the exact rational by servings, round once to 4 dp | single rounding | worst relative error of the cooked total in the grid **1.44 %** (1/32 over 11 servings); tiny amounts are worse (1/16 tsp over 100 servings → 0.0006/portion, 4 %) |

The pesto line (1/3 cup, 4 servings) gives 0.0833 cup per portion either way; four portions demand
0.3332 cup (−0.0001 cup ≈ 0.02 ml).

**Proposal for Phase 3:** keep the exact rational in the draft (`parsed.v1.quantity` and an optional
`decision.exact { numerator, denominator }`, JSONB, backward compatible); Confirm divides exactly and rounds
**once** (bridge B), keeping the existing `rounded` disclosure and the "too small to split" refusal; the review
shows "1/3 cup" rather than "0.3333". Whether per-portion storage should move from 4 to 6 decimal places
(numeric supports it; would amend D89 and its tests) is a separate engineering decision to take with the
measurements above. An exact alternative exists for cup/tbsp thirds (1/3 cup = 16 tsp exactly) but is not
proposed for display.

## 4. Ordinary salt and black pepper

The extractor keeps faithful names (`salt and pepper`, `kosher salt`, `red bell pepper`). Proposed seam: the
adapter's **initial decision** (`Leave out of groceries`, reason "household seasoning") — no schema change, no
grocery-projection change, existing recipe versions untouched, the line stays in the draft and in the recipe's
"Not counted in groceries" summary.

- Excluded (exact normalized names, after removing size/prep notes): `salt`, `table salt`, `kosher salt`,
  `sea salt`, `fine salt`, `coarse salt`, `iodized salt`; `black pepper`, `ground black pepper`,
  `freshly ground black pepper`, `cracked black pepper`; `salt and pepper`, `salt & pepper`,
  `salt and black pepper`, `salt and freshly ground black pepper`.
- **(owner)** bare `pepper` with a spoon/pinch/to-taste amount (usually black pepper in US recipes) — proposed:
  excluded only together with salt (`salt and pepper`), otherwise kept (conservative: never hide a food).
- Never excluded: bell/jalapeño/chili/cayenne/white pepper, red pepper flakes, peppercorns, lemon pepper
  seasoning, pepper sauce, pepper jack, salted butter, garlic/celery/seasoned salt, salt pork, anything with an
  `each` count.
- Consequence to disclose: an excluded line is not a recipe ingredient, so Table's nutrition estimate omits its
  sodium. **(owner)** If salt should stay on the recipe card but not in groceries, the seam is the grocery
  projection instead (a household "never shop" rule) — larger: it touches projection fingerprints and needs a
  setting, so it is not proposed by default.
- The benchmark corpus already tags lines with `seasoningClass` for these tests.

## 5. Old drafts, versions and concurrency

- `recipe_import_drafts.lines` is JSONB; new fields (`parsed.v1`, `decision.exact`) are optional. Drafts made
  by `table-import-2` keep `suggestion` and must render and confirm exactly as today until confirmed or
  discarded. No rewrite, no migration. New drafts record `extractor_version = 'table-import-3'` (only after G3).
- Revision binding (`stale_draft`), Confirm's completeness rules, immutable `recipe_versions` /
  `recipe_ingredients`, the "From: <raw>" note and existing imported recipes are unchanged.
- Tests needed: a mixed open-draft test (one table-import-2 and one table-import-3 draft in the same household,
  both reviewed by two members, stale updates refused), confirm of each, export/restore of both shapes.

## 6. Photo and content gates

Unchanged and authoritative: R1 (`TABLE_RECIPE_IMPORT_FETCH`), C1/C2 (`TABLE_RECIPE_CONTENT`,
`TABLE_RECIPE_CONTENT_GRANTS`), `TABLE_RECIPE_PHOTO_HOSTS`, Budget Bytes refusal, decided for the page actually
read. The package never fetches or stores images; its `imageCandidates` are what the page names. Phase 4's
recipe photography must keep using `/api/recipe-images/<id>` (kept, sniffed bytes) and must not hotlink a
candidate URL.

## 7. Compact review UI — dependency map (Phase 4, not started)

Today (`src/ui/ImportReview.tsx`): every line is a card with the source line, a Use / Leave-out radio pair, an
always-visible editor, per-line "Use suggestion" and a "Use all N suggestions" bar.

Target (owner preferences in the handoff): summary first ("12 ready · 2 need attention"); ready lines as one
readable row ("⅓ cup pesto — homemade or store-bought") already Used, one-tap exclude; seasonings and
unsupported lines in an unobtrusive "Not counted in groceries" group; only `needs_review` lines expand an
accessible editor showing the original line, the reason in words and the fields; fractions typed as
fractions; no suggestions.

```
┌ Pesto pasta ─────────────────────────────── from recipes.example.com · Open original ↗ ┐
│ [photo only if kept under permission, else tile]   Serves 4 · 30 min                   │
│ 12 ready · 1 needs attention                                                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ⅓ cup   pesto            homemade or store-bought                        [Leave out]  │
│ 8 oz    pasta                                                            [Leave out]  │
│ 2 cans  black beans      2 × 15 oz · drained                             [Leave out]  │
│ ▸ Needs attention: "1 cup milk or cream" — choose one ingredient                       │
│     ( ) milk   ( ) cream   Amount [1] Unit [cup]                [Save line]            │
│ Not counted in groceries (2): salt and pepper (household seasoning), For the sauce:   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                   [Discard]                [Create recipe]            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Depends on: the adapter's initial decisions (§2) and exact quantity bridge (§3). Must keep: revision conflict
banner and reload, focus restore in `ModalSheet`, attached field errors, 320 px / 200 % text, light/dark tokens,
Confirm refusal messages. Tests to supersede (with a ledger, not deletion): e2e `u2c-url-to-recipe`,
`ms-sources`, `journey-url-to-cart` (selectors `draft-suggestions`, `accept-suggestions`, `line-suggestion`,
`draft-line` radios), unit `recipe-import-ingredient-suggest`, integration `u2c-url-import` U-10,
`ruc01-source-policy`, and mutation `U2C_suggestion_applied_unreviewed` (re-targeted to "a needs_review line
is never decided without a member").

## 8. Phase 3 gate checklist (proposed)

Shadow-compare old vs new readings on all offline fixtures (no writes); adapter contract tests per row of §2;
salt/pepper list + lookalikes; bridge-B rounding tests including "too small to split"; mixed-draft concurrency;
the URL-to-cart journey e2e green with the switch on and off; mutations for dropped amount, oz↔fl oz, suppressed
ambiguity and seasoning over-exclusion; full `scripts/verify-all.sh` on an immutable commit; switch default off.

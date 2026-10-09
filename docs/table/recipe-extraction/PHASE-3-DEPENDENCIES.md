# Recipe Extraction Lab — Phase 3 dependencies after `main`'s import overhaul

_2026-10-09, coordinator, read-only. Supersedes the "replace Table's parser" premise of `ADAPTER-IMPACT.md` §1–§3 and
§7, which were written against `cb7b56e`. Nothing here is built; Phase 3 needs its own authorization._

## 1. What `main` (`8e6bd6e`, another session) already changed inside Table

| Area | `cb7b56e` (Phase 1 baseline) | `main` `8e6bd6e` | Effect on the plan |
|---|---|---|---|
| Line reader | `parseIngredientLine`, decimals only, thirds refused, suggestions | new `ingredient-line.ts`: exact rational text (`"1/3"`, `"1 1/2"`), nested parentheses, `1-1/2`, ranges and alternatives kept as stated, status `parsed` / `requires_review` / `omitted`; `EXTRACTOR_VERSION = "table-import-3"` | the pesto line is read correctly **inside Table on `main`**; the package is no longer the only route to that fix |
| Decisions | `quantity` decimal string | `quantity` exact amount text (fractions accepted, `parseAmount`) | ADAPTER-IMPACT §3's `decision.exact` proposal is unnecessary |
| Per serving | `perPortion`, 4 dp | `perServing`: exact when terminating, else **12 dp** (`exact: false`); kitchen-fraction display | the remaining decimal limitation is 12 dp per serving for non-terminating amounts (§3) |
| Seasonings | none | `seasonings.ts` `isHouseholdSeasoning(name)`: parse-time `omitted` + grocery projection exclusion; explicit requests still bought | decided by Table on the **name**; the extractor must not decide it (contract v1 already keeps `salt and pepper` as a name) |
| Review | per-line cards + suggestions | compact rows, Use by default, uncertain lines first, fraction input | Phase 4 (`B34`) is largely delivered |
| Policy in the reader | — | package sizes multiplied (`2 (14.5 oz) cans` → 29 oz), quarts/pints/gallons → cups, count words into the name (`garlic (clove)`, unit `each`) | these are **adapter/household choices** under contract v1; the package reports the facts unmultiplied |

## 2. Remaining Phase 3 questions (to decide before any adapter code)

**Engine readiness first.** Phase 2's candidate `semantic-v1` did **not** meet Gate G2 on the fresh holdout-v2
(`BENCHMARK-v2.md` §2: C1 93.7 %, 5 high-severity false certainties, S3/S4/S5/S6 non-zero), and the reviewer's
known defects K1–K4 are open. Option (b) below should not start until a repaired engine meets G2 on a **new** fresh
holdout (holdout-v2 is now exposed). Option (a), a shadow comparison only, does not need G2 but must not tune the
engine on Table's test inputs that are holdout-v2 sources.

1. **Replace or feed.** Either (a) Table keeps its own reader and the package is a test oracle / second opinion,
   or (b) `ingredient-line.ts` delegates reading to the package and keeps only Table policy (multiply packages,
   quarts → cups, count words into names, seasonings, review defaults). (b) gives one reader of facts; it needs a
   shadow comparison of both readers on Table's own test inputs and the benchmark before switching.
2. **Mapping v1 → `ParsedLine`** (exact, no rounding): `quantity` exact rational → amount text; count units
   (`clove`, `can`) → `each` + name convention or a Table count-unit decision; `packageSize` → multiply (Table's
   current choice, disclosed in the note) or keep packages; `quart` → cups ×4 (exact); `equivalents` → note or
   ignored; `RangeQuantity` → `range`; `alternatives` → `alternatives`; `amountUnstated`/`optional` → note + decision
   default; `unsupported` → leave out; seasonings via `isHouseholdSeasoning` on the v1 name.
3. **Drafts and versions.** `main` already has two draft shapes (pre-overhaul and `table-import-3`); a package-backed
   reader would be a third `extractor_version`. Old drafts stay readable and are never rewritten; mixed-shape and
   two-member concurrency tests are required (stale revisions still refused).
4. **Tests.** `main`'s parser tests (unit sweep, IO-01..05, e2e IO-E1) become the compatibility suite for option (b);
   intended differences need a before/after ledger, not silent rewrites. Some of those inputs are holdout-v2 sources
   (EVALUATION-PLAN-v2 §9), so the shadow comparison must not be used to tune the package engine.
5. **Gates unchanged.** R1 page reading, C1/C2 content, PH1 hotlinking, S1 seasoning list, Budget Bytes refusal,
   SSRF/read policy: none of them moves into the package.

## 3. Decimal conversion — the integration limitation that remains

The package keeps quantities as exact rationals (contract v1). Table stores recipe ingredients **per serving** in a
`numeric` column: exact when the per-serving value terminates, otherwise rounded to 12 decimal places
(`perServing`, D112 on `main`). An adapter must hand Table the exact whole-recipe amount (as amount text) and let
`perServing` divide once; it must never pre-round (Phase 1 measured that round-then-divide changes 181/4 680
per-portion values at 4 dp). The residual error of 12-dp storage is below 5×10⁻¹³ of the unit per serving.

## 4. Reconciliation with `main` `bca110e` (import-overhaul corrections) — 2026-10-09

_Added by the Table app session when it merged `main` into this branch. Nothing above was rewritten, no lab
engine, contract, corpus, benchmark or plan changed, and the app corrections do not complete or replace the
extraction engine: Phase 3 still needs its own authorization._

`main` `bca110e` corrected three problems in Table's own import (RIO-01..03, reconstructed by that session
because the owner's correction package did not reach it):

| Area | `8e6bd6e` (§1) | `bca110e` | Effect on §2–§3 |
|---|---|---|---|
| Per serving | non-terminating amounts rounded **half-up** to 12 dp | rounded **toward zero** to 12 dp, so plates never add up to more than the recipe (an extra package was bought) | §3's residual-error statement holds, now one-sided: below 10⁻¹² of the unit per serving, never upward; an adapter must still hand over the exact whole-recipe amount |
| Seasonings | `isHouseholdSeasoning(name)` | `isHouseholdSeasoning(name, unit)`: a bare "pepper" is table pepper only when measured like a seasoning (spoon/volume or no amount); counted or weighed it is an ingredient | §1's "decided on the name" now reads "decided on the name and the amount's unit"; the §2.2 mapping must pass the unit |
| Review | compact rows | an unapplied change in an open row holds saving | none for the package |

**Provenance.** `src/legacy/PROVENANCE.json` `liveTableObserved` now records `bca110e`'s `ingredient-line.ts`
(`4eba6151…`) as the accepted later version, with `8e6bd6e`'s hash kept in its note. The frozen copies, their
hashes, the baseline commit `cb7b56e` and `tests/parity/baseline-snapshot.json` are unchanged; the lab suite passes
(920 passed, 1 expected fail, 11 skipped) with `main` merged.

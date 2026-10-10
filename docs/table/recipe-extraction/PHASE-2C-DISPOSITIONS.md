# Recipe Extraction Lab — Phase 2C outcome and finding-by-finding dispositions

_2026-10-10, coordinator. The candidate is `semantic-v3`, registered and not the default. Plan: `PHASE-2C-PLAN.md`._

## 0. Result: stopped before evaluation (predeclared gate not met)

**No holdout-v4 exists and no candidate was frozen for evaluation.** PHASE-2C-PLAN §4.6 (c), fixed before any review,
allows a fresh holdout only if R1's round-2 review finds both:
- no firm HIGH line among its clean-food controls;
- no structural family with ≥ 2 firm HIGH lines.

R1's round 2 (`semantic-v3` at `3372dfb`, 582 firm fresh probes) found **0/335 firm HIGH among the clean-food
controls**. It also found **three systemic families** (16 firm HIGH lines in all):

| Family | Firm HIGH (Wilson 95 %) | Lines |
|---|---|---|
| a weight or volume size before an undeclared container (§13.2 precedence over §12.3) | 6 of 13 (46 % [23–71]) | `1 kg tote apples`, `2 lb basket peaches`, `1 L flagon cider`, `250 ml vial vanilla extract`, `20 oz growler kombucha`, `1 lb hamper mixed nuts` |
| a food or modifier noun used as a measure (§13.2) | 7 of 14 such lines (other new nouns 0/28) | `1 cloud meringue`, `1 Cloud Meringue`, `1 tidbit smoked trout`, `1 Tidbit Smoked Trout`, `3 tidbits smoked trout` (ready with an invented count); `1 glaze honey`, `1 gourd sake` (review, pre-filled 1 each, S1) |
| an `and` list of two complete foods (§13.4) | 3 of 18 (17 % [6–39]) | `2 tbsp Worcestershire and hot sauce`, `1 tbsp garlic powder and onion powder`, `1 lb shrimp and bay scallops` |

The brief says: *"If they remain after the bounded review rounds, stop with a precise unresolved-finding report. Do not freeze a knowingly failing candidate just to obtain another red benchmark."*

**The optional round-2 repair was not carried out.** The gate is decided by the round-2 review. A repair after it
could not be reviewed (no third round is authorised), so it could not change the outcome; it would only add
unreviewed code. **No new acceptance set was generated.** Phase 2B's G2 FAIL, its engines, labels, reports and
evidence are unchanged.

**What generalised and what did not** (R1's code reading, rounds 1–2):

| | Rules |
|---|---|
| Structural and generalising | number agreement in the measure slot; rule 6 (a noun, then a describing word, then a food: the noun is a measure); rule 8 (an unknown lower-case noun before a recognised food); the declared-alias-only unit reading |
| Enumeration (the round-2 failures are unlisted neighbours) | portion nouns; food/modifier nouns accepted after a count; sized containers (beaker, tumbler and crate are listed; tote, vial, flagon, hamper, basket and growler are not); the "complete first conjunct" check in `and` lists |

## 1. Identities

| | |
|---|---|
| Base | lab `1d312a8`; `main` `1261cd8`. `main` moved during the phase and was merged: `8ae5497` (`9daae59`) |
| Pre-coding ledger, contract §13, alias table, 2C corpus | `c68d4f4`; R2-adjudicated `cc285b2` |
| `semantic-v3` build 1 (reviewed in round 1) | `b0dea38` |
| `semantic-v3` repair 1 (reviewed in round 2; last engine change) | `3372dfb` (`src/ingredient/semantic-v3` unchanged since) |
| R1 round-2 evidence and v3 mutation spec (last code change) | `b0c4b1c` |
| Tested commit | `44251ec` (`main` `8ae5497` merged) |
| Final | the docs commit after it (see the PR) |

## 2. Finding ledger — dispositions

Status values:
- **Closed**: every ledger line and its controls pass in the required harness, and no fresh failure of the family was found in R1's round 2.
- **Closed on exposed lines; open on fresh**: the reported lines pass, but R1's round 2 found new failures of the same family.
- **Open**: still failing.

| Id | Finding | Status | Evidence |
|---|---|---|---|
| FL-A1 | `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` | **Closed** | required harness (FL-A2 rows); mutation `P3-remark-another-off` KILLED |
| FL-A2 | remarks bringing in a separately measured food | **Closed** | 10 coordinator rows and 8 controls; R1 round 1 0/25 HIGH (and 16 controls), round 2 0/24 |
| FL-B1/B2 | coordinated foods (`peas and fava beans`) | **Closed on exposed lines; open on fresh** | round 1 found 2 HIGH (fixed); round 2 found 3 (`garlic powder and onion powder`, `Worcestershire and hot sauce`, `shrimp and bay scallops`) and 1 safe regression (`sweet chili and garlic sauce` sent to review) |
| FL-B3/B4 | choices with a shared head (lettuce, mushrooms) | **Closed** | required rows (R2-adjudicated readings); R1 round 1 0/14, round 2 0/7 |
| FL-C1 | unknown measure nouns in the measure slot | **Closed on exposed lines; open on fresh** | the round-4 words are fixed; round 1 found 5 HIGH (food/modifier nouns, fixed); round 2 found 7 (`cloud`, `tidbit`, `glaze`, `gourd`). Rule 6 and rule 8 generalise; the portion and food-noun lists do not |
| FL-C2/C5 | equipment read as food | **Closed** | R1 round 1 0/49 HIGH, round 2 0/56 (30 correct rejections; 26 safe abstentions counted separately) |
| FL-C3 | a tool word in the measure slot | **Closed** | `1 saucepan water`… (required); mutation `P3-measure-slot-off` KILLED |
| FL-C4 | `4 pots de crème` | **Closed** | required |
| FL-C6 | purpose words making food unsupported | **Closed** | 6 rows; R1 rounds 1–2 0 HIGH, no food made `unsupported` |
| FL-C7 | open structural paths (R1 round-4 §5) | **Partly closed** | **Closed:** unknown `-ed` words; tool words after a count; brand + dish-name heads; `salt pig`, `cow creamer`, `goose quill`. **Open** (confirmed by R1 round 2): an unknown capitalised word after a declared unit (`1 bag Zorble apples` ready); weight/volume lines with an unrecognised food (`1 cup zorbleberries`); count-of-one liquids (`1 lemon juice` ready; `1 olive oil` → review pre-filled 1 each); an ingredient-class noun as a measure (`1 cloud cotton candy`) |
| FL-C8 | valid-food review burden | **Reduced (exposed figures)** | ready-labelled firm 2C cases sent to review: `semantic-v2` 65/2 018 → `semantic-v3` 0/2 018. R1 clean controls: round 1 2/206 everyday, 0/123 less common; round 2 2/216 everyday. On fresh over-fire probes, 10 of 39 valid foods go to review (safe; e.g. `1 sugarloaf pumpkin`). Cost of §13: `tub`/`bar` lines, `1 round brie`, `1 cake compressed yeast` now go to review by contract |
| FL-C9 | safe abstentions, reported separately | **Reported** | 2C corpus at `3372dfb`: 3 883 exact, 199 safe abstentions. Frozen sets: 0 C8. R1 round 2 equipment: 26 safe abstentions vs 30 correct rejections |
| FL-D1 | `1 small tub crème fraîche` → ready container | **Closed** | `P3-engine-alias-tub` KILLED; both spellings required |
| FL-D2 | engine-only aliases | **Closed** | `src/unit-aliases.ts` is the one declared table; generated `UNIT-ALIASES-v1.md`; test `tests/contract/unit-aliases.test.ts`; `semantic-v3` has no private unit list |
| FL-D3 | no inferred package size | **Closed** | §13.8; required `noAmount` rows |
| FL-D (fresh) | a size before an undeclared container | **Open on fresh** | round 1 `carafe` (fixed); round 2: 6 HIGH (tote, basket, flagon, vial, growler, hamper) — systemic |
| FL-E1–E5 | holdout-v3 clear-line and detail failures (0089, 0222, 0333, 0197, 0248, 0092, 0145, 0229, 0252, 0277, 0189, 0314) | **Closed (exposed)** | the frozen-sets harness requires C1 **and** C1+ on every ready line: 817/817 C1+, 160 C5 (no C5b), 58 C7, 0 C8 |
| FL-P1 | publish the unit words | **Done** | §13.1, manifest, test; R2 reviewed it (`label-check/`) |
| FL-P2 | debatable shapes | **Done prospectively** | §13.6 (pre-registered before scoring; firm-only plus all-case figures; zero-tolerance counts over all cases) |
| FL-P3 | mutation accounting | **Done** | §3 below |
| FL-P4 | rerun wording | **Done** | the holdout-v3 rerun at the tested commit is reported as *numerically equivalent* to the preserved historical report, with the differing pins listed; it is not called byte-identical |

### R1 round-4 known risks (Phase 2B) — where they stand

| Round-4 group | Round 4 (`semantic-v2`) | Phase 2C (`semantic-v3`) |
|---|---|---|
| unknown measures (U-unknown4) | 22/75 HIGH | all 75 pass (required). Fresh analogues: round 1 5 HIGH (food/modifier nouns), round 2 7 HIGH — **open** |
| equipment | 9/119 HIGH | all pass. Fresh: round 1 0/49, round 2 0/56 — **closed** |
| overlap foods | 1/82 HIGH, 23/82 burden | all pass; burden 0 on the exposed set. Fresh over-fire probes: 10/39 to review, safe |
| valid foods counted/measured | 0 HIGH, 35/182 burden | all pass; burden 0/2 018 on exposed ready lines; fresh clean controls 0 HIGH (round 1 0/328, round 2 0/335) |
| `1 salt pig`, `1 saucepan water`, `4 pots de crème` | HIGH | closed |
| purpose words making food unsupported (code reading) | C4 path | closed |

## 3. Tests and mutations (at the tested commit; see `verify-final/`)

The tested commit is `44251ec`. The full record is in `evidence/2026-10-10-recipe-extraction-phase2c/verify-final/README.md`.
- Package: typecheck passes; 12 143 tests passed and 11 skipped (the same 11 skips).
- Required `semantic-v3` harnesses:
  - 2C corpus: 4 082 firm cases, 3 883 exact plus 199 safe abstentions;
  - frozen sets: 1 035 cases with 0 failures.
- **Real parser and scorer mutations: 41/41 KILLED.**
  - `parser-v3`: 6/6;
  - `parser` (v2): 24/24;
  - `scorer`: 11/11.
- **Harness self-test controls: 10/10 as designed** (1 KILLED, 2 KILLED-UNEXPECTED, 1 SURVIVED, 6 ERROR). They are not defects.
- Fuzz, 2 × 100 000 lines (worker and R1): 0 throws, 0 invalid outputs, 0 nondeterminism.
- The holdout-v3 rerun is numerically equivalent to the preserved historical report. Only the provenance pins differ.
- Root: typecheck passes; vitest 1 178/1 178; `next build` passes.
- App code is identical to `main` `8ae5497`, and the default engine is unchanged.

## 4. Limitations

- All workers and reviewers are the same model family.
- **Exposed figures.** All pass/burden figures on the 2C corpus and the frozen sets are exposed development material.
  The implementation worker disclosed that several vocabulary entries are words from R1's probes inside wider classes.
- **Fresh figures.** The only fresh evidence in this phase is R1's two development reviews. They are adversarial,
  family-weighted samples, not acceptance sets.
- **Contract cost.** §13 deliberately sends some valid lines to review (`tub`/`bar` lines, `1 round brie`,
  `1 cake compressed yeast`).
- **Engine status.** `semantic-v3` is not a G2 candidate. It was never frozen or evaluated.

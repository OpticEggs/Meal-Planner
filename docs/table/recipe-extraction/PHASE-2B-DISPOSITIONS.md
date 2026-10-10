# Recipe Extraction Lab — Phase 2B finding-by-finding dispositions

_2026-10-10, coordinator. The candidate is `semantic-v2`, frozen at `f379e06` with the engine reviewed at `fc37ce7`.
Exposed results come from the required regression harness (`tests/regressions/`, 1 114 firm cases) and the exposed
bench sets. Fresh results come from the single holdout-v3 run (`BENCHMARK-v3.md`). The line-by-line tables are in
`evidence/2026-10-10-recipe-extraction-phase2b/dispositions/`._

"Exact" means the reading matches the regression label. "Abstain" means a safe abstention (C8: `needs_review` with no
amount, unit, package or options on an `unsupported` label). It is reported separately and is not an acceptance error.

## 1. Scorer faults (final-head review of `0c0c60f`)

| Finding | What | Disposition | Evidence |
|---|---|---|---|
| SF-5 → SCORE-01 | Sensitivity (b) used a tag heuristic instead of the plan's label-based bare-line set (missed 6 holdout-v2 lines) | **Fixed** in outcomes v3: label quantity, unit and alternatives all null. Verified in three ways: hand oracles; R1's independent oracle check, which does not import the scorer; mutation `SCORE-01-revert-tag-heuristic` KILLED | `evidence/…/scorer/`, `scorer/oracle-check-r1/` |
| SF-6 → SCORE-02 | A CE line (engine error / invalid / nondeterministic) still received S codes; validity checked on the first parse only | **Fixed**: two parses, full validator on both, CE lines get no class and no S code and count as not accurate for A2. Five mutations KILLED, among them `SCORE-02-revert-s-codes-on-ce` | same |
| SF-1 | `x` multiplier without a package (`1x cup milk` → ready `each`, "x cup milk") | **Fixed** (engine): 4/4 exact (legacy 0/4, `semantic-v1` 0/4); controls 2/2. Fresh: §12.2 lines 5/5 C1, 2/2 C7 | regression corpus FH-SF1 |
| SF-2 | Nutrition facts and ratings read as ingredients (wider than K3) | **Fixed**: 8/8 exact (`semantic-v1` 0/8); 9/9 controls. Fresh: no S8 on holdout-v3 (non-ingredient lines: 22 C7, 3 safe abstentions) | FH-SF2 |
| SF-3 | Count noun after the food kept in the name (`4 lemon wedges`) | **Fixed** per §12.4: 4/4 exact (`semantic-v1` 0/4); 7/7 controls and identity cases. Fresh: §12.4 31/32 C1; the miss is 0297 `1 strip steak`, which the contract calls debatable | FH-SF3 |
| SF-4 | Three-way comma choices: silent choice, dropped first option | **Fixed**: 7/7 exact (`semantic-v1` 0/7). Fresh: §12.7 20/21 needs_review correct. 0120 has an invented option (`romaine leaf`; review only, C5b). **New:** 0140 `peas and fava beans` read ready (S4) | FH-SF4 |

## 2. Known defects K1–K4 (Phase 2 reviewer round 3)

| Finding | Disposition | Exposed | Fresh holdout-v3 |
|---|---|---|---|
| K1 `a half-cup milk` (wrong amount and unit, ready) | **Fixed** per §12.1 | 5/5 exact (`semantic-v1` 0/5) | §12.1 11/11 C1 |
| K2 `400g (14oz) can chopped tomatoes` (package folded into a weight) | **Fixed** per §12.3 and §12.A A6 | 11/11 + 3/3 controls (`semantic-v1` 0/11) | §12.3 19/21 C1, 1 C3, and 0297 (debatable, S7) |
| K3 `Protein: 20 grams` (nutrition read as ready) | **Fixed** per §12.8 | 7/7 + 4/4 controls (`semantic-v1` 0/7) | no S8; family D 22/25 C7, 3 C8 |
| K4 `Five spice powder` (count invented) | **Fixed** per §12.9 | 6/6 (`semantic-v1` 0/6) | §12.9 6/7 C1; 0222 `1 bag shredded four cheese Mexican blend` was sent to review (C3b, vocabulary) |

## 3. Holdout-v2 failures (`BENCHMARK-v2.md` §4; exposed since Phase 2)

All 26 firm regression cases taken from them are now exact on `semantic-v2`: legacy got 1 exact and 3 abstentions,
`semantic-v1` 0 exact and 3 abstentions. Holdout-v2 as a whole is 271/271 C1 with 0 S codes. It is exposed, so this
shows the reported failures are repaired, **not** that the engine generalises. The shapes covered:
- count nouns after the food (0054, 0065, 0072);
- remark amounts (0165, 0338);
- size after a weight (0164);
- the three-way comma choice (0219);
- yogurt cups (0087);
- the C3 lines (0040, 0041, 0061, 0129, 0130, 0140, 0151, 0212, 0213, 0232, 0239, 0253);
- invented options (0218, 0220, 0277);
- headings (0286, 0288, 0297).

## 4. Candidate review findings (R1, rounds 1–4)

| Source | Firm cases | `semantic-v2` | Notes |
|---|---|---|---|
| Round 1 probes (`candidate-review-r1`) | 152 | 152 exact | 50 high readings fixed |
| Round 2 (`-round2`) | 90 | 59 exact + 31 abstain | the recognised-food backstop turns equipment and unknown-measure lines into safe abstentions |
| Round 3 (`-round3`) | 63 | 56 exact + 7 abstain | |
| Coordinator rule cases (R1-MEDIUM, R1R2-REPORTED, R3-S1/S2/S3 and controls) | 47 | 47 exact | |
| Final-head probes (Phase 2) | 660 | 660 exact | |
| **Round 4 (final pre-freeze review)** | — | **recorded as known risk, not fixed** (stopping rule, PHASE-2B-PLAN §6.4) | On fresh adversarial probes: unknown measure words 22/75 high (20.2–40.4 %), equipment 9/119, overlap foods 1/82, valid foods 0/240. Review burden: 11.6 % on R1's less-common set, 1/974 on its everyday set. R1 estimated that A3/A4 were at risk. Holdout-v3 confirmed it (0075 `tub`) |

**Owner requirements for the recognised-food change** (binding, 2026-10-10):
1. **Unknown food → `needs_review`, source line kept.** Never `unsupported`. Holdout-v3: 0089, 0222 and 0333 kept their text, with no amount invented.
2. **A known food after an unresolved measure word → not `ready`, no invented count.** Pinned by the regression corpus and `recognised-food.test.ts`, and killed by the `measureGerund` and unknown-measure mutations. On holdout-v3, 0193 `3 rashers` → needs_review with no quantity (C5). **0075 `1 small tub crème fraîche` breaks this requirement as the contract reads it:** `tub` is not a registry unit, so it is unresolved, yet the engine read it as `container` through an internal synonym and marked the line ready (§5).
3. **Overlap foods and review burden.** Measured separately:
   - held-out plain lines 0.81 %;
   - overlap foods 1.40 %;
   - fresh holdout-v3 1.0 % (3/292) from the vocabulary, 1.7 % in all;
   - 0 valid food lines unsupported.
4. **Safe abstentions reported separately.** In the harness: 38 abstentions vs 1 076 exact. On holdout-v3: 3 C8 vs 22 C7. No threshold changed, no food relabelled.
5. **Verified, reviewed and frozen in order.** The complete corpus and the mutations were run on the final candidate (45/45 as expected), then R1's fresh review, then the freeze of engine, vocabulary, contract and scorer. Holdout-v3 was written after that.

## 5. New findings from the holdout-v3 run (not fixed: Phase 2B stops at the G2 result)

| Case | Shape | Severity | Why it matters for a future engine |
|---|---|---|---|
| 0075 `1 small tub crème fraîche` | non-registry container word read as `container` | C2 high, S4 | The engine has an internal synonym that the contract does not grant. Either the contract publishes synonyms (R2's structural recommendation) or the engine must abstain |
| 0113 `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` | §12.11 remark amount of another food (water) | C2 high, S4 | Firm under the contract. R2 suggested exempting preparation water, which would need a contract change |
| 0140 `1 cup fresh peas and fava beans` | §12.A A4 `and` list kept as one name | C2 high, S4 | A family-B repair target that generalised only partly |
| 0297 `1 strip steak, about 14 oz` | §12.A A1 debatable shape | C2 high, S7 | The contract calls both readings defensible. It is counted as labelled and is left out under sensitivity (a) |
| 0089, 0222, 0333 | valid foods outside the vocabulary | C3 | the review cost of the recognised-food rule |
| 0197, 0248 | bracketed size before a plural cut; `Garnish (optional):` | C3a | |
| 0120 | invented option `romaine leaf` | C5b | |
| 0156, 0221, 0311 | `each` and `and` lists with the amount kept and no name | C5x | |

## 6. Process findings after the run

| Finding | Disposition |
|---|---|
| Package tests red at `f6cc0c6`/`fdbcfd1`: 11 `holdout3.test.ts` tests copied the real `EXPOSURE-AUDIT-v3.json` into synthetic fixture copies (found by the coordinator and, independently, by R1) | **Fixed** `7312648`, test setup only; the scorer is unchanged. The scoring run's bench invariants were green with the real files |
| `main` moved to `1261cd8`, and Table's live `ingredient-line.ts` and `units.ts` changed (the provenance guard failed after the merge) | Merged (`d916c14`). The record was updated in `a535dc9`; frozen copies and the snapshot are unchanged. The `legacy` and package digests change; `semantic-v2`'s does not |
| The report's one-decimal display shows A1 as "98.0 %" next to "not met" | Presentation only. 286/292 = 97.95 %, and the test is in exact integers. Recorded in `BENCHMARK-v3.md` §0 |
| The run log shows the older label-severity count ("false-certain H1/M3") beside the outcome classes ("C2 H4/M0") | Presentation only; A3 uses the C2 classes (R1) |
| R1's note on 0297: "not used as firm labels" in the contract vs counted in the acceptance table | Plan §6–§7 count every case and report (a) separately; the adjudication followed the plan. 0297 decides A1 (98.3 % without it) but not G2 |

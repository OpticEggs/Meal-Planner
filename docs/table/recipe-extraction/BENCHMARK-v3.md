# Recipe Extraction Lab — Benchmark v3 (Phase 2B): `semantic-v2` on holdout-v3

_2026-10-10. Package only (`packages/recipe-extraction`). The Table app does not import the package. The default engine stays
`legacy-table-import-2`. No Phase 3 adapter exists. Plan: `EVALUATION-PLAN-v3.md` (SHA-256 `34c68ed9…`), predeclared
and frozen before holdout-v3 existed._

## 0. Verdict

**Gate G2: FAIL.** `semantic-v2`, the frozen Phase 2B candidate, does not meet G2 on its single scoring run on the fresh
holdout-v3:

| # | Criterion (unchanged from v2) | Result on holdout-v3 (369 lines: 292 ready, 52 needs_review, 25 unsupported) | Status |
|---|---|---|---|
| A1 | C1 on ready labels ≥ 98 % | **286/292 = 97.95 %** (Wilson 95 % 95.6–99.1 %) | **not met** (point estimate below 98 %: 28 600 < 28 616). The report's one-decimal display "98.0 %" is the 4-place rate 0.9795 rounded; the criterion is tested in exact integers |
| A2 | name, quantity, unit field accuracy on R each ≥ 98 % | name 289/292 (99.0 %), quantity 289/292 (99.0 %), unit 288/292 (98.6 %) | met (point estimate) |
| A3 | high-severity false certainty = 0 | **4** (ing-h3-0075, 0113, 0140, 0297) | **not met** |
| A4 | S1 = S3 = S4 = S5 = S6 = 0 | **S4 = 3** (0075, 0113, 0140); S1 = S3 = S5 = S6 = 0 | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | 5/292 = 1.7 % | met |
| A6 | CE = 0, every output valid and deterministic; legacy engines, frozen snapshot and parity unchanged; reports byte-deterministic | CE 0/369 (0 errors, 0 invalid, 0 nondeterministic); frozen legacy copies, `baseline-snapshot.json` and applicable parity pass; reruns byte-identical (§7) | met |
| A7 | pesto regression passes as a normal test | `tests/characterization/pesto.test.ts` passes (package suite) | met |

**Confidence-bound status** (reported separately, never the acceptance basis):
- A1 is not met with confidence: the Wilson lower bound is 95.6 % < 98 %.
- A2 is met on the point estimate only: the lower bounds are name 97.0 %, quantity 97.0 % and unit 96.5 %, all below 98 %.

**The FAIL does not depend on any disputed label.** Removing every case that was disputed or pre-registered as
debatable (0075, 0104, 0211, 0297, 0311) still leaves two firm failures:
- 0113 (§12.11) and 0140 (§12.A A4) are high-severity false certainties, so A3 is still not met;
- the same two lines are S4, so A4 is still not met.

Under the "§7 only" sensitivity (c), 0113 alone still fails A3 and A4.

As the brief requires, the work **stops here**. No repair follows on this run, no new holdout is written, nothing is
integrated, and the default is not switched. Holdout-v3 is now exposed for any future engine.

## 1. Identities

| What | Identity |
|---|---|
| PR base at the start of Phase 2B | `main` `8c9fd8ca82f0a4c8787d9089c0954be6e650e1a2`; Phase 2 delivered head `8131fe0` |
| Candidate freeze | commit `f379e06cee9ec89d321a897a5c492811856fba5f`, engine equal to the reviewed `fc37ce70733d0a1cf219ea97fb9e361d1b60dc86`; `src/ingredient/semantic-v2` git tree `dd0c1d49…`, source digest `8fef38e0f1a6e5c23c8d1554094c31113ea1af3fe9e1a086add91d2eb4f7317c`; freeze record `f847f3a` |
| Scorer | outcomes v3, `bench/outcomes.ts` SHA-256 `7821e8532eb123e9694291c6d0deac6bdac40f96715d06a4d2aa2161fc3a3892` (outcomes v2 archived; reproduces the historical report byte for byte, `afc55fd5…`) |
| Plan / contract | `EVALUATION-PLAN-v3.md` `34c68ed9b2aa7a5db9e78b37191d99a58fe710dc07ed83aceceffd4003a492c1`; `CONTRACT-v1.md` `d2fe6294590fddb37f63fbab7500f784c944fe087918790ec59616731b45bbf8` |
| Holdout-v3 freeze | commit `4aa0ad2`; `fixtures/ingredients/holdout-v3.jsonl` `fd4a989fe48d89f59f7fa38a5434581f7ae4e0996c8230cdea1ed26e60bc0591`; `FREEZE-v3.json` `f9f02e08501eab5bdf3608971fc485674632d146e3ee45703e1439619d436f0c` |
| Exposure audit | commit `f6cc0c6`, `fixtures/EXPOSURE-AUDIT-v3.json` |
| Single scoring run | at `f6cc0c6`, clean tree; committed `fdbcfd1`; `evidence/2026-10-10-recipe-extraction-phase2b/evaluation-holdout-v3/benchmark-report-holdout3.json` `7eb25ebfb9619f02a4f9922df2d8d30323b54b3427b156bf8c6f6b88528bc828`. Its pins equal the freeze record (plan, scorer, package digest `7897871a…`, semantic-v2 digest) |
| Tested commit | `90292c1` (after merging `main` `1261cd8`, see §8) |

## 2. Fresh holdout-v3 — all engines (one run; only `semantic-v2` is judged)

| Engine | C1 core (of 292 R) | C1+ all fields | C2 high / medium (of 369) | C3+C4 (of R) | C5 (of 52 A) | C7 (of 25 U) | C8 | CE | S codes | G2 A1–A5 |
|---|---|---|---|---|---|---|---|---|---|---|
| `legacy-table-import-2` | 113/292 (38.7 %, 33.3–44.4 %) | 113/292 (38.7 %, 33.3–44.4 %) | 31 / 11 | 147/292 | 43/52 | 1/25 | 23 | 0 | S1:1 S2:6 S3:10 S4:9 S6:3 S8:1 | A1 not met, A2 not met, A3 not met, A4 not met, A5 not met |
| `legacy-table-import-2+suggestion` | 113/292 (38.7 %, 33.3–44.4 %) | 113/292 (38.7 %, 33.3–44.4 %) | 31 / 11 | 147/292 | 43/52 | 1/25 | 23 | 0 | S1:1 S2:6 S3:20 S4:9 S5:11 S6:10 S8:1 | A1 not met, A2 not met, A3 not met, A4 not met, A5 not met |
| `semantic-v1` | 240/292 (82.2 %, 77.4–86.2 %) | 231/292 (79.1 %, 74.1–83.4 %) | 29 / 6 | 29/292 | 42/52 | 8/25 | 15 | 0 | S1:5 S2:3 S3:6 S4:10 S5:2 S6:2 S7:5 S8:2 | A1 not met, A2 not met, A3 not met, A4 not met, A5 met |
| `semantic-v2` | 286/292 (97.9 %, 95.6–99.1 %) | 281/292 (96.2 %, 93.4–97.9 %) | 4 / 0 | 5/292 | 49/52 | 22/25 | 3 | 0 | S4:3 S7:1 | A1 not met, A2 met, A3 not met, A4 not met, A5 met |

All four engines ran on the same frozen file in the same run. Wilson 95 % intervals use z = 1.959964. C1 counts core fields, with accepted values allowed. C1+ counts every field. Under strict matching, `semantic-v2` scores C1 284/292 and C2 6/369: 0077 and 0161 change class, because their names match only an accepted value.

## 3. Every severe counterexample (`semantic-v2`, holdout-v3)

| Case | Input | Label (frozen) | `semantic-v2` | Codes | Assessment |
|---|---|---|---|---|---|
| ing-h3-0075 | `1 small tub crème fraîche` | needs_review, 1, no unit, `crème fraîche`, note `small` (§12.14: `tub` is not a `UNIT_REGISTRY` unit) | ready, 1 `container`, `crème fraîche` | C2 high, S4 | The engine treats `tub` as a container synonym. The registry has no such synonym. This label was disputed: label checker R2 proposed `container`, and the coordinator kept it before scoring, arguing from §12.14 (`ADJUDICATION-v3.md`). It was not pre-registered as debatable |
| ing-h3-0113 | `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` | needs_review (§12.11: a remark amount that measures another food is a second amount) | ready, 1 `tbsp`, note `dissolved in 3 tbsp hot water` | C2 high, S4 | A firm label under the contract. R2 called it a cooking-sense cost: preparation water is "another food" |
| ing-h3-0140 | `1 cup fresh peas and fava beans` | needs_review, 1 `cup`, no name (§12.A A4: two foods joined by `and` after one amount) | ready, `fresh peas and fava beans` | C2 high, S4 | Firm. This is a family-B shape the repair targeted, and the candidate kept it as one name |
| ing-h3-0297 | `1 strip steak, about 14 oz` | ready, 1 `each`, `strip steak`, equivalent 14 `oz` — **pre-registered debatable** (the contract's A1 names `1 strip steak` as debatable) | ready, 1 `strip`, `steak` | C2 high, S7 | One of the two readings the contract calls defensible. It counts as labelled in the acceptance table; sensitivity (a) leaves it out |

## 4. Every other line that was not C1 / C5 / C7

| Case | Input | `semantic-v2` | Class |
|---|---|---|---|
| 0089 | `1 bunch silverbeet, stalks removed` | needs_review, no amount, name `bunch silverbeet` (food outside the recognised vocabulary) | C3b |
| 0222 | `1 bag shredded four cheese Mexican blend` | needs_review, no amount, name `bag shredded four cheese Mexican blend` (vocabulary) | C3b |
| 0333 | `1 lamb backstrap (about 500 g), trimmed` | needs_review, no amount, `lamb backstrap`, note `500 g; trimmed` (vocabulary) | C3a |
| 0197 | `2 (1 1/2-inch-thick) bone-in rib-eyes` | needs_review, 2 `each` (`quantity_unassigned`) | C3a |
| 0248 | `Garnish (optional): microgreens` | needs_review, `microgreens`, note `Garnish optional` | C3a |
| 0120 | `1 head lettuce, romaine or green leaf` | needs_review, options `romaine leaf` / `green leaf` (label: `romaine lettuce` / `green leaf lettuce`) | C5b, invented option |
| 0156, 0221, 0311 | `1 tsp each cumin, coriander and turmeric`; `1/2 cup sun-dried tomatoes and kalamata olives, chopped`; `2 cups black beans and rice` | needs_review, amount kept, no name (foods in the note) | C5x |
| 0189, 0211, 0314 | `Equipment`; `Topping (optional)` (debatable); `Resting time: overnight` | needs_review with no amount: a **safe abstention** | C8 |
| 0092, 0145, 0229, 0252, 0277 | detail-only (note/equivalent/optional) mismatches on otherwise correct ready lines | — | C1 with low detail mismatch |

**Correct interpretations and rejections vs safe abstentions (owner requirement 4):**

| Label | Correct interpretation or rejection | Safe abstention (C8) |
|---|---|---|
| unsupported | 22 of 25 rejected (C7) | 3 of 25 abstained (C8): needs_review with no amount, unit, package or options |
| needs_review | 49 of 52 reviewed correctly (C5) | — |

C8 carries no S code and is not an acceptance error; it is reported, never folded into C7.

**Review burden on valid ingredients (owner requirement 3):**
- The recognised-food rule sent 3 of 292 clear food lines (1.0 %) to review: 0089 silverbeet, 0222 four cheese Mexican blend, 0333 lamb backstrap. In each case the food word is not in the vocabulary. The source line was kept, and the engine invented no count.
- All C3 + C4 causes together: 5/292 (1.7 %).
- No valid food line was rejected (C4 = 0).

## 5. Breakdowns (`semantic-v2`, holdout-v3)

**By repair family:**

| Family | N | R/A/U | C1 (of R) | C2 high | C3+C4 | C5 | C7 | C8 | Severe |
|---|---|---|---|---|---|---|---|---|---|
| A quantity syntax | 75 | 52/23/0 | 51/52 | 1 | 1 | 22/23 | — | 0 | S4×1 |
| B choices and remarks | 51 | 27/24/0 | 27/27 | 2 | 0 | 22/24 | — | 0 | S4×2 |
| C count, package, qualifiers | 56 | 55/1/0 | 52/55 | 1 | 2 | 1/1 | — | 0 | S7×1 |
| D non-ingredients | 34 | 6/3/25 | 5/6 | 0 | 1 | 3/3 | 22/25 | 3 | 0 |
| plain | 153 | 152/1/0 | 151/152 | 0 | 1 | 1/1 | — | 0 | 0 |

**By CONTRACT §12 item:** all perfect except:
- §12.3: 19/21;
- §12.4: 31/32, S7;
- §12.7: 20/21 C5, S4;
- §12.8: 5/6 C1, 21/24 C7, 3 C8;
- §12.9: 6/7;
- §12.11: S4;
- §12.14: S4.

The full table is in the report. §12.15 has no tag in the frozen vocabulary; the supplementary row is in §6.

## 6. Sensitivity (informational; the acceptance decision uses every case)

| Figure | Lines kept | A1 | A2 | A3 | A4 | A5 |
|---|---|---|---|---|---|---|
| (a) without the 4 pre-registered debatable cases (0104, 0211, 0297, 0311) | 365 | 285/290 = 98.3 % met | met | 3, not met | S4 3, not met | met |
| (b) needs_review figures without the 4 bare no-amount lines (SCORE-01) | 48 A | — | — | — | S4 3/48 | C5 45/48 |
| (c) without the 126 `reliesOnNewReading` cases ("§7 only") | 243 | 209/211 = 99.1 % met | met | 1, not met | S4 1, not met | met |
| (d) without the 3 exposure-audit matches (0114, 0189, 0276) | 366 | 286/292 not met | met | 4, not met | S4 3, not met | met |
| (c′) supplementary, pre-registered before scoring: (c) plus 0017, 0290, 0102, 0129, 0277, 0285, 0345 (computed by R1) | 236 | 204/206 = 99.0 % met | met | 1 (0113), not met | S4 1, not met | met |
| §12.15 supplementary row (0026, 0063, 0082, 0087, 0102, 0129, 0277, 0285, 0327, 0345) | 10 | ready 6/6 C1 (0277 with a note detail mismatch) | — | 0 | 0 | needs_review 4/4 C5a |

## 7. Independent recomputation (reviewer R1)

Reviewer R1 recomputed the run with its own classifier: its round-0 oracle checker, written from the plan text. It
imports only `src/index.ts`, `src/contract.ts` (`UNIT_REGISTRY`) and `src/validate.ts`, and nothing under `bench/`.

- **Blind first.** R1 ran `semantic-v2` itself at `f6cc0c6`, after verifying the holdout hash and the
  `semantic-v2` git tree `dd0c1d49…`. It hashed its results (`SHA256SUMS-step1.txt`, 07:28:40Z) before opening the
  report. One slip: it saw the scoring commit's subject line ("G2 not met — A1, A3, A4"), but no figure or case id.
- **Agreement.** 0 per-case differences across 4 engines × 369 cases × 32 class keys. Every aggregate, every
  sensitivity and every G2 status is identical. R1 also computed (c′) and the §12.15 row.
- **Rerun.** At `fdbcfd1` the rerun is byte-identical to the committed report (`7eb25ebf…`). At the tested commit
  `90292c1` the rerun differs only in the two provenance pins that `a535dc9` changes (`engineSourceDigests.legacy`,
  `packageSourceDigest`); every figure is identical.
- **Counterexamples.**
  - R1's classifier finds no severe line beyond the four in §3.
  - 0075, 0113 and 0140 follow the frozen contract.
  - The pre-scoring adjudication was argued from the contract text alone.
  - On 0297, R1 notes a real tension: the contract says "not used as firm labels", yet plan §6–§7 count the case
    in the acceptance table and leave it out only under sensitivity (a). That case decides A1 (98.3 % without
    it), but not G2.
- **R1's verdict:** **G2 FAIL**. A1, A3 and A4 are not met; A2 is met only on its point estimate; A5, A6 (scorer
  part) and A7 (pesto 7/7) are met.

Files: `evidence/2026-10-10-recipe-extraction-phase2b/recompute-r1/` (`RECOMPUTE.md`, `COMPARE.md`,
`recompute-results.json`, `rerun.json`, SHA-256 lists).

## 8. Exposed and development results (never "fresh")

These sets are development material for `semantic-v2`: dev, holdout-v1, holdout-v2, the 1 114-case regression corpus and
every review probe. Its results on them are perfect, and they are **not evidence of generalisation**.

| Set (exposed) | `semantic-v2` C1 | C2 | S codes | `semantic-v1` C1 | legacy C1 |
|---|---|---|---|---|---|
| dev (152 R) | 152/152 | 0 | 0 | 152/152 | 54/152 |
| holdout-v1 (104 R) | 104/104 | 0 | 0 | 103/104 | 37/104 |
| holdout-v2 (271 R; fresh for `semantic-v1` in Phase 2, exposed now) | 271/271 | 0 | 0 | 254/271 | 73/271 |
| regression corpus (1 114 firm) | 1 076 exact + 38 safe abstentions, 0 failures | | | 695 exact, 397 failures | 211 exact, 781 failures |

**The gap is the finding:** 100 % on exposed material against 97.9 % with 4 high-severity false certainties on fresh
lines. The repairs fixed what was reported, but they generalised only partly.
- **Unknown measure words:** R1's last pre-freeze review recorded them as known risk (22/75 high on fresh adversarial
  probes). One of them, `tub`, appeared on holdout-v3 as 0075.
- **The A4 "and" list and the §12.11 another-food remark:** neither was a recorded risk, and both appear here as
  silent ready lines.

## 9. Process, isolation and exposure

- **Scorer first.**
  - SCORE-01 and SCORE-02 were repaired in outcomes v3. R1 checked the oracles independently, without importing the
    scorer.
  - 24 parser mutations and 11 scorer mutations were run, plus a self-test.
  - Delta v2 → v3: 1 128 figures compared, 1 029 unchanged, 99 changed, 0 unexpected
    (`evidence/…/scorer/DELTA.md`).
- **Candidate.**
  - Four repair rounds by the implementation worker, each followed by an R1 review. The engine, the vocabulary, the
    contract (§12 and §12.A) and the scorer were frozen before holdout-v3 existed.
  - R1's last review was recorded as known risk (PHASE-2B-PLAN §6.4).
- **Holdout-v3.**
  - Written by the evaluation worker, whose workspaces never contained `semantic-v2`, in a private history-less
    workspace, from the frozen contract and labelling guide. No engine was run on it.
  - 369 cases from 304 constructions, each construction used at most twice. Deduplicated against 9 819 exposed inputs.
- **Label check and adjudication.**
  - R2, blind to every engine, matched the core fields on 45 of 46 blind-sample cases (97.8 %, CI 88.7–99.6 %).
  - The coordinator adjudicated R2's findings from the contract text alone (`fixtures/LABEL-CHANGES.md`,
    `holdout-v3/ADJUDICATION-v3.md`): 1 label corrected and 2 cases pre-registered debatable.
  - Holdout-v3 was frozen in its own commit (`4aa0ad2`).
- **Exposure audit** (after the freeze, before scoring): every input was matched exactly, after normalization, against
  57 972 strings the implementation workers and the candidate reviewer could have seen.
  - 3 matches: `Kitchen twine`, `Equipment`, `½x 1x 2x`. Sensitivity (d) leaves them out.
  - A supplementary census of whole-word occurrences in five agent transcripts found 7, all short generic lines.
- **Single run.** One scoring run. Reruns are reproducibility audits (§7), never a second sample.
- **After the run** (none of it changes a result):
  - the package tests at the scoring commit found 11 failures in the holdout3 tests' fixture setup, which did not strip
    the new audit file. Fixed in `7312648` (test setup only; scorer unchanged);
  - `main` `1261cd8` was merged (`d916c14`);
  - the lab's record of Table's live parser files was updated (`a535dc9`; provenance only). This changes the
    `legacy` and package source digests, not `semantic-v2`'s.
  - A holdout-v3 rerun at the tested commit differs from the scored report only in those two pins (§7).

**Limitations.**
- All workers and reviewers are the same model family.
- The coordinator saw the candidate's behaviour on exposed data and adjudicated holdout-v3 labels. Every
  adjudication is argued from the contract and logged.
- Some holdout-v3 lines are contract-mechanical or unnatural (R2: 0253, 0124, 0118; 0113, 0259, 0096, 0171, 0138).
- The registry's unit words and synonyms are not listed in the contract text; three disputes came from that.

# R1 — holdout-v3: comparison with the scoring run, severe counterexamples, reproducibility (Steps 2–3)

Written after Step 1 (`RECOMPUTE.md`, `recompute-results.json`; hashes in `SHA256SUMS-step1.txt`, recorded at
2026-10-10T07:28:40Z before `fdbcfd1` was checked out or any report file opened). Clone checked out at `fdbcfd1` for
this step; nothing in the repository was edited.

## 1. Comparison with `benchmark-report-holdout3.json` (`fdbcfd1`, SHA-256 `7eb25ebf…c828`)

Method: `scripts/compare.py` maps each of my per-case results to the report's `caseIds` keys (C1, C1plus,
detailMismatchLow, C2High/C2Medium, C3a–x, C4, C5a–x, C6, C7, C8, CE and its three causes, S1–S8, inventedOption,
droppedOption, strictDiffers) and compares the key sets case by case.

| engine | cases | per-case discrepancies (all 32 keys) |
|---|---|---|
| semantic-v2 | 369 | **0** |
| semantic-v1 | 369 | 0 |
| legacy-table-import-2 | 369 | 0 |
| legacy-table-import-2+suggestion | 369 | 0 |

Every aggregate therefore agrees as well; checked explicitly for semantic-v2:

| figure | mine | report |
|---|---|---|
| C1 / C1+ on R (accepted) | 286 / 281 of 292 | 286 / 281 |
| C1 / C1+ on R (strict) | 284 / 279 | 284 / 279 |
| C2 (high / medium) | 4 (4 / 0): 0075, 0113, 0140, 0297 | 4 (4 / 0), same ids |
| C3 + C4 on R | 5 (C3a 3, C3b 2) + 0 | 5 |
| C5 on A / C7 on U / C8 | 49 (a 45, b 1, x 3) / 22 / 3 | same |
| CE (error / invalid / nondeterministic) | 0 / 0 / 0 | 0 / 0 / 0 |
| S1–S8 | S4 3 (0075, 0113, 0140), S7 1 (0297), others 0 | same |
| field accuracy on R: name strict / accepted, quantity, unit | 287 / 289, 289, 288 | 287 / 289, 289, 288 |
| invented / dropped options | 0120 / none | 1 / 0 |
| G2 A1–A5 | A1 not met, A2 met, A3 not met, A4 not met, A5 met | identical statuses |
| (a) without debatable | A1 285/290 met; A2 met; A3 3 not met; A4 S4 3 not met; A5 5/290 met | identical numerators, denominators and statuses |
| (c) without new readings | A1 209/211 met; A2 met; A3 1 not met; A4 S4 1; A5 2/211 | identical |
| (d) without audit matches | A1 286/292 not met; A3 4; A4 S4 3; A5 5/292 | identical |
| (b) needs_review without bare no-amount lines | excluded 0020, 0044, 0191, 0254 | identical (4 ids) |
| (c′) supplementary (not in the report) | N 236, R 206: A1 204/206 met, A3 1 (0113), A4 S4 1, A5 2/206 | recomputed from the report's per-case ids: identical |
| §12.15 row (not in the report) | ready 6/6 C1, needs_review 4/4 C5a, no S code | from the report's ids: identical |

Context engines: semantic-v1 C1 240/292, C2 35 (29/6), S1 5 S2 3 S3 6 S4 10 S5 2 S6 2 S7 5 S8 2; legacy C1 113/292,
C2 42 (31/11), S1 1 S2 6 S3 10 S4 9 S6 3 S8 1; legacy+suggestion as legacy with S3 20, S5 11, S6 10 — all equal to
the report.

**No discrepancy.** Presentation notes (not discrepancies):
- the markdown report prints semantic-v2's C1 as "286/292 (98.0%, …)" beside A1 **not met**: 286/292 = 97.95 %,
  rounded for display; the JSON rate (0.9795) and the status are right, but a reader may misread the table;
- the run log and markdown also print the Phase-1 §9 "false-certain 4 (H1/M3/L0)", which uses each case's label
  `severity` field, next to the outcomes-v3 "C2 4 (H4/M0)"; A3 uses the latter.

## 2. Severe counterexamples (semantic-v2; my classifier finds no others)

### ing-h3-0075 `1 small tub crème fraîche` — C2 high, S4
- Label: `needs_review`, name `crème fraîche`, quantity 1, unit null, note `small`; accept note `small; tub` /
  `small tub`; §12.14, reliesOnNewReading.
- Engine: `ready`, 1 `container` "crème fraîche", note `small` (its lexicon maps `tub` → `container`).
- Contract: `UNIT_REGISTRY` (`src/contract.ts`) has no `tub` code and no alias list; §12.3 names the containers ("bag,
  bottle, box, can, carton, container, envelope, jar, package, packet, tin, tube, plus … block, loaf, ball") without
  `tub`; §12.14: "an amount followed by a token that is neither a registry unit nor part of the food → needs_review".
  No frozen label maps a synonym word to a container code (the only word-to-code mappings in dev/holdout/h2/h3 are the
  `cups`-as-container rule of §12.5 and the abbreviation `pkg.`). **The label follows the frozen contract** on its
  literal reading. R2's `1 container` is a natural reading of a plain synonym, but the contract gives no synonym rule.
- Adjudication (pre-scoring): argued from the contract text — registry, the §12.3 list and the §12.14 quote — with no
  appeal to engine output. Sound.

### ing-h3-0113 `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` — C2 high, S4
- Label: `needs_review`, 1 `tbsp` "tamarind paste", remark in note; §12.11.
- Engine: `ready`, same fields, the water amount in note only.
- Contract: §7.5 "A second amount that is not a restatement → needs_review"; §12.11 a remark amount is a second amount
  "when it measures … another food"; §12.11 itself treats text after a comma as a remark ("even after a comma").
  3 tbsp hot water measures another food. **The label follows the contract**; the engine silently drops an amount.
  Firm (not debatable), outside every sensitivity: it alone fails A3/A4 in (c) and (c′).

### ing-h3-0140 `1 cup fresh peas and fava beans` — C2 high, S4
- Label: `needs_review`, name null, 1 `cup`; §12.7 / §12.A A4.
- Engine: `ready`, 1 cup "fresh peas and fava beans".
- Contract: A4 "Two foods joined by `and` after one amount, without a comma, are a list too … → needs_review"; the
  fixed compounds listed (salt and pepper, half-and-half, macaroni and cheese, …) do not include it; the debatable
  clause covers "product-or-list pairs such as `peas and carrots`" (a known frozen product), which "fresh peas and fava
  beans" is not. **The label follows the contract.** This is the `and`-list family I flagged in round 1–2.

### ing-h3-0297 `1 strip steak, about 14 oz` — C2 high, S7 (unit `strip` vs `each`)
- Label: `ready`, 1 `each` "strip steak", equivalent 14 `oz`; **debatable: true** (pre-registered in the draft);
  §12.4/§12.3.
- Engine: `ready`, 1 `strip` "steak", equivalent 14 oz.
- Contract: §12.A A1 names this very case: "With a count of one and a countable food naming a cut or dish (`1 strip
  steak`, `1 sheet cake`, `1 head cheese`) both readings are defensible: debatable, not used as firm labels." The label
  takes one defensible reading and the engine the other; `accept` cannot hold another unit, so the scorer cannot accept
  the engine's reading. **The label is consistent with the contract as one of its two readings, but it is not a firm
  label in the contract's own words.**
- Adjudication: it was flagged before scoring and kept in the acceptance basis "with its label as written"; sensitivity
  (a) removes it. That follows EVALUATION-PLAN-v3 §7 (debatable cases are reported with and without), and was argued
  from the contract (A1). My assessment: argued from the contract and the plan, but there is a real tension between A1's
  "not used as firm labels" and counting the case in the acceptance basis. **It decides A1**: with 0297 removed, A1 is
  285/290 = 98.3 % (met); with it, 286/292 = 97.9 % (not met). It does **not** decide G2: A3 and A4 fail on the three
  firm S4 lines in every set.

Review-only wrong pre-fills (not severe): 0120 `1 head lettuce, romaine or green leaf` → options `romaine leaf`,
`green leaf` (invented option, C5b); 0089 and 0222 C3b (the abstention pre-fill keeps the unit word: "bunch
silverbeet", "bag shredded four cheese Mexican blend").

## 3. Byte-identical rerun (reproducibility audit, not a second sample)

At `fdbcfd1`: `cd packages/recipe-extraction && npm run bench -- --split holdout3 --out-json
/home/user/rx2b-r1/recompute-v3/rerun.json` → exit 0; `rerun.json` SHA-256
`7eb25ebfb9619f02a4f9922df2d8d30323b54b3427b156bf8c6f6b88528bc828` = the committed report; `cmp` byte-identical.
The run wrote only to my directory (`git status` clean apart from the `node_modules` symlink).

## 4. Other findings

- **Package suite is red at the audit and scoring commits** (`package-tests-fdbcfd1*.txt`): `bench/__tests__/holdout3.test.ts`
  has 11 failing tests at `f6cc0c6` and `fdbcfd1` (18/18 passed at the freeze `4aa0ad2`). The tests build temporary
  fixture directories with a synthetic holdout-v3 and pick up the real `EXPOSURE-AUDIT-v3.json`, whose ids then fail the
  fixture invariants ("ing-h3-0114 is not a holdout-v3 case"). It does not touch the scored numbers (the real run
  verified the audit against the real holdout; my recomputation and the rerun agree), but the scorer's own test file is
  not green at the scored commit; record it under A6 / scorer hygiene. All other tests pass: 5 088 passed, 11 skipped.
- Legacy and `semantic-v1` sources: no diff `8131fe0..fdbcfd1`; pesto test (A7) passes; every output of all four
  engines valid and deterministic (CE 0).

## 5. Verdict

**semantic-v2, Gate G2: FAIL.**
- Not met: A1 (286/292 = 97.9 %), A3 (4 high C2), A4 (S4 = 3).
- Met: A2 (point estimates; none with confidence), A5 (1.7 %), A6 in the scorer (CE = 0), A7.
- Confidence: A1 not met with confidence (Wilson lower bound 95.6 %); A2 not met with confidence for any field.
- Sensitivities do not change the verdict: A3/A4 fail in (a), (c), (c′) and (d).

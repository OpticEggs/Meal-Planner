# Outcomes v2 → v3 delta on the historical engines (Phase 2B, scorer)

**Compared:** the historical holdout-v2 report (`../../2026-10-09-recipe-extraction-phase2/evaluation-56eafe4/benchmark-report.json`,
SHA-256 `afc55fd5…`, outcomes v2 / EVALUATION-PLAN-v2, run at `56eafe4`) against `report-v3.json` (SHA-256 `26f5d3bd…`,
outcomes v3 / EVALUATION-PLAN-v3, `bench/outcomes.ts` SHA-256 `f3394774…`), both scoring `legacy-table-import-2`,
`legacy-table-import-2+suggestion` and `semantic-v1` on dev, holdout-v1 and holdout-v2 (`--split every --pages`).
The historical files are untouched.

**Method (verified, not assumed):** `bench/delta.ts` compares **1 128 figures** — for every engine × set every outcome
class and sub-class, C1/C1+ and strict figures, S1–S8 and "any severe", field accuracy on R (name strict/accepted,
quantity, unit), the line counts, every case-id list, the set label, both sensitivity figures, and on holdout-v2
every A1–A7 status and its evidence; plus every per-category and per-source rate as a group. Each change must be
explained by SCORE-01, SCORE-02 or the v3 set labels, otherwise it is reported as UNEXPECTED. The report sections
outside the outcome scorer (corpus, freeze, the CONTRACT §9 field scores, pages) are compared whole. The result
(`delta.json`) is pinned by `bench/__tests__/delta.test.ts`.

**Result: 1 029 figures unchanged, 99 changed, 0 unexpected.** Corpus, freeze, §9 field scores and pages: identical.

| Headline figure | Changed? | Why |
|---|---|---|
| C1, C1+ (all engines, all sets) | no | SCORE-02 changes nothing here: 0 engine errors, 0 invalid outputs, 0 nondeterministic lines for all 3 engines × 669 lines, so no line became CE |
| C2 high / medium, C3 + C4 and C3a/b/c/x, C4, C5 and C5a/b/c/x, C6, C7, C8, CE | no | same |
| S1–S8 (and every S-code case list) | no | same; S codes were never given to a CE line here (CE = 0) |
| Field accuracy on R (name, quantity, unit) | no | same; no CE line to count as inaccurate |
| A1–A5 statuses and evidence (holdout-v2) | no | semantic-v1: A1–A4 not met, A5 met; legacy engines: A1–A5 not met — as in the historical report |
| A6 status (holdout-v2) | **yes**: "checked outside the scorer" → "scorer checks met; rest checked outside the scorer"; evidence now lists CE, engineError, invalidOutput, nondeterministic (all 0/359) | SCORE-02: A6's scorer part is computed from the dimensions |
| A7 | no | still recorded outside the scorer |
| Sensitivity (a), A1–A5 without `ing-h2-0087` | no | e.g. semantic-v1 A1 254/270 as before |
| Sensitivity (b), needs_review without bare no-amount labels | **yes** on every engine and set | SCORE-01: holdout-v2 excludes **29** (was 23: + 0158, 0186, 0207, 0208, 0209, 0350); dev 5 (was 4: + `ing-dev-0079` "butter, softened"); holdout-v1 5 (was 4: + `ing-hold-0052` "basil leaves, torn") — each a needs_review label with no quantity, unit or alternatives whose `prep_note`/other tag kept it out of the v2 tag heuristic |
| holdout-v2 set label | **yes**: "holdout-v2 (fresh)" → "holdout-v2 (exposed; historical acceptance set)" | v3 labels holdout-v2 historical; figures unchanged |

Sensitivity (b) on holdout-v2, v2 → v3 (kept needs_review lines): legacy-table-import-2 C5 46/46 → 40/40, C5a 7/46 → 1/40,
C5b 39/46 → 39/40; legacy-table-import-2+suggestion C5a 8/46 → 2/40, C5b 38/46 → 38/40; semantic-v1 C5 44/46 → 38/40,
C5a 40/46 → 34/40, C5b 4/46 → 4/40, S4 2/46 → 2/40; C5c, C5x, C6 0 throughout.

Figures only v3 reports: CE dimensions 0 everywhere (every line of every engine is classified); invented options
(review pre-fill, informational) only for semantic-v1 — holdout-v1 `ing-hold-0021`, `ing-hold-0031`; holdout-v2
`ing-h2-0218`, `ing-h2-0220`, `ing-h2-0232`; dropped options 0.

---

Old report SHA-256 `afc55fd5b8f0ce9b8959882c44919cae29e943814e8960b586fba8da0e9b1e4a` (EVALUATION-PLAN-v2); new report SHA-256 `26f5d3bd19564739c4820bbd275b009b0287c000d3d1365ad1aa5c8771cedd07` (EVALUATION-PLAN-v3).

| Section outside the outcome scorer | v2 vs v3 |
|---|---|
| schema | identical |
| package | identical |
| contract | identical |
| selection | identical |
| corpus | identical |
| freeze | identical |
| ingredientEngines | identical |
| pages | identical |

### `legacy-table-import-2`

| Figure | dev v2 → v3 | holdout v2 → v3 | holdout2 v2 → v3 |
|---|---|---|---|
| outcomes.C1 | 54/152 (same) | 37/104 (same) | 73/271 (same) |
| outcomes.C1plus | 54/152 (same) | 37/104 (same) | 71/271 (same) |
| outcomes.C2 | 6/182 (same) | 4/128 (same) | 21/359 (same) |
| outcomes.C2High | 1/182 (same) | 0/128 (same) | 11/359 (same) |
| outcomes.C2Medium | 5/182 (same) | 4/128 (same) | 10/359 (same) |
| outcomes.C3plusC4 | 92/152 (same) | 63/104 (same) | 177/271 (same) |
| outcomes.C3a | 11/152 (same) | 9/104 (same) | 24/271 (same) |
| outcomes.C3b | 81/152 (same) | 54/104 (same) | 153/271 (same) |
| outcomes.C3c | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C3x | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C4 | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C5 | 22/22 (same) | 18/18 (same) | 69/69 (same) |
| outcomes.C5a | 5/22 (same) | 5/18 (same) | 29/69 (same) |
| outcomes.C5b | 17/22 (same) | 13/18 (same) | 40/69 (same) |
| outcomes.C5c | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C5x | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C6 | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C7 | 3/8 (same) | 2/6 (same) | 2/19 (same) |
| outcomes.C8 | 5/8 (same) | 4/6 (same) | 17/19 (same) |
| outcomes.CE | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S1 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S2 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S3 | 0/182 (same) | 0/128 (same) | 5/359 (same) |
| severe.S4 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S5 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S6 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S7 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S8 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| fieldAccuracyOnReady.name.accepted | 65/152 (same) | 46/104 (same) | 97/271 (same) |
| fieldAccuracyOnReady.quantity | 87/152 (same) | 61/104 (same) | 123/271 (same) |
| fieldAccuracyOnReady.unit | 71/152 (same) | 49/104 (same) | 99/271 (same) |
| acceptance.A1.status | — | — | not met (same) |
| acceptance.A2.status | — | — | not met (same) |
| acceptance.A3.status | — | — | not met (same) |
| acceptance.A4.status | — | — | not met (same) |
| acceptance.A5.status | — | — | not met (same) |
| acceptance.A6.status | — | — | **checked outside the scorer → scorer checks met; rest checked outside the scorer** |
| acceptance.A7.status | — | — | checked outside the scorer (same) |
| sensitivity(a).A1.status | — | — | not met (same) |
| sensitivity(a).A3.status | — | — | not met (same) |
| sensitivity(a).A4.status | — | — | not met (same) |
| sensitivity(b).excluded | **4 → 5** | **4 → 5** | **23 → 29** |
| sensitivity(b).needsReview | **18 → 17** | **14 → 13** | **46 → 40** |
| sensitivity(b).C5 | **18/18 → 17/17** | **14/14 → 13/13** | **46/46 → 40/40** |
| sensitivity(b).C5a | **1/18 → 0/17** | **1/14 → 0/13** | **7/46 → 1/40** |
| sensitivity(b).C5c | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |
| sensitivity(b).C6 | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |
| sensitivity(b).S4 | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |

### `legacy-table-import-2+suggestion`

| Figure | dev v2 → v3 | holdout v2 → v3 | holdout2 v2 → v3 |
|---|---|---|---|
| outcomes.C1 | 54/152 (same) | 37/104 (same) | 73/271 (same) |
| outcomes.C1plus | 54/152 (same) | 37/104 (same) | 71/271 (same) |
| outcomes.C2 | 6/182 (same) | 4/128 (same) | 21/359 (same) |
| outcomes.C2High | 1/182 (same) | 0/128 (same) | 11/359 (same) |
| outcomes.C2Medium | 5/182 (same) | 4/128 (same) | 10/359 (same) |
| outcomes.C3plusC4 | 92/152 (same) | 63/104 (same) | 177/271 (same) |
| outcomes.C3a | 26/152 (same) | 17/104 (same) | 49/271 (same) |
| outcomes.C3b | 66/152 (same) | 46/104 (same) | 128/271 (same) |
| outcomes.C3c | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C3x | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C4 | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C5 | 22/22 (same) | 18/18 (same) | 69/69 (same) |
| outcomes.C5a | 5/22 (same) | 5/18 (same) | 30/69 (same) |
| outcomes.C5b | 17/22 (same) | 13/18 (same) | 39/69 (same) |
| outcomes.C5c | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C5x | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C6 | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C7 | 3/8 (same) | 2/6 (same) | 2/19 (same) |
| outcomes.C8 | 5/8 (same) | 4/6 (same) | 17/19 (same) |
| outcomes.CE | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S1 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S2 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S3 | 10/182 (same) | 5/128 (same) | 28/359 (same) |
| severe.S4 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S5 | 3/182 (same) | 2/128 (same) | 9/359 (same) |
| severe.S6 | 10/182 (same) | 5/128 (same) | 23/359 (same) |
| severe.S7 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S8 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| fieldAccuracyOnReady.name.accepted | 103/152 (same) | 69/104 (same) | 157/271 (same) |
| fieldAccuracyOnReady.quantity | 97/152 (same) | 64/104 (same) | 150/271 (same) |
| fieldAccuracyOnReady.unit | 95/152 (same) | 64/104 (same) | 135/271 (same) |
| acceptance.A1.status | — | — | not met (same) |
| acceptance.A2.status | — | — | not met (same) |
| acceptance.A3.status | — | — | not met (same) |
| acceptance.A4.status | — | — | not met (same) |
| acceptance.A5.status | — | — | not met (same) |
| acceptance.A6.status | — | — | **checked outside the scorer → scorer checks met; rest checked outside the scorer** |
| acceptance.A7.status | — | — | checked outside the scorer (same) |
| sensitivity(a).A1.status | — | — | not met (same) |
| sensitivity(a).A3.status | — | — | not met (same) |
| sensitivity(a).A4.status | — | — | not met (same) |
| sensitivity(b).excluded | **4 → 5** | **4 → 5** | **23 → 29** |
| sensitivity(b).needsReview | **18 → 17** | **14 → 13** | **46 → 40** |
| sensitivity(b).C5 | **18/18 → 17/17** | **14/14 → 13/13** | **46/46 → 40/40** |
| sensitivity(b).C5a | **1/18 → 0/17** | **1/14 → 0/13** | **8/46 → 2/40** |
| sensitivity(b).C5c | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |
| sensitivity(b).C6 | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |
| sensitivity(b).S4 | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |

### `semantic-v1`

| Figure | dev v2 → v3 | holdout v2 → v3 | holdout2 v2 → v3 |
|---|---|---|---|
| outcomes.C1 | 152/152 (same) | 103/104 (same) | 254/271 (same) |
| outcomes.C1plus | 152/152 (same) | 103/104 (same) | 254/271 (same) |
| outcomes.C2 | 0/182 (same) | 0/128 (same) | 6/359 (same) |
| outcomes.C2High | 0/182 (same) | 0/128 (same) | 5/359 (same) |
| outcomes.C2Medium | 0/182 (same) | 0/128 (same) | 1/359 (same) |
| outcomes.C3plusC4 | 0/152 (same) | 1/104 (same) | 13/271 (same) |
| outcomes.C3a | 0/152 (same) | 0/104 (same) | 5/271 (same) |
| outcomes.C3b | 0/152 (same) | 1/104 (same) | 6/271 (same) |
| outcomes.C3c | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C3x | 0/152 (same) | 0/104 (same) | 2/271 (same) |
| outcomes.C4 | 0/152 (same) | 0/104 (same) | 0/271 (same) |
| outcomes.C5 | 22/22 (same) | 18/18 (same) | 67/69 (same) |
| outcomes.C5a | 22/22 (same) | 17/18 (same) | 63/69 (same) |
| outcomes.C5b | 0/22 (same) | 1/18 (same) | 4/69 (same) |
| outcomes.C5c | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C5x | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C6 | 0/22 (same) | 0/18 (same) | 0/69 (same) |
| outcomes.C7 | 8/8 (same) | 6/6 (same) | 16/19 (same) |
| outcomes.C8 | 0/8 (same) | 0/6 (same) | 3/19 (same) |
| outcomes.CE | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S1 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S2 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S3 | 0/182 (same) | 0/128 (same) | 1/359 (same) |
| severe.S4 | 0/182 (same) | 0/128 (same) | 2/359 (same) |
| severe.S5 | 0/182 (same) | 0/128 (same) | 1/359 (same) |
| severe.S6 | 0/182 (same) | 0/128 (same) | 1/359 (same) |
| severe.S7 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| severe.S8 | 0/182 (same) | 0/128 (same) | 0/359 (same) |
| fieldAccuracyOnReady.name.accepted | 152/152 (same) | 103/104 (same) | 260/271 (same) |
| fieldAccuracyOnReady.quantity | 152/152 (same) | 104/104 (same) | 266/271 (same) |
| fieldAccuracyOnReady.unit | 152/152 (same) | 104/104 (same) | 265/271 (same) |
| acceptance.A1.status | — | — | not met (same) |
| acceptance.A2.status | — | — | not met (same) |
| acceptance.A3.status | — | — | not met (same) |
| acceptance.A4.status | — | — | not met (same) |
| acceptance.A5.status | — | — | met (same) |
| acceptance.A6.status | — | — | **checked outside the scorer → scorer checks met; rest checked outside the scorer** |
| acceptance.A7.status | — | — | checked outside the scorer (same) |
| sensitivity(a).A1.status | — | — | not met (same) |
| sensitivity(a).A3.status | — | — | not met (same) |
| sensitivity(a).A4.status | — | — | not met (same) |
| sensitivity(b).excluded | **4 → 5** | **4 → 5** | **23 → 29** |
| sensitivity(b).needsReview | **18 → 17** | **14 → 13** | **46 → 40** |
| sensitivity(b).C5 | **18/18 → 17/17** | **14/14 → 13/13** | **44/46 → 38/40** |
| sensitivity(b).C5a | **18/18 → 17/17** | **13/14 → 12/13** | **40/46 → 34/40** |
| sensitivity(b).C5c | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |
| sensitivity(b).C6 | **0/18 → 0/17** | **0/14 → 0/13** | **0/46 → 0/40** |
| sensitivity(b).S4 | **0/18 → 0/17** | **0/14 → 0/13** | **2/46 → 2/40** |

#### Every changed figure (99 of 1128 compared)

| Engine | Set | Figure | v2 | v3 | Why |
|---|---|---|---|---|---|
| legacy-table-import-2 | dev | sensitivity(b).excluded | 4 | 5 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).needsReview | 18 | 17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).excludedIds | ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0080 | ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0079, ing-dev-0080 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).C5 | 18/18 | 17/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).C5a | 1/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).C5b | 17/18 | 17/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).C5c | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).C5x | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).C6 | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | dev | sensitivity(b).S4 | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).excluded | 4 | 5 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).needsReview | 14 | 13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).excludedIds | ing-hold-0050, ing-hold-0051, ing-hold-0053, ing-hold-0119 | ing-hold-0050, ing-hold-0051, ing-hold-0052, ing-hold-0053, ing-hold-0119 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).C5 | 14/14 | 13/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).C5a | 1/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).C5b | 13/14 | 13/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).C5c | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).C5x | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).C6 | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout | sensitivity(b).S4 | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | status | holdout-v2 (fresh) | holdout-v2 (exposed; historical acceptance set) | v3 labels holdout-v2 as exposed (its acceptance table is historical); the figures are unchanged |
| legacy-table-import-2 | holdout2 | sensitivity(b).excluded | 23 | 29 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).needsReview | 46 | 40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).excludedIds | ing-h2-0205, ing-h2-0206, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359 | ing-h2-0158, ing-h2-0186, ing-h2-0205, ing-h2-0206, ing-h2-0207, ing-h2-0208, ing-h2-0209, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0350, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).C5 | 46/46 | 40/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).C5a | 7/46 | 1/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).C5b | 39/46 | 39/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).C5c | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).C5x | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).C6 | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | sensitivity(b).S4 | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2 | holdout2 | acceptance.A6.status | checked outside the scorer | scorer checks met; rest checked outside the scorer | SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer |
| legacy-table-import-2 | holdout2 | acceptance.A6.evidence | CE 0/359 | CE 0/359; engineError 0/359; invalidOutput 0/359; nondeterministic 0/359 | SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer |
| legacy-table-import-2+suggestion | dev | sensitivity(b).excluded | 4 | 5 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).needsReview | 18 | 17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).excludedIds | ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0080 | ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0079, ing-dev-0080 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).C5 | 18/18 | 17/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).C5a | 1/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).C5b | 17/18 | 17/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).C5c | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).C5x | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).C6 | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | dev | sensitivity(b).S4 | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).excluded | 4 | 5 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).needsReview | 14 | 13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).excludedIds | ing-hold-0050, ing-hold-0051, ing-hold-0053, ing-hold-0119 | ing-hold-0050, ing-hold-0051, ing-hold-0052, ing-hold-0053, ing-hold-0119 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).C5 | 14/14 | 13/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).C5a | 1/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).C5b | 13/14 | 13/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).C5c | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).C5x | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).C6 | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout | sensitivity(b).S4 | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | status | holdout-v2 (fresh) | holdout-v2 (exposed; historical acceptance set) | v3 labels holdout-v2 as exposed (its acceptance table is historical); the figures are unchanged |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).excluded | 23 | 29 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).needsReview | 46 | 40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).excludedIds | ing-h2-0205, ing-h2-0206, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359 | ing-h2-0158, ing-h2-0186, ing-h2-0205, ing-h2-0206, ing-h2-0207, ing-h2-0208, ing-h2-0209, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0350, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).C5 | 46/46 | 40/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).C5a | 8/46 | 2/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).C5b | 38/46 | 38/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).C5c | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).C5x | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).C6 | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | sensitivity(b).S4 | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| legacy-table-import-2+suggestion | holdout2 | acceptance.A6.status | checked outside the scorer | scorer checks met; rest checked outside the scorer | SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer |
| legacy-table-import-2+suggestion | holdout2 | acceptance.A6.evidence | CE 0/359 | CE 0/359; engineError 0/359; invalidOutput 0/359; nondeterministic 0/359 | SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer |
| semantic-v1 | dev | sensitivity(b).excluded | 4 | 5 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).needsReview | 18 | 17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).excludedIds | ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0080 | ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0079, ing-dev-0080 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).C5 | 18/18 | 17/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).C5a | 18/18 | 17/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).C5b | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).C5c | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).C5x | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).C6 | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | dev | sensitivity(b).S4 | 0/18 | 0/17 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).excluded | 4 | 5 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).needsReview | 14 | 13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).excludedIds | ing-hold-0050, ing-hold-0051, ing-hold-0053, ing-hold-0119 | ing-hold-0050, ing-hold-0051, ing-hold-0052, ing-hold-0053, ing-hold-0119 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).C5 | 14/14 | 13/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).C5a | 13/14 | 12/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).C5b | 1/14 | 1/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).C5c | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).C5x | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).C6 | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout | sensitivity(b).S4 | 0/14 | 0/13 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | status | holdout-v2 (fresh) | holdout-v2 (exposed; historical acceptance set) | v3 labels holdout-v2 as exposed (its acceptance table is historical); the figures are unchanged |
| semantic-v1 | holdout2 | sensitivity(b).excluded | 23 | 29 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).needsReview | 46 | 40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).excludedIds | ing-h2-0205, ing-h2-0206, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359 | ing-h2-0158, ing-h2-0186, ing-h2-0205, ing-h2-0206, ing-h2-0207, ing-h2-0208, ing-h2-0209, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0350, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).C5 | 44/46 | 38/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).C5a | 40/46 | 34/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).C5b | 4/46 | 4/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).C5c | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).C5x | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).C6 | 0/46 | 0/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | sensitivity(b).S4 | 2/46 | 2/40 | SCORE-01: v3 excludes the needs_review labels with label quantity, unit and alternatives all null (plan change log 3(b)); v2 selected by category tag |
| semantic-v1 | holdout2 | acceptance.A6.status | checked outside the scorer | scorer checks met; rest checked outside the scorer | SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer |
| semantic-v1 | holdout2 | acceptance.A6.evidence | CE 0/359 | CE 0/359; engineError 0/359; invalidOutput 0/359; nondeterministic 0/359 | SCORE-02: v3 computes A6's scorer part from the CE dimensions (CE = 0 here: no engine error, every output valid, deterministic); v2 recorded A6 only outside the scorer |

Unexpected changes: **0**.

#### Figures only v3 reports

| Engine | Set | Figure | v3 |
|---|---|---|---|
| legacy-table-import-2 | dev | validity.engineError | 0/182 |
| legacy-table-import-2 | dev | validity.invalidOutput | 0/182 |
| legacy-table-import-2 | dev | validity.nondeterministic | 0/182 |
| legacy-table-import-2 | dev | validity.classified | 182/182 |
| legacy-table-import-2 | dev | reviewPrefill.inventedOption | 0/182 |
| legacy-table-import-2 | dev | reviewPrefill.droppedOption | 0/182 |
| legacy-table-import-2 | dev | caseIds.inventedOption | [] |
| legacy-table-import-2 | dev | caseIds.droppedOption | [] |
| legacy-table-import-2 | dev | ceLines | 0 line(s) |
| legacy-table-import-2 | holdout | validity.engineError | 0/128 |
| legacy-table-import-2 | holdout | validity.invalidOutput | 0/128 |
| legacy-table-import-2 | holdout | validity.nondeterministic | 0/128 |
| legacy-table-import-2 | holdout | validity.classified | 128/128 |
| legacy-table-import-2 | holdout | reviewPrefill.inventedOption | 0/128 |
| legacy-table-import-2 | holdout | reviewPrefill.droppedOption | 0/128 |
| legacy-table-import-2 | holdout | caseIds.inventedOption | [] |
| legacy-table-import-2 | holdout | caseIds.droppedOption | [] |
| legacy-table-import-2 | holdout | ceLines | 0 line(s) |
| legacy-table-import-2 | holdout2 | validity.engineError | 0/359 |
| legacy-table-import-2 | holdout2 | validity.invalidOutput | 0/359 |
| legacy-table-import-2 | holdout2 | validity.nondeterministic | 0/359 |
| legacy-table-import-2 | holdout2 | validity.classified | 359/359 |
| legacy-table-import-2 | holdout2 | reviewPrefill.inventedOption | 0/359 |
| legacy-table-import-2 | holdout2 | reviewPrefill.droppedOption | 0/359 |
| legacy-table-import-2 | holdout2 | caseIds.inventedOption | [] |
| legacy-table-import-2 | holdout2 | caseIds.droppedOption | [] |
| legacy-table-import-2 | holdout2 | ceLines | 0 line(s) |
| legacy-table-import-2 | holdout2 | acceptance.a6ScorerChecksMet | true |
| legacy-table-import-2 | holdout2 | acceptance.basis | historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate |
| legacy-table-import-2+suggestion | dev | validity.engineError | 0/182 |
| legacy-table-import-2+suggestion | dev | validity.invalidOutput | 0/182 |
| legacy-table-import-2+suggestion | dev | validity.nondeterministic | 0/182 |
| legacy-table-import-2+suggestion | dev | validity.classified | 182/182 |
| legacy-table-import-2+suggestion | dev | reviewPrefill.inventedOption | 0/182 |
| legacy-table-import-2+suggestion | dev | reviewPrefill.droppedOption | 0/182 |
| legacy-table-import-2+suggestion | dev | caseIds.inventedOption | [] |
| legacy-table-import-2+suggestion | dev | caseIds.droppedOption | [] |
| legacy-table-import-2+suggestion | dev | ceLines | 0 line(s) |
| legacy-table-import-2+suggestion | holdout | validity.engineError | 0/128 |
| legacy-table-import-2+suggestion | holdout | validity.invalidOutput | 0/128 |
| legacy-table-import-2+suggestion | holdout | validity.nondeterministic | 0/128 |
| legacy-table-import-2+suggestion | holdout | validity.classified | 128/128 |
| legacy-table-import-2+suggestion | holdout | reviewPrefill.inventedOption | 0/128 |
| legacy-table-import-2+suggestion | holdout | reviewPrefill.droppedOption | 0/128 |
| legacy-table-import-2+suggestion | holdout | caseIds.inventedOption | [] |
| legacy-table-import-2+suggestion | holdout | caseIds.droppedOption | [] |
| legacy-table-import-2+suggestion | holdout | ceLines | 0 line(s) |
| legacy-table-import-2+suggestion | holdout2 | validity.engineError | 0/359 |
| legacy-table-import-2+suggestion | holdout2 | validity.invalidOutput | 0/359 |
| legacy-table-import-2+suggestion | holdout2 | validity.nondeterministic | 0/359 |
| legacy-table-import-2+suggestion | holdout2 | validity.classified | 359/359 |
| legacy-table-import-2+suggestion | holdout2 | reviewPrefill.inventedOption | 0/359 |
| legacy-table-import-2+suggestion | holdout2 | reviewPrefill.droppedOption | 0/359 |
| legacy-table-import-2+suggestion | holdout2 | caseIds.inventedOption | [] |
| legacy-table-import-2+suggestion | holdout2 | caseIds.droppedOption | [] |
| legacy-table-import-2+suggestion | holdout2 | ceLines | 0 line(s) |
| legacy-table-import-2+suggestion | holdout2 | acceptance.a6ScorerChecksMet | true |
| legacy-table-import-2+suggestion | holdout2 | acceptance.basis | historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate |
| semantic-v1 | dev | validity.engineError | 0/182 |
| semantic-v1 | dev | validity.invalidOutput | 0/182 |
| semantic-v1 | dev | validity.nondeterministic | 0/182 |
| semantic-v1 | dev | validity.classified | 182/182 |
| semantic-v1 | dev | reviewPrefill.inventedOption | 0/182 |
| semantic-v1 | dev | reviewPrefill.droppedOption | 0/182 |
| semantic-v1 | dev | caseIds.inventedOption | [] |
| semantic-v1 | dev | caseIds.droppedOption | [] |
| semantic-v1 | dev | ceLines | 0 line(s) |
| semantic-v1 | holdout | validity.engineError | 0/128 |
| semantic-v1 | holdout | validity.invalidOutput | 0/128 |
| semantic-v1 | holdout | validity.nondeterministic | 0/128 |
| semantic-v1 | holdout | validity.classified | 128/128 |
| semantic-v1 | holdout | reviewPrefill.inventedOption | 2/128 |
| semantic-v1 | holdout | reviewPrefill.droppedOption | 0/128 |
| semantic-v1 | holdout | caseIds.inventedOption | ing-hold-0021, ing-hold-0031 |
| semantic-v1 | holdout | caseIds.droppedOption | [] |
| semantic-v1 | holdout | ceLines | 0 line(s) |
| semantic-v1 | holdout2 | validity.engineError | 0/359 |
| semantic-v1 | holdout2 | validity.invalidOutput | 0/359 |
| semantic-v1 | holdout2 | validity.nondeterministic | 0/359 |
| semantic-v1 | holdout2 | validity.classified | 359/359 |
| semantic-v1 | holdout2 | reviewPrefill.inventedOption | 3/359 |
| semantic-v1 | holdout2 | reviewPrefill.droppedOption | 0/359 |
| semantic-v1 | holdout2 | caseIds.inventedOption | ing-h2-0218, ing-h2-0220, ing-h2-0232 |
| semantic-v1 | holdout2 | caseIds.droppedOption | [] |
| semantic-v1 | holdout2 | ceLines | 0 line(s) |
| semantic-v1 | holdout2 | acceptance.a6ScorerChecksMet | true |
| semantic-v1 | holdout2 | acceptance.basis | historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate |

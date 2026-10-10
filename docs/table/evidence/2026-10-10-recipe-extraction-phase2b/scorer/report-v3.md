# Recipe extraction benchmark

@table/recipe-extraction@0.1.0 · contract recipe-extraction/v1 · split every

Holdout freeze: verified

Pins: plan `docs/table/recipe-extraction/EVALUATION-PLAN-v3.md` SHA-256 `306f51561e5075f0b477857e061937755e195d52d38775b79f9111ab3ffeb662` · scorer `bench/outcomes.ts` SHA-256 `7821e8532eb123e9694291c6d0deac6bdac40f96715d06a4d2aa2161fc3a3892` · package `src/` digest `1460901f1bc48ab8b4d718a70d71e1cbb136e919602f17cab84b654104d9ccbb` · engine sources legacy `081c8cfd9fbe2e2f4bf9d27b905960b6b90954731dd61f06c419289b2cb99583`, semantic `ab41d0c66467604e81cfbeb0b12a3d5f4b8c41cfc7f369ccd09dacb4993717f3`.

| Corpus file | Entries | SHA-256 |
|---|---|---|
| fixtures/ingredients/dev.jsonl | 182 | `5f8db6d8edd6ad4c…` |
| fixtures/ingredients/holdout-v2.jsonl | 359 | `793507a4b7360fb7…` |
| fixtures/ingredients/holdout.jsonl | 128 | `7ddd898e6474adba…` |
| fixtures/pages/dev-article-nonrecipe.html | 1 | `562cababa272d384…` |
| fixtures/pages/dev-entities-relative.html | 1 | `a81c10e5163dc27c…` |
| fixtures/pages/dev-malformed-plus-valid.html | 1 | `3018ef8c90291396…` |
| fixtures/pages/dev-microdata.html | 1 | `164ab737022e7a75…` |
| fixtures/pages/dev-opengraph-only.html | 1 | `d02de7f6753e1e9c…` |
| fixtures/pages/dev-plain-jsonld.html | 1 | `9bcc9cf87e8f24f7…` |
| fixtures/pages/dev-redirect-headings.html | 1 | `7d4298e8a4e6c48a…` |
| fixtures/pages/dev-two-recipes.html | 1 | `3eb3310067fa8bf9…` |
| fixtures/pages/dev-type-array-br.html | 1 | `9b2d3c17e1c2a509…` |
| fixtures/pages/dev-yoast-graph.html | 1 | `1b7855a15548da2c…` |
| fixtures/pages/hold-faq-nonrecipe.html | 1 | `452991936a75cbad…` |
| fixtures/pages/hold-graph-website.html | 1 | `f0bee8631c8c850f…` |
| fixtures/pages/hold-microdata-og-image.html | 1 | `0c83041061dcf958…` |
| fixtures/pages/hold-redirect-li-entities.html | 1 | `9be1f879ad90f5bd…` |
| fixtures/pages/hold-two-recipes-malformed.html | 1 | `648585bdfc06dd6a…` |
| fixtures/pages/labels.json | 15 | `4b15d2a1a58cadce…` |

## Ingredient engine `legacy-table-import-2`

Table import 2's ingredient-line parser (frozen copy at cb7b56e) translated into contract v1. Faithful, including its defects; the only deviation is the input_truncated reason when a line is cut at 500 characters.

### Overall — 669 lines (527 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 209/669 | 31.2% | 27.8%–34.8% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 209/669 | 31.2% | 27.8%–34.8% |
| Core pass, ready-labelled lines (strict) | 164/527 | 31.1% | 27.3%–35.2% |
| Core pass, ready-labelled lines (accepted) | 164/527 | 31.1% | 27.3%–35.2% |
| Full pass (every field), all lines (strict) | 205/669 | 30.6% | 27.3%–34.2% |
| Full pass (every field), all lines (accepted) | 206/669 | 30.8% | 27.4%–34.4% |
| Full pass, ready-labelled lines (strict) | 161/527 | 30.6% | 26.8%–34.6% |
| Full pass, ready-labelled lines (accepted) | 162/527 | 30.7% | 27.0%–34.8% |
| Review rate (engine not ready) | 474/669 | 70.9% | 67.3%–74.2% |
| Unnecessary review (label ready, engine not) | 332/527 | 63.0% | 58.8%–67.0% |
| **False certainty, total** (of all lines) | 31/669 | 4.6% | 3.3%–6.5% |
| False certainty — high | 12/669 | 1.8% | 1.0%–3.1% |
| False certainty — medium | 19/669 | 2.8% | 1.8%–4.4% |
| False certainty — low | 0/669 | 0.0% | 0.0%–0.6% |
| False certainty (of engine-ready lines) | 31/195 | 15.9% | 11.4%–21.7% |
| Suppressed ambiguity (of not-ready labels) | 0/142 | 0.0% | 0.0%–2.6% |
| Wrong amount on a ready reading (of ready labels) | 12/527 | 2.3% | 1.3%–3.9% |
| Wrong name on a ready reading (of ready labels) | 19/527 | 3.6% | 2.3%–5.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 2/195 | 1.0% | 0.3%–3.7% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/125 | 0.0% | 0.0%–3.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 5/559 | 0.9% | 0.4%–2.1% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 311/669 (46.5%) | 311/669 (46.5%) | 195/527 (37.0%) | 195/527 (37.0%) |
| name | 256/669 (38.3%) | 256/669 (38.3%) | 208/527 (39.5%) | 208/527 (39.5%) |
| quantity | 360/669 (53.8%) | 360/669 (53.8%) | 271/527 (51.4%) | 271/527 (51.4%) |
| unit | 293/669 (43.8%) | 293/669 (43.8%) | 219/527 (41.6%) | 219/527 (41.6%) |
| packageSize | 619/669 (92.5%) | 619/669 (92.5%) | 480/527 (91.1%) | 480/527 (91.1%) |
| equivalents | 635/669 (94.9%) | 635/669 (94.9%) | 493/527 (93.5%) | 493/527 (93.5%) |
| form | 667/669 (99.7%) | 667/669 (99.7%) | 526/527 (99.8%) | 526/527 (99.8%) |
| note | 565/669 (84.5%) | 568/669 (84.9%) | 445/527 (84.4%) | 448/527 (85.0%) |
| alternatives | 641/669 (95.8%) | 641/669 (95.8%) | 527/527 (100.0%) | 527/527 (100.0%) |
| optional | 656/669 (98.1%) | 656/669 (98.1%) | 515/527 (97.7%) | 515/527 (97.7%) |
| approximate | 653/669 (97.6%) | 653/669 (97.6%) | 511/527 (97.0%) | 511/527 (97.0%) |
| amountUnstated | 632/669 (94.5%) | 632/669 (94.5%) | 491/527 (93.2%) | 491/527 (93.2%) |

### dev — 182 lines (152 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 62/182 | 34.1% | 27.6%–41.2% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 62/182 | 34.1% | 27.6%–41.2% |
| Core pass, ready-labelled lines (strict) | 54/152 | 35.5% | 28.4%–43.4% |
| Core pass, ready-labelled lines (accepted) | 54/152 | 35.5% | 28.4%–43.4% |
| Full pass (every field), all lines (strict) | 62/182 | 34.1% | 27.6%–41.2% |
| Full pass (every field), all lines (accepted) | 62/182 | 34.1% | 27.6%–41.2% |
| Full pass, ready-labelled lines (strict) | 54/152 | 35.5% | 28.4%–43.4% |
| Full pass, ready-labelled lines (accepted) | 54/152 | 35.5% | 28.4%–43.4% |
| Review rate (engine not ready) | 122/182 | 67.0% | 59.9%–73.5% |
| Unnecessary review (label ready, engine not) | 92/152 | 60.5% | 52.6%–68.0% |
| **False certainty, total** (of all lines) | 6/182 | 3.3% | 1.5%–7.0% |
| False certainty — high | 1/182 | 0.5% | 0.1%–3.0% |
| False certainty — medium | 5/182 | 2.8% | 1.2%–6.3% |
| False certainty — low | 0/182 | 0.0% | 0.0%–2.1% |
| False certainty (of engine-ready lines) | 6/60 | 10.0% | 4.7%–20.2% |
| Suppressed ambiguity (of not-ready labels) | 0/30 | 0.0% | 0.0%–11.3% |
| Wrong amount on a ready reading (of ready labels) | 1/152 | 0.7% | 0.1%–3.6% |
| Wrong name on a ready reading (of ready labels) | 5/152 | 3.3% | 1.4%–7.5% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/60 | 0.0% | 0.0%–6.0% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/29 | 0.0% | 0.0%–11.7% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/157 | 0.0% | 0.0%–2.4% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 85/182 (46.7%) | 85/182 (46.7%) | 60/152 (39.5%) | 60/152 (39.5%) |
| name | 73/182 (40.1%) | 73/182 (40.1%) | 65/152 (42.8%) | 65/152 (42.8%) |
| quantity | 104/182 (57.1%) | 104/182 (57.1%) | 87/152 (57.2%) | 87/152 (57.2%) |
| unit | 84/182 (46.2%) | 84/182 (46.2%) | 71/152 (46.7%) | 71/152 (46.7%) |
| packageSize | 171/182 (94.0%) | 171/182 (94.0%) | 141/152 (92.8%) | 141/152 (92.8%) |
| equivalents | 175/182 (96.2%) | 175/182 (96.2%) | 145/152 (95.4%) | 145/152 (95.4%) |
| form | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| note | 160/182 (87.9%) | 160/182 (87.9%) | 133/152 (87.5%) | 133/152 (87.5%) |
| alternatives | 175/182 (96.2%) | 175/182 (96.2%) | 152/152 (100.0%) | 152/152 (100.0%) |
| optional | 178/182 (97.8%) | 178/182 (97.8%) | 148/152 (97.4%) | 148/152 (97.4%) |
| approximate | 178/182 (97.8%) | 178/182 (97.8%) | 148/152 (97.4%) | 148/152 (97.4%) |
| amountUnstated | 170/182 (93.4%) | 170/182 (93.4%) | 140/152 (92.1%) | 140/152 (92.1%) |

### holdout — 128 lines (104 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 44/128 | 34.4% | 26.7%–43.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 44/128 | 34.4% | 26.7%–43.0% |
| Core pass, ready-labelled lines (strict) | 37/104 | 35.6% | 27.0%–45.1% |
| Core pass, ready-labelled lines (accepted) | 37/104 | 35.6% | 27.0%–45.1% |
| Full pass (every field), all lines (strict) | 44/128 | 34.4% | 26.7%–43.0% |
| Full pass (every field), all lines (accepted) | 44/128 | 34.4% | 26.7%–43.0% |
| Full pass, ready-labelled lines (strict) | 37/104 | 35.6% | 27.0%–45.1% |
| Full pass, ready-labelled lines (accepted) | 37/104 | 35.6% | 27.0%–45.1% |
| Review rate (engine not ready) | 87/128 | 68.0% | 59.5%–75.4% |
| Unnecessary review (label ready, engine not) | 63/104 | 60.6% | 51.0%–69.4% |
| **False certainty, total** (of all lines) | 4/128 | 3.1% | 1.2%–7.8% |
| False certainty — high | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty — medium | 4/128 | 3.1% | 1.2%–7.8% |
| False certainty — low | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty (of engine-ready lines) | 4/41 | 9.8% | 3.9%–22.6% |
| Suppressed ambiguity (of not-ready labels) | 0/24 | 0.0% | 0.0%–13.8% |
| Wrong amount on a ready reading (of ready labels) | 0/104 | 0.0% | 0.0%–3.6% |
| Wrong name on a ready reading (of ready labels) | 4/104 | 3.9% | 1.5%–9.5% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/41 | 0.0% | 0.0%–8.6% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/23 | 0.0% | 0.0%–14.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/109 | 0.0% | 0.0%–3.4% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 61/128 (47.7%) | 61/128 (47.7%) | 41/104 (39.4%) | 41/104 (39.4%) |
| name | 53/128 (41.4%) | 53/128 (41.4%) | 46/104 (44.2%) | 46/104 (44.2%) |
| quantity | 76/128 (59.4%) | 76/128 (59.4%) | 61/104 (58.7%) | 61/104 (58.7%) |
| unit | 60/128 (46.9%) | 60/128 (46.9%) | 49/104 (47.1%) | 49/104 (47.1%) |
| packageSize | 122/128 (95.3%) | 122/128 (95.3%) | 98/104 (94.2%) | 98/104 (94.2%) |
| equivalents | 124/128 (96.9%) | 124/128 (96.9%) | 100/104 (96.2%) | 100/104 (96.2%) |
| form | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| note | 108/128 (84.4%) | 108/128 (84.4%) | 88/104 (84.6%) | 88/104 (84.6%) |
| alternatives | 124/128 (96.9%) | 124/128 (96.9%) | 104/104 (100.0%) | 104/104 (100.0%) |
| optional | 125/128 (97.7%) | 125/128 (97.7%) | 101/104 (97.1%) | 101/104 (97.1%) |
| approximate | 125/128 (97.7%) | 125/128 (97.7%) | 101/104 (97.1%) | 101/104 (97.1%) |
| amountUnstated | 120/128 (93.8%) | 120/128 (93.8%) | 96/104 (92.3%) | 96/104 (92.3%) |

### holdout2 — 359 lines (271 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 103/359 | 28.7% | 24.3%–33.6% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 103/359 | 28.7% | 24.3%–33.6% |
| Core pass, ready-labelled lines (strict) | 73/271 | 26.9% | 22.0%–32.5% |
| Core pass, ready-labelled lines (accepted) | 73/271 | 26.9% | 22.0%–32.5% |
| Full pass (every field), all lines (strict) | 99/359 | 27.6% | 23.2%–32.4% |
| Full pass (every field), all lines (accepted) | 100/359 | 27.9% | 23.5%–32.7% |
| Full pass, ready-labelled lines (strict) | 70/271 | 25.8% | 21.0%–31.4% |
| Full pass, ready-labelled lines (accepted) | 71/271 | 26.2% | 21.3%–31.7% |
| Review rate (engine not ready) | 265/359 | 73.8% | 69.0%–78.1% |
| Unnecessary review (label ready, engine not) | 177/271 | 65.3% | 59.5%–70.7% |
| **False certainty, total** (of all lines) | 21/359 | 5.9% | 3.9%–8.8% |
| False certainty — high | 11/359 | 3.1% | 1.7%–5.4% |
| False certainty — medium | 10/359 | 2.8% | 1.5%–5.1% |
| False certainty — low | 0/359 | 0.0% | 0.0%–1.1% |
| False certainty (of engine-ready lines) | 21/94 | 22.3% | 15.1%–31.8% |
| Suppressed ambiguity (of not-ready labels) | 0/88 | 0.0% | 0.0%–4.2% |
| Wrong amount on a ready reading (of ready labels) | 11/271 | 4.1% | 2.3%–7.1% |
| Wrong name on a ready reading (of ready labels) | 10/271 | 3.7% | 2.0%–6.7% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 2/94 | 2.1% | 0.6%–7.4% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/73 | 0.0% | 0.0%–5.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 5/293 | 1.7% | 0.7%–3.9% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 165/359 (46.0%) | 165/359 (46.0%) | 94/271 (34.7%) | 94/271 (34.7%) |
| name | 130/359 (36.2%) | 130/359 (36.2%) | 97/271 (35.8%) | 97/271 (35.8%) |
| quantity | 180/359 (50.1%) | 180/359 (50.1%) | 123/271 (45.4%) | 123/271 (45.4%) |
| unit | 149/359 (41.5%) | 149/359 (41.5%) | 99/271 (36.5%) | 99/271 (36.5%) |
| packageSize | 326/359 (90.8%) | 326/359 (90.8%) | 241/271 (88.9%) | 241/271 (88.9%) |
| equivalents | 336/359 (93.6%) | 336/359 (93.6%) | 248/271 (91.5%) | 248/271 (91.5%) |
| form | 357/359 (99.4%) | 357/359 (99.4%) | 270/271 (99.6%) | 270/271 (99.6%) |
| note | 297/359 (82.7%) | 300/359 (83.6%) | 224/271 (82.7%) | 227/271 (83.8%) |
| alternatives | 342/359 (95.3%) | 342/359 (95.3%) | 271/271 (100.0%) | 271/271 (100.0%) |
| optional | 353/359 (98.3%) | 353/359 (98.3%) | 266/271 (98.2%) | 266/271 (98.2%) |
| approximate | 350/359 (97.5%) | 350/359 (97.5%) | 262/271 (96.7%) | 262/271 (96.7%) |
| amountUnstated | 342/359 (95.3%) | 342/359 (95.3%) | 255/271 (94.1%) | 255/271 (94.1%) |

### By category (every)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 38 | 31/38 | 31/38 | 7/38 | 0/0/0 | 0/4 | 0/38 |
| fraction | 32 | 20/32 | 20/32 | 12/32 | 0/0/0 | 0/0 | 0/32 |
| fraction_third | 37 | 0/37 | 0/37 | 37/37 | 0/0/0 | 0/0 | 0/37 |
| mixed_vulgar | 46 | 17/46 | 17/46 | 29/46 | 0/0/0 | 0/0 | 0/46 |
| nested_parens | 18 | 1/18 | 1/18 | 12/18 | 0/5/0 | 0/0 | 0/18 |
| prep_note | 140 | 55/140 | 54/140 | 75/140 | 4/9/0 | 0/3 | 1/137 |
| source_choice | 20 | 0/20 | 0/20 | 20/20 | 0/0/0 | 0/0 | 0/20 |
| ingredient_alternatives | 28 | 0/28 | 0/28 | 28/28 | 0/0/0 | 0/2 | 0/26 |
| range | 24 | 0/24 | 0/24 | 24/24 | 0/0/0 | 0/0 | 0/24 |
| optional | 13 | 1/13 | 0/13 | 13/13 | 0/0/0 | 0/2 | 0/11 |
| unstated_amount | 45 | 3/45 | 3/45 | 42/45 | 0/0/0 | 0/37 | 0/8 |
| quantity_missing | 41 | 38/41 | 37/41 | 41/41 | 0/0/0 | 0/41 | 0/1 |
| count_unit | 86 | 0/86 | 0/86 | 79/86 | 7/0/0 | 0/1 | 0/86 |
| package_size | 50 | 0/50 | 0/50 | 50/50 | 0/0/0 | 0/0 | 0/50 |
| oz_vs_floz | 39 | 19/39 | 19/39 | 18/39 | 1/1/0 | 0/0 | 1/39 |
| compound_quantity | 20 | 0/20 | 0/20 | 20/20 | 0/0/0 | 0/0 | 0/20 |
| equivalent_quantity | 34 | 0/34 | 0/34 | 34/34 | 0/0/0 | 0/0 | 0/34 |
| percentage | 14 | 0/14 | 0/14 | 14/14 | 0/0/0 | 0/0 | 0/14 |
| price_annotation | 18 | 12/18 | 12/18 | 6/18 | 1/0/0 | 0/1 | 0/17 |
| form_cooked_raw | 15 | 1/15 | 0/15 | 2/15 | 0/12/0 | 0/0 | 0/15 |
| number_word | 37 | 0/37 | 0/37 | 37/37 | 0/0/0 | 0/0 | 0/37 |
| approximate | 16 | 1/16 | 0/16 | 15/16 | 0/0/0 | 0/0 | 0/16 |
| imprecise_unit | 23 | 0/23 | 0/23 | 20/23 | 3/0/0 | 0/0 | 3/23 |
| heading_non_ingredient | 25 | 0/25 | 0/25 | 25/25 | 0/0/0 | 0/25 | 0/0 |
| empty | 8 | 7/8 | 7/8 | 8/8 | 0/0/0 | 0/8 | 0/0 |
| unicode_text | 39 | 18/39 | 18/39 | 26/39 | 0/0/0 | 0/9 | 0/30 |
| ambiguous_number_format | 10 | 0/10 | 0/10 | 10/10 | 0/0/0 | 0/10 | 0/10 |
| size_word | 29 | 13/29 | 13/29 | 10/29 | 5/2/0 | 0/1 | 3/28 |
| seasoning_lookalike | 56 | 39/56 | 39/56 | 29/56 | 0/0/0 | 0/13 | 0/43 |
| seasoning_ordinary | 37 | 24/37 | 24/37 | 27/37 | 0/0/0 | 0/23 | 0/14 |
| quart_pint_gallon | 16 | 0/16 | 0/16 | 15/16 | 1/0/0 | 0/0 | 1/16 |
| long_line | 8 | 6/8 | 5/8 | 2/8 | 0/0/0 | 0/0 | 0/8 |
| quantity_after_name | 33 | 0/33 | 0/33 | 33/33 | 0/0/0 | 0/1 | 0/33 |

### Mismatches (464 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-dev-0001 | status | ready | needs_review | no |  |
| ing-dev-0001 | name | pesto | 1/3 cup pesto (homemade ) | no |  |
| ing-dev-0001 | quantity | 1/3 | null | no |  |
| ing-dev-0001 | unit | cup | null | no |  |
| ing-dev-0001 | note | homemade or store-bought | or store-bought | no |  |
| ing-dev-0002 | status | ready | needs_review | no |  |
| ing-dev-0002 | name | rolled oats | 1⅓ cups rolled oats | no |  |
| ing-dev-0002 | quantity | 1 1/3 | null | no |  |
| ing-dev-0002 | unit | cup | null | no |  |
| ing-dev-0003 | status | ready | needs_review | no |  |
| ing-dev-0003 | name | black beans | 2 (15 oz) cans black beans | no |  |
| ing-dev-0003 | quantity | 2 | null | no |  |
| ing-dev-0003 | unit | can | null | no |  |
| ing-dev-0003 | packageSize | 15 oz | null | no |  |
| ing-dev-0004 | status | ready | needs_review | no |  |
| ing-dev-0004 | name | 2% milk | 1 cup 2% milk | no |  |
| ing-dev-0004 | quantity | 1 | null | no |  |
| ing-dev-0004 | unit | cup | null | no |  |
| ing-dev-0005 | name | null | 1 cup milk or cream | no |  |
| ing-dev-0005 | quantity | 1 | null | no |  |
| ing-dev-0005 | unit | cup | null | no |  |
| ing-dev-0005 | alternatives | milk \| cream | [] | no |  |
| ing-dev-0006 | status | ready | needs_review | no |  |
| ing-dev-0006 | name | salt and pepper | salt and pepper to taste | no |  |
| ing-dev-0006 | amountUnstated | to_taste | null | no |  |
| ing-dev-0007 | status | ready | needs_review | no |  |
| ing-dev-0007 | note | null | to taste | no |  |
| ing-dev-0007 | amountUnstated | to_taste | null | no |  |
| ing-dev-0012 | status | ready | needs_review | no |  |
| ing-dev-0012 | name | garlic | cloves garlic | no |  |
| ing-dev-0012 | unit | clove | null | no |  |
| ing-dev-0021 | name | shredded coconut | 0 cups shredded coconut | no |  |
| ing-dev-0021 | unit | cup | null | no |  |
| ing-dev-0026 | status | ready | needs_review | no |  |
| ing-dev-0026 | name | brown sugar | 2/3 cup brown sugar | no |  |
| ing-dev-0026 | quantity | 2/3 | null | no |  |
| ing-dev-0026 | unit | cup | null | no |  |
| ing-dev-0027 | status | ready | needs_review | no |  |
| ing-dev-0027 | name | whole milk | 1 2/3 cups whole milk | no |  |
| ing-dev-0027 | quantity | 1 2/3 | null | no |  |
| ing-dev-0027 | unit | cup | null | no |  |
| ing-dev-0028 | status | ready | needs_review | no |  |
| ing-dev-0028 | name | maple syrup | 1/6 cup maple syrup | no |  |
| ing-dev-0028 | quantity | 1/6 | null | no |  |
| ing-dev-0028 | unit | cup | null | no |  |
| ing-dev-0029 | status | ready | needs_review | no |  |
| ing-dev-0029 | name | heavy cream | ⅔ cup heavy cream | no |  |
| ing-dev-0029 | quantity | 2/3 | null | no |  |
| ing-dev-0029 | unit | cup | null | no |  |
| ing-dev-0030 | status | ready | needs_review | no |  |
| ing-dev-0030 | name | olive oil | 1/3 cup olive oil | no |  |
| ing-dev-0030 | quantity | 1/3 | null | no |  |
| ing-dev-0030 | unit | cup | null | no |  |
| ing-dev-0031 | status | ready | needs_review | no |  |
| ing-dev-0031 | name | chicken stock | 2 1/6 cups chicken stock | no |  |
| ing-dev-0031 | quantity | 2 1/6 | null | no |  |
| ing-dev-0031 | unit | cup | null | no |  |
| ing-dev-0032 | status | ready | needs_review | no |  |
| ing-dev-0032 | name | shredded cheddar cheese | 1-1/2 cups shredded cheddar cheese | no |  |
| ing-dev-0032 | quantity | 1 1/2 | null | no |  |
| ing-dev-0032 | unit | cup | null | no |  |
| ing-dev-0038 | status | ready | needs_review | no |  |
| ing-dev-0038 | name | marinara sauce | 1 cup marinara sauce (homemade ) | no |  |
| ing-dev-0038 | quantity | 1 | null | no |  |
| ing-dev-0038 | unit | cup | null | no |  |
| ing-dev-0038 | note | homemade or jarred | or jarred | no |  |
| ing-dev-0039 | name | chicken stock | chicken stock (low-sodium ) | no | wrong_name (medium) |
| ing-dev-0039 | note | low-sodium if possible | if possible | no | wrong_name (medium) |
| ing-dev-0040 | status | ready | needs_review | no |  |
| ing-dev-0040 | name | frozen spinach | 1 (16 oz) bag frozen spinach (thawed ) | no |  |
| ing-dev-0040 | quantity | 1 | null | no |  |
| ing-dev-0040 | unit | bag | null | no |  |
| ing-dev-0040 | packageSize | 16 oz | null | no |  |
| ing-dev-0040 | note | thawed squeeze out the water | squeeze out the water | no |  |
| ing-dev-0045 | status | ready | needs_review | no |  |
| ing-dev-0045 | name | salt | 1 tsp salt | no |  |
| ing-dev-0045 | quantity | 1 | null | no |  |
| ing-dev-0045 | unit | tsp | null | no |  |
| ing-dev-0047 | status | ready | needs_review | no |  |
| ing-dev-0047 | name | corn kernels | 1 cup corn kernels | no |  |
| ing-dev-0047 | quantity | 1 | null | no |  |
| ing-dev-0047 | unit | cup | null | no |  |
| ing-dev-0048 | status | ready | needs_review | no |  |
| ing-dev-0048 | name | spinach | 2 cups spinach | no |  |
| ing-dev-0048 | quantity | 2 | null | no |  |
| ing-dev-0048 | unit | cup | null | no |  |
| ing-dev-0049 | status | ready | needs_review | no |  |
| ing-dev-0049 | name | salsa | 1/2 cup salsa | no |  |
| ing-dev-0049 | quantity | 1/2 | null | no |  |
| ing-dev-0049 | unit | cup | null | no |  |
| ing-dev-0050 | name | null | 2 cups fresh or frozen peas | no |  |
| ing-dev-0050 | quantity | 2 | null | no |  |
| ing-dev-0050 | unit | cup | null | no |  |
| ing-dev-0050 | alternatives | fresh peas \| frozen peas | [] | no |  |
| ing-dev-0051 | name | null | 2 tbsp butter or margarine | no |  |
| ing-dev-0051 | quantity | 2 | null | no |  |
| ing-dev-0051 | unit | tbsp | null | no |  |
| ing-dev-0051 | alternatives | butter \| margarine | [] | no |  |
| ing-dev-0052 | name | null | 4 cups chicken or vegetable broth | no |  |
| ing-dev-0052 | quantity | 4 | null | no |  |
| ing-dev-0052 | unit | cup | null | no |  |
| ing-dev-0052 | alternatives | chicken broth \| vegetable broth | [] | no |  |
| ing-dev-0053 | name | null | 1/4 cup honey or maple syrup | no |  |
| ing-dev-0053 | quantity | 1/4 | null | no |  |
| ing-dev-0053 | unit | cup | null | no |  |
| ing-dev-0053 | alternatives | honey \| maple syrup | [] | no |  |
| ing-dev-0054 | name | null | 1 tbsp lemon or lime juice | no |  |
| ing-dev-0054 | quantity | 1 | null | no |  |
| ing-dev-0054 | unit | tbsp | null | no |  |
| ing-dev-0054 | alternatives | lemon juice \| lime juice | [] | no |  |
| ing-dev-0055 | name | null | 1 lb ground beef or turkey | no |  |
| ing-dev-0055 | quantity | 1 | null | no |  |
| ing-dev-0055 | unit | lb | null | no |  |
| ing-dev-0055 | alternatives | ground beef \| ground turkey | [] | no |  |
| ing-dev-0056 | name | garlic | 2-3 cloves garlic | no |  |
| ing-dev-0056 | quantity | 2..3 | null | no |  |
| ing-dev-0056 | unit | clove | null | no |  |
| ing-dev-0057 | name | olive oil | 1 to 2 tbsp olive oil | no |  |
| ing-dev-0057 | quantity | 1..2 | null | no |  |
| ing-dev-0057 | unit | tbsp | null | no |  |
| ing-dev-0058 | name | lemon juice | 2–3 tbsp lemon juice | no |  |
| ing-dev-0058 | quantity | 2..3 | null | no |  |
| ing-dev-0058 | unit | tbsp | null | no |  |
| ing-dev-0059 | name | jalapeños | 1 or 2 jalapeños | no |  |
| ing-dev-0059 | quantity | 1..2 | null | no |  |
| ing-dev-0059 | unit | each | null | no |  |
| ing-dev-0060 | name | pork shoulder | 3-4 lb pork shoulder | no |  |
| ing-dev-0060 | quantity | 3..4 | null | no |  |
| ing-dev-0060 | unit | lb | null | no |  |
| ing-dev-0061 | name | red pepper flakes | 1/2-1 tsp red pepper flakes | no |  |
| ing-dev-0061 | quantity | 1/2..1 | null | no |  |
| ing-dev-0061 | unit | tsp | null | no |  |
| ing-dev-0062 | status | ready | needs_review | no |  |
| ing-dev-0062 | name | chopped pecans | 1/4 cup chopped pecans | no |  |
| ing-dev-0062 | quantity | 1/4 | null | no |  |
| ing-dev-0062 | unit | cup | null | no |  |
| ing-dev-0062 | note | null | optional | no |  |
| ing-dev-0062 | optional | true | false | no |  |
| ing-dev-0063 | status | ready | needs_review | no |  |
| ing-dev-0063 | name | capers | 2 tbsp capers | no |  |
| ing-dev-0063 | quantity | 2 | null | no |  |
| ing-dev-0063 | unit | tbsp | null | no |  |
| ing-dev-0063 | note | null | optional | no |  |
| ing-dev-0063 | optional | true | false | no |  |
| ing-dev-0064 | status | ready | needs_review | no |  |
| ing-dev-0064 | name | chili flakes | optional: 1 tsp chili flakes | no |  |
| ing-dev-0064 | quantity | 1 | null | no |  |
| ing-dev-0064 | unit | tsp | null | no |  |
| ing-dev-0064 | optional | true | false | no |  |
| ing-dev-0065 | status | ready | needs_review | no |  |
| ing-dev-0065 | name | shredded mozzarella | 1 cup shredded mozzarella | no |  |
| ing-dev-0065 | quantity | 1 | null | no |  |
| ing-dev-0065 | unit | cup | null | no |  |
| ing-dev-0065 | note | null | optional | no |  |
| ing-dev-0065 | optional | true | false | no |  |
| ing-dev-0066 | status | ready | needs_review | no |  |
| ing-dev-0066 | note | null | as needed | no |  |
| ing-dev-0066 | amountUnstated | as_needed | null | no |  |
| ing-dev-0067 | status | ready | needs_review | no |  |
| ing-dev-0067 | note | null | for serving | no |  |
| ing-dev-0067 | amountUnstated | for_serving | null | no |  |
| ing-dev-0068 | status | ready | needs_review | no |  |
| ing-dev-0068 | note | null | for garnish | no |  |
| ing-dev-0068 | amountUnstated | for_garnish | null | no |  |
| ing-dev-0069 | status | ready | needs_review | no |  |
| ing-dev-0069 | note | null | for dusting | no |  |
| ing-dev-0069 | amountUnstated | other | null | no |  |
| ing-dev-0070 | status | ready | needs_review | no |  |
| ing-dev-0070 | name | vegetable oil | vegetable oil for frying | no |  |
| ing-dev-0070 | amountUnstated | other | null | no |  |
| ing-dev-0071 | status | ready | needs_review | no |  |
| ing-dev-0071 | name | salt | salt to taste | no |  |
| ing-dev-0071 | amountUnstated | to_taste | null | no |  |
| ing-dev-0072 | status | ready | needs_review | no |  |
| ing-dev-0072 | note | null | to taste | no |  |
| ing-dev-0072 | amountUnstated | to_taste | null | no |  |
| ing-dev-0073 | status | ready | needs_review | no |  |
| ing-dev-0073 | note | null | to garnish | no |  |
| ing-dev-0073 | amountUnstated | for_garnish | null | no |  |
| ing-dev-0074 | status | ready | needs_review | no |  |
| ing-dev-0074 | note | null | if needed | no |  |
| ing-dev-0074 | amountUnstated | as_needed | null | no |  |
| ing-dev-0075 | status | ready | needs_review | no |  |
| ing-dev-0075 | note | null | as desired | no |  |
| ing-dev-0075 | amountUnstated | as_needed | null | no |  |
| ing-dev-0081 | status | ready | needs_review | no |  |
| ing-dev-0081 | name | fresh thyme | sprigs fresh thyme | no |  |
| ing-dev-0081 | unit | sprig | null | no |  |
| ing-dev-0082 | status | ready | needs_review | no |  |
| ing-dev-0082 | name | cilantro | bunch cilantro | no |  |
| ing-dev-0082 | unit | bunch | null | no |  |
| ing-dev-0083 | status | ready | needs_review | no |  |
| ing-dev-0083 | name | celery | stalks celery | no |  |
| ing-dev-0083 | unit | stalk | null | no |  |
| ing-dev-0084 | status | ready | needs_review | no |  |
| ing-dev-0084 | name | bacon | slices bacon | no |  |
| ing-dev-0084 | unit | slice | null | no |  |
| ing-dev-0085 | status | ready | needs_review | no |  |
| ing-dev-0085 | name | butter | stick butter | no |  |
| ing-dev-0085 | unit | stick | null | no |  |

(1540 more row(s) in the JSON report.)

## Ingredient engine `legacy-table-import-2+suggestion`

Benchmark only: legacy-table-import-2 with the legacy one-click suggestion filled in (rounded thirds stay 0.3333). Status stays needs_review with legacy_suggestion_applied.

### Overall — 669 lines (527 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 210/669 | 31.4% | 28.0%–35.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 210/669 | 31.4% | 28.0%–35.0% |
| Core pass, ready-labelled lines (strict) | 164/527 | 31.1% | 27.3%–35.2% |
| Core pass, ready-labelled lines (accepted) | 164/527 | 31.1% | 27.3%–35.2% |
| Full pass (every field), all lines (strict) | 205/669 | 30.6% | 27.3%–34.2% |
| Full pass (every field), all lines (accepted) | 206/669 | 30.8% | 27.4%–34.4% |
| Full pass, ready-labelled lines (strict) | 161/527 | 30.6% | 26.8%–34.6% |
| Full pass, ready-labelled lines (accepted) | 162/527 | 30.7% | 27.0%–34.8% |
| Review rate (engine not ready) | 474/669 | 70.9% | 67.3%–74.2% |
| Unnecessary review (label ready, engine not) | 332/527 | 63.0% | 58.8%–67.0% |
| **False certainty, total** (of all lines) | 31/669 | 4.6% | 3.3%–6.5% |
| False certainty — high | 12/669 | 1.8% | 1.0%–3.1% |
| False certainty — medium | 19/669 | 2.8% | 1.8%–4.4% |
| False certainty — low | 0/669 | 0.0% | 0.0%–0.6% |
| False certainty (of engine-ready lines) | 31/195 | 15.9% | 11.4%–21.7% |
| Suppressed ambiguity (of not-ready labels) | 0/142 | 0.0% | 0.0%–2.6% |
| Wrong amount on a ready reading (of ready labels) | 12/527 | 2.3% | 1.3%–3.9% |
| Wrong name on a ready reading (of ready labels) | 19/527 | 3.6% | 2.3%–5.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 2/195 | 1.0% | 0.3%–3.7% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/125 | 0.0% | 0.0%–3.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 43/559 | 7.7% | 5.8%–10.2% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 311/669 (46.5%) | 311/669 (46.5%) | 195/527 (37.0%) | 195/527 (37.0%) |
| name | 397/669 (59.3%) | 397/669 (59.3%) | 329/527 (62.4%) | 329/527 (62.4%) |
| quantity | 416/669 (62.2%) | 416/669 (62.2%) | 311/527 (59.0%) | 311/527 (59.0%) |
| unit | 402/669 (60.1%) | 402/669 (60.1%) | 294/527 (55.8%) | 294/527 (55.8%) |
| packageSize | 619/669 (92.5%) | 619/669 (92.5%) | 480/527 (91.1%) | 480/527 (91.1%) |
| equivalents | 635/669 (94.9%) | 635/669 (94.9%) | 493/527 (93.5%) | 493/527 (93.5%) |
| form | 478/669 (71.5%) | 478/669 (71.5%) | 373/527 (70.8%) | 373/527 (70.8%) |
| note | 565/669 (84.5%) | 568/669 (84.9%) | 445/527 (84.4%) | 448/527 (85.0%) |
| alternatives | 641/669 (95.8%) | 641/669 (95.8%) | 527/527 (100.0%) | 527/527 (100.0%) |
| optional | 656/669 (98.1%) | 656/669 (98.1%) | 515/527 (97.7%) | 515/527 (97.7%) |
| approximate | 653/669 (97.6%) | 653/669 (97.6%) | 511/527 (97.0%) | 511/527 (97.0%) |
| amountUnstated | 632/669 (94.5%) | 632/669 (94.5%) | 491/527 (93.2%) | 491/527 (93.2%) |

### dev — 182 lines (152 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 62/182 | 34.1% | 27.6%–41.2% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 62/182 | 34.1% | 27.6%–41.2% |
| Core pass, ready-labelled lines (strict) | 54/152 | 35.5% | 28.4%–43.4% |
| Core pass, ready-labelled lines (accepted) | 54/152 | 35.5% | 28.4%–43.4% |
| Full pass (every field), all lines (strict) | 62/182 | 34.1% | 27.6%–41.2% |
| Full pass (every field), all lines (accepted) | 62/182 | 34.1% | 27.6%–41.2% |
| Full pass, ready-labelled lines (strict) | 54/152 | 35.5% | 28.4%–43.4% |
| Full pass, ready-labelled lines (accepted) | 54/152 | 35.5% | 28.4%–43.4% |
| Review rate (engine not ready) | 122/182 | 67.0% | 59.9%–73.5% |
| Unnecessary review (label ready, engine not) | 92/152 | 60.5% | 52.6%–68.0% |
| **False certainty, total** (of all lines) | 6/182 | 3.3% | 1.5%–7.0% |
| False certainty — high | 1/182 | 0.5% | 0.1%–3.0% |
| False certainty — medium | 5/182 | 2.8% | 1.2%–6.3% |
| False certainty — low | 0/182 | 0.0% | 0.0%–2.1% |
| False certainty (of engine-ready lines) | 6/60 | 10.0% | 4.7%–20.2% |
| Suppressed ambiguity (of not-ready labels) | 0/30 | 0.0% | 0.0%–11.3% |
| Wrong amount on a ready reading (of ready labels) | 1/152 | 0.7% | 0.1%–3.6% |
| Wrong name on a ready reading (of ready labels) | 5/152 | 3.3% | 1.4%–7.5% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/60 | 0.0% | 0.0%–6.0% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/29 | 0.0% | 0.0%–11.7% |
| **Cross-dimension** (of lines with a labelled unit or package) | 10/157 | 6.4% | 3.5%–11.3% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 85/182 (46.7%) | 85/182 (46.7%) | 60/152 (39.5%) | 60/152 (39.5%) |
| name | 116/182 (63.7%) | 116/182 (63.7%) | 103/152 (67.8%) | 103/152 (67.8%) |
| quantity | 117/182 (64.3%) | 117/182 (64.3%) | 97/152 (63.8%) | 97/152 (63.8%) |
| unit | 116/182 (63.7%) | 116/182 (63.7%) | 95/152 (62.5%) | 95/152 (62.5%) |
| packageSize | 171/182 (94.0%) | 171/182 (94.0%) | 141/152 (92.8%) | 141/152 (92.8%) |
| equivalents | 175/182 (96.2%) | 175/182 (96.2%) | 145/152 (95.4%) | 145/152 (95.4%) |
| form | 125/182 (68.7%) | 125/182 (68.7%) | 104/152 (68.4%) | 104/152 (68.4%) |
| note | 160/182 (87.9%) | 160/182 (87.9%) | 133/152 (87.5%) | 133/152 (87.5%) |
| alternatives | 175/182 (96.2%) | 175/182 (96.2%) | 152/152 (100.0%) | 152/152 (100.0%) |
| optional | 178/182 (97.8%) | 178/182 (97.8%) | 148/152 (97.4%) | 148/152 (97.4%) |
| approximate | 178/182 (97.8%) | 178/182 (97.8%) | 148/152 (97.4%) | 148/152 (97.4%) |
| amountUnstated | 170/182 (93.4%) | 170/182 (93.4%) | 140/152 (92.1%) | 140/152 (92.1%) |

### holdout — 128 lines (104 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 44/128 | 34.4% | 26.7%–43.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 44/128 | 34.4% | 26.7%–43.0% |
| Core pass, ready-labelled lines (strict) | 37/104 | 35.6% | 27.0%–45.1% |
| Core pass, ready-labelled lines (accepted) | 37/104 | 35.6% | 27.0%–45.1% |
| Full pass (every field), all lines (strict) | 44/128 | 34.4% | 26.7%–43.0% |
| Full pass (every field), all lines (accepted) | 44/128 | 34.4% | 26.7%–43.0% |
| Full pass, ready-labelled lines (strict) | 37/104 | 35.6% | 27.0%–45.1% |
| Full pass, ready-labelled lines (accepted) | 37/104 | 35.6% | 27.0%–45.1% |
| Review rate (engine not ready) | 87/128 | 68.0% | 59.5%–75.4% |
| Unnecessary review (label ready, engine not) | 63/104 | 60.6% | 51.0%–69.4% |
| **False certainty, total** (of all lines) | 4/128 | 3.1% | 1.2%–7.8% |
| False certainty — high | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty — medium | 4/128 | 3.1% | 1.2%–7.8% |
| False certainty — low | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty (of engine-ready lines) | 4/41 | 9.8% | 3.9%–22.6% |
| Suppressed ambiguity (of not-ready labels) | 0/24 | 0.0% | 0.0%–13.8% |
| Wrong amount on a ready reading (of ready labels) | 0/104 | 0.0% | 0.0%–3.6% |
| Wrong name on a ready reading (of ready labels) | 4/104 | 3.9% | 1.5%–9.5% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/41 | 0.0% | 0.0%–8.6% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/23 | 0.0% | 0.0%–14.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 5/109 | 4.6% | 2.0%–10.3% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 61/128 (47.7%) | 61/128 (47.7%) | 41/104 (39.4%) | 41/104 (39.4%) |
| name | 81/128 (63.3%) | 81/128 (63.3%) | 69/104 (66.3%) | 69/104 (66.3%) |
| quantity | 81/128 (63.3%) | 81/128 (63.3%) | 64/104 (61.5%) | 64/104 (61.5%) |
| unit | 82/128 (64.1%) | 82/128 (64.1%) | 64/104 (61.5%) | 64/104 (61.5%) |
| packageSize | 122/128 (95.3%) | 122/128 (95.3%) | 98/104 (94.2%) | 98/104 (94.2%) |
| equivalents | 124/128 (96.9%) | 124/128 (96.9%) | 100/104 (96.2%) | 100/104 (96.2%) |
| form | 91/128 (71.1%) | 91/128 (71.1%) | 74/104 (71.2%) | 74/104 (71.2%) |
| note | 108/128 (84.4%) | 108/128 (84.4%) | 88/104 (84.6%) | 88/104 (84.6%) |
| alternatives | 124/128 (96.9%) | 124/128 (96.9%) | 104/104 (100.0%) | 104/104 (100.0%) |
| optional | 125/128 (97.7%) | 125/128 (97.7%) | 101/104 (97.1%) | 101/104 (97.1%) |
| approximate | 125/128 (97.7%) | 125/128 (97.7%) | 101/104 (97.1%) | 101/104 (97.1%) |
| amountUnstated | 120/128 (93.8%) | 120/128 (93.8%) | 96/104 (92.3%) | 96/104 (92.3%) |

### holdout2 — 359 lines (271 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 104/359 | 29.0% | 24.5%–33.9% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 104/359 | 29.0% | 24.5%–33.9% |
| Core pass, ready-labelled lines (strict) | 73/271 | 26.9% | 22.0%–32.5% |
| Core pass, ready-labelled lines (accepted) | 73/271 | 26.9% | 22.0%–32.5% |
| Full pass (every field), all lines (strict) | 99/359 | 27.6% | 23.2%–32.4% |
| Full pass (every field), all lines (accepted) | 100/359 | 27.9% | 23.5%–32.7% |
| Full pass, ready-labelled lines (strict) | 70/271 | 25.8% | 21.0%–31.4% |
| Full pass, ready-labelled lines (accepted) | 71/271 | 26.2% | 21.3%–31.7% |
| Review rate (engine not ready) | 265/359 | 73.8% | 69.0%–78.1% |
| Unnecessary review (label ready, engine not) | 177/271 | 65.3% | 59.5%–70.7% |
| **False certainty, total** (of all lines) | 21/359 | 5.9% | 3.9%–8.8% |
| False certainty — high | 11/359 | 3.1% | 1.7%–5.4% |
| False certainty — medium | 10/359 | 2.8% | 1.5%–5.1% |
| False certainty — low | 0/359 | 0.0% | 0.0%–1.1% |
| False certainty (of engine-ready lines) | 21/94 | 22.3% | 15.1%–31.8% |
| Suppressed ambiguity (of not-ready labels) | 0/88 | 0.0% | 0.0%–4.2% |
| Wrong amount on a ready reading (of ready labels) | 11/271 | 4.1% | 2.3%–7.1% |
| Wrong name on a ready reading (of ready labels) | 10/271 | 3.7% | 2.0%–6.7% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 2/94 | 2.1% | 0.6%–7.4% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/73 | 0.0% | 0.0%–5.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 28/293 | 9.6% | 6.7%–13.5% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 165/359 (46.0%) | 165/359 (46.0%) | 94/271 (34.7%) | 94/271 (34.7%) |
| name | 200/359 (55.7%) | 200/359 (55.7%) | 157/271 (57.9%) | 157/271 (57.9%) |
| quantity | 218/359 (60.7%) | 218/359 (60.7%) | 150/271 (55.4%) | 150/271 (55.4%) |
| unit | 204/359 (56.8%) | 204/359 (56.8%) | 135/271 (49.8%) | 135/271 (49.8%) |
| packageSize | 326/359 (90.8%) | 326/359 (90.8%) | 241/271 (88.9%) | 241/271 (88.9%) |
| equivalents | 336/359 (93.6%) | 336/359 (93.6%) | 248/271 (91.5%) | 248/271 (91.5%) |
| form | 262/359 (73.0%) | 262/359 (73.0%) | 195/271 (72.0%) | 195/271 (72.0%) |
| note | 297/359 (82.7%) | 300/359 (83.6%) | 224/271 (82.7%) | 227/271 (83.8%) |
| alternatives | 342/359 (95.3%) | 342/359 (95.3%) | 271/271 (100.0%) | 271/271 (100.0%) |
| optional | 353/359 (98.3%) | 353/359 (98.3%) | 266/271 (98.2%) | 266/271 (98.2%) |
| approximate | 350/359 (97.5%) | 350/359 (97.5%) | 262/271 (96.7%) | 262/271 (96.7%) |
| amountUnstated | 342/359 (95.3%) | 342/359 (95.3%) | 255/271 (94.1%) | 255/271 (94.1%) |

### By category (every)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 38 | 31/38 | 31/38 | 7/38 | 0/0/0 | 0/4 | 0/38 |
| fraction | 32 | 20/32 | 20/32 | 12/32 | 0/0/0 | 0/0 | 0/32 |
| fraction_third | 37 | 0/37 | 0/37 | 37/37 | 0/0/0 | 0/0 | 1/37 |
| mixed_vulgar | 46 | 17/46 | 17/46 | 29/46 | 0/0/0 | 0/0 | 2/46 |
| nested_parens | 18 | 1/18 | 1/18 | 12/18 | 0/5/0 | 0/0 | 0/18 |
| prep_note | 140 | 56/140 | 54/140 | 75/140 | 4/9/0 | 0/3 | 11/137 |
| source_choice | 20 | 0/20 | 0/20 | 20/20 | 0/0/0 | 0/0 | 0/20 |
| ingredient_alternatives | 28 | 0/28 | 0/28 | 28/28 | 0/0/0 | 0/2 | 0/26 |
| range | 24 | 0/24 | 0/24 | 24/24 | 0/0/0 | 0/0 | 2/24 |
| optional | 13 | 1/13 | 0/13 | 13/13 | 0/0/0 | 0/2 | 0/11 |
| unstated_amount | 45 | 3/45 | 3/45 | 42/45 | 0/0/0 | 0/37 | 0/8 |
| quantity_missing | 41 | 38/41 | 37/41 | 41/41 | 0/0/0 | 0/41 | 0/1 |
| count_unit | 86 | 0/86 | 0/86 | 79/86 | 7/0/0 | 0/1 | 29/86 |
| package_size | 50 | 0/50 | 0/50 | 50/50 | 0/0/0 | 0/0 | 38/50 |
| oz_vs_floz | 39 | 19/39 | 19/39 | 18/39 | 1/1/0 | 0/0 | 7/39 |
| compound_quantity | 20 | 0/20 | 0/20 | 20/20 | 0/0/0 | 0/0 | 0/20 |
| equivalent_quantity | 34 | 0/34 | 0/34 | 34/34 | 0/0/0 | 0/0 | 0/34 |
| percentage | 14 | 0/14 | 0/14 | 14/14 | 0/0/0 | 0/0 | 0/14 |
| price_annotation | 18 | 12/18 | 12/18 | 6/18 | 1/0/0 | 0/1 | 3/17 |
| form_cooked_raw | 15 | 2/15 | 0/15 | 2/15 | 0/12/0 | 0/0 | 0/15 |
| number_word | 37 | 0/37 | 0/37 | 37/37 | 0/0/0 | 0/0 | 0/37 |
| approximate | 16 | 1/16 | 0/16 | 15/16 | 0/0/0 | 0/0 | 0/16 |
| imprecise_unit | 23 | 0/23 | 0/23 | 20/23 | 3/0/0 | 0/0 | 3/23 |
| heading_non_ingredient | 25 | 0/25 | 0/25 | 25/25 | 0/0/0 | 0/25 | 0/0 |
| empty | 8 | 7/8 | 7/8 | 8/8 | 0/0/0 | 0/8 | 0/0 |
| unicode_text | 39 | 18/39 | 18/39 | 26/39 | 0/0/0 | 0/9 | 2/30 |
| ambiguous_number_format | 10 | 0/10 | 0/10 | 10/10 | 0/0/0 | 0/10 | 0/10 |
| size_word | 29 | 13/29 | 13/29 | 10/29 | 5/2/0 | 0/1 | 3/28 |
| seasoning_lookalike | 56 | 39/56 | 39/56 | 29/56 | 0/0/0 | 0/13 | 0/43 |
| seasoning_ordinary | 37 | 24/37 | 24/37 | 27/37 | 0/0/0 | 0/23 | 0/14 |
| quart_pint_gallon | 16 | 0/16 | 0/16 | 15/16 | 1/0/0 | 0/0 | 1/16 |
| long_line | 8 | 6/8 | 5/8 | 2/8 | 0/0/0 | 0/0 | 0/8 |
| quantity_after_name | 33 | 0/33 | 0/33 | 33/33 | 0/0/0 | 0/1 | 0/33 |

### Mismatches (464 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-dev-0001 | status | ready | needs_review | no |  |
| ing-dev-0001 | name | pesto | 1/3 cup pesto (homemade ) | no |  |
| ing-dev-0001 | quantity | 1/3 | null | no |  |
| ing-dev-0001 | unit | cup | null | no |  |
| ing-dev-0001 | note | homemade or store-bought | or store-bought | no |  |
| ing-dev-0002 | status | ready | needs_review | no |  |
| ing-dev-0002 | quantity | 1 1/3 | 1 3333/10000 | no |  |
| ing-dev-0002 | form | null | raw | no |  |
| ing-dev-0003 | status | ready | needs_review | no |  |
| ing-dev-0003 | quantity | 2 | 30 | no |  |
| ing-dev-0003 | unit | can | oz | no |  |
| ing-dev-0003 | packageSize | 15 oz | null | no |  |
| ing-dev-0003 | form | null | raw | no |  |
| ing-dev-0004 | status | ready | needs_review | no |  |
| ing-dev-0004 | name | 2% milk | 1 cup 2% milk | no |  |
| ing-dev-0004 | quantity | 1 | null | no |  |
| ing-dev-0004 | unit | cup | null | no |  |
| ing-dev-0005 | name | null | milk | no |  |
| ing-dev-0005 | form | null | raw | no |  |
| ing-dev-0005 | alternatives | milk \| cream | [] | no |  |
| ing-dev-0006 | status | ready | needs_review | no |  |
| ing-dev-0006 | name | salt and pepper | salt and pepper to taste | no |  |
| ing-dev-0006 | amountUnstated | to_taste | null | no |  |
| ing-dev-0007 | status | ready | needs_review | no |  |
| ing-dev-0007 | note | null | to taste | no |  |
| ing-dev-0007 | amountUnstated | to_taste | null | no |  |
| ing-dev-0012 | status | ready | needs_review | no |  |
| ing-dev-0012 | name | garlic | garlic (clove) | no |  |
| ing-dev-0012 | unit | clove | each | no |  |
| ing-dev-0012 | form | null | raw | no |  |
| ing-dev-0021 | name | shredded coconut | 0 cups shredded coconut | no |  |
| ing-dev-0021 | unit | cup | null | no |  |
| ing-dev-0026 | status | ready | needs_review | no |  |
| ing-dev-0026 | quantity | 2/3 | 6667/10000 | no |  |
| ing-dev-0026 | form | null | raw | no |  |
| ing-dev-0027 | status | ready | needs_review | no |  |
| ing-dev-0027 | quantity | 1 2/3 | 1 6667/10000 | no |  |
| ing-dev-0027 | form | null | raw | no |  |
| ing-dev-0028 | status | ready | needs_review | no |  |
| ing-dev-0028 | quantity | 1/6 | 1667/10000 | no |  |
| ing-dev-0028 | form | null | raw | no |  |
| ing-dev-0029 | status | ready | needs_review | no |  |
| ing-dev-0029 | quantity | 2/3 | 6667/10000 | no |  |
| ing-dev-0029 | form | null | raw | no |  |
| ing-dev-0030 | status | ready | needs_review | no |  |
| ing-dev-0030 | quantity | 1/3 | 3333/10000 | no |  |
| ing-dev-0030 | form | null | raw | no |  |
| ing-dev-0031 | status | ready | needs_review | no |  |
| ing-dev-0031 | quantity | 2 1/6 | 2 1667/10000 | no |  |
| ing-dev-0031 | form | null | raw | no |  |
| ing-dev-0032 | status | ready | needs_review | no |  |
| ing-dev-0032 | quantity | 1 1/2 | 1 | no |  |
| ing-dev-0032 | form | null | raw | no |  |
| ing-dev-0038 | status | ready | needs_review | no |  |
| ing-dev-0038 | name | marinara sauce | 1 cup marinara sauce (homemade ) | no |  |
| ing-dev-0038 | quantity | 1 | null | no |  |
| ing-dev-0038 | unit | cup | null | no |  |
| ing-dev-0038 | note | homemade or jarred | or jarred | no |  |
| ing-dev-0039 | name | chicken stock | chicken stock (low-sodium ) | no | wrong_name (medium) |
| ing-dev-0039 | note | low-sodium if possible | if possible | no | wrong_name (medium) |
| ing-dev-0040 | status | ready | needs_review | no |  |
| ing-dev-0040 | name | frozen spinach | 1 (16 oz) bag frozen spinach (thawed ) | no |  |
| ing-dev-0040 | quantity | 1 | null | no |  |
| ing-dev-0040 | unit | bag | null | no |  |
| ing-dev-0040 | packageSize | 16 oz | null | no |  |
| ing-dev-0040 | note | thawed squeeze out the water | squeeze out the water | no |  |
| ing-dev-0045 | status | ready | needs_review | no |  |
| ing-dev-0045 | form | null | raw | no |  |
| ing-dev-0047 | status | ready | needs_review | no |  |
| ing-dev-0047 | form | null | raw | no |  |
| ing-dev-0048 | status | ready | needs_review | no |  |
| ing-dev-0048 | form | null | raw | no |  |
| ing-dev-0049 | status | ready | needs_review | no |  |
| ing-dev-0049 | form | null | raw | no |  |
| ing-dev-0050 | name | null | 2 cups fresh or frozen peas | no |  |
| ing-dev-0050 | quantity | 2 | null | no |  |
| ing-dev-0050 | unit | cup | null | no |  |
| ing-dev-0050 | alternatives | fresh peas \| frozen peas | [] | no |  |
| ing-dev-0051 | name | null | butter | no |  |
| ing-dev-0051 | form | null | raw | no |  |
| ing-dev-0051 | alternatives | butter \| margarine | [] | no |  |
| ing-dev-0052 | name | null | 4 cups chicken or vegetable broth | no |  |
| ing-dev-0052 | quantity | 4 | null | no |  |
| ing-dev-0052 | unit | cup | null | no |  |
| ing-dev-0052 | alternatives | chicken broth \| vegetable broth | [] | no |  |
| ing-dev-0053 | name | null | 1/4 cup honey or maple syrup | no |  |
| ing-dev-0053 | quantity | 1/4 | null | no |  |
| ing-dev-0053 | unit | cup | null | no |  |
| ing-dev-0053 | alternatives | honey \| maple syrup | [] | no |  |
| ing-dev-0054 | name | null | 1 tbsp lemon or lime juice | no |  |
| ing-dev-0054 | quantity | 1 | null | no |  |
| ing-dev-0054 | unit | tbsp | null | no |  |
| ing-dev-0054 | alternatives | lemon juice \| lime juice | [] | no |  |
| ing-dev-0055 | name | null | ground beef | no |  |
| ing-dev-0055 | form | null | raw | no |  |
| ing-dev-0055 | alternatives | ground beef \| ground turkey | [] | no |  |
| ing-dev-0056 | name | garlic | garlic (clove) | no |  |
| ing-dev-0056 | quantity | 2..3 | 3 | no |  |
| ing-dev-0056 | unit | clove | each | no |  |
| ing-dev-0056 | form | null | raw | no |  |
| ing-dev-0057 | quantity | 1..2 | 2 | no |  |
| ing-dev-0057 | form | null | raw | no |  |
| ing-dev-0058 | quantity | 2..3 | 3 | no |  |
| ing-dev-0058 | form | null | raw | no |  |
| ing-dev-0059 | quantity | 1..2 | 2 | no |  |
| ing-dev-0059 | form | null | raw | no |  |
| ing-dev-0060 | quantity | 3..4 | 4 | no |  |
| ing-dev-0060 | form | null | raw | no |  |
| ing-dev-0061 | quantity | 1/2..1 | 1 | no |  |
| ing-dev-0061 | form | null | raw | no |  |
| ing-dev-0062 | status | ready | needs_review | no |  |
| ing-dev-0062 | form | null | raw | no |  |
| ing-dev-0062 | note | null | optional | no |  |
| ing-dev-0062 | optional | true | false | no |  |
| ing-dev-0063 | status | ready | needs_review | no |  |
| ing-dev-0063 | form | null | raw | no |  |
| ing-dev-0063 | note | null | optional | no |  |
| ing-dev-0063 | optional | true | false | no |  |
| ing-dev-0064 | status | ready | needs_review | no |  |
| ing-dev-0064 | name | chili flakes | optional: 1 tsp chili flakes | no |  |
| ing-dev-0064 | quantity | 1 | null | no |  |
| ing-dev-0064 | unit | tsp | null | no |  |
| ing-dev-0064 | optional | true | false | no |  |
| ing-dev-0065 | status | ready | needs_review | no |  |
| ing-dev-0065 | form | null | raw | no |  |
| ing-dev-0065 | note | null | optional | no |  |
| ing-dev-0065 | optional | true | false | no |  |
| ing-dev-0066 | status | ready | needs_review | no |  |
| ing-dev-0066 | note | null | as needed | no |  |
| ing-dev-0066 | amountUnstated | as_needed | null | no |  |
| ing-dev-0067 | status | ready | needs_review | no |  |
| ing-dev-0067 | note | null | for serving | no |  |
| ing-dev-0067 | amountUnstated | for_serving | null | no |  |
| ing-dev-0068 | status | ready | needs_review | no |  |
| ing-dev-0068 | note | null | for garnish | no |  |
| ing-dev-0068 | amountUnstated | for_garnish | null | no |  |
| ing-dev-0069 | status | ready | needs_review | no |  |
| ing-dev-0069 | note | null | for dusting | no |  |
| ing-dev-0069 | amountUnstated | other | null | no |  |
| ing-dev-0070 | status | ready | needs_review | no |  |
| ing-dev-0070 | name | vegetable oil | vegetable oil for frying | no |  |
| ing-dev-0070 | amountUnstated | other | null | no |  |
| ing-dev-0071 | status | ready | needs_review | no |  |
| ing-dev-0071 | name | salt | salt to taste | no |  |
| ing-dev-0071 | amountUnstated | to_taste | null | no |  |
| ing-dev-0072 | status | ready | needs_review | no |  |
| ing-dev-0072 | note | null | to taste | no |  |
| ing-dev-0072 | amountUnstated | to_taste | null | no |  |
| ing-dev-0073 | status | ready | needs_review | no |  |
| ing-dev-0073 | note | null | to garnish | no |  |
| ing-dev-0073 | amountUnstated | for_garnish | null | no |  |
| ing-dev-0074 | status | ready | needs_review | no |  |
| ing-dev-0074 | note | null | if needed | no |  |
| ing-dev-0074 | amountUnstated | as_needed | null | no |  |
| ing-dev-0075 | status | ready | needs_review | no |  |
| ing-dev-0075 | note | null | as desired | no |  |
| ing-dev-0075 | amountUnstated | as_needed | null | no |  |
| ing-dev-0081 | status | ready | needs_review | no |  |
| ing-dev-0081 | name | fresh thyme | fresh thyme (sprig) | no |  |
| ing-dev-0081 | unit | sprig | each | no |  |
| ing-dev-0081 | form | null | raw | no |  |
| ing-dev-0082 | status | ready | needs_review | no |  |
| ing-dev-0082 | name | cilantro | cilantro (bunch) | no |  |
| ing-dev-0082 | unit | bunch | each | no |  |
| ing-dev-0082 | form | null | raw | no |  |
| ing-dev-0083 | status | ready | needs_review | no |  |
| ing-dev-0083 | name | celery | celery (stalk) | no |  |
| ing-dev-0083 | unit | stalk | each | no |  |
| ing-dev-0083 | form | null | raw | no |  |
| ing-dev-0084 | status | ready | needs_review | no |  |
| ing-dev-0084 | name | bacon | bacon (slice) | no |  |
| ing-dev-0084 | unit | slice | each | no |  |
| ing-dev-0084 | form | null | raw | no |  |
| ing-dev-0085 | status | ready | needs_review | no |  |
| ing-dev-0085 | name | butter | butter (stick) | no |  |
| ing-dev-0085 | unit | stick | each | no |  |
| ing-dev-0085 | form | null | raw | no |  |
| ing-dev-0086 | status | ready | needs_review | no |  |
| ing-dev-0086 | name | cauliflower | cauliflower (head) | no |  |
| ing-dev-0086 | unit | head | each | no |  |
| ing-dev-0086 | form | null | raw | no |  |
| ing-dev-0087 | name | garlic | garlic cloves | no | wrong_amount (high) |
| ing-dev-0087 | unit | clove | each | no | wrong_amount (high) |
| ing-dev-0088 | status | ready | needs_review | no |  |
| ing-dev-0088 | name | corn | corn (ear) | no |  |
| ing-dev-0088 | unit | ear | each | no |  |
| ing-dev-0088 | form | null | raw | no |  |
| ing-dev-0089 | status | ready | needs_review | no |  |
| ing-dev-0089 | name | fennel | fennel (bulb) | no |  |
| ing-dev-0089 | unit | bulb | each | no |  |
| ing-dev-0089 | form | null | raw | no |  |
| ing-dev-0090 | status | ready | needs_review | no |  |
| ing-dev-0090 | quantity | 1 | 14 1/2 | no |  |
| ing-dev-0090 | unit | can | oz | no |  |
| ing-dev-0090 | packageSize | 14 1/2 oz | null | no |  |
| ing-dev-0090 | form | null | raw | no |  |
| ing-dev-0091 | status | ready | needs_review | no |  |
| ing-dev-0091 | quantity | 1 | 15 | no |  |
| ing-dev-0091 | unit | can | oz | no |  |
| ing-dev-0091 | packageSize | 15 oz | null | no |  |

(1423 more row(s) in the JSON report.)

## Ingredient engine `semantic-v1`

Phase 2 semantic ingredient reader (contract v1)

### Overall — 669 lines (527 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 642/669 | 96.0% | 94.2%–97.2% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 644/669 | 96.3% | 94.5%–97.5% |
| Core pass, ready-labelled lines (strict) | 507/527 | 96.2% | 94.2%–97.5% |
| Core pass, ready-labelled lines (accepted) | 509/527 | 96.6% | 94.7%–97.8% |
| Full pass (every field), all lines (strict) | 635/669 | 94.9% | 93.0%–96.3% |
| Full pass (every field), all lines (accepted) | 640/669 | 95.7% | 93.8%–97.0% |
| Full pass, ready-labelled lines (strict) | 507/527 | 96.2% | 94.2%–97.5% |
| Full pass, ready-labelled lines (accepted) | 509/527 | 96.6% | 94.7%–97.8% |
| Review rate (engine not ready) | 154/669 | 23.0% | 20.0%–26.4% |
| Unnecessary review (label ready, engine not) | 14/527 | 2.7% | 1.6%–4.4% |
| **False certainty, total** (of all lines) | 6/669 | 0.9% | 0.4%–1.9% |
| False certainty — high | 5/669 | 0.8% | 0.3%–1.7% |
| False certainty — medium | 1/669 | 0.1% | 0.0%–0.8% |
| False certainty — low | 0/669 | 0.0% | 0.0%–0.6% |
| False certainty (of engine-ready lines) | 6/515 | 1.2% | 0.5%–2.5% |
| Suppressed ambiguity (of not-ready labels) | 2/142 | 1.4% | 0.4%–5.0% |
| Wrong amount on a ready reading (of ready labels) | 3/527 | 0.6% | 0.2%–1.7% |
| Wrong name on a ready reading (of ready labels) | 1/527 | 0.2% | 0.0%–1.1% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/515 | 0.0% | 0.0%–0.7% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/125 | 0.0% | 0.0%–3.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 1/559 | 0.2% | 0.0%–1.0% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 650/669 (97.2%) | 650/669 (97.2%) | 513/527 (97.3%) | 513/527 (97.3%) |
| name | 650/669 (97.2%) | 652/669 (97.5%) | 513/527 (97.3%) | 515/527 (97.7%) |
| quantity | 663/669 (99.1%) | 663/669 (99.1%) | 522/527 (99.1%) | 522/527 (99.1%) |
| unit | 662/669 (99.0%) | 662/669 (99.0%) | 521/527 (98.9%) | 521/527 (98.9%) |
| packageSize | 668/669 (99.9%) | 668/669 (99.9%) | 526/527 (99.8%) | 526/527 (99.8%) |
| equivalents | 668/669 (99.9%) | 668/669 (99.9%) | 526/527 (99.8%) | 526/527 (99.8%) |
| form | 669/669 (100.0%) | 669/669 (100.0%) | 527/527 (100.0%) | 527/527 (100.0%) |
| note | 654/669 (97.8%) | 655/669 (97.9%) | 516/527 (97.9%) | 517/527 (98.1%) |
| alternatives | 660/669 (98.7%) | 663/669 (99.1%) | 525/527 (99.6%) | 525/527 (99.6%) |
| optional | 669/669 (100.0%) | 669/669 (100.0%) | 527/527 (100.0%) | 527/527 (100.0%) |
| approximate | 669/669 (100.0%) | 669/669 (100.0%) | 527/527 (100.0%) | 527/527 (100.0%) |
| amountUnstated | 669/669 (100.0%) | 669/669 (100.0%) | 527/527 (100.0%) | 527/527 (100.0%) |

### dev — 182 lines (152 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 182/182 | 100.0% | 97.9%–100.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 182/182 | 100.0% | 97.9%–100.0% |
| Core pass, ready-labelled lines (strict) | 152/152 | 100.0% | 97.5%–100.0% |
| Core pass, ready-labelled lines (accepted) | 152/152 | 100.0% | 97.5%–100.0% |
| Full pass (every field), all lines (strict) | 181/182 | 99.5% | 97.0%–99.9% |
| Full pass (every field), all lines (accepted) | 182/182 | 100.0% | 97.9%–100.0% |
| Full pass, ready-labelled lines (strict) | 152/152 | 100.0% | 97.5%–100.0% |
| Full pass, ready-labelled lines (accepted) | 152/152 | 100.0% | 97.5%–100.0% |
| Review rate (engine not ready) | 30/182 | 16.5% | 11.8%–22.6% |
| Unnecessary review (label ready, engine not) | 0/152 | 0.0% | 0.0%–2.5% |
| **False certainty, total** (of all lines) | 0/182 | 0.0% | 0.0%–2.1% |
| False certainty — high | 0/182 | 0.0% | 0.0%–2.1% |
| False certainty — medium | 0/182 | 0.0% | 0.0%–2.1% |
| False certainty — low | 0/182 | 0.0% | 0.0%–2.1% |
| False certainty (of engine-ready lines) | 0/152 | 0.0% | 0.0%–2.5% |
| Suppressed ambiguity (of not-ready labels) | 0/30 | 0.0% | 0.0%–11.3% |
| Wrong amount on a ready reading (of ready labels) | 0/152 | 0.0% | 0.0%–2.5% |
| Wrong name on a ready reading (of ready labels) | 0/152 | 0.0% | 0.0%–2.5% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/152 | 0.0% | 0.0%–2.5% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/29 | 0.0% | 0.0%–11.7% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/157 | 0.0% | 0.0%–2.4% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| name | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| quantity | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| unit | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| packageSize | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| equivalents | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| form | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| note | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| alternatives | 181/182 (99.5%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| optional | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| approximate | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |
| amountUnstated | 182/182 (100.0%) | 182/182 (100.0%) | 152/152 (100.0%) | 152/152 (100.0%) |

### holdout — 128 lines (104 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 127/128 | 99.2% | 95.7%–99.9% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 127/128 | 99.2% | 95.7%–99.9% |
| Core pass, ready-labelled lines (strict) | 103/104 | 99.0% | 94.8%–99.8% |
| Core pass, ready-labelled lines (accepted) | 103/104 | 99.0% | 94.8%–99.8% |
| Full pass (every field), all lines (strict) | 125/128 | 97.7% | 93.3%–99.2% |
| Full pass (every field), all lines (accepted) | 126/128 | 98.4% | 94.5%–99.6% |
| Full pass, ready-labelled lines (strict) | 103/104 | 99.0% | 94.8%–99.8% |
| Full pass, ready-labelled lines (accepted) | 103/104 | 99.0% | 94.8%–99.8% |
| Review rate (engine not ready) | 25/128 | 19.5% | 13.6%–27.2% |
| Unnecessary review (label ready, engine not) | 1/104 | 1.0% | 0.2%–5.3% |
| **False certainty, total** (of all lines) | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty — high | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty — medium | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty — low | 0/128 | 0.0% | 0.0%–2.9% |
| False certainty (of engine-ready lines) | 0/103 | 0.0% | 0.0%–3.6% |
| Suppressed ambiguity (of not-ready labels) | 0/24 | 0.0% | 0.0%–13.8% |
| Wrong amount on a ready reading (of ready labels) | 0/104 | 0.0% | 0.0%–3.6% |
| Wrong name on a ready reading (of ready labels) | 0/104 | 0.0% | 0.0%–3.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/103 | 0.0% | 0.0%–3.6% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/23 | 0.0% | 0.0%–14.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/109 | 0.0% | 0.0%–3.4% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 127/128 (99.2%) | 127/128 (99.2%) | 103/104 (99.0%) | 103/104 (99.0%) |
| name | 127/128 (99.2%) | 127/128 (99.2%) | 103/104 (99.0%) | 103/104 (99.0%) |
| quantity | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| unit | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| packageSize | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| equivalents | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| form | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| note | 127/128 (99.2%) | 127/128 (99.2%) | 103/104 (99.0%) | 103/104 (99.0%) |
| alternatives | 125/128 (97.7%) | 126/128 (98.4%) | 103/104 (99.0%) | 103/104 (99.0%) |
| optional | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| approximate | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |
| amountUnstated | 128/128 (100.0%) | 128/128 (100.0%) | 104/104 (100.0%) | 104/104 (100.0%) |

### holdout2 — 359 lines (271 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 333/359 | 92.8% | 89.6%–95.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 335/359 | 93.3% | 90.3%–95.5% |
| Core pass, ready-labelled lines (strict) | 252/271 | 93.0% | 89.3%–95.5% |
| Core pass, ready-labelled lines (accepted) | 254/271 | 93.7% | 90.2%–96.0% |
| Full pass (every field), all lines (strict) | 329/359 | 91.6% | 88.3%–94.1% |
| Full pass (every field), all lines (accepted) | 332/359 | 92.5% | 89.3%–94.8% |
| Full pass, ready-labelled lines (strict) | 252/271 | 93.0% | 89.3%–95.5% |
| Full pass, ready-labelled lines (accepted) | 254/271 | 93.7% | 90.2%–96.0% |
| Review rate (engine not ready) | 99/359 | 27.6% | 23.2%–32.4% |
| Unnecessary review (label ready, engine not) | 13/271 | 4.8% | 2.8%–8.0% |
| **False certainty, total** (of all lines) | 6/359 | 1.7% | 0.8%–3.6% |
| False certainty — high | 5/359 | 1.4% | 0.6%–3.2% |
| False certainty — medium | 1/359 | 0.3% | 0.1%–1.6% |
| False certainty — low | 0/359 | 0.0% | 0.0%–1.1% |
| False certainty (of engine-ready lines) | 6/260 | 2.3% | 1.1%–4.9% |
| Suppressed ambiguity (of not-ready labels) | 2/88 | 2.3% | 0.6%–7.9% |
| Wrong amount on a ready reading (of ready labels) | 3/271 | 1.1% | 0.4%–3.2% |
| Wrong name on a ready reading (of ready labels) | 1/271 | 0.4% | 0.1%–2.1% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/260 | 0.0% | 0.0%–1.5% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/73 | 0.0% | 0.0%–5.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 1/293 | 0.3% | 0.1%–1.9% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 341/359 (95.0%) | 341/359 (95.0%) | 258/271 (95.2%) | 258/271 (95.2%) |
| name | 341/359 (95.0%) | 343/359 (95.5%) | 258/271 (95.2%) | 260/271 (95.9%) |
| quantity | 353/359 (98.3%) | 353/359 (98.3%) | 266/271 (98.2%) | 266/271 (98.2%) |
| unit | 352/359 (98.0%) | 352/359 (98.0%) | 265/271 (97.8%) | 265/271 (97.8%) |
| packageSize | 358/359 (99.7%) | 358/359 (99.7%) | 270/271 (99.6%) | 270/271 (99.6%) |
| equivalents | 358/359 (99.7%) | 358/359 (99.7%) | 270/271 (99.6%) | 270/271 (99.6%) |
| form | 359/359 (100.0%) | 359/359 (100.0%) | 271/271 (100.0%) | 271/271 (100.0%) |
| note | 345/359 (96.1%) | 346/359 (96.4%) | 261/271 (96.3%) | 262/271 (96.7%) |
| alternatives | 354/359 (98.6%) | 355/359 (98.9%) | 270/271 (99.6%) | 270/271 (99.6%) |
| optional | 359/359 (100.0%) | 359/359 (100.0%) | 271/271 (100.0%) | 271/271 (100.0%) |
| approximate | 359/359 (100.0%) | 359/359 (100.0%) | 271/271 (100.0%) | 271/271 (100.0%) |
| amountUnstated | 359/359 (100.0%) | 359/359 (100.0%) | 271/271 (100.0%) | 271/271 (100.0%) |

### By category (every)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 38 | 37/38 | 36/38 | 6/38 | 0/0/0 | 0/4 | 0/38 |
| fraction | 32 | 31/32 | 31/32 | 4/32 | 0/0/0 | 0/0 | 0/32 |
| fraction_third | 37 | 33/37 | 33/37 | 4/37 | 1/0/0 | 0/0 | 0/37 |
| mixed_vulgar | 46 | 43/46 | 43/46 | 5/46 | 0/0/0 | 0/0 | 0/46 |
| nested_parens | 18 | 16/18 | 16/18 | 3/18 | 0/0/0 | 0/0 | 0/18 |
| prep_note | 140 | 134/140 | 133/140 | 9/140 | 2/1/0 | 0/3 | 0/137 |
| source_choice | 20 | 18/20 | 18/20 | 5/20 | 0/0/0 | 0/0 | 0/20 |
| ingredient_alternatives | 28 | 27/28 | 21/28 | 28/28 | 0/0/0 | 0/2 | 0/26 |
| range | 24 | 23/24 | 23/24 | 24/24 | 0/0/0 | 0/0 | 0/24 |
| optional | 13 | 13/13 | 13/13 | 1/13 | 0/0/0 | 0/2 | 0/11 |
| unstated_amount | 45 | 45/45 | 45/45 | 2/45 | 0/0/0 | 0/37 | 0/8 |
| quantity_missing | 41 | 41/41 | 41/41 | 41/41 | 0/0/0 | 0/41 | 0/1 |
| count_unit | 86 | 82/86 | 82/86 | 6/86 | 3/0/0 | 0/1 | 1/86 |
| package_size | 50 | 49/50 | 48/50 | 4/50 | 0/0/0 | 0/0 | 1/50 |
| oz_vs_floz | 39 | 38/39 | 38/39 | 1/39 | 0/0/0 | 0/0 | 0/39 |
| compound_quantity | 20 | 18/20 | 18/20 | 2/20 | 0/0/0 | 0/0 | 0/20 |
| equivalent_quantity | 34 | 33/34 | 33/34 | 1/34 | 0/0/0 | 0/0 | 0/34 |
| percentage | 14 | 13/14 | 13/14 | 1/14 | 0/0/0 | 0/0 | 0/14 |
| price_annotation | 18 | 18/18 | 18/18 | 1/18 | 0/0/0 | 0/1 | 0/17 |
| form_cooked_raw | 15 | 12/15 | 12/15 | 0/15 | 2/1/0 | 0/0 | 0/15 |
| number_word | 37 | 36/37 | 36/37 | 0/37 | 1/0/0 | 0/0 | 0/37 |
| approximate | 16 | 16/16 | 16/16 | 0/16 | 0/0/0 | 0/0 | 0/16 |
| imprecise_unit | 23 | 22/23 | 22/23 | 2/23 | 0/0/0 | 0/0 | 0/23 |
| heading_non_ingredient | 25 | 22/25 | 22/25 | 25/25 | 0/0/0 | 0/25 | 0/0 |
| empty | 8 | 8/8 | 8/8 | 8/8 | 0/0/0 | 0/8 | 0/0 |
| unicode_text | 39 | 39/39 | 39/39 | 15/39 | 0/0/0 | 0/9 | 0/30 |
| ambiguous_number_format | 10 | 10/10 | 10/10 | 10/10 | 0/0/0 | 0/10 | 0/10 |
| size_word | 29 | 27/29 | 27/29 | 4/29 | 0/1/0 | 0/1 | 0/28 |
| seasoning_lookalike | 56 | 56/56 | 56/56 | 14/56 | 0/0/0 | 0/13 | 0/43 |
| seasoning_ordinary | 37 | 35/37 | 35/37 | 16/37 | 0/0/0 | 0/23 | 0/14 |
| quart_pint_gallon | 16 | 16/16 | 16/16 | 0/16 | 0/0/0 | 0/0 | 0/16 |
| long_line | 8 | 8/8 | 8/8 | 0/8 | 0/0/0 | 0/0 | 0/8 |
| quantity_after_name | 33 | 29/33 | 29/33 | 5/33 | 0/0/0 | 0/1 | 0/33 |

### Mismatches (34 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-dev-0055 | alternatives | ground beef \| ground turkey | ground beef \| turkey | yes |  |
| ing-hold-0021 | status | ready | needs_review | no |  |
| ing-hold-0021 | name | chicken stock | null | no |  |
| ing-hold-0021 | note | homemade or low-sodium boxed | homemade | no |  |
| ing-hold-0021 | alternatives | [] | chicken stock \| low-sodium boxed | no |  |
| ing-hold-0031 | alternatives | buttermilk \| plain yogurt | buttermilk yogurt \| plain yogurt | no |  |
| ing-hold-0034 | alternatives | dried oregano \| dried thyme | dried oregano \| thyme | yes |  |
| ing-h2-0040 | status | ready | needs_review | no |  |
| ing-h2-0040 | name | 5-spice powder | null | no |  |
| ing-h2-0040 | note | null | 5-spice powder | no |  |
| ing-h2-0041 | status | ready | needs_review | no |  |
| ing-h2-0041 | name | 00 flour | null | no |  |
| ing-h2-0041 | note | null | 00 flour | no |  |
| ing-h2-0054 | name | cardamom | cardamom pods | no | wrong_amount (high) |
| ing-h2-0054 | unit | pod | each | no | wrong_amount (high) |
| ing-h2-0061 | status | ready | needs_review | no |  |
| ing-h2-0061 | quantity | 1 | null | no |  |
| ing-h2-0065 | name | celery | celery ribs | no | wrong_amount (high) |
| ing-h2-0065 | unit | rib | each | no | wrong_amount (high) |
| ing-h2-0072 | name | star anise | star anise pods | no | wrong_amount (high) |
| ing-h2-0072 | unit | pod | each | no | wrong_amount (high) |
| ing-h2-0087 | status | ready | needs_review | no |  |
| ing-h2-0087 | unit | container | cup | no |  |
| ing-h2-0087 | packageSize | 5 3/10 oz | null | no |  |
| ing-h2-0087 | note | null | 5.3 oz | no |  |
| ing-h2-0129 | status | ready | needs_review | no |  |
| ing-h2-0129 | name | sea salt | null | no |  |
| ing-h2-0129 | quantity | 2 1/2 | 2 | no |  |
| ing-h2-0129 | note | null | ½ tsp sea salt | no |  |
| ing-h2-0130 | status | ready | needs_review | no |  |
| ing-h2-0130 | name | sugar | null | no |  |
| ing-h2-0130 | quantity | 1 1/3 | 1 | no |  |
| ing-h2-0130 | note | null | 1/3 cup sugar | no |  |
| ing-h2-0140 | status | ready | needs_review | no |  |
| ing-h2-0140 | equivalents | 750 ml \| 25 fl_oz | 750 ml | no |  |
| ing-h2-0144 | note | null | 2 | no |  |
| ing-h2-0151 | status | ready | needs_review | no |  |
| ing-h2-0151 | name | 93/7 ground turkey | ground turkey | no |  |
| ing-h2-0151 | quantity | 1 | null | no |  |
| ing-h2-0151 | unit | lb | null | no |  |
| ing-h2-0151 | note | null | 1 lb | no |  |
| ing-h2-0164 | name | shrimp | large shrimp | no | wrong_name (medium) |
| ing-h2-0164 | note | large; peeled, tails on | peeled, tails on | no | wrong_name (medium) |
| ing-h2-0165 | status | needs_review | ready | no | suppressed_ambiguity (high) |
| ing-h2-0212 | status | ready | needs_review | no |  |
| ing-h2-0213 | status | ready | needs_review | no |  |
| ing-h2-0218 | alternatives | kale \| Swiss chard | kale chard \| Swiss chard | no |  |
| ing-h2-0219 | name | null | maple syrup | no |  |
| ing-h2-0219 | note | null | honey or agave | no |  |
| ing-h2-0219 | alternatives | maple syrup \| honey \| agave | [] | no |  |
| ing-h2-0220 | alternatives | chickpeas \| white beans | chickpeas beans \| white beans | no |  |
| ing-h2-0225 | alternatives | chopped parsley \| chopped cilantro | chopped parsley \| cilantro | yes |  |
| ing-h2-0232 | status | ready | needs_review | no |  |
| ing-h2-0232 | name | hummus | null | no |  |
| ing-h2-0232 | note | store-bought or see recipe | store-bought | no |  |
| ing-h2-0232 | alternatives | [] | hummus \| see recipe | no |  |
| ing-h2-0239 | status | ready | needs_review | no |  |
| ing-h2-0253 | status | ready | needs_review | no |  |
| ing-h2-0253 | name | eggs | eggs x | no |  |
| ing-h2-0253 | quantity | 3 | null | no |  |
| ing-h2-0253 | unit | each | null | no |  |
| ing-h2-0253 | note | null | 3 | no |  |
| ing-h2-0265 | name | boneless, skinless chicken breasts | boneless skinless chicken breasts | yes |  |
| ing-h2-0267 | name | loosely packed basil leaves | basil leaves | yes |  |
| ing-h2-0267 | note | null | loosely packed | yes |  |
| ing-h2-0277 | name | water | between | no |  |
| ing-h2-0277 | quantity | 2..3 | null | no |  |
| ing-h2-0277 | unit | cup | null | no |  |
| ing-h2-0277 | note | null | 2 and 3 cups water | no |  |
| ing-h2-0286 | status | unsupported | needs_review | no |  |
| ing-h2-0286 | name | null | SAUCE | no |  |
| ing-h2-0288 | status | unsupported | needs_review | no |  |
| ing-h2-0288 | name | null | Cake Layers | no |  |
| ing-h2-0297 | status | unsupported | needs_review | no |  |
| ing-h2-0297 | name | null | Step | no |  |
| ing-h2-0297 | note | null | 2 | no |  |
| ing-h2-0338 | status | needs_review | ready | no | suppressed_ambiguity (high) |

## Pages (requested ingredient engine: default; reported page engine `legacy-table-import-2-page`, ingredient engine `legacy-table-import-2`)

### Overall — 15 pages, 14 expected candidates

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Recipe detection precision | 12/12 | 100.0% | 75.8%–100.0% |
| Recipe detection recall | 12/12 | 100.0% | 75.8%–100.0% |
| Candidate count matches | 15/15 | 100.0% | 79.6%–100.0% |
| Candidate: every field matches (accepted) | 10/14 | 71.4% | 45.4%–88.3% |
| Ingredient list exact | 14/14 | 100.0% | 78.5%–100.0% |
| Expected diagnostics present | 15/15 | 100.0% | 79.6%–100.0% |
| retention = not_decided | 15/15 | 100.0% | 79.6%–100.0% |
| Readings length = ingredient lines | 14/14 | 100.0% | 78.5%–100.0% |

| Candidate field | Strict | Accepted |
|---|---|---|
| structure | 14/14 (100.0%) | 14/14 (100.0%) |
| title | 14/14 (100.0%) | 14/14 (100.0%) |
| servings | 11/14 (78.6%) | 11/14 (78.6%) |
| yieldText | 14/14 (100.0%) | 14/14 (100.0%) |
| prepMinutes | 14/14 (100.0%) | 14/14 (100.0%) |
| cookMinutes | 14/14 (100.0%) | 14/14 (100.0%) |
| totalMinutes | 14/14 (100.0%) | 14/14 (100.0%) |
| author | 14/14 (100.0%) | 14/14 (100.0%) |
| siteName | 14/14 (100.0%) | 14/14 (100.0%) |
| category | 14/14 (100.0%) | 14/14 (100.0%) |
| cuisine | 14/14 (100.0%) | 14/14 (100.0%) |
| ingredientLines | 14/14 (100.0%) | 14/14 (100.0%) |
| instructionCount | 14/14 (100.0%) | 14/14 (100.0%) |
| imageUrls | 14/14 (100.0%) | 14/14 (100.0%) |
| declaredUrl | 12/14 (85.7%) | 12/14 (85.7%) |

Ingredient readings on extracted candidates: 91 (ready 70, needs_review 21, unsupported 0, other 0); extractor errors: 0.

### dev — 10 pages, 9 expected candidates

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Recipe detection precision | 8/8 | 100.0% | 67.6%–100.0% |
| Recipe detection recall | 8/8 | 100.0% | 67.6%–100.0% |
| Candidate count matches | 10/10 | 100.0% | 72.3%–100.0% |
| Candidate: every field matches (accepted) | 6/9 | 66.7% | 35.4%–87.9% |
| Ingredient list exact | 9/9 | 100.0% | 70.1%–100.0% |
| Expected diagnostics present | 10/10 | 100.0% | 72.3%–100.0% |
| retention = not_decided | 10/10 | 100.0% | 72.3%–100.0% |
| Readings length = ingredient lines | 9/9 | 100.0% | 70.1%–100.0% |

| Candidate field | Strict | Accepted |
|---|---|---|
| structure | 9/9 (100.0%) | 9/9 (100.0%) |
| title | 9/9 (100.0%) | 9/9 (100.0%) |
| servings | 7/9 (77.8%) | 7/9 (77.8%) |
| yieldText | 9/9 (100.0%) | 9/9 (100.0%) |
| prepMinutes | 9/9 (100.0%) | 9/9 (100.0%) |
| cookMinutes | 9/9 (100.0%) | 9/9 (100.0%) |
| totalMinutes | 9/9 (100.0%) | 9/9 (100.0%) |
| author | 9/9 (100.0%) | 9/9 (100.0%) |
| siteName | 9/9 (100.0%) | 9/9 (100.0%) |
| category | 9/9 (100.0%) | 9/9 (100.0%) |
| cuisine | 9/9 (100.0%) | 9/9 (100.0%) |
| ingredientLines | 9/9 (100.0%) | 9/9 (100.0%) |
| instructionCount | 9/9 (100.0%) | 9/9 (100.0%) |
| imageUrls | 9/9 (100.0%) | 9/9 (100.0%) |
| declaredUrl | 7/9 (77.8%) | 7/9 (77.8%) |

Ingredient readings on extracted candidates: 60 (ready 42, needs_review 18, unsupported 0, other 0); extractor errors: 0.

### holdout — 5 pages, 5 expected candidates

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Recipe detection precision | 4/4 | 100.0% | 51.0%–100.0% |
| Recipe detection recall | 4/4 | 100.0% | 51.0%–100.0% |
| Candidate count matches | 5/5 | 100.0% | 56.5%–100.0% |
| Candidate: every field matches (accepted) | 4/5 | 80.0% | 37.5%–96.4% |
| Ingredient list exact | 5/5 | 100.0% | 56.5%–100.0% |
| Expected diagnostics present | 5/5 | 100.0% | 56.5%–100.0% |
| retention = not_decided | 5/5 | 100.0% | 56.5%–100.0% |
| Readings length = ingredient lines | 5/5 | 100.0% | 56.5%–100.0% |

| Candidate field | Strict | Accepted |
|---|---|---|
| structure | 5/5 (100.0%) | 5/5 (100.0%) |
| title | 5/5 (100.0%) | 5/5 (100.0%) |
| servings | 4/5 (80.0%) | 4/5 (80.0%) |
| yieldText | 5/5 (100.0%) | 5/5 (100.0%) |
| prepMinutes | 5/5 (100.0%) | 5/5 (100.0%) |
| cookMinutes | 5/5 (100.0%) | 5/5 (100.0%) |
| totalMinutes | 5/5 (100.0%) | 5/5 (100.0%) |
| author | 5/5 (100.0%) | 5/5 (100.0%) |
| siteName | 5/5 (100.0%) | 5/5 (100.0%) |
| category | 5/5 (100.0%) | 5/5 (100.0%) |
| cuisine | 5/5 (100.0%) | 5/5 (100.0%) |
| ingredientLines | 5/5 (100.0%) | 5/5 (100.0%) |
| instructionCount | 5/5 (100.0%) | 5/5 (100.0%) |
| imageUrls | 5/5 (100.0%) | 5/5 (100.0%) |
| declaredUrl | 5/5 (100.0%) | 5/5 (100.0%) |

Ingredient readings on extracted candidates: 31 (ready 28, needs_review 3, unsupported 0, other 0); extractor errors: 0.

### Page mismatches

| Page | Candidate | Field | Expected | Got | Accepted |
|---|---|---|---|---|---|
| page-dev-type-array-br | 0 | servings | 12 | null | no |
| page-dev-microdata | 0 | servings | 16 | null | no |
| page-dev-microdata | 0 | declaredUrl | https://cookbook.example.org/recipes/maple-oat-bars | null | no |
| page-dev-two-recipes | 0 | declaredUrl | https://www.example.com/menus/taco-night/#pickled-onions | https://www.example.com/menus/taco-night/ | no |
| page-hold-microdata-og-image | 0 | servings | 24 | null | no |

## Outcomes (outcomes v3, EVALUATION-PLAN-v3)

Scorer: `outcomes` v3 for EVALUATION-PLAN-v3 · source `bench/outcomes.ts` SHA-256 `7821e8532eb123e9694291c6d0deac6bdac40f96715d06a4d2aa2161fc3a3892`.

One outcome class per line (EVALUATION-PLAN-v3, carrying EVALUATION-PLAN-v2 §3–§7 except SCORE-01/02); sets are reported separately and never pooled. Every rate shows n/N and a Wilson 95% interval (z = 1.959964); for a zero count the upper bound is the claim. Accepted matching (a case's `accept` values count) is the acceptance basis; strict figures are listed too. R / A / U = lines labelled ready / needs_review / unsupported; N = all lines. Every line is parsed twice: validity, engine error and nondeterminism are separate dimensions, and any of them makes the line CE (no class, no S code).

Holdout-v2 freeze: FREEZE-v2.json (2026-10-09), SHA-256 `793507a4b7360fb7…` — verified against holdout-v2.jsonl before this run.

Scorer readings where the plan is silent:

- CE (SCORE-02): a line is CE when the engine threw on either of its two parses, when either complete output fails validateParsedIngredientV1 (src/validate.ts) — not merely when its status is outside the contract (plan v3 change log 2(a)) — or when the two parses differ: canonical JSON of the whole outputs, unscored fields (evidence, reasons, unit source) included, or the thrown messages, so two different errors are also nondeterministic (change log 2(c)). A CE line stays in every denominator (so it is never C1), gets no C1–C8 class, no C3/C5 sub-class, no false-certainty severity and no S code, counts as not accurate for A2 field accuracy, and fails A6. An invalid output is never repaired or coerced to make it scoreable. Validity, engine error and nondeterminism are reported as separate dimensions; the semantic classification below applies only to valid, deterministic, non-error outputs.
- C3/C5 sub-classes are decided in the order b, c, a, x over the engine's name, quantity, unit and package size (accepted values count; a non-empty alternatives list is also compared): b = a non-null field contradicts the label; c = name, quantity and unit are all null and no alternatives were read; a = no contradiction and the food was named (name non-null, or, on a choice-of-ingredients label, the options matched); x = no contradiction but the food was not named while an amount or unit was read — a case the plan does not define, reported separately and still counted in C3/C5.
- C2 severity: high when the line has any of S2–S8 or a wrong unit or package size; medium when only the name is wrong (not S7). The one remaining C2 case — a fabricated quantity (S1) on a ready label whose unit also matches (both null) — is not covered by the plan's rule and is reported as high (a valid ready output with a quantity always has a unit, so under SCORE-02 this case can only arise as CE).
- S5 compares the engine name (§9 normalization) with the label's alternatives and any accepted alternative lists; it applies to any engine status when the engine reports no alternatives.
- S7 uses the accepted name match and §9-normalized word sets: the engine's (non-null) name words form a proper subset of the label name's words.
- S6 fires when the label has a packageSize, the engine has none and the engine unit is mass or volume, whether or not the engine states a quantity (plan v3 change log 2(b)).
- S3 is the CONTRACT-v1 §9 cross-dimension check: the engine unit's dimension differs from the label unit's, or the engine package size's from the label package size's, both present.
- A2 field accuracy counts a field as accurate when it matches the label, whatever the engine status (a CE line counts as not accurate). A1/A2 'met with confidence' uses the unrounded Wilson lower bound (z = 1.959964).
- A6 in the scorer: CE = 0 — no engine error, every output valid, every line read identically twice. The rest of A6 (legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; reports byte-deterministic) and A7 are recorded outside the scorer.
- Sensitivity 3(b) (SCORE-01): the needs_review labels with no amount are those whose label quantity and unit are null and whose alternatives are empty, whatever their category tags.
- Sensitivity (a) on holdout-v3 leaves out the cases marked debatable: true in holdout-v3.jsonl; on holdout-v2 the pre-registered list (ing-h2-0087). Sensitivity (c), holdout-v3 only: A1–A5 without the cases marked reliesOnNewReading: true (the result under CONTRACT-v1 §7 alone). Sensitivity (d), holdout-v3 only and only when fixtures/EXPOSURE-AUDIT-v3.json exists: A1–A5 without its matchedCaseIds. All three come from frozen data files, never from scorer constants, and are informational.
- holdout-v3 breakdowns: per repair family (the case's family), per CONTRACT-v1 §12 item exercised (a case counts in every item it lists; 'none' = no item) and per construction (the case's construction string; compact: lines, classes, S codes).
- Review-only pre-fills (informational, not plan classes; plan v3 change log 2): an invented option is an engine option that matches no label option (nor an accepted one); a dropped option is a label option missing from an engine list that invents none. Both are judged only on an engine alternatives list that matches neither the label's options nor an accepted list, so they never overlap; both stay visible next to C3b/C5b.

### Outcomes — engine `legacy-table-import-2`

| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|
| dev (development; diagnostics only) | 182 | 152/22/8 | 54/152 (35.5%, 28.4%–43.4%) | 54/152 (35.5%, 28.4%–43.4%) | 1/5 | 92/152 (60.5%, 52.6%–68.0%) | 22/22 | 3/8 | 0 | 0 |
| holdout-v1 (previously exposed) | 128 | 104/18/6 | 37/104 (35.6%, 27.0%–45.1%) | 37/104 (35.6%, 27.0%–45.1%) | 0/4 | 63/104 (60.6%, 51.0%–69.4%) | 18/18 | 2/6 | 0 | 0 |
| holdout-v2 (exposed; historical acceptance set) | 359 | 271/69/19 | 73/271 (26.9%, 22.0%–32.5%) | 71/271 (26.2%, 21.3%–31.7%) | 11/10 | 177/271 (65.3%, 59.5%–70.7%) | 69/69 | 2/19 | 0 | S3×5 |

#### dev (development; diagnostics only) — 182 lines (R 152, A 22, U 8)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 54/152 | 35.5% | 28.4%–43.4% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 54/152 | 35.5% | 28.4%–43.4% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| **C2 incorrect ready** (of N) | 6/182 | 3.3% | 1.5%–7.0% |  |
| C2 — high false certainty (of N) | 1/182 | 0.5% | 0.1%–3.0% | ing-dev-0087 |
| C2 — medium false certainty (of N) | 5/182 | 2.8% | 1.2%–6.3% | ing-dev-0039, ing-dev-0125, ing-dev-0126, ing-dev-0127, ing-dev-0128 |
| C2 on ready labels (of R) | 6/152 | 4.0% | 1.8%–8.3% |  |
| C2 on needs_review labels (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C2 on unsupported labels (of U) | 0/8 | 0.0% | ≤ 32.4% |  |
| C3 unnecessary review (of R) | 92/152 | 60.5% | 52.6%–68.0% |  |
| C3a useful partial (of R) | 11/152 | 7.2% | 4.1%–12.5% | ing-dev-0007, ing-dev-0066, ing-dev-0067, ing-dev-0068, ing-dev-0069, ing-dev-0072, ing-dev-0073, ing-dev-0074, ing-dev-0075, ing-dev-0179, ing-dev-0180 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 81/152 | 53.3% | 45.4%–61.0% | ing-dev-0001, ing-dev-0002, ing-dev-0003, ing-dev-0004, ing-dev-0006, ing-dev-0012, ing-dev-0026, ing-dev-0027, ing-dev-0028, ing-dev-0029, ing-dev-0030, ing-dev-0031, ing-dev-0032, ing-dev-0038, ing-dev-0040, ing-dev-0045, ing-dev-0047, ing-dev-0048, ing-dev-0049, ing-dev-0062, ing-dev-0063, ing-dev-0064, ing-dev-0065, ing-dev-0070, ing-dev-0071 … (+56 in the JSON report) |
| C3c abstention (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C4 unnecessary rejection (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3 + C4 (of R) | 92/152 | 60.5% | 52.6%–68.0% |  |
| C5 correct review (of A) | 22/22 | 100.0% | 85.1%–100.0% |  |
| C5a useful partial (of A) | 5/22 | 22.7% | 10.1%–43.4% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 17/22 | 77.3% | 56.6%–89.9% | ing-dev-0005, ing-dev-0021, ing-dev-0050, ing-dev-0051, ing-dev-0052, ing-dev-0053, ing-dev-0054, ing-dev-0055, ing-dev-0056, ing-dev-0057, ing-dev-0058, ing-dev-0059, ing-dev-0060, ing-dev-0061, ing-dev-0155, ing-dev-0156, ing-dev-0157 |
| C5c abstention (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C6 review rejected (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C7 correct rejection (of U) | 3/8 | 37.5% | 13.7%–69.4% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 5/8 | 62.5% | 30.6%–86.3% | ing-dev-0143, ing-dev-0144, ing-dev-0145, ing-dev-0146, ing-dev-0147 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: engine error (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: output fails the contract validator (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S1 fabricated amount** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S3 cross-dimension** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S4 suppressed ambiguity** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S5 silent alternative choice** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S6 package representation changed** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S7 dropped material qualifier** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S8 ready on a non-ingredient** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Any severe error (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/182 | 0.0% | ≤ 2.1% |  |

Strict matching: C1 54/152 (35.5%, 28.4%–43.4%) · C1+ 54/152 (35.5%, 28.4%–43.4%) · C2 6/182 (3.3%, 1.5%–7.0%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 65/152 (42.8%, 35.2%–50.7%) | 65/152 (42.8%, 35.2%–50.7%) |
| quantity | 87/152 (57.2%, 49.3%–64.8%) | 87/152 (57.2%, 49.3%–64.8%) |
| unit | 71/152 (46.7%, 39.0%–54.6%) | 71/152 (46.7%, 39.0%–54.6%) |

##### By category — dev (development; diagnostics only)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 9 | 8/1/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 10 | 9/1/0 | 5/9 | 5/9 | 0 (0/0) | 4/9 | 0/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 8 | 8/0/0 | 5/8 | 5/8 | 0 (0/0) | 3/8 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 0/4 | 0/4 | 1 (0/1) | 3/4 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 29 | 28/1/0 | 14/28 | 14/28 | 3 (1/2) | 11/28 | 0/11/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| source_choice | 6 | 5/1/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | 0 |
| range | 6 | 0/6/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 6/6 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 14 | 14/0/0 | 1/14 | 1/14 | 0 (0/0) | 13/14 | 9/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 20 | 19/1/0 | 0/19 | 0/19 | 1 (1/0) | 18/19 | 0/18/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| package_size | 11 | 11/0/0 | 0/11 | 0/11 | 0 (0/0) | 11/11 | 0/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| oz_vs_floz | 9 | 9/0/0 | 7/9 | 7/9 | 0 (0/0) | 2/9 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 0/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 8 | 8/0/0 | 4/8 | 4/8 | 0 (0/0) | 4/8 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 4 | 4/0/0 | 0/4 | 0/4 | 4 (0/4) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 5 | 0/0/5 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/5 | 5 | 0 | 0 |
| empty | 3 | 0/0/3 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 3/3 | 0 | 0 | 0 |
| unicode_text | 7 | 4/2/1 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 2/2 | 0 | 1/1 | 0 | 0 | 0 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 6 | 6/0/0 | 4/6 | 4/6 | 0 (0/0) | 2/6 | 1/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 11 | 10/1/0 | 9/10 | 9/10 | 0 (0/0) | 1/10 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 11 | 10/1/0 | 4/10 | 4/10 | 0 (0/0) | 6/10 | 2/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 3 | 3/0/0 | 2/3 | 2/3 | 0 (0/0) | 1/3 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 2/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |

##### Sensitivity — dev (development; diagnostics only) (informational, not the acceptance basis)

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 5 excluded (ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0079, ing-dev-0080), 17 needs_review lines kept — C5 17/17 (100.0%, 81.6%–100.0%) · C5a 0/17 · C5b 17/17 · C5c 0/17 · C5x 0/17 · C6 0/17 (0.0%, ≤ 18.4%) · S4 0/17 (0.0%, ≤ 18.4%).

#### holdout-v1 (previously exposed) — 128 lines (R 104, A 18, U 6)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 37/104 | 35.6% | 27.0%–45.1% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 37/104 | 35.6% | 27.0%–45.1% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| **C2 incorrect ready** (of N) | 4/128 | 3.1% | 1.2%–7.8% |  |
| C2 — high false certainty (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| C2 — medium false certainty (of N) | 4/128 | 3.1% | 1.2%–7.8% | ing-hold-0023, ing-hold-0084, ing-hold-0085, ing-hold-0086 |
| C2 on ready labels (of R) | 4/104 | 3.9% | 1.5%–9.5% |  |
| C2 on needs_review labels (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C2 on unsupported labels (of U) | 0/6 | 0.0% | ≤ 39.0% |  |
| C3 unnecessary review (of R) | 63/104 | 60.6% | 51.0%–69.4% |  |
| C3a useful partial (of R) | 9/104 | 8.6% | 4.6%–15.6% | ing-hold-0043, ing-hold-0044, ing-hold-0045, ing-hold-0046, ing-hold-0047, ing-hold-0048, ing-hold-0049, ing-hold-0120, ing-hold-0126 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 54/104 | 51.9% | 42.4%–61.3% | ing-hold-0010, ing-hold-0011, ing-hold-0012, ing-hold-0013, ing-hold-0014, ing-hold-0015, ing-hold-0019, ing-hold-0020, ing-hold-0021, ing-hold-0022, ing-hold-0028, ing-hold-0029, ing-hold-0030, ing-hold-0040, ing-hold-0041, ing-hold-0042, ing-hold-0054, ing-hold-0055, ing-hold-0056, ing-hold-0057, ing-hold-0058, ing-hold-0059, ing-hold-0060, ing-hold-0061, ing-hold-0062 … (+29 in the JSON report) |
| C3c abstention (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C4 unnecessary rejection (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3 + C4 (of R) | 63/104 | 60.6% | 51.0%–69.4% |  |
| C5 correct review (of A) | 18/18 | 100.0% | 82.4%–100.0% |  |
| C5a useful partial (of A) | 5/18 | 27.8% | 12.5%–50.9% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 13/18 | 72.2% | 49.1%–87.5% | ing-hold-0006, ing-hold-0031, ing-hold-0032, ing-hold-0033, ing-hold-0034, ing-hold-0035, ing-hold-0036, ing-hold-0037, ing-hold-0038, ing-hold-0039, ing-hold-0106, ing-hold-0107, ing-hold-0108 |
| C5c abstention (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C6 review rejected (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C7 correct rejection (of U) | 2/6 | 33.3% | 9.7%–70.0% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 4/6 | 66.7% | 30.0%–90.3% | ing-hold-0097, ing-hold-0098, ing-hold-0099, ing-hold-0100 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: engine error (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: output fails the contract validator (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S1 fabricated amount** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S3 cross-dimension** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S4 suppressed ambiguity** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S5 silent alternative choice** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S6 package representation changed** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S7 dropped material qualifier** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S8 ready on a non-ingredient** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Any severe error (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/128 | 0.0% | ≤ 2.9% |  |

Strict matching: C1 37/104 (35.6%, 27.0%–45.1%) · C1+ 37/104 (35.6%, 27.0%–45.1%) · C2 4/128 (3.1%, 1.2%–7.8%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 46/104 (44.2%, 35.1%–53.8%) | 46/104 (44.2%, 35.1%–53.8%) |
| quantity | 61/104 (58.7%, 49.0%–67.7%) | 61/104 (58.7%, 49.0%–67.7%) |
| unit | 49/104 (47.1%, 37.8%–56.6%) | 49/104 (47.1%, 37.8%–56.6%) |

##### By category — holdout-v1 (previously exposed)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 6 | 5/1/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 11 | 11/0/0 | 0/11 | 0/11 | 0 (0/0) | 11/11 | 0/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 7 | 7/0/0 | 3/7 | 3/7 | 0 (0/0) | 4/7 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 5 | 5/0/0 | 0/5 | 0/5 | 1 (0/1) | 4/5 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 20 | 18/2/0 | 11/18 | 11/18 | 1 (0/1) | 6/18 | 1/5/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| source_choice | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 0/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 4 | 0/4/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| range | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 8 | 8/0/0 | 0/8 | 0/8 | 0 (0/0) | 8/8 | 8/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| package_size | 6 | 6/0/0 | 0/6 | 0/6 | 0 (0/0) | 6/6 | 0/6/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| oz_vs_floz | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 2 | 2/0/0 | 0/2 | 0/2 | 0 (0/0) | 2/2 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 3 | 3/0/0 | 0/3 | 0/3 | 3 (0/3) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 4 | 0/0/4 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/4 | 4 | 0 | 0 |
| empty | 2 | 0/0/2 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 2/2 | 0 | 0 | 0 |
| unicode_text | 5 | 3/1/1 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 1/1 | 0 | 1/1 | 0 | 0 | 0 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 4 | 3/1/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 7 | 7/0/0 | 5/7 | 5/7 | 0 (0/0) | 2/7 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 6 | 4/2/0 | 2/4 | 2/4 | 0 (0/0) | 2/4 | 2/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 2 | 2/0/0 | 1/2 | 1/2 | 0 (0/0) | 1/2 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 1/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |

##### Sensitivity — holdout-v1 (previously exposed) (informational, not the acceptance basis)

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 5 excluded (ing-hold-0050, ing-hold-0051, ing-hold-0052, ing-hold-0053, ing-hold-0119), 13 needs_review lines kept — C5 13/13 (100.0%, 77.2%–100.0%) · C5a 0/13 · C5b 13/13 · C5c 0/13 · C5x 0/13 · C6 0/13 (0.0%, ≤ 22.8%) · S4 0/13 (0.0%, ≤ 22.8%).

#### holdout-v2 (exposed; historical acceptance set) — 359 lines (R 271, A 69, U 19)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 73/271 | 26.9% | 22.0%–32.5% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 71/271 | 26.2% | 21.3%–31.7% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 2/271 | 0.7% | 0.2%–2.6% | ing-h2-0173, ing-h2-0304 |
| **C2 incorrect ready** (of N) | 21/359 | 5.9% | 3.9%–8.8% |  |
| C2 — high false certainty (of N) | 11/359 | 3.1% | 1.7%–5.4% | ing-h2-0015, ing-h2-0064, ing-h2-0065, ing-h2-0072, ing-h2-0073, ing-h2-0074, ing-h2-0075, ing-h2-0106, ing-h2-0156, ing-h2-0178, ing-h2-0179 |
| C2 — medium false certainty (of N) | 10/359 | 2.8% | 1.5%–5.1% | ing-h2-0159, ing-h2-0160, ing-h2-0161, ing-h2-0163, ing-h2-0164, ing-h2-0236, ing-h2-0237, ing-h2-0241, ing-h2-0265, ing-h2-0339 |
| C2 on ready labels (of R) | 21/271 | 7.8% | 5.1%–11.6% |  |
| C2 on needs_review labels (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C2 on unsupported labels (of U) | 0/19 | 0.0% | ≤ 16.8% |  |
| C3 unnecessary review (of R) | 177/271 | 65.3% | 59.5%–70.7% |  |
| C3a useful partial (of R) | 24/271 | 8.9% | 6.0%–12.8% | ing-h2-0077, ing-h2-0080, ing-h2-0104, ing-h2-0108, ing-h2-0109, ing-h2-0151, ing-h2-0182, ing-h2-0187, ing-h2-0188, ing-h2-0189, ing-h2-0190, ing-h2-0192, ing-h2-0193, ing-h2-0195, ing-h2-0196, ing-h2-0199, ing-h2-0200, ing-h2-0242, ing-h2-0255, ing-h2-0259, ing-h2-0260, ing-h2-0318, ing-h2-0340, ing-h2-0349 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 153/271 | 56.5% | 50.5%–62.2% | ing-h2-0019, ing-h2-0022, ing-h2-0025, ing-h2-0027, ing-h2-0028, ing-h2-0030, ing-h2-0032, ing-h2-0034, ing-h2-0035, ing-h2-0040, ing-h2-0041, ing-h2-0042, ing-h2-0043, ing-h2-0044, ing-h2-0045, ing-h2-0046, ing-h2-0047, ing-h2-0048, ing-h2-0049, ing-h2-0050, ing-h2-0051, ing-h2-0052, ing-h2-0053, ing-h2-0054, ing-h2-0055 … (+128 in the JSON report) |
| C3c abstention (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C4 unnecessary rejection (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C3 + C4 (of R) | 177/271 | 65.3% | 59.5%–70.7% |  |
| C5 correct review (of A) | 69/69 | 100.0% | 94.7%–100.0% |  |
| C5a useful partial (of A) | 29/69 | 42.0% | 31.1%–53.8% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 40/69 | 58.0% | 46.2%–68.9% | ing-h2-0017, ing-h2-0018, ing-h2-0056, ing-h2-0144, ing-h2-0165, ing-h2-0181, ing-h2-0210, ing-h2-0214, ing-h2-0215, ing-h2-0216, ing-h2-0217, ing-h2-0218, ing-h2-0219, ing-h2-0220, ing-h2-0221, ing-h2-0222, ing-h2-0223, ing-h2-0224, ing-h2-0225, ing-h2-0226, ing-h2-0227, ing-h2-0228, ing-h2-0229, ing-h2-0269, ing-h2-0270 … (+15 in the JSON report) |
| C5c abstention (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C6 review rejected (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C7 correct rejection (of U) | 2/19 | 10.5% | 2.9%–31.4% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 17/19 | 89.5% | 68.6%–97.1% | ing-h2-0284, ing-h2-0285, ing-h2-0286, ing-h2-0287, ing-h2-0288, ing-h2-0289, ing-h2-0290, ing-h2-0291, ing-h2-0292, ing-h2-0293, ing-h2-0294, ing-h2-0295, ing-h2-0296, ing-h2-0297, ing-h2-0298, ing-h2-0299, ing-h2-0302 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: engine error (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: output fails the contract validator (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S1 fabricated amount** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S3 cross-dimension** (of N) | 5/359 | 1.4% | 0.6%–3.2% | ing-h2-0015, ing-h2-0073, ing-h2-0106, ing-h2-0178, ing-h2-0179 |
| **S4 suppressed ambiguity** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S5 silent alternative choice** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S6 package representation changed** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S7 dropped material qualifier** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S8 ready on a non-ingredient** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| Any severe error (of N) | 5/359 | 1.4% | 0.6%–3.2% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/359 | 0.0% | ≤ 1.1% |  |

Strict matching: C1 73/271 (26.9%, 22.0%–32.5%) · C1+ 70/271 (25.8%, 21.0%–31.4%) · C2 21/359 (5.9%, 3.9%–8.8%). Lines whose class differs under strict matching: ing-h2-0162.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 97/271 (35.8%, 30.3%–41.7%) | 97/271 (35.8%, 30.3%–41.7%) |
| quantity | 123/271 (45.4%, 39.6%–51.3%) | 123/271 (45.4%, 39.6%–51.3%) |
| unit | 99/271 (36.5%, 31.0%–42.4%) | 99/271 (36.5%, 31.0%–42.4%) |

##### By category — holdout-v2 (exposed; historical acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 23 | 20/3/0 | 18/20 | 18/20 | 0 (0/0) | 2/20 | 0/2/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 19 | 17/2/0 | 12/17 | 12/17 | 0 (0/0) | 5/17 | 0/5/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 17 | 15/2/0 | 0/15 | 0/15 | 0 (0/0) | 15/15 | 0/15/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 31 | 29/2/0 | 9/29 | 9/29 | 0 (0/0) | 20/29 | 2/18/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 9 | 8/1/0 | 1/8 | 1/8 | 3 (0/3) | 4/8 | 0/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 91 | 85/6/0 | 27/85 | 26/85 | 9 (3/6) | 49/85 | 3/46/0/0 | 0 | 6/6 | 0 | 0/0 | 0 | 0 | S3×1 |
| source_choice | 7 | 5/2/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 17/17 | 0 | 0/0 | 0 | 0 | 0 |
| range | 13 | 0/13/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 13/13 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 6 | 5/1/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 1/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 23 | 21/2/0 | 2/21 | 2/21 | 0 (0/0) | 19/21 | 13/6/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 31 | 0/31/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 31/31 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 57 | 53/4/0 | 0/53 | 0/53 | 6 (6/0) | 47/53 | 3/44/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| package_size | 33 | 30/3/0 | 0/30 | 0/30 | 0 (0/0) | 30/30 | 1/29/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| oz_vs_floz | 25 | 25/0/0 | 7/25 | 7/25 | 2 (1/1) | 16/25 | 2/14/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 |
| compound_quantity | 11 | 11/0/0 | 0/11 | 0/11 | 0 (0/0) | 11/11 | 0/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 23 | 23/0/0 | 0/23 | 0/23 | 0 (0/0) | 23/23 | 0/23/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 8 | 8/0/0 | 0/8 | 0/8 | 0 (0/0) | 8/8 | 1/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 7 | 6/1/0 | 4/6 | 4/6 | 1 (1/0) | 1/6 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 8 | 6/2/0 | 1/6 | 1/6 | 5 (0/5) | 0/6 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 23 | 23/0/0 | 0/23 | 0/23 | 0 (0/0) | 23/23 | 1/22/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 9 | 9/0/0 | 1/9 | 0/9 | 0 (0/0) | 8/9 | 0/8/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 14 | 13/1/0 | 0/13 | 0/13 | 3 (3/0) | 10/13 | 1/9/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×3 |
| heading_non_ingredient | 16 | 0/0/16 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/16 | 16 | 0 | 0 |
| empty | 3 | 0/0/3 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 2/3 | 1 | 0 | 0 |
| unicode_text | 27 | 17/6/4 | 6/17 | 6/17 | 0 (0/0) | 11/17 | 1/10/0/0 | 0 | 6/6 | 0 | 1/4 | 3 | 0 | 0 |
| ambiguous_number_format | 4 | 0/4/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 19 | 17/2/0 | 5/17 | 5/17 | 7 (5/2) | 5/17 | 1/4/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×3 |
| seasoning_lookalike | 38 | 25/13/0 | 13/25 | 13/25 | 0 (0/0) | 12/25 | 4/8/0/0 | 0 | 13/13 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 20 | 9/11/0 | 4/9 | 4/9 | 0 (0/0) | 5/9 | 2/3/0/0 | 0 | 11/11 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 8 | 8/0/0 | 0/8 | 0/8 | 1 (1/0) | 7/8 | 1/6/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 |
| long_line | 3 | 3/0/0 | 3/3 | 2/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 26 | 25/1/0 | 0/25 | 0/25 | 0 (0/0) | 25/25 | 11/14/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By source — holdout-v2 (exposed; historical acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 305 | 240/46/19 | 57/240 | 55/240 | 20 (11/9) | 163/240 | 21/142/0/0 | 0 | 46/46 | 0 | 2/19 | 17 | 0 | S3×5 |
| repo_test_input | 54 | 31/23/0 | 16/31 | 16/31 | 1 (0/1) | 14/31 | 3/11/0/0 | 0 | 23/23 | 0 | 0/0 | 0 | 0 | 0 |

##### Acceptance — Gate G2 on holdout-v2 (exposed; historical acceptance set), engine `legacy-table-import-2`

Basis: historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate.

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 73/271 (26.9%, 22.0%–32.5%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 97/271 (35.8%, 30.3%–41.7%); quantity 123/271 (45.4%, 39.6%–51.3%); unit 99/271 (36.5%, 31.0%–42.4%) | as A1, for each field (accepted name matches) | **not met** |
| A3 | high-severity false certainty = 0 | C2High 11/359 (3.1%, 1.7%–5.4%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 0/359 (0.0%, ≤ 1.1%); S3 5/359 (1.4%, 0.6%–3.2%); S4 0/359 (0.0%, ≤ 1.1%); S5 0/359 (0.0%, ≤ 1.1%); S6 0/359 (0.0%, ≤ 1.1%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 177/271 (65.3%, 59.5%–70.7%) | point estimate | **not met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/359 (0.0%, ≤ 1.1%); engineError 0/359 (0.0%, ≤ 1.1%); invalidOutput 0/359 (0.0%, ≤ 1.1%); nondeterministic 0/359 (0.0%, ≤ 1.1%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v2 (exposed; historical acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases pre-registered as debatable at holdout-v2 adjudication (EVALUATION-PLAN-v2 change log 3(a)): 1 excluded (ing-h2-0087), 358 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 73/270 (27.0%, 22.1%–32.6%) | not met |
| A2 | name 97/270 (35.9%, 30.4%–41.8%); quantity 123/270 (45.6%, 39.7%–51.5%); unit 99/270 (36.7%, 31.1%–42.6%) | not met |
| A3 | C2High 11/358 (3.1%, 1.7%–5.4%) | not met |
| A4 | S1 0/358 (0.0%, ≤ 1.1%); S3 5/358 (1.4%, 0.6%–3.2%); S4 0/358 (0.0%, ≤ 1.1%); S5 0/358 (0.0%, ≤ 1.1%); S6 0/358 (0.0%, ≤ 1.1%) | not met |
| A5 | C3plusC4 176/270 (65.2%, 59.3%–70.6%) | not met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 29 excluded (ing-h2-0158, ing-h2-0186, ing-h2-0205, ing-h2-0206, ing-h2-0207, ing-h2-0208, ing-h2-0209, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0350, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359), 40 needs_review lines kept — C5 40/40 (100.0%, 91.2%–100.0%) · C5a 1/40 · C5b 39/40 · C5c 0/40 · C5x 0/40 · C6 0/40 (0.0%, ≤ 8.8%) · S4 0/40 (0.0%, ≤ 8.8%).

### Outcomes — engine `legacy-table-import-2+suggestion`

| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|
| dev (development; diagnostics only) | 182 | 152/22/8 | 54/152 (35.5%, 28.4%–43.4%) | 54/152 (35.5%, 28.4%–43.4%) | 1/5 | 92/152 (60.5%, 52.6%–68.0%) | 22/22 | 3/8 | 0 | S3×10 S5×3 S6×10 |
| holdout-v1 (previously exposed) | 128 | 104/18/6 | 37/104 (35.6%, 27.0%–45.1%) | 37/104 (35.6%, 27.0%–45.1%) | 0/4 | 63/104 (60.6%, 51.0%–69.4%) | 18/18 | 2/6 | 0 | S3×5 S5×2 S6×5 |
| holdout-v2 (exposed; historical acceptance set) | 359 | 271/69/19 | 73/271 (26.9%, 22.0%–32.5%) | 71/271 (26.2%, 21.3%–31.7%) | 11/10 | 177/271 (65.3%, 59.5%–70.7%) | 69/69 | 2/19 | 0 | S3×28 S5×9 S6×23 |

#### dev (development; diagnostics only) — 182 lines (R 152, A 22, U 8)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 54/152 | 35.5% | 28.4%–43.4% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 54/152 | 35.5% | 28.4%–43.4% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| **C2 incorrect ready** (of N) | 6/182 | 3.3% | 1.5%–7.0% |  |
| C2 — high false certainty (of N) | 1/182 | 0.5% | 0.1%–3.0% | ing-dev-0087 |
| C2 — medium false certainty (of N) | 5/182 | 2.8% | 1.2%–6.3% | ing-dev-0039, ing-dev-0125, ing-dev-0126, ing-dev-0127, ing-dev-0128 |
| C2 on ready labels (of R) | 6/152 | 4.0% | 1.8%–8.3% |  |
| C2 on needs_review labels (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C2 on unsupported labels (of U) | 0/8 | 0.0% | ≤ 32.4% |  |
| C3 unnecessary review (of R) | 92/152 | 60.5% | 52.6%–68.0% |  |
| C3a useful partial (of R) | 26/152 | 17.1% | 11.9%–23.9% | ing-dev-0007, ing-dev-0045, ing-dev-0047, ing-dev-0048, ing-dev-0049, ing-dev-0062, ing-dev-0063, ing-dev-0065, ing-dev-0066, ing-dev-0067, ing-dev-0068, ing-dev-0069, ing-dev-0072, ing-dev-0073, ing-dev-0074, ing-dev-0075, ing-dev-0107, ing-dev-0109, ing-dev-0110, ing-dev-0111, ing-dev-0112, ing-dev-0113, ing-dev-0161, ing-dev-0177, ing-dev-0179 … (+1 in the JSON report) |
| C3b wrong partial — review-only wrong pre-fill (of R) | 66/152 | 43.4% | 35.8%–51.4% | ing-dev-0001, ing-dev-0002, ing-dev-0003, ing-dev-0004, ing-dev-0006, ing-dev-0012, ing-dev-0026, ing-dev-0027, ing-dev-0028, ing-dev-0029, ing-dev-0030, ing-dev-0031, ing-dev-0032, ing-dev-0038, ing-dev-0040, ing-dev-0064, ing-dev-0070, ing-dev-0071, ing-dev-0081, ing-dev-0082, ing-dev-0083, ing-dev-0084, ing-dev-0085, ing-dev-0086, ing-dev-0088 … (+41 in the JSON report) |
| C3c abstention (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C4 unnecessary rejection (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3 + C4 (of R) | 92/152 | 60.5% | 52.6%–68.0% |  |
| C5 correct review (of A) | 22/22 | 100.0% | 85.1%–100.0% |  |
| C5a useful partial (of A) | 5/22 | 22.7% | 10.1%–43.4% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 17/22 | 77.3% | 56.6%–89.9% | ing-dev-0005, ing-dev-0021, ing-dev-0050, ing-dev-0051, ing-dev-0052, ing-dev-0053, ing-dev-0054, ing-dev-0055, ing-dev-0056, ing-dev-0057, ing-dev-0058, ing-dev-0059, ing-dev-0060, ing-dev-0061, ing-dev-0155, ing-dev-0156, ing-dev-0157 |
| C5c abstention (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C6 review rejected (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C7 correct rejection (of U) | 3/8 | 37.5% | 13.7%–69.4% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 5/8 | 62.5% | 30.6%–86.3% | ing-dev-0143, ing-dev-0144, ing-dev-0145, ing-dev-0146, ing-dev-0147 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: engine error (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: output fails the contract validator (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S1 fabricated amount** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S3 cross-dimension** (of N) | 10/182 | 5.5% | 3.0%–9.8% | ing-dev-0003, ing-dev-0090, ing-dev-0091, ing-dev-0092, ing-dev-0093, ing-dev-0094, ing-dev-0095, ing-dev-0096, ing-dev-0119, ing-dev-0124 |
| **S4 suppressed ambiguity** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S5 silent alternative choice** (of N) | 3/182 | 1.7% | 0.6%–4.7% | ing-dev-0005, ing-dev-0051, ing-dev-0055 |
| **S6 package representation changed** (of N) | 10/182 | 5.5% | 3.0%–9.8% | ing-dev-0003, ing-dev-0090, ing-dev-0091, ing-dev-0092, ing-dev-0093, ing-dev-0094, ing-dev-0095, ing-dev-0096, ing-dev-0119, ing-dev-0124 |
| **S7 dropped material qualifier** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S8 ready on a non-ingredient** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Any severe error (of N) | 13/182 | 7.1% | 4.2%–11.8% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/182 | 0.0% | ≤ 2.1% |  |

Strict matching: C1 54/152 (35.5%, 28.4%–43.4%) · C1+ 54/152 (35.5%, 28.4%–43.4%) · C2 6/182 (3.3%, 1.5%–7.0%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 103/152 (67.8%, 60.0%–74.7%) | 103/152 (67.8%, 60.0%–74.7%) |
| quantity | 97/152 (63.8%, 55.9%–71.0%) | 97/152 (63.8%, 55.9%–71.0%) |
| unit | 95/152 (62.5%, 54.6%–69.8%) | 95/152 (62.5%, 54.6%–69.8%) |

##### By category — dev (development; diagnostics only)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 9 | 8/1/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 10 | 9/1/0 | 5/9 | 5/9 | 0 (0/0) | 4/9 | 0/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 8 | 8/0/0 | 5/8 | 5/8 | 0 (0/0) | 3/8 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 0/4 | 0/4 | 1 (0/1) | 3/4 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 29 | 28/1/0 | 14/28 | 14/28 | 3 (1/2) | 11/28 | 5/6/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| source_choice | 6 | 5/1/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 3/2/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | S5×3 |
| range | 6 | 0/6/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 6/6 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 3/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 14 | 14/0/0 | 1/14 | 1/14 | 0 (0/0) | 13/14 | 10/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 20 | 19/1/0 | 0/19 | 0/19 | 1 (1/0) | 18/19 | 1/17/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×6 S6×6 |
| package_size | 11 | 11/0/0 | 0/11 | 0/11 | 0 (0/0) | 11/11 | 0/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×10 S6×10 |
| oz_vs_floz | 9 | 9/0/0 | 7/9 | 7/9 | 0 (0/0) | 2/9 | 1/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| compound_quantity | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 6/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 8 | 8/0/0 | 4/8 | 4/8 | 0 (0/0) | 4/8 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| form_cooked_raw | 4 | 4/0/0 | 0/4 | 0/4 | 4 (0/4) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 5 | 0/0/5 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/5 | 5 | 0 | 0 |
| empty | 3 | 0/0/3 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 3/3 | 0 | 0 | 0 |
| unicode_text | 7 | 4/2/1 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 2/2 | 0 | 1/1 | 0 | 0 | 0 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 6 | 6/0/0 | 4/6 | 4/6 | 0 (0/0) | 2/6 | 2/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 11 | 10/1/0 | 9/10 | 9/10 | 0 (0/0) | 1/10 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 11 | 10/1/0 | 4/10 | 4/10 | 0 (0/0) | 6/10 | 3/3/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 3 | 3/0/0 | 2/3 | 2/3 | 0 (0/0) | 1/3 | 1/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 2/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |

##### Sensitivity — dev (development; diagnostics only) (informational, not the acceptance basis)

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 5 excluded (ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0079, ing-dev-0080), 17 needs_review lines kept — C5 17/17 (100.0%, 81.6%–100.0%) · C5a 0/17 · C5b 17/17 · C5c 0/17 · C5x 0/17 · C6 0/17 (0.0%, ≤ 18.4%) · S4 0/17 (0.0%, ≤ 18.4%).

#### holdout-v1 (previously exposed) — 128 lines (R 104, A 18, U 6)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 37/104 | 35.6% | 27.0%–45.1% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 37/104 | 35.6% | 27.0%–45.1% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| **C2 incorrect ready** (of N) | 4/128 | 3.1% | 1.2%–7.8% |  |
| C2 — high false certainty (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| C2 — medium false certainty (of N) | 4/128 | 3.1% | 1.2%–7.8% | ing-hold-0023, ing-hold-0084, ing-hold-0085, ing-hold-0086 |
| C2 on ready labels (of R) | 4/104 | 3.9% | 1.5%–9.5% |  |
| C2 on needs_review labels (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C2 on unsupported labels (of U) | 0/6 | 0.0% | ≤ 39.0% |  |
| C3 unnecessary review (of R) | 63/104 | 60.6% | 51.0%–69.4% |  |
| C3a useful partial (of R) | 17/104 | 16.4% | 10.5%–24.6% | ing-hold-0028, ing-hold-0029, ing-hold-0030, ing-hold-0040, ing-hold-0041, ing-hold-0043, ing-hold-0044, ing-hold-0045, ing-hold-0046, ing-hold-0047, ing-hold-0048, ing-hold-0049, ing-hold-0075, ing-hold-0076, ing-hold-0078, ing-hold-0120, ing-hold-0126 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 46/104 | 44.2% | 35.1%–53.8% | ing-hold-0010, ing-hold-0011, ing-hold-0012, ing-hold-0013, ing-hold-0014, ing-hold-0015, ing-hold-0019, ing-hold-0020, ing-hold-0021, ing-hold-0022, ing-hold-0042, ing-hold-0054, ing-hold-0055, ing-hold-0056, ing-hold-0057, ing-hold-0058, ing-hold-0059, ing-hold-0060, ing-hold-0061, ing-hold-0062, ing-hold-0063, ing-hold-0064, ing-hold-0065, ing-hold-0071, ing-hold-0072 … (+21 in the JSON report) |
| C3c abstention (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C4 unnecessary rejection (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3 + C4 (of R) | 63/104 | 60.6% | 51.0%–69.4% |  |
| C5 correct review (of A) | 18/18 | 100.0% | 82.4%–100.0% |  |
| C5a useful partial (of A) | 5/18 | 27.8% | 12.5%–50.9% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 13/18 | 72.2% | 49.1%–87.5% | ing-hold-0006, ing-hold-0031, ing-hold-0032, ing-hold-0033, ing-hold-0034, ing-hold-0035, ing-hold-0036, ing-hold-0037, ing-hold-0038, ing-hold-0039, ing-hold-0106, ing-hold-0107, ing-hold-0108 |
| C5c abstention (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C6 review rejected (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C7 correct rejection (of U) | 2/6 | 33.3% | 9.7%–70.0% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 4/6 | 66.7% | 30.0%–90.3% | ing-hold-0097, ing-hold-0098, ing-hold-0099, ing-hold-0100 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: engine error (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: output fails the contract validator (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S1 fabricated amount** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S3 cross-dimension** (of N) | 5/128 | 3.9% | 1.7%–8.8% | ing-hold-0061, ing-hold-0062, ing-hold-0063, ing-hold-0064, ing-hold-0065 |
| **S4 suppressed ambiguity** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S5 silent alternative choice** (of N) | 2/128 | 1.6% | 0.4%–5.5% | ing-hold-0032, ing-hold-0034 |
| **S6 package representation changed** (of N) | 5/128 | 3.9% | 1.7%–8.8% | ing-hold-0061, ing-hold-0062, ing-hold-0063, ing-hold-0064, ing-hold-0065 |
| **S7 dropped material qualifier** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S8 ready on a non-ingredient** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Any severe error (of N) | 7/128 | 5.5% | 2.7%–10.9% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/128 | 0.0% | ≤ 2.9% |  |

Strict matching: C1 37/104 (35.6%, 27.0%–45.1%) · C1+ 37/104 (35.6%, 27.0%–45.1%) · C2 4/128 (3.1%, 1.2%–7.8%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 69/104 (66.3%, 56.8%–74.7%) | 69/104 (66.3%, 56.8%–74.7%) |
| quantity | 64/104 (61.5%, 51.9%–70.3%) | 64/104 (61.5%, 51.9%–70.3%) |
| unit | 64/104 (61.5%, 51.9%–70.3%) | 64/104 (61.5%, 51.9%–70.3%) |

##### By category — holdout-v1 (previously exposed)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 6 | 5/1/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 11 | 11/0/0 | 0/11 | 0/11 | 0 (0/0) | 11/11 | 0/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 7 | 7/0/0 | 3/7 | 3/7 | 0 (0/0) | 4/7 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 5 | 5/0/0 | 0/5 | 0/5 | 1 (0/1) | 4/5 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 20 | 18/2/0 | 11/18 | 11/18 | 1 (0/1) | 6/18 | 3/3/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S5×1 |
| source_choice | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 3/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 4 | 0/4/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | S5×2 |
| range | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 2/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 8 | 8/0/0 | 0/8 | 0/8 | 0 (0/0) | 8/8 | 8/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| package_size | 6 | 6/0/0 | 0/6 | 0/6 | 0 (0/0) | 6/6 | 0/6/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×5 S6×5 |
| oz_vs_floz | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 3/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 2 | 2/0/0 | 0/2 | 0/2 | 0 (0/0) | 2/2 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 3 | 3/0/0 | 0/3 | 0/3 | 3 (0/3) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 4 | 0/0/4 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/4 | 4 | 0 | 0 |
| empty | 2 | 0/0/2 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 2/2 | 0 | 0 | 0 |
| unicode_text | 5 | 3/1/1 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 1/1 | 0 | 1/1 | 0 | 0 | 0 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 4 | 3/1/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 7 | 7/0/0 | 5/7 | 5/7 | 0 (0/0) | 2/7 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 6 | 4/2/0 | 2/4 | 2/4 | 0 (0/0) | 2/4 | 2/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 4 | 4/0/0 | 0/4 | 0/4 | 0 (0/0) | 4/4 | 0/4/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 2 | 2/0/0 | 1/2 | 1/2 | 0 (0/0) | 1/2 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 1/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |

##### Sensitivity — holdout-v1 (previously exposed) (informational, not the acceptance basis)

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 5 excluded (ing-hold-0050, ing-hold-0051, ing-hold-0052, ing-hold-0053, ing-hold-0119), 13 needs_review lines kept — C5 13/13 (100.0%, 77.2%–100.0%) · C5a 0/13 · C5b 13/13 · C5c 0/13 · C5x 0/13 · C6 0/13 (0.0%, ≤ 22.8%) · S4 0/13 (0.0%, ≤ 22.8%).

#### holdout-v2 (exposed; historical acceptance set) — 359 lines (R 271, A 69, U 19)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 73/271 | 26.9% | 22.0%–32.5% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 71/271 | 26.2% | 21.3%–31.7% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 2/271 | 0.7% | 0.2%–2.6% | ing-h2-0173, ing-h2-0304 |
| **C2 incorrect ready** (of N) | 21/359 | 5.9% | 3.9%–8.8% |  |
| C2 — high false certainty (of N) | 11/359 | 3.1% | 1.7%–5.4% | ing-h2-0015, ing-h2-0064, ing-h2-0065, ing-h2-0072, ing-h2-0073, ing-h2-0074, ing-h2-0075, ing-h2-0106, ing-h2-0156, ing-h2-0178, ing-h2-0179 |
| C2 — medium false certainty (of N) | 10/359 | 2.8% | 1.5%–5.1% | ing-h2-0159, ing-h2-0160, ing-h2-0161, ing-h2-0163, ing-h2-0164, ing-h2-0236, ing-h2-0237, ing-h2-0241, ing-h2-0265, ing-h2-0339 |
| C2 on ready labels (of R) | 21/271 | 7.8% | 5.1%–11.6% |  |
| C2 on needs_review labels (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C2 on unsupported labels (of U) | 0/19 | 0.0% | ≤ 16.8% |  |
| C3 unnecessary review (of R) | 177/271 | 65.3% | 59.5%–70.7% |  |
| C3a useful partial (of R) | 49/271 | 18.1% | 14.0%–23.1% | ing-h2-0077, ing-h2-0080, ing-h2-0104, ing-h2-0108, ing-h2-0109, ing-h2-0112, ing-h2-0114, ing-h2-0115, ing-h2-0116, ing-h2-0117, ing-h2-0118, ing-h2-0131, ing-h2-0132, ing-h2-0134, ing-h2-0136, ing-h2-0137, ing-h2-0138, ing-h2-0139, ing-h2-0143, ing-h2-0149, ing-h2-0150, ing-h2-0151, ing-h2-0182, ing-h2-0183, ing-h2-0185 … (+24 in the JSON report) |
| C3b wrong partial — review-only wrong pre-fill (of R) | 128/271 | 47.2% | 41.4%–53.2% | ing-h2-0019, ing-h2-0022, ing-h2-0025, ing-h2-0027, ing-h2-0028, ing-h2-0030, ing-h2-0032, ing-h2-0034, ing-h2-0035, ing-h2-0040, ing-h2-0041, ing-h2-0042, ing-h2-0043, ing-h2-0044, ing-h2-0045, ing-h2-0046, ing-h2-0047, ing-h2-0048, ing-h2-0049, ing-h2-0050, ing-h2-0051, ing-h2-0052, ing-h2-0053, ing-h2-0054, ing-h2-0055 … (+103 in the JSON report) |
| C3c abstention (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C4 unnecessary rejection (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C3 + C4 (of R) | 177/271 | 65.3% | 59.5%–70.7% |  |
| C5 correct review (of A) | 69/69 | 100.0% | 94.7%–100.0% |  |
| C5a useful partial (of A) | 30/69 | 43.5% | 32.4%–55.2% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 39/69 | 56.5% | 44.8%–67.6% | ing-h2-0017, ing-h2-0018, ing-h2-0056, ing-h2-0144, ing-h2-0165, ing-h2-0181, ing-h2-0210, ing-h2-0214, ing-h2-0215, ing-h2-0216, ing-h2-0217, ing-h2-0218, ing-h2-0219, ing-h2-0220, ing-h2-0221, ing-h2-0222, ing-h2-0223, ing-h2-0224, ing-h2-0225, ing-h2-0226, ing-h2-0227, ing-h2-0228, ing-h2-0229, ing-h2-0269, ing-h2-0270 … (+14 in the JSON report) |
| C5c abstention (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C6 review rejected (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C7 correct rejection (of U) | 2/19 | 10.5% | 2.9%–31.4% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 17/19 | 89.5% | 68.6%–97.1% | ing-h2-0284, ing-h2-0285, ing-h2-0286, ing-h2-0287, ing-h2-0288, ing-h2-0289, ing-h2-0290, ing-h2-0291, ing-h2-0292, ing-h2-0293, ing-h2-0294, ing-h2-0295, ing-h2-0296, ing-h2-0297, ing-h2-0298, ing-h2-0299, ing-h2-0302 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: engine error (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: output fails the contract validator (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S1 fabricated amount** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S3 cross-dimension** (of N) | 28/359 | 7.8% | 5.5%–11.0% | ing-h2-0015, ing-h2-0073, ing-h2-0084, ing-h2-0085, ing-h2-0086, ing-h2-0087, ing-h2-0088, ing-h2-0089, ing-h2-0090, ing-h2-0091, ing-h2-0092, ing-h2-0093, ing-h2-0094, ing-h2-0095, ing-h2-0096, ing-h2-0097, ing-h2-0098, ing-h2-0099, ing-h2-0100, ing-h2-0103, ing-h2-0106, ing-h2-0157, ing-h2-0178, ing-h2-0179, ing-h2-0279, ing-h2-0315, ing-h2-0316, ing-h2-0341 |
| **S4 suppressed ambiguity** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S5 silent alternative choice** (of N) | 9/359 | 2.5% | 1.3%–4.7% | ing-h2-0214, ing-h2-0217, ing-h2-0219, ing-h2-0221, ing-h2-0222, ing-h2-0225, ing-h2-0226, ing-h2-0227, ing-h2-0228 |
| **S6 package representation changed** (of N) | 23/359 | 6.4% | 4.3%–9.4% | ing-h2-0084, ing-h2-0085, ing-h2-0086, ing-h2-0087, ing-h2-0088, ing-h2-0089, ing-h2-0090, ing-h2-0091, ing-h2-0092, ing-h2-0093, ing-h2-0094, ing-h2-0095, ing-h2-0096, ing-h2-0097, ing-h2-0098, ing-h2-0099, ing-h2-0100, ing-h2-0103, ing-h2-0157, ing-h2-0279, ing-h2-0315, ing-h2-0316, ing-h2-0341 |
| **S7 dropped material qualifier** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S8 ready on a non-ingredient** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| Any severe error (of N) | 37/359 | 10.3% | 7.6%–13.9% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/359 | 0.0% | ≤ 1.1% |  |

Strict matching: C1 73/271 (26.9%, 22.0%–32.5%) · C1+ 70/271 (25.8%, 21.0%–31.4%) · C2 21/359 (5.9%, 3.9%–8.8%). Lines whose class differs under strict matching: ing-h2-0162.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 157/271 (57.9%, 52.0%–63.7%) | 157/271 (57.9%, 52.0%–63.7%) |
| quantity | 150/271 (55.4%, 49.4%–61.2%) | 150/271 (55.4%, 49.4%–61.2%) |
| unit | 135/271 (49.8%, 43.9%–55.7%) | 135/271 (49.8%, 43.9%–55.7%) |

##### By category — holdout-v2 (exposed; historical acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 23 | 20/3/0 | 18/20 | 18/20 | 0 (0/0) | 2/20 | 0/2/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 19 | 17/2/0 | 12/17 | 12/17 | 0 (0/0) | 5/17 | 2/3/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S5×1 |
| fraction_third | 17 | 15/2/0 | 0/15 | 0/15 | 0 (0/0) | 15/15 | 0/15/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×1 S5×1 S6×1 |
| mixed_vulgar | 31 | 29/2/0 | 9/29 | 9/29 | 0 (0/0) | 20/29 | 4/16/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| nested_parens | 9 | 8/1/0 | 1/8 | 1/8 | 3 (0/3) | 4/8 | 0/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S5×1 |
| prep_note | 91 | 85/6/0 | 27/85 | 26/85 | 9 (3/6) | 49/85 | 14/35/0/0 | 0 | 6/6 | 0 | 0/0 | 0 | 0 | S3×10 S5×1 S6×9 |
| source_choice | 7 | 5/2/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 3/2/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 17/17 | 0 | 0/0 | 0 | 0 | S5×9 |
| range | 13 | 0/13/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 13/13 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| optional | 6 | 5/1/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 3/2/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 23 | 21/2/0 | 2/21 | 2/21 | 0 (0/0) | 19/21 | 15/4/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 31 | 0/31/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 31/31 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 57 | 53/4/0 | 0/53 | 0/53 | 6 (6/0) | 47/53 | 5/42/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | S3×21 S6×21 |
| package_size | 33 | 30/3/0 | 0/30 | 0/30 | 0 (0/0) | 30/30 | 1/29/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | S3×23 S6×23 |
| oz_vs_floz | 25 | 25/0/0 | 7/25 | 7/25 | 2 (1/1) | 16/25 | 7/9/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×6 S6×5 |
| compound_quantity | 11 | 11/0/0 | 0/11 | 0/11 | 0 (0/0) | 11/11 | 0/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 23 | 23/0/0 | 0/23 | 0/23 | 0 (0/0) | 23/23 | 15/8/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 8 | 8/0/0 | 0/8 | 0/8 | 0 (0/0) | 8/8 | 3/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 7 | 6/1/0 | 4/6 | 4/6 | 1 (1/0) | 1/6 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| form_cooked_raw | 8 | 6/2/0 | 1/6 | 1/6 | 5 (0/5) | 0/6 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 23 | 23/0/0 | 0/23 | 0/23 | 0 (0/0) | 23/23 | 1/22/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 9 | 9/0/0 | 1/9 | 0/9 | 0 (0/0) | 8/9 | 0/8/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 14 | 13/1/0 | 0/13 | 0/13 | 3 (3/0) | 10/13 | 1/9/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×3 |
| heading_non_ingredient | 16 | 0/0/16 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/16 | 16 | 0 | 0 |
| empty | 3 | 0/0/3 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 2/3 | 1 | 0 | 0 |
| unicode_text | 27 | 17/6/4 | 6/17 | 6/17 | 0 (0/0) | 11/17 | 2/9/0/0 | 0 | 6/6 | 0 | 1/4 | 3 | 0 | S3×2 S5×2 S6×2 |
| ambiguous_number_format | 4 | 0/4/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 19 | 17/2/0 | 5/17 | 5/17 | 7 (5/2) | 5/17 | 2/3/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×3 |
| seasoning_lookalike | 38 | 25/13/0 | 13/25 | 13/25 | 0 (0/0) | 12/25 | 7/5/0/0 | 0 | 13/13 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 20 | 9/11/0 | 4/9 | 4/9 | 0 (0/0) | 5/9 | 2/3/0/0 | 0 | 11/11 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 8 | 8/0/0 | 0/8 | 0/8 | 1 (1/0) | 7/8 | 1/6/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 |
| long_line | 3 | 3/0/0 | 3/3 | 2/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 26 | 25/1/0 | 0/25 | 0/25 | 0 (0/0) | 25/25 | 11/14/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By source — holdout-v2 (exposed; historical acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 305 | 240/46/19 | 57/240 | 55/240 | 20 (11/9) | 163/240 | 45/118/0/0 | 0 | 46/46 | 0 | 2/19 | 17 | 0 | S3×25 S5×9 S6×20 |
| repo_test_input | 54 | 31/23/0 | 16/31 | 16/31 | 1 (0/1) | 14/31 | 4/10/0/0 | 0 | 23/23 | 0 | 0/0 | 0 | 0 | S3×3 S6×3 |

##### Acceptance — Gate G2 on holdout-v2 (exposed; historical acceptance set), engine `legacy-table-import-2+suggestion`

Basis: historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate.

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 73/271 (26.9%, 22.0%–32.5%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 157/271 (57.9%, 52.0%–63.7%); quantity 150/271 (55.4%, 49.4%–61.2%); unit 135/271 (49.8%, 43.9%–55.7%) | as A1, for each field (accepted name matches) | **not met** |
| A3 | high-severity false certainty = 0 | C2High 11/359 (3.1%, 1.7%–5.4%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 0/359 (0.0%, ≤ 1.1%); S3 28/359 (7.8%, 5.5%–11.0%); S4 0/359 (0.0%, ≤ 1.1%); S5 9/359 (2.5%, 1.3%–4.7%); S6 23/359 (6.4%, 4.3%–9.4%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 177/271 (65.3%, 59.5%–70.7%) | point estimate | **not met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/359 (0.0%, ≤ 1.1%); engineError 0/359 (0.0%, ≤ 1.1%); invalidOutput 0/359 (0.0%, ≤ 1.1%); nondeterministic 0/359 (0.0%, ≤ 1.1%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v2 (exposed; historical acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases pre-registered as debatable at holdout-v2 adjudication (EVALUATION-PLAN-v2 change log 3(a)): 1 excluded (ing-h2-0087), 358 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 73/270 (27.0%, 22.1%–32.6%) | not met |
| A2 | name 157/270 (58.1%, 52.2%–63.9%); quantity 150/270 (55.6%, 49.6%–61.4%); unit 135/270 (50.0%, 44.1%–55.9%) | not met |
| A3 | C2High 11/358 (3.1%, 1.7%–5.4%) | not met |
| A4 | S1 0/358 (0.0%, ≤ 1.1%); S3 27/358 (7.5%, 5.2%–10.8%); S4 0/358 (0.0%, ≤ 1.1%); S5 9/358 (2.5%, 1.3%–4.7%); S6 22/358 (6.2%, 4.1%–9.1%) | not met |
| A5 | C3plusC4 176/270 (65.2%, 59.3%–70.6%) | not met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 29 excluded (ing-h2-0158, ing-h2-0186, ing-h2-0205, ing-h2-0206, ing-h2-0207, ing-h2-0208, ing-h2-0209, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0350, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359), 40 needs_review lines kept — C5 40/40 (100.0%, 91.2%–100.0%) · C5a 2/40 · C5b 38/40 · C5c 0/40 · C5x 0/40 · C6 0/40 (0.0%, ≤ 8.8%) · S4 0/40 (0.0%, ≤ 8.8%).

### Outcomes — engine `semantic-v1`

| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|
| dev (development; diagnostics only) | 182 | 152/22/8 | 152/152 (100.0%, 97.5%–100.0%) | 152/152 (100.0%, 97.5%–100.0%) | 0/0 | 0/152 (0.0%, ≤ 2.5%) | 22/22 | 8/8 | 0 | 0 |
| holdout-v1 (previously exposed) | 128 | 104/18/6 | 103/104 (99.0%, 94.8%–99.8%) | 103/104 (99.0%, 94.8%–99.8%) | 0/0 | 1/104 (1.0%, 0.2%–5.3%) | 18/18 | 6/6 | 0 | 0 |
| holdout-v2 (exposed; historical acceptance set) | 359 | 271/69/19 | 254/271 (93.7%, 90.2%–96.0%) | 254/271 (93.7%, 90.2%–96.0%) | 5/1 | 13/271 (4.8%, 2.8%–8.0%) | 67/69 | 16/19 | 0 | S3×1 S4×2 S5×1 S6×1 |

#### dev (development; diagnostics only) — 182 lines (R 152, A 22, U 8)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 152/152 | 100.0% | 97.5%–100.0% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 152/152 | 100.0% | 97.5%–100.0% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| **C2 incorrect ready** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| C2 — high false certainty (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| C2 — medium false certainty (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| C2 on ready labels (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C2 on needs_review labels (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C2 on unsupported labels (of U) | 0/8 | 0.0% | ≤ 32.4% |  |
| C3 unnecessary review (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3a useful partial (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3b wrong partial — review-only wrong pre-fill (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3c abstention (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C4 unnecessary rejection (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C3 + C4 (of R) | 0/152 | 0.0% | ≤ 2.5% |  |
| C5 correct review (of A) | 22/22 | 100.0% | 85.1%–100.0% |  |
| C5a useful partial (of A) | 22/22 | 100.0% | 85.1%–100.0% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C5c abstention (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C6 review rejected (of A) | 0/22 | 0.0% | ≤ 14.9% |  |
| C7 correct rejection (of U) | 8/8 | 100.0% | 67.6%–100.0% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 0/8 | 0.0% | ≤ 32.4% |  |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: engine error (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: output fails the contract validator (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S1 fabricated amount** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S3 cross-dimension** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S4 suppressed ambiguity** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S5 silent alternative choice** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S6 package representation changed** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S7 dropped material qualifier** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| **S8 ready on a non-ingredient** (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Any severe error (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/182 | 0.0% | ≤ 2.1% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/182 | 0.0% | ≤ 2.1% |  |

Strict matching: C1 152/152 (100.0%, 97.5%–100.0%) · C1+ 152/152 (100.0%, 97.5%–100.0%) · C2 0/182 (0.0%, ≤ 2.1%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 152/152 (100.0%, 97.5%–100.0%) | 152/152 (100.0%, 97.5%–100.0%) |
| quantity | 152/152 (100.0%, 97.5%–100.0%) | 152/152 (100.0%, 97.5%–100.0%) |
| unit | 152/152 (100.0%, 97.5%–100.0%) | 152/152 (100.0%, 97.5%–100.0%) |

##### By category — dev (development; diagnostics only)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 9 | 8/1/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 10 | 9/1/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 9 | 9/0/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 8 | 8/0/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 29 | 28/1/0 | 28/28 | 28/28 | 0 (0/0) | 0/28 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| source_choice | 6 | 5/1/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | 0 |
| range | 6 | 0/6/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 6/6 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 14 | 14/0/0 | 14/14 | 14/14 | 0 (0/0) | 0/14 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 20 | 19/1/0 | 19/19 | 19/19 | 0 (0/0) | 0/19 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| package_size | 11 | 11/0/0 | 11/11 | 11/11 | 0 (0/0) | 0/11 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| oz_vs_floz | 9 | 9/0/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 7 | 7/0/0 | 7/7 | 7/7 | 0 (0/0) | 0/7 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 8 | 8/0/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 9 | 9/0/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 5 | 0/0/5 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 5/5 | 0 | 0 | 0 |
| empty | 3 | 0/0/3 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 3/3 | 0 | 0 | 0 |
| unicode_text | 7 | 4/2/1 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 2/2 | 0 | 1/1 | 0 | 0 | 0 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 6 | 6/0/0 | 6/6 | 6/6 | 0 (0/0) | 0/6 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 11 | 10/1/0 | 10/10 | 10/10 | 0 (0/0) | 0/10 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 11 | 10/1/0 | 10/10 | 10/10 | 0 (0/0) | 0/10 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |

##### Sensitivity — dev (development; diagnostics only) (informational, not the acceptance basis)

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 5 excluded (ing-dev-0076, ing-dev-0077, ing-dev-0078, ing-dev-0079, ing-dev-0080), 17 needs_review lines kept — C5 17/17 (100.0%, 81.6%–100.0%) · C5a 17/17 · C5b 0/17 · C5c 0/17 · C5x 0/17 · C6 0/17 (0.0%, ≤ 18.4%) · S4 0/17 (0.0%, ≤ 18.4%).

#### holdout-v1 (previously exposed) — 128 lines (R 104, A 18, U 6)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 103/104 | 99.0% | 94.8%–99.8% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 103/104 | 99.0% | 94.8%–99.8% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| **C2 incorrect ready** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| C2 — high false certainty (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| C2 — medium false certainty (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| C2 on ready labels (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C2 on needs_review labels (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C2 on unsupported labels (of U) | 0/6 | 0.0% | ≤ 39.0% |  |
| C3 unnecessary review (of R) | 1/104 | 1.0% | 0.2%–5.3% |  |
| C3a useful partial (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3b wrong partial — review-only wrong pre-fill (of R) | 1/104 | 1.0% | 0.2%–5.3% | ing-hold-0021 |
| C3c abstention (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C4 unnecessary rejection (of R) | 0/104 | 0.0% | ≤ 3.6% |  |
| C3 + C4 (of R) | 1/104 | 1.0% | 0.2%–5.3% |  |
| C5 correct review (of A) | 18/18 | 100.0% | 82.4%–100.0% |  |
| C5a useful partial (of A) | 17/18 | 94.4% | 74.2%–99.0% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 1/18 | 5.6% | 1.0%–25.8% | ing-hold-0031 |
| C5c abstention (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C6 review rejected (of A) | 0/18 | 0.0% | ≤ 17.6% |  |
| C7 correct rejection (of U) | 6/6 | 100.0% | 61.0%–100.0% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 0/6 | 0.0% | ≤ 39.0% |  |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: engine error (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: output fails the contract validator (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S1 fabricated amount** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S3 cross-dimension** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S4 suppressed ambiguity** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S5 silent alternative choice** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S6 package representation changed** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S7 dropped material qualifier** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| **S8 ready on a non-ingredient** (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Any severe error (of N) | 0/128 | 0.0% | ≤ 2.9% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 2/128 | 1.6% | 0.4%–5.5% | ing-hold-0021, ing-hold-0031 |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/128 | 0.0% | ≤ 2.9% |  |

Strict matching: C1 103/104 (99.0%, 94.8%–99.8%) · C1+ 103/104 (99.0%, 94.8%–99.8%) · C2 0/128 (0.0%, ≤ 2.9%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 103/104 (99.0%, 94.8%–99.8%) | 103/104 (99.0%, 94.8%–99.8%) |
| quantity | 104/104 (100.0%, 96.4%–100.0%) | 104/104 (100.0%, 96.4%–100.0%) |
| unit | 104/104 (100.0%, 96.4%–100.0%) | 104/104 (100.0%, 96.4%–100.0%) |

##### By category — holdout-v1 (previously exposed)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 6 | 5/1/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 11 | 11/0/0 | 10/11 | 10/11 | 0 (0/0) | 1/11 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 7 | 7/0/0 | 7/7 | 7/7 | 0 (0/0) | 0/7 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 5 | 5/0/0 | 4/5 | 4/5 | 0 (0/0) | 1/5 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 20 | 18/2/0 | 18/18 | 18/18 | 0 (0/0) | 0/18 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| source_choice | 7 | 7/0/0 | 6/7 | 6/7 | 0 (0/0) | 1/7 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 4 | 0/4/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| range | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 8 | 8/0/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 5 | 0/5/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 9 | 9/0/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| package_size | 6 | 6/0/0 | 6/6 | 6/6 | 0 (0/0) | 0/6 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| oz_vs_floz | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 2 | 2/0/0 | 2/2 | 2/2 | 0 (0/0) | 0/2 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 4 | 0/0/4 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 4/4 | 0 | 0 | 0 |
| empty | 2 | 0/0/2 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 2/2 | 0 | 0 | 0 |
| unicode_text | 5 | 3/1/1 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 1/1 | 0 | 1/1 | 0 | 0 | 0 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 4 | 3/1/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 7 | 7/0/0 | 7/7 | 7/7 | 0 (0/0) | 0/7 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 6 | 4/2/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 2 | 2/0/0 | 2/2 | 2/2 | 0 (0/0) | 0/2 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |

##### Sensitivity — holdout-v1 (previously exposed) (informational, not the acceptance basis)

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 5 excluded (ing-hold-0050, ing-hold-0051, ing-hold-0052, ing-hold-0053, ing-hold-0119), 13 needs_review lines kept — C5 13/13 (100.0%, 77.2%–100.0%) · C5a 12/13 · C5b 1/13 · C5c 0/13 · C5x 0/13 · C6 0/13 (0.0%, ≤ 22.8%) · S4 0/13 (0.0%, ≤ 22.8%).

#### holdout-v2 (exposed; historical acceptance set) — 359 lines (R 271, A 69, U 19)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 254/271 | 93.7% | 90.2%–96.0% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 254/271 | 93.7% | 90.2%–96.0% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| **C2 incorrect ready** (of N) | 6/359 | 1.7% | 0.8%–3.6% |  |
| C2 — high false certainty (of N) | 5/359 | 1.4% | 0.6%–3.2% | ing-h2-0054, ing-h2-0065, ing-h2-0072, ing-h2-0165, ing-h2-0338 |
| C2 — medium false certainty (of N) | 1/359 | 0.3% | 0.1%–1.6% | ing-h2-0164 |
| C2 on ready labels (of R) | 4/271 | 1.5% | 0.6%–3.7% |  |
| C2 on needs_review labels (of A) | 2/69 | 2.9% | 0.8%–10.0% |  |
| C2 on unsupported labels (of U) | 0/19 | 0.0% | ≤ 16.8% |  |
| C3 unnecessary review (of R) | 13/271 | 4.8% | 2.8%–8.0% |  |
| C3a useful partial (of R) | 5/271 | 1.8% | 0.8%–4.3% | ing-h2-0061, ing-h2-0140, ing-h2-0212, ing-h2-0213, ing-h2-0239 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 6/271 | 2.2% | 1.0%–4.8% | ing-h2-0087, ing-h2-0129, ing-h2-0130, ing-h2-0151, ing-h2-0232, ing-h2-0253 |
| C3c abstention (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 2/271 | 0.7% | 0.2%–2.6% | ing-h2-0040, ing-h2-0041 |
| C4 unnecessary rejection (of R) | 0/271 | 0.0% | ≤ 1.4% |  |
| C3 + C4 (of R) | 13/271 | 4.8% | 2.8%–8.0% |  |
| C5 correct review (of A) | 67/69 | 97.1% | 90.0%–99.2% |  |
| C5a useful partial (of A) | 63/69 | 91.3% | 82.3%–96.0% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 4/69 | 5.8% | 2.3%–14.0% | ing-h2-0218, ing-h2-0219, ing-h2-0220, ing-h2-0277 |
| C5c abstention (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C6 review rejected (of A) | 0/69 | 0.0% | ≤ 5.3% |  |
| C7 correct rejection (of U) | 16/19 | 84.2% | 62.4%–94.5% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 3/19 | 15.8% | 5.5%–37.6% | ing-h2-0286, ing-h2-0288, ing-h2-0297 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: engine error (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: output fails the contract validator (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S1 fabricated amount** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S3 cross-dimension** (of N) | 1/359 | 0.3% | 0.1%–1.6% | ing-h2-0087 |
| **S4 suppressed ambiguity** (of N) | 2/359 | 0.6% | 0.1%–2.0% | ing-h2-0165, ing-h2-0338 |
| **S5 silent alternative choice** (of N) | 1/359 | 0.3% | 0.1%–1.6% | ing-h2-0219 |
| **S6 package representation changed** (of N) | 1/359 | 0.3% | 0.1%–1.6% | ing-h2-0087 |
| **S7 dropped material qualifier** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| **S8 ready on a non-ingredient** (of N) | 0/359 | 0.0% | ≤ 1.1% |  |
| Any severe error (of N) | 4/359 | 1.1% | 0.4%–2.8% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 3/359 | 0.8% | 0.3%–2.4% | ing-h2-0218, ing-h2-0220, ing-h2-0232 |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/359 | 0.0% | ≤ 1.1% |  |

Strict matching: C1 252/271 (93.0%, 89.3%–95.5%) · C1+ 252/271 (93.0%, 89.3%–95.5%) · C2 8/359 (2.2%, 1.1%–4.3%). Lines whose class differs under strict matching: ing-h2-0265, ing-h2-0267.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 258/271 (95.2%, 92.0%–97.2%) | 260/271 (95.9%, 92.9%–97.7%) |
| quantity | 266/271 (98.2%, 95.8%–99.2%) | 266/271 (98.2%, 95.8%–99.2%) |
| unit | 265/271 (97.8%, 95.3%–99.0%) | 265/271 (97.8%, 95.3%–99.0%) |

##### By category — holdout-v2 (exposed; historical acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 23 | 20/3/0 | 19/20 | 19/20 | 0 (0/0) | 1/20 | 0/0/0/1 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| fraction | 19 | 17/2/0 | 16/17 | 16/17 | 0 (0/0) | 1/17 | 0/0/0/1 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 17 | 15/2/0 | 13/15 | 13/15 | 1 (1/0) | 2/15 | 0/2/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S4×1 |
| mixed_vulgar | 31 | 29/2/0 | 26/29 | 26/29 | 0 (0/0) | 3/29 | 1/2/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 9 | 8/1/0 | 7/8 | 7/8 | 0 (0/0) | 1/8 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 91 | 85/6/0 | 82/85 | 82/85 | 3 (2/1) | 1/85 | 1/0/0/0 | 0 | 5/6 | 0 | 0/0 | 0 | 0 | S4×1 |
| source_choice | 7 | 5/2/0 | 4/5 | 4/5 | 0 (0/0) | 1/5 | 0/1/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 17/17 | 0 | 0/0 | 0 | 0 | S5×1 |
| range | 13 | 0/13/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 13/13 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 6 | 5/1/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| unstated_amount | 23 | 21/2/0 | 21/21 | 21/21 | 0 (0/0) | 0/21 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 31 | 0/31/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 31/31 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 57 | 53/4/0 | 49/53 | 49/53 | 3 (3/0) | 1/53 | 0/1/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| package_size | 33 | 30/3/0 | 29/30 | 29/30 | 0 (0/0) | 1/30 | 0/1/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| oz_vs_floz | 25 | 25/0/0 | 24/25 | 24/25 | 0 (0/0) | 1/25 | 1/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 11 | 11/0/0 | 9/11 | 9/11 | 0 (0/0) | 2/11 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 23 | 23/0/0 | 22/23 | 22/23 | 0 (0/0) | 1/23 | 1/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 8 | 8/0/0 | 7/8 | 7/8 | 0 (0/0) | 1/8 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| price_annotation | 7 | 6/1/0 | 6/6 | 6/6 | 0 (0/0) | 0/6 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 8 | 6/2/0 | 5/6 | 5/6 | 3 (2/1) | 0/6 | 0/0/0/0 | 0 | 0/2 | 0 | 0/0 | 0 | 0 | S4×2 |
| number_word | 23 | 23/0/0 | 22/23 | 22/23 | 1 (1/0) | 0/23 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| approximate | 9 | 9/0/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 14 | 13/1/0 | 12/13 | 12/13 | 0 (0/0) | 1/13 | 1/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 16 | 0/0/16 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 13/16 | 3 | 0 | 0 |
| empty | 3 | 0/0/3 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 3/3 | 0 | 0 | 0 |
| unicode_text | 27 | 17/6/4 | 17/17 | 17/17 | 0 (0/0) | 0/17 | 0/0/0/0 | 0 | 6/6 | 0 | 4/4 | 0 | 0 | 0 |
| ambiguous_number_format | 4 | 0/4/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 19 | 17/2/0 | 15/17 | 15/17 | 1 (0/1) | 1/17 | 1/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_lookalike | 38 | 25/13/0 | 25/25 | 25/25 | 0 (0/0) | 0/25 | 0/0/0/0 | 0 | 13/13 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 20 | 9/11/0 | 7/9 | 7/9 | 0 (0/0) | 2/9 | 1/1/0/0 | 0 | 11/11 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 8 | 8/0/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 26 | 25/1/0 | 21/25 | 21/25 | 0 (0/0) | 4/25 | 2/2/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By source — holdout-v2 (exposed; historical acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 305 | 240/46/19 | 223/240 | 223/240 | 5 (4/1) | 13/240 | 5/6/0/2 | 0 | 45/46 | 0 | 16/19 | 3 | 0 | S3×1 S4×1 S5×1 S6×1 |
| repo_test_input | 54 | 31/23/0 | 31/31 | 31/31 | 1 (1/0) | 0/31 | 0/0/0/0 | 0 | 22/23 | 0 | 0/0 | 0 | 0 | S4×1 |

##### Acceptance — Gate G2 on holdout-v2 (exposed; historical acceptance set), engine `semantic-v1`

Basis: historical — holdout-v2 is exposed (EVALUATION-PLAN-v2 change log 8): reported for comparison, not acceptance evidence for a new candidate.

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 254/271 (93.7%, 90.2%–96.0%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 260/271 (95.9%, 92.9%–97.7%); quantity 266/271 (98.2%, 95.8%–99.2%); unit 265/271 (97.8%, 95.3%–99.0%) | as A1, for each field (accepted name matches) | **not met** |
| A3 | high-severity false certainty = 0 | C2High 5/359 (1.4%, 0.6%–3.2%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 0/359 (0.0%, ≤ 1.1%); S3 1/359 (0.3%, 0.1%–1.6%); S4 2/359 (0.6%, 0.1%–2.0%); S5 1/359 (0.3%, 0.1%–1.6%); S6 1/359 (0.3%, 0.1%–1.6%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 13/271 (4.8%, 2.8%–8.0%) | point estimate | **met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/359 (0.0%, ≤ 1.1%); engineError 0/359 (0.0%, ≤ 1.1%); invalidOutput 0/359 (0.0%, ≤ 1.1%); nondeterministic 0/359 (0.0%, ≤ 1.1%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v2 (exposed; historical acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases pre-registered as debatable at holdout-v2 adjudication (EVALUATION-PLAN-v2 change log 3(a)): 1 excluded (ing-h2-0087), 358 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 254/270 (94.1%, 90.6%–96.3%) | not met |
| A2 | name 259/270 (95.9%, 92.8%–97.7%); quantity 265/270 (98.2%, 95.7%–99.2%); unit 265/270 (98.2%, 95.7%–99.2%) | not met |
| A3 | C2High 5/358 (1.4%, 0.6%–3.2%) | not met |
| A4 | S1 0/358 (0.0%, ≤ 1.1%); S3 0/358 (0.0%, ≤ 1.1%); S4 2/358 (0.6%, 0.1%–2.0%); S5 1/358 (0.3%, 0.1%–1.6%); S6 0/358 (0.0%, ≤ 1.1%) | not met |
| A5 | C3plusC4 12/270 (4.4%, 2.6%–7.6%) | met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 29 excluded (ing-h2-0158, ing-h2-0186, ing-h2-0205, ing-h2-0206, ing-h2-0207, ing-h2-0208, ing-h2-0209, ing-h2-0210, ing-h2-0211, ing-h2-0323, ing-h2-0325, ing-h2-0327, ing-h2-0328, ing-h2-0343, ing-h2-0344, ing-h2-0345, ing-h2-0346, ing-h2-0347, ing-h2-0348, ing-h2-0350, ing-h2-0351, ing-h2-0352, ing-h2-0353, ing-h2-0354, ing-h2-0355, ing-h2-0356, ing-h2-0357, ing-h2-0358, ing-h2-0359), 40 needs_review lines kept — C5 38/40 (95.0%, 83.5%–98.6%) · C5a 34/40 · C5b 4/40 · C5c 0/40 · C5x 0/40 · C6 0/40 (0.0%, ≤ 8.8%) · S4 2/40 (5.0%, 1.4%–16.5%).

## Runtime (non-deterministic — not part of the JSON report)

| Run | Items | Total ms | ms per item |
|---|---|---|---|
| ingredients · legacy-table-import-2 | 669 | 121.0 | 0.181 |
| ingredients · legacy-table-import-2+suggestion | 669 | 99.6 | 0.149 |
| ingredients · semantic-v1 | 669 | 162.0 | 0.242 |
| pages · default | 15 | 19.6 | 1.304 |

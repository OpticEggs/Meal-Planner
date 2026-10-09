# Recipe extraction benchmark

@table/recipe-extraction@0.1.0 · contract recipe-extraction/v1 · split all

Holdout freeze: verified

| Corpus file | Entries | SHA-256 |
|---|---|---|
| fixtures/ingredients/dev.jsonl | 182 | `5f8db6d8edd6ad4c…` |
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

### Overall — 310 lines (256 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 106/310 | 34.2% | 29.1%–39.6% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 106/310 | 34.2% | 29.1%–39.6% |
| Core pass, ready-labelled lines (strict) | 91/256 | 35.5% | 29.9%–41.6% |
| Core pass, ready-labelled lines (accepted) | 91/256 | 35.5% | 29.9%–41.6% |
| Full pass (every field), all lines (strict) | 106/310 | 34.2% | 29.1%–39.6% |
| Full pass (every field), all lines (accepted) | 106/310 | 34.2% | 29.1%–39.6% |
| Full pass, ready-labelled lines (strict) | 91/256 | 35.5% | 29.9%–41.6% |
| Full pass, ready-labelled lines (accepted) | 91/256 | 35.5% | 29.9%–41.6% |
| Review rate (engine not ready) | 209/310 | 67.4% | 62.0%–72.4% |
| Unnecessary review (label ready, engine not) | 155/256 | 60.6% | 54.4%–66.3% |
| **False certainty, total** (of all lines) | 10/310 | 3.2% | 1.8%–5.8% |
| False certainty — high | 1/310 | 0.3% | 0.1%–1.8% |
| False certainty — medium | 9/310 | 2.9% | 1.5%–5.4% |
| False certainty — low | 0/310 | 0.0% | 0.0%–1.2% |
| False certainty (of engine-ready lines) | 10/101 | 9.9% | 5.5%–17.3% |
| Suppressed ambiguity (of not-ready labels) | 0/54 | 0.0% | 0.0%–6.6% |
| Wrong amount on a ready reading (of ready labels) | 1/256 | 0.4% | 0.1%–2.2% |
| Wrong name on a ready reading (of ready labels) | 9/256 | 3.5% | 1.9%–6.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/101 | 0.0% | 0.0%–3.7% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/52 | 0.0% | 0.0%–6.9% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/266 | 0.0% | 0.0%–1.4% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 146/310 (47.1%) | 146/310 (47.1%) | 101/256 (39.5%) | 101/256 (39.5%) |
| name | 126/310 (40.6%) | 126/310 (40.6%) | 111/256 (43.4%) | 111/256 (43.4%) |
| quantity | 180/310 (58.1%) | 180/310 (58.1%) | 148/256 (57.8%) | 148/256 (57.8%) |
| unit | 144/310 (46.5%) | 144/310 (46.5%) | 120/256 (46.9%) | 120/256 (46.9%) |
| packageSize | 293/310 (94.5%) | 293/310 (94.5%) | 239/256 (93.4%) | 239/256 (93.4%) |
| equivalents | 299/310 (96.5%) | 299/310 (96.5%) | 245/256 (95.7%) | 245/256 (95.7%) |
| form | 310/310 (100.0%) | 310/310 (100.0%) | 256/256 (100.0%) | 256/256 (100.0%) |
| note | 268/310 (86.5%) | 268/310 (86.5%) | 221/256 (86.3%) | 221/256 (86.3%) |
| alternatives | 299/310 (96.5%) | 299/310 (96.5%) | 256/256 (100.0%) | 256/256 (100.0%) |
| optional | 303/310 (97.7%) | 303/310 (97.7%) | 249/256 (97.3%) | 249/256 (97.3%) |
| approximate | 303/310 (97.7%) | 303/310 (97.7%) | 249/256 (97.3%) | 249/256 (97.3%) |
| amountUnstated | 290/310 (93.5%) | 290/310 (93.5%) | 236/256 (92.2%) | 236/256 (92.2%) |

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

### By category (all)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 15 | 13/15 | 13/15 | 2/15 | 0/0/0 | 0/2 | 0/15 |
| fraction | 13 | 8/13 | 8/13 | 5/13 | 0/0/0 | 0/0 | 0/13 |
| fraction_third | 20 | 0/20 | 0/20 | 20/20 | 0/0/0 | 0/0 | 0/20 |
| mixed_vulgar | 15 | 8/15 | 8/15 | 7/15 | 0/0/0 | 0/0 | 0/15 |
| nested_parens | 9 | 0/9 | 0/9 | 7/9 | 0/2/0 | 0/0 | 0/9 |
| prep_note | 49 | 27/49 | 27/49 | 20/49 | 1/3/0 | 0/2 | 0/47 |
| source_choice | 13 | 0/13 | 0/13 | 13/13 | 0/0/0 | 0/0 | 0/13 |
| ingredient_alternatives | 11 | 0/11 | 0/11 | 11/11 | 0/0/0 | 0/0 | 0/11 |
| range | 11 | 0/11 | 0/11 | 11/11 | 0/0/0 | 0/0 | 0/11 |
| optional | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| unstated_amount | 22 | 1/22 | 1/22 | 21/22 | 0/0/0 | 0/20 | 0/2 |
| quantity_missing | 10 | 10/10 | 10/10 | 10/10 | 0/0/0 | 0/10 | 0/0 |
| count_unit | 29 | 0/29 | 0/29 | 28/29 | 1/0/0 | 0/0 | 0/29 |
| package_size | 17 | 0/17 | 0/17 | 17/17 | 0/0/0 | 0/0 | 0/17 |
| oz_vs_floz | 14 | 12/14 | 12/14 | 2/14 | 0/0/0 | 0/0 | 0/14 |
| compound_quantity | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/0 | 0/9 |
| equivalent_quantity | 11 | 0/11 | 0/11 | 11/11 | 0/0/0 | 0/0 | 0/11 |
| percentage | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/0 | 0/6 |
| price_annotation | 11 | 7/11 | 7/11 | 4/11 | 0/0/0 | 0/0 | 0/11 |
| form_cooked_raw | 7 | 0/7 | 0/7 | 0/7 | 0/7/0 | 0/0 | 0/7 |
| number_word | 14 | 0/14 | 0/14 | 14/14 | 0/0/0 | 0/0 | 0/14 |
| approximate | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| imprecise_unit | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/0 | 0/9 |
| heading_non_ingredient | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/9 | 0/0 |
| empty | 5 | 5/5 | 5/5 | 5/5 | 0/0/0 | 0/5 | 0/0 |
| unicode_text | 12 | 9/12 | 9/12 | 5/12 | 0/0/0 | 0/2 | 0/10 |
| ambiguous_number_format | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/6 | 0/6 |
| size_word | 10 | 7/10 | 7/10 | 3/10 | 0/0/0 | 0/0 | 0/10 |
| seasoning_lookalike | 18 | 14/18 | 14/18 | 4/18 | 0/0/0 | 0/0 | 0/18 |
| seasoning_ordinary | 17 | 9/17 | 9/17 | 11/17 | 0/0/0 | 0/9 | 0/8 |
| quart_pint_gallon | 8 | 0/8 | 0/8 | 8/8 | 0/0/0 | 0/0 | 0/8 |
| long_line | 5 | 3/5 | 3/5 | 2/5 | 0/0/0 | 0/0 | 0/5 |
| quantity_after_name | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |

### Mismatches (204 case(s); field rows shown up to 200)

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

(559 more row(s) in the JSON report.)

## Ingredient engine `legacy-table-import-2+suggestion`

Benchmark only: legacy-table-import-2 with the legacy one-click suggestion filled in (rounded thirds stay 0.3333). Status stays needs_review with legacy_suggestion_applied.

### Overall — 310 lines (256 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 106/310 | 34.2% | 29.1%–39.6% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 106/310 | 34.2% | 29.1%–39.6% |
| Core pass, ready-labelled lines (strict) | 91/256 | 35.5% | 29.9%–41.6% |
| Core pass, ready-labelled lines (accepted) | 91/256 | 35.5% | 29.9%–41.6% |
| Full pass (every field), all lines (strict) | 106/310 | 34.2% | 29.1%–39.6% |
| Full pass (every field), all lines (accepted) | 106/310 | 34.2% | 29.1%–39.6% |
| Full pass, ready-labelled lines (strict) | 91/256 | 35.5% | 29.9%–41.6% |
| Full pass, ready-labelled lines (accepted) | 91/256 | 35.5% | 29.9%–41.6% |
| Review rate (engine not ready) | 209/310 | 67.4% | 62.0%–72.4% |
| Unnecessary review (label ready, engine not) | 155/256 | 60.6% | 54.4%–66.3% |
| **False certainty, total** (of all lines) | 10/310 | 3.2% | 1.8%–5.8% |
| False certainty — high | 1/310 | 0.3% | 0.1%–1.8% |
| False certainty — medium | 9/310 | 2.9% | 1.5%–5.4% |
| False certainty — low | 0/310 | 0.0% | 0.0%–1.2% |
| False certainty (of engine-ready lines) | 10/101 | 9.9% | 5.5%–17.3% |
| Suppressed ambiguity (of not-ready labels) | 0/54 | 0.0% | 0.0%–6.6% |
| Wrong amount on a ready reading (of ready labels) | 1/256 | 0.4% | 0.1%–2.2% |
| Wrong name on a ready reading (of ready labels) | 9/256 | 3.5% | 1.9%–6.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/101 | 0.0% | 0.0%–3.7% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/52 | 0.0% | 0.0%–6.9% |
| **Cross-dimension** (of lines with a labelled unit or package) | 15/266 | 5.6% | 3.5%–9.1% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 146/310 (47.1%) | 146/310 (47.1%) | 101/256 (39.5%) | 101/256 (39.5%) |
| name | 197/310 (63.5%) | 197/310 (63.5%) | 172/256 (67.2%) | 172/256 (67.2%) |
| quantity | 198/310 (63.9%) | 198/310 (63.9%) | 161/256 (62.9%) | 161/256 (62.9%) |
| unit | 198/310 (63.9%) | 198/310 (63.9%) | 159/256 (62.1%) | 159/256 (62.1%) |
| packageSize | 293/310 (94.5%) | 293/310 (94.5%) | 239/256 (93.4%) | 239/256 (93.4%) |
| equivalents | 299/310 (96.5%) | 299/310 (96.5%) | 245/256 (95.7%) | 245/256 (95.7%) |
| form | 216/310 (69.7%) | 216/310 (69.7%) | 178/256 (69.5%) | 178/256 (69.5%) |
| note | 268/310 (86.5%) | 268/310 (86.5%) | 221/256 (86.3%) | 221/256 (86.3%) |
| alternatives | 299/310 (96.5%) | 299/310 (96.5%) | 256/256 (100.0%) | 256/256 (100.0%) |
| optional | 303/310 (97.7%) | 303/310 (97.7%) | 249/256 (97.3%) | 249/256 (97.3%) |
| approximate | 303/310 (97.7%) | 303/310 (97.7%) | 249/256 (97.3%) | 249/256 (97.3%) |
| amountUnstated | 290/310 (93.5%) | 290/310 (93.5%) | 236/256 (92.2%) | 236/256 (92.2%) |

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

### By category (all)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 15 | 13/15 | 13/15 | 2/15 | 0/0/0 | 0/2 | 0/15 |
| fraction | 13 | 8/13 | 8/13 | 5/13 | 0/0/0 | 0/0 | 0/13 |
| fraction_third | 20 | 0/20 | 0/20 | 20/20 | 0/0/0 | 0/0 | 0/20 |
| mixed_vulgar | 15 | 8/15 | 8/15 | 7/15 | 0/0/0 | 0/0 | 0/15 |
| nested_parens | 9 | 0/9 | 0/9 | 7/9 | 0/2/0 | 0/0 | 0/9 |
| prep_note | 49 | 27/49 | 27/49 | 20/49 | 1/3/0 | 0/2 | 1/47 |
| source_choice | 13 | 0/13 | 0/13 | 13/13 | 0/0/0 | 0/0 | 0/13 |
| ingredient_alternatives | 11 | 0/11 | 0/11 | 11/11 | 0/0/0 | 0/0 | 0/11 |
| range | 11 | 0/11 | 0/11 | 11/11 | 0/0/0 | 0/0 | 0/11 |
| optional | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| unstated_amount | 22 | 1/22 | 1/22 | 21/22 | 0/0/0 | 0/20 | 0/2 |
| quantity_missing | 10 | 10/10 | 10/10 | 10/10 | 0/0/0 | 0/10 | 0/0 |
| count_unit | 29 | 0/29 | 0/29 | 28/29 | 1/0/0 | 0/0 | 8/29 |
| package_size | 17 | 0/17 | 0/17 | 17/17 | 0/0/0 | 0/0 | 15/17 |
| oz_vs_floz | 14 | 12/14 | 12/14 | 2/14 | 0/0/0 | 0/0 | 1/14 |
| compound_quantity | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/0 | 0/9 |
| equivalent_quantity | 11 | 0/11 | 0/11 | 11/11 | 0/0/0 | 0/0 | 0/11 |
| percentage | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/0 | 0/6 |
| price_annotation | 11 | 7/11 | 7/11 | 4/11 | 0/0/0 | 0/0 | 2/11 |
| form_cooked_raw | 7 | 0/7 | 0/7 | 0/7 | 0/7/0 | 0/0 | 0/7 |
| number_word | 14 | 0/14 | 0/14 | 14/14 | 0/0/0 | 0/0 | 0/14 |
| approximate | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| imprecise_unit | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/0 | 0/9 |
| heading_non_ingredient | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/9 | 0/0 |
| empty | 5 | 5/5 | 5/5 | 5/5 | 0/0/0 | 0/5 | 0/0 |
| unicode_text | 12 | 9/12 | 9/12 | 5/12 | 0/0/0 | 0/2 | 0/10 |
| ambiguous_number_format | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/6 | 0/6 |
| size_word | 10 | 7/10 | 7/10 | 3/10 | 0/0/0 | 0/0 | 0/10 |
| seasoning_lookalike | 18 | 14/18 | 14/18 | 4/18 | 0/0/0 | 0/0 | 0/18 |
| seasoning_ordinary | 17 | 9/17 | 9/17 | 11/17 | 0/0/0 | 0/9 | 0/8 |
| quart_pint_gallon | 8 | 0/8 | 0/8 | 8/8 | 0/0/0 | 0/0 | 0/8 |
| long_line | 5 | 3/5 | 3/5 | 2/5 | 0/0/0 | 0/0 | 0/5 |
| quantity_after_name | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |

### Mismatches (204 case(s); field rows shown up to 200)

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

(510 more row(s) in the JSON report.)

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

## Runtime (non-deterministic — not part of the JSON report)

| Run | Items | Total ms | ms per item |
|---|---|---|---|
| ingredients · legacy-table-import-2 | 310 | 47.9 | 0.154 |
| ingredients · legacy-table-import-2+suggestion | 310 | 23.1 | 0.074 |
| pages · default | 15 | 19.8 | 1.320 |

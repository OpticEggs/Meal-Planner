# Recipe extraction benchmark

@table/recipe-extraction@0.1.0 · contract recipe-extraction/v1 · split holdout3

Holdout freeze: verified

Pins: plan `docs/table/recipe-extraction/EVALUATION-PLAN-v3.md` SHA-256 `34c68ed9b2aa7a5db9e78b37191d99a58fe710dc07ed83aceceffd4003a492c1` · scorer `bench/outcomes.ts` SHA-256 `7821e8532eb123e9694291c6d0deac6bdac40f96715d06a4d2aa2161fc3a3892` · package `src/` digest `7897871ac88dbf3c7d01d219e9cc90d1709292ed8c00ce066a56fd5423d97e3c` · engine sources legacy `081c8cfd9fbe2e2f4bf9d27b905960b6b90954731dd61f06c419289b2cb99583`, semantic `ab41d0c66467604e81cfbeb0b12a3d5f4b8c41cfc7f369ccd09dacb4993717f3`, semantic-v2 `8fef38e0f1a6e5c23c8d1554094c31113ea1af3fe9e1a086add91d2eb4f7317c`.

| Corpus file | Entries | SHA-256 |
|---|---|---|
| fixtures/ingredients/holdout-v3.jsonl | 369 | `fd4a989fe48d89f5…` |

## Ingredient engine `legacy-table-import-2`

Table import 2's ingredient-line parser (frozen copy at cb7b56e) translated into contract v1. Faithful, including its defects; the only deviation is the input_truncated reason when a line is cut at 500 characters.

### Overall — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 118/369 | 32.0% | 27.4%–36.9% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 118/369 | 32.0% | 27.4%–36.9% |
| Core pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Core pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass (every field), all lines (strict) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass (every field), all lines (accepted) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Review rate (engine not ready) | 214/369 | 58.0% | 52.9%–62.9% |
| Unnecessary review (label ready, engine not) | 147/292 | 50.3% | 44.6%–56.0% |
| **False certainty, total** (of all lines) | 42/369 | 11.4% | 8.5%–15.0% |
| False certainty — high | 21/369 | 5.7% | 3.8%–8.5% |
| False certainty — medium | 20/369 | 5.4% | 3.5%–8.2% |
| False certainty — low | 1/369 | 0.3% | 0.1%–1.5% |
| False certainty (of engine-ready lines) | 42/155 | 27.1% | 20.7%–34.6% |
| Suppressed ambiguity (of not-ready labels) | 10/77 | 13.0% | 7.2%–22.3% |
| Wrong amount on a ready reading (of ready labels) | 21/292 | 7.2% | 4.8%–10.7% |
| Wrong name on a ready reading (of ready labels) | 11/292 | 3.8% | 2.1%–6.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/155 | 0.0% | 0.0%–2.4% |
| **Fabricated quantity** (of lines with no labelled amount) | 1/46 | 2.2% | 0.4%–11.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 10/329 | 3.0% | 1.7%–5.5% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 189/369 (51.2%) | 189/369 (51.2%) | 145/292 (49.7%) | 145/292 (49.7%) |
| name | 129/369 (35.0%) | 129/369 (35.0%) | 123/292 (42.1%) | 123/292 (42.1%) |
| quantity | 215/369 (58.3%) | 215/369 (58.3%) | 170/292 (58.2%) | 170/292 (58.2%) |
| unit | 167/369 (45.3%) | 167/369 (45.3%) | 133/292 (45.6%) | 133/292 (45.6%) |
| packageSize | 347/369 (94.0%) | 347/369 (94.0%) | 271/292 (92.8%) | 271/292 (92.8%) |
| equivalents | 343/369 (93.0%) | 343/369 (93.0%) | 266/292 (91.1%) | 266/292 (91.1%) |
| form | 368/369 (99.7%) | 368/369 (99.7%) | 292/292 (100.0%) | 292/292 (100.0%) |
| note | 317/369 (85.9%) | 318/369 (86.2%) | 259/292 (88.7%) | 259/292 (88.7%) |
| alternatives | 352/369 (95.4%) | 352/369 (95.4%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 364/369 (98.6%) | 364/369 (98.6%) | 287/292 (98.3%) | 287/292 (98.3%) |
| approximate | 365/369 (98.9%) | 365/369 (98.9%) | 288/292 (98.6%) | 288/292 (98.6%) |
| amountUnstated | 360/369 (97.6%) | 360/369 (97.6%) | 283/292 (96.9%) | 283/292 (96.9%) |

### holdout3 — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 118/369 | 32.0% | 27.4%–36.9% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 118/369 | 32.0% | 27.4%–36.9% |
| Core pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Core pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass (every field), all lines (strict) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass (every field), all lines (accepted) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Review rate (engine not ready) | 214/369 | 58.0% | 52.9%–62.9% |
| Unnecessary review (label ready, engine not) | 147/292 | 50.3% | 44.6%–56.0% |
| **False certainty, total** (of all lines) | 42/369 | 11.4% | 8.5%–15.0% |
| False certainty — high | 21/369 | 5.7% | 3.8%–8.5% |
| False certainty — medium | 20/369 | 5.4% | 3.5%–8.2% |
| False certainty — low | 1/369 | 0.3% | 0.1%–1.5% |
| False certainty (of engine-ready lines) | 42/155 | 27.1% | 20.7%–34.6% |
| Suppressed ambiguity (of not-ready labels) | 10/77 | 13.0% | 7.2%–22.3% |
| Wrong amount on a ready reading (of ready labels) | 21/292 | 7.2% | 4.8%–10.7% |
| Wrong name on a ready reading (of ready labels) | 11/292 | 3.8% | 2.1%–6.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/155 | 0.0% | 0.0%–2.4% |
| **Fabricated quantity** (of lines with no labelled amount) | 1/46 | 2.2% | 0.4%–11.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 10/329 | 3.0% | 1.7%–5.5% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 189/369 (51.2%) | 189/369 (51.2%) | 145/292 (49.7%) | 145/292 (49.7%) |
| name | 129/369 (35.0%) | 129/369 (35.0%) | 123/292 (42.1%) | 123/292 (42.1%) |
| quantity | 215/369 (58.3%) | 215/369 (58.3%) | 170/292 (58.2%) | 170/292 (58.2%) |
| unit | 167/369 (45.3%) | 167/369 (45.3%) | 133/292 (45.6%) | 133/292 (45.6%) |
| packageSize | 347/369 (94.0%) | 347/369 (94.0%) | 271/292 (92.8%) | 271/292 (92.8%) |
| equivalents | 343/369 (93.0%) | 343/369 (93.0%) | 266/292 (91.1%) | 266/292 (91.1%) |
| form | 368/369 (99.7%) | 368/369 (99.7%) | 292/292 (100.0%) | 292/292 (100.0%) |
| note | 317/369 (85.9%) | 318/369 (86.2%) | 259/292 (88.7%) | 259/292 (88.7%) |
| alternatives | 352/369 (95.4%) | 352/369 (95.4%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 364/369 (98.6%) | 364/369 (98.6%) | 287/292 (98.3%) | 287/292 (98.3%) |
| approximate | 365/369 (98.9%) | 365/369 (98.9%) | 288/292 (98.6%) | 288/292 (98.6%) |
| amountUnstated | 360/369 (97.6%) | 360/369 (97.6%) | 283/292 (96.9%) | 283/292 (96.9%) |

### By category (holdout3)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 82/225 | 82/225 | 107/225 | 16/19/1 | 1/2 | 6/222 |
| fraction | 50 | 23/50 | 23/50 | 24/50 | 2/1/0 | 0/0 | 2/50 |
| fraction_third | 8 | 0/8 | 0/8 | 8/8 | 0/0/0 | 0/0 | 0/8 |
| mixed_vulgar | 12 | 8/12 | 8/12 | 4/12 | 0/0/0 | 0/0 | 0/12 |
| nested_parens | 4 | 0/4 | 0/4 | 3/4 | 0/1/0 | 0/0 | 0/4 |
| prep_note | 134 | 65/134 | 65/134 | 57/134 | 8/5/0 | 0/3 | 1/132 |
| source_choice | 3 | 0/3 | 0/3 | 3/3 | 0/0/0 | 0/0 | 0/3 |
| ingredient_alternatives | 17 | 0/17 | 0/17 | 16/17 | 0/1/0 | 0/0 | 0/17 |
| range | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| optional | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/2 | 0/4 |
| unstated_amount | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/9 | 0/0 |
| quantity_missing | 8 | 4/8 | 4/8 | 8/8 | 0/0/0 | 0/8 | 0/4 |
| count_unit | 59 | 0/59 | 0/59 | 44/59 | 15/0/0 | 0/1 | 3/59 |
| package_size | 22 | 0/22 | 0/22 | 18/22 | 4/0/0 | 0/0 | 3/22 |
| oz_vs_floz | 6 | 2/6 | 2/6 | 3/6 | 1/0/0 | 0/0 | 1/6 |
| compound_quantity | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| equivalent_quantity | 30 | 0/30 | 0/30 | 30/30 | 0/0/0 | 0/0 | 0/30 |
| percentage | 3 | 0/3 | 0/3 | 3/3 | 0/0/0 | 0/1 | 0/2 |
| price_annotation | 5 | 3/5 | 3/5 | 2/5 | 0/0/0 | 0/0 | 0/5 |
| form_cooked_raw | 5 | 0/5 | 0/5 | 0/5 | 0/5/0 | 0/0 | 0/5 |
| number_word | 29 | 2/29 | 2/29 | 23/29 | 4/1/0 | 0/2 | 3/27 |
| approximate | 5 | 0/5 | 0/5 | 5/5 | 0/0/0 | 0/0 | 0/5 |
| imprecise_unit | 12 | 0/12 | 0/12 | 11/12 | 1/0/0 | 0/2 | 1/12 |
| heading_non_ingredient | 24 | 0/24 | 0/24 | 23/24 | 0/1/0 | 1/24 | 0/0 |
| empty | 1 | 1/1 | 1/1 | 1/1 | 0/0/0 | 0/1 | 0/0 |
| unicode_text | 21 | 9/21 | 9/21 | 12/21 | 0/1/0 | 0/3 | 0/17 |
| ambiguous_number_format | 3 | 0/3 | 0/3 | 3/3 | 0/0/0 | 0/3 | 0/3 |
| size_word | 21 | 3/21 | 3/21 | 7/21 | 6/5/0 | 0/0 | 1/20 |
| seasoning_lookalike | 17 | 7/17 | 7/17 | 10/17 | 0/0/0 | 0/1 | 0/17 |
| seasoning_ordinary | 4 | 0/4 | 0/4 | 3/4 | 0/0/1 | 0/2 | 0/2 |
| quart_pint_gallon | 8 | 0/8 | 0/8 | 5/8 | 2/1/0 | 0/0 | 2/8 |
| long_line | 4 | 2/4 | 2/4 | 2/4 | 0/0/0 | 0/0 | 0/4 |
| quantity_after_name | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/0 | 0/6 |

### Mismatches (251 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-h3-0001 | status | ready | needs_review | no |  |
| ing-h3-0001 | name | artichoke hearts | jar artichoke hearts | no |  |
| ing-h3-0001 | unit | jar | null | no |  |
| ing-h3-0002 | status | unsupported | needs_review | no |  |
| ing-h3-0002 | name | null | 9 x 13-inch baking dish | no |  |
| ing-h3-0002 | note | null | greased | no |  |
| ing-h3-0003 | name | Salt | Salt (2.5 g) | no |  |
| ing-h3-0003 | quantity | 2 1/2 | null | no |  |
| ing-h3-0003 | unit | g | null | no |  |
| ing-h3-0004 | name | feta | 4 oz (125 g) feta | no |  |
| ing-h3-0004 | quantity | 4 | null | no |  |
| ing-h3-0004 | unit | oz | null | no |  |
| ing-h3-0004 | note | 125 g; crumbled | crumbled | no |  |
| ing-h3-0005 | status | unsupported | needs_review | no |  |
| ing-h3-0005 | name | null | Quick Pickled Onions | no |  |
| ing-h3-0006 | status | ready | needs_review | no |  |
| ing-h3-0006 | name | gochujang mayo | ▢ 3 tbsp gochujang mayo | no |  |
| ing-h3-0006 | quantity | 3 | null | no |  |
| ing-h3-0006 | unit | tbsp | null | no |  |
| ing-h3-0007 | name | lamb mince | 1 200 g lamb mince | no |  |
| ing-h3-0007 | unit | g | null | no |  |
| ing-h3-0009 | status | unsupported | needs_review | no |  |
| ing-h3-0009 | name | null | Equipment: stand mixer with paddle attachment | no |  |
| ing-h3-0010 | name | vegetable stock | 1 | no |  |
| ing-h3-0010 | unit | ml | null | no |  |
| ing-h3-0010 | note | null | 200 ml vegetable stock | no |  |
| ing-h3-0011 | status | ready | needs_review | no |  |
| ing-h3-0011 | name | sweet potato | 1 giant sweet potato (about 1½ lb) | no |  |
| ing-h3-0011 | quantity | 1 | null | no |  |
| ing-h3-0011 | unit | each | null | no |  |
| ing-h3-0011 | equivalents | 1 1/2 lb | [] | no |  |
| ing-h3-0011 | note | giant | null | no |  |
| ing-h3-0012 | status | ready | needs_review | no |  |
| ing-h3-0012 | name | twelve grain bread | slices twelve grain bread | no |  |
| ing-h3-0012 | unit | slice | null | no |  |
| ing-h3-0014 | status | ready | needs_review | no |  |
| ing-h3-0014 | name | mashed ripe bananas | 2 cups mashed ripe bananas (about 4 bananas) | no |  |
| ing-h3-0014 | quantity | 2 | null | no |  |
| ing-h3-0014 | unit | cup | null | no |  |
| ing-h3-0014 | equivalents | 4 each | [] | no |  |
| ing-h3-0015 | status | ready | needs_review | no |  |
| ing-h3-0015 | name | 5 spice seasoning | 2 tbsp 5 spice seasoning | no |  |
| ing-h3-0015 | quantity | 2 | null | no |  |
| ing-h3-0015 | unit | tbsp | null | no |  |
| ing-h3-0016 | name | buttermilk | half-gallons of buttermilk | no | wrong_amount (high) |
| ing-h3-0016 | quantity | 1 | 2 | no | wrong_amount (high) |
| ing-h3-0016 | unit | gallon | each | no | wrong_amount (high) |
| ing-h3-0017 | status | ready | needs_review | no |  |
| ing-h3-0017 | name | whole milk | 1 cup less 1 tbsp whole milk | no |  |
| ing-h3-0017 | quantity | 15 | null | no |  |
| ing-h3-0017 | unit | tbsp | null | no |  |
| ing-h3-0018 | status | unsupported | needs_review | no |  |
| ing-h3-0018 | name | null | Iron 2.1mg (12% DV) | no |  |
| ing-h3-0021 | status | ready | needs_review | no |  |
| ing-h3-0021 | name | Crystal hot sauce | 1/3 cup Crystal hot sauce | no |  |
| ing-h3-0021 | quantity | 1/3 | null | no |  |
| ing-h3-0021 | unit | cup | null | no |  |
| ing-h3-0022 | status | ready | needs_review | no |  |
| ing-h3-0022 | name | garlic | head garlic | no |  |
| ing-h3-0022 | unit | head | null | no |  |
| ing-h3-0024 | status | ready | needs_review | no |  |
| ing-h3-0024 | name | trout | trout fillets (x4) | no |  |
| ing-h3-0024 | quantity | 4 | null | no |  |
| ing-h3-0024 | unit | fillet | null | no |  |
| ing-h3-0026 | name | fresh oregano | several sprigs fresh oregano | no |  |
| ing-h3-0026 | unit | sprig | null | no |  |
| ing-h3-0029 | status | ready | needs_review | no |  |
| ing-h3-0029 | name | walnuts | 1 cup walnuts | no |  |
| ing-h3-0029 | quantity | 1 | null | no |  |
| ing-h3-0029 | unit | cup | null | no |  |
| ing-h3-0029 | note | toasted | optional; toasted | no |  |
| ing-h3-0029 | optional | true | false | no |  |
| ing-h3-0030 | status | ready | needs_review | no |  |
| ing-h3-0030 | name | brioche | slices brioche | no |  |
| ing-h3-0030 | unit | slice | null | no |  |
| ing-h3-0031 | name | crawfish tail meat | raw crawfish tail meat | no | wrong_name (medium) |
| ing-h3-0032 | status | ready | needs_review | no |  |
| ing-h3-0032 | name | Lipton onion soup mix | envelope Lipton onion soup mix | no |  |
| ing-h3-0032 | unit | envelope | null | no |  |
| ing-h3-0033 | name | null | 1/4 cup tamari or coconut aminos | no |  |
| ing-h3-0033 | quantity | 1/4 | null | no |  |
| ing-h3-0033 | unit | cup | null | no |  |
| ing-h3-0033 | alternatives | tamari \| coconut aminos | [] | no |  |
| ing-h3-0035 | name | aubergine | x large aubergine | no | wrong_name (medium) |
| ing-h3-0035 | note | large; cut into rounds | cut into rounds | no | wrong_name (medium) |
| ing-h3-0038 | name | null | 1/4 cup fresh basil or parsley | no |  |
| ing-h3-0038 | quantity | 1/4 | null | no |  |
| ing-h3-0038 | unit | cup | null | no |  |
| ing-h3-0038 | alternatives | fresh basil \| fresh parsley | [] | no |  |
| ing-h3-0041 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0041 | name | null | cashews/almonds | no | suppressed_ambiguity (medium) |
| ing-h3-0041 | alternatives | cashews \| almonds | [] | no | suppressed_ambiguity (medium) |
| ing-h3-0042 | name | gochujang | gochujang (Korean chili paste ) | no | wrong_name (medium) |
| ing-h3-0042 | note | Korean chili paste see note | see note | no | wrong_name (medium) |
| ing-h3-0043 | status | ready | needs_review | no |  |
| ing-h3-0043 | unit | each | null | no |  |
| ing-h3-0045 | status | ready | needs_review | no |  |
| ing-h3-0045 | name | ghee | 4 tbsp ghee | no |  |
| ing-h3-0045 | quantity | 13 | null | no |  |
| ing-h3-0045 | unit | tsp | null | no |  |
| ing-h3-0045 | note | for the skillet | plus 1 tsp for the skillet | no |  |
| ing-h3-0046 | status | ready | needs_review | no |  |
| ing-h3-0046 | name | frozen butternut squash cubes | bag frozen butternut squash cubes (10 oz) | no |  |
| ing-h3-0046 | quantity | 1 | null | no |  |
| ing-h3-0046 | unit | bag | null | no |  |
| ing-h3-0046 | packageSize | 10 oz | null | no |  |
| ing-h3-0047 | status | ready | needs_review | no |  |
| ing-h3-0047 | name | crème de cassis | 1/3 cup crème de cassis | no |  |
| ing-h3-0047 | quantity | 1/3 | null | no |  |
| ing-h3-0047 | unit | cup | null | no |  |
| ing-h3-0048 | status | unsupported | needs_review | no |  |
| ing-h3-0048 | name | null | Two 9-inch round cake pans | no |  |
| ing-h3-0048 | note | null | buttered and floured | no |  |
| ing-h3-0049 | status | ready | needs_review | no |  |
| ing-h3-0049 | name | Lambrusco | a 750-ml bottle of Lambrusco | no |  |
| ing-h3-0049 | quantity | 1 | null | no |  |
| ing-h3-0049 | unit | bottle | null | no |  |
| ing-h3-0049 | packageSize | 750 ml | null | no |  |
| ing-h3-0051 | name | grape tomatoes | half-pint container grape tomatoes | no | wrong_amount (high) |
| ing-h3-0051 | unit | container | each | no | wrong_amount (high) |
| ing-h3-0051 | packageSize | 1/2 pint | null | no | wrong_amount (high) |
| ing-h3-0054 | status | ready | needs_review | no |  |
| ing-h3-0054 | name | free-range eggs | 4x free-range eggs | no |  |
| ing-h3-0054 | quantity | 4 | null | no |  |
| ing-h3-0054 | unit | each | null | no |  |
| ing-h3-0055 | status | ready | needs_review | no |  |
| ing-h3-0055 | name | ricotta | one cup ricotta | no |  |
| ing-h3-0055 | quantity | 1 | null | no |  |
| ing-h3-0055 | unit | cup | null | no |  |
| ing-h3-0057 | status | ready | needs_review | no |  |
| ing-h3-0057 | name | ground lamb | one quarter pound ground lamb | no |  |
| ing-h3-0057 | quantity | 1/4 | null | no |  |
| ing-h3-0057 | unit | lb | null | no |  |
| ing-h3-0058 | status | ready | needs_review | no |  |
| ing-h3-0058 | name | chopped kale | 2 cups chopped kale (from about 1/2 bunch) | no |  |
| ing-h3-0058 | quantity | 2 | null | no |  |
| ing-h3-0058 | unit | cup | null | no |  |
| ing-h3-0058 | equivalents | 1/2 bunch | [] | no |  |
| ing-h3-0059 | name | Branston pickle | heaped tbsp Branston pickle | no | wrong_amount (high) |
| ing-h3-0059 | unit | tbsp | each | no | wrong_amount (high) |
| ing-h3-0059 | note | heaped | null | no | wrong_amount (high) |
| ing-h3-0061 | status | ready | needs_review | no |  |
| ing-h3-0061 | name | plain yogurt | 3/4 cup / 175 ml plain yogurt | no |  |
| ing-h3-0061 | quantity | 3/4 | null | no |  |
| ing-h3-0061 | unit | cup | null | no |  |
| ing-h3-0061 | equivalents | 175 ml | [] | no |  |
| ing-h3-0062 | name | Italian ladyfingers | package Italian ladyfingers | no | wrong_amount (high) |
| ing-h3-0062 | quantity | 1 | 8 4/5 | no | wrong_amount (high) |
| ing-h3-0062 | unit | package | oz | no | wrong_amount (high) |
| ing-h3-0062 | packageSize | 8 4/5 oz | null | no | wrong_amount (high) |
| ing-h3-0063 | status | ready | needs_review | no |  |
| ing-h3-0063 | name | rose water | Drop of rose water | no |  |
| ing-h3-0063 | quantity | 1 | null | no |  |
| ing-h3-0063 | unit | drop | null | no |  |
| ing-h3-0064 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0064 | name | chicken stock | imperial pints chicken stock | no | suppressed_ambiguity (medium) |
| ing-h3-0064 | unit | pint | each | no | suppressed_ambiguity (medium) |
| ing-h3-0064 | note | imperial | null | yes | suppressed_ambiguity (medium) |
| ing-h3-0065 | status | ready | needs_review | no |  |
| ing-h3-0065 | name | warm pita bread | To serve: warm pita bread | no |  |
| ing-h3-0065 | amountUnstated | for_serving | null | no |  |
| ing-h3-0066 | status | ready | needs_review | no |  |
| ing-h3-0066 | name | golden caster sugar | 225g (1 cup) golden caster sugar | no |  |
| ing-h3-0066 | quantity | 225 | null | no |  |
| ing-h3-0066 | unit | g | null | no |  |
| ing-h3-0066 | equivalents | 1 cup | [] | no |  |
| ing-h3-0067 | name | vegetable stock | 2 to 2½ cups vegetable stock | no |  |
| ing-h3-0067 | quantity | 2..2 1/2 | null | no |  |
| ing-h3-0067 | unit | cup | null | no |  |
| ing-h3-0069 | status | ready | needs_review | no |  |
| ing-h3-0069 | name | shredded carrots | a. 2 cups shredded carrots | no |  |
| ing-h3-0069 | quantity | 2 | null | no |  |
| ing-h3-0069 | unit | cup | null | no |  |
| ing-h3-0070 | status | ready | needs_review | no |  |
| ing-h3-0070 | name | aubergine | 1 aubergine | no |  |
| ing-h3-0070 | quantity | 1 | null | no |  |
| ing-h3-0070 | unit | each | null | no |  |
| ing-h3-0072 | status | ready | needs_review | no |  |
| ing-h3-0072 | name | frozen shelled edamame | 1-lb. bag frozen shelled edamame | no |  |
| ing-h3-0072 | quantity | 1 | null | no |  |
| ing-h3-0072 | unit | bag | null | no |  |
| ing-h3-0072 | packageSize | 1 lb | null | no |  |
| ing-h3-0073 | status | ready | needs_review | no |  |
| ing-h3-0073 | name | half-and-half | 1 cup half-and-half (240 ml / 8 fl oz) | no |  |
| ing-h3-0073 | quantity | 1 | null | no |  |
| ing-h3-0073 | unit | cup | null | no |  |
| ing-h3-0073 | equivalents | 240 ml \| 8 fl_oz | [] | no |  |
| ing-h3-0074 | name | pork tenderloins | half-pound pork tenderloins | no | wrong_name (medium) |
| ing-h3-0074 | note | half-pound | null | no | wrong_name (medium) |
| ing-h3-0075 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0075 | name | crème fraîche | tub crème fraîche | no | suppressed_ambiguity (medium) |
| ing-h3-0075 | unit | null | each | no | suppressed_ambiguity (medium) |
| ing-h3-0076 | status | ready | needs_review | no |  |
| ing-h3-0076 | name | Tuscan kale | bunch Tuscan kale (about 8 oz) | no |  |
| ing-h3-0076 | quantity | 1 | null | no |  |
| ing-h3-0076 | unit | bunch | null | no |  |
| ing-h3-0076 | equivalents | 8 oz | [] | no |  |
| ing-h3-0077 | status | ready | needs_review | no |  |
| ing-h3-0077 | name | packed cilantro leaves | 2 cups packed cilantro leaves (from 2 bunches) | no |  |
| ing-h3-0077 | quantity | 2 | null | no |  |

(712 more row(s) in the JSON report.)

## Ingredient engine `legacy-table-import-2+suggestion`

Benchmark only: legacy-table-import-2 with the legacy one-click suggestion filled in (rounded thirds stay 0.3333). Status stays needs_review with legacy_suggestion_applied.

### Overall — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 122/369 | 33.1% | 28.5%–38.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 122/369 | 33.1% | 28.5%–38.0% |
| Core pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Core pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass (every field), all lines (strict) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass (every field), all lines (accepted) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Review rate (engine not ready) | 214/369 | 58.0% | 52.9%–62.9% |
| Unnecessary review (label ready, engine not) | 147/292 | 50.3% | 44.6%–56.0% |
| **False certainty, total** (of all lines) | 42/369 | 11.4% | 8.5%–15.0% |
| False certainty — high | 21/369 | 5.7% | 3.8%–8.5% |
| False certainty — medium | 20/369 | 5.4% | 3.5%–8.2% |
| False certainty — low | 1/369 | 0.3% | 0.1%–1.5% |
| False certainty (of engine-ready lines) | 42/155 | 27.1% | 20.7%–34.6% |
| Suppressed ambiguity (of not-ready labels) | 10/77 | 13.0% | 7.2%–22.3% |
| Wrong amount on a ready reading (of ready labels) | 21/292 | 7.2% | 4.8%–10.7% |
| Wrong name on a ready reading (of ready labels) | 11/292 | 3.8% | 2.1%–6.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/155 | 0.0% | 0.0%–2.4% |
| **Fabricated quantity** (of lines with no labelled amount) | 1/46 | 2.2% | 0.4%–11.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 20/329 | 6.1% | 4.0%–9.2% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 189/369 (51.2%) | 189/369 (51.2%) | 145/292 (49.7%) | 145/292 (49.7%) |
| name | 182/369 (49.3%) | 182/369 (49.3%) | 165/292 (56.5%) | 165/292 (56.5%) |
| quantity | 266/369 (72.1%) | 266/369 (72.1%) | 204/292 (69.9%) | 204/292 (69.9%) |
| unit | 224/369 (60.7%) | 224/369 (60.7%) | 169/292 (57.9%) | 169/292 (57.9%) |
| packageSize | 347/369 (94.0%) | 347/369 (94.0%) | 271/292 (92.8%) | 271/292 (92.8%) |
| equivalents | 343/369 (93.0%) | 343/369 (93.0%) | 266/292 (91.1%) | 266/292 (91.1%) |
| form | 274/369 (74.3%) | 274/369 (74.3%) | 221/292 (75.7%) | 221/292 (75.7%) |
| note | 317/369 (85.9%) | 318/369 (86.2%) | 259/292 (88.7%) | 259/292 (88.7%) |
| alternatives | 352/369 (95.4%) | 352/369 (95.4%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 364/369 (98.6%) | 364/369 (98.6%) | 287/292 (98.3%) | 287/292 (98.3%) |
| approximate | 365/369 (98.9%) | 365/369 (98.9%) | 288/292 (98.6%) | 288/292 (98.6%) |
| amountUnstated | 360/369 (97.6%) | 360/369 (97.6%) | 283/292 (96.9%) | 283/292 (96.9%) |

### holdout3 — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 122/369 | 33.1% | 28.5%–38.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 122/369 | 33.1% | 28.5%–38.0% |
| Core pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Core pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass (every field), all lines (strict) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass (every field), all lines (accepted) | 118/369 | 32.0% | 27.4%–36.9% |
| Full pass, ready-labelled lines (strict) | 113/292 | 38.7% | 33.3%–44.4% |
| Full pass, ready-labelled lines (accepted) | 113/292 | 38.7% | 33.3%–44.4% |
| Review rate (engine not ready) | 214/369 | 58.0% | 52.9%–62.9% |
| Unnecessary review (label ready, engine not) | 147/292 | 50.3% | 44.6%–56.0% |
| **False certainty, total** (of all lines) | 42/369 | 11.4% | 8.5%–15.0% |
| False certainty — high | 21/369 | 5.7% | 3.8%–8.5% |
| False certainty — medium | 20/369 | 5.4% | 3.5%–8.2% |
| False certainty — low | 1/369 | 0.3% | 0.1%–1.5% |
| False certainty (of engine-ready lines) | 42/155 | 27.1% | 20.7%–34.6% |
| Suppressed ambiguity (of not-ready labels) | 10/77 | 13.0% | 7.2%–22.3% |
| Wrong amount on a ready reading (of ready labels) | 21/292 | 7.2% | 4.8%–10.7% |
| Wrong name on a ready reading (of ready labels) | 11/292 | 3.8% | 2.1%–6.6% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 0/155 | 0.0% | 0.0%–2.4% |
| **Fabricated quantity** (of lines with no labelled amount) | 1/46 | 2.2% | 0.4%–11.3% |
| **Cross-dimension** (of lines with a labelled unit or package) | 20/329 | 6.1% | 4.0%–9.2% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 189/369 (51.2%) | 189/369 (51.2%) | 145/292 (49.7%) | 145/292 (49.7%) |
| name | 182/369 (49.3%) | 182/369 (49.3%) | 165/292 (56.5%) | 165/292 (56.5%) |
| quantity | 266/369 (72.1%) | 266/369 (72.1%) | 204/292 (69.9%) | 204/292 (69.9%) |
| unit | 224/369 (60.7%) | 224/369 (60.7%) | 169/292 (57.9%) | 169/292 (57.9%) |
| packageSize | 347/369 (94.0%) | 347/369 (94.0%) | 271/292 (92.8%) | 271/292 (92.8%) |
| equivalents | 343/369 (93.0%) | 343/369 (93.0%) | 266/292 (91.1%) | 266/292 (91.1%) |
| form | 274/369 (74.3%) | 274/369 (74.3%) | 221/292 (75.7%) | 221/292 (75.7%) |
| note | 317/369 (85.9%) | 318/369 (86.2%) | 259/292 (88.7%) | 259/292 (88.7%) |
| alternatives | 352/369 (95.4%) | 352/369 (95.4%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 364/369 (98.6%) | 364/369 (98.6%) | 287/292 (98.3%) | 287/292 (98.3%) |
| approximate | 365/369 (98.9%) | 365/369 (98.9%) | 288/292 (98.6%) | 288/292 (98.6%) |
| amountUnstated | 360/369 (97.6%) | 360/369 (97.6%) | 283/292 (96.9%) | 283/292 (96.9%) |

### By category (holdout3)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 86/225 | 82/225 | 107/225 | 16/19/1 | 1/2 | 12/222 |
| fraction | 50 | 23/50 | 23/50 | 24/50 | 2/1/0 | 0/0 | 2/50 |
| fraction_third | 8 | 0/8 | 0/8 | 8/8 | 0/0/0 | 0/0 | 0/8 |
| mixed_vulgar | 12 | 8/12 | 8/12 | 4/12 | 0/0/0 | 0/0 | 0/12 |
| nested_parens | 4 | 0/4 | 0/4 | 3/4 | 0/1/0 | 0/0 | 0/4 |
| prep_note | 134 | 67/134 | 65/134 | 57/134 | 8/5/0 | 0/3 | 4/132 |
| source_choice | 3 | 0/3 | 0/3 | 3/3 | 0/0/0 | 0/0 | 0/3 |
| ingredient_alternatives | 17 | 0/17 | 0/17 | 16/17 | 0/1/0 | 0/0 | 0/17 |
| range | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| optional | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/2 | 0/4 |
| unstated_amount | 9 | 0/9 | 0/9 | 9/9 | 0/0/0 | 0/9 | 0/0 |
| quantity_missing | 8 | 4/8 | 4/8 | 8/8 | 0/0/0 | 0/8 | 0/4 |
| count_unit | 59 | 0/59 | 0/59 | 44/59 | 15/0/0 | 0/1 | 10/59 |
| package_size | 22 | 0/22 | 0/22 | 18/22 | 4/0/0 | 0/0 | 10/22 |
| oz_vs_floz | 6 | 2/6 | 2/6 | 3/6 | 1/0/0 | 0/0 | 1/6 |
| compound_quantity | 7 | 0/7 | 0/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| equivalent_quantity | 30 | 3/30 | 0/30 | 30/30 | 0/0/0 | 0/0 | 1/30 |
| percentage | 3 | 0/3 | 0/3 | 3/3 | 0/0/0 | 0/1 | 0/2 |
| price_annotation | 5 | 3/5 | 3/5 | 2/5 | 0/0/0 | 0/0 | 0/5 |
| form_cooked_raw | 5 | 0/5 | 0/5 | 0/5 | 0/5/0 | 0/0 | 0/5 |
| number_word | 29 | 2/29 | 2/29 | 23/29 | 4/1/0 | 0/2 | 4/27 |
| approximate | 5 | 0/5 | 0/5 | 5/5 | 0/0/0 | 0/0 | 0/5 |
| imprecise_unit | 12 | 0/12 | 0/12 | 11/12 | 1/0/0 | 0/2 | 1/12 |
| heading_non_ingredient | 24 | 0/24 | 0/24 | 23/24 | 0/1/0 | 1/24 | 0/0 |
| empty | 1 | 1/1 | 1/1 | 1/1 | 0/0/0 | 0/1 | 0/0 |
| unicode_text | 21 | 9/21 | 9/21 | 12/21 | 0/1/0 | 0/3 | 0/17 |
| ambiguous_number_format | 3 | 0/3 | 0/3 | 3/3 | 0/0/0 | 0/3 | 0/3 |
| size_word | 21 | 3/21 | 3/21 | 7/21 | 6/5/0 | 0/0 | 1/20 |
| seasoning_lookalike | 17 | 7/17 | 7/17 | 10/17 | 0/0/0 | 0/1 | 1/17 |
| seasoning_ordinary | 4 | 0/4 | 0/4 | 3/4 | 0/0/1 | 0/2 | 0/2 |
| quart_pint_gallon | 8 | 0/8 | 0/8 | 5/8 | 2/1/0 | 0/0 | 2/8 |
| long_line | 4 | 2/4 | 2/4 | 2/4 | 0/0/0 | 0/0 | 0/4 |
| quantity_after_name | 6 | 0/6 | 0/6 | 6/6 | 0/0/0 | 0/0 | 0/6 |

### Mismatches (251 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-h3-0001 | status | ready | needs_review | no |  |
| ing-h3-0001 | name | artichoke hearts | artichoke hearts (jar) | no |  |
| ing-h3-0001 | unit | jar | each | no |  |
| ing-h3-0001 | form | null | raw | no |  |
| ing-h3-0002 | status | unsupported | needs_review | no |  |
| ing-h3-0002 | name | null | 9 x 13-inch baking dish | no |  |
| ing-h3-0002 | note | null | greased | no |  |
| ing-h3-0003 | name | Salt | Salt (2.5 g) | no |  |
| ing-h3-0003 | quantity | 2 1/2 | null | no |  |
| ing-h3-0003 | unit | g | null | no |  |
| ing-h3-0004 | form | null | raw | no |  |
| ing-h3-0004 | note | 125 g; crumbled | crumbled | no |  |
| ing-h3-0005 | status | unsupported | needs_review | no |  |
| ing-h3-0005 | name | null | Quick Pickled Onions | no |  |
| ing-h3-0006 | status | ready | needs_review | no |  |
| ing-h3-0006 | name | gochujang mayo | ▢ 3 tbsp gochujang mayo | no |  |
| ing-h3-0006 | quantity | 3 | null | no |  |
| ing-h3-0006 | unit | tbsp | null | no |  |
| ing-h3-0007 | name | lamb mince | 1 200 g lamb mince | no |  |
| ing-h3-0007 | unit | g | null | no |  |
| ing-h3-0009 | status | unsupported | needs_review | no |  |
| ing-h3-0009 | name | null | Equipment: stand mixer with paddle attachment | no |  |
| ing-h3-0010 | name | vegetable stock | 1 | no |  |
| ing-h3-0010 | unit | ml | null | no |  |
| ing-h3-0010 | note | null | 200 ml vegetable stock | no |  |
| ing-h3-0011 | status | ready | needs_review | no |  |
| ing-h3-0011 | name | sweet potato | giant sweet potato | no |  |
| ing-h3-0011 | equivalents | 1 1/2 lb | [] | no |  |
| ing-h3-0011 | form | null | raw | no |  |
| ing-h3-0011 | note | giant | null | no |  |
| ing-h3-0012 | status | ready | needs_review | no |  |
| ing-h3-0012 | name | twelve grain bread | twelve grain bread (slice) | no |  |
| ing-h3-0012 | unit | slice | each | no |  |
| ing-h3-0012 | form | null | raw | no |  |
| ing-h3-0014 | status | ready | needs_review | no |  |
| ing-h3-0014 | equivalents | 4 each | [] | no |  |
| ing-h3-0014 | form | null | raw | no |  |
| ing-h3-0015 | status | ready | needs_review | no |  |
| ing-h3-0015 | name | 5 spice seasoning | 2 tbsp 5 spice seasoning | no |  |
| ing-h3-0015 | quantity | 2 | null | no |  |
| ing-h3-0015 | unit | tbsp | null | no |  |
| ing-h3-0016 | name | buttermilk | half-gallons of buttermilk | no | wrong_amount (high) |
| ing-h3-0016 | quantity | 1 | 2 | no | wrong_amount (high) |
| ing-h3-0016 | unit | gallon | each | no | wrong_amount (high) |
| ing-h3-0017 | status | ready | needs_review | no |  |
| ing-h3-0017 | name | whole milk | 1 cup less 1 tbsp whole milk | no |  |
| ing-h3-0017 | quantity | 15 | null | no |  |
| ing-h3-0017 | unit | tbsp | null | no |  |
| ing-h3-0018 | status | unsupported | needs_review | no |  |
| ing-h3-0018 | name | null | Iron 2.1mg (12% DV) | no |  |
| ing-h3-0021 | status | ready | needs_review | no |  |
| ing-h3-0021 | quantity | 1/3 | 3333/10000 | no |  |
| ing-h3-0021 | form | null | raw | no |  |
| ing-h3-0022 | status | ready | needs_review | no |  |
| ing-h3-0022 | name | garlic | garlic (head) | no |  |
| ing-h3-0022 | unit | head | each | no |  |
| ing-h3-0022 | form | null | raw | no |  |
| ing-h3-0024 | status | ready | needs_review | no |  |
| ing-h3-0024 | name | trout | trout fillets (x4) | no |  |
| ing-h3-0024 | quantity | 4 | null | no |  |
| ing-h3-0024 | unit | fillet | null | no |  |
| ing-h3-0026 | name | fresh oregano | several sprigs fresh oregano | no |  |
| ing-h3-0026 | unit | sprig | null | no |  |
| ing-h3-0029 | status | ready | needs_review | no |  |
| ing-h3-0029 | form | null | raw | no |  |
| ing-h3-0029 | note | toasted | optional; toasted | no |  |
| ing-h3-0029 | optional | true | false | no |  |
| ing-h3-0030 | status | ready | needs_review | no |  |
| ing-h3-0030 | name | brioche | brioche (slice) | no |  |
| ing-h3-0030 | unit | slice | each | no |  |
| ing-h3-0030 | form | null | raw | no |  |
| ing-h3-0031 | name | crawfish tail meat | raw crawfish tail meat | no | wrong_name (medium) |
| ing-h3-0032 | status | ready | needs_review | no |  |
| ing-h3-0032 | name | Lipton onion soup mix | Lipton onion soup mix (envelope) | no |  |
| ing-h3-0032 | unit | envelope | each | no |  |
| ing-h3-0032 | form | null | raw | no |  |
| ing-h3-0033 | name | null | 1/4 cup tamari or coconut aminos | no |  |
| ing-h3-0033 | quantity | 1/4 | null | no |  |
| ing-h3-0033 | unit | cup | null | no |  |
| ing-h3-0033 | alternatives | tamari \| coconut aminos | [] | no |  |
| ing-h3-0035 | name | aubergine | x large aubergine | no | wrong_name (medium) |
| ing-h3-0035 | note | large; cut into rounds | cut into rounds | no | wrong_name (medium) |
| ing-h3-0038 | name | null | fresh basil | no |  |
| ing-h3-0038 | form | null | raw | no |  |
| ing-h3-0038 | alternatives | fresh basil \| fresh parsley | [] | no |  |
| ing-h3-0041 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0041 | name | null | cashews/almonds | no | suppressed_ambiguity (medium) |
| ing-h3-0041 | alternatives | cashews \| almonds | [] | no | suppressed_ambiguity (medium) |
| ing-h3-0042 | name | gochujang | gochujang (Korean chili paste ) | no | wrong_name (medium) |
| ing-h3-0042 | note | Korean chili paste see note | see note | no | wrong_name (medium) |
| ing-h3-0043 | status | ready | needs_review | no |  |
| ing-h3-0043 | name | rib tips | tips (rib) | no |  |
| ing-h3-0043 | form | null | raw | no |  |
| ing-h3-0045 | status | ready | needs_review | no |  |
| ing-h3-0045 | name | ghee | 4 tbsp ghee | no |  |
| ing-h3-0045 | quantity | 13 | null | no |  |
| ing-h3-0045 | unit | tsp | null | no |  |
| ing-h3-0045 | note | for the skillet | plus 1 tsp for the skillet | no |  |
| ing-h3-0046 | status | ready | needs_review | no |  |
| ing-h3-0046 | name | frozen butternut squash cubes | frozen butternut squash cubes (bag) | no |  |
| ing-h3-0046 | unit | bag | each | no |  |
| ing-h3-0046 | packageSize | 10 oz | null | no |  |
| ing-h3-0046 | form | null | raw | no |  |
| ing-h3-0047 | status | ready | needs_review | no |  |
| ing-h3-0047 | quantity | 1/3 | 3333/10000 | no |  |
| ing-h3-0047 | form | null | raw | no |  |
| ing-h3-0048 | status | unsupported | needs_review | no |  |
| ing-h3-0048 | name | null | Two 9-inch round cake pans | no |  |
| ing-h3-0048 | note | null | buttered and floured | no |  |
| ing-h3-0049 | status | ready | needs_review | no |  |
| ing-h3-0049 | name | Lambrusco | a 750-ml bottle of Lambrusco | no |  |
| ing-h3-0049 | quantity | 1 | null | no |  |
| ing-h3-0049 | unit | bottle | null | no |  |
| ing-h3-0049 | packageSize | 750 ml | null | no |  |
| ing-h3-0051 | name | grape tomatoes | half-pint container grape tomatoes | no | wrong_amount (high) |
| ing-h3-0051 | unit | container | each | no | wrong_amount (high) |
| ing-h3-0051 | packageSize | 1/2 pint | null | no | wrong_amount (high) |
| ing-h3-0054 | status | ready | needs_review | no |  |
| ing-h3-0054 | name | free-range eggs | 4x free-range eggs | no |  |
| ing-h3-0054 | quantity | 4 | null | no |  |
| ing-h3-0054 | unit | each | null | no |  |
| ing-h3-0055 | status | ready | needs_review | no |  |
| ing-h3-0055 | name | ricotta | one cup ricotta | no |  |
| ing-h3-0055 | quantity | 1 | null | no |  |
| ing-h3-0055 | unit | cup | null | no |  |
| ing-h3-0057 | status | ready | needs_review | no |  |
| ing-h3-0057 | name | ground lamb | one quarter pound ground lamb | no |  |
| ing-h3-0057 | quantity | 1/4 | null | no |  |
| ing-h3-0057 | unit | lb | null | no |  |
| ing-h3-0058 | status | ready | needs_review | no |  |
| ing-h3-0058 | equivalents | 1/2 bunch | [] | no |  |
| ing-h3-0058 | form | null | raw | no |  |
| ing-h3-0059 | name | Branston pickle | heaped tbsp Branston pickle | no | wrong_amount (high) |
| ing-h3-0059 | unit | tbsp | each | no | wrong_amount (high) |
| ing-h3-0059 | note | heaped | null | no | wrong_amount (high) |
| ing-h3-0061 | status | ready | needs_review | no |  |
| ing-h3-0061 | name | plain yogurt | 3/4 cup / 175 ml plain yogurt | no |  |
| ing-h3-0061 | quantity | 3/4 | null | no |  |
| ing-h3-0061 | unit | cup | null | no |  |
| ing-h3-0061 | equivalents | 175 ml | [] | no |  |
| ing-h3-0062 | name | Italian ladyfingers | package Italian ladyfingers | no | wrong_amount (high) |
| ing-h3-0062 | quantity | 1 | 8 4/5 | no | wrong_amount (high) |
| ing-h3-0062 | unit | package | oz | no | wrong_amount (high) |
| ing-h3-0062 | packageSize | 8 4/5 oz | null | no | wrong_amount (high) |
| ing-h3-0063 | status | ready | needs_review | no |  |
| ing-h3-0063 | name | rose water | Drop of rose water | no |  |
| ing-h3-0063 | quantity | 1 | null | no |  |
| ing-h3-0063 | unit | drop | null | no |  |
| ing-h3-0064 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0064 | name | chicken stock | imperial pints chicken stock | no | suppressed_ambiguity (medium) |
| ing-h3-0064 | unit | pint | each | no | suppressed_ambiguity (medium) |
| ing-h3-0064 | note | imperial | null | yes | suppressed_ambiguity (medium) |
| ing-h3-0065 | status | ready | needs_review | no |  |
| ing-h3-0065 | name | warm pita bread | To serve: warm pita bread | no |  |
| ing-h3-0065 | amountUnstated | for_serving | null | no |  |
| ing-h3-0066 | status | ready | needs_review | no |  |
| ing-h3-0066 | equivalents | 1 cup | [] | no |  |
| ing-h3-0066 | form | null | raw | no |  |
| ing-h3-0067 | quantity | 2..2 1/2 | 2 1/2 | no |  |
| ing-h3-0067 | form | null | raw | no |  |
| ing-h3-0069 | status | ready | needs_review | no |  |
| ing-h3-0069 | name | shredded carrots | a. 2 cups shredded carrots | no |  |
| ing-h3-0069 | quantity | 2 | null | no |  |
| ing-h3-0069 | unit | cup | null | no |  |
| ing-h3-0070 | status | ready | needs_review | no |  |
| ing-h3-0070 | name | aubergine | 1 aubergine | no |  |
| ing-h3-0070 | quantity | 1 | null | no |  |
| ing-h3-0070 | unit | each | null | no |  |
| ing-h3-0072 | status | ready | needs_review | no |  |
| ing-h3-0072 | name | frozen shelled edamame | 1-lb. bag frozen shelled edamame | no |  |
| ing-h3-0072 | quantity | 1 | null | no |  |
| ing-h3-0072 | unit | bag | null | no |  |
| ing-h3-0072 | packageSize | 1 lb | null | no |  |
| ing-h3-0073 | status | ready | needs_review | no |  |
| ing-h3-0073 | equivalents | 240 ml \| 8 fl_oz | [] | no |  |
| ing-h3-0073 | form | null | raw | no |  |
| ing-h3-0074 | name | pork tenderloins | half-pound pork tenderloins | no | wrong_name (medium) |
| ing-h3-0074 | note | half-pound | null | no | wrong_name (medium) |
| ing-h3-0075 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0075 | name | crème fraîche | tub crème fraîche | no | suppressed_ambiguity (medium) |
| ing-h3-0075 | unit | null | each | no | suppressed_ambiguity (medium) |
| ing-h3-0076 | status | ready | needs_review | no |  |
| ing-h3-0076 | name | Tuscan kale | Tuscan kale (bunch) | no |  |
| ing-h3-0076 | unit | bunch | each | no |  |
| ing-h3-0076 | equivalents | 8 oz | [] | no |  |
| ing-h3-0076 | form | null | raw | no |  |
| ing-h3-0077 | status | ready | needs_review | no |  |
| ing-h3-0077 | equivalents | 2 bunch | [] | no |  |
| ing-h3-0077 | form | null | raw | no |  |
| ing-h3-0080 | status | ready | needs_review | no |  |
| ing-h3-0080 | name | rice vinegar | 2 tbsp + 2 tsp (40 ml) rice vinegar | no |  |
| ing-h3-0080 | quantity | 8 | null | no |  |
| ing-h3-0080 | unit | tsp | null | no |  |
| ing-h3-0080 | equivalents | 40 ml | [] | no |  |
| ing-h3-0082 | status | ready | needs_review | no |  |
| ing-h3-0082 | name | Maldon salt | a big pinch of Maldon salt | no |  |
| ing-h3-0082 | quantity | 1 | null | no |  |
| ing-h3-0082 | unit | pinch | null | no |  |
| ing-h3-0082 | note | big | null | no |  |
| ing-h3-0083 | name | null | light coconut milk | no |  |

(645 more row(s) in the JSON report.)

## Ingredient engine `semantic-v1`

Phase 2 semantic ingredient reader (contract v1)

### Overall — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 280/369 | 75.9% | 71.3%–80.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 283/369 | 76.7% | 72.1%–80.7% |
| Core pass, ready-labelled lines (strict) | 239/292 | 81.8% | 77.0%–85.9% |
| Core pass, ready-labelled lines (accepted) | 241/292 | 82.5% | 77.8%–86.5% |
| Full pass (every field), all lines (strict) | 264/369 | 71.5% | 66.7%–75.9% |
| Full pass (every field), all lines (accepted) | 268/369 | 72.6% | 67.9%–76.9% |
| Full pass, ready-labelled lines (strict) | 230/292 | 78.8% | 73.7%–83.1% |
| Full pass, ready-labelled lines (accepted) | 231/292 | 79.1% | 74.1%–83.4% |
| Review rate (engine not ready) | 94/369 | 25.5% | 21.3%–30.2% |
| Unnecessary review (label ready, engine not) | 29/292 | 9.9% | 7.0%–13.9% |
| **False certainty, total** (of all lines) | 35/369 | 9.5% | 6.9%–12.9% |
| False certainty — high | 17/369 | 4.6% | 2.9%–7.2% |
| False certainty — medium | 16/369 | 4.3% | 2.7%–6.9% |
| False certainty — low | 2/369 | 0.5% | 0.1%–1.9% |
| False certainty (of engine-ready lines) | 35/275 | 12.7% | 9.3%–17.2% |
| Suppressed ambiguity (of not-ready labels) | 12/77 | 15.6% | 9.2%–25.3% |
| Wrong amount on a ready reading (of ready labels) | 17/292 | 5.8% | 3.7%–9.1% |
| Wrong name on a ready reading (of ready labels) | 6/292 | 2.1% | 0.9%–4.4% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 9/275 | 3.3% | 1.7%–6.1% |
| **Fabricated quantity** (of lines with no labelled amount) | 5/46 | 10.9% | 4.7%–23.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 6/329 | 1.8% | 0.8%–3.9% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 313/369 (84.8%) | 313/369 (84.8%) | 263/292 (90.1%) | 263/292 (90.1%) |
| name | 316/369 (85.6%) | 319/369 (86.5%) | 264/292 (90.4%) | 266/292 (91.1%) |
| quantity | 342/369 (92.7%) | 342/369 (92.7%) | 271/292 (92.8%) | 271/292 (92.8%) |
| unit | 334/369 (90.5%) | 334/369 (90.5%) | 265/292 (90.8%) | 265/292 (90.8%) |
| packageSize | 363/369 (98.4%) | 363/369 (98.4%) | 287/292 (98.3%) | 287/292 (98.3%) |
| equivalents | 353/369 (95.7%) | 353/369 (95.7%) | 279/292 (95.5%) | 279/292 (95.5%) |
| form | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| note | 311/369 (84.3%) | 313/369 (84.8%) | 258/292 (88.4%) | 259/292 (88.7%) |
| alternatives | 361/369 (97.8%) | 363/369 (98.4%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 366/369 (99.2%) | 366/369 (99.2%) | 290/292 (99.3%) | 290/292 (99.3%) |
| approximate | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| amountUnstated | 367/369 (99.5%) | 367/369 (99.5%) | 290/292 (99.3%) | 290/292 (99.3%) |

### holdout3 — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 280/369 | 75.9% | 71.3%–80.0% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 283/369 | 76.7% | 72.1%–80.7% |
| Core pass, ready-labelled lines (strict) | 239/292 | 81.8% | 77.0%–85.9% |
| Core pass, ready-labelled lines (accepted) | 241/292 | 82.5% | 77.8%–86.5% |
| Full pass (every field), all lines (strict) | 264/369 | 71.5% | 66.7%–75.9% |
| Full pass (every field), all lines (accepted) | 268/369 | 72.6% | 67.9%–76.9% |
| Full pass, ready-labelled lines (strict) | 230/292 | 78.8% | 73.7%–83.1% |
| Full pass, ready-labelled lines (accepted) | 231/292 | 79.1% | 74.1%–83.4% |
| Review rate (engine not ready) | 94/369 | 25.5% | 21.3%–30.2% |
| Unnecessary review (label ready, engine not) | 29/292 | 9.9% | 7.0%–13.9% |
| **False certainty, total** (of all lines) | 35/369 | 9.5% | 6.9%–12.9% |
| False certainty — high | 17/369 | 4.6% | 2.9%–7.2% |
| False certainty — medium | 16/369 | 4.3% | 2.7%–6.9% |
| False certainty — low | 2/369 | 0.5% | 0.1%–1.9% |
| False certainty (of engine-ready lines) | 35/275 | 12.7% | 9.3%–17.2% |
| Suppressed ambiguity (of not-ready labels) | 12/77 | 15.6% | 9.2%–25.3% |
| Wrong amount on a ready reading (of ready labels) | 17/292 | 5.8% | 3.7%–9.1% |
| Wrong name on a ready reading (of ready labels) | 6/292 | 2.1% | 0.9%–4.4% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 9/275 | 3.3% | 1.7%–6.1% |
| **Fabricated quantity** (of lines with no labelled amount) | 5/46 | 10.9% | 4.7%–23.0% |
| **Cross-dimension** (of lines with a labelled unit or package) | 6/329 | 1.8% | 0.8%–3.9% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 313/369 (84.8%) | 313/369 (84.8%) | 263/292 (90.1%) | 263/292 (90.1%) |
| name | 316/369 (85.6%) | 319/369 (86.5%) | 264/292 (90.4%) | 266/292 (91.1%) |
| quantity | 342/369 (92.7%) | 342/369 (92.7%) | 271/292 (92.8%) | 271/292 (92.8%) |
| unit | 334/369 (90.5%) | 334/369 (90.5%) | 265/292 (90.8%) | 265/292 (90.8%) |
| packageSize | 363/369 (98.4%) | 363/369 (98.4%) | 287/292 (98.3%) | 287/292 (98.3%) |
| equivalents | 353/369 (95.7%) | 353/369 (95.7%) | 279/292 (95.5%) | 279/292 (95.5%) |
| form | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| note | 311/369 (84.3%) | 313/369 (84.8%) | 258/292 (88.4%) | 259/292 (88.7%) |
| alternatives | 361/369 (97.8%) | 363/369 (98.4%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 366/369 (99.2%) | 366/369 (99.2%) | 290/292 (99.3%) | 290/292 (99.3%) |
| approximate | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| amountUnstated | 367/369 (99.5%) | 367/369 (99.5%) | 290/292 (99.3%) | 290/292 (99.3%) |

### By category (holdout3)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 176/225 | 169/225 | 36/225 | 14/13/1 | 1/2 | 5/222 |
| fraction | 50 | 42/50 | 36/50 | 11/50 | 2/2/0 | 0/0 | 2/50 |
| fraction_third | 8 | 8/8 | 8/8 | 0/8 | 0/0/0 | 0/0 | 0/8 |
| mixed_vulgar | 12 | 12/12 | 12/12 | 1/12 | 0/0/0 | 0/0 | 0/12 |
| nested_parens | 4 | 4/4 | 4/4 | 0/4 | 0/0/0 | 0/0 | 0/4 |
| prep_note | 134 | 115/134 | 107/134 | 13/134 | 5/6/0 | 0/3 | 0/132 |
| source_choice | 3 | 3/3 | 3/3 | 0/3 | 0/0/0 | 0/0 | 0/3 |
| ingredient_alternatives | 17 | 14/17 | 9/17 | 17/17 | 0/0/0 | 0/0 | 0/17 |
| range | 7 | 7/7 | 7/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| optional | 6 | 4/6 | 3/6 | 2/6 | 0/0/0 | 0/2 | 0/4 |
| unstated_amount | 9 | 8/9 | 8/9 | 1/9 | 0/0/0 | 0/9 | 0/0 |
| quantity_missing | 8 | 7/8 | 7/8 | 8/8 | 0/0/0 | 1/8 | 0/4 |
| count_unit | 59 | 41/59 | 37/59 | 11/59 | 8/0/0 | 0/1 | 2/59 |
| package_size | 22 | 14/22 | 13/22 | 6/22 | 3/0/0 | 0/0 | 2/22 |
| oz_vs_floz | 6 | 5/6 | 5/6 | 1/6 | 0/0/0 | 0/0 | 0/6 |
| compound_quantity | 7 | 3/7 | 3/7 | 4/7 | 0/0/0 | 0/0 | 0/7 |
| equivalent_quantity | 30 | 20/30 | 12/30 | 7/30 | 1/3/0 | 0/0 | 0/30 |
| percentage | 3 | 2/3 | 2/3 | 1/3 | 0/0/0 | 0/1 | 0/2 |
| price_annotation | 5 | 5/5 | 4/5 | 0/5 | 0/0/0 | 0/0 | 0/5 |
| form_cooked_raw | 5 | 5/5 | 5/5 | 0/5 | 0/0/0 | 0/0 | 0/5 |
| number_word | 29 | 18/29 | 18/29 | 7/29 | 3/2/0 | 2/2 | 2/27 |
| approximate | 5 | 4/5 | 4/5 | 0/5 | 1/0/0 | 0/0 | 0/5 |
| imprecise_unit | 12 | 7/12 | 7/12 | 5/12 | 2/0/0 | 0/2 | 1/12 |
| heading_non_ingredient | 24 | 7/24 | 7/24 | 22/24 | 0/2/0 | 4/24 | 0/0 |
| empty | 1 | 1/1 | 1/1 | 1/1 | 0/0/0 | 0/1 | 0/0 |
| unicode_text | 21 | 16/21 | 16/21 | 5/21 | 0/1/0 | 1/3 | 0/17 |
| ambiguous_number_format | 3 | 2/3 | 2/3 | 3/3 | 0/0/0 | 0/3 | 0/3 |
| size_word | 21 | 13/21 | 13/21 | 2/21 | 2/5/0 | 0/0 | 0/20 |
| seasoning_lookalike | 17 | 16/17 | 16/17 | 2/17 | 1/0/0 | 0/1 | 1/17 |
| seasoning_ordinary | 4 | 2/4 | 2/4 | 0/4 | 0/0/2 | 0/2 | 0/2 |
| quart_pint_gallon | 8 | 6/8 | 5/8 | 3/8 | 1/0/0 | 0/0 | 0/8 |
| long_line | 4 | 4/4 | 3/4 | 0/4 | 0/0/0 | 0/0 | 0/4 |
| quantity_after_name | 6 | 4/6 | 4/6 | 1/6 | 0/0/1 | 0/0 | 0/6 |

### Mismatches (105 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-h3-0002 | status | unsupported | needs_review | no |  |
| ing-h3-0002 | name | null | baking dish | no |  |
| ing-h3-0002 | note | null | 9 x 13-inch; greased | no |  |
| ing-h3-0003 | status | needs_review | ready | no | suppressed_ambiguity (low) |
| ing-h3-0004 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0004 | equivalents | [] | 125 g | no | suppressed_ambiguity (medium) |
| ing-h3-0004 | note | 125 g; crumbled | crumbled | no | suppressed_ambiguity (medium) |
| ing-h3-0006 | status | ready | needs_review | no |  |
| ing-h3-0006 | name | gochujang mayo | null | no |  |
| ing-h3-0006 | quantity | 3 | null | no |  |
| ing-h3-0006 | unit | tbsp | null | no |  |
| ing-h3-0006 | note | null | 3 tbsp gochujang mayo | no |  |
| ing-h3-0007 | unit | g | null | no |  |
| ing-h3-0007 | note | null | 200 g | no |  |
| ing-h3-0011 | name | sweet potato | giant sweet potato | no | wrong_name (medium) |
| ing-h3-0011 | note | giant | null | no | wrong_name (medium) |
| ing-h3-0014 | equivalents | 4 each | [] | no | detail only (low) |
| ing-h3-0014 | note | null | about 4 bananas | no | detail only (low) |
| ing-h3-0015 | status | ready | needs_review | no |  |
| ing-h3-0015 | name | 5 spice seasoning | null | no |  |
| ing-h3-0015 | note | null | 5 spice seasoning | no |  |
| ing-h3-0016 | status | ready | needs_review | no |  |
| ing-h3-0016 | quantity | 1 | null | no |  |
| ing-h3-0016 | unit | gallon | null | no |  |
| ing-h3-0016 | note | null | 2 half-gallons | no |  |
| ing-h3-0017 | status | ready | needs_review | no |  |
| ing-h3-0017 | name | whole milk | less | no |  |
| ing-h3-0017 | quantity | 15 | 1 | no |  |
| ing-h3-0017 | unit | tbsp | cup | no |  |
| ing-h3-0017 | note | null | 1 tbsp whole milk | no |  |
| ing-h3-0018 | status | unsupported | needs_review | no |  |
| ing-h3-0018 | name | null | Iron | no |  |
| ing-h3-0018 | note | null | 2.1mg; 12% DV | no |  |
| ing-h3-0024 | status | ready | needs_review | no |  |
| ing-h3-0024 | name | trout | trout fillets | no |  |
| ing-h3-0024 | quantity | 4 | null | no |  |
| ing-h3-0024 | unit | fillet | null | no |  |
| ing-h3-0024 | note | pin bones removed | x4; pin bones removed | no |  |
| ing-h3-0033 | alternatives | tamari \| coconut aminos | tamari aminos \| coconut aminos | no |  |
| ing-h3-0035 | name | aubergine | x large aubergine | no | wrong_name (medium) |
| ing-h3-0035 | note | large; cut into rounds | cut into rounds | no | wrong_name (medium) |
| ing-h3-0038 | alternatives | fresh basil \| fresh parsley | fresh basil \| parsley | yes |  |
| ing-h3-0043 | name | rib tips | tips | no | wrong_amount (high) |
| ing-h3-0043 | unit | each | rib | no | wrong_amount (high) |
| ing-h3-0045 | status | ready | needs_review | no |  |
| ing-h3-0045 | quantity | 13 | 4 | no |  |
| ing-h3-0045 | unit | tsp | tbsp | no |  |
| ing-h3-0045 | note | for the skillet | plus 1 tsp for the skillet | no |  |
| ing-h3-0048 | status | unsupported | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0048 | name | null | round cake pans | no | suppressed_ambiguity (medium) |
| ing-h3-0048 | quantity | null | 2 | no | suppressed_ambiguity (medium) |
| ing-h3-0048 | unit | null | each | no | suppressed_ambiguity (medium) |
| ing-h3-0048 | note | null | 9-inch; buttered and floured | no | suppressed_ambiguity (medium) |
| ing-h3-0051 | name | grape tomatoes | half-pint container grape tomatoes | no | wrong_amount (high) |
| ing-h3-0051 | unit | container | each | no | wrong_amount (high) |
| ing-h3-0051 | packageSize | 1/2 pint | null | no | wrong_amount (high) |
| ing-h3-0054 | name | free-range eggs | x free-range eggs | no | wrong_name (medium) |
| ing-h3-0058 | equivalents | 1/2 bunch | [] | no | detail only (low) |
| ing-h3-0058 | note | null | from about 1/2 bunch | no | detail only (low) |
| ing-h3-0062 | status | ready | needs_review | no |  |
| ing-h3-0062 | quantity | 1 | null | no |  |
| ing-h3-0063 | status | ready | needs_review | no |  |
| ing-h3-0063 | quantity | 1 | null | no |  |
| ing-h3-0072 | status | ready | needs_review | no |  |
| ing-h3-0072 | quantity | 1 | null | no |  |
| ing-h3-0074 | name | pork tenderloins | half-pound pork tenderloins | no | wrong_name (medium) |
| ing-h3-0074 | note | half-pound | null | no | wrong_name (medium) |
| ing-h3-0075 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0075 | unit | null | container | no | suppressed_ambiguity (medium) |
| ing-h3-0077 | name | packed cilantro leaves | cilantro leaves | yes | detail only (low) |
| ing-h3-0077 | equivalents | 2 bunch | [] | no | detail only (low) |
| ing-h3-0077 | note | null | packed; from 2 bunches | no | detail only (low) |
| ing-h3-0080 | status | ready | needs_review | no |  |
| ing-h3-0080 | equivalents | 40 ml | [] | no |  |
| ing-h3-0083 | alternatives | light coconut milk \| full-fat coconut milk | light coconut milk \| full-fat | no |  |
| ing-h3-0086 | name | null | tahini | no |  |
| ing-h3-0086 | note | null | peanut butter or almond butter | no |  |
| ing-h3-0086 | alternatives | tahini \| peanut butter \| almond butter | [] | no |  |
| ing-h3-0087 | status | ready | needs_review | no |  |
| ing-h3-0087 | quantity | 1 | null | no |  |
| ing-h3-0088 | status | unsupported | needs_review | no |  |
| ing-h3-0088 | note | null | 38 reviews | no |  |
| ing-h3-0091 | name | cabbage | cabbage leaves | no | wrong_amount (high) |
| ing-h3-0091 | unit | leaf | each | no | wrong_amount (high) |
| ing-h3-0092 | note | null | bunch | no | detail only (low) |
| ing-h3-0093 | status | unsupported | needs_review | no |  |
| ing-h3-0093 | name | null | Freezer-safe zip-top bags | no |  |
| ing-h3-0102 | status | ready | needs_review | no |  |
| ing-h3-0102 | quantity | 1 | null | no |  |
| ing-h3-0109 | name | green cardamom | green cardamom pods | no | wrong_amount (high) |
| ing-h3-0109 | unit | pod | each | no | wrong_amount (high) |
| ing-h3-0110 | name | Vidalia onion | colossal Vidalia onion | no | wrong_name (medium) |
| ing-h3-0110 | note | colossal | null | no | wrong_name (medium) |
| ing-h3-0113 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0114 | status | unsupported | needs_review | no |  |
| ing-h3-0114 | name | null | Kitchen twine | no |  |
| ing-h3-0118 | name | saffron | x pinch saffron | no | wrong_amount (high) |
| ing-h3-0118 | unit | pinch | each | no | wrong_amount (high) |
| ing-h3-0120 | name | null | lettuce | no |  |
| ing-h3-0120 | note | null | romaine or green leaf | no |  |
| ing-h3-0120 | alternatives | romaine lettuce \| green leaf lettuce | [] | no |  |
| ing-h3-0121 | status | ready | needs_review | no |  |
| ing-h3-0121 | equivalents | 5 lb | [] | no |  |
| ing-h3-0121 | note | null | 5-lb | no |  |
| ing-h3-0123 | packageSize | 24 oz | null | no | wrong_amount (high) |
| ing-h3-0123 | note | any brand | 24 oz; any brand | no | wrong_amount (high) |
| ing-h3-0124 | name | drop dumplings | dumplings | no | wrong_amount (high) |
| ing-h3-0124 | unit | each | drop | no | wrong_amount (high) |
| ing-h3-0127 | status | ready | needs_review | no |  |
| ing-h3-0127 | unit | container | cup | no |  |
| ing-h3-0127 | packageSize | 6 oz | null | no |  |
| ing-h3-0127 | note | null | 6 oz | no |  |
| ing-h3-0138 | note | 4 tsp | null | no |  |
| ing-h3-0140 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0140 | name | null | fresh peas and fava beans | no | suppressed_ambiguity (medium) |
| ing-h3-0145 | name | strip steaks | steaks | no | wrong_amount (high) |
| ing-h3-0145 | unit | each | strip | no | wrong_amount (high) |
| ing-h3-0145 | packageSize | null | 12 oz | no | wrong_amount (high) |
| ing-h3-0145 | note | about 12 oz each | null | no | wrong_amount (high) |
| ing-h3-0149 | status | ready | needs_review | no |  |
| ing-h3-0149 | quantity | 7 | 2 | no |  |
| ing-h3-0149 | unit | tsp | tbsp | no |  |
| ing-h3-0149 | note | for the pan | 1 tsp for the pan | no |  |
| ing-h3-0150 | name | null | ground chicken | no |  |
| ing-h3-0150 | note | null | turkey or pork | no |  |
| ing-h3-0150 | alternatives | ground chicken \| ground turkey \| ground pork | [] | no |  |
| ing-h3-0156 | name | null | cumin | no |  |
| ing-h3-0156 | note | null | coriander and turmeric | no |  |
| ing-h3-0161 | name | loosely packed watercress | watercress | yes |  |
| ing-h3-0161 | note | thick stems trimmed | loosely packed; thick stems trimmed | yes |  |
| ing-h3-0171 | unit | bag | each | no |  |
| ing-h3-0171 | packageSize | 500 g | null | no |  |
| ing-h3-0171 | equivalents | [] | 500 g \| 1 lb | no |  |
| ing-h3-0171 | note | 1 lb | bag | no |  |
| ing-h3-0180 | status | ready | needs_review | no |  |
| ing-h3-0180 | quantity | 1 | null | no |  |
| ing-h3-0180 | unit | inch | null | no |  |
| ing-h3-0180 | note | grated | 1 inch; grated | no |  |
| ing-h3-0181 | status | ready | needs_review | no |  |
| ing-h3-0181 | name | cloves | null | no |  |
| ing-h3-0181 | unit | each | clove | no |  |
| ing-h3-0189 | status | unsupported | needs_review | no |  |
| ing-h3-0189 | name | null | Equipment | no |  |
| ing-h3-0193 | quantity | 3 | null | no |  |
| ing-h3-0193 | note | null | 3 rashers | no |  |
| ing-h3-0196 | status | unsupported | needs_review | no |  |
| ing-h3-0196 | name | null | Rated | no |  |
| ing-h3-0196 | note | null | 4.9 out of 5 by 63 readers | no |  |
| ing-h3-0199 | status | ready | needs_review | no |  |
| ing-h3-0199 | quantity | 1 | null | no |  |
| ing-h3-0204 | status | unsupported | needs_review | no |  |
| ing-h3-0204 | name | null | cast-iron skillet | no |  |
| ing-h3-0204 | quantity | null | 1 | no |  |
| ing-h3-0204 | unit | null | each | no |  |
| ing-h3-0204 | note | null | You will need; 10-inch | no |  |
| ing-h3-0211 | status | unsupported | needs_review | no |  |
| ing-h3-0211 | name | null | Topping | no |  |
| ing-h3-0211 | optional | false | true | no |  |
| ing-h3-0217 | equivalents | 6 each | [] | no | detail only (low) |
| ing-h3-0217 | note | null | about 6 thighs | no | detail only (low) |
| ing-h3-0221 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0221 | name | null | sun-dried tomatoes and kalamata olives | no | suppressed_ambiguity (medium) |
| ing-h3-0229 | equivalents | 1 cup | [] | no | detail only (low) |
| ing-h3-0229 | note | chopped | chopped about 1 cup | no | detail only (low) |
| ing-h3-0237 | status | ready | needs_review | no |  |
| ing-h3-0237 | quantity | 1/2 | null | no |  |
| ing-h3-0237 | unit | cup | null | no |  |
| ing-h3-0237 | note | null | a half-cup | no |  |
| ing-h3-0241 | name | escarole | escarole heads | no | wrong_amount (high) |
| ing-h3-0241 | unit | head | each | no | wrong_amount (high) |
| ing-h3-0244 | status | ready | needs_review | no |  |
| ing-h3-0244 | equivalents | 2 lb | [] | no |  |
| ing-h3-0244 | note | trimmed | 2-pound; trimmed | no |  |
| ing-h3-0246 | status | ready | needs_review | no |  |
| ing-h3-0246 | quantity | 1 | null | no |  |
| ing-h3-0248 | status | ready | needs_review | no |  |
| ing-h3-0248 | note | null | Garnish optional | no |  |
| ing-h3-0248 | optional | true | false | no |  |
| ing-h3-0248 | amountUnstated | for_garnish | null | no |  |
| ing-h3-0252 | note | but recommended | optional but recommended | no | detail only (low) |
| ing-h3-0252 | optional | true | false | no | detail only (low) |
| ing-h3-0253 | name | chicken stock | quarter-cups chicken stock | no | wrong_amount (high) |
| ing-h3-0253 | quantity | 1/2 | 2 | no | wrong_amount (high) |
| ing-h3-0253 | unit | cup | each | no | wrong_amount (high) |
| ing-h3-0254 | name | Seven grain hot cereal | grain hot cereal | no |  |
| ing-h3-0254 | quantity | null | 7 | no |  |
| ing-h3-0254 | unit | null | each | no |  |
| ing-h3-0258 | status | ready | needs_review | no |  |
| ing-h3-0258 | equivalents | 1 ml | [] | no |  |
| ing-h3-0259 | name | loosely packed arugula | arugula | yes |  |
| ing-h3-0259 | note | null | loosely packed | yes |  |
| ing-h3-0261 | equivalents | 1 bunch | [] | no | detail only (low) |
| ing-h3-0261 | note | plus extra leaves for garnish | from about 1 bunch; plus extra leaves for garnish | no | detail only (low) |
| ing-h3-0262 | status | unsupported | needs_review | no |  |
| ing-h3-0262 | name | null | Korean | no |  |
| ing-h3-0262 | note | null | Cuisine | no |  |
| ing-h3-0270 | status | unsupported | needs_review | no |  |
| ing-h3-0270 | name | null | Wooden skewers | no |  |
| ing-h3-0270 | note | null | soaked in water for 30 minutes | no |  |
| ing-h3-0271 | status | unsupported | ready | no | suppressed_ambiguity (medium) |

(64 more row(s) in the JSON report.)

## Ingredient engine `semantic-v2`

Phase 2B semantic ingredient reader, repaired families A–D (contract v1)

### Overall — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 352/369 | 95.4% | 92.8%–97.1% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 355/369 | 96.2% | 93.7%–97.7% |
| Core pass, ready-labelled lines (strict) | 284/292 | 97.3% | 94.7%–98.6% |
| Core pass, ready-labelled lines (accepted) | 286/292 | 98.0% | 95.6%–99.1% |
| Full pass (every field), all lines (strict) | 338/369 | 91.6% | 88.3%–94.0% |
| Full pass (every field), all lines (accepted) | 341/369 | 92.4% | 89.3%–94.7% |
| Full pass, ready-labelled lines (strict) | 279/292 | 95.5% | 92.5%–97.4% |
| Full pass, ready-labelled lines (accepted) | 281/292 | 96.2% | 93.4%–97.9% |
| Review rate (engine not ready) | 79/369 | 21.4% | 17.5%–25.9% |
| Unnecessary review (label ready, engine not) | 5/292 | 1.7% | 0.7%–4.0% |
| **False certainty, total** (of all lines) | 4/369 | 1.1% | 0.4%–2.8% |
| False certainty — high | 1/369 | 0.3% | 0.1%–1.5% |
| False certainty — medium | 3/369 | 0.8% | 0.3%–2.4% |
| False certainty — low | 0/369 | 0.0% | 0.0%–1.0% |
| False certainty (of engine-ready lines) | 4/290 | 1.4% | 0.5%–3.5% |
| Suppressed ambiguity (of not-ready labels) | 3/77 | 3.9% | 1.3%–10.8% |
| Wrong amount on a ready reading (of ready labels) | 1/292 | 0.3% | 0.1%–1.9% |
| Wrong name on a ready reading (of ready labels) | 0/292 | 0.0% | 0.0%–1.3% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 5/290 | 1.7% | 0.7%–4.0% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/46 | 0.0% | 0.0%–7.7% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/329 | 0.0% | 0.0%–1.1% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 358/369 (97.0%) | 358/369 (97.0%) | 287/292 (98.3%) | 287/292 (98.3%) |
| name | 359/369 (97.3%) | 362/369 (98.1%) | 287/292 (98.3%) | 289/292 (99.0%) |
| quantity | 365/369 (98.9%) | 365/369 (98.9%) | 289/292 (99.0%) | 289/292 (99.0%) |
| unit | 363/369 (98.4%) | 363/369 (98.4%) | 288/292 (98.6%) | 288/292 (98.6%) |
| packageSize | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| equivalents | 367/369 (99.5%) | 367/369 (99.5%) | 290/292 (99.3%) | 290/292 (99.3%) |
| form | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| note | 348/369 (94.3%) | 351/369 (95.1%) | 283/292 (96.9%) | 285/292 (97.6%) |
| alternatives | 368/369 (99.7%) | 368/369 (99.7%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 366/369 (99.2%) | 366/369 (99.2%) | 290/292 (99.3%) | 290/292 (99.3%) |
| approximate | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| amountUnstated | 367/369 (99.5%) | 367/369 (99.5%) | 290/292 (99.3%) | 290/292 (99.3%) |

### holdout3 — 369 lines (292 ready-labelled, engine errors 0)

| Metric | n/N | Rate | 95% CI (Wilson) |
|---|---|---|---|
| Core pass (status+name+quantity+unit), all lines (strict) | 352/369 | 95.4% | 92.8%–97.1% |
| Core pass (status+name+quantity+unit), all lines (accepted) | 355/369 | 96.2% | 93.7%–97.7% |
| Core pass, ready-labelled lines (strict) | 284/292 | 97.3% | 94.7%–98.6% |
| Core pass, ready-labelled lines (accepted) | 286/292 | 98.0% | 95.6%–99.1% |
| Full pass (every field), all lines (strict) | 338/369 | 91.6% | 88.3%–94.0% |
| Full pass (every field), all lines (accepted) | 341/369 | 92.4% | 89.3%–94.7% |
| Full pass, ready-labelled lines (strict) | 279/292 | 95.5% | 92.5%–97.4% |
| Full pass, ready-labelled lines (accepted) | 281/292 | 96.2% | 93.4%–97.9% |
| Review rate (engine not ready) | 79/369 | 21.4% | 17.5%–25.9% |
| Unnecessary review (label ready, engine not) | 5/292 | 1.7% | 0.7%–4.0% |
| **False certainty, total** (of all lines) | 4/369 | 1.1% | 0.4%–2.8% |
| False certainty — high | 1/369 | 0.3% | 0.1%–1.5% |
| False certainty — medium | 3/369 | 0.8% | 0.3%–2.4% |
| False certainty — low | 0/369 | 0.0% | 0.0%–1.0% |
| False certainty (of engine-ready lines) | 4/290 | 1.4% | 0.5%–3.5% |
| Suppressed ambiguity (of not-ready labels) | 3/77 | 3.9% | 1.3%–10.8% |
| Wrong amount on a ready reading (of ready labels) | 1/292 | 0.3% | 0.1%–1.9% |
| Wrong name on a ready reading (of ready labels) | 0/292 | 0.0% | 0.0%–1.3% |
| Note/flags-only mismatch on a ready reading — low, separate (of engine-ready) | 5/290 | 1.7% | 0.7%–4.0% |
| **Fabricated quantity** (of lines with no labelled amount) | 0/46 | 0.0% | 0.0%–7.7% |
| **Cross-dimension** (of lines with a labelled unit or package) | 0/329 | 0.0% | 0.0%–1.1% |

| Field | All lines strict | All lines accepted | Ready-labelled strict | Ready-labelled accepted |
|---|---|---|---|---|
| status | 358/369 (97.0%) | 358/369 (97.0%) | 287/292 (98.3%) | 287/292 (98.3%) |
| name | 359/369 (97.3%) | 362/369 (98.1%) | 287/292 (98.3%) | 289/292 (99.0%) |
| quantity | 365/369 (98.9%) | 365/369 (98.9%) | 289/292 (99.0%) | 289/292 (99.0%) |
| unit | 363/369 (98.4%) | 363/369 (98.4%) | 288/292 (98.6%) | 288/292 (98.6%) |
| packageSize | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| equivalents | 367/369 (99.5%) | 367/369 (99.5%) | 290/292 (99.3%) | 290/292 (99.3%) |
| form | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| note | 348/369 (94.3%) | 351/369 (95.1%) | 283/292 (96.9%) | 285/292 (97.6%) |
| alternatives | 368/369 (99.7%) | 368/369 (99.7%) | 292/292 (100.0%) | 292/292 (100.0%) |
| optional | 366/369 (99.2%) | 366/369 (99.2%) | 290/292 (99.3%) | 290/292 (99.3%) |
| approximate | 369/369 (100.0%) | 369/369 (100.0%) | 292/292 (100.0%) | 292/292 (100.0%) |
| amountUnstated | 367/369 (99.5%) | 367/369 (99.5%) | 290/292 (99.3%) | 290/292 (99.3%) |

### By category (holdout3)

| Category | Cases | Core pass (strict) | Full pass (strict) | Review | False certainty H/M/L | Fabricated | Cross-dim |
|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 214/225 | 202/225 | 32/225 | 1/3/0 | 0/2 | 0/222 |
| fraction | 50 | 50/50 | 49/50 | 8/50 | 0/0/0 | 0/0 | 0/50 |
| fraction_third | 8 | 8/8 | 8/8 | 0/8 | 0/0/0 | 0/0 | 0/8 |
| mixed_vulgar | 12 | 12/12 | 12/12 | 1/12 | 0/0/0 | 0/0 | 0/12 |
| nested_parens | 4 | 4/4 | 4/4 | 0/4 | 0/0/0 | 0/0 | 0/4 |
| prep_note | 134 | 129/134 | 125/134 | 12/134 | 0/1/0 | 0/3 | 0/132 |
| source_choice | 3 | 3/3 | 3/3 | 0/3 | 0/0/0 | 0/0 | 0/3 |
| ingredient_alternatives | 17 | 17/17 | 16/17 | 17/17 | 0/0/0 | 0/0 | 0/17 |
| range | 7 | 7/7 | 7/7 | 7/7 | 0/0/0 | 0/0 | 0/7 |
| optional | 6 | 4/6 | 3/6 | 2/6 | 0/0/0 | 0/2 | 0/4 |
| unstated_amount | 9 | 8/9 | 8/9 | 1/9 | 0/0/0 | 0/9 | 0/0 |
| quantity_missing | 8 | 8/8 | 8/8 | 8/8 | 0/0/0 | 0/8 | 0/4 |
| count_unit | 59 | 56/59 | 53/59 | 5/59 | 0/0/0 | 0/1 | 0/59 |
| package_size | 22 | 22/22 | 21/22 | 1/22 | 0/0/0 | 0/0 | 0/22 |
| oz_vs_floz | 6 | 6/6 | 6/6 | 0/6 | 0/0/0 | 0/0 | 0/6 |
| compound_quantity | 7 | 7/7 | 7/7 | 0/7 | 0/0/0 | 0/0 | 0/7 |
| equivalent_quantity | 30 | 27/30 | 22/30 | 5/30 | 1/0/0 | 0/0 | 0/30 |
| percentage | 3 | 3/3 | 3/3 | 1/3 | 0/0/0 | 0/1 | 0/2 |
| price_annotation | 5 | 5/5 | 4/5 | 0/5 | 0/0/0 | 0/0 | 0/5 |
| form_cooked_raw | 5 | 5/5 | 5/5 | 0/5 | 0/0/0 | 0/0 | 0/5 |
| number_word | 29 | 28/29 | 28/29 | 4/29 | 0/0/0 | 0/2 | 0/27 |
| approximate | 5 | 5/5 | 4/5 | 0/5 | 0/0/0 | 0/0 | 0/5 |
| imprecise_unit | 12 | 12/12 | 11/12 | 2/12 | 0/0/0 | 0/2 | 0/12 |
| heading_non_ingredient | 24 | 21/24 | 21/24 | 24/24 | 0/0/0 | 0/24 | 0/0 |
| empty | 1 | 1/1 | 1/1 | 1/1 | 0/0/0 | 0/1 | 0/0 |
| unicode_text | 21 | 20/21 | 20/21 | 3/21 | 0/1/0 | 0/3 | 0/17 |
| ambiguous_number_format | 3 | 2/3 | 2/3 | 3/3 | 0/0/0 | 0/3 | 0/3 |
| size_word | 21 | 19/21 | 19/21 | 2/21 | 0/1/0 | 0/0 | 0/20 |
| seasoning_lookalike | 17 | 17/17 | 17/17 | 2/17 | 0/0/0 | 0/1 | 0/17 |
| seasoning_ordinary | 4 | 4/4 | 4/4 | 2/4 | 0/0/0 | 0/2 | 0/2 |
| quart_pint_gallon | 8 | 8/8 | 7/8 | 2/8 | 0/0/0 | 0/0 | 0/8 |
| long_line | 4 | 4/4 | 4/4 | 0/4 | 0/0/0 | 0/0 | 0/4 |
| quantity_after_name | 6 | 6/6 | 6/6 | 1/6 | 0/0/0 | 0/0 | 0/6 |

### Mismatches (31 case(s); field rows shown up to 200)

| Case | Field | Expected | Got | Accepted | False certainty |
|---|---|---|---|---|---|
| ing-h3-0004 | note | 125 g; crumbled | crumbled | no |  |
| ing-h3-0007 | unit | g | null | no |  |
| ing-h3-0007 | note | null | 200 g | no |  |
| ing-h3-0075 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0075 | unit | null | container | no | suppressed_ambiguity (medium) |
| ing-h3-0077 | name | packed cilantro leaves | cilantro leaves | yes |  |
| ing-h3-0077 | note | null | packed | yes |  |
| ing-h3-0089 | status | ready | needs_review | no |  |
| ing-h3-0089 | name | silverbeet | bunch silverbeet | no |  |
| ing-h3-0089 | quantity | 1 | null | no |  |
| ing-h3-0089 | unit | bunch | null | no |  |
| ing-h3-0092 | note | null | bunch | no | detail only (low) |
| ing-h3-0113 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0120 | alternatives | romaine lettuce \| green leaf lettuce | romaine leaf \| green leaf | no |  |
| ing-h3-0138 | note | 4 tsp | null | no |  |
| ing-h3-0140 | status | needs_review | ready | no | suppressed_ambiguity (medium) |
| ing-h3-0140 | name | null | fresh peas and fava beans | no | suppressed_ambiguity (medium) |
| ing-h3-0145 | note | about 12 oz each | 12 oz each | no | detail only (low) |
| ing-h3-0156 | note | null | cumin; coriander and turmeric | no |  |
| ing-h3-0161 | name | loosely packed watercress | watercress | yes |  |
| ing-h3-0161 | note | thick stems trimmed | loosely packed; thick stems trimmed | yes |  |
| ing-h3-0171 | note | 1 lb | null | no |  |
| ing-h3-0189 | status | unsupported | needs_review | no |  |
| ing-h3-0189 | name | null | Equipment | no |  |
| ing-h3-0193 | quantity | 3 | null | no |  |
| ing-h3-0193 | note | null | 3 rashers | no |  |
| ing-h3-0197 | status | ready | needs_review | no |  |
| ing-h3-0211 | status | unsupported | needs_review | no |  |
| ing-h3-0211 | name | null | Topping | no |  |
| ing-h3-0211 | optional | false | true | no |  |
| ing-h3-0221 | note | chopped | sun-dried tomatoes and kalamata olives; chopped | no |  |
| ing-h3-0222 | status | ready | needs_review | no |  |
| ing-h3-0222 | name | shredded four cheese Mexican blend | bag shredded four cheese Mexican blend | no |  |
| ing-h3-0222 | quantity | 1 | null | no |  |
| ing-h3-0222 | unit | bag | null | no |  |
| ing-h3-0229 | equivalents | 1 cup | [] | no | detail only (low) |
| ing-h3-0229 | note | chopped | chopped about 1 cup | no | detail only (low) |
| ing-h3-0248 | status | ready | needs_review | no |  |
| ing-h3-0248 | note | null | Garnish optional | no |  |
| ing-h3-0248 | optional | true | false | no |  |
| ing-h3-0248 | amountUnstated | for_garnish | null | no |  |
| ing-h3-0252 | note | but recommended | optional but recommended | no | detail only (low) |
| ing-h3-0252 | optional | true | false | no | detail only (low) |
| ing-h3-0259 | name | loosely packed arugula | arugula | yes |  |
| ing-h3-0259 | note | null | loosely packed | yes |  |
| ing-h3-0277 | note | to serve | null | no | detail only (low) |
| ing-h3-0277 | amountUnstated | null | for_serving | no | detail only (low) |
| ing-h3-0297 | name | strip steak | steak | no | wrong_amount (high) |
| ing-h3-0297 | unit | each | strip | no | wrong_amount (high) |
| ing-h3-0300 | note | 750 g; cubed | cubed | no |  |
| ing-h3-0311 | note | null | black beans and rice | no |  |
| ing-h3-0314 | status | unsupported | needs_review | no |  |
| ing-h3-0314 | name | null | overnight | no |  |
| ing-h3-0314 | note | null | Resting time | no |  |
| ing-h3-0319 | note | 568ml | null | no |  |
| ing-h3-0333 | status | ready | needs_review | no |  |
| ing-h3-0333 | quantity | 1 | null | no |  |
| ing-h3-0333 | unit | each | null | no |  |
| ing-h3-0333 | equivalents | 500 g | [] | no |  |
| ing-h3-0333 | note | trimmed | 500 g; trimmed | no |  |

## Outcomes (outcomes v3, EVALUATION-PLAN-v3)

Scorer: `outcomes` v3 for EVALUATION-PLAN-v3 · source `bench/outcomes.ts` SHA-256 `7821e8532eb123e9694291c6d0deac6bdac40f96715d06a4d2aa2161fc3a3892`.

One outcome class per line (EVALUATION-PLAN-v3, carrying EVALUATION-PLAN-v2 §3–§7 except SCORE-01/02); sets are reported separately and never pooled. Every rate shows n/N and a Wilson 95% interval (z = 1.959964); for a zero count the upper bound is the claim. Accepted matching (a case's `accept` values count) is the acceptance basis; strict figures are listed too. R / A / U = lines labelled ready / needs_review / unsupported; N = all lines. Every line is parsed twice: validity, engine error and nondeterminism are separate dimensions, and any of them makes the line CE (no class, no S code).

Holdout-v3 freeze: FREEZE-v3.json (2026-10-10), SHA-256 `fd4a989fe48d89f5…` — verified against holdout-v3.jsonl before this run.

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
| holdout-v3 (fresh; acceptance set) | 369 | 292/52/25 | 113/292 (38.7%, 33.3%–44.4%) | 113/292 (38.7%, 33.3%–44.4%) | 31/11 | 147/292 (50.3%, 44.6%–56.0%) | 43/52 | 1/25 | 0 | S1×1 S2×6 S3×10 S4×9 S6×3 S8×1 |

#### holdout-v3 (fresh; acceptance set) — 369 lines (R 292, A 52, U 25)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 113/292 | 38.7% | 33.3%–44.4% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 113/292 | 38.7% | 33.3%–44.4% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| **C2 incorrect ready** (of N) | 42/369 | 11.4% | 8.5%–15.0% |  |
| C2 — high false certainty (of N) | 31/369 | 8.4% | 6.0%–11.7% | ing-h3-0016, ing-h3-0041, ing-h3-0051, ing-h3-0059, ing-h3-0062, ing-h3-0064, ing-h3-0075, ing-h3-0091, ing-h3-0109, ing-h3-0126, ing-h3-0140, ing-h3-0156, ing-h3-0188, ing-h3-0193, ing-h3-0195, ing-h3-0199, ing-h3-0200, ing-h3-0221, ing-h3-0241, ing-h3-0246, ing-h3-0253, ing-h3-0271, ing-h3-0282, ing-h3-0286, ing-h3-0287, ing-h3-0292, ing-h3-0311, ing-h3-0317, ing-h3-0330, ing-h3-0341, ing-h3-0354 |
| C2 — medium false certainty (of N) | 11/369 | 3.0% | 1.7%–5.3% | ing-h3-0031, ing-h3-0035, ing-h3-0042, ing-h3-0074, ing-h3-0110, ing-h3-0119, ing-h3-0133, ing-h3-0173, ing-h3-0274, ing-h3-0280, ing-h3-0355 |
| C2 on ready labels (of R) | 32/292 | 11.0% | 7.9%–15.1% |  |
| C2 on needs_review labels (of A) | 9/52 | 17.3% | 9.4%–29.7% |  |
| C2 on unsupported labels (of U) | 1/25 | 4.0% | 0.7%–19.5% |  |
| C3 unnecessary review (of R) | 147/292 | 50.3% | 44.6%–56.0% |  |
| C3a useful partial (of R) | 10/292 | 3.4% | 1.9%–6.2% | ing-h3-0043, ing-h3-0112, ing-h3-0124, ing-h3-0164, ing-h3-0181, ing-h3-0226, ing-h3-0297, ing-h3-0363, ing-h3-0367, ing-h3-0368 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 137/292 | 46.9% | 41.3%–52.6% | ing-h3-0001, ing-h3-0006, ing-h3-0011, ing-h3-0012, ing-h3-0014, ing-h3-0015, ing-h3-0017, ing-h3-0021, ing-h3-0022, ing-h3-0024, ing-h3-0029, ing-h3-0030, ing-h3-0032, ing-h3-0045, ing-h3-0046, ing-h3-0047, ing-h3-0049, ing-h3-0054, ing-h3-0055, ing-h3-0057, ing-h3-0058, ing-h3-0061, ing-h3-0063, ing-h3-0065, ing-h3-0066 … (+112 in the JSON report) |
| C3c abstention (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C4 unnecessary rejection (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3 + C4 (of R) | 147/292 | 50.3% | 44.6%–56.0% |  |
| C5 correct review (of A) | 43/52 | 82.7% | 70.3%–90.6% |  |
| C5a useful partial (of A) | 4/52 | 7.7% | 3.0%–18.2% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 39/52 | 75.0% | 61.8%–84.8% | ing-h3-0003, ing-h3-0004, ing-h3-0007, ing-h3-0010, ing-h3-0026, ing-h3-0033, ing-h3-0038, ing-h3-0067, ing-h3-0083, ing-h3-0086, ing-h3-0099, ing-h3-0113, ing-h3-0120, ing-h3-0129, ing-h3-0131, ing-h3-0138, ing-h3-0142, ing-h3-0150, ing-h3-0171, ing-h3-0176, ing-h3-0215, ing-h3-0219, ing-h3-0242, ing-h3-0251, ing-h3-0259 … (+14 in the JSON report) |
| C5c abstention (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C6 review rejected (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C7 correct rejection (of U) | 1/25 | 4.0% | 0.7%–19.5% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 23/25 | 92.0% | 75.0%–97.8% | ing-h3-0002, ing-h3-0005, ing-h3-0009, ing-h3-0018, ing-h3-0048, ing-h3-0088, ing-h3-0093, ing-h3-0114, ing-h3-0155, ing-h3-0174, ing-h3-0189, ing-h3-0196, ing-h3-0204, ing-h3-0211, ing-h3-0260, ing-h3-0262, ing-h3-0270, ing-h3-0276, ing-h3-0294, ing-h3-0296, ing-h3-0314, ing-h3-0325, ing-h3-0357 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: engine error (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: output fails the contract validator (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S1 fabricated amount** (of N) | 1/369 | 0.3% | 0.1%–1.5% | ing-h3-0271 |
| **S2 wrong amount on a ready reading** (of N) | 6/369 | 1.6% | 0.8%–3.5% | ing-h3-0016, ing-h3-0062, ing-h3-0199, ing-h3-0246, ing-h3-0253, ing-h3-0354 |
| **S3 cross-dimension** (of N) | 10/369 | 2.7% | 1.5%–4.9% | ing-h3-0016, ing-h3-0059, ing-h3-0062, ing-h3-0064, ing-h3-0126, ing-h3-0199, ing-h3-0246, ing-h3-0253, ing-h3-0287, ing-h3-0354 |
| **S4 suppressed ambiguity** (of N) | 9/369 | 2.4% | 1.3%–4.6% | ing-h3-0041, ing-h3-0064, ing-h3-0075, ing-h3-0140, ing-h3-0156, ing-h3-0193, ing-h3-0221, ing-h3-0311, ing-h3-0341 |
| **S5 silent alternative choice** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S6 package representation changed** (of N) | 3/369 | 0.8% | 0.3%–2.4% | ing-h3-0062, ing-h3-0199, ing-h3-0246 |
| **S7 dropped material qualifier** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S8 ready on a non-ingredient** (of N) | 1/369 | 0.3% | 0.1%–1.5% | ing-h3-0271 |
| Any severe error (of N) | 19/369 | 5.1% | 3.3%–7.9% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/369 | 0.0% | ≤ 1.0% |  |

Strict matching: C1 113/292 (38.7%, 33.3%–44.4%) · C1+ 113/292 (38.7%, 33.3%–44.4%) · C2 42/369 (11.4%, 8.5%–15.0%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 123/292 (42.1%, 36.6%–47.9%) | 123/292 (42.1%, 36.6%–47.9%) |
| quantity | 170/292 (58.2%, 52.5%–63.7%) | 170/292 (58.2%, 52.5%–63.7%) |
| unit | 133/292 (45.6%, 39.9%–51.3%) | 133/292 (45.6%, 39.9%–51.3%) |

##### By category — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 194/30/1 | 82/194 | 82/194 | 36 (25/11) | 85/194 | 6/79/0/0 | 0 | 22/30 | 0 | 0/1 | 0 | 0 | S1×1 S2×2 S3×6 S4×8 S8×1 |
| fraction | 50 | 42/8/0 | 23/42 | 23/42 | 3 (3/0) | 17/42 | 0/17/0/0 | 0 | 7/8 | 0 | 0/0 | 0 | 0 | S2×2 S3×2 S4×1 |
| fraction_third | 8 | 8/0/0 | 0/8 | 0/8 | 0 (0/0) | 8/8 | 0/8/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 12 | 11/1/0 | 8/11 | 8/11 | 0 (0/0) | 3/11 | 0/3/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 0/4 | 0/4 | 1 (0/1) | 3/4 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 134 | 123/11/0 | 64/123 | 64/123 | 13 (9/4) | 47/123 | 2/45/0/0 | 0 | 10/11 | 0 | 0/0 | 0 | 0 | S2×1 S3×1 S4×1 |
| source_choice | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 1 (1/0) | 0/0 | 0/0/0/0 | 0 | 16/17 | 0 | 0/0 | 0 | 0 | S4×1 |
| range | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 6 | 5/0/1 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| unstated_amount | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 4/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 8 | 0/8/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 8/8 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 59 | 56/3/0 | 0/56 | 0/56 | 15 (15/0) | 41/56 | 0/41/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | S2×3 S3×3 S6×3 |
| package_size | 22 | 21/1/0 | 0/21 | 0/21 | 4 (4/0) | 17/21 | 0/17/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S2×3 S3×3 S6×3 |
| oz_vs_floz | 6 | 6/0/0 | 2/6 | 2/6 | 1 (1/0) | 3/6 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S2×1 S3×1 S6×1 |
| compound_quantity | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 0/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 30 | 26/4/0 | 0/26 | 0/26 | 0 (0/0) | 26/26 | 1/25/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | 0 |
| percentage | 3 | 2/0/1 | 0/2 | 0/2 | 0 (0/0) | 2/2 | 0/2/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| price_annotation | 5 | 5/0/0 | 3/5 | 3/5 | 0 (0/0) | 2/5 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 5 | 5/0/0 | 0/5 | 0/5 | 5 (0/5) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 29 | 26/2/1 | 1/26 | 1/26 | 5 (4/1) | 20/26 | 0/20/0/0 | 0 | 2/2 | 0 | 0/1 | 1 | 0 | S2×3 S3×3 |
| approximate | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 12 | 10/2/0 | 0/10 | 0/10 | 1 (1/0) | 9/10 | 0/9/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×1 |
| heading_non_ingredient | 24 | 0/0/24 | 0/0 | 0/0 | 1 (1/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/24 | 23 | 0 | S1×1 S8×1 |
| empty | 1 | 0/0/1 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 1/1 | 0 | 0 | 0 |
| unicode_text | 21 | 17/1/3 | 8/17 | 8/17 | 1 (1/0) | 9/17 | 0/9/0/0 | 0 | 0/1 | 0 | 1/3 | 2 | 0 | S4×1 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 21 | 19/2/0 | 3/19 | 3/19 | 11 (7/4) | 6/19 | 0/6/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S3×1 S4×1 |
| seasoning_lookalike | 17 | 15/2/0 | 7/15 | 7/15 | 0 (0/0) | 8/15 | 1/7/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 4 | 2/2/0 | 0/2 | 0/2 | 1 (1/0) | 2/2 | 1/1/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S4×1 |
| quart_pint_gallon | 8 | 6/2/0 | 0/6 | 0/6 | 3 (3/0) | 4/6 | 0/4/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S2×1 S3×2 S4×1 |
| long_line | 4 | 4/0/0 | 2/4 | 2/4 | 0 (0/0) | 2/4 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 6 | 5/1/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 1/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By source — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 369 | 292/52/25 | 113/292 | 113/292 | 42 (31/11) | 147/292 | 10/137/0/0 | 0 | 43/52 | 0 | 1/25 | 23 | 0 | S1×1 S2×6 S3×10 S4×9 S6×3 S8×1 |

##### By repair family — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 75 | 52/23/0 | 5/52 | 5/52 | 9 (7/2) | 41/52 | 0/41/0/0 | 0 | 20/23 | 0 | 0/0 | 0 | 0 | S2×3 S3×4 S4×3 |
| B | 51 | 27/24/0 | 6/27 | 6/27 | 6 (6/0) | 21/27 | 0/21/0/0 | 0 | 18/24 | 0 | 0/0 | 0 | 0 | S4×6 |
| C | 56 | 55/1/0 | 7/55 | 7/55 | 15 (12/3) | 33/55 | 6/27/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S2×3 S3×4 S6×3 |
| D | 34 | 6/3/25 | 1/6 | 1/6 | 1 (1/0) | 5/6 | 0/5/0/0 | 0 | 3/3 | 0 | 1/25 | 23 | 0 | S1×1 S8×1 |
| plain | 153 | 152/1/0 | 94/152 | 94/152 | 11 (5/6) | 47/152 | 4/43/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×2 |

##### By CONTRACT-v1 §12 item exercised — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| §12.1 | 11 | 11/0/0 | 0/11 | 0/11 | 5 (4/1) | 6/11 | 0/6/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S2×3 S3×3 |
| §12.2 | 7 | 5/0/2 | 0/5 | 0/5 | 1 (0/1) | 4/5 | 0/4/0/0 | 0 | 0/0 | 0 | 0/2 | 2 | 0 | 0 |
| §12.3 | 22 | 21/1/0 | 0/21 | 0/21 | 3 (3/0) | 18/21 | 1/17/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S2×3 S3×3 S6×3 |
| §12.4 | 32 | 32/0/0 | 8/32 | 8/32 | 8 (8/0) | 16/32 | 6/10/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.5 | 2 | 2/0/0 | 0/2 | 0/2 | 0 (0/0) | 2/2 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.6 | 14 | 9/5/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 0/9/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| §12.7 | 24 | 3/21/0 | 0/3 | 0/3 | 5 (5/0) | 3/3 | 0/3/0/0 | 0 | 16/21 | 0 | 0/0 | 0 | 0 | S4×5 |
| §12.8 | 33 | 6/3/24 | 1/6 | 1/6 | 1 (1/0) | 5/6 | 0/5/0/0 | 0 | 3/3 | 0 | 0/24 | 23 | 0 | S1×1 S8×1 |
| §12.9 | 8 | 7/1/0 | 2/7 | 2/7 | 0 (0/0) | 5/7 | 0/5/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| §12.10 | 15 | 15/0/0 | 4/15 | 4/15 | 10 (6/4) | 1/15 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 |
| §12.11 | 15 | 12/3/0 | 0/12 | 0/12 | 1 (1/0) | 12/12 | 0/12/0/0 | 0 | 2/3 | 0 | 0/0 | 0 | 0 | S4×1 |
| §12.12 | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 0/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.13 | 12 | 10/2/0 | 2/10 | 2/10 | 0 (0/0) | 8/10 | 0/8/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| §12.14 | 3 | 0/3/0 | 0/0 | 0/0 | 3 (3/0) | 0/0 | 0/0/0/0 | 0 | 0/3 | 0 | 0/0 | 0 | 0 | S3×1 S4×3 |
| no §12 item | 180 | 165/14/1 | 96/165 | 96/165 | 9 (3/6) | 60/165 | 4/56/0/0 | 0 | 14/14 | 0 | 1/1 | 0 | 0 | S3×2 |

##### By construction — holdout-v3 (fresh; acceptance set)

304 distinct construction(s); at most 2 line(s) per construction (the JSON report lists every construction).

| Construction | Cases | Classes | Severe |
|---|---|---|---|
| ABOUT INT UNIT PART W \| plain ready | ing-h3-0202 | C3b | — |
| ABOUT INT UNIT W , NOTE \| plain ready | ing-h3-0284 | C3b | — |
| ABOUT INT UNIT W CUNIT \| plain ready | ing-h3-0097 | C3b | — |
| ABOUT INT UNIT W \| plain ready | ing-h3-0134 | C3b | — |
| CUNIT OF W , NOTE \| A ready | ing-h3-0285 | C3b | — |
| DEC UNIT (AMT) W , NOTE \| A needs_review 12.6 new | ing-h3-0300 | C5b | — |
| DEC UNIT CONT CAP W \| C ready 12.3 new | ing-h3-0062 | C2 | S2 S3 S6 |
| DEC W UNIT CONT W \| C ready 12.3 new | ing-h3-0199 | C2 | S2 S3 S6 |
| DECO FRAC UNIT W \| A ready 12.13 new | ing-h3-0307 | C3b | — |
| DECO INT UNIT PART W , NOTE \| A ready 12.13 new | ing-h3-0225 | C3b | — |
| DECO INT UNIT W \| A ready 12.13 new | ing-h3-0006, ing-h3-0337 | C3b, C3b | — |
| ENUM INT UNIT CAP W \| A ready 12.13 new | ing-h3-0267 | C3b | — |
| ENUM INT UNIT PART W \| A ready 12.13 new | ing-h3-0069 | C3b | — |
| ENUM INT UNIT W \| A ready 12.13 new | ing-h3-0268 | C3b | — |
| FRAC NEGNUM SLASH INT UNIT W \| A needs_review | ing-h3-0362 | C5b | — |
| FRAC UNIT (AMT) W CUNIT \| A ready 12.6 | ing-h3-0258 | C3b | — |
| FRAC UNIT CAP W \| plain ready | ing-h3-0021, ing-h3-0071 | C3b, C1 | — |
| FRAC UNIT PART W (AMT) \| B ready 12.11 | ing-h3-0303 | C3b | — |
| FRAC UNIT PART W (OPT) \| plain ready | ing-h3-0304 | C3b | — |
| FRAC UNIT PART W , NOTE , NOTE \| plain ready | ing-h3-0117 | C3b | — |
| FRAC UNIT PLUS INT UNIT W \| A ready 12.12 | ing-h3-0278 | C3b | — |
| FRAC UNIT SLASH INT UNIT W \| A ready 12.6 | ing-h3-0061 | C3b | — |
| FRAC UNIT W (AMT) \| B ready | ing-h3-0212 | C3b | — |
| FRAC UNIT W AND W , NOTE \| B needs_review 12.7 new | ing-h3-0221 | C2 | S4 |
| FRAC UNIT W OR W , NOTE \| B needs_review 12.7 | ing-h3-0299 | C5b | — |
| FRAC UNIT W OR W , NOTE \| B needs_review 12.7 new | ing-h3-0038 | C5b | — |
| FRAC UNIT W OR W \| B needs_review 12.7 | ing-h3-0033 | C5b | — |
| FRAC UNIT W OR W \| B needs_review 12.7 new | ing-h3-0083 | C5b | — |
| FRAC UNIT W \| plain ready | ing-h3-0047, ing-h3-0335 | C3b, C1 | — |
| FRACWORD NUMWORD W , NOTE \| plain ready | ing-h3-0108 | C3b | — |
| FRACWORD OF NUMWORD UNIT PART W \| A ready 12.1 new | ing-h3-0236 | C3b | — |
| IMP OF W , FLAG \| A ready | ing-h3-0277 | C3b | — |
| IMP OF W \| A needs_review | ing-h3-0129 | C5b | — |
| IMP OF W \| A ready | ing-h3-0063, ing-h3-0087 | C3b, C3b | — |
| INT (AMT) CONT CAP \| C ready | ing-h3-0228 | C3b | — |
| INT (AMT) CONT NUMWORD W \| A ready 12.9 new | ing-h3-0369 | C3b | — |
| INT (AMT) CONT PART W \| C needs_review 12.3+12.6 new | ing-h3-0171 | C5b | — |
| INT (AMT) CONT W , NOTE \| plain ready | ing-h3-0172 | C3b | — |
| INT (AMT) UNIT CAP W \| C ready 12.5 | ing-h3-0127 | C3b | — |
| INT (AMT) W , NOTE \| C ready 12.3 new | ing-h3-0244 | C3b | — |
| INT (AMT) W \| C ready | ing-h3-0197 | C3b | — |
| INT (AMT) W \| C ready 12.3 new | ing-h3-0332 | C3b | — |
| INT (AMT) W \| C ready 12.3+12.4 new | ing-h3-0342 | C3b | — |
| INT , AMT-REMARK \| A needs_review | ing-h3-0010, ing-h3-0142 | C5b, C5b | — |
| INT CAP W (PRICE) , NOTE \| plain ready | ing-h3-0166 | C3b | — |
| INT CAP W , AMT-REMARK \| B ready 12.11 | ing-h3-0229 | C3b | — |
| INT CAP W OR W \| B needs_review 12.7 | ing-h3-0215 | C5b | — |
| INT CONT (AMT) W , NOTE \| plain ready | ing-h3-0218 | C3b | — |
| INT CONT CAP PART W OF W \| plain ready | ing-h3-0130 | C3b | — |
| INT CONT CAP W (AMT) \| C ready 12.3 new | ing-h3-0356 | C3b | — |
| INT CONT CAP W \| plain ready | ing-h3-0032, ing-h3-0188 | C3b, C2 | — |
| INT CONT PART NUMWORD W CAP W \| A ready 12.9 new | ing-h3-0222 | C3b | — |
| INT CONT W (AMT) , NOTE \| C ready 12.3 new | ing-h3-0184, ing-h3-0214 | C3b, C3b | — |
| INT CONT W (AMT) \| C ready 12.3 new | ing-h3-0123, ing-h3-0128 | C3b, C3b | — |
| INT CONT W , NOTE \| C ready 12.4 | ing-h3-0001 | C3b | — |
| INT CONT W CUNIT (AMT) \| C ready 12.3 new | ing-h3-0046 | C3b | — |
| INT CUNIT , NOTE \| C ready 12.4 new | ing-h3-0181 | C3a | — |
| INT CUNIT CAP W (AMT) \| B ready 12.11 | ing-h3-0076 | C3b | — |
| INT CUNIT CAP W \| plain ready | ing-h3-0198 | C3b | — |
| INT CUNIT CUNIT W \| C ready 12.4 | ing-h3-0310 | C3b | — |
| INT CUNIT NUMWORD W \| A ready 12.9 new | ing-h3-0012 | C3b | — |
| INT CUNIT W (AMT) \| C ready 12.4+12.3 new | ing-h3-0145 | C3b | — |
| INT CUNIT W (P) \| C ready 12.4 | ing-h3-0350 | C3b | — |
| INT CUNIT W (PRICE) \| B ready | ing-h3-0092 | C3b | — |
| INT CUNIT W , AMT-REMARK \| C ready 12.4+12.3 new | ing-h3-0297 | C3a | — |
| INT CUNIT W , NOTE \| C ready 12.4 | ing-h3-0022, ing-h3-0263 | C3b, C3b | — |
| INT CUNIT W , NOTE \| C ready 12.4 new | ing-h3-0363 | C3a | — |
| INT CUNIT W , NOTE \| plain ready | ing-h3-0030, ing-h3-0089 | C3b, C3b | — |
| INT CUNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0120 | C5b | — |
| INT CUNIT W \| C ready 12.4 new | ing-h3-0043 | C3a | — |
| INT CUNIT W \| plain ready | ing-h3-0312 | C3b | — |
| INT FRAC UNIT PART W OR W , NOTE \| B needs_review 12.7 new | ing-h3-0340 | C5b | — |
| INT FRAC UNIT PLUS INT UNIT W , NOTE \| A ready 12.12 | ing-h3-0318 | C3b | — |
| INT FRAC UNIT W (AMT) \| B ready 12.11 | ing-h3-0146 | C3b | — |
| INT FRAC UNIT W , NOTE , PLUS-REMARK \| plain ready | ing-h3-0147 | C3b | — |
| INT FRACWORD CONT W \| A ready 12.1 new | ing-h3-0051 | C2 | — |
| INT FRACWORD OF W \| A ready 12.1 new | ing-h3-0016 | C2 | S2 S3 |
| INT FRACWORD UNIT PART CAP \| A ready 12.1 new | ing-h3-0354 | C2 | S2 S3 |
| INT FRACWORD W \| A ready 12.1 new | ing-h3-0074, ing-h3-0253 | C2, C2 | S2 S3 |
| INT IMP W , NOTE \| plain ready | ing-h3-0180 | C3b | — |
| INT IMP W \| C ready 12.4 new | ing-h3-0124 | C3a | — |
| INT IMP W \| D ready 12.8 | ing-h3-0249 | C3b | — |
| INT INT UNIT CONT PART W \| A ready 12.13 | ing-h3-0125 | C3b | — |
| INT INT UNIT W \| A needs_review 12.13 new | ing-h3-0007 | C5b | — |
| INT OR INT W , NOTE \| A needs_review | ing-h3-0176 | C5b | — |
| INT PART UNIT CAP W \| plain ready | ing-h3-0059 | C2 | S3 |
| INT SIZE CAP W \| C ready 12.10 | ing-h3-0110 | C2 | — |
| INT SIZE CUNIT W , NOTE \| C ready 12.4+12.10 | ing-h3-0292 | C2 | — |
| INT SIZE CUNIT W , NOTE \| plain ready 12.10 | ing-h3-0200, ing-h3-0317 | C2, C2 | — |
| INT SIZE IMP W \| C ready 12.10 | ing-h3-0287 | C2 | S3 |
| INT SIZE W (AMT) \| C ready 12.10+12.3 new | ing-h3-0011 | C3b | — |
| INT SIZE W , NOTE \| C ready 12.10 | ing-h3-0137, ing-h3-0173 | C1, C2 | — |
| INT SIZE W CUNIT , NOTE \| C ready 12.4+12.10 new | ing-h3-0091 | C2 | — |
| INT SIZE W CUNIT \| C ready 12.4+12.10 | ing-h3-0241 | C2 | — |
| INT SIZE W \| A needs_review 12.14 new | ing-h3-0075 | C2 | S4 |
| INT SIZE W \| C ready 12.10 | ing-h3-0133 | C2 | — |
| INT TO INT FRAC UNIT W \| A needs_review | ing-h3-0366 | C5b | — |
| INT TO INT SIZE W \| A needs_review | ing-h3-0131 | C5b | — |
| INT TO INTVULG UNIT W , NOTE \| A needs_review | ing-h3-0067 | C5b | — |
| INT UNIT (AMT) W , NOTE \| A needs_review 12.6 new | ing-h3-0004 | C5b | — |
| INT UNIT (AMT) W \| A needs_review 12.6 new | ing-h3-0138, ing-h3-0319 | C5b, C5b | — |
| INT UNIT (AMT) W \| A ready 12.6 | ing-h3-0177, ing-h3-0205 | C3b, C3b | — |
| INT UNIT (AMT) W \| C ready 12.5 | ing-h3-0290 | C3b | — |
| INT UNIT CAP W (OR) \| B needs_review 12.7 | ing-h3-0283 | C5b | — |
| INT UNIT CAP W (P) \| B needs_review 12.11 new | ing-h3-0341 | C2 | S4 |
| INT UNIT CONT W \| C ready 12.3 new | ing-h3-0246 | C2 | S2 S3 S6 |
| INT UNIT FORM PART W \| plain ready | ing-h3-0280 | C2 | — |
| INT UNIT FORM W (P) \| plain ready | ing-h3-0274 | C2 | — |
| INT UNIT FORM W , NOTE \| plain ready | ing-h3-0031, ing-h3-0355 | C2, C2 | — |
| INT UNIT FORM W \| plain ready | ing-h3-0119 | C2 | — |
| INT UNIT INT W \| A ready 12.9 new | ing-h3-0015 | C3b | — |
| INT UNIT MINUS INT UNIT W \| A ready 12.12 | ing-h3-0017 | C3b | — |
| INT UNIT NUMW W \| A ready 12.9 | ing-h3-0361 | C3b | — |
| INT UNIT PART W (AMT) , PLUS-REMARK \| B ready 12.11 new | ing-h3-0261 | C3b | — |
| INT UNIT PART W (AMT) \| B ready 12.11 | ing-h3-0014, ing-h3-0111 | C3b, C3b | — |
| INT UNIT PART W (AMT) \| B ready 12.11 new | ing-h3-0058 | C3b | — |
| INT UNIT PART W CUNIT (AMT) \| B ready 12.11+12.4 new | ing-h3-0077 | C3b | — |
| INT UNIT PCT W \| plain ready | ing-h3-0220 | C3b | — |
| INT UNIT PLUS INT UNIT (AMT) W \| A ready 12.12+12.6 | ing-h3-0080 | C3b | — |
| INT UNIT PLUS INT UNIT W \| A ready 12.12 | ing-h3-0106 | C3b | — |
| INT UNIT SLASH INT UNIT W \| A ready 12.6 | ing-h3-0175 | C3b | — |
| INT UNIT W (AMT) \| A ready 12.6 | ing-h3-0073, ing-h3-0273 | C3b, C3b | — |
| INT UNIT W (AMT) \| B needs_review 12.11 | ing-h3-0326 | C5b | — |
| INT UNIT W (AMT) \| B needs_review 12.7 | ing-h3-0328 | C5b | — |
| INT UNIT W (AMT) \| B ready 12.11 | ing-h3-0217 | C3b | — |
| INT UNIT W (NEST) \| plain ready | ing-h3-0042 | C2 | — |
| INT UNIT W (OPT) , NOTE \| B ready | ing-h3-0029 | C3b | — |
| INT UNIT W (OPT) \| plain ready | ing-h3-0252 | C3b | — |
| INT UNIT W (OR) \| B ready | ing-h3-0247 | C3b | — |
| INT UNIT W (OR) \| B ready 12.7 | ing-h3-0321 | C3b | — |
| INT UNIT W , AMT-REMARK \| B needs_review 12.11 | ing-h3-0113 | C5b | — |
| INT UNIT W , AMT-REMARK \| plain ready | ing-h3-0141, ing-h3-0232 | C3b, C3b | — |
| INT UNIT W , NOTE , OR-REMARK \| B needs_review 12.7 new | ing-h3-0150 | C5b | — |
| INT UNIT W , NOTE , PLUS-REMARK \| B ready | ing-h3-0085, ing-h3-0339 | C3b, C1 | — |
| INT UNIT W , NOTE \| B needs_review 12.7 new | ing-h3-0156 | C2 | S4 |
| INT UNIT W , NOTE \| B ready | ing-h3-0169 | C3b | — |
| INT UNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0086 | C5b | — |
| INT UNIT W , OR-REMARK \| plain ready 12.7 | ing-h3-0305 | C3b | — |
| INT UNIT W , PLUS-REMARK \| B ready 12.11+12.12 new | ing-h3-0045 | C3b | — |
| INT UNIT W AND W , NOTE \| B ready 12.7 | ing-h3-0167 | C3b | — |
| INT UNIT W AND W \| B needs_review 12.7 new | ing-h3-0140, ing-h3-0311 | C2, C2 | S4 |
| INT UNIT W CAP W (AMT) \| B ready | ing-h3-0298 | C3b | — |
| INT UNIT W OR INT UNIT PART W \| B needs_review 12.7 new | ing-h3-0251 | C5b | — |
| INT UNIT W OR INT UNIT W \| B needs_review 12.7 new | ing-h3-0219 | C5b | — |
| INT UNIT W OR W \| B needs_review 12.7 | ing-h3-0242, ing-h3-0334 | C5b, C5b | — |
| INT UNIT W PLUS INT UNIT W \| B ready 12.11+12.12 new | ing-h3-0149 | C3b | — |
| INT UNIT W SLASH W \| B needs_review 12.7 new | ing-h3-0041 | C2 | S4 |
| INT VULG UNIT W \| plain ready | ing-h3-0100, ing-h3-0203 | C3b, C1 | — |
| INT W (AMT) , NOTE \| C ready 12.3 new | ing-h3-0333 | C3b | — |
| INT W , AMT-REMARK \| plain ready | ing-h3-0070 | C3b | — |
| INT W CAP CUNIT \| C ready 12.4 | ing-h3-0286 | C2 | — |
| INT W CUNIT (P) , NOTE \| C ready 12.4 | ing-h3-0282 | C2 | — |
| INT W CUNIT , FLAG \| C ready 12.4 | ing-h3-0353 | C3b | — |
| INT W CUNIT , NOTE \| C ready 12.4 | ing-h3-0109, ing-h3-0330 | C2, C2 | — |
| INT W CUNIT \| C ready 12.4 | ing-h3-0195 | C2 | — |
| INT W OR INT UNIT W \| B needs_review 12.7 new | ing-h3-0099 | C5b | — |
| INT W PART W \| A needs_review 12.14 new | ing-h3-0193 | C2 | S4 |
| INT W UNIT CAP W \| plain ready | ing-h3-0126 | C2 | S3 |
| INT W UNIT W \| A needs_review 12.14 new | ing-h3-0064 | C2 | S3 S4 |
| INT W \| D unsupported 12.8 new | ing-h3-0271 | C2 | S1 S8 |
| INT X INTUNIT CONT W , NOTE \| A ready 12.2 | ing-h3-0159 | C3b | — |
| INT X NUMW W , NOTE \| D unsupported 12.2+12.8 new | ing-h3-0002 | C8 | — |
| INT X SIZE W , NOTE \| A ready 12.2+12.10 new | ing-h3-0035 | C2 | — |
| INTUNIT (AMT) W \| A ready 12.6 | ing-h3-0066 | C3b | — |
| INTVULG UNIT W \| plain ready | ing-h3-0098, ing-h3-0107 | C3b, C3b | — |
| NEGNUM UNIT W PART W \| A needs_review 12.13 new | ing-h3-0259 | C5b | — |
| NUMWORD CUNIT W \| A needs_review | ing-h3-0026 | C5b | — |
| NUMWORD FRACWORD OF W \| A ready 12.1 new | ing-h3-0237 | C3b | — |
| NUMWORD FRACWORD UNIT PART W \| A ready 12.1 new | ing-h3-0306 | C3b | — |
| NUMWORD FRACWORD UNIT W \| A ready 12.1 new | ing-h3-0057, ing-h3-0151 | C3b, C3b | — |
| NUMWORD FRACWORD W \| A ready 12.1 new | ing-h3-0272 | C3b | — |
| NUMWORD IMP OF CAP \| A needs_review | ing-h3-0327 | C5b | — |
| NUMWORD IMP OF W \| plain ready | ing-h3-0322 | C3b | — |
| NUMWORD NUMW IMP OF W \| plain ready | ing-h3-0281 | C3b | — |
| NUMWORD NUMW W , NOTE \| D unsupported 12.8 new | ing-h3-0048 | C8 | — |
| NUMWORD OR NUMWORD W \| A needs_review | ing-h3-0364 | C5b | — |
| NUMWORD SIZE IMP OF CAP W \| plain ready | ing-h3-0082 | C3b | — |
| NUMWORD SIZEUNIT CONT OF CAP \| C ready 12.3 new | ing-h3-0049 | C3b | — |
| NUMWORD SIZEUNIT CUNIT W \| C ready 12.3 new | ing-h3-0269 | C3b | — |
| NUMWORD SIZEUNIT W \| C ready 12.3 new | ing-h3-0121, ing-h3-0329 | C3b, C3b | — |
| NUMWORD UNIT W \| plain ready | ing-h3-0055 | C3b | — |
| NUMWORD W , NOTE \| plain ready | ing-h3-0231, ing-h3-0235 | C3b, C3b | — |
| RANGE UNIT W \| A needs_review | ing-h3-0352 | C5b | — |
| SIZE CUNIT OF W \| A ready | ing-h3-0102 | C3b | — |
| SIZEUNIT CONT W PART W \| C ready 12.3 new | ing-h3-0072 | C3b | — |
| UNIT OF W , NOTE \| A needs_review | ing-h3-0345 | C5b | — |
| VULG UNIT CAP W \| plain ready | ing-h3-0250 | C3b | — |
| VULG UNIT PART W (P) , NOTE \| plain ready | ing-h3-0154 | C3b | — |
| VULG UNIT W \| plain ready | ing-h3-0165, ing-h3-0338 | C1, C3b | — |
| W (AMT) \| D needs_review 12.8 new | ing-h3-0003 | C5b | — |
| W (AMT) \| D unsupported 12.8 new | ing-h3-0088 | C8 | — |
| W (OPT) COLON W \| D ready 12.8 new | ing-h3-0248 | C3b | — |
| W (OPT) \| D unsupported 12.8 new | ing-h3-0211 | C8 | — |
| W (P) , AMT-REMARK \| plain ready | ing-h3-0112 | C3a | — |
| W (P) \| plain ready | ing-h3-0367 | C3a | — |
| W , AMT-REMARK \| D unsupported 12.8 new | ing-h3-0270 | C8 | — |
| W , FLAG \| plain ready | ing-h3-0226, ing-h3-0368 | C3a, C3a | — |
| W CAP COLON \| D unsupported 12.8 | ing-h3-0005, ing-h3-0260 | C8, C8 | — |
| W CAP \| D unsupported 12.8 | ing-h3-0174, ing-h3-0294 | C8, C8 | — |
| W COLON CAP \| D unsupported 12.8 new | ing-h3-0262, ing-h3-0325 | C8, C8 | — |
| W COLON INT (P) \| plain ready | ing-h3-0186 | C3b | — |
| W COLON INT UNIT PART W \| plain ready | ing-h3-0168 | C3b | — |
| W COLON INT UNIT \| plain ready | ing-h3-0210 | C3b | — |
| W COLON NUMWORD NUMW W \| D unsupported 12.8 new | ing-h3-0204 | C8 | — |
| W COLON SLASH SLASH W SLASH W SLASH W \| D unsupported 12.8 | ing-h3-0357 | C8 | — |
| W COLON W PART W \| D ready 12.8 new | ing-h3-0301 | C3b | — |
| W COLON W \| D ready 12.8 new | ing-h3-0065, ing-h3-0104 | C3b, C3b | — |
| W COLON W \| D unsupported 12.8 new | ing-h3-0009, ing-h3-0314 | C8, C8 | — |
| W CONT \| D unsupported 12.8 new | ing-h3-0093 | C8 | — |
| W CUNIT (AMT) , NOTE \| A ready 12.2+12.4 new | ing-h3-0024 | C3b | — |
| W CUNIT , FLAG \| C ready 12.4 | ing-h3-0164 | C3a | — |
| W DEC W OF INT W INT W \| D unsupported 12.8 new | ing-h3-0196 | C8 | — |
| W INT COLON CAP W PART W \| D unsupported 12.8 | ing-h3-0296 | C8 | — |
| W INT FRAC UNIT \| plain ready | ing-h3-0293 | C3b | — |
| W NUMW (AMT) \| D unsupported 12.8 new | ing-h3-0018 | C8 | — |
| W X X \| D unsupported 12.2+12.8 new | ing-h3-0276 | C8 | — |
| W \| D unsupported 12.8 | ing-h3-0155 | C8 | — |
| W \| D unsupported 12.8 new | ing-h3-0114, ing-h3-0189 | C8, C8 | — |
| W \| plain ready | ing-h3-0288 | C3b | — |
| X IMP W \| A ready 12.2 new | ing-h3-0118 | C3b | — |
| X W \| A ready 12.2 new | ing-h3-0054 | C3b | — |

##### Acceptance — Gate G2 on holdout-v3 (fresh; acceptance set), engine `legacy-table-import-2`

Basis: Gate G2 acceptance set (EVALUATION-PLAN-v3) — acceptance evidence only when FREEZE-v3.json exists and verifies holdout-v3 (see the freeze line).

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 113/292 (38.7%, 33.3%–44.4%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 123/292 (42.1%, 36.6%–47.9%); quantity 170/292 (58.2%, 52.5%–63.7%); unit 133/292 (45.6%, 39.9%–51.3%) | as A1, for each field (accepted name matches) | **not met** |
| A3 | high-severity false certainty = 0 | C2High 31/369 (8.4%, 6.0%–11.7%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 1/369 (0.3%, 0.1%–1.5%); S3 10/369 (2.7%, 1.5%–4.9%); S4 9/369 (2.4%, 1.3%–4.6%); S5 0/369 (0.0%, ≤ 1.0%); S6 3/369 (0.8%, 0.3%–2.4%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 147/292 (50.3%, 44.6%–56.0%) | point estimate | **not met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/369 (0.0%, ≤ 1.0%); engineError 0/369 (0.0%, ≤ 1.0%); invalidOutput 0/369 (0.0%, ≤ 1.0%); nondeterministic 0/369 (0.0%, ≤ 1.0%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v3 (fresh; acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases marked debatable: true in holdout-v3.jsonl (EVALUATION-PLAN-v3 §7 (a)): 4 excluded (ing-h3-0104, ing-h3-0211, ing-h3-0297, ing-h3-0311), 365 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 113/290 (39.0%, 33.5%–44.7%) | not met |
| A2 | name 122/290 (42.1%, 36.5%–47.8%); quantity 168/290 (57.9%, 52.2%–63.5%); unit 132/290 (45.5%, 39.9%–51.3%) | not met |
| A3 | C2High 30/365 (8.2%, 5.8%–11.5%) | not met |
| A4 | S1 1/365 (0.3%, 0.1%–1.5%); S3 10/365 (2.7%, 1.5%–5.0%); S4 8/365 (2.2%, 1.1%–4.3%); S5 0/365 (0.0%, ≤ 1.0%); S6 3/365 (0.8%, 0.3%–2.4%) | not met |
| A5 | C3plusC4 145/290 (50.0%, 44.3%–55.7%) | not met |

A1–A5 (c) without the cases marked reliesOnNewReading: true in holdout-v3.jsonl — the result under CONTRACT-v1 §7 alone (EVALUATION-PLAN-v3 §7 (c)): 126 excluded (ing-h3-0001, ing-h3-0002, ing-h3-0003, ing-h3-0004, ing-h3-0006, ing-h3-0007, ing-h3-0009, ing-h3-0011, ing-h3-0012, ing-h3-0014, ing-h3-0015, ing-h3-0016, ing-h3-0018, ing-h3-0022, ing-h3-0024, ing-h3-0035, ing-h3-0038, ing-h3-0039, ing-h3-0041, ing-h3-0043, ing-h3-0045, ing-h3-0046, ing-h3-0048, ing-h3-0049, ing-h3-0051, ing-h3-0053, ing-h3-0054, ing-h3-0057, ing-h3-0058, ing-h3-0062, ing-h3-0064, ing-h3-0065, ing-h3-0069, ing-h3-0072, ing-h3-0074, ing-h3-0075, ing-h3-0077, ing-h3-0083, ing-h3-0086, ing-h3-0088, ing-h3-0091, ing-h3-0093, ing-h3-0099, ing-h3-0104, ing-h3-0111, ing-h3-0114, ing-h3-0118, ing-h3-0120, ing-h3-0121, ing-h3-0123, ing-h3-0124, ing-h3-0125, ing-h3-0128, ing-h3-0138, ing-h3-0140, ing-h3-0145, ing-h3-0146, ing-h3-0149, ing-h3-0150, ing-h3-0151, ing-h3-0156, ing-h3-0167, ing-h3-0171, ing-h3-0177, ing-h3-0181, ing-h3-0184, ing-h3-0189, ing-h3-0193, ing-h3-0196, ing-h3-0199, ing-h3-0204, ing-h3-0207, ing-h3-0209, ing-h3-0211, ing-h3-0214, ing-h3-0215, ing-h3-0219, ing-h3-0221, ing-h3-0222, ing-h3-0225, ing-h3-0229, ing-h3-0236, ing-h3-0237, ing-h3-0244, ing-h3-0246, ing-h3-0248, ing-h3-0251, ing-h3-0253, ing-h3-0254, ing-h3-0256, ing-h3-0258, ing-h3-0259, ing-h3-0261, ing-h3-0262, ing-h3-0264, ing-h3-0267, ing-h3-0268, ing-h3-0269, ing-h3-0270, ing-h3-0271, ing-h3-0272, ing-h3-0276, ing-h3-0279, ing-h3-0297, ing-h3-0300, ing-h3-0301, ing-h3-0303, ing-h3-0306, ing-h3-0307, ing-h3-0311, ing-h3-0313, ing-h3-0314, ing-h3-0319, ing-h3-0325, ing-h3-0329, ing-h3-0332, ing-h3-0333, ing-h3-0337, ing-h3-0340, ing-h3-0341, ing-h3-0342, ing-h3-0350, ing-h3-0354, ing-h3-0356, ing-h3-0363, ing-h3-0369), 243 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 105/211 (49.8%, 43.1%–56.5%) | not met |
| A2 | name 110/211 (52.1%, 45.4%–58.8%); quantity 143/211 (67.8%, 61.2%–73.7%); unit 119/211 (56.4%, 49.6%–62.9%) | not met |
| A3 | C2High 13/243 (5.3%, 3.1%–8.9%) | not met |
| A4 | S1 0/243 (0.0%, ≤ 1.6%); S3 3/243 (1.2%, 0.4%–3.6%); S4 0/243 (0.0%, ≤ 1.6%); S5 0/243 (0.0%, ≤ 1.6%); S6 0/243 (0.0%, ≤ 1.6%) | not met |
| A5 | C3plusC4 84/211 (39.8%, 33.4%–46.5%) | not met |

A1–A5 (d) without the cases listed in fixtures/EXPOSURE-AUDIT-v3.json (EVALUATION-PLAN-v3 §7 (d), §9.4) (audit of 2026-10-10, 3 matched id(s); method: Exact match after NFKC, lower case, whitespace collapse and trim, of every holdout-v3 input against 57972 exposed strings: the audit list of build_exposed_inputs.py (23321: exposed fixture sets, regression corpus, semantic-v2 test data and literals, Phase 2/2B review probes, implementation scratch probes) plus documentation/evidence markdown spans, lines and cells and every reviewer-R1 text file; run after the holdout-v3 freeze and before scoring (EVALUATION-PLAN-v3 §9.4; docs/table/evidence/2026-10-10-recipe-extraction-phase2b/holdout-v3/build_exposure_audit_v3.py)): 3 excluded (ing-h3-0114, ing-h3-0189, ing-h3-0276), 366 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 113/292 (38.7%, 33.3%–44.4%) | not met |
| A2 | name 123/292 (42.1%, 36.6%–47.9%); quantity 170/292 (58.2%, 52.5%–63.7%); unit 133/292 (45.6%, 39.9%–51.3%) | not met |
| A3 | C2High 31/366 (8.5%, 6.0%–11.8%) | not met |
| A4 | S1 1/366 (0.3%, 0.1%–1.5%); S3 10/366 (2.7%, 1.5%–5.0%); S4 9/366 (2.5%, 1.3%–4.6%); S5 0/366 (0.0%, ≤ 1.0%); S6 3/366 (0.8%, 0.3%–2.4%) | not met |
| A5 | C3plusC4 147/292 (50.3%, 44.6%–56.0%) | not met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 4 excluded (ing-h3-0020, ing-h3-0044, ing-h3-0191, ing-h3-0254), 48 needs_review lines kept — C5 39/48 (81.3%, 68.1%–89.8%) · C5a 0/48 · C5b 39/48 · C5c 0/48 · C5x 0/48 · C6 0/48 (0.0%, ≤ 7.4%) · S4 9/48 (18.8%, 10.2%–31.9%).

### Outcomes — engine `legacy-table-import-2+suggestion`

| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|
| holdout-v3 (fresh; acceptance set) | 369 | 292/52/25 | 113/292 (38.7%, 33.3%–44.4%) | 113/292 (38.7%, 33.3%–44.4%) | 31/11 | 147/292 (50.3%, 44.6%–56.0%) | 43/52 | 1/25 | 0 | S1×1 S2×6 S3×20 S4×9 S5×11 S6×10 S8×1 |

#### holdout-v3 (fresh; acceptance set) — 369 lines (R 292, A 52, U 25)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 113/292 | 38.7% | 33.3%–44.4% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 113/292 | 38.7% | 33.3%–44.4% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| **C2 incorrect ready** (of N) | 42/369 | 11.4% | 8.5%–15.0% |  |
| C2 — high false certainty (of N) | 31/369 | 8.4% | 6.0%–11.7% | ing-h3-0016, ing-h3-0041, ing-h3-0051, ing-h3-0059, ing-h3-0062, ing-h3-0064, ing-h3-0075, ing-h3-0091, ing-h3-0109, ing-h3-0126, ing-h3-0140, ing-h3-0156, ing-h3-0188, ing-h3-0193, ing-h3-0195, ing-h3-0199, ing-h3-0200, ing-h3-0221, ing-h3-0241, ing-h3-0246, ing-h3-0253, ing-h3-0271, ing-h3-0282, ing-h3-0286, ing-h3-0287, ing-h3-0292, ing-h3-0311, ing-h3-0317, ing-h3-0330, ing-h3-0341, ing-h3-0354 |
| C2 — medium false certainty (of N) | 11/369 | 3.0% | 1.7%–5.3% | ing-h3-0031, ing-h3-0035, ing-h3-0042, ing-h3-0074, ing-h3-0110, ing-h3-0119, ing-h3-0133, ing-h3-0173, ing-h3-0274, ing-h3-0280, ing-h3-0355 |
| C2 on ready labels (of R) | 32/292 | 11.0% | 7.9%–15.1% |  |
| C2 on needs_review labels (of A) | 9/52 | 17.3% | 9.4%–29.7% |  |
| C2 on unsupported labels (of U) | 1/25 | 4.0% | 0.7%–19.5% |  |
| C3 unnecessary review (of R) | 147/292 | 50.3% | 44.6%–56.0% |  |
| C3a useful partial (of R) | 33/292 | 11.3% | 8.2%–15.4% | ing-h3-0014, ing-h3-0029, ing-h3-0058, ing-h3-0066, ing-h3-0073, ing-h3-0077, ing-h3-0085, ing-h3-0111, ing-h3-0112, ing-h3-0124, ing-h3-0146, ing-h3-0147, ing-h3-0154, ing-h3-0164, ing-h3-0166, ing-h3-0169, ing-h3-0177, ing-h3-0181, ing-h3-0197, ing-h3-0205, ing-h3-0217, ing-h3-0226, ing-h3-0252, ing-h3-0258, ing-h3-0261 … (+8 in the JSON report) |
| C3b wrong partial — review-only wrong pre-fill (of R) | 114/292 | 39.0% | 33.6%–44.7% | ing-h3-0001, ing-h3-0006, ing-h3-0011, ing-h3-0012, ing-h3-0015, ing-h3-0017, ing-h3-0021, ing-h3-0022, ing-h3-0024, ing-h3-0030, ing-h3-0032, ing-h3-0043, ing-h3-0045, ing-h3-0046, ing-h3-0047, ing-h3-0049, ing-h3-0054, ing-h3-0055, ing-h3-0057, ing-h3-0061, ing-h3-0063, ing-h3-0065, ing-h3-0069, ing-h3-0070, ing-h3-0072 … (+89 in the JSON report) |
| C3c abstention (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C4 unnecessary rejection (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3 + C4 (of R) | 147/292 | 50.3% | 44.6%–56.0% |  |
| C5 correct review (of A) | 43/52 | 82.7% | 70.3%–90.6% |  |
| C5a useful partial (of A) | 8/52 | 15.4% | 8.0%–27.5% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 35/52 | 67.3% | 53.8%–78.5% | ing-h3-0003, ing-h3-0007, ing-h3-0010, ing-h3-0026, ing-h3-0033, ing-h3-0038, ing-h3-0067, ing-h3-0083, ing-h3-0086, ing-h3-0099, ing-h3-0113, ing-h3-0120, ing-h3-0129, ing-h3-0131, ing-h3-0142, ing-h3-0150, ing-h3-0171, ing-h3-0176, ing-h3-0215, ing-h3-0219, ing-h3-0242, ing-h3-0251, ing-h3-0259, ing-h3-0283, ing-h3-0299 … (+10 in the JSON report) |
| C5c abstention (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C6 review rejected (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C7 correct rejection (of U) | 1/25 | 4.0% | 0.7%–19.5% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 23/25 | 92.0% | 75.0%–97.8% | ing-h3-0002, ing-h3-0005, ing-h3-0009, ing-h3-0018, ing-h3-0048, ing-h3-0088, ing-h3-0093, ing-h3-0114, ing-h3-0155, ing-h3-0174, ing-h3-0189, ing-h3-0196, ing-h3-0204, ing-h3-0211, ing-h3-0260, ing-h3-0262, ing-h3-0270, ing-h3-0276, ing-h3-0294, ing-h3-0296, ing-h3-0314, ing-h3-0325, ing-h3-0357 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: engine error (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: output fails the contract validator (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S1 fabricated amount** (of N) | 1/369 | 0.3% | 0.1%–1.5% | ing-h3-0271 |
| **S2 wrong amount on a ready reading** (of N) | 6/369 | 1.6% | 0.8%–3.5% | ing-h3-0016, ing-h3-0062, ing-h3-0199, ing-h3-0246, ing-h3-0253, ing-h3-0354 |
| **S3 cross-dimension** (of N) | 20/369 | 5.4% | 3.5%–8.2% | ing-h3-0016, ing-h3-0059, ing-h3-0062, ing-h3-0064, ing-h3-0125, ing-h3-0126, ing-h3-0127, ing-h3-0172, ing-h3-0199, ing-h3-0218, ing-h3-0228, ing-h3-0244, ing-h3-0246, ing-h3-0253, ing-h3-0287, ing-h3-0290, ing-h3-0332, ing-h3-0342, ing-h3-0354, ing-h3-0369 |
| **S4 suppressed ambiguity** (of N) | 9/369 | 2.4% | 1.3%–4.6% | ing-h3-0041, ing-h3-0064, ing-h3-0075, ing-h3-0140, ing-h3-0156, ing-h3-0193, ing-h3-0221, ing-h3-0311, ing-h3-0341 |
| **S5 silent alternative choice** (of N) | 11/369 | 3.0% | 1.7%–5.3% | ing-h3-0038, ing-h3-0083, ing-h3-0086, ing-h3-0099, ing-h3-0150, ing-h3-0215, ing-h3-0219, ing-h3-0251, ing-h3-0283, ing-h3-0328, ing-h3-0340 |
| **S6 package representation changed** (of N) | 10/369 | 2.7% | 1.5%–4.9% | ing-h3-0062, ing-h3-0125, ing-h3-0127, ing-h3-0172, ing-h3-0199, ing-h3-0218, ing-h3-0228, ing-h3-0246, ing-h3-0290, ing-h3-0369 |
| **S7 dropped material qualifier** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S8 ready on a non-ingredient** (of N) | 1/369 | 0.3% | 0.1%–1.5% | ing-h3-0271 |
| Any severe error (of N) | 40/369 | 10.8% | 8.1%–14.4% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/369 | 0.0% | ≤ 1.0% |  |

Strict matching: C1 113/292 (38.7%, 33.3%–44.4%) · C1+ 113/292 (38.7%, 33.3%–44.4%) · C2 42/369 (11.4%, 8.5%–15.0%). Lines whose class differs under strict matching: none.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 165/292 (56.5%, 50.8%–62.1%) | 165/292 (56.5%, 50.8%–62.1%) |
| quantity | 204/292 (69.9%, 64.4%–74.8%) | 204/292 (69.9%, 64.4%–74.8%) |
| unit | 169/292 (57.9%, 52.1%–63.4%) | 169/292 (57.9%, 52.1%–63.4%) |

##### By category — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 194/30/1 | 82/194 | 82/194 | 36 (25/11) | 85/194 | 18/67/0/0 | 0 | 22/30 | 0 | 0/1 | 0 | 0 | S1×1 S2×2 S3×12 S4×8 S5×8 S6×3 S8×1 |
| fraction | 50 | 42/8/0 | 23/42 | 23/42 | 3 (3/0) | 17/42 | 6/11/0/0 | 0 | 7/8 | 0 | 0/0 | 0 | 0 | S2×2 S3×2 S4×1 S5×3 |
| fraction_third | 8 | 8/0/0 | 0/8 | 0/8 | 0 (0/0) | 8/8 | 0/8/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 12 | 11/1/0 | 8/11 | 8/11 | 0 (0/0) | 3/11 | 0/3/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 0/4 | 0/4 | 1 (0/1) | 3/4 | 0/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 134 | 123/11/0 | 64/123 | 64/123 | 13 (9/4) | 47/123 | 15/32/0/0 | 0 | 10/11 | 0 | 0/0 | 0 | 0 | S2×1 S3×4 S4×1 S5×2 S6×2 |
| source_choice | 3 | 3/0/0 | 0/3 | 0/3 | 0 (0/0) | 3/3 | 2/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 1 (1/0) | 0/0 | 0/0/0/0 | 0 | 16/17 | 0 | 0/0 | 0 | 0 | S4×1 S5×11 |
| range | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 6 | 5/0/1 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 3/2/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| unstated_amount | 9 | 9/0/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 4/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 8 | 0/8/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 8/8 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 59 | 56/3/0 | 0/56 | 0/56 | 15 (15/0) | 41/56 | 5/36/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | S2×3 S3×10 S6×10 |
| package_size | 22 | 21/1/0 | 0/21 | 0/21 | 4 (4/0) | 17/21 | 0/17/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S2×3 S3×10 S6×10 |
| oz_vs_floz | 6 | 6/0/0 | 2/6 | 2/6 | 1 (1/0) | 3/6 | 1/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S2×1 S3×1 S6×1 |
| compound_quantity | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 0/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 30 | 26/4/0 | 0/26 | 0/26 | 0 (0/0) | 26/26 | 16/10/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | S3×1 |
| percentage | 3 | 2/0/1 | 0/2 | 0/2 | 0 (0/0) | 2/2 | 0/2/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| price_annotation | 5 | 5/0/0 | 3/5 | 3/5 | 0 (0/0) | 2/5 | 1/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 5 | 5/0/0 | 0/5 | 0/5 | 5 (0/5) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 29 | 26/2/1 | 1/26 | 1/26 | 5 (4/1) | 20/26 | 0/20/0/0 | 0 | 2/2 | 0 | 0/1 | 1 | 0 | S2×3 S3×4 S6×1 |
| approximate | 5 | 5/0/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 0/5/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 12 | 10/2/0 | 0/10 | 0/10 | 1 (1/0) | 9/10 | 0/9/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×1 |
| heading_non_ingredient | 24 | 0/0/24 | 0/0 | 0/0 | 1 (1/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 0/24 | 23 | 0 | S1×1 S8×1 |
| empty | 1 | 0/0/1 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 1/1 | 0 | 0 | 0 |
| unicode_text | 21 | 17/1/3 | 8/17 | 8/17 | 1 (1/0) | 9/17 | 1/8/0/0 | 0 | 0/1 | 0 | 1/3 | 2 | 0 | S4×1 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 21 | 19/2/0 | 3/19 | 3/19 | 11 (7/4) | 6/19 | 1/5/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S3×1 S4×1 |
| seasoning_lookalike | 17 | 15/2/0 | 7/15 | 7/15 | 0 (0/0) | 8/15 | 2/6/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×1 S5×1 S6×1 |
| seasoning_ordinary | 4 | 2/2/0 | 0/2 | 0/2 | 1 (1/0) | 2/2 | 1/1/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S4×1 |
| quart_pint_gallon | 8 | 6/2/0 | 0/6 | 0/6 | 3 (3/0) | 4/6 | 0/4/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S2×1 S3×2 S4×1 |
| long_line | 4 | 4/0/0 | 2/4 | 2/4 | 0 (0/0) | 2/4 | 2/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 6 | 5/1/0 | 0/5 | 0/5 | 0 (0/0) | 5/5 | 1/4/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By source — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 369 | 292/52/25 | 113/292 | 113/292 | 42 (31/11) | 147/292 | 33/114/0/0 | 0 | 43/52 | 0 | 1/25 | 23 | 0 | S1×1 S2×6 S3×20 S4×9 S5×11 S6×10 S8×1 |

##### By repair family — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 75 | 52/23/0 | 5/52 | 5/52 | 9 (7/2) | 41/52 | 5/36/0/0 | 0 | 20/23 | 0 | 0/0 | 0 | 0 | S2×3 S3×6 S4×3 S6×2 |
| B | 51 | 27/24/0 | 6/27 | 6/27 | 6 (6/0) | 21/27 | 12/9/0/0 | 0 | 18/24 | 0 | 0/0 | 0 | 0 | S4×6 S5×11 |
| C | 56 | 55/1/0 | 7/55 | 7/55 | 15 (12/3) | 33/55 | 6/27/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S2×3 S3×10 S6×6 |
| D | 34 | 6/3/25 | 1/6 | 1/6 | 1 (1/0) | 5/6 | 0/5/0/0 | 0 | 3/3 | 0 | 1/25 | 23 | 0 | S1×1 S8×1 |
| plain | 153 | 152/1/0 | 94/152 | 94/152 | 11 (5/6) | 47/152 | 10/37/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×4 S6×2 |

##### By CONTRACT-v1 §12 item exercised — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| §12.1 | 11 | 11/0/0 | 0/11 | 0/11 | 5 (4/1) | 6/11 | 0/6/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S2×3 S3×3 |
| §12.2 | 7 | 5/0/2 | 0/5 | 0/5 | 1 (0/1) | 4/5 | 0/4/0/0 | 0 | 0/0 | 0 | 0/2 | 2 | 0 | 0 |
| §12.3 | 22 | 21/1/0 | 0/21 | 0/21 | 3 (3/0) | 18/21 | 2/16/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S2×3 S3×6 S6×3 |
| §12.4 | 32 | 32/0/0 | 8/32 | 8/32 | 8 (8/0) | 16/32 | 5/11/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 |
| §12.5 | 2 | 2/0/0 | 0/2 | 0/2 | 0 (0/0) | 2/2 | 0/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| §12.6 | 14 | 9/5/0 | 0/9 | 0/9 | 0 (0/0) | 9/9 | 5/4/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| §12.7 | 24 | 3/21/0 | 0/3 | 0/3 | 5 (5/0) | 3/3 | 2/1/0/0 | 0 | 16/21 | 0 | 0/0 | 0 | 0 | S4×5 S5×11 |
| §12.8 | 33 | 6/3/24 | 1/6 | 1/6 | 1 (1/0) | 5/6 | 0/5/0/0 | 0 | 3/3 | 0 | 0/24 | 23 | 0 | S1×1 S8×1 |
| §12.9 | 8 | 7/1/0 | 2/7 | 2/7 | 0 (0/0) | 5/7 | 0/5/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| §12.10 | 15 | 15/0/0 | 4/15 | 4/15 | 10 (6/4) | 1/15 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 |
| §12.11 | 15 | 12/3/0 | 0/12 | 0/12 | 1 (1/0) | 12/12 | 8/4/0/0 | 0 | 2/3 | 0 | 0/0 | 0 | 0 | S4×1 |
| §12.12 | 7 | 7/0/0 | 0/7 | 0/7 | 0 (0/0) | 7/7 | 0/7/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.13 | 12 | 10/2/0 | 2/10 | 2/10 | 0 (0/0) | 8/10 | 0/8/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S3×1 S6×1 |
| §12.14 | 3 | 0/3/0 | 0/0 | 0/0 | 3 (3/0) | 0/0 | 0/0/0/0 | 0 | 0/3 | 0 | 0/0 | 0 | 0 | S3×1 S4×3 |
| no §12 item | 180 | 165/14/1 | 96/165 | 96/165 | 9 (3/6) | 60/165 | 13/47/0/0 | 0 | 14/14 | 0 | 1/1 | 0 | 0 | S3×5 S6×3 |

##### By construction — holdout-v3 (fresh; acceptance set)

304 distinct construction(s); at most 2 line(s) per construction (the JSON report lists every construction).

| Construction | Cases | Classes | Severe |
|---|---|---|---|
| ABOUT INT UNIT PART W \| plain ready | ing-h3-0202 | C3b | — |
| ABOUT INT UNIT W , NOTE \| plain ready | ing-h3-0284 | C3b | — |
| ABOUT INT UNIT W CUNIT \| plain ready | ing-h3-0097 | C3b | — |
| ABOUT INT UNIT W \| plain ready | ing-h3-0134 | C3b | — |
| CUNIT OF W , NOTE \| A ready | ing-h3-0285 | C3b | — |
| DEC UNIT CONT CAP W \| C ready 12.3 new | ing-h3-0062 | C2 | S2 S3 S6 |
| DEC W UNIT CONT W \| C ready 12.3 new | ing-h3-0199 | C2 | S2 S3 S6 |
| DECO FRAC UNIT W \| A ready 12.13 new | ing-h3-0307 | C3b | — |
| DECO INT UNIT PART W , NOTE \| A ready 12.13 new | ing-h3-0225 | C3b | — |
| DECO INT UNIT W \| A ready 12.13 new | ing-h3-0006, ing-h3-0337 | C3b, C3b | — |
| ENUM INT UNIT CAP W \| A ready 12.13 new | ing-h3-0267 | C3b | — |
| ENUM INT UNIT PART W \| A ready 12.13 new | ing-h3-0069 | C3b | — |
| ENUM INT UNIT W \| A ready 12.13 new | ing-h3-0268 | C3b | — |
| FRAC NEGNUM SLASH INT UNIT W \| A needs_review | ing-h3-0362 | C5b | — |
| FRAC UNIT (AMT) W CUNIT \| A ready 12.6 | ing-h3-0258 | C3a | — |
| FRAC UNIT CAP W \| plain ready | ing-h3-0021, ing-h3-0071 | C3b, C1 | — |
| FRAC UNIT PART W (AMT) \| B ready 12.11 | ing-h3-0303 | C3a | — |
| FRAC UNIT PART W (OPT) \| plain ready | ing-h3-0304 | C3a | — |
| FRAC UNIT PART W , NOTE , NOTE \| plain ready | ing-h3-0117 | C3b | — |
| FRAC UNIT PLUS INT UNIT W \| A ready 12.12 | ing-h3-0278 | C3b | — |
| FRAC UNIT SLASH INT UNIT W \| A ready 12.6 | ing-h3-0061 | C3b | — |
| FRAC UNIT W (AMT) \| B ready | ing-h3-0212 | C3b | — |
| FRAC UNIT W AND W , NOTE \| B needs_review 12.7 new | ing-h3-0221 | C2 | S4 |
| FRAC UNIT W OR W , NOTE \| B needs_review 12.7 | ing-h3-0299 | C5b | — |
| FRAC UNIT W OR W , NOTE \| B needs_review 12.7 new | ing-h3-0038 | C5b | S5 |
| FRAC UNIT W OR W \| B needs_review 12.7 | ing-h3-0033 | C5b | — |
| FRAC UNIT W OR W \| B needs_review 12.7 new | ing-h3-0083 | C5b | S5 |
| FRAC UNIT W \| plain ready | ing-h3-0047, ing-h3-0335 | C3b, C1 | — |
| FRACWORD NUMWORD W , NOTE \| plain ready | ing-h3-0108 | C3b | — |
| FRACWORD OF NUMWORD UNIT PART W \| A ready 12.1 new | ing-h3-0236 | C3b | — |
| IMP OF W , FLAG \| A ready | ing-h3-0277 | C3b | — |
| IMP OF W \| A needs_review | ing-h3-0129 | C5b | — |
| IMP OF W \| A ready | ing-h3-0063, ing-h3-0087 | C3b, C3b | — |
| INT (AMT) CONT CAP \| C ready | ing-h3-0228 | C3b | S3 S6 |
| INT (AMT) CONT NUMWORD W \| A ready 12.9 new | ing-h3-0369 | C3b | S3 S6 |
| INT (AMT) CONT PART W \| C needs_review 12.3+12.6 new | ing-h3-0171 | C5b | — |
| INT (AMT) CONT W , NOTE \| plain ready | ing-h3-0172 | C3b | S3 S6 |
| INT (AMT) UNIT CAP W \| C ready 12.5 | ing-h3-0127 | C3b | S3 S6 |
| INT (AMT) W , NOTE \| C ready 12.3 new | ing-h3-0244 | C3b | S3 |
| INT (AMT) W \| C ready | ing-h3-0197 | C3a | — |
| INT (AMT) W \| C ready 12.3 new | ing-h3-0332 | C3b | S3 |
| INT (AMT) W \| C ready 12.3+12.4 new | ing-h3-0342 | C3b | S3 |
| INT , AMT-REMARK \| A needs_review | ing-h3-0010, ing-h3-0142 | C5b, C5b | — |
| INT CAP W (PRICE) , NOTE \| plain ready | ing-h3-0166 | C3a | — |
| INT CAP W , AMT-REMARK \| B ready 12.11 | ing-h3-0229 | C3b | — |
| INT CAP W OR W \| B needs_review 12.7 | ing-h3-0215 | C5b | S5 |
| INT CONT (AMT) W , NOTE \| plain ready | ing-h3-0218 | C3b | S3 S6 |
| INT CONT CAP PART W OF W \| plain ready | ing-h3-0130 | C3b | — |
| INT CONT CAP W (AMT) \| C ready 12.3 new | ing-h3-0356 | C3b | — |
| INT CONT CAP W \| plain ready | ing-h3-0032, ing-h3-0188 | C3b, C2 | — |
| INT CONT PART NUMWORD W CAP W \| A ready 12.9 new | ing-h3-0222 | C3b | — |
| INT CONT W (AMT) , NOTE \| C ready 12.3 new | ing-h3-0184, ing-h3-0214 | C3b, C3b | — |
| INT CONT W (AMT) \| C ready 12.3 new | ing-h3-0123, ing-h3-0128 | C3b, C3b | — |
| INT CONT W , NOTE \| C ready 12.4 | ing-h3-0001 | C3b | — |
| INT CONT W CUNIT (AMT) \| C ready 12.3 new | ing-h3-0046 | C3b | — |
| INT CUNIT , NOTE \| C ready 12.4 new | ing-h3-0181 | C3a | — |
| INT CUNIT CAP W (AMT) \| B ready 12.11 | ing-h3-0076 | C3b | — |
| INT CUNIT CAP W \| plain ready | ing-h3-0198 | C3b | — |
| INT CUNIT CUNIT W \| C ready 12.4 | ing-h3-0310 | C3b | — |
| INT CUNIT NUMWORD W \| A ready 12.9 new | ing-h3-0012 | C3b | — |
| INT CUNIT W (AMT) \| C ready 12.4+12.3 new | ing-h3-0145 | C3b | — |
| INT CUNIT W (P) \| C ready 12.4 | ing-h3-0350 | C3b | — |
| INT CUNIT W (PRICE) \| B ready | ing-h3-0092 | C3b | — |
| INT CUNIT W , AMT-REMARK \| C ready 12.4+12.3 new | ing-h3-0297 | C3a | — |
| INT CUNIT W , NOTE \| C ready 12.4 | ing-h3-0022, ing-h3-0263 | C3b, C3b | — |
| INT CUNIT W , NOTE \| C ready 12.4 new | ing-h3-0363 | C3b | — |
| INT CUNIT W , NOTE \| plain ready | ing-h3-0030, ing-h3-0089 | C3b, C3b | — |
| INT CUNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0120 | C5b | — |
| INT CUNIT W \| C ready 12.4 new | ing-h3-0043 | C3b | — |
| INT CUNIT W \| plain ready | ing-h3-0312 | C3b | — |
| INT FRAC UNIT PART W OR W , NOTE \| B needs_review 12.7 new | ing-h3-0340 | C5b | S5 |
| INT FRAC UNIT PLUS INT UNIT W , NOTE \| A ready 12.12 | ing-h3-0318 | C3b | — |
| INT FRAC UNIT W (AMT) \| B ready 12.11 | ing-h3-0146 | C3a | — |
| INT FRAC UNIT W , NOTE , PLUS-REMARK \| plain ready | ing-h3-0147 | C3a | — |
| INT FRACWORD CONT W \| A ready 12.1 new | ing-h3-0051 | C2 | — |
| INT FRACWORD OF W \| A ready 12.1 new | ing-h3-0016 | C2 | S2 S3 |
| INT FRACWORD UNIT PART CAP \| A ready 12.1 new | ing-h3-0354 | C2 | S2 S3 |
| INT FRACWORD W \| A ready 12.1 new | ing-h3-0074, ing-h3-0253 | C2, C2 | S2 S3 |
| INT IMP W , NOTE \| plain ready | ing-h3-0180 | C3b | — |
| INT IMP W \| C ready 12.4 new | ing-h3-0124 | C3a | — |
| INT IMP W \| D ready 12.8 | ing-h3-0249 | C3b | — |
| INT INT UNIT CONT PART W \| A ready 12.13 | ing-h3-0125 | C3b | S3 S6 |
| INT INT UNIT W \| A needs_review 12.13 new | ing-h3-0007 | C5b | — |
| INT OR INT W , NOTE \| A needs_review | ing-h3-0176 | C5b | — |
| INT PART UNIT CAP W \| plain ready | ing-h3-0059 | C2 | S3 |
| INT SIZE CAP W \| C ready 12.10 | ing-h3-0110 | C2 | — |
| INT SIZE CUNIT W , NOTE \| C ready 12.4+12.10 | ing-h3-0292 | C2 | — |
| INT SIZE CUNIT W , NOTE \| plain ready 12.10 | ing-h3-0200, ing-h3-0317 | C2, C2 | — |
| INT SIZE IMP W \| C ready 12.10 | ing-h3-0287 | C2 | S3 |
| INT SIZE W (AMT) \| C ready 12.10+12.3 new | ing-h3-0011 | C3b | — |
| INT SIZE W , NOTE \| C ready 12.10 | ing-h3-0137, ing-h3-0173 | C1, C2 | — |
| INT SIZE W CUNIT , NOTE \| C ready 12.4+12.10 new | ing-h3-0091 | C2 | — |
| INT SIZE W CUNIT \| C ready 12.4+12.10 | ing-h3-0241 | C2 | — |
| INT SIZE W \| A needs_review 12.14 new | ing-h3-0075 | C2 | S4 |
| INT SIZE W \| C ready 12.10 | ing-h3-0133 | C2 | — |
| INT TO INT FRAC UNIT W \| A needs_review | ing-h3-0366 | C5b | — |
| INT TO INT SIZE W \| A needs_review | ing-h3-0131 | C5b | — |
| INT TO INTVULG UNIT W , NOTE \| A needs_review | ing-h3-0067 | C5b | — |
| INT UNIT (AMT) W \| A needs_review 12.6 new | ing-h3-0138, ing-h3-0319 | C5a, C5b | — |
| INT UNIT (AMT) W \| A ready 12.6 | ing-h3-0177, ing-h3-0205 | C3a, C3a | — |
| INT UNIT (AMT) W \| C ready 12.5 | ing-h3-0290 | C3b | S3 S6 |
| INT UNIT CAP W (OR) \| B needs_review 12.7 | ing-h3-0283 | C5b | S5 |
| INT UNIT CAP W (P) \| B needs_review 12.11 new | ing-h3-0341 | C2 | S4 |
| INT UNIT CONT W \| C ready 12.3 new | ing-h3-0246 | C2 | S2 S3 S6 |
| INT UNIT FORM PART W \| plain ready | ing-h3-0280 | C2 | — |
| INT UNIT FORM W (P) \| plain ready | ing-h3-0274 | C2 | — |
| INT UNIT FORM W , NOTE \| plain ready | ing-h3-0031, ing-h3-0355 | C2, C2 | — |
| INT UNIT FORM W \| plain ready | ing-h3-0119 | C2 | — |
| INT UNIT INT W \| A ready 12.9 new | ing-h3-0015 | C3b | — |
| INT UNIT MINUS INT UNIT W \| A ready 12.12 | ing-h3-0017 | C3b | — |
| INT UNIT NUMW W \| A ready 12.9 | ing-h3-0361 | C3b | — |
| INT UNIT PART W (AMT) , PLUS-REMARK \| B ready 12.11 new | ing-h3-0261 | C3a | — |
| INT UNIT PART W (AMT) \| B ready 12.11 | ing-h3-0014, ing-h3-0111 | C3a, C3a | — |
| INT UNIT PART W (AMT) \| B ready 12.11 new | ing-h3-0058 | C3a | — |
| INT UNIT PART W CUNIT (AMT) \| B ready 12.11+12.4 new | ing-h3-0077 | C3a | — |
| INT UNIT PCT W \| plain ready | ing-h3-0220 | C3b | — |
| INT UNIT PLUS INT UNIT (AMT) W \| A ready 12.12+12.6 | ing-h3-0080 | C3b | — |
| INT UNIT PLUS INT UNIT W \| A ready 12.12 | ing-h3-0106 | C3b | — |
| INT UNIT SLASH INT UNIT W \| A ready 12.6 | ing-h3-0175 | C3b | — |
| INT UNIT W (AMT) \| A ready 12.6 | ing-h3-0073, ing-h3-0273 | C3a, C3b | — |
| INT UNIT W (AMT) \| B needs_review 12.7 | ing-h3-0328 | C5b | S5 |
| INT UNIT W (AMT) \| B ready 12.11 | ing-h3-0217 | C3a | — |
| INT UNIT W (NEST) \| plain ready | ing-h3-0042 | C2 | — |
| INT UNIT W (OPT) , NOTE \| B ready | ing-h3-0029 | C3a | — |
| INT UNIT W (OPT) \| plain ready | ing-h3-0252 | C3a | — |
| INT UNIT W (OR) \| B ready | ing-h3-0247 | C3b | — |
| INT UNIT W (OR) \| B ready 12.7 | ing-h3-0321 | C3a | — |
| INT UNIT W , AMT-REMARK \| B needs_review 12.11 | ing-h3-0113 | C5b | — |
| INT UNIT W , AMT-REMARK \| plain ready | ing-h3-0141, ing-h3-0232 | C3b, C3b | — |
| INT UNIT W , NOTE , OR-REMARK \| B needs_review 12.7 new | ing-h3-0150 | C5b | S5 |
| INT UNIT W , NOTE , PLUS-REMARK \| B ready | ing-h3-0085, ing-h3-0339 | C3a, C1 | — |
| INT UNIT W , NOTE \| B needs_review 12.7 new | ing-h3-0156 | C2 | S4 |
| INT UNIT W , NOTE \| B ready | ing-h3-0169 | C3a | — |
| INT UNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0086 | C5b | S5 |
| INT UNIT W , OR-REMARK \| plain ready 12.7 | ing-h3-0305 | C3a | — |
| INT UNIT W , PLUS-REMARK \| B ready 12.11+12.12 new | ing-h3-0045 | C3b | — |
| INT UNIT W AND W , NOTE \| B ready 12.7 | ing-h3-0167 | C3b | — |
| INT UNIT W AND W \| B needs_review 12.7 new | ing-h3-0140, ing-h3-0311 | C2, C2 | S4 |
| INT UNIT W CAP W (AMT) \| B ready | ing-h3-0298 | C3b | — |
| INT UNIT W OR INT UNIT PART W \| B needs_review 12.7 new | ing-h3-0251 | C5b | S5 |
| INT UNIT W OR INT UNIT W \| B needs_review 12.7 new | ing-h3-0219 | C5b | S5 |
| INT UNIT W OR W \| B needs_review 12.7 | ing-h3-0242, ing-h3-0334 | C5b, C5b | — |
| INT UNIT W PLUS INT UNIT W \| B ready 12.11+12.12 new | ing-h3-0149 | C3b | — |
| INT UNIT W SLASH W \| B needs_review 12.7 new | ing-h3-0041 | C2 | S4 |
| INT VULG UNIT W \| plain ready | ing-h3-0100, ing-h3-0203 | C3b, C1 | — |
| INT W (AMT) , NOTE \| C ready 12.3 new | ing-h3-0333 | C3a | — |
| INT W , AMT-REMARK \| plain ready | ing-h3-0070 | C3b | — |
| INT W CAP CUNIT \| C ready 12.4 | ing-h3-0286 | C2 | — |
| INT W CUNIT (P) , NOTE \| C ready 12.4 | ing-h3-0282 | C2 | — |
| INT W CUNIT , FLAG \| C ready 12.4 | ing-h3-0353 | C3b | — |
| INT W CUNIT , NOTE \| C ready 12.4 | ing-h3-0109, ing-h3-0330 | C2, C2 | — |
| INT W CUNIT \| C ready 12.4 | ing-h3-0195 | C2 | — |
| INT W OR INT UNIT W \| B needs_review 12.7 new | ing-h3-0099 | C5b | S5 |
| INT W PART W \| A needs_review 12.14 new | ing-h3-0193 | C2 | S4 |
| INT W UNIT CAP W \| plain ready | ing-h3-0126 | C2 | S3 |
| INT W UNIT W \| A needs_review 12.14 new | ing-h3-0064 | C2 | S3 S4 |
| INT W \| D unsupported 12.8 new | ing-h3-0271 | C2 | S1 S8 |
| INT X INTUNIT CONT W , NOTE \| A ready 12.2 | ing-h3-0159 | C3b | — |
| INT X NUMW W , NOTE \| D unsupported 12.2+12.8 new | ing-h3-0002 | C8 | — |
| INT X SIZE W , NOTE \| A ready 12.2+12.10 new | ing-h3-0035 | C2 | — |
| INTUNIT (AMT) W \| A ready 12.6 | ing-h3-0066 | C3a | — |
| INTVULG UNIT W \| plain ready | ing-h3-0098, ing-h3-0107 | C3b, C3b | — |
| NEGNUM UNIT W PART W \| A needs_review 12.13 new | ing-h3-0259 | C5b | — |
| NUMWORD CUNIT W \| A needs_review | ing-h3-0026 | C5b | — |
| NUMWORD FRACWORD OF W \| A ready 12.1 new | ing-h3-0237 | C3b | — |
| NUMWORD FRACWORD UNIT PART W \| A ready 12.1 new | ing-h3-0306 | C3b | — |
| NUMWORD FRACWORD UNIT W \| A ready 12.1 new | ing-h3-0057, ing-h3-0151 | C3b, C3b | — |
| NUMWORD FRACWORD W \| A ready 12.1 new | ing-h3-0272 | C3b | — |
| NUMWORD IMP OF CAP \| A needs_review | ing-h3-0327 | C5b | — |
| NUMWORD IMP OF W \| plain ready | ing-h3-0322 | C3b | — |
| NUMWORD NUMW IMP OF W \| plain ready | ing-h3-0281 | C3b | — |
| NUMWORD NUMW W , NOTE \| D unsupported 12.8 new | ing-h3-0048 | C8 | — |
| NUMWORD OR NUMWORD W \| A needs_review | ing-h3-0364 | C5b | — |
| NUMWORD SIZE IMP OF CAP W \| plain ready | ing-h3-0082 | C3b | — |
| NUMWORD SIZEUNIT CONT OF CAP \| C ready 12.3 new | ing-h3-0049 | C3b | — |
| NUMWORD SIZEUNIT CUNIT W \| C ready 12.3 new | ing-h3-0269 | C3b | — |
| NUMWORD SIZEUNIT W \| C ready 12.3 new | ing-h3-0121, ing-h3-0329 | C3b, C3b | — |
| NUMWORD UNIT W \| plain ready | ing-h3-0055 | C3b | — |
| NUMWORD W , NOTE \| plain ready | ing-h3-0231, ing-h3-0235 | C3b, C3b | — |
| RANGE UNIT W \| A needs_review | ing-h3-0352 | C5b | — |
| SIZE CUNIT OF W \| A ready | ing-h3-0102 | C3b | — |
| SIZEUNIT CONT W PART W \| C ready 12.3 new | ing-h3-0072 | C3b | — |
| UNIT OF W , NOTE \| A needs_review | ing-h3-0345 | C5b | — |
| VULG UNIT CAP W \| plain ready | ing-h3-0250 | C3b | — |
| VULG UNIT PART W (P) , NOTE \| plain ready | ing-h3-0154 | C3a | — |
| VULG UNIT W \| plain ready | ing-h3-0165, ing-h3-0338 | C1, C3b | — |
| W (AMT) \| D needs_review 12.8 new | ing-h3-0003 | C5b | — |
| W (AMT) \| D unsupported 12.8 new | ing-h3-0088 | C8 | — |
| W (OPT) COLON W \| D ready 12.8 new | ing-h3-0248 | C3b | — |
| W (OPT) \| D unsupported 12.8 new | ing-h3-0211 | C8 | — |
| W (P) , AMT-REMARK \| plain ready | ing-h3-0112 | C3a | — |
| W (P) \| plain ready | ing-h3-0367 | C3a | — |
| W , AMT-REMARK \| D unsupported 12.8 new | ing-h3-0270 | C8 | — |
| W , FLAG \| plain ready | ing-h3-0226, ing-h3-0368 | C3a, C3a | — |
| W CAP COLON \| D unsupported 12.8 | ing-h3-0005, ing-h3-0260 | C8, C8 | — |
| W CAP \| D unsupported 12.8 | ing-h3-0174, ing-h3-0294 | C8, C8 | — |
| W COLON CAP \| D unsupported 12.8 new | ing-h3-0262, ing-h3-0325 | C8, C8 | — |
| W COLON INT (P) \| plain ready | ing-h3-0186 | C3b | — |
| W COLON INT UNIT PART W \| plain ready | ing-h3-0168 | C3b | — |
| W COLON INT UNIT \| plain ready | ing-h3-0210 | C3b | — |
| W COLON NUMWORD NUMW W \| D unsupported 12.8 new | ing-h3-0204 | C8 | — |
| W COLON SLASH SLASH W SLASH W SLASH W \| D unsupported 12.8 | ing-h3-0357 | C8 | — |
| W COLON W PART W \| D ready 12.8 new | ing-h3-0301 | C3b | — |
| W COLON W \| D ready 12.8 new | ing-h3-0065, ing-h3-0104 | C3b, C3b | — |
| W COLON W \| D unsupported 12.8 new | ing-h3-0009, ing-h3-0314 | C8, C8 | — |
| W CONT \| D unsupported 12.8 new | ing-h3-0093 | C8 | — |
| W CUNIT (AMT) , NOTE \| A ready 12.2+12.4 new | ing-h3-0024 | C3b | — |
| W CUNIT , FLAG \| C ready 12.4 | ing-h3-0164 | C3a | — |
| W DEC W OF INT W INT W \| D unsupported 12.8 new | ing-h3-0196 | C8 | — |
| W INT COLON CAP W PART W \| D unsupported 12.8 | ing-h3-0296 | C8 | — |
| W INT FRAC UNIT \| plain ready | ing-h3-0293 | C3b | — |
| W NUMW (AMT) \| D unsupported 12.8 new | ing-h3-0018 | C8 | — |
| W X X \| D unsupported 12.2+12.8 new | ing-h3-0276 | C8 | — |
| W \| D unsupported 12.8 | ing-h3-0155 | C8 | — |
| W \| D unsupported 12.8 new | ing-h3-0114, ing-h3-0189 | C8, C8 | — |
| W \| plain ready | ing-h3-0288 | C3b | — |
| X IMP W \| A ready 12.2 new | ing-h3-0118 | C3b | — |
| X W \| A ready 12.2 new | ing-h3-0054 | C3b | — |

##### Acceptance — Gate G2 on holdout-v3 (fresh; acceptance set), engine `legacy-table-import-2+suggestion`

Basis: Gate G2 acceptance set (EVALUATION-PLAN-v3) — acceptance evidence only when FREEZE-v3.json exists and verifies holdout-v3 (see the freeze line).

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 113/292 (38.7%, 33.3%–44.4%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 165/292 (56.5%, 50.8%–62.1%); quantity 204/292 (69.9%, 64.4%–74.8%); unit 169/292 (57.9%, 52.1%–63.4%) | as A1, for each field (accepted name matches) | **not met** |
| A3 | high-severity false certainty = 0 | C2High 31/369 (8.4%, 6.0%–11.7%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 1/369 (0.3%, 0.1%–1.5%); S3 20/369 (5.4%, 3.5%–8.2%); S4 9/369 (2.4%, 1.3%–4.6%); S5 11/369 (3.0%, 1.7%–5.3%); S6 10/369 (2.7%, 1.5%–4.9%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 147/292 (50.3%, 44.6%–56.0%) | point estimate | **not met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/369 (0.0%, ≤ 1.0%); engineError 0/369 (0.0%, ≤ 1.0%); invalidOutput 0/369 (0.0%, ≤ 1.0%); nondeterministic 0/369 (0.0%, ≤ 1.0%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v3 (fresh; acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases marked debatable: true in holdout-v3.jsonl (EVALUATION-PLAN-v3 §7 (a)): 4 excluded (ing-h3-0104, ing-h3-0211, ing-h3-0297, ing-h3-0311), 365 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 113/290 (39.0%, 33.5%–44.7%) | not met |
| A2 | name 164/290 (56.5%, 50.8%–62.1%); quantity 202/290 (69.7%, 64.1%–74.7%); unit 168/290 (57.9%, 52.2%–63.5%) | not met |
| A3 | C2High 30/365 (8.2%, 5.8%–11.5%) | not met |
| A4 | S1 1/365 (0.3%, 0.1%–1.5%); S3 20/365 (5.5%, 3.6%–8.3%); S4 8/365 (2.2%, 1.1%–4.3%); S5 11/365 (3.0%, 1.7%–5.3%); S6 10/365 (2.7%, 1.5%–5.0%) | not met |
| A5 | C3plusC4 145/290 (50.0%, 44.3%–55.7%) | not met |

A1–A5 (c) without the cases marked reliesOnNewReading: true in holdout-v3.jsonl — the result under CONTRACT-v1 §7 alone (EVALUATION-PLAN-v3 §7 (c)): 126 excluded (ing-h3-0001, ing-h3-0002, ing-h3-0003, ing-h3-0004, ing-h3-0006, ing-h3-0007, ing-h3-0009, ing-h3-0011, ing-h3-0012, ing-h3-0014, ing-h3-0015, ing-h3-0016, ing-h3-0018, ing-h3-0022, ing-h3-0024, ing-h3-0035, ing-h3-0038, ing-h3-0039, ing-h3-0041, ing-h3-0043, ing-h3-0045, ing-h3-0046, ing-h3-0048, ing-h3-0049, ing-h3-0051, ing-h3-0053, ing-h3-0054, ing-h3-0057, ing-h3-0058, ing-h3-0062, ing-h3-0064, ing-h3-0065, ing-h3-0069, ing-h3-0072, ing-h3-0074, ing-h3-0075, ing-h3-0077, ing-h3-0083, ing-h3-0086, ing-h3-0088, ing-h3-0091, ing-h3-0093, ing-h3-0099, ing-h3-0104, ing-h3-0111, ing-h3-0114, ing-h3-0118, ing-h3-0120, ing-h3-0121, ing-h3-0123, ing-h3-0124, ing-h3-0125, ing-h3-0128, ing-h3-0138, ing-h3-0140, ing-h3-0145, ing-h3-0146, ing-h3-0149, ing-h3-0150, ing-h3-0151, ing-h3-0156, ing-h3-0167, ing-h3-0171, ing-h3-0177, ing-h3-0181, ing-h3-0184, ing-h3-0189, ing-h3-0193, ing-h3-0196, ing-h3-0199, ing-h3-0204, ing-h3-0207, ing-h3-0209, ing-h3-0211, ing-h3-0214, ing-h3-0215, ing-h3-0219, ing-h3-0221, ing-h3-0222, ing-h3-0225, ing-h3-0229, ing-h3-0236, ing-h3-0237, ing-h3-0244, ing-h3-0246, ing-h3-0248, ing-h3-0251, ing-h3-0253, ing-h3-0254, ing-h3-0256, ing-h3-0258, ing-h3-0259, ing-h3-0261, ing-h3-0262, ing-h3-0264, ing-h3-0267, ing-h3-0268, ing-h3-0269, ing-h3-0270, ing-h3-0271, ing-h3-0272, ing-h3-0276, ing-h3-0279, ing-h3-0297, ing-h3-0300, ing-h3-0301, ing-h3-0303, ing-h3-0306, ing-h3-0307, ing-h3-0311, ing-h3-0313, ing-h3-0314, ing-h3-0319, ing-h3-0325, ing-h3-0329, ing-h3-0332, ing-h3-0333, ing-h3-0337, ing-h3-0340, ing-h3-0341, ing-h3-0342, ing-h3-0350, ing-h3-0354, ing-h3-0356, ing-h3-0363, ing-h3-0369), 243 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 105/211 (49.8%, 43.1%–56.5%) | not met |
| A2 | name 138/211 (65.4%, 58.8%–71.5%); quantity 161/211 (76.3%, 70.1%–81.5%); unit 141/211 (66.8%, 60.2%–72.8%) | not met |
| A3 | C2High 13/243 (5.3%, 3.1%–8.9%) | not met |
| A4 | S1 0/243 (0.0%, ≤ 1.6%); S3 8/243 (3.3%, 1.7%–6.4%); S4 0/243 (0.0%, ≤ 1.6%); S5 2/243 (0.8%, 0.2%–2.9%); S6 5/243 (2.1%, 0.9%–4.7%) | not met |
| A5 | C3plusC4 84/211 (39.8%, 33.4%–46.5%) | not met |

A1–A5 (d) without the cases listed in fixtures/EXPOSURE-AUDIT-v3.json (EVALUATION-PLAN-v3 §7 (d), §9.4) (audit of 2026-10-10, 3 matched id(s); method: Exact match after NFKC, lower case, whitespace collapse and trim, of every holdout-v3 input against 57972 exposed strings: the audit list of build_exposed_inputs.py (23321: exposed fixture sets, regression corpus, semantic-v2 test data and literals, Phase 2/2B review probes, implementation scratch probes) plus documentation/evidence markdown spans, lines and cells and every reviewer-R1 text file; run after the holdout-v3 freeze and before scoring (EVALUATION-PLAN-v3 §9.4; docs/table/evidence/2026-10-10-recipe-extraction-phase2b/holdout-v3/build_exposure_audit_v3.py)): 3 excluded (ing-h3-0114, ing-h3-0189, ing-h3-0276), 366 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 113/292 (38.7%, 33.3%–44.4%) | not met |
| A2 | name 165/292 (56.5%, 50.8%–62.1%); quantity 204/292 (69.9%, 64.4%–74.8%); unit 169/292 (57.9%, 52.1%–63.4%) | not met |
| A3 | C2High 31/366 (8.5%, 6.0%–11.8%) | not met |
| A4 | S1 1/366 (0.3%, 0.1%–1.5%); S3 20/366 (5.5%, 3.6%–8.3%); S4 9/366 (2.5%, 1.3%–4.6%); S5 11/366 (3.0%, 1.7%–5.3%); S6 10/366 (2.7%, 1.5%–5.0%) | not met |
| A5 | C3plusC4 147/292 (50.3%, 44.6%–56.0%) | not met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 4 excluded (ing-h3-0020, ing-h3-0044, ing-h3-0191, ing-h3-0254), 48 needs_review lines kept — C5 39/48 (81.3%, 68.1%–89.8%) · C5a 4/48 · C5b 35/48 · C5c 0/48 · C5x 0/48 · C6 0/48 (0.0%, ≤ 7.4%) · S4 9/48 (18.8%, 10.2%–31.9%).

### Outcomes — engine `semantic-v1`

| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|
| holdout-v3 (fresh; acceptance set) | 369 | 292/52/25 | 240/292 (82.2%, 77.4%–86.2%) | 231/292 (79.1%, 74.1%–83.4%) | 29/6 | 29/292 (9.9%, 7.0%–13.9%) | 42/52 | 8/25 | 0 | S1×5 S2×3 S3×6 S4×10 S5×2 S6×2 S7×5 S8×2 |

#### holdout-v3 (fresh; acceptance set) — 369 lines (R 292, A 52, U 25)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 240/292 | 82.2% | 77.4%–86.2% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 231/292 | 79.1% | 74.1%–83.4% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 9/292 | 3.1% | 1.6%–5.8% | ing-h3-0014, ing-h3-0058, ing-h3-0077, ing-h3-0092, ing-h3-0217, ing-h3-0229, ing-h3-0252, ing-h3-0261, ing-h3-0303 |
| **C2 incorrect ready** (of N) | 35/369 | 9.5% | 6.9%–12.9% |  |
| C2 — high false certainty (of N) | 29/369 | 7.9% | 5.5%–11.1% | ing-h3-0003, ing-h3-0004, ing-h3-0043, ing-h3-0048, ing-h3-0051, ing-h3-0075, ing-h3-0091, ing-h3-0109, ing-h3-0113, ing-h3-0118, ing-h3-0123, ing-h3-0124, ing-h3-0140, ing-h3-0145, ing-h3-0221, ing-h3-0241, ing-h3-0253, ing-h3-0271, ing-h3-0272, ing-h3-0277, ing-h3-0282, ing-h3-0290, ing-h3-0297, ing-h3-0300, ing-h3-0311, ing-h3-0326, ing-h3-0330, ing-h3-0341, ing-h3-0363 |
| C2 — medium false certainty (of N) | 6/369 | 1.6% | 0.8%–3.5% | ing-h3-0011, ing-h3-0035, ing-h3-0054, ing-h3-0074, ing-h3-0110, ing-h3-0331 |
| C2 on ready labels (of R) | 23/292 | 7.9% | 5.3%–11.5% |  |
| C2 on needs_review labels (of A) | 10/52 | 19.2% | 10.8%–31.9% |  |
| C2 on unsupported labels (of U) | 2/25 | 8.0% | 2.2%–25.0% |  |
| C3 unnecessary review (of R) | 29/292 | 9.9% | 7.0%–13.9% |  |
| C3a useful partial (of R) | 20/292 | 6.9% | 4.5%–10.3% | ing-h3-0016, ing-h3-0062, ing-h3-0063, ing-h3-0072, ing-h3-0080, ing-h3-0087, ing-h3-0102, ing-h3-0121, ing-h3-0180, ing-h3-0199, ing-h3-0237, ing-h3-0244, ing-h3-0246, ing-h3-0248, ing-h3-0258, ing-h3-0285, ing-h3-0329, ing-h3-0332, ing-h3-0342, ing-h3-0354 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 6/292 | 2.1% | 0.9%–4.4% | ing-h3-0017, ing-h3-0024, ing-h3-0045, ing-h3-0127, ing-h3-0149, ing-h3-0181 |
| C3c abstention (of R) | 2/292 | 0.7% | 0.2%–2.5% | ing-h3-0006, ing-h3-0307 |
| C3x food not named, amount read — not defined by the plan (of R) | 1/292 | 0.3% | 0.1%–1.9% | ing-h3-0015 |
| C4 unnecessary rejection (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3 + C4 (of R) | 29/292 | 9.9% | 7.0%–13.9% |  |
| C5 correct review (of A) | 42/52 | 80.8% | 68.1%–89.2% |  |
| C5a useful partial (of A) | 33/52 | 63.5% | 49.9%–75.2% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 9/52 | 17.3% | 9.4%–29.7% | ing-h3-0033, ing-h3-0083, ing-h3-0086, ing-h3-0120, ing-h3-0150, ing-h3-0156, ing-h3-0171, ing-h3-0254, ing-h3-0299 |
| C5c abstention (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C6 review rejected (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C7 correct rejection (of U) | 8/25 | 32.0% | 17.2%–51.6% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 15/25 | 60.0% | 40.7%–76.6% | ing-h3-0002, ing-h3-0018, ing-h3-0088, ing-h3-0093, ing-h3-0114, ing-h3-0189, ing-h3-0196, ing-h3-0204, ing-h3-0211, ing-h3-0262, ing-h3-0270, ing-h3-0276, ing-h3-0296, ing-h3-0314, ing-h3-0325 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: engine error (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: output fails the contract validator (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S1 fabricated amount** (of N) | 5/369 | 1.4% | 0.6%–3.1% | ing-h3-0048, ing-h3-0204, ing-h3-0254, ing-h3-0271, ing-h3-0276 |
| **S2 wrong amount on a ready reading** (of N) | 3/369 | 0.8% | 0.3%–2.4% | ing-h3-0253, ing-h3-0272, ing-h3-0277 |
| **S3 cross-dimension** (of N) | 6/369 | 1.6% | 0.8%–3.5% | ing-h3-0118, ing-h3-0124, ing-h3-0127, ing-h3-0253, ing-h3-0272, ing-h3-0290 |
| **S4 suppressed ambiguity** (of N) | 10/369 | 2.7% | 1.5%–4.9% | ing-h3-0003, ing-h3-0004, ing-h3-0075, ing-h3-0113, ing-h3-0140, ing-h3-0221, ing-h3-0300, ing-h3-0311, ing-h3-0326, ing-h3-0341 |
| **S5 silent alternative choice** (of N) | 2/369 | 0.5% | 0.1%–1.9% | ing-h3-0086, ing-h3-0150 |
| **S6 package representation changed** (of N) | 2/369 | 0.5% | 0.1%–1.9% | ing-h3-0127, ing-h3-0290 |
| **S7 dropped material qualifier** (of N) | 5/369 | 1.4% | 0.6%–3.1% | ing-h3-0043, ing-h3-0124, ing-h3-0145, ing-h3-0297, ing-h3-0363 |
| **S8 ready on a non-ingredient** (of N) | 2/369 | 0.5% | 0.1%–1.9% | ing-h3-0048, ing-h3-0271 |
| Any severe error (of N) | 28/369 | 7.6% | 5.3%–10.8% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 3/369 | 0.8% | 0.3%–2.4% | ing-h3-0033, ing-h3-0083, ing-h3-0299 |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/369 | 0.0% | ≤ 1.0% |  |

Strict matching: C1 238/292 (81.5%, 76.6%–85.5%) · C1+ 230/292 (78.8%, 73.7%–83.1%) · C2 37/369 (10.0%, 7.4%–13.5%). Lines whose class differs under strict matching: ing-h3-0077, ing-h3-0161.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 264/292 (90.4%, 86.5%–93.3%) | 266/292 (91.1%, 87.3%–93.8%) |
| quantity | 271/292 (92.8%, 89.3%–95.3%) | 271/292 (92.8%, 89.3%–95.3%) |
| unit | 265/292 (90.8%, 86.9%–93.6%) | 265/292 (90.8%, 86.9%–93.6%) |

##### By category — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 194/30/1 | 161/194 | 157/194 | 28 (23/5) | 14/194 | 6/6/1/1 | 0 | 22/30 | 0 | 0/1 | 0 | 0 | S1×1 S2×1 S3×5 S4×8 S5×2 S6×2 S7×5 S8×1 |
| fraction | 50 | 42/8/0 | 35/42 | 34/42 | 4 (3/1) | 4/42 | 3/0/1/0 | 0 | 7/8 | 0 | 0/0 | 0 | 0 | S2×2 S3×2 S4×1 |
| fraction_third | 8 | 8/0/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 12 | 11/1/0 | 11/11 | 11/11 | 0 (0/0) | 0/11 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 134 | 123/11/0 | 110/123 | 104/123 | 11 (9/2) | 6/123 | 4/2/0/0 | 0 | 7/11 | 0 | 0/0 | 0 | 0 | S4×4 S7×1 |
| source_choice | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 17/17 | 0 | 0/0 | 0 | 0 | S5×2 |
| range | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 6 | 5/0/1 | 4/5 | 3/5 | 0 (0/0) | 1/5 | 1/0/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| unstated_amount | 9 | 9/0/0 | 8/9 | 8/9 | 0 (0/0) | 1/9 | 1/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 8 | 0/8/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 8/8 | 0 | 0/0 | 0 | 0 | S1×1 |
| count_unit | 59 | 56/3/0 | 40/56 | 36/56 | 8 (8/0) | 8/56 | 6/2/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| package_size | 22 | 21/1/0 | 13/21 | 13/21 | 3 (3/0) | 5/21 | 4/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| oz_vs_floz | 6 | 6/0/0 | 5/6 | 5/6 | 0 (0/0) | 1/6 | 1/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 7 | 7/0/0 | 3/7 | 3/7 | 0 (0/0) | 4/7 | 1/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 30 | 26/4/0 | 19/26 | 12/26 | 4 (3/1) | 5/26 | 5/0/0/0 | 0 | 2/4 | 0 | 0/0 | 0 | 0 | S4×2 S7×1 |
| percentage | 3 | 2/0/1 | 2/2 | 2/2 | 0 (0/0) | 0/2 | 0/0/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| price_annotation | 5 | 5/0/0 | 5/5 | 4/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 29 | 26/2/1 | 17/26 | 17/26 | 5 (4/1) | 5/26 | 5/0/0/0 | 0 | 2/2 | 0 | 0/1 | 0 | 0 | S1×2 S2×2 S3×2 S8×1 |
| approximate | 5 | 5/0/0 | 4/5 | 4/5 | 1 (1/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S7×1 |
| imprecise_unit | 12 | 10/2/0 | 5/10 | 5/10 | 2 (2/0) | 3/10 | 3/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S2×1 S3×1 |
| heading_non_ingredient | 24 | 0/0/24 | 0/0 | 0/0 | 2 (2/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 7/24 | 15 | 0 | S1×4 S8×2 |
| empty | 1 | 0/0/1 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 1/1 | 0 | 0 | 0 |
| unicode_text | 21 | 17/1/3 | 15/17 | 15/17 | 1 (1/0) | 2/17 | 0/0/2/0 | 0 | 0/1 | 0 | 1/3 | 2 | 0 | S1×1 S4×1 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 21 | 19/2/0 | 12/19 | 12/19 | 7 (3/4) | 1/19 | 1/0/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S4×1 |
| seasoning_lookalike | 17 | 15/2/0 | 14/15 | 14/15 | 1 (1/0) | 0/15 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | S2×1 S3×1 |
| seasoning_ordinary | 4 | 2/2/0 | 2/2 | 2/2 | 2 (2/0) | 0/2 | 0/0/0/0 | 0 | 0/2 | 0 | 0/0 | 0 | 0 | S4×2 |
| quart_pint_gallon | 8 | 6/2/0 | 4/6 | 4/6 | 1 (1/0) | 1/6 | 1/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 4 | 4/0/0 | 4/4 | 3/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 6 | 5/1/0 | 4/5 | 4/5 | 1 (1/0) | 1/5 | 0/1/0/0 | 0 | 0/1 | 0 | 0/0 | 0 | 0 | S4×1 |

##### By source — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 369 | 292/52/25 | 240/292 | 231/292 | 35 (29/6) | 29/292 | 20/6/2/1 | 0 | 42/52 | 0 | 8/25 | 15 | 0 | S1×5 S2×3 S3×6 S4×10 S5×2 S6×2 S7×5 S8×2 |

##### By repair family — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 75 | 52/23/0 | 30/52 | 30/52 | 11 (8/3) | 14/52 | 9/2/2/1 | 0 | 20/23 | 0 | 0/0 | 0 | 0 | S1×1 S2×3 S3×3 S4×3 |
| B | 51 | 27/24/0 | 25/27 | 17/27 | 6 (6/0) | 2/27 | 0/2/0/0 | 0 | 18/24 | 0 | 0/0 | 0 | 0 | S4×6 S5×2 |
| C | 56 | 55/1/0 | 29/55 | 29/55 | 15 (12/3) | 11/55 | 9/2/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S3×3 S6×2 S7×5 |
| D | 34 | 6/3/25 | 5/6 | 5/6 | 3 (3/0) | 1/6 | 1/0/0/0 | 0 | 2/3 | 0 | 8/25 | 15 | 0 | S1×4 S4×1 S8×2 |
| plain | 153 | 152/1/0 | 151/152 | 150/152 | 0 (0/0) | 1/152 | 1/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By CONTRACT-v1 §12 item exercised — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| §12.1 | 11 | 11/0/0 | 4/11 | 4/11 | 4 (3/1) | 3/11 | 3/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S2×2 S3×2 |
| §12.2 | 7 | 5/0/2 | 1/5 | 1/5 | 3 (1/2) | 1/5 | 0/1/0/0 | 0 | 0/0 | 0 | 0/2 | 2 | 0 | S1×1 S3×1 |
| §12.3 | 22 | 21/1/0 | 8/21 | 8/21 | 4 (3/1) | 9/21 | 9/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S7×2 |
| §12.4 | 32 | 32/0/0 | 19/32 | 18/32 | 10 (10/0) | 3/32 | 1/2/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×1 S7×5 |
| §12.5 | 2 | 2/0/0 | 0/2 | 0/2 | 1 (1/0) | 1/2 | 0/1/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S3×2 S6×2 |
| §12.6 | 14 | 9/5/0 | 7/9 | 7/9 | 2 (2/0) | 2/9 | 2/0/0/0 | 0 | 3/5 | 0 | 0/0 | 0 | 0 | S4×2 |
| §12.7 | 24 | 3/21/0 | 3/3 | 3/3 | 3 (3/0) | 0/3 | 0/0/0/0 | 0 | 18/21 | 0 | 0/0 | 0 | 0 | S4×3 S5×2 |
| §12.8 | 33 | 6/3/24 | 5/6 | 5/6 | 3 (3/0) | 1/6 | 1/0/0/0 | 0 | 2/3 | 0 | 7/24 | 15 | 0 | S1×4 S4×1 S8×2 |
| §12.9 | 8 | 7/1/0 | 6/7 | 6/7 | 0 (0/0) | 1/7 | 0/0/0/1 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S1×1 |
| §12.10 | 15 | 15/0/0 | 9/15 | 9/15 | 6 (2/4) | 0/15 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.11 | 15 | 12/3/0 | 10/12 | 3/12 | 3 (3/0) | 2/12 | 0/2/0/0 | 0 | 0/3 | 0 | 0/0 | 0 | 0 | S4×3 |
| §12.12 | 7 | 7/0/0 | 3/7 | 3/7 | 0 (0/0) | 4/7 | 1/3/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.13 | 12 | 10/2/0 | 8/10 | 8/10 | 0 (0/0) | 2/10 | 0/0/2/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| §12.14 | 3 | 0/3/0 | 0/0 | 0/0 | 1 (1/0) | 0/0 | 0/0/0/0 | 0 | 2/3 | 0 | 0/0 | 0 | 0 | S4×1 |
| no §12 item | 180 | 165/14/1 | 159/165 | 157/165 | 1 (1/0) | 5/165 | 5/0/0/0 | 0 | 14/14 | 0 | 1/1 | 0 | 0 | S2×1 |

##### By construction — holdout-v3 (fresh; acceptance set)

304 distinct construction(s); at most 2 line(s) per construction (the JSON report lists every construction).

| Construction | Cases | Classes | Severe |
|---|---|---|---|
| CUNIT OF W , NOTE \| A ready | ing-h3-0285 | C3a | — |
| DEC UNIT (AMT) W , NOTE \| A needs_review 12.6 new | ing-h3-0300 | C2 | S4 |
| DEC UNIT CONT CAP W \| C ready 12.3 new | ing-h3-0062 | C3a | — |
| DEC W UNIT CONT W \| C ready 12.3 new | ing-h3-0199 | C3a | — |
| DECO FRAC UNIT W \| A ready 12.13 new | ing-h3-0307 | C3c | — |
| DECO INT UNIT W \| A ready 12.13 new | ing-h3-0006, ing-h3-0337 | C3c, C1 | — |
| FRAC UNIT (AMT) W CUNIT \| A ready 12.6 | ing-h3-0258 | C3a | — |
| FRAC UNIT W AND W , NOTE \| B needs_review 12.7 new | ing-h3-0221 | C2 | S4 |
| FRAC UNIT W OR W , NOTE \| B needs_review 12.7 | ing-h3-0299 | C5b | — |
| FRAC UNIT W OR W \| B needs_review 12.7 | ing-h3-0033 | C5b | — |
| FRAC UNIT W OR W \| B needs_review 12.7 new | ing-h3-0083 | C5b | — |
| IMP OF W , FLAG \| A ready | ing-h3-0277 | C2 | S2 |
| IMP OF W \| A ready | ing-h3-0063, ing-h3-0087 | C3a, C3a | — |
| INT (AMT) CONT PART W \| C needs_review 12.3+12.6 new | ing-h3-0171 | C5b | — |
| INT (AMT) UNIT CAP W \| C ready 12.5 | ing-h3-0127 | C3b | S3 S6 |
| INT (AMT) W , NOTE \| C ready 12.3 new | ing-h3-0244 | C3a | — |
| INT (AMT) W \| C ready 12.3 new | ing-h3-0332 | C3a | — |
| INT (AMT) W \| C ready 12.3+12.4 new | ing-h3-0342 | C3a | — |
| INT CONT W (AMT) \| C ready 12.3 new | ing-h3-0123, ing-h3-0128 | C2, C1 | — |
| INT CUNIT , NOTE \| C ready 12.4 new | ing-h3-0181 | C3b | — |
| INT CUNIT W (AMT) \| C ready 12.4+12.3 new | ing-h3-0145 | C2 | S7 |
| INT CUNIT W , AMT-REMARK \| C ready 12.4+12.3 new | ing-h3-0297 | C2 | S7 |
| INT CUNIT W , NOTE \| C ready 12.4 new | ing-h3-0363 | C2 | S7 |
| INT CUNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0120 | C5b | — |
| INT CUNIT W \| C ready 12.4 new | ing-h3-0043 | C2 | S7 |
| INT FRAC UNIT SIZE W , NOTE \| C ready 12.10 | ing-h3-0331 | C2 | — |
| INT FRACWORD CONT W \| A ready 12.1 new | ing-h3-0051 | C2 | — |
| INT FRACWORD OF W \| A ready 12.1 new | ing-h3-0016 | C3a | — |
| INT FRACWORD UNIT PART CAP \| A ready 12.1 new | ing-h3-0354 | C3a | — |
| INT FRACWORD W \| A ready 12.1 new | ing-h3-0074, ing-h3-0253 | C2, C2 | S2 S3 |
| INT IMP W , NOTE \| plain ready | ing-h3-0180 | C3a | — |
| INT IMP W \| C ready 12.4 new | ing-h3-0124 | C2 | S3 S7 |
| INT SIZE CAP W \| C ready 12.10 | ing-h3-0110 | C2 | — |
| INT SIZE W (AMT) \| C ready 12.10+12.3 new | ing-h3-0011 | C2 | — |
| INT SIZE W CUNIT , NOTE \| C ready 12.4+12.10 new | ing-h3-0091 | C2 | — |
| INT SIZE W CUNIT \| C ready 12.4+12.10 | ing-h3-0241 | C2 | — |
| INT SIZE W \| A needs_review 12.14 new | ing-h3-0075 | C2 | S4 |
| INT UNIT (AMT) W , NOTE \| A needs_review 12.6 new | ing-h3-0004 | C2 | S4 |
| INT UNIT (AMT) W \| C ready 12.5 | ing-h3-0290 | C2 | S3 S6 |
| INT UNIT CAP W (P) \| B needs_review 12.11 new | ing-h3-0341 | C2 | S4 |
| INT UNIT CONT W \| C ready 12.3 new | ing-h3-0246 | C3a | — |
| INT UNIT INT W \| A ready 12.9 new | ing-h3-0015 | C3x | — |
| INT UNIT MINUS INT UNIT W \| A ready 12.12 | ing-h3-0017 | C3b | — |
| INT UNIT PLUS INT UNIT (AMT) W \| A ready 12.12+12.6 | ing-h3-0080 | C3a | — |
| INT UNIT W (AMT) \| B needs_review 12.11 | ing-h3-0326 | C2 | S4 |
| INT UNIT W , AMT-REMARK \| B needs_review 12.11 | ing-h3-0113 | C2 | S4 |
| INT UNIT W , NOTE , OR-REMARK \| B needs_review 12.7 new | ing-h3-0150 | C5b | S5 |
| INT UNIT W , NOTE \| B needs_review 12.7 new | ing-h3-0156 | C5b | — |
| INT UNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0086 | C5b | S5 |
| INT UNIT W , PLUS-REMARK \| B ready 12.11+12.12 new | ing-h3-0045 | C3b | — |
| INT UNIT W AND W \| B needs_review 12.7 new | ing-h3-0140, ing-h3-0311 | C2, C2 | S4 |
| INT UNIT W PLUS INT UNIT W \| B ready 12.11+12.12 new | ing-h3-0149 | C3b | — |
| INT W CUNIT (P) , NOTE \| C ready 12.4 | ing-h3-0282 | C2 | — |
| INT W CUNIT , NOTE \| C ready 12.4 | ing-h3-0109, ing-h3-0330 | C2, C2 | — |
| INT W \| D unsupported 12.8 new | ing-h3-0271 | C2 | S1 S8 |
| INT X NUMW W , NOTE \| D unsupported 12.2+12.8 new | ing-h3-0002 | C8 | — |
| INT X SIZE W , NOTE \| A ready 12.2+12.10 new | ing-h3-0035 | C2 | — |
| NUMWORD FRACWORD OF W \| A ready 12.1 new | ing-h3-0237 | C3a | — |
| NUMWORD FRACWORD W \| A ready 12.1 new | ing-h3-0272 | C2 | S2 S3 |
| NUMWORD NUMW W , NOTE \| D unsupported 12.8 new | ing-h3-0048 | C2 | S1 S8 |
| NUMWORD SIZEUNIT W \| C ready 12.3 new | ing-h3-0121, ing-h3-0329 | C3a, C3a | — |
| NUMWORD W \| A needs_review 12.9 new | ing-h3-0254 | C5b | S1 |
| SIZE CUNIT OF W \| A ready | ing-h3-0102 | C3a | — |
| SIZEUNIT CONT W PART W \| C ready 12.3 new | ing-h3-0072 | C3a | — |
| W (AMT) \| D needs_review 12.8 new | ing-h3-0003 | C2 | S4 |
| W (AMT) \| D unsupported 12.8 new | ing-h3-0088 | C8 | — |
| W (OPT) COLON W \| D ready 12.8 new | ing-h3-0248 | C3a | — |
| W (OPT) \| D unsupported 12.8 new | ing-h3-0211 | C8 | — |
| W , AMT-REMARK \| D unsupported 12.8 new | ing-h3-0270 | C8 | — |
| W COLON CAP \| D unsupported 12.8 new | ing-h3-0262, ing-h3-0325 | C8, C8 | — |
| W COLON NUMWORD NUMW W \| D unsupported 12.8 new | ing-h3-0204 | C8 | S1 |
| W COLON W \| D unsupported 12.8 new | ing-h3-0009, ing-h3-0314 | C7, C8 | — |
| W CONT \| D unsupported 12.8 new | ing-h3-0093 | C8 | — |
| W CUNIT (AMT) , NOTE \| A ready 12.2+12.4 new | ing-h3-0024 | C3b | — |
| W DEC W OF INT W INT W \| D unsupported 12.8 new | ing-h3-0196 | C8 | — |
| W INT COLON CAP W PART W \| D unsupported 12.8 | ing-h3-0296 | C8 | — |
| W NUMW (AMT) \| D unsupported 12.8 new | ing-h3-0018 | C8 | — |
| W X X \| D unsupported 12.2+12.8 new | ing-h3-0276 | C8 | S1 |
| W \| D unsupported 12.8 new | ing-h3-0114, ing-h3-0189 | C8, C8 | — |
| X IMP W \| A ready 12.2 new | ing-h3-0118 | C2 | S3 |
| X W \| A ready 12.2 new | ing-h3-0054 | C2 | — |

##### Acceptance — Gate G2 on holdout-v3 (fresh; acceptance set), engine `semantic-v1`

Basis: Gate G2 acceptance set (EVALUATION-PLAN-v3) — acceptance evidence only when FREEZE-v3.json exists and verifies holdout-v3 (see the freeze line).

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 240/292 (82.2%, 77.4%–86.2%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 266/292 (91.1%, 87.3%–93.8%); quantity 271/292 (92.8%, 89.3%–95.3%); unit 265/292 (90.8%, 86.9%–93.6%) | as A1, for each field (accepted name matches) | **not met** |
| A3 | high-severity false certainty = 0 | C2High 29/369 (7.9%, 5.5%–11.1%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 5/369 (1.4%, 0.6%–3.1%); S3 6/369 (1.6%, 0.8%–3.5%); S4 10/369 (2.7%, 1.5%–4.9%); S5 2/369 (0.5%, 0.1%–1.9%); S6 2/369 (0.5%, 0.1%–1.9%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 29/292 (9.9%, 7.0%–13.9%) | point estimate | **met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/369 (0.0%, ≤ 1.0%); engineError 0/369 (0.0%, ≤ 1.0%); invalidOutput 0/369 (0.0%, ≤ 1.0%); nondeterministic 0/369 (0.0%, ≤ 1.0%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v3 (fresh; acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases marked debatable: true in holdout-v3.jsonl (EVALUATION-PLAN-v3 §7 (a)): 4 excluded (ing-h3-0104, ing-h3-0211, ing-h3-0297, ing-h3-0311), 365 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 239/290 (82.4%, 77.6%–86.4%) | not met |
| A2 | name 265/290 (91.4%, 87.6%–94.1%); quantity 269/290 (92.8%, 89.2%–95.2%); unit 264/290 (91.0%, 87.2%–93.8%) | not met |
| A3 | C2High 27/365 (7.4%, 5.1%–10.5%) | not met |
| A4 | S1 5/365 (1.4%, 0.6%–3.2%); S3 6/365 (1.6%, 0.8%–3.5%); S4 9/365 (2.5%, 1.3%–4.6%); S5 2/365 (0.5%, 0.1%–2.0%); S6 2/365 (0.5%, 0.1%–2.0%) | not met |
| A5 | C3plusC4 29/290 (10.0%, 7.0%–14.0%) | met |

A1–A5 (c) without the cases marked reliesOnNewReading: true in holdout-v3.jsonl — the result under CONTRACT-v1 §7 alone (EVALUATION-PLAN-v3 §7 (c)): 126 excluded (ing-h3-0001, ing-h3-0002, ing-h3-0003, ing-h3-0004, ing-h3-0006, ing-h3-0007, ing-h3-0009, ing-h3-0011, ing-h3-0012, ing-h3-0014, ing-h3-0015, ing-h3-0016, ing-h3-0018, ing-h3-0022, ing-h3-0024, ing-h3-0035, ing-h3-0038, ing-h3-0039, ing-h3-0041, ing-h3-0043, ing-h3-0045, ing-h3-0046, ing-h3-0048, ing-h3-0049, ing-h3-0051, ing-h3-0053, ing-h3-0054, ing-h3-0057, ing-h3-0058, ing-h3-0062, ing-h3-0064, ing-h3-0065, ing-h3-0069, ing-h3-0072, ing-h3-0074, ing-h3-0075, ing-h3-0077, ing-h3-0083, ing-h3-0086, ing-h3-0088, ing-h3-0091, ing-h3-0093, ing-h3-0099, ing-h3-0104, ing-h3-0111, ing-h3-0114, ing-h3-0118, ing-h3-0120, ing-h3-0121, ing-h3-0123, ing-h3-0124, ing-h3-0125, ing-h3-0128, ing-h3-0138, ing-h3-0140, ing-h3-0145, ing-h3-0146, ing-h3-0149, ing-h3-0150, ing-h3-0151, ing-h3-0156, ing-h3-0167, ing-h3-0171, ing-h3-0177, ing-h3-0181, ing-h3-0184, ing-h3-0189, ing-h3-0193, ing-h3-0196, ing-h3-0199, ing-h3-0204, ing-h3-0207, ing-h3-0209, ing-h3-0211, ing-h3-0214, ing-h3-0215, ing-h3-0219, ing-h3-0221, ing-h3-0222, ing-h3-0225, ing-h3-0229, ing-h3-0236, ing-h3-0237, ing-h3-0244, ing-h3-0246, ing-h3-0248, ing-h3-0251, ing-h3-0253, ing-h3-0254, ing-h3-0256, ing-h3-0258, ing-h3-0259, ing-h3-0261, ing-h3-0262, ing-h3-0264, ing-h3-0267, ing-h3-0268, ing-h3-0269, ing-h3-0270, ing-h3-0271, ing-h3-0272, ing-h3-0276, ing-h3-0279, ing-h3-0297, ing-h3-0300, ing-h3-0301, ing-h3-0303, ing-h3-0306, ing-h3-0307, ing-h3-0311, ing-h3-0313, ing-h3-0314, ing-h3-0319, ing-h3-0325, ing-h3-0329, ing-h3-0332, ing-h3-0333, ing-h3-0337, ing-h3-0340, ing-h3-0341, ing-h3-0342, ing-h3-0350, ing-h3-0354, ing-h3-0356, ing-h3-0363, ing-h3-0369), 243 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 195/211 (92.4%, 88.0%–95.3%) | not met |
| A2 | name 204/211 (96.7%, 93.3%–98.4%); quantity 204/211 (96.7%, 93.3%–98.4%); unit 203/211 (96.2%, 92.7%–98.1%) | not met |
| A3 | C2High 8/243 (3.3%, 1.7%–6.4%) | not met |
| A4 | S1 0/243 (0.0%, ≤ 1.6%); S3 2/243 (0.8%, 0.2%–2.9%); S4 2/243 (0.8%, 0.2%–2.9%); S5 0/243 (0.0%, ≤ 1.6%); S6 2/243 (0.8%, 0.2%–2.9%) | not met |
| A5 | C3plusC4 8/211 (3.8%, 1.9%–7.3%) | met |

A1–A5 (d) without the cases listed in fixtures/EXPOSURE-AUDIT-v3.json (EVALUATION-PLAN-v3 §7 (d), §9.4) (audit of 2026-10-10, 3 matched id(s); method: Exact match after NFKC, lower case, whitespace collapse and trim, of every holdout-v3 input against 57972 exposed strings: the audit list of build_exposed_inputs.py (23321: exposed fixture sets, regression corpus, semantic-v2 test data and literals, Phase 2/2B review probes, implementation scratch probes) plus documentation/evidence markdown spans, lines and cells and every reviewer-R1 text file; run after the holdout-v3 freeze and before scoring (EVALUATION-PLAN-v3 §9.4; docs/table/evidence/2026-10-10-recipe-extraction-phase2b/holdout-v3/build_exposure_audit_v3.py)): 3 excluded (ing-h3-0114, ing-h3-0189, ing-h3-0276), 366 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 240/292 (82.2%, 77.4%–86.2%) | not met |
| A2 | name 266/292 (91.1%, 87.3%–93.8%); quantity 271/292 (92.8%, 89.3%–95.3%); unit 265/292 (90.8%, 86.9%–93.6%) | not met |
| A3 | C2High 29/366 (7.9%, 5.6%–11.2%) | not met |
| A4 | S1 4/366 (1.1%, 0.4%–2.8%); S3 6/366 (1.6%, 0.8%–3.5%); S4 10/366 (2.7%, 1.5%–5.0%); S5 2/366 (0.5%, 0.1%–2.0%); S6 2/366 (0.5%, 0.1%–2.0%) | not met |
| A5 | C3plusC4 29/292 (9.9%, 7.0%–13.9%) | met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 4 excluded (ing-h3-0020, ing-h3-0044, ing-h3-0191, ing-h3-0254), 48 needs_review lines kept — C5 38/48 (79.2%, 65.7%–88.3%) · C5a 30/48 · C5b 8/48 · C5c 0/48 · C5x 0/48 · C6 0/48 (0.0%, ≤ 7.4%) · S4 10/48 (20.8%, 11.7%–34.3%).

### Outcomes — engine `semantic-v2`

| Set | N | R/A/U | C1 core fields (of R) | C1+ all fields (of R) | C2 high/medium | C3 + C4 (of R) | C5 (of A) | C7 (of U) | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|
| holdout-v3 (fresh; acceptance set) | 369 | 292/52/25 | 286/292 (98.0%, 95.6%–99.1%) | 281/292 (96.2%, 93.4%–97.9%) | 4/0 | 5/292 (1.7%, 0.7%–4.0%) | 49/52 | 22/25 | 0 | S4×3 S7×1 |

#### holdout-v3 (fresh; acceptance set) — 369 lines (R 292, A 52, U 25)

| Outcome | n/N | Rate | 95% CI (Wilson) | Cases |
|---|---|---|---|---|
| C1 correct ready — core fields (of R) | 286/292 | 98.0% | 95.6%–99.1% | (in the JSON report) |
| C1+ fully correct — all fields (of R) | 281/292 | 96.2% | 93.4%–97.9% | (in the JSON report) |
| C1 with only non-core mismatches — low detail mismatch, not C2 (of R) | 5/292 | 1.7% | 0.7%–4.0% | ing-h3-0092, ing-h3-0145, ing-h3-0229, ing-h3-0252, ing-h3-0277 |
| **C2 incorrect ready** (of N) | 4/369 | 1.1% | 0.4%–2.8% |  |
| C2 — high false certainty (of N) | 4/369 | 1.1% | 0.4%–2.8% | ing-h3-0075, ing-h3-0113, ing-h3-0140, ing-h3-0297 |
| C2 — medium false certainty (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| C2 on ready labels (of R) | 1/292 | 0.3% | 0.1%–1.9% |  |
| C2 on needs_review labels (of A) | 3/52 | 5.8% | 2.0%–15.6% |  |
| C2 on unsupported labels (of U) | 0/25 | 0.0% | ≤ 13.3% |  |
| C3 unnecessary review (of R) | 5/292 | 1.7% | 0.7%–4.0% |  |
| C3a useful partial (of R) | 3/292 | 1.0% | 0.4%–3.0% | ing-h3-0197, ing-h3-0248, ing-h3-0333 |
| C3b wrong partial — review-only wrong pre-fill (of R) | 2/292 | 0.7% | 0.2%–2.5% | ing-h3-0089, ing-h3-0222 |
| C3c abstention (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3x food not named, amount read — not defined by the plan (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C4 unnecessary rejection (of R) | 0/292 | 0.0% | ≤ 1.3% |  |
| C3 + C4 (of R) | 5/292 | 1.7% | 0.7%–4.0% |  |
| C5 correct review (of A) | 49/52 | 94.2% | 84.4%–98.0% |  |
| C5a useful partial (of A) | 45/52 | 86.5% | 74.7%–93.3% | (in the JSON report) |
| C5b wrong partial — review-only wrong pre-fill (of A) | 1/52 | 1.9% | 0.3%–10.1% | ing-h3-0120 |
| C5c abstention (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C5x food not named, amount read — not defined by the plan (of A) | 3/52 | 5.8% | 2.0%–15.6% | ing-h3-0156, ing-h3-0221, ing-h3-0311 |
| C6 review rejected (of A) | 0/52 | 0.0% | ≤ 6.9% |  |
| C7 correct rejection (of U) | 22/25 | 88.0% | 70.0%–95.8% | (in the JSON report) |
| C8 unsupported reviewed (of U) | 3/25 | 12.0% | 4.2%–30.0% | ing-h3-0189, ing-h3-0211, ing-h3-0314 |
| **CE** engine error, invalid output or nondeterminism — no class, no S code (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: engine error (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: output fails the contract validator (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| CE dimension: nondeterministic — two parses differ (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S1 fabricated amount** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S2 wrong amount on a ready reading** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S3 cross-dimension** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S4 suppressed ambiguity** (of N) | 3/369 | 0.8% | 0.3%–2.4% | ing-h3-0075, ing-h3-0113, ing-h3-0140 |
| **S5 silent alternative choice** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S6 package representation changed** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| **S7 dropped material qualifier** (of N) | 1/369 | 0.3% | 0.1%–1.5% | ing-h3-0297 |
| **S8 ready on a non-ingredient** (of N) | 0/369 | 0.0% | ≤ 1.0% |  |
| Any severe error (of N) | 4/369 | 1.1% | 0.4%–2.8% |  |
| Invented option — an engine option matching no label (or accepted) option; review-only, informational (of N) | 1/369 | 0.3% | 0.1%–1.5% | ing-h3-0120 |
| Dropped option — a label option missing from an engine list that invents none; review-only, informational (of N) | 0/369 | 0.0% | ≤ 1.0% |  |

Strict matching: C1 284/292 (97.3%, 94.7%–98.6%) · C1+ 279/292 (95.5%, 92.5%–97.4%) · C2 6/369 (1.6%, 0.8%–3.5%). Lines whose class differs under strict matching: ing-h3-0077, ing-h3-0161.

| Field accuracy on R (any engine status; CE counts as not accurate) | Strict | Accepted |
|---|---|---|
| name | 287/292 (98.3%, 96.0%–99.3%) | 289/292 (99.0%, 97.0%–99.7%) |
| quantity | 289/292 (99.0%, 97.0%–99.7%) | 289/292 (99.0%, 97.0%–99.7%) |
| unit | 288/292 (98.6%, 96.5%–99.5%) | 288/292 (98.6%, 96.5%–99.5%) |

##### By category — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| integer_decimal | 225 | 194/30/1 | 189/194 | 185/194 | 4 (4/0) | 4/194 | 2/2/0/0 | 0 | 27/30 | 0 | 1/1 | 0 | 0 | S4×3 S7×1 |
| fraction | 50 | 42/8/0 | 42/42 | 42/42 | 0 (0/0) | 0/42 | 0/0/0/0 | 0 | 8/8 | 0 | 0/0 | 0 | 0 | 0 |
| fraction_third | 8 | 8/0/0 | 8/8 | 8/8 | 0 (0/0) | 0/8 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| mixed_vulgar | 12 | 11/1/0 | 11/11 | 11/11 | 0 (0/0) | 0/11 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| nested_parens | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| prep_note | 134 | 123/11/0 | 121/123 | 120/123 | 1 (1/0) | 2/123 | 1/1/0/0 | 0 | 10/11 | 0 | 0/0 | 0 | 0 | S4×1 |
| source_choice | 3 | 3/0/0 | 3/3 | 3/3 | 0 (0/0) | 0/3 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| ingredient_alternatives | 17 | 0/17/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 17/17 | 0 | 0/0 | 0 | 0 | 0 |
| range | 7 | 0/7/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 7/7 | 0 | 0/0 | 0 | 0 | 0 |
| optional | 6 | 5/0/1 | 4/5 | 3/5 | 0 (0/0) | 1/5 | 1/0/0/0 | 0 | 0/0 | 0 | 0/1 | 1 | 0 | 0 |
| unstated_amount | 9 | 9/0/0 | 8/9 | 8/9 | 0 (0/0) | 1/9 | 1/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_missing | 8 | 0/8/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 8/8 | 0 | 0/0 | 0 | 0 | 0 |
| count_unit | 59 | 56/3/0 | 54/56 | 53/56 | 0 (0/0) | 2/56 | 0/2/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| package_size | 22 | 21/1/0 | 21/21 | 21/21 | 0 (0/0) | 0/21 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| oz_vs_floz | 6 | 6/0/0 | 6/6 | 6/6 | 0 (0/0) | 0/6 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| compound_quantity | 7 | 7/0/0 | 7/7 | 7/7 | 0 (0/0) | 0/7 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| equivalent_quantity | 30 | 26/4/0 | 24/26 | 23/26 | 1 (1/0) | 1/26 | 1/0/0/0 | 0 | 4/4 | 0 | 0/0 | 0 | 0 | S7×1 |
| percentage | 3 | 2/0/1 | 2/2 | 2/2 | 0 (0/0) | 0/2 | 0/0/0/0 | 0 | 0/0 | 0 | 1/1 | 0 | 0 | 0 |
| price_annotation | 5 | 5/0/0 | 5/5 | 4/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| form_cooked_raw | 5 | 5/0/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| number_word | 29 | 26/2/1 | 25/26 | 25/26 | 0 (0/0) | 1/26 | 0/1/0/0 | 0 | 2/2 | 0 | 1/1 | 0 | 0 | 0 |
| approximate | 5 | 5/0/0 | 5/5 | 4/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| imprecise_unit | 12 | 10/2/0 | 10/10 | 9/10 | 0 (0/0) | 0/10 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| heading_non_ingredient | 24 | 0/0/24 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 21/24 | 3 | 0 | 0 |
| empty | 1 | 0/0/1 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 0/0 | 0 | 1/1 | 0 | 0 | 0 |
| unicode_text | 21 | 17/1/3 | 17/17 | 17/17 | 1 (1/0) | 0/17 | 0/0/0/0 | 0 | 0/1 | 0 | 3/3 | 0 | 0 | S4×1 |
| ambiguous_number_format | 3 | 0/3/0 | 0/0 | 0/0 | 0 (0/0) | 0/0 | 0/0/0/0 | 0 | 3/3 | 0 | 0/0 | 0 | 0 | 0 |
| size_word | 21 | 19/2/0 | 18/19 | 18/19 | 1 (1/0) | 1/19 | 1/0/0/0 | 0 | 1/2 | 0 | 0/0 | 0 | 0 | S4×1 |
| seasoning_lookalike | 17 | 15/2/0 | 15/15 | 15/15 | 0 (0/0) | 0/15 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| seasoning_ordinary | 4 | 2/2/0 | 2/2 | 2/2 | 0 (0/0) | 0/2 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| quart_pint_gallon | 8 | 6/2/0 | 6/6 | 6/6 | 0 (0/0) | 0/6 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| long_line | 4 | 4/0/0 | 4/4 | 4/4 | 0 (0/0) | 0/4 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| quantity_after_name | 6 | 5/1/0 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By source — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic_pattern | 369 | 292/52/25 | 286/292 | 281/292 | 4 (4/0) | 5/292 | 3/2/0/0 | 0 | 49/52 | 0 | 22/25 | 3 | 0 | S4×3 S7×1 |

##### By repair family — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 75 | 52/23/0 | 51/52 | 50/52 | 1 (1/0) | 1/52 | 0/1/0/0 | 0 | 22/23 | 0 | 0/0 | 0 | 0 | S4×1 |
| B | 51 | 27/24/0 | 27/27 | 25/27 | 2 (2/0) | 0/27 | 0/0/0/0 | 0 | 22/24 | 0 | 0/0 | 0 | 0 | S4×2 |
| C | 56 | 55/1/0 | 52/55 | 51/55 | 1 (1/0) | 2/55 | 2/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S7×1 |
| D | 34 | 6/3/25 | 5/6 | 5/6 | 0 (0/0) | 1/6 | 1/0/0/0 | 0 | 3/3 | 0 | 22/25 | 3 | 0 | 0 |
| plain | 153 | 152/1/0 | 151/152 | 150/152 | 0 (0/0) | 1/152 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |

##### By CONTRACT-v1 §12 item exercised — holdout-v3 (fresh; acceptance set)

| Group | N | R/A/U | C1 (of R) | C1+ (of R) | C2 (high/medium) | C3 + C4 (of R) | C3 a/b/c/x | C4 | C5 (of A) | C6 | C7 (of U) | C8 | CE | Severe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| §12.1 | 11 | 11/0/0 | 11/11 | 11/11 | 0 (0/0) | 0/11 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.2 | 7 | 5/0/2 | 5/5 | 5/5 | 0 (0/0) | 0/5 | 0/0/0/0 | 0 | 0/0 | 0 | 2/2 | 0 | 0 | 0 |
| §12.3 | 22 | 21/1/0 | 19/21 | 18/21 | 1 (1/0) | 1/21 | 1/0/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | S7×1 |
| §12.4 | 32 | 32/0/0 | 31/32 | 30/32 | 1 (1/0) | 0/32 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | S7×1 |
| §12.5 | 2 | 2/0/0 | 2/2 | 2/2 | 0 (0/0) | 0/2 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.6 | 14 | 9/5/0 | 9/9 | 9/9 | 0 (0/0) | 0/9 | 0/0/0/0 | 0 | 5/5 | 0 | 0/0 | 0 | 0 | 0 |
| §12.7 | 24 | 3/21/0 | 3/3 | 3/3 | 1 (1/0) | 0/3 | 0/0/0/0 | 0 | 20/21 | 0 | 0/0 | 0 | 0 | S4×1 |
| §12.8 | 33 | 6/3/24 | 5/6 | 5/6 | 0 (0/0) | 1/6 | 1/0/0/0 | 0 | 3/3 | 0 | 21/24 | 3 | 0 | 0 |
| §12.9 | 8 | 7/1/0 | 6/7 | 6/7 | 0 (0/0) | 1/7 | 0/1/0/0 | 0 | 1/1 | 0 | 0/0 | 0 | 0 | 0 |
| §12.10 | 15 | 15/0/0 | 15/15 | 15/15 | 0 (0/0) | 0/15 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.11 | 15 | 12/3/0 | 12/12 | 11/12 | 1 (1/0) | 0/12 | 0/0/0/0 | 0 | 2/3 | 0 | 0/0 | 0 | 0 | S4×1 |
| §12.12 | 7 | 7/0/0 | 7/7 | 7/7 | 0 (0/0) | 0/7 | 0/0/0/0 | 0 | 0/0 | 0 | 0/0 | 0 | 0 | 0 |
| §12.13 | 12 | 10/2/0 | 10/10 | 10/10 | 0 (0/0) | 0/10 | 0/0/0/0 | 0 | 2/2 | 0 | 0/0 | 0 | 0 | 0 |
| §12.14 | 3 | 0/3/0 | 0/0 | 0/0 | 1 (1/0) | 0/0 | 0/0/0/0 | 0 | 2/3 | 0 | 0/0 | 0 | 0 | S4×1 |
| no §12 item | 180 | 165/14/1 | 163/165 | 160/165 | 0 (0/0) | 2/165 | 1/1/0/0 | 0 | 14/14 | 0 | 1/1 | 0 | 0 | 0 |

##### By construction — holdout-v3 (fresh; acceptance set)

304 distinct construction(s); at most 2 line(s) per construction (the JSON report lists every construction).

| Construction | Cases | Classes | Severe |
|---|---|---|---|
| FRAC UNIT W AND W , NOTE \| B needs_review 12.7 new | ing-h3-0221 | C5x | — |
| INT (AMT) W \| C ready | ing-h3-0197 | C3a | — |
| INT CONT PART NUMWORD W CAP W \| A ready 12.9 new | ing-h3-0222 | C3b | — |
| INT CUNIT W , AMT-REMARK \| C ready 12.4+12.3 new | ing-h3-0297 | C2 | S7 |
| INT CUNIT W , NOTE \| plain ready | ing-h3-0030, ing-h3-0089 | C1, C3b | — |
| INT CUNIT W , OR-REMARK \| B needs_review 12.7 new | ing-h3-0120 | C5b | — |
| INT SIZE W \| A needs_review 12.14 new | ing-h3-0075 | C2 | S4 |
| INT UNIT W , AMT-REMARK \| B needs_review 12.11 | ing-h3-0113 | C2 | S4 |
| INT UNIT W , NOTE \| B needs_review 12.7 new | ing-h3-0156 | C5x | — |
| INT UNIT W AND W \| B needs_review 12.7 new | ing-h3-0140, ing-h3-0311 | C2, C5x | S4 |
| INT W (AMT) , NOTE \| C ready 12.3 new | ing-h3-0333 | C3a | — |
| W (OPT) COLON W \| D ready 12.8 new | ing-h3-0248 | C3a | — |
| W (OPT) \| D unsupported 12.8 new | ing-h3-0211 | C8 | — |
| W COLON W \| D unsupported 12.8 new | ing-h3-0009, ing-h3-0314 | C7, C8 | — |
| W \| D unsupported 12.8 new | ing-h3-0114, ing-h3-0189 | C7, C8 | — |

##### Acceptance — Gate G2 on holdout-v3 (fresh; acceptance set), engine `semantic-v2`

Basis: Gate G2 acceptance set (EVALUATION-PLAN-v3) — acceptance evidence only when FREEZE-v3.json exists and verifies holdout-v3 (see the freeze line).

| # | Criterion | Evidence | Rule | Status |
|---|---|---|---|---|
| A1 | C1 on R ≥ 98 % | C1 286/292 (98.0%, 95.6%–99.1%) | met on the point estimate; met with confidence only if the Wilson lower bound ≥ 98 % | **not met** |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | name 289/292 (99.0%, 97.0%–99.7%); quantity 289/292 (99.0%, 97.0%–99.7%); unit 288/292 (98.6%, 96.5%–99.5%) | as A1, for each field (accepted name matches) | **met** |
| A3 | high-severity false certainty = 0 | C2High 4/369 (1.1%, 0.4%–2.8%) | count of C2 lines with high severity, on all lines | **not met** |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | S1 0/369 (0.0%, ≤ 1.0%); S3 0/369 (0.0%, ≤ 1.0%); S4 3/369 (0.8%, 0.3%–2.4%); S5 0/369 (0.0%, ≤ 1.0%); S6 0/369 (0.0%, ≤ 1.0%) | on all lines | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | C3plusC4 5/292 (1.7%, 0.7%–4.0%) | point estimate | **met** |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | CE 0/369 (0.0%, ≤ 1.0%); engineError 0/369 (0.0%, ≤ 1.0%); invalidOutput 0/369 (0.0%, ≤ 1.0%); nondeterministic 0/369 (0.0%, ≤ 1.0%) | in the scorer: CE = 0 — no engine error, every output passes validateParsedIngredientV1, every line reads identically twice (any CE line → not met); the rest is recorded by the coordinator | **scorer checks met; rest checked outside the scorer** |
| A7 | the pesto regression (ing-dev-0001, tests/characterization/pesto.test.ts) passes as a normal test | — | recorded by the coordinator | **checked outside the scorer** |

A1 (point) and A2–A5 all met: **no**. A6 in the scorer (CE = 0): **met** (the rest of A6, and A7, are recorded outside the scorer).

##### Sensitivity — holdout-v3 (fresh; acceptance set) (informational, not the acceptance basis)

A1–A5 (a) without the cases marked debatable: true in holdout-v3.jsonl (EVALUATION-PLAN-v3 §7 (a)): 4 excluded (ing-h3-0104, ing-h3-0211, ing-h3-0297, ing-h3-0311), 365 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 285/290 (98.3%, 96.0%–99.3%) | met |
| A2 | name 288/290 (99.3%, 97.5%–99.8%); quantity 287/290 (99.0%, 97.0%–99.7%); unit 287/290 (99.0%, 97.0%–99.7%) | met |
| A3 | C2High 3/365 (0.8%, 0.3%–2.4%) | not met |
| A4 | S1 0/365 (0.0%, ≤ 1.0%); S3 0/365 (0.0%, ≤ 1.0%); S4 3/365 (0.8%, 0.3%–2.4%); S5 0/365 (0.0%, ≤ 1.0%); S6 0/365 (0.0%, ≤ 1.0%) | not met |
| A5 | C3plusC4 5/290 (1.7%, 0.7%–4.0%) | met |

A1–A5 (c) without the cases marked reliesOnNewReading: true in holdout-v3.jsonl — the result under CONTRACT-v1 §7 alone (EVALUATION-PLAN-v3 §7 (c)): 126 excluded (ing-h3-0001, ing-h3-0002, ing-h3-0003, ing-h3-0004, ing-h3-0006, ing-h3-0007, ing-h3-0009, ing-h3-0011, ing-h3-0012, ing-h3-0014, ing-h3-0015, ing-h3-0016, ing-h3-0018, ing-h3-0022, ing-h3-0024, ing-h3-0035, ing-h3-0038, ing-h3-0039, ing-h3-0041, ing-h3-0043, ing-h3-0045, ing-h3-0046, ing-h3-0048, ing-h3-0049, ing-h3-0051, ing-h3-0053, ing-h3-0054, ing-h3-0057, ing-h3-0058, ing-h3-0062, ing-h3-0064, ing-h3-0065, ing-h3-0069, ing-h3-0072, ing-h3-0074, ing-h3-0075, ing-h3-0077, ing-h3-0083, ing-h3-0086, ing-h3-0088, ing-h3-0091, ing-h3-0093, ing-h3-0099, ing-h3-0104, ing-h3-0111, ing-h3-0114, ing-h3-0118, ing-h3-0120, ing-h3-0121, ing-h3-0123, ing-h3-0124, ing-h3-0125, ing-h3-0128, ing-h3-0138, ing-h3-0140, ing-h3-0145, ing-h3-0146, ing-h3-0149, ing-h3-0150, ing-h3-0151, ing-h3-0156, ing-h3-0167, ing-h3-0171, ing-h3-0177, ing-h3-0181, ing-h3-0184, ing-h3-0189, ing-h3-0193, ing-h3-0196, ing-h3-0199, ing-h3-0204, ing-h3-0207, ing-h3-0209, ing-h3-0211, ing-h3-0214, ing-h3-0215, ing-h3-0219, ing-h3-0221, ing-h3-0222, ing-h3-0225, ing-h3-0229, ing-h3-0236, ing-h3-0237, ing-h3-0244, ing-h3-0246, ing-h3-0248, ing-h3-0251, ing-h3-0253, ing-h3-0254, ing-h3-0256, ing-h3-0258, ing-h3-0259, ing-h3-0261, ing-h3-0262, ing-h3-0264, ing-h3-0267, ing-h3-0268, ing-h3-0269, ing-h3-0270, ing-h3-0271, ing-h3-0272, ing-h3-0276, ing-h3-0279, ing-h3-0297, ing-h3-0300, ing-h3-0301, ing-h3-0303, ing-h3-0306, ing-h3-0307, ing-h3-0311, ing-h3-0313, ing-h3-0314, ing-h3-0319, ing-h3-0325, ing-h3-0329, ing-h3-0332, ing-h3-0333, ing-h3-0337, ing-h3-0340, ing-h3-0341, ing-h3-0342, ing-h3-0350, ing-h3-0354, ing-h3-0356, ing-h3-0363, ing-h3-0369), 243 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 209/211 (99.1%, 96.6%–99.7%) | met |
| A2 | name 210/211 (99.5%, 97.4%–99.9%); quantity 210/211 (99.5%, 97.4%–99.9%); unit 210/211 (99.5%, 97.4%–99.9%) | met |
| A3 | C2High 1/243 (0.4%, 0.1%–2.3%) | not met |
| A4 | S1 0/243 (0.0%, ≤ 1.6%); S3 0/243 (0.0%, ≤ 1.6%); S4 1/243 (0.4%, 0.1%–2.3%); S5 0/243 (0.0%, ≤ 1.6%); S6 0/243 (0.0%, ≤ 1.6%) | not met |
| A5 | C3plusC4 2/211 (0.9%, 0.3%–3.4%) | met |

A1–A5 (d) without the cases listed in fixtures/EXPOSURE-AUDIT-v3.json (EVALUATION-PLAN-v3 §7 (d), §9.4) (audit of 2026-10-10, 3 matched id(s); method: Exact match after NFKC, lower case, whitespace collapse and trim, of every holdout-v3 input against 57972 exposed strings: the audit list of build_exposed_inputs.py (23321: exposed fixture sets, regression corpus, semantic-v2 test data and literals, Phase 2/2B review probes, implementation scratch probes) plus documentation/evidence markdown spans, lines and cells and every reviewer-R1 text file; run after the holdout-v3 freeze and before scoring (EVALUATION-PLAN-v3 §9.4; docs/table/evidence/2026-10-10-recipe-extraction-phase2b/holdout-v3/build_exposure_audit_v3.py)): 3 excluded (ing-h3-0114, ing-h3-0189, ing-h3-0276), 366 lines kept. The acceptance table above uses every case.

| # | Evidence | Status (informational) |
|---|---|---|
| A1 | C1 286/292 (98.0%, 95.6%–99.1%) | not met |
| A2 | name 289/292 (99.0%, 97.0%–99.7%); quantity 289/292 (99.0%, 97.0%–99.7%); unit 288/292 (98.6%, 96.5%–99.5%) | met |
| A3 | C2High 4/366 (1.1%, 0.4%–2.8%) | not met |
| A4 | S1 0/366 (0.0%, ≤ 1.0%); S3 0/366 (0.0%, ≤ 1.0%); S4 3/366 (0.8%, 0.3%–2.4%); S5 0/366 (0.0%, ≤ 1.0%); S6 0/366 (0.0%, ≤ 1.0%) | not met |
| A5 | C3plusC4 5/292 (1.7%, 0.7%–4.0%) | met |

needs_review labels with no amount: label quantity and unit null and alternatives empty (EVALUATION-PLAN-v2 change log 3(b); SCORE-01): 4 excluded (ing-h3-0020, ing-h3-0044, ing-h3-0191, ing-h3-0254), 48 needs_review lines kept — C5 45/48 (93.8%, 83.2%–97.9%) · C5a 41/48 · C5b 1/48 · C5c 0/48 · C5x 3/48 · C6 0/48 (0.0%, ≤ 7.4%) · S4 3/48 (6.3%, 2.1%–16.8%).

## Runtime (non-deterministic — not part of the JSON report)

| Run | Items | Total ms | ms per item |
|---|---|---|---|
| ingredients · legacy-table-import-2 | 369 | 96.1 | 0.260 |
| ingredients · legacy-table-import-2+suggestion | 369 | 59.9 | 0.162 |
| ingredients · semantic-v1 | 369 | 134.1 | 0.363 |
| ingredients · semantic-v2 | 369 | 164.7 | 0.446 |

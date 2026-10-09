# Recipe Extraction Lab — benchmark v1 (baseline)

_2026-10-09. Offline, fixture-only. Code identity: `3ca998a` (clean tree). Report: `docs/table/evidence/2026-10-09-recipe-extraction-lab/verify-3ca998a/benchmark-report.{json,md}`
(JSON SHA-256 `670cbd4e5ee7839bbbd066019482e9778a9114be4e223cb34c0cecc8879f1e9a`, byte-identical on a second run)._

```bash
cd packages/recipe-extraction && npm run bench -- --pages --out-json report.json --out-md report.md
```

## 1. What is measured

| Corpus | Size | Provenance |
|---|---|---|
| Ingredient lines, dev | 182 (152 labelled `ready`, 22 `needs_review`, 8 `unsupported`) | synthetic patterns written for this corpus; 1 owner-reported line (pesto); 8 inputs borrowed from Table's own synthetic test page |
| Ingredient lines, **holdout** | 128 (104 ready, 18 needs_review, 6 unsupported) | synthetic, unseen variants of every category; **frozen** in `47ebce6` before any scorer existed |
| Pages, dev / holdout | 10 / 5 synthetic HTML pages (14 expected recipes) | invented pages on reserved example domains; no real content or photos |

33 categories (each ≥ 3 dev, ≥ 2 holdout cases): fractions incl. thirds, mixed/vulgar, nested parentheses, sourcing
remarks vs ingredient alternatives, ranges, optional/to-taste, count units, packaged sizes (4 forms), oz vs fl oz,
compound and restated amounts, percentages, prices, cooked/raw, number words, approximate, imprecise units,
headings, empty, Unicode, decimal commas, size words, seasoning lookalikes vs ordinary salt/pepper, quarts,
long lines, amount-after-name. Labels follow `CONTRACT-v1.md` §7 and were written **blind** (no parser was run on
them). Holdout freeze: `holdout.jsonl` `7ddd898e…`, holdout page labels `d6807cf6…`, five page files —
`fixtures/FREEZE.json`; checked on every run ("Holdout freeze: verified").

**Engines scored.** `legacy-table-import-2` is the frozen copy of Table's parser at `cb7b56e`;
`tests/parity/benchmark-corpus.test.ts` proves it returns *exactly* what Table's live `parseIngredientLine` /
`extractRecipes` return on every benchmark line and page. So **the baseline below is Table's current behaviour**,
and in Phase 1 **the package's results are the same numbers** — Phase 1 delivered parity, not better semantics.
`legacy-table-import-2+suggestion` adds the one-click suggestion a member could accept today.

## 2. Baseline — `legacy-table-import-2` (= Table import 2 = package default in Phase 1)

| Metric | Overall | dev | **holdout** |
|---|---|---|---|
| Core pass (status + name + quantity + unit), ready-labelled lines | 91/256 = 35.5% (29.9–41.6) | 54/152 = 35.5% | **37/104 = 35.6% (27.0–45.1)** |
| Name correct, ready-labelled | 111/256 = 43.4% | 65/152 | **46/104 = 44.2%** |
| Quantity correct, ready-labelled | 148/256 = 57.8% | 87/152 | **61/104 = 58.7%** |
| Unit correct, ready-labelled | 120/256 = 46.9% | 71/152 | **49/104 = 47.1%** |
| Review rate (engine not ready), all lines | 209/310 = 67.4% | 122/182 | **87/128 = 68.0%** |
| **Unnecessary review** (label ready, engine not) | 155/256 = 60.6% (54.4–66.3) | 92/152 | **63/104 = 60.6%** |
| False certainty (engine ready, reading wrong) — high / medium / low | 1 / 9 / 0 of 310 | 1 / 5 / 0 | **0 / 4 / 0 of 128** |
| Suppressed ambiguity (label not ready, engine ready) | 0/54 | 0/30 | 0/24 |
| Fabricated quantity (amount stated where none exists) | 0/52 | 0/29 | 0/23 |
| Cross-dimension (e.g. oz vs fl oz) | 0/266 | 0/157 | 0/109 |

95% Wilson intervals in parentheses (all in the report). Reading: today's importer is **safe but unhelpful** —
it almost never claims a wrong certainty or invents an amount, but it sends 3 of every 5 perfectly clear lines
to a person, and on those lines the review form is often pre-filled with the amount inside the name.

By category (all 310 lines, core pass): thirds 0/20, nested parentheses 0/9, sourcing remarks 0/13, count units
0/29, packaged sizes 0/17, compound amounts 0/9, restated amounts 0/11, percentages 0/6, number words 0/14,
quarts 0/8, imprecise units 0/9, approximate 0/7; integers/decimals 13/15, oz-vs-fl-oz 12/14, lookalike
seasonings 14/18.

**The 10 false certainties** (lines Table marks parsed and would default to *Use*, wrongly):
- nested parentheses corrupt a parsed name: `1/2 cup chicken stock (low-sodium (if possible))` → name
  `chicken stock (low-sodium )`; same for `ricotta (whole milk (not part-skim))` — a separate grocery key;
- `3 garlic cloves, minced` → 3 *each* "garlic cloves" (counted as high severity by the scorer's rule "wrong unit on a
  ready line"; the count itself is right);
- 7 lines keep cooked/raw/uncooked inside the name (`cooked rice`) while also setting `form`; contract §7.6 moves
  that word to `form` only. This is a naming-policy difference rather than a wrong amount.

## 3. One-click suggestions — `legacy-table-import-2+suggestion`

If a member accepted every suggestion, field matches would rise (name 197/310, quantity 198/310, unit 198/310)
but the suggestions themselves are wrong in characteristic ways: thirds become `0.3333` (never equal to 1/3);
`1-1/2 cups milk` is proposed as **1 cup**; `milk or cream` silently becomes milk; and every container with a stated
size is multiplied into net weight (`2 (15 oz) cans` → 30 oz), which the contract scores as **15 cross-dimension
readings** (count of cans → mass). Suggestions never change status, so status/core pass equal the baseline.

## 4. Pages — `extractRecipePage` (legacy page reader)

| Metric | Overall | holdout |
|---|---|---|
| Recipe detection precision / recall | 12/12 · 12/12 | 4/4 · 4/4 |
| Candidate count | 15/15 | 5/5 |
| Ingredient list exact | 14/14 | 5/5 |
| Every candidate field matches | 10/14 = 71.4% (45.4–88.3) | 4/5 |
| Expected diagnostics present · `retention = not_decided` | 15/15 · 15/15 | 5/5 · 5/5 |

Remaining page misses are genuine baseline limits: servings from item yields (`12 muffins`, `16 bars`,
`24 cookies` → null; Table only accepts serving words), microdata `url` not read, and a declared URL's
`#fragment` dropped by Table's link normalization (two recipes on one page lose which one is meant).

## 5. The pesto line

`ing-dev-0001` `1/3 cup pesto (homemade (or store-bought))`: baseline `needs_review`, name
`1/3 cup pesto (homemade )`, quantity/unit null, note `or store-bought` — **not repaired** (Phase 2). The target
is held as an expected failure in `tests/characterization/pesto.test.ts`; it turns red the moment the default
engine passes, forcing the test to become a normal assertion. The holdout has four unseen lines of the same family
(`ing-hold-0019`–`0022`), all failing today.

## 6. Proposed Gate G2 targets (from the plan) and what this corpus can prove

On **holdout ready-labelled** lines: core pass and name/quantity/unit ≥ 98%; **zero** high-severity false
certainty, fabricated quantity and cross-dimension readings; suppressed ambiguity 0; unnecessary review ≤ 10%.
Honest limit: with 104 holdout ready lines, even 104/104 gives a Wilson lower bound of 96.4%, so the current
holdout **cannot certify 98%**. Certifying it needs ≥ 189 ready-labelled holdout lines at a perfect score (more if
any miss) — Phase 2 should add a second, independently written holdout before claiming G2.

## 7. Limitations and hygiene

- Synthetic and single-labeller: one worker wrote all labels from the contract; no inter-annotator agreement.
  The integration owner reviewed every label (dev and holdout) for consistency with the contract and changed none
  of their meanings; one dev fixture-host correction is logged in `fixtures/LABEL-CHANGES.md`.
- Because the integration owner has read the holdout, a Phase 2 engine written in this same session is not blind
  to it. Mitigation proposed: Phase 2 parser work by a worker that never opens `holdout.jsonl`, and the second
  holdout (§6) written by a separate worker after that engine is frozen.
- Label-policy questions recorded by the labeller (not settled by §7): `fresh or frozen peas` read as a choice;
  count noun after the food (`3 garlic cloves`) is still the unit; `(1 stick)` is an equivalent; zero/`1,5`
  amounts keep unit and name; servings from item yields. They are documented per case in `rationale`.
- Not representative of real-world frequency: the corpus over-samples hard cases on purpose. Real-page quality is
  Phase 5 (owner-gated).
- Runtime (non-deterministic): ~0.15 ms per line, ~1.3 ms per page on this container.

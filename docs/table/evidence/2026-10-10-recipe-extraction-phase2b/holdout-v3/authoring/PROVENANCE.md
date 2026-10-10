# holdout-v3 — provenance (evaluation worker, Phase 2B, 2026-10-10)

File: `work/holdout-v3.jsonl` (369 cases, split `holdout3`, ids `ing-h3-0001` … `ing-h3-0369`)
SHA-256: `c31382a33d9a998f40ecfe5f5d91f553bff53e059bacd0bba447c4cd1a48ec93`
(`fixtures/ingredients/holdout-v3.jsonl` is a byte-identical copy, used only for the format check.)

This record holds counts and method only; it quotes no case input or label.

## Counts

| Status | Cases |
|---|---|
| ready | 292 |
| needs_review | 52 |
| unsupported | 25 |
| **total** | **369** |

Plan §8 minimums (≥ 260 lines, ≥ 200 ready, ≥ 40 needs_review, ≥ 15 unsupported): met. Target ~360: 369.

| Family | Cases | ready | needs_review | unsupported |
|---|---|---|---|---|
| plain | 153 (41.5 %) | 152 | 1 | 0 |
| A quantity syntax | 75 | 52 | 23 | 0 |
| B alternatives and notes | 51 | 27 | 24 | 0 |
| C count units, packages, qualifiers | 56 | 55 | 1 | 0 |
| D non-ingredient lines | 34 | 6 | 3 | 25 |

`contract12` (a case may list several items; 180 cases list none):

| 12.1 | 12.2 | 12.3 | 12.4 | 12.5 | 12.6 | 12.7 | 12.8 | 12.9 | 12.10 | 12.11 | 12.12 | 12.13 | 12.14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 11 | 7 | 22 | 32 | 2 | 14 | 24 | 33 | 8 | 15 | 15 | 7 | 12 | 3 |

- §12.15 (unit with no number): 14 cases cite it in their rationale; it cannot be recorded in `contract12`, whose frozen
  vocabulary is "12.1" … "12.14" (`bench/types.ts`). 2 of them (`ing-h3-0102`, `ing-h3-0285`) rely on §12.15's *new*
  reading (a singular count unit with no number reads as one) and therefore carry `reliesOnNewReading: false` only because
  the loader requires a non-restated item from that vocabulary for `true`. See "Decisions" below.
- §12.A amendments are recorded under their parent items (A1/A5 → 12.4, A2 → 12.6, A3 → 12.11, A4 → 12.7, A6 → 12.3) and
  named in the rationale. Cases whose rationale cites each amendment: A1 11, A2 3, A3 8, A4 4, A5 2, A6 6.
- `reliesOnNewReading: true`: 109. `debatable: true`: 2 (`ing-h3-0297`, `ing-h3-0311`; both contract-named debatable
  shapes, labelled with one defensible reading). Every other contract-named debatable shape was left out.
- `accept` present on 33 cases (leading participles / `fresh` herbs / temperature words per the labelling guide;
  §12.7(b)–(d) accepted option lists; the as-read unknown unit word in note for §12.14 lines).
- Severity: high 289, medium 63, low 17. seasoningClass: lookalike 15, ordinary_salt 5, ordinary_black_pepper 1, null 348.

Categories (every CONTRACT category tag is present):

| tag | n | tag | n | tag | n |
|---|---|---|---|---|---|
| integer_decimal | 225 | fraction | 50 | fraction_third | 8 |
| mixed_vulgar | 12 | nested_parens | 4 | prep_note | 134 |
| source_choice | 3 | ingredient_alternatives | 17 | range | 7 |
| optional | 6 | unstated_amount | 9 | quantity_missing | 8 |
| count_unit | 58 | package_size | 22 | oz_vs_floz | 6 |
| compound_quantity | 7 | equivalent_quantity | 30 | percentage | 3 |
| price_annotation | 5 | form_cooked_raw | 5 | number_word | 29 |
| approximate | 5 | imprecise_unit | 12 | heading_non_ingredient | 24 |
| empty | 1 | unicode_text | 21 | ambiguous_number_format | 3 |
| size_word | 21 | seasoning_lookalike | 15 | seasoning_ordinary | 6 |
| quart_pint_gallon | 8 | long_line | 4 | quantity_after_name | 6 |

## Constructions

- `construction` = the line's mechanical surface shape plus the reading it tests, e.g. `INT UNIT W , NOTE | plain ready`
  or `INT W CUNIT , NOTE | C ready 12.4 new`. The shape (`work/shape.py`) collapses every food word to `W`, every unit
  spelling to `UNIT`/`CUNIT`/`CONT`/`IMP`, and every comma remark to `NOTE`, so swapping a food word never makes a new
  construction. **304 distinct constructions; none is used more than twice.**
- For transparency: on the surface shape alone (reading class ignored) there are 262 distinct shapes; 18 of them are
  shared by 3–6 cases (68 cases) whose readings differ (e.g. a bare heading, a bare non-food item and a bare specific food
  all have the shape `W`; a passing and a failing §12.6 restatement share `INT UNIT (AMT) W`).
- 77 drafted lines were rewritten or dropped to satisfy the at-most-twice rule (not exposure-related).

## Deduplication against `reference/exposed-inputs-dedup.tsv`

Normalization as in the TSV (NFKC, lowercase, whitespace runs collapsed). 851 lines were drafted in total; removed:

| Reason | Removed |
|---|---|
| exact normalized match with an exposed input | 83 |
| near copy, automatic: similarity ratio ≥ 0.85 (difflib, normalized) or identical once digits are masked | 233 |
| near copy, by review: ratio 0.80–0.85 and the same construction with a small change (number, word order, one food word) | 89 |
| **total removed for exposure** | **405** |

Final file: 0 exact matches, 0 near copies at ratio ≥ 0.85 or digit-masked identity. 36 cases have an exposed string at
ratio 0.80–0.85; each was reviewed and kept because its construction differs from the exposed string (the tested feature
— decoration, range, restatement, multiplier, vague amount, size word — is absent there). The empty-line case cannot be
meaningfully deduplicated (the TSV lists no empty or whitespace-only string).

## How the lines were written

- Hand-written synthetic lines only (`source.kind` `synthetic_pattern`, author "evaluation worker (Phase 2B)"): invented
  realistic lines with varied foods, regional terms (UK, Australian, South Asian, Mexican, East Asian, US South/Southwest)
  and brands where natural. No network, no external AI, no scraping, no app-test input.
- Labels were written from CONTRACT-v1 §7, §12 and §12.A and the labelling guide; each rationale argues from contract
  section numbers (and frozen-convention ids the contract cites), never from an engine.
- The cases live in `work/cases*.py`; `work/author.py` builds the JSONL deterministically (fixed-seed interleaving, then
  ids). The only computation besides that is my own arithmetic: the §12.6 restatement test (7 % and the A2 half-up
  allowance, registry base values) is asserted for every restatement used, and compound sums are checked by hand.
- Checks: `work/dedup.py` (exposure), `work/shape.py` (construction rule), `work/stats.py` (coverage), category/label
  self-consistency checks, and the format check below.
- **Format check:** the scorer worktree's own loader (`/home/user/rx2b-scorer/packages/recipe-extraction/bench/labels.ts`,
  holdout3 rules) run on the fixtures copy via `tools/validate.ts` (`npx tsx`, from the worktree, which contains no
  candidate): valid, 369 cases. Nothing was written into the worktree.

## What I read and did not read

Read: `reference/CONTRACT-v1.md` (§7, §12, §12.A, and the rest), `reference/LABELLING-GUIDE.md`, `reference/label-types.ts`,
`reference/EVALUATION-PLAN-v3.md` (including change log item 6, which names the categories of the final candidate
review's weak spots — I did not target them beyond the coverage the plan requires), `reference/holdout-v2-format-example.jsonl`,
and `reference/exposed-inputs-dedup.tsv` (used mechanically; during review I saw the exposed strings closest to my
flagged drafts, which include strings from the sources the TSV lists). From my own scorer worktree: `src/contract.ts`
(`UNIT_REGISTRY` unit codes and base sizes) and `bench/labels.ts` / `bench/types.ts` (the loader's holdout3 rules).

Did not read or run: the candidate (`src/ingredient/semantic-v2/**`, `tests/semantic-v2/**`), any review or evidence about
it, any engine output. No engine (legacy, `semantic-v1`, `semantic-v2`, Table's) was run on any holdout-v3 input.
Holdout-v3 inputs and labels exist only in this workspace (`work/`, `fixtures/`).

## Decisions for the coordinator

1. **§12.15 is outside the frozen `contract12` vocabulary** ("12.1" … "12.14"). Its 14 cases list no §12.15 item, so the
   per-§12-item breakdown cannot show it, and the 2 cases that rely on §12.15's new reading cannot be marked
   `reliesOnNewReading: true` (the loader requires a non-restated item from the vocabulary). Options: extend the
   vocabulary with "12.15" (a `bench/types.ts` change, before the freeze) and I set those fields; or leave as is
   (sensitivity (c) then keeps those 2 cases).
2. §12.A amendments recorded under their parent items (A1/A5 → 12.4, A2 → 12.6, A3 → 12.11, A4 → 12.7, A6 → 12.3): confirm.
3. `construction` is mechanical (surface shape + reading class), see above; confirm this granularity for the
   at-most-twice rule.

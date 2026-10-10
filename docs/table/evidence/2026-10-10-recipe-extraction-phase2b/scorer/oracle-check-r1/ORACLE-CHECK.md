# R1 oracle check — outcomes v3 oracles (Phase 2B scorer)

Reviewer R1, read-only. Clone `/home/user/rx2b-r1/repo` at `2130dc3` (clean apart from the required `node_modules` symlink).
Oracle file checked: `packages/recipe-extraction/bench/__tests__/oracles-v3.json` (SHA-256 `23562325…cbf11`, 71 oracles).

## 1. What I ran

| Step | Command (from `repo/packages/recipe-extraction`) | Output |
|---|---|---|
| Independent recomputation of all 71 oracles | `npx tsx /home/user/rx2b-r1/oracle-check.ts bench/__tests__/oracles-v3.json --json …` | `oracle-check-run.txt`, `oracle-check-results.json` |
| Discrimination self-test (28 deliberate breaks of my own checker) | `R1_MUT=<name> npx tsx /home/user/rx2b-r1/oracle-check.ts …` | `self-mutations.txt` |
| Coverage matrix and `covers`-tag check (from my results, not the file's claims) | `node scripts/coverage.mjs` | `coverage-run.txt` |
| Proposed extra oracles, recomputed and run against the surviving breaks | `npx tsx … /home/user/rx2b-r1/proposed-oracles.json` | `proposed-oracles.json`, `proposed-oracles-run.txt` |
| SCORE-01 bare no-amount sets on frozen labels | `node scripts/score01.mjs fixtures/ingredients` | `score01-run.txt` |
| Independent CE census, historical engines (2 parses × full validator) | `npx tsx scripts/ce-census.ts` | `ce-census-run.txt` |
| Package oracle test, as a cross-check only (after my recomputation) | `npx vitest run --config vitest.config.ts bench/__tests__/oracles-v3.test.ts` | 75/75 passed (`vitest-oracles-run.txt`) |

Sources used for the rules: EVALUATION-PLAN-v3 §3–§5 and §7(b); EVALUATION-PLAN-v2 §3–§5 and change-log readings 1 and 3(b).
Reading 1 adopts the scorer's `INTERPRETATION` "verbatim". I took that text from the **historical report**
(`evidence/2026-10-09-…/evaluation-56eafe4/benchmark-report.json` → `outcomes.interpretation`), not from `bench/`. I also used
CONTRACT-v1 §2, §2.1, §7, §8, §9 and §12, and the oracle file's own README (its output shorthand).
Imports: `src/contract.ts` (`UNIT_REGISTRY`) and `src/validate.ts` only. The CE census also imports `src/ingredient/engines`,
which is engine code, not scorer code. **Nothing under `bench/` was imported or read for logic**, and since there were no
disagreements, I did not open `bench/` code afterwards either.

## 2. Checker design (`/home/user/rx2b-r1/oracle-check.ts`)

- **Building the output.** The checker expands the oracle shorthand into a complete `ParsedIngredientV1`, following the README
  defaults: raw = normalized = input; default reasons per status; quantity `n`/`n/d`/`w n/d`/`a..b`; unit
  `{canonical, registry dimension, source=code}`; `"<q> <unit>"` package size. Objects, arrays, numbers and unknown keys are
  copied as they are.
- **Exact quantities.** I use my own BigInt rationals.
- **Parses.** `output` gives two identical parses; `throws` gives two throws; `parses` is used as written.
- **CE (plan v3 §4)** is decided first:
  - `engineError`: any parse threw.
  - `nondeterministic`: the two complete results are not deep-equal.
  - `invalid`: `validateParsedIngredientV1` reports a problem for any returned output.
  - Any of the three gives CE: no class, no sub-class, no severity, no S code, strict = CE. There is no coercion.
- **§9 comparison.**
  - name: NFKC, lowercase, collapsed whitespace, trimmed, edge `\p{P}` trimmed.
  - note: the same, then a sorted token bag with `()`, `,`, `;`, `:` ignored.
  - quantity: exact rational, ranges at both ends, exact ≠ range.
  - unit: canonical code. packageSize: code + exact amount.
  - alternatives: a set of normalized names. equivalents: a multiset of (code, value).
  - Every other field: equality.
  - The accepted basis also counts any value in `accept[field]`, including `null`. The strict basis ignores `accept`.
- **Classes (v2 §4).**
  - Engine `ready`: C1 if the label is ready and every core field matches (status, name, quantity, unit, packageSize), else C2.
  - Engine `needs_review` / `unsupported`: C3/C4 on a ready label, C5/C6 on needs_review, C8/C7 on unsupported.
  - C1+ = C1 and every field matches. Detail-only = C1 and not C1+.
- **Sub-classes (reading 1)** are decided in the order b → c → a → x.
  - b: a non-null name, quantity, unit or packageSize, or a non-empty alternatives list, fails to match (on the accepted basis).
  - c: name, quantity and unit are all null and no alternatives were read.
  - a: the name is non-null, or the label is a choice and the options were read (they matched, since b did not fire).
  - x: otherwise.
- **S codes (v2 §5 + reading 1).**
  - S1: label quantity null, engine quantity non-null; any status.
  - S2: engine ready, label quantity non-null, quantity not matched (null counts as differing).
  - S3: unit dimensions differ, or package-size unit dimensions differ, both present.
  - S4: label needs_review, engine ready.
  - S5: engine has no alternatives and its name equals an option of the label list or of any accepted list with ≥ 2 options.
  - S6: label package present, engine package absent, engine unit mass/volume, engine quantity non-null. The quantity condition
    is my reading; see §3, A4.
  - S7: ready on a ready label, name not matched on the accepted basis, engine words ⊊ label words.
  - S8: label unsupported, engine ready.
- **Severity (C2 only).** High if any of S2–S8, or a wrong unit or package size. Medium if only the name is wrong. Anything
  else is high (reading 1's leftover S1 case).
- **SCORE-01.** `bareNoAmount` = label needs_review ∧ quantity null ∧ unit null ∧ alternatives empty. It is a label property,
  so it is also computed for CE lines.
- **Informational.** Invented = an offered option outside every label or accepted list. Dropped = no option invented and the
  offered set is a proper subset of a label list. Computed only when the offered list is non-empty and unmatched.

## 3. Results and disagreements

**71/71 oracles agree with my checker on every recorded field**: outcome, partial, c1plus, detailMismatch, falseCertainty,
severe, strict, ce dimensions, bareNoAmount, inventedOption and droppedOption. Fields an oracle omits were compared at their
documented defaults. No oracle depends on my S6 quantity choice: the S6 variant changes nothing.

| # | Oracle(s) | Point | Who is right | Rule |
|---|---|---|---|---|
| — | — | **No disagreement in any expected value** | — | — |
| A1 | O27, O28, O29, O38 | The expected values depend on reading 1, not on the §4 table text. Under the literal §4 text, O27 would be C5x and O28/O29/O38 would be C5x/C5x/C3x, because alternatives are not a core field (§3) and "C3a: name non-null". | Oracles (the plan adopts reading 1) | Reading 1: "a non-empty alternatives list is also compared … a = … name non-null, or, on a choice-of-ingredients label, the options matched" |
| A2 | O28, O29 | `inventedOption` / `droppedOption` are not defined in the plan. O28 has "kale" missing but `droppedOption` false, which implies dropped excludes invented. The calc does not say so. | Ambiguity (informational only, no acceptance effect) | Plan v3 §7 ("invented or dropped options kept visible"); CONTRACT §12.7 ("never dropped, merged or invented") |
| A3 | (none yet) | The plan does not settle whether `ce.invalid` is set when only the second parse is invalid. I read "an output that fails" as either parse. The outcome is CE either way. | Ambiguity (dimension flag only) | Plan v3 §4 CE bullet |
| A4 | (none yet) | S6 when the engine's mass/volume unit comes with a **null** quantity ("states the amount in a mass/volume unit"). This can arise on §12.3 lines (`15 oz cans beans`) and S6 counts for A4. | Ambiguity; the coordinator should pin it with an oracle | v2 §5 S6 |
| A5 | (none yet) | Two throws with different messages: does "two parses differ" apply? The outcome is CE either way. | Ambiguity (flag only) | Plan v3 §4 |

## 4. Hand calculations and coverage

**The hand calculations hold up.** All 71 one-line calculations support their expected values. Each `covers` tag that names a
class, sub-class, S code (or "S… negative"), CE dimension, overlap, invented/dropped, bare or accept is borne out by my
recomputation: 0 contradicted. Minor wording notes, none affecting a value:
- **O62** cites CONTRACT §7.1 for "unit cup kept". §7.1 says only "Zero/negative → no quantity". The unit-kept shape is the frozen
  convention (ing-dev-0021 `0 cups shredded coconut`, ing-hold-0006, ing-h2-0017/0018).
- **O28** does not explain why `droppedOption` is false (see A2).
- **O45**'s calc omits its `bareNoAmount: true`, which is correct (same label as O16).

**Every class and code has at least one oracle:**

| Class / code | Oracles |
|---|---|
| C1+ | O01, O05, O06, O07, O71 |
| C1 detail-only | O02, O03, O04 |
| C2 high | 19 oracles |
| C2 medium | O08, O12 |
| C3a / C3b / C3c / C3x | 3 / 5 / 1 / 1 |
| C4 | O39 |
| C5a / C5b / C5c / C5x | 3 / 7 / 2 / 2 |
| C6 | O46 |
| C7 | O47, O50 |
| C8 | O48, O49 |
| CE engineError | O51, O60, O61 |
| CE invalid | O52–O58, O69 (8 shapes) |
| CE nondeterministic | O59, O60 |
| S1 | 5 oracles |
| S2 | 7 oracles |
| S3 | 7 oracles |
| S4 | 3 oracles |
| S5 | 3 oracles |
| S6 | 2 oracles |
| S7 | 2 oracles |
| S8 | 2 oracles |

**Named situations are covered too:**
- Overlaps: S1+S3, S1+S8, S2+S3, S2+S3+S6, S2+S4, S2+S7, S3+S6, S4+S5.
- Wrong dimension: oz/fl_oz on unit (O19) and on package (O20), cup/container (O21).
- Unsupported input: C4, C6, C7, C8, S8, CE.
- Ranges: collapse (O15), kept (O40), lost at review (O41), ready with a range is invalid (O53).
- Alternatives: loss (O24, O25, O30, O31), invention (O28, O38), dropped (O29).
- Package representation: O22, O23, O65 (S6 negative), O10, O70, O71.
- Accepted labels: accept.alternatives (O26, O27), accept.name/note (O05, O67), accept.note `[null]` (O06).
- Strict ≠ accepted: O05, O06.

**Gaps, found by deliberately breaking my own checker.** Of the 28 breaks, 18 are caught by some oracle and 10 survive. One of
the 10 (`pkg-not-high` v1) behaves exactly like the correct rule, so it is not a gap; its v2 is caught by O10/O65. That leaves
nine real gaps:

| Surviving break | What no oracle pins | Real-data relevance |
|---|---|---|
| `bare-ignore-alts` | SCORE-01 alternatives arm | **Yes**: ing-h2-0223, 0224 (holdout-v2 would give 31, not 29) |
| `bare-ignore-qty` | SCORE-01 quantity arm | §12.14 lines on holdout-v3 (`1 m sausage`) |
| `nondet-scored-fields-only` | nondeterminism in unscored fields (evidence, reasons, source) | A6 |
| `validate-first-parse-only` | validity of the second parse | A6 |
| `qty-by-display` | quantity compared by text, not by exact value | A1/A2 |
| `unit-by-source` | unit compared by `source`, not canonical code | A1/A2 |
| `range-min-only` | range upper end | C5 sub-classes |
| `s7-any-status` | S7 negative on a needs_review output | S7 counts |
| `c-needs-pkg-null` | c with only a package read | C3c/C5c |

**Proposed oracles** are written in full (label, output, expected, rule) in `/home/user/rx2b-r1/proposed-oracles.json`. My checker
confirms all 14 (14/14), and each named gap is now caught:
- **P01** `Butter or oil, for greasing` (ing-h2-0223 shape) → C5a, not bare. Rule: plan v3 §7(b), all three arms.
- **P02** `1 m sausage` (quantity 1, unit null) → C5a, not bare. SCORE-01 quantity arm.
- **P03** The parses differ only in `evidence.spans` → CE nondeterministic. Plan v3 §4 "two parses … differ"; the contract
  requires deep-equal output.
- **P04** The second parse has an unknown key → CE, invalid + nondeterministic. Plan v3 §4; settles A3.
- **P05** `1/2 cup sugar`, engine display `½` → C1+. §9 exact rational equality; `display` is never parsed back.
- **P06** unit `{canonical: cup, source: "cups"}` → C1+. §9 canonical code.
- **P07** range 2..4 against 2..3 → C5b. §9 "ranges: both ends".
- **P08** `1 cup 2% milk`, needs_review output named `milk` → C3b, **no S7**. v2 §5 S7 "engine ready on a ready label".
- **P09** needs_review label `1-2 cups 2% milk`, ready `milk` 1 cup → C2 high, S2+S4, no S7.
- **P10** package only, matching → C3c. Reading 1 definition of c.
- **P11** unit `{oz, dimension: volume}` → CE invalid (never coerced; no S3 from the output's own dimension).
- **P12** unsupported output with a name → CE invalid, not C7.
- **P13** `salt to taste`, needs_review 1 pinch → C3b + S1.
- **P14** amountUnstated to_taste vs as_needed → C1 detail-only.

Still to settle by an oracle once the coordinator decides: A4 (S6 with a null quantity) and A5 (two different throw messages).
Outside the per-line oracle format, and so not checkable here: CE lines staying in every denominator, A2 counting CE as
inaccurate, the A6 scorer part, and Wilson intervals. The README lists mutations and tests for these, but I did not review them.

## 5. SCORE-01 and SCORE-02

**SCORE-01 is recomputed and confirmed** on frozen `holdout-v2.jsonl` (SHA-256 `793507a4…6617f`, which equals `FREEZE-v2.json`).
- 69 needs_review labels; **29** have quantity null, unit null and empty alternatives.
- The old 23 (DELTA's v2 `excludedIds`) are all inside the 29, and the extras are exactly **ing-h2-0158, 0186, 0207, 0208, 0209,
  0350**. Their extra tags are price_annotation, optional, prep_note, unicode_text, size_word and unicode_text.
- dev: 5 (adds ing-dev-0079). holdout-v1: 5 (adds ing-hold-0052). Both match DELTA.
- The old sets come back exactly (23/4/4) from an inferred tag rule: needs_review, tagged quantity_missing, every other tag a
  seasoning tag. This is consistent with change-log 10(a).
- All three arms of the label rule matter on real data:
  - a tag-only "quantity_missing" rule would give 31;
  - ing-h2-0056 is excluded by the unit arm;
  - ing-h2-0223/0224 are excluded by the alternatives arm.

**SCORE-02 headline invariance is consistent.**
- DELTA reports 1 128 figures: 1 029 unchanged, 99 changed, 0 unexpected. The 99 changed rows are 33 per engine:
  - dev 10 and holdout-v1 10, all sensitivity (b);
  - holdout-v2 13: set label, 10 sensitivity (b), A6 status and A6 evidence.
- None of them is a class, S code or field-accuracy figure.
- Every v3 change that could move such a figure acts only on CE lines: the wider CE definition, no S codes on CE, and CE counted
  as inaccurate for A2. DELTA reports engineError, invalidOutput and nondeterministic as 0 with classified = N for all 3 engines
  × 669 lines. **I reproduced this independently**: two parses of every dev, holdout-v1 and holdout-v2 line with each engine,
  each output validated with the full validator, gave 0 / 0 / 0 in all 9 engine × set cells.
- v2's CE (a throw or a status outside the contract) is a subset of v3's, so v2 CE = 0 as well. No line can change class.
- The sensitivity (b) deltas add up. On holdout-v2 the six extra lines are all C5a for each engine:
  - legacy: C5a 7/46 → 1/40, C5b 39 unchanged;
  - +suggestion: C5a 8 → 2;
  - semantic-v1: C5a 40 → 34, S4 2 unchanged.
  - Kept counts: 69 − 23 = 46 and 69 − 29 = 40. dev 22 − 4/5 = 18/17. holdout-v1 18 − 4/5 = 14/13.

## 6. Verdict

**PASS, with gaps to close.** The 71 hand-calculated oracles are correct against the plan text, as adopted with reading 1:
- my clean-room checker agrees on every field of every oracle;
- every calculation supports its value;
- every class, sub-class, S code and CE dimension is exercised.

SCORE-01 (29, including the six) and the SCORE-02 invariance are confirmed, and the 0 CE is independently re-measured.

Before the freeze, I recommend:
1. Add P01–P14, or equivalents. P01 (the SCORE-01 alternatives arm, which is live on holdout-v2) and P03/P04 (the scope of
   nondeterminism and validity, which are A6 inputs) matter most.
2. Settle A4 (S6 with a null quantity, an A4 input) and A5 in the plan or the INTERPRETATION, with an oracle for each.
3. Write a one-line definition of invented and dropped options (A2).

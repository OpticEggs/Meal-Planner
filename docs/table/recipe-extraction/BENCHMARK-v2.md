# Recipe Extraction Lab — Phase 2 benchmark (`semantic-v1`)

_2026-10-09. Package only; **the Table app is unchanged** and does not import the package. Scored once, per the
predeclared `EVALUATION-PLAN-v2.md`, on the frozen candidate **`56eafe4`** (= the independently reviewed `59756ba` of the
isolated copy; `src/`, `tests/semantic/`, the pesto test and the contract byte-identical). Report:
`docs/table/evidence/2026-10-09-recipe-extraction-phase2/evaluation-56eafe4/benchmark-report.{json,md}`
(JSON SHA-256 `afc55fd5…`, byte-identical on a rerun and again in the clean-tree verification at `16d7995`)._

```bash
cd packages/recipe-extraction && npm run bench -- --split every --pages --out-json report.json --out-md report.md
```

## 1. Result in one table

Clear lines = labelled `ready` (R). Wilson 95 % intervals in parentheses.

| | dev (development) | holdout-v1 (**previously exposed**) | **holdout-v2 (fresh)** |
|---|---|---|---|
| Lines (R / needs_review / unsupported) | 182 (152 / 22 / 8) | 128 (104 / 18 / 6) | 359 (271 / 69 / 19) |
| **semantic-v1** — clear lines fully correct (C1) | 152/152 | 103/104 | **254/271 = 93.7 % (90.2–96.0)** |
| semantic-v1 — incorrect ready (C2), high / medium | 0 / 0 | 0 / 0 | **5 / 1** (of 359) |
| semantic-v1 — clear lines sent to review (C3+C4) | 0/152 | 1/104 | **13/271 = 4.8 % (2.8–8.0)** |
| semantic-v1 — uncertain lines kept for review (C5) | 22/22 | 18/18 | 67/69 |
| semantic-v1 — non-ingredients rejected (C7) | 8/8 | 6/6 | 16/19 (3 sent to review instead) |
| semantic-v1 — severe errors S1–S8 (lines) | 0 | 0 | **4**: S3 1, S4 2, S5 1, S6 1 (one line has S3+S6) |
| Legacy (Table import 2, `cb7b56e`) — C1 | 54/152 | 37/104 | 73/271 = 26.9 % (22.0–32.5) |
| Legacy — incorrect ready (C2), high / medium | 1 / 5 | 0 / 4 | 11 / 10 |
| Legacy — clear lines sent to review (C3+C4) | 92/152 | 63/104 | 177/271 = 65.3 % — of which 153 with a **wrong pre-fill** (C3b, e.g. the amount in the name) |
| Legacy — severe errors | 0 | 0 | S3 5 |

Field accuracy on holdout-v2 clear lines, semantic-v1 vs legacy: name 260/271 (95.9 %) vs 97/271 (35.8 %);
quantity 266/271 (98.2 %) vs 123/271 (45.4 %); unit 265/271 (97.8 %) vs 99/271 (36.5 %). No fabricated amount (S1)
and no wrong amount on a ready line (S2) for either engine; no dropped qualifier (S7) and no non-ingredient marked
ready (S8). By source (holdout-v2): synthetic lines C1 223/240; repository-sourced lines (main's own new tests,
independently written) C1 31/31, with one suppressed-ambiguity line (below).

## 2. Acceptance (Gate G2, holdout-v2, predeclared)

| # | Criterion | Result | Status |
|---|---|---|---|
| A1 | C1 on R ≥ 98 % | 254/271 = 93.7 % (90.2–96.0) | **not met** |
| A2 | name / quantity / unit on R each ≥ 98 % | 95.9 % / **98.2 %** / 97.8 % | **not met** (quantity alone meets it on the point estimate; its lower bound is 95.8 %) |
| A3 | no high-severity false certainty | 5 lines | **not met** |
| A4 | S1 = S3 = S4 = S5 = S6 = 0 | S1 0, S3 1, S4 2, S5 1, S6 1 | **not met** |
| A5 | C3 + C4 on R ≤ 10 % | 4.8 % | **met** |
| A6 | legacy engines / baseline snapshot / parity unchanged; every output validates; deterministic | snapshot + 459 ported legacy tests pass, page parity holds, CE = 0; the contract validator accepts all 2 007 outputs (3 engines × 669 lines, `evidence/…/a6-validation/`); byte-identical reruns | **met** |
| A7 | pesto regression passes as a normal test | passes (`tests/characterization/pesto.test.ts`) | **met** |

**G2 is not met.** As predeclared, `DEFAULT_ENGINE_ID` stays `legacy-table-import-2`; `semantic-v1` is registered
alongside it. Informational sensitivity (not the acceptance basis): without the pre-registered debatable case
`ing-h2-0087` A1 is 254/270 = 94.1 % and S3/S6 drop to 0 (A3/A4 still not met); without the 12 lines matched in the
isolation audit (§6) C1 is 250/266 = 94.0 % — the flaw did not inflate the result.

## 3. Demonstrated fixes (`npm run lab -- line --engine <id> "<line>"`, output at `56eafe4`)

| Line | Legacy (Table import 2) | semantic-v1 |
|---|---|---|
| `1/3 cup pesto (homemade or store-bought)` (the Phase 0 defect, `ing-dev-0001`) | needs_review, name `1/3 cup pesto`, no amount | ready, 1/3 `cup`, `pesto`, note `homemade or store-bought` |
| `1-1/2 cups milk` | needs_review (`quantity_range`), name = whole line | ready, 3/2 (`1 1/2`) `cup`, `milk` |
| `1 1/3 cups flour` | needs_review (`legacy_fraction_not_exact_decimal`) | ready, exact 4/3 `cup`, `flour` |
| `2-3 cups water` | needs_review, name = whole line | needs_review (`quantity_range`), range 2 to 3 `cup`, `water` — never collapsed |
| `1 (14.5 oz) can diced tomatoes` | needs_review, name = whole line | ready, 1 `can`, package 29/2 `oz` (mass), `diced tomatoes` — count and size kept separately |
| `8 fl oz milk` / `8 oz cheddar` | `fl_oz` volume / `oz` mass | same (unchanged) |
| `1 cup ricotta (whole milk (not part-skim))` | ready, name `ricotta (whole milk )` | ready, `ricotta`, note `whole milk not part-skim` |
| `1 cup chicken or vegetable broth` | needs_review, name = whole line | needs_review (`ingredient_alternatives`), options `chicken broth` / `vegetable broth`, no choice made |

Every quantity is an exact rational inside the package (numerator/denominator strings); no amount is rounded.
These are fixes in the package only; the app does not import the package (see §7 on `main`'s separate in-app parser).

## 4. What failed on the fresh holdout (findings, not fixed — fixing them would expose holdout-v2)

| Failure | Lines (holdout-v2) | Class |
|---|---|---|
| Count noun **after** the food kept in the name: `eight cardamom pods`, `2 star anise pods`, `2 celery ribs, diced` → `each` with "pods"/"ribs" in the name. This is the engine's deliberate policy, not a miss: `lexicon.ts` reads only clove, stalk, sprig, slice, fillet, link, ear and bulb after a food, and keeps ribs, strips, wedges, heads, sticks, leaves, pods, cubes, sheets and pieces in the name. The labels follow CONTRACT §7.3 (unit `pod`, name `cardamom`), so it is a **policy conflict** covering all of these nouns (`4 lemon wedges`, `2 cinnamon sticks`; final-head review SF-3) | 0054, 0072, 0065 | C2 high (wrong unit, same dimension) |
| An amount inside a remark accepted as a note: `1 cup cooked quinoa (from 1/3 cup dry)`, `1 cup rice (1 cup dry makes 3 cooked)` (labels: needs_review per §7.5 — a debatable but predeclared reading) | 0165, 0338 | C2 high, S4 |
| Size word after a weight kept in the name: `1 lb large raw shrimp` → "large shrimp" (§7.6: size → note) | 0164 | C2 medium |
| A three-way comma choice left undecided: `1 tbsp maple syrup, honey, or agave` → name "maple syrup", others in the note (needs_review, but scored as a silent choice) | 0219 | S5 |
| Yogurt cups as containers: `3 (5.3 oz) cups vanilla Greek yogurt` → 3 `cup` (pre-registered debatable) | 0087 | S3 + S6 (C3) |
| Clear lines sent to review — 13 in all, counting 0087 above (5 useful partials C3a, 6 with a contradicting pre-fill C3b incl. 0087, 2 with no name C3x); the line is kept for a person: `2 tsp + ½ tsp`, `1 cup plus 1/3 cup` not summed (0129, 0130, C3b); a double restatement `3 cups (750 ml) / 25 fl oz` (0140); digits in names `5-spice powder`, `00 flour` (0040, 0041, C3x); `93/7 ground turkey, 1 lb` (0151); `Pinch of salt` (0061); `Juice of 2 limes` / `Zest of ½ orange` (0212, 0213); `eggs x 3` → name "eggs x" (0253); `cut into half-moons` (0239); `hummus (store-bought (or see recipe))` (0232) | 12 + 0087 | C3 |
| Invented first option on review lines: `kale or Swiss chard` → options "kale chard" / "Swiss chard", `chickpeas or white beans` → "chickpeas beans" / "white beans"; `between 2 and 3 cups water` → name "between", no amount | 0218, 0220, 0277 | C5b (review; with 0219 = 4 C5b) |
| Headings sent to review instead of rejected: `SAUCE`, `Cake Layers`, `Step 2` | 0286, 0288, 0297 | C8 (not an acceptance error) |

The independent reviewer's round 3 (before the holdout-v2 run) had already listed the invented-option shape (its own
probe `1 cup kale or Swiss chard`) and four known defect groups — K1 `a half-cup milk` (ready, wrong amount and unit),
K2 `400g (14oz) can chopped tomatoes` (package folded into a weight, review), K3 `Protein: 20 grams` (nutrition fact
ready), K4 `Five spice powder` (count invented, review). None of the K-shapes occurs in holdout-v2; they remain open
defects, and on the reviewer's 291 new round-3 probes they produced 12 silent ready-but-wrong lines
(`evidence/…/review/REVIEW-ROUNDS.md`, `ROUND-3-REPORT.md`). The holdout-v2 rate is therefore not a bound for these
shapes.

**Found by the independent review of the final code head `0c0c60f` (after the evaluation; not in the holdout-v2
rates; not fixed)** — 641 new probe lines, scored against the reviewer's own CONTRACT §7 labels
(`evidence/…/review/final-head-0c0c60f/`): on 681 firm probes, 25 ready-but-wrong lines (21 high).
- **`x` multiplier without a package size**: `1x cup milk` → ready, 1 `each`, name "x cup milk" (S3); `1x can
  chickpeas`, `2x cans chickpeas`, `1 x can chickpeas` the same (C2 high). With a package size (`2 x 15 oz cans beans`)
  it is read correctly.
- **K3 is wider than "spelled-out units"**: a nutrient missing from the fact vocabulary is read as an ingredient even
  with an abbreviated unit — `Vitamin C: 15 mg`, `Magnesium: 40 mg`, `Zinc 1 mg`, `Caffeine: 95 mg` → ready (S8 + S1);
  rating text `4.8 stars (120 reviews)` → ready (S8).
- **Count nouns after the food** (the policy conflict above): 5 firm C2 high.
- **Three-way comma choices**: S5 on 5 of 5 probes (as 0219); a plural first option is treated as a category and
  dropped — `1 cup pecans, walnuts, or almonds` → options walnuts / almonds only (review, C5b).
- Size word after a weight (as 0164): 4 C2 medium; K1: 2.
- Without firm failures in the probes: ranges (21/21 kept as ranges, at review), oz vs fl oz (25/25), nested brackets
  (10/10), restatements (76/77), package shapes (68/73 correct, the rest at review). Hostile input and 100 000 fuzz
  lines: 0 throws, 0 invalid outputs, deterministic.

## 5. The four baseline false-ready cases (holdout-v1, exposed) — inspected

| Line | Legacy (Table import 2) | semantic-v1 | Finding |
|---|---|---|---|
| `1 cup ricotta (whole milk (not part-skim))` | ready, name `ricotta (whole milk )`, note `not part-skim` | ready, `ricotta`, note `whole milk not part-skim` | real defect: nested brackets corrupt a name that defaults to *Use* (a separate grocery key) |
| `2 cups cooked black beans` | ready, name `cooked black beans`, form cooked | ready, `black beans`, form cooked | naming policy: the form word stays in the name (contract §7.6 moves it to `form`) — a different grocery key from `black beans` |
| `1 cup uncooked arborio rice` | ready, `uncooked arborio rice`, form raw | ready, `arborio rice`, form raw | same policy difference |
| `8 oz raw chicken breast, diced` | ready, `raw chicken breast`, form raw | ready, `chicken breast`, form raw | same policy difference |

All four are wrong names on lines Table marked parsed (medium severity: the amount and unit were right). Measured
rates, not a characterisation: on holdout-v2 the legacy engine marks 21/359 lines ready wrongly (11 high: wrong unit or
package, 5 cross-dimension) and sends 177/271 clear lines to review, 153 of them with a wrong pre-fill.

## 6. Process, isolation and exposure

- **Predeclared** plan (`09d574c`) and pre-evaluation amendments (`ee0442f`, change log §10) before any candidate was scored.
- **holdout-v2**: 359 lines (305 synthetic, 253 distinct constructions; 54 independently authored inputs from `main`'s
  own new tests, provenance verified), label-checked by an independent checker blind to any parser (blind sample 40/40
  agreement; 3 accept corrections), frozen in `46a6547` (SHA-256 `793507a4…`) before evaluation. Limitation: labeller and
  checker are likely the same model family.
- **Implementation worker** wrote the engine in a history-less copy with no holdout, benchmark report or evidence, and
  received dev diagnostics and independent-review findings only. **Isolation flaw (disclosed):** the session scratchpad
  was shared; it held holdout-v1 exports, Phase 1 reports and, from 20:08, the evaluation worker's holdout-v2 draft
  while the worker wrote probe files there. The worker reports reading only its own files; an audit of its 559 probe
  lines and every string its commits add found 12 exact matches with holdout-v2 (generic phrasings) and none of the
  distinctive holdout-v2 constructions (`isolation-audit/`). From round 2 on it used a private scratch directory.
- **Independent review**: three rounds on the isolated copy (807 → 454 → 291 new probes); round 1 ≈ 69 silent
  ready-but-wrong lines among 807 probes, round 3 0 among those 807 but 12 among its 291 new probes (K1, K3); known
  defects K1–K4 and invented options recorded before the holdout-v2 run and not passed to the author
  (`review/REVIEW-ROUNDS.md`). Round-1 and round-2 findings were passed to the author as code-review findings (no
  holdout content). The reviewed author commit `59756ba` and the scored `56eafe4` have identical git trees for `src/`,
  `tests/semantic/`, `tests/characterization/` and the contract (`review/author-59756ba-equals-56eafe4.txt`).
- **Final-head review** (`0c0c60f`, a fresh read-only reviewer, after the evaluation): no blocker; every number in
  §1–§5 recomputed independently with its own scorer and matched; the evaluation report rebuilds byte-for-byte; legacy
  engines, baseline snapshot, default engine and public API unchanged (validator widening as documented); no app code
  differs from `main` `8c9fd8c`. Six should-fix findings — the engine shapes above, and two scorer faults that change
  no reported figure (`EVALUATION-PLAN-v2.md` change log 10) — and nine nits (`review/final-head-0c0c60f/FINAL-HEAD-REVIEW.md`).
- **One scoring run** of the candidate on holdout-v2; nothing was changed after it. If holdout-v2 failures drive a
  repair, holdout-v2 becomes exposed and a new fresh set is needed for the next acceptance claim.

## 7. Limitations

Synthetic, hard-case-heavy corpora (not real-world frequencies); holdout-v2's 271 clear lines can certify at most
~98.6 % with confidence at a perfect score; ingredient lines only (the page reader is still the legacy one, 12/12
detection, 14/14 ingredient lists); a few labels are debatable by design (0087, 0165/0338). Real-page quality is
Phase 5 (owner-gated).

**Downstream decimal conversion (integration limitation, not fixed here).** The package keeps exact rationals
(`1/3` stays 1/3). Table stores recipe ingredients per serving in a `numeric` column — exact when the per-serving
value terminates, otherwise rounded to 12 decimal places (`perServing` on `main`, `8e6bd6e`). A Phase 3 adapter would
have to hand Table the exact whole-recipe amount as text and let `perServing` divide once, never pre-rounding; the
12-dp residual remains (`PHASE-3-DEPENDENCIES.md` §3).

**Relation to the app.** `main`'s own import overhaul (`8e6bd6e`, another session) independently reads the pesto and
`1-1/2` lines inside Table; whether that is deployed is outside this lab. Nothing in this report is in the app.

## 8. Reproduce

```bash
cd packages/recipe-extraction
npm run typecheck && npm test                       # 1917 passed, 11 skipped at 16d7995
npm run bench -- --split all                        # dev + holdout-v1 only (never scores holdout-v2; reads it only for integrity checks)
npm run bench -- --split every --pages --out-json r.json --out-md r.md   # + holdout-v2; r.json SHA-256 afc55fd5…
```

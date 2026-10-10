# Recipe Extraction Lab — evaluation plan v3 (PREDECLARED)

_Declared 2026-10-10 by the coordinator, before the Phase 2B candidate is frozen and before any holdout-v3 line
exists. It carries `EVALUATION-PLAN-v2.md` forward unchanged except where this file says otherwise. Changes after
this commit are logged in §11 with a reason; a change made after the candidate has been scored on holdout-v3 must say
so and cannot make holdout-v3 fresh again._

## 1. Sets and what each may claim

| Set | Status | What it may claim |
|---|---|---|
| dev, holdout-v1, holdout-v2 (incl. its 54 app-test inputs), the exposed regression corpus (`tests/regressions/exposed-regressions-2b.jsonl`), every review probe set | **exposed** — development material for the Phase 2B candidate | diagnostics and required regressions only; never "fresh" or "blind" |
| **holdout-v3** (`fixtures/ingredients/holdout-v3.jsonl`, frozen by `fixtures/FREEZE-v3.json`) | **fresh** until its single scoring run | the Phase 2B acceptance decision (§6) |

Holdout-v2's Phase 2 results stay historical (fresh for `semantic-v1` at the time, exposed now).

## 2. Engines

- **`semantic-v2`** — the Phase 2B candidate. It is the only engine judged by G2.
- **`semantic-v1`** (frozen prior candidate) and **`legacy-table-import-2`** (frozen Table import 2 at `cb7b56e`) — context.
- `legacy-table-import-2+suggestion` — context.

The legacy comparison is **historical**: it is not the current app parser (`main` reads ingredients with its own
`table-import-3` parser). This plan does not benchmark the app.

## 3. Unit, denominators, comparison

As v2 §3: one line; R / A / U / N denominators; CONTRACT-v1 §9 comparison; accepted values counted; acceptance uses
accepted. Labels follow CONTRACT-v1 §7 **and §12** (Phase 2B interpretations, written before holdout-v3).

## 4. Outcome classes and validity (scorer **outcomes v3**)

C1–C8, C1+, C3a/b/c/x and C5a/b/c/x are as v2 §4 and change-log reading 1. Two repairs (SCORE-02):

- **CE**: an engine error, an output that fails the *complete* contract validator (`validateParsedIngredientV1`), or
  a nondeterministic output (two parses of the line differ).
  - A CE line stays in every denominator.
  - It gets **no** C1–C8 class and **no** S code.
  - An invalid output is never repaired to make it scoreable.
- Four separate dimensions are reported per set: **validity**, **engine errors**, **nondeterminism** and **semantic
  accuracy**. The C/S classes describe only valid, deterministic, non-error outputs.

## 5. Severe semantic errors and severity

S1–S8 and high/medium/low false certainty are as v2 §5, with change-log readings 1, unchanged.

## 6. Acceptance (Gate G2) — holdout-v3 only, `semantic-v2`

The thresholds are unchanged from v2 §6:

| # | Criterion |
|---|---|
| A1 | C1 on R ≥ 98 % ("met" on the point estimate; "met with confidence" only if the Wilson lower bound ≥ 98 %) |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % (same rule) |
| A3 | high-severity false certainty = 0 |
| A4 | S1 = S3 = S4 = S5 = S6 = 0 on all lines |
| A5 | C3 + C4 on R ≤ 10 % (point estimate) |
| A6 | legacy engines, frozen snapshot and applicable parity unchanged; **CE = 0, every output valid, every output deterministic** (from §4); reports byte-deterministic |
| A7 | the pesto regression passes as an ordinary required test, for `semantic-v2` |

**G2 PASS** = A1 (point) and A2–A7 all met. The confidence-bound status of A1/A2 is reported separately. Failing criteria
are reported, never redefined.

**This pass changes no default.** `DEFAULT_ENGINE_ID` stays `legacy-table-import-2` whatever the result. A PASS
only makes `semantic-v2` *eligible* for a separately authorized Phase 3 compatibility adapter.

## 7. Reporting

- Wilson 95 % intervals (z = 1.959964), with every numerator and denominator.
- C1 and C1+ side by side.
- Every severe counterexample listed by case.
- Review-only wrong pre-fills (C3b, C5b, invented or dropped options) kept visible.
- Breakdowns per category, per construction family, per CONTRACT §12 item exercised and per source.
- The report pins the candidate commit, the `semantic-v2` source tree hash, the scorer hash
  (`bench/outcomes.ts`) and this plan's hash.

**Informational sensitivity figures** (never the acceptance basis; decided before scoring):
- (a) A1–A5 without the cases pre-registered as debatable at holdout-v3 adjudication.
- (b) needs_review figures without the bare no-amount lines. Label-based (SCORE-01): label quantity, unit and alternatives all null.
- (c) A1–A5 without the cases that exercise a §12 item marked *(new)*. This is the result under "§7 only".
- (d) A1–A5 without the lines that match the post-freeze exposure audit (§9.4).

## 8. Composition of holdout-v3

**Size.** At least the v2 minimums: ≥ 260 lines, ≥ 200 ready, ≥ 40 needs_review, ≥ 15 unsupported. The target is
about 360, comparable to v2.

**Coverage.** Every CONTRACT category, every §12 item and every Phase 2B repair family (A quantity syntax, B
alternatives and notes, C count, package and qualifiers, D non-ingredients), plus ordinary clean lines in realistic
proportion.

**Construction rules.**
- Each construction template is used at most twice; the distinct-construction count is reported.
- No inflation by swapping food words.
- Each case records its `construction`, the §12 items it exercises and its family.

**Sources.** Synthetic lines written by the evaluator only: no app-test inputs (exposed), no scraping, no live page, no
model or API call.

**Deduplication.** Exact normalized matches and same-construction near-duplicates are removed against every exposed
input the evaluator may read: dev, holdout-v1, holdout-v2, the regression corpus and the published review probes.

## 9. Procedure and exposure boundary

1. **Freeze the candidate.**
   - The candidate is repaired, independently reviewed, fixed, re-reviewed and then frozen.
   - Frozen means: commit, source tree hash, scorer hash and this plan's hash recorded.
   - The scorer's repairs are oracle-checked independently and mutation-tested before the freeze.
2. **Write holdout-v3.**
   - Only after (1), the evaluator (Worker B, whose workspaces never contained `semantic-v2`) writes holdout-v3 from
     CONTRACT §7/§12 and the labelling guide.
   - It works in a private history-less workspace, never the session scratchpad, a shared folder, git history or a
     test path. No engine is run on it.
3. **Check and freeze the labels.**
   - The label checker (R2, blind to every parser) labels a fixed blind sample, then reviews all labels.
   - The coordinator adjudicates disagreements from the contract text only (logged in `fixtures/LABEL-CHANGES.md`).
   - The labels are frozen by hash in their own commit.
4. **Exposure audit.** After the freeze and before scoring, every holdout-v3 input is matched (exact, normalized)
   against every string the implementation worker and the candidate reviewer could have seen or written: the
   `tests/semantic-v2/**` strings, their scratch probe files, the exposed sets and the review probes.
   - Matches are reported, and sensitivity (d) excludes them.
5. **Score once.**
   - Score the frozen candidate on holdout-v3 **once**.
   - Byte-identical reruns of the same candidate and scorer are reproducibility audits, never a second sample.
   - The read-only reviewer recomputes the result independently, without importing the production scorer.
6. **After the run.** If any repair follows the run, holdout-v3 is exposed for the repaired engine. No automatic new
   holdout follows a FAIL.

## 10. Future apples-to-apples comparison (not in this pass)

A comparison with the *current* app parser needs both readings at a tested adapter boundary: the package's v1 output
mapped through a Phase 3 adapter versus `main`'s `ParsedLine`. That comparison would:
- use exposed cases only, as a compatibility check, never as blind evidence;
- leave the frozen import-2 baseline unchanged.

It needs a separately authorized Phase 3.

## 11. Change log

1. **2026-10-10, before candidate freeze and before any holdout-v3 line:** CONTRACT-v1 §12, which §3 makes binding
   for holdout-v3 labels, was revised after the independent label checker's review (`9cd400c`; disposition in
   `evidence/2026-10-10-recipe-extraction-phase2b/label-check/`). No threshold, class, severity rule or acceptance
   basis changed.
2. **2026-10-10, before candidate freeze and before any holdout-v3 line** — decisions on three scorer ambiguities found
   by the independent oracle check (R1, `evidence/…/scorer/ORACLE-CHECK.md`), each the stricter reading:
   (a) validity is checked on **both** parses; a line is invalid (→ CE) if either parse fails the validator;
   (b) S6 fires when the label has a packageSize and the engine has none and states a mass or volume unit, **whether or
   not** it states a quantity; (c) two engine errors with different messages also count as nondeterministic (the line
   is CE either way). Informational review-only flags: an **invented option** is an engine option that matches no
   label option (nor an accepted one); a **dropped option** is a label option missing from an engine list that
   invents none. No threshold or acceptance rule changed.

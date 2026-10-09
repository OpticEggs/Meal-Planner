# Recipe Extraction Lab — evaluation plan v2 (PREDECLARED)

_Declared 2026-10-09 by the coordinator **before** any Phase 2 engine exists or any second holdout is written.
Changes after this commit are logged at the end with a reason; a change made after a candidate has been scored
on the fresh holdout must say so and cannot make that holdout "fresh" again._

## 1. Sets and what each may claim

| Set | Status | Who has seen it | What it may claim |
|---|---|---|---|
| **dev** (`fixtures/ingredients/dev.jsonl`, 182 lines; dev pages) | development | everyone, incl. the implementation worker (cases and per-case results) | diagnostics only |
| **holdout-v1** (`holdout.jsonl`, 128 lines; 5 holdout pages; frozen in `47ebce6`) | **previously exposed** | the coordinator read every label (Phase 1 review); aggregate baseline results are published | reported separately as an exposed benchmark — **never** called fresh or blind evidence |
| **holdout-v2** (new, written in Phase 2 by the evaluation worker) | **fresh** | the evaluation worker and the label checker only; never the implementation worker | the acceptance decision (§6) |

The implementation worker never receives holdout-v1 or holdout-v2 inputs, labels, case-level results or analysis
derived from them; the coordinator gives it dev diagnostics only.

## 2. Engines scored

`legacy-table-import-2` (frozen baseline oracle, Table import 2 at `cb7b56e`) and the Phase 2 candidate engine, on
every set. `legacy-table-import-2+suggestion` is reported as context only. Table's own in-app parser on `main`
(`8e6bd6e`) is **not** scored: it applies household policy the contract leaves to the adapter (multiplies package
sizes, converts quarts to cups, omits salt/pepper, puts count words in the name), so contract-v1 labels would
misstate its quality; it is compared qualitatively on dev lines only.

## 3. Unit of analysis, denominators, comparison

One ingredient line. Denominators per set: **R** = lines labelled `ready`, **A** = labelled `needs_review`,
**U** = labelled `unsupported`, **N** = all. Field comparison is CONTRACT-v1 §9 (name: NFKC, lowercase, collapsed
spaces, trimmed punctuation; note: token bag; quantity: exact rational, ranges both ends; unit/packageSize:
canonical code + exact amount; alternatives: set). A value listed in a case's `accept` counts as a match
("accepted"); strict and accepted figures are both reported; **acceptance uses accepted**.
**Core fields** = status, name, quantity, unit, packageSize.

## 4. Outcome classes (each line gets exactly one)

| Class | Label | Engine | Meaning |
|---|---|---|---|
| **C1 correct ready** | ready | ready | every core field matches. **C1+ fully correct** = C1 and every other field matches too |
| **C2 incorrect ready** | any | ready | not C1 (wrong core field on a ready label, or ready on a `needs_review`/`unsupported` label) |
| **C3 unnecessary review** | ready | needs_review | sub-classes: **C3a useful partial** (name non-null and every non-null core field matches), **C3b wrong partial** (a non-null core field contradicts the label), **C3c abstention** (name, quantity, unit all null) |
| **C4 unnecessary rejection** | ready | unsupported | |
| **C5 correct review** | needs_review | needs_review | partial correctness reported as for C3 |
| **C6 review rejected** | needs_review | unsupported | reported |
| **C7 correct rejection** | unsupported | unsupported | |
| **C8 unsupported reviewed** | unsupported | needs_review | reported (not an error for acceptance) |

Partial extraction earns no C1 credit; it is reported (C3a/C5) because it decides how much a person must type.
Abstention (C3c) is reported separately from useful partials. Unsupported input is scored by C4/C6/C7/C8 and S8.

## 5. Severe semantic errors (any status; a line may have several; each listed by case)

| Code | Definition |
|---|---|
| **S1 fabricated amount** | label quantity null, engine quantity non-null |
| **S2 wrong amount on a ready reading** | engine ready, label quantity non-null, engine quantity differs (incl. a range collapsed to one amount) |
| **S3 cross-dimension** | engine unit (or packageSize unit) dimension ≠ label's, both present (e.g. `oz` vs `fl_oz`) |
| **S4 suppressed ambiguity** | label needs_review, engine ready |
| **S5 silent alternative choice** | label has ≥ 2 alternatives, engine has none and its name equals one of them |
| **S6 package representation changed** | label has a packageSize, engine has none and states the amount in a mass/volume unit (count × size folded in) |
| **S7 dropped material qualifier** | engine ready on a ready label, name not matched, and the engine name's tokens are a proper subset of the label name's (`2% milk` → `milk`) |
| **S8 ready on a non-ingredient** | label unsupported, engine ready |

**False certainty severity** (C2 lines): **high** if the line has any S2–S8, or a wrong unit or packageSize;
**medium** if only the name is wrong (not S7); a C1 line whose only mismatches are non-core is reported as a
**low** "detail mismatch" and is not C2.

## 6. Acceptance (Gate G2) — evaluated on **holdout-v2 only**, candidate engine

Thresholds from `BENCHMARK-v1.md` §6 / `NEXT-PROMPT-PHASE-2.md` (unchanged):

| # | Criterion | Rule |
|---|---|---|
| A1 | C1 on R ≥ 98 % | "met" on the point estimate; "met with confidence" only if the Wilson lower bound ≥ 98 % (needs ≥ 189 R lines at a perfect score) |
| A2 | name, quantity and unit field accuracy on R each ≥ 98 % | same rule as A1 |
| A3 | high-severity false certainty = 0 | |
| A4 | S1 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0 | on all lines |
| A5 | C3 + C4 on R ≤ 10 % | point estimate |
| A6 | legacy engines, frozen-baseline snapshot and parity tests unchanged and passing; contract validator passes on every output; reports byte-deterministic | |
| A7 | the pesto regression (`ing-dev-0001`, `tests/characterization/pesto.test.ts`) passes as a normal test | |

`DEFAULT_ENGINE_ID` changes to the candidate only if A1 (point) and A2–A7 are all met; the report says whether A1/A2
are met with confidence. Failing criteria are reported, not re-defined.

## 7. Intervals and reporting

Wilson score 95 % intervals (z = 1.959964) for every proportion, numerator and denominator always shown; for a zero
count the interval's upper bound is the claim ("0/N, ≤ x %"). Every table is given per set (dev, holdout-v1 exposed,
holdout-v2 fresh), per category tag, and for holdout-v2 per provenance source. Reports are byte-deterministic (runtime
in a separate non-deterministic section).

## 8. Procedure and exposure rules

1. holdout-v2 is written blind from CONTRACT-v1 §7 (no engine run on it), label-checked by an independent checker who
   sees no engine output, adjudicated with a logged rationale, then **frozen by hash** in its own commit.
2. The scorer's outcome classes (§4–§5) are implemented and tested with mutation controls before any candidate is
   scored on holdout-v2.
3. The candidate is frozen (commit), independently code-reviewed, review findings fixed, and re-reviewed **before**
   the holdout-v2 run.
4. holdout-v2 is scored **once** on the frozen candidate; the run (commit, report hash) is recorded.
5. If a repair follows that run, it is disclosed; holdout-v2 results for the repaired engine are then reported as
   **exposed**, not fresh.

## 9. Holdout-v2 composition (minimums)

≥ 260 lines: ≥ 200 labelled ready, ≥ 40 needs_review, ≥ 15 unsupported; every CONTRACT category represented.
Sources, recorded per line: (a) new synthetic lines written by the evaluation worker, each construction template
used at most twice (distinct-construction count reported; no inflation by swapping food words); (b) inputs that
main's import overhaul (`8e6bd6e`, another session) added to Table's tests — independently authored repository
content, permitted for use here — taken only where not already in dev, holdout-v1 or the package's parity corpus,
with file and line recorded; these files are withheld from the implementation worker. No live page, no copied
publisher content.

## 10. Change log

Entries 1–4 were made **before any Phase 2 candidate was scored on holdout-v2**. Entries 5–9 were written after the single run; each says whether its decision predates the run. None changes a threshold or the acceptance basis.

1. **Scorer readings adopted** (the evaluation worker's `bench/outcomes.ts` `INTERPRETATION`, reported verbatim in every outcomes section): an engine error or a status outside the contract is a separate class **CE** (stays in every denominator, never C1; A6 requires CE = 0); C3/C5 sub-classes are decided in the order b, c, a, plus **x** (no contradiction, food not named, an amount or unit read — reported separately, still counted in C3/C5); a fabricated amount on a ready label whose unit is null on both sides is high severity; S5 also checks a case's accepted alternatives; S7 compares §9-normalized word sets and never fires on a null engine name; A2 counts a field as accurate whatever the engine status.
2. **Holdout-v2 is opt-in on the CLI**: `--split all` keeps its Phase 1 meaning (dev + holdout-v1); holdout-v2 is scored only with `--split holdout2` or `--split every`, so a routine run can never expose it.
3. **Pre-registered sensitivity figures (informational, not the acceptance basis)**, decided at label adjudication from the independent label check: (a) A1–A5 recomputed without the pre-registered debatable cases — `ing-h2-0087` (`3 (5.3 oz) cups vanilla Greek yogurt`, labelled count unit `container` with a 5.3 oz package; an engine reading `cup` as volume would be scored cross-dimension); (b) needs_review-label figures also without the bare no-amount lines (29 of 69 needs_review labels; 17 share one construction), which weight review metrics with one repeated decision.
4. **Label check record**: an independent checker, blind to every parser, labelled a fixed sample of 40 holdout-v2 cases before seeing the labels — 40/40 agreement on every field — and reviewed all 359: no definite errors; 3 accept-list corrections adjudicated before the freeze (logged in `fixtures/LABEL-CHANGES.md`). Limitation: the labeller and the checker are likely the same model family, so agreement may overstate independence.
5. **Kept at the freeze (decided before any candidate was scored, recorded here afterwards):** 0199, 0211 and 0348 still accept seasoning names without "ground"/"freshly ground" (unlike 0204/0322/0325). Kept, not re-frozen: those words describe preparation of household seasonings, which Table decides downstream. In the evaluation none of the three is a strict-vs-accepted difference for any engine, so the decision changed no outcome.
6. **Commit identities:** the evaluation worker's own copy recorded the draft labels as `2f95a2d` and the freeze as `f17ad35` (cited in `fixtures/LABEL-CHANGES.md`); on the branch they are `c106df2` and `46a6547`, with the byte-identical `holdout-v2.jsonl` (git blob `39836ed…` at the freeze, SHA-256 `793507a4…`) and no difference under `fixtures/` or `bench/`.
7. **Isolation flaw and an informational audit figure:** the implementation worker's scratch directory was shared with the session scratchpad that held holdout material (disclosed in `PHASE-2-PLAN.md` and `BENCHMARK-v2.md` §6). The audit (`evidence/…/isolation-audit/`, `cf3ce84`) found 12 exact holdout-v2 matches among the worker's probe lines and committed strings, all generic. The figure "C1 without those 12 lines" comes from `evidence/…/scripts/isolation-sensitivity.ts`, committed in `b815c2b` **before** the candidate was scored. It is information only, not the acceptance basis.
8. **Sequence:** every review-driven repair (`65912e9`, `56eafe4`) preceded the single holdout-v2 run (`56eafe4`, run 22:53Z, evidence `16d7995`). No repair followed it. The case-level holdout-v2 results are now published on this branch, so holdout-v2 is **exposed for any later candidate**; the next acceptance claim needs a new fresh set.
9. **After the run (no effect on labels, thresholds or scoring):** CONTRACT-v1 §11 item 2 documents the candidate's joiner normalization, at the independent reviewer's request; `BENCHMARK-v1.md`'s summary sentence was replaced by measured rates.

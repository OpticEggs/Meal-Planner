# Recipe Extraction Lab — Phase 2B plan: repair known failures, then evaluate once

_2026-10-10, coordinator. Brief: `CLAUDE-PHASE-2B-PROMPT.txt` (owner). Package-only; no Phase 3 adapter, no app
import of the package, no default-engine change, no deployment, no live provider, external AI or spending._

## 1. Starting state (verified)

| | |
|---|---|
| Lab branch / draft PR | `claude/quirky-gauss-depmd8` at `8131fe0fa79791c1a0403bb191e12193cc3d9d7d` (= origin), [PR #1](https://github.com/OpticEggs/Meal-Planner/pull/1) draft, no new review discussion |
| Reviewed Phase 2 code head | `0c0c60faf471b0756de845a6261e9dfee02af7cf` |
| PR base | `main` at `8c9fd8ca82f0a4c8787d9089c0954be6e650e1a2` (no intervening work on main or the branch) |
| Baseline (clean tree, `8131fe0`) | package typecheck 0; package tests 1928: 1917 passed, 0 failed, 11 skipped (`evidence/2026-10-10-recipe-extraction-phase2b/baseline-8131fe0/`) |

**Disposition of Phase 2.** Accepted as an honest, reproducible experiment whose candidate `semantic-v1` **did not
pass G2** (holdout-v2: 254/271 clear lines fully correct, 5 high + 1 medium false-ready, A1–A4 failed). Its evidence
and failed result stay as they are. The final-head review's "no blocker" applies to the lab record, not to using
`semantic-v1` in the app. The headline comparison was against the frozen Table import 2 baseline, **not** the current
app parser.

**Exposure.** Every published case is now exposed development material for the new candidate: dev, holdout-v1,
holdout-v2 (including the 54 app-test inputs copied into it), the review-round probes (`p*`, `n*`, `m*`), the final-head
review's 748 probes, and every reported failure. None of it may be called fresh.

## 2. Skip ledger (baseline `8131fe0`, 11 skipped)

| Test(s) | Count | Class | Reason |
|---|---|---|---|
| `tests/parity/ingredient-line.test.ts` (all 9) | 9 | historical parity, intentionally inapplicable | live-Table parity runs only while Table's `ingredient-line.ts` equals the `cb7b56e` baseline; `main` rewrote it (`8e6bd6e`, `bca110e`). The frozen engine is guarded by `tests/parity/baseline-snapshot.json` instead |
| `tests/parity/benchmark-corpus.test.ts` › deep-equal on every benchmark line | 1 | historical parity, intentionally inapplicable | same condition (live module no longer the baseline) |
| `tests/unit/cli.test.ts` › bench says so when the benchmark module is not in this build | 1 | optional scope | applies only to a build without `bench/` (the isolated author copy of Phase 2); `bench/` is present here |

No unresolved gap. Phase 2B adds no skipped or expected-failure correctness test.

## 3. Roles, ownership and isolation (at most two write workers + read-only reviewers)

| Role | Who | Workspace | Owns | Must not |
|---|---|---|---|---|
| Coordinator | this session | main checkout | regression corpus and harness (`tests/regressions/`), CONTRACT §12, plans, registry pins, parser mutation specs, integration, evidence, docs, PR | author holdout-v3 labels |
| Worker A — implementation | fresh write worker | worktree `/home/user/rx2b-impl` (branch `lab2b-impl`) | new engine `semantic-v2` (`src/ingredient/semantic-v2/**`, `tests/semantic-v2/**`), its registry entry and export | change `semantic-v1`, legacy engines, `bench/`, fixtures, the contract, the default engine, the corpus or its harness |
| Worker B — scorer, then evaluator | fresh write worker | worktree `/home/user/rx2b-scorer` (branch `lab2b-scorer`); later a private history-less workspace for holdout-v3 | `bench/**`, `tools/mutation/**`, scorer evidence; later holdout-v3 inputs, labels, provenance | see, run or read `semantic-v2` (its worktree never contains it); run any engine on holdout-v3 |
| Reviewer R1 (read-only) | fresh | own clone | independent check of the scorer oracles (without importing the scorer); review of the candidate (whole families and nearby counterexamples); recomputation of the final evaluation | edit anything |
| Label checker R2 (read-only) | fresh | private copy of the holdout-v3 draft | review of CONTRACT §12; blind sample labels and a full review of holdout-v3 | see `semantic-v2` code or any candidate output |

`semantic-v1` stays registered and byte-identical (`src/ingredient/semantic/`), so its historical report stays
reproducible; the repairs go into a copy under a new id.

## 4. Sequence

1. Baseline, skip ledger, exposed regression corpus (`tests/regressions/exposed-regressions-2b.jsonl`, 863 cases,
   792 firm) reproduced on `semantic-v1` (176 firm failures, 0 engine errors, setup errors separated), CONTRACT §12.
2. Worker B repairs the scorer (SCORE-01, SCORE-02), versions it (outcomes v3), archives v2, adds oracles,
   mutations and a delta report; R1 checks the oracles independently.
3. Worker A builds `semantic-v2`: families A–D, every firm regression passing, dev / holdout-v1 / holdout-v2 not
   worse; no new skips.
4. R1 reviews the candidate on whole families and nearby counterexamples; A fixes high-severity findings; R1
   re-checks. The coordinator adds parser mutation controls. **No holdout-v3 exists while the candidate can change.**
5. Freeze: candidate commit, `semantic-v2` source tree hash, scorer hash, `EVALUATION-PLAN-v3.md` hash pinned.
6. Worker B writes holdout-v3 in a private history-less workspace (`/home/user/rx-eval-v3`, never the session
   scratchpad), from the frozen contract (§7, §12) and the label guide, deduplicated against every exposed input;
   no engine is run on it.
7. R2 labels a blind sample and reviews all labels without any candidate output; the coordinator adjudicates
   disagreements from the contract text only (logged); freeze by hash (`FREEZE-v3.json`), committed.
8. One scoring run of the frozen candidate on holdout-v3 (byte-identical reruns allowed as reproducibility audits,
   never a second sample). R1 recomputes it independently.
9. Verification, docs, push (no force), PR #1 updated and kept draft, restorable bundle with checksum.
10. Report G2 PASS or FAIL and stop — no automatic new holdout, no integration, no default switch.

## 5. Boundary limitations (stated in advance)

- All workers and reviewers are the same model family; agreement can overstate independence.
- Worker B wrote the scorer and will write holdout-v3; it never sees `semantic-v2`.
- The coordinator has seen the candidate's behaviour on exposed data and adjudicates holdout-v3 label
  disagreements; every adjudication must be argued from CONTRACT-v1 §7/§12 and is logged.
- If any case-level holdout-v3 content reaches the candidate before scoring, the run is reported as exposed, not as
  clean acceptance.

## 6. Design decisions during the repair (coordinator)

1. **Recognised-food requirement for counted lines (after R1 round 2).** Equipment and unknown measure words are
   open-vocabulary. Closed word lists fixed every reported line but only 47 % / 38 % of fresh ones. Decision: on a
   line whose amount is a bare count or a count unit (not a mass or volume unit), `semantic-v2` reads `ready` only when
   the name's head is a recognised food, and the words before it are recognised modifiers, varieties or food words.
   These lexicons are built by word class (produce, meat and seafood cuts, breads and baked goods, dairy and eggs,
   packaged and prepared foods, sweets, drinks, herbs and spices, condiments, nuts, grains, pasta), not from probe
   words. Otherwise the line goes to `needs_review` **without** a quantity, unit or package, so an equipment line
   cannot carry an invented amount (S1). This follows CONTRACT §12.8 ("uncertain lines go to `needs_review`"). It
   trades some unnecessary review on rare foods (A1/A5) for no silent wrong readings (A3/A4).
2. **Harness aligned with G2 for non-ingredient labels.** For an `unsupported` label, the required regression harness
   accepts a safe abstention: `needs_review` with no quantity, unit, package or options. G2 classes that as C8, which
   is not an acceptance error and carries no S code. A ready reading, or any reading that carries an amount, still
   fails.

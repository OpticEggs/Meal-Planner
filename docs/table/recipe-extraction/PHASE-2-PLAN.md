# Recipe Extraction Lab — Phase 2 plan, reconciliation and ownership

_2026-10-09, coordinator. Assignment: "Table — Phase 2: improve the standalone ingredient parser" (owner prompt).
Scope: package only. No Phase 3 adapter, migration, grocery-policy, photo/content-permission change, activation or
deployment._

## 1. Starting state (confirmed)

- `claude/quirky-gauss-depmd8` was at `40ece6e` (= origin), clean; verified code commit `3ca998a`; app baseline `cb7b56e`.
- **`main` had moved** to `12434c0`: another session's import overhaul (`dfb34cc` member photos, `8e6bd6e` parser,
  review, seasonings, photos, redesign; verify-all on `8e6bd6e`). It rewrote Table's in-app `ingredient-line.ts` with
  exact rationals, nested parentheses, `1-1/2`, alternatives and ranges kept as stated, and household seasonings —
  so **the pesto line is already read correctly inside Table on `main`** (not yet on the owner's pilot unless it was
  upgraded). It also took DECISIONS D112–D117 and BACKLOG B28–B30.
- Reconciled on this branch: `f62dbdf` pinned the frozen baseline's outputs (`baseline-snapshot.json`) while Table's
  live parser still equalled it; `d466bc2` merged `origin/main` (lab decisions renumbered D118–D121, backlog B31–B33; renumbered again — D118–D121 → D121–D124, the Phase 2 decision D122 → D125, B31–B33 → B32–B34 — when `8c9fd8c` was merged, whose corrections took D118–D120 and B31).
  After the merge the branch's app code is byte-identical to `main`; only `packages/`, `docs/` and one `CLAUDE.md`
  line differ.

## 2. Reconciling `NEXT-PROMPT-PHASE-2.md` with this assignment

| Item | NEXT-PROMPT (Phase 1 hand-off) | This assignment | Resolution |
|---|---|---|---|
| Scope | package only, new engine id | same | unchanged |
| Legacy | do not edit `src/legacy/` | preserve frozen parser as oracle; keep parity tests | unchanged; live parity now conditional (Table moved), snapshot guard added |
| Holdout-v1 | "run once when the engine is frozen" | report as **previously exposed**, never fresh | changed: reported separately as exposed |
| Second holdout | separate worker, ≥ 189 ready lines | independent evaluation worker; labels checked without predictions; independent sources where permitted; hashes + provenance; frozen before evaluation | expanded (EVALUATION-PLAN-v2 §8–§9) |
| Scoring | G2 targets | predeclared denominators, severity, partial/abstention/unsupported, CI method; separate categories | `EVALUATION-PLAN-v2.md`, committed before dispatch |
| Review | not specified | independent reviewer of behaviour, compatibility and failure handling; review of the final code head | added (§3) |
| Pesto test | becomes a passing test | same | unchanged |
| Delivery | push branch | push + draft PR, report exact head and review reference | added |
| Context | — | — | **new:** `main`'s in-Table parser; Phase 3 dependencies re-stated (§5) |

## 3. Ownership and isolation

| Role | Who | Working copy | Owns | Must not see |
|---|---|---|---|---|
| Coordinator | this session | main checkout | integration, evaluation runs, docs, PR | — (gives the author dev diagnostics only) |
| Implementation | fresh worker | **`/home/user/rx-author`**: a history-less snapshot of this branch (own `git init`), with every holdout file, the Phase 1 benchmark report/evidence, `docs/table/**` (except the contract and the Phase 0 census/adapter docs) and the Table test files that are holdout-v2 sources **physically removed** | `packages/recipe-extraction/src/ingredient/<new engine>/**`, its tests, the engine registry entry, the pesto test conversion | holdout-v1/v2 inputs, labels, case results, holdout-derived analysis |
| Evaluation | fresh worker | isolated git worktree of this branch | `fixtures/ingredients/holdout-v2.jsonl`, its manifest/freeze/log entries, `bench/**` outcome scoring (EVALUATION-PLAN-v2 §4–§5) | the candidate engine (not in its copy); it runs no engine on holdout-v2 |
| Label checker | fresh worker, read-only | — | a per-case check of holdout-v2 labels against CONTRACT §7 | any engine output |
| Reviewer | fresh worker, read-only | — | review of the candidate and final code head (behaviour, compatibility, failure handling) | holdout results before its review |

Separate sessions are not treated as isolation by themselves: the author's copy has no holdout files and no git history
to recover them from, and the brief forbids reading outside it; the author reports every path it read outside its copy.
The author's patches are applied to the branch by the coordinator (`git am`), so its commits keep their own messages.

## 4. Exposure log

| When | Who | What |
|---|---|---|
| 2026-10-09 Phase 1 | coordinator | read every holdout-v1 label; published aggregate holdout-v1 baseline results |
| Phase 2 | implementation worker | dev only (cases, labels, per-case diagnostics) |
| Phase 2 | evaluation worker, label checker | holdout-v2 (they write/check it) |
| Phase 2, from ~20:08 | implementation worker (possible) | **isolation flaw:** the worker wrote probe files into the shared session scratchpad, which held holdout-v1 exports, Phase 1 reports and the evaluation worker's holdout-v2 draft. It reports reading only its own files; audit `evidence/…/isolation-audit/` (12 generic exact matches with holdout-v2, no distinctive construction). From round 2 it used a private scratch directory |
| Phase 2 | independent reviewer | the author's isolated copy only (no holdout); rounds 1–2 findings went to the author, round 3 findings (K1–K4) did not |
| 2026-10-09 22:53Z | coordinator | the single holdout-v2 run of candidate `56eafe4`; case-level results published in `evidence/…/evaluation-56eafe4/` and `BENCHMARK-v2.md`. **From here holdout-v2 is exposed** for any later candidate; nothing was repaired after the run |

## 5. Phase 3 dependencies, restated after `main`'s overhaul

Phase 3 can no longer be "replace Table's parser with the package" as written in `ADAPTER-IMPACT.md`: Table now has
its own exact-amount parser, seasoning policy (D114, in `seasonings.ts`) and review without suggestions (D113). The
remaining questions (listed in the final Phase 2 report) are: whether the package engine should replace or feed
`main`'s parser; mapping v1 count units, package sizes and equivalents onto `main`'s choices (count words in the name,
package sizes multiplied, quarts → cups); its per-serving storage (exact when terminating, else 12 decimal places, D112);
seasonings decided by Table, never by the extractor; and drafts made by both versions.

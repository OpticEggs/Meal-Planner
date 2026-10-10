# Phase 2B — scorer: outcomes v3 (SCORE-01, SCORE-02), archived v2, holdout-v3 support, oracles, mutations

Branch `lab2b-scorer` (base `8131fe0`; merged `2130dc3` and `4703ea3`); every file here was produced at code commit
`4d1e1cc`. Package only (`packages/recipe-extraction`); no `src/`, `fixtures/`, contract or historical evidence was
changed. `oracle-check-r1/` is the independent checker R1's report (coordinator-owned, not written by the scorer worker).

## What changed

- **Archived v2 scorer.** `bench/archive/v2/bench/{outcomes,compare,stats,types}.ts` are byte-identical copies of the
  v2 scorer closure (entry point `bench/archive/outcomes-v2.ts`, identities in `bench/archive/README.md`). It
  reproduces the historical report: the `outcomes` section deep-equal (`bench/__tests__/archive-v2.test.ts`) and the
  whole JSON byte-for-byte with `--scorer outcomes-v2 --engines <the 3 ids> --split every --pages`
  (SHA-256 `afc55fd5…`, `determinism-and-reproduction.txt`; also a test in `scorer-v3.test.ts`).
- **SCORE-01** (final-head review SF-5). Sensitivity 3(b) now leaves out the needs_review labels whose label quantity,
  unit and alternatives are all null — 29 on holdout-v2 — instead of the v2 tag heuristic (23; it missed
  ing-h2-0158, 0186, 0207, 0208, 0209, 0350). Reproduced on the frozen data and repaired in `scorer-v3.test.ts`.
- **SCORE-02** (SF-6, N-2). Every line is parsed twice. Output validity (`validateParsedIngredientV1` on the complete
  output), engine error and nondeterminism are separate dimensions per line and in aggregate; any failure makes the
  line CE: it stays in every denominator, gets no C1–C8 class and no S code, counts as not accurate for A2, and A6's
  scorer part ("scorer checks met; rest checked outside the scorer") fails. Invalid outputs are never coerced. The
  semantic saboteurs in `bench/controls.ts` now return contract-valid readings; new CE saboteurs cover each
  dimension.
- **Versioning.** The report's outcomes section names the scorer (`outcomes` v3, plan `EVALUATION-PLAN-v3`) and carries
  the SHA-256 of `bench/outcomes.ts` and of its dependencies. C1 and C1+ are shown side by side; every severe
  counterexample, C2 line and CE line is listed by id; C3b/C5b and informational invented/dropped options stay visible.
  On holdout-v2 the acceptance table is labelled historical (exposed).
- **Holdout-v3, opt-in.** Split `holdout3` (`fixtures/ingredients/holdout-v3.jsonl`, frozen by `fixtures/FREEZE-v3.json`;
  neither exists) with holdout2's rules; scored only by `--split holdout3`; `all`/`every` unchanged; A1–A7 computed on
  it as the Gate G2 set. Absent and present states are tested on temporary fixture copies (`holdout3.test.ts`).
- **Oracles.** `bench/__tests__/oracles-v3.json`: 88 self-describing hand-calculated examples — 71 first, R1's P01–P14
  after rechecking each against the plan (only P02's category tag changed: `unit_unknown` is not a corpus category), and
  O72–O74 for plan v3 change log 2. Every class and sub-class, CE × 3, S1–S8 with overlaps, the SCORE-01 alternatives
  and quantity arms, nondeterminism in unscored fields, the second parse's validity; the production scorer agrees with all.
- **Plan v3 change log 2** (second round). (a) Both parses are validated — a line is invalid if either fails (the
  second's problems are listed, prefixed, only when they differ); (b) S6 fires whether or not the engine states a
  quantity; (c) two different thrown messages are nondeterministic. (b) and (c) were already the behaviour; all three
  are now stated in the report's readings, pinned by oracles and reverted by mutations. Invented option = an engine
  option matching no label (or accepted) option; dropped option = a label option missing from an engine list that
  invents none — both judged only on an engine list that matches neither the label's options nor an accepted list.
- **Holdout-v3 metadata as frozen data** (second round). holdout3 cases carry `family` (A/B/C/D/plain), `contract12`
  (§12 items, possibly none), `reliesOnNewReading` and `debatable`, required and validated for holdout3 and rejected
  elsewhere. On holdout-v3: sensitivity (a) leaves out the `debatable: true` cases, new (c) the `reliesOnNewReading:
  true` cases, new (d) the `matchedCaseIds` of the optional `fixtures/EXPOSURE-AUDIT-v3.json` (absent = no figure;
  validated on every run). Breakdowns per family, per §12 item and per construction. `FREEZE_V3_RULE` says §7 and §12.
  All tested on temporary fixture copies; no holdout-v3 file exists.
- **Pins** (plan v3 §7). outcomes v3 reports carry `pins`: `planSha256` (of `docs/table/recipe-extraction/EVALUATION-PLAN-v3.md`
  from the repository root; null when absent), `scorerSha256`, `packageSourceDigest` (SHA-256 over the sorted
  `<package-relative path>\t<sha256>\n` lines of every file under `src/`) and `engineSourceDigests` (the same per engine
  directory: `legacy` = `src/legacy`, plus every directory under `src/ingredient/` by name). The archived v2 mode carries
  none, so the historical reproduction stays byte-identical. Tested in `pins.test.ts`.
- **Mutation runner.** `tools/mutation/` (spec format in its `README.md`); results in `mutation-results.md`.
- **Delta.** `DELTA.md` / `delta.json`: 1 128 figures compared, 1 029 unchanged, 99 changed, 0 unexpected.

## Identities

| | git blob | SHA-256 |
|---|---|---|
| outcomes v2 (`bench/outcomes.ts` at `8131fe0` = `bench/archive/v2/bench/outcomes.ts`) | `69dffb0b08d3252d21f6475d6b768201a3629437` | `cdd48eb8623b54b517d8686f412d91ea78d52f07f637f161b64f688efa9607bc` |
| outcomes v3 (`bench/outcomes.ts` at `2e05aa1`, unchanged at `4d1e1cc`) | `8b5de5c8f9a3ab84f2d086b78f7cf0414af4b997` | `7821e8532eb123e9694291c6d0deac6bdac40f96715d06a4d2aa2161fc3a3892` |
| historical report (`evaluation-56eafe4/benchmark-report.json`, outcomes v2) | | `afc55fd5b8f0ce9b8959882c44919cae29e943814e8960b586fba8da0e9b1e4a` |
| `report-v3.json` (outcomes v3, same engines and sets; byte-identical rerun) | | `6642e665270952f5e1d76052d38e93ddb3cad6fe051cfd3cb0d340daa5cbfe6b` |
| `EVALUATION-PLAN-v3.md` as merged (`4703ea3`), pinned in `report-v3.json` | | `306f51561e5075f0b477857e061937755e195d52d38775b79f9111ab3ffeb662` |

## Delta headline (`DELTA.md`)

Unchanged for all three engines on dev, holdout-v1 and holdout-v2: C1, C1+, C2 high/medium, C3+C4 and every
sub-class, C4–C8, CE (0), S1–S8, field accuracy, A1–A5 and A7 statuses, sensitivity (a), every per-category and
per-source figure, the §9 field scores and the pages (0 engine errors, 0 invalid outputs and 0 nondeterministic lines
in 3 × 669, so SCORE-02 moves no line). Changed: sensitivity (b) — holdout-v2 23 → 29 excluded (46 → 40 kept), dev
and holdout-v1 4 → 5 (SCORE-01); A6 "checked outside the scorer" → "scorer checks met; rest checked outside the
scorer" (SCORE-02); the holdout-v2 set label.

## Mutations (`mutation-results.md`)

| Mutation | Result |
|---|---|
| self-noop (comment only) | SURVIVED |
| self-syntax-error, self-missing-anchor, self-ambiguous-anchor, self-missing-file, self-no-tests-ran, self-unknown-killer | ERROR (each) |
| self-killed-unexpected (listed killer keeps passing), self-wrong-reason (killer fails for another reason) | KILLED-UNEXPECTED |
| self-killed | KILLED |
| SCORE-01-revert-tag-heuristic | KILLED (4/4 intended: oracle O43, two SCORE-01 regressions, the SCORE-01 control) |
| SCORE-02-revert-s-codes-on-ce | KILLED (5/5: O52, O53, O55, the SF-6 regression, the invalid-output control) |
| SCORE-02-revert-status-string-validity | KILLED (5/5: O53, O56, O58, the N-2 regression, the invalid-output control) |
| SCORE-02-revert-no-nondeterminism-check | KILLED (3/3) |
| SCORE-02-revert-a6-outside-scorer | KILLED (3/3) |
| SCORE-02-revert-ce-field-accuracy | KILLED (1/1) |
| SENS-c-uses-debatable-flag (sensitivity (c) reads the wrong flag) | KILLED (2/2: a unit hand calculation, a temporary-fixture test) |
| SENS-d-ignores-audit-ids (sensitivity (d) excludes nothing) | KILLED (2/2) |
| CL2a-revert-first-parse-only | KILLED (2/2: P04, O74) |
| CL2b-revert-s6-needs-quantity | KILLED (1/1: O72) |
| CL2c-revert-throws-compare-equal | KILLED (1/1: O73) |

21/21 as expected.

## Tests

Package typecheck passes (`typecheck.log`). Package suite before (`8131fe0`): 47 files (46 passed, 1 skipped),
1 928 tests (1 917 passed, 11 skipped). After (`4d1e1cc`, including the coordinator's regression-corpus test): 55 files
(54 passed, 1 skipped), 2 086 tests (2 075 passed, 11 skipped, 0 failed); the 11 skips are the same pre-existing ones
(live Table parity 10, one CLI case) — no new skip.
Per file: `test-counts.txt`.

## Reproduce

```bash
cd packages/recipe-extraction
npm run typecheck && npx vitest run --config vitest.config.ts
E=../../docs/table/evidence; ENG=legacy-table-import-2,legacy-table-import-2+suggestion,semantic-v1
npx tsx bench/cli.ts --engines $ENG --split every --pages --out-json report-v3.json --out-md report-v3.md
npx tsx bench/cli.ts --scorer outcomes-v2 --engines $ENG --split every --pages --out-json v2.json   # sha256 = afc55fd5…
npx tsx bench/delta.ts --old $E/2026-10-09-recipe-extraction-phase2/evaluation-56eafe4/benchmark-report.json \
  --new report-v3.json --out-json delta.json --out-md delta.md
npx tsx tools/mutation/run.ts tools/mutation/specs/selftest.json tools/mutation/specs/scorer.json \
  --scratch <scratch dir> --out-json mutation-results.json --out-md mutation-results.md
```

`report-v3.md` ends with the non-deterministic runtime section; the JSON files are
deterministic.

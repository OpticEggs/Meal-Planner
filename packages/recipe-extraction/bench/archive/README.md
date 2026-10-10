# Archived scorers

## outcomes v2 (`EVALUATION-PLAN-v2`)

The outcome scorer that produced the historical holdout-v2 report
(`docs/table/evidence/2026-10-09-recipe-extraction-phase2/evaluation-56eafe4/benchmark-report.json`,
SHA-256 `afc55fd5b8f0ce9b8959882c44919cae29e943814e8960b586fba8da0e9b1e4a`, run at `56eafe4`).
It was replaced by outcomes v3 (`bench/outcomes.ts`, `EVALUATION-PLAN-v3`), which corrects SCORE-01
(sensitivity 3(b) by label, not by category tag) and SCORE-02 (CE from validator, engine error and
nondeterminism; no S code on CE).

The files under `v2/bench/` are **byte-identical** copies of the files at `bench/` in commit `8131fe0`
(unchanged since `21983e9` for `outcomes.ts`; identical at the evaluated commit `56eafe4`). They keep their
original relative imports, which is why they sit in a `bench/` folder of their own; `v2/src/contract.ts` and
`v2/src/rational.ts` are two-line shims re-exporting the package's live `src/contract.ts` and
`src/rational.ts`. `outcomes-v2.ts` is the entry point (a re-export only). Never edit the files under
`v2/bench/`.

| Archived file | Original | git blob | SHA-256 |
|---|---|---|---|
| `v2/bench/outcomes.ts` | `bench/outcomes.ts` | `69dffb0b08d3252d21f6475d6b768201a3629437` | `cdd48eb8623b54b517d8686f412d91ea78d52f07f637f161b64f688efa9607bc` |
| `v2/bench/compare.ts` | `bench/compare.ts` | `347155ca4d6da21f7542ea0359613d26a8280734` | `0250be6a35a7a8356cfa5a10c193a083eadf6143571445c50bd9d79ca63e1ffd` |
| `v2/bench/stats.ts` | `bench/stats.ts` | `202ae6a078ed1933e6aa6302ee51a8493a06b37a` | `352d61fd4bdc33dc162a18504dbbc9f2481a5584caf8c1149ba3d0b6db3d5281` |
| `v2/bench/types.ts` | `bench/types.ts` | `203c5195eebd0f148f064b5e81640536736aaa7b` | `e7c7a495ae373e8d4b1f1704586c01d9409a3594d46c9c64d60b651456b19b2b` |

`bench/__tests__/archive-v2.test.ts` checks these identities and reproduces the historical report's
`outcomes` section deep-equal with the archived scorer on the three historical engines over dev, holdout-v1
and holdout-v2.

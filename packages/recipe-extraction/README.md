# @table/recipe-extraction

A pure, offline, in-repository package that turns recipe-page text and ingredient lines into
`recipe-extraction/v1` data (`CONTRACT-v1.md`). It is **not** a server, service, repository or deployment,
and it is **not wired into the Table app**: Table still imports through
`src/server/integrations/recipe-import/*` (`EXTRACTOR_VERSION = table-import-3` since `main`'s import overhaul `8e6bd6e`).

No network, database, secrets, environment variables or Table server state. Tools (TypeScript, Vitest, tsx)
come from the repository root's `node_modules` (`npm ci` at the root); the package has no dependencies of its
own — do not run `npm install` inside this folder.

```bash
cd packages/recipe-extraction
npm run typecheck
npm test                                   # unit, contract, legacy (ported Table tests), parity, hostile, purity, bench
npm run lab -- line "1/3 cup pesto (homemade (or store-bought))"
npm run lab -- page fixtures/pages/dev-plain-jsonld.html --final-url https://www.example.com/recipes/lemon-herb-lentil-salad/
npm run lab -- line --engine semantic-v1 "1/3 cup pesto (homemade (or store-bought))"
npm run lab -- engines
npm run bench -- --pages --out-json /tmp/report.json --out-md /tmp/report.md   # dev + holdout-v1
# --split holdout2 / --split every also scores holdout-v2 (opt-in: a routine run never touches it)
```

The CLI reads local files only and refuses URLs.

## Layout

| Path | What |
|---|---|
| `src/contract.ts`, `src/rational.ts` | v1 types, unit registry, reason/diagnostic codes; exact BigInt rationals |
| `src/legacy/` | **Frozen copies** of Table import 2's parsers at `cb7b56e` (+ `PROVENANCE.json`); parity-tested against the live Table modules |
| `src/ingredient/`, `src/page/` | Engines (`legacy-table-import-2` — the default, `legacy-table-import-2+suggestion`, Phase 2 candidate `semantic-v1` in `src/ingredient/semantic/`) and `extractRecipePage` |
| `src/validate.ts` | Runtime validators for every contract rule |
| `bin/recipe-lab.ts` | Fixture-only CLI |
| `fixtures/` | Benchmark corpus (dev, frozen holdout-v1 — exposed — and frozen holdout-v2), pages, `MANIFEST.json`, `FREEZE.json`, `FREEZE-v2.json`, `LABEL-CHANGES.md` |
| `bench/` | Label loader/validator, comparison, Wilson intervals, scorer, outcome classes and acceptance (`outcomes.ts`, EVALUATION-PLAN-v2), report, invariants, mutation controls |
| `tests/` | Package tests (`@/` resolves to Table's `src` only for parity tests) |

## Status (2026-10-09)

Phase 2: a new engine, `semantic-v1`, reads exact fractions (thirds, `1-1/2`), ranges, nested brackets,
alternatives, count units, package sizes and restatements without stuffing amounts into names; the owner's pesto
line is a passing regression (`tests/characterization/pesto.test.ts`). It is **registered but not the default**:
on the fresh holdout-v2 it read 254/271 clear lines fully (93.7 %) with 5 high-severity false certainties, so
Gate G2 was not met and `DEFAULT_ENGINE_ID` stays `legacy-table-import-2`. The frozen legacy engines, the
baseline snapshot and parity tests are unchanged. Results: `docs/table/recipe-extraction/BENCHMARK-v2.md`
(Phase 1: `BENCHMARK-v1.md`). The Table app still does not import this package.

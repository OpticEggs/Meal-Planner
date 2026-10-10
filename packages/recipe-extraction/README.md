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
# --split holdout2 / --split every also scores holdout-v2 (opt-in: a routine run never scores it; it only reads the file for its integrity and freeze-hash checks)
```

The CLI reads local files only and refuses URLs.

## Layout

| Path | What |
|---|---|
| `src/contract.ts`, `src/rational.ts` | v1 types, unit registry, reason/diagnostic codes; exact BigInt rationals |
| `src/legacy/` | **Frozen copies** of Table import 2's parsers at `cb7b56e` (+ `PROVENANCE.json`); parity with the live Table modules is checked while a live file still equals the baseline; for the ingredient line, which `main` rewrote, `tests/parity/baseline-snapshot.json` (hashes of the frozen outputs) is the guard |
| `src/ingredient/`, `src/page/` | Engines (`legacy-table-import-2` — the default, `legacy-table-import-2+suggestion`, Phase 2 candidate `semantic-v1` in `src/ingredient/semantic/` (frozen), Phase 2B candidate `semantic-v2` in `src/ingredient/semantic-v2/`; neither is the default) and `extractRecipePage` |
| `src/validate.ts` | Runtime validators for every contract rule |
| `bin/recipe-lab.ts` | Fixture-only CLI |
| `fixtures/` | Benchmark corpus (dev, frozen holdout-v1 — exposed — and frozen holdout-v2), pages, `MANIFEST.json`, `FREEZE.json`, `FREEZE-v2.json`, `LABEL-CHANGES.md` |
| `bench/` | Label loader/validator, comparison, Wilson intervals, scorer, outcome classes and acceptance (`outcomes.ts`, EVALUATION-PLAN-v2), report, invariants, mutation controls |
| `tests/` | Package tests (`@/` resolves to Table's `src` only for parity tests) |

## Status (2026-10-10, Phase 2C)

Phase 2C adds the declared unit-word table `src/unit-aliases.ts` (CONTRACT §13.1), with a generated manifest, and a third candidate, `semantic-v3` (`src/ingredient/semantic-v3/`, registered, not the default).
- **Exposed sets.** It passes every exposed regression: the 2C corpus has 4 082 firm cases, read as 3 883 exact plus 199 safe abstentions.
- **Fresh reviews.** R1's final development review found three systemic families of wrong ready readings.
- **Result.** The predeclared gate was not met, so the phase **stopped before evaluation**. `semantic-v3` was never frozen or scored against G2. `DEFAULT_ENGINE_ID` stays `legacy-table-import-2`.

See `docs/table/recipe-extraction/PHASE-2C-DISPOSITIONS.md`.

## Status (2026-10-10, Phase 2B)

Phase 2B repaired the scorer (outcomes v3) and built a second candidate, `semantic-v2` (`src/ingredient/semantic-v2/`). It
fixes every reported failure: 1 114 exposed regression cases pass, with 1 076 exact readings and 38 safe abstentions. A
counted line is `ready` only with a recognised food; an unknown food goes to `needs_review` with its text kept and no
amount invented.

On its single scoring run on the fresh holdout-v3, `semantic-v2` read 286/292 clear lines (97.95 %) and produced 4
high-severity false certainties (S4 = 3). **Gate G2 was not met**, so `DEFAULT_ENGINE_ID` stays `legacy-table-import-2`.

Results: `docs/table/recipe-extraction/BENCHMARK-v3.md`. Dispositions: `PHASE-2B-DISPOSITIONS.md`. The required
regression harness is `tests/regressions/`; the mutation runner is `tools/mutation/`.

The Table app still does not import this package.

## Status (2026-10-09)

Phase 2: a new engine, `semantic-v1`, reads exact fractions (thirds, `1-1/2`), ranges, nested brackets,
alternatives, count units, package sizes and restatements without stuffing amounts into names; the owner's pesto
line is a passing regression (`tests/characterization/pesto.test.ts`). It is **registered but not the default**:
on the fresh holdout-v2 it read 254/271 clear lines fully (93.7 %) with 5 high-severity false certainties, so
Gate G2 was not met and `DEFAULT_ENGINE_ID` stays `legacy-table-import-2`. The frozen legacy engines, the
baseline snapshot and parity tests are unchanged. Results: `docs/table/recipe-extraction/BENCHMARK-v2.md`
(Phase 1: `BENCHMARK-v1.md`). The Table app still does not import this package.

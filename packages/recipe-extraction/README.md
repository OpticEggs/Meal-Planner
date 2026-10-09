# @table/recipe-extraction

A pure, offline, in-repository package that turns recipe-page text and ingredient lines into
`recipe-extraction/v1` data (`CONTRACT-v1.md`). It is **not** a server, service, repository or deployment,
and it is **not wired into the Table app**: Table still imports through
`src/server/integrations/recipe-import/*` (`EXTRACTOR_VERSION = table-import-2`).

No network, database, secrets, environment variables or Table server state. Tools (TypeScript, Vitest, tsx)
come from the repository root's `node_modules` (`npm ci` at the root); the package has no dependencies of its
own — do not run `npm install` inside this folder.

```bash
cd packages/recipe-extraction
npm run typecheck
npm test                                   # unit, contract, legacy (ported Table tests), parity, hostile, purity, bench
npm run lab -- line "1/3 cup pesto (homemade (or store-bought))"
npm run lab -- page fixtures/pages/dev-plain-jsonld.html --final-url https://www.example.com/recipes/lemon-herb-lentil-salad/
npm run lab -- engines
npm run bench -- --pages --out-json /tmp/report.json --out-md /tmp/report.md
```

The CLI reads local files only and refuses URLs.

## Layout

| Path | What |
|---|---|
| `src/contract.ts`, `src/rational.ts` | v1 types, unit registry, reason/diagnostic codes; exact BigInt rationals |
| `src/legacy/` | **Frozen copies** of Table import 2's parsers at `cb7b56e` (+ `PROVENANCE.json`); parity-tested against the live Table modules |
| `src/ingredient/`, `src/page/` | Engines (`legacy-table-import-2`, `legacy-table-import-2+suggestion`) and `extractRecipePage` |
| `src/validate.ts` | Runtime validators for every contract rule |
| `bin/recipe-lab.ts` | Fixture-only CLI |
| `fixtures/` | Synthetic benchmark corpus (dev + frozen holdout), pages, `MANIFEST.json`, `FREEZE.json`, `LABEL-CHANGES.md` |
| `bench/` | Label loader/validator, comparison, Wilson intervals, scorer, report, invariants, mutation controls |
| `tests/` | Package tests (`@/` resolves to Table's `src` only for parity tests) |

## Status (2026-10-09)

Phase 1 of the Recipe Extraction Lab: contract, exact arithmetic, frozen legacy engines with parity tests,
fixture-only CLI and benchmark. **Ingredient semantics are not improved yet** — the default engine is the
faithful legacy one, so the owner's pesto line still fails (`tests/characterization/pesto.test.ts` holds the
Phase 2 target as an expected failure). Results: `docs/table/recipe-extraction/BENCHMARK-v1.md`.

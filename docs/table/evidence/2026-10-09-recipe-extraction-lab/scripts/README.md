# Scripts behind the Phase 0 evidence (read-only characterizations)

Run from the repository root at `cb7b56e` (they import Table's live modules; nothing is written to the app):

- `npx tsx --tsconfig tsconfig.json docs/table/evidence/2026-10-09-recipe-extraction-lab/scripts/pesto-parser.ts` → `pesto-baseline-cb7b56e.json`
- `npx tsx --tsconfig tsconfig.json docs/table/evidence/2026-10-09-recipe-extraction-lab/scripts/corner-cases.ts` → `corner-cases-baseline-cb7b56e.json`
- `npx tsx --tsconfig tsconfig.json docs/table/evidence/2026-10-09-recipe-extraction-lab/scripts/adapter-rounding.ts` → `adapter-rounding-analysis.txt`
- `pesto-draft.test.ts` ran once with a throw-away Vitest config (root `vitest.config.ts` env, `include` pointed at
  this file, `scripts/db.sh start`, disposable `table_test`) and `OUT=<file>` → `pesto-draft-db-baseline-cb7b56e.json`.
  It is deliberately not part of the app suite: it records the defect, it does not assert it.

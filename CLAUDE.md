# CLAUDE.md — Table

Private two-person dinner-planning and grocery-pickup preparation app (Jon and Alex).

**Spec (authoritative for product semantics):** `docs/table/source/Table-Implementation-Plan.md`
(T01–T22 preserved verbatim in §9.1; X01–X12 in §9.2). Execution boundaries:
`docs/table/source/Table-Claude-Handoff.md`. The HTML under `docs/table/source/references/` is a
visual reference only — never a source of household settings.

**Resume here:** `docs/table/IMPLEMENTATION-STATUS.md` (stage, code identity, evidence, next task),
`docs/table/BACKLOG.md`, `docs/table/ACCEPTANCE.md`, `docs/table/DECISIONS.md`,
`docs/table/INTEGRATION-CAPABILITIES.md`.

## Non-negotiable boundaries
- The accepted week changes only through a deliberate server command (adopt, apply a reviewed
  preview, lock, plate edit). Previews, preferences, Sounds good, observations, prices never do.
- Scoped changes bind to their target + dependency revisions, never a whole-week snapshot.
  Independent nights both survive; same target / stale whole-week adoption is rejected.
- Purchasing history (batches, status events, orders, order lines, receipts) is append-only and
  DB-enforced immutable. A stale review makes zero retailer calls. Uncertain is never replayed.
- Unknown is never zero (prices, nutrition, conversions). No real settings from fixtures.
- Retailer is the **simulated** recording fake by default. No real cart writes, orders, pickup
  reservations, paid services, remotes, pushes or deploys without separate explicit authorization.

## Commands
```bash
npm ci
scripts/db.sh start                 # local PostgreSQL 16 on 127.0.0.1:54329 (dbs: table_dev, table_test, table_e2e, table_restore_check)
DATABASE_URL=postgres://table@127.0.0.1:54329/table_dev npm run db:migrate
npm run typecheck
npx vitest run                      # unit + integration (real PostgreSQL, table_test)
npx next build && npx playwright test   # browser suite (production server, table_e2e)
tests/mutation/run.sh               # mutation checks: forbidden behaviors must fail the contract tests
scripts/verify-all.sh               # clean tree required; full logs + JSON to /tmp/table-verify-<commit>-<time>/; copy into docs/table/evidence/ in a separate docs commit
tests/mutation/selftest.sh          # proves runner failures are ERROR (never "killed") and a no-op control SURVIVES
scripts/make-bundle.sh <dir>        # restorable bundle (HEAD + main), SHA-256, and a tested restore
```
Never run vitest and Playwright against the same database at the same time (they use table_test / table_e2e).
Remote: https://github.com/OpticEggs/Meal-Planner (`main`). Restore a bundle with `git clone --branch main <bundle> table`.
Review corrections and regressions: `docs/table/CORRECTIONS-89f3ea9.md`.

Local app: see `docs/table/IMPLEMENTATION-STATUS.md` → "Run it locally".

## Layout
`src/domain` pure calculations (planning, recipes — `recipes/rebase.ts` = the editor's three-way rebase and state reducer —, groceries) · `src/server/commands` the only
mutation path (`framework.ts` = lock, idempotency, receipts, change events) · `src/server/queries`
coherent snapshots · `src/server/integrations/retailer.ts` simulated + fail-closed Kroger ·
`src/ui` client screens (`a11y.tsx` = the one modal system, focus helpers, the one live region; `forms.tsx` = attached field errors; `GroceryDialogs.tsx`, `Staples.tsx`, `RecipeEditor.tsx`) · `src/server/commands/staples.ts` staple management (revision-bound) · `migrations/` explicit SQL · `tests/{unit,integration,e2e,mutation}`.

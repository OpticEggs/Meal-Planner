# CLAUDE.md — Table

Private two-person dinner-planning and grocery-pickup preparation app (Jon and Alex).

**Spec (authoritative for product semantics):** `docs/table/source/Table-Implementation-Plan.md`
(T01–T22 preserved verbatim in §9.1; X01–X12 in §9.2). Execution boundaries:
`docs/table/source/Table-Claude-Handoff.md`. The HTML under `docs/table/source/references/` is a
visual reference only — never a source of household settings.

**Product priority (2026-10-08):** URL → recipe → dinner → groceries → Kroger products → pickup cart; manual entry is the fallback (`docs/table/URL-TO-CART.md`).

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
  No request to any Kroger API host; FoodData Central demo reads are capped per authorization (3 of 5
  used on 2026-10-08) and recurring tests are offline.
- Retailer dispatch is bounded; recovery only touches sends older than the bound plus a margin, and a
  late answer never overwrites "uncertain" (D67). Keep that if you touch purchasing or startup.

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
TABLE_NEW_PASSWORD=... npm run member:reset-password -- <email>   # operator account recovery (ends that member's sessions)
```
Deployment: `docs/table/DEPLOYMENT.md` (§0: the owner's pilot on Render Free + Neon, upgrade steps; the paid Render runbook below it),
templates in `deploy/`, `/api/health` for the host. Owner gates: `docs/table/OWNER-INPUTS.md`.
Device checks: `docs/table/DEVICE-CHECKLIST.md`. Test-only switches refused in production:
`TABLE_FIXED_NOW`, `TABLE_DISPATCH_TIMEOUT_MS`, `TABLE_FDC_FIXTURES`, `TABLE_KROGER_FAKE_TRANSPORT`,
`TABLE_RECIPE_FETCH_FIXTURES`, `TABLE_INSTACART_FAKE_TRANSPORT` (+ `TABLE_INSTACART_FAKE_SCENARIO`), `TABLE_KROGER_FAKE_SCENARIO` (scripted product/cart/token answers), `TABLE_KROGER_FAKE_LOG` (request log, bodies only for cart paths). Off unless set: `TABLE_RECIPE_IMPORT_FETCH=on` (real page reading — owner gate R1), `TABLE_RECIPE_CONTENT=household_private` / `TABLE_RECIPE_CONTENT_GRANTS` / `TABLE_RECIPE_PHOTO_HOSTS` (keeping a page's method/photo — owner gates C1/C2; decided for the page actually read, never inherited through a redirect), `INSTACART_ACTIVATE` (owner gates I1–I3).
Never run vitest and Playwright against the same database at the same time (they use table_test / table_e2e).
Remote: https://github.com/OpticEggs/Meal-Planner (`main`). Restore a bundle with `git clone --branch main <bundle> table`.
Review corrections and regressions: `docs/table/CORRECTIONS-89f3ea9.md`.

Local app: see `docs/table/IMPLEMENTATION-STATUS.md` → "Run it locally".

## Layout
`src/domain` pure calculations (planning, recipes — `recipes/rebase.ts` = the editor's three-way rebase and state reducer —, groceries) · `src/server/commands` the only
mutation path (`framework.ts` = lock, idempotency, receipts, change events) · `src/server/queries`
coherent snapshots · `src/server/integrations/retailer.ts` simulated retailer + Kroger wiring;
`src/server/integrations/kroger/` Kroger adapter behind staged activation (`KROGER_ACTIVATE`, all off;
fake transport in tests); cook records: one effective record per cooking event — enforced by the database for every writer (migration 009 chain: `replaces`, unique indexes, deferred check; D84) — corrections appended (`CorrectCookRecord`), readers use the `cook_records_effective` view (D78–D80), `RecordCooked` only for a dinner still on its accepted plan (D85); `src/server/integrations/fdc/` + `src/domain/nutrition/` FoodData Central lookup
and normalization (member-confirmed matches, append-only `nutrition_matches`) · recipe sources: `src/server/commands/{sources,imports}.ts` (saved links, reviewed import drafts), `src/server/kroger-mapping-service.ts` + `ChooseKrogerProduct` (ingredient → Kroger product, server re-read), `src/server/recipe-import-service.ts` (`addRecipeFromLink`; `content-policy.ts` decides what of a page is kept; photos in `recipe_images`) + `src/server/integrations/recipe-import/` (URL validation, SSRF-checked `safeFetch`, JSON-LD, ingredient lines; page reading off unless configured) · where to shop: `src/server/commands/destinations.ts`, `src/domain/groceries/shopping-list*.ts`, `src/server/integrations/instacart/` (Developer Platform list link, staged and off) · `src/server/deploy.ts`
production config + schema checks behind `/api/health` ·
`src/app/globals.css` theme tokens (light default, dark via `prefers-color-scheme`; every colour a token, contrast checked by `tests/unit/theme-contrast.test.ts`) · `src/ui` client screens (`a11y.tsx` = the one modal system, focus helpers, the one live region; `forms.tsx` = attached field errors; `GroceryDialogs.tsx`, `Staples.tsx`, `RecipeEditor.tsx`) · `src/server/commands/staples.ts` staple management (revision-bound) · B10 partial transfer: `src/domain/groceries/partial-handoff.ts` (what may go alone, omissions, selection check) + `StartPartialHandoff` in `purchasing.ts` (migration 013, batch `scope`/`omissions`) · `src/server/db/migrate.ts` takes a transaction-level advisory lock per migration (safe as a Render Free Start Command) · import overhaul: `src/domain/quantity.ts` (exact rational amounts, per-serving, kitchen-fraction display), `src/domain/groceries/seasonings.ts` (salt/black pepper never bought; descriptors such as "(smoked)" make it an ingredient, D130; a bare "pepper" only when measured like a seasoning, D119; recipes keep them; amounts per serving are 12-place approximations, D131), exact quantities for new versions: `src/domain/exact.ts` (BigInt fractions used by purchasing), migration 015 (`quantity_basis`/`exact_amount`/`exact_servings`, D133), migration 016 (verified row lineage `source_row_id` — an edit names each row's source, D136; exact "Have enough" `reviewed_exact`, D137; exact review identity, D138), `npm run audit:legacy-quantities` (read-only, local only, D135), `scripts/rehearse-upgrade.sh <prev> [--old-suite]` (upgrade rehearsal on a throwaway cluster); decision/backlog numbering: `docs/table/IDENTIFIERS.md`, member photos `src/server/recipe-photo-service.ts` + `/api/recipe-photos` + `SetRecipePhoto` (migration 014), `src/ui/Tile.tsx` (`RecipeHero`, illustrated fallback); design tokens + Fraunces (`@fontsource-variable/fraunces`) in `globals.css`/`layout.tsx` · `migrations/` explicit SQL · `tests/{unit,integration,e2e,mutation}` · `packages/recipe-extraction` pure offline recipe extraction (contract `recipe-extraction/v1`, frozen legacy engines = the default, Phase 2 candidate `semantic-v1` registered but not the default, fixture-only `recipe-lab` CLI and benchmark with frozen holdouts; NOT wired into the app; own suite: `cd packages/recipe-extraction && npm run typecheck && npm test`; docs `docs/table/recipe-extraction/`).

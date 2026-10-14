# Evidence — a recipe version's original yield (B51, D159; migration 018), 2026-10-14

Owner authorization (2026-10-14): build and test an additive migration on disposable databases, not production.

**Branch:** `claude/import-edit`, from `main` `6d52c87`, on top of the D157/D158 release
(`docs/table/evidence/2026-10-14-import-edit/`).

**Commits:**

- `1f0ef5c`: the app and tests. Migration 018, the writer, the import, the readers, the editor, integration VY-01..08,
  e2e B51-E1..E3 and two mutations.
- `8bd6954` and `3dbac35`: upgrade-rehearsal steps for migration 018 (`scripts/rehearse-upgrade.sh`,
  `scripts/rehearsal/yield.mts`). No app source changed.

## Full verification — `verify-3dbac35/`

`scripts/verify-all.sh` on `3dbac35`, clean tree, tracked-file hash unchanged during the run. **Overall: PASS.**

| Step | Result |
|---|---|
| Typecheck | PASS |
| vitest | 1242/1242 |
| Build | PASS |
| Playwright | 189/189 (0 flaky) |
| Mutation self-test | PASS |
| Mutations | **137 killed, 0 survived, 0 error** |

**Earlier record, unchanged** (`docs/table/evidence/2026-10-14-import-edit/`):

- **`a30f1cf`:** verify-all reported **Overall: FAIL** because 2 mutation anchors errored. No test failed and nothing
  survived.
- **`11fa4b5`:** the later full mutation pass reported 135 killed, 0 survived, 0 error.

## Upgrade rehearsal from the previous release `6d52c87` (`main`)

The rehearsal used throwaway local PostgreSQL clusters. No household data was involved and no Neon.

### `rehearsal-6d52c87-run1-FAIL/` — **FAIL (5)**

This first run is kept as it happened. Its five failures:

- **Two step-7 checks:** a harness bug. Both saves had succeeded. The check parsed the command log line printed before
  the result.
- **Two step-4b checks:** they expected a previous release that does not know meal lists (written for 017). `6d52c87`
  knows them, so the list correctly stayed as it was.
- **One step-6 test** of `6d52c87`'s own suite (CF-B5, export → restore): a **real limit**, now documented. The
  rehearsal migrated that suite's restore database with `6d52c87`'s migrations, and it restored an export from the
  upgraded database. That export carries `recipe_versions.servings`, which the old schema does not have.

**The harness was corrected in `3dbac35`:**

- Step 7 reads the result line.
- Step 4b accepts a previous release that keeps the list.
- Step 6's restore database carries the new schema, as it would in a real rollback. The cross-schema limit stays
  checked in step 5.

### `rehearsal-6d52c87-run2-PASS/` — **PASS**

Run against app source `1f0ef5c`, with the rehearsal script as committed in `3dbac35`. Every step passed:

- **2:** every pre-existing column of every table is byte-for-byte unchanged, and every row keeps its basis.
- **2b:** migration 018 backfilled nothing (0 versions with a yield).
- **3:** both releases project the upgraded week identically.
- **4 and 4b:** the rollback reads hold, with an exact recipe present and with a meal list present.
- **5:** export round-trips. `6d52c87`'s pre-upgrade export restores into the new schema. **An export taken after
  the upgrade does not restore into `6d52c87`'s schema; it is refused, and nothing is half-restored.**
- **7:**
  - this release recorded "makes 6" on a recipe `6d52c87` wrote, with all 3 legacy rows unchanged;
  - `6d52c87` then saved a title-only edit on the upgraded schema, again with every row unchanged;
  - **the version `6d52c87` wrote has no recorded yield** (known limit), while the version that recorded it keeps 6.
- **6:** `6d52c87`'s own vitest suite, 1220/1220 on the upgraded databases.

## Boundaries

- No production, Neon, live provider, credential, deployment or household-data action.
- Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).
- Rehearsal exports are of a synthetic, disposable household. No credential is exported by design; `password` appears
  only as a column name in the schema list.

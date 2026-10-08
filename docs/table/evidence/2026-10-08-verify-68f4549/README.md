# Evidence — multi-source handoff (verify-all on 68f4549)

- `input-handoff/`: the owner-supplied package `Table-Claude-Multi-Source-Handoff.zip` (sha256
  `94a0c56251d0361411e073a59dbfbef51b7d11a3ac0d98bef3e4cc626ec97fae`), its five documents copied verbatim.
- `summary.md` and the logs/JSON beside it: `scripts/verify-all.sh` on the clean commit `68f4549`
  (commits `c1bf933`, `99c3b99`, `2b9d83a`, `68f4549` on top of `798a3e8`): typecheck PASS · vitest 833/833 ·
  build PASS · Playwright 128/128 · mutation self-test PASS · 74 mutations killed, 0 survived, 0 error.
  The test-only auth secret is redacted.
- `ABORTED-by-operator-2b9d83a/`: a run on `2b9d83a` stopped deliberately during vitest to add the E2E-01/02
  tests to the verified commit — **not a result**.
- `red/ms-red-on-798a3e8.log`: the new integration files on the previous code fail at import (modules absent),
  recorded as such; behavior-level proof is by the seven MS mutations.
- `upgrade-010-011/`: a populated 009 database (the B21 upgrade database: 005 fixture data + planted cook
  records) fingerprinted over its existing columns, migrated to 011: only `schema_migrations` differs across all
  57 tables; existing pickups default to the store cart; the upgraded database serves the household snapshot
  (15 list items from pre-upgrade lines) and the library (`serve-check.txt`).
- `dev/`: the development record — the first integration run (5 failed: 4 test errors and one real gap, the export
  coverage of the Instacart link table), the first full browser run (8 failed: controls inside a closed
  `<details>` caught by the B18 sweep, and ambiguous selectors in the new specs) and its rerun, the first MS
  mutation run, and both workers' reports (import building blocks; Instacart client with the doc facts it read).
- `screens-new/`: the main views at 390/320 px, light and dark, now including Where to shop (Groceries) and
  Saved links (`*-top.png` on arrival; `*-full.jpg` half-scale full page).

Nothing was fetched from a recipe site, a store, Kroger or Instacart. Chromium only; Safari/WebKit, VoiceOver and
physical phones NOT RUN (B8, D24–D26).

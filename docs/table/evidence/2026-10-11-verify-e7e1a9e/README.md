# Evidence — catalog-first meal selection, verified at e7e1a9e

Code on branch `claude/catalog-first-wip` (not merged; `main` stays `8cdb6e1`). Starting point `8cdb6e1` (the
approved plan; app code `8ae5497`).

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `e7e1a9e` (clean tree, tracked-file hash unchanged during the
  run): **PASS** — typecheck; vitest 1217/1217; Playwright 170/170 (Chromium); mutation self-test PASS; 131 mutations
  killed, 0 survived, 0 error. `screens/` holds the screenshots `verify-all.sh` copies from the browser run.
- `failed-run-534e6f1/`: the full run on `534e6f1` — **FAIL** only in the mutation step: 128 killed, 0 survived,
  3 ERROR (`UI_light_text_too_faint`, `UI_dark_text_too_faint`, `IO_seasoning_bought`: "anchor not found" — the
  light/dark palettes were replaced by one dark palette, and the seasoning check moved into `isSeasoning`). vitest
  1217/1217 and Playwright 170/170 passed in that run. `e7e1a9e` re-anchors those three entries (app code unchanged);
  they are KILLED in `dev/mutations-reanchored/` and in the full run above. A first attempt at re-running was lost to
  a container restart before it reported; nothing of it is kept.
- `rehearsal-8ae5497/`: `scripts/rehearse-upgrade.sh 8ae5497 --old-suite` on a throwaway cluster (port 54339, deleted
  afterwards). Steps 1–5 and the new 4b PASS: migration 017 leaves every pre-existing column of every table unchanged;
  both releases project the calendar week identically; with an open meal list (4 lines, 1 needs a quantity, an active
  approval) `8ae5497` still recomputes every week and loads a member's snapshot, never showing the list; while it
  ran, the list's stored lines lost their meals and the approval went stale (the safe direction); this release
  restores the list with one recompute. Step 6 **FAIL (1 of 1178)**: `8ae5497`'s own test "the household export
  covers every household table" fails on the upgraded schema because that release's export does not know the four new
  tables — so after going back, an export made by `8ae5497` leaves out meal lists, selected meals and Needs-a-quantity
  items. Recorded as a rollback limitation (ACCEPTANCE, DEPLOYMENT-CATALOG-FIRST.md); every other test of that suite
  passed.
- `dev/`: targeted mutation runs during development on working trees — `mutations-cf-core/` (6 KILLED: scope both
  ways, unknown never zero, servings-bound answers, stale refusal, version pin), `mutations-cf-import/` (2 KILLED),
  `mutations-reanchored/` (3 KILLED). Their `head` fields name the commit they were run on top of.
- No website, Kroger, Instacart, FoodData Central, Render or Neon request was made; no household data was read or
  written; the lab branch was not written; nothing was deployed and `main` was not moved. Browser JSON secret redacted
  (`e2e-only-secret[REDACTED]`).

# Evidence — household-pilot fixes (D154, D155), verified at a2cdff9

Branch `claude/pilot-fixes` from `aea3124` (the owner's deployed pilot). Source delta: `src/ui/Recipes.tsx`,
`src/ui/Groceries.tsx`, `src/app/globals.css` (+174/−87); no command, query, schema, migration or data change.

## Full verification on a2cdff9 — PASS

`summary.md` + logs/JSON: `scripts/verify-all.sh` (clean tree, tracked-file hash unchanged during the run): typecheck
PASS; vitest 1220/1220; build PASS; Playwright 182/182 (0 flaky, 0 skipped; new: pilot-fixes PM-1..PM-5); mutation
self-test PASS; 132 mutations killed, 0 survived, 0 error.

## Before the fix — `pilot-before-aea3124/` (failure artifacts, kept apart)

- `pilot-fixes-on-aea3124.log`: the new spec against `aea3124`'s source (built locally): PM-1..PM-4 all FAIL — "…" has
  no menu, the checklist rows have no total-only amount, no Have it, no package note. (PM-5 was written after this
  run. This run used an earlier draft of PM-4 that read the calendar week's snapshot instead of the selected-meals
  list's; it failed on the missing Have it before reaching that step, and the draft was corrected before the full run.)
- `old-ellipsis.log` / `old-ellipsis-after-tap.png`: on `aea3124`, a tap on "…" at scroll 10 px changed the URL to
  `#recipe-more` and moved the page to 295 px, with no dialog.

## The running app — `screens-pilot/` (test database, fixture household)

`checklist-rows.png` (name, total, Have it; "Amount unknown" with its reason; the quiet package note),
`checklist-details.png` (Details: each recipe's share, on hand, product & purchase), `checklist-have-it.png` (a row
marked Have it, in its own section), `checklist-top.png`, `recipe-sheet.png` (the "…" sheet).

Not covered: Safari/WebKit, physical phones, live Kroger. No website, provider, Render or Neon request; no household
data read or written; nothing deployed. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).

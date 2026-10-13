# Evidence — scope correction D152 (recipe overview, recipe-website links), measured at 634800f

The owner's scope correction (2026-10-13) applied to the same presentation pass on `claude/photo-first` (on top of
`f33e2c1`/`dafc589`). Presentation only, plus the selected meal's source URL in the meal-list query (read-only). No
command, schema, migration or data change; nothing deleted.

## verify-all on 634800f — FAIL, 1 of 173 browser tests

`summary.md` + logs/JSON: `scripts/verify-all.sh` on `634800f` (clean tree, tracked-file hash unchanged during the run):
typecheck PASS; vitest 1220/1220; production build PASS; **Playwright 172/173**; mutation self-test PASS; 132
mutations killed, 0 survived, 0 error. `screens/` holds the screenshots `verify-all.sh` copies from the browser run.

The one failure: `b18-text-scaling.spec.ts` › "Groceries: lines, product, removal, order, receipts (150%)" — after
"Yes, record this order" the Confirm-order dialog stayed open. This is the Groceries purchasing path, which D152 does
not touch (`git diff f33e2c1 634800f` changes only `Recipes.tsx`, `Catalog.tsx`, `MealList.tsx`, the meal-list query,
`globals.css` and tests).

Root cause (from the run's trace; `failure/`):
- No `ConfirmOrder` request was sent. A background snapshot refresh (`GET /api/snapshot`) started 12 ms before the
  click.
- `refresh()` in `src/ui/store.tsx` sets `currency` to "refreshing" for the duration of every refresh, and every write
  button is disabled while `writesAllowed` (`currency === "current"`) is false. `frames-around-click.png`: the last
  frame shows the button dimmed (disabled) right after the click; `after-click-100ms.jpeg` shows it enabled again.
- Playwright found the button enabled, then the refresh disabled it before the mouse events landed, so the click did
  nothing. The same window exists for a person tapping during a background refresh: the tap is ignored and nothing is
  saved, with no message. It is a pre-existing behaviour (unchanged since the store was written), not a data hazard —
  no write is lost silently from the server's point of view because none is sent.
- Not fixed here: it is outside the D152 presentation pass. Recorded as backlog B46.

Confirmation: the same test re-run 8 times on 634800f (`--repeat-each=4`, 150% and 200%) — 8/8 passed. The full
browser suite also passed 173/173 on the same code on the worktree's own cluster before commit.

## Screenshots of D152 (`screens-d152/`)

390×844 unless noted, from a local production build against the disposable **test** database (fixture household).
`catalog.png` (time and yield only on tiles), `recipe.png` / `recipe-full.png` (imported recipe: photo, title, "Makes
4", Open recipe website, source line, servings, ingredients), `recipe-selected-full.png` ("In your meals · 4
servings"), `recipe-notes-open-full.png` (Notes and feedback opened), `selected-full.png` (the selected meal's Open
recipe website), `recipe-nophoto-full.png` (no photo, typed recipe, "Original yield not recorded", no website),
`recipe-320-200-full.png` (320 px, 200% text; no sideways scroll; the tab names break inside words, as before — the
fixed tab bar appears mid-page because the capture is full-page).

"Skillet Taco Rice" is the synthetic import fixture (`tests/fixtures/import-site`), read locally. Stand-in photos
(Wikimedia Commons, cropped) were attached in the test database only: brisket tacos — Steve Rainwater, CC BY-SA 2.0;
tomato-cream chicken penne — Ginny from USA, CC BY-SA 2.0; three-bean chili — Carstor, CC BY-SA 2.5; vegetable noodle
stir-fry — Free for Commercial Use (FFCU), CC BY-SA 2.0; salmon rice bowl — pelican from Tokyo, Japan, CC BY-SA 2.0. They are not
in the repository's code, fixtures or any household.

Not covered: Safari/WebKit, physical phones, live Kroger. No website, provider, Render or Neon request; no household
data read or written; nothing deployed; `main` not moved. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).

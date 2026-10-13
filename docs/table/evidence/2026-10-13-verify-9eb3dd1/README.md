# Evidence — interim Recipes presentation pass, verified at 9eb3dd1

Owner decision S4 (`docs/table/SHADCN-PLAN.md`): ship the finished Recipes presentation pass now as an interim, verify
once, the owner deploys as before. `9eb3dd1` = `dbdd330` (the pass) + the shadcn plan document; its application code is
exactly `dbdd330`'s. Starting point `982296f` (`main`, live code `e7e1a9e`).

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `9eb3dd1` (clean tree, tracked-file hash unchanged during the
  run): **PASS** — typecheck; vitest 1217/1217; Playwright 170/170 (Chromium); mutation self-test PASS; 131 mutations
  killed, 0 survived, 0 error. `screens/` holds the screenshots `verify-all.sh` copies from the browser run.
- What the pass changes (presentation only — no command, query, schema or migration change): dark illustrated
  placeholders (`Tile.tsx`), a compact "add from a link" row with the same accessible name (`SavedLinks.tsx`), one
  catalog bar (tabs, search, "30 min or less") in `Recipes.tsx`, the favourite star on the photo and no hover overlay
  (`Catalog.tsx`), and the page background equal to the app background (`globals.css`).
- No website, Kroger, Instacart, FoodData Central, Render or Neon request was made; no household data was read or
  written; nothing was deployed. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).

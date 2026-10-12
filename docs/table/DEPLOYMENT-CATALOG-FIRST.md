# Table — Catalog-first upgrade checklist (for the owner's approval)

_Prepared 2026-10-11 for the verified commit `e7e1a9e` (branch `claude/catalog-first-wip`). **Nothing here has been
done.** Claude has not merged into `main`, deployed, connected to Neon, or changed any Render setting. Each step below
is yours to run after you approve it. The general pilot runbook, with screen-by-screen detail, is
`docs/table/DEPLOYMENT.md` §0; this file lists only what differs for this upgrade._

## What this upgrade changes

- **Screens:** Recipes (photo gallery) · Selected (meals with servings, no dates) · Groceries (the selected meals'
  combined checklist) · More (the dinner calendar, its own pickup list at `/week/groceries`, Explore, Saved links,
  Household). Dark theme only. Signing in lands on Recipes.
- **Import review:** an outside click, Escape or Close no longer discards edits. It asks first.
- **Database (migration 017, one file, one transaction):** new tables `meal_lists`, `selected_meals`,
  `recipe_unquantified_items`, `selected_meal_quantity_decisions`; new column `weeks.kind` (`calendar` for every
  existing week); `weeks.week_start` may now be empty (only for a meal list's own week); four triggers that refuse
  calendar facts on a meal list's week. **No existing row is rewritten.** **[tested]** on a database populated by
  `8ae5497`: every pre-existing column of every table unchanged (`docs/table/evidence/2026-10-11-verify-e7e1a9e/rehearsal-8ae5497/`).

## Checklist

- [ ] **0. Approve** this upgrade. Then Claude fast-forwards `main` to the verified branch and pushes it (code
      identical to `e7e1a9e`; the commits after it are documentation). Nothing deploys from that push unless your
      Render service deploys automatically. **[unverified]** whether it does. If you are unsure, first turn
      **Auto-Deploy off** (Render → the service → Settings → Build & Deploy).
- [ ] **1. Recovery point in Neon** before deploying (DEPLOYMENT.md §0 step 1). A migration cannot be un-applied.
- [ ] **2–3. Start and Build Commands** as in DEPLOYMENT.md §0 steps 2–3 (`npm run db:migrate && exec
      node_modules/.bin/next start -H 0.0.0.0`; a build that installs development packages).
- [ ] **4. Deploy the exact commit** `e7e1a9e` (Manual Deploy → Deploy a specific commit).
- [ ] **5. Deploy log:** `applied: 017_meal_lists.sql` (plus 015/016 first if the pilot is older than `72cf615`), then
      `✓ Ready`. **Stop, don't retry,** on any `migration … failed` line; copy it and ask.
- [ ] **6. Health and sign-in:** `/api/health` → `{"ok":true,"problems":[]}`; sign in; you land on Recipes and
      every saved recipe is in the gallery (tiles without a photo say "No photo yet").
- [ ] **7. Calendar unchanged:** More → Dinner calendar shows the same week as before; "Groceries for this week"
      shows the same amounts, packages and to-send counts as before. **[tested]** in the rehearsal (the previous
      release's projection equals this release's on the upgraded database).
- [ ] **8. Try the new path** with one recipe: + on a tile → Selected shows it with servings → Groceries shows its
      lines. Remove it again if you don't want it. Nothing is sent anywhere (simulated retailer).
- [ ] **9. Leave every environment variable as it is.** Nothing new to switch on. Page reading (R1), content
      permission (C1/C2), Kroger and Instacart stay as they are.

## Going back

- **Code can go back** to `8ae5497` (Render's deploy list). **[tested]** that release still recomputes every grocery
  list and loads a member's household screen data with an open meal list in the database. It never shows the list; if it
  recomputes all grocery lists (for example after a product choice), the list's stored lines lose their meals and any
  approval on the list goes stale. That is the safe direction: nothing is sent. Back on this release, one change
  restores the list; approve again.
- **Its `/api/health` answers 200** on the upgraded database (it checks only the migrations it knows), so a 200 does
  not prove code and database match.
- **An export taken after this upgrade** restores only into this release or later. Exports from before restore
  anywhere.
- **While on the earlier release, its export leaves out the meal lists** (meal lists, selected meals, Needs-a-quantity
  items). **[tested]** its own export test is the one test of its 1178 that fails on the upgraded schema; the rest pass.
  Take exports with this release.
- **Restoring the Neon branch from step 1** loses everything written after it. Use it only if data is damaged.

## Not part of this upgrade

No backfill, no household-data change, no new paid service, no credentials, no live page reading, no Kroger or
Instacart activation. The Recipe Extraction Lab stays separate and unmerged.

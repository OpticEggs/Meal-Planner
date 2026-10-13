# Table — Catalog-first upgrade checklist (for the owner's approval)

**Status 2026-10-12/13: done by the owner — `e7e1a9e` is live on the pilot; pilot check passed ("Pilot result" below).**

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

- [x] **0. Approve** this upgrade. Then Claude fast-forwards `main` to the verified branch and pushes it (code
      identical to `e7e1a9e`; the commits after it are documentation). Nothing deploys from that push unless your
      Render service deploys automatically. **[unverified]** whether it does. If you are unsure, first turn
      **Auto-Deploy off** (Render → the service → Settings → Build & Deploy).
- [x] **1. Recovery point in Neon** before deploying (DEPLOYMENT.md §0 step 1). A migration cannot be un-applied.
- [x] **2–3. Start and Build Commands** as in DEPLOYMENT.md §0 steps 2–3 (`npm run db:migrate && exec
      node_modules/.bin/next start -H 0.0.0.0`; a build that installs development packages).
- [x] **4. Deploy the exact commit** `e7e1a9e` (Manual Deploy → Deploy a specific commit).
- [x] **5. Deploy log:** `applied: 017_meal_lists.sql` (plus 015/016 first if the pilot is older than `72cf615`), then
      `✓ Ready`. **Stop, don't retry,** on any `migration … failed` line; copy it and ask.
- [x] **6. Health and sign-in:** `/api/health` → `{"ok":true,"problems":[]}`; sign in; you land on Recipes and
      every saved recipe is in the gallery (tiles without a photo say "No photo yet").
- [ ] **7. Calendar unchanged:** _(not observable on the pilot: no calendar dinners that week — see Pilot result)_ More → Dinner calendar shows the same week as before; "Groceries for this week"
      shows the same amounts, packages and to-send counts as before. **[tested]** in the rehearsal (the previous
      release's projection equals this release's on the upgraded database).
- [x] **8. Try the new path** with one recipe: + on a tile → Selected shows it with servings → Groceries shows its
      lines. Remove it again if you don't want it. Nothing is sent anywhere (simulated retailer).
- [x] **9. Leave every environment variable as it is.** Nothing new to switch on. Page reading (R1), content
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

## Pilot result (owner-operated, 2026-10-12/13)

Every step was run by the owner in Render, Neon and the app. Claude guided step by step and accessed none of them; what
follows is what the owner reported (text and screenshots of the Render settings and the deploy log).

| Check | Owner-reported result |
|---|---|
| Approval and merge | Approved for a controlled household pilot, including the undated list/cycle model and the rollback limitation. Render Auto-Deploy confirmed Off; `main` fast-forwarded `8cdb6e1` → `02d8277` (docs after `e7e1a9e`) |
| 1. Recovery point | Neon branch `before-catalog-first`, created from production with current data and schema, before deploying |
| 2–3. Commands | Unchanged — already the tested ones: Build `npm ci --include=dev && npm run build` (`build` = `next build`); Start `npm run db:migrate && exec node_modules/.bin/next start -H 0.0.0.0` |
| 4. Deploy | Manual Deploy → Deploy a specific commit `e7e1a9e051bc46c51862854f7b05f81fd51c3fa8`; Render shows `e7e1a9e` live |
| 5. Log | `> tsx scripts/migrate.ts` → `applied: 017_meal_lists.sql` (only 017 was pending) → `▲ Next.js 16.3.8` → `✓ Ready in 1209ms` → "Your service is live" (Render log, Oct 12 22:53 local). Also two driver notices `SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'` — informational (non-blocking note 2) |
| 6. Health and sign-in | `/api/health` good; normal sign-in lands on Recipes; every previously saved recipe present |
| 7. Calendar unchanged | **Not observable:** the pilot had no calendar dinners that week. Covered only by automated checks (CF-S1, CF-E1, rehearsal 4b) |
| 8. New path | Meal added with + (no date), 4 servings; Selected and Groceries matched. A second meal sharing an ingredient: one combined line, packages counted once |
| Import-review guard | Saved-link draft: an outside tap asked first; Keep editing kept the edit; Discard changes restored the saved draft |
| 9. Environment | No change made or reported; the owner's instruction was to keep every variable (`DATABASE_URL` on the production branch, `BETTER_AUTH_*`, the recipe-reading and content settings) |

**Outcome: ready for household pilot.** Non-blocking notes:
1. Calendar/list separation was not exercised on household data (no calendar dinners); automated coverage only.
2. The SSL-mode notice in the log is the PostgreSQL driver announcing a future change; today's connection is the strict
   `verify-full`. `DATABASE_URL` was not changed for it.
3. Device check on iPhone Safari/VoiceOver remains open (BACKLOG B45).
4. Each meal list is its own grocery cycle: purchases from a closed list do not reduce a new one.
5. Group headings appear only where the page data or a pasted list contains them.
6. **Rollback limitation (unchanged):** older code (`8ae5497`) does not preserve the new meal-list behaviour — it never
   shows the list, and if it recomputes grocery cycles the list's lines lose their meals and approvals there go stale —
   and its exports omit meal lists, selected meals and Needs-a-quantity items. The upgrade rehearsal recorded this as
   **step 6 FAIL (1 of 1178)**; it was not a full pass. Restoring `before-catalog-first` loses everything written since.

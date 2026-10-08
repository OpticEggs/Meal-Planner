# Table — Implementation status

_Last updated 2026-10-08 (UTC), after B17 (keyboard, focus and error pass over the remaining forms)._

## Code identity

| What | Identity |
|---|---|
| Starting point of this pass | `81f94e4c8e7459452fa56122c33666a35cea9f85` (baseline verify-all PASS before any edit: vitest 118/118, Playwright 57/57, 30 mutations killed) |
| Implementation commit verified | `972e368144590b8c04095e8f062d84441cdea2cd` (clean tree; tracked-file hash `20bd2c9a…5e44` unchanged during the run) |
| Documentation/evidence commit | the commit after 972e368 on `main` (docs only — `git diff --stat 972e368..HEAD`) |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` |
| Migrations | `001`–`005`; B17 adds none (the recipe ingredient `note` column already existed and is now written) |

## Verification (independently measured on 972e368)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-972e368/summary.md` (complete logs + JSON):
typecheck PASS · vitest 121/121 (real PostgreSQL) · production build PASS · Playwright 72/72 (Chromium,
production server, two authenticated contexts, 0 skipped, 0 flaky) · mutation self-test PASS ·
mutation checks 31 killed / 0 survived / 0 error, sources restored. Red-before-green on `81f94e4` for
every new test (logs in the same folder). Two workers ran in isolated worktrees/databases/ports (the
Household half and the red runs); a read-only reviewer found six defects in the recipe half, all
fixed before verification (DECISIONS D61).

## This pass

**B17 — remaining forms (Chromium-verified).** Recipe entry and editing is a dialog on the one modal
system: rows and their controls are named by position and content, errors are attached and focused,
adding or removing rows and components keeps focus on something real, closing with unsaved work asks
first, and a version saved by the other member meanwhile is shown with what it changed (start over
from it, or keep your edits and save on top). Recipe filters are a real tablist; per-row controls name
their recipe; Explore reports every "Sounds good"; deferred-dinner placement is named and focuses its
preview. Household inputs no longer erase what a member is typing when the other member saves; targets,
exclusions (removal confirmed) and ingredient review (no-tags confirmed) have attached errors.
WebKit / iPhone Safari / VoiceOver: **BLOCKED** (not installed; no device).

## Stage reached

**Stages 1–4 implemented against a clearly labeled simulated retailer.** Stage 5 (Kroger) is
documentation-only and live integration is **BLOCKED** (no credentials, no authorization).
Stage 6 (household release/deployment) not started. The code is pushed to the private GitHub
repository named above (owner-requested); nothing was deployed or sent to a real store.

| Stage | State |
|---|---|
| 1 Executable contract & fixtures | Done — pinned stack, migrations, Better Auth, deterministic fixture, recording fake retailer, two-user harness |
| 2 Persistent shared plan & concurrency | Done — first slice evidence `evidence/2026-10-08-first-slice-e2e.md` |
| 3 Quantities & honest grocery state | Done for the simulated retailer, including the F04–F06 corrections (explicit order/transfer reconciliation, physical package basis, substitution validation, receipt corrections, bound \"Have enough\") and B3 |
| 4 Household experience | Done for the mock workflow, including F01–F03 and F07 corrections, B14/B15/B17 accessibility, B12 remembered staple products and B16 staple management; Chromium-only validation (WebKit/devices BLOCKED, B8) |
| 5 Verified Kroger integration | BLOCKED — capability documented in INTEGRATION-CAPABILITIES.md; adapter fails closed |
| 6 Household release | Not started (needs hosting decision; no paid provisioning authorized) |

## What works (mock workflow, two members)

- Sign-in per member (no public sign-up); every read/write scoped to the member's household.
- Week: one complete proposal (effort/variety/novelty/sessions controls, Fewer sessions,
  Different dinners, factual reasons, named unresolved nights), deliberate **Use this week**;
  after adoption: next dinner (household timezone), status sentence, Cook / Reheat views,
  per-night Change → Replace / Move / Backup / Night out / Open previews with consequences,
  grocery delta and additional basket cost; Apply / Cancel; locks; deferred dinners; per-member
  component plates with nutrition vs that member's dinner target; reserved lunches; "less left
  than planned" facts.
- Live shared state: SSE + refetch on focus/visible/online + 15 s poll; stale drafts flagged
  before Apply, Apply/Adopt/Send disabled until the view is current.
- Groceries: consolidated lines with reasons (meals, usual requests with contributors, extras),
  Have enough / Have some (+amount) / Need, product choice and manual products/prices
  (simulated store), per-line approvals, readiness, three cost views with unknowns, simulated
  Send with frozen batches, uncertain-transfer resolution, order confirmation (explicit contents
  or "contents unknown"), receipts (received / missing / substituted), "Not sent yet" deltas.
- Our Recipes / Explore: search (focus-stable), filters, sorts by real values with an
  "unknown" group, Sounds good, per-member preferences, favorites, notes, explicit cooking
  history, structured manual recipe entry/edit creating immutable versions.
- Household: usual items (staples) — add, rename, usual amount, remembered product, remove/restore, availability, last change; saved inputs (all start unset), separate daily/dinner targets per member,
  exclusions, ingredient review, connection status, JSON export.

## Run it locally

```bash
npm ci
scripts/db.sh start
export DATABASE_URL=postgres://table@127.0.0.1:54329/table_dev
npm run db:migrate
npm run household:create -- "Our table" America/New_York          # prints the household id
TABLE_NEW_PASSWORD='choose-10+-chars' npm run member:create -- <householdId> jon@example.com "Jon"
TABLE_NEW_PASSWORD='choose-10+-chars' npm run member:create -- <householdId> alex@example.com "Alex"
npm run sample:recipes -- <householdId>     # optional: 8 labeled sample recipes, no prices/nutrition
npx next build && TABLE_ENV=development BETTER_AUTH_URL=http://localhost:3000 npx next start -p 3000
```
Open http://localhost:3000 in two different browsers/profiles and sign in as each member.
Backup/restore: `scripts/backup.sh dump|restore|check` (dumps include auth tables — store securely).

## Evidence

Current: `docs/table/evidence/2026-10-08-verify-972e368/` (see Verification above). History:
`2026-10-08-verify-5f7b72f/` (B15/B16), `2026-10-08-verify-0804381/` (B14/B12, with sheet
screenshots), `2026-10-08-verify-2c56267/` (correction pass), `2026-10-08-full-run*.md`,
`2026-10-08-first-slice-e2e.md`. See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

**B18 — text-scaling sweep across every screen** (320 px with 150% and 200% text, dialogs open), no
owner input needed. Owner-gated: B5/B6 Kroger, B8 devices (WebKit, iPhone Safari, VoiceOver for
B14/B15/B17), B9 hosting.

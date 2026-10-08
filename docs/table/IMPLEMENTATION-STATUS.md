# Table — Implementation status

_Last updated 2026-10-08 (UTC), after B15 (Groceries accessibility) and B16 (household staple management)._

## Code identity

| What | Identity |
|---|---|
| Starting point of this pass | `b8fa763abdf42059a11446f054c2aa0a9b71af78` (baseline verify-all PASS before any edit: vitest 98/98, Playwright 43/43, 21 mutations killed) |
| Implementation commit verified | `5f7b72f4ff30792249a9ef1e0d025cb5fac8befa` (clean tree; tracked-file hash `ec6d3f15…0a6e` unchanged during the run) |
| Documentation/evidence commit | the commit after 5f7b72f on `main` (docs only — `git diff --stat 5f7b72f..HEAD`) |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` |
| Migrations | `001_auth` … `004_staple_products`, `005_staple_management` (new; additive: columns with defaults + one new append-only table, applied by `npm run db:migrate`; existing staples become active, revision 1, usual amount in packages) |

## Verification (independently measured on 5f7b72f)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-5f7b72f/summary.md` (complete logs + JSON):
typecheck PASS · vitest 118/118 (unit + real-PostgreSQL integration, 0 skipped) · production build PASS ·
Playwright 57/57 (Chromium, production server, two authenticated contexts, 0 skipped, 0 flaky) ·
mutation self-test PASS · mutation checks 30 killed / 0 survived / 0 error, sources restored.
Red-before-green: the 14 new browser tests all FAIL against a build of `b8fa763` (isolated worktree,
database and port; `pre-b15-on-b8fa763.log` in the same folder). An independent read-only review of
the diff before verification found seven defects; all were fixed with regressions (DECISIONS D55).

## This pass

**B15 — Groceries accessibility (Chromium-verified).** Every Groceries interaction uses the one modal
system from B14: product for this pickup (choose or record another), remove a request, confirm order
contents (edit → review → record), record a substitute, judge a substitute, correct a receipt, check
the cart for an uncertain transfer. Each is named by its title, takes focus, traps Tab, closes on
Escape without saving, and returns focus to its opener or a surviving neighbour. Field errors are
attached to their fields and focused; irreversible or destructive steps need a deliberate second
action with the safe choice focused; lines, transfers and the order state their status in words
(sent, uncertain, failed, ordered, unresolved, product unavailable). Dialogs keep typed work during
live updates and show the other member's change as a conflict to review (server checks:
`expectedProductId`, `expectedValidationId`, `expectedContributorIds`). Works at 320 px with 150%
text (this pass also fixed a B14 nav overflow) and under reduced motion.

**B16 — Household staple management.** Household → Usual items: add (item, shortcut name, usual
amount in packages or a measured unit, remembered product), rename, change amount, change product
(explicit B12 decision), remove and restore, availability at the active store, and who changed it
last. Detail edits bind to `details_revision`, product changes to `product_revision`; stale edits
are refused with the current values. Removing a staple removes only its shortcut. Nothing here
approves a purchase or touches existing requests, orders, transfers or receipts (scenarios A–E).
The household export now includes the staple tables and substitution judgements.

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
| 4 Household experience | Done for the mock workflow, including F01–F03 and F07 corrections, B14/B15 accessibility, B12 remembered staple products and B16 staple management; Chromium-only validation (WebKit/devices BLOCKED, B8) |
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

Current: `docs/table/evidence/2026-10-08-verify-5f7b72f/` (see Verification above). History:
`2026-10-08-verify-0804381/` (B14/B12, with sheet screenshots), `2026-10-08-verify-2c56267/`
(correction pass), `2026-10-08-full-run*.md` and `2026-10-08-first-slice-e2e.md`.
See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

No owner-free item of the size of B15/B16 remains. **B17** (keyboard pass over the remaining inline
plan/recipe forms) is the next bounded, owner-free task. Owner-gated: B5/B6 Kroger, B8 devices
(WebKit, iPhone Safari, VoiceOver for B14/B15), B9 hosting.

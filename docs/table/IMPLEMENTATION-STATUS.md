# Table — Implementation status

_Last updated 2026-10-08 (UTC), after B14 (accessibility and focus) and B12 (remembered staple products)._

## Code identity

| What | Identity |
|---|---|
| Starting point of this pass | `f4f92f8208e0d35210c2237e8aa38558bd3e15d2` (baseline verify-all PASS before any edit: vitest 91/91, Playwright 32/32, 16 mutations killed) |
| Implementation commit verified | `0804381880f9104dfe23ab35f50ccf8fbe74d05b` (clean tree; tracked-file hash `52a44bee…f669` unchanged during the run) |
| Documentation/evidence commit | the commit after 0804381 on `main` (docs only — `git diff --stat 0804381..HEAD`) |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` |
| Migrations | `001_auth`, `002_table`, `003_reconciliation`, `004_staple_products` (new) |

## Verification (independently measured on 0804381)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-0804381/summary.md` (complete logs + JSON):
typecheck PASS · vitest 98/98 (unit + real-PostgreSQL integration, 0 skipped) · production build PASS ·
Playwright 43/43 (Chromium, production server, two authenticated contexts, 0 skipped, 0 flaky) ·
mutation self-test PASS · mutation checks 21 killed / 0 survived / 0 error, sources restored.
Red-before-green: the 11 new browser tests all FAIL against a build of `f4f92f8`
(`pre-b14-on-f4f92f8.log` in the same folder). Earlier runs are kept in `docs/table/evidence/` as history.

## This pass

(The earlier correction pass for the independent review of 89f3ea9 is recorded in `CORRECTIONS-89f3ea9.md`; its F01–F08, V01–V02 and B3 regressions all still pass on 0804381.)

**B14 — accessibility and focus (Chromium-verified).** Change is a modal sheet (`src/ui/a11y.tsx`):
the page behind is `inert`; focus starts on the selected tab, Tab/Shift+Tab wrap inside, Escape /
Close / backdrop close it and apply nothing (drafts stay drafts, typed facts are dropped); focus
returns to the opener or a surviving Change control. Tablist with arrow keys. Each night's Change /
Lock and each grocery line's controls have distinct names; previews are named regions ("draft, not
applied" / "out of date"); an "Accepted plan status" heading; the Groceries link names its count of
lines needing attention. One polite live region announces other members' decisions, newly stale
previews, approvals needing review again and offline/online — once each; refetches and polls are
silent. The sheet fits 320 px at 150% text, scrolls above the fixed nav, and does not animate under
reduced motion. WebKit / iPhone Safari / VoiceOver: **BLOCKED** (not installed; no device).

**B12 — remembered staple products.** `ApproveStapleProduct` is an explicit product-suitability
decision bound to the staple's `product_revision` (stale → `stale_staple`, both commit orders
tested), recorded append-only in `staple_product_decisions`. It never touches requests already
captured, purchase approvals, transfers or orders. Later one-tap requests (and extras of a staple)
carry the remembered product as their product intent with the usual quantity; the projection uses
that intent, and an unknown or unavailable (not sold by the active retailer) product leaves the line
unresolved rather than substituted. Groceries shows "Your usual: …" and "Make this our usual"; both
members see changes live.

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
| 4 Household experience | Done for the mock workflow, including F01–F03 and F07 corrections, B14 accessibility/focus and B12 remembered staple products; Chromium-only validation (WebKit/devices BLOCKED, B8) |
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
- Household: saved inputs (all start unset), separate daily/dinner targets per member,
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

Current: `docs/table/evidence/2026-10-08-verify-0804381/` (see Verification above), including
sheet screenshots at 320 and 390 px (`screens/`). History: `2026-10-08-verify-2c56267/` (correction
pass), `2026-10-08-full-run*.md` and `2026-10-08-first-slice-e2e.md` (before the review of 89f3ea9).
See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

**B15 — grocery-screen keyboard pass** (inline product and order-confirmation forms get the B14 focus
handling; the substitution `prompt()` becomes an inline form), then **B16** staple management in
Household. No owner input needed. Owner-gated: B5/B6 Kroger, B8 devices (incl. WebKit/VoiceOver for
B14), B9 hosting.

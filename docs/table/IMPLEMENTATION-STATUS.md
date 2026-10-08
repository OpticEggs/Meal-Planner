# Table — Implementation status

_Last updated 2026-10-08 (UTC), after the correction pass for the independent review of 89f3ea9._

## Correction of the earlier completion claim

The 89f3ea9 delivery said "stages 1–4 complete; only B3 remains". An independent review found eight
contract gaps (F01–F08) and two verification defects (V01–V02) that the earlier green suite did not
exercise. All were reproduced here as failing expected-correctness tests on 89f3ea9 against real
PostgreSQL, then repaired; B3 was finished afterwards. Dispositions: `CORRECTIONS-89f3ea9.md`.

## Code identity

| What | Identity |
|---|---|
| Reviewed base | `89f3ea9b5e057c5e57928e7978dda3d23ad4d750` |
| Implementation commit verified | `2c5626744ebcd464b511ce91094e1a21e9520470` (clean tree; tracked-file hash `b4932fba…711a` unchanged during the run) |
| Documentation/evidence commit | the commit after 2c56267 on `main` (docs only — see `git diff --stat 2c56267..HEAD`) |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` (GitHub's initial README commit merged, not overwritten) |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` (bundle advertises HEAD; both tested) |

## Verification (independently measured in this pass, on 2c56267)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-2c56267/summary.md` (complete logs + JSON):
typecheck PASS · vitest 91/91 (unit + real-PostgreSQL integration, 0 skipped) · production build
PASS · Playwright 32/32 (Chromium, production server, two authenticated contexts, 0 skipped,
0 flaky) · mutation self-test PASS · mutation checks 16 killed / 0 survived / 0 error, sources restored.

Prior results (89f3ea9 and earlier) are kept as history in `docs/table/evidence/`; they are the
author's reports from before the review and are not re-asserted here.

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
| 4 Household experience | Done for the mock workflow, including F01–F03 and F07 corrections; Chromium-only validation (WebKit/devices BLOCKED, B8) |
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

Final run: `docs/table/evidence/2026-10-08-full-run.md` — code `b1dcc80` (the only uncommitted
change at run time was renaming the previous evidence file). Typecheck clean; vitest 60/60 passed
(unit + real-PostgreSQL integration, 0 skipped); production build OK; Playwright 28/28 passed
(Chromium, production server, two authenticated contexts, 0 skipped, 0 flaky); 7/7 mutation
checks killed. Earlier runs: `2026-10-08-full-run-a519be0-parent.md`, `2026-10-08-first-slice-e2e.md`.
Smoke screenshots of a non-fixture dev household: `evidence/screens/`.
See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

**B14 — focus restoration after the Change sheet/preview closes, plus a keyboard/screen-reader pass**
(no owner input needed), then B12. Owner-gated: B5/B6 Kroger, B8 devices, B9 hosting.

# Table — Implementation status

_Last updated 2026-10-08 (UTC), after the B17 correction (RB17-01..03) and B18 (text-scaling sweep)._

## Code identity

| What | Identity |
|---|---|
| Starting point of this pass | `7220679d814c19e5611e324da1eb1b6a768e5964` (baseline verify-all PASS before any edit: vitest 121/121, Playwright 72/72, 31 mutations killed) |
| Implementation commit verified | `abdd5a2cbd1014822ee09670b484eb528468ee22` (clean tree; tracked-file hash `2b5f21da…3a6a` unchanged during the run) |
| Documentation/evidence commit | the commit after abdd5a2 on `main` (docs only — `git diff --stat abdd5a2..HEAD`) |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` |
| Migrations | `001`–`005`; this pass adds none |

## Verification (independently measured on abdd5a2)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-abdd5a2/summary.md` (complete logs + JSON):
typecheck PASS · vitest 141/141 (real PostgreSQL) · production build PASS · Playwright 104/104 (Chromium,
production server, two authenticated contexts, 0 skipped, 0 flaky) · mutation self-test PASS ·
mutation checks 39 killed / 0 survived / 0 error, sources restored. Red-before-green on `7220679` for
RB17-01..03 and the B18 sweep (logs in the same folder; see ACCEPTANCE). A worker built the sweep in an
isolated worktree, database and ports; two read-only reviews of the correction found eleven defects in
total, all fixed before verification (DECISIONS D61, D65).

## This pass

**B17 correction (RB17-01..03).** A recipe version the other member saves while the editor is open is
brought into the draft field by field: what the member did not change takes the new content
(including summary, source label and ingredient form/note, which the editor does not show) and is
listed in full; a field both changed shows both full contents and must be decided before Save; a
later version rebases again. Ingredient comparison counts occurrences and uses keys, so repeated rows
stay distinct. Saving an existing recipe now requires the version it was edited from (no versionless
path). Accepted dinners stay pinned to their versions (T21 unchanged).

**B18 — text scaling (Chromium-verified).** Every screen and dialog at 320 px with 150% and 200% text,
including conflict, error and long-content states: no sideways scroll, nothing clipped, every control
reachable and hittable, focus where it should be. Eight layout defects fixed (DECISIONS D66).
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

Current: `docs/table/evidence/2026-10-08-verify-abdd5a2/` (see Verification above). History:
`2026-10-08-verify-972e368/` (B17), `2026-10-08-verify-5f7b72f/` (B15/B16), `2026-10-08-verify-0804381/` (B14/B12, with sheet
screenshots), `2026-10-08-verify-2c56267/` (correction pass), `2026-10-08-full-run*.md`,
`2026-10-08-first-slice-e2e.md`. See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

None that needs no owner input. The product's Stage 1–4 scope for the simulated retailer is complete
and Chromium-verified; the remaining work is owner-gated: B5/B6 Kroger (credentials and written
approval), B7 FDC key, B8 devices (WebKit, iPhone Safari, VoiceOver), B9 hosting. B10, B11 and B13
are optional, only on request.

# Table — Implementation status

_Last updated 2026-10-08 (UTC), after the integration-preparation pass (B9 deployment candidate, B7
nutrition, B5 Kroger adapter, B8 checklist)._

## Code identity

| What | Identity |
|---|---|
| Starting point of this pass | `639c103fc822f7567bdbf9092606328174bb0d6c` (independently rechecked), then the docs-only recheck receipt `0712ccb` |
| Implementation commits | `a871af9` B9 · `c974507` B5 (worker) · `668b00e` B5 integration · `f20a7ab` B7 (worker) · `4d0e822` integration · `c19bd5a` background-refresh fix |
| Implementation commit verified | `c19bd5a64047dab8aa935e48570940b5e831ad62` (clean tree; tracked-file hash `295c631b…e88e` unchanged during the run) |
| Documentation/evidence commits | the commits after c19bd5a on `main` (docs only — `git diff --stat c19bd5a..HEAD`), the last one the separate visual-update proposal |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` |
| Migrations | `001`–`007`: `006_nutrition_sources.sql` (B7), `007_kroger.sql` (B5); upgrade from a populated 005 database checked |

## Verification (measured on c19bd5a)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-c19bd5a/summary.md` (complete logs + JSON):
typecheck PASS · vitest 284/284 (real PostgreSQL) · production build PASS · Playwright 116/116 (Chromium,
production server, two authenticated contexts, 0 skipped, 0 flaky) · mutation self-test PASS · mutation
checks 57 killed / 0 survived / 0 error, sources restored. The first full run, on `4d0e822`, FAILED one
browser test (T09) — root-caused to a client race and fixed in `c19bd5a` (D77); that run is kept in
`verify-4d0e822-FAIL/`. Red-before-green, the local production-mode check and the upgrade check are in
the same folder (see ACCEPTANCE "Integration preparation").

## This pass

**What is implemented and fixture-tested.** B9: overlap-safe dispatch recovery (bounded sends, a
running sweep, late answers never overwrite uncertainty — D67), `/api/health` with production
configuration checks (D68), operator password reset (D69), deployment templates. B7: FoodData Central
adapter, normalization, provenance and explicit member match review (D71). B5: the Kroger adapter
behind staged activation with all capabilities off (D73), per-household readiness before freezing
(D74), the Kroger card in Household. B8: the device checklist (nothing executed).

**What was locally validated in production mode.** The production build with `TABLE_ENV=production`
on scratch databases: sign-in with secure cookies, refused sign-up and cross-site writes, refused test
conveniences and weak secrets (health 503), restart with sessions kept, backup/restore, light-load memory
of the Next process (~171 MB), and the upgrade of a populated 005 database to 007 served by the merged
app. **Not a deployment:** no hosted check has been performed (DEPLOYMENT.md §9).

**What is provider-verified.** Only three read-only FoodData Central DEMO_KEY requests (one returned a
genuine 429); documentation of FDC, Render, Fly.io and Kroger was read. Nothing is live-verified.

**Blocked:** live Kroger (no app, credentials, store or authorization; `modality` undocumented),
production FDC key, hosted deployment (owner approval), WebKit/Safari/VoiceOver and physical devices.

## Stage reached

**Stages 1–4 implemented against a clearly labeled simulated retailer.** Stage 5 (Kroger): the adapter
is implemented and fixture-tested behind staged activation, all off; live integration is **BLOCKED**
(no credentials, no authorization). Stage 6 (household release/deployment): prepared, not provisioned. The code is pushed to the private GitHub
repository named above (owner-requested); nothing was deployed or sent to a real store.

| Stage | State |
|---|---|
| 1 Executable contract & fixtures | Done — pinned stack, migrations, Better Auth, deterministic fixture, recording fake retailer, two-user harness |
| 2 Persistent shared plan & concurrency | Done — first slice evidence `evidence/2026-10-08-first-slice-e2e.md` |
| 3 Quantities & honest grocery state | Done for the simulated retailer, including the F04–F06 corrections (explicit order/transfer reconciliation, physical package basis, substitution validation, receipt corrections, bound \"Have enough\") and B3 |
| 4 Household experience | Done for the mock workflow, including F01–F03 and F07 corrections, B14/B15/B17 accessibility, B12 remembered staple products and B16 staple management; Chromium-only validation (WebKit/devices BLOCKED, B8) |
| 5 Verified Kroger integration | Preparation done: adapter implemented and fixture-tested behind staged activation (all off; cart not ready). Live verification BLOCKED (no app/credentials/authorization; `modality` undocumented) |
| 6 Household release | Preparation done: deployment candidate, runbook, provisional hosting recommendation, local production-mode and upgrade checks. Provisioning and deployment not authorized |

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

Current: `docs/table/evidence/2026-10-08-verify-c19bd5a/` (see Verification above). History:
`2026-10-08-verify-abdd5a2/` (B17 correction, B18), `2026-10-08-independent-recheck-639c103/`, `2026-10-08-verify-972e368/` (B17), `2026-10-08-verify-5f7b72f/` (B15/B16), `2026-10-08-verify-0804381/` (B14/B12, with sheet
screenshots), `2026-10-08-verify-2c56267/` (correction pass), `2026-10-08-full-run*.md`,
`2026-10-08-first-slice-e2e.md`. See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

None without owner input. Owner gates, all in `OWNER-INPUTS.md`: hosting approval and provisioning
(H1–H7), the household's FDC key (N1–N2), Kroger registration, provider validation, data-retention
decision and a bounded cart test (K1–K7), device runs (P1–P2). A visual update is proposed in
`UI-VISUAL-UPDATE-PROPOSAL.md` and waits for approval; it is not implemented.

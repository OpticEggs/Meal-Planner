# Table — Implementation status

_Last updated 2026-10-08 (UTC), after the multi-source handoff (recipe links, reviewed import, Budget Bytes lane, where to shop, Instacart list link — fixture-only), which followed B21/B22 (database cook-record invariant, stale cooking events) and the free-hosting research, which followed the visual update (B20) and the cook-record idempotency fix
(B19, delivery review of fb4d771, gate 2), which followed the integration-preparation pass (B9 deployment candidate, B7 nutrition, B5
Kroger adapter, B8 checklist)._

## Code identity

| What | Identity |
|---|---|
| Latest code commit | `68f4549` — multi-source handoff: `c1bf933` (Instacart client, worker), `99c3b99` (import building blocks, worker), `2b9d83a` (integration), `68f4549` (E2E-01/02 tests) |
| B21/B22 | `5250e62` + test correction `579179b`, verified at `579179b` |
| Implementation commit verified | `68f4549` (clean tree; source hash unchanged during the run) |
| Visual update | `f22f9d5` (B20), verified at `f22f9d5` |
| Cook-record fix | `02a3b1a` (B19) on top of `fb4d771` (the reviewed delivery); verified at `02a3b1a` |
| Integration-preparation pass | start `639c103` (+ docs-only `0712ccb`); `a871af9` B9 · `c974507` B5 (worker) · `668b00e` B5 integration · `f20a7ab` B7 (worker) · `4d0e822` integration · `c19bd5a` background-refresh fix (verified at `c19bd5a`) |
| Documentation/evidence commits | the commits after each verified code commit on `main` (docs only — e.g. `git diff --stat 02a3b1a..HEAD`) |
| Remote | `https://github.com/OpticEggs/Meal-Planner`, branch `main` |
| Restore | `git clone --branch main <bundle> table` or `git clone <bundle> table` |
| Migrations | `001`–`011`: `006_nutrition_sources.sql` (B7), `007_kroger.sql` (B5), `008_cook_record_corrections.sql` (B19), `009_cook_record_chain.sql` (B21), `010_recipe_sources.sql`, `011_shopping_destinations.sql` (multi-source); upgrades from a populated 005 database (to 007) a populated 007 database holding duplicate cook records (to 008), a populated 008 database with planted cross-generation violations (to 009), and a populated 009 database (to 011, only `schema_migrations` differs over existing columns) checked |

## Verification (measured on 68f4549)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-68f4549/summary.md`: vitest 833/833, Playwright 128/128, 74 mutations killed, 0 survived, 0 error.

### Previous run (579179b, B21/B22)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-579179b/summary.md`: vitest 315/315, Playwright 121/121, 67 mutations killed, 0 survived, 0 error. The first run on `5250e62` FAILED (one mutation ERROR — see ACCEPTANCE "B21/B22") and is kept in `verify-5250e62-FAIL/`.

### Previous run (f22f9d5, visual update)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-f22f9d5/summary.md`: typecheck PASS ·
vitest 298/298 · production build PASS · Playwright 121/121 (Chromium, 0 skipped, 0 flaky) · mutation
self-test PASS · 64 mutations killed / 0 survived / 0 error, sources restored. Before/after screenshots
and the contrast table are in the same folder.

### Previous run (02a3b1a, cook-record fix)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-02a3b1a/summary.md`: typecheck PASS ·
vitest 293/293 · production build PASS · Playwright 117/117 (Chromium, 0 skipped, 0 flaky) · mutation
self-test PASS · 62 mutations killed / 0 survived / 0 error, sources restored. Red-before-green on
`fb4d771` and the 008 upgrade check are in the same folder.

### Previous run (c19bd5a, integration preparation)

`scripts/verify-all.sh` → `docs/table/evidence/2026-10-08-verify-c19bd5a/summary.md` (complete logs + JSON):
typecheck PASS · vitest 284/284 (real PostgreSQL) · production build PASS · Playwright 116/116 (Chromium,
production server, two authenticated contexts, 0 skipped, 0 flaky) · mutation self-test PASS · mutation
checks 57 killed / 0 survived / 0 error, sources restored. The first full run, on `4d0e822`, FAILED one
browser test (T09) — root-caused to a client race and fixed in `c19bd5a` (D77); that run is kept in
`verify-4d0e822-FAIL/`. Red-before-green, the local production-mode check and the upgrade check are in
the same folder (see ACCEPTANCE "Integration preparation").

## Multi-source handoff (B23)

What works now, with no credentials: shared saved links (both members, de-duplicated, attributed, notes kept); import by pasting a recipe's ingredient lines, reviewed line by line into an imported recipe with its source link; the Budget Bytes lane (official index link, your saved links, your confirmed recipes); where to shop per pickup (store cart, Instacart list, another store) with a copyable/downloadable list. Fixture-tested but OFF: reading recipe pages (SSRF-checked fetcher; synthetic test pages only) and the Instacart shopping-list link and nearby-retailer lookup (doc-shaped synthetic fixtures). Nothing was fetched from a site, a store or Instacart. DECISIONS D86–D92; owner gates OWNER-INPUTS §6.

## B21/B22 (directive "B21/B22 Implementation Directive")

B21: the database keeps one effective cooking record per event for any writer — records form a chain (`replaces`) enforced by two unique indexes and a deferred check (migration 009; D84). B22: `RecordCooked` refuses a dinner that is no longer on its accepted plan (replaced, removed, set aside) with `stale_event`, writes nothing and restores nothing; a past dinner still on its plan is recorded on its own date (D85). Hosting: a genuinely free option was researched (`HOSTING-FREE-OPTIONS.md`); nothing provisioned.

## Visual update (B20)

UI-VISUAL-UPDATE-PROPOSAL.md §5, presentation only (D81–D83): a light theme by default and the dark theme
when the phone prefers it, contrast measured from the shipped tokens; tab icons; Week chips, next-dinner
card, dinner cards and the pickup estimate; Groceries pickup card with "Why isn't this a total?";
recipe detail and Cook with the placeholder tile, "To make" stats and numbered steps; Explore and Our
Recipes cards. No schema, command or snapshot change; no test id or accessible name changed. Not yet
seen on a phone (B8).

## Cook-record idempotency (B19, after the delivery review of fb4d771)

One effective "cooked" record per cooking event: a second press — by either member, at once or later —
is answered "already recorded by …" and writes nothing (D78). The Cook page shows "Cooked · recorded by
…" instead of the button. "Correct this: it wasn't cooked" appends a correction; nothing is deleted,
history and "new to you" ignore the corrected record, and cooking can be recorded again (D79).
Duplicates created before the fix are kept, marked and shown once (D80). Migration 008. The guarantee
is the command's (check + household lock); the database index refuses only a repeated generation, so a
database-wide invariant is open (B21), as is whether a dinner no longer scheduled may be marked cooked
(B22) — both from the independent recheck of `bcb74ed`, which closed B19/B20 for the command path and
Chromium-tested presentation.

## Integration-preparation pass

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

Current: `docs/table/evidence/2026-10-08-verify-68f4549/` (see Verification above). History:
`2026-10-08-verify-579179b/` (B21/B22), `2026-10-08-verify-f22f9d5/` (visual update; rechecked independently in `2026-10-08-independent-recheck-bcb74ed/`), `2026-10-08-verify-02a3b1a/` (cook-record fix), `2026-10-08-verify-c19bd5a/` (integration preparation), `2026-10-08-verify-abdd5a2/` (B17 correction, B18), `2026-10-08-independent-recheck-639c103/`, `2026-10-08-verify-972e368/` (B17), `2026-10-08-verify-5f7b72f/` (B15/B16), `2026-10-08-verify-0804381/` (B14/B12, with sheet
screenshots), `2026-10-08-verify-2c56267/` (correction pass), `2026-10-08-full-run*.md`,
`2026-10-08-first-slice-e2e.md`. See ACCEPTANCE.md for per-test status.

## Blockers (genuine)

1. Kroger: developer app credentials, store location, account authorization, and written
   approval for one live cart addition (B5/B6).
2. Real devices / Safari / WebKit for X11 device validation (B8).
3. Hosting decision for Stage 6 (B9). No paid service will be provisioned without approval.

## Next executable task

**One task, waiting on the owner: choose the host (OWNER-INPUTS H1) and authorize the private deployment (H3).**
Paid Render (≈ $13.30/month, `DEPLOYMENT.md`) or the $0 Oracle Always Free + Tailscale option
(`HOSTING-FREE-OPTIONS.md`, with its idle-reclamation and self-maintenance risks). Everything after it — the
device run (P1, D01–D26), the FDC key (N1–N2), recipe page reading (R1), Instacart access and validation
(I1–I3), Budget Bytes permission beyond links (R2) and the Kroger gates (K1–K7, K6 data retention first) — needs a
deployed app or a separate owner decision, each listed in `OWNER-INPUTS.md`.

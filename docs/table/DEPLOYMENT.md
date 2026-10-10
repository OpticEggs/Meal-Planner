# Table — Private deployment runbook and hosting recommendation (B9)

Prepared 2026-10-08; §0 updated 2026-10-09. **Hosting is selected:** the household's pilot runs on the owner's
Render **Free** web service with a **Neon** database (§0, user-reported). Claude has provisioned, deployed and paid
for nothing. The paid Render runbook in §1–§9 is kept as history for that option; it is not an open decision.

## 0. The pilot that is already running — Render Free + Neon (owner's setup)

**User-reported, 2026-10-08 (not a hosted check by Claude):** Jon created a Render **Free** web service at
`https://meal-planner-eq58.onrender.com` connected to a **Neon** database, provisioned the household and signed in
successfully. **Not verified:** the commit Render is running, the service's Start and Build Commands, the database's
migration level, whether `DATABASE_URL` is Neon's pooled or direct address, whether Alex's account exists, backups
taken, and which environment variables are set. Keep the existing household, accounts, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `DATABASE_URL` and free tier. Never load test fixtures into it and never create a new database,
household or login as a workaround.

What differs on Render Free (Render's docs, read 2026-10-08/09): **no pre-deploy command** ("available for paid web
services, private services, and background workers"), **no shell, no one-off jobs**; the service sleeps after
15 minutes without traffic and takes about a minute to wake. So the database is updated by the **Start Command**
itself, before the server starts. The health check answers 503 while a migration this code knows about is pending.

### Upgrade from your phone — `dbc105d` (verified commit); you run it, Claude does not deploy

**Pilot-upgrade checklist for `dbc105d` (exact quantities, migration 015).** The steps below are unchanged; this is
what is new in this upgrade and what to look at.

- [ ] Step 1 recovery point taken **before** deploying (the migration cannot be un-applied).
- [ ] Step 5 log shows `applied: …` ending in `015_exact_quantities.sql` (just that file if the pilot runs `43cd1ce`;
      earlier files too if it is older), then `✓ Ready`.
- [ ] Step 6 health is `{"ok":true,"problems":[]}`; sign in; an existing recipe shows the same amounts as before.
- [ ] Groceries for the current week show the same packages as before the upgrade (**[tested]** in the rehearsal:
      identical amounts, packages, to-send counts and approvals for data written by `43cd1ce`).
- [ ] Nothing else to switch on; no data is changed by the upgrade and nothing is backfilled.
- What 015 does: adds three columns to recipe ingredients (`quantity_basis` defaulting to `legacy`, `exact_amount`,
  `exact_servings`) and checks between them. Existing rows are not rewritten. **[tested]** on a populated database
  written by `43cd1ce`: every pre-existing column of every table unchanged
  (`docs/table/evidence/2026-10-10-verify-dbc105d/rehearsal/`).
- Going back: **[tested]** `43cd1ce`'s commands and grocery projection run and its whole test suite passes on the
  upgraded schema, also after new exact recipes exist (it then counts their stored decimals, not the exact
  fractions). **[not tested here]** `43cd1ce` started as a web server against the upgraded schema (the 2026-10-09
  rehearsal did test an older release serving on a newer schema). An export
  made **after** exact recipes exist restores only into `dbc105d` or later; exports from before restore anywhere.
- **Do not** run `npm run audit:legacy-quantities` against Neon. It refuses a remote host unless told otherwise;
  whether to run it at all (preferably on a local restore of a household export) is your decision (B41).

Everything marked **[tested]** was rehearsed locally on 2026-10-09 in production mode (production build,
`TABLE_ENV=production`, PostgreSQL 16) on a household database at migration 011 created and populated by the
011-era code (`9623de4`), upgraded to this commit. Nothing was tried on Render or Neon; **[unverified]** marks what
Render or Neon are expected to do. Evidence: `docs/table/evidence/2026-10-09-deploy-rehearsal/`. You never type
or paste the database password in these steps.

1. **Recovery point in Neon.** Neon console → your project → **Branches** → **New branch** → parent: your main
   branch, current data → name `before-table-upgrade` → if the form offers automatic deletion, turn it off or pick
   a date after you will have checked the upgrade → **Create**. This is a recovery point **inside Neon, not an
   independent backup**: if the Neon project or account is lost, the branch goes with it. Keep the independent
   export as a separate step for a trusted computer later (`scripts/backup.sh dump "<Neon connection string>"
   table-YYYYMMDD.dump`, stored encrypted — it holds password hashes and sessions).
2. **Read the current Start and Build Commands.** Render → the service → **Settings** → **Build & Deploy**. Write
   both down exactly (they are what you go back to if needed).
   - Start Command **with** `npm run db:migrate &&` at the front: the service already updates the database when it
     starts. Still go to step 3 so it is exactly the tested text.
   - Start Command **without** `db:migrate` (for example `npm start` or `next start …`): deploying new code with it
     leaves the database behind and `/api/health` answers 503 `schema_migrations_pending`. Go to step 3.
   - The start-time update uses a development tool (`tsx`), so the build must install development packages.
     **[unverified]** whether yours does; a Build Command such as `npm ci --include=dev && npx next build` does.
     If step 5 shows `tsx: not found`, set that Build Command and deploy again.
3. **Set the tested Start Command** — type exactly, then **Save**:
   ```
   npm run db:migrate && exec node_modules/.bin/next start -H 0.0.0.0
   ```
   - **[tested]** First start applies the pending migrations, then serves; later starts say `schema up to date`;
     if a migration fails, the server does not start and nothing of the failed file is kept (each file is one
     transaction; files before it stay applied).
   - **[tested]** Two releases starting at once against one database (20 of 20 trials), or a start racing a
     `npm run db:migrate` from a computer, apply each file exactly once: since this commit the migration runner
     takes a transaction-level PostgreSQL advisory lock (with the previous runner, one of the two starts exited
     with "relation … already exists" in 10 of 20 trials). Transaction-level because Neon's pooled connections do
     not support session-level advisory locks; **[unverified]** behind Neon's pooler itself.
   - Keep `exec`: the web server then replaces the shell and receives the stop signal. **[tested]** without it,
     under `/bin/sh`, a stop signal to the shell left the server running. **[unverified]** which shell Render uses.
   - **[unverified]** whether saving starts a deploy by itself; if one starts, check its commit in **Events** and
     continue with step 4 either way. Leave every environment variable as it is.
4. **Deploy the exact commit.** **Manual Deploy** → **Deploy a specific commit** → `dbc105d` → **Deploy**.
   (Render's docs say this turns automatic deploys off for the service — what you want for a verified commit.)
5. **Read the deploy log** (**Events** → the deploy → **Logs**). Expect, in order: `> tsx scripts/migrate.ts`,
   then `applied: …` ending in `014_member_recipe_photo.sql` (earlier files too if the pilot is older), or
   `schema up to date`, then `✓ Ready`. **Stop, don't retry,** on `Error: migration 0NN_….sql failed: …` or
   `… changed after it was applied`: copy that line (it holds no password) and ask for help. **[unverified]**
   Render keeps the previous release serving when a deploy fails.
6. **Health and sign-in.** `https://meal-planner-eq58.onrender.com/api/health` → `{"ok":true,"problems":[]}` (the
   first request after a sleep can take about a minute). Then sign in as usual at `/login`; Our Recipes still
   lists your recipes and saved links. **[tested]** accounts and sessions from before the upgrade keep working.
7. **These stay off (do not add them):** `TABLE_RECIPE_IMPORT_FETCH`, `TABLE_RECIPE_CONTENT`,
   `TABLE_RECIPE_CONTENT_GRANTS`, `TABLE_RECIPE_PHOTO_HOSTS`, `KROGER_ACTIVATE` (with `TABLE_RETAILER` left at
   simulated), `INSTACART_ACTIVATE`, and every test-only switch (`TABLE_*_FIXTURES`, `TABLE_*_FAKE_*`,
   `TABLE_FIXED_NOW`, `TABLE_DISPATCH_TIMEOUT_MS`).

**What can and cannot be undone.**
- **Code can go back** to an earlier commit from Render's deploy list, but only to one whose migrations are all in
  the database. **[tested]** the 011-era code served, read and wrote on the upgraded schema and its start said
  `schema up to date`. **Its `/api/health` still answers 200**, because it checks only the migrations it knows, so a
  200 does not prove code and database match.
- **A migration cannot be un-applied.** 012, 013 and 014 only add a table, optional columns, a wider check and
  columns with defaults, which is why older code keeps working.
- **Restoring from the Neon branch** returns the data to step 1: **everything written after it is lost** (recipes,
  links, plans, sign-ins). **[unverified]** Neon's exact restore screens. Do it only if data is damaged, not because
  a deploy failed.

**Alternative (needs a computer):** keep any Start Command and run `npm run db:migrate` from your copy of the
repository at `dbc105d` with `DATABASE_URL` typed into that terminal only, then deploy the same commit. With
this commit a start-time migration running at the same moment is safe (the lock above).

### One real recipe URL (only after you separately approve R1)

Render → Environment → add `TABLE_RECIPE_IMPORT_FETCH` = `on` → save (Render redeploys). On your phone, paste one
recipe link from a site other than Budget Bytes. Expect the review with the site, author and ingredient lines;
nothing of the page's method or photo is kept (C1/C2 stay off) — the recipe links to the original. A refusal (for
example "the site refused to let Table read the page (HTTP 403)") is a real result, not something to work
around. Create the recipe or discard it; to stop reading pages again, delete the variable.


**Evidence categories used here — never substitute one for another:**
*configuration inspection* (reading code and provider documentation), *local execution* (this build
container, production build and `TABLE_ENV=production`, PostgreSQL 16 on scratch databases), and
*hosted checks* (on the provider) — **none of the hosted checks has been performed** (§9).

## 1. What the application needs from a host (from the code, not the marketing)

| Property of Table | Where in the code | What it requires of hosting |
|---|---|---|
| A long-running Node server (`next start`), Node 22 | `package.json`; every verification ran Node 22.22.0 | A persistent process, not per-request functions |
| PostgreSQL 16 with row locks (`SELECT … FOR UPDATE`), `REPEATABLE READ` snapshots and transactional migrations | `src/server/db/pool.ts`, `src/server/commands/framework.ts`, `src/server/db/migrate.ts` | A real PostgreSQL with normal session semantics (no transaction-mode pooler between app and database) |
| Sessions stored in PostgreSQL (Better Auth) | `src/server/auth.ts` | No sticky sessions or shared memory needed; restarts keep everyone signed in (verified locally) |
| Live updates by server-sent events, each connection polling `change_events` every 0.5 s with a keepalive every 10 s; clients also refetch every 15 s and on focus/online | `src/app/api/events/route.ts`, `src/ui/store.tsx` | Long-lived HTTP responses; if a proxy cuts them, the client reconnects (`retry: 2000`) and polling keeps state correct |
| Retailer dispatch outside a transaction, bounded at 90 s; interrupted sends marked uncertain by recovery at start and every 30 s while running, only once older than 150 s; a late answer never overwrites "uncertain" or a member's cart check | `src/server/commands/purchasing.ts`, `src/instrumentation.ts`, `src/server/env.ts` | Safe with overlapping old/new instances during a deploy (fixed in this pass; see §6) |
| Optional integrations: FoodData Central lookup (`FDC_API_KEY`), Kroger adapter (staged `KROGER_ACTIVATE`, all off) | `src/server/integrations/fdc/`, `src/server/integrations/kroger/` | Server-side secrets only; nothing is required for the simulated-retailer deployment |
| Production refuses test conveniences and weak configuration | `src/server/env.ts`, `src/server/deploy.ts`, `/api/health` | A health-check path the host consults before routing traffic |

A serverless platform that runs each request as a short-lived function fits this poorly: the event
stream is a long-lived response, startup recovery and the 30 s sweep need a persistent process, and
the pool keeps connections open. That — not Next.js support — is the deciding property.

## 2. Recommendation: Render (one web service + Render Postgres), Hobby workspace

Prices read from Render's official pricing page and docs on 2026-10-08 (page hash and extract kept in
the evidence folder). They can change; recheck before approving.

| Item | Plan | List price |
|---|---|---|
| Workspace | Hobby | **$0/month** + compute (5 GB bandwidth/month included, then $0.15/GB; 500 build pipeline minutes/month) |
| Web service | Starter (`0.5c-512mb`): 0.5 CPU, 512 MB | **$7/month** |
| Database | Render Postgres Basic-256mb (`0.1c-256mb`): 0.1 CPU, 256 MB, 100 connections | **$6/month** |
| Database storage | 1 GB at $0.30/GB/month (set explicitly; the Basic default is 15 GB = $4.50/month) | **$0.30/month** |
| Point-in-time recovery | Paid Postgres; window 3 days on Hobby (7 days on Pro workspaces) | included per Render's backup docs; pricing of PITR not stated there — confirm on the invoice |
| Logical exports | Manual "Create export", kept 7 days, downloadable | no price stated |
| Provider subdomain + HTTPS | `<service>.onrender.com` | included |

**Recurring baseline: about $13.30/month** (7 + 6 + 0.30), before tax.
**Variable or uncertain:** bandwidth beyond 5 GB/month (two people's usage is expected to stay well
under it, but it has not been measured on a host), build minutes beyond 500/month (overage rate not
found on the page), storage growth beyond 1 GB, sales tax, and anything Render prices differently at
signup. A custom domain is optional (registration is billed by a registrar, not Render).

**Why this configuration:**
- A persistent Node process with a health-check path, a pre-deploy command for migrations (available
  on paid services), and an operator shell on paid services (needed for provisioning and password
  resets — there is no public sign-up).
- Managed PostgreSQL with continuous point-in-time recovery and logical exports.
- Memory, **a local light-load observation only**: after serving every screen, the APIs and one open
  event stream, the resident set of the `next-server` process alone was ~171 MB (the `npx`/npm wrapper
  around it added ~82 MB, which the template avoids by starting `node_modules/.bin/next` directly).
  It covers the Next process only — not the platform's own agent or shell, not peak memory during a
  build or a migration (which run on separate build/pre-deploy instances on Render), not two members
  with open event streams and simultaneous commands, and not memory growth over days. It is **not a
  demonstrated hosted peak and not a guarantee that 512 MB is sufficient**; if the hosted service
  restarts for memory, the next size up is Standard (2 GB, $25/month). The database load of two people
  is expected to be far below 0.1 CPU / 256 MB; that too is an expectation, not a measurement.
- Render's own free tier is not suitable: free web services have no shell, and free Postgres has no backups and is
  deleted after 30 days. A genuinely free alternative (Oracle Cloud Always Free with self-managed PostgreSQL, private
  access through Tailscale) is researched and compared in `HOSTING-FREE-OPTIONS.md` (2026-10-08) — free, but with
  idle-reclamation, self-maintenance and no-SLA risks.

**Fallback:** none proposed. The one material drawback found — Render starts the new instance before
stopping the old one during a deploy (≈60 s overlap) — is a property of the application's recovery
logic, and was fixed in the application (§6) rather than avoided by choosing a host.
Compared and not chosen: Fly.io — machines from $2.19/month, but its Managed Postgres starts at
$38/month (Basic, official pricing page 2026-10-08), roughly three times the whole Render baseline.

## 3. Configuration templates (in the repository, inactive)

- `deploy/render.yaml` — a Render Blueprint. Render only reads a Blueprint when the owner creates one
  in their account; copy it to the repository root as `render.yaml` (or point the Blueprint at it)
  only after provisioning is approved.
- `deploy/production.env.example` — every production variable with placeholders and where each value
  comes from.

## 4. Environment and secrets

| Variable | Value | Where it is set | Notes |
|---|---|---|---|
| `TABLE_ENV` | `production` | Render service → Environment | |
| `TABLE_RETAILER` | `simulated` | same | Hosting never enables real cart writes. |
| `NODE_VERSION` | `22.22.0` | same | The runtime every verification run used. |
| `DATABASE_URL` | Render Postgres **internal** connection string | wired by the Blueprint (`fromDatabase`) | Never copied by hand; the database allows no external IPs (`ipAllowList: []`). |
| `BETTER_AUTH_SECRET` | 32+ random characters | generated by Render (`generateValue: true`) | Never typed, pasted or shown. Rotating it signs everyone out. |
| `BETTER_AUTH_URL` | `https://<service>.onrender.com` (exact origin, no path, no trailing slash) | entered once at Blueprint creation (`sync: false`) | Drives cookie security and the allowed origin for sign-in and commands. If a custom domain is added later, change this to it. |
| `FDC_API_KEY` | the household's own FoodData Central key | Render service → Environment, marked secret | Optional (B7). Empty = lookup says "not configured". |
| Kroger variables | — | absent | Only under a later activation directive (B5/B6). |

Cookies: Better Auth sets `__Secure-better-auth.session_token` with `HttpOnly; Secure; SameSite=Lax`
in production (verified locally). Commands require JSON and refuse a cross-site `Origin`
(verified locally: 403). There are no OAuth redirects in the deployed candidate; the Kroger redirect
URI (`https://<origin>/api/kroger/callback`) is configured only when B5(b) is authorized.

**Never in production** (the health check returns 503 if any is set): `TABLE_FIXED_NOW`,
`TABLE_DISPATCH_TIMEOUT_MS`, `TABLE_FDC_FIXTURES`, `TABLE_KROGER_FAKE_TRANSPORT`.

## 5. First deployment (after approval)

1. Owner creates the Render account and workspace (Hobby), adds a payment method, and approves the
   cost. Claude does not create accounts.
2. Create the Blueprint from the repository (`main`, with `deploy/render.yaml` copied to `render.yaml`).
   Choose the region once (it cannot change); keep service and database in the same region.
   Enter `BETTER_AUTH_URL` when prompted. Leave `FDC_API_KEY` empty unless the key exists.
3. Render builds (`npm ci --include=dev && npx next build`), runs the pre-deploy migration
   (`npm run db:migrate`; a failure cancels the deploy), starts the service
   (`node_modules/.bin/next start -H 0.0.0.0`) and waits for `/api/health` to return 200.
4. Check `https://<service>.onrender.com/api/health` → `{"ok":true,"problems":[]}`.
5. In the service's **Shell** (paid services only), provision the private household:
   ```bash
   npm run household:create -- "Our table" America/New_York
   TABLE_NEW_PASSWORD='…' npm run member:create -- <householdId> <jon's email> "Jon"
   TABLE_NEW_PASSWORD='…' npm run member:create -- <householdId> <alex's email> "Alex"
   ```
   Type each password into the shell yourself; never paste it into chat. Do **not** run
   `sample:recipes` unless you want the 8 labeled sample recipes; never load test fixtures.
6. Each member signs in on their own phone and runs the device checklist (`DEVICE-CHECKLIST.md`).

Every later release: merge to `main` after the verification workflow, then deploy deliberately
(`autoDeploy: false`). Migrations run before the new release takes traffic.

## 6. Processes, deploys and restarts

- One instance (`numInstances: 1`). Render's zero-downtime deploy keeps the old instance serving for
  about 60 s while the new one starts, then sends SIGTERM (shutdown delay set to 120 s, maximum 300 s).
- Before this pass, a starting process marked **every** in-flight transfer uncertain at once; during
  that overlap it could mark a send the old instance was still making, and the old instance's late
  answer would then overwrite "uncertain" — possibly after a member had checked the cart. Fixed:
  each dispatch is bounded (90 s, then uncertain, never retried — a timeout is not a rejection: the
  packages are not offered again until a member checks the cart); recovery touches only sends older
  than 150 s, at start and every 30 s while the server keeps running; recovery is repeatable (a second
  pass changes nothing); a late answer never changes an "uncertain" batch or a member's cart check and
  is reported as late. Covered by `tests/integration/b9.dispatch-overlap.test.ts` (7 tests) and
  `tests/e2e/b9-overlap.spec.ts` (two real server processes: the second starts while the first waits on
  the store, leaves the send alone, and the first records the store's answer). On the pre-fix code all
  of these failed (6 of the 7 integration tests by assertion, one by a missing function; the
  two-process test by assertion — "uncertain" instead of "dispatch_started"); four mutations killed.
- A crash or SIGKILL mid-send leaves the batch "sending" until the sweep marks it uncertain (within
  ~3 minutes). It is never replayed; a member resolves it by checking the Kroger cart (simulated here).
- Restarts keep sessions (database-backed) and accepted state (everything is in PostgreSQL).

## 7. Backups, restore and rollback

- **Continuous:** Render PITR, 3-day window on Hobby. A restore creates a **new** database instance at
  a chosen time (not within the last 10 minutes); point the service's `DATABASE_URL` at it after
  checking it.
- **Owner-held copy:** weekly (and before any risky change) run a logical export from Render's
  Recovery page and download it (kept 7 days by Render), or from a trusted machine with
  database access run `scripts/backup.sh dump <DATABASE_URL> table-YYYYMMDD.dump`. Dumps contain
  hashed passwords and sessions: store them encrypted, never in Git or chat.
- **Restore drill** (local, verified 2026-10-08 on scratch data): `scripts/backup.sh check <url>`
  dumps, restores into a scratch database and compares every table's row count — PASS.
- **Upgrade of an existing database** (local, 2026-10-08): a populated schema-005 database (households,
  members and credentials, recipes, an accepted week, a frozen batch with its status history, a
  confirmed order) was upgraded with 006 and 007; every pre-existing table is identical over its
  original columns, the merged app serves it in production mode and a pre-existing credential signs in.
- **Release rollback limits:** Render can redeploy an earlier build, but migrations are forward-only
  and the immutable purchasing tables cannot be "un-applied". Roll back code only to a commit whose
  migrations are a prefix of the database's; otherwise restore the database (PITR) to before the
  migration and accept losing changes made since. The migration runner refuses to start if an
  applied migration file changed.

## 8. Account recovery

There is no email and no self-service reset. An operator resets one member's password from the
service Shell, which also signs that member out everywhere:
```bash
TABLE_NEW_PASSWORD='…' npm run member:reset-password -- <member's email>
```
Only accounts that belong to a household member can be reset (tested:
`tests/integration/b9.account-recovery.test.ts`, two mutations killed).

## 9. Hosted checks not performed (need provisioning)

HTTPS termination and the real cookie flow over HTTPS; Render's health-check gating and deploy
overlap; the pre-deploy migration step; event-stream duration through Render's proxy (Render's docs
do not state a limit; staff forum replies mention 100 minutes — unverified); PITR restore and a
logical export; actual bandwidth and memory under the household's use; the Shell commands.
Everything else above marked "verified" was executed locally — see
`evidence/2026-10-08-verify-c19bd5a/b9-local-production-check.md` and `upgrade-check/`. In that
record, one early set of restart checks is kept and marked **invalid** (the first server's PID file was
not written, so later "restarts" never bound the port and an older process answered); it is not
counted. Each corrected check names the listening PID, confirmed as the only owner of the port.

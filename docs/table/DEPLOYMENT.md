# Table — Private deployment runbook and hosting recommendation (B9)

Prepared 2026-10-08. **Nothing has been provisioned, deployed or paid for.** The recommendation below
is **provisional**: it is not a host selection or spending authorization, and it stays provisional
until the owner approves it and a hosted deployment is validated. Creating the services needs the
owner's approval of the host and its recurring cost (see `OWNER-INPUTS.md`), then a separate explicit
authorization to provision and deploy.

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
- Free tiers are not suitable: Render's free web services have no shell, and free Postgres has no
  backups and a 30-day limit.

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

# Local production-mode check of the deployment candidate (B9)

Date: 2026-10-08 (UTC). Code: the B9 working tree at local checkpoint 21b5a69/e7e70eb (before the B5/B7 merge). The merged
code was run in production mode against the upgraded database separately (`upgrade-check/UPGRADE-CHECK.md`, PID 24784). Environment: this build container, PostgreSQL 16.15,
Node 22.22.0, `npx next build` then `npx next start -H 127.0.0.1 -p 3700`, `TABLE_ENV=production`,
`NODE_ENV=production`, `TABLE_RETAILER=simulated`, `BETTER_AUTH_URL=https://table.example.invalid`,
a random 64-character secret held only in a scratch file (not in Git), scratch database
`table_prod_check` (dropped and recreated for the check). No hosted service was used.

**What this is:** local execution of the production build and configuration. **What it is not:** a
hosted check — HTTPS termination, the host's health-check behavior, its deploy overlap, managed
backups and the provider's domain were NOT exercised (see DEPLOYMENT.md "Hosted checks not performed").

| Check | Command (abridged) | Result | Process |
|---|---|---|---|
| Migrations on an empty database | `npm run db:migrate` | applied 001–005 | scripts (no server) |
| Household and two members provisioned by script (no sign-up) | `household:create`, `member:create` with `TABLE_NEW_PASSWORD` | 1 household, 2 members | scripts (no server) |
| Health | `GET /api/health` | 200 `{"ok":true,"problems":[]}`, `cache-control: no-store` | first server, PID 5208 (the only server running at that time) |
| Public sign-up | `POST /api/auth/sign-up/email` | 400; user count stays 2 | first server, PID 5208 (the only server running at that time) |
| Wrong password | `POST /api/auth/sign-in/email` | 401 | first server, PID 5208 (the only server running at that time) |
| Sign-in | same, correct password, `Origin: https://table.example.invalid` | 200; cookie `__Secure-better-auth.session_token`, `HttpOnly; Secure; SameSite=Lax`, 30 days | first server, PID 5208 (the only server running at that time) |
| Household read with the session | `GET /api/snapshot` | 200; retailer `simulated`, label "Simulated retailer — nothing is sent to a store", `live: false` | first server, PID 5208 (the only server running at that time) |
| Household read without a session | `GET /api/snapshot` | 401 | first server, PID 5208 (the only server running at that time) |
| Cross-site write with a valid session | `POST /api/commands/AddStaple`, `Origin: https://evil.example` | 403 | first server, PID 5208 (the only server running at that time) |
| Test convenience in production | restart with `TABLE_FIXED_NOW` set | health 503 `TABLE_FIXED_NOW_set_in_production` | PID 5507 (only listener on 3700) |
| Weak secret | restart with `BETTER_AUTH_SECRET=short` | health 503 `BETTER_AUTH_SECRET_weak_or_missing` | PID 5551 (only listener) |
| Restart | stop (SIGTERM via `fuser -k`) and start again | health 200; the session from before the restart still reads the snapshot (sessions are in PostgreSQL) | PID 5612 (only listener), after 5551 was stopped and the port confirmed free |
| Backup and restore | `scripts/backup.sh check <table_prod_check>` | PASS: every table's row count matches after restore into a scratch database | scripts (no server) |
| Memory | `next-server` RSS after serving every screen, the APIs and an open event stream | ~171 MB (the `npx` wrapper adds ~82 MB, so the template starts `node_modules/.bin/next` directly) | PID 5862 (`next-server`) |

**INVALID, not counted:** an earlier attempt at the restart checks in the same session was invalid (the first server's PID file
was not written, so the "restarts" never bound the port and the health answers came from the first
server); it was discarded, the port freed with `fuser -k 3700/tcp`, and the checks above re-run one at a
time with the listening PID confirmed for each.

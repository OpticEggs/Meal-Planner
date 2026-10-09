# Start-time migration rehearsal (Render Free + Neon pilot), 2026-10-09

Local only: production build, `TABLE_ENV=production`, PostgreSQL 16 in the build container, a household
database at migration 011 created and populated by the 011-era code (`9623de4`). **Nothing was run on Render
or Neon.** Scripts `00`–`09` (with `lib.sh`) produced `logs/`; `PHONE-UPGRADE.md` is the worker's draft that
became `DEPLOYMENT.md` §0. `013_rehearsal_bad.sql` is a rehearsal-only failing migration used in a scratch
copy of `migrations/` (never added to the repository's migrations).

Not included: the local random `BETTER_AUTH_SECRET` (`secret.env`) and the 011 database dump (it holds
password hashes of the throwaway rehearsal members). The passwords in `lib.sh` are throwaway values for
local scratch databases.

| Scenario | Script | Log | Result |
|---|---|---|---|
| a. first start 011 → 012, with and without `exec` | 01 | `01-exec*.log`, `01-noexec*.log` | applied 012 once, health 200, both members sign in, data identical over 011 columns |
| b. restart | 01 | `01-*-restart.log` | `schema up to date`, fingerprint identical, pre-restart session works |
| c. two starts at once, previous runner | 03 nolock | `03-nolock*.log` | 10 of 20 trials: one process exited 1 (`relation "recipe_images" already exists`) |
| c. forced overlap, previous runner | 03b orig | `03b-orig*.log` | deterministic exit 1 of the waiter |
| c. two starts at once, advisory lock | 03 lock | `03-lock*.log` | 20 of 20: both serve, 012 applied once |
| c. forced overlap, advisory lock | 03b repaired | `03b-repaired*.log` | waiter blocked on the advisory lock, then `schema up to date` |
| tests red → green | — | `04-test-red-before-repair.log`, `10-test-green-final.log` | 4 of 5 fail on the previous runner; 5 of 5 pass |
| d. failing migration | 05 | `05-failing*.log` | exit 1, nothing served, failed file fully rolled back, lock free |
| e. old and new code together | 07 | `07-overlap*.log` | old code serves, reads and writes on the new schema; its health also 200 |
| f. `exec` and signals | 06, 08 | `06-*.log`, `08-*.log` | without `exec` under dash a SIGTERM to the shell orphaned a serving next-server |
| memory | 09 | `09-memory*.log` | ≈195 MB summed during migration, ≈133 MB serving |

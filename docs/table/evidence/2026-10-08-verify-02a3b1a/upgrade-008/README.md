# Upgrade check — migration 008 on a populated 007 database (2026-10-08)

Source: the populated schema-005 dump used for the 006/007 check (`../../2026-10-08-verify-c19bd5a/upgrade-check/`),
migrated to 007 (`upgrade-008-step1.log`), then given duplicate cook records as the pre-fix code could
create them: 3 records for one cooking event and 1 for another (4 rows).

- `before-008.txt` / `after-008.txt`: per-table row count and an MD5 over each table's pre-existing
  columns (`fingerprint.sql`), before and after applying 008 (`upgrade-008-migrate.log`).
- `upgrade-008-diff.txt`: the only difference is `schema_migrations` (7 → 8 rows). `cook_records` keeps
  all 4 rows and identical original columns; afterwards 2 are effective (one per event) and 2 carry
  `duplicate_of` the earliest record of their event.
- `upgrade-008-first-attempt-FAILED.txt`: the first attempt failed ("cannot CREATE INDEX … pending
  trigger events" — the deferrable `duplicate_of` check was still pending) and rolled back completely;
  fixed in the migration (`SET CONSTRAINTS … IMMEDIATE`) before the code commit, then re-run as above.

Local check only; no hosted database exists.

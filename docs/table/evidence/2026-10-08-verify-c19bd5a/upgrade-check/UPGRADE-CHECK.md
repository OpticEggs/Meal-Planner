# Upgrade check: migrations 006 + 007 on a populated schema-005 database

Date 2026-10-08 (UTC). Purpose: prove an existing household database upgrades without losing or
changing recipes, accepted weeks, requests, purchasing history or credentials (not only fresh fixtures).

1. **Populated baseline (schema 005, pre-merge code `fbc2d66`):** the T14 contract test
   ("changes current requirements but never the confirmed order…") was run against `table_test`,
   leaving two households, three members with credentials, recipes and versions, an accepted week,
   requests, a frozen handoff batch with its status history, a confirmed order with 12 lines and
   13 approvals. Dumped: `populated-005.dump`, sha256 `afb43be697e7216149a0e75dacfb9623dbea389151abbc569a6ac4cfb8047c09`.
2. Restored into the scratch database `table_upgrade_check`; `schema_migrations` = 001–005.
3. **Fingerprint before:** for each of the 52 tables at 005, the exact row count and an md5 over all
   rows of the columns that existed at 005 (`fingerprint.py`, `columns-005.txt` → `before.txt`;
   re-taken just before upgrading: identical).
4. **Upgrade with the merged code (`4a6f17b`):** `npm run db:migrate` → `applied: 006_nutrition_sources.sql, 007_kroger.sql`.
5. **Fingerprint after** (`after.txt`): the only difference is `schema_migrations` (5 → 7 rows).
   All 51 other pre-existing tables are identical over their original columns (`upgrade-diff.txt`).
6. Backfill: the 7 existing `ingredient_nutrition` rows got `provenance_kind = fixture_synthetic`
   (they were synthetic); `nutrition_matches` and `kroger_connections` are empty.
7. **Merged app in production mode against the upgraded database** (`next-server` PID 24784 on
   127.0.0.1:3700, port confirmed free before start and owned by that PID; stopped with
   `fuser -k 3700/tcp` afterwards): health 200 `{"ok":true,"problems":[]}`; sign-in with a
   pre-existing credential 200; snapshot 200 with the accepted week, its order and batch, 18 nutrition
   sources, lookup `not_configured`; Kroger status: retailer simulated, nothing activated, nothing
   live-verified; Groceries page 200.

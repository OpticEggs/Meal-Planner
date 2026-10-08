# Table — B19/B20 independent delivery recheck

**Review scope:** Delivered `table-bcb74ed.bundle` and three supplied comparison screenshots. Read-only source/evidence review in an isolated checkout. No application code or provider state changed.

## Bundle and provenance
- Uploaded bundle SHA-256: `a06703dd4d1231dfee5e31c6ed40ebf907f0c27222a82ad4fad10279d020fb04`, matches `.sha256`.
- Git bundle integrity verification passed; both bundled refs (`HEAD`, `refs/heads/main`) point to `bcb74ed45b4bccbed8866ba284a8503ca4f56d74`.
- Local clone checked out the expected commit and was clean; the most recent GitHub commit search also returned that commit.
- Cook implementation `02a3b1a1d5177442b7fec3c3f45b39e8ac921c0a`; visual implementation `f22f9d56b3764193c40981d27112a2ab900d369d`; final docs/evidence `bcb74ed`.
- Changes between `f22f9d5` and `bcb74ed` are documentation/evidence and `CLAUDE.md`, not application source or tests.

## Saved verification evidence independently checked
- `02a3b1a`: saved Vitest JSON 293 total / 293 pass / 0 fail. Playwright stats 117 expected / 0 unexpected / 0 flaky / 0 skipped. Saved report says 62 mutations killed.
- `f22f9d5`: saved Vitest JSON 298 total / 298 pass / 0 fail. Playwright stats 121 expected / 0 unexpected / 0 flaky / 0 skipped. Saved report says 64 mutations killed.
- Recomputed `scripts/verify-all.sh`-style tracked-file hashes:
  - `02a3b1a`: `1425a99bf70d2df4bdf37dd844944878d6a900d54f11bc67ba1ad55cca88bc60`.
  - `f22f9d5`: `f54105159f3675561a9567958ecc991776c6fa8e36e403545373a4223258fa1b`.
  Both match the reports.
- These checks inspect records and source hashes; they **do not constitute an independent rerun** of PostgreSQL tests, production builds, browser automation, or mutation execution.

## Source inspection

### Cooked-event correction
Migration 008 retains pre-existing records, marks earlier duplicates, adds append-only corrections, and exposes `cook_records_effective`. The command rejects a second `RecordCooked` on the same event when an effective record exists, and correction enables a later record while retaining history. Snapshot and recipe-history queries use the effective-record view. The UI shows the existing recorder and uses an explicit confirmation for a mistaken record.

**Bounded integrity caveat:** the new partial unique index is `(cooking_event_id, generation)` for records with `duplicate_of IS NULL`. This is *not*, by itself, a database-wide guarantee of at most one uncorrected/effective record per event across different generations. For example, a direct insertion specifying generation 2 alongside an uncorrected generation 1 would not collide with this index; the view excludes neither. The application's `RecordCooked` command explicitly checks for an effective record and its household-row transaction lock serializes member calls, so this is a **defense-in-depth limitation, not an observed duplicate through the normal app**. Future documentation should scope the guarantee accurately; a narrowly specified database invariant or regression test would be warranted before relying on raw database writes or another writer.

**Related untested edge:** `RecordCooked` selects events by ID and household, without checking `status='scheduled'` or that an active cooking assignment still refers to the event. A stale caller could theoretically mark a now-retired event as cooked. This was not reproduced against PostgreSQL and the desired semantics of retrospective cooking history need to be specified before treating it as a defect.

### Visual update
- The screenshots show meaningful hierarchy improvements: a prominent next dinner, consistent Groceries estimate card, clearer navigation, and an actual light theme. Designed tiles are visibly placeholders, not fabricated food photos.
- Source preserves deliberate Change preview/apply, pricing-unknown language, simulated-retailer labeling, and a single Cook action on scheduled cooking nights.
- Screenshot source is a Chromium test fixture and not a production household record. The automated screenshot tests assert lack of horizontal scroll at 320px and 390px, but not actual iPhone Safari behavior.
- The reported theme-contrast tests measure configured color token pairs. They are not a full assistive-technology audit.

## Release state and next gates
1. Close B19 and visual update B20 **for the defined application command path and Chromium-tested presentation**, preserving the integrity caveat above.
2. Do not equate fixture screenshots with household-ready recipes, Kroger pricing, or live cart transfer.
3. Private hosting has not been approved or performed. A paid Render deployment is not technically mandatory for a two-user household; a free-tier candidate requires separate uptime, sleeping, database, backups, resource, and security testing before being called fit.
4. Actual iPhone Safari, VoiceOver and household device flow remain NOT RUN.
5. No live Kroger operation until connection approval and the provider-derived data retention conflict are resolved.

No repository, database, GitHub, retailer, or hosting writes occurred in this review.

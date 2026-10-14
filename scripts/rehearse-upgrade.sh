#!/usr/bin/env bash
# Upgrade rehearsal for migrations 015/016 (EQ/EQR, 2026-10-10), 017 (catalog-first meal lists, 2026-10-11) and 018 (a recipe version's own yield, B51, 2026-10-14) on DISPOSABLE LOCAL databases only — never a household
# database, never Neon. Usage: scripts/rehearse-upgrade.sh [previous-release-commit] [--old-suite]
#
#  1. A database is migrated and POPULATED by the previous release's own code (imported and manual recipes, a
#     planned week, home supply, approvals, a partial transfer), and that release exports the household.
#  2. This release applies its pending migrations. Every pre-existing column of every table must be byte-for-
#     byte unchanged, and every existing recipe row must read 'legacy'.
#  3. Both releases recompute the grocery projection on the migrated database: amounts, package counts, what is
#     still to send and status must equal what the previous release showed before. The previous release's own
#     fingerprints and approvals must be unchanged; this release may change a line's review identity (and so the
#     approval bound to it) only where an exact recipe row is behind the line — listed explicitly (EQR, D138).
#  4. This release saves an exact recipe; the previous release still reads and projects the database (rollback).
#     4b. This release opens a meal list; the previous release still runs; this release restores the list.
#  5. Export/restore: this release's export round-trips; the previous release's export (taken before the
#     upgrade) restores into the new schema as legacy rows.
#  6. With --old-suite, the previous release's whole vitest suite runs against a database carrying the new schema.
#  7. Migration 018 (B51): nothing is backfilled; this release records a yield on a recipe the previous release wrote
#     without changing a row; the previous release still saves that recipe (rollback) — its new version carries no
#     yield (the known rollback limit), every row unchanged — and the version that recorded it keeps it.
# Writes everything to $OUT (default /tmp/table-upgrade-rehearsal-<prev>-<time>/) and exits non-zero on any FAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
NEW="$(pwd)"
PREV="${1:-43cd1ce}"
OLD_SUITE=0
for a in "$@"; do [ "$a" = "--old-suite" ] && OLD_SUITE=1; done
PREV_SHA="$(git rev-parse --short "$PREV")"
NEW_SHA="$(git rev-parse --short HEAD)"
OUT="${OUT:-/tmp/table-upgrade-rehearsal-$PREV_SHA-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT"
# Its own throwaway PostgreSQL cluster (not .local/pgdata, not the test databases): the earlier release's
# fixture only seeds a database named table_test, so the rehearsal gives it one that nothing else uses.
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${REHEARSAL_PGPORT:-54339}"
BASE="postgres://table@127.0.0.1:$PORT"
TMP="$(mktemp -d)"
WT="$TMP/prev"
RDATA="$TMP/pgdata"
as_pg() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
if [ "$(id -u)" = "0" ]; then chown postgres "$TMP"; fi
as_pg "$PGBIN/initdb" -D "$RDATA" -U table --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
as_pg "$PGBIN/pg_ctl" -D "$RDATA" -l "$TMP/postgres.log" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -w start >/dev/null
fails=0
pass() { echo "PASS  $*" | tee -a "$OUT/summary.txt"; }
fail() { echo "FAIL  $*" | tee -a "$OUT/summary.txt"; fails=$((fails + 1)); }
fresh_db() {
  "$PGBIN/dropdb" -h 127.0.0.1 -p "$PORT" -U table --if-exists "$1"
  "$PGBIN/createdb" -h 127.0.0.1 -p "$PORT" -U table "$1"
}
in_prev() { (cd "$WT" && env APP_ROOT="$WT" "$@"); }
in_new() { (cd "$NEW" && env APP_ROOT="$NEW" "$@"); }
cleanup() {
  git worktree remove --force "$WT" >/dev/null 2>&1 || true
  as_pg "$PGBIN/pg_ctl" -D "$RDATA" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "Upgrade rehearsal: previous release $PREV_SHA → this release $NEW_SHA ($(date -u +%FT%TZ))" | tee "$OUT/summary.txt"
git worktree add --detach "$WT" "$PREV" >/dev/null 2>&1
ln -s "$NEW/node_modules" "$WT/node_modules"
DB="$BASE/table_test"
fresh_db table_test

# 1. Populate with the previous release.
in_prev env DATABASE_URL="$DB" npx tsx scripts/migrate.ts > "$OUT/1-migrate-prev.log" 2>&1
in_prev env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx "$NEW/scripts/rehearsal/populate.mts" > "$OUT/1-populate.json" 2> "$OUT/1-populate.log"
HH="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).householdId)' "$OUT/1-populate.json")"
in_prev env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx "$NEW/scripts/rehearsal/snapshot.mts" > "$OUT/1-projection-prev.json"
in_prev env DATABASE_URL="$DB" npx tsx "$NEW/scripts/rehearsal/data.mts" columns > "$OUT/1-columns.json"
in_prev env DATABASE_URL="$DB" npx tsx "$NEW/scripts/rehearsal/data.mts" checksum "$OUT/1-columns.json" > "$OUT/1-checksums.json"
in_prev env DATABASE_URL="$DB" npx tsx "$NEW/scripts/rehearsal/data.mts" export "$HH" > "$OUT/1-export-prev.json"
in_prev env DATABASE_URL="$DB" npx tsx "$NEW/scripts/rehearsal/data.mts" basis > "$OUT/1-basis.json"
pass "1 populated by $PREV_SHA: $(grep -c '"key"' "$OUT/1-projection-prev.json") grocery lines; export taken by $PREV_SHA"

# 2. Upgrade with this release.
in_new env DATABASE_URL="$DB" npx tsx scripts/migrate.ts > "$OUT/2-migrate-new.log" 2>&1
cat "$OUT/2-migrate-new.log" >> "$OUT/summary.txt"
in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/data.mts checksum "$OUT/1-columns.json" > "$OUT/2-checksums.json"
if cmp -s "$OUT/1-checksums.json" "$OUT/2-checksums.json"; then pass "2 every pre-existing column of every table is unchanged by the migration"; else fail "2 data changed by the migration (see 1-/2-checksums.json)"; fi
in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/data.mts basis > "$OUT/2-basis.json"
# Rows the previous release wrote keep the basis they had; before migration 015 there was none, so all read legacy.
if node -e 'const f=require("fs"); const a=JSON.parse(f.readFileSync(process.argv[1],"utf8")); const b=JSON.parse(f.readFileSync(process.argv[2],"utf8")); const want=a.column==="absent" ? {legacy:Object.values(b).reduce((x,y)=>x+y,0)} : a; process.exit(JSON.stringify(want)===JSON.stringify(b) ? 0 : 1)' "$OUT/1-basis.json" "$OUT/2-basis.json"; then pass "2 every existing recipe row keeps its basis (before: $(tr -d '\n ' < "$OUT/1-basis.json"); after: $(tr -d '\n ' < "$OUT/2-basis.json"))"; else fail "2 basis changed by the upgrade: $(tr -d '\n ' < "$OUT/1-basis.json") → $(tr -d '\n ' < "$OUT/2-basis.json")"; fi

# 2b. Migration 018 backfills nothing: no version has a recorded yield until this release writes one.
if [ -f "$NEW/scripts/rehearsal/yield.mts" ]; then
  in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/yield.mts > "$OUT/2b-yield.json"
  if node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(j.column==="present" && j.versionsWithYield===0 ? 0 : 1)' "$OUT/2b-yield.json"; then
    pass "2b migration 018 added recipe_versions.servings and backfilled nothing: $(tr -d '\n' < "$OUT/2b-yield.json")"
  else fail "2b migration 018 state (2b-yield.json)"; fi
fi

# 3. Same projection from both releases on the migrated database.
in_new env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx scripts/rehearsal/snapshot.mts > "$OUT/3-projection-new.json"
if in_new npx tsx scripts/rehearsal/compare.mts "$OUT/1-projection-prev.json" "$OUT/3-projection-new.json" > "$OUT/3-compare.json"; then
  pass "3 this release projects the upgraded week as $PREV_SHA did: amounts, packages, to send and status on every line; review identity changed only where exact rows are behind a line: $(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).changedIdentity.join("; ")||"none")' "$OUT/3-compare.json")"
else fail "3 projection after the upgrade differs (3-compare.json)"; fi
in_prev env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx "$NEW/scripts/rehearsal/snapshot.mts" > "$OUT/3-projection-prev-on-new-schema.json"
if in_new npx tsx scripts/rehearsal/compare.mts "$OUT/1-projection-prev.json" "$OUT/3-projection-prev-on-new-schema.json" > "$OUT/3-compare-prev.json"; then
  pass "3 $PREV_SHA still projects the same amounts, packages and to-send on the upgraded schema (an approval this release marked stale stays stale: $(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).changedIdentity.join("; ")||"none")' "$OUT/3-compare-prev.json"))"
else fail "3 $PREV_SHA projects differently on the upgraded schema (3-compare-prev.json)"; fi

# 4. Rollback: this release saves an exact recipe; the previous release still reads and projects everything.
if ! in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/save-exact.mts > "$OUT/4-new-save.log" 2>&1; then fail "4 this release could not save a recipe on the upgraded database (4-new-save.log)"; fi
in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/data.mts basis > "$OUT/4-basis.json"
if in_prev env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx "$NEW/scripts/rehearsal/snapshot.mts" > "$OUT/4-projection-prev-after-exact.json" 2> "$OUT/4-prev.log"; then
  pass "4 after this release saved an exact recipe ($(tr -d '\n ' < "$OUT/4-basis.json")), $PREV_SHA still recomputes every week"
else fail "4 $PREV_SHA cannot run on the upgraded database (4-prev.log)"; fi

# 4b. Catalog-first rollback (migration 017): this release opens a meal list (undated week, its own cycle) with
#     selected meals, a "Needs a quantity" item and an approval; the previous release must still read and recompute
#     every week without crashing and without the list reaching a calendar week; this release then restores it.
if [ -f "$NEW/scripts/rehearsal/meal-list.mts" ]; then
  if in_new env DATABASE_URL="$DB" MODE=populate TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx scripts/rehearsal/meal-list.mts > "$OUT/4b-list-new.json" 2> "$OUT/4b-list-new.log"; then
    pass "4b this release opened a meal list: $(node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log(`${j.listLines} list lines, ${j.listLinesNamingSelectedMeals} naming selected meals, ${j.needsQuantityUnknown} unknown (needs a quantity), approvals ${JSON.stringify(j.approvals)}, undated week ${JSON.stringify(j.lists.map(l=>[l.kind,l.week_start]))}`)' "$OUT/4b-list-new.json")"
  else fail "4b this release could not open a meal list (4b-list-new.log)"; fi
  if in_prev env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx "$NEW/scripts/rehearsal/snapshot.mts" > "$OUT/4b-projection-prev-with-list.json" 2> "$OUT/4b-prev.log" \
     && in_prev env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx "$NEW/scripts/rehearsal/member-snapshot.mts" > "$OUT/4b-member-snapshot-prev.json" 2>> "$OUT/4b-prev.log"; then
    pass "4b $PREV_SHA recomputes every week and loads a member's snapshot with an open meal list present (it shows: $(tr -d '\n ' < "$OUT/4b-member-snapshot-prev.json"))"
  else fail "4b $PREV_SHA fails with a meal list present (4b-prev.log)"; fi
  in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/meal-list.mts > "$OUT/4b-list-after-prev.json"
  if cmp -s "$OUT/4b-list-new.json" "$OUT/4b-list-after-prev.json"; then
    pass "4b $PREV_SHA already knows meal lists (migration 017): after it recomputed, the list is exactly as this release left it; no calendar line names a selected meal"
  elif node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(j.calendarLinesNamingSelectedMeals===0 && j.listLinesNamingSelectedMeals===0 && j.approvals.every(a=>a.state!=="active") ? 0 : 1)' "$OUT/4b-list-after-prev.json"; then
    pass "4b while $PREV_SHA ran, the list's stored lines lost their selected meals (it does not know them) and its approval went stale — the safe direction; no calendar line names a selected meal"
  else fail "4b unexpected list state after $PREV_SHA recomputed (4b-list-after-prev.json)"; fi
  in_new env DATABASE_URL="$DB" TABLE_FIXED_NOW=2026-10-12T19:00:00Z TABLE_RETAILER=simulated TABLE_ENV=test npx tsx scripts/rehearsal/snapshot.mts > /dev/null
  in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/meal-list.mts > "$OUT/4b-list-restored.json"
  if cmp -s "$OUT/4b-list-new.json" "$OUT/4b-list-after-prev.json" && cmp -s "$OUT/4b-list-new.json" "$OUT/4b-list-restored.json"; then
    pass "4b back on this release, the list is unchanged (lines, selected meals, needs-a-quantity item and approval as before)"
  elif node -e 'const f=require("fs"); const a=JSON.parse(f.readFileSync(process.argv[1],"utf8")); const b=JSON.parse(f.readFileSync(process.argv[2],"utf8")); process.exit(b.listLinesNamingSelectedMeals===a.listLinesNamingSelectedMeals && b.listLines===a.listLines && b.needsQuantityUnknown===1 && b.calendarLinesNamingSelectedMeals===0 && !b.approvals.some(x=>x.state==="active") ? 0 : 1)' "$OUT/4b-list-new.json" "$OUT/4b-list-restored.json"; then
    pass "4b back on this release, one recompute restores the list exactly ($(node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log(`${j.listLines} lines, ${j.listLinesNamingSelectedMeals} from selected meals`)' "$OUT/4b-list-restored.json")); the stale approval is not revived (approve again)"
  else fail "4b the list did not come back as it was (4b-list-restored.json)"; fi
fi

# 5. Export/restore.
in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/data.mts export "$HH" > "$OUT/5-export-new.json"
fresh_db table_restore_check
in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/migrate.ts > /dev/null
in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/rehearsal/data.mts restore "$OUT/5-export-new.json" > "$OUT/5-restore-new.json"
in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/rehearsal/data.mts export "$HH" > "$OUT/5-export-new-again.json"
if cmp -s "$OUT/5-export-new.json" "$OUT/5-export-new-again.json"; then pass "5 this release's export (legacy and exact rows) restores and re-exports identically"; else fail "5 export/restore round trip differs"; fi
fresh_db table_restore_check
in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/migrate.ts > /dev/null
in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/rehearsal/data.mts restore "$OUT/1-export-prev.json" > "$OUT/5-restore-prev.json"
in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/rehearsal/data.mts basis > "$OUT/5-basis-prev-restored.json"
if node -e 'const f=require("fs"); const a=JSON.parse(f.readFileSync(process.argv[1],"utf8")); const b=JSON.parse(f.readFileSync(process.argv[2],"utf8")); const want=a.column==="absent" ? {legacy:Object.values(b).reduce((x,y)=>x+y,0)} : a; process.exit(JSON.stringify(want)===JSON.stringify(b) ? 0 : 1)' "$OUT/1-basis.json" "$OUT/5-basis-prev-restored.json"; then pass "5 $PREV_SHA's pre-upgrade export restores into the new schema with every row's basis as it was ($(tr -d '\n ' < "$OUT/5-basis-prev-restored.json"))"; else fail "5 restoring $PREV_SHA's export: basis $(tr -d '\n ' < "$OUT/5-basis-prev-restored.json")"; fi
fresh_db table_restore_check
in_prev env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/migrate.ts > /dev/null
if in_prev env DATABASE_URL="$BASE/table_restore_check" npx tsx "$NEW/scripts/rehearsal/data.mts" restore "$OUT/5-export-new.json" > "$OUT/5-restore-new-into-prev.log" 2>&1; then
  fail "5 expected: an export made after exact recipes exist does not restore into $PREV_SHA's schema — it did"
else
  left="$("$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U table -d table_restore_check -tAc "SELECT (SELECT count(*) FROM households) + (SELECT count(*) FROM recipe_ingredients)")"
  if [ "$left" = "0" ]; then pass "5 known limit confirmed: an export taken from the upgraded database (exact rows; from migration 018 on, every export, as it carries recipe_versions.servings) needs this release (or later) to restore; $PREV_SHA's schema refuses it and nothing was half-restored"
  else fail "5 a refused restore left $left rows behind"; fi
fi

# 7. Migration 018 (B51), on the upgraded database (before step 6, which replaces it).
if [ -f "$NEW/scripts/rehearsal/yield.mts" ]; then
  in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/yield.mts > "$OUT/7-after-migration.json"
  in_new env DATABASE_URL="$DB" MODE=record npx tsx scripts/rehearsal/yield.mts > "$OUT/7-record.json" 2> "$OUT/7-record.log" || true
  if node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").pop()); process.exit(j.servings===6 && j.rowsUnchanged && j.rows>0 ? 0 : 1)' "$OUT/7-record.json" 2>/dev/null; then
    pass "7 this release recorded 'makes 6' on a recipe $PREV_SHA wrote (all legacy rows): $(tail -1 "$OUT/7-record.json")"
  else fail "7 recording a yield on a previous-release recipe (7-record.json / 7-record.log)"; fi
  if in_prev env DATABASE_URL="$DB" MODE=prev-title npx tsx "$NEW/scripts/rehearsal/yield.mts" > "$OUT/7-prev-title.json" 2> "$OUT/7-prev-title.log" \
     && node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").pop()).rowsUnchanged ? 0 : 1)' "$OUT/7-prev-title.json"; then
    pass "7 rollback: $PREV_SHA still saves that recipe on the upgraded schema, every row unchanged: $(tail -1 "$OUT/7-prev-title.json")"
  else fail "7 $PREV_SHA could not save on the upgraded schema (7-prev-title.log)"; fi
  in_new env DATABASE_URL="$DB" npx tsx scripts/rehearsal/yield.mts > "$OUT/7-after-rollback.json"
  if node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); const v=j.rehearsalRecipe; const last=v[v.length-1]; const rec=v.find(x=>x.servings===6); process.exit(last.servings===null && rec ? 0 : 1)' "$OUT/7-after-rollback.json"; then
    pass "7 known rollback limit confirmed: the version $PREV_SHA wrote has no recorded yield (it does not know the column); the version that recorded it still has 6: $(tr -d '\n' < "$OUT/7-after-rollback.json")"
  else fail "7 unexpected yields after the rollback save (7-after-rollback.json)"; fi
fi

# 6. The previous release's own suite against the new schema.
if [ "$OLD_SUITE" = 1 ]; then
  fresh_db table_test
  in_new env DATABASE_URL="$BASE/table_test" npx tsx scripts/migrate.ts > /dev/null
  # Its export/restore tests restore into table_restore_check: in a rollback that database carries the new schema too.
  # (Restoring an export taken after migration 018 into a pre-018 schema is the known limit checked in step 5.)
  fresh_db table_restore_check
  in_new env DATABASE_URL="$BASE/table_restore_check" npx tsx scripts/migrate.ts > /dev/null
  if in_prev env TEST_DATABASE_URL="$BASE/table_test" npx vitest run > "$OUT/6-prev-suite.log" 2>&1; then
    pass "6 $PREV_SHA's vitest suite passes on the upgraded database (all migrations of this release): $(grep -E '^ +Tests ' "$OUT/6-prev-suite.log" | tr -s ' ')"
  else fail "6 $PREV_SHA's vitest suite on the new schema: $(grep -E '^ +Tests ' "$OUT/6-prev-suite.log" | tr -s ' ')"; fi
fi

echo "Result: $([ $fails = 0 ] && echo PASS || echo "FAIL ($fails)") — $OUT" | tee -a "$OUT/summary.txt"
[ $fails = 0 ]

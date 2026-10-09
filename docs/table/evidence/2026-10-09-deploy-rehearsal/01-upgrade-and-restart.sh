#!/usr/bin/env bash
# (a) populated 011 database -> first start with the candidate Start Command -> 012 applied, health 200,
#     existing member signs in, data intact; (b) restart applies nothing and starts.
# Usage: 01-upgrade-and-restart.sh [exec|noexec]
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
V=${1:-exec}; CMD=$START_EXEC; [ "$V" = noexec ] && CMD=$START_NOEXEC
DB=table_deploy_a; PORT=3602
log "variant=$V  code=$(git -C "$NEW" rev-parse --short HEAD) migrate.ts sha=$(sha256sum "$NEW/src/server/db/migrate.ts" | cut -c1-12)"
log "Start Command: bash -c '$CMD'"
restore_011 $DB
save_011_columns $DB "$S/state/cols-011.txt"
original_columns_digest $DB "$S/state/cols-011.txt" > "$S/state/digest-before.txt"
log "before: migrations=$(migrations $DB | wc -w) last=$(migrations $DB | awk '{print $NF}')"

log "--- first start (upgrade) ---"
T0=$(date +%s.%N)
start_app "$NEW" $DB $PORT "$CMD" "$S/logs/01-$V-first.log"; PID=$APP_PID
wait_ready "$PID" $PORT 90; R=$REPLY; T1=$(date +%s.%N)
log "result=$R after $(echo "$T1 - $T0" | bc) s"
log "process tree:"; tree "$PID"
log "server output:"; sed 's/^/    | /' "$S/logs/01-$V-first.log"
log "health: $(health $PORT)"
log "after: migrations=$(migrations $DB | wc -w) 012 rows=$(psql "$PGBASE/$DB" -At -c "SELECT count(*) FROM schema_migrations WHERE name='012_recipe_content.sql'")"
log "012 objects: recipe_images=$(psql "$PGBASE/$DB" -At -c "SELECT to_regclass('recipe_images') IS NOT NULL") draft.content_policy=$(psql "$PGBASE/$DB" -At -c "SELECT content_policy FROM recipe_import_drafts")"
original_columns_digest $DB "$S/state/cols-011.txt" > "$S/state/digest-after.txt"
if diff -q "$S/state/digest-before.txt" "$S/state/digest-after.txt" >/dev/null; then
  log "every 011 table identical over its 011 columns ($(wc -l < "$S/state/digest-before.txt") tables) except as listed: none"
else
  log "011-column digests differ (expected: only schema_migrations, which gained the 012 row):"; diff "$S/state/digest-before.txt" "$S/state/digest-after.txt"
fi
log "sign-in member 1 (existing 011 credential): HTTP $(signin $PORT "$EMAIL1" "$PW1" "$S/state/jar-a1")  cookie=$(cut -d= -f1 "$S/state/jar-a1")"
log "sign-in member 2: HTTP $(signin $PORT "$EMAIL2" "$PW2" "$S/state/jar-a2")"
log "wrong password: HTTP $(signin $PORT "$EMAIL1" 'not-the-password-0000' "$S/state/jar-bad")"
log "library (member 1): $(get_json $PORT /api/library "$S/state/jar-a1" | python3 -c 'import sys,json; t=sys.stdin.read(); b,code=t.rsplit(" HTTP ",1); d=json.loads(b); print("HTTP",code.strip(),"recipes=",len(d.get("recipes",[])), "bookmarks=",len(d.get("bookmarks",d.get("links",[]))), "keys=",sorted(d)[:12])')"
log "snapshot (member 2): $(get_json $PORT /api/snapshot "$S/state/jar-a2" | tail -c 12)"
stop_group "$PID"; log "stopped; port free: $(port_free $PORT && echo yes || echo no)"

log "--- restart (b) ---"
FP0=$(fingerprint $DB)
T0=$(date +%s.%N)
start_app "$NEW" $DB $PORT "$CMD" "$S/logs/01-$V-restart.log"; PID=$APP_PID
wait_ready "$PID" $PORT 90; R=$REPLY; T1=$(date +%s.%N)
log "result=$R after $(echo "$T1 - $T0" | bc) s"
log "server output:"; sed 's/^/    | /' "$S/logs/01-$V-restart.log"
log "health: $(health $PORT)"
FP1=$(fingerprint $DB)
log "session from before the restart still reads the library: $(get_json $PORT /api/library "$S/state/jar-a1" | tail -c 9)"
log "fingerprint before restart: $FP0"
log "fingerprint after  restart (taken after migrate + health, before any signed-in request): $FP1"
stop_group "$PID"; log "stopped; port free: $(port_free $PORT && echo yes || echo no)"
log "final row counts: $(counts $DB)"

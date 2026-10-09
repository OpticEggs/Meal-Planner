#!/usr/bin/env bash
# (c, deterministic) Forces the overlap the random trials only sometimes hit: a third session holds an
# ACCESS EXCLUSIVE lock on recipe_import_drafts (the first table 012 alters) for 6 s, so whichever
# process starts 012 first is held mid-migration while the other process starts too.
# Usage: 03b-forced-overlap.sh orig|repaired
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
V=$1; DB=table_deploy_a
case "$V" in
  orig) git -C "$NEW" show 3ac64f6:src/server/db/migrate.ts > "$NEW/src/server/db/migrate.ts" ;;
  repaired) cp /tmp/table-w-deploy/src/server/db/migrate.ts "$NEW/src/server/db/migrate.ts" ;;
  *) echo "usage: $0 orig|repaired"; exit 2 ;;
esac
log "variant=$V migrate.ts sha=$(sha256sum "$NEW/src/server/db/migrate.ts" | cut -c1-12)"
restore_011 $DB
psql "$PGBASE/$DB" -q -c "BEGIN" -c "LOCK TABLE recipe_import_drafts IN ACCESS EXCLUSIVE MODE" -c "SELECT pg_sleep(6)" -c "COMMIT" & HOLDER=$!
sleep 0.5
log "holder (psql pid $HOLDER) has the table lock; starting A and B"
start_app "$NEW" $DB 3603 "$START_EXEC" "$S/logs/03b-$V-A.log"; A=$APP_PID
start_app "$NEW" $DB 3604 "$START_EXEC" "$S/logs/03b-$V-B.log"; B=$APP_PID
sleep 3.5
log "while held: lock waits = $(psql "$PGBASE/$DB" -At -c "SELECT string_agg(locktype || ':' || mode || CASE WHEN locktype='advisory' THEN '(key ' || ((classid::bigint << 32) | objid::bigint) || ')' ELSE '(' || relation::regclass::text || ')' END, ', ') FROM pg_locks WHERE NOT granted")"
log "while held: A listening? $(curl -s -o /dev/null --max-time 1 http://127.0.0.1:3603/api/health && echo yes || echo no)  B listening? $(curl -s -o /dev/null --max-time 1 http://127.0.0.1:3604/api/health && echo yes || echo no)"
wait "$HOLDER"; log "holder released the lock"
wait_ready "$A" 3603 60; RA=$REPLY
wait_ready "$B" 3604 60; RB=$REPLY
log "A(pid $A)=$RA  B(pid $B)=$RB"
for x in A B; do sed "s/^/    $x | /" "$S/logs/03b-$V-$x.log" | grep -Ev '^    . \| *$|Local:|Network:|Running next.config|^    . \| > '; done
log "health A: $(health 3603)   health B: $(health 3604)"
log "schema_migrations rows=$(psql "$PGBASE/$DB" -At -c 'SELECT count(*) FROM schema_migrations') 012 rows=$(psql "$PGBASE/$DB" -At -c "SELECT count(*) FROM schema_migrations WHERE name LIKE '012%'")"
stop_group "$A"; stop_group "$B"
log "ports free: $(port_free 3603 && port_free 3604 && echo yes || echo no)"

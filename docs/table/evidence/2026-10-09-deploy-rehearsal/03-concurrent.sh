#!/usr/bin/env bash
# (c) Two processes start at the same moment with the candidate Start Command against the same
# populated 011 database. Usage: 03-concurrent.sh <label> <trials>
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
LABEL=${1:-run}; N=${2:-5}; DB=table_deploy_a
log "label=$LABEL code=$(git -C "$NEW" rev-parse --short HEAD) migrate.ts sha=$(sha256sum "$NEW/src/server/db/migrate.ts" | cut -c1-12) trials=$N"
log "Start Command (both processes): bash -c '$START_EXEC'"
for ((t = 1; t <= N; t++)); do
  restore_011 $DB
  start_app "$NEW" $DB 3603 "$START_EXEC" "$S/logs/03-$LABEL-t$t-A.log"; A=$APP_PID
  start_app "$NEW" $DB 3604 "$START_EXEC" "$S/logs/03-$LABEL-t$t-B.log"; B=$APP_PID
  T0=$(date +%s.%N)
  wait_ready "$B" 3604 90; RB=$REPLY
  wait_ready "$A" 3603 90; RA=$REPLY
  T1=$(date +%s.%N)
  log "trial $t: A(pid $A)=$RA  B(pid $B)=$RB  ($(echo "$T1 - $T0" | bc | cut -c1-5) s)"
  for x in A B; do
    sed "s/^/    $x | /" "$S/logs/03-$LABEL-t$t-$x.log" | grep -v '^    . | *$' | grep -Ev 'Local:|Network:|Running next.config|^    . \| > '
  done
  log "  health A: $(health 3603)   health B: $(health 3604)"
  log "  schema_migrations rows=$(psql "$PGBASE/$DB" -At -c 'SELECT count(*) FROM schema_migrations') 012 rows=$(psql "$PGBASE/$DB" -At -c "SELECT count(*) FROM schema_migrations WHERE name LIKE '012%'") recipe_images exists=$(psql "$PGBASE/$DB" -At -c "SELECT to_regclass('recipe_images') IS NOT NULL")"
  stop_group "$A"; stop_group "$B"
  port_free 3603 && port_free 3604 || log "  WARNING: a port is still in use"
done

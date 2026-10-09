#!/usr/bin/env bash
# (d) A failing migration stops the Start Command before `next start` and leaves the database as it was.
# Uses a SCRATCH app directory: every entry of the run worktree is symlinked except migrations/, which is a
# real copy of 001-012 plus one rehearsal-only bad file. No repository migration file is added or altered.
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
APP=$S/app-badmig; DB=table_deploy_a; PORT=3605
if [ ! -d "$APP" ]; then
  mkdir -p "$APP/migrations"
  for e in "$NEW"/* "$NEW"/.next; do [ "$(basename "$e")" = migrations ] || ln -s "$e" "$APP/$(basename "$e")"; done
  cp "$NEW"/migrations/*.sql "$APP/migrations/"
  cat > "$APP/migrations/013_rehearsal_bad.sql" <<'SQL'
-- REHEARSAL ONLY (scratch directory, never in the repository): does real work, then fails.
CREATE TABLE rehearsal_half_done(id int);
ALTER TABLE recipe_bookmarks ADD COLUMN rehearsal_col text;
UPDATE recipe_bookmarks SET title = 'changed by the bad migration';
SELECT * FROM no_such_table;
SQL
fi
log "scratch app $APP; migrations: $(ls "$APP/migrations" | tr '\n' ' ')"
log "migrate.ts sha=$(sha256sum "$APP/src/server/db/migrate.ts" | cut -c1-12)"

run_case() {  # $1 label, $2 prepare (011 or 012)
  restore_011 $DB
  if [ "$2" = 012 ]; then (cd "$NEW" && DATABASE_URL="$PGBASE/$DB" npm run -s db:migrate); fi
  local FP0 FP1 T0 T1
  FP0=$(fingerprint $DB)
  log "[$1] before: $FP0 last=$(migrations $DB | awk '{print $NF}')"
  T0=$(date +%s.%N)
  start_app "$APP" $DB $PORT "$START_EXEC" "$S/logs/05-$1.log"; local P=$APP_PID
  wait_ready "$P" $PORT 60; T1=$(date +%s.%N)
  log "[$1] result=$REPLY after $(echo "$T1 - $T0" | bc | cut -c1-5) s"
  sed 's/^/    | /' "$S/logs/05-$1.log"
  log "[$1] anything on port $PORT? $(port_free $PORT && echo no || echo YES)  processes left in its session: $(ps -o pid= -s "$P" | wc -l)"
  FP1=$(fingerprint $DB)
  log "[$1] after:  $FP1 last=$(migrations $DB | awk '{print $NF}')"
  log "[$1] rehearsal_half_done exists=$(psql "$PGBASE/$DB" -At -c "SELECT to_regclass('rehearsal_half_done') IS NOT NULL") rehearsal_col exists=$(psql "$PGBASE/$DB" -At -c "SELECT count(*) FROM information_schema.columns WHERE column_name='rehearsal_col'") bookmark title=$(psql "$PGBASE/$DB" -At -c "SELECT title FROM recipe_bookmarks")"
  log "[$1] advisory lock free afterwards: $(psql "$PGBASE/$DB" -At -c "SELECT pg_try_advisory_lock(7265012001)")"
  stop_group "$P"
}
run_case at012 012
run_case at011 011

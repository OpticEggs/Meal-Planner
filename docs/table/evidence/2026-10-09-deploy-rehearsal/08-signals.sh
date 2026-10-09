#!/usr/bin/env bash
# (f) What `exec` changes: process tree and SIGTERM delivered to the TOP process only (the way a host
# signals the process it started), for bash and dash (/bin/sh here), with and without exec.
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
DB=table_deploy_a; PORT=3608
restore_011 $DB >/dev/null
(cd "$NEW" && DATABASE_URL="$PGBASE/$DB" npm run -s db:migrate)
for sh in bash dash; do
  for v in exec noexec; do
    CMD=$START_EXEC; [ $v = noexec ] && CMD=$START_NOEXEC
    log "=== $sh -c '$CMD'"
    SHELL_BIN=$sh start_app "$NEW" $DB $PORT "$CMD" "$S/logs/08-$sh-$v.log"; P=$APP_PID
    # during the migration phase (before exec can happen)
    sleep 0.4; log "tree during db:migrate:"; tree "$P"
    wait_ready "$P" $PORT 60; log "ready: $REPLY; tree while serving:"; tree "$P"
    T0=$(date +%s.%N); kill -TERM "$P"
    for i in $(seq 1 50); do kill -0 "$P" 2>/dev/null || break; sleep 0.1; done
    if kill -0 "$P" 2>/dev/null; then TOP="still running"; else wait "$P" 2>/dev/null; TOP="exited code $?"; fi
    sleep 0.5
    log "SIGTERM to top pid $P only -> top: $TOP after $(echo "$(date +%s.%N) - $T0 - 0.5" | bc | cut -c1-4) s; port $PORT still serving? $(port_free $PORT && echo no || echo YES); left in session: $(ps -o pid=,args= -s "$P" | tr '\n' ';')"
    tail -2 "$S/logs/08-$sh-$v.log" | sed 's/^/    | /'
    stop_group "$P"; log "cleanup (group signal): port free: $(port_free $PORT && echo yes || echo no)"
  done
done

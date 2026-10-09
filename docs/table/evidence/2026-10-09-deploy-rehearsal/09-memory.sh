#!/usr/bin/env bash
# Memory of the start-time migration phase vs the serving phase (Render Free instances have 512 MB;
# provider figure from Render's pricing page, not measured here). Samples the summed RSS of every
# process in the app's session every 50 ms.
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
DB=table_deploy_a; PORT=3609
restore_011 $DB >/dev/null
start_app "$NEW" $DB $PORT "$START_EXEC" "$S/logs/09-memory-app.log"; P=$APP_PID
peak=0; peak_n=0
while ! curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/api/health"; do
  kill -0 "$P" 2>/dev/null || break
  kb=$(ps -o rss= -s "$P" | awk '{s+=$1} END {print s+0}'); n=$(ps -o pid= -s "$P" | wc -l)
  [ "$kb" -gt "$peak" ] && peak=$kb && peak_n=$n
  sleep 0.05
done
log "peak summed RSS during 'npm run db:migrate' (then next start): $((peak / 1024)) MB across $peak_n processes"
for i in 1 2 3 4 5; do curl -s -o /dev/null "http://127.0.0.1:$PORT/api/health"; curl -s -o /dev/null "http://127.0.0.1:$PORT/login"; done
log "serving: $(ps -o rss=,args= -s "$P" | awk '{printf "%d MB %s %s %s; ", $1/1024, $2, $3, $4}')"
sed 's/^/    | /' "$S/logs/09-memory-app.log" | grep -E 'applied|up to date'
stop_group "$P"

#!/usr/bin/env bash
# (e) Old/new overlap: the 9623de4 release (011) keeps serving while the 012-aware release starts with
# the candidate Start Command and migrates the same database; then the old code is (re)started on 012
# (what a rollback to the previous commit would do).
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
DB=table_deploy_a; OP=3606; NP=3607
restore_011 $DB
log "old code $(git -C "$OLD" rev-parse --short HEAD) (migrations on disk: $(ls "$OLD/migrations" | wc -l)); new code $(git -C "$NEW" rev-parse --short HEAD) + repaired migrate.ts sha=$(sha256sum "$NEW/src/server/db/migrate.ts" | cut -c1-12) (on disk: $(ls "$NEW/migrations" | wc -l))"
start_app "$OLD" $DB $OP 'exec node_modules/.bin/next start -H 0.0.0.0' "$S/logs/07-old.log"; OLDPID=$APP_PID
wait_ready "$OLDPID" $OP 60; log "old release (pid $OLDPID) on 011: $REPLY; health $(health $OP)"
log "old: sign-in member 1 HTTP $(signin $OP "$EMAIL1" "$PW1" "$S/state/jar-old1")"

log "--- new release starts with the candidate Start Command while the old one serves ---"
start_app "$NEW" $DB $NP "$START_EXEC" "$S/logs/07-new.log"; NEWPID=$APP_PID
# keep the old release busy during the new one's migration: one library read every 50 ms
( for i in $(seq 1 60); do curl -s -o /dev/null -w '%{http_code} ' --max-time 10 -H "cookie: $(cat "$S/state/jar-old1")" "http://127.0.0.1:$OP/api/library"; sleep 0.05; done; echo ) > "$S/logs/07-old-reads-during-migration.txt" & READER=$!
wait_ready "$NEWPID" $NP 60; log "new release (pid $NEWPID): $REPLY"
wait "$READER"
log "old release's library reads while the new one migrated (HTTP codes): $(tr -s ' ' < "$S/logs/07-old-reads-during-migration.txt" | tr ' ' '\n' | sort | uniq -c | tr '\n' ' ')"
sed 's/^/    new | /' "$S/logs/07-new.log" | grep -Ev 'Local:|Network:|Running next|\| > |\| *$'
log "schema_migrations now: $(migrations $DB | wc -w) rows, last $(migrations $DB | awk '{print $NF}')"

log "--- old release on the 012 database ---"
log "old health: $(health $OP)"
log "old library (session from before the upgrade): $(get_json $OP /api/library "$S/state/jar-old1" | tail -c 9)"
log "old snapshot: $(get_json $OP /api/snapshot "$S/state/jar-old1" | tail -c 9)"
log "old sign-in member 2: HTTP $(signin $OP "$EMAIL2" "$PW2" "$S/state/jar-old2")"
log "old writes on 012:"
command_post $OP SaveRecipeVersion '{"title":"Written by the old release on 012","instructions":"Boil.","components":[{"key":"main","name":"Main"}],"ingredients":[{"componentKey":"main","ingredientName":"Penne pasta","quantity":"1","unit":"lb"}]}' "$S/state/jar-old1" | cut -c1-140
command_post $OP SaveLink '{"url":"https://www.example.org/recipes/old-release-link","title":"Old release link"}' "$S/state/jar-old2" | cut -c1-140
BM=$(psql "$PGBASE/$DB" -At -c "SELECT id FROM recipe_bookmarks WHERE title='Old release link'")
command_post $OP PasteIngredients "{\"bookmarkId\":\"$BM\",\"text\":\"2 cups rice\"}" "$S/state/jar-old2" | cut -c1-140
log "rows written by the old release carry 012 defaults: $(psql "$PGBASE/$DB" -At -c "SELECT 'draft content_policy=' || content_policy::text || ' source_step_count=' || source_step_count FROM recipe_import_drafts d JOIN recipe_bookmarks b ON b.id=d.bookmark_id WHERE b.title='Old release link'")"

log "--- new release reads what the old one wrote ---"
log "new sign-in member 1: HTTP $(signin $NP "$EMAIL1" "$PW1" "$S/state/jar-new1")"
log "new library: $(get_json $NP /api/library "$S/state/jar-new1" | python3 -c 'import sys,json; t=sys.stdin.read(); b,c=t.rsplit(" HTTP ",1); d=json.loads(b); print("HTTP",c.strip(),"recipes=",len(d["recipes"]),"bookmarks=",len(d["bookmarks"]), "has old-release recipe:", any("old release" in json.dumps(r) for r in d["recipes"]))')"
log "new health: $(health $NP)"
stop_group "$OLDPID"; stop_group "$NEWPID"

log "--- rollback shape: the old code started fresh on 012 with the candidate Start Command ---"
start_app "$OLD" $DB $OP "$START_EXEC" "$S/logs/07-old-restart-on-012.log"; P=$APP_PID
wait_ready "$P" $OP 60; log "old code on 012 with startup migration: $REPLY"
sed 's/^/    old | /' "$S/logs/07-old-restart-on-012.log" | grep -Ev 'Local:|Network:|Running next|\| > |\| *$'
log "old health: $(health $OP)"
log "old library (signed in before everything): $(get_json $OP /api/library "$S/state/jar-old1" | tail -c 9)"
log "schema_migrations: $(migrations $DB | wc -w) rows (unchanged)"
stop_group "$P"
log "ports free: $(port_free $OP && port_free $NP && echo yes || echo no)"

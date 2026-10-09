#!/usr/bin/env bash
# Builds a populated schema-011 database with the 9623de4 code (the release before 012), then saves
# it as a custom-format dump so every scenario can start from the identical 011 state.
source /tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal/lib.sh
DB=table_deploy_a
log "code: $(git -C "$OLD" rev-parse --short HEAD) ($OLD); migrations on disk: $(ls "$OLD/migrations" | tr '\n' ' ')"
psql "$PGBASE/postgres" -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
cd "$OLD" || exit 1
export TABLE_ENV=production NODE_ENV=production DATABASE_URL="$PGBASE/$DB" BETTER_AUTH_URL="$ORIGIN"
log "npm run db:migrate (9623de4 runner)"; npm run db:migrate 2>&1 | tail -1
HH=$(npm run -s household:create -- "Rehearsal household" America/Chicago | awk '/^household/{print $2}')
log "household $HH"
TABLE_NEW_PASSWORD="$PW1" npm run -s member:create -- "$HH" "$EMAIL1" "Jon (rehearsal)"
TABLE_NEW_PASSWORD="$PW2" npm run -s member:create -- "$HH" "$EMAIL2" "Alex (rehearsal)"
npm run -s sample:recipes -- "$HH"

log "starting the 9623de4 production build to add a recipe and a saved link through its own API"
start_app "$OLD" "$DB" 3601 'exec node_modules/.bin/next start -H 0.0.0.0' "$S/logs/00-seed-server.log"; PID=$APP_PID
wait_ready "$PID" 3601 60; log "server pid $PID: $REPLY"
health 3601
log "sign-in member 1: HTTP $(signin 3601 "$EMAIL1" "$PW1" "$S/state/jar1")"
log "sign-in member 2: HTTP $(signin 3601 "$EMAIL2" "$PW2" "$S/state/jar2")"
command_post 3601 SaveRecipeVersion '{"title":"Rehearsal sheet-pan chicken","cuisine":"american","effortMinutes":40,"effortLevel":"easy","leftoverFriendly":true,"instructions":"Roast the chicken and vegetables at 425F for 35 minutes.","components":[{"key":"main","name":"Main"}],"ingredients":[{"componentKey":"main","ingredientName":"Chicken thighs","quantity":"1.5","unit":"lb"},{"componentKey":"main","ingredientName":"Broccoli","quantity":"1","unit":"lb"}]}' "$S/state/jar1"
command_post 3601 SaveLink '{"url":"https://www.budgetbytes.com/sheet-pan-chicken-fajitas/","title":"Sheet pan fajitas","note":"try next week"}' "$S/state/jar2"
BM=$(psql "$PGBASE/$DB" -At -c "SELECT id FROM recipe_bookmarks LIMIT 1")
command_post 3601 PasteIngredients "{\"bookmarkId\":\"$BM\",\"title\":\"Sheet pan fajitas\",\"text\":\"1 lb chicken breast\\n2 bell peppers\\n8 corn tortillas\"}" "$S/state/jar2"
log "library read (member 1):"; get_json 3601 /api/library "$S/state/jar1" | head -c 300; echo
stop_group "$PID"; log "server stopped; port free: $(port_free 3601 && echo yes || echo no)"

log "schema_migrations: $(migrations $DB)"
log "row counts: $(counts $DB)"
"$(ls -d /usr/lib/postgresql/*/bin | tail -1)/pg_dump" --format=custom --no-owner --file="$S/state/fixture-011.dump" "$PGBASE/$DB"
log "saved $S/state/fixture-011.dump ($(stat -c %s "$S/state/fixture-011.dump") bytes)"

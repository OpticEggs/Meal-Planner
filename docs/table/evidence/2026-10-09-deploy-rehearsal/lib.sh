# Shared helpers for the startup-migration rehearsal. Sourced by every scenario script.
# Only table_deploy_a / table_deploy_b and ports 3600-3609 are used.
set -uo pipefail
S=/tmp/claude-0/-home-user/ae3f20b4-8e59-5d3c-9e16-8b697724019c/scratchpad/deploy-rehearsal
PGBASE=postgres://table@127.0.0.1:54329
NEW=/tmp/table-w-deploy-run          # 012-aware code (3ac64f6 + the repair under test), production build
OLD=/tmp/table-w-deploy-base-run     # 9623de4 code (migrations 001-011), production build
ORIGIN=https://table.example.invalid # BETTER_AUTH_URL: an https origin, so configProblems() is clean (as in the earlier B9 local check)
# shellcheck disable=SC1091
source "$S/secret.env"; export BETTER_AUTH_SECRET
PW1='rehearsal-pass-one-1234'
PW2='rehearsal-pass-two-5678'
EMAIL1='jon.rehearsal@example.invalid'
EMAIL2='alex.rehearsal@example.invalid'

# The candidate Start Commands, exactly as they would be typed into Render.
START_EXEC='npm run db:migrate && exec node_modules/.bin/next start -H 0.0.0.0'
START_NOEXEC='npm run db:migrate && node_modules/.bin/next start -H 0.0.0.0'

ts() { date -u +%H:%M:%S.%3N; }
log() { echo "[$(ts)] $*"; }

# start_app <dir> <db> <port> <command> <logfile>  -> sets APP_PID to the new session leader (bash -c).
# Call directly (not in $(...)) so the process is this shell's child and its exit status can be collected.
# setsid: the app gets its own session/process group, so it can be stopped by group without patterns.
start_app() {
  local dir=$1 db=$2 port=$3 cmd=$4 out=$5
  ( cd "$dir" && exec env -i PATH="$PATH" HOME="$HOME" \
      TABLE_ENV=production NODE_ENV=production TABLE_RETAILER=simulated \
      DATABASE_URL="$PGBASE/$db" BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" BETTER_AUTH_URL="$ORIGIN" PORT="$port" \
      setsid ${SHELL_BIN:-bash} -c "$cmd" >"$out" 2>&1 < /dev/null ) &
  APP_PID=$!
}

# wait_ready <pid> <port> <seconds>: sets REPLY to "listening", "exited:<code>" or "timeout".
# Call it directly (not in $(...)) so `wait` can collect the exit status of start_app's child.
wait_ready() {
  local pid=$1 port=$2 secs=$3 i
  for ((i = 0; i < secs * 10; i++)); do
    if curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$port/api/health"; then REPLY=listening; return; fi
    if ! kill -0 "$pid" 2>/dev/null; then wait "$pid" 2>/dev/null; REPLY="exited:$?"; return; fi
    sleep 0.1
  done
  REPLY=timeout
}

health() { curl -s -w ' HTTP %{http_code}' --max-time 5 "http://127.0.0.1:$1/api/health"; echo; }

# signin <port> <email> <password> <cookiejar>: POST /api/auth/sign-in/email (what authClient.signIn.email calls)
signin() {
  curl -s -o "$4.body" -D "$4.headers" -w '%{http_code}' --max-time 10 \
    -H 'content-type: application/json' -H "origin: $ORIGIN" \
    -d "{\"email\":\"$2\",\"password\":\"$3\"}" "http://127.0.0.1:$1/api/auth/sign-in/email"
  grep -i '^set-cookie: __Secure-better-auth.session_token=' "$4.headers" | sed -E 's/^[Ss]et-[Cc]ookie: ([^;]*);.*/\1/' > "$4"
}

# get_json <port> <path> <cookiejar>
get_json() { curl -s -w ' HTTP %{http_code}' --max-time 10 -H "cookie: $(cat "$3")" "http://127.0.0.1:$1$2"; echo; }

# command <port> <name> <payload-json> <cookiejar>
command_post() {
  curl -s -w ' HTTP %{http_code}' --max-time 10 -H 'content-type: application/json' -H "cookie: $(cat "$4")" \
    -d "{\"operationId\":\"$(cat /proc/sys/kernel/random/uuid)\",\"payload\":$3}" "http://127.0.0.1:$1/api/commands/$2"; echo
}

# stop_group <pid> [signal]: signal the whole process group started by start_app, then wait for it.
stop_group() {
  local pid=$1 sig=${2:-TERM} i
  kill -"$sig" -- "-$pid" 2>/dev/null
  wait "$pid" 2>/dev/null   # reap our direct child so it is not counted as a live (zombie) group member
  for ((i = 0; i < 100; i++)); do kill -0 -- "-$pid" 2>/dev/null || return 0; sleep 0.1; done
  kill -KILL -- "-$pid" 2>/dev/null
}

counts() {
  psql "$PGBASE/$1" -At -c "SELECT string_agg(t || '=' || n, ' ' ORDER BY t) FROM (SELECT table_name AS t, (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM \"' || table_name || '\"', false, true, '')))[1]::text AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') s"
}
migrations() { psql "$PGBASE/$1" -At -c "SELECT string_agg(name, ' ' ORDER BY name) FROM schema_migrations"; }
port_free() { ! curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$1/"; }

PGBIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
# restore_011 <db>: drop/create one of the two disposable databases and load the populated 011 fixture.
restore_011() {
  case "$1" in table_deploy_a|table_deploy_b) ;; *) echo "refusing $1"; return 1 ;; esac
  psql "$PGBASE/postgres" -q -c "DROP DATABASE IF EXISTS $1 WITH (FORCE)" -c "CREATE DATABASE $1"
  "$PGBIN/pg_restore" --no-owner --exit-on-error --dbname="$PGBASE/$1" "$S/state/fixture-011.dump"
}
# fingerprint <db>: schema hash + data hash + migration list (to prove "unchanged")
fingerprint() {
  echo "schema=$("$PGBIN/pg_dump" --schema-only "$PGBASE/$1" 2>/dev/null | grep -Ev '^(--|\\(un)?restrict )' | sha256sum | cut -c1-16) data=$("$PGBIN/pg_dump" --data-only "$PGBASE/$1" 2>/dev/null | grep -Ev '^(--|\\(un)?restrict )' | sha256sum | cut -c1-16) migrations=$(psql "$PGBASE/$1" -At -c 'SELECT count(*) FROM schema_migrations')"
}
# original_columns_digest <db> <tablelist-file>: per-table md5 over the columns each table had at 011
save_011_columns() { psql "$PGBASE/$1" -At -F' ' -c "SELECT table_name, string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' GROUP BY table_name ORDER BY 1" > "$2"; }
original_columns_digest() {
  local t cols
  while read -r t cols; do
    printf '%s=%s\n' "$t" "$(psql "$PGBASE/$1" -At -c "SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) FROM (SELECT $cols FROM \"$t\") x")"
  done < "$2"
}
tree() { ps -o pid,ppid,pgid,sid,stat,args -s "$1" --forest 2>/dev/null | cut -c1-150; }

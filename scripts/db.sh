#!/usr/bin/env bash
# Local disposable PostgreSQL cluster for Table development and tests.
# Usage: scripts/db.sh start|stop|status|reset-test
# Data lives in .local/pgdata (git-ignored). Never used for production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$ROOT/.local/pgdata"
PORT="${TABLE_PGPORT:-54329}"
LOG="$ROOT/.local/postgres.log"
as_pg() {
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}
cmd="${1:-status}"
mkdir -p "$ROOT/.local"
if [ "$(id -u)" = "0" ]; then chown postgres "$ROOT/.local" 2>/dev/null || true; fi
case "$cmd" in
  start)
    if [ ! -f "$DATA/PG_VERSION" ]; then
      as_pg "$PGBIN/initdb" -D "$DATA" -U table --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
    fi
    if ! as_pg "$PGBIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
      as_pg "$PGBIN/pg_ctl" -D "$DATA" -l "$LOG" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -w start >/dev/null
    fi
    for db in table_dev table_test table_e2e table_restore_check; do
      "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U table -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
        || "$PGBIN/createdb" -h 127.0.0.1 -p "$PORT" -U table "$db"
    done
    echo "postgres running on 127.0.0.1:$PORT ($("$PGBIN/postgres" --version))"
    ;;
  stop) as_pg "$PGBIN/pg_ctl" -D "$DATA" -m fast stop ;;
  status) as_pg "$PGBIN/pg_ctl" -D "$DATA" status ;;
  *) echo "unknown command $cmd"; exit 2 ;;
esac

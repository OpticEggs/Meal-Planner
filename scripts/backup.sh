#!/usr/bin/env bash
# Backup/restore runbook (PostgreSQL custom-format dumps).
#   scripts/backup.sh dump    <DATABASE_URL> <file.dump>
#   scripts/backup.sh restore <EMPTY_TARGET_DATABASE_URL> <file.dump>
#   scripts/backup.sh check   <DATABASE_URL>      # dump -> restore into a scratch DB -> compare row counts
# Dumps contain household data AND auth tables (hashed passwords, sessions): store them like secrets.
set -euo pipefail
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
cmd="$1"; shift
case "$cmd" in
  dump) "$PGBIN/pg_dump" --format=custom --no-owner --file="$2" "$1" ;;
  restore) "$PGBIN/pg_restore" --no-owner --exit-on-error --dbname="$1" "$2" ;;
  check)
    SRC="$1"; BASE="${SRC%/*}"; SCRATCH="table_backup_check"; F=$(mktemp --suffix=.dump)
    "$PGBIN/psql" "$BASE/postgres" -qc "DROP DATABASE IF EXISTS $SCRATCH" -c "CREATE DATABASE $SCRATCH"
    "$PGBIN/pg_dump" --format=custom --no-owner --file="$F" "$SRC"
    "$PGBIN/pg_restore" --no-owner --exit-on-error --dbname="$BASE/$SCRATCH" "$F"
    count() { "$PGBIN/psql" "$1" -tAc "SELECT string_agg(tbl || '=' || n, ',' ORDER BY tbl) FROM (SELECT table_name AS tbl, (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM \"' || table_name || '\"', false, true, '')))[1]::text AS n FROM information_schema.tables WHERE table_schema='public') s"; }
    a=$(count "$SRC"); b=$(count "$BASE/$SCRATCH")
    rm -f "$F"
    if [ "$a" = "$b" ]; then echo "backup check PASS: every table's row count matches after restore"; else echo "backup check FAIL"; echo "src: $a"; echo "dst: $b"; exit 1; fi
    ;;
  *) echo "unknown command"; exit 2 ;;
esac

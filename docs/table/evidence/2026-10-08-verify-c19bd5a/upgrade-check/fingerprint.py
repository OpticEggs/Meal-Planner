# usage: python3 fingerprint.py <db name> <columns-005.txt>  -> prints "table|rows|md5" for each 005 table,
# using only the columns that existed at 005 (new columns added by later migrations are ignored).
import subprocess, sys
db, colsfile = sys.argv[1], sys.argv[2]
PSQL = ["/usr/lib/postgresql/16/bin/psql", "-h", "127.0.0.1", "-p", "54329", "-U", "table", "-d", db, "-tAX", "-c"]
for line in open(colsfile):
    line = line.strip()
    if not line: continue
    table, cols = line.split("|", 1)
    qcols = ",".join('"%s"' % c for c in cols.split(","))
    sql = f'SELECT count(*) || \'|\' || coalesce(md5(string_agg(r, E\'\\n\' ORDER BY r)), \'-\') FROM (SELECT ROW({qcols})::text AS r FROM "{table}") s'
    out = subprocess.run(PSQL + [sql], capture_output=True, text=True)
    print(f"{table}|{out.stdout.strip() or 'ERROR ' + out.stderr.strip()}")

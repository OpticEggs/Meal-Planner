# Per-table row count and md5 over the columns that existed BEFORE the migration (cols file), so new columns don't count.
import json, subprocess, sys
db, colsfile, mode = sys.argv[1], sys.argv[2], sys.argv[3]
q = lambda sql: subprocess.run(["psql","-h","127.0.0.1","-p","54329","-U","table","-d",db,"-Atc",sql],capture_output=True,text=True,check=True).stdout.strip()
if mode == "capture":
    rows = q("SELECT table_name||'|'||string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public') GROUP BY table_name ORDER BY 1").splitlines()
    json.dump({r.split('|')[0]: r.split('|')[1].split(',') for r in rows}, open(colsfile,'w'))
cols = json.load(open(colsfile))
for t, cs in sorted(cols.items()):
    sel = ",".join(f'"{c}"' for c in cs)
    print(t, q(f'SELECT count(*)||\'|\'||coalesce(md5(string_agg(x::text, \'\' ORDER BY x::text)),\'-\') FROM (SELECT ROW({sel}) AS x FROM "{t}") s'), sep="|")

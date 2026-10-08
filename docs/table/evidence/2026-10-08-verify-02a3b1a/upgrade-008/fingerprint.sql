-- Exact row count and content checksum per table, over the columns that existed at 005 only.
-- Run with psql -v cols_file... simpler: produce per-table "count|md5" using the column lists captured at 005.
SELECT table_name, string_agg(column_name, ',' ORDER BY ordinal_position) AS cols
FROM information_schema.columns WHERE table_schema='public' GROUP BY table_name ORDER BY table_name;

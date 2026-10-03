#!/usr/bin/env bash
# Dump schema + data + auth users + storage metadata from the OLD Supabase project.
# Usage: OLD_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' ./scripts/migrate/01-dump-old.sh
set -euo pipefail
: "${OLD_DB_URL:?set OLD_DB_URL to the old project's Postgres connection string}"
PG=/opt/homebrew/opt/libpq/bin
OUT=scripts/migrate/dump; mkdir -p "$OUT"

echo "→ roles (grants only)";   supabase db dump --db-url "$OLD_DB_URL" -f "$OUT/roles.sql"  --role-only
echo "→ schema";                supabase db dump --db-url "$OLD_DB_URL" -f "$OUT/schema.sql"
echo "→ public data";           supabase db dump --db-url "$OLD_DB_URL" -f "$OUT/data.sql"   --data-only --use-copy
echo "→ auth + storage data";   supabase db dump --db-url "$OLD_DB_URL" -f "$OUT/auth_storage.sql" --data-only --use-copy -s auth,storage
echo "→ row counts";            "$PG/psql" "$OLD_DB_URL" -Atc "
  select 'auth.users', count(*) from auth.users
  union all select 'storage.objects', count(*) from storage.objects
  union all select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int
  from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1" | tee "$OUT/counts.txt"
echo "done → $OUT"

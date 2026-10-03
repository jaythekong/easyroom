#!/usr/bin/env bash
# Restore the dump into the NEW Supabase project.
# Usage: NEW_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' ./scripts/migrate/02-restore-new.sh
set -euo pipefail
: "${NEW_DB_URL:?set NEW_DB_URL to the new project's Postgres connection string}"
PG=/opt/homebrew/opt/libpq/bin
IN=scripts/migrate/dump
for f in roles schema data auth_storage; do
  echo "→ $f.sql"
  "$PG/psql" "$NEW_DB_URL" --single-transaction --variable ON_ERROR_STOP=1 \
    --command 'SET session_replication_role = replica' -f "$IN/$f.sql"
done
echo "→ verify counts";  "$PG/psql" "$NEW_DB_URL" -Atc "
  select 'auth.users', count(*) from auth.users
  union all select 'storage.objects', count(*) from storage.objects
  union all select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int
  from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1" | diff - "$IN/counts.txt" && echo "✓ counts match"

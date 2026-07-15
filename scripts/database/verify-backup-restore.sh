#!/usr/bin/env bash
set -euo pipefail

project_id="$(sed -n 's/^project_id = "\([^"]*\)"/\1/p' supabase/config.toml)"
database_container="$(docker ps --filter "name=supabase_db_${project_id}" --format '{{.Names}}' | head -n 1)"

if [[ -z "${database_container}" ]]; then
  echo "Unable to find the isolated local Supabase database container." >&2
  exit 1
fi

probe_database="mac_recovery_probe"
container_files=(
  /tmp/mac-recovery-fixture.sql
  /tmp/mac-recovery-bootstrap.sql
  /tmp/mac-recovery-migration.sql
  /tmp/mac-recovery-verify.sql
  /tmp/mac-recovery-cleanup.sql
  /tmp/mac-p1-recovery.dump
)

cleanup() {
  set +e
  docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
    -f /tmp/mac-recovery-cleanup.sql >/dev/null 2>&1
  docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
    -c "drop database if exists ${probe_database} with (force);" >/dev/null 2>&1
  docker exec "${database_container}" rm -f "${container_files[@]}" >/dev/null 2>&1
}
trap cleanup EXIT

docker cp scripts/database/recovery-fixture.sql "${database_container}:/tmp/mac-recovery-fixture.sql"
docker cp scripts/database/recovery-bootstrap.sql "${database_container}:/tmp/mac-recovery-bootstrap.sql"
docker cp supabase/migrations/20260713213000_initial_platform.sql \
  "${database_container}:/tmp/mac-recovery-migration.sql"
docker cp scripts/database/recovery-verify.sql "${database_container}:/tmp/mac-recovery-verify.sql"
docker cp scripts/database/recovery-cleanup.sql "${database_container}:/tmp/mac-recovery-cleanup.sql"

docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -f /tmp/mac-recovery-fixture.sql

docker exec "${database_container}" pg_dump -U postgres -d postgres \
  --format=custom --data-only --no-owner --no-acl \
  --schema=public \
  --file=/tmp/mac-p1-recovery.dump
docker exec "${database_container}" test -s /tmp/mac-p1-recovery.dump
docker exec "${database_container}" pg_restore --list /tmp/mac-p1-recovery.dump >/dev/null

docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "drop database if exists ${probe_database} with (force);"
docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "create database ${probe_database} template template0;"
docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${probe_database}" \
  -f /tmp/mac-recovery-bootstrap.sql
docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${probe_database}" \
  -f /tmp/mac-recovery-migration.sql
docker exec "${database_container}" pg_restore -U postgres -d "${probe_database}" \
  --exit-on-error --data-only --disable-triggers --no-owner --no-acl \
  /tmp/mac-p1-recovery.dump
docker exec "${database_container}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${probe_database}" \
  -f /tmp/mac-recovery-verify.sql

echo "Backup/restore rehearsal passed in isolated database ${probe_database}."

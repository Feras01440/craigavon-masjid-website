#!/usr/bin/env bash
set -euo pipefail

start_log="$(mktemp)"
cleanup() {
  rm -f "${start_log}"
}
trap cleanup EXIT

if supabase start >"${start_log}" 2>&1; then
  echo 'Isolated local Supabase stack started; generated local credentials were suppressed.'
  exit 0
fi

echo '::error::The isolated local Supabase stack did not start.' >&2
echo 'Sanitized container diagnostics (name, image, and state only):' >&2
docker ps -a --filter 'name=supabase_' \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' >&2 || true
exit 1

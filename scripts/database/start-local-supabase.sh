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
echo 'Sanitized start output (credential-bearing lines removed):' >&2
grep -viE 'key|token|password|secret|jwt|anon|service_role|url' "${start_log}" | tail -n 40 >&2 || true
echo 'Sanitized container diagnostics (name, image, and state only):' >&2
docker ps -a --filter 'name=supabase_' \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' >&2 || true
exit 1

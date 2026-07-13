#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${LOCAL_DM_EMAIL:-}" ]]; then
  exit 0
fi

if [[ ! "$LOCAL_DM_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "LOCAL_DM_EMAIL must be a valid email address." >&2
  exit 1
fi

normalized_email="$(printf '%s' "$LOCAL_DM_EMAIL" | tr '[:upper:]' '[:lower:]')"

pnpm exec supabase db query --local "
  insert into public.allowed_users (normalized_email, role, active)
  values ('${normalized_email}', 'admin', true)
  on conflict (normalized_email) do update
  set role = 'admin', active = true, updated_at = now();
" >/dev/null

echo "Restored the local DM allowlist entry."

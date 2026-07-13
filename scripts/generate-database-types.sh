#!/usr/bin/env bash
set -euo pipefail

output="src/types/database.ts"
temporary_file="$(mktemp "${TMPDIR:-/tmp}/forgotten-oracle-database-types.XXXXXX")"
trap 'rm -f "$temporary_file"' EXIT

supabase gen types typescript --local \
  | prettier --parser typescript > "$temporary_file"

mv "$temporary_file" "$output"
trap - EXIT

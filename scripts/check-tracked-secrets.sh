#!/bin/bash
set -euo pipefail

# Scan tracked deployment/settings files for obvious secret markers.
# This intentionally skips example templates and documentation-like files.

PATTERN='mnemonic|seed[ _-]?phrase|private[ _-]?key|xprv|BEGIN[[:space:]]+[A-Z ]*PRIVATE KEY'

mapfile -t FILES < <(git ls-files \
  'settings/*.toml' \
  'settings/*.json' \
  'deployments/*.yaml' \
  'deployments/*.yml' \
  '.env' \
  '.env.*' \
  'Clarinet.toml' \
  | grep -Ev '\.example\.' || true)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "No tracked candidate files to scan."
  exit 0
fi

MATCHES=$(grep -nEi "$PATTERN" "${FILES[@]}" || true)

if [ -n "$MATCHES" ]; then
  echo "Potential secret markers found in tracked files:"
  echo "$MATCHES"
  echo ""
  echo "If this is expected test/demo data, move it to an untracked local file or an *.example.* template."
  exit 1
fi

echo "OK: no secret markers found in tracked config files."

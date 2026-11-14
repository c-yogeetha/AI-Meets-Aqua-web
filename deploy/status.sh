#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/deploy"
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); else echo 'Docker daemon is unavailable.' >&2; exit 1; fi
fi
"${DOCKER[@]}" compose --env-file .env -f docker-compose.prod.yml ps
printf '\nHealth: '
curl -fsS http://127.0.0.1/health || true
printf '\nSystem status:\n'
curl -fsS http://127.0.0.1/api/v1/system/status || true
printf '\nRecent logs:\n'
"${DOCKER[@]}" compose --env-file .env -f docker-compose.prod.yml logs --tail=50

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/deploy"
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); else echo 'Docker daemon is unavailable.' >&2; exit 1; fi
fi
"${DOCKER[@]}" compose --env-file .env -f docker-compose.prod.yml pull
"${DOCKER[@]}" compose --env-file .env -f docker-compose.prod.yml up -d --build --remove-orphans
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1/health >/dev/null; then echo 'Matsya update is healthy.'; exit 0; fi
  sleep 2
done
echo 'Matsya did not become healthy after update.' >&2
"${DOCKER[@]}" compose --env-file .env -f docker-compose.prod.yml logs --tail=100
exit 1

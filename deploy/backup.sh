#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); else echo 'Docker daemon is unavailable.' >&2; exit 1; fi
fi
COMPOSE_FILE="${MATSYA_COMPOSE_FILE:-$ROOT/deploy/docker-compose.prod.yml}"
COMPOSE=("${DOCKER[@]}" compose --env-file "$ROOT/deploy/.env" -f "$COMPOSE_FILE")
BACKEND_ID="$("${COMPOSE[@]}" ps -q backend)"
[ -n "$BACKEND_ID" ] || { echo 'Backend container is not running.' >&2; exit 1; }
IMAGE="$("${DOCKER[@]}" inspect --format '{{.Config.Image}}' "$BACKEND_ID")"
DEST="$ROOT/deploy/backups"
mkdir -p "$DEST"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="matsya-data-$STAMP.tar.gz"
"${DOCKER[@]}" run --rm --user 0 --volumes-from "$BACKEND_ID" -v "$DEST:/backup" --entrypoint /bin/sh "$IMAGE" -c "tar -czf '/backup/$NAME' -C /data ."
find "$DEST" -maxdepth 1 -type f -name 'matsya-data-*.tar.gz' -mtime +7 -delete
echo "$DEST/$NAME"

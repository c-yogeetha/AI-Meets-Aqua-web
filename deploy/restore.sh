#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="${1:?Usage: restore.sh BACKUP_TAR_GZ TARGET_DOCKER_VOLUME}"
TARGET_VOLUME="${2:?Usage: restore.sh BACKUP_TAR_GZ TARGET_DOCKER_VOLUME}"
[ -f "$BACKUP" ] || { echo "Backup file not found: $BACKUP" >&2; exit 1; }
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); else echo 'Docker daemon is unavailable.' >&2; exit 1; fi
fi
COMPOSE_FILE="${MATSYA_COMPOSE_FILE:-$ROOT/deploy/docker-compose.prod.yml}"
COMPOSE=("${DOCKER[@]}" compose --env-file "$ROOT/deploy/.env" -f "$COMPOSE_FILE")
BACKEND_ID="$("${COMPOSE[@]}" ps -q backend)"
[ -n "$BACKEND_ID" ] || { echo 'A running backend container is needed for the restore utility image.' >&2; exit 1; }
IMAGE="$("${DOCKER[@]}" inspect --format '{{.Config.Image}}' "$BACKEND_ID")"
"${DOCKER[@]}" volume inspect "$TARGET_VOLUME" >/dev/null 2>&1 || "${DOCKER[@]}" volume create "$TARGET_VOLUME" >/dev/null
BACKUP_DIR="$(cd "$(dirname "$BACKUP")" && pwd)"
BACKUP_NAME="$(basename "$BACKUP")"
"${DOCKER[@]}" run --rm --user 0 -v "$TARGET_VOLUME:/restore" -v "$BACKUP_DIR:/backup:ro" --entrypoint /bin/sh "$IMAGE" -c "tar -xzf '/backup/$BACKUP_NAME' -C /restore"
echo "Restored $BACKUP into Docker volume $TARGET_VOLUME"

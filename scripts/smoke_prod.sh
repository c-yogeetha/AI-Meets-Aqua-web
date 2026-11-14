#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${1:?Usage: smoke_prod.sh BASE_URL}"
VENV="${MATSYA_VENV:-$ROOT/.work/verify-venv}"
if [ ! -x "$VENV/bin/python" ]; then VENV="/tmp/matsya-baseline-venv"; fi
[ -x "$VENV/bin/python" ] || { echo 'Python verification venv not found.' >&2; exit 1; }

curl -fsS "$BASE_URL/health" >/dev/null
curl -fsS "$BASE_URL/api/docs" >/dev/null
if [ "${MATSYA_DOCKER_SMOKE:-0}" = "1" ]; then
  "$VENV/bin/python" "$ROOT/scripts/smoke_prod.py" "$BASE_URL" --restart-backend --repeat "${MATSYA_SMOKE_REPEAT:-5}"
else
  "$VENV/bin/python" "$ROOT/scripts/smoke_prod.py" "$BASE_URL" --repeat "${MATSYA_SMOKE_REPEAT:-1}"
fi

if [ "${MATSYA_DOCKER_SMOKE:-0}" = "1" ]; then
  echo 'Creating persistent-volume backup...'
  BACKUP_PATH="$("$ROOT/deploy/backup.sh")"
  [ -s "$BACKUP_PATH" ] || { echo 'Backup archive is empty.' >&2; exit 1; }
  DOCKER=(docker)
  if ! docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); fi
  SCRATCH_VOLUME="matsya-restore-smoke-$(date -u +%Y%m%d%H%M%S)"
  cleanup() { "${DOCKER[@]}" volume rm "$SCRATCH_VOLUME" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  "${DOCKER[@]}" volume create "$SCRATCH_VOLUME" >/dev/null
  "$ROOT/deploy/restore.sh" "$BACKUP_PATH" "$SCRATCH_VOLUME"
  COMPOSE_FILE="${MATSYA_COMPOSE_FILE:-$ROOT/deploy/docker-compose.prod.yml}"
  BACKEND_ID="$("${DOCKER[@]}" compose --env-file "$ROOT/deploy/.env" -f "$COMPOSE_FILE" ps -q backend)"
  [ -n "$BACKEND_ID" ] || { echo 'Backend container not found for restore verification.' >&2; exit 1; }
  IMAGE="$("${DOCKER[@]}" inspect --format '{{.Config.Image}}' "$BACKEND_ID")"
  [ -n "$IMAGE" ] || { echo 'Backend image not found for restore verification.' >&2; exit 1; }
  "${DOCKER[@]}" run --rm --user 0 -v "$SCRATCH_VOLUME:/data:ro" "$IMAGE" python -c 'import sqlite3; c=sqlite3.connect("/data/aqua.db"); n=c.execute("select count(*) from results").fetchone()[0]; print("restored_results=",n); assert n >= 1'
  echo 'Backup/restore smoke passed.'
  STATS="$("${DOCKER[@]}" stats --no-stream --format '{{.Name}} {{.MemPerc}}' | grep backend | head -1 || true)"
  echo "Container memory: $STATS"
  PERCENT="$(echo "$STATS" | awk '{gsub(/%/,"",$2); print $2}')"
  if [ -n "$PERCENT" ] && awk -v n="$PERCENT" 'BEGIN { exit !(n > 80) }'; then
    echo "Backend memory use exceeded 80% of its configured limit: $PERCENT%" >&2
    exit 1
  fi
  trap - EXIT
  cleanup
fi

echo 'Production-like API smoke passed.'

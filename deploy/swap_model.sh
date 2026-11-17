#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ $# -ne 2 ]]; then echo "Usage: $0 <goldfish.onnx> <goldfish.json>" >&2; exit 2; fi
ONNX_SOURCE="$(realpath "$1")"
JSON_SOURCE="$(realpath "$2")"
[[ -s "$ONNX_SOURCE" ]] || { echo "Missing ONNX file: $ONNX_SOURCE" >&2; exit 2; }
[[ -s "$JSON_SOURCE" ]] || { echo "Missing metadata file: $JSON_SOURCE" >&2; exit 2; }
python3 scripts/check_model_metadata.py "$JSON_SOURCE"
mkdir -p deploy/models
install -m 0644 "$ONNX_SOURCE" deploy/models/goldfish.onnx.new
install -m 0644 "$JSON_SOURCE" deploy/models/goldfish.json.new
mv -f deploy/models/goldfish.onnx.new deploy/models/goldfish.onnx
mv -f deploy/models/goldfish.json.new deploy/models/goldfish.json
COMPOSE_FILE=deploy/docker-compose.prod.yml
if docker info >/dev/null 2>&1; then
  docker compose --env-file deploy/.env -f "$COMPOSE_FILE" restart backend
  COMPOSE=(docker compose)
elif sudo -n docker info >/dev/null 2>&1; then
  sudo -n docker compose --env-file deploy/.env -f "$COMPOSE_FILE" restart backend
  COMPOSE=(sudo -n docker compose)
else
  echo "Docker is not accessible to this user." >&2; exit 1
fi
healthy=0
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" --env-file deploy/.env -f "$COMPOSE_FILE" exec -T backend python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=3)' >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
if [[ "$healthy" -ne 1 ]]; then
  echo "Backend did not become healthy after model swap." >&2
  "${COMPOSE[@]}" --env-file deploy/.env -f "$COMPOSE_FILE" logs --tail=30 backend >&2 || true
  exit 1
fi
"${COMPOSE[@]}" --env-file deploy/.env -f "$COMPOSE_FILE" exec -T backend python -c 'import json,urllib.request; s=json.load(urllib.request.urlopen("http://127.0.0.1:8000/api/v1/system/status",timeout=5)); print(json.dumps({"mode":s.get("mode"),"detectors":s.get("detectors"),"onnx_eligible":s.get("onnx_eligible"),"onnx_reason":s.get("onnx_reason")},indent=2)); raise SystemExit(0 if s.get("onnx_eligible") else 1)'

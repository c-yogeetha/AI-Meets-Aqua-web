#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Running Production-like Local Smoke Stack ==="

# Build standalone frontend
echo "Building Next.js standalone distribution..."
cd frontend
npm run build
# Copy static and public to standalone
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cd "$REPO_ROOT"

# Clean up any leftover ports
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true

# Start backend uvicorn on port 8000
echo "Starting FastAPI backend on 127.0.0.1:8000..."
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 &
BACKEND_PID=$!

# Start standalone Node server on port 3000
echo "Starting Next.js standalone server on 127.0.0.1:3000..."
PORT=3000 HOSTNAME=127.0.0.1 node frontend/.next/standalone/server.js &
FRONTEND_PID=$!

# Start reverse proxy on port 8080
if command -v caddy &>/dev/null; then
  echo "Starting Caddy on port 8080..."
  caddy run --config deploy/Caddyfile.local &
  PROXY_PID=$!
else
  echo "Starting local reverse proxy on port 8080..."
  backend/.venv/bin/python scripts/local_proxy.py &
  PROXY_PID=$!
fi

# Ensure cleanup on script exit
cleanup() {
  echo "Tearing down local production stack..."
  kill "$PROXY_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$PROXY_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  echo "Stack cleanly stopped."
}
trap cleanup EXIT

# Wait for health check on port 8080
echo "Waiting for services to become healthy on http://127.0.0.1:8080..."
for i in {1..30}; do
  if curl -sf http://127.0.0.1:8080/health >/dev/null && curl -sf http://127.0.0.1:8080/ >/dev/null; then
    echo "Services are ready!"
    break
  fi
  sleep 1
done

# Perform smoke verifications
echo "Testing /health through proxy..."
HEALTH_RESP=$(curl -s http://127.0.0.1:8080/health)
echo "Health Response: $HEALTH_RESP"

echo "Testing /api/v1/system/status through proxy..."
SYS_RESP=$(curl -s http://127.0.0.1:8080/api/v1/system/status)
echo "System Status: $(echo "$SYS_RESP" | head -n 3)"

echo "Testing /resources through proxy..."
RES_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/resources)
echo "Resources Page HTTP Code: $RES_CODE"
if [ "$RES_CODE" != "200" ]; then
  echo "ERROR: /resources returned $RES_CODE"
  exit 1
fi

echo "Testing /validation through proxy..."
VAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/validation)
echo "Validation Page HTTP Code: $VAL_CODE"
if [ "$VAL_CODE" != "200" ]; then
  echo "ERROR: /validation returned $VAL_CODE"
  exit 1
fi

# Run Playwright download and critical flows against proxy
echo "Running Playwright E2E smoke tests against http://127.0.0.1:8080..."
cd frontend
PROD_URL="http://127.0.0.1:8080" npx playwright test --project=prod e2e/download.spec.ts e2e/resources.spec.ts
cd "$REPO_ROOT"

echo "=== Production Local Smoke Stack Succeeded! ==="

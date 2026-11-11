#!/usr/bin/env bash
# AI Meets Aqua - Local Development Server Launcher
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================================="
echo " Starting AI Meets Aqua (Backend + Frontend)"
echo "=========================================================="

# Cleanup handler on exit or interrupt
cleanup() {
  echo ""
  echo "Shutting down AI Meets Aqua dev servers..."
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  echo "Servers stopped gracefully."
}

trap cleanup INT TERM EXIT

# Ensure Python virtual environment is ready
if [ ! -d "backend/.venv" ]; then
  echo "Backend virtualenv not found! Creating..."
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install --upgrade pip
  backend/.venv/bin/pip install -r backend/requirements.txt
fi

# Ensure frontend dependencies are ready
if [ ! -d "frontend/node_modules" ]; then
  echo "Frontend node_modules not found! Installing..."
  (cd frontend && npm install)
fi

# Launch Backend
echo "-> Starting Backend on http://127.0.0.1:8000..."
(
  cd backend
  source .venv/bin/activate
  export ANALYZER="${ANALYZER:-baseline}"
  uvicorn app.main:app --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

# Wait for backend health
echo -n "Waiting for backend health check"
for i in {1..30}; do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo " [READY]"
    break
  fi
  echo -n "."
  sleep 1
done

# Launch Frontend
echo "-> Starting Frontend on http://127.0.0.1:3000..."
(
  cd frontend
  npm run dev -- -p 3000 -H 127.0.0.1
) &
FRONTEND_PID=$!

# Wait for frontend
echo -n "Waiting for frontend server"
for i in {1..45}; do
  if curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then
    echo " [READY]"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "=========================================================="
echo " AI Meets Aqua is LIVE:"
echo "   Frontend Web UI:   http://localhost:3000"
echo "   Backend REST API:  http://localhost:8000"
echo "   OpenAPI Docs:      http://localhost:8000/docs"
echo "   Press Ctrl+C to stop both servers."
echo "=========================================================="

wait

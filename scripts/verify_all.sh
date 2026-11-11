#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p docs test-results frontend/public

PYTHON="$ROOT/backend/.venv/bin/python"
PYTEST="$ROOT/backend/.venv/bin/pytest"
RUFF="$ROOT/backend/.venv/bin/ruff"

echo "=========================================================="
echo "AI Meets Aqua - Automated Comprehensive Verification Suite"
echo "=========================================================="

echo "== 1. Checking / Generating Sample Benchmark Videos =="
"$PYTHON" scripts/make_sample_videos.py
SAMPLE_STATUS=$?
if [ $SAMPLE_STATUS -ne 0 ]; then
  echo "Error: Failed to generate sample videos."
  exit 1
fi

echo ""
echo "== 2. Running Backend Tests & Coverage =="
(
  cd backend && \
  "$PYTEST" -q \
    --junitxml=../test-results/backend.xml \
    --cov=app \
    --cov-report=xml:../test-results/coverage.xml \
    --cov-report=term-missing && \
  "$RUFF" check .
)
BACK_STATUS=$?

echo ""
echo "== 3. Running Frontend Static Checks (Types, Lint, Build) =="
(
  cd frontend && \
  npx tsc --noEmit && \
  npm run lint && \
  npm run build
)
FRONT_STATUS=$?

echo ""
echo "== 4. Running Playwright End-to-End Verification =="
(
  cd frontend && \
  npx playwright test
)
E2E_STATUS=$?

echo ""
echo "== 5. Aggregating Test Reports & Metrics =="
"$PYTHON" scripts/build_test_report.py
REPORT_STATUS=$?

echo ""
echo "=========================================================="
echo "Verification Summary:"
echo "  Backend & Coverage: $([ $BACK_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Frontend Static:    $([ $FRONT_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Playwright E2E:     $([ $E2E_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Report Generator:   $([ $REPORT_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "=========================================================="

if [ $BACK_STATUS -eq 0 ] && [ $FRONT_STATUS -eq 0 ] && [ $E2E_STATUS -eq 0 ] && [ $REPORT_STATUS -eq 0 ]; then
  echo "✅ All verification stages PASSED successfully."
  exit 0
else
  echo "❌ One or more verification stages FAILED."
  exit 1
fi

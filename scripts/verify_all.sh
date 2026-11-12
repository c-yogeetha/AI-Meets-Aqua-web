#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p docs test-results frontend/public frontend/public/data

PYTHON="$ROOT/backend/.venv/bin/python"
PYTEST="$ROOT/backend/.venv/bin/pytest"
RUFF="$ROOT/backend/.venv/bin/ruff"

echo "=========================================================="
echo "Matsya - Automated Comprehensive Verification Suite"
echo "=========================================================="

echo ""
echo "== 1. Running Footprint Scanner =="
./scripts/scan_footprints.sh
FOOT_STATUS=$?
if [ $FOOT_STATUS -ne 0 ]; then
  echo "FAIL: Footprint scan failed."
  exit 1
fi

echo ""
echo "== 2. Running Claims & Tone Audit =="
./scripts/claims_audit.sh
CLAIM_STATUS=$?
if [ $CLAIM_STATUS -ne 0 ]; then
  echo "FAIL: Claims audit failed."
  exit 1
fi

echo ""
echo "== 3. Checking / Generating Sample Benchmark Videos =="
"$PYTHON" scripts/make_sample_videos.py
SAMPLE_STATUS=$?
if [ $SAMPLE_STATUS -ne 0 ]; then
  echo "FAIL: Failed to generate sample videos."
  exit 1
fi

echo ""
echo "== 4. Running Backend Tests & Coverage =="
(
  "$PYTEST" backend/tests \
    --junitxml=test-results/backend.xml \
    --cov=app \
    --cov-report=xml:test-results/coverage.xml \
    --cov-report=term-missing && \
  "$RUFF" check backend
)
BACK_STATUS=$?
if [ $BACK_STATUS -ne 0 ]; then
  echo "FAIL: Backend tests or coverage failed."
  exit 1
fi

echo ""
echo "== 5. Checking OpenAPI Contract & TypeScript Types =="
"$PYTHON" scripts/export_openapi.py
"$PYTEST" backend/tests/test_contract.py
CONTRACT_STATUS=$?
if [ $CONTRACT_STATUS -ne 0 ]; then
  echo "FAIL: OpenAPI contract drift detected."
  exit 1
fi

echo ""
echo "== 6. Running Frontend Static Checks (Types, Lint, Build) =="
(
  cd frontend && \
  npx tsc --noEmit && \
  npm run lint && \
  npm run build
)
FRONT_STATUS=$?
if [ $FRONT_STATUS -ne 0 ]; then
  echo "FAIL: Frontend static analysis or build failed."
  exit 1
fi

echo ""
echo "== 7. Running Playwright End-to-End Verification =="
fuser -k 8000/tcp 3000/tcp 2>/dev/null || true
(
  cd frontend && \
  npx playwright test --project=chromium
)
fuser -k 8000/tcp 3000/tcp 2>/dev/null || true
E2E_STATUS=$?
if [ $E2E_STATUS -ne 0 ]; then
  echo "FAIL: Playwright E2E tests failed."
  exit 1
fi

echo ""
echo "== 8. Running Detection Benchmark =="
"$PYTHON" scripts/run_benchmark.py
BENCH_STATUS=$?

echo ""
echo "== 9. Running Production-like Local Smoke Stack =="
./scripts/prod_local.sh
SMOKE_STATUS=$?
if [ $SMOKE_STATUS -ne 0 ]; then
  echo "FAIL: Production local smoke stack failed."
  exit 1
fi

echo ""
echo "== 10. Aggregating Test Reports & Metrics =="
"$PYTHON" scripts/build_test_report.py
REPORT_STATUS=$?

echo ""
echo "=========================================================="
echo "Verification Summary:"
echo "  Footprints & Claims: PASS"
echo "  Sample Generator:    PASS"
echo "  Backend & Coverage:  $([ $BACK_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  OpenAPI Contract:    $([ $CONTRACT_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Frontend Static:     $([ $FRONT_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Playwright E2E:      $([ $E2E_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Benchmark Engine:    $([ $BENCH_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Production Smoke:    $([ $SMOKE_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "  Report Generator:    $([ $REPORT_STATUS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "=========================================================="

if [ $BACK_STATUS -eq 0 ] && [ $FRONT_STATUS -eq 0 ] && [ $E2E_STATUS -eq 0 ] && [ $SMOKE_STATUS -eq 0 ] && [ $REPORT_STATUS -eq 0 ]; then
  echo "All verification stages PASSED successfully."
  exit 0
else
  echo "One or more verification stages FAILED."
  exit 1
fi

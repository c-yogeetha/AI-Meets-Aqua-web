#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p .work test-results docs frontend/public/data

echo "=========================================================="
echo "Matsya - Comprehensive Verification Suite"
echo "=========================================================="

# One isolated, repeatable Python environment for every verification step.
VENV="${MATSYA_VENV:-$ROOT/.work/verify-venv}"
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip
  "$VENV/bin/pip" install -r backend/requirements-dev.txt
fi
PYTHON="$VENV/bin/python"
PYTEST="$VENV/bin/pytest"
RUFF="$VENV/bin/ruff"
export PYTHON PYTEST RUFF MATSYA_VENV="$VENV"

echo "Python environment: $VENV"
"$PYTHON" --version
node --version
npm --version

echo
echo "== 1. Footprint scan and self-tests =="
./scripts/scan_footprints.sh

echo
echo "== 2. Claims and licence disclosures audit =="
PYTHON="$PYTHON" ./scripts/claims_audit.sh

echo
echo "== 3. Synthetic sample generation and manifest =="
"$PYTHON" scripts/make_sample_videos.py

echo
echo "== 4. Backend tests, coverage and Ruff =="
(
  cd backend
  "$PYTEST" tests \
    --junitxml=../test-results/backend.xml \
    --cov=app \
    --cov-report=xml:../test-results/coverage.xml \
    --cov-report=term-missing
)
"$RUFF" check backend

echo
echo "== 5. OpenAPI, generated types and report guard =="
"$PYTHON" scripts/export_openapi.py
"$PYTHON" scripts/build_test_report.py
(
  cd backend
  "$PYTEST" tests/test_contract.py
)
"$PYTHON" - <<'PY'
import json
import xml.etree.ElementTree as ET
from pathlib import Path
junit = ET.parse("test-results/backend.xml").getroot()
cases = list(junit.iter("testcase"))
failed = sum(1 for case in cases if case.find("failure") is not None or case.find("error") is not None)
skipped = sum(1 for case in cases if case.find("skipped") is not None)
summary = json.loads(Path("frontend/public/data/test-results.json").read_text())["summary"]
assert summary["backend_total"] == len(cases)
assert summary["backend_passed"] == len(cases) - failed - skipped
assert summary["backend_failed"] == failed
assert summary["backend_skipped"] == skipped
print("Published backend report matches the JUnit run:", len(cases), "cases")
PY

echo
echo "== 6. Frontend clean install, TypeScript, lint, build and licence audit =="
(
  cd frontend
  npm ci
  npx tsc --noEmit
  npm run lint
  npm run build
  npx --yes license-checker@25.0.1 --json --out ../.work/npm-licenses.json
)
"$PYTHON" -m piplicenses --format=json --output-file .work/python-licenses.json
"$PYTHON" scripts/audit_licenses.py

echo
echo "== 7. Chromium and Firefox E2E suites =="
(
  cd frontend
  npx playwright test --project=chromium
  PLAYWRIGHT_JSON_REPORT="../test-results/e2e-firefox.json" npx playwright test --project=firefox
)
"$PYTHON" scripts/build_test_report.py
cp -a frontend/public/. frontend/.next/standalone/public/

echo
echo "== 8. Bounded benchmark and contact sheet =="
"$PYTHON" scripts/run_benchmark.py --real-dir samples_real --max-seconds 30

echo
echo "== 9. Local reverse-proxy and security-header smoke =="
"$PYTHON" scripts/verify_local_proxy.py

echo
echo "== 10. Production-like Caddy proxy and browser download smoke =="
./scripts/prod_local.sh

echo
echo "== 11. Docker Compose config validation =="
if [ ! -f deploy/.env ]; then
  cp deploy/.env.example deploy/.env
fi
RUNTIME_COMPOSE_FILE="${MATSYA_RUNTIME_COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
sudo -n docker compose --env-file deploy/.env -f "$RUNTIME_COMPOSE_FILE" config >/tmp/matsya-compose-config.yml

echo
echo "== 12. Container build, live smoke and backup/restore verification =="
BUILD_HTTP_PROXY="${http_proxy:-${HTTP_PROXY:-}}"
BUILD_HTTPS_PROXY="${https_proxy:-${HTTPS_PROXY:-}}"
BUILD_NO_PROXY="${no_proxy:-${NO_PROXY:-}}"
sudo -n env DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 \
  http_proxy="$BUILD_HTTP_PROXY" https_proxy="$BUILD_HTTPS_PROXY" no_proxy="$BUILD_NO_PROXY" \
  docker compose --env-file deploy/.env -f "$RUNTIME_COMPOSE_FILE" build
sudo -n docker compose --env-file deploy/.env -f "$RUNTIME_COMPOSE_FILE" up -d
cleanup_compose() {
  sudo -n docker compose --env-file deploy/.env -f "$RUNTIME_COMPOSE_FILE" down --volumes --remove-orphans || true
}
trap cleanup_compose EXIT
MATSYA_COMPOSE_FILE="$RUNTIME_COMPOSE_FILE" MATSYA_DOCKER_SMOKE=1 MATSYA_SMOKE_REPEAT=5 ./scripts/smoke_prod.sh http://127.0.0.1
"$PYTHON" scripts/soak_prod.py http://127.0.0.1 --visitors 2 --uploads-per-visitor 10 --timeout 300 > .work/soak-20.json
"$PYTHON" - <<'PY'
import json
from pathlib import Path
soak = json.loads(Path(".work/soak-20.json").read_text())
assert soak["passed"] and soak["uploads_completed"] == 20 and soak["failed_jobs"] == 0
print("Two-visitor soak:", soak["uploads_completed"], "completed in", soak["duration_seconds"], "seconds")
PY

echo
echo "== 13. Final report and dependency audit =="
"$PYTHON" scripts/build_test_report.py
(
  cd frontend
  npm audit --json > ../test-results/npm-audit-final.json || true
)
"$PYTHON" - <<'PY'
import json
from pathlib import Path
audit = json.loads(Path("test-results/npm-audit-final.json").read_text())
print("npm audit:", audit.get("metadata", {}).get("vulnerabilities", {}))
PY

echo
echo "=========================================================="
echo "Verification completed successfully."
echo "See docs/TEST_REPORT.md, docs/BENCHMARK.md and test-results/."
echo "=========================================================="

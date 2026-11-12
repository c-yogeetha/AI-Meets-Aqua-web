#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Running Footprint Scanner ==="

# 1. Check for forbidden directories and files
FORBIDDEN_DIRS=(".claude" ".cursor" ".antigravity" ".copilot" ".openai" ".gemini")
for d in "${FORBIDDEN_DIRS[@]}"; do
  if [ -d "$d" ] || [ -f "$d" ]; then
    echo "ERROR: Forbidden metadata directory or file found: $d"
    exit 1
  fi
done

# 2. Case-insensitive grep over tracked-candidate files
EXCLUDES=(
  "--exclude-dir=node_modules"
  "--exclude-dir=.venv"
  "--exclude-dir=.next"
  "--exclude-dir=.git"
  "--exclude-dir=.work"
  "--exclude-dir=.uv_python"
  "--exclude-dir=samples_real"
  "--exclude-dir=resources_inbox"
  "--exclude-dir=test-results"
  "--exclude-dir=docs/screens"
  "--exclude-dir=.pytest_cache"
  "--exclude-dir=.ruff_cache"
  "--exclude-dir=bin"
  "--exclude=*.lock"
  "--exclude=package-lock.json"
  "--exclude=uv.lock"
  "--exclude=*.png"
  "--exclude=*.jpg"
  "--exclude=*.jpeg"
  "--exclude=*.mp4"
  "--exclude=*.webm"
  "--exclude=*.pdf"
  "--exclude=*.pyc"
  "--exclude=*.onnx"
  "--exclude=tsconfig.tsbuildinfo"
  "--exclude=scan_footprints.sh"
  "--exclude=footprint_allow.txt"
)

BANNED_REGEX="claude|anthropic|gemini|antigravity|chatgpt|openai|copilot|codex|as an ai|language model|llm|ai-generated|co-authored"

MATCHES=$(grep -rnEi "$BANNED_REGEX" "${EXCLUDES[@]}" . || true)

if [ -n "$MATCHES" ]; then
  echo "ERROR: Forbidden AI tool or vendor footprints detected:"
  echo "$MATCHES"
  exit 1
fi

echo "Footprint scan passed: No forbidden footprints found."
exit 0

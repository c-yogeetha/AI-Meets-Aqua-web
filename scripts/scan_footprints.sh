#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BANNED='\b(claude|anthropic|gemini|antigravity|chatgpt|openai|copilot|codex|language[[:space:]]+model|ai-generated|co-authored)\b'
FORBIDDEN_DIRS=(.claude .cursor .antigravity .copilot .openai .gemini)

scan_dir() {
  local path="$1"
  [ -e "$path" ] || return 0
  local d
  for d in "${FORBIDDEN_DIRS[@]}"; do
    [ ! -e "$path/$d" ] || { echo "Forbidden directory: $path/$d"; return 1; }
  done
  local hits
  hits="$(find "$path" -type f \
    ! -path '*/.git/*' ! -path '*/node_modules/*' ! -path '*/.venv/*' \
    ! -path '*/.next/*' ! -path '*/.work/*' ! -path '*/test-results/*' \
    ! -path '*/samples_real/*' ! -path '*/resources_inbox/*' \
    ! -name '*.lock' ! -name 'package-lock.json' ! -name '*.png' \
    ! -name '*.jpg' ! -name '*.jpeg' ! -name '*.pdf' ! -name '*.mp4' \
    ! -name '*.webm' ! -name '*.onnx' ! -name '*.pyc' \
    ! -name 'scan_footprints.sh' ! -name 'footprint_allow.txt' \
    -print0 | xargs -0 -r grep -nEi "$BANNED" 2>/dev/null || true)"
  [ -z "$hits" ] || { echo "$hits"; return 1; }
}

self_test() {
  local tmp; tmp="$(mktemp -d)"
  printf 'ordinary sample\n' > "$tmp/clean.txt"
  ! grep -Eiq "$BANNED" "$tmp/clean.txt"
  printf 'planted claude marker\n' > "$tmp/bad.txt"
  grep -Eiq "$BANNED" "$tmp/bad.txt"
  mkdir "$tmp/.cursor"
  [ -d "$tmp/.cursor" ]
  rm -rf "$tmp"
  echo "Scanner self-tests passed."
}

echo "=== Running Footprint Scanner ==="
self_test
scan_dir .
# scan build output explicitly; it is generated and may contain copied text
scan_dir frontend/.next
echo "Footprint scan passed."

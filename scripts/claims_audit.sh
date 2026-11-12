#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Running Claims & Tone Audit ==="

# 1. Check for unbacked marketing and authority claims
BANNED_CLAIMS="veterinar|peer-reviewed|Martins|Huntingford|publication-ready|zero[ -]?flak|bio-?telemetry|capstone|revolutionary|cutting-edge|seamless|state-of-the-art|world-class"

CLAIM_MATCHES=$(grep -rnEi "$BANNED_CLAIMS" README.md docs frontend/src || true)

if [ -n "$CLAIM_MATCHES" ]; then
  echo "ERROR: Unbacked claims detected in documentation or frontend source:"
  echo "$CLAIM_MATCHES"
  exit 1
fi
echo "Claims audit passed: No unbacked claims found."

# 2. Check for emoji codepoints across README, docs, frontend/src, backend/app
echo "Checking for forbidden emoji characters..."
backend/.venv/bin/python -c '
import os, sys, re

emoji_pattern = re.compile(
    "[\U00010000-\U0010ffff]|"
    "[\u2600-\u26ff]|"
    "[\u2700-\u27bf]|"
    "[\u2300-\u23ff]|"
    "[\u2b50-\u2b55]"
)

dirs = ["README.md", "docs", "frontend/src", "backend/app"]
violations = []

for item in dirs:
    if os.path.isfile(item):
        files = [item]
    else:
        files = []
        for root, _, filenames in os.walk(item):
            for f in filenames:
                if f.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".yaml", ".yml", ".css")):
                    files.append(os.path.join(root, f))
    for fpath in files:
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            for idx, line in enumerate(f, 1):
                if emoji_pattern.search(line):
                    violations.append(f"{fpath}:{idx}: {line.strip()}")

if violations:
    print(f"ERROR: {len(violations)} emoji characters found:")
    for v in violations[:10]:
        print("  ", v)
    sys.exit(1)
'
echo "Emoji audit passed: Zero emojis found."

# 3. Check consistency of test metrics between README and docs/TEST_REPORT.md
echo "Checking README and TEST_REPORT metric consistency..."
backend/.venv/bin/python -c '
import re, sys

report_file = "docs/TEST_REPORT.md"
readme_file = "README.md"

try:
    with open(report_file, "r", encoding="utf-8") as f:
        rep = f.read()
    with open(readme_file, "r", encoding="utf-8") as f:
        readme = f.read()
except Exception as e:
    print(f"Skipping report match check: {e}")
    sys.exit(0)

# Check total passing test count
tot_m = re.search(r"\*\*Total Tests\*\*\s*\|\s*(\d+)", rep)
if tot_m:
    rep_tot = tot_m.group(1)
    # Ensure README references passing test count
    if rep_tot not in readme and f"{rep_tot}+" not in readme:
        print(f"Notice: README does not yet reflect latest test report count ({rep_tot})")
'
echo "Claims and Tone Audit completed successfully."
exit 0

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "=== Running Claims & Tone Audit ==="
BANNED="peer-reviewed|publication-ready|zero[ -]?flak|bio-?telemetry|revolutionary|cutting-edge|seamless|state-of-the-art|world-class"
MATCHES="$(grep -rnEi "$BANNED" README.md docs frontend/src 2>/dev/null || true)"
if [ -n "$MATCHES" ]; then
  echo "ERROR: Unsupported promotional language found:"
  echo "$MATCHES"
  exit 1
fi
# Explicitly documented non-claims are permitted; affirmative diagnostic claims are not.
MATCHES="$(grep -rnEi 'veterinar|clinically|clinical' README.md docs frontend/src 2>/dev/null | grep -Eiv 'not clinically validated|not a veterinary diagnosis|not be used as a veterinary diagnosis|clinical validation is not available|clinical sample|no clinical validation|not a clinical|not clinical|does not replace professional aquatic clinical diagnostics|does not replace professional clinical care|is this a clinical medical diagnosis|not a clinical pathology diagnosis|not a clinical laboratory diagnosis|clinical signs manifest|clinical pathology diagnosis|not undergone multi-center clinical validation|decision-support tool, not a clinical|not a clinical diagnosis|is this considered a clinical medical diagnosis' || true)"
if [ -n "$MATCHES" ]; then
  echo "ERROR: Clinical/veterinary assertion needs review:"
  echo "$MATCHES"
  exit 1
fi
echo "Claims audit passed: unsupported positive clinical claims not found."
echo "Checking for forbidden emoji codepoints..."
"${PYTHON:-python3}" - <<'PYCODE'
import os, re, sys
pat = re.compile("[\U00010000-\U0010ffff]|[\u2600-\u26ff]|[\u2700-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]")
violations=[]
for item in ("README.md", "docs", "frontend/src", "backend/app"):
    files=[item] if os.path.isfile(item) else []
    if os.path.isdir(item):
        for root, _, names in os.walk(item):
            files.extend(os.path.join(root,n) for n in names if n.endswith((".py",".ts",".tsx",".js",".jsx",".md",".json",".yaml",".yml",".css")))
    for path in files:
        with open(path,encoding="utf-8",errors="ignore") as f:
            for number,line in enumerate(f,1):
                if pat.search(line): violations.append(f"{path}:{number}:{line.rstrip()}")
if violations:
    print("\n".join(violations[:20]))
    sys.exit(1)
PYCODE
echo "Claims and tone audit passed."

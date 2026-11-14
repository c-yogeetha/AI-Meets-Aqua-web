#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE="${RELEASE_DATE:-$(date -u +%Y%m%d)}"
DIST="$ROOT/dist"
NAME="matsya-release-${DATE}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/matsya-release.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$DIST" "$STAGE/$NAME"

# Only include runtime source, deploy configuration, documentation and public assets.
# Private environment files, working notes, datasets and generated local state are never staged.
INCLUDE=(backend frontend scripts deploy docs README.md CREDITS.md LICENSE)
for item in "${INCLUDE[@]}"; do
  [ -e "$item" ] || continue
  cp -a "$item" "$STAGE/$NAME/"
done

# Strip generated/development content even when nested inside an included directory.
find "$STAGE/$NAME" -type d \( \
  -name .git -o -name .work -o -name node_modules -o -name .next -o \
  -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache -o \
  -name .venv -o -name venv -o -name samples_real -o -name resources_inbox -o \
  -name test-results -o -name backups \
\) -prune -exec rm -rf {} +
find "$STAGE/$NAME" -type f \( \
  -name '.env' -o -name '.env.*' ! -name '.env.example' -o \
  -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o \
  -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' -o \
  -name '*.pyc' -o -name 'tsconfig.tsbuildinfo' \
\) -delete

# Owner-supplied model weights may be included only when present; no placeholder model is created.
mkdir -p "$STAGE/$NAME/backend/models"

ARCHIVE="$DIST/${NAME}.tar.gz"
tar -C "$STAGE" -czf "$ARCHIVE" "$NAME"

# Audit archive paths and high-risk content before publishing the result.
LIST="$(tar -tzf "$ARCHIVE")"
FORBIDDEN=0
while IFS= read -r path; do
  case "$path" in
    */.git/*|*/.work/*|*/node_modules/*|*/.next/*|*/.venv/*|*/venv/*|*/samples_real/*|*/resources_inbox/*|*/test-results/*|*/backups/*|*/.env|*/.env.[!.e]*|*.pem|*.key|*.p12|*.pfx|*.db|*.sqlite|*.sqlite3|*.pyc|*tsconfig.tsbuildinfo)
      [[ "$path" == */.env.example ]] || { echo "Forbidden archive entry: $path" >&2; FORBIDDEN=1; }
      ;;
  esac
done <<<"$LIST"
if [ "$FORBIDDEN" -ne 0 ]; then
  echo 'Release archive contains a forbidden path or file.' >&2
  exit 1
fi
if tar -xOzf "$ARCHIVE" --wildcards '*/deploy/.env' >/dev/null 2>&1; then
  echo 'Release archive unexpectedly contains deploy/.env.' >&2
  exit 1
fi
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
echo "Created: $ARCHIVE"
echo "SHA256: $(cut -d' ' -f1 "$ARCHIVE.sha256")"
echo "Files: $(tar -tzf "$ARCHIVE" | wc -l)"

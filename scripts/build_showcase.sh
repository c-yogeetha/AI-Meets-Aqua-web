#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
DIST="$ROOT/dist/showcase"
INDEXABLE="${NEXT_PUBLIC_INDEXABLE:-0}"
LIVE_URL="${NEXT_PUBLIC_LIVE_APP_URL:-}"

if [[ "$INDEXABLE" != "0" && "$INDEXABLE" != "1" ]]; then
  echo "NEXT_PUBLIC_INDEXABLE must be 0 or 1" >&2; exit 2
fi
if [[ -n "$LIVE_URL" && ! "$LIVE_URL" =~ ^https:// ]]; then
  echo "NEXT_PUBLIC_LIVE_APP_URL must be an https URL" >&2; exit 2
fi

cd "$ROOT"
python3 scripts/build_showcase_index.py
install -m 0644 docs/openapi.json "$FRONTEND/public/openapi.json"
rm -rf "$FRONTEND/out" "$DIST"
mkdir -p "$DIST"

# Next.js segment config must be a literal at build time. Temporarily set
# dynamicParams=false for the static export only; always restore live routes.
TMP_ROUTES="$(mktemp -d)"
ROUTES=(
  "src/app/app/results/[id]/page.tsx"
  "src/app/app/jobs/[id]/page.tsx"
  "src/app/app/tanks/[id]/page.tsx"
)
restore_routes() {
  for route in "${ROUTES[@]}"; do
    if [[ -f "$TMP_ROUTES/$route" ]]; then cp "$TMP_ROUTES/$route" "$FRONTEND/$route"; fi
  done
  rm -rf "$TMP_ROUTES"
}
for route in "${ROUTES[@]}"; do
  mkdir -p "$TMP_ROUTES/$(dirname "$route")"
  cp "$FRONTEND/$route" "$TMP_ROUTES/$route"
  sed -i 's/export const dynamicParams = true;/export const dynamicParams = false;/' "$FRONTEND/$route"
done
trap restore_routes EXIT

cd "$FRONTEND"
NEXT_PUBLIC_SHOWCASE=1 \
NEXT_PUBLIC_INDEXABLE="$INDEXABLE" \
NEXT_PUBLIC_LIVE_APP_URL="$LIVE_URL" \
npm run build

if [[ ! -d "$FRONTEND/out" ]]; then
  echo "Next static export did not create frontend/out" >&2; exit 1
fi
cp -a "$FRONTEND/out/." "$DIST/"

# Verify the export is self-contained and contains no server-only proxy configuration.
python3 "$ROOT/scripts/test_showcase_static.py" "$DIST"
printf 'Showcase export: %s\n' "$DIST"
printf 'Files: '; find "$DIST" -type f | wc -l

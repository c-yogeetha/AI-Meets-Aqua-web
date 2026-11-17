#!/usr/bin/env python3
"""Static-export invariants: required routes, static media, index and robots policy."""
from __future__ import annotations
import json, sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
required = ["index.html", "about/index.html", "how-it-works/index.html", "resources/index.html", "science/index.html", "validation/index.html", "app/index.html", "robots.txt", "openapi.json", "showcase/index.json"]
missing = [name for name in required if not (root / name).is_file()]
if missing:
    raise SystemExit("Missing static showcase files: " + ", ".join(missing))
items = json.loads((root / "showcase/index.json").read_text(encoding="utf-8"))
for item in items:
    for key in ("videoUrl", "pdfUrl"):
        url = item.get(key)
        if not url or not (root / url.lstrip("/")).is_file():
            raise SystemExit(f"Featured item missing bundled {key}: {item.get('id')}")
    if item.get("kind") == "synthetic" and "synthetic" not in item.get("badge", "").lower():
        raise SystemExit(f"Synthetic item is not labelled: {item.get('id')}")
    if item.get("kind") == "open_licence" and "open-licence clip" not in item.get("badge", "").lower():
        raise SystemExit(f"Open-licence item is not labelled: {item.get('id')}")
print(f"Static showcase filesystem checks passed ({len(items)} featured analyses).")

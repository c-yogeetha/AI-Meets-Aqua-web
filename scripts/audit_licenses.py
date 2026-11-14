#!/usr/bin/env python3
"""Validate npm and Python dependency licence inventories against project policy."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DENIED = re.compile(
    r"\b(?:AGPL|GPL|SSPL|BUSL|UNLICENSED|UNKNOWN|PROPRIETARY|NOASSERTION|COMMERCIAL)\b",
    re.IGNORECASE,
)
WEAK_COPYLEFT = re.compile(r"\b(?:MPL|LGPL|EPL|CDDL)\b", re.IGNORECASE)


def read_json(path: Path) -> Any:
    if not path.is_file():
        raise FileNotFoundError(f"Licence inventory is missing: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--npm", type=Path, default=ROOT / ".work/npm-licenses.json")
    parser.add_argument("--python", type=Path, default=ROOT / ".work/python-licenses.json")
    args = parser.parse_args()

    npm = read_json(args.npm)
    python_packages = read_json(args.python)
    package = read_json(ROOT / "frontend/package.json")
    own_id = f"{package['name']}@{package['version']}"
    own_license = str(package.get("license", ""))
    if own_license != "MIT":
        raise SystemExit(f"Frontend workspace licence must be declared MIT, got {own_license!r}")

    # license-checker reports private workspace roots as UNLICENSED regardless of
    # their declared SPDX field. Verify the local workspace field above, then omit
    # that one root package from the external dependency inventory.
    npm_external = {name: data for name, data in npm.items() if name != own_id}
    failures: list[str] = []
    weak: list[str] = []

    for name, data in sorted(npm_external.items()):
        licence = str(data.get("licenses") or "").strip()
        if not licence or DENIED.search(licence):
            failures.append(f"npm {name}: {licence or 'missing licence'}")
        elif WEAK_COPYLEFT.search(licence):
            weak.append(f"npm {name}: {licence}")

    for data in sorted(python_packages, key=lambda row: str(row.get("Name", ""))):
        name = str(data.get("Name") or "<unnamed>")
        licence = str(data.get("License") or "").strip()
        if not licence or DENIED.search(licence):
            failures.append(f"Python {name}: {licence or 'missing licence'}")
        elif WEAK_COPYLEFT.search(licence):
            weak.append(f"Python {name}: {licence}")

    print(f"Frontend workspace: {own_id} — {own_license}")
    print(f"External npm packages inspected: {len(npm_external)}")
    print(f"Python distributions inspected: {len(python_packages)}")
    print(f"Weak-copyleft packages to retain upstream notices for: {len(weak)}")
    for item in weak:
        print(f"  NOTICE: {item}")
    if failures:
        print(f"Licence policy failures: {len(failures)}")
        for item in failures:
            print(f"  FAIL: {item}")
        return 1
    print("Licence audit passed: no unknown, unlicensed or prohibited dependency entries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

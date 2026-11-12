#!/usr/bin/env python3
"""Export FastAPI OpenAPI schema, generate TypeScript types, and update API documentation."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
DOCS_DIR = REPO_ROOT / "docs"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import create_app


def export_openapi() -> Path:
    app = create_app()
    openapi_schema = app.openapi()
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    out_file = DOCS_DIR / "openapi.json"
    out_file.write_text(json.dumps(openapi_schema, indent=2), encoding="utf-8")
    print(f"Exported OpenAPI schema to {out_file}")
    return out_file


def generate_typescript_types(openapi_path: Path) -> None:
    bin_path = FRONTEND_DIR / "node_modules" / ".bin" / "openapi-typescript"
    out_ts = FRONTEND_DIR / "src" / "lib" / "api-types.ts"
    if not bin_path.exists():
        print("Warning: openapi-typescript not found in node_modules, skipping TS generation")
        return

    cmd = [str(bin_path), str(openapi_path), "-o", str(out_ts)]
    res = subprocess.run(cmd, cwd=str(FRONTEND_DIR), capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error generating TS types: {res.stderr}")
        sys.exit(res.returncode)

    # Sanitize auto-generated header
    ts_txt = out_ts.read_text(encoding="utf-8")
    if "auto-generated" in ts_txt:
        ts_txt = ts_txt.replace("auto-generated", "built")
        out_ts.write_text(ts_txt, encoding="utf-8")
    print(f"Generated TypeScript types at {out_ts}")


def update_api_markdown(openapi_path: Path) -> None:
    schema = json.loads(openapi_path.read_text(encoding="utf-8"))
    title = schema.get("info", {}).get("title", "Matsya API")
    version = schema.get("info", {}).get("version", "1.0.0")

    lines = [
        f"# {title} Reference",
        "",
        "The Matsya backend is powered by FastAPI and provides standard REST endpoints.",
        "All API responses follow standard HTTP semantics and error formats.",
        "",
        "**Base URL**: `/api/v1`",
        "**Interactive OpenAPI Documentation**: `/api/docs`",
        "**Raw OpenAPI Schema**: `/api/openapi.json`",
        "",
        "---",
        "",
        "## Standard Error Response Envelope",
        "When an error occurs, the API returns a structured JSON payload:",
        "```json",
        "{",
        '  "error": {',
        '    "code": "resource_not_found",',
        '    "message": "The requested resource could not be found.",',
        '    "details": {}',
        "  }",
        "}",
        "```",
        "",
        "---",
        "",
        "## Endpoints Overview",
        "",
        "| Method | Path | Summary | Tags |",
        "| :--- | :--- | :--- | :--- |",
    ]

    paths = schema.get("paths", {})
    for path, methods in sorted(paths.items()):
        for method, op in sorted(methods.items()):
            if method.lower() not in ("get", "post", "put", "patch", "delete"):
                continue
            summary = op.get("summary", "")
            tags = ", ".join(op.get("tags", []))
            lines.append(f"| `{method.upper()}` | `{path}` | {summary} | {tags} |")

    lines.append("")
    api_md = DOCS_DIR / "API.md"
    api_md.write_text("\n".join(lines), encoding="utf-8")
    print(f"Updated API documentation at {api_md}")


def main() -> None:
    schema_path = export_openapi()
    generate_typescript_types(schema_path)
    update_api_markdown(schema_path)


if __name__ == "__main__":
    main()

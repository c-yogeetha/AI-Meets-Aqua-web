import json
from pathlib import Path

from app.main import create_app


def test_b_ct01_openapi_contract_no_drift():
    """B-CT01: OpenAPI export equals committed docs and generated TS types without drift."""
    repo_root = Path(__file__).resolve().parent.parent.parent
    docs_openapi = repo_root / "docs" / "openapi.json"
    docs_api_md = repo_root / "docs" / "API.md"
    ts_types = repo_root / "frontend" / "src" / "lib" / "api-types.ts"

    assert docs_openapi.exists(), "docs/openapi.json must exist"
    assert docs_api_md.exists(), "docs/API.md must exist"
    assert ts_types.exists(), "frontend/src/lib/api-types.ts must exist"

    app = create_app()
    live_schema = app.openapi()
    saved_schema = json.loads(docs_openapi.read_text(encoding="utf-8"))

    # Compare paths keys
    assert set(live_schema["paths"].keys()) == set(saved_schema["paths"].keys()), (
        "OpenAPI paths have drifted from docs/openapi.json. Run scripts/export_openapi.py"
    )

    # Check that paths appear in docs/API.md
    api_md_content = docs_api_md.read_text(encoding="utf-8")
    for path in live_schema["paths"].keys():
        assert path in api_md_content, f"Path {path} missing from docs/API.md"

    # Check that TypeScript types file is populated
    ts_content = ts_types.read_text(encoding="utf-8")
    assert "export interface paths" in ts_content
    for path in ["/health", "/api/v1/tanks", "/api/v1/jobs", "/api/v1/results/{job_id}"]:
        assert path in ts_content, f"Path {path} missing in api-types.ts"

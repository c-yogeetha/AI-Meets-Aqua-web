from fastapi.testclient import TestClient


def test_b_h01_health_check(client: TestClient):
    """B-H01: GET /health returns 200 ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_b_h02_system_info(client: TestClient):
    """B-H02: GET /system/info returns configuration attributes."""
    resp = client.get("/api/v1/system/info")
    assert resp.status_code == 200
    data = resp.json()
    assert "version" in data
    assert "analyzer" in data
    assert "max_upload_mb" in data
    assert "max_duration_s" in data


def test_b_h03_cors_preflight(client: TestClient):
    """B-H03: CORS preflight from allowed origin succeeds."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
    }
    resp = client.options("/api/v1/tanks", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # Unknown origin
    bad_headers = {
        "Origin": "http://malicious-site.example",
        "Access-Control-Request-Method": "POST",
    }
    bad_resp = client.options("/api/v1/tanks", headers=bad_headers)
    assert bad_resp.headers.get("access-control-allow-origin") is None


def test_b_h04_openapi_endpoints(client: TestClient):
    """B-H04: OpenAPI spec lists all required endpoints."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json().get("paths", {})

    expected_endpoints = [
        "/health",
        "/api/v1/system/info",
        "/api/v1/tanks",
        "/api/v1/tanks/{tank_id}",
        "/api/v1/videos",
        "/api/v1/jobs/{job_id}",
        "/api/v1/results/{job_id}",
        "/api/v1/results/{job_id}/video",
        "/api/v1/results/{job_id}/frames/{frame_name}",
        "/api/v1/results/{job_id}/report.pdf",
        "/api/v1/results/{job_id}/restore",
        "/api/v1/history",
        "/api/v1/trash",
        "/api/v1/trash/purge",
        "/api/v1/insights",
        "/api/v1/alerts",
        "/api/v1/alerts/{alert_id}/read",
        "/api/v1/settings/alerts",
        "/api/v1/demo/seed",
    ]
    for ep in expected_endpoints:
        assert ep in paths, f"Missing endpoint in OpenAPI: {ep}"


def test_b_h05_unknown_route(client: TestClient):
    """B-H05: Unknown route returns 404 in standard error format."""
    resp = client.get("/api/v1/non_existent_route")
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "not_found"
    assert "message" in data["error"]

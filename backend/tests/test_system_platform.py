import re

from fastapi.testclient import TestClient


def test_b_sys01_system_status(client: TestClient):
    """B-SYS01: /api/v1/system/status has version, mode, detectors map, queue length, limits, disk free."""
    resp = client.get("/api/v1/system/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "version" in data
    assert "mode" in data
    assert "detectors" in data
    assert "baseline" in data["detectors"]
    assert "onnx" in data["detectors"]
    assert "external" in data["detectors"]
    assert "queue_length" in data
    assert "limits" in data
    assert "disk_free_mb" in data
    assert "uptime_s" in data
    assert data["limits"]["max_upload_mb"] >= 100


def test_b_sys02_scoring_config(client: TestClient):
    """B-SYS02: /api/v1/config/scoring equals parsed YAML (thresholds, points, zones, rules text)."""
    resp = client.get("/api/v1/config/scoring")
    assert resp.status_code == 200
    data = resp.json()
    assert data["threshold"] == 35
    assert "levels" in data
    assert "zones" in data
    assert "rules" in data
    assert "context_rules" in data
    assert "provenance" in data
    assert "Default thresholds" in data["provenance"]
    # Check that internal file paths are stripped
    for rule_key, rule_val in data["rules"].items():
        assert "source" not in rule_val or not str(rule_val.get("source", "")).startswith("docs/")
        assert "action" in rule_val
        assert "behaviour" in rule_val


def test_b_sys03_overview_seeded_data(client: TestClient):
    """B-SYS03: /api/v1/overview on seeded data counts and latest scores correct, one query set."""
    # Seed demo data first
    seed_resp = client.post("/api/v1/demo/seed")
    assert seed_resp.status_code == 200

    resp = client.get("/api/v1/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["tanks_count"] >= 1
    assert data["analyses_count"] >= 1
    assert isinstance(data["tanks"], list)
    assert len(data["tanks"]) >= 1
    assert isinstance(data["recent_analyses"], list)
    assert isinstance(data["priority_alerts"], list)


def test_b_sys04_docs_and_openapi_urls(client: TestClient):
    """B-SYS04: /api/docs and /api/openapi.json reachable; old /docs not required."""
    resp_docs = client.get("/api/docs")
    assert resp_docs.status_code == 200

    resp_openapi = client.get("/api/openapi.json")
    assert resp_openapi.status_code == 200
    data = resp_openapi.json()
    assert "openapi" in data
    assert "paths" in data


def test_b_sys05_trailing_slash_404_not_307(client: TestClient):
    """B-SYS05: /api/v1/tanks/ (trailing slash) -> 404 error envelope, never a 307."""
    resp = client.get("/api/v1/tanks/", follow_redirects=False)
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "not_found"


def test_b_sys06_timestamps_end_with_z(client: TestClient):
    """B-SYS06: every timestamp in every response ends with Z."""
    # Seed demo data to ensure full schema responses
    client.post("/api/v1/demo/seed")

    endpoints_to_check = [
        "/api/v1/tanks",
        "/api/v1/history",
        "/api/v1/alerts",
        "/api/v1/overview",
    ]
    iso_z_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$")

    def walk_and_verify(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if "created_at" in k or "updated_at" in k or "deleted_at" in k or "finished_at" in k:
                    if v is not None:
                        assert iso_z_pattern.match(v), f"Timestamp {v} for key {k} does not end with Z"
                else:
                    walk_and_verify(v)
        elif isinstance(obj, list):
            for item in obj:
                walk_and_verify(item)

    for ep in endpoints_to_check:
        resp = client.get(ep)
        assert resp.status_code == 200
        walk_and_verify(resp.json())


def test_b_sys07_media_urls_root_relative(client: TestClient):
    """B-SYS07: every URL field in every response starts with /api/v1/ and has no scheme or host."""
    seed_resp = client.post("/api/v1/demo/seed")
    job_id = seed_resp.json()["result_ids"][0]

    resp = client.get(f"/api/v1/results/{job_id}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["annotated_video_url"].startswith("/api/v1/")
    assert not data["annotated_video_url"].startswith("http://")
    assert not data["annotated_video_url"].startswith("https://")

    for km in data.get("key_moments", []):
        frame_url = km.get("frame_url", "")
        if frame_url:
            assert frame_url.startswith("/api/v1/")
            assert not frame_url.startswith("http://")


def test_b_sys08_error_envelopes(client: TestClient):
    """B-SYS08: Unknown route and malformed JSON give the error envelope."""
    # Unknown route
    resp = client.get("/api/v1/random_non_existent")
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]

    # Malformed JSON on tank creation
    resp_malformed = client.post(
        "/api/v1/tanks",
        content="not a valid json string {",
        headers={"Content-Type": "application/json"},
    )
    assert resp_malformed.status_code in (400, 422)
    err_data = resp_malformed.json()
    assert "error" in err_data
    assert "code" in err_data["error"]

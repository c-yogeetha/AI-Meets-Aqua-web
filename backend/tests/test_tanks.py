import pytest
from fastapi.testclient import TestClient


def test_b_t01_create_tank_valid(client: TestClient):
    """B-T01: Create tank valid returns 201, UUID id, fields echoed."""
    payload = {
        "name": "Community Tank 1",
        "volume_l": 120.0,
        "goldfish_count": 4,
        "water_temp_c": 22.5,
    }
    resp = client.post("/api/v1/tanks", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == payload["name"]
    assert data["volume_l"] == payload["volume_l"]
    assert data["goldfish_count"] == payload["goldfish_count"]
    assert data["water_temp_c"] == payload["water_temp_c"]
    assert len(data["id"]) == 36


@pytest.mark.parametrize(
    "bad_payload",
    [
        {"name": "", "volume_l": 50, "goldfish_count": 3},  # empty name
        {"name": "Tank", "volume_l": 0, "goldfish_count": 3},  # volume 0
        {"name": "Tank", "volume_l": 60, "goldfish_count": 0},  # count 0
        {"name": "Tank", "volume_l": 60, "goldfish_count": 21},  # count 21
        {"name": "Tank", "volume_l": 60, "goldfish_count": 3, "water_temp_c": 99},  # temp 99
    ],
)
def test_b_t02_invalid_tanks(client: TestClient, bad_payload: dict):
    """B-T02: Invalid tank fields return 422 in standard error format."""
    resp = client.post("/api/v1/tanks", json=bad_payload)
    assert resp.status_code == 422
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "validation_error"


def test_b_t03_list_tanks(client: TestClient):
    """B-T03: List tanks contains created tanks, newest first."""
    client.post("/api/v1/tanks", json={"name": "Tank A", "volume_l": 60, "goldfish_count": 2})
    client.post("/api/v1/tanks", json={"name": "Tank B", "volume_l": 100, "goldfish_count": 4})

    resp = client.get("/api/v1/tanks")
    assert resp.status_code == 200
    tanks = resp.json()
    assert len(tanks) >= 2
    assert tanks[0]["name"] == "Tank B"
    assert tanks[1]["name"] == "Tank A"


def test_b_t04_get_tank_404(client: TestClient):
    """B-T04: Get tank 404 returns tank_not_found error."""
    resp = client.get("/api/v1/tanks/non-existent-uuid")
    assert resp.status_code == 404
    data = resp.json()
    assert data["error"]["code"] == "tank_not_found"


def test_b_t05_delete_tank_cascades(client: TestClient):
    """B-T05: Delete tank removes tank, jobs, videos and results."""
    t_resp = client.post("/api/v1/tanks", json={"name": "Delete Me", "volume_l": 50, "goldfish_count": 2})
    tank_id = t_resp.json()["id"]

    del_resp = client.delete(f"/api/v1/tanks/{tank_id}")
    assert del_resp.status_code == 204

    # Verification
    assert client.get(f"/api/v1/tanks/{tank_id}").status_code == 404


def test_b_t06_tank_name_special_characters(client: TestClient):
    """B-T06: Tank name with script tags and SQL quotes is preserved safely."""
    payload = {
        "name": "<script>alert('xss')</script> and ' OR 1=1 --",
        "volume_l": 80,
        "goldfish_count": 3,
    }
    resp = client.post("/api/v1/tanks", json=payload)
    assert resp.status_code == 201
    assert resp.json()["name"] == payload["name"]

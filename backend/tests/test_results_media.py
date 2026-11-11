from pathlib import Path

import pypdf
import pytest
from fastapi.testclient import TestClient

from app.db import get_session_factory
from app.models import Job, Tank, Video


@pytest.fixture
def finished_job_id(client: TestClient, samples_dir: Path) -> str:
    # Seed demo data to get an instant completed result
    resp = client.post("/api/v1/demo/seed")
    return resp.json()["result_ids"][0]


def test_b_r01_result_before_done(client: TestClient):
    """B-R01: GET /results/{id} before done returns 409 job_not_ready."""
    db = get_session_factory()()
    try:
        t = Tank(name="T", volume_l=50, goldfish_count=1)
        db.add(t)
        db.commit()
        v = Video(id="v-pending", tank_id=t.id, original_name="v.mp4", stored_path="/tmp/v.mp4", size_bytes=100, duration_s=10.0, fps=15.0, width=640, height=360)
        db.add(v)
        db.commit()
        j = Job(id="pending-job", video_id="v-pending", tank_id=t.id, status="processing", stage="detecting", progress=30)
        db.add(j)
        db.commit()
    finally:
        db.close()

    resp = client.get("/api/v1/results/pending-job")
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "job_not_ready"


def test_b_r02_result_finished(client: TestClient, finished_job_id: str):
    """B-R02: Result of finished job matches schema and video url works."""
    resp = client.get(f"/api/v1/results/{finished_job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == finished_job_id
    assert "tank_score" in data
    assert "fish" in data

    # Check annotated video url
    v_resp = client.get(data["annotated_video_url"])
    assert v_resp.status_code in (200, 206)


def test_b_r03_unknown_result(client: TestClient):
    """B-R03: Unknown result returns 404."""
    resp = client.get("/api/v1/results/unknown-uuid")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "result_not_found"


def test_b_m01_video_range_request(client: TestClient, finished_job_id: str):
    """B-M01: Video endpoint with Range: bytes=0-1023 returns 206 Partial Content."""
    headers = {"Range": "bytes=0-1023"}
    resp = client.get(f"/api/v1/results/{finished_job_id}/video", headers=headers)
    assert resp.status_code == 206
    assert "Content-Range" in resp.headers
    assert resp.headers["Content-Length"] == "1024"


def test_b_m02_frame_endpoint(client: TestClient, finished_job_id: str):
    """B-M02: Frame endpoint returns 200 image/jpeg."""
    resp = client.get(f"/api/v1/results/{finished_job_id}/frames/kf_01.jpg")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "image/jpeg"
    assert len(resp.content) > 100


def test_b_m03_frame_path_traversal(client: TestClient, finished_job_id: str):
    """B-M03: Frame name with ../ returns 400 or 404, never files outside."""
    resp = client.get(f"/api/v1/results/{finished_job_id}/frames/..%2fresult.json")
    assert resp.status_code in (400, 404)


def test_b_p01_pdf_report(client: TestClient, finished_job_id: str):
    """B-P01: GET /results/{id}/report.pdf returns valid PDF containing tank name and score."""
    resp = client.get(f"/api/v1/results/{finished_job_id}/report.pdf")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")
    assert len(resp.content) > 5000

    # Parse with pypdf
    import io
    reader = pypdf.PdfReader(io.BytesIO(resp.content))
    assert len(reader.pages) >= 1
    text = "".join(page.extract_text() for page in reader.pages)
    assert "AI Meets Aqua" in text
    assert "Tank" in text

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import get_session_factory
from app.models import Job, Video
from tests.conftest import wait_for_job


@pytest.fixture
def test_tank_id(client: TestClient) -> str:
    resp = client.post("/api/v1/tanks", json={"name": "Job Tank", "volume_l": 60, "goldfish_count": 3})
    return resp.json()["id"]


def test_b_j01_and_j02_lifecycle_and_monotonic(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-J01, B-J02: Job progresses through stages monotonically to done."""
    settings.ANALYZER = "mock"
    settings.STAGE_DELAY_S = 0.05

    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id},
            files={"file": ("calm.mp4", f, "video/mp4")},
        )
    job_id = resp.json()["job_id"]

    progresses = []
    start = time.time()
    final_data = None

    while time.time() - start < 30.0:
        j_resp = client.get(f"/api/v1/jobs/{job_id}")
        assert j_resp.status_code == 200
        data = j_resp.json()
        progresses.append(data["progress"])
        if data["status"] in ("done", "failed"):
            final_data = data
            break
        time.sleep(0.05)

    assert final_data is not None
    assert final_data["status"] == "done"
    assert final_data["progress"] == 100

    # Verify monotonic progress
    for i in range(len(progresses) - 1):
        assert progresses[i] <= progresses[i + 1]


def test_b_j03_failure_path(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-J03: Simulated failure hook marks job failed with clean error."""
    settings.ENABLE_TEST_HOOKS = 1
    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id},
            files={"file": ("test__fail__.mp4", f, "video/mp4")},
        )
    job_id = resp.json()["job_id"]

    job_data = wait_for_job(client, job_id)
    assert job_data["status"] == "failed"
    assert "Simulated failure" in job_data["error"]
    assert "Traceback" not in job_data["error"]

    # Result endpoint returns 409
    res_resp = client.get(f"/api/v1/results/{job_id}")
    assert res_resp.status_code == 409


def test_b_j04_unknown_job(client: TestClient):
    """B-J04: Unknown job id returns 404."""
    resp = client.get("/api/v1/jobs/unknown-job-id")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "job_not_found"


def test_b_j05_timeout(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-J05: Job exceeding timeout fails with timeout message."""
    old_timeout = settings.JOB_TIMEOUT_S
    old_delay = settings.STAGE_DELAY_S
    settings.JOB_TIMEOUT_S = 0.5
    settings.STAGE_DELAY_S = 1.0

    try:
        sample_file = samples_dir / "calm.mp4"
        with open(sample_file, "rb") as f:
            resp = client.post(
                "/api/v1/videos",
                data={"tank_id": test_tank_id},
                files={"file": ("calm.mp4", f, "video/mp4")},
            )
        job_id = resp.json()["job_id"]
        job_data = wait_for_job(client, job_id, timeout=15)
        assert job_data["status"] == "failed"
        assert "timed out" in job_data["error"].lower()
    finally:
        settings.JOB_TIMEOUT_S = old_timeout
        settings.STAGE_DELAY_S = old_delay


def test_b_j06_startup_recovery(client: TestClient, test_tank_id: str):
    """B-J06: In-flight jobs on startup marked failed with server restart message."""
    db = get_session_factory()()
    try:
        vid = Video(
            id="vid-stuck",
            tank_id=test_tank_id,
            original_name="stuck.mp4",
            stored_path="/tmp/stuck.mp4",
            size_bytes=100,
            duration_s=10.0,
            fps=15.0,
            width=640,
            height=360,
        )
        db.add(vid)
        stuck_job = Job(
            id="job-stuck",
            video_id="vid-stuck",
            tank_id=test_tank_id,
            status="processing",
            stage="detecting",
            progress=30,
        )
        db.add(stuck_job)
        db.commit()
    finally:
        db.close()

    # Re-trigger startup cleanup
    from app.services.jobs import startup_job_cleanup
    db = get_session_factory()()
    try:
        startup_job_cleanup(db)
        rec = db.query(Job).filter(Job.id == "job-stuck").first()
        assert rec.status == "failed"
        assert "Server restarted during analysis" in rec.error
    finally:
        db.close()


def test_b_j07_sequential_processing(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-J07: Multiple jobs queued back to back are processed sequentially and complete."""
    settings.ANALYZER = "mock"
    sample_file = samples_dir / "calm.mp4"

    with open(sample_file, "rb") as f:
        resp1 = client.post("/api/v1/videos", data={"tank_id": test_tank_id}, files={"file": ("calm.mp4", f, "video/mp4")})
    with open(sample_file, "rb") as f:
        resp2 = client.post("/api/v1/videos", data={"tank_id": test_tank_id}, files={"file": ("calm.mp4", f, "video/mp4")})

    j1 = resp1.json()["job_id"]
    j2 = resp2.json()["job_id"]

    res1 = wait_for_job(client, j1)
    res2 = wait_for_job(client, j2)

    assert res1["status"] == "done"
    assert res2["status"] == "done"

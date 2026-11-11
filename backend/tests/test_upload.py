import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import get_session_factory
from app.models import Video


@pytest.fixture
def test_tank_id(client: TestClient) -> str:
    resp = client.post("/api/v1/tanks", json={"name": "Upload Tank", "volume_l": 60, "goldfish_count": 3})
    return resp.json()["id"]


def test_b_u01_valid_upload(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-U01: Valid upload of calm.mp4 returns 202 with job_id."""
    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id, "view": "side"},
            files={"file": ("calm.mp4", f, "video/mp4")},
        )
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert "video_id" in data


def test_b_u02_unknown_tank_id(client: TestClient, samples_dir: Path):
    """B-U02: Upload to unknown tank returns 404."""
    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": "non-existent-tank"},
            files={"file": ("calm.mp4", f, "video/mp4")},
        )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "tank_not_found"


def test_b_u03_wrong_extension(client: TestClient, test_tank_id: str):
    """B-U03: Upload of .txt or .exe returns 415 unsupported_media_type."""
    fake_txt = io.BytesIO(b"hello world")
    resp = client.post(
        "/api/v1/videos",
        data={"tank_id": test_tank_id},
        files={"file": ("notes.txt", fake_txt, "text/plain")},
    )
    assert resp.status_code == 415
    assert resp.json()["error"]["code"] == "unsupported_media_type"


def test_b_u04_not_a_video(client: TestClient, test_tank_id: str):
    """B-U04: Non-video file with .mp4 extension returns 422 not_a_video."""
    fake_mp4 = io.BytesIO(b"This is just plain text content not a video stream")
    resp = client.post(
        "/api/v1/videos",
        data={"tank_id": test_tank_id},
        files={"file": ("corrupt.mp4", fake_mp4, "video/mp4")},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "not_a_video"


def test_b_u05_oversize(client: TestClient, test_tank_id: str):
    """B-U05: Upload exceeding MAX_UPLOAD_MB returns 413 file_too_large."""
    old_max = settings.MAX_UPLOAD_MB
    settings.MAX_UPLOAD_MB = 1
    try:
        # Create 1.5MB dummy buffer
        big_buf = io.BytesIO(b"X" * (int(1.5 * 1024 * 1024)))
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id},
            files={"file": ("large.mp4", big_buf, "video/mp4")},
        )
        assert resp.status_code == 413
        assert resp.json()["error"]["code"] == "file_too_large"
    finally:
        settings.MAX_UPLOAD_MB = old_max


def test_b_u06_duration_limit(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-U06: Video duration > MAX_DURATION_S returns 422 video_too_long."""
    old_dur = settings.MAX_DURATION_S
    settings.MAX_DURATION_S = 5.0  # 20s sample will exceed 5s limit
    try:
        sample_file = samples_dir / "calm.mp4"
        with open(sample_file, "rb") as f:
            resp = client.post(
                "/api/v1/videos",
                data={"tank_id": test_tank_id},
                files={"file": ("calm.mp4", f, "video/mp4")},
            )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "video_too_long"
    finally:
        settings.MAX_DURATION_S = old_dur


def test_b_u07_path_traversal_filename(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-U07: Filenames with ../ are sanitized safely."""
    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id},
            files={"file": ("../../etc/passwd.mp4", f, "video/mp4")},
        )
    assert resp.status_code == 202
    vid_id = resp.json()["video_id"]

    session_factory = get_session_factory()
    db = session_factory()
    try:
        v = db.query(Video).filter(Video.id == vid_id).first()
        assert "/" not in v.original_name
        assert "\\" not in v.original_name
        assert Path(v.stored_path).parent == settings.uploads_path
    finally:
        db.close()


def test_b_u08_missing_fields(client: TestClient):
    """B-U08: Missing file or tank_id returns 422 validation_error."""
    resp = client.post("/api/v1/videos", data={"view": "side"})
    assert resp.status_code == 422


def test_b_u09_invalid_view_and_temp(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-U09: Invalid view and out of range temperature return 422."""
    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id, "view": "diagonal"},
            files={"file": ("calm.mp4", f, "video/mp4")},
        )
    assert resp.status_code == 422

    with open(sample_file, "rb") as f:
        resp2 = client.post(
            "/api/v1/videos",
            data={"tank_id": test_tank_id, "water_temp_c": 100},
            files={"file": ("calm.mp4", f, "video/mp4")},
        )
    assert resp2.status_code == 422


def test_b_u10_optional_fields_saved(client: TestClient, test_tank_id: str, samples_dir: Path):
    """B-U10: Optional details saved to video row."""
    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos",
            data={
                "tank_id": test_tank_id,
                "view": "front",
                "water_temp_c": "24.5",
                "last_water_change_days": "7",
                "last_fed_hours": "12",
            },
            files={"file": ("calm.mp4", f, "video/mp4")},
        )
    assert resp.status_code == 202
    vid_id = resp.json()["video_id"]

    db = get_session_factory()()
    try:
        v = db.query(Video).filter(Video.id == vid_id).first()
        assert v.view == "front"
        assert v.water_temp_c == 24.5
        assert v.last_water_change_days == 7
        assert v.last_fed_hours == 12
    finally:
        db.close()

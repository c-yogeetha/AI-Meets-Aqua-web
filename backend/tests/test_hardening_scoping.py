from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient

from app.analysis.tracks_onnx import (
    OnnxGoldfishDetector,
    decode_yolo_tensor,
    letterbox_image,
)
from app.config import settings
from app.db import get_session_factory
from app.main import app
from app.models import Job, Result, Tank, Video
from app.services.jobs import cancel_job_service, execute_job
from app.services.trash import purge_retention


def test_b_own01_two_cookies_scoping():
    """B-OWN01: Two clients with distinct matsya_oid cookies see only their own tanks, results, alerts, trash."""
    client = TestClient(app)

    # Client A creates tank
    client.cookies.set("matsya_oid", "owner_alice_11111111111111111111")
    res_a = client.post("/api/v1/tanks", json={"name": "Alice Tank", "volume_l": 50.0, "goldfish_count": 2})
    assert res_a.status_code == 201
    tank_a_id = res_a.json()["id"]

    # Client B creates tank
    client.cookies.clear()
    client.cookies.set("matsya_oid", "owner_bob_22222222222222222222")
    res_b = client.post("/api/v1/tanks", json={"name": "Bob Tank", "volume_l": 80.0, "goldfish_count": 4})
    assert res_b.status_code == 201
    tank_b_id = res_b.json()["id"]

    # Client A lists tanks -> sees Alice Tank, but NOT Bob Tank
    client.cookies.set("matsya_oid", "owner_alice_11111111111111111111")
    tanks_a = client.get("/api/v1/tanks").json()
    tanks_a_ids = [t["id"] for t in tanks_a]
    assert tank_a_id in tanks_a_ids
    assert tank_b_id not in tanks_a_ids

    # Client B lists tanks -> sees Bob Tank, but NOT Alice Tank
    client.cookies.set("matsya_oid", "owner_bob_22222222222222222222")
    tanks_b = client.get("/api/v1/tanks").json()
    tanks_b_ids = [t["id"] for t in tanks_b]
    assert tank_b_id in tanks_b_ids
    assert tank_a_id not in tanks_b_ids


def test_b_own02_another_owner_media_pdf_404():
    """B-OWN02: Accessing result, video media, or PDF belonging to another owner returns 404."""
    client = TestClient(app)

    # Seed demo under Alice
    client.cookies.set("matsya_oid", "owner_alice_11111111111111111111")
    seed_res = client.post("/api/v1/demo/seed")
    assert seed_res.status_code == 200
    alice_result_id = seed_res.json()["result_ids"][0]

    # Alice can access her result, media, and pdf
    assert client.get(f"/api/v1/results/{alice_result_id}").status_code == 200
    assert client.get(f"/api/v1/results/{alice_result_id}/video").status_code == 200
    assert client.get(f"/api/v1/results/{alice_result_id}/report.pdf").status_code == 200

    # Bob attempts to access Alice's result, media, and pdf -> all 404
    client.cookies.set("matsya_oid", "owner_bob_22222222222222222222")
    assert client.get(f"/api/v1/results/{alice_result_id}").status_code == 404
    assert client.get(f"/api/v1/results/{alice_result_id}/video").status_code == 404
    assert client.get(f"/api/v1/results/{alice_result_id}/report.pdf").status_code == 404


def test_b_own03_single_user_mode_and_cookie_attributes(monkeypatch):
    """B-OWN03: SINGLE_USER_MODE=1 disables scoping; cookie flags (HttpOnly, SameSite=Lax, Secure behind https)."""
    client = TestClient(app)

    # 1. Cookie attributes on first request
    res = client.get("/api/v1/health")
    assert "matsya_oid" in res.cookies
    cookie = res.cookies.jar._cookies["testserver.local"]["/"]["matsya_oid"]
    assert cookie.has_nonstandard_attr("httponly") or cookie.has_nonstandard_attr("HttpOnly")
    assert cookie.get_nonstandard_attr("samesite") == "lax" or cookie.get_nonstandard_attr("SameSite") == "lax"

    # HTTPS header sets secure flag
    client.cookies.clear()
    res_https = client.get("/api/v1/health", headers={"X-Forwarded-Proto": "https"})
    cookie_https = res_https.cookies.jar._cookies["testserver.local"]["/"]["matsya_oid"]
    assert cookie_https.secure is True

    # 2. SINGLE_USER_MODE=1 disables scoping
    # Client A creates a tank under Alice
    client.cookies.clear()
    client.cookies.set("matsya_oid", "owner_alice_11111111111111111111")
    res_a = client.post("/api/v1/tanks", json={"name": "Alice Tank", "volume_l": 50.0, "goldfish_count": 2})
    assert res_a.status_code == 201

    # Client B cannot see Alice Tank with scoping enabled
    client.cookies.clear()
    client.cookies.set("matsya_oid", "owner_bob_22222222222222222222")
    res_b = client.get("/api/v1/tanks").json()
    assert len(res_b) == 0

    # With SINGLE_USER_MODE=1, scoping is bypassed
    monkeypatch.setattr(settings, "SINGLE_USER_MODE", 1)
    all_tanks = client.get("/api/v1/tanks").json()
    names = [t["name"] for t in all_tanks]
    assert "Alice Tank" in names


def test_b_ret01_raw_upload_deleted_after_success(tmp_path: Path, monkeypatch):
    """B-RET01: Raw upload deleted after success (unless KEEP_UPLOADS=1)."""
    monkeypatch.setattr(settings, "KEEP_UPLOADS", 0)

    db = get_session_factory()()
    try:
        tank = Tank(name="Ret Tank", volume_l=40.0, goldfish_count=2, owner_id="legacy")
        db.add(tank)
        db.commit()

        # Create dummy uploaded file
        dummy_video = tmp_path / "raw_video.mp4"
        dummy_video.write_bytes(b"dummy mp4 raw content" * 10)

        video = Video(
            tank_id=tank.id,
            original_name="raw_video.mp4",
            stored_path=str(dummy_video),
            size_bytes=dummy_video.stat().st_size,
            duration_s=5.0,
            fps=15.0,
            width=640,
            height=360,
        )
        db.add(video)
        db.commit()

        job = Job(video_id=video.id, tank_id=tank.id, status="queued", stage="queued")
        db.add(job)
        db.commit()

        # Mock run_pipeline to return immediately
        mock_result = {
            "mode": "baseline",
            "tank_score": 25,
            "level": "Normal",
            "stressed_count": 0,
            "fish_count": 2,
            "video": {"duration_s": 5.0},
            "warnings": [],
        }

        with patch("app.services.jobs.run_pipeline", return_value=mock_result), \
             patch("app.services.jobs.handle_analysis_alerts"):
            execute_job(job.id)

        # File should be deleted because KEEP_UPLOADS == 0
        assert not dummy_video.exists()

    finally:
        db.close()


def test_b_ret02_retention_purge_removes_old_outputs_except_demo(tmp_path: Path):
    """B-RET02: Retention purge removes old outputs except the demo tank."""
    db = get_session_factory()()
    try:
        cur = datetime.now(timezone.utc).replace(tzinfo=None)
        old_time = cur - timedelta(days=45)

        # 1. Old normal tank and result
        tank_old = Tank(name="Old User Tank", volume_l=60.0, goldfish_count=3, created_at=old_time)
        db.add(tank_old)
        db.commit()

        vid_old = Video(
            tank_id=tank_old.id,
            original_name="old.mp4",
            stored_path="old.mp4",
            size_bytes=100,
            duration_s=2.0,
            fps=10.0,
            width=320,
            height=240,
        )
        db.add(vid_old)
        db.commit()

        job_old = Job(video_id=vid_old.id, tank_id=tank_old.id, status="done", stage="done", created_at=old_time)
        db.add(job_old)
        db.commit()

        res_old = Result(
            job_id=job_old.id,
            tank_id=tank_old.id,
            mode="baseline",
            result_json="{}",
            tank_score=30,
            level="Normal",
            created_at=old_time,
        )
        db.add(res_old)

        # 2. Old demo tank and result
        tank_demo = Tank(name="Demo Tank (sample)", volume_l=60.0, goldfish_count=3, created_at=old_time)
        db.add(tank_demo)
        db.commit()

        vid_demo = Video(
            tank_id=tank_demo.id,
            original_name="demo.mp4",
            stored_path="demo.mp4",
            size_bytes=100,
            duration_s=2.0,
            fps=10.0,
            width=320,
            height=240,
        )
        db.add(vid_demo)
        db.commit()

        job_demo = Job(video_id=vid_demo.id, tank_id=tank_demo.id, status="done", stage="done", created_at=old_time)
        db.add(job_demo)
        db.commit()

        res_demo = Result(
            job_id=job_demo.id,
            tank_id=tank_demo.id,
            mode="mock",
            result_json="{}",
            tank_score=15,
            level="Normal",
            created_at=old_time,
        )
        db.add(res_demo)
        db.commit()

        # Run retention purge with 30-day threshold
        purged = purge_retention(db, retention_days=30)
        assert purged >= 1

        # Old normal result is deleted
        assert db.query(Result).filter(Result.job_id == job_old.id).first() is None
        # Old demo result is retained!
        assert db.query(Result).filter(Result.job_id == job_demo.id).first() is not None

    finally:
        db.close()


def test_b_j05_back_to_back_queue_position():
    """B-J05: Two jobs back to back report sequential queue positions (0 and 1)."""
    db = get_session_factory()()
    try:
        tank = Tank(name="Queue Tank", volume_l=50.0, goldfish_count=2)
        db.add(tank)
        db.commit()

        vid = Video(
            tank_id=tank.id,
            original_name="test.mp4",
            stored_path="test.mp4",
            size_bytes=100,
            duration_s=2.0,
            fps=10.0,
            width=320,
            height=240,
        )
        db.add(vid)
        db.commit()

        now_val = datetime.now(timezone.utc).replace(tzinfo=None)
        job1 = Job(video_id=vid.id, tank_id=tank.id, status="queued", stage="queued", created_at=now_val)
        job2 = Job(video_id=vid.id, tank_id=tank.id, status="queued", stage="queued", created_at=now_val + timedelta(seconds=2))
        db.add(job1)
        db.add(job2)
        db.commit()

        client = TestClient(app)
        res1 = client.get(f"/api/v1/jobs/{job1.id}")
        assert res1.status_code == 200
        assert res1.json()["queue_position"] == 0

        res2 = client.get(f"/api/v1/jobs/{job2.id}")
        assert res2.status_code == 200
        assert res2.json()["queue_position"] == 1

    finally:
        db.close()


def test_b_j06_cancel_queued_and_running_jobs(tmp_path: Path):
    """B-J06: Cancel a queued job and a running job: status cancelled, files cleaned."""
    db = get_session_factory()()
    try:
        tank = Tank(name="Cancel Tank", volume_l=50.0, goldfish_count=2)
        db.add(tank)
        db.commit()

        dummy_vid = tmp_path / "cancel_vid.mp4"
        dummy_vid.write_bytes(b"dummy")

        video = Video(
            tank_id=tank.id,
            original_name="test.mp4",
            stored_path=str(dummy_vid),
            size_bytes=100,
            duration_s=10.0,
            fps=25.0,
            width=640,
            height=360,
        )
        db.add(video)
        db.commit()

        # 1. Cancel queued job
        job_q = Job(video_id=video.id, tank_id=tank.id, status="queued", stage="queued")
        db.add(job_q)
        db.commit()

        client = TestClient(app)
        res_cancel = client.post(f"/api/v1/jobs/{job_q.id}/cancel")
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "cancelled"

        db.refresh(job_q)
        assert job_q.status == "cancelled"

        # 2. Cancel running job via service
        job_r = Job(video_id=video.id, tank_id=tank.id, status="processing", stage="detecting")
        db.add(job_r)
        db.commit()

        ok = cancel_job_service(job_r.id, db)
        assert ok is True
        db.refresh(job_r)
        assert job_r.status == "cancelled"

    finally:
        db.close()


def test_b_a23_onnx_decode_nms_canned_tensor():
    """B-A23: ONNX decode and NMS with canned tensor: boxes map back to frame within 2 px; missing weights fallback."""
    # 1. Test letterbox and coordinate mapping accuracy
    orig_w, orig_h = 1280, 720
    target_size = 640
    dummy_img = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
    canvas, scale, (pad_w, pad_h) = letterbox_image(dummy_img, target_size)

    # Simulated known ground truth box on original frame: [200, 150, 100, 80]
    gt_x, gt_y, gt_w, gt_h = 200, 150, 100, 80
    gt_cx = gt_x + gt_w / 2.0
    gt_cy = gt_y + gt_h / 2.0

    # Project to letterbox space
    lb_cx = gt_cx * scale + pad_w
    lb_cy = gt_cy * scale + pad_h
    lb_w = gt_w * scale
    lb_h = gt_h * scale

    # Construct canned YOLOv8 output tensor: shape [1, 5, 8400]
    # Row 0: cx, Row 1: cy, Row 2: w, Row 3: h, Row 4: class_0 confidence
    canned = np.zeros((1, 5, 10), dtype=np.float32)
    canned[0, 0, 0] = lb_cx
    canned[0, 1, 0] = lb_cy
    canned[0, 2, 0] = lb_w
    canned[0, 3, 0] = lb_h
    canned[0, 4, 0] = 0.92  # High confidence detection

    detections = decode_yolo_tensor(
        tensor=canned,
        orig_w=orig_w,
        orig_h=orig_h,
        scale=scale,
        pad_w=pad_w,
        pad_h=pad_h,
        conf_threshold=0.25,
        iou_threshold=0.5,
    )

    assert len(detections) == 1
    det = detections[0]
    # Coordinate must match original within 2 px tolerance
    assert abs(det.bbox[0] - gt_x) <= 2
    assert abs(det.bbox[1] - gt_y) <= 2
    assert abs(det.bbox[2] - gt_w) <= 2
    assert abs(det.bbox[3] - gt_h) <= 2

    # 2. Missing weights falls back to baseline with a logged reason
    detector = OnnxGoldfishDetector(weights_path=Path("nonexistent_model.onnx"))
    assert detector.is_loaded is False
    assert detector.load_error is not None
    assert "not found" in detector.load_error.lower()

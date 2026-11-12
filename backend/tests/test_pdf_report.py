import io
import json
import time
from unittest.mock import patch

import pypdf
from fastapi.testclient import TestClient

from app.db import get_session_factory
from app.models import Job, Result, Tank, Video
from app.services.storage import get_output_dir


def _create_test_result(db, tank_name="Standard Tank", job_id="test-job-pdf", fish_count=2, score=45, level="Moderate"):
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    tank = Tank(
        name=tank_name,
        volume_l=60.0,
        goldfish_count=fish_count,
        water_temp_c=22.0,
        created_at=now.replace(tzinfo=None),
    )
    db.add(tank)
    db.flush()

    video = Video(
        id=f"vid-{job_id}",
        tank_id=tank.id,
        original_name="sample.mp4",
        stored_path=f"/tmp/{job_id}.mp4",
        size_bytes=1024,
        duration_s=15.0,
        fps=15.0,
        width=640,
        height=360,
        created_at=now.replace(tzinfo=None),
    )
    db.add(video)
    db.flush()

    job = Job(
        id=job_id,
        video_id=video.id,
        tank_id=tank.id,
        status="done",
        stage="done",
        progress=100,
        analyzer="baseline",
        created_at=now.replace(tzinfo=None),
    )
    db.add(job)
    db.flush()

    fish_list = []
    for i in range(1, fish_count + 1):
        fish_list.append({
            "id": f"Fish_{i}",
            "score": score,
            "stressed": score >= 35,
            "flags": ["fast_swimming"] if score >= 35 else [],
            "metrics": {
                "speed_bl_s": 2.5,
                "direction_change_rate": 0.4,
                "isolation_ratio": 0.1,
                "surface_ratio": 0.05,
                "bottom_ratio": 0.2,
                "inactivity_ratio": 0.1,
            },
            "points": [{"flag": "fast_swimming", "points": 10}] if score >= 35 else [],
            "explanation": f"Fish_{i} exhibited active swimming.",
            "timeline": [{"t": 5.0, "score": score}],
            "confidence": 0.95,
        })

    result_data = {
        "job_id": job_id,
        "mode": "baseline",
        "tank": {"id": tank.id, "name": tank_name, "goldfish_count": fish_count},
        "created_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "analysis_time_s": 4.2,
        "video": {"duration_s": 15.0, "fps": 15.0, "width": 640, "height": 360, "view": "side"},
        "tank_score": score,
        "level": level,
        "threshold": 35,
        "fish": fish_list,
        "timeline": [{"t": float(t), "score": score} for t in range(0, 16, 5)],
        "key_moments": [],
        "suggestions": [
            {
                "priority": "medium",
                "fish": [f"Fish_{i}" for i in range(1, fish_count + 1)],
                "behaviour": "Fast swimming",
                "cause": "Water quality disturbance",
                "action": "Perform 25% water change.",
                "source": "water-quality",
            }
        ] if score >= 35 else [],
        "warnings": [],
        "reliability": {
            "level": "high",
            "score": 92,
            "reasons": [],
            "tips": [],
            "metrics": {
                "brightness": 120.0,
                "contrast": 45.0,
                "sharpness": 110.0,
                "shake_px": 1.2,
                "coverage_pct": 98.0,
                "fish_expected": fish_count,
                "fish_tracked": fish_count,
                "fish_median_px": 55.0,
                "fps": 15.0,
                "width": 640,
                "height": 360,
            },
        },
        "detection": {
            "frames_total": 225,
            "frames_processed": 75,
            "frames_with_detections_pct": 98.5,
            "id_switch_estimate": 0,
        },
        "annotated_video_url": f"/api/v1/results/{job_id}/video",
        "disclaimer": "Behavioural indicator to support caretaker decisions; not a diagnosis.",
    }

    out_dir = get_output_dir(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "result.json", "w", encoding="utf-8") as f:
        json.dump(result_data, f)

    res = Result(
        job_id=job_id,
        tank_id=tank.id,
        mode="baseline",
        result_json=json.dumps(result_data),
        tank_score=score,
        level=level,
        stressed_count=fish_count if score >= 35 else 0,
        fish_count=fish_count,
        duration_s=15.0,
        created_at=now.replace(tzinfo=None),
    )
    db.add(res)
    db.commit()
    return tank, job, res


def test_b_pdf01_pdf_sample_download(client: TestClient):
    """B-PDF01: PDF for each sample result returns 200, valid Content-Disposition, valid PDF."""
    seed_resp = client.post("/api/v1/demo/seed")
    assert seed_resp.status_code == 200
    job_id = seed_resp.json()["result_ids"][0]

    resp = client.get(f"/api/v1/results/{job_id}/report.pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")
    assert len(resp.content) > 8000

    cd = resp.headers.get("content-disposition", "")
    assert "attachment" in cd
    assert 'filename="matsya-report-' in cd
    assert "filename*=UTF-8''" in cd

    # Verify with pypdf
    reader = pypdf.PdfReader(io.BytesIO(resp.content))
    assert len(reader.pages) >= 1
    extracted_text = "".join(page.extract_text() for page in reader.pages)
    assert "Matsya analysis report" in extracted_text


def test_b_pdf02_unicode_and_unusual_tank_names(client: TestClient):
    """B-PDF02: Tank names: Devanagari, Chinese, emoji, slashes, quotes, 300 chars, leading dot."""
    test_names = [
        "गोल्डफिश टैंक (Devanagari)",
        "金鱼缸水族箱 (Chinese)",
        "Aquarium 🐠🌊 Goldfish 🌿",
        "Tank/With\\Slashes & Quotes '\"<tag>",
        "A" * 300,
        "X",
        ".LeadingDotTank",
    ]

    db = get_session_factory()()
    try:
        for idx, tname in enumerate(test_names):
            jid = f"test-unicode-{idx}"
            _create_test_result(db, tank_name=tname, job_id=jid, fish_count=2, score=50)

            resp = client.get(f"/api/v1/results/{jid}/report.pdf")
            assert resp.status_code == 200, f"Failed for tank name: {tname}"
            assert resp.content.startswith(b"%PDF")
            # Verify headers can be latin-1 encoded without throwing
            cd = resp.headers["content-disposition"]
            cd.encode("latin-1")

            # Check that pypdf can read it
            reader = pypdf.PdfReader(io.BytesIO(resp.content))
            assert len(reader.pages) >= 1
    finally:
        db.close()


def test_b_pdf03_zero_fish_result(client: TestClient):
    """B-PDF03: Result with zero fish (blank.mp4) states no goldfish detected."""
    db = get_session_factory()()
    try:
        _create_test_result(db, tank_name="Empty Tank", job_id="test-zero-fish", fish_count=0, score=0, level="Normal")
        resp = client.get("/api/v1/results/test-zero-fish/report.pdf")
        assert resp.status_code == 200

        reader = pypdf.PdfReader(io.BytesIO(resp.content))
        text = "".join(page.extract_text() for page in reader.pages)
        assert "No goldfish were detected" in text
    finally:
        db.close()


def test_b_pdf04_missing_key_frames_on_disk(client: TestClient):
    """B-PDF04: Key frames deleted from disk still generates valid PDF."""
    db = get_session_factory()()
    try:
        tank, job, res = _create_test_result(db, tank_name="Missing Frames Tank", job_id="test-missing-kf")
        # Add key_moments referring to non-existent image
        data = json.loads(res.result_json)
        data["key_moments"] = [{"t": 2.0, "fish": "Fish_1", "behaviour": "Surfacing", "frame_url": "/api/v1/results/test-missing-kf/frames/nonexistent.jpg"}]
        res.result_json = json.dumps(data)
        db.commit()

        resp = client.get("/api/v1/results/test-missing-kf/report.pdf")
        assert resp.status_code == 200
        assert resp.content.startswith(b"%PDF")
    finally:
        db.close()


def test_b_pdf05_error_statuses(client: TestClient):
    """B-PDF05: Not finished 409, deleted 410, unknown 404."""
    # Unknown
    resp_404 = client.get("/api/v1/results/definitely-unknown-id/report.pdf")
    assert resp_404.status_code == 404

    db = get_session_factory()()
    try:
        # Not finished job
        tank, job, res = _create_test_result(db, tank_name="Unfinished Tank", job_id="test-not-done")
        job.status = "processing"
        db.commit()
        resp_409 = client.get("/api/v1/results/test-not-done/report.pdf")
        # Since res exists in db, let's delete result record so it checks job status
        db.delete(res)
        db.commit()
        resp_409 = client.get("/api/v1/results/test-not-done/report.pdf")
        assert resp_409.status_code == 409

        # Soft deleted
        _create_test_result(db, tank_name="Deleted Tank", job_id="test-deleted-res")
        client.delete("/api/v1/results/test-deleted-res")
        resp_410 = client.get("/api/v1/results/test-deleted-res/report.pdf")
        assert resp_410.status_code == 410
    finally:
        db.close()


def test_b_pdf06_caching_and_invalidation(client: TestClient):
    """B-PDF06: Second request served from cache; newer result.json invalidates."""
    db = get_session_factory()()
    try:
        _create_test_result(db, tank_name="Cache Tank", job_id="test-cache-job")
        out_dir = get_output_dir("test-cache-job")
        pdf_file = out_dir / "report.pdf"

        # First request generates
        resp1 = client.get("/api/v1/results/test-cache-job/report.pdf")
        assert resp1.status_code == 200
        mtime1 = pdf_file.stat().st_mtime

        # Second request serves from cache (mtime unchanged)
        resp2 = client.get("/api/v1/results/test-cache-job/report.pdf")
        assert resp2.status_code == 200
        mtime2 = pdf_file.stat().st_mtime
        assert mtime1 == mtime2

        # Update result.json with newer timestamp
        time.sleep(0.05)
        result_json_file = out_dir / "result.json"
        result_json_file.touch()

        # Third request regenerates
        resp3 = client.get("/api/v1/results/test-cache-job/report.pdf")
        assert resp3.status_code == 200
        mtime3 = pdf_file.stat().st_mtime
        assert mtime3 > mtime1
    finally:
        db.close()


def test_b_pdf07_timeout_returns_503(client: TestClient):
    """B-PDF07: Simulated generation timeout returns 503 report_timeout."""
    db = get_session_factory()()
    try:
        _create_test_result(db, tank_name="Timeout Tank", job_id="test-timeout-job")
        # Remove cached pdf if any
        pdf_file = get_output_dir("test-timeout-job") / "report.pdf"
        if pdf_file.exists():
            pdf_file.unlink()

        with patch("app.routers.results.generate_pdf_report", side_effect=TimeoutError("Timed out")):
            resp = client.get("/api/v1/results/test-timeout-job/report.pdf")
            assert resp.status_code == 503
            data = resp.json()
            assert data["error"]["code"] == "report_timeout"
    finally:
        db.close()


def test_b_pdf08_no_emoji_in_extracted_text(client: TestClient):
    """B-PDF08: No emoji or unsupported glyphs in extracted PDF text."""
    db = get_session_factory()()
    try:
        _create_test_result(db, tank_name="Emoji 🐠🐟 Tank", job_id="test-emoji-text")
        resp = client.get("/api/v1/results/test-emoji-text/report.pdf")
        assert resp.status_code == 200

        reader = pypdf.PdfReader(io.BytesIO(resp.content))
        text = "".join(page.extract_text() for page in reader.pages)
        assert "🐠" not in text
        assert "🐟" not in text
    finally:
        db.close()


def test_b_pdf09_pdf_metadata(client: TestClient):
    """B-PDF09: PDF metadata author is 'Matsya Project Team' and title is set."""
    db = get_session_factory()()
    try:
        _create_test_result(db, tank_name="Metadata Tank", job_id="test-meta-job")
        resp = client.get("/api/v1/results/test-meta-job/report.pdf")
        assert resp.status_code == 200

        reader = pypdf.PdfReader(io.BytesIO(resp.content))
        meta = reader.metadata
        assert meta is not None
        assert meta.author == "Matsya Project Team"
        assert meta.title is not None
        assert "Matsya analysis report" in meta.title
    finally:
        db.close()


def test_b_pdf10_generation_performance(client: TestClient):
    """B-PDF10: Generation time under 8s for a result."""
    db = get_session_factory()()
    try:
        _create_test_result(db, tank_name="Perf Tank", job_id="test-perf-job")
        pdf_file = get_output_dir("test-perf-job") / "report.pdf"
        if pdf_file.exists():
            pdf_file.unlink()

        t0 = time.time()
        resp = client.get("/api/v1/results/test-perf-job/report.pdf")
        t1 = time.time()

        assert resp.status_code == 200
        assert (t1 - t0) < 8.0, f"Generation took {t1 - t0:.2f}s (expected < 8.0s)"
    finally:
        db.close()

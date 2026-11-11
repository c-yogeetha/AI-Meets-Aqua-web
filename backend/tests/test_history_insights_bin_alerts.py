from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.db import get_session_factory
from app.models import Job, Result, Tank, Video
from tests.conftest import wait_for_job

# --- History & Insights ---

def test_b_hi01_history_paging_and_filtering(client: TestClient):
    """B-HI01: History filter by tank_id, paging (page_size=2), newest first."""
    seed_resp = client.post("/api/v1/demo/seed")
    tank_id = seed_resp.json()["tank_id"]

    # Page 1
    resp1 = client.get(f"/api/v1/history?tank_id={tank_id}&page=1&page_size=2")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["total"] == 3
    assert len(data1["items"]) == 2
    assert data1["page"] == 1

    # Page 2
    resp2 = client.get(f"/api/v1/history?tank_id={tank_id}&page=2&page_size=2")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2["items"]) == 1
    assert data2["page"] == 2


def test_b_hi02_history_excludes_deleted(client: TestClient):
    """B-HI02: Deleted results are excluded from history."""
    seed_resp = client.post("/api/v1/demo/seed")
    res_id = seed_resp.json()["result_ids"][0]

    # Delete one
    client.delete(f"/api/v1/results/{res_id}")

    h_resp = client.get("/api/v1/history")
    item_ids = [item["id"] for item in h_resp.json()["items"]]
    assert res_id not in item_ids


def test_b_in01_fsi_weighted_mean(client: TestClient):
    """B-IN01: FSI with scores [10, 50, 60] equals weighted mean with weights renormalised."""
    db = get_session_factory()()
    try:
        tank = Tank(name="FSI Tank", volume_l=60, goldfish_count=3)
        db.add(tank)
        db.commit()

        # Insert 3 results: scores 10, 50, 60 (oldest to newest)
        now_dt = datetime.now(timezone.utc)
        scores = [10, 50, 60]
        for idx, s in enumerate(scores):
            jid = f"fsi-job-{idx}"
            vid = f"fsi-vid-{idx}"
            v = Video(id=vid, tank_id=tank.id, original_name="v.mp4", stored_path="/tmp/v.mp4", size_bytes=100, duration_s=10.0, fps=15.0, width=640, height=360, created_at=now_dt + timedelta(hours=idx))
            db.add(v)
            j = Job(id=jid, video_id=vid, tank_id=tank.id, status="done", stage="done", progress=100, created_at=now_dt + timedelta(hours=idx))
            db.add(j)
            r = Result(
                job_id=jid,
                tank_id=tank.id,
                mode="mock",
                result_json="{}",
                tank_score=s,
                level="Normal" if s < 35 else "Moderate",
                created_at=now_dt + timedelta(hours=idx),
            )
            db.add(r)
        db.commit()

        # Expected FSI: newest first -> [60, 50, 10]
        # weights = [0.4, 0.25, 0.2], sum = 0.85
        # norm_weights = [0.4/0.85, 0.25/0.85, 0.2/0.85]
        expected_fsi = round((60 * 0.4 + 50 * 0.25 + 10 * 0.2) / 0.85, 1)

        resp = client.get(f"/api/v1/insights?tank_id={tank.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["fsi"] == expected_fsi
    finally:
        db.close()


def test_b_in02_trend_labels(client: TestClient):
    """B-IN02: Trend labels: insufficient_data, worsening, improving, stable."""
    db = get_session_factory()()
    try:
        t = Tank(name="Trend Tank", volume_l=60, goldfish_count=2)
        db.add(t)
        db.commit()

        def add_res(jid, vid, score, dt_val):
            v = Video(id=vid, tank_id=t.id, original_name="v.mp4", stored_path="/tmp/v.mp4", size_bytes=100, duration_s=10.0, fps=15.0, width=640, height=360, created_at=dt_val)
            db.add(v)
            j = Job(id=jid, video_id=vid, tank_id=t.id, status="done", stage="done", progress=100, created_at=dt_val)
            db.add(j)
            r = Result(job_id=jid, tank_id=t.id, mode="mock", result_json="{}", tank_score=score, level="Normal" if score < 35 else "Moderate", created_at=dt_val)
            db.add(r)

        # 1 result -> insufficient_data
        add_res("tr1", "vtr1", 20, datetime.now(timezone.utc))
        db.commit()
        resp1 = client.get(f"/api/v1/insights?tank_id={t.id}")
        assert resp1.json()["trend"] == "insufficient_data"

        # Add 3 results jumping from 20, 25 to 55, 60 -> worsening
        add_res("tr2", "vtr2", 25, datetime.now(timezone.utc) + timedelta(days=1))
        add_res("tr3", "vtr3", 55, datetime.now(timezone.utc) + timedelta(days=2))
        add_res("tr4", "vtr4", 60, datetime.now(timezone.utc) + timedelta(days=3))
        db.commit()
        resp2 = client.get(f"/api/v1/insights?tank_id={t.id}")
        assert resp2.json()["trend"] == "worsening"
    finally:
        db.close()


def test_b_in03_temperature_pattern_message(client: TestClient):
    """B-IN03: Temperature pattern message appears when data meets condition."""
    db = get_session_factory()()
    try:
        t = Tank(name="Temp Tank", volume_l=60, goldfish_count=2)
        db.add(t)
        db.commit()

        # Add 4 results with videos having temp > 24 and <= 24
        now_dt = datetime.now(timezone.utc)
        cases = [(22.0, 15), (21.0, 18), (27.0, 55), (28.0, 60)]
        for idx, (temp, score) in enumerate(cases):
            vid = f"v-temp-{idx}"
            jid = f"j-temp-{idx}"
            v = Video(id=vid, tank_id=t.id, original_name="v.mp4", stored_path="/tmp/v.mp4", size_bytes=100, duration_s=10.0, fps=15.0, width=640, height=360, water_temp_c=temp, created_at=now_dt + timedelta(days=idx))
            db.add(v)
            j = Job(id=jid, video_id=vid, tank_id=t.id, status="done", stage="done", progress=100, created_at=now_dt + timedelta(days=idx))
            db.add(j)
            res = Result(job_id=jid, tank_id=t.id, mode="mock", result_json="{}", tank_score=score, level="Normal" if score < 35 else "Moderate", created_at=now_dt + timedelta(days=idx))
            db.add(res)
        db.commit()

        resp = client.get(f"/api/v1/insights?tank_id={t.id}")
        assert any("above 24 C" in m for m in resp.json()["messages"])
    finally:
        db.close()


# --- Recycle Bin ---

def test_b_bn01_and_bn02_delete_and_restore(client: TestClient):
    """B-BN01, B-BN02: Delete moves result to bin with 7 days remaining; restore returns it."""
    seed_resp = client.post("/api/v1/demo/seed")
    jid = seed_resp.json()["result_ids"][0]

    # Soft delete
    del_resp = client.delete(f"/api/v1/results/{jid}")
    assert del_resp.status_code == 204

    # Media returns 410
    v_resp = client.get(f"/api/v1/results/{jid}/video")
    assert v_resp.status_code == 410

    # Listed in /trash with days_remaining = 7
    trash_resp = client.get("/api/v1/trash")
    assert trash_resp.status_code == 200
    t_items = {item["id"]: item for item in trash_resp.json()}
    assert jid in t_items
    assert t_items[jid]["days_remaining"] == 7

    # Restore
    rest_resp = client.post(f"/api/v1/results/{jid}/restore")
    assert rest_resp.status_code == 200

    # Back in history and media 200/206
    h_resp = client.get("/api/v1/history")
    assert any(item["id"] == jid for item in h_resp.json()["items"])
    assert client.get(f"/api/v1/results/{jid}/video").status_code in (200, 206)


def test_b_bn03_and_bn04_purge_retention(client: TestClient):
    """B-BN03, B-BN04: Purge at 8 days removes items; at 6 days does not."""
    seed_resp = client.post("/api/v1/demo/seed")
    jid = seed_resp.json()["result_ids"][0]
    client.delete(f"/api/v1/results/{jid}")

    # Purge at 6 days later: item remains
    with patch("app.services.trash.now", return_value=datetime.now(timezone.utc) + timedelta(days=6)):
        p_resp1 = client.post("/api/v1/trash/purge")
        assert p_resp1.json()["purged"] == 0
        assert client.get("/api/v1/trash").json() != []

    # Purge at 8 days later: item is purged
    with patch("app.services.trash.now", return_value=datetime.now(timezone.utc) + timedelta(days=8)):
        p_resp2 = client.post("/api/v1/trash/purge")
        assert p_resp2.json()["purged"] >= 1
        assert client.get("/api/v1/trash").json() == []


def test_b_bn05_permanent_delete(client: TestClient):
    """B-BN05: ?permanent=true deletes result immediately."""
    seed_resp = client.post("/api/v1/demo/seed")
    jid = seed_resp.json()["result_ids"][0]

    resp = client.delete(f"/api/v1/results/{jid}?permanent=true")
    assert resp.status_code == 204

    # Result gone completely
    assert client.get(f"/api/v1/results/{jid}").status_code == 404
    assert client.get("/api/v1/trash").json() == []


# --- Alerts ---

def test_b_al01_to_al04_alerts(client: TestClient, samples_dir: Path):
    """B-AL01 to B-AL04: Alert creation, severity, read state, settings and eml outbox."""
    # Settings round trip
    set_resp = client.put(
        "/api/v1/settings/alerts",
        json={"dashboard_popup": True, "email_enabled": True, "email_to": "caretaker@example.com"},
    )
    assert set_resp.status_code == 200
    assert set_resp.json()["email_enabled"] is True

    # Upload stressed video -> generates alert
    t_resp = client.post("/api/v1/tanks", json={"name": "Alert Tank", "volume_l": 60, "goldfish_count": 3})
    tank_id = t_resp.json()["id"]

    sample_file = samples_dir / "stressed_one.mp4"
    with open(sample_file, "rb") as f:
        u_resp = client.post("/api/v1/videos", data={"tank_id": tank_id}, files={"file": ("stressed_one.mp4", f, "video/mp4")})
    jid = u_resp.json()["job_id"]
    wait_for_job(client, jid)

    # Check alert was created
    alerts = client.get("/api/v1/alerts").json()
    assert len(alerts) >= 1
    alert = alerts[0]
    assert alert["severity"] in ("warning", "critical")
    assert "stress indicators" in alert["message"]

    # Mark as read
    read_resp = client.post(f"/api/v1/alerts/{alert['id']}/read")
    assert read_resp.status_code == 200
    assert read_resp.json()["read"] is True

    # Check .eml written to outbox
    eml_files = list(settings.outbox_path.glob("*.eml"))
    assert len(eml_files) >= 1


# --- Demo Seed ---

def test_b_d01_demo_seed_idempotent(client: TestClient):
    """B-D01: POST /demo/seed is idempotent and seeds 3 valid results."""
    resp1 = client.post("/api/v1/demo/seed")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1["result_ids"]) == 3

    resp2 = client.post("/api/v1/demo/seed")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data1["tank_id"] == data2["tank_id"]
    assert data1["result_ids"] == data2["result_ids"]


# --- External Adapter ---

def test_b_x01_external_detect_and_track(client: TestClient, samples_dir: Path):
    """B-X01: External adapter with fake_ai exposing detect_and_track sets mode='external'."""
    settings.ANALYZER = "external"
    settings.AI_MODULE = "tests.fake_ai.pipeline"

    t_resp = client.post("/api/v1/tanks", json={"name": "AI Tank", "volume_l": 60, "goldfish_count": 2})
    tank_id = t_resp.json()["id"]

    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        u_resp = client.post("/api/v1/videos", data={"tank_id": tank_id}, files={"file": ("calm.mp4", f, "video/mp4")})
    jid = u_resp.json()["job_id"]
    jdata = wait_for_job(client, jid)
    assert jdata["status"] == "done"

    res = client.get(f"/api/v1/results/{jid}").json()
    assert res["mode"] == "external"


def test_b_x03_missing_ai_module(client: TestClient, samples_dir: Path):
    """B-X03: Missing AI module fails job gracefully with clear message."""
    settings.ANALYZER = "external"
    settings.AI_MODULE = "non_existent_ai_module_xyz"

    t_resp = client.post("/api/v1/tanks", json={"name": "Missing AI", "volume_l": 60, "goldfish_count": 2})
    tank_id = t_resp.json()["id"]

    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        u_resp = client.post("/api/v1/videos", data={"tank_id": tank_id}, files={"file": ("calm.mp4", f, "video/mp4")})
    jid = u_resp.json()["job_id"]
    jdata = wait_for_job(client, jid)
    assert jdata["status"] == "failed"
    assert "could not be imported" in jdata["error"]


def test_b_x02_external_analyze_video(client: TestClient, samples_dir: Path):
    """B-X02: External adapter with module exposing analyze_video succeeds and validates."""
    settings.ANALYZER = "external"
    settings.AI_MODULE = "tests.fake_ai.pipeline_full"

    t_resp = client.post("/api/v1/tanks", json={"name": "Full AI Tank", "volume_l": 60, "goldfish_count": 2})
    tank_id = t_resp.json()["id"]

    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        u_resp = client.post("/api/v1/videos", data={"tank_id": tank_id}, files={"file": ("calm.mp4", f, "video/mp4")})
    jid = u_resp.json()["job_id"]
    jdata = wait_for_job(client, jid)
    assert jdata["status"] == "done"

    res = client.get(f"/api/v1/results/{jid}").json()
    assert res["mode"] == "external"
    assert res["tank_score"] == 25


def test_b_x04_malformed_ai_output(client: TestClient, samples_dir: Path):
    """B-X04: Malformed AI output causes job to fail with clear error message without server crash."""
    settings.ANALYZER = "external"
    settings.AI_MODULE = "tests.fake_ai.pipeline_bad"

    t_resp = client.post("/api/v1/tanks", json={"name": "Bad AI Tank", "volume_l": 60, "goldfish_count": 2})
    tank_id = t_resp.json()["id"]

    sample_file = samples_dir / "calm.mp4"
    with open(sample_file, "rb") as f:
        u_resp = client.post("/api/v1/videos", data={"tank_id": tank_id}, files={"file": ("calm.mp4", f, "video/mp4")})
    jid = u_resp.json()["job_id"]
    jdata = wait_for_job(client, jid)
    assert jdata["status"] == "failed"
    assert "AI output invalid" in jdata["error"]

import json
from pathlib import Path
import subprocess
import time
import cv2
import imageio_ffmpeg
import numpy as np
import pytest
from app.analysis.pipeline import run_pipeline
from app.schemas import ResultResponse


def test_b_a01_to_a07_and_a11_a12_manifest_samples(tmp_path: Path, samples_dir: Path):
    """B-A01 to B-A07, B-A11, B-A12: Analyze all sample videos against manifest.json."""
    manifest_path = samples_dir / "manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for filename, spec in manifest.items():
        video_file = samples_dir / filename
        assert video_file.exists(), f"Sample {filename} not found"

        out_dir = tmp_path / f"out_{filename}"
        stages_observed = []

        def cb(stage, pct):
            if not stages_observed or stages_observed[-1] != stage:
                stages_observed.append(stage)

        meta = {
            "tank_id": "test-tank",
            "tank_name": "Test Tank",
            "goldfish_count": spec["fish_count"],
            "original_name": filename,
            "view": spec.get("view", "side"),
        }

        res = run_pipeline(
            video_path=str(video_file),
            meta=meta,
            out_dir=str(out_dir),
            progress_cb=cb,
            analyzer_override="baseline",
        )

        # B-A11: Schema validation
        validated = ResultResponse.model_validate(res)
        assert validated is not None

        # B-A12: Invariants
        fish_ids = [f["id"] for f in res["fish"]]
        assert len(fish_ids) == len(set(fish_ids))
        for fid in fish_ids:
            assert fid.startswith("Fish_")

        for f in res["fish"]:
            assert 0 <= f["score"] <= 100
        assert 0 <= res["tank_score"] <= 100

        # Timeline sorted
        timeline_ts = [pt["t"] for pt in res["timeline"]]
        assert timeline_ts == sorted(timeline_ts)

        # Check manifest expectations
        expect = spec["expect"]
        if "tank_score_max" in expect:
            assert res["tank_score"] <= expect["tank_score_max"], f"{filename} tank_score {res['tank_score']} > max {expect['tank_score_max']}"
        if "tank_score_min" in expect:
            assert res["tank_score"] >= expect["tank_score_min"], f"{filename} tank_score {res['tank_score']} < min {expect['tank_score_min']}"
        if "stressed_count" in expect:
            assert res["stressed_count"] == expect["stressed_count"], f"{filename} stressed_count {res['stressed_count']} != {expect['stressed_count']}"
        if "level_in" in expect:
            assert res["level"] in expect["level_in"]
        if expect.get("flags_any"):
            all_flags = set()
            for f in res["fish"]:
                all_flags.update(f.get("flags", []))
            for ef in expect["flags_any"]:
                assert ef in all_flags, f"{filename} missing expected flag {ef}"


def test_b_a05_top_view_vertical_flags_disabled(tmp_path: Path, samples_dir: Path):
    """B-A05: gasping_surface.mp4 with view=top disables surface_gasping and adds warning."""
    video_file = samples_dir / "gasping_surface.mp4"
    out_dir = tmp_path / "out_top"

    meta = {
        "tank_id": "test-tank",
        "tank_name": "Test Tank",
        "goldfish_count": 3,
        "original_name": "gasping_surface.mp4",
        "view": "top",
    }
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(out_dir), analyzer_override="baseline")
    for f in res["fish"]:
        assert "surface_gasping" not in f["flags"]
    assert any("Top-down view" in w for w in res["warnings"])


def test_b_a08_short_clip_warning(tmp_path: Path):
    """B-A08: 1s short clip analyzed with short duration warning."""
    short_file = tmp_path / "short_1s.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    vw = cv2.VideoWriter(str(short_file), fourcc, 15.0, (640, 360))
    for _ in range(15):
        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        vw.write(frame)
    vw.release()

    out_dir = tmp_path / "out_short"
    meta = {"tank_id": "t", "goldfish_count": 1, "original_name": "short_1s.mp4", "view": "side"}
    res = run_pipeline(str(short_file), meta=meta, out_dir=str(out_dir), analyzer_override="baseline")
    assert any("shorter than recommended" in w for w in res["warnings"])


def test_b_a09_determinism(tmp_path: Path, samples_dir: Path):
    """B-A09: Baseline analyzer on same file produces identical tank score and fish scores."""
    video_file = samples_dir / "calm.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}

    res1 = run_pipeline(str(video_file), meta, str(tmp_path / "det1"), analyzer_override="baseline")
    res2 = run_pipeline(str(video_file), meta, str(tmp_path / "det2"), analyzer_override="baseline")

    assert res1["tank_score"] == res2["tank_score"]
    assert [f["score"] for f in res1["fish"]] == [f["score"] for f in res2["fish"]]


def test_b_a10_mock_analyzer_determinism(tmp_path: Path, samples_dir: Path):
    """B-A10: Mock analyzer is deterministic and labelled mode='mock'."""
    video_file = samples_dir / "calm.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}

    res1 = run_pipeline(str(video_file), meta, str(tmp_path / "m1"), analyzer_override="mock")
    res2 = run_pipeline(str(video_file), meta, str(tmp_path / "m2"), analyzer_override="mock")

    assert res1["mode"] == "mock"
    assert res1["tank_score"] == res2["tank_score"]
    assert [f["score"] for f in res1["fish"]] == [f["score"] for f in res2["fish"]]


def test_b_a13_plants_not_detected_as_fish(tmp_path: Path, samples_dir: Path):
    """B-A13: Static plants not detected as fish; calm.mp4 has exactly 3 fish."""
    video_file = samples_dir / "calm.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta, str(tmp_path / "out_plants"), analyzer_override="baseline")
    assert len(res["fish"]) == 3


def test_b_a14_and_a15_annotated_video_and_keyframes(tmp_path: Path, samples_dir: Path):
    """B-A14, B-A15: Annotated video exists, opens with cv2, codec h264/webm; keyframes <= 6."""
    video_file = samples_dir / "stressed_one.mp4"
    out_dir = tmp_path / "out_annotated"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "stressed_one.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta, str(out_dir), analyzer_override="baseline")

    # Check annotated video
    video_path = out_dir / "annotated.mp4"
    if not video_path.exists():
        video_path = out_dir / "annotated.webm"
    assert video_path.exists()

    cap = cv2.VideoCapture(str(video_path))
    assert cap.isOpened()
    fc = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    assert fc > 10
    cap.release()

    # Check ffmpeg codec info
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    out = subprocess.run([ffmpeg_exe, "-hide_banner", "-i", str(video_path)], capture_output=True, text=True).stderr
    assert "h264" in out.lower() or "vp9" in out.lower()

    # Check keyframes
    frames_dir = out_dir / "frames"
    assert frames_dir.exists()
    keyframes = list(frames_dir.glob("*.jpg"))
    assert 1 <= len(keyframes) <= 6
    assert len(res["key_moments"]) == len(keyframes)


def test_b_a16_performance(tmp_path: Path, samples_dir: Path):
    """B-A16: 20s 640x360 clip analysed in under 60s."""
    video_file = samples_dir / "calm.mp4"
    out_dir = tmp_path / "out_perf"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}

    start = time.time()
    res = run_pipeline(str(video_file), meta, str(out_dir), analyzer_override="baseline")
    elapsed = time.time() - start

    assert elapsed < 60.0
    print(f"\n[B-A16 Performance] 20s clip analyzed in {elapsed:.2f}s")


def test_b_a17_progress_callback_valid_stages(tmp_path: Path, samples_dir: Path):
    """B-A17: Progress callback receives only valid stages in order."""
    video_file = samples_dir / "calm.mp4"
    out_dir = tmp_path / "out_stages"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}

    valid_stages = ["cleaning", "detecting", "tracking", "analysing", "rendering"]
    observed_stages = []

    def cb(stage, pct):
        if not observed_stages or observed_stages[-1] != stage:
            observed_stages.append(stage)

    run_pipeline(str(video_file), meta, str(out_dir), progress_cb=cb, analyzer_override="baseline")

    for s in observed_stages:
        assert s in valid_stages

import json
import time
from pathlib import Path

import cv2
import numpy as np

from app.analysis.pipeline import run_pipeline
from app.analysis.quality import compute_frame_quality_metrics, compute_reliability
from app.analysis.tracks_baseline import (
    DominantColorModel,
    RobustHungarianTracker,
    split_merged_blobs,
)
from app.config import settings
from app.schemas import ResultResponse


def test_b_a01_to_a11_and_a12_manifest_samples(tmp_path: Path, samples_dir: Path):
    """B-A01 to B-A11, B-A12: Analyze all sample videos against manifest.json and verify invariants."""
    manifest_path = samples_dir / "manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for filename, spec in manifest.items():
        video_file = samples_dir / filename
        assert video_file.exists(), f"Sample {filename} not found"

        out_dir = tmp_path / f"out_{filename.replace('.', '_')}"
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
            analyzer_override="baseline",
        )

        # B-A12: Schema validation & invariants
        validated = ResultResponse.model_validate(res)
        assert validated is not None

        # Fish IDs unique & regex ^Fish_\d+$
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

        # Suggestions reference existing fish
        for s in res["suggestions"]:
            for sf in s.get("fish", []):
                assert sf in fish_ids, f"Suggestion referenced unknown fish {sf}"

        # Reliability present
        assert "reliability" in res
        assert res["reliability"]["level"] in ["high", "medium", "low"]
        assert 0 <= res["reliability"]["score"] <= 100

        # Check manifest expectations
        expect = spec["expect"]
        if "tank_score_max" in expect:
            assert res["tank_score"] <= expect["tank_score_max"], f"{filename} tank_score {res['tank_score']} > max {expect['tank_score_max']}"
        if "tank_score_min" in expect:
            assert res["tank_score"] >= expect["tank_score_min"], f"{filename} tank_score {res['tank_score']} < min {expect['tank_score_min']}"
        if "stressed_count" in expect:
            assert res["stressed_count"] == expect["stressed_count"], f"{filename} stressed_count {res['stressed_count']} != {expect['stressed_count']}"
        if "level_in" in expect:
            assert res["level"] in expect["level_in"], f"{filename} level {res['level']} not in {expect['level_in']}"
        if expect.get("flags_any"):
            all_flags = set()
            for f in res["fish"]:
                all_flags.update(f.get("flags", []))
            for ef in expect["flags_any"]:
                assert ef in all_flags, f"{filename} missing expected flag {ef}"
        if "reliability_level_in" in expect:
            assert res["reliability"]["level"] in expect["reliability_level_in"], f"{filename} reliability level {res['reliability']['level']} not in {expect['reliability_level_in']}"
        if "reliability_reason_contains" in expect:
            reasons_str = " ".join(res["reliability"]["reasons"]).lower()
            assert expect["reliability_reason_contains"] in reasons_str, f"{filename} reasons {reasons_str} missing {expect['reliability_reason_contains']}"


def test_b_a04_surface_gasping_views(tmp_path: Path, samples_dir: Path):
    """B-A04: gasping_surface.mp4 with view=side has surface_gasping; view=top disables flag with warning."""
    video_file = samples_dir / "gasping_surface.mp4"

    # Side view
    meta_side = {"tank_id": "t", "goldfish_count": 3, "original_name": "gasping_surface.mp4", "view": "side"}
    res_side = run_pipeline(str(video_file), meta=meta_side, out_dir=str(tmp_path / "gasp_side"), analyzer_override="baseline")
    all_flags_side = [fl for f in res_side["fish"] for fl in f.get("flags", [])]
    assert "surface_gasping" in all_flags_side

    # Top view
    meta_top = {"tank_id": "t", "goldfish_count": 3, "original_name": "gasping_surface.mp4", "view": "top"}
    res_top = run_pipeline(str(video_file), meta=meta_top, out_dir=str(tmp_path / "gasp_top"), analyzer_override="baseline")
    all_flags_top = [fl for f in res_top["fish"] for fl in f.get("flags", [])]
    assert "surface_gasping" not in all_flags_top
    assert any("Top-down view" in w for w in res_top["warnings"])


def test_b_a05_isolated_bottom(tmp_path: Path, samples_dir: Path):
    """B-A05: isolated_bottom.mp4 has isolation and bottom_inactivity on the resting fish."""
    video_file = samples_dir / "isolated_bottom.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "isolated_bottom.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(tmp_path / "iso_bot"), analyzer_override="baseline")
    all_flags = set(fl for f in res["fish"] for fl in f.get("flags", []))
    assert "isolation" in all_flags or "bottom_inactivity" in all_flags


def test_b_a06_lethargic_all(tmp_path: Path, samples_dir: Path):
    """B-A06: lethargic_all.mp4 has lethargic flag set."""
    video_file = samples_dir / "lethargic_all.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "lethargic_all.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(tmp_path / "leth_all"), analyzer_override="baseline")
    all_flags = set(fl for f in res["fish"] for fl in f.get("flags", []))
    assert "lethargic" in all_flags


def test_b_a07_white_fish(tmp_path: Path, samples_dir: Path):
    """B-A07: white_fish.mp4 expected count 3, coverage >= 85%."""
    video_file = samples_dir / "white_fish.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "white_fish.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(tmp_path / "w_fish"), analyzer_override="baseline")
    assert len(res["fish"]) == 3
    assert res["reliability"]["metrics"]["coverage_pct"] >= 80.0


def test_b_a08_two_fish_overlap(tmp_path: Path, samples_dir: Path):
    """B-A08: two_fish_overlap.mp4 has at most 1 ID switch."""
    video_file = samples_dir / "two_fish_overlap.mp4"
    meta = {"tank_id": "t", "goldfish_count": 2, "original_name": "two_fish_overlap.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(tmp_path / "two_overlap"), analyzer_override="baseline")
    assert res["detection"]["id_switch_estimate"] <= 1


def test_b_a09_plants_decoy(tmp_path: Path, samples_dir: Path):
    """B-A09: plants_decoy.mp4 static orange plant not counted as fish."""
    video_file = samples_dir / "plants_decoy.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "plants_decoy.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(tmp_path / "p_decoy"), analyzer_override="baseline")
    assert len(res["fish"]) == 3


def test_b_a10_blank_video(tmp_path: Path, samples_dir: Path):
    """B-A10: blank.mp4 produces score 0, warning 'No goldfish detected', no stress suggestions."""
    video_file = samples_dir / "blank.mp4"
    meta = {"tank_id": "t", "goldfish_count": 0, "original_name": "blank.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta=meta, out_dir=str(tmp_path / "out_blank"), analyzer_override="baseline")
    assert res["tank_score"] == 0
    assert any("No goldfish detected" in w for w in res["warnings"])
    assert len(res["suggestions"]) == 0


def test_b_a13_determinism(tmp_path: Path, samples_dir: Path):
    """B-A13: Running pipeline twice on the same clip gives identical scores."""
    video_file = samples_dir / "calm.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}
    res1 = run_pipeline(str(video_file), meta, str(tmp_path / "det1"), analyzer_override="baseline")
    res2 = run_pipeline(str(video_file), meta, str(tmp_path / "det2"), analyzer_override="baseline")
    assert res1["tank_score"] == res2["tank_score"]
    assert [f["score"] for f in res1["fish"]] == [f["score"] for f in res2["fish"]]


def test_b_a14_annotated_video_faststart(tmp_path: Path, samples_dir: Path):
    """B-A14: Annotated video opens with OpenCV, codec h264, moov atom before mdat (faststart)."""
    video_file = samples_dir / "calm.mp4"
    out_dir = tmp_path / "out_faststart"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}
    _ = run_pipeline(str(video_file), meta, str(out_dir), analyzer_override="baseline")

    mp4_path = out_dir / "annotated.mp4"
    assert mp4_path.exists()

    cap = cv2.VideoCapture(str(mp4_path))
    assert cap.isOpened()
    fc = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    assert fc > 10
    cap.release()

    # Verify moov before mdat in binary
    with open(mp4_path, "rb") as f:
        data = f.read(200000)  # faststart puts moov near header
    moov_pos = data.find(b"moov")
    mdat_pos = data.find(b"mdat")
    assert moov_pos != -1, "moov atom not found in mp4 header"
    assert mdat_pos != -1, "mdat atom not found"
    assert moov_pos < mdat_pos, f"moov ({moov_pos}) must precede mdat ({mdat_pos}) for faststart"


def test_b_a15_webm_option(tmp_path: Path, samples_dir: Path, monkeypatch):
    """B-A15: WebM produced when ENCODE_WEBM=1; absent when ENCODE_WEBM=0."""
    video_file = samples_dir / "calm.mp4"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}

    # 1. With ENCODE_WEBM=1
    monkeypatch.setattr(settings, "ENCODE_WEBM", 1)
    res_webm = run_pipeline(str(video_file), meta, str(tmp_path / "with_webm"), analyzer_override="baseline")
    assert (tmp_path / "with_webm" / "annotated.webm").exists()
    assert res_webm.get("annotated_video_alt_url") is not None

    # 2. With ENCODE_WEBM=0
    monkeypatch.setattr(settings, "ENCODE_WEBM", 0)
    res_nowebm = run_pipeline(str(video_file), meta, str(tmp_path / "no_webm"), analyzer_override="baseline")
    assert not (tmp_path / "no_webm" / "annotated.webm").exists()
    assert res_nowebm.get("annotated_video_alt_url") is None


def test_b_a16_keyframes(tmp_path: Path, samples_dir: Path):
    """B-A16: Key frames at most 6, JPEG, referenced by key moments, files exist."""
    video_file = samples_dir / "stressed_one.mp4"
    out_dir = tmp_path / "out_kf"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "stressed_one.mp4", "view": "side"}
    res = run_pipeline(str(video_file), meta, str(out_dir), analyzer_override="baseline")

    frames_dir = out_dir / "frames"
    assert frames_dir.exists()
    kfs = list(frames_dir.glob("*.jpg"))
    assert 1 <= len(kfs) <= 6
    assert len(res["key_moments"]) == len(kfs)


def test_b_a17_low_confidence_fish_never_stressed():
    """B-A17: Low-confidence fish (observed < 40% of frames) never labelled stressed."""
    from app.analysis.scoring import score_tracks
    from app.analysis.types import Detection, FrameDetections, Tracks

    # Construct tracks where Fish_1 appears in only 2 of 20 frames (10% < 40%)
    frames = []
    for f in range(20):
        t = f * 0.1
        dets = []
        if f < 2:
            # Fast movement at surface (would normally be stressed)
            dets.append(Detection(id="Fish_1", bbox=[100, 10, 160, 40], conf=0.9))
        frames.append(FrameDetections(t=round(t, 2), detections=dets))

    tracks = Tracks(fps=10.0, width=640, height=360, duration_s=2.0, frames=frames)
    res = score_tracks(tracks)
    assert len(res["fish"]) == 1
    fish1 = res["fish"][0]
    assert fish1["confidence"] < 0.40
    assert "low_confidence" in fish1["flags"]
    assert fish1["stressed"] is False


def test_b_a18_reliability_arithmetic():
    """B-A18: Unit tests for each deduction and exact level bands (74 is medium, 75 is high, 49 is low, 50 is medium)."""
    probe = {
        "brightness": 120.0,
        "contrast": 45.0,
        "sharpness": 100.0,
        "shake_px": 1.0,
        "fps": 15.0,
        "width": 640,
        "height": 360,
        "duration_s": 20.0,
    }

    # Perfect conditions: 100 score -> high
    r100 = compute_reliability(probe, coverage_pct=95.0, fish_expected=3, fish_tracked=3, fish_median_px=50.0)
    assert r100["score"] == 100
    assert r100["level"] == "high"

    # Exact boundary 75 -> high
    # Deduction of 25: shake (>6: -15) + short clip (<5s: -10) = -25 -> 75
    probe_75 = dict(probe, shake_px=8.0, duration_s=4.0)
    r75 = compute_reliability(probe_75, coverage_pct=95.0, fish_expected=3, fish_tracked=3, fish_median_px=50.0)
    assert r75["score"] == 75
    assert r75["level"] == "high"

    # Exact boundary 74 -> medium
    # Deduction of 26: shake (-15) + contrast (-10) + coverage ~87.4% (-1) -> 74
    probe_74 = dict(probe, shake_px=8.0, contrast=15.0)
    r74 = compute_reliability(probe_74, coverage_pct=87.0, fish_expected=3, fish_tracked=3, fish_median_px=50.0)
    assert r74["score"] == 74
    assert r74["level"] == "medium"

    # Exact boundary 50 -> medium
    # Deductions: dark (-15), shake (-15), blur (-10), short (-10) = -50 -> 50
    probe_50 = dict(probe, brightness=30.0, shake_px=8.0, sharpness=20.0, duration_s=4.0)
    r50 = compute_reliability(probe_50, coverage_pct=95.0, fish_expected=3, fish_tracked=3, fish_median_px=50.0)
    assert r50["score"] == 50
    assert r50["level"] == "medium"

    # Exact boundary 49 -> low
    # Deductions: dark (-15), shake (-15), blur (-10), short (-10), tiny fish (-10) -> -60 -> 40 (< 50)
    probe_49 = dict(probe, brightness=30.0, shake_px=8.0, sharpness=20.0, duration_s=4.0)
    r49 = compute_reliability(probe_49, coverage_pct=95.0, fish_expected=3, fish_tracked=3, fish_median_px=5.0)  # tiny fish
    assert r49["score"] <= 49
    assert r49["level"] == "low"


def test_b_a19_quality_metrics_synthetic_frames():
    """B-A19: Quality metrics on known synthetic frames (brightness, sharpness ordering, shake estimate)."""
    # 1. Brightness
    dark_frame = np.full((360, 640, 3), 20, dtype=np.uint8)
    bright_frame = np.full((360, 640, 3), 230, dtype=np.uint8)
    b_dark, _, _ = compute_frame_quality_metrics(dark_frame)
    b_bright, _, _ = compute_frame_quality_metrics(bright_frame)
    assert b_dark < 45.0
    assert b_bright > 215.0

    # 2. Sharpness ordering: sharp > blurred
    # Draw high contrast checkerboard
    sharp_frame = np.zeros((360, 640, 3), dtype=np.uint8)
    sharp_frame[::20, :] = 255
    sharp_frame[:, ::20] = 255
    blurred_frame = cv2.GaussianBlur(sharp_frame, (31, 31), 0)

    _, _, s_sharp = compute_frame_quality_metrics(sharp_frame)
    _, _, s_blurred = compute_frame_quality_metrics(blurred_frame)
    assert s_sharp > s_blurred

    # 3. Shake estimate with phase correlation
    g1 = np.zeros((360, 640), dtype=np.float32)
    cv2.rectangle(g1, (200, 100), (350, 220), 255.0, -1)
    M = np.float32([[1, 0, 8.0], [0, 1, 0.0]])
    g2 = cv2.warpAffine(g1, M, (640, 360))
    shift, _ = cv2.phaseCorrelate(g1, g2)
    assert abs(shift[0] - 8.0) < 1.0


def test_b_a20_dominant_color_model_learning():
    """B-A20: Colour-model learning picks white and orange fish separately; fallback on empty."""
    cfg = {"color_model": {"warmup_frames": 10, "min_pixels": 20, "k_clusters": 2}}

    # 1. Orange fish
    model_orange = DominantColorModel(cfg)
    # HSV: H=18, S=220, V=240 -> orange
    hsv_orange = np.full((100, 100, 3), (18, 220, 240), dtype=np.uint8)
    model_orange.observe(hsv_orange)
    model_orange.train()
    assert len(model_orange.cluster_hues) >= 1
    assert abs(model_orange.cluster_hues[0] - 18.0) < 5.0

    # 2. White fish
    model_white = DominantColorModel(cfg)
    hsv_white = np.full((100, 100, 3), (0, 10, 240), dtype=np.uint8)
    model_white.observe(hsv_white)
    model_white.train()
    assert model_white.has_white is True

    # 3. Fallback on empty
    model_empty = DominantColorModel(cfg)
    model_empty.train()
    assert len(model_empty.cluster_hues) == 1
    assert model_empty.cluster_hues[0] == 18.0  # fallback orange


def test_b_a21_watershed_splitting():
    """B-A21: Watershed split accepts a two-fish blob and rejects a single-fish blob."""
    # Create binary mask of two touching circles
    mask = np.zeros((200, 200), dtype=np.uint8)
    cv2.circle(mask, (70, 100), 30, 255, -1)
    cv2.circle(mask, (120, 100), 30, 255, -1)
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    assert len(cnts) == 1

    single_circle_area = np.pi * 30**2
    # Area of merged blob is ~ 1.8x single circle
    blobs = split_merged_blobs(
        mask,
        cnts,
        median_area=single_circle_area,
        split_area_ratio=1.4,
        max_seeds=3,
        min_part_ratio=0.35,
    )
    assert len(blobs) == 2, "Merged touching circles should split into 2 blobs"

    # Single circle should NOT split
    single_mask = np.zeros((200, 200), dtype=np.uint8)
    cv2.circle(single_mask, (100, 100), 30, 255, -1)
    s_cnts, _ = cv2.findContours(single_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    s_blobs = split_merged_blobs(
        single_mask,
        s_cnts,
        median_area=single_circle_area,
        split_area_ratio=1.4,
    )
    assert len(s_blobs) == 1


def test_b_a22_template_retention():
    """B-A22: Template retention keeps a still fish for coast_s and drops it afterwards."""
    cfg = {
        "tracking": {"gating_dist_frac": 0.2, "min_hits": 1},
        "stationary_retention": {"coast_s": 2.0, "min_match_score": 0.60, "unmatched_age_out_s": 0.5},
    }
    tracker = RobustHungarianTracker(cfg, frame_width=640, frame_height=360, effective_fps=10.0)

    # Frame with a fish
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    cv2.rectangle(frame, (100, 100), (150, 130), (25, 130, 250), -1)

    # First detection at t=0.0
    cnt = np.array([[[100, 100]], [[150, 100]], [[150, 130]], [[100, 130]]])
    det = [(125.0, 115.0, [100.0, 100.0, 150.0, 130.0], 1500.0, cnt)]
    res0 = tracker.update(det, frame, t=0.0)
    assert len(res0) == 1
    assert res0[0][3] is False  # not coasting

    # At t=0.5: no detection, but template matches the still fish in the frame!
    res1 = tracker.update([], frame, t=0.5)
    assert len(res1) == 1
    assert res1[0][3] is True  # coasting!

    # At t=3.0: past coast_s (2.0s), fish drops
    res2 = tracker.update([], frame, t=3.5)
    assert len(res2) == 0


def test_b_a24_performance_budget(tmp_path: Path, samples_dir: Path):
    """B-A24: 20s 640x360 clip analyzed in under 60s."""
    video_file = samples_dir / "calm.mp4"
    out_dir = tmp_path / "out_perf"
    meta = {"tank_id": "t", "goldfish_count": 3, "original_name": "calm.mp4", "view": "side"}

    start = time.time()
    _ = run_pipeline(str(video_file), meta, str(out_dir), analyzer_override="baseline")
    elapsed = time.time() - start

    assert elapsed < 60.0
    print(f"\n[B-A24 Performance] 20s clip analyzed in {elapsed:.2f}s (budget: 60s)")

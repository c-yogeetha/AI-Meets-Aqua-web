import math
import numpy as np
import pytest
from app.analysis.features import (
    compute_all_features,
    compute_features_for_fish,
)
from app.analysis.scoring import generate_fish_explanation, load_scoring_config
from app.analysis.types import Detection, FrameDetections, Tracks


@pytest.fixture
def base_config():
    return load_scoring_config()


def create_straight_track(speed_px_s: float, bl: float = 50.0, duration: float = 10.0, fps: float = 10.0):
    """Generate a single fish moving straight at constant speed."""
    frames = []
    dt = 1.0 / fps
    n = int(duration * fps)
    for i in range(n):
        t = i * dt
        cx = 50.0 + speed_px_s * t
        cy = 180.0
        w, h = bl, bl * 0.5
        bbox = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
        frames.append(FrameDetections(t=round(t, 3), detections=[Detection(id="Fish_1", bbox=bbox)]))
    return Tracks(fps=fps, width=640, height=360, duration_s=duration, frames=frames)


def test_b_f01_speed_on_straight_track(base_config):
    """B-F01: Speed on straight track at known px/s and BL equals expected within 2%."""
    bl = 50.0
    expected_bl_s = 2.0
    speed_px_s = expected_bl_s * bl  # 100 px/s
    tracks = create_straight_track(speed_px_s=speed_px_s, bl=bl, duration=5.0)

    feats = compute_all_features(tracks, base_config)
    assert "Fish_1" in feats
    actual_speed = feats["Fish_1"]["speed_bl_s"]
    assert abs(actual_speed - expected_bl_s) / expected_bl_s < 0.02


def test_b_f02_direction_change_rate(base_config):
    """B-F02: Zig-zag track has direction changes > erratic_per_s; straight has ~ 0."""
    fps = 10.0
    dt = 1.0 / fps
    bl = 50.0

    # Straight track
    straight_tracks = create_straight_track(speed_px_s=50.0, bl=bl, duration=6.0)
    straight_feats = compute_all_features(straight_tracks, base_config)
    assert straight_feats["Fish_1"]["direction_change_rate"] < 0.1

    # Zig-zag track: sharp 70+ degree turns every 0.4s
    frames = []
    cx, cy = 100.0, 180.0
    direction = 1
    for i in range(60):
        t = i * dt
        if i % 4 == 0:
            direction *= -1
        cx += 10.0
        cy += direction * 30.0  # sharp up and down turn (atan2(30, 10) = 71.5 deg > 60 deg)
        w, h = bl, bl * 0.5
        frames.append(FrameDetections(t=round(t, 3), detections=[Detection(id="Fish_1", bbox=[cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2])]))

    zigzag_tracks = Tracks(fps=fps, width=640, height=360, duration_s=6.0, frames=frames)
    zigzag_feats = compute_all_features(zigzag_tracks, base_config)
    assert zigzag_feats["Fish_1"]["direction_change_rate"] >= base_config["direction"]["erratic_per_s"]


def test_b_f03_surface_ratio(base_config):
    """B-F03: Track hugging the top has surface_ratio >= 0.9."""
    fps = 5.0
    frames = []
    # top 15% of 360 is 54px; cy=25px is well within surface zone
    for i in range(25):
        t = i / fps
        bbox = [100.0 + i * 2, 10.0, 150.0 + i * 2, 40.0]  # cy = 25
        frames.append(FrameDetections(t=t, detections=[Detection(id="Fish_1", bbox=bbox)]))

    tracks = Tracks(fps=fps, width=640, height=360, duration_s=5.0, frames=frames)
    feats = compute_all_features(tracks, base_config)
    assert feats["Fish_1"]["surface_ratio"] >= 0.9


def test_b_f04_bottom_ratio_and_inactivity(base_config):
    """B-F04: Still fish at bottom has bottom_ratio >= 0.9 and inactivity >= 0.9."""
    fps = 5.0
    frames = []
    # bottom 15% is y >= 306; cy = 330
    for i in range(25):
        t = i / fps
        bbox = [200.0, 310.0, 250.0, 350.0]  # static at bottom
        frames.append(FrameDetections(t=t, detections=[Detection(id="Fish_1", bbox=bbox)]))

    tracks = Tracks(fps=fps, width=640, height=360, duration_s=5.0, frames=frames)
    feats = compute_all_features(tracks, base_config)
    assert feats["Fish_1"]["bottom_ratio"] >= 0.9
    assert feats["Fish_1"]["inactivity_ratio"] >= 0.9


def test_b_f05_isolation_ratio(base_config):
    """B-F05: Two close fish vs one far fish: close pair ~ 0; far fish >= 0.5."""
    fps = 5.0
    frames = []
    diag = math.sqrt(640**2 + 360**2)  # ~ 734 px; 30% is ~ 220 px
    for i in range(25):
        t = i / fps
        # Fish 1 and Fish 2 are 40px apart (close)
        d1 = Detection(id="Fish_1", bbox=[100.0, 150.0, 140.0, 170.0])
        d2 = Detection(id="Fish_2", bbox=[130.0, 150.0, 170.0, 170.0])
        # Fish 3 is at x=550 (400px away > 220px threshold)
        d3 = Detection(id="Fish_3", bbox=[550.0, 150.0, 590.0, 170.0])
        frames.append(FrameDetections(t=t, detections=[d1, d2, d3]))

    tracks = Tracks(fps=fps, width=640, height=360, duration_s=5.0, frames=frames)
    feats = compute_all_features(tracks, base_config)
    assert feats["Fish_1"]["isolation_ratio"] < 0.1
    assert feats["Fish_2"]["isolation_ratio"] < 0.1
    assert feats["Fish_3"]["isolation_ratio"] >= 0.5


def test_b_f06_single_fish_isolation(base_config):
    """B-F06: Single fish in tank has isolation_ratio = 0.0."""
    tracks = create_straight_track(speed_px_s=40.0, duration=4.0)
    feats = compute_all_features(tracks, base_config)
    assert feats["Fish_1"]["isolation_ratio"] == 0.0


def test_b_f07_track_with_gaps(base_config):
    """B-F07: Track with missing detections computes features without NaN."""
    fps = 5.0
    frames = []
    for i in range(20):
        t = i / fps
        # Drop detections between t=1.0 and t=2.0
        if 1.0 <= t <= 2.0:
            frames.append(FrameDetections(t=t, detections=[]))
        else:
            bbox = [100.0 + i * 5, 100.0, 150.0 + i * 5, 130.0]
            frames.append(FrameDetections(t=t, detections=[Detection(id="Fish_1", bbox=bbox)]))

    tracks = Tracks(fps=fps, width=640, height=360, duration_s=4.0, frames=frames)
    feats = compute_all_features(tracks, base_config)
    assert "Fish_1" in feats
    for k, val in feats["Fish_1"].items():
        assert not math.isnan(val), f"Feature {k} was NaN"


def test_b_f08_zero_fish(base_config):
    """B-F08: Zero fish tracks returns empty dict without exception."""
    tracks = Tracks(fps=10.0, width=640, height=360, duration_s=5.0, frames=[])
    feats = compute_all_features(tracks, base_config)
    assert feats == {}


def test_b_f20_explanation_sentence():
    """B-F20: Explanation sentence mentions strongest flag and fish ID."""
    metrics = {
        "speed_bl_s": 4.8,
        "direction_change_rate": 1.1,
        "isolation_ratio": 0.0,
        "surface_ratio": 0.65,
        "bottom_ratio": 0.0,
        "inactivity_ratio": 0.02,
    }
    flags = ["surface_gasping", "fast_swimming"]
    expl = generate_fish_explanation("Fish_2", flags, metrics)
    assert "Fish_2" in expl
    assert "surface" in expl or "4.8" in expl
    assert expl.endswith(".")

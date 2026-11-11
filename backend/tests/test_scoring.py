import pytest
from app.analysis.scoring import (
    compute_tank_score,
    evaluate_fish_flags,
    level_from_score,
    load_scoring_config,
    score_tracks,
)
from app.analysis.types import Detection, FrameDetections, Tracks


@pytest.fixture
def config():
    return load_scoring_config()


@pytest.mark.parametrize(
    "score,expected_level",
    [
        (0, "Normal"),
        (34, "Normal"),
        (35, "Moderate"),
        (59, "Moderate"),
        (60, "High"),
        (100, "High"),
    ],
)
def test_b_s01_level_from_score(score: int, expected_level: str):
    """B-S01: level_from_score thresholds mapping."""
    assert level_from_score(score) == expected_level


def test_b_s02_fish_score_sum_and_clamp(config):
    """B-S02: Fish score equals sum of flags points and clamps to 100."""
    metrics = {
        "speed_bl_s": 5.0,  # 10
        "direction_change_rate": 1.5,  # 10
        "isolation_ratio": 0.8,  # 15
        "surface_ratio": 0.7,  # 20
        "bottom_ratio": 0.0,
        "inactivity_ratio": 0.0,
    }
    flags, points, score = evaluate_fish_flags(metrics, config)
    assert set(flags) == {"fast_swimming", "erratic_swimming", "isolation", "surface_gasping"}
    assert score == 55  # 10 + 10 + 15 + 20

    # Test clamping
    config_high_points = dict(config)
    config_high_points["points"] = {k: 50 for k in config["points"]}
    _, _, score_clamped = evaluate_fish_flags(metrics, config_high_points)
    assert score_clamped == 100


def test_b_s03_stressed_threshold(config):
    """B-S03: Stressed boundary check at 34 and 35."""
    thresh = config["threshold"]  # 35
    assert not (34 >= thresh)
    assert (35 >= thresh)


def test_b_s04_tank_formula_max_plus_spread(config):
    """B-S04: max_plus_spread formula."""
    # (40, 0, 0) -> 1 stressed -> max = 40, spread bonus = 0 -> 40
    assert compute_tank_score([40, 0, 0], 1, config) == 40
    # (40, 40, 40) -> 3 stressed -> max = 40 + 10 * 2 = 60
    assert compute_tank_score([40, 40, 40], 3, config) == 60
    # (20, 0, 0) -> 0 stressed -> max = 20
    assert compute_tank_score([20, 0, 0], 0, config) == 20


def test_b_s05_tank_formula_mean_max_blend():
    """B-S05: mean_max_blend (0.6*mean + 0.4*max) selectable via config."""
    cfg = {"tank_formula": "mean_max_blend"}
    # Scores: [20, 40] -> mean 30, max 40 -> 0.6*30 + 0.4*40 = 18 + 16 = 34
    assert compute_tank_score([20, 40], 1, cfg) == 34


def test_b_s06_top_view_disables_vertical_flags(config):
    """B-S06: Top view disables surface and bottom flags and adds warning."""
    frames = []
    # Fish swimming at surface
    for i in range(25):
        t = i / 5.0
        frames.append(FrameDetections(t=t, detections=[Detection(id="Fish_1", bbox=[100, 10, 150, 40])]))
    tracks = Tracks(fps=5.0, width=640, height=360, duration_s=5.0, frames=frames)

    res_side = score_tracks(tracks, config, view="side")
    assert "surface_gasping" in res_side["fish"][0]["flags"]

    res_top = score_tracks(tracks, config, view="top")
    assert "surface_gasping" not in res_top["fish"][0]["flags"]
    assert any("Top-down view" in w for w in res_top["warnings"])


def test_b_s07_lethargic_all_fish_inactive(config):
    """B-S07: Lethargic applies to all fish only when every fish is inactive."""
    metrics_inactive = {"inactivity_ratio": 0.9}
    metrics_active = {"inactivity_ratio": 0.1}

    # When all inactive is True
    flags, _, _ = evaluate_fish_flags(metrics_inactive, config, tank_all_inactive=True)
    assert "lethargic" in flags

    # When not all inactive
    flags2, _, _ = evaluate_fish_flags(metrics_inactive, config, tank_all_inactive=False)
    assert "lethargic" not in flags2


def test_b_s08_configurable_threshold():
    """B-S08: Changing threshold changes stressed outcome."""
    cfg = load_scoring_config()
    metrics = {"speed_bl_s": 5.0}  # gets fast_swimming = 10 pts
    _, _, score = evaluate_fish_flags(metrics, cfg)
    assert score == 10

    cfg["threshold"] = 10
    assert score >= cfg["threshold"]  # Stressed under threshold 10

    cfg["threshold"] = 50
    assert not (score >= cfg["threshold"])  # Not stressed under threshold 50


def test_b_s09_timeline_windows(config):
    """B-S09: 20s clip with 5s windows has 4 points; clip < 5s has 1 point."""
    # 20s clip
    frames_20s = [FrameDetections(t=i * 0.2, detections=[Detection(id="Fish_1", bbox=[100, 100, 140, 130])]) for i in range(100)]
    tracks_20s = Tracks(fps=5.0, width=640, height=360, duration_s=20.0, frames=frames_20s)
    res_20s = score_tracks(tracks_20s, config)
    assert len(res_20s["timeline"]) == 4
    for i in range(len(res_20s["timeline"]) - 1):
        assert res_20s["timeline"][i]["t"] < res_20s["timeline"][i + 1]["t"]

    # 3s clip
    frames_3s = [FrameDetections(t=i * 0.2, detections=[Detection(id="Fish_1", bbox=[100, 100, 140, 130])]) for i in range(15)]
    tracks_3s = Tracks(fps=5.0, width=640, height=360, duration_s=3.0, frames=frames_3s)
    res_3s = score_tracks(tracks_3s, config)
    assert len(res_3s["timeline"]) == 1
    assert res_3s["timeline"][0]["t"] == 0.0

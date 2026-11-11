from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import yaml
from app.analysis.features import (
    compute_all_features,
    extract_per_fish_samples,
)
from app.analysis.types import Tracks


def load_scoring_config(custom_path: Optional[str] = None) -> Dict[str, Any]:
    if custom_path:
        p = Path(custom_path)
    else:
        p = Path(__file__).resolve().parent / "config" / "scoring.yaml"
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def level_from_score(score: int, levels: Optional[Dict[str, int]] = None) -> str:
    if levels is None:
        levels = {"normal_max": 34, "moderate_max": 59}
    if score <= levels.get("normal_max", 34):
        return "Normal"
    if score <= levels.get("moderate_max", 59):
        return "Moderate"
    return "High"


def generate_fish_explanation(fid: str, flags: List[str], metrics: Dict[str, float]) -> str:
    """Generate a readable 1-sentence explanation for a fish based on strongest metrics."""
    parts = []
    if "surface_gasping" in flags:
        parts.append(f"spent {int(metrics.get('surface_ratio', 0) * 100)}% of the clip near the surface")
    if "fast_swimming" in flags:
        parts.append(f"swam fast at {metrics.get('speed_bl_s', 0)} body lengths per second")
    if "erratic_swimming" in flags:
        parts.append(f"exhibited {metrics.get('direction_change_rate', 0)} sharp turns/s")
    if "isolation" in flags:
        parts.append(f"was isolated {int(metrics.get('isolation_ratio', 0) * 100)}% of the time")
    if "bottom_inactivity" in flags:
        parts.append(f"remained inactive near the bottom for {int(metrics.get('bottom_ratio', 0) * 100)}% of the clip")
    if "lethargic" in flags and not parts:
        parts.append(f"exhibited high inactivity ({int(metrics.get('inactivity_ratio', 0) * 100)}%)")

    if not parts:
        return f"{fid} exhibited normal swimming patterns with steady speed of {metrics.get('speed_bl_s', 1.0)} BL/s."

    return f"{fid} " + " and ".join(parts) + "."


def evaluate_fish_flags(
    metrics: Dict[str, float],
    config: Dict[str, Any],
    view: str = "side",
    tank_all_inactive: bool = False,
) -> Tuple[List[str], List[Dict[str, Any]], int]:
    """Evaluate flags, points, and total score for a single fish."""
    flags: List[str] = []
    points_list: List[Dict[str, Any]] = []
    pts_cfg = config.get("points", {})

    # 1. Fast swimming
    fast_bl_s = config.get("speed", {}).get("fast_bl_s", 3.5)
    if metrics.get("speed_bl_s", 0.0) > fast_bl_s:
        flags.append("fast_swimming")
        points_list.append({"flag": "fast_swimming", "points": pts_cfg.get("fast_swimming", 10)})

    # 2. Erratic swimming
    erratic_per_s = config.get("direction", {}).get("erratic_per_s", 0.8)
    if metrics.get("direction_change_rate", 0.0) > erratic_per_s:
        flags.append("erratic_swimming")
        points_list.append({"flag": "erratic_swimming", "points": pts_cfg.get("erratic_swimming", 10)})

    # 3. Isolation
    iso_min = config.get("isolation", {}).get("ratio_min", 0.5)
    if metrics.get("isolation_ratio", 0.0) >= iso_min:
        flags.append("isolation")
        points_list.append({"flag": "isolation", "points": pts_cfg.get("isolation", 15)})

    # 4 & 5. Vertical flags (disabled in top view)
    if view != "top":
        surf_min = config.get("surface", {}).get("ratio_min", 0.35)
        if metrics.get("surface_ratio", 0.0) >= surf_min:
            flags.append("surface_gasping")
            points_list.append({"flag": "surface_gasping", "points": pts_cfg.get("surface_gasping", 20)})

        bot_min = config.get("bottom", {}).get("ratio_min", 0.6)
        inact_min = config.get("bottom", {}).get("inactivity_min", 0.7)
        if metrics.get("bottom_ratio", 0.0) >= bot_min and metrics.get("inactivity_ratio", 0.0) >= inact_min:
            flags.append("bottom_inactivity")
            points_list.append({"flag": "bottom_inactivity", "points": pts_cfg.get("bottom_inactivity", 15)})

    # 6. Lethargic
    if tank_all_inactive:
        flags.append("lethargic")
        points_list.append({"flag": "lethargic", "points": pts_cfg.get("lethargic", 10)})

    total_score = min(100, sum(p["points"] for p in points_list))
    return flags, points_list, total_score


def compute_tank_score(
    fish_scores: List[int],
    stressed_count: int,
    config: Dict[str, Any],
) -> int:
    """Compute overall tank score based on formula."""
    if not fish_scores:
        return 0

    formula = config.get("tank_formula", "max_plus_spread")
    if formula == "mean_max_blend":
        mean_score = sum(fish_scores) / len(fish_scores)
        max_score = max(fish_scores)
        score = int(round(0.6 * mean_score + 0.4 * max_score))
        return min(100, max(0, score))

    # max_plus_spread
    max_score = max(fish_scores)
    if stressed_count >= 1:
        spread_bonus = config.get("spread_bonus_per_extra_stressed", 10)
        score = max_score + spread_bonus * (stressed_count - 1)
    else:
        score = max_score
    return min(100, max(0, score))


def score_tracks(
    tracks: Tracks,
    config: Optional[Dict[str, Any]] = None,
    view: str = "side",
) -> Dict[str, Any]:
    """Score full clip and compute windowed timelines."""
    if config is None:
        config = load_scoring_config()

    warnings: List[str] = []
    if view == "top":
        warnings.append("Top-down view: vertical position signal disabled.")

    sample_hz = config.get("sample_hz", 5)
    resampled = extract_per_fish_samples(tracks, sample_hz=sample_hz)

    if not resampled:
        warnings.append("No goldfish detected. Check lighting, camera angle, or try a clearer clip.")
        return {
            "tank_score": 0,
            "level": "Normal",
            "threshold": config.get("threshold", 35),
            "fish": [],
            "timeline": [{"t": 0.0, "score": 0}],
            "warnings": warnings,
            "stressed_count": 0,
            "fish_count": 0,
        }

    # 1. Full clip features
    clip_features = compute_all_features(tracks, config)

    # Check tank-level lethargy
    lethargy_thresh = config.get("lethargy", {}).get("all_inactive_ratio_min", 0.8)
    all_inactive = (
        len(clip_features) > 0
        and all(f.get("inactivity_ratio", 0.0) >= lethargy_thresh for f in clip_features.values())
    )

    threshold = config.get("threshold", 35)
    levels = config.get("levels", {"normal_max": 34, "moderate_max": 59})

    # 2. Per-window scoring (5s windows)
    window_s = config.get("window_s", 5.0)
    duration = tracks.duration_s

    if duration < window_s:
        window_times = [0.0]
    else:
        window_times = list(np.arange(0.0, max(duration - window_s + 0.1, 0.1), window_s))
        if not window_times:
            window_times = [0.0]

    # Precalculate window features
    window_fish_scores: Dict[str, List[Dict[str, Any]]] = {fid: [] for fid in resampled.keys()}
    tank_timeline: List[Dict[str, Any]] = []

    for wt in window_times:
        w_end = wt + window_s
        w_feats = compute_all_features(tracks, config, time_window=(wt, w_end))
        w_all_inactive = (
            len(w_feats) > 0
            and all(f.get("inactivity_ratio", 0.0) >= lethargy_thresh for f in w_feats.values())
        )
        w_scores = []
        w_stressed_cnt = 0
        for fid in resampled.keys():
            m = w_feats.get(fid, {
                "speed_bl_s": 0.0, "direction_change_rate": 0.0,
                "isolation_ratio": 0.0, "surface_ratio": 0.0,
                "bottom_ratio": 0.0, "inactivity_ratio": 0.0,
            })
            _, _, f_score = evaluate_fish_flags(m, config, view=view, tank_all_inactive=w_all_inactive)
            w_scores.append(f_score)
            if f_score >= threshold:
                w_stressed_cnt += 1
            window_fish_scores[fid].append({"t": round(wt, 1), "score": f_score})

        t_score = compute_tank_score(w_scores, w_stressed_cnt, config)
        tank_timeline.append({"t": round(wt, 1), "score": t_score})

    # 3. Overall Fish results
    fish_results = []
    stressed_count = 0
    all_scores = []

    for fid in sorted(resampled.keys()):
        m = clip_features.get(fid, {
            "speed_bl_s": 0.0, "direction_change_rate": 0.0,
            "isolation_ratio": 0.0, "surface_ratio": 0.0,
            "bottom_ratio": 0.0, "inactivity_ratio": 0.0,
        })
        flags, points, score = evaluate_fish_flags(m, config, view=view, tank_all_inactive=all_inactive)
        stressed = score >= threshold
        if stressed:
            stressed_count += 1
        all_scores.append(score)
        explanation = generate_fish_explanation(fid, flags, m)

        fish_results.append({
            "id": fid,
            "score": score,
            "stressed": stressed,
            "flags": flags,
            "metrics": m,
            "points": points,
            "explanation": explanation,
            "timeline": window_fish_scores[fid],
        })

    tank_score = compute_tank_score(all_scores, stressed_count, config)
    level = level_from_score(tank_score, levels)

    return {
        "tank_score": tank_score,
        "level": level,
        "threshold": threshold,
        "fish": fish_results,
        "timeline": tank_timeline,
        "warnings": warnings,
        "stressed_count": stressed_count,
        "fish_count": len(fish_results),
    }

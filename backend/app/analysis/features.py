import math
from typing import Any, Dict, List, Optional

import numpy as np

from app.analysis.types import Tracks


def interpolate_track(times: List[float], positions: List[List[float]], target_times: np.ndarray) -> np.ndarray:
    """Linearly interpolate 2D or 4D positions at target_times.

    positions shape: (N, D) where D is 2 (cx, cy) or 4 (x1, y1, x2, y2).
    """
    if len(times) == 0:
        return np.empty((0, len(positions[0]) if len(positions) > 0 else 2))
    if len(times) == 1:
        return np.repeat(np.array(positions[:1]), len(target_times), axis=0)

    pos_arr = np.array(positions)
    t_arr = np.array(times)
    result = np.zeros((len(target_times), pos_arr.shape[1]))
    for dim in range(pos_arr.shape[1]):
        result[:, dim] = np.interp(target_times, t_arr, pos_arr[:, dim])
    return result


def extract_per_fish_samples(tracks: Tracks, sample_hz: float = 5.0) -> Dict[str, Dict[str, Any]]:
    """Resample tracks for each fish to sample_hz."""
    fish_raw: Dict[str, Dict[str, List]] = {}
    for frame in tracks.frames:
        t = frame.t
        for det in frame.detections:
            fid = det.id
            if fid not in fish_raw:
                fish_raw[fid] = {
                    "t": [],
                    "bboxes": [],
                    "centroids": [],
                    "coasting": [],
                }
            fish_raw[fid]["t"].append(t)
            x1, y1, x2, y2 = det.bbox
            fish_raw[fid]["bboxes"].append([x1, y1, x2, y2])
            fish_raw[fid]["centroids"].append([(x1 + x2) / 2.0, (y1 + y2) / 2.0])
            fish_raw[fid]["coasting"].append(getattr(det, "coasting", False))

    resampled: Dict[str, Dict[str, Any]] = {}
    dt = 1.0 / sample_hz

    total_frames_count = len(tracks.frames)

    for fid, data in fish_raw.items():
        times = data["t"]
        if not times:
            continue
        t_min = times[0]
        t_max = times[-1]
        if t_max <= t_min:
            target_times = np.array([t_min])
        else:
            target_times = np.arange(t_min, t_max + 1e-6, dt)

        centroids = interpolate_track(times, data["centroids"], target_times)
        bboxes = interpolate_track(times, data["bboxes"], target_times)

        # Nearest neighbor interpolation for boolean coasting flag
        coasting_arr = np.array(data["coasting"], dtype=bool)
        t_arr = np.array(times)
        coasting_resampled = np.zeros(len(target_times), dtype=bool)
        for i, tt in enumerate(target_times):
            idx = int(np.argmin(np.abs(t_arr - tt)))
            coasting_resampled[i] = coasting_arr[idx]

        # Body length is median of max(w, h) in pixels
        widths = np.abs(bboxes[:, 2] - bboxes[:, 0])
        heights = np.abs(bboxes[:, 3] - bboxes[:, 1])
        bls = np.maximum(widths, heights)
        median_bl = float(np.median(bls)) if len(bls) > 0 else 50.0
        if median_bl < 1.0:
            median_bl = 50.0

        # Confidence: fraction of video frames the fish was observed
        observed_fraction = len(times) / max(total_frames_count, 1)

        resampled[fid] = {
            "times": target_times,
            "centroids": centroids,
            "bboxes": bboxes,
            "coasting": coasting_resampled,
            "bl": median_bl,
            "t_min": t_min,
            "t_max": t_max,
            "confidence": round(float(observed_fraction), 2),
            "raw_times": times,
        }

    return resampled


def compute_features_for_fish(
    fid: str,
    fish_data: Dict[str, Any],
    all_fish_data: Dict[str, Dict[str, Any]],
    frame_width: int,
    frame_height: int,
    config: Dict[str, Any],
    time_window: Optional[tuple[float, float]] = None,
) -> Dict[str, float]:
    """Compute behavioral features for one fish over an optional time window."""
    times = fish_data["times"]
    centroids = fish_data["centroids"]
    coasting = fish_data.get("coasting", np.zeros(len(times), dtype=bool))
    bl = fish_data["bl"]

    if time_window is not None:
        mask = (times >= time_window[0]) & (times <= time_window[1])
        times = times[mask]
        centroids = centroids[mask]
        coasting = coasting[mask]

    n_samples = len(times)
    if n_samples < 2:
        return {
            "speed_bl_s": 0.0,
            "direction_change_rate": 0.0,
            "isolation_ratio": 0.0,
            "surface_ratio": 0.0,
            "bottom_ratio": 0.0,
            "inactivity_ratio": 1.0 if n_samples > 0 else 0.0,
        }

    # Speeds
    diffs = np.diff(centroids, axis=0)
    dists = np.linalg.norm(diffs, axis=1)
    dts = np.diff(times)

    # Gaps shorter than 1.0s are interpolated; longer gaps are excluded
    valid_dt = (dts > 1e-5) & (dts <= 1.0)
    diffs = diffs[valid_dt]
    dists = dists[valid_dt]
    dts = dts[valid_dt]
    # Check coasting: coasting boxes count as zero movement
    coasting_steps = coasting[:-1][valid_dt] | coasting[1:][valid_dt]
    dists[coasting_steps] = 0.0

    if len(dts) == 0:
        return {
            "speed_bl_s": 0.0,
            "direction_change_rate": 0.0,
            "isolation_ratio": 0.0,
            "surface_ratio": 0.0,
            "bottom_ratio": 0.0,
            "inactivity_ratio": 0.0,
        }

    speeds_px_s = dists / dts
    speeds_bl_s = speeds_px_s / bl
    mean_speed_bl_s = float(np.mean(speeds_bl_s))

    inactive_bl_s = config.get("speed", {}).get("inactive_bl_s", 0.15)
    inactivity_ratio = float(np.mean(speeds_bl_s < inactive_bl_s))

    # Direction changes
    turn_deg = config.get("direction", {}).get("turn_deg", 60)
    step_threshold_bl = 0.05 * bl
    headings = []
    heading_times = []
    for i in range(len(diffs)):
        if dists[i] >= step_threshold_bl:
            angle_deg = math.degrees(math.atan2(diffs[i, 1], diffs[i, 0]))
            headings.append(angle_deg)
            heading_times.append(times[i])

    direction_change_count = 0
    if len(headings) >= 2:
        for i in range(len(headings) - 1):
            diff_angle = (headings[i + 1] - headings[i] + 180) % 360 - 180
            if abs(diff_angle) >= turn_deg:
                direction_change_count += 1

    duration = float(times[-1] - times[0])
    direction_change_rate = (direction_change_count / duration) if duration > 0.1 else 0.0

    # Vertical position
    surface_zone = config.get("zones", {}).get("surface", 0.15)
    bottom_zone = config.get("zones", {}).get("bottom", 0.15)

    surface_limit_y = surface_zone * frame_height
    bottom_limit_y = (1.0 - bottom_zone) * frame_height

    y_coords = centroids[:, 1]
    surface_ratio = float(np.mean(y_coords <= surface_limit_y))
    bottom_ratio = float(np.mean(y_coords >= bottom_limit_y))

    # Isolation ratio
    diag = math.sqrt(frame_width**2 + frame_height**2)
    iso_dist_thresh = config.get("isolation", {}).get("nn_dist_frac_diag", 0.30) * diag

    other_fish = [other_id for other_id in all_fish_data.keys() if other_id != fid]
    if len(other_fish) == 0:
        isolation_ratio = 0.0
    else:
        covisible_count = 0
        isolated_count = 0
        for idx, t in enumerate(times):
            curr_c = centroids[idx]
            min_dist = float("inf")
            has_covisible = False
            for other_id in other_fish:
                other_t = all_fish_data[other_id]["times"]
                other_c = all_fish_data[other_id]["centroids"]
                # Check if other fish was present around time t
                if other_t[0] <= t <= other_t[-1]:
                    o_idx = np.searchsorted(other_t, t)
                    o_idx = min(max(o_idx, 0), len(other_t) - 1)
                    if abs(other_t[o_idx] - t) <= 0.25:
                        has_covisible = True
                        d = float(np.linalg.norm(curr_c - other_c[o_idx]))
                        if d < min_dist:
                            min_dist = d

            if has_covisible:
                covisible_count += 1
                if min_dist > iso_dist_thresh:
                    isolated_count += 1

        isolation_ratio = (isolated_count / covisible_count) if covisible_count > 0 else 0.0

    return {
        "speed_bl_s": round(mean_speed_bl_s, 2),
        "direction_change_rate": round(direction_change_rate, 2),
        "isolation_ratio": round(isolation_ratio, 2),
        "surface_ratio": round(surface_ratio, 2),
        "bottom_ratio": round(bottom_ratio, 2),
        "inactivity_ratio": round(inactivity_ratio, 2),
    }


def compute_all_features(
    tracks: Tracks,
    config: Dict[str, Any],
    time_window: Optional[tuple[float, float]] = None,
) -> Dict[str, Dict[str, float]]:
    """Compute features for all fish."""
    if not tracks.frames:
        return {}

    sample_hz = config.get("sample_hz", 5)
    resampled = extract_per_fish_samples(tracks, sample_hz=sample_hz)
    if not resampled:
        return {}

    results = {}
    for fid, f_data in resampled.items():
        results[fid] = compute_features_for_fish(
            fid=fid,
            fish_data=f_data,
            all_fish_data=resampled,
            frame_width=tracks.width,
            frame_height=tracks.height,
            config=config,
            time_window=time_window,
        )
    return results

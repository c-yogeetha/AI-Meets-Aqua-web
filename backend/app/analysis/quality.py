import math
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np


def compute_frame_quality_metrics(
    frame: np.ndarray,
    target_width: int = 640,
) -> Tuple[float, float, float]:
    """Compute brightness, contrast, and sharpness on a single frame.

    Returns:
        (brightness, contrast, sharpness)
    """
    h, w = frame.shape[:2]
    if w != target_width and target_width > 0:
        new_h = max(1, int(round(h * (target_width / float(w)))))
        resized = cv2.resize(frame, (target_width, new_h), interpolation=cv2.INTER_AREA)
    else:
        resized = frame

    # 1. Brightness: mean of V channel in HSV (0 to 255)
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    brightness = float(np.mean(v_channel))

    # 2. Contrast: standard deviation of grayscale (0 to 255)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    contrast = float(np.std(gray))

    # 3. Sharpness: variance of Laplacian on 640w grayscale
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness = float(lap.var())

    return brightness, contrast, sharpness


def probe_video_quality(
    video_path: str,
    max_sample_frames: int = 40,
) -> Dict[str, Any]:
    """Probe video file and sample up to max_sample_frames evenly to compute quality metrics.

    Returns dict with brightness, contrast, sharpness, shake_px, fps, width, height, duration_s.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "brightness": 0.0,
            "contrast": 0.0,
            "sharpness": 0.0,
            "shake_px": 0.0,
            "fps": 0.0,
            "width": 0,
            "height": 0,
            "duration_s": 0.0,
        }

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if fps <= 0 or math.isnan(fps):
        fps = 15.0
    duration_s = round(total_frames / fps, 2) if total_frames > 0 else 0.0

    if total_frames <= 0:
        # Fallback reading
        frames_read = 0
        sample_frames = []
        while True:
            ret, f = cap.read()
            if not ret or frames_read >= 60:
                break
            if frames_read % 2 == 0:
                sample_frames.append(f)
            frames_read += 1
        cap.release()
        total_frames = frames_read
        duration_s = round(total_frames / fps, 2)
    else:
        sample_indices = []
        n_samples = min(max_sample_frames, total_frames)
        if n_samples > 0:
            step = max(1, total_frames // n_samples)
            sample_indices = [min(i * step, total_frames - 1) for i in range(n_samples)]
            sample_indices = sorted(list(set(sample_indices)))

        sample_frames = []
        curr_idx = 0
        while curr_idx < total_frames and len(sample_frames) < len(sample_indices):
            ret, frame = cap.read()
            if not ret:
                break
            if curr_idx in sample_indices:
                sample_frames.append(frame)
            curr_idx += 1
        cap.release()

    if not sample_frames:
        return {
            "brightness": 0.0,
            "contrast": 0.0,
            "sharpness": 0.0,
            "shake_px": 0.0,
            "fps": fps,
            "width": width,
            "height": height,
            "duration_s": duration_s,
        }

    brightnesses = []
    contrasts = []
    sharpnesses = []
    grays_float = []

    target_w = 640
    for frame in sample_frames:
        b, c, s = compute_frame_quality_metrics(frame, target_width=target_w)
        brightnesses.append(b)
        contrasts.append(c)
        sharpnesses.append(s)

        # Grayscale float for phase correlation
        h, w = frame.shape[:2]
        new_h = max(1, int(round(h * (target_w / float(w)))))
        resized = cv2.resize(frame, (target_w, new_h), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        grays_float.append(gray.astype(np.float32))

    # Shake estimate using phase correlation between consecutive sampled frames
    shake_translations = []
    if len(grays_float) >= 2:
        for i in range(len(grays_float) - 1):
            g1 = grays_float[i]
            g2 = grays_float[i + 1]
            try:
                shift, _ = cv2.phaseCorrelate(g1, g2)
                dx, dy = shift
                shake_translations.append(math.hypot(dx, dy))
            except cv2.error:
                pass

    median_shake = float(np.median(shake_translations)) if shake_translations else 0.0

    return {
        "brightness": round(float(np.mean(brightnesses)), 1) if brightnesses else 0.0,
        "contrast": round(float(np.mean(contrasts)), 1) if contrasts else 0.0,
        "sharpness": round(float(np.mean(sharpnesses)), 1) if sharpnesses else 0.0,
        "shake_px": round(median_shake, 2),
        "fps": round(fps, 2),
        "width": width,
        "height": height,
        "duration_s": duration_s,
    }



def _value(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def assess_track_plausibility(
    samples: List[Tuple[List[Any], np.ndarray]],
    frame_width: int,
    frame_height: int,
) -> Dict[str, Any]:
    """Apply the three conservative plausibility rules defined for the product.

    Each sample is (detections, original_bgr_frame). The checks target small
    edge-locked boxes, boxes with very little fish-like colour, and stationary
    boxes while the rest of the scene moves. This is not a species classifier
    or a detector-accuracy metric.
    """
    if frame_width <= 0 or frame_height <= 0 or not samples:
        return {"assessed": False, "implausible": False, "tracks_checked": 0, "implausible_tracks": []}

    observations: Dict[str, List[Dict[str, Any]]] = {}
    gray_frames: List[np.ndarray] = []
    sample_boxes: List[Dict[str, List[int]]] = []

    for detections, frame in samples:
        if frame is None or frame.size == 0:
            continue
        if frame.shape[1] != frame_width or frame.shape[0] != frame_height:
            frame = cv2.resize(frame, (frame_width, frame_height), interpolation=cv2.INTER_AREA)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        gray_frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        current_boxes: Dict[str, List[int]] = {}
        for detection in detections or []:
            track_id = str(_value(detection, "id", ""))
            raw_bbox = _value(detection, "bbox", None)
            if not track_id or raw_bbox is None or len(raw_bbox) != 4:
                continue
            x1, y1, x2, y2 = [int(round(float(v))) for v in raw_bbox]
            x1 = max(0, min(x1, frame_width - 1))
            y1 = max(0, min(y1, frame_height - 1))
            x2 = max(x1 + 1, min(x2, frame_width))
            y2 = max(y1 + 1, min(y2, frame_height))
            box_w, box_h = x2 - x1, y2 - y1
            roi = hsv[y1:y2, x1:x2]
            if roi.size:
                hue, saturation, value = cv2.split(roi)
                warm = (((hue <= 45) | (hue >= 165)) & (saturation >= 40) & (value >= 40))
                light = (saturation < 45) & (value >= 180)
                colour_fraction = float(np.count_nonzero(warm | light) / (box_w * box_h))
            else:
                colour_fraction = 0.0
            edge = (
                x1 <= 0.05 * frame_width
                or y1 <= 0.05 * frame_height
                or x2 >= 0.95 * frame_width
                or y2 >= 0.95 * frame_height
            )
            current_boxes[track_id] = [x1, y1, x2, y2]
            observations.setdefault(track_id, []).append({
                "bbox": [x1, y1, x2, y2],
                "center": ((x1 + x2) / 2.0, (y1 + y2) / 2.0),
                "long_side": float(max(box_w, box_h)),
                "at_edge": bool(edge),
                "colour_fraction": colour_fraction,
            })
        sample_boxes.append(current_boxes)

    def motion_outside_track(track_id: str) -> float:
        pair_count = 0
        moving_pairs = 0
        for idx in range(1, min(len(gray_frames), len(sample_boxes))):
            previous_box = sample_boxes[idx - 1].get(track_id)
            current_box = sample_boxes[idx].get(track_id)
            if previous_box is None or current_box is None:
                continue
            diff = cv2.absdiff(gray_frames[idx - 1], gray_frames[idx])
            moving = diff > 20
            excluded = np.zeros((frame_height, frame_width), dtype=np.uint8)
            for box in (previous_box, current_box):
                x1, y1, x2, y2 = box
                pad = 3
                cv2.rectangle(
                    excluded,
                    (max(0, x1 - pad), max(0, y1 - pad)),
                    (min(frame_width - 1, x2 + pad), min(frame_height - 1, y2 + pad)),
                    255,
                    -1,
                )
            valid = excluded == 0
            denominator = int(np.count_nonzero(valid))
            fraction = float(np.count_nonzero(moving & valid) / denominator) if denominator else 0.0
            pair_count += 1
            if fraction >= 0.001:
                moving_pairs += 1
        return moving_pairs / pair_count if pair_count else 0.0

    implausible_tracks: List[Dict[str, Any]] = []
    for track_id, rows in observations.items():
        if len(rows) < 3:
            continue
        median_long_side = float(np.median([row["long_side"] for row in rows]))
        edge_fraction = float(np.mean([row["at_edge"] for row in rows]))
        low_colour_fraction = float(np.mean([row["colour_fraction"] < 0.08 for row in rows]))
        first_x, first_y = rows[0]["center"]
        centre_motion = max(
            (float(np.hypot(row["center"][0] - first_x, row["center"][1] - first_y)) for row in rows),
            default=0.0,
        )
        moving_elsewhere_fraction = motion_outside_track(track_id)
        reasons = []
        if median_long_side < 0.04 * frame_width and edge_fraction > 0.50:
            reasons.append("small_box_at_frame_edge")
        if low_colour_fraction > 0.70:
            reasons.append("insufficient_fish_colour")
        if centre_motion < 2.0 and moving_elsewhere_fraction > 0.10:
            reasons.append("stationary_while_other_motion_exists")
        if reasons:
            implausible_tracks.append({
                "track_id": track_id,
                "reasons": reasons,
                "median_long_side_px": round(median_long_side, 2),
                "edge_frame_fraction": round(edge_fraction, 3),
                "low_colour_frame_fraction": round(low_colour_fraction, 3),
                "centre_motion_px": round(centre_motion, 2),
                "motion_elsewhere_frame_fraction": round(moving_elsewhere_fraction, 3),
            })

    return {
        "assessed": True,
        "implausible": bool(implausible_tracks),
        "tracks_checked": len(observations),
        "implausible_tracks": implausible_tracks,
    }


def probe_track_plausibility(video_path: str, tracks: Any, max_sample_frames: int = 120) -> Dict[str, Any]:
    """Sample original frames at tracked timestamps and assess false-positive tracks."""
    frame_rows = list(_value(tracks, "frames", []) or [])
    width = int(_value(tracks, "width", 0) or 0)
    height = int(_value(tracks, "height", 0) or 0)
    if not frame_rows or width <= 0 or height <= 0:
        return {"assessed": False, "implausible": False, "tracks_checked": 0, "implausible_tracks": []}
    indices = np.unique(np.linspace(0, len(frame_rows) - 1, min(len(frame_rows), max_sample_frames)).round().astype(int))
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"assessed": False, "implausible": False, "tracks_checked": 0, "implausible_tracks": [], "error": "video_unreadable_for_plausibility"}
    samples: List[Tuple[List[Any], np.ndarray]] = []
    try:
        for idx in indices:
            row = frame_rows[int(idx)]
            timestamp = float(_value(row, "t", 0.0))
            cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, timestamp) * 1000.0)
            ok, frame = cap.read()
            if ok and frame is not None:
                samples.append((list(_value(row, "detections", []) or []), frame))
    finally:
        cap.release()
    if not samples:
        return {"assessed": False, "implausible": False, "tracks_checked": 0, "implausible_tracks": [], "error": "no_plausibility_frames_decoded"}
    return assess_track_plausibility(samples, width, height)

def compute_reliability(
    probe_metrics: Dict[str, Any],
    coverage_pct: float,
    fish_expected: int,
    fish_tracked: int,
    fish_median_px: float,
    sharp_min: float = 40.0,
    preprocess_metrics: Dict[str, Any] | None = None,
    detection_plausibility: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Calculate transparent reliability rating (0 to 100), discrete level, deduction reasons and tips.

    Level:
      high >= 75
      medium 50 to 74
      low < 50
    """
    reasons: List[str] = []
    tips: List[str] = []
    score = 100
    preprocess_metrics = preprocess_metrics or {}
    glare_frac = float(preprocess_metrics.get("glare_frac", 0.0))
    bubble_rate = float(preprocess_metrics.get("bubble_rate", 0.0))
    surface_band_frac = float(preprocess_metrics.get("surface_band_frac", 0.0))

    # If zero fish tracked
    if fish_tracked == 0:
        no_fish_reasons = ["No goldfish detected"]
        no_fish_tips = ["Ensure goldfish are present and clearly visible in the video frame"]
        if preprocess_metrics.get("strong_glare"):
            no_fish_reasons.append("Strong glare covers much of the tank")
            no_fish_tips.append("Turn off the tank light or film from an angle that avoids reflections")
        if bubble_rate >= 5.0:
            no_fish_reasons.append("Heavy bubbles are present in the footage")
            no_fish_tips.append("Reduce aeration bubbles during recording or film from a clearer viewing angle")
        return {
            "level": "low",
            "score": 0,
            "reasons": no_fish_reasons,
            "tips": no_fish_tips,
            "metrics": {
                "brightness": probe_metrics.get("brightness", 0.0),
                "contrast": probe_metrics.get("contrast", 0.0),
                "sharpness": probe_metrics.get("sharpness", 0.0),
                "shake_px": probe_metrics.get("shake_px", 0.0),
                "coverage_pct": round(coverage_pct, 1),
                "fish_expected": fish_expected,
                "fish_tracked": 0,
                "fish_median_px": round(fish_median_px, 1),
                "fps": probe_metrics.get("fps", 0.0),
                "width": probe_metrics.get("width", 0),
                "height": probe_metrics.get("height", 0),
                "glare_frac": round(glare_frac, 5),
                "bubble_rate": round(bubble_rate, 3),
                "surface_band_frac": round(surface_band_frac, 5),
            },
        }

    # 1. Coverage below 90% (up to 35 deduction)
    if coverage_pct < 90.0:
        cov_deduction = min(35, int(round((90.0 - coverage_pct) * (35.0 / 90.0))))
        score -= cov_deduction
        reasons.append(f"Detection coverage was {round(coverage_pct, 1)}% (below recommended 90%)")
        tips.append("Ensure fish are clearly visible without heavy reflections or occlusions")

    # 2. Count mismatch (15 per missing or extra fish, max 30)
    if fish_expected > 0 and fish_tracked != fish_expected:
        diff = abs(fish_expected - fish_tracked)
        count_deduction = min(30, diff * 15)
        score -= count_deduction
        if fish_tracked < fish_expected:
            reasons.append(f"Only {fish_tracked} of {fish_expected} goldfish were found consistently")
        else:
            reasons.append(f"Tracked {fish_tracked} fish while {fish_expected} were expected")
        tips.append("Film from a fixed position with the whole tank in view")

    # 3. Brightness problem (< 45 or > 215: 15)
    brightness = probe_metrics.get("brightness", 128.0)
    if brightness < 45.0:
        score -= 15
        reasons.append(f"Footage is underexposed (brightness {round(brightness, 1)} < 45)")
        tips.append("Increase lighting above or in front of the tank")
    elif brightness > 215.0:
        score -= 15
        reasons.append(f"Footage is overexposed (brightness {round(brightness, 1)} > 215)")
        tips.append("Reduce glare and harsh direct light on tank glass")

    # 4. Blur (sharpness < sharp_min: 10)
    sharpness = probe_metrics.get("sharpness", 100.0)
    if sharpness < sharp_min:
        score -= 10
        reasons.append(f"Footage is blurry or out of focus (sharpness {round(sharpness, 1)} < {sharp_min})")
        tips.append("Clean tank glass and ensure camera focus is locked on the fish")

    # 5. Shake (shake_px > 6.0: 15)
    shake_px = probe_metrics.get("shake_px", 0.0)
    if shake_px > 6.0:
        score -= 15
        reasons.append(f"Noticeable camera movement detected (median jitter {round(shake_px, 1)} px > 6 px)")
        tips.append("Use a tripod or resting surface to keep the camera stationary")

    # 6. Fish size (< 2% or > 40% of frame width: 10)
    frame_w = probe_metrics.get("width", 640)
    if fish_median_px > 0 and frame_w > 0:
        if fish_median_px < 0.035 * frame_w:
            score -= 10
            reasons.append(f"Fish appear very small ({round(fish_median_px, 1)} px < 2% frame width)")
            tips.append("Position camera closer to the tank")
        elif fish_median_px > 0.40 * frame_w:
            score -= 10
            reasons.append(f"Fish appear very large ({round(fish_median_px, 1)} px > 40% frame width)")
            tips.append("Position camera further back to capture the full swimming area")

    # 7. Short clip (< 5s: 10)
    duration_s = probe_metrics.get("duration_s", 20.0)
    if duration_s < 5.0:
        score -= 10
        reasons.append(f"Clip duration ({round(duration_s, 1)}s) is short (recommended >= 10s)")
        tips.append("Record 15-30 seconds of continuous footage for reliable behaviour assessment")

    # 8. Contrast (< 18.0: 10)
    contrast = probe_metrics.get("contrast", 50.0)
    if contrast < 18.0:
        score -= 10
        reasons.append(f"Low contrast footage ({round(contrast, 1)} < 18)")
        tips.append("Improve tank lighting and contrast against the background")

    if detection_plausibility and detection_plausibility.get("implausible"):
        score = min(score, 49)
        reasons.append("The tracked object does not look like a fish")
        tips.append("Use a clear clip where the whole fish is visible and keep the camera fixed")

    # Glare and bubble deductions are explicitly bounded.
    if preprocess_metrics.get("strong_glare"):
        score -= 10
        reasons.append("Strong glare covers much of the tank")
        tips.append("Turn off the tank light or film from an angle that avoids reflections")
    elif glare_frac > 0.0:
        score -= min(10, int(round(glare_frac * 40)))
    if bubble_rate >= 5.0:
        score -= 5
        reasons.append("Heavy bubbles are present in the footage")
        tips.append("Reduce aeration bubbles during recording or film from a clearer viewing angle")
    # Clamp score
    score = max(0, min(100, score))

    if score >= 75:
        level = "high"
    elif score >= 50:
        level = "medium"
    else:
        level = "low"

    return {
        "level": level,
        "score": score,
        "reasons": reasons,
        "tips": tips,
        "metrics": {
            "brightness": round(brightness, 1),
            "contrast": round(contrast, 1),
            "sharpness": round(sharpness, 1),
            "shake_px": round(shake_px, 2),
            "coverage_pct": round(coverage_pct, 1),
            "fish_expected": fish_expected,
            "fish_tracked": fish_tracked,
            "fish_median_px": round(fish_median_px, 1),
            "fps": probe_metrics.get("fps", 0.0),
            "width": probe_metrics.get("width", 0),
            "height": probe_metrics.get("height", 0),
            "glare_frac": round(glare_frac, 5),
            "bubble_rate": round(bubble_rate, 3),
            "surface_band_frac": round(surface_band_frac, 5),
        },
    }

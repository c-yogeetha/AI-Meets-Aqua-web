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


def compute_reliability(
    probe_metrics: Dict[str, Any],
    coverage_pct: float,
    fish_expected: int,
    fish_tracked: int,
    fish_median_px: float,
    sharp_min: float = 40.0,
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

    # If zero fish tracked
    if fish_tracked == 0:
        return {
            "level": "low",
            "score": 0,
            "reasons": ["No goldfish detected"],
            "tips": ["Ensure goldfish are present and clearly visible in the video frame"],
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
        },
    }

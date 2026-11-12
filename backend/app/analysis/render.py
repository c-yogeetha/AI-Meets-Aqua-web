import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import imageio_ffmpeg
import numpy as np

from app.analysis.types import Tracks
from app.analysis.video_io import frame_reader
from app.config import settings

# Colors in BGR
COLOR_NORMAL_BGR = (151, 220, 61)   # RGB (61, 220, 151)
COLOR_STRESSED_BGR = (94, 77, 255)  # RGB (255, 77, 94)
COLOR_LOW_CONF_BGR = (160, 160, 160)
COLOR_TEXT_BGR = (255, 255, 255)
COLOR_BG_BADGE = (30, 20, 10)


def draw_dashed_rect(
    frame: np.ndarray,
    pt1: Tuple[int, int],
    pt2: Tuple[int, int],
    color: Tuple[int, int, int],
    thickness: int = 2,
    dash_len: int = 8,
    gap_len: int = 6,
):
    """Draw a dashed rectangle on frame."""
    x1, y1 = pt1
    x2, y2 = pt2
    step = dash_len + gap_len

    # Top & Bottom
    for x in range(x1, x2, step):
        xe = min(x + dash_len, x2)
        cv2.line(frame, (x, y1), (xe, y1), color, thickness)
        cv2.line(frame, (x, y2), (xe, y2), color, thickness)

    # Left & Right
    for y in range(y1, y2, step):
        ye = min(y + dash_len, y2)
        cv2.line(frame, (x1, y), (x1, ye), color, thickness)
        cv2.line(frame, (x2, y), (x2, ye), color, thickness)


def interpolate_box_at_t(
    times: List[float],
    boxes: List[List[float]],
    coasting_flags: List[bool],
    t: float,
    max_gap_s: float = 1.0,
) -> Optional[Tuple[List[float], bool]]:
    """Linearly interpolate bounding box at time t across known detection points."""
    if not times:
        return None
    if t < times[0] or t > times[-1]:
        return None

    idx = np.searchsorted(times, t)
    if idx == 0:
        return boxes[0], coasting_flags[0]
    if idx >= len(times):
        return boxes[-1], coasting_flags[-1]

    t0, t1 = times[idx - 1], times[idx]
    if (t1 - t0) > max_gap_s:
        # Gap too large
        return None

    alpha = (t - t0) / max(t1 - t0, 1e-6)
    b0 = boxes[idx - 1]
    b1 = boxes[idx]

    interp_box = [
        float(b0[0] * (1.0 - alpha) + b1[0] * alpha),
        float(b0[1] * (1.0 - alpha) + b1[1] * alpha),
        float(b0[2] * (1.0 - alpha) + b1[2] * alpha),
        float(b0[3] * (1.0 - alpha) + b1[3] * alpha),
    ]
    is_coasting = coasting_flags[idx - 1] or coasting_flags[idx]
    return interp_box, is_coasting


def render_annotated_video(
    video_path: str,
    tracks: Tracks,
    scoring_result: Dict[str, Any],
    out_dir: str,
) -> Tuple[str, List[Dict[str, Any]], bool]:
    """Render annotated video with interpolated bounding boxes, trails, scores and extract key frames.

    Returns (video_filename, key_moments, has_webm).
    """
    out_p = Path(out_dir)
    out_p.mkdir(parents=True, exist_ok=True)
    frames_dir = out_p / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    fps = tracks.fps if tracks.fps > 0 else 10.0
    width = tracks.width
    height = tracks.height

    # Make dimensions even
    if width % 2 != 0:
        width -= 1
    if height % 2 != 0:
        height -= 1

    # Extract per-fish track arrays for box interpolation
    fish_tracks_data: Dict[str, Dict[str, Any]] = {}
    for fd in tracks.frames:
        t = fd.t
        for det in fd.detections:
            fid = det.id
            if fid not in fish_tracks_data:
                fish_tracks_data[fid] = {
                    "times": [],
                    "boxes": [],
                    "coasting": [],
                }
            fish_tracks_data[fid]["times"].append(t)
            fish_tracks_data[fid]["boxes"].append(det.bbox)
            fish_tracks_data[fid]["coasting"].append(getattr(det, "coasting", False))

    # Map fish info (status, low_confidence, timeline)
    fish_info_map: Dict[str, Dict[str, Any]] = {}
    for fish_info in scoring_result.get("fish", []):
        fid = fish_info["id"]
        fish_info_map[fid] = {
            "stressed": fish_info.get("stressed", False),
            "low_confidence": "low_confidence" in fish_info.get("flags", []) or fish_info.get("confidence", 1.0) < 0.4,
            "timeline": [(pt["t"], pt["score"]) for pt in fish_info.get("timeline", [])],
        }

    tank_timeline = [(pt["t"], pt["score"]) for pt in scoring_result.get("timeline", [])]
    threshold = scoring_result.get("threshold", 35)

    def get_fish_score_at_t(fid: str, t: float) -> int:
        info = fish_info_map.get(fid)
        if not info or not info["timeline"]:
            return 0
        closest = min(info["timeline"], key=lambda item: abs(item[0] - t))
        return closest[1]

    def get_tank_score_at_t(t: float) -> int:
        if not tank_timeline:
            return scoring_result.get("tank_score", 0)
        closest = min(tank_timeline, key=lambda item: abs(item[0] - t))
        return closest[1]

    # History trails: fid -> list of (t, cx, cy)
    trails: Dict[str, List[Tuple[float, float, float]]] = {}

    tmp_mp4 = str(out_p / "tmp_raw.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(tmp_mp4, fourcc, fps, (width, height))

    scored_frames: List[Tuple[float, int, str, str, np.ndarray]] = []
    max_duration_s = min(float(settings.MAX_DURATION_S), 90.0)

    for f_idx, t, frame, fw, fh in frame_reader(video_path, target_width=width, max_fps=fps):
        if t > max_duration_s:
            break

        # Ensure frame dimensions match writer
        if frame.shape[1] != width or frame.shape[0] != height:
            frame = cv2.resize(frame, (width, height))

        t_tank_score = get_tank_score_at_t(t)

        # Interpolate boxes for each fish at timestamp t
        frame_active_boxes: Dict[str, Tuple[List[float], bool]] = {}
        for fid, td in fish_tracks_data.items():
            interp_res = interpolate_box_at_t(td["times"], td["boxes"], td["coasting"], t)
            if interp_res is not None:
                frame_active_boxes[fid] = interp_res

        # Update trails
        for fid, (bbox, _) in frame_active_boxes.items():
            cx = (bbox[0] + bbox[2]) / 2.0
            cy = (bbox[1] + bbox[3]) / 2.0
            if fid not in trails:
                trails[fid] = []
            trails[fid].append((t, cx, cy))
            trails[fid] = [pt for pt in trails[fid] if (t - pt[0]) <= 1.5]

        # Draw trails
        for fid, pts in trails.items():
            if len(pts) >= 2:
                for i in range(len(pts) - 1):
                    p1 = (int(pts[i][1]), int(pts[i][2]))
                    p2 = (int(pts[i + 1][1]), int(pts[i + 1][2]))
                    alpha = max(0.2, min(1.0, 1.0 - (t - pts[i][0]) / 1.5))
                    color = (int(151 * alpha), int(220 * alpha), int(61 * alpha))
                    cv2.line(frame, p1, p2, color, 2)

        highest_frame_fish = None
        highest_frame_fish_score = -1

        for fid, (bbox, is_coasting) in frame_active_boxes.items():
            f_score = get_fish_score_at_t(fid, t)
            f_info = fish_info_map.get(fid, {})
            is_low_conf = f_info.get("low_confidence", False)

            if is_low_conf:
                box_color = COLOR_LOW_CONF_BGR
            elif f_score >= threshold:
                box_color = COLOR_STRESSED_BGR
            else:
                box_color = COLOR_NORMAL_BGR

            x1, y1, x2, y2 = [int(round(v)) for v in bbox]
            x1 = max(0, min(x1, width - 1))
            x2 = max(x1 + 2, min(x2, width))
            y1 = max(0, min(y1, height - 1))
            y2 = max(y1 + 2, min(y2, height))

            if is_coasting:
                draw_dashed_rect(frame, (x1, y1), (x2, y2), box_color, thickness=2)
            else:
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

            label = f"{fid}  {f_score}" if not is_low_conf else f"{fid}  --"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            label_y1 = max(0, y1 - th - 6)
            cv2.rectangle(frame, (x1, label_y1), (x1 + tw + 6, y1), box_color, -1)
            cv2.putText(
                frame,
                label,
                (x1 + 3, max(th, y1 - 3)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 0, 0),
                1,
                cv2.LINE_AA,
            )

            if f_score > highest_frame_fish_score and not is_low_conf:
                highest_frame_fish_score = f_score
                highest_frame_fish = fid

        # Draw tank score badge
        level_str = "Normal" if t_tank_score <= 34 else ("Moderate" if t_tank_score <= 59 else "High")
        badge_text = f"Tank score {t_tank_score} - {level_str}"
        (bw, bh), _ = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(frame, (10, 10), (20 + bw, 20 + bh + 4), COLOR_BG_BADGE, -1)
        badge_color = COLOR_STRESSED_BGR if t_tank_score >= threshold else COLOR_NORMAL_BGR
        cv2.putText(
            frame,
            badge_text,
            (15, 15 + bh),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            badge_color,
            1,
            cv2.LINE_AA,
        )

        writer.write(frame)

        if highest_frame_fish is not None:
            scored_frames.append((t, t_tank_score, highest_frame_fish, level_str, frame.copy()))

    writer.release()

    final_mp4 = str(out_p / "annotated.mp4")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    h264_cmd = [
        ffmpeg_exe,
        "-y",
        "-i",
        tmp_mp4,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-preset",
        "veryfast",
        "-crf",
        "24",
        final_mp4,
    ]
    res = subprocess.run(h264_cmd, capture_output=True, text=True)
    video_filename = "annotated.mp4"

    # Verify H.264 in ffmpeg probe
    h264_ok = False
    if res.returncode == 0 and Path(final_mp4).exists():
        probe_res = subprocess.run(
            [ffmpeg_exe, "-hide_banner", "-i", final_mp4],
            capture_output=True,
            text=True,
        )
        if "h264" in probe_res.stderr.lower():
            h264_ok = True

    # If h264 failed or libx264 missing, transcode to VP9 WebM as primary source
    if not h264_ok:
        final_webm = str(out_p / "annotated.webm")
        webm_cmd = [
            ffmpeg_exe,
            "-y",
            "-i",
            tmp_mp4,
            "-c:v",
            "libvpx-vp9",
            "-b:v",
            "1M",
            "-deadline",
            "realtime",
            "-cpu-used",
            "8",
            "-pix_fmt",
            "yuv420p",
            final_webm,
        ]
        subprocess.run(webm_cmd, capture_output=True)
        if Path(final_webm).exists():
            video_filename = "annotated.webm"

    # If ENCODE_WEBM=1, also produce annotated.webm (for test browsers like Chromium)
    has_webm = False
    if settings.ENCODE_WEBM == 1:
        alt_webm = str(out_p / "annotated.webm")
        if not Path(alt_webm).exists():
            webm_cmd = [
                ffmpeg_exe,
                "-y",
                "-i",
                tmp_mp4 if os.path.exists(tmp_mp4) else final_mp4,
                "-c:v",
                "libvpx-vp9",
                "-b:v",
                "1M",
                "-deadline",
                "realtime",
                "-cpu-used",
                "8",
                "-pix_fmt",
                "yuv420p",
                alt_webm,
            ]
            subprocess.run(webm_cmd, capture_output=True)
        if Path(alt_webm).exists():
            has_webm = True

    if os.path.exists(tmp_mp4):
        try:
            os.unlink(tmp_mp4)
        except OSError:
            pass

    # Extract up to 6 key frames at highest scores spaced out
    key_moments: List[Dict[str, Any]] = []
    if scored_frames:
        sorted_frames = sorted(scored_frames, key=lambda sf: sf[1], reverse=True)
        chosen: List[Tuple[float, int, str, str, np.ndarray]] = []
        for sf in sorted_frames:
            if all(abs(sf[0] - ch[0]) >= 2.0 for ch in chosen):
                chosen.append(sf)
                if len(chosen) >= 6:
                    break

        chosen.sort(key=lambda sf: sf[0])
        for idx, (kf_t, kf_score, kf_fid, kf_level, kf_img) in enumerate(chosen):
            kf_name = f"kf_{idx + 1:02d}.jpg"
            kf_path = frames_dir / kf_name

            # Downscale key frame to width <= 640
            kh, kw = kf_img.shape[:2]
            if kw > 640:
                k_new_h = int(round(kh * (640.0 / kw)))
                kf_img = cv2.resize(kf_img, (640, k_new_h), interpolation=cv2.INTER_AREA)

            cv2.imwrite(str(kf_path), kf_img, [cv2.IMWRITE_JPEG_QUALITY, 82])

            b_label = "Elevated activity" if kf_score >= threshold else "Routine activity"
            key_moments.append({
                "t": round(kf_t, 1),
                "fish": kf_fid,
                "behaviour": "surface_gasping" if "surface" in kf_level.lower() else "elevated_stress",
                "label": f"{kf_fid} ({b_label})",
                "frame_url": f"/api/v1/results/placeholder/frames/{kf_name}",
            })

    return video_filename, key_moments, has_webm

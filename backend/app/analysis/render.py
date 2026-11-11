import os
from pathlib import Path
import subprocess
from typing import Any, Dict, List, Tuple
import cv2
import imageio_ffmpeg
import numpy as np
from app.analysis.types import Tracks
from app.analysis.video_io import frame_reader

# Colors in BGR
COLOR_NORMAL_BGR = (151, 220, 61)   # RGB (61, 220, 151)
COLOR_STRESSED_BGR = (94, 77, 255)  # RGB (255, 77, 94)
COLOR_TEXT_BGR = (255, 255, 255)
COLOR_BG_BADGE = (30, 20, 10)


def render_annotated_video(
    video_path: str,
    tracks: Tracks,
    scoring_result: Dict[str, Any],
    out_dir: str,
) -> Tuple[str, List[Dict[str, Any]]]:
    """Render annotated video with bounding boxes, trails, scores and extract key frames."""
    out_p = Path(out_dir)
    out_p.mkdir(parents=True, exist_ok=True)
    frames_dir = out_p / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    fps = tracks.fps if tracks.fps > 0 else 10.0
    width = tracks.width
    height = tracks.height

    # Map time to detections and window scores
    frame_det_map: Dict[float, Dict[str, List[float]]] = {}
    for fd in tracks.frames:
        frame_det_map[fd.t] = {d.id: d.bbox for d in fd.detections}

    # Map fish ID to window timeline: list of (t, score)
    fish_timeline_map: Dict[str, List[Tuple[float, int]]] = {}
    for fish_info in scoring_result.get("fish", []):
        fid = fish_info["id"]
        fish_timeline_map[fid] = [(pt["t"], pt["score"]) for pt in fish_info.get("timeline", [])]

    tank_timeline = [(pt["t"], pt["score"]) for pt in scoring_result.get("timeline", [])]
    threshold = scoring_result.get("threshold", 35)

    def get_fish_score_at_t(fid: str, t: float) -> int:
        pts = fish_timeline_map.get(fid, [])
        if not pts:
            return 0
        closest = min(pts, key=lambda item: abs(item[0] - t))
        return closest[1]

    def get_tank_score_at_t(t: float) -> int:
        if not tank_timeline:
            return scoring_result.get("tank_score", 0)
        closest = min(tank_timeline, key=lambda item: abs(item[0] - t))
        return closest[1]

    # Keep track of history trails: fid -> list of (t, cx, cy)
    trails: Dict[str, List[Tuple[float, float, float]]] = {}

    tmp_mp4 = str(out_p / "tmp_raw.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(tmp_mp4, fourcc, fps, (width, height))

    # For key moments: pick up to 6 interesting frames with highest tank score or fish stress
    scored_frames: List[Tuple[float, int, str, str, np.ndarray]] = []

    for f_idx, t, frame, fw, fh in frame_reader(video_path, target_width=width, max_fps=fps):
        dets = frame_det_map.get(t, {})
        # If exact timestamp not found, find nearest
        if not dets and frame_det_map:
            nearest_t = min(frame_det_map.keys(), key=lambda k: abs(k - t))
            if abs(nearest_t - t) <= 0.15:
                dets = frame_det_map[nearest_t]

        t_tank_score = get_tank_score_at_t(t)

        # Update trails
        for fid, bbox in dets.items():
            cx = (bbox[0] + bbox[2]) / 2.0
            cy = (bbox[1] + bbox[3]) / 2.0
            if fid not in trails:
                trails[fid] = []
            trails[fid].append((t, cx, cy))
            # Keep 1.5 seconds of trail
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

        # Draw fish boxes & labels
        highest_frame_fish = None
        highest_frame_fish_score = -1

        for fid, bbox in dets.items():
            f_score = get_fish_score_at_t(fid, t)
            stressed = f_score >= threshold
            box_color = COLOR_STRESSED_BGR if stressed else COLOR_NORMAL_BGR

            x1, y1, x2, y2 = [int(v) for v in bbox]
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

            # Label text: Fish_N  score
            label = f"{fid}  {f_score}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(frame, (x1, max(0, y1 - th - 6)), (x1 + tw + 6, y1), box_color, -1)
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

            if f_score > highest_frame_fish_score:
                highest_frame_fish_score = f_score
                highest_frame_fish = fid

        # Draw top-left Tank badge
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

        # Candidate for key moment
        if highest_frame_fish is not None:
            scored_frames.append((t, t_tank_score, highest_frame_fish, level_str, frame.copy()))

    writer.release()

    # Transcode to browser-playable H.264
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
    res = subprocess.run(h264_cmd, capture_output=True)
    video_filename = "annotated.mp4"

    # Fallback to webm if h264 failed or returned non-zero
    if res.returncode != 0 or not Path(final_mp4).exists():
        final_webm = str(out_p / "annotated.webm")
        webm_cmd = [
            ffmpeg_exe,
            "-y",
            "-i",
            tmp_mp4,
            "-c:v",
            "libvpx-vp9",
            final_webm,
        ]
        subprocess.run(webm_cmd, capture_output=True)
        if Path(final_webm).exists():
            video_filename = "annotated.webm"

    if os.path.exists(tmp_mp4):
        try:
            os.unlink(tmp_mp4)
        except OSError:
            pass

    # Extract up to 6 key frames at highest scores spaced out
    key_moments: List[Dict[str, Any]] = []
    if scored_frames:
        # Sort by tank score descending
        sorted_frames = sorted(scored_frames, key=lambda sf: sf[1], reverse=True)
        chosen: List[Tuple[float, int, str, str, np.ndarray]] = []
        for sf in sorted_frames:
            # Enforce at least 2.0s separation between key frames
            if all(abs(sf[0] - ch[0]) >= 2.0 for ch in chosen):
                chosen.append(sf)
                if len(chosen) >= 6:
                    break

        chosen.sort(key=lambda sf: sf[0])  # sort by time ascending
        for idx, (kf_t, kf_score, kf_fid, kf_level, kf_img) in enumerate(chosen):
            kf_name = f"kf_{idx + 1:02d}.jpg"
            kf_path = frames_dir / kf_name
            cv2.imwrite(str(kf_path), kf_img, [cv2.IMWRITE_JPEG_QUALITY, 85])

            # Behaviour label
            behaviour_label = "Elevated activity" if kf_score >= threshold else "Routine activity"
            key_moments.append({
                "t": round(kf_t, 1),
                "fish": kf_fid,
                "behaviour": "surface_gasping" if "surface" in kf_level.lower() else "elevated_stress",
                "label": f"{kf_fid} ({kf_level})",
                "frame_url": f"/api/v1/results/placeholder/frames/{kf_name}",
            })

    return video_filename, key_moments

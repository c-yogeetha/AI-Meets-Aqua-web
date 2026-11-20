import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Generator, Optional, Tuple

import cv2
import imageio_ffmpeg


def probe_video_stream(video_path: str) -> Dict[str, Any]:
    """Probe video streams, returning codec, resolution, fps, rotation."""
    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        res = subprocess.run(
            [ffmpeg_exe, "-i", video_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=15,
        )
        err = res.stderr or ""
    except Exception:
        err = ""

    has_video = False
    codec = "unknown"
    width = 0
    height = 0
    fps = 0.0
    rotation = 0

    for line in err.splitlines():
        if "Stream #" in line and "Video:" in line:
            has_video = True
            parts = line.split("Video:")[1].split(",")
            codec = parts[0].strip().split()[0].lower()
            dim_match = re.search(r"(\d{2,5})x(\d{2,5})", line)
            if dim_match:
                width = int(dim_match.group(1))
                height = int(dim_match.group(2))
            fps_match = re.search(r"([\d\.]+)\s+fps", line)
            if fps_match:
                fps = float(fps_match.group(1))
        if "rotate" in line.lower() or "rotation" in line.lower():
            rot_match = re.search(r"rotate\s*:\s*(\d+)", line, re.IGNORECASE)
            if rot_match:
                rotation = int(rot_match.group(1))

    return {
        "has_video": has_video,
        "codec": codec,
        "width": width,
        "height": height,
        "fps": fps,
        "rotation": rotation,
    }


def normalize_video_on_ingest(input_path: str) -> str:
    """Normalize video: transcode if not H.264/VP8/VP9/MPEG-4, long side > 1280, or rotation tag.

    Leaves compliant files completely untouched.
    """
    probe = probe_video_stream(input_path)
    if not probe["has_video"] or probe["width"] <= 0 or probe["height"] <= 0:
        return input_path

    is_compliant_codec = probe["codec"] in ("h264", "vp8", "vp9", "mpeg4")
    needs_transcode = (
        not is_compliant_codec
        or max(probe["width"], probe["height"]) > 1280
        or probe["fps"] > 25.5
        or probe["rotation"] != 0
    )

    if not needs_transcode:
        return input_path

    # Transcode into a normalized mp4 next to input
    inp = Path(input_path)
    norm_path = inp.parent / f"{inp.stem}_norm.mp4"

    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        scale_filter = "scale='if(gt(max(iw,ih),1280),if(gte(iw,ih),1280,-2),iw)':'if(gt(max(iw,ih),1280),if(gt(ih,iw),1280,-2),ih)'"
        cmd = [
            ffmpeg_exe,
            "-y",
            "-i",
            input_path,
            "-vf",
            scale_filter,
            "-r",
            "25",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "veryfast",
            "-crf",
            "26",
            "-an",
            str(norm_path),
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=120)
        if res.returncode == 0 and norm_path.exists() and norm_path.stat().st_size > 0:
            # Replace original input with normalized copy
            # Keep original only if it was already small (< 5 MB), else unlink
            if inp.stat().st_size > 5 * 1024 * 1024:
                try:
                    inp.unlink()
                except OSError:
                    pass
            norm_path.replace(inp)
            return str(inp)
    except Exception:
        if norm_path.exists():
            norm_path.unlink(missing_ok=True)

    return input_path


def transcode_with_ffmpeg(input_path: str, output_path: str) -> bool:
    """Transcode odd formats (HEVC, etc.) to standard H.264 mp4."""
    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ffmpeg_exe,
            "-y",
            "-i",
            input_path,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "scale='min(1280,iw)':-2",
            "-preset",
            "veryfast",
            "-crf",
            "26",
            output_path,
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=60)
        return res.returncode == 0 and Path(output_path).exists() and Path(output_path).stat().st_size > 0
    except Exception:
        return False


def get_video_metadata(video_path: str) -> Dict[str, float]:
    """Inspect video and return fps, duration_s, width, height, frame_count."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        # Attempt ffmpeg transcode fallback
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            if transcode_with_ffmpeg(video_path, tmp_path):
                cap = cv2.VideoCapture(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    if not cap.isOpened():
        raise ValueError("not_a_video")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0 or fps > 240:
        fps = 25.0
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Read at least one frame to verify decoding
    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None or width <= 0 or height <= 0:
        raise ValueError("not_a_video")

    if frame_count <= 0:
        frame_count = 1.0

    duration_s = float(frame_count / fps)

    return {
        "fps": round(float(fps), 2),
        "frame_count": int(frame_count),
        "duration_s": round(duration_s, 2),
        "width": width,
        "height": height,
    }


def frame_reader(
    video_path: str,
    target_width: int = 640,
    max_fps: float = 10.0,
) -> Generator[Tuple[int, float, cv2.Mat, int, int], None, None]:
    """Yield (frame_idx, timestamp_s, resized_frame_bgr, width, height).

    Strides frames so effective fps <= max_fps.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("not_a_video")

    orig_fps = cap.get(cv2.CAP_PROP_FPS)
    if not orig_fps or orig_fps <= 0:
        orig_fps = 25.0

    stride = max(1, int(round(orig_fps / max_fps)))

    frame_idx = 0
    read_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        if read_idx % stride == 0:
            h, w = frame.shape[:2]
            if w > target_width:
                scale = target_width / float(w)
                new_w = target_width
                new_h = int(round(h * scale))
                # Ensure even dimensions
                new_h = new_h if new_h % 2 == 0 else new_h + 1
                frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

            cur_h, cur_w = frame.shape[:2]
            t = round(read_idx / orig_fps, 3)
            yield (frame_idx, t, frame, cur_w, cur_h)
            frame_idx += 1

        read_idx += 1

    cap.release()

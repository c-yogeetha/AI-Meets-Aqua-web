import hashlib
from pathlib import Path
from typing import Optional
import numpy as np
from app.analysis.types import Detection, FrameDetections, Tracks


def generate_mock_tracks(
    video_path: str,
    goldfish_count: int = 3,
    duration_s: float = 20.0,
    fps: float = 15.0,
    width: int = 640,
    height: int = 360,
    forced_scenario: Optional[str] = None,
) -> Tracks:
    """Generate deterministic synthetic tracks from video file hash."""
    path = Path(video_path)
    if path.exists():
        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            chunk = f.read(65536)
            while chunk:
                hasher.update(chunk)
                chunk = f.read(65536)
        seed = int.from_bytes(hasher.digest()[:8], byteorder="big")
    else:
        seed = 42

    rng = np.random.RandomState(seed % (2**32))

    if forced_scenario:
        scenario = forced_scenario
    else:
        scenarios = ["calm", "stressed", "severe"]
        scenario = scenarios[seed % len(scenarios)]

    goldfish_count = max(1, min(goldfish_count, 10))
    total_frames = int(round(duration_s * fps))
    dt = 1.0 / fps

    # Fish parameters
    bl = 50.0  # body length ~ 50px
    fish_tracks = []

    for idx in range(goldfish_count):
        fid = f"Fish_{idx + 1}"
        # Starting positions
        cx = rng.uniform(width * 0.25, width * 0.75)
        cy = rng.uniform(height * 0.35, height * 0.65)

        is_stressed = False
        if scenario == "stressed" and idx == 0:
            is_stressed = True
        elif scenario == "severe" and idx < 2:
            is_stressed = True

        positions = []
        for f in range(total_frames):
            t = f * dt
            if is_stressed:
                # Fast speed (> 3.5 BL/s) and sharp direction changes
                step_bl = rng.uniform(4.0, 6.0)
                speed_px = step_bl * bl * dt
                angle = rng.uniform(0, 2 * np.pi)
                cx += speed_px * np.cos(angle)
                cy += speed_px * np.sin(angle)
                # Keep near top 12% for gasping or bound to screen
                cy = min(max(cy, height * 0.05), height * 0.14)
                cx = min(max(cx, 40), width - 40)
            else:
                # Calm swimming (~ 1 BL/s)
                step_bl = rng.uniform(0.8, 1.2)
                speed_px = step_bl * bl * dt
                # Smooth wandering
                cx += speed_px * np.cos(t * 0.5 + idx)
                cy += speed_px * np.sin(t * 0.5 + idx)
                cy = min(max(cy, height * 0.3), height * 0.7)
                cx = min(max(cx, 60), width - 60)

            w, h = 56.0, 26.0
            x1 = max(0.0, cx - w / 2)
            y1 = max(0.0, cy - h / 2)
            x2 = min(float(width), cx + w / 2)
            y2 = min(float(height), cy + h / 2)
            positions.append((t, fid, [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)]))

        fish_tracks.append(positions)

    # Assemble FrameDetections
    frame_list = []
    for f in range(total_frames):
        t = round(f * dt, 3)
        dets = []
        for fish_p in fish_tracks:
            _, fid, bbox = fish_p[f]
            dets.append(Detection(id=fid, bbox=bbox, conf=0.95))
        frame_list.append(FrameDetections(t=t, detections=dets))

    return Tracks(
        fps=fps,
        width=width,
        height=height,
        duration_s=duration_s,
        frames=frame_list,
    )

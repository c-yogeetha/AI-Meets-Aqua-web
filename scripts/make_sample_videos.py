#!/usr/bin/env python3
import json
import math
import os
from pathlib import Path
import cv2
import numpy as np


def draw_goldfish(frame: np.ndarray, cx: float, cy: float, vx: float, vy: float, bl: float = 56.0):
    """Draw realistic orange goldfish ellipse with directional tail and eye."""
    h, w = frame.shape[:2]
    speed = math.hypot(vx, vy)
    angle_deg = math.degrees(math.atan2(vy, vx)) if speed > 1e-4 else 0.0

    # Body ellipse: orange color in BGR is (30, 130, 245) -> HSV: H in [10, 25], S > 150, V > 200
    fish_bgr = (25, 130, 250)
    body_len = int(bl)
    body_width = int(bl * 0.45)

    cv2.ellipse(
        frame,
        (int(cx), int(cy)),
        (body_len // 2, body_width // 2),
        angle_deg,
        0,
        360,
        fish_bgr,
        -1,
        cv2.LINE_AA,
    )

    # Tail triangle behind fish
    rad = math.radians(angle_deg)
    back_x = cx - (body_len // 2) * math.cos(rad)
    back_y = cy - (body_len // 2) * math.sin(rad)

    tail_len = bl * 0.4
    tail_span = bl * 0.35
    t1_x = back_x - tail_len * math.cos(rad) + tail_span * math.sin(rad)
    t1_y = back_y - tail_len * math.sin(rad) - tail_span * math.cos(rad)
    t2_x = back_x - tail_len * math.cos(rad) - tail_span * math.sin(rad)
    t2_y = back_y - tail_len * math.sin(rad) + tail_span * math.cos(rad)

    tail_pts = np.array([[back_x, back_y], [t1_x, t1_y], [t2_x, t2_y]], dtype=np.int32)
    cv2.fillPoly(frame, [tail_pts], (35, 140, 255), cv2.LINE_AA)

    # Eye
    eye_x = cx + (body_len * 0.3) * math.cos(rad) - (body_width * 0.2) * math.sin(rad)
    eye_y = cy + (body_len * 0.3) * math.sin(rad) + (body_width * 0.2) * math.cos(rad)
    cv2.circle(frame, (int(eye_x), int(eye_y)), max(2, int(bl * 0.05)), (10, 10, 10), -1)


def generate_scenario_video(
    output_path: Path,
    scenario: str,
    fps: float = 15.0,
    duration_s: float = 20.0,
    width: int = 640,
    height: int = 360,
):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    vw = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    total_frames = int(round(duration_s * fps))
    dt = 1.0 / fps
    bl = 52.0

    # Create static tank background: blue vertical gradient + plants
    base_bg = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        # Gradient from ocean to deep blue
        ratio = y / float(height)
        b = int(140 * (1 - ratio) + 60 * ratio)
        g = int(80 * (1 - ratio) + 30 * ratio)
        r = int(20 * (1 - ratio) + 8 * ratio)
        base_bg[y, :] = (b, g, r)

    # Add green plant decorations at sides (green hue H in [35, 80], completely distinct from orange)
    plant_color = (40, 160, 50)  # BGR
    cv2.ellipse(base_bg, (40, height - 30), (25, 90), -15, 0, 360, plant_color, -1)
    cv2.ellipse(base_bg, (600, height - 35), (28, 100), 20, 0, 360, plant_color, -1)

    # Seed RNG per scenario
    seed_map = {
        "calm": 101,
        "stressed_one": 202,
        "gasping_surface": 303,
        "isolated_bottom": 404,
        "severe_mixed": 505,
        "blank": 999,
    }
    rng = np.random.RandomState(seed_map.get(scenario, 42))

    if scenario == "blank":
        # Empty tank
        for _ in range(total_frames):
            frame = base_bg.copy()
            noise = rng.randint(-3, 4, frame.shape).astype(np.int16)
            frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            vw.write(frame)
        vw.release()
        return

    # Initialize 3 fish state
    fish_states = []
    for i in range(3):
        fish_states.append({
            "cx": rng.uniform(width * 0.25, width * 0.75),
            "cy": rng.uniform(height * 0.35, height * 0.65),
            "vx": rng.uniform(-1.0, 1.0) * bl,
            "vy": rng.uniform(-0.5, 0.5) * bl,
            "heading": rng.uniform(0, 2 * math.pi),
        })

    # Render frames
    for f in range(total_frames):
        t = f * dt
        frame = base_bg.copy()

        # Slight water shimmer noise
        noise = rng.randint(-2, 3, frame.shape).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        for i, s in enumerate(fish_states):
            cx, cy = s["cx"], s["cy"]
            vx, vy = s["vx"], s["vy"]

            if scenario == "calm":
                # Smooth slow swimming (~ 1 BL/s)
                speed = 1.1 * bl
                s["heading"] += rng.uniform(-0.15, 0.15)
                vx = speed * math.cos(s["heading"])
                vy = speed * math.sin(s["heading"])
                cx += vx * dt
                cy += vy * dt
                # Mid-water bounds (30% to 70% height)
                if cx < 60 or cx > width - 60:
                    s["heading"] = math.pi - s["heading"]
                if cy < height * 0.25 or cy > height * 0.75:
                    s["heading"] = -s["heading"]

            elif scenario == "stressed_one":
                if i == 0:
                    # Fish 0 darts fast (> 4 BL/s) with sharp turns every ~0.3s near surface (top 12%)
                    speed = 11.0 * bl
                    if f % 5 == 0:  # sharp turn
                        s["heading"] += rng.choice([-1.5, 1.5])
                    vx = speed * math.cos(s["heading"])
                    vy = speed * 0.25 * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    # Keep near surface (top 12%)
                    if cy < height * 0.05:
                        cy = height * 0.05
                        s["heading"] = -s["heading"]
                    elif cy > height * 0.13:
                        cy = height * 0.13
                        s["heading"] = -s["heading"]

                    if cx < 50:
                        cx = 50.0
                        s["heading"] = rng.uniform(-0.4, 0.4)
                    elif cx > width - 50:
                        cx = float(width - 50)
                        s["heading"] = math.pi + rng.uniform(-0.4, 0.4)
                else:
                    # Fish 1 and 2 calm
                    speed = 1.0 * bl
                    s["heading"] += rng.uniform(-0.15, 0.15)
                    vx = speed * math.cos(s["heading"])
                    vy = speed * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    if cx < 60 or cx > width - 60:
                        s["heading"] = math.pi - s["heading"]
                    if cy < height * 0.3 or cy > height * 0.7:
                        s["heading"] = -s["heading"]

            elif scenario == "gasping_surface":
                if i == 0:
                    # Fish 0 hovers near surface (top 10%) with moderate speed (1.5 BL/s)
                    speed = 1.4 * bl
                    s["heading"] += rng.uniform(-0.1, 0.1)
                    vx = speed * math.cos(s["heading"])
                    vy = 0.2 * bl * math.sin(t * 3.0)
                    cx += vx * dt
                    cy += vy * dt
                    cy = np.clip(cy, height * 0.04, height * 0.12)
                    if cx < 60 or cx > width - 60:
                        s["heading"] = math.pi - s["heading"]
                else:
                    # Calm mid-water
                    speed = 1.0 * bl
                    s["heading"] += rng.uniform(-0.1, 0.1)
                    vx = speed * math.cos(s["heading"])
                    vy = speed * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    if cx < 60 or cx > width - 60:
                        s["heading"] = math.pi - s["heading"]
                    if cy < height * 0.35 or cy > height * 0.75:
                        s["heading"] = -s["heading"]

            elif scenario == "isolated_bottom":
                if i == 0:
                    # Fish 0 stays still in bottom corner (> 35% diag from others, bottom > 85%)
                    cx = 90.0 + 3.0 * math.sin(t * 0.5)
                    cy = height * 0.90 + 2.0 * math.cos(t * 0.5)
                    vx = 0.05 * bl
                    vy = 0.02 * bl
                else:
                    # Fish 1 and 2 swim together in top-right area
                    speed = 1.2 * bl
                    s["heading"] += rng.uniform(-0.15, 0.15)
                    vx = speed * math.cos(s["heading"])
                    vy = speed * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    cx = np.clip(cx, width * 0.45, width - 60)
                    cy = np.clip(cy, height * 0.2, height * 0.6)

            elif scenario == "severe_mixed":
                # All 3 stressed: Fish 0 surface darting, Fish 1 bottom erratic darting, Fish 2 surface darting
                if i == 0 or i == 2:
                    speed = 11.0 * bl
                    if f % 5 == 0:
                        s["heading"] += rng.choice([-1.5, 1.5])
                    vx = speed * math.cos(s["heading"])
                    vy = speed * 0.25 * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    cy = np.clip(cy, height * 0.05, height * 0.14)
                    if cx < 50 or cx > width - 50:
                        vx = -vx
                else:
                    # Bottom erratic darting in corner
                    speed = 8.5 * bl
                    if f % 4 == 0:
                        s["heading"] += rng.choice([-1.8, 1.8])
                    vx = speed * math.cos(s["heading"])
                    vy = speed * 0.2 * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    cy = np.clip(cy, height * 0.86, height * 0.94)
                    if cx < width * 0.60 or cx > width - 40:
                        vx = -vx

            # Clamp coordinates
            cx = np.clip(cx, 35, width - 35)
            cy = np.clip(cy, 25, height - 25)

            s["cx"] = cx
            s["cy"] = cy
            s["vx"] = vx
            s["vy"] = vy

            draw_goldfish(frame, cx, cy, vx, vy, bl=bl)

        vw.write(frame)

    vw.release()


def main():
    samples_dir = Path(__file__).resolve().parent.parent / "samples"
    samples_dir.mkdir(parents=True, exist_ok=True)

    scenarios = [
        "calm",
        "stressed_one",
        "gasping_surface",
        "isolated_bottom",
        "severe_mixed",
        "blank",
    ]

    for sc in scenarios:
        out_file = samples_dir / f"{sc}.mp4"
        print(f"Generating {out_file.name}...")
        generate_scenario_video(out_file, scenario=sc)

    # Write manifest.json
    manifest = {
        "calm.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "tank_score_max": 34,
                "stressed_count": 0,
                "flags_any": [],
                "min_score": None,
                "level_in": ["Normal"],
            },
        },
        "stressed_one.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "tank_score_min": 35,
                "stressed_count": 1,
                "flags_any": ["fast_swimming", "erratic_swimming", "surface_gasping"],
                "min_score": 35,
                "level_in": ["Moderate", "High"],
            },
        },
        "gasping_surface.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "flags_any": ["surface_gasping"],
                "min_score": 20,
                "level_in": ["Normal", "Moderate"],
            },
        },
        "isolated_bottom.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "flags_any": ["isolation", "bottom_inactivity"],
                "min_score": 30,
                "level_in": ["Normal", "Moderate"],
            },
        },
        "severe_mixed.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "tank_score_min": 45,
                "flags_any": ["surface_gasping"],
                "min_score": 45,
                "level_in": ["Moderate", "High"],
            },
        },
        "blank.mp4": {
            "fish_count": 0,
            "view": "side",
            "expect": {
                "tank_score_max": 0,
                "stressed_count": 0,
                "flags_any": [],
                "min_score": 0,
                "level_in": ["Normal"],
            },
        },
    }

    manifest_file = samples_dir / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest written to {manifest_file}")


if __name__ == "__main__":
    main()

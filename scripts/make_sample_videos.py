#!/usr/bin/env python3
import json
import math
import os
from pathlib import Path
import cv2
import numpy as np


def draw_goldfish(
    frame: np.ndarray,
    cx: float,
    cy: float,
    vx: float,
    vy: float,
    bl: float = 56.0,
    fish_bgr: tuple = (25, 130, 250),
):
    """Draw realistic goldfish ellipse with directional tail and eye."""
    h, w = frame.shape[:2]
    speed = math.hypot(vx, vy)
    angle_deg = math.degrees(math.atan2(vy, vx)) if speed > 1e-4 else 0.0

    body_len = max(4, int(bl))
    body_width = max(2, int(bl * 0.45))

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
    # Tail color slightly shifted
    tail_color = tuple(min(255, c + 10) for c in fish_bgr)
    cv2.fillPoly(frame, [tail_pts], tail_color, cv2.LINE_AA)

    # Eye (if fish is large enough)
    if bl >= 16.0:
        eye_x = cx + (body_len * 0.3) * math.cos(rad) - (body_width * 0.2) * math.sin(rad)
        eye_y = cy + (body_len * 0.3) * math.sin(rad) + (body_width * 0.2) * math.cos(rad)
        cv2.circle(frame, (int(eye_x), int(eye_y)), max(1, int(bl * 0.05)), (10, 10, 10), -1)


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
    if scenario == "tiny_fish":
        bl = 10.0  # 10px / 640px = 1.56% (< 2% of frame width)

    # Create static tank background: blue vertical gradient + plants
    base_bg = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        ratio = y / float(height)
        b = int(140 * (1 - ratio) + 60 * ratio)
        g = int(80 * (1 - ratio) + 30 * ratio)
        r = int(20 * (1 - ratio) + 8 * ratio)
        base_bg[y, :] = (b, g, r)

    # Add green plant decorations at sides
    plant_color = (40, 160, 50)
    cv2.ellipse(base_bg, (40, height - 30), (25, 90), -15, 0, 360, plant_color, -1)
    cv2.ellipse(base_bg, (600, height - 35), (28, 100), 20, 0, 360, plant_color, -1)

    # In plants_decoy scenario, add an orange static plant decoration that matches fish color
    if scenario == "plants_decoy":
        orange_decoy_color = (25, 130, 250)
        cv2.ellipse(base_bg, (320, height - 40), (35, 70), 0, 0, 360, orange_decoy_color, -1)

    # Seed RNG per scenario
    seed_map = {
        "calm": 101,
        "stressed_one": 202,
        "gasping_surface": 303,
        "isolated_bottom": 404,
        "severe_mixed": 505,
        "blank": 999,
        "lethargic_all": 606,
        "white_fish": 707,
        "two_fish_overlap": 808,
        "plants_decoy": 909,
        "dark": 111,
        "blurred": 222,
        "shaky": 333,
        "tiny_fish": 444,
    }
    rng = np.random.RandomState(seed_map.get(scenario, 42))

    if scenario == "blank":
        for _ in range(total_frames):
            frame = base_bg.copy()
            noise = rng.randint(-3, 4, frame.shape).astype(np.int16)
            frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            vw.write(frame)
        vw.release()
        return

    # Determine fish count & color
    num_fish = 3
    fish_color = (25, 130, 250)
    if scenario == "white_fish":
        fish_color = (240, 240, 245)  # White/silver fish
    elif scenario == "two_fish_overlap":
        num_fish = 2

    # Initialize fish state
    fish_states = []
    if scenario == "two_fish_overlap":
        # Fish 0 travels from left to right, Fish 1 travels from right to left
        fish_states = [
            {"cx": 90.0, "cy": float(height // 2), "vx": 2.2 * bl, "vy": 0.0, "heading": 0.0},
            {"cx": float(width - 90), "cy": float(height // 2), "vx": -2.2 * bl, "vy": 0.0, "heading": math.pi},
        ]
    elif scenario == "lethargic_all":
        # All 3 fish resting near bottom or stationary
        fish_states = [
            {"cx": width * 0.25, "cy": height * 0.88, "vx": 0.0, "vy": 0.0, "heading": 0.0},
            {"cx": width * 0.50, "cy": height * 0.90, "vx": 0.0, "vy": 0.0, "heading": 0.0},
            {"cx": width * 0.75, "cy": height * 0.86, "vx": 0.0, "vy": 0.0, "heading": 0.0},
        ]
    else:
        for i in range(num_fish):
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

        # Water shimmer noise
        noise = rng.randint(-2, 3, frame.shape).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        for i, s in enumerate(fish_states):
            cx, cy = s["cx"], s["cy"]
            vx, vy = s["vx"], s["vy"]

            if scenario == "two_fish_overlap":
                # Move across each other
                cx += vx * dt
                cy += vy * dt
                if cx > width - 50 and vx > 0:
                    vx = -vx
                    s["heading"] = math.pi
                elif cx < 50 and vx < 0:
                    vx = -vx
                    s["heading"] = 0.0

            elif scenario == "lethargic_all":
                if t < 1.5:
                    # Slow settling movement during first 1.5s
                    vx = 0.5 * bl * (1.5 - t)
                    vy = 0.3 * bl * (1.5 - t)
                    cx += vx * dt
                    cy += vy * dt
                else:
                    # Completely still resting near bottom
                    vx = 0.0
                    vy = 0.0

            elif scenario == "calm" or scenario in ["white_fish", "plants_decoy", "dark", "blurred", "shaky", "tiny_fish"]:
                speed = 1.1 * bl
                s["heading"] += rng.uniform(-0.15, 0.15)
                vx = speed * math.cos(s["heading"])
                vy = speed * math.sin(s["heading"])
                cx += vx * dt
                cy += vy * dt
                if cx < 60 or cx > width - 60:
                    s["heading"] = math.pi - s["heading"]
                if cy < height * 0.25 or cy > height * 0.75:
                    s["heading"] = -s["heading"]

            elif scenario == "stressed_one":
                if i == 0:
                    speed = 3.6 * bl
                    if f % 10 == 0:
                        s["heading"] += rng.choice([-1.0, 1.0])
                    vx = speed * math.cos(s["heading"])
                    vy = speed * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    if cy < height * 0.07 or cy > height * 0.13:
                        s["heading"] = -s["heading"]
                        cy = float(np.clip(cy, height * 0.07, height * 0.13))
                    if cx < 60 or cx > width * 0.48:
                        s["heading"] = math.pi - s["heading"]
                        cx = float(np.clip(cx, 60.0, width * 0.48))
                else:
                    speed = 1.0 * bl
                    s["heading"] += rng.uniform(-0.12, 0.12)
                    vx = speed * math.cos(s["heading"])
                    vy = speed * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    if cx < width * 0.55 or cx > width - 60:
                        s["heading"] = math.pi - s["heading"]
                        cx = float(np.clip(cx, width * 0.55, float(width - 60)))
                    if cy < height * 0.45 or cy > height * 0.85:
                        s["heading"] = -s["heading"]
                        cy = float(np.clip(cy, height * 0.45, height * 0.85))

            elif scenario == "gasping_surface":
                if i == 0:
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
                    cx = 90.0 + 3.0 * math.sin(t * 0.5)
                    cy = height * 0.90 + 2.0 * math.cos(t * 0.5)
                    vx = 0.05 * bl
                    vy = 0.02 * bl
                else:
                    speed = 1.2 * bl
                    s["heading"] += rng.uniform(-0.15, 0.15)
                    vx = speed * math.cos(s["heading"])
                    vy = speed * math.sin(s["heading"])
                    cx += vx * dt
                    cy += vy * dt
                    cx = np.clip(cx, width * 0.45, width - 60)
                    cy = np.clip(cy, height * 0.2, height * 0.6)

            elif scenario == "severe_mixed":
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

            cx = np.clip(cx, 35, width - 35)
            cy = np.clip(cy, 25, height - 25)

            s["cx"] = cx
            s["cy"] = cy
            s["vx"] = vx
            s["vy"] = vy

            draw_goldfish(frame, cx, cy, vx, vy, bl=bl, fish_bgr=fish_color)

        # Apply post-processing degradation effects
        if scenario == "dark":
            # Underexposed: brightness < 45
            frame = (frame.astype(np.float32) * 0.18).astype(np.uint8)
        elif scenario == "blurred":
            # Blur: sharpness < 40
            frame = cv2.GaussianBlur(frame, (27, 27), 0)
        elif scenario == "shaky":
            # Shake: median translation > 6 px
            shift_x = int(round(rng.uniform(-10.0, 10.0)))
            shift_y = int(round(rng.uniform(-7.0, 7.0)))
            M = np.float32([[1, 0, shift_x], [0, 1, shift_y]])
            frame = cv2.warpAffine(frame, M, (width, height), borderMode=cv2.BORDER_REFLECT)

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
        "lethargic_all",
        "white_fish",
        "two_fish_overlap",
        "plants_decoy",
        "dark",
        "blurred",
        "shaky",
        "tiny_fish",
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
                "flags_any": ["erratic_swimming", "surface_gasping"],
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
        "lethargic_all.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "flags_any": ["lethargic"],
                "level_in": ["Normal", "Moderate"],
            },
        },
        "white_fish.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "level_in": ["Normal"],
            },
        },
        "two_fish_overlap.mp4": {
            "fish_count": 2,
            "view": "side",
            "expect": {
                "level_in": ["Normal"],
            },
        },
        "plants_decoy.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "tank_score_max": 34,
                "stressed_count": 0,
                "level_in": ["Normal"],
            },
        },
        "dark.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "reliability_level_in": ["medium", "low"],
                "reliability_reason_contains": "underexposed",
            },
        },
        "blurred.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "reliability_level_in": ["high", "medium", "low"],
                "reliability_reason_contains": "blurry",
            },
        },
        "shaky.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "reliability_level_in": ["high", "medium", "low"],
                "reliability_reason_contains": "movement",
            },
        },
        "tiny_fish.mp4": {
            "fish_count": 3,
            "view": "side",
            "expect": {
                "reliability_level_in": ["high", "medium", "low"],
                "reliability_reason_contains": "small",
            },
        },
    }

    manifest_file = samples_dir / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest written to {manifest_file}")


if __name__ == "__main__":
    main()

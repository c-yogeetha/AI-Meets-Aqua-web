#!/usr/bin/env python3
"""Contact sheet generator for visual review of detection across video clips.

Matsya Project Team
"""

import argparse
from pathlib import Path
import sys

import cv2
import numpy as np

# Ensure backend is on sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.analysis.pipeline import run_pipeline
from app.analysis.video_io import frame_reader


def generate_contact_sheet_for_video(video_path: Path, output_png: Path, grid_size: tuple = (3, 3)):
    """Generate a contact sheet grid of annotated frames from video analysis."""
    output_png.parent.mkdir(parents=True, exist_ok=True)
    rows, cols = grid_size
    n_frames = rows * cols

    # Temporary run pipeline to get annotated video or frames
    tmp_out = output_png.parent / f"_tmp_{video_path.stem}"
    meta = {
        "tank_id": "contact_sheet",
        "tank_name": "Contact Sheet Tank",
        "goldfish_count": 3,
        "original_name": video_path.name,
    }

    try:
        res = run_pipeline(str(video_path), meta=meta, out_dir=str(tmp_out), analyzer_override="baseline")
        annotated_video = tmp_out / "annotated.mp4"
        if not annotated_video.exists():
            annotated_video = tmp_out / "annotated.webm"

        source_for_grid = annotated_video if annotated_video.exists() else video_path
        cap = cv2.VideoCapture(str(source_for_grid))
        total_fc = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_fc <= 0:
            cap.release()
            return

        step = max(1, total_fc // n_frames)
        sampled_frames = []
        for i in range(n_frames):
            idx = min(i * step, total_fc - 1)
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                frame = np.zeros((180, 320, 3), dtype=np.uint8)
            else:
                frame = cv2.resize(frame, (320, 180))

            # Add timestamp label
            t_s = round(idx / max(cap.get(cv2.CAP_PROP_FPS), 1.0), 1)
            cv2.putText(
                frame,
                f"t={t_s}s",
                (8, 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 255),
                1,
                cv2.LINE_AA,
            )
            sampled_frames.append(frame)

        cap.release()

        # Build grid image
        grid_rows = []
        for r in range(rows):
            row_frames = sampled_frames[r * cols : (r + 1) * cols]
            while len(row_frames) < cols:
                row_frames.append(np.zeros((180, 320, 3), dtype=np.uint8))
            grid_rows.append(np.hstack(row_frames))

        contact_sheet = np.vstack(grid_rows)

        # Header bar with clip metadata
        header_h = 40
        header = np.zeros((header_h, contact_sheet.shape[1], 3), dtype=np.uint8)
        header_text = f"Matsya Contact Sheet | {video_path.name} | Score: {res.get('tank_score', 0)} ({res.get('level', 'Normal')}) | Reliability: {res.get('reliability', {}).get('score', 0)}"
        cv2.putText(header, header_text, (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

        final_img = np.vstack([header, contact_sheet])
        cv2.imwrite(str(output_png), final_img)
        print(f"Contact sheet written: {output_png}")

    finally:
        # Cleanup temp directory
        if tmp_out.exists():
            import shutil
            shutil.rmtree(tmp_out, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Generate visual contact sheets for video analysis")
    parser.add_argument("input", nargs="?", default="samples", help="Video file or directory of videos")
    parser.add_argument("--out-dir", default="docs/contact_sheets", help="Output directory for PNG contact sheets")
    args = parser.parse_args()

    in_path = Path(args.input)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if in_path.is_file():
        videos = [in_path]
    elif in_path.is_dir():
        videos = sorted(list(in_path.glob("*.mp4")) + list(in_path.glob("*.webm")))
    else:
        print(f"Error: {in_path} not found")
        sys.exit(1)

    print(f"Generating contact sheets for {len(videos)} videos in {out_dir}...")
    for v in videos:
        out_png = out_dir / f"{v.stem}_contact.png"
        generate_contact_sheet_for_video(v, out_png)
    print("Done generating contact sheets.")


if __name__ == "__main__":
    main()

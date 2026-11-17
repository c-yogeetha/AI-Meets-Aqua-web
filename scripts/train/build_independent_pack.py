#!/usr/bin/env python3
"""Build the frozen, human-labelled TEST pack and unlabelled TUNE pool."""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SPLIT = ROOT / "data/split.json"
OUT = ROOT / "annotation"

def resized(frame):
    h, w = frame.shape[:2]
    scale = min(1.0, 1280.0 / max(w, h))
    if scale < 1.0:
        frame = cv2.resize(frame, (round(w*scale), round(h*scale)), interpolation=cv2.INTER_AREA)
    return frame, w, h, scale

def is_near_duplicate(frame, previous, threshold=1.0):
    small = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (96, 54), interpolation=cv2.INTER_AREA)
    return previous is not None and float(np.mean(cv2.absdiff(small, previous))) < threshold, small

def grab(cap, seconds):
    cap.set(cv2.CAP_PROP_POS_MSEC, max(0, float(seconds)) * 1000.0)
    ok, frame = cap.read()
    return frame if ok else None

def save_group(items, role, manifest, tasks):
    target = OUT / ("test_frames" if role == "TEST" else "tune_unlabelled")
    target.mkdir(parents=True, exist_ok=True)
    for item in items:
        src = ROOT / item["file"]
        if not src.is_file():
            raise FileNotFoundError(src)
        cap = cv2.VideoCapture(str(src))
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        nframes = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        if fps <= 0 or nframes <= 0:
            cap.release(); raise RuntimeError(f"Unreadable video: {src}")
        duration = nframes / fps
        if role == "TEST":
            seconds = list(range(0, min(16, int(duration) + 1), 1))[:16]
        else:
            # 20 deterministic time-spaced samples; no model-generated proposals.
            seconds = np.linspace(0, max(0.0, duration - 1.0/fps), 20).tolist()
        previous = None
        saved = 0
        for sample_i, sec in enumerate(seconds):
            frame = grab(cap, sec)
            if frame is None:
                continue
            near, small = is_near_duplicate(frame, previous)
            if near:
                continue
            previous = small
            out_frame, ow, oh, scale = resized(frame)
            if role == "TEST":
                stamp = f"t{int(round(sec)):04d}s"
            else:
                stamp = f"t{int(round(sec*1000)):06d}ms"
            name = f"{item['clip_id']}__{stamp}.jpg"
            dst = target / name
            if not cv2.imwrite(str(dst), out_frame, [cv2.IMWRITE_JPEG_QUALITY, 92]):
                cap.release(); raise RuntimeError(f"Could not write {dst}")
            row = {
                "filename": name, "role": role, "clip_id": item["clip_id"],
                "source_video": item["file"], "time_seconds": round(float(sec), 3),
                "source_frame": int(round(sec*fps)), "source_width": ow,
                "source_height": oh, "image_width": out_frame.shape[1],
                "image_height": out_frame.shape[0], "scale": round(scale, 8),
                "license": item["license"]
            }
            manifest.append(row); saved += 1
            if role == "TEST":
                tasks.append({"data": {
                    "image": f"/data/local-files/?d=annotation/test_frames/{name}",
                    "clip_id": item["clip_id"], "timestamp_seconds": row["time_seconds"],
                    "source_video": item["file"]
                }})
        cap.release()
        print(f"{role}: {item['clip_id']}: {saved} frames from {duration:.2f}s")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--clean", action="store_true", help="rebuild generated frame folders from frozen split")
    args = p.parse_args()
    spec = json.loads(SPLIT.read_text())
    if not spec.get("frozen") or len(spec["test"]) != 7 or len(spec["tune"]) < 5:
        raise SystemExit("Split is not frozen or does not meet the 7 TEST / 5 TUNE clip requirement")
    fixed = sum(x.get("camera") == "mostly_fixed" and x.get("scene") in {"tank", "planted_tank", "bowl", "aquarium", "aquarium_closeup"} for x in spec["test"])
    if fixed < 3:
        raise SystemExit(f"TEST needs at least 3 mostly fixed tank/bowl clips, found {fixed}")
    if args.clean:
        import shutil
        for folder in (OUT/"test_frames", OUT/"tune_unlabelled"):
            shutil.rmtree(folder, ignore_errors=True)
    manifest, tasks = [], []
    save_group(spec["test"], "TEST", manifest, tasks)
    save_group(spec["tune"], "TUNE", manifest, tasks)
    (OUT/"labelstudio_import.json").write_text(json.dumps(tasks, indent=2), encoding="utf-8")
    with (OUT/"frames_manifest.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(manifest[0])); writer.writeheader(); writer.writerows(manifest)
    counts = {role: sum(x["role"] == role for x in manifest) for role in ("TEST", "TUNE")}
    per_clip = {}
    for row in manifest: per_clip[row["clip_id"]] = per_clip.get(row["clip_id"], 0) + 1
    fixed_tank_clips = [x["clip_id"] for x in spec["test"] if x.get("camera") == "mostly_fixed" and x.get("scene") in {"tank", "planted_tank"}]
    result = {"counts": counts, "per_clip": per_clip, "fixed_camera_tank_clip_count": len(fixed_tank_clips), "fixed_camera_tank_clips": fixed_tank_clips, "test_minimum_met": counts["TEST"] >= 80,
              "labeling_status": "NOT_LABELLED; human annotation required",
              "test_proposals": 0}
    (OUT/"pack_summary.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    if counts["TEST"] < 80:
        print("WARNING: TEST frame count is below v4's 80-frame minimum; report as a very small sample unless owner-approved supplementary test clips/frames are added.")

if __name__ == "__main__": main()

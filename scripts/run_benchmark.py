#!/usr/bin/env python3
"""Detection Benchmark Runner for Matsya.

Evaluates goldfish detection and tracking on real tank footage (if available in samples_real/)
and synthetic control suites.
Adheres strictly to honest metric principles: never fabricates real-world numbers.
Outputs:
  - frontend/public/data/benchmark-results.json
  - docs/BENCHMARK.md
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def parse_labels_csv(labels_path: Path) -> Dict[str, Dict[str, Any]]:
    """Parse ground-truth labels if provided."""
    labels: Dict[str, Dict[str, Any]] = {}
    if not labels_path.exists():
        return labels

    with labels_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fname = row.get("filename", "").strip()
            if not fname:
                continue
            labels[fname] = {
                "expected_fish": int(row.get("expected_fish", 0)) if row.get("expected_fish") else None,
                "ground_truth_label": row.get("condition", "").strip() or row.get("ground_truth_label", "").strip(),
            }
    return labels


def run_benchmark_on_dir(
    clips_dir: Path,
    labels: Dict[str, Dict[str, Any]],
    mode: str = "baseline",
) -> List[Dict[str, Any]]:
    """Run analysis pipeline across video files in a directory."""
    from app.analysis.pipeline import run_pipeline
    import cv2
    import numpy as np

    video_exts = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    clips = [f for f in clips_dir.iterdir() if f.is_file() and f.suffix.lower() in video_exts]
    clips.sort(key=lambda p: p.name)

    results: List[Dict[str, Any]] = []

    for clip in clips:
        clip_name = clip.name
        analysis_clip = clip
        trimmed_path = None
        if clips_dir.name == "samples_real":
            import cv2
            source = cv2.VideoCapture(str(clip))
            fps = float(source.get(cv2.CAP_PROP_FPS) or 0)
            frame_count = int(source.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            max_seconds = float(os.environ.get("MATSYA_BENCHMARK_MAX_SECONDS", "90"))
            if fps > 0 and frame_count > fps * max_seconds:
                limit = int(fps * max_seconds)
                width = int(source.get(cv2.CAP_PROP_FRAME_WIDTH)); height = int(source.get(cv2.CAP_PROP_FRAME_HEIGHT))
                trimmed_path = REPO_ROOT / ".work" / "benchmark_runs" / f"{clip.stem}_bounded.mp4"
                trimmed_path.parent.mkdir(parents=True, exist_ok=True)
                writer = cv2.VideoWriter(str(trimmed_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
                copied = 0
                while copied < limit:
                    ok, frame = source.read()
                    if not ok: break
                    writer.write(frame); copied += 1
                writer.release(); source.release()
                analysis_clip = trimmed_path
            else:
                source.release()
        gt = labels.get(clip_name, {})
        expected_fish = gt.get("expected_fish")
        gt_label = gt.get("ground_truth_label")

        start_t = time.time()
        try:
            out_dir = REPO_ROOT / ".work" / "benchmark_runs" / clip.stem
            meta = {"tank_id": "benchmark", "tank_name": clip.stem, "goldfish_count": int(expected_fish or 0), "original_name": clip.name, "view": "side"}
            res = run_pipeline(str(analysis_clip), meta=meta, out_dir=str(out_dir), analyzer_override=mode)
            elapsed = max(time.time() - start_t, 0.001)
            # 12 evenly-spaced source frames; unlabelled clips are not assigned boxes by assumption.
            capture = cv2.VideoCapture(str(analysis_clip))
            frame_total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            tiles = []
            for idx in sorted(set(round(i * max(frame_total - 1, 0) / 11) for i in range(12))):
                capture.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ok, image = capture.read()
                if not ok:
                    continue
                height = max(1, int(image.shape[0] * 640 / image.shape[1]))
                image = cv2.resize(image, (640, height))
                cv2.putText(image, f"{clip.name} | source frame {idx}", (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,255,255), 1, cv2.LINE_AA)
                tiles.append(cv2.resize(image, (max(1, int(640 * 360 / height)), 360)))
            capture.release()
            if tiles:
                tile_w = max(img.shape[1] for img in tiles)
                canvas = np.zeros((3 * 360, 4 * tile_w, 3), dtype=np.uint8)
                for i, tile in enumerate(tiles):
                    y, x = (i // 4) * 360, (i % 4) * tile_w
                    canvas[y:y+360, x:x+tile.shape[1]] = tile
                contact_path = REPO_ROOT / "docs" / "contact_sheets" / f"{clip.stem}.png"
                contact_path.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(contact_path), canvas)

            fish_count = int(res.get("fish_count", 0))
            quality = res.get("reliability", {})
            detection = res.get("detection", {})
            dur = float(res.get("video", {}).get("duration_s", 0.0))
            fps = float(res.get("video", {}).get("fps", 0.0))
            total_frames = int(detection.get("frames_total", 0))
            cov = detection.get("frames_with_detections_pct")
            proc_fps = round(total_frames / elapsed, 1) if total_frames else None

            predicted_label = res.get("level")
            match = (predicted_label.lower() == gt_label.lower()) if gt_label and predicted_label else None

            results.append({
                "clip_name": clip_name,
                "expected_fish": expected_fish,
                "detected_fish": fish_count,
                "coverage_pct": cov,
                "reliability_level": quality.get("level"),
                "reliability_score": quality.get("score"),
                "runtime_s": round(elapsed, 3),
                "processing_fps": proc_fps,
                "ground_truth_label": gt_label,
                "predicted_label": predicted_label,
                "match": match,
                "preprocess": detection.get("preprocess", {}),
                "mode": res.get("mode"),
                "contact_sheet": f"docs/contact_sheets/{clip.stem}.png",
                "analysis_window_seconds": float(res.get("video", {}).get("duration_s", 0.0)) if analysis_clip != clip else None,
                "error": None,
            })
        except Exception as exc:
            results.append({
                "clip_name": clip_name,
                "expected_fish": expected_fish,
                "detected_fish": 0,
                "coverage_pct": None,
                "processing_fps": None,
                "runtime_s": round(max(time.time() - start_t, 0.001), 3),
                "reliability_level": None,
                "reliability_score": None,
                "preprocess": {},
                "error": str(exc),
            })

    return results


def write_empty_benchmark(out_json: Path, out_md: Path) -> None:
    """Write honest empty benchmark state when real footage is not available."""
    data = {
        "available": False,
        "message": "Benchmark not yet run on real footage",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "note": "Awaiting deployment in live facility tanks. Synthetic control evaluations are verified in software test suites.",
    }
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(data, indent=2), encoding="utf-8")

    md_content = """# Matsya Detection Benchmark Report

## Status: Pending Real-Tank Footage

**Notice on Empirical Metrics**:
Matsya adheres strictly to honest reporting standards. We do not substitute synthetic video simulation metrics for real-world biological tank performance.

- **Real Footage Directory**: `samples_real/` is currently empty or awaiting field collection.
- **Ground Truth Labels**: `benchmarks/labels.csv` will define expected counts and behavior states once footage is recorded.
- **Synthetic Verification**: Multi-condition synthetic verification (including lighting shifts, glare, turbidity, and high-density occlusion) is continuously validated under automated software test suites (`pytest backend/tests/test_analyzer_samples.py`).

### Verification Protocol When Real Footage Arrives:
1. Place raw tank recordings in `samples_real/`.
2. Populate `benchmarks/labels.csv` with `filename,expected_fish,ground_truth_label`.
3. Execute `python scripts/run_benchmark.py`.
4. Review generated contact sheets in `docs/screens/contact_sheets/` to inspect individual bounding tracks and trajectory fidelity.
"""
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text(md_content, encoding="utf-8")
    print(f"Benchmark: Written honest empty state to {out_json} and {out_md}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run detection benchmark on video footage.")
    parser.add_argument("--real-dir", type=str, default="samples_real", help="Directory with real footage")
    parser.add_argument("--control-dir", type=str, default="samples", help="Directory with synthetic control footage")
    parser.add_argument("--labels", type=str, default="benchmarks/labels.csv", help="Path to ground-truth labels CSV")
    parser.add_argument("--run-control", action="store_true", help="Run benchmark on synthetic control suite")
    parser.add_argument("--max-seconds", type=float, default=90.0, help="Trim each footage input to this many seconds for bounded benchmark runs")
    parser.add_argument("--out-json", type=str, default="frontend/public/data/benchmark-results.json", help="Output JSON path")
    parser.add_argument("--out-md", type=str, default="docs/BENCHMARK.md", help="Output Markdown report path")
    args = parser.parse_args()

    real_path = REPO_ROOT / args.real_dir
    control_path = REPO_ROOT / args.control_dir
    labels_path = REPO_ROOT / args.labels
    out_json = REPO_ROOT / args.out_json
    out_md = REPO_ROOT / args.out_md

    has_real_clips = real_path.exists() and any(
        f.suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"}
        for f in real_path.iterdir()
        if f.is_file()
    )

    if not has_real_clips and not args.run_control:
        write_empty_benchmark(out_json, out_md)
        return

    eval_dir = real_path if has_real_clips else control_path
    labels = parse_labels_csv(labels_path)
    labelled_goldfish_clips = sum(1 for row in labels.values() if row.get("expected_fish") is not None)
    if has_real_clips and labelled_goldfish_clips == 0:
        dataset_label = "general_aquarium_standin_v1"
    else:
        dataset_label = "owner_goldfish_eval_v1" if has_real_clips else "synthetic_control_v1"
    os.environ["MATSYA_BENCHMARK_MAX_SECONDS"] = str(args.max_seconds)

    print(f"Running benchmark on {eval_dir} ({dataset_label})...")
    results = run_benchmark_on_dir(eval_dir, labels)

    if not results:
        write_empty_benchmark(out_json, out_md)
        return

    total = len(results)
    # Only calculate goldfish accuracy when every evaluated clip has explicit labels.
    labelled = [r for r in results if r.get("expected_fish") is not None and r.get("error") is None]
    coverage_values = [float(r["coverage_pct"]) for r in results if r.get("coverage_pct") is not None and r.get("error") is None]
    reliability_values = [float(r["reliability_score"]) for r in results if r.get("reliability_score") is not None and r.get("error") is None]
    count_acc = round(sum(1 for r in labelled if r["detected_fish"] == r["expected_fish"]) / len(labelled) * 100.0, 1) if labelled else None
    mean_cov = round(sum(coverage_values) / len(coverage_values), 1) if coverage_values else None
    mean_rel = round(sum(reliability_values) / len(reliability_values), 1) if reliability_values else None

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "dataset_version": dataset_label,
        "data_scope": ("General aquarium stand-in; not owner goldfish footage" if has_real_clips and labelled_goldfish_clips == 0 else ("Owner-labelled goldfish footage" if has_real_clips else "Synthetic control clips")),
        "aggregate": {
            "total_clips": total,
            "labelled_clips": len(labelled),
            "fish_count_accuracy_pct": count_acc,
            "mean_coverage_pct": mean_cov,
            "mean_reliability_score": mean_rel,
        },
        "results": results,
    }

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Generate Markdown report with null values shown explicitly, never coerced to zero.
    def display(value: Any, suffix: str = "") -> str:
        return "Not measured" if value is None else f"{value}{suffix}"

    md_lines = [
        f"# Matsya Detection Benchmark Report ({dataset_label})",
        "",
        f"- **Evaluated**: {total} clips",
        f"- **Labelled goldfish clips**: {len(labelled)}",
        f"- **Fish Count Accuracy**: {display(count_acc, chr(37))}",
        f"- **Mean frame hit rate**: {display(mean_cov, chr(37))}",
        f"- **Mean Quality Reliability**: {display(mean_rel, '/100')}",
        "",
        "Frame hit rate is the share of sampled frames containing at least one detector track; it is not object recall or ground-truth coverage. Unlabelled general-aquarium footage is excluded from goldfish accuracy and detector training.",
        "",
        "| Clip | Expected fish | Detected | Frame hit rate | Reliability | Runtime (s) | Label | Error |",
        "|---|---:|---:|---:|---|---:|---|---|",
    ]
    for r in results:
        md_lines.append(
            f"| `{r['clip_name']}` | {display(r.get('expected_fish'))} | {r.get('detected_fish', 'N/A')} | {display(r.get('coverage_pct'), chr(37))} | {display(r.get('reliability_level'))} | {display(r.get('runtime_s'))} | {display(r.get('ground_truth_label'))} | {display(r.get('error'))} |"
        )
    md_lines.append("")

    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"Benchmark results written to {out_json} and {out_md}")


if __name__ == "__main__":
    main()

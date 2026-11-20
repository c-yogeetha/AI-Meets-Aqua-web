#!/usr/bin/env python3
"""Run Matsya's existing detector -> tracking -> stress-score -> annotation pipeline locally.

Usage: python scripts/analyse_local_video.py /path/to/fish.mp4 [output-directory]
The score is an indicative behavioural score, not a veterinary diagnosis.
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.analysis.pipeline import run_pipeline
from app.analysis.video_io import get_video_metadata


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.is_file():
        print(f"ERROR: video not found: {source}", file=sys.stderr)
        return 2

    output_root = Path(sys.argv[2]).expanduser().resolve() if len(sys.argv) > 2 else Path("analysis-output").resolve()
    run_id = str(uuid.uuid4())
    out_dir = output_root / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = get_video_metadata(str(source))
    meta.update({"original_name": source.name, "view": "side", "goldfish_count": 3})
    result = run_pipeline(
        video_path=str(source),
        meta=meta,
        out_dir=str(out_dir),
        analyzer_override="auto",
    )

    result_path = out_dir / "result.json"
    result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"Analysis mode: {result.get('mode')}")
    print(f"Fish detected/tracked: {result.get('fish_count', 0)}")
    print(f"Tank stress indicator: {result.get('tank_score', 0)}/100 ({result.get('level', 'Unknown')})")
    print(f"Threshold: {result.get('threshold', 35)}")
    print(f"Annotated output and result: {out_dir}")
    print("IMPORTANT: This is an indicative behaviour score, not a veterinary diagnosis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

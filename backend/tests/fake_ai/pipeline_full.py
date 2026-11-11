from datetime import datetime, timezone
from pathlib import Path


def analyze_video(video_path: str, meta: dict, progress_cb, out_dir: str) -> dict:
    if progress_cb:
        progress_cb("analysing", 70)
        progress_cb("rendering", 90)

    job_id = Path(out_dir).name
    return {
        "job_id": job_id,
        "mode": "external",
        "tank": {"id": meta.get("tank_id", "t"), "name": "AI Tank", "goldfish_count": 2},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analysis_time_s": 5.0,
        "video": {"duration_s": 10.0, "fps": 15.0, "width": 640, "height": 360, "view": "side"},
        "tank_score": 25,
        "level": "Normal",
        "threshold": 35,
        "fish": [],
        "timeline": [{"t": 0.0, "score": 25}],
        "key_moments": [],
        "suggestions": [],
        "warnings": [],
        "annotated_video_url": f"/api/v1/results/{job_id}/video",
        "disclaimer": "AI Model prediction.",
    }

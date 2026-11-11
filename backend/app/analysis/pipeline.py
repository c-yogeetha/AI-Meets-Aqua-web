from datetime import datetime, timezone
from pathlib import Path
import time
from typing import Any, Callable, Dict, Optional
from app.analysis.external import run_external_analysis
from app.analysis.render import render_annotated_video
from app.analysis.scoring import score_tracks
from app.analysis.suggestions import generate_suggestions
from app.analysis.tracks_baseline import run_baseline_tracking
from app.analysis.tracks_mock import generate_mock_tracks
from app.analysis.video_io import get_video_metadata
from app.config import settings


def run_pipeline(
    video_path: str,
    meta: Dict[str, Any],
    out_dir: str,
    progress_cb: Optional[Callable[[str, int], None]] = None,
    analyzer_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute end-to-end analysis pipeline."""
    start_time = time.time()
    analyzer = analyzer_override or settings.ANALYZER

    # Test hook check
    orig_name = meta.get("original_name", "")
    if settings.ENABLE_TEST_HOOKS and "__fail__" in orig_name:
        raise RuntimeError("Simulated failure")

    def stage_step(stage: str, pct: int):
        if progress_cb:
            progress_cb(stage, pct)
        if settings.STAGE_DELAY_S > 0:
            time.sleep(settings.STAGE_DELAY_S)

    # 1. Cleaning
    stage_step("cleaning", 5)
    video_meta = get_video_metadata(video_path)
    stage_step("cleaning", 10)

    # If external analyzer configured
    if analyzer == "external":
        res = run_external_analysis(video_path, meta, out_dir, progress_cb)
        res["analysis_time_s"] = round(time.time() - start_time, 2)
        return res

    goldfish_count = meta.get("goldfish_count", 3)
    extra_warnings = []

    # 2 & 3. Detecting and Tracking
    if analyzer == "mock":
        stage_step("detecting", 25)
        stage_step("tracking", 50)
        tracks = generate_mock_tracks(
            video_path=video_path,
            goldfish_count=goldfish_count,
            duration_s=video_meta["duration_s"],
            fps=video_meta["fps"],
            width=video_meta["width"],
            height=video_meta["height"],
        )
    else:
        # Baseline classical CV
        tracks, baseline_warnings = run_baseline_tracking(
            video_path=video_path,
            goldfish_count=goldfish_count,
            progress_cb=stage_step,
        )
        extra_warnings.extend(baseline_warnings)

    # 4. Analysing
    stage_step("analysing", 65)
    view = meta.get("view", "side")
    scoring_result = score_tracks(tracks, view=view)
    scoring_result["warnings"].extend(extra_warnings)

    # Add short duration warning if applicable
    if video_meta["duration_s"] < settings.MIN_DURATION_S:
        scoring_result["warnings"].append(
            f"Video duration ({video_meta['duration_s']}s) is shorter than recommended ({settings.MIN_DURATION_S}s)."
        )

    context = {
        "water_temp_c": meta.get("water_temp_c"),
        "last_water_change_days": meta.get("last_water_change_days"),
        "last_fed_hours": meta.get("last_fed_hours"),
    }
    suggestions = generate_suggestions(scoring_result["fish"], context=context)
    stage_step("analysing", 80)

    # 5. Rendering
    stage_step("rendering", 85)
    video_filename, key_moments = render_annotated_video(
        video_path=video_path,
        tracks=tracks,
        scoring_result=scoring_result,
        out_dir=out_dir,
    )
    stage_step("rendering", 98)

    job_id = Path(out_dir).name
    # Fix key moment URLs with job_id
    for km in key_moments:
        frame_name = Path(km["frame_url"]).name
        km["frame_url"] = f"/api/v1/results/{job_id}/frames/{frame_name}"

    analysis_time_s = round(time.time() - start_time, 2)
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "job_id": job_id,
        "mode": "mock" if analyzer == "mock" else "baseline",
        "tank": {
            "id": meta.get("tank_id", ""),
            "name": meta.get("tank_name", "Demo Tank"),
            "goldfish_count": meta.get("goldfish_count", len(scoring_result["fish"])),
        },
        "created_at": meta.get("created_at", now_iso),
        "analysis_time_s": analysis_time_s,
        "video": {
            "duration_s": video_meta["duration_s"],
            "fps": video_meta["fps"],
            "width": tracks.width,
            "height": tracks.height,
            "view": view,
        },
        "tank_score": scoring_result["tank_score"],
        "level": scoring_result["level"],
        "threshold": scoring_result["threshold"],
        "fish": scoring_result["fish"],
        "timeline": scoring_result["timeline"],
        "key_moments": key_moments,
        "suggestions": suggestions,
        "warnings": scoring_result["warnings"],
        "annotated_video_url": f"/api/v1/results/{job_id}/video",
        "disclaimer": "Behavioural indicator to support caretaker decisions; not a diagnosis.",
        "stressed_count": scoring_result["stressed_count"],
        "fish_count": scoring_result["fish_count"],
    }

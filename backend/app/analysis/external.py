import importlib
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple
from app.analysis.render import render_annotated_video
from app.analysis.scoring import score_tracks
from app.analysis.suggestions import generate_suggestions
from app.analysis.types import Tracks
from app.config import settings
from app.schemas import ResultResponse


class AnalyzerUnavailable(Exception):
    pass


def run_external_analysis(
    video_path: str,
    meta: Dict[str, Any],
    out_dir: str,
    progress_cb: Optional[Callable[[str, int], None]] = None,
) -> Dict[str, Any]:
    """Execute external AI model adapter."""
    module_name = settings.AI_MODULE
    try:
        ai_module = importlib.import_module(module_name)
    except ModuleNotFoundError as e:
        raise AnalyzerUnavailable(f"AI module '{module_name}' could not be imported: {e}")

    # Case 1: Preferred detect_and_track
    if hasattr(ai_module, "detect_and_track"):
        def sub_cb(stage: str, pct: int):
            if progress_cb:
                progress_cb(stage, pct)

        tracks_dict = ai_module.detect_and_track(video_path, sub_cb)
        tracks = Tracks.model_validate(tracks_dict)

        if progress_cb:
            progress_cb("analysing", 65)

        view = meta.get("view", "side")
        scoring_res = score_tracks(tracks, view=view)

        context = {
            "water_temp_c": meta.get("water_temp_c"),
            "last_water_change_days": meta.get("last_water_change_days"),
            "last_fed_hours": meta.get("last_fed_hours"),
        }
        suggestions = generate_suggestions(scoring_res["fish"], context=context)

        if progress_cb:
            progress_cb("rendering", 85)

        video_fname, key_moments = render_annotated_video(video_path, tracks, scoring_res, out_dir)

        job_id = Path(out_dir).name
        for km in key_moments:
            km["frame_url"] = f"/api/v1/results/{job_id}/frames/{Path(km['frame_url']).name}"

        return {
            "job_id": job_id,
            "mode": "external",
            "tank": {
                "id": meta.get("tank_id", ""),
                "name": meta.get("tank_name", "Tank"),
                "goldfish_count": meta.get("goldfish_count", len(scoring_res["fish"])),
            },
            "created_at": meta.get("created_at"),
            "analysis_time_s": 0.0,
            "video": {
                "duration_s": tracks.duration_s,
                "fps": tracks.fps,
                "width": tracks.width,
                "height": tracks.height,
                "view": view,
            },
            "tank_score": scoring_res["tank_score"],
            "level": scoring_res["level"],
            "threshold": scoring_res["threshold"],
            "fish": scoring_res["fish"],
            "timeline": scoring_res["timeline"],
            "key_moments": key_moments,
            "suggestions": suggestions,
            "warnings": scoring_res["warnings"],
            "annotated_video_url": f"/api/v1/results/{job_id}/video",
            "disclaimer": "Behavioural indicator to support caretaker decisions; not a diagnosis.",
            "stressed_count": scoring_res["stressed_count"],
            "fish_count": scoring_res["fish_count"],
        }

    # Case 2: Full result analyze_video
    elif hasattr(ai_module, "analyze_video"):
        result_dict = ai_module.analyze_video(video_path, meta, progress_cb, out_dir)
        try:
            validated = ResultResponse.model_validate(result_dict)
            res = validated.model_dump()
            res["mode"] = "external"
            res["stressed_count"] = sum(1 for f in res.get("fish", []) if f.get("stressed", False))
            res["fish_count"] = len(res.get("fish", []))
            return res
        except Exception as ve:
            raise ValueError(f"AI output invalid: {ve}")

    raise AnalyzerUnavailable(f"AI module '{module_name}' must expose 'detect_and_track' or 'analyze_video'")

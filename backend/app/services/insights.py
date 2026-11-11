from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.analysis.scoring import level_from_score
from app.models import Job, Result, Video


def compute_insights(db: Session, tank_id: str) -> Dict[str, Any]:
    """Calculate FSI, trend, timeline series and pattern messages for a tank."""
    # Query non-deleted results for this tank, ordered oldest to newest for series/trend
    results = (
        db.query(Result)
        .filter(Result.tank_id == tank_id, Result.deleted_at.is_(None))
        .order_by(Result.created_at.asc())
        .all()
    )

    if not results:
        return {
            "tank_id": tank_id,
            "fsi": None,
            "level": None,
            "trend": "insufficient_data",
            "series": [],
            "messages": [],
        }

    series = []
    scores = []
    for r in results:
        dt_str = r.created_at.strftime("%Y-%m-%d %H:%M")
        series.append({"date": dt_str, "score": r.tank_score})
        scores.append(r.tank_score)

    # FSI: weighted mean of last 5 scores, newest first
    weights_master = [0.4, 0.25, 0.2, 0.1, 0.05]
    newest_first_scores = list(reversed(scores))[:5]
    weights = weights_master[: len(newest_first_scores)]
    w_sum = sum(weights)
    if w_sum > 0:
        norm_weights = [w / w_sum for w in weights]
        fsi_val = sum(s * w for s, w in zip(newest_first_scores, norm_weights))
        fsi = round(float(fsi_val), 1)
        level = level_from_score(int(round(fsi)))
    else:
        fsi = None
        level = None

    # Trend calculation
    # Compare mean of last 2 with mean of 2 before them
    if len(scores) < 3:
        trend = "insufficient_data"
    elif len(scores) == 3:
        # If 3 results, compare latest with mean of prior 2
        prior_mean = (scores[0] + scores[1]) / 2.0
        diff = scores[2] - prior_mean
        if diff > 5:
            trend = "worsening"
        elif diff < -5:
            trend = "improving"
        else:
            trend = "stable"
    else:
        recent_2 = (scores[-1] + scores[-2]) / 2.0
        prior_2 = (scores[-3] + scores[-4]) / 2.0
        diff = recent_2 - prior_2
        if diff > 5:
            trend = "worsening"
        elif diff < -5:
            trend = "improving"
        else:
            trend = "stable"

    # Pattern messages
    messages: List[str] = []

    # 1. Delta between latest and previous
    if len(scores) >= 2:
        diff_latest = scores[-1] - scores[-2]
        if diff_latest > 10:
            messages.append("Stress increased compared with the previous check.")
        elif scores[-1] < 20 and scores[-2] >= 35:
            messages.append("Stress has eased since the previous check.")

    # 2. Temperature pattern
    # Query videos linked to results via Job
    video_temps = (
        db.query(Video.water_temp_c, Result.tank_score)
        .join(Job, Job.video_id == Video.id)
        .join(Result, Result.job_id == Job.id)
        .filter(Result.tank_id == tank_id, Result.deleted_at.is_(None), Video.water_temp_c.isnot(None))
        .all()
    )

    if len(video_temps) >= 4:
        warm_scores = [score for temp, score in video_temps if temp is not None and temp > 24]
        other_scores = [score for temp, score in video_temps if temp is not None and temp <= 24]
        if warm_scores and other_scores:
            warm_mean = sum(warm_scores) / len(warm_scores)
            other_mean = sum(other_scores) / len(other_scores)
            if (warm_mean - other_mean) > 10:
                messages.append("Stress scores were higher when the water temperature was above 24 C.")

    return {
        "tank_id": tank_id,
        "fsi": fsi,
        "level": level,
        "trend": trend,
        "series": series,
        "messages": messages,
    }

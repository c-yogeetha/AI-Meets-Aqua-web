import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session

from app.analysis.pipeline import run_pipeline
from app.clock import now
from app.config import settings
from app.db import get_session_factory
from app.models import Job, Result, Tank, Video
from app.services.alerts import handle_analysis_alerts
from app.services.storage import get_output_dir

logger = logging.getLogger(__name__)

# Single worker thread pool for predictable CPU load
_executor = ThreadPoolExecutor(max_workers=1)


def startup_job_cleanup(db: Session) -> None:
    """Recover jobs left in queued or processing on server startup."""
    unfinished = db.query(Job).filter(Job.status.in_(["queued", "processing"])).all()
    for j in unfinished:
        j.status = "failed"
        j.error = "Server restarted during analysis"
        j.finished_at = now()
    if unfinished:
        db.commit()


def execute_job(job_id: str) -> None:
    session_factory = get_session_factory()
    db = session_factory()

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.stage = "cleaning"
        job.progress = 5
        job.started_at = now()
        db.commit()

        video = db.query(Video).filter(Video.id == job.video_id).first()
        tank = db.query(Tank).filter(Tank.id == job.tank_id).first()
        if not video or not tank:
            job.status = "failed"
            job.error = "Associated video or tank record not found"
            job.finished_at = now()
            db.commit()
            return

        out_dir = get_output_dir(job_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        meta = {
            "tank_id": tank.id,
            "tank_name": tank.name,
            "goldfish_count": tank.goldfish_count,
            "original_name": video.original_name,
            "view": video.view,
            "water_temp_c": video.water_temp_c,
            "last_water_change_days": video.last_water_change_days,
            "last_fed_hours": video.last_fed_hours,
            "created_at": job.created_at.isoformat(),
        }

        start_wall_time = time.time()
        last_db_write = 0.0

        def progress_callback(stage: str, percent: int):
            nonlocal last_db_write
            elapsed = time.time() - start_wall_time
            if elapsed > settings.JOB_TIMEOUT_S:
                raise TimeoutError("Analysis exceeded maximum allotted time.")

            cur_time = time.time()
            # Throttle writes to at most 5 per second
            if (cur_time - last_db_write) >= 0.2:
                # Progress is monotonic
                new_progress = max(job.progress, min(99, percent))
                job.stage = stage
                job.progress = new_progress
                try:
                    db.commit()
                    last_db_write = cur_time
                except Exception:
                    db.rollback()

        # Run pipeline
        result_dict = run_pipeline(
            video_path=video.stored_path,
            meta=meta,
            out_dir=str(out_dir),
            progress_cb=progress_callback,
            analyzer_override=job.analyzer,
        )

        # Write result.json
        res_file = out_dir / "result.json"
        with open(res_file, "w", encoding="utf-8") as f:
            json.dump(result_dict, f, indent=2, default=str)

        # Insert Result row
        result_row = Result(
            job_id=job.id,
            tank_id=tank.id,
            mode=result_dict.get("mode", "baseline"),
            result_json=json.dumps(result_dict, default=str),
            tank_score=result_dict.get("tank_score", 0),
            level=result_dict.get("level", "Normal"),
            stressed_count=result_dict.get("stressed_count", 0),
            fish_count=result_dict.get("fish_count", 0),
            duration_s=result_dict.get("video", {}).get("duration_s", 0.0),
            created_at=job.created_at,
        )
        db.add(result_row)

        # Create alerts
        handle_analysis_alerts(db, tank.id, tank.name, job.id, result_dict)

        # Complete job
        job.status = "done"
        job.stage = "done"
        job.progress = 100
        job.finished_at = now()
        db.commit()

    except Exception as exc:
        logger.exception("Error executing analysis job %s", job_id)
        db.rollback()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "failed"
                # Short human message without traceback
                msg = str(exc)
                if "Simulated failure" in msg:
                    msg = "Simulated failure"
                elif "exceeded maximum allotted time" in msg:
                    msg = "Analysis timed out"
                elif not msg:
                    msg = "Analysis failed due to an error"
                job.error = msg
                job.finished_at = now()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def submit_job(job_id: str) -> None:
    """Submit a queued job to the worker pool."""
    _executor.submit(execute_job, job_id)

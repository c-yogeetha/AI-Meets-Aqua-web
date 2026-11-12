import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

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
_cancelled_job_ids: set[str] = set()


def cancel_job_service(job_id: str, db: Session) -> bool:
    """Cancel a queued or processing job, deleting uploaded files and partial outputs."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return False
    if job.status in ("done", "failed", "cancelled"):
        return False

    _cancelled_job_ids.add(job_id)
    job.status = "cancelled"
    job.stage = "cancelled"
    job.finished_at = now()
    job.error = "Analysis cancelled by user"
    db.commit()

    # Clean up video and output dir
    video = db.query(Video).filter(Video.id == job.video_id).first()
    if video and video.stored_path:
        p = Path(video.stored_path)
        if p.exists():
            try:
                p.unlink()
            except Exception:
                pass
    out_dir = get_output_dir(job_id)
    if out_dir.exists():
        import shutil

        try:
            shutil.rmtree(out_dir)
        except Exception:
            pass
    return True


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
        if not job or job.status == "cancelled" or job_id in _cancelled_job_ids:
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
            if job_id in _cancelled_job_ids:
                raise RuntimeError("Analysis cancelled by user")

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

        # Delete raw upload unless KEEP_UPLOADS=1
        if not settings.KEEP_UPLOADS:
            raw_vid = Path(video.stored_path)
            if raw_vid.exists():
                try:
                    raw_vid.unlink()
                except Exception as e:
                    logger.warning("Could not delete raw upload %s: %s", raw_vid, e)

    except Exception as exc:
        logger.exception("Error executing analysis job %s", job_id)
        db.rollback()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "failed"
                # Short human message without traceback
                msg = str(exc)
                if "cancelled by user" in msg.lower():
                    job.status = "cancelled"
                    job.stage = "cancelled"
                    job.error = "Analysis cancelled by user"
                elif "Simulated failure" in msg:
                    job.status = "failed"
                    job.error = "Simulated failure"
                elif "exceeded maximum allotted time" in msg:
                    job.status = "failed"
                    job.error = "Analysis timed out"
                else:
                    job.status = "failed"
                    job.error = msg or "Analysis failed due to an error"
                job.finished_at = now()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def submit_job(job_id: str) -> None:
    """Submit a queued job to the worker pool."""
    _executor.submit(execute_job, job_id)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Job
from app.schemas import JobResponse
from app.services.jobs import cancel_job_service

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=JobResponse, summary="Get analysis job status and progress")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise AppError(status_code=404, code="job_not_found", message=f"Job '{job_id}' not found.")

    resp = JobResponse.model_validate(job)
    if job.status == "queued":
        pos = (
            db.query(Job)
            .filter(
                Job.status.in_(["queued", "processing"]),
                Job.created_at < job.created_at,
            )
            .count()
        )
        resp.queue_position = pos
    else:
        resp.queue_position = 0
    return resp


@router.post("/{job_id}/cancel", summary="Cancel a queued or running analysis job")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise AppError(status_code=404, code="job_not_found", message=f"Job '{job_id}' not found.")

    success = cancel_job_service(job_id, db)
    return {"status": "cancelled", "job_id": job_id, "success": success}

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Job
from app.schemas import JobResponse

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=JobResponse, summary="Get analysis job status and progress")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise AppError(status_code=404, code="job_not_found", message=f"Job '{job_id}' not found.")
    return job

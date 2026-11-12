import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.analysis.video_io import get_video_metadata
from app.auth import get_current_owner_id
from app.config import settings
from app.db import get_db
from app.errors import AppError
from app.models import Job, Tank, Video
from app.schemas import VideoUploadResponse
from app.services.jobs import submit_job
from app.services.storage import get_upload_file_path, sanitize_filename

router = APIRouter(prefix="/api/v1/videos", tags=["Videos"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
ALLOWED_VIEWS = {"side", "front", "top"}


@router.post("", response_model=VideoUploadResponse, status_code=status.HTTP_202_ACCEPTED, summary="Upload a tank video and start analysis")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    tank_id: str = Form(...),
    view: str = Form("side"),
    water_temp_c: str = Form(None),
    last_water_change_days: str = Form(None),
    last_fed_hours: str = Form(None),
    db: Session = Depends(get_db),
):
    # 1. Tank check
    owner_id = get_current_owner_id(request)
    q = db.query(Tank).filter(Tank.id == tank_id)
    if owner_id is not None:
        q = q.filter(Tank.owner_id == owner_id)
    tank = q.first()
    if not tank:
        raise AppError(status_code=404, code="tank_not_found", message=f"Tank '{tank_id}' not found.")

    # 2. Extension check
    filename = file.filename or "video.mp4"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError(
            status_code=415,
            code="unsupported_media_type",
            message=f"Unsupported video format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 3. View check
    view_clean = view.lower().strip()
    if view_clean not in ALLOWED_VIEWS:
        raise AppError(
            status_code=422,
            code="invalid_view",
            message=f"Invalid camera view '{view}'. Allowed: side, front, top",
        )

    # 4. Optional fields validation
    parsed_temp = None
    if water_temp_c is not None and str(water_temp_c).strip() != "":
        try:
            parsed_temp = float(water_temp_c)
            if not (0 <= parsed_temp <= 40):
                raise ValueError()
        except ValueError:
            raise AppError(status_code=422, code="invalid_temperature", message="Water temperature must be between 0 and 40 C.")

    parsed_water_change = None
    if last_water_change_days is not None and str(last_water_change_days).strip() != "":
        try:
            parsed_water_change = int(last_water_change_days)
            if not (0 <= parsed_water_change <= 365):
                raise ValueError()
        except ValueError:
            raise AppError(status_code=422, code="invalid_water_change", message="Days since last water change must be between 0 and 365.")

    parsed_fed_hours = None
    if last_fed_hours is not None and str(last_fed_hours).strip() != "":
        try:
            parsed_fed_hours = int(last_fed_hours)
            if not (0 <= parsed_fed_hours <= 72):
                raise ValueError()
        except ValueError:
            raise AppError(status_code=422, code="invalid_fed_hours", message="Hours since last feeding must be between 0 and 72.")

    # 5. Stream to disk and enforce MAX_UPLOAD_MB
    video_id = str(uuid.uuid4())
    stored_path = get_upload_file_path(video_id, ext)
    stored_path.parent.mkdir(parents=True, exist_ok=True)

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    total_bytes = 0

    try:
        with open(stored_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise AppError(
                        status_code=413,
                        code="file_too_large",
                        message=f"Uploaded file exceeds maximum permitted size of {settings.MAX_UPLOAD_MB} MB.",
                    )
                buffer.write(chunk)
    except Exception:
        if stored_path.exists():
            stored_path.unlink()
        raise

    # 6. Verify with OpenCV
    try:
        meta = get_video_metadata(str(stored_path))
    except Exception:
        if stored_path.exists():
            stored_path.unlink()
        raise AppError(status_code=422, code="not_a_video", message="Uploaded file could not be decoded as a valid video.")

    # 7. Duration check
    if meta["duration_s"] > settings.MAX_DURATION_S:
        if stored_path.exists():
            stored_path.unlink()
        raise AppError(
            status_code=422,
            code="video_too_long",
            message=f"Video duration ({meta['duration_s']}s) exceeds maximum limit of {settings.MAX_DURATION_S}s.",
        )

    # 8. Record in DB
    sanitized_name = sanitize_filename(filename)
    video_rec = Video(
        id=video_id,
        tank_id=tank.id,
        original_name=sanitized_name,
        stored_path=str(stored_path),
        size_bytes=total_bytes,
        duration_s=meta["duration_s"],
        fps=meta["fps"],
        width=meta["width"],
        height=meta["height"],
        view=view_clean,
        water_temp_c=parsed_temp,
        last_water_change_days=parsed_water_change,
        last_fed_hours=parsed_fed_hours,
    )
    db.add(video_rec)

    job_rec = Job(
        video_id=video_id,
        tank_id=tank.id,
        status="queued",
        stage="queued",
        progress=0,
        analyzer=settings.ANALYZER,
    )
    db.add(job_rec)
    db.commit()
    db.refresh(job_rec)

    # Submit to worker pool
    submit_job(job_rec.id)

    return VideoUploadResponse(job_id=job_rec.id, video_id=video_id)

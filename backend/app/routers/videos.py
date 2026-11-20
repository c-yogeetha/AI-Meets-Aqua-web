import shutil
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.analysis.video_io import get_video_metadata, normalize_video_on_ingest
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
_UPLOAD_TIMES: dict[str, deque[float]] = defaultdict(deque)


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

    # 2. Disk guard and per-IP admission control.
    try:
        _, _, free_bytes = shutil.disk_usage(settings.data_path)
    except OSError:
        free_bytes = 0
    min_free_bytes = int(settings.MIN_FREE_DISK_GB * 1024 * 1024 * 1024)
    if free_bytes < min_free_bytes:
        raise AppError(status_code=507, code="disk_low", message="Server storage is low. Please retry after older analyses have been cleaned up.")
    now_mono = time.monotonic()
    client_ip = request.client.host if request.client else "unknown"
    recent_uploads = _UPLOAD_TIMES[client_ip]
    while recent_uploads and now_mono - recent_uploads[0] >= 3600:
        recent_uploads.popleft()
    if len(recent_uploads) >= settings.UPLOADS_PER_HOUR_PER_IP:
        raise AppError(status_code=429, code="upload_rate_limited", message="Upload limit reached. Please retry later.")
    queue_len = db.query(Job).filter(Job.status.in_(["queued", "processing"])).count()
    if queue_len >= settings.MAX_QUEUE:
        raise AppError(status_code=429, code="queue_full", message="The analysis queue is full. Please retry when a slot is available.")

    # 3. Extension and file-header checks.
    filename = file.filename or "video.mp4"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError(
            status_code=415,
            code="unsupported_media_type",
            message=f"Unsupported video format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 4. View check
    view_clean = view.lower().strip()
    if view_clean not in ALLOWED_VIEWS:
        raise AppError(
            status_code=422,
            code="invalid_view",
            message=f"Invalid camera view '{view}'. Allowed: side, front, top",
        )

    # 5. Optional fields validation
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

    # 6. Reject declared oversize bodies before allocating upload storage.
    declared_length = request.headers.get("content-length")
    if declared_length:
        try:
            if int(declared_length) > settings.MAX_UPLOAD_MB * 1024 * 1024 + 1024 * 1024:
                raise AppError(status_code=413, code="file_too_large", message=f"Uploaded file exceeds maximum permitted size of {settings.MAX_UPLOAD_MB} MB.")
        except ValueError:
            raise AppError(status_code=400, code="invalid_content_length", message="Content-Length header is invalid.")

    # 7. Stream to disk and enforce MAX_UPLOAD_MB
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

    # 8. Reject files with unsupported container signatures before decode.
    try:
        with open(stored_path, "rb") as source:
            header = source.read(64)
        valid_signature = (
            header.startswith(b"\x00\x00\x00") and b"ftyp" in header[:16]
        ) or header.startswith(b"\x1aE\xdf\xa3") or header.startswith(b"RIFF")
        if not valid_signature:
            stored_path.unlink(missing_ok=True)
            raise AppError(status_code=422, code="not_a_video", message="Uploaded file does not have a recognised video container signature.")
    except OSError as exc:
        stored_path.unlink(missing_ok=True)
        raise AppError(status_code=422, code="not_a_video", message="Uploaded video could not be read.") from exc

    # 9. Normalise video format and dimensions if needed (HEVC, phone rotation, >1280px, >25fps)
    try:
        stored_path_str = normalize_video_on_ingest(str(stored_path))
        stored_path = Path(stored_path_str)
    except Exception:
        pass

    # 10. Verify with OpenCV
    try:
        meta = get_video_metadata(str(stored_path))
    except Exception:
        if stored_path.exists():
            stored_path.unlink()
        raise AppError(status_code=422, code="not_a_video", message="Uploaded file could not be decoded as a valid video.")

    # 11. Duration check
    if meta["duration_s"] > settings.MAX_DURATION_S:
        if stored_path.exists():
            stored_path.unlink()
        raise AppError(
            status_code=422,
            code="video_too_long",
            message=f"Video duration ({meta['duration_s']}s) exceeds maximum limit of {settings.MAX_DURATION_S}s.",
        )

    # 11. Record in DB
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
    recent_uploads.append(now_mono)

    # Submit to worker pool
    submit_job(job_rec.id)

    return VideoUploadResponse(job_id=job_rec.id, video_id=video_id)

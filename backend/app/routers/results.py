import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Job, Result, Tank
from app.schemas import ResultResponse
from app.services.report_pdf import generate_pdf_report
from app.services.storage import delete_permanently, get_output_dir
from app.services.trash import restore_result, soft_delete_result

router = APIRouter(prefix="/api/v1/results", tags=["Results"])


def get_range_stream(file_path: Path, range_header: str):
    file_size = file_path.stat().st_size
    # Format: bytes=start-end
    range_val = range_header.replace("bytes=", "").strip()
    parts = range_val.split("-")
    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if parts[1] else file_size - 1
    end = min(end, file_size - 1)
    chunk_size = (end - start) + 1

    def iterfile():
        with open(file_path, "rb") as f:
            f.seek(start)
            bytes_left = chunk_size
            while bytes_left > 0:
                read_len = min(65536, bytes_left)
                data = f.read(read_len)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(iterfile(), status_code=206, headers=headers)


@router.get("/{job_id}", response_model=ResultResponse, summary="Get full analysis result")
def get_result(job_id: str, db: Session = Depends(get_db)):
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if res and res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="This analysis was deleted and is in the recycle bin.")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not res:
        if job and job.status != "done":
            raise AppError(
                status_code=409,
                code="job_not_ready",
                message=f"Job is currently '{job.status}' (stage: {job.stage}).",
                details={"status": job.status, "stage": job.stage, "progress": job.progress},
            )
        raise AppError(status_code=404, code="result_not_found", message=f"Result for job '{job_id}' not found.")

    return json.loads(res.result_json)


@router.get("/{job_id}/video", summary="Stream annotated video")
def get_annotated_video(job_id: str, request: Request, db: Session = Depends(get_db)):
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if res and res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="This analysis was deleted.")

    out_dir = get_output_dir(job_id)
    mp4_path = out_dir / "annotated.mp4"
    webm_path = out_dir / "annotated.webm"

    target_path = None
    media_type = "video/mp4"
    if mp4_path.exists():
        target_path = mp4_path
        media_type = "video/mp4"
    elif webm_path.exists():
        target_path = webm_path
        media_type = "video/webm"
    else:
        raise AppError(status_code=404, code="video_not_found", message="Annotated video not found for this result.")

    range_header = request.headers.get("range")
    if range_header:
        return get_range_stream(target_path, range_header)

    return FileResponse(target_path, media_type=media_type)


@router.get("/{job_id}/frames/{frame_name}", summary="Get key frame image")
def get_key_frame(job_id: str, frame_name: str, db: Session = Depends(get_db)):
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if res and res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="This analysis was deleted.")

    # Prevent directory traversal
    clean_name = os.path.basename(frame_name)
    if clean_name != frame_name or ".." in frame_name:
        raise AppError(status_code=400, code="invalid_frame_name", message="Invalid frame filename.")

    out_dir = get_output_dir(job_id)
    frame_path = out_dir / "frames" / clean_name
    if not frame_path.exists():
        raise AppError(status_code=404, code="frame_not_found", message=f"Frame '{clean_name}' not found.")

    return FileResponse(frame_path, media_type="image/jpeg")


@router.get("/{job_id}/report.pdf", summary="Download PDF report")
def get_pdf_report(job_id: str, db: Session = Depends(get_db)):
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="result_not_found", message="Result not found.")
    if res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="Result is in recycle bin.")

    out_dir = get_output_dir(job_id)
    pdf_path = out_dir / "report.pdf"

    if not pdf_path.exists():
        result_data = json.loads(res.result_json)
        generate_pdf_report(result_data, str(pdf_path))

    tank_name = "tank"
    tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
    if tank:
        tank_name = tank.name.replace(" ", "_")
    date_str = res.created_at.strftime("%Y%m%d")
    filename = f"AI-Meets-Aqua-Report-{tank_name}-{date_str}.pdf"

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete analysis result")
def delete_result(job_id: str, permanent: bool = Query(False), db: Session = Depends(get_db)):
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="result_not_found", message=f"Result '{job_id}' not found.")

    if permanent:
        db.delete(res)
        db.commit()
        delete_permanently(job_id)
    else:
        soft_delete_result(db, job_id)

    return None


@router.post("/{job_id}/restore", summary="Restore result from recycle bin")
def restore_analysis(job_id: str, db: Session = Depends(get_db)):
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="result_not_found", message=f"Result '{job_id}' not found.")
    if res.deleted_at is None:
        raise AppError(status_code=409, code="not_in_trash", message="Result is not in the recycle bin.")

    success = restore_result(db, job_id)
    if not success:
        raise AppError(status_code=404, code="restore_failed", message="Could not restore result data.")

    return {"status": "restored", "job_id": job_id}

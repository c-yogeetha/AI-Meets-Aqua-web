import json
import os
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_owner_id
from app.db import get_db
from app.errors import AppError
from app.models import Job, Result, Tank
from app.schemas import ResultResponse
from app.services.report_pdf import generate_pdf_report
from app.services.storage import delete_permanently, get_output_dir
from app.services.trash import restore_result, soft_delete_result

router = APIRouter(prefix="/api/v1/results", tags=["Results"])


def get_range_stream(file_path: Path, range_header: str, media_type: str = "video/mp4"):
    file_size = file_path.stat().st_size
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
        "Content-Type": media_type,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
    }
    return StreamingResponse(iterfile(), status_code=206, headers=headers)


@router.get("/{job_id}", response_model=ResultResponse, summary="Get full analysis result")
def get_result(job_id: str, request: Request, response: Response, db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if res and owner_id is not None:
        tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
        if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
            raise AppError(status_code=404, code="result_not_found", message=f"Result for job '{job_id}' not found.")

    if res and res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="This analysis was deleted and is in the recycle bin.")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not res:
        if job and job.status != "done":
            if owner_id is not None:
                tank = db.query(Tank).filter(Tank.id == job.tank_id).first()
                if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
                    raise AppError(status_code=404, code="result_not_found", message=f"Result for job '{job_id}' not found.")
            raise AppError(
                status_code=409,
                code="job_not_ready",
                message=f"Job is currently '{job.status}' (stage: {job.stage}).",
                details={"status": job.status, "stage": job.stage, "progress": job.progress},
            )
        raise AppError(status_code=404, code="result_not_found", message=f"Result for job '{job_id}' not found.")

    response.headers["Cache-Control"] = "no-store"
    data = json.loads(res.result_json)
    return data


@router.get("/{job_id}/video", summary="Stream annotated video")
def get_annotated_video(
    job_id: str,
    request: Request,
    format: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    owner_id = get_current_owner_id(request)
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="video_not_found", message="Annotated video not found for this result.")
    if owner_id is not None:
        tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
        if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
            raise AppError(status_code=404, code="video_not_found", message="Annotated video not found for this result.")
    if res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="This analysis was deleted.")

    out_dir = get_output_dir(job_id)
    mp4_path = out_dir / "annotated.mp4"
    webm_path = out_dir / "annotated.webm"

    target_path = None
    media_type = "video/mp4"

    if format == "webm" and webm_path.exists():
        target_path = webm_path
        media_type = "video/webm"
    elif mp4_path.exists():
        target_path = mp4_path
        media_type = "video/mp4"
    elif webm_path.exists():
        target_path = webm_path
        media_type = "video/webm"
    else:
        raise AppError(status_code=404, code="video_not_found", message="Annotated video not found for this result.")

    range_header = request.headers.get("range")
    if range_header:
        return get_range_stream(target_path, range_header, media_type=media_type)

    return FileResponse(
        target_path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/{job_id}/frames/{frame_name}", summary="Get key frame image")
def get_key_frame(job_id: str, frame_name: str, request: Request, db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="frame_not_found", message=f"Frame '{frame_name}' not found.")
    if owner_id is not None:
        tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
        if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
            raise AppError(status_code=404, code="frame_not_found", message=f"Frame '{frame_name}' not found.")
    if res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="This analysis was deleted.")

    # Prevent directory traversal
    clean_name = os.path.basename(frame_name)
    if clean_name != frame_name or ".." in frame_name:
        raise AppError(status_code=400, code="invalid_frame_name", message="Invalid frame filename.")

    out_dir = get_output_dir(job_id)
    frame_path = out_dir / "frames" / clean_name
    if not frame_path.exists():
        raise AppError(status_code=404, code="frame_not_found", message=f"Frame '{clean_name}' not found.")

    return FileResponse(
        frame_path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/{job_id}/report.pdf", summary="Download PDF report")
def get_pdf_report(job_id: str, request: Request, db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job and job.status != "done":
            if owner_id is not None:
                tank = db.query(Tank).filter(Tank.id == job.tank_id).first()
                if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
                    raise AppError(status_code=404, code="result_not_found", message="Result not found.")
            raise AppError(status_code=409, code="job_not_ready", message="Analysis report is not ready yet.")
        raise AppError(status_code=404, code="result_not_found", message="Result not found.")

    if owner_id is not None:
        tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
        if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
            raise AppError(status_code=404, code="result_not_found", message="Result not found.")

    if res.deleted_at is not None:
        raise AppError(status_code=410, code="result_deleted", message="Result is in recycle bin.")

    out_dir = get_output_dir(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = out_dir / "report.pdf"
    result_json_path = out_dir / "result.json"

    needs_generate = True
    if pdf_path.exists():
        needs_generate = False
        # Invalidate if result.json is newer than report.pdf
        if result_json_path.exists() and result_json_path.stat().st_mtime > pdf_path.stat().st_mtime:
            needs_generate = True

    if needs_generate:
        result_data = json.loads(res.result_json)
        try:
            generate_pdf_report(
                result_data,
                str(pdf_path),
                key_frames_dir=out_dir / "frames",
                timeout_s=20.0,
            )
        except TimeoutError:
            raise AppError(status_code=503, code="report_timeout", message="PDF generation timed out.")
        except Exception as e:
            # Fallback to minimal report if something fails during generation
            raise AppError(status_code=500, code="report_generation_failed", message=f"Failed to generate report: {str(e)}")

    # RFC 6266 / RFC 5987 compliant Content-Disposition
    # 1. Plain ASCII filename for legacy clients
    ascii_filename = f"matsya-report-{job_id[:8]}.pdf"
    # 2. UTF-8 percent-encoded filename matching required pattern
    encoded_name = quote(ascii_filename, safe="")

    disposition_header = f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_name}'

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": disposition_header,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete analysis result")
def delete_result(job_id: str, request: Request, permanent: bool = Query(False), db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="result_not_found", message=f"Result '{job_id}' not found.")
    if owner_id is not None:
        tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
        if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
            raise AppError(status_code=404, code="result_not_found", message=f"Result '{job_id}' not found.")

    if permanent:
        db.delete(res)
        db.commit()
        delete_permanently(job_id)
    else:
        soft_delete_result(db, job_id)

    return None


@router.post("/{job_id}/restore", summary="Restore result from recycle bin")
def restore_analysis(job_id: str, request: Request, db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        raise AppError(status_code=404, code="result_not_found", message=f"Result '{job_id}' not found.")
    if owner_id is not None:
        tank = db.query(Tank).filter(Tank.id == res.tank_id).first()
        if not tank or (tank.owner_id != owner_id and tank.owner_id != "legacy"):
            raise AppError(status_code=404, code="result_not_found", message=f"Result '{job_id}' not found.")
    if res.deleted_at is None:
        raise AppError(status_code=409, code="not_in_trash", message="Result is not in the recycle bin.")

    success = restore_result(db, job_id)
    if not success:
        raise AppError(status_code=404, code="restore_failed", message="Could not restore result data.")

    return {"status": "restored", "job_id": job_id}

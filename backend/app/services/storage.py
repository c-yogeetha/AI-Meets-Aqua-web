import os
from pathlib import Path
import re
import shutil
from typing import Optional
from app.config import settings


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename: basename only, remove traversal and control chars, max 120 chars."""
    basename = os.path.basename(filename)
    clean = re.sub(r"[^\w\.\-\_]", "_", basename)
    clean = re.sub(r"\.\.+", ".", clean)
    clean = clean.strip("._")
    if not clean:
        clean = "video.mp4"
    if len(clean) > 120:
        parts = clean.rsplit(".", 1)
        if len(parts) == 2:
            clean = parts[0][: 120 - len(parts[1]) - 1] + "." + parts[1]
        else:
            clean = clean[:120]
    return clean


def get_upload_file_path(video_id: str, extension: str) -> Path:
    ext = extension if extension.startswith(".") else f".{extension}"
    return settings.uploads_path / f"{video_id}{ext}"


def get_output_dir(job_id: str) -> Path:
    return settings.outputs_path / job_id


def get_trash_dir(job_id: str) -> Path:
    return settings.trash_path / job_id


def move_to_trash(job_id: str) -> bool:
    """Move output directory to trash."""
    src = get_output_dir(job_id)
    dst = get_trash_dir(job_id)
    if src.exists():
        if dst.exists():
            shutil.rmtree(dst)
        shutil.move(str(src), str(dst))
        return True
    return False


def restore_from_trash(job_id: str) -> bool:
    """Move output directory back from trash."""
    src = get_trash_dir(job_id)
    dst = get_output_dir(job_id)
    if src.exists():
        if dst.exists():
            shutil.rmtree(dst)
        shutil.move(str(src), str(dst))
        return True
    return False


def delete_permanently(job_id: str, video_path: Optional[str] = None) -> None:
    """Permanently delete output, trash, and upload files."""
    out_dir = get_output_dir(job_id)
    if out_dir.exists():
        shutil.rmtree(out_dir, ignore_errors=True)
    trash_d = get_trash_dir(job_id)
    if trash_d.exists():
        shutil.rmtree(trash_d, ignore_errors=True)
    if video_path and os.path.exists(video_path):
        try:
            os.unlink(video_path)
        except OSError:
            pass

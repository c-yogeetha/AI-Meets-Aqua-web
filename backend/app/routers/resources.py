from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Query, Request
from fastapi.responses import FileResponse, StreamingResponse

from app.config import settings
from app.errors import AppError

router = APIRouter(prefix="/api/v1/resources", tags=["Resources"])

MIME_MAP = {
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".zip": "application/zip",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".json": "application/json",
    ".onnx": "application/octet-stream",
    ".pt": "application/octet-stream",
    ".bin": "application/octet-stream",
}


def load_catalog() -> List[Dict[str, Any]]:
    """Load published resources catalog."""
    catalog_path = settings.resources_public_path / "catalog.json"
    if not catalog_path.exists():
        return []
    try:
        data = json.loads(catalog_path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def validate_resource_id(resource_id: str) -> None:
    """Validate resource identifier against path traversal attacks."""
    if not resource_id or not re.match(r"^[a-zA-Z0-9_-]{3,64}$", resource_id):
        raise AppError(status_code=400, code="invalid_id", message="Invalid resource identifier")
    if ".." in resource_id or "/" in resource_id or "\\" in resource_id:
        raise AppError(status_code=400, code="invalid_id", message="Path traversal detected")


def get_range_stream(file_path: Path, range_header: str, media_type: str = "video/mp4"):
    """Stream file chunk for HTTP 206 Partial Content range requests."""
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


@router.get("", summary="List curated resource library items")
def list_resources(
    category: Optional[str] = Query(None, description="Category filter"),
    type: Optional[str] = Query(None, description="Type filter (pdf, video, etc.)"),
    q: Optional[str] = Query(None, description="Search query"),
    featured: Optional[bool] = Query(None, description="Featured items filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    catalog = load_catalog()

    # Category counts across all catalog items
    category_counts: Dict[str, int] = {}
    for item in catalog:
        cat = item.get("category", "other")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    filtered = catalog

    # Filter by category
    if category:
        cat_lower = category.strip().lower()
        filtered = [it for it in filtered if it.get("category", "").lower() == cat_lower]

    # Filter by type
    if type:
        type_lower = type.strip().lower()
        filtered = [it for it in filtered if it.get("type", "").lower() == type_lower]

    # Filter by featured
    if featured is not None:
        filtered = [it for it in filtered if bool(it.get("featured", False)) == featured]

    # Search filter
    if q and q.strip():
        q_term = q.strip().lower()

        def matches(item: Dict[str, Any]) -> bool:
            title = str(item.get("title", "")).lower()
            desc = str(item.get("description", "")).lower()
            author = str(item.get("author", "")).lower()
            tags = " ".join([str(t).lower() for t in item.get("tags", [])])
            return (
                q_term in title
                or q_term in desc
                or q_term in author
                or q_term in tags
            )

        filtered = [it for it in filtered if matches(it)]

    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = filtered[start_idx:end_idx]

    return {
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "categories": category_counts,
    }


@router.get("/{resource_id}", summary="Get metadata for a specific resource")
def get_resource(resource_id: str):
    validate_resource_id(resource_id)
    catalog = load_catalog()
    for item in catalog:
        if item.get("id") == resource_id:
            return item
    raise AppError(status_code=404, code="not_found", message=f"Resource '{resource_id}' not found")


@router.get("/{resource_id}/file", summary="Download resource attachment")
def download_resource_file(resource_id: str):
    validate_resource_id(resource_id)
    catalog = load_catalog()
    item = next((it for it in catalog if it.get("id") == resource_id), None)
    if not item:
        raise AppError(status_code=404, code="not_found", message=f"Resource '{resource_id}' not found")

    # Locate file in files/ directory
    files_dir = settings.resources_public_path / "files"
    matching_files = list(files_dir.glob(f"{resource_id}.*"))
    if not matching_files:
        raise AppError(status_code=404, code="not_found", message="Attachment file not found")

    file_path = matching_files[0]
    # Ensure within resources_public_path
    if not str(file_path.resolve()).startswith(str(settings.resources_public_path.resolve())):
        raise AppError(status_code=400, code="invalid_path", message="Path traversal violation")

    ext = file_path.suffix.lower()
    media_type = MIME_MAP.get(ext, "application/octet-stream")

    raw_title = item.get("title", f"resource-{resource_id}")
    ascii_clean = re.sub(r"[^A-Za-z0-9_\-\.]", "_", raw_title).strip("_")
    fallback_filename = f"{ascii_clean}{ext}"
    encoded_filename = quote(f"{raw_title}{ext}")
    content_disp = (
        f'attachment; filename="{fallback_filename}"; filename*=UTF-8\'\'{encoded_filename}'
    )

    return FileResponse(
        str(file_path),
        media_type=media_type,
        headers={
            "Content-Disposition": content_disp,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.get("/{resource_id}/preview", summary="Inline preview or stream of resource")
def preview_resource(resource_id: str, request: Request):
    validate_resource_id(resource_id)
    catalog = load_catalog()
    item = next((it for it in catalog if it.get("id") == resource_id), None)
    if not item:
        raise AppError(status_code=404, code="not_found", message=f"Resource '{resource_id}' not found")

    # Look in previews/ first, then in files/
    previews_dir = settings.resources_public_path / "previews"
    files_dir = settings.resources_public_path / "files"

    target_path = None
    preview_candidates = list(previews_dir.glob(f"{resource_id}.*"))
    if preview_candidates:
        target_path = preview_candidates[0]
    else:
        file_candidates = list(files_dir.glob(f"{resource_id}.*"))
        if file_candidates:
            target_path = file_candidates[0]

    if not target_path or not target_path.exists():
        raise AppError(status_code=404, code="not_found", message="Preview not available")

    # Traversal check
    if not str(target_path.resolve()).startswith(str(settings.resources_public_path.resolve())):
        raise AppError(status_code=400, code="invalid_path", message="Path traversal violation")

    ext = target_path.suffix.lower()
    media_type = MIME_MAP.get(ext, "application/octet-stream")

    range_header = request.headers.get("range")
    if range_header and ext in [".mp4", ".webm"]:
        return get_range_stream(target_path, range_header, media_type=media_type)

    return FileResponse(
        str(target_path),
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=3600",
        },
    )


@router.get("/{resource_id}/thumb", summary="Get resource thumbnail")
def get_resource_thumbnail(resource_id: str):
    validate_resource_id(resource_id)
    thumb_path = settings.resources_public_path / "thumbs" / f"{resource_id}.png"
    if not thumb_path.exists():
        # Fallback to SVG or any existing thumbnail
        svg_path = settings.resources_public_path / "thumbs" / f"{resource_id}.svg"
        if svg_path.exists():
            thumb_path = svg_path
        else:
            raise AppError(status_code=404, code="not_found", message="Thumbnail not found")

    if not str(thumb_path.resolve()).startswith(str(settings.resources_public_path.resolve())):
        raise AppError(status_code=400, code="invalid_path", message="Path traversal violation")

    media_type = "image/png" if thumb_path.suffix.lower() == ".png" else "image/svg+xml"
    return FileResponse(
        str(thumb_path),
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        },
    )

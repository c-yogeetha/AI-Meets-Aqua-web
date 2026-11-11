import importlib

from fastapi import APIRouter

from app.config import settings
from app.schemas import SystemInfoResponse

router = APIRouter(tags=["System"])


@router.get("/health", summary="Health Check")
def health_check():
    return {"status": "ok"}


@router.get("/api/v1/system/info", response_model=SystemInfoResponse, summary="System Information")
def system_info():
    external_ok = False
    try:
        importlib.import_module(settings.AI_MODULE)
        external_ok = True
    except Exception:
        external_ok = False

    return SystemInfoResponse(
        version="1.0.0",
        analyzer=settings.ANALYZER,
        external_available=external_ok,
        max_upload_mb=settings.MAX_UPLOAD_MB,
        max_duration_s=settings.MAX_DURATION_S,
    )

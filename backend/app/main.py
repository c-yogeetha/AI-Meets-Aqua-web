import os
import uuid

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib_cache")

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.db import Base, get_engine, get_session_factory
from app.errors import (
    AppError,
    app_error_handler,
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.routers import (
    alerts,
    demo,
    history,
    insights,
    jobs,
    resources,
    results,
    system,
    tanks,
    trash,
    videos,
)
from app.services.jobs import startup_job_cleanup


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    settings.ensure_dirs()
    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    session_factory = get_session_factory()
    db = session_factory()
    try:
        startup_job_cleanup(db)
        from app.services.trash import purge_expired_trash, purge_retention

        purge_expired_trash(db)
        purge_retention(db)
    finally:
        db.close()

    yield
    # Shutdown actions


def create_app() -> FastAPI:
    app = FastAPI(
        title="Matsya API",
        description="Goldfish Stress Detection and Behavioral Analysis Pipeline",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redirect_slashes=False,
        lifespan=lifespan,
    )

    # CORS configuration
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    regex = settings.CORS_ORIGIN_REGEX if settings.CORS_ORIGIN_REGEX else None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def owner_scoping_middleware(request: Request, call_next):
        cookie_val = request.cookies.get("matsya_oid")
        is_new = False
        if not cookie_val:
            cookie_val = uuid.uuid4().hex
            is_new = True

        request.state.owner_id = cookie_val
        response = await call_next(request)

        if is_new or "matsya_oid" not in request.cookies:
            proto = request.headers.get("x-forwarded-proto", "").lower()
            is_secure = (proto == "https") or (request.url.scheme == "https")
            response.set_cookie(
                key="matsya_oid",
                value=cookie_val,
                max_age=180 * 86400,
                httponly=True,
                samesite="lax",
                secure=is_secure,
            )
        return response

    # Exception Handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Routers - registered without trailing slashes
    app.include_router(system.router)
    app.include_router(tanks.router)
    app.include_router(videos.router)
    app.include_router(jobs.router)
    app.include_router(results.router)
    app.add_api_route(
        "/api/v1/reports/{job_id}.pdf",
        results.get_pdf_report,
        methods=["GET"],
        summary="Download PDF report (alias)",
        tags=["Results"],
    )
    app.include_router(history.router)
    app.include_router(trash.router)
    app.include_router(insights.router)
    app.include_router(alerts.router)
    app.include_router(resources.router)
    app.include_router(demo.router)

    return app


app = create_app()

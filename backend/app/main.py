from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.config import settings
from app.db import Base, get_engine, get_session_factory
from app.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.routers import (
    alerts,
    demo,
    history,
    jobs,
    insights,
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
    finally:
        db.close()

    yield
    # Shutdown actions


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Meets Aqua API",
        description="Goldfish Stress Detection and Behavioral Analysis Pipeline",
        version="1.0.0",
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

    # Exception Handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)

    # Routers
    app.include_router(system.router)
    app.include_router(tanks.router)
    app.include_router(videos.router)
    app.include_router(jobs.router)
    app.include_router(results.router)
    app.include_router(history.router)
    app.include_router(trash.router)
    app.include_router(insights.router)
    app.include_router(alerts.router)
    app.include_router(demo.router)

    return app


app = create_app()

from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import settings

Base = declarative_base()

_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        settings.ensure_dirs()
        db_url = f"sqlite:///{settings.db_path}"
        _engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False, "timeout": 30.0},
        )

        @event.listens_for(_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.close()

        # Check and migrate owner_id on tanks if table exists
        with _engine.connect() as conn:
            try:
                res = conn.exec_driver_sql("PRAGMA table_info(tanks)").fetchall()
                cols = [r[1] for r in res]
                if cols and "owner_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE tanks ADD COLUMN owner_id VARCHAR(64) NOT NULL DEFAULT 'legacy'")
                    conn.commit()
            except Exception:
                pass

    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def reset_db_engine():
    """Helper for test suites switching DATA_DIR."""
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None

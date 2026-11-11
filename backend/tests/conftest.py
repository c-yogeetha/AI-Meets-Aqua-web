from pathlib import Path
import time
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.db import Base, get_engine, reset_db_engine
from app.main import create_app


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path: Path):
    """Isolate each test in a fresh temporary data directory."""
    settings.DATA_DIR = str(tmp_path / "data")
    settings.ensure_dirs()
    reset_db_engine()
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    yield
    reset_db_engine()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def samples_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "samples"


def wait_for_job(client: TestClient, job_id: str, timeout: float = 60.0) -> dict:
    """Poll job endpoint until done or failed."""
    start = time.time()
    while time.time() - start < timeout:
        res = client.get(f"/api/v1/jobs/{job_id}")
        assert res.status_code == 200
        data = res.json()
        if data["status"] in ("done", "failed"):
            return data
        time.sleep(0.1)
    raise TimeoutError(f"Job {job_id} did not finish within {timeout} seconds")

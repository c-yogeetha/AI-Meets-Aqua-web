from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATA_DIR: str = "data"
    ANALYZER: str = "baseline"
    AI_MODULE: str = "ai.pipeline"
    MAX_UPLOAD_MB: int = 200
    MAX_DURATION_S: float = 120.0
    MIN_DURATION_S: float = 2.0
    JOB_TIMEOUT_S: float = 300.0
    TRASH_RETENTION_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGIN_REGEX: str = ""
    ENABLE_TEST_HOOKS: int = 0
    STAGE_DELAY_S: float = 0.0
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def data_path(self) -> Path:
        p = Path(self.DATA_DIR)
        if not p.is_absolute():
            backend_root = Path(__file__).resolve().parent.parent
            return backend_root / p
        return p

    @property
    def uploads_path(self) -> Path:
        return self.data_path / "uploads"

    @property
    def outputs_path(self) -> Path:
        return self.data_path / "outputs"

    @property
    def trash_path(self) -> Path:
        return self.data_path / "trash"

    @property
    def outbox_path(self) -> Path:
        return self.data_path / "outbox"

    @property
    def db_path(self) -> Path:
        return self.data_path / "aqua.db"

    def ensure_dirs(self) -> None:
        self.uploads_path.mkdir(parents=True, exist_ok=True)
        self.outputs_path.mkdir(parents=True, exist_ok=True)
        self.trash_path.mkdir(parents=True, exist_ok=True)
        self.outbox_path.mkdir(parents=True, exist_ok=True)


settings = Settings()

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# Tank Schemas
class TankBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=60, description="Name of the tank")
    volume_l: float = Field(..., ge=1, le=5000, description="Volume in litres")
    goldfish_count: int = Field(..., ge=1, le=20, description="Number of goldfish")
    water_temp_c: Optional[float] = Field(None, ge=0, le=40, description="Water temperature in Celsius")


class TankCreate(TankBase):
    pass


class TankResponse(TankBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Upload & Video Schemas
class VideoUploadResponse(BaseModel):
    job_id: str
    video_id: str


# Job Schemas
class JobResponse(BaseModel):
    id: str
    video_id: str
    tank_id: str
    status: str  # queued | processing | done | failed
    stage: str   # queued | cleaning | detecting | tracking | analysing | rendering | done
    progress: int = Field(..., ge=0, le=100)
    error: Optional[str] = None
    analyzer: str
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Result Sub-schemas
class ResultTankInfo(BaseModel):
    id: str
    name: str
    goldfish_count: int


class ResultVideoInfo(BaseModel):
    duration_s: float
    fps: float
    width: int
    height: int
    view: str


class FishMetrics(BaseModel):
    speed_bl_s: float
    direction_change_rate: float
    isolation_ratio: float
    surface_ratio: float
    bottom_ratio: float
    inactivity_ratio: float


class FishPoint(BaseModel):
    flag: str
    points: int


class TimelinePoint(BaseModel):
    t: float
    score: int


class FishResult(BaseModel):
    id: str = Field(..., pattern=r"^Fish_\d+$")
    score: int = Field(..., ge=0, le=100)
    stressed: bool
    flags: List[str]
    metrics: FishMetrics
    points: List[FishPoint]
    explanation: str
    timeline: List[TimelinePoint]


class KeyMoment(BaseModel):
    t: float
    fish: str
    behaviour: str
    label: str
    frame_url: str


class SuggestionItem(BaseModel):
    priority: str  # high | medium | low
    fish: List[str]
    behaviour: str
    cause: str
    action: str
    source: str


class ResultResponse(BaseModel):
    job_id: str
    mode: str  # baseline | mock | external
    tank: ResultTankInfo
    created_at: datetime
    analysis_time_s: float
    video: ResultVideoInfo
    tank_score: int = Field(..., ge=0, le=100)
    level: str  # Normal | Moderate | High
    threshold: int
    fish: List[FishResult]
    timeline: List[TimelinePoint]
    key_moments: List[KeyMoment]
    suggestions: List[SuggestionItem]
    warnings: List[str]
    annotated_video_url: str
    disclaimer: str


# History Schemas
class HistoryItem(BaseModel):
    id: str
    tank_id: str
    tank_name: str
    created_at: datetime
    tank_score: int
    level: str
    stressed_count: int
    fish_count: int
    duration_s: float
    mode: str
    model_config = ConfigDict(from_attributes=True)


class PagedHistory(BaseModel):
    items: List[HistoryItem]
    total: int
    page: int
    page_size: int


# Trash Schemas
class TrashItem(BaseModel):
    id: str
    tank_id: str
    tank_name: str
    created_at: datetime
    deleted_at: datetime
    days_remaining: int
    tank_score: int
    level: str


class PurgeResponse(BaseModel):
    purged: int


# Insights Schemas
class InsightSeriesPoint(BaseModel):
    date: str
    score: int


class InsightsResponse(BaseModel):
    tank_id: str
    fsi: Optional[float] = None
    level: Optional[str] = None
    trend: str  # improving | stable | worsening | insufficient_data
    series: List[InsightSeriesPoint]
    messages: List[str]


# Alerts Schemas
class AlertResponse(BaseModel):
    id: str
    tank_id: str
    result_id: Optional[str] = None
    severity: str  # info | warning | critical
    message: str
    created_at: datetime
    read: bool
    model_config = ConfigDict(from_attributes=True)


class AlertSettingsResponse(BaseModel):
    dashboard_popup: bool
    email_enabled: bool
    email_to: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class AlertSettingsUpdate(BaseModel):
    dashboard_popup: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_to: Optional[str] = None


# Demo & System Schemas
class DemoSeedResponse(BaseModel):
    tank_id: str
    result_ids: List[str]


class SystemInfoResponse(BaseModel):
    version: str
    analyzer: str
    external_available: bool
    max_upload_mb: int
    max_duration_s: float

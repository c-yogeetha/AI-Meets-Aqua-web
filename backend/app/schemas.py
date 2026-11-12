from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

UtcDatetime = Annotated[
    datetime,
    PlainSerializer(
        lambda v: (v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v.astimezone(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        return_type=str,
        when_used="json",
    ),
]


# Tank Schemas
class TankBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300, description="Name of the tank")
    volume_l: float = Field(..., ge=1, le=5000, description="Volume in litres")
    goldfish_count: int = Field(..., ge=1, le=20, description="Number of goldfish")
    water_temp_c: Optional[float] = Field(None, ge=0, le=40, description="Water temperature in Celsius")


class TankCreate(TankBase):
    pass


class TankUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=300, description="Name of the tank")
    volume_l: Optional[float] = Field(None, ge=1, le=5000, description="Volume in litres")
    goldfish_count: Optional[int] = Field(None, ge=1, le=20, description="Number of goldfish")
    water_temp_c: Optional[float] = Field(None, ge=0, le=40, description="Water temperature in Celsius")


class TankResponse(TankBase):
    id: str
    created_at: UtcDatetime
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
    status: str  # queued | processing | done | failed | cancelled
    stage: str   # queued | cleaning | detecting | tracking | analysing | rendering | done
    progress: int = Field(..., ge=0, le=100)
    queue_position: int = 0
    error: Optional[str] = None
    analyzer: str
    created_at: UtcDatetime
    started_at: Optional[UtcDatetime] = None
    finished_at: Optional[UtcDatetime] = None
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
    confidence: float = 1.0


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
    source: str = ""
    low_confidence: bool = False


class ReliabilityMetrics(BaseModel):
    brightness: float = 0.0
    contrast: float = 0.0
    sharpness: float = 0.0
    shake_px: float = 0.0
    coverage_pct: float = 0.0
    fish_expected: int = 0
    fish_tracked: int = 0
    fish_median_px: float = 0.0
    fps: float = 0.0
    width: int = 0
    height: int = 0


class ReliabilityInfo(BaseModel):
    level: str = "high"  # high | medium | low
    score: int = 100
    reasons: List[str] = []
    tips: List[str] = []
    metrics: ReliabilityMetrics = Field(default_factory=ReliabilityMetrics)


class DetectionStats(BaseModel):
    frames_total: int = 0
    frames_processed: int = 0
    frames_with_detections_pct: float = 0.0
    id_switch_estimate: int = 0


class ResultResponse(BaseModel):
    job_id: str
    mode: str  # baseline | onnx | external | mock
    tank: ResultTankInfo
    created_at: UtcDatetime
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
    reliability: ReliabilityInfo = Field(default_factory=ReliabilityInfo)
    detection: DetectionStats = Field(default_factory=DetectionStats)
    annotated_video_url: str
    annotated_video_alt_url: Optional[str] = None
    disclaimer: str


# History Schemas
class HistoryItem(BaseModel):
    id: str
    tank_id: str
    tank_name: str
    created_at: UtcDatetime
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
    created_at: UtcDatetime
    deleted_at: UtcDatetime
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
    created_at: UtcDatetime
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


class DetectorsMap(BaseModel):
    baseline: bool = True
    onnx: bool = False
    external: bool = False


class SystemLimits(BaseModel):
    max_upload_mb: int
    max_duration_s: float
    min_duration_s: float
    job_timeout_s: float
    max_queue: int


class SystemStatusResponse(BaseModel):
    version: str = "1.0.0"
    mode: str
    detectors: DetectorsMap
    queue_length: int
    limits: SystemLimits
    uptime_s: float
    disk_free_mb: int


# Config / Scoring Schemas
class ScoringRuleItem(BaseModel):
    priority: str
    behaviour: str
    cause: str
    action: str
    when: Optional[str] = None


class ScoringConfigResponse(BaseModel):
    threshold: int
    levels: Dict[str, int]
    window_s: int
    sample_hz: int
    zones: Dict[str, float]
    speed: Dict[str, float]
    direction: Dict[str, float]
    isolation: Dict[str, float]
    surface: Dict[str, float]
    bottom: Dict[str, float]
    lethargy: Dict[str, float]
    points: Dict[str, int]
    tank_formula: str
    rules: Dict[str, ScoringRuleItem]
    context_rules: Dict[str, ScoringRuleItem]
    provenance: str


# Overview Schemas
class TankOverviewSummary(BaseModel):
    id: str
    name: str
    goldfish_count: int
    volume_l: float
    latest_score: Optional[int] = None
    latest_level: Optional[str] = None
    last_analyzed_at: Optional[UtcDatetime] = None
    sparkline: List[int] = []


class RecentAnalysisSummary(BaseModel):
    id: str
    tank_id: str
    tank_name: str
    created_at: UtcDatetime
    tank_score: int
    level: str
    stressed_count: int
    fish_count: int
    mode: str


class PriorityAlertSummary(BaseModel):
    id: str
    tank_id: str
    severity: str
    message: str
    created_at: UtcDatetime


class OverviewResponse(BaseModel):
    tanks_count: int
    analyses_count: int
    analyses_this_week: int
    flagged_fish_count: int
    unread_alerts_count: int
    tanks: List[TankOverviewSummary]
    recent_analyses: List[RecentAnalysisSummary]
    priority_alerts: List[PriorityAlertSummary]
    recommended_actions: List[Dict[str, Any]]

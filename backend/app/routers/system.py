import datetime
import importlib
import json
import shutil
import time
from pathlib import Path
from typing import Dict, List

import yaml
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth import get_current_owner_id
from app.config import settings
from app.db import get_db
from app.models import Alert, Job, Result, Tank
from app.schemas import (
    DetectorsMap,
    OverviewResponse,
    PriorityAlertSummary,
    RecentAnalysisSummary,
    ScoringConfigResponse,
    ScoringRuleItem,
    SystemInfoResponse,
    SystemLimits,
    SystemStatusResponse,
    TankOverviewSummary,
)

router = APIRouter(tags=["System"])

SERVER_START_TIME = time.time()


def check_onnx_available() -> bool:
    model_path = settings.models_path / "goldfish.onnx"
    if not model_path.exists():
        return False
    try:
        import cv2
        net = cv2.dnn.readNetFromONNX(str(model_path))
        return not net.empty()
    except Exception:
        return False


def check_external_available() -> bool:
    try:
        mod = importlib.import_module(settings.AI_MODULE)
        return hasattr(mod, "detect_and_track") or hasattr(mod, "analyze_video")
    except Exception:
        return False


def resolve_active_mode() -> str:
    requested = settings.ANALYZER
    if requested == "auto":
        if check_onnx_available():
            return "onnx"
        if check_external_available() and settings.AI_MODULE != "ai.pipeline":
            return "external"
        return "baseline"
    return requested


@router.get("/health", summary="Health Check")
@router.get("/api/v1/health", summary="Health Check v1")
def health_check():
    return {"status": "ok"}


@router.get("/api/v1/system/status", response_model=SystemStatusResponse, summary="System Status")
def system_status(db: Session = Depends(get_db)):
    onnx_ok = check_onnx_available()
    external_ok = check_external_available()
    active_mode = resolve_active_mode()

    # Calculate queue length
    queue_len = db.query(Job).filter(Job.status.in_(["queued", "processing"])).count()

    # Calculate disk free
    try:
        _, _, free = shutil.disk_usage(settings.data_path)
        disk_free_mb = int(free / (1024 * 1024))
    except Exception:
        disk_free_mb = 1000

    uptime = time.time() - SERVER_START_TIME

    return SystemStatusResponse(
        version="1.0.0",
        mode=active_mode,
        detectors=DetectorsMap(
            baseline=True,
            onnx=onnx_ok,
            external=external_ok,
        ),
        queue_length=queue_len,
        limits=SystemLimits(
            max_upload_mb=settings.MAX_UPLOAD_MB,
            max_duration_s=settings.MAX_DURATION_S,
            min_duration_s=settings.MIN_DURATION_S,
            job_timeout_s=settings.JOB_TIMEOUT_S,
            max_queue=settings.MAX_QUEUE,
        ),
        uptime_s=round(uptime, 1),
        disk_free_mb=disk_free_mb,
    )


@router.get("/api/v1/system/info", response_model=SystemInfoResponse, summary="System Information (Legacy)")
def system_info():
    external_ok = check_external_available()
    return SystemInfoResponse(
        version="1.0.0",
        analyzer=resolve_active_mode(),
        external_available=external_ok,
        max_upload_mb=settings.MAX_UPLOAD_MB,
        max_duration_s=settings.MAX_DURATION_S,
    )


@router.get("/api/v1/config/scoring", response_model=ScoringConfigResponse, summary="Scoring and Rules Configuration")
def get_scoring_config():
    config_dir = Path(__file__).resolve().parent.parent / "analysis" / "config"
    scoring_file = config_dir / "scoring.yaml"
    rules_file = config_dir / "rules.yaml"

    scoring_data = yaml.safe_load(scoring_file.read_text(encoding="utf-8")) if scoring_file.exists() else {}
    rules_data = yaml.safe_load(rules_file.read_text(encoding="utf-8")) if rules_file.exists() else {}

    # Strip any internal filesystem paths or source locations
    clean_rules: Dict[str, ScoringRuleItem] = {}
    for k, v in rules_data.get("rules", {}).items():
        clean_rules[k] = ScoringRuleItem(
            priority=v.get("priority", "medium"),
            behaviour=v.get("behaviour", ""),
            cause=v.get("cause", ""),
            action=v.get("action", ""),
        )

    clean_context: Dict[str, ScoringRuleItem] = {}
    for k, v in rules_data.get("context_rules", {}).items():
        clean_context[k] = ScoringRuleItem(
            priority=v.get("priority", "low"),
            behaviour=v.get("behaviour", ""),
            cause=v.get("cause", ""),
            action=v.get("action", ""),
            when=v.get("when", None),
        )

    return ScoringConfigResponse(
        threshold=scoring_data.get("threshold", 35),
        levels=scoring_data.get("levels", {"normal_max": 34, "moderate_max": 59}),
        window_s=scoring_data.get("window_s", 5),
        sample_hz=scoring_data.get("sample_hz", 5),
        zones=scoring_data.get("zones", {"surface": 0.15, "bottom": 0.15}),
        speed=scoring_data.get("speed", {"fast_bl_s": 3.5, "inactive_bl_s": 0.15}),
        direction=scoring_data.get("direction", {"turn_deg": 60, "erratic_per_s": 0.8}),
        isolation=scoring_data.get("isolation", {"nn_dist_frac_diag": 0.30, "ratio_min": 0.5}),
        surface=scoring_data.get("surface", {"ratio_min": 0.35}),
        bottom=scoring_data.get("bottom", {"ratio_min": 0.6, "inactivity_min": 0.7}),
        lethargy=scoring_data.get("lethargy", {"all_inactive_ratio_min": 0.8}),
        points=scoring_data.get("points", {}),
        tank_formula=scoring_data.get("tank_formula", "max_plus_spread"),
        rules=clean_rules,
        context_rules=clean_context,
        provenance="Default thresholds selected by the project team for demonstration; not clinically validated.",
    )


@router.get("/api/v1/overview", response_model=OverviewResponse, summary="Dashboard Overview Summary")
def get_overview(request: Request, db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    tanks_q = db.query(Tank)
    if owner_id is not None:
        tanks_q = tanks_q.filter(Tank.owner_id == owner_id)
    tanks = tanks_q.all()
    tanks_count = len(tanks)

    now = datetime.datetime.now(datetime.timezone.utc)
    one_week_ago = now - datetime.timedelta(days=7)

    results_q = db.query(Result).join(Tank, Result.tank_id == Tank.id).filter(Result.deleted_at.is_(None))
    if owner_id is not None:
        results_q = results_q.filter(Tank.owner_id == owner_id)
    active_results = results_q.order_by(Result.created_at.desc()).all()
    analyses_count = len(active_results)
    analyses_this_week = sum(1 for r in active_results if r.created_at >= one_week_ago.replace(tzinfo=None))

    alerts_q = db.query(Alert).join(Tank, Alert.tank_id == Tank.id).filter(Alert.read.is_(False))
    if owner_id is not None:
        alerts_q = alerts_q.filter(Tank.owner_id == owner_id)
    unread_alerts = alerts_q.order_by(Alert.created_at.desc()).all()
    unread_alerts_count = len(unread_alerts)

    # Flagged fish count: count of fish with stressed=True in the latest result per tank
    results_by_tank: Dict[str, List[Result]] = {}
    for r in active_results:
        results_by_tank.setdefault(r.tank_id, []).append(r)

    flagged_fish_count = 0
    tanks_summary: List[TankOverviewSummary] = []
    tank_name_map = {t.id: t.name for t in tanks}

    for t in tanks:
        tank_results = results_by_tank.get(t.id, [])
        latest_res = tank_results[0] if tank_results else None

        sparkline = [r.tank_score for r in reversed(tank_results[:8])]

        if latest_res:
            flagged_fish_count += latest_res.stressed_count
            latest_score = latest_res.tank_score
            latest_level = latest_res.level
            last_analyzed = latest_res.created_at
        else:
            latest_score = None
            latest_level = None
            last_analyzed = None

        tanks_summary.append(
            TankOverviewSummary(
                id=t.id,
                name=t.name,
                goldfish_count=t.goldfish_count,
                volume_l=t.volume_l,
                latest_score=latest_score,
                latest_level=latest_level,
                last_analyzed_at=last_analyzed,
                sparkline=sparkline,
            )
        )

    # Recent analyses summary (top 8)
    recent_analyses: List[RecentAnalysisSummary] = []
    for r in active_results[:8]:
        recent_analyses.append(
            RecentAnalysisSummary(
                id=r.job_id,
                tank_id=r.tank_id,
                tank_name=tank_name_map.get(r.tank_id, "Tank"),
                created_at=r.created_at,
                tank_score=r.tank_score,
                level=r.level,
                stressed_count=r.stressed_count,
                fish_count=r.fish_count,
                mode=r.mode,
            )
        )

    # Priority alerts (top 5)
    priority_alerts: List[PriorityAlertSummary] = []
    for a in unread_alerts[:5]:
        priority_alerts.append(
            PriorityAlertSummary(
                id=a.id,
                tank_id=a.tank_id,
                severity=a.severity,
                message=a.message,
                created_at=a.created_at,
            )
        )

    # Recommended actions: extract high & medium priority suggestions from latest results
    recommended_actions = []
    seen_suggestions = set()
    for r in active_results[:5]:
        try:
            r_json = json.loads(r.result_json)
            for s in r_json.get("suggestions", []):
                key = (s.get("behaviour"), s.get("action"))
                if key not in seen_suggestions and s.get("priority") in ("high", "medium"):
                    seen_suggestions.add(key)
                    recommended_actions.append({
                        "priority": s.get("priority"),
                        "behaviour": s.get("behaviour"),
                        "cause": s.get("cause"),
                        "action": s.get("action"),
                        "tank_name": tank_name_map.get(r.tank_id, "Tank"),
                        "job_id": r.job_id,
                    })
                    if len(recommended_actions) >= 5:
                        break
        except Exception:
            continue

    return OverviewResponse(
        tanks_count=tanks_count,
        analyses_count=analyses_count,
        analyses_this_week=analyses_this_week,
        flagged_fish_count=flagged_fish_count,
        unread_alerts_count=unread_alerts_count,
        tanks=tanks_summary,
        recent_analyses=recent_analyses,
        priority_alerts=priority_alerts,
        recommended_actions=recommended_actions,
    )

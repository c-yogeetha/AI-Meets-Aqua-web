from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Alert, AlertSettings
from app.schemas import AlertResponse, AlertSettingsResponse, AlertSettingsUpdate

router = APIRouter(prefix="/api/v1", tags=["Alerts"])


@router.get("/alerts", response_model=List[AlertResponse], summary="List system alerts")
def list_alerts(unread: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if unread is not None:
        query = query.filter(Alert.read == (not unread))
    return query.all()


@router.post("/alerts/{alert_id}/read", response_model=AlertResponse, summary="Mark alert as read")
def mark_alert_read(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise AppError(status_code=404, code="alert_not_found", message=f"Alert '{alert_id}' not found.")
    alert.read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/settings/alerts", response_model=AlertSettingsResponse, summary="Get alert settings")
def get_alert_settings(db: Session = Depends(get_db)):
    settings_rec = db.query(AlertSettings).first()
    if not settings_rec:
        settings_rec = AlertSettings(id=1, dashboard_popup=True, email_enabled=False, email_to=None)
        db.add(settings_rec)
        db.commit()
        db.refresh(settings_rec)
    return settings_rec


@router.put("/settings/alerts", response_model=AlertSettingsResponse, summary="Update alert settings")
def update_alert_settings(payload: AlertSettingsUpdate, db: Session = Depends(get_db)):
    settings_rec = db.query(AlertSettings).first()
    if not settings_rec:
        settings_rec = AlertSettings(id=1)
        db.add(settings_rec)

    if payload.dashboard_popup is not None:
        settings_rec.dashboard_popup = payload.dashboard_popup
    if payload.email_enabled is not None:
        settings_rec.email_enabled = payload.email_enabled
    if payload.email_to is not None:
        settings_rec.email_to = payload.email_to

    db.commit()
    db.refresh(settings_rec)
    return settings_rec

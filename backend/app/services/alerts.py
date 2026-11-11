import smtplib
import uuid
from email.message import EmailMessage
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.clock import now
from app.config import settings
from app.models import Alert, AlertSettings


def format_fish_names(fish_ids: List[str]) -> str:
    if not fish_ids:
        return "Goldfish"
    if len(fish_ids) == 1:
        return f"{fish_ids[0]} shows"
    return f"{', '.join(fish_ids[:-1])} and {fish_ids[-1]} show"


def send_email_alert(recipient: str, subject: str, body: str) -> None:
    """Send email via SMTP or write to outbox folder."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or "aqua-alerts@atria.edu"
    msg["To"] = recipient
    msg.set_content(body)

    if settings.SMTP_HOST:
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        except Exception:
            pass
    else:
        settings.outbox_path.mkdir(parents=True, exist_ok=True)
        eml_file = settings.outbox_path / f"alert_{uuid.uuid4().hex[:8]}.eml"
        with open(eml_file, "wb") as f:
            f.write(msg.as_bytes())


def handle_analysis_alerts(
    db: Session,
    tank_id: str,
    tank_name: str,
    job_id: str,
    result_dict: Dict[str, Any],
) -> None:
    """Create alert and dispatch notification if stress detected."""
    stressed_fish = [f["id"] for f in result_dict.get("fish", []) if f.get("stressed", False)]
    if not stressed_fish:
        return

    level = result_dict.get("level", "Moderate")
    severity = "critical" if level == "High" else "warning"
    tank_score = result_dict.get("tank_score", 0)

    msg = f"{format_fish_names(stressed_fish)} stress indicators in {tank_name} (score {tank_score})."

    alert = Alert(
        tank_id=tank_id,
        result_id=job_id,
        severity=severity,
        message=msg,
        created_at=now(),
        read=False,
    )
    db.add(alert)
    db.commit()

    # Check email setting
    alert_cfg = db.query(AlertSettings).first()
    if alert_cfg and alert_cfg.email_enabled and alert_cfg.email_to:
        subject = f"[{severity.upper()}] Stress Alert for {tank_name}"
        send_email_alert(alert_cfg.email_to, subject, msg)

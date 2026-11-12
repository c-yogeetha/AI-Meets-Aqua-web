import math
from datetime import timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.clock import now
from app.config import settings
from app.models import Result, Tank
from app.services.storage import delete_permanently, move_to_trash, restore_from_trash


def get_trash_items(db: Session, owner_id: Optional[str] = None) -> List[Tuple[Result, str, int]]:
    """Return all deleted results with tank name and days remaining."""
    query = (
        db.query(Result, Tank.name)
        .join(Tank, Result.tank_id == Tank.id)
        .filter(Result.deleted_at.isnot(None))
    )
    if owner_id is not None:
        query = query.filter(Tank.owner_id == owner_id)

    deleted_results = query.order_by(Result.deleted_at.desc()).all()

    current_time = now()
    if current_time.tzinfo is not None:
        current_time = current_time.replace(tzinfo=None)

    retention_days = settings.TRASH_RETENTION_DAYS
    items = []

    for res, tank_name in deleted_results:
        d_at = res.deleted_at
        if d_at.tzinfo is not None:
            d_at = d_at.replace(tzinfo=None)
        # Calculate age in days
        age_seconds = (current_time - d_at).total_seconds()
        age_days = age_seconds / 86400.0
        days_remaining = max(0, math.ceil(retention_days - age_days))
        items.append((res, tank_name, days_remaining))

    return items


def soft_delete_result(db: Session, job_id: str) -> None:
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        return
    res.deleted_at = now()
    db.commit()
    move_to_trash(job_id)


def restore_result(db: Session, job_id: str) -> bool:
    res = db.query(Result).filter(Result.job_id == job_id).first()
    if not res:
        return False
    if res.deleted_at is None:
        return False
    res.deleted_at = None
    db.commit()
    restore_from_trash(job_id)
    return True


def purge_expired_trash(db: Session) -> int:
    """Purge results that exceeded retention days."""
    cur = now()
    if cur.tzinfo is not None:
        cur = cur.replace(tzinfo=None)
    cutoff = cur - timedelta(days=settings.TRASH_RETENTION_DAYS)
    expired = db.query(Result).filter(Result.deleted_at.isnot(None), Result.deleted_at < cutoff).all()

    count = 0
    for res in expired:
        jid = res.job_id
        db.delete(res)
        delete_permanently(jid)
        count += 1

    if count > 0:
        db.commit()
    return count


def purge_retention(db: Session, retention_days: Optional[int] = None) -> int:
    """Purge old analysis results and outputs older than retention_days, excluding demo tanks."""
    import shutil

    from app.models import Tank
    from app.services.storage import get_output_dir

    days = retention_days if retention_days is not None else settings.RETENTION_DAYS
    cur = now()
    if cur.tzinfo is not None:
        cur = cur.replace(tzinfo=None)
    cutoff = cur - timedelta(days=days)

    results = (
        db.query(Result)
        .join(Tank, Result.tank_id == Tank.id)
        .filter(Result.created_at < cutoff)
        .filter(~Tank.name.ilike("%demo%"))
        .all()
    )

    count = 0
    for res in results:
        jid = res.job_id
        db.delete(res)
        out_dir = get_output_dir(jid)
        if out_dir.exists():
            try:
                shutil.rmtree(out_dir, ignore_errors=True)
            except Exception:
                pass
        count += 1

    if count > 0:
        db.commit()
    return count

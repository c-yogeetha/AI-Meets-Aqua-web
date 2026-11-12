from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth import get_current_owner_id
from app.db import get_db
from app.models import Result, Tank
from app.schemas import HistoryItem, PagedHistory

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("", response_model=PagedHistory, summary="Get paginated history of analyses")
def get_history(
    request: Request,
    tank_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    owner_id = get_current_owner_id(request)
    query = (
        db.query(Result, Tank.name)
        .join(Tank, Result.tank_id == Tank.id)
        .filter(Result.deleted_at.is_(None))
    )

    if owner_id is not None:
        query = query.filter(Tank.owner_id == owner_id)

    if tank_id:
        query = query.filter(Result.tank_id == tank_id)

    total = query.count()
    rows = (
        query.order_by(Result.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for res, tank_name in rows:
        items.append(
            HistoryItem(
                id=res.job_id,
                tank_id=res.tank_id,
                tank_name=tank_name,
                created_at=res.created_at,
                tank_score=res.tank_score,
                level=res.level,
                stressed_count=res.stressed_count,
                fish_count=res.fish_count,
                duration_s=res.duration_s,
                mode=res.mode,
            )
        )

    return PagedHistory(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

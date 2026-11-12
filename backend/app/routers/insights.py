from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth import get_current_owner_id
from app.db import get_db
from app.errors import AppError
from app.models import Tank
from app.schemas import InsightsResponse
from app.services.insights import compute_insights

router = APIRouter(prefix="/api/v1/insights", tags=["Insights"])


@router.get("", response_model=InsightsResponse, summary="Get tank insights and FSI")
def get_insights(request: Request, tank_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    owner_id = get_current_owner_id(request)
    target_tank_id = tank_id

    if not target_tank_id:
        q = db.query(Tank).order_by(Tank.created_at.asc())
        if owner_id is not None:
            q = q.filter(Tank.owner_id.in_([owner_id, "legacy"]))
        first_tank = q.first()
        if not first_tank:
            return InsightsResponse(
                tank_id="none",
                fsi=None,
                level=None,
                trend="insufficient_data",
                series=[],
                messages=[],
            )
        target_tank_id = first_tank.id
    else:
        q = db.query(Tank).filter(Tank.id == target_tank_id)
        if owner_id is not None:
            q = q.filter(Tank.owner_id.in_([owner_id, "legacy"]))
        tank = q.first()
        if not tank:
            raise AppError(status_code=404, code="tank_not_found", message=f"Tank '{target_tank_id}' not found.")

    res = compute_insights(db, target_tank_id)
    return InsightsResponse(**res)

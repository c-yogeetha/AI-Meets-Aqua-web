from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.errors import AppError
from app.models import Tank
from app.schemas import InsightsResponse
from app.services.insights import compute_insights

router = APIRouter(prefix="/api/v1/insights", tags=["Insights"])


@router.get("", response_model=InsightsResponse, summary="Get tank insights and FSI")
def get_insights(tank_id: str = Query(...), db: Session = Depends(get_db)):
    tank = db.query(Tank).filter(Tank.id == tank_id).first()
    if not tank:
        raise AppError(status_code=404, code="tank_not_found", message=f"Tank '{tank_id}' not found.")

    res = compute_insights(db, tank_id)
    return InsightsResponse(**res)

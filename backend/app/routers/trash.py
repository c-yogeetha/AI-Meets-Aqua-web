from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import PurgeResponse, TrashItem
from app.services.trash import get_trash_items, purge_expired_trash

router = APIRouter(prefix="/api/v1/trash", tags=["Trash"])


@router.get("", response_model=List[TrashItem], summary="Get analyses in recycle bin")
def list_trash(db: Session = Depends(get_db)):
    items = get_trash_items(db)
    return [
        TrashItem(
            id=res.job_id,
            tank_id=res.tank_id,
            tank_name=tank_name,
            created_at=res.created_at,
            deleted_at=res.deleted_at,
            days_remaining=days_remaining,
            tank_score=res.tank_score,
            level=res.level,
        )
        for res, tank_name, days_remaining in items
    ]


@router.post("/purge", response_model=PurgeResponse, summary="Purge expired trash immediately")
def purge_trash(db: Session = Depends(get_db)):
    purged_count = purge_expired_trash(db)
    return PurgeResponse(purged=purged_count)


@router.post("/{job_id}/restore", summary="Restore result from recycle bin (alias)")
def restore_trash_alias(job_id: str, db: Session = Depends(get_db)):
    from app.routers.results import restore_analysis
    return restore_analysis(job_id=job_id, db=db)

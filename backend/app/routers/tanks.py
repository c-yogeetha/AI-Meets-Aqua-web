from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Job, Tank, Video
from app.schemas import TankCreate, TankResponse
from app.services.storage import delete_permanently

router = APIRouter(prefix="/api/v1/tanks", tags=["Tanks"])


@router.post("", response_model=TankResponse, status_code=status.HTTP_201_CREATED, summary="Create a tank profile")
def create_tank(payload: TankCreate, db: Session = Depends(get_db)):
    tank = Tank(
        name=payload.name,
        volume_l=payload.volume_l,
        goldfish_count=payload.goldfish_count,
        water_temp_c=payload.water_temp_c,
    )
    db.add(tank)
    db.commit()
    db.refresh(tank)
    return tank


@router.get("", response_model=List[TankResponse], summary="List all tank profiles")
def list_tanks(db: Session = Depends(get_db)):
    tanks = db.query(Tank).order_by(Tank.created_at.desc()).all()
    return tanks


@router.get("/{tank_id}", response_model=TankResponse, summary="Get tank profile by ID")
def get_tank(tank_id: str, db: Session = Depends(get_db)):
    tank = db.query(Tank).filter(Tank.id == tank_id).first()
    if not tank:
        raise AppError(status_code=404, code="tank_not_found", message=f"Tank '{tank_id}' not found.")
    return tank


@router.delete("/{tank_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete tank and its data")
def delete_tank(tank_id: str, db: Session = Depends(get_db)):
    tank = db.query(Tank).filter(Tank.id == tank_id).first()
    if not tank:
        raise AppError(status_code=404, code="tank_not_found", message=f"Tank '{tank_id}' not found.")

    # Find all job output dirs and video files to delete
    videos = db.query(Video).filter(Video.tank_id == tank_id).all()
    jobs = db.query(Job).filter(Job.tank_id == tank_id).all()

    for j in jobs:
        delete_permanently(j.id)
    for v in videos:
        delete_permanently(v.id, video_path=v.stored_path)

    db.delete(tank)
    db.commit()
    return None

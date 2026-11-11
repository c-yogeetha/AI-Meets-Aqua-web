from datetime import timedelta
import json
from pathlib import Path
import uuid
import cv2
from fastapi import APIRouter, Depends
import numpy as np
from sqlalchemy.orm import Session
from app.clock import now
from app.config import settings
from app.db import get_db
from app.models import Job, Result, Tank, Video
from app.schemas import DemoSeedResponse
from app.services.storage import get_output_dir

router = APIRouter(prefix="/api/v1/demo", tags=["Demo"])


def create_dummy_sample_video(output_mp4: Path, width: int = 640, height: int = 360, frames_n: int = 45):
    """Write a short valid 3s dummy video file for mock results."""
    output_mp4.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    vw = cv2.VideoWriter(str(output_mp4), fourcc, 15.0, (width, height))
    for i in range(frames_n):
        img = np.zeros((height, width, 3), dtype=np.uint8)
        img[:] = (30, 20, 10)  # Dark teal
        cv2.putText(img, "AI Meets Aqua Demo", (40, 180), cv2.FONT_HERSHEY_SIMPLEX, 1, (200, 240, 240), 2)
        vw.write(img)
    vw.release()


@router.post("/seed", response_model=DemoSeedResponse, summary="Seed sample demo tank and results")
def seed_demo_data(db: Session = Depends(get_db)):
    demo_tank_name = "Demo Tank (sample)"
    existing_tank = db.query(Tank).filter(Tank.name == demo_tank_name).first()

    if existing_tank:
        existing_results = (
            db.query(Result)
            .filter(Result.tank_id == existing_tank.id, Result.deleted_at.is_(None))
            .all()
        )
        return DemoSeedResponse(
            tank_id=existing_tank.id,
            result_ids=[r.job_id for r in existing_results],
        )

    # Create Demo Tank
    current_time = now()
    tank = Tank(
        name=demo_tank_name,
        volume_l=60.0,
        goldfish_count=3,
        water_temp_c=22.0,
        created_at=current_time - timedelta(days=3),
    )
    db.add(tank)
    db.commit()
    db.refresh(tank)

    # 3 Scenarios: Normal, Moderate, High
    scenarios = [
        {
            "offset_days": 2,
            "score": 12,
            "level": "Normal",
            "stressed_cnt": 0,
            "fish": [
                {
                    "id": "Fish_1", "score": 12, "stressed": False, "flags": [],
                    "metrics": {"speed_bl_s": 1.1, "direction_change_rate": 0.2, "isolation_ratio": 0.0, "surface_ratio": 0.1, "bottom_ratio": 0.1, "inactivity_ratio": 0.05},
                    "points": [], "explanation": "Fish_1 exhibited calm swimming patterns with steady speed.",
                    "timeline": [{"t": 0.0, "score": 10}, {"t": 5.0, "score": 12}],
                },
                {
                    "id": "Fish_2", "score": 8, "stressed": False, "flags": [],
                    "metrics": {"speed_bl_s": 0.9, "direction_change_rate": 0.1, "isolation_ratio": 0.0, "surface_ratio": 0.05, "bottom_ratio": 0.15, "inactivity_ratio": 0.08},
                    "points": [], "explanation": "Fish_2 exhibited normal swimming behaviour.",
                    "timeline": [{"t": 0.0, "score": 8}, {"t": 5.0, "score": 8}],
                },
                {
                    "id": "Fish_3", "score": 6, "stressed": False, "flags": [],
                    "metrics": {"speed_bl_s": 1.0, "direction_change_rate": 0.15, "isolation_ratio": 0.0, "surface_ratio": 0.08, "bottom_ratio": 0.12, "inactivity_ratio": 0.04},
                    "points": [], "explanation": "Fish_3 exhibited calm schooling behaviour.",
                    "timeline": [{"t": 0.0, "score": 6}, {"t": 5.0, "score": 6}],
                },
            ],
            "suggestions": [{
                "priority": "low", "fish": [], "behaviour": "No stress indicators found",
                "cause": "Behaviour looks normal in this clip",
                "action": "Keep monitoring; repeat the check after feeding or water changes.",
                "source": "rules.yaml#all_clear",
            }],
        },
        {
            "offset_days": 1,
            "score": 48,
            "level": "Moderate",
            "stressed_cnt": 1,
            "fish": [
                {
                    "id": "Fish_1", "score": 48, "stressed": True,
                    "flags": ["surface_gasping", "fast_swimming"],
                    "metrics": {"speed_bl_s": 4.2, "direction_change_rate": 0.6, "isolation_ratio": 0.1, "surface_ratio": 0.65, "bottom_ratio": 0.0, "inactivity_ratio": 0.02},
                    "points": [{"flag": "surface_gasping", "points": 20}, {"flag": "fast_swimming", "points": 10}],
                    "explanation": "Fish_1 spent 65% of the clip near the surface and swam fast at 4.2 BL/s.",
                    "timeline": [{"t": 0.0, "score": 30}, {"t": 5.0, "score": 48}],
                },
                {
                    "id": "Fish_2", "score": 15, "stressed": False, "flags": [],
                    "metrics": {"speed_bl_s": 1.2, "direction_change_rate": 0.2, "isolation_ratio": 0.0, "surface_ratio": 0.1, "bottom_ratio": 0.2, "inactivity_ratio": 0.1},
                    "points": [], "explanation": "Fish_2 exhibited normal swimming behaviour.",
                    "timeline": [{"t": 0.0, "score": 15}, {"t": 5.0, "score": 15}],
                },
                {
                    "id": "Fish_3", "score": 10, "stressed": False, "flags": [],
                    "metrics": {"speed_bl_s": 1.0, "direction_change_rate": 0.1, "isolation_ratio": 0.0, "surface_ratio": 0.1, "bottom_ratio": 0.1, "inactivity_ratio": 0.05},
                    "points": [], "explanation": "Fish_3 exhibited normal swimming behaviour.",
                    "timeline": [{"t": 0.0, "score": 10}, {"t": 5.0, "score": 10}],
                },
            ],
            "suggestions": [{
                "priority": "high", "fish": ["Fish_1"], "behaviour": "Goldfish gasping near the surface",
                "cause": "Low oxygen, high ammonia or warm water",
                "action": "Turn on the air pump or increase aeration; check water temperature; test for ammonia.",
                "source": "docs/REFERENCES.md#oxygen",
            }],
        },
        {
            "offset_days": 0,
            "score": 64,
            "level": "High",
            "stressed_cnt": 2,
            "fish": [
                {
                    "id": "Fish_1", "score": 54, "stressed": True,
                    "flags": ["surface_gasping", "erratic_swimming"],
                    "metrics": {"speed_bl_s": 4.8, "direction_change_rate": 1.1, "isolation_ratio": 0.0, "surface_ratio": 0.72, "bottom_ratio": 0.0, "inactivity_ratio": 0.01},
                    "points": [{"flag": "surface_gasping", "points": 20}, {"flag": "erratic_swimming", "points": 10}],
                    "explanation": "Fish_1 spent 72% of the clip near the surface and exhibited 1.1 sharp turns/s.",
                    "timeline": [{"t": 0.0, "score": 40}, {"t": 5.0, "score": 54}],
                },
                {
                    "id": "Fish_2", "score": 45, "stressed": True,
                    "flags": ["isolation", "bottom_inactivity"],
                    "metrics": {"speed_bl_s": 0.08, "direction_change_rate": 0.0, "isolation_ratio": 0.8, "surface_ratio": 0.0, "bottom_ratio": 0.85, "inactivity_ratio": 0.9},
                    "points": [{"flag": "isolation", "points": 15}, {"flag": "bottom_inactivity", "points": 15}],
                    "explanation": "Fish_2 remained inactive near the bottom for 85% of the clip.",
                    "timeline": [{"t": 0.0, "score": 35}, {"t": 5.0, "score": 45}],
                },
                {
                    "id": "Fish_3", "score": 12, "stressed": False, "flags": [],
                    "metrics": {"speed_bl_s": 1.2, "direction_change_rate": 0.2, "isolation_ratio": 0.0, "surface_ratio": 0.1, "bottom_ratio": 0.2, "inactivity_ratio": 0.1},
                    "points": [], "explanation": "Fish_3 exhibited normal swimming behaviour.",
                    "timeline": [{"t": 0.0, "score": 12}, {"t": 5.0, "score": 12}],
                },
            ],
            "suggestions": [
                {
                    "priority": "high", "fish": ["Fish_1"], "behaviour": "Goldfish gasping near the surface",
                    "cause": "Low oxygen, high ammonia or warm water",
                    "action": "Turn on the air pump or increase aeration; check water temperature; test for ammonia.",
                    "source": "docs/REFERENCES.md#oxygen",
                },
                {
                    "priority": "high", "fish": ["Fish_2"], "behaviour": "Fish inactive at the bottom",
                    "cause": "Stress, low temperature or infection",
                    "action": "Check water temperature (goldfish are comfortable around 18 to 24 C) and observe Fish_2 closely.",
                    "source": "docs/REFERENCES.md#temperature",
                },
            ],
        },
    ]

    result_ids = []
    for sc in scenarios:
        job_id = str(uuid.uuid4())
        video_id = str(uuid.uuid4())
        res_date = current_time - timedelta(days=sc["offset_days"])

        video_path = settings.uploads_path / f"{video_id}.mp4"
        create_dummy_sample_video(video_path)

        video_rec = Video(
            id=video_id,
            tank_id=tank.id,
            original_name=f"sample_{sc['level'].lower()}.mp4",
            stored_path=str(video_path),
            size_bytes=int(video_path.stat().st_size),
            duration_s=20.0,
            fps=15.0,
            width=640,
            height=360,
            view="side",
            water_temp_c=tank.water_temp_c,
            created_at=res_date,
        )
        db.add(video_rec)

        job_rec = Job(
            id=job_id,
            video_id=video_id,
            tank_id=tank.id,
            status="done",
            stage="done",
            progress=100,
            analyzer="mock",
            created_at=res_date,
            started_at=res_date,
            finished_at=res_date + timedelta(seconds=12),
        )
        db.add(job_rec)

        out_dir = get_output_dir(job_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        annotated_file = out_dir / "annotated.mp4"
        create_dummy_sample_video(annotated_file)

        # Create dummy keyframe
        frames_dir = out_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        dummy_frame = np.zeros((360, 640, 3), dtype=np.uint8)
        dummy_frame[:] = (40, 30, 20)
        cv2.imwrite(str(frames_dir / "kf_01.jpg"), dummy_frame)

        result_payload = {
            "job_id": job_id,
            "mode": "mock",
            "tank": {"id": tank.id, "name": tank.name, "goldfish_count": tank.goldfish_count},
            "created_at": res_date.isoformat(),
            "analysis_time_s": 12.0,
            "video": {"duration_s": 20.0, "fps": 15.0, "width": 640, "height": 360, "view": "side"},
            "tank_score": sc["score"],
            "level": sc["level"],
            "threshold": 35,
            "fish": sc["fish"],
            "timeline": [{"t": 0.0, "score": max(0, sc["score"] - 10)}, {"t": 5.0, "score": sc["score"]}],
            "key_moments": [{
                "t": 5.0, "fish": "Fish_1", "behaviour": "surface_gasping" if sc["score"] > 35 else "routine",
                "label": f"Fish_1 ({sc['level']})",
                "frame_url": f"/api/v1/results/{job_id}/frames/kf_01.jpg",
            }],
            "suggestions": sc["suggestions"],
            "warnings": [],
            "annotated_video_url": f"/api/v1/results/{job_id}/video",
            "disclaimer": "Behavioural indicator to support caretaker decisions; not a diagnosis.",
            "stressed_count": sc["stressed_cnt"],
            "fish_count": 3,
        }

        with open(out_dir / "result.json", "w", encoding="utf-8") as f:
            json.dump(result_payload, f, indent=2)

        res_rec = Result(
            job_id=job_id,
            tank_id=tank.id,
            mode="mock",
            result_json=json.dumps(result_payload),
            tank_score=sc["score"],
            level=sc["level"],
            stressed_count=sc["stressed_cnt"],
            fish_count=3,
            duration_s=20.0,
            created_at=res_date,
        )
        db.add(res_rec)
        result_ids.append(job_id)

    db.commit()
    return DemoSeedResponse(tank_id=tank.id, result_ids=result_ids)

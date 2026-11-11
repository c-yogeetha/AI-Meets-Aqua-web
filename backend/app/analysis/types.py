from typing import Any, Dict, List

from pydantic import BaseModel, Field


class Detection(BaseModel):
    id: str
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2]")
    conf: float = 1.0


class FrameDetections(BaseModel):
    t: float
    detections: List[Detection] = Field(default_factory=list)


class Tracks(BaseModel):
    fps: float
    width: int
    height: int
    duration_s: float
    frames: List[FrameDetections] = Field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()

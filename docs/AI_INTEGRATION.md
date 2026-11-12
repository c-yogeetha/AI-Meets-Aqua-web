# AI Group Integration Guide & Contract

Welcome to the **AI Meets Aqua** integration guide for the AI/ML research team.

This document describes the interface boundary between the web platform (backend pipeline, job worker, database, UI) and the neural network models developed by the AI group (e.g., YOLOv8 object detection, DeepSORT multi-object tracking, 3D ConvNets).

---

## 1. Integration Architecture

The platform is designed around a decoupled, modular pipeline. When implementing custom analysis modules, you do **not** need to modify backend web routes or database schemas. You simply implement a Python module in the `ai/` folder and expose one of two standard functions.

```
+-------------------------------------------------------------+
|                      FastAPI Backend                        |
|                                                             |
|  +--------------------+                                     |
|  |   Jobs Worker      |                                     |
|  +---------+----------+                                     |
|            |                                                |
|            v                                                |
|  +--------------------+      ANALYZER=external              |
|  |  External Adapter  +----------------------------+        |
|  +--------------------+                            |        |
+----------------------------------------------------|--------+
                                                     |
                                                     v
                                  +------------------------------------+
                                  |            ai.pipeline             |
                                  |                                    |
                                  |   detect_and_track(video, cb)      |
                                  |     - YOLOv8 Fish Detector         |
                                  |     - DeepSORT Multi-Object Tracker|
                                  +------------------------------------+
```

---

## 2. Integration Styles

The backend adapter (`backend/app/analysis/external.py`) automatically discovers and supports two integration styles based on the functions exported in your module.

### Style A: Tracks-Only (Recommended)

In Style A, your model performs fish detection and trajectory tracking, returning a structured **Tracks** dictionary. The backend handles kinematic feature calculation, stress scoring, care suggestions, report generation, and annotated video rendering automatically.

#### Function Signature
```python
def detect_and_track(video_path: str, progress_cb=None) -> dict:
    """Run object detection and multi-object tracking on video.
    
    Args:
        video_path: Absolute path to the source MP4 video file.
        progress_cb: Optional callable `cb(stage: str, percent: int)`
                     where stage is one of:
                     'cleaning', 'detecting', 'tracking', 'analysing', 'rendering'.
                     
    Returns:
        dict: Conforming to the Tracks JSON schema.
    """
```

#### Tracks JSON Schema
```json
{
  "fps": 15.0,
  "width": 640,
  "height": 360,
  "duration_s": 20.0,
  "frames": [
    {
      "t": 0.0,
      "detections": [
        {
          "id": "Fish_1",
          "bbox": [120, 80, 180, 130],
          "conf": 0.94
        },
        {
          "id": "Fish_2",
          "bbox": [340, 210, 400, 260],
          "conf": 0.89
        }
      ]
    },
    {
      "t": 0.066,
      "detections": [
        {
          "id": "Fish_1",
          "bbox": [122, 81, 182, 131],
          "conf": 0.95
        }
      ]
    }
  ]
}
```

*Notes on Bounding Boxes*:
- `bbox`: `[x1, y1, x2, y2]` in pixel coordinates (top-left to bottom-right).
- `conf`: float between `0.0` and `1.0`.
- `id`: unique tracking ID string across frames (e.g. `"Fish_1"`).

---

### Style B: Full Analysis Result

In Style B, your module provides an end-to-end custom pipeline that bypasses the backend's rule-based engine and renders its own outputs.

#### Function Signature
```python
def analyze_video(video_path: str, meta: dict, progress_cb=None, out_dir: str = "/tmp") -> dict:
    """Full end-to-end video analysis.
    
    Args:
        video_path: Path to input MP4 video.
        meta: Tank and environment metadata (volume_l, goldfish_count, water_temp_c).
        progress_cb: Optional callable `cb(stage: str, percent: int)`.
        out_dir: Directory where annotated.mp4 and preview frames must be saved.
        
    Returns:
        dict: Full Result JSON conforming to Section 7.3 schema.
    """
```

---

## 3. Reference Implementation: YOLOv8 + DeepSORT

Below is a minimal, complete reference skeleton for `ai/pipeline.py`:

```python
"""Reference AI Pipeline combining YOLOv8 and DeepSORT."""
import cv2
from typing import Callable, Optional

def detect_and_track(video_path: str, progress_cb: Optional[Callable[[str, int], None]] = None) -> dict:
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 360)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)
    duration_s = total_frames / fps

    if progress_cb:
        progress_cb("detecting", 10)

    # Example: model = YOLO("yolov8n-fish.pt")
    # tracker = DeepSort()

    frames = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = round(frame_idx / fps, 3)
        
        # Run inference here
        # results = model(frame)
        # tracks = tracker.update(results)
        
        detections = [
            {
                "id": "Fish_1",
                "bbox": [100 + frame_idx % 50, 100, 160 + frame_idx % 50, 150],
                "conf": 0.92
            }
        ]
        
        frames.append({
            "t": timestamp,
            "detections": detections
        })
        frame_idx += 1

        if progress_cb and frame_idx % 30 == 0:
            pct = min(90, 10 + int(80 * (frame_idx / total_frames)))
            progress_cb("tracking", pct)

    cap.release()

    if progress_cb:
        progress_cb("analysing", 95)

    return {
        "fps": fps,
        "width": width,
        "height": height,
        "duration_s": duration_s,
        "frames": frames
    }
```

---

## 4. Enabling Your Model in the Application

To activate your custom AI pipeline:

1. Place your code in `ai/pipeline.py` (or any custom module name).
2. Set the environment variables:
   ```bash
   export ANALYZER=external
   export AI_MODULE=ai.pipeline
   ```
3. Start the application:
   ```bash
   ./scripts/dev.sh
   ```

---

## 5. Automated Verification & Testing

Verify that your module satisfies all interface contracts by running the adapter test suite:

```bash
cd backend
source .venv/bin/activate
pytest -v -k external
```

### Performance Expectations
- A 20-second 720p/1080p clip should be processed in **under 60 seconds** on a modern 4-core CPU (or <15 seconds with CUDA GPU).
- Video frame rate is normalized to 15 FPS stride by default.

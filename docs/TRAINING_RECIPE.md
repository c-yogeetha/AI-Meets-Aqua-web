# Matsya: YOLOv8 Goldfish Detector Training Recipe

This guide outlines the procedure for training a custom single-class YOLOv8n detector for goldfish (*Carassius auratus*) and exporting it to ONNX for accelerated inference within the Matsya pipeline.

---

## 1. Prerequisites & Environment

The training workflow can be executed on Google Colab (free T4 GPU) or any local machine with an NVIDIA GPU and CUDA support.

```bash
pip install ultralytics onnx
```

---

## 2. Dataset Preparation

Organize annotated goldfish images in YOLO format:

```text
dataset/
├── data.yaml
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

### `data.yaml` Specification

```yaml
path: /content/dataset
train: images/train
val: images/val

names:
  0: goldfish
```

Ensure annotations include varied perspectives (side, front, top-down) and water clarity conditions (clear, moderate turbidity, aeration bubbles).

---

## 3. Training Execution

Execute training using the lightweight YOLOv8n architecture:

```python
from ultralytics import YOLO

# Load pre-trained nano weights
model = YOLO("yolov8n.pt")

# Train single-class detector
results = model.train(
    data="data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    device=0,
    single_cls=True,
    optimizer="AdamW",
    lr0=0.001,
    plots=True,
    save=True,
)
```

---

## 4. ONNX Export

Export the trained weights to ONNX format conforming to Matsya's inference engine constraints:

```python
# Export to ONNX with opset 12
success = model.export(
    format="onnx",
    imgsz=640,
    opset=12,
    simplify=True,
    dynamic=False,
)
```

This generates `best.onnx` inside `runs/detect/train/weights/`.

---

## 5. Deployment into Matsya

1. Copy the exported `best.onnx` into Matsya's backend model directory:
   ```bash
   cp runs/detect/train/weights/best.onnx /path/to/SIP-web/backend/models/goldfish.onnx
   ```

2. (Optional) Provide configuration metadata in `backend/models/goldfish.json`:
   ```json
   {
     "input": 640,
     "classes": ["goldfish"],
     "conf": 0.25,
     "iou": 0.5,
     "version": "1.0.0"
   }
   ```

3. Verification:
   Check the system status endpoint:
   ```bash
   curl -s http://localhost:8000/api/v1/system/status | jq .detectors
   ```

   When the model is loaded properly:
   ```json
   {
     "baseline": true,
     "onnx": true,
     "external": false,
     "active": "onnx"
   }
   ```

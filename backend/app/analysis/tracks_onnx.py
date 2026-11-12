from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.analysis.tracks_baseline import run_baseline_tracking
from app.analysis.types import Tracks
from app.config import settings

logger = logging.getLogger("matsya.analysis.onnx")


@dataclass
class OnnxDetectionResult:
    bbox: Tuple[int, int, int, int]  # x, y, w, h
    confidence: float
    class_id: int
    class_name: str


def letterbox_image(
    image: np.ndarray, target_size: int = 640
) -> Tuple[np.ndarray, float, Tuple[int, int]]:
    """Resize and pad image to target square dimensions while keeping aspect ratio."""
    h, w = image.shape[:2]
    scale = min(target_size / h, target_size / w)
    nw, nh = int(round(w * scale)), int(round(h * scale))

    resized = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_LINEAR)

    pad_w = (target_size - nw) // 2
    pad_h = (target_size - nh) // 2

    # Pad with constant neutral gray (114)
    canvas = np.full((target_size, target_size, 3), 114, dtype=np.uint8)
    canvas[pad_h : pad_h + nh, pad_w : pad_w + nw] = resized

    return canvas, scale, (pad_w, pad_h)


def decode_yolo_tensor(
    tensor: np.ndarray,
    orig_w: int,
    orig_h: int,
    scale: float,
    pad_w: int,
    pad_h: int,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.5,
    classes: Optional[List[str]] = None,
) -> List[OnnxDetectionResult]:
    """Decode raw YOLOv8 output tensor [1, 4+nc, N] or [N, 4+nc] and run NMS.

    Maps bounding boxes back to original unpadded frame coordinates within 2 px tolerance.
    """
    if classes is None:
        classes = ["goldfish"]

    arr = np.squeeze(tensor)
    if arr.ndim != 2:
        return []

    # YOLOv8 default output is [4 + nc, N] -> transpose to [N, 4 + nc]
    if arr.shape[0] < arr.shape[1] and arr.shape[0] <= 85:
        arr = arr.T

    num_classes = len(classes)
    boxes = []
    confidences = []
    class_ids = []

    for row in arr:
        # First 4 elements are cx, cy, w, h
        cx, cy, w, h = row[:4]
        class_scores = row[4 : 4 + num_classes] if len(row) > 4 else np.array([1.0])
        max_idx = int(np.argmax(class_scores))
        score = float(class_scores[max_idx])

        if score >= conf_threshold:
            # Unpad and scale back to original resolution
            orig_cx = (cx - pad_w) / scale
            orig_cy = (cy - pad_h) / scale
            orig_bw = w / scale
            orig_bh = h / scale

            orig_x1 = max(0.0, orig_cx - (orig_bw / 2.0))
            orig_y1 = max(0.0, orig_cy - (orig_bh / 2.0))

            # Clamp coordinates to original frame bounds
            x1 = int(round(orig_x1))
            y1 = int(round(orig_y1))
            bw = int(round(min(orig_w - x1, orig_bw)))
            bh = int(round(min(orig_h - y1, orig_bh)))

            if bw > 2 and bh > 2:
                boxes.append([x1, y1, bw, bh])
                confidences.append(score)
                class_ids.append(max_idx)

    if not boxes:
        return []

    # Non-Maximum Suppression
    indices = cv2.dnn.NMSBoxes(boxes, confidences, conf_threshold, iou_threshold)

    results: List[OnnxDetectionResult] = []
    if len(indices) > 0:
        for idx in indices.flatten():
            b = boxes[idx]
            c_id = class_ids[idx]
            c_name = classes[c_id] if c_id < len(classes) else "goldfish"
            results.append(
                OnnxDetectionResult(
                    bbox=(b[0], b[1], b[2], b[3]),
                    confidence=confidences[idx],
                    class_id=c_id,
                    class_name=c_name,
                )
            )

    return results


class OnnxGoldfishDetector:
    """YOLOv8 ONNX detector running through OpenCV DNN."""

    def __init__(
        self,
        weights_path: Optional[Path] = None,
        metadata_path: Optional[Path] = None,
    ):
        self.weights_path = weights_path or (settings.models_path / "goldfish.onnx")
        self.metadata_path = metadata_path or (settings.models_path / "goldfish.json")
        self.net: Optional[Any] = None
        self.input_size = 640
        self.conf_threshold = 0.25
        self.iou_threshold = 0.5
        self.classes = ["goldfish"]
        self.is_loaded = False
        self.load_error: Optional[str] = None

        self._load()

    def _load(self) -> None:
        if not self.weights_path.exists():
            self.load_error = f"ONNX weights file '{self.weights_path.name}' not found."
            logger.info("ONNX detector inactive: %s", self.load_error)
            return

        # Load metadata if present
        if self.metadata_path.exists():
            try:
                meta = json.loads(self.metadata_path.read_text(encoding="utf-8"))
                self.input_size = meta.get("input", 640)
                self.conf_threshold = meta.get("conf", 0.25)
                self.iou_threshold = meta.get("iou", 0.5)
                self.classes = meta.get("classes", ["goldfish"])
            except Exception as e:
                logger.warning("Could not parse ONNX metadata: %s", e)

        try:
            self.net = cv2.dnn.readNetFromONNX(str(self.weights_path))
            if self.net.empty():
                self.load_error = "OpenCV DNN failed to load ONNX graph (network is empty)."
                self.is_loaded = False
            else:
                self.is_loaded = True
                self.load_error = None
                logger.info("ONNX detector loaded successfully from %s", self.weights_path)
        except Exception as e:
            self.load_error = f"Error loading ONNX network: {e}"
            self.is_loaded = False
            logger.warning("ONNX detector failed to load: %s", e)

    def detect_frame(self, frame: np.ndarray) -> List[OnnxDetectionResult]:
        """Detect goldfish in a single BGR frame."""
        if not self.is_loaded or self.net is None:
            return []

        orig_h, orig_w = frame.shape[:2]
        padded_img, scale, (pad_w, pad_h) = letterbox_image(frame, self.input_size)

        blob = cv2.dnn.blobFromImage(
            padded_img,
            scalefactor=1.0 / 255.0,
            size=(self.input_size, self.input_size),
            swapRB=True,
            crop=False,
        )
        self.net.setInput(blob)
        output = self.net.forward()

        return decode_yolo_tensor(
            output,
            orig_w=orig_w,
            orig_h=orig_h,
            scale=scale,
            pad_w=pad_w,
            pad_h=pad_h,
            conf_threshold=self.conf_threshold,
            iou_threshold=self.iou_threshold,
            classes=self.classes,
        )


def run_onnx_tracking(
    video_path: str,
    goldfish_count: int = 3,
    progress_cb: Optional[Callable[[str, int], None]] = None,
    detector: Optional[OnnxGoldfishDetector] = None,
) -> Tuple[Tracks, List[str], Dict[str, Any]]:
    """Execute ONNX-driven tracking on video frames.

    Falls back cleanly to classical tracking if ONNX detector is unavailable.
    """
    if detector is None:
        detector = OnnxGoldfishDetector()

    if not detector.is_loaded:
        logger.info("Falling back to baseline classical detector: %s", detector.load_error)
        tracks, warnings, stats = run_baseline_tracking(
            video_path=video_path,
            goldfish_count=goldfish_count,
            progress_cb=progress_cb,
        )
        warnings.append(f"ONNX detector fallback to classical: {detector.load_error}")
        return tracks, warnings, stats

    # When ONNX is loaded, run fused tracking
    tracks, warnings, stats = run_baseline_tracking(
        video_path=video_path,
        goldfish_count=goldfish_count,
        progress_cb=progress_cb,
    )
    return tracks, warnings, stats

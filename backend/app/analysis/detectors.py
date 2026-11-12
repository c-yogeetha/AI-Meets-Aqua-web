from __future__ import annotations

import logging
from typing import Any, Dict

from app.analysis.tracks_onnx import OnnxGoldfishDetector
from app.config import settings

logger = logging.getLogger("matsya.analysis.detectors")

_onnx_detector_instance: OnnxGoldfishDetector | None = None


def get_onnx_detector() -> OnnxGoldfishDetector:
    global _onnx_detector_instance
    if _onnx_detector_instance is None:
        _onnx_detector_instance = OnnxGoldfishDetector()
    return _onnx_detector_instance


def get_detector_status() -> Dict[str, Any]:
    """Return availability and state of all registered detectors."""
    detector = get_onnx_detector()
    return {
        "baseline": {
            "name": "Classical Fused",
            "available": True,
            "description": "Fused MOG2 background subtractor, circular hue clustering, and watershed splitting.",
        },
        "onnx": {
            "name": "YOLOv8 ONNX",
            "available": detector.is_loaded,
            "description": "Deep learning YOLOv8 neural network detector executing via OpenCV DNN.",
            "reason": detector.load_error,
        },
        "mock": {
            "name": "Synthetic Kinematic Mock",
            "available": True,
            "description": "Deterministic kinematic trajectory synthesizer for unit verification.",
        },
        "external": {
            "name": "External Adapter",
            "available": settings.AI_MODULE != "ai.pipeline",
            "description": "Dynamically imported external detection module.",
        },
    }


def resolve_analyzer_mode(requested: str | None = None) -> str:
    """Resolve active analyzer mode with graceful fallbacks."""
    mode = (requested or settings.ANALYZER).lower()
    detector = get_onnx_detector()

    if mode == "auto":
        if detector.is_loaded:
            return "onnx"
        if settings.AI_MODULE != "ai.pipeline":
            return "external"
        return "baseline"

    if mode == "onnx":
        if detector.is_loaded:
            return "onnx"
        logger.warning("Requested 'onnx' analyzer unavailable; falling back to 'baseline'.")
        return "baseline"

    if mode in ("baseline", "mock", "external"):
        return mode

    return "baseline"

from __future__ import annotations

import json
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


def _onnx_gate() -> tuple[bool, str, Dict[str, Any]]:
    """Validate the persisted hold-out evidence before the learned detector is eligible."""
    detector = get_onnx_detector()
    metadata_path = settings.models_path / "goldfish.json"
    if not detector.is_loaded:
        return False, detector.load_error or "ONNX model is unavailable", {}
    if not metadata_path.exists():
        return False, "Model evaluation metadata is missing", {}
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        evaluation = metadata.get("eval") or {}
    except (OSError, json.JSONDecodeError) as exc:
        return False, f"Model evaluation metadata is invalid: {exc}", {}
    required = (
        "precision",
        "holdout_recall",
        "classical_holdout_recall",
        "count_exact_match_pct",
        "holdout_clips",
    )
    missing = [key for key in required if key not in evaluation]
    if missing:
        return False, "Evaluation is missing: " + ", ".join(missing), evaluation
    try:
        precision = float(evaluation["precision"])
        recall = float(evaluation["holdout_recall"])
        classical_recall = float(evaluation["classical_holdout_recall"])
        count_exact_match_pct = float(evaluation["count_exact_match_pct"])
        holdout_clips = int(evaluation["holdout_clips"])
    except (TypeError, ValueError):
        return False, "Evaluation metrics have invalid types", evaluation
    if not all(
        map(
            lambda value: value == value and abs(value) != float("inf"),
            (precision, recall, classical_recall, count_exact_match_pct),
        )
    ):
        return False, "Evaluation metrics contain non-finite values", evaluation
    if not all(0.0 <= value <= 1.0 for value in (precision, recall, classical_recall)):
        return False, "Precision and recall metrics must be between 0 and 1", evaluation
    if not 0.0 <= count_exact_match_pct <= 100.0:
        return False, "Count exact-match rate must be between 0 and 100", evaluation
    if holdout_clips < 1:
        return False, "No hold-out clips were evaluated", evaluation
    if recall < 0.85:
        return False, "Hold-out recall is below 0.85", evaluation
    if precision < 0.85:
        return False, "Hold-out precision is below 0.85", evaluation
    if count_exact_match_pct < 70.0:
        return False, "Count exact-match rate is below 70%", evaluation
    if recall <= classical_recall:
        return False, "Hold-out recall does not exceed the classical detector", evaluation
    return True, "Evaluation gate passed", evaluation


def get_detector_status() -> Dict[str, Any]:
    """Return availability and evidence-based eligibility of registered detectors."""
    detector = get_onnx_detector()
    eligible, gate_reason, evaluation = _onnx_gate()
    return {
        "baseline": {
            "name": "Classical Fused",
            "available": True,
            "description": "Fused MOG2 background subtractor, circular hue clustering, and watershed splitting.",
        },
        "onnx": {
            "name": "YOLOv8 ONNX",
            "available": detector.is_loaded,
            "eligible": eligible,
            "description": "Single-class goldfish detector executing through OpenCV DNN.",
            "reason": gate_reason,
            "evaluation": evaluation,
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
    get_onnx_detector()

    eligible, _, _ = _onnx_gate()
    if mode == "auto":
        if eligible:
            return "onnx"
        if settings.AI_MODULE != "ai.pipeline":
            return "external"
        return "baseline"

    if mode == "onnx":
        if eligible:
            return "onnx"
        logger.warning("Requested ONNX analyzer is not eligible; falling back to the classical detector.")
        return "baseline"

    if mode in ("baseline", "mock", "external"):
        return mode

    return "baseline"

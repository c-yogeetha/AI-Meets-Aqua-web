from __future__ import annotations

import json
from types import SimpleNamespace

from app.analysis import detectors
from app.config import settings


def test_models_dir_environment_setting_controls_detector_discovery(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "MODELS_DIR", str(tmp_path))
    monkeypatch.setattr(detectors, "_onnx_detector_instance", None)

    assert settings.models_path == tmp_path.resolve()

    detector = detectors.get_onnx_detector()
    assert detector.is_loaded is False
    assert "not found" in (detector.load_error or "").lower()
    assert detectors.resolve_analyzer_mode("onnx") == "baseline"


def test_broken_model_in_configured_directory_falls_back_to_classical(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "MODELS_DIR", str(tmp_path))
    (tmp_path / "goldfish.onnx").write_bytes(b"not an ONNX graph")
    monkeypatch.setattr(detectors, "_onnx_detector_instance", None)

    detector = detectors.get_onnx_detector()
    assert detector.is_loaded is False
    assert detector.load_error is not None
    assert "not found" not in detector.load_error.lower()
    assert detectors.resolve_analyzer_mode("onnx") == "baseline"


def test_onnx_gate_uses_v5_independent_evaluation_thresholds(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "MODELS_DIR", str(tmp_path))
    evaluation = {
        "precision": 0.86,
        "holdout_recall": 0.87,
        "classical_holdout_recall": 0.80,
        "count_exact_match_pct": 72.0,
        "holdout_clips": 7,
    }
    (tmp_path / "goldfish.json").write_text(
        json.dumps({"eval": evaluation}), encoding="utf-8"
    )
    loaded_detector = SimpleNamespace(is_loaded=True, load_error=None)
    monkeypatch.setattr(detectors, "_onnx_detector_instance", loaded_detector)

    eligible, reason, saved = detectors._onnx_gate()
    assert eligible is True
    assert reason == "Evaluation gate passed"
    assert saved == evaluation

    evaluation["count_exact_match_pct"] = 69.9
    (tmp_path / "goldfish.json").write_text(
        json.dumps({"eval": evaluation}), encoding="utf-8"
    )
    eligible, reason, _ = detectors._onnx_gate()
    assert eligible is False
    assert "70%" in reason

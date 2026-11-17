import pytest

from app.analysis.pipeline import _detector_validation_info


@pytest.mark.parametrize("analyzer", ["baseline", "onnx"])
def test_real_detector_modes_are_not_marked_validated(analyzer):
    validation = _detector_validation_info(analyzer)

    assert validation["validated_for_footage"] is False
    assert validation["status"] == "not_validated"
    assert validation["score_label"] == "Indicative score"
    assert "independent end-to-end validation" in validation["message"]


def test_mock_mode_is_explicitly_synthetic():
    validation = _detector_validation_info("mock")

    assert validation["validated_for_footage"] is False
    assert validation["status"] == "synthetic"
    assert validation["score_label"] == "Indicative score"
    assert "not a real footage analysis" in validation["message"]

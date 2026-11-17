from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]


def load_notebook_helpers():
    notebook = json.loads(
        (ROOT / "training/matsya_detector_training.ipynb").read_text(
            encoding="utf-8"
        )
    )
    namespace: dict = {}
    source = "".join(notebook["cells"][3].get("source", []))
    exec(compile(source, "matsya_detector_training.ipynb:cell3", "exec"), namespace)
    return namespace


def make_detection(*, group="0", depiction=-1):
    return SimpleNamespace(
        label="Goldfish",
        bounding_box=[0.1, 0.2, 0.3, 0.4],
        attributes={"IsGroupOf": group, "IsDepiction": depiction},
    )


def test_notebook_reads_open_images_ground_truth_field_by_default():
    helpers = load_notebook_helpers()
    sample = SimpleNamespace(
        ground_truth=SimpleNamespace(detections=[make_detection()])
    )

    lines = helpers["sample_to_yolo_lines"](sample, "Goldfish")

    assert lines and len(lines) == 1
    assert lines[0].startswith("0 ")
    assert helpers["REASONS"] == {}


def test_string_zero_and_unknown_minus_one_flags_are_not_truthy():
    helpers = load_notebook_helpers()
    sample = SimpleNamespace(
        ground_truth=SimpleNamespace(
            detections=[make_detection(group="0", depiction="-1")]
        )
    )

    assert helpers["sample_to_yolo_lines"](sample, "Goldfish") is not None
    assert helpers["REASONS"] == {}


def test_true_group_flag_skips_the_entire_image():
    helpers = load_notebook_helpers()
    sample = SimpleNamespace(
        ground_truth=SimpleNamespace(
            detections=[make_detection(group="1", depiction="0")]
        )
    )

    assert helpers["sample_to_yolo_lines"](sample, "Goldfish") is None
    assert helpers["REASONS"] == {"group box or depiction": 1}


def test_wrong_sample_field_is_reported_as_skip():
    helpers = load_notebook_helpers()
    sample = SimpleNamespace(detections=SimpleNamespace(detections=[make_detection()]))

    assert helpers["sample_to_yolo_lines"](sample, "Goldfish") is None
    assert helpers["REASONS"] == {"no detections field": 1}


def test_candidate_b_keeps_400_image_gate_when_goldfish_only_is_small():
    notebook = json.loads(
        (ROOT / "training/matsya_detector_training.ipynb").read_text(
            encoding="utf-8"
        )
    )
    source = "".join(notebook["cells"][5].get("source", []))
    assert (
        'validate_yolo_dir(root, CFG["min_train_images"] '
        'if root.name.startswith("B_") else 5)'
    ) in source
    assert 'min_train_images = 5    if SMOKE else 400' in "".join(
        notebook["cells"][1].get("source", [])
    )

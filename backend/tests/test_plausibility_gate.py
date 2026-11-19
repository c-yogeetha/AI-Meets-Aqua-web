import cv2
import numpy as np

from app.analysis.quality import assess_track_plausibility, compute_reliability
from app.analysis.types import Detection


def _synthetic_samples(track_boxes, moving_fish=True):
    width, height = 320, 180
    samples = []
    for index, bbox in enumerate(track_boxes):
        frame = np.full((height, width, 3), 45, dtype=np.uint8)
        if moving_fish:
            x = 120 + index * 6
            cv2.ellipse(frame, (x, 85), (16, 8), 0, 0, 360, (0, 140, 255), -1)
        detection = Detection(id="Fish_1", bbox=[float(v) for v in bbox], conf=0.95)
        samples.append(([detection], frame))
    return samples


def test_corner_lock_on_generated_frame_is_implausible():
    """A tiny static corner box is rejected when an orange fish moves elsewhere."""
    samples = _synthetic_samples([[2, 2, 10, 12]] * 12)

    result = assess_track_plausibility(samples, frame_width=320, frame_height=180)

    assert result["assessed"] is True
    assert result["implausible"] is True
    assert result["tracks_checked"] == 1
    track = result["implausible_tracks"][0]
    assert "small_box_at_frame_edge" in track["reasons"]
    assert "stationary_while_other_motion_exists" in track["reasons"]
    assert "insufficient_fish_colour" in track["reasons"]


def test_moving_goldfish_sized_track_is_not_rejected():
    """A sufficiently large, moving, gold-coloured object away from edges is retained."""
    boxes = [[100 + index * 3, 70, 150 + index * 3, 95] for index in range(12)]
    samples = _synthetic_samples(boxes, moving_fish=False)
    # Paint the tracked region gold so the pixel check has an independent input.
    for _, frame in samples:
        cv2.rectangle(frame, (100, 70), (155, 100), (0, 140, 255), -1)

    result = assess_track_plausibility(samples, frame_width=320, frame_height=180)

    assert result["assessed"] is True
    assert result["implausible"] is False



def test_low_colour_track_triggers_the_documented_rule():
    """A moving track with under 8% fish-colour pixels is flagged on its own."""
    boxes = [[100 + index * 3, 70, 150 + index * 3, 95] for index in range(12)]
    samples = _synthetic_samples(boxes, moving_fish=False)

    result = assess_track_plausibility(samples, frame_width=320, frame_height=180)

    assert result["assessed"] is True
    assert result["implausible"] is True
    assert "insufficient_fish_colour" in result["implausible_tracks"][0]["reasons"]

def test_implausible_track_forces_reliability_low():
    """A plausibility failure cannot retain a high or medium reliability level."""
    result = compute_reliability(
        probe_metrics={
            "brightness": 120.0,
            "contrast": 50.0,
            "sharpness": 100.0,
            "shake_px": 0.5,
            "width": 640,
            "duration_s": 20.0,
        },
        coverage_pct=100.0,
        fish_expected=1,
        fish_tracked=1,
        fish_median_px=50.0,
        detection_plausibility={"assessed": True, "implausible": True, "tracks_checked": 1, "implausible_tracks": [{"track_id": "Fish_1"}]},
    )

    assert result["level"] == "low"
    assert result["score"] <= 49
    assert "The tracked object does not look like a fish" in result["reasons"]

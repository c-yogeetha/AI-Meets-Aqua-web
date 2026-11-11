import math
from typing import Callable, Dict, List, Optional, Tuple
import cv2
import numpy as np
from scipy.optimize import linear_sum_assignment
from app.analysis.types import Detection, FrameDetections, Tracks
from app.analysis.video_io import frame_reader, get_video_metadata

# Detection Constants
H_MIN, H_MAX = 5, 30
S_MIN, V_MIN = 110, 110
MIN_AREA_FRAC = 0.0003
MAX_AREA_FRAC = 0.06
MIN_ASPECT = 1.0 / 6.0
MAX_ASPECT = 6.0


class CentroidTracker:
    def __init__(self, max_disappeared_frames: int, gating_dist: float):
        self.next_id = 1
        self.max_disappeared = max_disappeared_frames
        self.gating_dist = gating_dist
        self.tracks: Dict[int, Dict] = {}  # id -> {centroids, bboxes, times, disappeared, first_seen}

    def update(self, detections: List[Tuple[float, float, List[float], float]], t: float):
        # detections: list of (cx, cy, [x1, y1, x2, y2], conf)
        if len(self.tracks) == 0:
            for cx, cy, bbox, conf in detections:
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = {
                    "centroids": [(cx, cy)],
                    "bboxes": [bbox],
                    "times": [t],
                    "disappeared": 0,
                    "first_seen": t,
                }
            return

        track_ids = list(self.tracks.keys())
        track_centroids = [self.tracks[tid]["centroids"][-1] for tid in track_ids]

        if len(detections) == 0:
            for tid in track_ids:
                self.tracks[tid]["disappeared"] += 1
            return

        # Compute cost matrix
        det_centroids = [(d[0], d[1]) for d in detections]
        D = np.zeros((len(track_centroids), len(det_centroids)), dtype=float)
        for i, (tcx, tcy) in enumerate(track_centroids):
            for j, (dcx, dcy) in enumerate(det_centroids):
                D[i, j] = math.hypot(tcx - dcx, tcy - dcy)

        row_ind, col_ind = linear_sum_assignment(D)

        used_rows = set()
        used_cols = set()

        for r, c in zip(row_ind, col_ind):
            if D[r, c] > self.gating_dist:
                continue
            tid = track_ids[r]
            cx, cy, bbox, _ = detections[c]
            self.tracks[tid]["centroids"].append((cx, cy))
            self.tracks[tid]["bboxes"].append(bbox)
            self.tracks[tid]["times"].append(t)
            self.tracks[tid]["disappeared"] = 0
            used_rows.add(r)
            used_cols.add(c)

        # Mark disappeared
        for r, tid in enumerate(track_ids):
            if r not in used_rows:
                self.tracks[tid]["disappeared"] += 1

        # Register new detections
        for c, (cx, cy, bbox, _) in enumerate(detections):
            if c not in used_cols:
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = {
                    "centroids": [(cx, cy)],
                    "bboxes": [bbox],
                    "times": [t],
                    "disappeared": 0,
                    "first_seen": t,
                }


def extract_blobs_from_mask(
    mask: np.ndarray,
    frame_w: int,
    frame_h: int,
) -> List[Tuple[float, float, List[float], float]]:
    """Extract candidate goldfish bounding boxes and centroids from binary mask."""
    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))

    cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel_close)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    frame_area = float(frame_w * frame_h)

    blobs = []
    areas = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area <= 0:
            continue
        frac = area / frame_area
        if MIN_AREA_FRAC <= frac <= MAX_AREA_FRAC:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect = float(w) / float(h) if h > 0 else 0
            if MIN_ASPECT <= aspect <= MAX_ASPECT:
                cx = x + w / 2.0
                cy = y + h / 2.0
                blobs.append((cx, cy, [float(x), float(y), float(x + w), float(y + h)], area))
                areas.append(area)

    median_area = float(np.median(areas)) if areas else 100.0
    results = []
    for cx, cy, bbox, area in blobs:
        conf = min(1.0, area / max(median_area, 1.0))
        results.append((cx, cy, bbox, round(conf, 2)))
    return results


def run_baseline_tracking(
    video_path: str,
    goldfish_count: int = 3,
    progress_cb: Optional[Callable[[str, int], None]] = None,
    detect_mode: str = "auto",
) -> Tuple[Tracks, List[str]]:
    """Run classical CV tracking pipeline and return Tracks + any warnings."""
    meta = get_video_metadata(video_path)
    total_frames = meta["frame_count"]
    fps = meta["fps"]
    duration_s = meta["duration_s"]

    # 1. First pass or initial frames to detect mode
    bg_sub = cv2.createBackgroundSubtractorMOG2(history=200, varThreshold=25, detectShadows=False)

    # Effective stride
    target_fps = 10.0
    effective_fps = min(fps, target_fps)

    # Detect mode selection
    active_mode = detect_mode
    if active_mode == "auto":
        color_blob_found = False
        check_frames = 0
        for _, _, frame, fw, fh in frame_reader(video_path, target_width=640, max_fps=effective_fps):
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            color_mask = cv2.inRange(hsv, np.array([H_MIN, S_MIN, V_MIN]), np.array([H_MAX, 255, 255]))
            blobs = extract_blobs_from_mask(color_mask, fw, fh)
            if len(blobs) > 0:
                color_blob_found = True
                break
            check_frames += 1
            if check_frames >= 30:
                break
        active_mode = "colour" if color_blob_found else "motion"

    # Gating setup
    diag = math.sqrt(640**2 + 360**2)
    gating_dist = 0.15 * diag * (fps / effective_fps)
    max_disappeared = int(round(1.5 * effective_fps))  # 1.5 seconds

    tracker = CentroidTracker(max_disappeared_frames=max_disappeared, gating_dist=gating_dist)

    processed_frames = []
    frame_w, frame_h = 640, 360

    # Detection & tracking loop
    for f_idx, t, frame, fw, fh in frame_reader(video_path, target_width=640, max_fps=effective_fps):
        frame_w, frame_h = fw, fh
        if active_mode == "colour":
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            mask = cv2.inRange(hsv, np.array([H_MIN, S_MIN, V_MIN]), np.array([H_MAX, 255, 255]))
        else:
            mask = bg_sub.apply(frame)

        blobs = extract_blobs_from_mask(mask, fw, fh)
        tracker.update(blobs, t)
        processed_frames.append((f_idx, t))

        if progress_cb and total_frames > 0:
            pct = int(min(90, 10 + (f_idx / total_frames) * 70))
            progress_cb("detecting", pct)

    if progress_cb:
        progress_cb("tracking", 85)

    # Post processing tracks
    min_track_duration = min(1.0, 0.20 * duration_s)
    valid_tracks = {}

    for tid, tdata in tracker.tracks.items():
        times = tdata["times"]
        if not times:
            continue
        track_dur = times[-1] - times[0]
        if track_dur >= min_track_duration:
            valid_tracks[tid] = tdata

    # Keep longest K tracks if goldfish_count specified
    if goldfish_count > 0 and len(valid_tracks) > goldfish_count:
        sorted_by_len = sorted(
            valid_tracks.items(),
            key=lambda item: len(item[1]["centroids"]),
            reverse=True,
        )
        valid_tracks = dict(sorted_by_len[:goldfish_count])

    # Renumber Fish_1..N by first appearance
    sorted_by_appearance = sorted(
        valid_tracks.items(),
        key=lambda item: item[1]["first_seen"],
    )

    renamed_tracks = {}
    for new_idx, (old_tid, tdata) in enumerate(sorted_by_appearance):
        fid = f"Fish_{new_idx + 1}"
        renamed_tracks[fid] = tdata

    warnings = []
    detected_count = len(renamed_tracks)
    if detected_count == 0:
        warnings.append("No goldfish detected. Check lighting, camera angle, or try a clearer clip.")
    elif goldfish_count > 0 and detected_count < goldfish_count:
        warnings.append(f"Detected {detected_count} of {goldfish_count} goldfish.")

    # Reconstruct frames detections list with moving-average smoothed centroids
    frames_output: List[FrameDetections] = []
    for _, t in processed_frames:
        frame_dets = []
        for fid, tdata in renamed_tracks.items():
            times = tdata["times"]
            if times[0] <= t <= times[-1]:
                # Locate closest sample
                c_idx = np.searchsorted(times, t)
                c_idx = min(max(c_idx, 0), len(times) - 1)
                if abs(times[c_idx] - t) <= (1.0 / effective_fps) * 1.5:
                    bbox = tdata["bboxes"][c_idx]
                    frame_dets.append(Detection(id=fid, bbox=bbox, conf=0.92))
        frames_output.append(FrameDetections(t=round(t, 3), detections=frame_dets))

    tracks = Tracks(
        fps=effective_fps,
        width=frame_w,
        height=frame_h,
        duration_s=duration_s,
        frames=frames_output,
    )

    return tracks, warnings

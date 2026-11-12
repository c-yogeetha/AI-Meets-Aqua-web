import math
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import cv2
import numpy as np
import yaml
from scipy.optimize import linear_sum_assignment

from app.analysis.types import Detection, FrameDetections, Tracks
from app.analysis.video_io import frame_reader, get_video_metadata


def load_detect_config(custom_path: Optional[str] = None) -> Dict[str, Any]:
    if custom_path:
        p = Path(custom_path)
    else:
        p = Path(__file__).resolve().parent / "config" / "detect.yaml"
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


class DominantColorModel:
    """Learns dominant fish hues from warmup frames using circular k-means on HSV."""

    def __init__(self, config: Dict[str, Any]):
        cfg = config.get("color_model", {})
        self.warmup_frames = cfg.get("warmup_frames", 60)
        self.min_pixels = cfg.get("min_pixels", 50)
        self.k_clusters = cfg.get("k_clusters", 2)
        self.hue_margin = cfg.get("hue_margin", 16)
        self.s_min = cfg.get("s_min", 70)
        self.v_min = cfg.get("v_min", 70)

        fb = cfg.get("fallback", {})
        self.fb_h_min = fb.get("h_min", 5)
        self.fb_h_max = fb.get("h_max", 30)
        self.fb_s_min = fb.get("s_min", 90)
        self.fb_v_min = fb.get("v_min", 90)

        self.collected_hues: List[int] = []
        self.has_white: bool = False
        self.is_trained: bool = False
        self.cluster_hues: List[float] = []

    def observe(self, hsv_frame: np.ndarray, motion_mask: Optional[np.ndarray] = None):
        if self.is_trained:
            return

        if motion_mask is not None and np.count_nonzero(motion_mask) > 10:
            roi_hsv = hsv_frame[motion_mask > 0]
        else:
            roi_hsv = hsv_frame.reshape(-1, 3)

        # High saturation pixels in valid goldfish hue range: [0, 45] or [165, 180]
        # (excludes blue aquarium water H in [70, 140] and green decor H in [46, 70])
        hues = roi_hsv[:, 0]
        is_goldfish_hue = (hues <= 45) | (hues >= 165)
        colored_mask = is_goldfish_hue & (roi_hsv[:, 1] >= self.s_min) & (roi_hsv[:, 2] >= self.v_min)
        colored_hues = roi_hsv[colored_mask, 0]
        if len(colored_hues) > 0:
            if len(colored_hues) > 300:
                step = len(colored_hues) // 300
                colored_hues = colored_hues[::step]
            self.collected_hues.extend(colored_hues.tolist())

        # Check for white / silver fish (low S, high V)
        white_mask = (roi_hsv[:, 1] < 45) & (roi_hsv[:, 2] >= 180)
        if np.count_nonzero(white_mask) >= 30:
            self.has_white = True

    def train(self):
        if self.is_trained:
            return
        self.is_trained = True

        if len(self.collected_hues) < self.min_pixels:
            # Fallback to orange/gold
            self.cluster_hues = [18.0]
            return

        # Circular k-means on hue (angles in [0, 2*pi))
        h_arr = np.array(self.collected_hues, dtype=np.float32)
        angles = h_arr * (2.0 * np.pi / 180.0)
        points_2d = np.column_stack((np.cos(angles), np.sin(angles))).astype(np.float32)

        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.1)
        k = min(self.k_clusters, len(points_2d))
        _, _, centers = cv2.kmeans(points_2d, k, None, criteria, 5, cv2.KMEANS_PP_CENTERS)

        self.cluster_hues = []
        for c in centers:
            ang = math.atan2(float(c[1]), float(c[0])) % (2.0 * np.pi)
            h = ang * (180.0 / (2.0 * np.pi))
            self.cluster_hues.append(h)

    def get_color_mask(self, hsv_frame: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            self.train()

        h_channel = hsv_frame[:, :, 0].astype(np.float32)
        s_channel = hsv_frame[:, :, 1]
        v_channel = hsv_frame[:, :, 2]

        final_mask = np.zeros(h_channel.shape, dtype=np.uint8)

        # Apply masks for each learned cluster hue
        for ch in self.cluster_hues:
            diff = (2.0 * h_channel - 2.0 * ch + 180.0) % 360.0 - 180.0
            circ_dist = np.abs(diff) / 2.0

            c_mask = (
                (circ_dist <= self.hue_margin)
                & (s_channel >= self.s_min)
                & (v_channel >= self.v_min)
            )
            final_mask[c_mask] = 255

        # Also fallback orange range
        fb_mask = cv2.inRange(
            hsv_frame,
            np.array([self.fb_h_min, self.fb_s_min, self.fb_v_min]),
            np.array([self.fb_h_max, 255, 255]),
        )
        final_mask = cv2.bitwise_or(final_mask, fb_mask)

        # White fish mask if white detected
        if self.has_white:
            white_mask = (s_channel < 45) & (v_channel >= 180)
            final_mask[white_mask] = 255

        return final_mask


def split_merged_blobs(
    mask: np.ndarray,
    contours: List[np.ndarray],
    median_area: float,
    split_area_ratio: float = 1.4,
    max_seeds: int = 3,
    min_part_ratio: float = 0.35,
) -> List[Tuple[float, float, List[float], float, np.ndarray]]:
    """Split touching fish blobs using distance-transform watershed with local maxima."""
    processed_blobs = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area <= 0:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect = float(w) / float(h) if h > 0 else 0
        if aspect < 0.14 or aspect > 7.0:
            continue

        if median_area > 0 and area > split_area_ratio * median_area and w > 15 and h > 15:
            blob_roi = mask[y : y + h, x : x + w]
            dist = cv2.distanceTransform(blob_roi, cv2.DIST_L2, 5)
            max_val = float(dist.max())

            split_successful = False
            if max_val > 4.0:
                local_max = (dist == cv2.dilate(dist, np.ones((7, 7)))) & (dist > 0.40 * max_val)
                n_labels, markers = cv2.connectedComponents(local_max.astype(np.uint8))

                if 2 <= (n_labels - 1) <= max_seeds:
                    roi_color = cv2.cvtColor(blob_roi, cv2.COLOR_GRAY2BGR)
                    markers_ws = markers.copy()
                    cv2.watershed(roi_color, markers_ws)

                    candidate_parts = []
                    valid_split = True
                    for lbl in range(1, n_labels):
                        part_mask = (markers_ws == lbl).astype(np.uint8) * 255
                        part_cnts, _ = cv2.findContours(part_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                        if not part_cnts:
                            valid_split = False
                            break
                        part_c = max(part_cnts, key=cv2.contourArea)
                        p_area = cv2.contourArea(part_c)
                        if p_area < min_part_ratio * median_area:
                            valid_split = False
                            break

                        px, py, pw, ph = cv2.boundingRect(part_c)
                        global_x = x + px
                        global_y = y + py
                        candidate_parts.append((
                            global_x + pw / 2.0,
                            global_y + ph / 2.0,
                            [float(global_x), float(global_y), float(global_x + pw), float(global_y + ph)],
                            p_area,
                            part_c,
                        ))

                    if valid_split and len(candidate_parts) >= 2:
                        processed_blobs.extend(candidate_parts)
                        split_successful = True

            if not split_successful:
                processed_blobs.append((x + w / 2.0, y + h / 2.0, [float(x), float(y), float(x + w), float(y + h)], area, cnt))
        else:
            processed_blobs.append((x + w / 2.0, y + h / 2.0, [float(x), float(y), float(x + w), float(y + h)], area, cnt))

    return processed_blobs


def extract_hue_histogram(bgr_frame: np.ndarray, bbox: List[float]) -> np.ndarray:
    h, w = bgr_frame.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1 = max(0, min(x1, w - 1))
    x2 = max(x1 + 1, min(x2, w))
    y1 = max(0, min(y1, h - 1))
    y2 = max(y1 + 1, min(y2, h))

    crop = bgr_frame[y1:y2, x1:x2]
    if crop.size == 0:
        return np.zeros((16, 1), dtype=np.float32)

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0], None, [16], [0, 180])
    cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
    return hist


class RobustHungarianTracker:
    def __init__(
        self,
        config: Dict[str, Any],
        frame_width: int,
        frame_height: int,
        effective_fps: float,
    ):
        self.config = config
        self.fw = frame_width
        self.fh = frame_height
        self.fps = effective_fps
        self.diag = math.hypot(frame_width, frame_height)

        t_cfg = config.get("tracking", {})
        self.gating_dist = t_cfg.get("gating_dist_frac", 0.18) * self.diag
        self.min_hits = t_cfg.get("min_hits", 3)
        self.w_centroid = t_cfg.get("centroid_weight", 0.5)
        self.w_size = t_cfg.get("size_weight", 0.2)
        self.w_hist = t_cfg.get("hue_hist_weight", 0.3)

        ret_cfg = config.get("stationary_retention", {})
        self.coast_s = ret_cfg.get("coast_s", 12.0)
        self.min_match_score = ret_cfg.get("min_match_score", 0.65)
        self.unmatched_age_out_s = ret_cfg.get("unmatched_age_out_s", 2.0)

        self.next_id = 1
        self.tracks: Dict[int, Dict[str, Any]] = {}
        self.id_switch_count = 0

    def update(
        self,
        detections: List[Tuple[float, float, List[float], float, np.ndarray]],
        bgr_frame: np.ndarray,
        t: float,
    ) -> List[Tuple[int, List[float], float, bool]]:
        det_features = []
        for cx, cy, bbox, area, cnt in detections:
            hist = extract_hue_histogram(bgr_frame, bbox)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            det_features.append({
                "cx": cx,
                "cy": cy,
                "bbox": bbox,
                "area": area,
                "hist": hist,
                "w": w,
                "h": h,
            })

        active_tids = [tid for tid, td in self.tracks.items() if td["active"]]
        assigned_tracks = set()
        assigned_dets = set()

        if active_tids and det_features:
            C = np.zeros((len(active_tids), len(det_features)), dtype=np.float32)

            for i, tid in enumerate(active_tids):
                td = self.tracks[tid]
                tcx, tcy = td["centroids"][-1]
                t_area = td["areas"][-1]
                t_hist = td["hist"]

                for j, df in enumerate(det_features):
                    d_cent = math.hypot(tcx - df["cx"], tcy - df["cy"])
                    if d_cent > self.gating_dist:
                        C[i, j] = 100.0
                        continue

                    d_norm = d_cent / max(self.gating_dist, 1.0)
                    d_size = abs(t_area - df["area"]) / max(t_area, df["area"], 1.0)
                    d_hist = cv2.compareHist(t_hist, df["hist"], cv2.HISTCMP_BHATTACHARYYA)
                    if math.isnan(d_hist):
                        d_hist = 0.5

                    cost = (
                        self.w_centroid * d_norm
                        + self.w_size * d_size
                        + self.w_hist * d_hist
                    )
                    C[i, j] = cost

            row_ind, col_ind = linear_sum_assignment(C)

            for r, c in zip(row_ind, col_ind):
                if C[r, c] >= 10.0:
                    continue

                tid = active_tids[r]
                df = det_features[c]
                assigned_tracks.add(tid)
                assigned_dets.add(c)
                self._record_detection(tid, df, bgr_frame, t, coasting=False)

        unmatched_tids = [tid for tid in active_tids if tid not in assigned_tracks]
        for tid in unmatched_tids:
            td = self.tracks[tid]
            time_since_real = t - td["last_real_detection_t"]

            coasted = False
            if time_since_real <= self.coast_s and td.get("template") is not None:
                matched_bbox, score = self._match_template(td, bgr_frame)
                if score >= self.min_match_score and matched_bbox is not None:
                    cx = (matched_bbox[0] + matched_bbox[2]) / 2.0
                    cy = (matched_bbox[1] + matched_bbox[3]) / 2.0
                    area = (matched_bbox[2] - matched_bbox[0]) * (matched_bbox[3] - matched_bbox[1])
                    df_coast = {
                        "cx": cx,
                        "cy": cy,
                        "bbox": matched_bbox,
                        "area": area,
                        "hist": td["hist"],
                        "w": matched_bbox[2] - matched_bbox[0],
                        "h": matched_bbox[3] - matched_bbox[1],
                    }
                    self._record_detection(tid, df_coast, bgr_frame, t, coasting=True, conf=score)
                    coasted = True

            if not coasted:
                td["disappeared_frames"] += 1
                if (t - td["times"][-1]) > self.unmatched_age_out_s:
                    td["active"] = False

        for c, df in enumerate(det_features):
            if c not in assigned_dets:
                tid = self.next_id
                self.next_id += 1
                self._init_track(tid, df, bgr_frame, t)

        frame_results = []
        for tid, td in self.tracks.items():
            if td["times"] and td["times"][-1] == t:
                frame_results.append((
                    tid,
                    td["bboxes"][-1],
                    td["confs"][-1],
                    td["coasting"][-1],
                ))

        return frame_results

    def _init_track(self, tid: int, df: Dict[str, Any], bgr_frame: np.ndarray, t: float):
        template = self._extract_crop(bgr_frame, df["bbox"])
        self.tracks[tid] = {
            "id": tid,
            "active": True,
            "first_seen": t,
            "last_real_detection_t": t,
            "hits": 1,
            "disappeared_frames": 0,
            "centroids": [(df["cx"], df["cy"])],
            "bboxes": [df["bbox"]],
            "areas": [df["area"]],
            "times": [t],
            "confs": [0.95],
            "coasting": [False],
            "hist": df["hist"],
            "template": template,
        }

    def _record_detection(
        self,
        tid: int,
        df: Dict[str, Any],
        bgr_frame: np.ndarray,
        t: float,
        coasting: bool,
        conf: float = 0.95,
    ):
        td = self.tracks[tid]
        td["centroids"].append((df["cx"], df["cy"]))
        td["bboxes"].append(df["bbox"])
        td["areas"].append(df["area"])
        td["times"].append(t)
        td["confs"].append(conf)
        td["coasting"].append(coasting)
        td["hits"] += 1
        td["disappeared_frames"] = 0

        if not coasting:
            td["last_real_detection_t"] = t
            td["hist"] = 0.8 * td["hist"] + 0.2 * df["hist"]
            crop = self._extract_crop(bgr_frame, df["bbox"])
            if crop is not None:
                td["template"] = crop

    def _extract_crop(self, frame: np.ndarray, bbox: List[float]) -> Optional[np.ndarray]:
        x1, y1, x2, y2 = [int(v) for v in bbox]
        h, w = frame.shape[:2]
        x1 = max(0, min(x1, w - 1))
        x2 = max(x1 + 4, min(x2, w))
        y1 = max(0, min(y1, h - 1))
        y2 = max(y1 + 4, min(y2, h))
        crop = frame[y1:y2, x1:x2]
        if crop.shape[0] < 4 or crop.shape[1] < 4:
            return None
        return crop.copy()

    def _match_template(self, td: Dict[str, Any], frame: np.ndarray) -> Tuple[Optional[List[float]], float]:
        template = td["template"]
        if template is None:
            return None, 0.0

        th, tw = template.shape[:2]
        last_bbox = td["bboxes"][-1]
        cx = (last_bbox[0] + last_bbox[2]) / 2.0
        cy = (last_bbox[1] + last_bbox[3]) / 2.0

        sw = max(tw * 2.2, 60.0)
        sh = max(th * 2.2, 40.0)

        fh, fw = frame.shape[:2]
        sx1 = max(0, int(cx - sw / 2.0))
        sy1 = max(0, int(cy - sh / 2.0))
        sx2 = min(fw, int(cx + sw / 2.0))
        sy2 = min(fh, int(cy + sh / 2.0))

        if (sx2 - sx1) <= tw or (sy2 - sy1) <= th:
            return None, 0.0

        search_roi = frame[sy1:sy2, sx1:sx2]
        try:
            res = cv2.matchTemplate(search_roi, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            best_x = sx1 + max_loc[0]
            best_y = sy1 + max_loc[1]
            return [float(best_x), float(best_y), float(best_x + tw), float(best_y + th)], float(max_val)
        except cv2.error:
            return None, 0.0


def run_baseline_tracking(
    video_path: str,
    goldfish_count: int = 3,
    progress_cb: Optional[Callable[[str, int], None]] = None,
    detect_mode: str = "auto",
) -> Tuple[Tracks, List[str], Dict[str, Any]]:
    """Run fused classical CV tracking pipeline and return Tracks, warnings, and detection stats."""
    config = load_detect_config()
    meta = get_video_metadata(video_path)
    total_frames = meta["frame_count"]
    fps = meta["fps"]
    duration_s = meta["duration_s"]

    target_w = config.get("preprocessing", {}).get("target_width", 640)
    enable_clahe = config.get("preprocessing", {}).get("enable_clahe", True)
    g_kernel = config.get("preprocessing", {}).get("gaussian_kernel", 3)

    target_fps = 10.0
    effective_fps = min(fps, target_fps) if fps > 0 else target_fps

    # 1. Warm-up pass to train dominant colour model, build static decor mask, and warm up MOG2
    color_model = DominantColorModel(config)
    m_cfg = config.get("motion", {})
    bg_sub = cv2.createBackgroundSubtractorMOG2(
        history=m_cfg.get("history", 500),
        varThreshold=m_cfg.get("var_threshold", 25),
        detectShadows=m_cfg.get("detect_shadows", False),
    )

    decor_cfg = config.get("decor_filter", {})
    decor_enabled = decor_cfg.get("enabled", True)
    decor_area_frac = decor_cfg.get("decor_area_frac", 0.005)

    warmup_frames_target = min(40, max(15, total_frames // 2))
    warmup_motion_acc = None
    warmup_frame_count = 0
    first_frame_hsv = None

    for f_idx, t, frame, fw, fh in frame_reader(video_path, target_width=target_w, max_fps=effective_fps):
        if enable_clahe:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_ch = clahe.apply(l_ch)
            frame = cv2.cvtColor(cv2.merge((l_ch, a_ch, b_ch)), cv2.COLOR_LAB2BGR)

        if g_kernel > 1:
            frame = cv2.GaussianBlur(frame, (g_kernel, g_kernel), 0)

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        if first_frame_hsv is None:
            first_frame_hsv = hsv.copy()
            warmup_motion_acc = np.zeros(hsv.shape[:2], dtype=np.float32)

        motion_mask = bg_sub.apply(frame)
        color_model.observe(hsv, motion_mask)

        if warmup_motion_acc is not None:
            warmup_motion_acc += (motion_mask > 0).astype(np.float32)

        warmup_frame_count += 1
        if warmup_frame_count >= warmup_frames_target:
            break

    color_model.train()

    # Build static decor mask:
    # pixels matching fish colour that never moved (or moved <= 2 times) during warm-up
    static_decor_mask = np.zeros((360, 640), dtype=np.uint8)
    if decor_enabled and first_frame_hsv is not None and warmup_motion_acc is not None:
        init_color_mask = color_model.get_color_mask(first_frame_hsv)
        never_moved = warmup_motion_acc <= 2.0
        candidate_decor = (init_color_mask > 0) & never_moved

        cand_u8 = candidate_decor.astype(np.uint8) * 255
        n_lbl, lbls, stats, _ = cv2.connectedComponentsWithStats(cand_u8)
        frame_area = float(first_frame_hsv.shape[0] * first_frame_hsv.shape[1])
        min_decor_pixels = int(decor_area_frac * frame_area)

        static_decor_mask = np.zeros(first_frame_hsv.shape[:2], dtype=np.uint8)
        for lbl in range(1, n_lbl):
            area_px = stats[lbl, cv2.CC_STAT_AREA]
            if area_px >= min_decor_pixels:
                static_decor_mask[lbls == lbl] = 255

    morph_cfg = config.get("morphology", {})
    min_area_frac = morph_cfg.get("min_area_frac", 0.0003)
    max_area_frac = morph_cfg.get("max_area_frac", 0.06)
    min_solidity = morph_cfg.get("min_solidity", 0.45)

    ws_cfg = config.get("watershed_splitting", {})
    ws_enabled = ws_cfg.get("enabled", True)
    split_area_ratio = ws_cfg.get("split_area_ratio", 1.4)
    max_seeds = ws_cfg.get("max_seeds", 3)
    min_part_ratio = ws_cfg.get("min_part_ratio", 0.35)

    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))

    tracker: Optional[RobustHungarianTracker] = None
    processed_frames: List[Tuple[int, float]] = []
    frame_w, frame_h = 640, 360
    running_areas: List[float] = []

    frames_processed_count = 0
    frames_with_detections_count = 0
    all_observed_bboxes: List[List[float]] = []

    # Detection & Tracking Pass (bg_sub keeps learned background model)
    lr = m_cfg.get("learning_rate", 0.002)

    for f_idx, t, frame, fw, fh in frame_reader(video_path, target_width=target_w, max_fps=effective_fps):
        frame_w, frame_h = fw, fh
        if tracker is None:
            tracker = RobustHungarianTracker(config, frame_w, frame_h, effective_fps)

        if enable_clahe:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_ch = clahe.apply(l_ch)
            frame = cv2.cvtColor(cv2.merge((l_ch, a_ch, b_ch)), cv2.COLOR_LAB2BGR)

        if g_kernel > 1:
            frame_blur = cv2.GaussianBlur(frame, (g_kernel, g_kernel), 0)
        else:
            frame_blur = frame

        # Motion & Colour cues
        motion_mask = bg_sub.apply(frame_blur, learningRate=lr)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        colour_mask = color_model.get_color_mask(hsv)

        # Fused mask:
        # If fish is white or colored:
        if color_model.has_white:
            # For white fish, motion OR contrast
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blurred_bg = cv2.GaussianBlur(gray, (45, 45), 0)
            contrast_diff = cv2.absdiff(gray, blurred_bg)
            _, contrast_mask = cv2.threshold(contrast_diff, 18, 255, cv2.THRESH_BINARY)
            fused = cv2.bitwise_or(motion_mask, colour_mask)
            fused = cv2.bitwise_or(fused, cv2.bitwise_and(contrast_mask, motion_mask))
        else:
            # Color model is primary for orange fish; motion supplements
            fused = cv2.bitwise_or(colour_mask, motion_mask)

        # Apply static decor mask
        if decor_enabled and static_decor_mask.shape == fused.shape:
            fused = cv2.bitwise_and(fused, cv2.bitwise_not(static_decor_mask))

        # Morphology
        cleaned = cv2.morphologyEx(fused, cv2.MORPH_OPEN, kernel_open)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel_close)

        # Extract contours
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        frame_area = float(fw * fh)

        valid_contours = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area <= 0:
                continue
            frac = area / frame_area
            if min_area_frac <= frac <= max_area_frac:
                hull = cv2.convexHull(cnt)
                hull_area = cv2.contourArea(hull)
                solidity = (area / hull_area) if hull_area > 0 else 0
                if solidity >= min_solidity:
                    valid_contours.append(cnt)

        # Split merged blobs if enabled
        med_area = float(np.median(running_areas)) if running_areas else 300.0
        if ws_enabled and valid_contours:
            blobs = split_merged_blobs(
                cleaned,
                valid_contours,
                median_area=med_area,
                split_area_ratio=split_area_ratio,
                max_seeds=max_seeds,
                min_part_ratio=min_part_ratio,
            )
        else:
            blobs = []
            for cnt in valid_contours:
                x, y, w, h = cv2.boundingRect(cnt)
                blobs.append((x + w / 2.0, y + h / 2.0, [float(x), float(y), float(x + w), float(y + h)], cv2.contourArea(cnt), cnt))

        for _, _, bbox, area, _ in blobs:
            running_areas.append(area)
            all_observed_bboxes.append(bbox)
        if len(running_areas) > 200:
            running_areas = running_areas[-200:]

        # Update tracker
        frame_dets = tracker.update(blobs, frame, t)

        frames_processed_count += 1
        if len(frame_dets) > 0:
            frames_with_detections_count += 1
        processed_frames.append((f_idx, t))

        if progress_cb and total_frames > 0:
            pct = int(min(90, 10 + (f_idx / total_frames) * 70))
            progress_cb("detecting", pct)

    if progress_cb:
        progress_cb("tracking", 85)

    if tracker is None:
        tracker = RobustHungarianTracker(config, frame_w, frame_h, effective_fps)

    # Post processing tracks: filter by minimum hits
    confirmed_tracks = {}
    min_hits_required = tracker.min_hits

    for tid, tdata in tracker.tracks.items():
        if tdata["hits"] >= min_hits_required and len(tdata["times"]) >= 3:
            confirmed_tracks[tid] = tdata

    # If goldfish_count == 0 (e.g. blank video): clear any spurious tracks
    if goldfish_count == 0:
        confirmed_tracks = {}

    # If tank profile says goldfish_count and more confirmed tracks remain, keep top K with most frames
    if goldfish_count > 0 and len(confirmed_tracks) > goldfish_count:
        sorted_by_frames = sorted(
            confirmed_tracks.items(),
            key=lambda item: len(item[1]["centroids"]),
            reverse=True,
        )
        confirmed_tracks = dict(sorted_by_frames[:goldfish_count])

    # Renumber Fish_1..N by first appearance
    sorted_by_appearance = sorted(
        confirmed_tracks.items(),
        key=lambda item: item[1]["first_seen"],
    )

    renamed_tracks: Dict[str, Dict[str, Any]] = {}
    for new_idx, (old_tid, tdata) in enumerate(sorted_by_appearance):
        fid = f"Fish_{new_idx + 1}"
        renamed_tracks[fid] = tdata

    # Warnings
    warnings = []
    detected_count = len(renamed_tracks)
    if detected_count == 0:
        warnings.append("No goldfish detected. Check lighting, camera angle, or try a clearer clip.")
    elif goldfish_count > 0 and detected_count < goldfish_count:
        warnings.append(f"Detected {detected_count} of {goldfish_count} goldfish.")

    frames_output: List[FrameDetections] = []
    dt_tolerance = (1.0 / effective_fps) * 1.5

    for _, t in processed_frames:
        frame_dets_list = []
        for fid, tdata in renamed_tracks.items():
            times = tdata["times"]
            if times[0] <= t <= times[-1]:
                c_idx = np.searchsorted(times, t)
                c_idx = min(max(c_idx, 0), len(times) - 1)
                if abs(times[c_idx] - t) <= dt_tolerance:
                    bbox = tdata["bboxes"][c_idx]
                    coasting = tdata["coasting"][c_idx]
                    conf = tdata["confs"][c_idx]
                    frame_dets_list.append(Detection(
                        id=fid,
                        bbox=bbox,
                        conf=round(float(conf), 2),
                        coasting=coasting,
                    ))
        frames_output.append(FrameDetections(t=round(t, 3), detections=frame_dets_list))

    tracks = Tracks(
        fps=effective_fps,
        width=frame_w,
        height=frame_h,
        duration_s=duration_s,
        frames=frames_output,
    )

    cov_pct = (
        (frames_with_detections_count / frames_processed_count * 100.0)
        if frames_processed_count > 0 and detected_count > 0
        else 0.0
    )

    long_sides = []
    for bbox in all_observed_bboxes:
        w = abs(bbox[2] - bbox[0])
        h = abs(bbox[3] - bbox[1])
        long_sides.append(max(w, h))
    fish_median_px = float(np.median(long_sides)) if long_sides else 0.0

    detection_stats = {
        "frames_total": total_frames,
        "frames_processed": frames_processed_count,
        "frames_with_detections_pct": round(cov_pct, 1),
        "id_switch_estimate": tracker.id_switch_count,
        "coverage_pct": cov_pct,
        "fish_tracked": detected_count,
        "fish_median_px": fish_median_px,
    }

    return tracks, warnings, detection_stats

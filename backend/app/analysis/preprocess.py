"""Image preprocessing that preserves the original frames used for rendering."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np


@dataclass
class PreprocessFrame:
    detection_frame: np.ndarray
    colour_frame: np.ndarray
    detection_exclusion_mask: np.ndarray
    foreground_exclusion_mask: np.ndarray
    surface_zone_mask: np.ndarray
    flags: dict[str, Any] = field(default_factory=dict)


class Preprocessor:
    def __init__(self, config: dict[str, Any] | None = None, fps: float = 10.0):
        self.quality = (config or {}).get("preprocessing_quality", {})
        self.enabled = bool(self.quality.get("enabled", False))
        self.fps = max(float(fps or 10.0), 1.0)
        self.luma = deque(maxlen=max(1, int(self.quality.get("flicker", {}).get("window", 15))))
        self.surface_rows = deque(maxlen=15)
        self.bubble_history: dict[tuple[int, int], deque] = {}
        self.frames = 0
        self.heavy_glare = 0
        self.glare_sum = 0.0
        self.surface_sum = 0.0
        self.bubble_count = 0
        self.elapsed = 0.0

    @staticmethod
    def _valid(frame: np.ndarray) -> np.ndarray:
        if not isinstance(frame, np.ndarray) or frame.ndim != 3 or frame.shape[2] != 3 or frame.size == 0:
            raise ValueError("Expected a non-empty BGR frame")
        return frame.copy()

    def process(self, original_frame: np.ndarray, timestamp_s: float = 0.0) -> PreprocessFrame:
        original = self._valid(original_frame)
        zero = np.zeros(original.shape[:2], dtype=np.uint8)
        if not self.enabled:
            self.frames += 1
            return PreprocessFrame(original.copy(), original.copy(), zero, zero.copy(), zero.copy(), {"enabled": False})
        cfg = self.quality
        flags: dict[str, Any] = {"enabled": True}
        frame = original.copy()
        # Gray-world colour correction with bounded channel gains.
        wb = cfg.get("colour_cast", {})
        if wb.get("enabled", True):
            means = frame.reshape(-1, 3).mean(axis=0)
            if np.all(means >= 1.0):
                gains = np.clip(
                    float(means.mean()) / means, float(wb.get("min_gain", 0.7)), float(wb.get("max_gain", 1.4))
                )
                frame = np.clip(frame.astype(np.float32) * gains.reshape(1, 1, 3), 0, 255).astype(np.uint8)
                flags["colour_cast"] = bool(np.max(np.abs(gains - 1.0)) > 0.02)
                flags["white_balance_gains_bgr"] = [round(float(x), 3) for x in gains]
        else:
            flags["colour_cast"] = False
        # Stabilise exposure against a running median (window 15 by default).
        flick = cfg.get("flicker", {})
        if flick.get("enabled", True):
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            mean_v = float(np.mean(hsv[:, :, 2]))
            target = float(np.median(self.luma)) if self.luma else mean_v
            self.luma.append(mean_v)
            scale = float(np.clip(target / mean_v, 0.75, 1.33)) if mean_v > 1 else 1.0
            hsv[:, :, 2] = np.clip(hsv[:, :, 2].astype(np.float32) * scale, 0, 255).astype(np.uint8)
            frame = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
            flags["flicker"] = abs(scale - 1.0) > 0.03
            flags["luma_scale"] = round(scale, 3)
        else:
            flags["flicker"] = False
        # Bright specular components: mask for detector exclusion and Telea fill for colour/motion cues.
        glare_cfg = cfg.get("glare", {})
        glare = zero.copy()
        if glare_cfg.get("enabled", True):
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            value = hsv[:, :, 2]
            threshold = max(200.0, float(np.percentile(value, float(glare_cfg.get("percentile", 99)))))
            candidate = ((value >= threshold) & (hsv[:, :, 1] <= int(glare_cfg.get("saturation_max", 60)))).astype(
                np.uint8
            ) * 255
            n, labels, stats, _ = cv2.connectedComponentsWithStats(candidate, 8)
            for lab in range(1, n):
                if stats[lab, cv2.CC_STAT_AREA] >= int(glare_cfg.get("min_area", 40)):
                    glare[labels == lab] = 255
            if np.any(glare):
                radius = max(1, int(glare_cfg.get("dilate_px", 7)))
                glare = cv2.dilate(
                    glare, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))
                )
        glare_frac = float(np.count_nonzero(glare)) / float(glare.size or 1)
        flags.update({"glare": bool(np.any(glare)), "glare_frac": round(glare_frac, 5)})
        # Surface reflection zone is labelled, not removed, to preserve surface fish.
        surface = zero.copy()
        scfg = cfg.get("surface_band", {})
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)
        rowvar = np.var(gray, axis=1)
        self.surface_rows.append(rowvar)
        if scfg.get("enabled", True):
            temporal = np.var(np.stack(self.surface_rows), axis=0)
            limit = max(1, min(frame.shape[0], int(frame.shape[0] * float(scfg.get("max_height_fraction", 0.18)))))
            hits = np.where(temporal[:limit] >= float(scfg.get("variance_threshold", 120.0)))[0]
            if len(hits) >= max(3, int(limit * 0.08)):
                surface[: min(limit, int(hits.max()) + 1), :] = 255
        surface_frac = float(np.count_nonzero(surface)) / float(surface.size or 1)
        flags.update({"surface_band": bool(np.any(surface)), "surface_band_frac": round(surface_frac, 5)})
        # Small bright circular transient components moving up/jittering are foreground exclusions.
        bubbles = zero.copy()
        bcfg = cfg.get("bubbles", {})
        bubble_now = 0
        if bcfg.get("enabled", True):
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            local = cv2.GaussianBlur(g, (31, 31), 0)
            bright = (g.astype(np.int16) - local.astype(np.int16)) >= int(bcfg.get("brightness_margin", 12))
            mask = ((hsv[:, :, 2] >= 190) & (hsv[:, :, 1] <= 90) & bright).astype(np.uint8) * 255
            n, labels, stats, centres = cv2.connectedComponentsWithStats(mask, 8)
            area_px = frame.shape[0] * frame.shape[1]
            lo = float(bcfg.get("min_area_fraction", 0.00002)) * area_px
            hi = float(bcfg.get("max_area_fraction", 0.003)) * area_px
            for lab in range(1, n):
                x, y, w, h, a = map(int, stats[lab])
                if a < lo or a > hi or w == 0 or h == 0:
                    continue
                cs, _ = cv2.findContours(
                    (labels[y : y + h, x : x + w] == lab).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
                if not cs:
                    continue
                peri = cv2.arcLength(cs[0], True)
                circ = 4 * np.pi * a / (peri * peri) if peri else 0
                if circ < float(bcfg.get("min_circularity", 0.7)):
                    continue
                cx, cy = map(float, centres[lab])
                key = (round(cx / 16), round(cy / 16))
                hist = self.bubble_history.setdefault(key, deque(maxlen=5))
                hist.append((float(timestamp_s), cy))
                if len(self.bubble_history) > 512:
                    self.bubble_history.pop(next(iter(self.bubble_history)))
                if len(hist) < 2:
                    continue
                dt = max(0.001, hist[-1][0] - hist[0][0])
                vy = (hist[-1][1] - hist[0][1]) / dt
                stable = hist[-1][0] - hist[0][0]
                if stable < float(bcfg.get("stable_seconds", 1.0)) and vy <= float(
                    bcfg.get("upward_velocity_min", 0.0)
                ):
                    bubbles[labels == lab] = 255
                    bubble_now += 1
        self.bubble_count += bubble_now
        self.elapsed = max(self.elapsed, float(timestamp_s))
        flags.update(
            {"bubbles": bubble_now, "bubble_rate": round(self.bubble_count / max(self.elapsed, 1 / self.fps), 3)}
        )
        # Denoise and fill specular regions for colour/motion cues only.
        denoised = cv2.GaussianBlur(frame, (3, 3), 0)
        colour = cv2.inpaint(denoised, glare, 3, cv2.INPAINT_TELEA) if np.any(glare) else denoised.copy()
        self.frames += 1
        self.glare_sum += glare_frac
        self.surface_sum += surface_frac
        if glare_frac > float(glare_cfg.get("max_fraction", 0.25)):
            self.heavy_glare += 1
        return PreprocessFrame(
            colour.copy(),
            colour.copy(),
            cv2.bitwise_or(glare, surface),
            cv2.bitwise_or(glare, bubbles),
            surface.copy(),
            flags,
        )

    def summary(self) -> dict[str, Any]:
        n = max(1, self.frames)
        heavy = self.heavy_glare / n
        return {
            "enabled": self.enabled,
            "frames_sampled": self.frames,
            "glare_frac": round(self.glare_sum / n, 5),
            "bubble_rate": round(self.bubble_count / max(self.elapsed, 1 / self.fps), 3),
            "surface_band_frac": round(self.surface_sum / n, 5),
            "glare_heavy_fraction": round(heavy, 4),
            "strong_glare": heavy > 0.30,
        }

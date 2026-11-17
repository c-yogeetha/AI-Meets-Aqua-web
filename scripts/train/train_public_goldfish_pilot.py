#!/usr/bin/env python3
"""EXPERIMENTAL — NOT USED BY THE PRODUCT.

Archived CPU transfer-learning pilot on public goldfish video pseudo-labels.
Its annotations are high-confidence proposals from a generic fish model and are
not independent ground truth. This is not a release acceptance run.
"""
from __future__ import annotations

import argparse
import json
import platform
import sys
from pathlib import Path

from ultralytics import YOLO
import torch

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / ".work/goldfish_dataset/yolo_public_pilot/data.yaml"
BASE = ROOT / "backend/models/external/fishial-v26/fishial_yolo26n.pt"
OUT = ROOT / ".work/goldfish_dataset/train_runs"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--imgsz", type=int, default=320)
    parser.add_argument("--batch", type=int, default=1)
    parser.add_argument("--freeze", type=int, default=22)
    args = parser.parse_args()
    if not DATA.is_file() or not BASE.is_file():
        raise SystemExit("Pilot dataset or base model is missing. Run the documented preparation first.")
    model = YOLO(str(BASE), task="detect")
    metrics = model.train(
        data=str(DATA),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        freeze=args.freeze,
        device="cpu",
        workers=0,
        cache=False,
        optimizer="AdamW",
        lr0=0.0005,
        patience=max(3, args.epochs // 2),
        close_mosaic=2,
        amp=False,
        deterministic=True,
        plots=False,
        save=True,
        save_period=max(1, args.epochs // 2),
        project=str(OUT),
        name="public_goldfish_pseudo_label_pilot",
        exist_ok=True,
        verbose=True,
    )
    summary = {
        "experiment": "public_goldfish_pseudo_label_pilot",
        "base_model": "Fishial YOLO26 nano fish detector",
        "base_checkpoint": str(BASE.relative_to(ROOT)),
        "training_data": str(DATA.relative_to(ROOT)),
        "epochs_requested": args.epochs,
        "image_size": args.imgsz,
        "batch_size": args.batch,
        "frozen_layers": args.freeze,
        "device": "cpu",
        "torch_version": torch.__version__,
        "ultralytics_version": __import__("ultralytics").__version__,
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "best_checkpoint": str(Path(model.trainer.best).resolve()),
        "last_checkpoint": str(Path(model.trainer.last).resolve()),
        "metrics": {k: float(v) for k, v in metrics.results_dict.items()},
        "warning": "Pseudo-label self-training pilot only. Box labels originate from the generic fish detector and are not independent ground truth. Do not use reported validation metrics as measured goldfish accuracy or to pass the Matsya learned-detector gate.",
    }
    (OUT / "public_goldfish_pseudo_label_pilot" / "pilot_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

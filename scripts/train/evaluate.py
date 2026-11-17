#!/usr/bin/env python3
"""Fail-closed evaluator for independently measured goldfish hold-out metrics."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

REQUIRED = (
    "precision",
    "holdout_recall",
    "classical_holdout_recall",
    "count_exact_match_pct",
    "holdout_clips",
)


def evaluate(data: dict[str, Any]) -> tuple[bool, str]:
    missing = [key for key in REQUIRED if key not in data]
    if missing:
        return False, "Missing metrics: " + ", ".join(missing)
    try:
        precision = float(data["precision"])
        recall = float(data["holdout_recall"])
        classical_recall = float(data["classical_holdout_recall"])
        count_exact = float(data["count_exact_match_pct"])
        clips = int(data["holdout_clips"])
    except (TypeError, ValueError):
        return False, "Evaluation metrics have invalid types"
    if not all(math.isfinite(value) for value in (
        precision, recall, classical_recall, count_exact
    )):
        return False, "Evaluation metrics contain non-finite values"
    if not all(0.0 <= value <= 1.0 for value in (precision, recall, classical_recall)):
        return False, "Precision and recall metrics must be between 0 and 1"
    if not 0.0 <= count_exact <= 100.0:
        return False, "Count exact-match rate must be between 0 and 100"
    if clips < 1:
        return False, "No hold-out clips were evaluated"
    if precision < 0.85:
        return False, "Hold-out precision is below 0.85"
    if recall < 0.85:
        return False, "Hold-out recall is below 0.85"
    if count_exact < 70.0:
        return False, "Count exact-match rate is below 70%"
    if recall <= classical_recall:
        return False, "Hold-out recall does not exceed the classical detector"
    return True, "Evaluation gate passed"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metrics", required=True)
    parser.add_argument("--markdown", default="docs/MODEL_EVAL.md")
    parser.add_argument("--json", default="frontend/public/data/model-eval.json")
    args = parser.parse_args()

    data = json.loads(Path(args.metrics).read_text(encoding="utf-8"))
    eligible, reason = evaluate(data)
    result = {
        "available": True,
        "eligible": eligible,
        "reason": reason,
        "eval": data,
    }
    output = Path(args.json)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    Path(args.markdown).write_text(
        "# Learned Detector Evaluation\n\n"
        + json.dumps(result, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, indent=2))
    return 0 if eligible else 1


if __name__ == "__main__":
    raise SystemExit(main())

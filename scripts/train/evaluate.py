#!/usr/bin/env python3
"""Fail-closed model-gate evaluator; consumes independently measured hold-out metrics."""
from __future__ import annotations
import argparse,json
from pathlib import Path

def main()->int:
    p=argparse.ArgumentParser();p.add_argument("--metrics",required=True);p.add_argument("--markdown",default="docs/MODEL_EVAL.md");p.add_argument("--json",default="frontend/public/data/model-eval.json");a=p.parse_args()
    data=json.loads(Path(a.metrics).read_text());required=("precision","holdout_recall","holdout_coverage_pct","classical_holdout_coverage_pct","holdout_clips")
    missing=[k for k in required if k not in data]
    eligible=not missing and float(data.get("precision",0))>=.85 and float(data.get("holdout_recall",0))>=.90 and float(data.get("holdout_coverage_pct",0))>=float(data.get("classical_holdout_coverage_pct",0))-2 and int(data.get("holdout_clips",0))>=1
    result={"available":True,"eligible":eligible,"reason":"Evaluation gate passed" if eligible else ("Missing metrics: "+", ".join(missing) if missing else "Hold-out metrics are below the release threshold"),"eval":data}
    out=Path(a.json);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,indent=2))
    Path(a.markdown).write_text("# Learned Detector Evaluation\n\n"+json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())

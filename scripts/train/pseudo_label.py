#!/usr/bin/env python3
"""Build agreement-only candidate annotations from a classical model and an optional second source."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from typing import Any

def iou(a:list[float],b:list[float])->float:
    x1=max(a[0],b[0]);y1=max(a[1],b[1]);x2=min(a[2],b[2]);y2=min(a[3],b[3])
    inter=max(0,x2-x1)*max(0,y2-y1)
    area_a=max(0,a[2]-a[0])*max(0,a[3]-a[1]);area_b=max(0,b[2]-b[0])*max(0,b[3]-b[1])
    return inter/max(area_a+area_b-inter,1e-9)

def main()->int:
    p=argparse.ArgumentParser();p.add_argument("--first",required=True);p.add_argument("--second",required=True);p.add_argument("--output",default="data/goldfish/labels");p.add_argument("--iou",type=float,default=.5);a=p.parse_args()
    first=json.loads(Path(a.first).read_text());second=json.loads(Path(a.second).read_text())
    out=Path(a.output);(out/"review").mkdir(parents=True,exist_ok=True)
    kept={};review={}
    for image,boxes in first.items():
        candidates=second.get(image,[]);agree=[];single=[]
        for box in boxes:
            match=max(candidates,key=lambda other:iou(box,other),default=None)
            if match is not None and iou(box,match)>=a.iou: agree.append(box)
            else: single.append(box)
        if agree: kept[image]=agree
        if single: review[image]=single
    (out/"kept.json").write_text(json.dumps(kept,indent=2));(out/"review"/"single_source.json").write_text(json.dumps(review,indent=2))
    print(f"agreement_images={len(kept)} review_images={len(review)} kept_boxes={sum(map(len,kept.values()))}")
    return 0
if __name__=="__main__": raise SystemExit(main())

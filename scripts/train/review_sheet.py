#!/usr/bin/env python3
"""Render a deterministic 200-item annotation review sheet for human precision auditing."""
from __future__ import annotations
import argparse, json, random
from pathlib import Path
import cv2
import numpy as np

def main()->int:
    p=argparse.ArgumentParser();p.add_argument("--images",required=True);p.add_argument("--labels",required=True);p.add_argument("--output",default="docs/contact_sheets/pseudo-label-review.png");p.add_argument("--count",type=int,default=200);a=p.parse_args()
    image_dir=Path(a.images); labels=json.loads(Path(a.labels).read_text());items=[]
    for name,boxes in labels.items():
        for box in boxes:items.append((name,box))
    random.Random(17).shuffle(items);items=items[:a.count]
    if not items: print("No pseudo-label boxes to review.");return 2
    thumbs=[]
    for name,box in items:
        path=image_dir/name
        image=cv2.imread(str(path))
        if image is None: continue
        x1,y1,x2,y2=map(int,box);cv2.rectangle(image,(x1,y1),(x2,y2),(0,220,255),2)
        image=cv2.resize(image,(240,150));cv2.putText(image,name[:32],(5,14),cv2.FONT_HERSHEY_SIMPLEX,.35,(255,255,255),1)
        thumbs.append(image)
    cols=5;rows=(len(thumbs)+cols-1)//cols;canvas=np.zeros((rows*150,cols*240,3),dtype=np.uint8)
    for i,img in enumerate(thumbs):canvas[(i//cols)*150:(i//cols+1)*150,(i%cols)*240:(i%cols+1)*240]=img
    out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);cv2.imwrite(str(out),canvas)
    print(f"Rendered {len(thumbs)} of {len(items)} selected boxes to {out}; human review required.")
    return 0
if __name__=="__main__": raise SystemExit(main())

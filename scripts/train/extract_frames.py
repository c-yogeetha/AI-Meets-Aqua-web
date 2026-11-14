#!/usr/bin/env python3
"""Extract one frame per second from owner training clips, with duplicate suppression."""
from __future__ import annotations
import argparse, json
from pathlib import Path
import cv2
import numpy as np

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",default="samples_real")
    parser.add_argument("--output",default="data/goldfish/images")
    parser.add_argument("--max-difference",type=float,default=2.0)
    args=parser.parse_args()
    source=Path(args.source); output=Path(args.output); output.mkdir(parents=True,exist_ok=True)
    summary=[]
    for clip in sorted(source.iterdir() if source.exists() else []):
        if clip.suffix.lower() not in {".mp4",".mov",".webm",".avi",".mkv"}: continue
        cap=cv2.VideoCapture(str(clip)); fps=float(cap.get(cv2.CAP_PROP_FPS) or 0); frames=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if fps<=0 or frames<=0: cap.release(); continue
        last=None; saved=0
        for sec in range(int(frames/fps)+1):
            cap.set(cv2.CAP_PROP_POS_MSEC,sec*1000); ok,frame=cap.read()
            if not ok: break
            small=cv2.resize(cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY),(160,90))
            if last is not None and float(np.mean(cv2.absdiff(small,last)))<args.max_difference: continue
            name=f"{clip.stem}_{sec:05d}.jpg"; cv2.imwrite(str(output/name),frame,[cv2.IMWRITE_JPEG_QUALITY,92]); saved+=1; last=small
        cap.release(); summary.append({"clip":clip.name,"frames":saved})
    (output.parent/"extraction.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print(json.dumps(summary,indent=2)); return 0
if __name__=="__main__": raise SystemExit(main())

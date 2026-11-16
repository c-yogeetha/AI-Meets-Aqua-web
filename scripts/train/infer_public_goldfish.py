#!/usr/bin/env python3
"""Create small annotated MP4s from public goldfish clips using the pilot model."""
from __future__ import annotations
import argparse, json
from pathlib import Path
import cv2
from ultralytics import YOLO

ROOT=Path(__file__).resolve().parents[2]
DEFAULT_MODEL=ROOT/'.work/goldfish_dataset/train_runs/public_goldfish_pseudo_label_pilot/weights/best.pt'
DEFAULT_INPUT=ROOT/'samples_real/public_goldfish_cc_by_sa'
DEFAULT_OUTPUT=ROOT/'.work/goldfish_dataset/annotated_videos'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--model',type=Path,default=DEFAULT_MODEL)
    ap.add_argument('--input',type=Path,default=DEFAULT_INPUT)
    ap.add_argument('--output',type=Path,default=DEFAULT_OUTPUT)
    ap.add_argument('--target-fps',type=float,default=5.0)
    ap.add_argument('--conf',type=float,default=.30)
    args=ap.parse_args()
    args.output=args.output.resolve()
    args.input=args.input.resolve()
    args.model=args.model.resolve()
    args.output.mkdir(parents=True,exist_ok=True)
    model=YOLO(str(args.model),task='detect')
    summary=[]
    for path in sorted(args.input.glob('*.webm')):
        cap=cv2.VideoCapture(str(path))
        fps=float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
        frame_count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        stride=max(1,round(fps/args.target_fps))
        out_fps=fps/stride
        writer=None; processed=0; detected=0; total_boxes=0
        output=args.output/(path.stem+'_fish_annotated.mp4')
        frame_idx=0
        while True:
            ok,frame=cap.read()
            if not ok: break
            if frame_idx % stride == 0:
                h,w=frame.shape[:2]
                target_w=960; target_h=max(1,round(h*target_w/w))
                sample=cv2.resize(frame,(target_w,target_h),interpolation=cv2.INTER_AREA if w>target_w else cv2.INTER_LINEAR)
                result=model.predict(sample,imgsz=320,conf=args.conf,device='cpu',verbose=False)[0]
                count=len(result.boxes); total_boxes+=count; detected+=bool(count); processed+=1
                for box in result.boxes:
                    x1,y1,x2,y2=map(int,box.xyxy[0].cpu().numpy())
                    score=float(box.conf.item())
                    cv2.rectangle(sample,(x1,y1),(x2,y2),(20,210,255),2)
                    cv2.putText(sample,f'Fish {score:.2f}',(x1,max(18,y1-6)),cv2.FONT_HERSHEY_SIMPLEX,.55,(20,210,255),2,cv2.LINE_AA)
                cv2.rectangle(sample,(0,0),(sample.shape[1],32),(0,0,0),-1)
                cv2.putText(sample,'Matsya research pilot | predicted fish boxes | not ground-truth validated',(8,22),cv2.FONT_HERSHEY_SIMPLEX,.52,(245,245,245),1,cv2.LINE_AA)
                if writer is None:
                    writer=cv2.VideoWriter(str(output),cv2.VideoWriter_fourcc(*'mp4v'),out_fps,(sample.shape[1],sample.shape[0]))
                writer.write(sample)
            frame_idx+=1
        cap.release()
        if writer is not None: writer.release()
        row={'source':path.name,'output':str(output.relative_to(ROOT)),'source_fps':fps,'source_frames':frame_count,'stride':stride,'output_fps':out_fps,'sampled_frames':processed,'frames_with_boxes':int(detected),'predicted_boxes':total_boxes,'box_frame_rate_pct':round(detected/max(processed,1)*100,1),'warning':'Predicted box rate only; this is not independently measured recall or goldfish accuracy.'}
        summary.append(row); print(json.dumps(row))
    (args.output/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')

if __name__=='__main__': main()

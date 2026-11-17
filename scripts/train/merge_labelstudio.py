#!/usr/bin/env python3
"""Convert a Label Studio goldfish rectangle export into validated YOLO labels."""
from __future__ import annotations
import argparse, json, shutil
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPLIT = ROOT / "data/split.json"
TEST_DIR = ROOT / "annotation/test_frames"
TUNE_DIR = ROOT / "annotation/tune_unlabelled"

class ExportError(ValueError): pass

def image_name(task):
    value = str(task.get("data", {}).get("image", ""))
    if not value: raise ExportError("Task is missing data.image")
    return value.split("?")[-1].split("/")[-1]

def to_yolo(task):
    name = image_name(task)
    image = TEST_DIR / name
    if not image.is_file(): raise ExportError(f"TEST image not found: {name}")
    import cv2
    im = cv2.imread(str(image))
    if im is None: raise ExportError(f"Unreadable image: {name}")
    h, w = im.shape[:2]
    completed = [a for a in task.get("annotations", []) if a.get("was_cancelled") is not True]
    if not completed: raise ExportError(f"No submitted annotation for {name}; submit even empty frames")
    boxes, seen = [], set()
    for annotation in completed:
        for result in annotation.get("result", []):
            if result.get("type") != "rectanglelabels": continue
            v = result.get("value", {})
            labels = v.get("rectanglelabels", [])
            if labels != ["goldfish"]: raise ExportError(f"Unexpected class in {name}: {labels}")
            x, y = float(v["x"]), float(v["y"])
            bw, bh = float(v["width"]), float(v["height"])
            if min(x, y, bw, bh) < 0 or bw <= 0 or bh <= 0 or x+bw > 100.0001 or y+bh > 100.0001:
                raise ExportError(f"Box outside image in {name}: {(x,y,bw,bh)}")
            xc, yc = (x+bw/2)/100, (y+bh/2)/100
            wn, hn = bw/100, bh/100
            key = tuple(round(z, 5) for z in (xc, yc, wn, hn))
            if key in seen: raise ExportError(f"Duplicate box in {name}: {key}")
            seen.add(key); boxes.append((0, xc, yc, wn, hn))
    return name, boxes

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--export", required=True, type=Path)
    p.add_argument("--output", type=Path, default=ROOT/"data/labelled_test_yolo")
    p.add_argument("--dry-run", action="store_true", help="validate only first ten tasks without writing labels")
    a=p.parse_args()
    tasks=json.loads(a.export.read_text(encoding="utf-8"))
    if not isinstance(tasks,list) or not tasks: raise ExportError("Expected a non-empty Label Studio JSON task list")
    if a.dry_run: tasks=tasks[:10]
    split=json.loads(SPLIT.read_text(encoding="utf-8"))
    test_ids={x["clip_id"] for x in split["test"]}; tune_ids={x["clip_id"] for x in split["tune"]}
    counts=Counter(); total_boxes=0; files=set()
    converted=[]
    for task in tasks:
        name=image_name(task)
        clip=name.split("__",1)[0]
        if clip not in test_ids: raise ExportError(f"Non-TEST image in export: {name}")
        if clip in tune_ids or (TUNE_DIR/name).exists(): raise ExportError(f"TUNE/TEST filename overlap: {name}")
        if name in files: raise ExportError(f"Duplicate task/image: {name}")
        files.add(name)
        name, boxes=to_yolo(task)
        counts[clip]+=1; total_boxes+=len(boxes); converted.append((name,boxes))
    print(json.dumps({"validated_tasks":len(converted),"test_frames_with_annotations":dict(counts),"goldfish_boxes":total_boxes,"dry_run":a.dry_run},indent=2))
    if a.dry_run: return
    images_out=a.output/"images"; labels_out=a.output/"labels"
    images_out.mkdir(parents=True,exist_ok=True); labels_out.mkdir(parents=True,exist_ok=True)
    for name,boxes in converted:
        shutil.copy2(TEST_DIR/name,images_out/name)
        (labels_out/(Path(name).stem+".txt")).write_text("".join("0 "+" ".join(f"{v:.8f}" for v in b[1:])+"\n" for b in boxes),encoding="utf-8")
    print(f"Wrote {len(converted)} labelled TEST images to {a.output}")

if __name__=="__main__":
    try: main()
    except ExportError as e: raise SystemExit(f"ERROR: {e}")

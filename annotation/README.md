# Matsya independent goldfish test annotation

**Purpose:** blind, human-only annotation of seven frozen public video clips. This is not training data. The five goldfish clips remain held out. Two fixed-camera non-goldfish aquarium clips are negative controls. The TUNE frames are unlabelled and must never be mixed into TEST.

## Contents

- `test_frames/`: TEST images only. No model proposals or detector boxes are supplied.
- `tune_unlabelled/`: separate, unlabelled TUNE images. Do not label these in the TEST project.
- `labelstudio_import.json`: tasks for TEST images only.
- `label_config.xml`: one class, `goldfish`.
- `frames_manifest.csv`: source clip, timestamp, source/image dimensions and resize scale.
- `pack_summary.json`: frame counts and whether the v4 80-frame minimum was reached.
- `matsya_blind_test_pack.zip`: ready-to-import TEST-only pack (no TUNE frames or source videos).
- `../data/split.json`: frozen 7-clip TEST / 5-clip TUNE assignment.

## Windows setup (local only)

Use Python 3.10–3.12. Do not upload these images to a hosted labeling service or shared Drive. In PowerShell, from the repository root:

```powershell
py -3.12 -m venv .venv-labelstudio
.\.venv-labelstudio\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install label-studio
$env:LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED = "true"
$env:LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT = (Get-Location).Path
label-studio start --port 8080
```

Open `http://localhost:8080` in the same computer. Create a local Label Studio account, create a project named `Matsya goldfish blind test`, set its labeling interface to the contents of `label_config.xml`, then import `annotation/labelstudio_import.json`. The project must have no ML backend and no pre-annotations. Keep only one labeling session open to avoid task duplication.

## Annotation rules

1. Label **goldfish only** (`Carassius auratus`). Do not label other fish species in the two negative-control aquarium clips.
2. Draw one tight rectangle around the whole visible goldfish body, including fins.
3. Label a goldfish only when at least 40% of it is visible and its visible size is larger than 12 pixels.
4. Use one box per goldfish even when fish overlap. Do not merge fish into one box.
5. Do not box reflections, toys, plants, decor, bubbles or other non-fish objects.
6. Submit every frame, including frames with no goldfish: an empty submitted annotation is a valid negative frame. Do not skip an empty frame.
7. Do not use detector predictions, model suggestions or auto-annotation. These TEST frames must remain blind.

## Useful editor controls

- Draw boxes by selecting the `goldfish` label and dragging on the image.
- Select a region to resize its corners/edges; use `Backspace` to delete a selected region.
- Use `Ctrl`+click when you need to draw a box overlapping an existing region.
- Click **Submit** after each frame; changes save automatically. Use the editor's settings icon to see the active hotkey list for the installed version. Label Studio documents hotkeys and notes that mappings can differ by platform/version: https://labelstud.io/guide/hotkeys

## Export

In the Label Studio project, export annotations as **JSON**. Keep the export unchanged and pass it to the merge script from the repository root:

```powershell
python scripts\train\merge_labelstudio.py --export path\to\project-export.json --dry-run
python scripts\train\merge_labelstudio.py --export path\to\project-export.json
```

The dry run validates the first 10 tasks without writing labels. The full run requires every TEST task to have a submitted annotation, validates class IDs, bounds, duplicate boxes and TEST/TUNE separation, and writes YOLO format to `data/labelled_test_yolo/`. Keep the original JSON export for provenance. Never edit `data/split.json` after any TEST labels have been returned.

## Provenance and limitations

The selected TEST frames derive from Wikimedia Commons videos listed in `docs/DATA_LICENSES.md`. The seven TEST source videos are CC BY-SA 4.0; this extracted annotation pack is provided under CC BY-SA 4.0 with attribution to the original creators. Preserve the attribution and share-alike notices when redistributing it. The target is 80–110 labelled frames. This source set is short; use `pack_summary.json` for the actual count. If fewer than 80 frames are available/labelled, report the evaluation as a **very small sample**—do not fill the gap with duplicated frames or change the 2-second sampling cadence.

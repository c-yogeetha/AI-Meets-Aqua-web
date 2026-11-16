# Public goldfish footage and detector pilot (2026-11-16)

## Purpose and status

This is a reproducible feasibility investigation, **not a validated goldfish model** and not a replacement for Matsya's accepted detector. Five public Wikimedia Commons goldfish videos were downloaded for local research. Their source files, extracted frames, generated annotations, and model checkpoints remain local and are excluded from Git.

## Footage sources

All five files were obtained from Wikimedia Commons and are identified there as CC BY-SA 4.0. Preserve attribution and share-alike obligations if footage or derivatives are redistributed. Check the individual Commons file page for the uploader/creator attribution and current licensing metadata before publishing a demo or derivative dataset.

| Local filename | Commons source |
|---|---|
| `comet_goldfish_aquarium_2014.webm` | https://commons.wikimedia.org/wiki/File:Un_pez_dorado_en_un_acuario.webm |
| `comet_goldfish_mouth_2014.webm` | https://commons.wikimedia.org/wiki/File:Pez_de_colores_(Carassius_auratus).webm |
| `goldfish_hakone_2025.webm` | https://commons.wikimedia.org/wiki/File:Goldfish_in_a_bowl_-_Hakone_-_2025_Aug_1.webm |
| `goldfish_nagasaki_2023.webm` | https://commons.wikimedia.org/wiki/File:Goldfish-inatank-nagasaki-2023-Jan-27.webm |
| `goldfish_tierpark_2023.webm` | https://commons.wikimedia.org/wiki/File:Goldfische_(Tierpark_Bischofswerda).webm |

Local footage directory: `samples_real/public_goldfish_cc_by_sa/` (gitignored). A 79-frame extraction was used for the initial detector comparison.

## Baseline result

Matsya's existing classical detector reported zero tracks on all five clips in the first real-footage benchmark. This is a real failure on the selected public clips and should be retained as a negative result rather than hidden.

## Generic pretrained fish detector

A Fishial detector checkpoint was downloaded from the Fishial project. Its repository is MIT-licensed: https://github.com/Wye-Foundation/Fishial-Fish-Identification. The checkpoint archive metadata calls it a YOLO26 nano model, but Ultralytics 8.4.213 loads the checkpoint as **YOLO26m with 21,774,430 parameters**. Treat this as a model metadata discrepancy; do not describe it as nano. The checkpoint itself is not committed: it is large, and its separate weight redistribution terms have not been independently confirmed.

At 1-fps frame review, the generic detector proposed 158 boxes across 79 frames and had boxes in 78/79 frames. These are predictions, not hand-verified annotations.

## Pseudo-label training experiment

A five-epoch CPU transfer-learning experiment was run using 43 training frames / 48 boxes, 19 validation frames / 41 boxes, and 9 held-out test frames / 9 boxes. Splits were made by original source video to avoid adjacent-frame leakage:

- Train: both 2014 aquarium clips and Nagasaki 2023.
- Validation: Hakone 2025.
- Test: Tierpark 2023.

The annotations are high-confidence proposals from the generic fish detector; they are **pseudo-labels**, not independently hand-corrected ground truth. Training used 320-pixel images, batch size 1, 22 frozen layers, and five epochs. On the pseudo-labelled validation split, the best checkpoint reported P=0.722, R=0.696, mAP50=0.743, mAP50-95=0.484. On the pseudo-labelled test split, it reported P=0.753, R=0.778, mAP50=0.799, mAP50-95=0.464. These values measure agreement with the teacher's boxes and must not be presented as genuine goldfish detection accuracy.

Full-video inference at 5 fps using the fine-tuned pilot produced boxes on:

| Clip | Sampled frames | Frames with boxes | Box-frame rate |
|---|---:|---:|---:|
| Comet aquarium 2014 | 53 | 53 | 100.0% |
| Comet close-up 2014 | 51 | 51 | 100.0% |
| Hakone 2025 | 100 | 59 | 59.0% |
| Nagasaki 2023 | 124 | 124 | 100.0% |
| Tierpark 2023 | 54 | 17 | 31.5% |

Box-frame rate is not recall: no independent frame-by-frame ground truth was created. The pilot is not selected for integration into Matsya because performance is inconsistent on the harder clips.

## Reproduction

The scripts below were added to the repository:

- `scripts/train/train_public_goldfish_pilot.py` — CPU fine-tuning pilot.
- `scripts/train/infer_public_goldfish.py` — annotated MP4 generation.

They require the local verification environment with PyTorch, Ultralytics, OpenCV, and the external Fishial checkpoint. The frame extraction, pseudo-label builder, predictions, checkpoints, and annotated MP4s were kept under `.work/goldfish_dataset/` and are gitignored.

## Explicit limitations / next work

1. No independent human-annotated goldfish ground-truth set exists yet.
2. The generic detector is not proven to distinguish goldfish from other fish or fish-like reflections in every clip.
3. The fine-tuned pilot does not pass the project's learned-detector acceptance gate.
4. Do not advertise the pseudo-label metrics as model accuracy.
5. A future plan should prioritize a small, genuinely human-verified dataset and a suitable goldfish-specific model/evaluation protocol before further training.

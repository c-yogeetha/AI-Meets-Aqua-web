# Detector training handoff

This is the v5 fixed Open Images V7 training notebook. The learned detector is a parallel workstream and does not block tonight's classical-detector release.

## Run sequence

1. Open `matsya_detector_training.ipynb` in the dedicated hosted notebook session, signed in only with the burner Google identity. Do not open the inbox, personal Drive or unrelated account services, and do not mount personal storage.
2. Set a T4 GPU (or better) and keep the notebook tab in the foreground while it runs. The hosted runtime disconnects idle sessions.
3. Keep `SMOKE = True` first. Run all cells. The run is accepted only if it completes, prints `SMOKE OK`, exports the smoke bundle, and both candidates contain ONNX files with output layout `[1, 5, N]`.
4. Only after that smoke gate passes, set `SMOKE = False`, restart the runtime and run all cells again. The full run trains Candidate A (YOLOv8n, Goldfish only) and Candidate B (YOLOv8s, Goldfish plus generic Fish mapped to the same class).
5. Download `matsya_detector_bundle.zip` from the hosted runtime and put it in `training/outputs/` locally. Do not put datasets, checkpoints or training outputs in Git.

## Data and filtering

Open Images V7 human-annotated boxes are the only training labels. The five goldfish clips in `data/split.json`, the two TEST negative-control clips and all TUNE video frames are not used for model training in Round 1. Group boxes and depictions are skipped. Synthetic glare/bubble augmentation is limited to generated copies of training images.

The v2 notebook includes safe parsing for Open Images flags represented as booleans, numeric 1/0/-1 and strings. It prints a sample detection record, skip-reason counts and writes validation exceptions to `last_error.txt`.

## Box CPU reproduction record

The v5 M1 diagnostic was attempted on the Box with CPU-only PyTorch. Cell 1 initially failed because `/content` is not mounted there; the Box copy now uses a configurable `/tmp` workspace while Colab and Kaggle keep their platform workspaces. Cells 1–3 then executed. Cell 4 reached the Open Images V7 train split, downloaded its metadata and began loading the large annotations table; the Box OS killed the Python process at approximately 2.4 GiB RSS on a 3.8 GiB host with 115 MiB available. No dataset filtering result or smoke bundle was produced in the Box. This is an environment memory limit, not a successful CPU smoke test. Continue the actual smoke and full training on the T4 hosted runtime.

## Acceptance and licensing

Open Images validation metrics are in-distribution photo metrics, not video acceptance metrics. The learned detector is not eligible until blind human-labelled TEST evaluation is complete and the v5 gate passes: precision at least 0.85, recall at least 0.85, count exact-match at least 70%, and recall greater than the classical detector. The five goldfish TEST clips remain held out. Never tune thresholds on TEST frames.

Ultralytics tooling and pretrained starting weights have AGPL-3.0 obligations. The repository's owner must confirm the intended AGPL-3.0 distribution with the faculty guide before publishing trained weights.

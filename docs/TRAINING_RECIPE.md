# Classical-first goldfish detector training protocol

## Release policy

The shipped application uses the classical detector unless a learned detector has completed the documented hold-out evaluation gate. The presence of an ONNX file alone does not make it eligible.

Ultralytics is used only in an offline training environment. It is licensed under AGPL-3.0; it is not imported by the served application. Runtime inference is performed by the OpenCV DNN ONNX adapter in backend/app/analysis/tracks_onnx.py.

## Data requirements

Owner-provided clips must be copied into samples_real/ and described in benchmarks/labels.csv with filename,expected_fish,condition. Conditions are normal, stressed, or unknown. Hold-out separation is by source clip, not extracted frame. A source clip may never appear in both training and validation.

A general aquarium video, synthetic clip, or footage without a verified species/count label is not a goldfish training example. Licences must allow redistribution and be recorded in docs/DATA_LICENSES.md.

## Preparation and pseudo-labelling

The planned offline training workflow is:

1. Extract one frame per second from training clips and skip near-duplicate frames.
2. Generate candidate boxes independently with the classical detector and a permissively licensed open-vocabulary detector.
3. Keep only matching boxes at IoU >= 0.5. Put single-source proposals in a review queue, not the training set.
4. Review 200 randomly selected kept boxes. Do not train until observed precision is >= 90%; record the reviewed sample size and result.
5. Split by clip into train/validation; reserve all benchmarks/holdout.txt clips for final evaluation only.

## Training and export

Train single-class YOLOv8n offline at 640 px for up to 60 epochs, patience 15, with clip-level train/validation isolation. Export ONNX with opset 12. Record the training library/model version, source clips, licences, precision, recall, mAP50, and hold-out metrics in backend/models/goldfish.json.

The ONNX export must be checked through the production OpenCV DNN loader on 20 validation frames. Predictions must agree with the offline trainer within one box per frame.

## Evaluation gate

The learned model may become the default only when hold-out recall >= 0.90, precision >= 0.85, and hold-out frame hit-rate coverage is no more than 2 percentage points below the classical detector. The report must identify the number of hold-out clips. With fewer than five hold-out clips, results are indicative only.

No owner goldfish footage or goldfish labels were present during this work, so there is no trained model or learned-detector accuracy claim. The classical detector remains the default.

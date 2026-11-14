# Learned detector evaluation

**Decision: classical detector only.**

No owner goldfish footage, goldfish ground-truth labels, reviewed pseudo-label set, trained weights, or hold-out goldfish clips were supplied in the repository during this implementation pass. It would be invalid to report precision, recall, mAP, or model accuracy.

The runtime gate therefore requires a valid backend/models/goldfish.json evaluation record and an available ONNX file. When either is missing, malformed, non-finite, or below the thresholds, ANALYZER=auto selects the classical detector and /api/v1/system/status reports ONNX availability separately from eligibility and states the reason.

The general-aquarium CC0 stand-in is not represented as goldfish data and is not used for pseudo-labelling or model training.

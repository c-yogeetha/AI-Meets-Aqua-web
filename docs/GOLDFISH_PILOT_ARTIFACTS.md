# Goldfish pilot artifacts

The downloadable data bundle is published as a GitHub Release asset:

- Release: https://github.com/c-yogeetha/AI-Meets-Aqua-web/releases/tag/goldfish-pilot-v1
- Asset: `goldfish-pilot-data-v1.tar.gz`
- SHA-256: `2953399cad6141a2f8fc3099faed71e1fc6771eb8c063b72a31c2c9f7493f76b`

The bundle includes the five public goldfish source clips, the extracted YOLO-format image/pseudo-label dataset, contact sheets, and training metadata. Its README includes individual source attribution and license information.

## Model checkpoint availability

The Fishial code repository is MIT-licensed, but its maintainers have an open issue asking whether the separately hosted model weights are covered by that license: https://github.com/Wye-Foundation/Fishial-Fish-Identification/issues/11. Until redistribution permission is clear, this public repository does not mirror either the pretrained checkpoint or the fine-tuned checkpoint derived from it.

- Official pretrained checkpoint source: https://storage.googleapis.com/fishial-ml-resources/detector_v26_n3.zip
- The local fine-tuned pilot checkpoint is `best.pt` from the `public_goldfish_pseudo_label_pilot` run. It is not a validated goldfish detector and is not included in the public release.

See `GOLDFISH_PUBLIC_FOOTAGE_PILOT.md` for methodology, results, caveats, and reproduction scripts.

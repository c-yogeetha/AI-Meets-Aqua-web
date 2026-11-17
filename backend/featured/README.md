# Featured analysis snapshots

Each public entry belongs in its own directory: `backend/featured/<slug>/`.

Required files:
- `snapshot.json` — schema shown below;
- `annotated.mp4` — the analysed video with annotation overlay;
- `report.pdf` — matching downloadable report;
- `poster.jpg` — optional poster image.

The `snapshot.json` keys are `id`, `title`, `provenance`, `description`, `result`, and (for open-licence material) `creator`, `source_url`, `license`, and `attribution`. `provenance` is either `synthetic` or `open_licence`. The `result` object is a result snapshot using the backend result shape. The build labels synthetic content as a synthetic demonstration and open-licence material as “Open-licence clip, analysed by Matsya”. Open-licence clips may be included only when the pipeline demonstrably works on them. CC BY-SA items retain attribution and share-alike credits. Never copy raw source footage here unless it is separately approved for publication.

The static build reads these folders and bundles the PDF and annotated video into `dist/showcase/`. The live application does not read this directory.

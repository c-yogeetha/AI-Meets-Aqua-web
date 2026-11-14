# Third-party software, fonts and assets

## Application dependencies

- The application and its project-authored source files are licensed under MIT; see the repository `LICENSE` and `frontend/package.json` metadata.
- Production backend dependencies are listed in `backend/requirements.txt`. Development/test-only dependencies are listed in `backend/requirements-dev.txt`.
- Frontend direct and transitive dependencies are locked in `frontend/package-lock.json`.
- A dependency licence inventory was generated with `pip-licenses` (Python environment) and `license-checker` (npm dependency tree). The audit found no unknown licence entries after setting the frontend package metadata to MIT.

## Weak-copyleft / additional notices

The dependency inventory contains the following weak-copyleft notices, retained as dependencies rather than copied source code:

- `certifi` — MPL-2.0 (Python dependency).
- `axe-core` and `@axe-core/playwright` — MPL-2.0 (development/test accessibility tooling).
- `@img/sharp-libvips-linux-x64` — LGPL-3.0-or-later (transitive image-processing binary dependency).

These are recorded as weak-copyleft exceptions for review; their upstream licence texts and applicable notices govern their distribution. They are not relicensed under the project MIT licence. The npm `UNLICENSED` finding for the internal `frontend` package was corrected by declaring `MIT` in `frontend/package.json`.

## Fonts

- Geist and Geist Mono are by Vercel in collaboration with basement.studio and are distributed under SIL OFL 1.1. The full licence notice is included at `LICENSES/Geist-OFL-1.1.txt`.

## Media and datasets

- The general aquarium footage from Wikimedia Commons is CC0 1.0 Universal and is only a non-goldfish stand-in; its source and limitations are recorded in `docs/DATA_LICENSES.md`.
- Synthetic sample clips, generated trajectory demonstration rows, project-created screenshots/contact sheets, and project presentation/media assets are authored by Matsya Project Team and released under CC0 1.0 Universal for redistribution. Synthetic content must remain visibly labelled and must not be described as observed/live fish footage.
- `docs/DATA_LICENSES.md` maps assets to their source and licence. `LICENSES/CC0-1.0.txt` contains the CC0 legal code.

No paid API, hosted inference service, or key-gated dataset is part of the application. Ultralytics/YOLO tooling, if used, is restricted to offline training under AGPL-3.0; the served backend must not import it and uses OpenCV DNN for ONNX inference.

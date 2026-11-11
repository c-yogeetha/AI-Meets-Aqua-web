# Architectural & Design Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-11-11 | FastAPI + SQLite + local disk | Zero external services, runs fully offline on laptop, ideal for live demonstration |
| 2026-11-11 | Single worker thread pool | Video analysis is CPU heavy; sequential processing prevents starvation and race conditions |
| 2026-11-11 | Classical CV baseline | Delivers reliable, instant goldfish tracking without depending on external deep learning weights |
| 2026-11-11 | Rules in YAML (`rules.yaml`, `scoring.yaml`) | Transparent, easily auditable by biological domain experts, configurable thresholds |
| 2026-11-11 | Explicit result mode labelling | Ensures academic integrity: `baseline`, `mock`, or `external` are clearly distinguished |
| 2026-11-11 | Next.js 14 App Router + Tailwind CSS | Fast rendering, responsive underwater theme inspired by hackfest.dev, native SSR/SSG support |
| 2026-11-11 | Bundled ffmpeg via imageio-ffmpeg | Fedora system ffmpeg lacks libx264 encoder; bundled binary ensures browser-playable H.264 mp4 |

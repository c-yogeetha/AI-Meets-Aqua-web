# Architectural & Engineering Decisions (ADR)

This document captures the key architectural, technical, and engineering decisions made during the design and implementation of **AI Meets Aqua**, explaining the context, trade-offs, and rationale.

---

## ADR-01: FastAPI + SQLite Architecture

### Context
We needed a performant, reliable, lightweight backend framework capable of handling asynchronous video uploads, job polling, background execution, and fast relational persistence for a single-user evaluation environment.

### Decision
Use **FastAPI** with **SQLite** (via SQLAlchemy 2.0 and WAL mode).

### Rationale & Trade-offs
- **Simplicity & Zero Ops**: SQLite requires no external server setup, credentials, or daemon management. It stores everything cleanly in a single `aqua.db` file.
- **Async & OpenAPI**: FastAPI generates automatic, standard-compliant OpenAPI 3.1 schemas, powering our end-to-end type safety with `openapi-typescript`.
- **Concurrency Safeguards**: With WAL (Write-Ahead Logging), a busy timeout of 30s, and a single-worker background job executor, SQLite handles concurrent reads and serial writes without database locking issues.

---

## ADR-02: Single-Worker In-Memory Job Execution Queue

### Context
Video decoding, optical flow tracking, feature extraction, and video transcoding are CPU-intensive operations. Running multiple unconstrained analyses in parallel on a laptop could freeze the system or cause out-of-memory errors.

### Decision
Implement a single-worker FIFO background thread executor using Python's `concurrent.futures.ThreadPoolExecutor(max_workers=1)`.

### Rationale & Trade-offs
- Prevents resource exhaustion on standard hardware.
- Predictable execution order and stage progression.
- Jobs are tracked in the database with timestamps and status codes (`queued`, `processing`, `completed`, `failed`), allowing the frontend to poll `/api/v1/jobs/{id}` at 1.5s intervals.

---

## ADR-03: Classical Computer Vision Baseline vs. Deep Learning Adapter

### Context
The user and AI/ML research team requested an end-to-end operational system immediately, while deep learning models (YOLOv8, 3D CNNs) remain in training by the AI group.

### Decision
Provide three distinct analyzer engines selected via the `ANALYZER` environment variable:
1. `baseline` (Default): Fully functioning classical computer vision pipeline using HSV color segmentation (orange/gold goldfish tones), morphological filtering, centroid-based tracking, and optical flow kinematics.
2. `mock`: High-speed synthetic generator using deterministic math curves for rapid UI development and CI testing.
3. `external`: Dynamic adapter loading an external Python module (`AI_MODULE`, e.g., `ai.pipeline`) implementing the model contract.

### Rationale & Trade-offs
- Guarantees evaluators can upload any real goldfish tank video today and receive a genuine, real-time stress analysis without waiting for trained weights.
- Completely decouples web application development from AI research timelines.

---

## ADR-04: Declarative YAML Rules Engine for Stress Assessment & Suggestions

### Context
Fish ethology research provides specific thresholds for swimming speed (Body Lengths/sec), angular velocity, water surface gasp ratios, and bottom freezing. Hardcoding these numbers inside python logic would make tuning difficult and impede scientific citation.

### Decision
Declare all behavioral thresholds, scoring formulas, and veterinary suggestions in `backend/app/analysis/rules.yaml`.

### Rationale & Trade-offs
- **Non-Programmer Friendly**: Aquatic biologists and veterinary judges can inspect, cite, and adjust behavioral thresholds in plain English.
- **Traceable Attribution**: Every generated suggestion cites a scientific guideline or research paper (e.g., Martins et al., Huntingford et al.).

---

## ADR-05: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons

### Context
The presentation requires an intuitive interface, inspired by modern design sensibilities (deep ocean theme, high contrast, smooth transitions, depth meters, and full responsiveness).

### Decision
Use **Next.js 14** (App Router) with **Tailwind CSS 3.4**, React Query (@tanstack/react-query), and Lucide React icons.

### Rationale & Trade-offs
- Full SSR/SSG capabilities with zero-client footprint where possible.
- Design tokens defined directly in Tailwind (`abyss #04141F`, `deep #062B3D`, `ocean #0B5C73`, `aqua #3DD6D0`, `foam #CFF5F2`, `gold #FF8A1F`).
- Built offline-first: uses system font fallbacks (`--font-inter`, `--font-fraunces`) to guarantee fast builds even in air-gapped or network-restricted environments.

---

## ADR-06: Honest Labelling Principle

### Context
Evaluation committees frown upon synthetic data presented as real, or classical algorithms masquerading as proprietary deep learning networks.

### Decision
Every analysis result payload includes an immutable `"mode"` field (`"baseline"`, `"mock"`, or `"external"`). The UI visually renders this with distinct badges:
- **Baseline**: Clean indicator displaying classical CV detection.
- **Mock**: Visible Amber badge labeled **"Demo data"** with an explanatory tooltip.
- **External**: Highlights external neural network inference.

### Rationale & Trade-offs
Establishes trust with evaluators, maintains scientific integrity, and transparently communicates system capabilities.

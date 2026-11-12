# Matsya Quality Assurance & Acceptance Checklist

This checklist provides a structured, step-by-step verification protocol for evaluating the Matsya platform release.

---

## 1. Environment Verification

1. **Prerequisites Check**:
   - Python: 3.12+ (`python3 --version`)
   - Node.js: 20+ (`node --version`)
   - Poppler Utilities: `pdftoppm -v`
   - FFmpeg: `ffmpeg -version`
2. **Launch Stack**:
   - For local development: `./scripts/dev.sh`
   - Or production container stack: `cd deploy && docker compose -f docker-compose.prod.yml up -d`
3. **Liveness Check**:
   - Backend: `curl -i http://localhost:8000/health` (HTTP 200 `{"status":"ok","version":"1.0.0"}`)
   - Frontend: Visit `http://localhost:3000` in Google Chrome or Chromium.

---

## 2. Public Editorial Pages Verification

- [ ] **Home Page (`/`)**:
  - Hero displays "Matsya" typography and cinematic taglines.
  - Interactive Dive Log and depth meter respond smoothly to page scrolling.
  - FAQ accordion expands and collapses cleanly without layout shifts.
  - No broken images, placeholder text, or emoji characters visible.
- [ ] **Science Page (`/science`)**:
  - Explains the tri-cue fused classical computer vision pipeline (MOG2 + hue clustering + watershed splitting).
  - Documents kinematic feature formulations: normalized speed (BL/s), angular deviation frequency, surface gasping ratio ($R_{surf}$), and bottom resting ratio ($R_{bot}$).
  - Scientific limitations callout prominently states this is an observational decision-support tool, not a clinical pathology diagnosis.
- [ ] **How It Works (`/how-it-works`)**:
  - Step-by-step breakdown: Video Ingestion, Quality Probe, Segmentation, Tracking, Scoring, and Reporting.
  - Interactive stage stepper highlights requirements for side/front camera elevation angles.
- [ ] **About Page (`/about`)**:
  - Documents development timeline across problem survey, synthetic dataset creation, quality probing, and production hardening.
  - Institutional attribution accurately reflects Atria Institute of Technology, Department of Computer Science & Engineering.
- [ ] **Resource Catalog (`/resources`)**:
  - Left filter rail filters items by category (`literature`, `footage`, `datasets`, `models`, `experiments`, `design`, `presentations`).
  - Search input filters cards dynamically by title and tag keywords.
  - Clicking a resource opens the sliding preview drawer:
    - PDF resources render first-page thumbnail and PDF embed.
    - Video clips stream with HTTP 206 Range playback.
    - CSV files display tabular data preview (first 50 rows).
  - Safe download button triggers file download with RFC 5987 Unicode attachment headers.
- [ ] **Empirical Validation Page (`/validation`)**:
  - Tab 1 (Software Tests): Displays total tests (131+), 100% pass rate, category breakdown bars, and searchable test case table.
  - Tab 2 (Detection Benchmark): Transparently displays honest empty state ("Benchmark not yet run on real footage") explaining that synthetic simulations are not misrepresented as real-world metrics.
  - Tab 3 (Supported Conditions Envelope): Documents physical tank boundaries (lighting, turbidity, camera angles, stocking density).

---

## 3. Application Shell & Workflow Verification (`/app/*`)

- [ ] **Tank Management (`/app/tanks`)**:
  - Click "New Tank" to open the creation modal.
  - Create tank: Name "Main Aquarium", Volume "60 L", Fish Count "3", Water Temp "22 C". Verify HTTP 201 response.
  - Tank profile card displays volume, fish count, and configured parameters.
  - Edit tank details; verify update reflects immediately.
- [ ] **Video Ingestion & Quality Probe (`/app/analyse`)**:
  - Select tank profile from dropdown.
  - Drag and drop a valid MP4 video clip (e.g. `samples/calm.mp4`).
  - Verify XHR upload progress bar advances monotonically.
  - Quality probe evaluates sharpness, brightness, contrast, and stability.
  - Click "Start Analysis". Verify immediate redirection to `/app/jobs/{id}`.
- [ ] **Job Queue Stepper (`/app/jobs/{id}`)**:
  - Stepper sequentially advances through pipeline stages:
    1. Video Validation & Orientation Normalization
    2. Fish Segmentation (Tri-Cue Detector)
    3. Multi-Object Tracking & Watershed Separation
    4. Kinematic Stress Scoring & Rules Evaluation
    5. Video Rendering & PDF Compilation
  - Upon 100% completion, automatically redirects to `/app/results/{id}`.
- [ ] **Results Dashboard (`/app/results/{id}`)**:
  - Radial Stress Gauge displays animated score and category level (Normal, Moderate, or High).
  - Video Player streams annotated playback with synchronized bounding boxes.
  - Click on any timestamp on the Stress Timeline chart: video player seeks directly to that exact moment.
  - Individual Fish inspection cards display swimming speed (BL/s), turn frequency, and vertical column distribution.
  - Automated tank care suggestions display actionable recommendations.
  - Quality Reliability Badge shows confidence score (0-100) with transparent explanation notes.
- [ ] **PDF Report Export**:
  - Click "Download PDF" on the result page or `/app/reports`.
  - PDF generates within 4 to 8 seconds using bundled ReportLab and TrueType fonts (`DejaVuSans`).
  - Filename matches RFC 5987 standard `matsya-report-<job_id>.pdf`.
  - PDF opens cleanly in Adobe Acrobat, Chrome, and Preview with zero font missing glyph errors.
- [ ] **History & Recycle Bin (`/app/history`)**:
  - History table lists all previous analyses with tank names, scores, and dates.
  - Click "Delete" on an analysis: confirms soft-delete into the Recycle Bin.
  - Switch to the "Recycle Bin" tab: verify deleted item displays 7-day retention countdown.
  - Click "Restore": item returns immediately to the active history list.
- [ ] **Longitudinal Insights (`/app/insights`)**:
  - Select a tank profile with multiple analyses.
  - Fleet Stress Index (FSI) displays exponentially weighted average score.
  - Longitudinal trend indicator displays direction (`improving`, `worsening`, `stable`).
- [ ] **Alerts Center (`/app/alerts`)**:
  - Displays high-stress notifications triggered by analyses exceeding severity thresholds.
  - "Mark Read" and "Mark All Read" update alert states immediately.
- [ ] **System Settings & Diagnostics (`/app/settings`)**:
  - System diagnostics panel verifies API health, disk storage, and database WAL mode.
  - Email notification toggles persist user preferences.
  - Data retention summary documents automated cleanup policy.

---

## 4. Multi-Tenant Cookie Scoping Verification

1. Open an Incognito window:
   - Create a tank "Incognito Tank".
   - Notice that previously created tanks from the regular session are hidden (multi-tenant anonymous owner cookie `matsya_oid`).
2. Attempting to directly navigate to another owner's result URL returns HTTP 404 Not Found.
3. Setting `SINGLE_USER_MODE=1` merges views for single-operator facility deployments.

---

## 5. Automated Verification Script

Run the automated one-command verification suite:

```bash
./scripts/verify_all.sh
```

Expected output:
- Footprint Scanner: **PASS** (Zero AI assistant names or forbidden vendor strings)
- Claims & Tone Audit: **PASS** (Zero unbacked marketing claims, Zero emoji codepoints)
- Sample Benchmark Generator: **PASS**
- Backend Pytest & Line Coverage: **PASS** (131/131 passing, >= 85% coverage)
- OpenAPI Contract & TypeScript Types: **PASS** (Zero drift between schema, docs, and types)
- Frontend Static Analysis: **PASS** (Zero TypeScript compiler errors, zero ESLint warnings, 23/23 static pages compiled)
- Playwright Browser E2E: **PASS**
- Detection Benchmark: **PASS**
- Production Local Smoke Stack: **PASS**
- Test Report Aggregation: **PASS**

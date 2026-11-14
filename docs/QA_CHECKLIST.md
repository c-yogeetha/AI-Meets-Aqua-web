# Matsya Quality Assurance & Acceptance Checklist

This checklist separates automated evidence from owner-side deployment acceptance. An unchecked item is not considered passed.

## 1. Environment and startup

- [ ] Python 3.12+, Node.js 20+, FFmpeg and Poppler are installed.
- [ ] Backend health: `curl -i http://localhost:8000/health` returns HTTP 200.
- [ ] Frontend loads at `http://localhost:3000`.
- [ ] Production Compose configuration validates with `docker compose -f deploy/docker-compose.prod.yml config`.

## 2. Public pages

- [ ] `/`: hero, primary CTA, FAQ and reduced-motion behaviour work.
- [ ] `/science`: scoring rules and non-validation limitations are clear.
- [ ] `/how-it-works`: pipeline stages and detector mode are accurately described.
- [ ] `/about`: team/institution attribution and milestones are accurate.
- [ ] `/resources`: search, filters, preview, downloads and media playback work.
- [ ] `/validation`: software test results are distinguished from the unlabelled aquarium stand-in benchmark; goldfish accuracy is shown as not measured.

## 3. Application workflows (`/app/*`)

- [ ] `/app/tanks`: create, edit and delete a tank; verify persistence.
- [ ] `/app/analyse`: upload a valid sample clip; verify upload progress and queue creation.
- [ ] `/app/jobs/{id}`: processing stages progress and a completed job reaches its result.
- [ ] `/app/results/{id}`: score, reliability reasons, fish rows, annotated video and key moments render.
- [ ] PDF export downloads without navigating away; open the file and verify its contents.
- [ ] `/app/history`: filter analyses, soft-delete an item, restore it from the recycle bin.
- [ ] `/app/insights`: verify trends against the available analysis history.
- [ ] `/app/alerts`: mark one/all alerts read.
- [ ] `/app/settings`: verify diagnostics and persisted settings.

## 4. Isolation and safety

- [ ] In a second browser profile, create an independent tank and verify the first profile's private results/media are inaccessible.
- [ ] Corrupt, empty, dark, shaky, fish-less and wrong-type footage produces a clear outcome, not fabricated analysis.
- [ ] The stress indicator is consistently labelled as rule-based and not expert-validated.
- [ ] Synthetic/mock data is visibly labelled.

## 5. Browser download and responsive acceptance

- [ ] Chromium: PDF download event, valid PDF bytes and parseable pages.
- [ ] Chromium: Unicode and long tank names produce a readable PDF.
- [ ] Chromium: annotated media responds to range requests with HTTP 206.
- [ ] Owner test: Safari on iPhone downloads and opens a PDF.
- [ ] Owner test: Chrome on Android downloads and opens a PDF.
- [ ] Owner test: slow-network upload/download remains recoverable.
- [ ] Check widths 1440, 1024, 768 and 390 px; no horizontal overflow or overlapping controls.
- [ ] Keyboard-only workflow and reduced-motion behaviour are checked.

## 6. Automated verification

Run:

```bash
./scripts/verify_all.sh
```

Latest separately recorded local evidence (14 Nov 2026):

- Backend: 134 collected; 133 passed, 0 failed, 1 skipped.
- Backend line coverage: 88.4%.
- Ruff: all checks passed after the scoped source fixes.
- Frontend: clean `npm ci`, TypeScript, lint and production build passed; two `<img>` optimization warnings remain.
- Chromium Playwright: 42 passed, 0 failed, 0 skipped, 0 flaky.
- Combined generated report: 176 cases; 175 passed, 0 failed, 1 skipped. Backend coverage is reported separately.
- Footprint scanner and claims audit: passed.
- Caddy config and Docker Compose config: validated.

These results do not mean the full `verify_all.sh` script passed. Container build/runtime, backup/restore, ARM64, three consecutive full verification runs and owner-host deployment remain open acceptance items.

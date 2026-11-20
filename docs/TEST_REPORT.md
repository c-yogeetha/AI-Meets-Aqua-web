# Matsya - Test Verification Report

**Generated:** 2026-11-20T05:26:57.201289+00:00
**Environment:** Linux 6.19.10-300.fc44.x86_64 | Python 3.14.3 | Node unknown
**Git Commit:** `b0dd36c7d9`
**All P0 cases passing:** **yes**  

## 1. Executive Summary

| Metric | Result | Target | Status |
|---|---|---|---|
| **Total Tests** | 196 | >= 90 | PASS |
| **Passed** | 196 | 100% of P0 | PASS |
| **Failed** | 0 | 0 | PASS |
| **Backend Line Coverage** | 86.5% | >= 80% | PASS |

## 2. Category Pass Rates

| Category | Prefix | Total | Passed | Pass Rate |
|---|---|---|---|---|
| System & Health | `B-H` | 7 | 7 | 100.0% |
| Tank Management | `B-T` | 10 | 10 | 100.0% |
| Upload & Validation | `B-U` | 10 | 10 | 100.0% |
| Job Lifecycle & Recovery | `B-J` | 8 | 8 | 100.0% |
| Feature Extraction Kinematics | `B-F` | 9 | 9 | 100.0% |
| Stress Scoring Rules | `B-S` | 22 | 22 | 100.0% |
| Actionable Suggestions | `B-G` | 6 | 6 | 100.0% |
| Video Analysis Integration | `B-A` | 21 | 21 | 100.0% |
| Results Verification | `B-R` | 9 | 9 | 100.0% |
| Media Streaming & Encoding | `B-M` | 3 | 3 | 100.0% |
| PDF Report Packaging | `B-PDF` | 10 | 10 | 100.0% |
| PDF Generation Legacy | `B-P` | 13 | 13 | 100.0% |
| Historical Analyses | `B-HI` | 2 | 2 | 100.0% |
| Tank Insights & FSI | `B-IN` | 3 | 3 | 100.0% |
| Recycle Bin Retention | `B-BN` | 3 | 3 | 100.0% |
| Alert System & Notification | `B-AL` | 1 | 1 | 100.0% |
| Demo Seeding Engine | `B-D` | 1 | 1 | 100.0% |
| External AI Adapter | `B-X` | 4 | 4 | 100.0% |
| Owner Scoping & Isolation | `B-OWN` | 3 | 3 | 100.0% |
| Data Retention & Cleanup | `B-RET` | 2 | 2 | 100.0% |
| Resource Catalog & Endpoints | `B-RES` | 4 | 4 | 100.0% |
| Environment & Report Integrity | `B-ENV` | 1 | 1 | 100.0% |
| Preprocessing | `B-PP` | 2 | 2 | 100.0% |
| OpenAPI Schema Contract | `B-CT` | 1 | 1 | 100.0% |
| End-to-End User Workflows | `E-` | 43 | 43 | 100.0% |

## 3. Detailed Case Results

| Case ID | Suite | Title | Status | Duration (s) |
|---|---|---|---|---|
| `B-A01` | backend | a01 to a11 and a12 manifest samples | Passed | 144.598s |
| `B-A04` | backend | a04 surface gasping views | Passed | 13.916s |
| `B-A05` | backend | a05 isolated bottom | Passed | 6.821s |
| `B-A06` | backend | a06 lethargic all | Passed | 6.682s |
| `B-A07` | backend | a07 white fish | Passed | 6.873s |
| `B-A08` | backend | a08 two fish overlap | Passed | 6.696s |
| `B-A09` | backend | a09 plants decoy | Passed | 6.945s |
| `B-A10` | backend | a10 blank video | Passed | 5.676s |
| `B-A13` | backend | a13 determinism | Passed | 13.619s |
| `B-A14` | backend | a14 annotated video faststart | Passed | 6.799s |
| `B-A15` | backend | a15 webm option | Passed | 14.046s |
| `B-A16` | backend | a16 keyframes | Passed | 6.96s |
| `B-A17` | backend | a17 low confidence fish never stressed | Passed | 0.01s |
| `B-A18` | backend | a18 reliability arithmetic | Passed | 0.007s |
| `B-A19` | backend | a19 quality metrics synthetic frames | Passed | 0.021s |
| `B-A20` | backend | a20 dominant color model learning | Passed | 0.007s |
| `B-A21` | backend | a21 watershed splitting | Passed | 0.007s |
| `B-A22` | backend | a22 template retention | Passed | 0.007s |
| `B-A24` | backend | a24 performance budget | Passed | 6.859s |
| `B-PP` | backend | pp preprocessor never mutates original and respects disabled mode | Passed | 0.01s |
| `B-PP` | backend | pp glare mask detects bright low saturation region | Passed | 0.013s |
| `B-CT01` | backend | ct01 openapi contract no drift | Passed | 0.192s |
| `B-ENV02` | backend | env02 published report matches latest pytest run | Passed | 0.057s |
| `B-test_real_` | backend | test real detector modes are not marked validated[baseline] | Passed | 0.011s |
| `B-test_real_` | backend | test real detector modes are not marked validated[onnx] | Passed | 0.007s |
| `B-test_mock_` | backend | test mock mode is explicitly synthetic | Passed | 0.005s |
| `B-F01` | backend | f01 speed on straight track | Passed | 0.008s |
| `B-F02` | backend | f02 direction change rate | Passed | 0.008s |
| `B-F03` | backend | f03 surface ratio | Passed | 0.008s |
| `B-F04` | backend | f04 bottom ratio and inactivity | Passed | 0.008s |
| `B-F05` | backend | f05 isolation ratio | Passed | 0.009s |
| `B-F06` | backend | f06 single fish isolation | Passed | 0.008s |
| `B-F07` | backend | f07 track with gaps | Passed | 0.008s |
| `B-F08` | backend | f08 zero fish | Passed | 0.007s |
| `B-F20` | backend | f20 explanation sentence | Passed | 0.005s |
| `B-OWN01` | backend | own01 two cookies scoping | Passed | 0.063s |
| `B-OWN02` | backend | own02 another owner media pdf 404 | Passed | 0.712s |
| `B-OWN03` | backend | own03 single user mode and cookie attributes | Passed | 0.116s |
| `B-RET01` | backend | ret01 raw upload deleted after success | Passed | 0.021s |
| `B-RET02` | backend | ret02 retention purge removes old outputs except demo | Passed | 0.02s |
| `B-J05` | backend | j05 back to back queue position | Passed | 0.031s |
| `B-J06` | backend | j06 cancel queued and running jobs | Passed | 0.022s |
| `B-A23` | backend | a23 onnx decode nms canned tensor | Passed | 0.007s |
| `B-H01` | backend | h01 health check | Passed | 0.016s |
| `B-H02` | backend | h02 system info | Passed | 0.033s |
| `B-H03` | backend | h03 cors preflight | Passed | 0.017s |
| `B-H04` | backend | h04 openapi endpoints | Passed | 0.091s |
| `B-H05` | backend | h05 unknown route | Passed | 0.027s |
| `B-HI01` | backend | hi01 history paging and filtering | Passed | 0.626s |
| `B-HI02` | backend | hi02 history excludes deleted | Passed | 0.507s |
| `B-IN01` | backend | in01 fsi weighted mean | Passed | 0.131s |
| `B-IN02` | backend | in02 trend labels | Passed | 0.054s |
| `B-IN03` | backend | in03 temperature pattern message | Passed | 0.033s |
| `B-BN01` | backend | bn01 and bn02 delete and restore | Passed | 0.62s |
| `B-BN03` | backend | bn03 and bn04 purge retention | Passed | 0.515s |
| `B-BN05` | backend | bn05 permanent delete | Passed | 0.554s |
| `B-AL01` | backend | al01 to al04 alerts | Passed | 7.088s |
| `B-D01` | backend | d01 demo seed idempotent | Passed | 0.516s |
| `B-X01` | backend | x01 external detect and track | Passed | 1.024s |
| `B-X03` | backend | x03 missing ai module | Passed | 0.52s |
| `B-X02` | backend | x02 external analyze video | Passed | 0.392s |
| `B-X04` | backend | x04 malformed ai output | Passed | 0.377s |
| `B-J01` | backend | j01 and j02 lifecycle and monotonic | Passed | 1.732s |
| `B-J03` | backend | j03 failure path | Passed | 0.212s |
| `B-J04` | backend | j04 unknown job | Passed | 0.065s |
| `B-J05` | backend | j05 timeout | Passed | 1.358s |
| `B-J06` | backend | j06 startup recovery | Passed | 0.025s |
| `B-J07` | backend | j07 sequential processing | Passed | 3.306s |
| `B-test_model` | backend | test models dir environment setting controls detector discovery | Passed | 0.013s |
| `B-test_broke` | backend | test broken model in configured directory falls back to classical | Passed | 0.014s |
| `B-test_onnx_` | backend | test onnx gate uses v5 independent evaluation thresholds | Passed | 0.011s |
| `B-test_noteb` | backend | test notebook reads open images ground truth field by default | Passed | 0.191s |
| `B-test_strin` | backend | test string zero and unknown minus one flags are not truthy | Passed | 0.016s |
| `B-test_true_` | backend | test true group flag skips the entire image | Passed | 0.008s |
| `B-test_wrong` | backend | test wrong sample field is reported as skip | Passed | 0.007s |
| `B-test_candi` | backend | test candidate b keeps 400 image gate when goldfish only is small | Passed | 0.006s |
| `B-PDF01` | backend | pdf01 pdf sample download | Passed | 0.611s |
| `B-PDF02` | backend | pdf02 unicode and unusual tank names | Passed | 0.768s |
| `B-PDF03` | backend | pdf03 zero fish result | Passed | 0.138s |
| `B-PDF04` | backend | pdf04 missing key frames on disk | Passed | 0.13s |
| `B-PDF05` | backend | pdf05 error statuses | Passed | 0.15s |
| `B-PDF06` | backend | pdf06 caching and invalidation | Passed | 0.294s |
| `B-PDF07` | backend | pdf07 timeout returns 503 | Passed | 0.034s |
| `B-PDF08` | backend | pdf08 no emoji in extracted text | Passed | 0.135s |
| `B-PDF09` | backend | pdf09 pdf metadata | Passed | 0.127s |
| `B-PDF10` | backend | pdf10 generation performance | Passed | 0.13s |
| `B-test_corne` | backend | test corner lock on generated frame is implausible | Passed | 0.008s |
| `B-test_movin` | backend | test moving goldfish sized track is not rejected | Passed | 0.008s |
| `B-test_low_c` | backend | test low colour track triggers the documented rule | Passed | 0.009s |
| `B-test_impla` | backend | test implausible track forces reliability low | Passed | 0.005s |
| `B-RES01` | backend | res01 ingestion fixtures | Passed | 0.572s |
| `B-RES02` | backend | res02 idempotency preserves overrides | Passed | 0.568s |
| `B-RES03` | backend | res03 resource endpoints | Passed | 0.162s |
| `B-RES04` | backend | res04 large video preview | Passed | 0.357s |
| `B-R01` | backend | r01 result before done | Passed | 0.032s |
| `B-R02` | backend | r02 result finished | Passed | 0.506s |
| `B-R03` | backend | r03 unknown result | Passed | 0.026s |
| `B-M01` | backend | m01 video range request | Passed | 0.504s |
| `B-M02` | backend | m02 frame endpoint | Passed | 0.62s |
| `B-M03` | backend | m03 frame path traversal | Passed | 0.492s |
| `B-P01` | backend | p01 pdf report | Passed | 0.606s |
| `B-S01` | backend | s01 level from score[0-Normal] | Passed | 0.006s |
| `B-S01` | backend | s01 level from score[34-Normal] | Passed | 0.005s |
| `B-S01` | backend | s01 level from score[35-Moderate] | Passed | 0.005s |
| `B-S01` | backend | s01 level from score[59-Moderate] | Passed | 0.005s |
| `B-S01` | backend | s01 level from score[60-High] | Passed | 0.005s |
| `B-S01` | backend | s01 level from score[100-High] | Passed | 0.005s |
| `B-S02` | backend | s02 fish score sum and clamp | Passed | 0.007s |
| `B-S03` | backend | s03 stressed threshold | Passed | 0.007s |
| `B-S04` | backend | s04 tank formula max plus spread | Passed | 0.007s |
| `B-S05` | backend | s05 tank formula mean max blend | Passed | 0.005s |
| `B-S06` | backend | s06 top view disables vertical flags | Passed | 0.009s |
| `B-S07` | backend | s07 lethargic all fish inactive | Passed | 0.008s |
| `B-S08` | backend | s08 configurable threshold | Passed | 0.007s |
| `B-S09` | backend | s09 timeline windows | Passed | 0.013s |
| `B-G01` | backend | g01 all flags have rules and ordered | Passed | 0.009s |
| `B-G02` | backend | g02 fish placeholder replacement | Passed | 0.009s |
| `B-G03` | backend | g03 context rules | Passed | 0.009s |
| `B-G04` | backend | g04 all clear when no flags | Passed | 0.009s |
| `B-G05` | backend | g05 rules yaml schema | Passed | 0.009s |
| `B-G06` | backend | g06 safe condition evaluator | Passed | 0.006s |
| `B-SYS01` | backend | sys01 system status | Passed | 0.02s |
| `B-SYS02` | backend | sys02 scoring config | Passed | 0.024s |
| `B-SYS03` | backend | sys03 overview seeded data | Passed | 0.509s |
| `B-SYS04` | backend | sys04 docs and openapi urls | Passed | 0.092s |
| `B-SYS05` | backend | sys05 trailing slash 404 not 307 | Passed | 0.028s |
| `B-SYS06` | backend | sys06 timestamps end with z | Passed | 0.503s |
| `B-SYS07` | backend | sys07 media urls root relative | Passed | 0.591s |
| `B-SYS08` | backend | sys08 error envelopes | Passed | 0.03s |
| `B-T01` | backend | t01 create tank valid | Passed | 0.022s |
| `B-T02` | backend | t02 invalid tanks[bad payload0] | Passed | 0.019s |
| `B-T02` | backend | t02 invalid tanks[bad payload1] | Passed | 0.024s |
| `B-T02` | backend | t02 invalid tanks[bad payload2] | Passed | 0.019s |
| `B-T02` | backend | t02 invalid tanks[bad payload3] | Passed | 0.019s |
| `B-T02` | backend | t02 invalid tanks[bad payload4] | Passed | 0.022s |
| `B-T03` | backend | t03 list tanks | Passed | 0.033s |
| `B-T04` | backend | t04 get tank 404 | Passed | 0.022s |
| `B-T05` | backend | t05 delete tank cascades | Passed | 0.037s |
| `B-T06` | backend | t06 tank name special characters | Passed | 0.022s |
| `B-U01` | backend | u01 valid upload | Passed | 0.055s |
| `B-U02` | backend | u02 unknown tank id | Passed | 0.032s |
| `B-U03` | backend | u03 wrong extension | Passed | 0.073s |
| `B-U04` | backend | u04 not a video | Passed | 0.043s |
| `B-U05` | backend | u05 oversize | Passed | 0.049s |
| `B-U06` | backend | u06 duration limit | Passed | 0.068s |
| `B-U07` | backend | u07 path traversal filename | Passed | 0.069s |
| `B-U08` | backend | u08 missing fields | Passed | 0.03s |
| `B-U09` | backend | u09 invalid view and temp | Passed | 0.055s |
| `B-U10` | backend | u10 optional fields saved | Passed | 0.068s |
| `B-NORM01` | backend | norm01 compliant file untouched | Passed | 0.107s |
| `B-NORM02` | backend | norm02 4k scaled to max 1280 | Passed | 4.049s |
| `B-NORM03` | backend | norm03 portrait rotation handled | Passed | 1.039s |
| `B-NORM04` | backend | norm04 corrupt rejected cleanly | Passed | 0.025s |
| `E-APP01` | e2e-chromium | E-APP01: Overview renders with summary strip, tank cards, and navigation | Passed | 1.351s |
| `E-APP02` | e2e-chromium | E-APP02: Tank CRUD: create, edit, and delete with confirm | Passed | 1.744s |
| `E-APP03` | e2e-chromium | E-APP03: Complete analyse flow with calm.mp4 finishes with score, gauge, and PDF button | Passed | 32.703s |
| `E-APP04` | e2e-chromium | E-APP04: Invalid file type and oversized upload show inline errors without hang | Passed | 0.751s |
| `E-APP05` | e2e-chromium | E-APP05: Simulated failure hook shows failure panel and retry button | Passed | 1.174s |
| `E-APP08` | e2e-chromium | E-APP08: Results timeline and key moments click seeks video | Passed | 0.967s |
| `E-APP10` | e2e-chromium | E-APP10: History filters, delete, bin tab, and restore | Passed | 1.849s |
| `E-APP11` | e2e-chromium | E-APP11: Insights displays FSI value, trend chart, and formula explanation | Passed | 0.952s |
| `E-APP12` | e2e-chromium | E-APP12: Alerts displays list, filter, and mark all read | Passed | 0.584s |
| `E-APP13` | e2e-chromium | E-APP13: Settings persists toggles after reload and shows system diagnostics | Passed | 0.983s |
| `E-APP16` | e2e-chromium | E-APP16: Result error states: 404 and 410 deleted | Passed | 1.889s |
| `E-01` | e2e-chromium | E-01: Homepage loads and renders its primary CTA | Passed | 0.736s |
| `E-02` | e2e-chromium | E-02: Public hero rendered with primary Try Now action opening in new tab | Passed | 1.5s |
| `E-03` | e2e-chromium | E-03: Floating pill navigation Try Now opens application in new tab | Passed | 1.38s |
| `E-04` | e2e-chromium | E-04: Solution pipeline exposes 6 core processing stages | Passed | 0.757s |
| `E-05` | e2e-chromium | E-05: Tank form validates empty names on the current route | Passed | 0.771s |
| `E-06` | e2e-chromium | E-06: Tank creation succeeds on the current route | Passed | 0.948s |
| `E-07` | e2e-chromium | E-07: Reduced motion skips the intro loader | Passed | 0.798s |
| `E-08` | e2e-chromium | E-08: Unknown route shows the not-found page | Passed | 0.891s |
| `E-09` | e2e-chromium | E-09: Homepage has no critical accessibility violations | Passed | 2.325s |
| `E-DL01` | e2e-chromium | E-DL01: Click Download PDF triggers browser download with valid file and no navigation | Passed | 1.407s |
| `E-DL02` | e2e-chromium | E-DL02: Tank names in Devanagari, emoji and 120 characters download valid PDF | Passed | 0.996s |
| `E-DL03` | e2e-chromium | E-DL03: Server error shows error toast, does not navigate, re-enables button | Passed | 1.267s |
| `E-DL05` | e2e-chromium | E-DL05: Media elements on result page respond 200 or 206 | Passed | 1.104s |
| `E-HOME01` | e2e-chromium | E-HOME01: Loader appears once per session and disappears; second visit skips; reduced motion skips | Passed | 1.547s |
| `E-HOME02` | e2e-chromium | E-HOME02: Hero text, CTA links, and redesigned hero structure | Passed | 0.767s |
| `E-HOME03` | e2e-chromium | E-HOME03: Dynamic system status and scoring telemetry from API | Passed | 0.623s |
| `E-HOME04` | e2e-chromium | E-HOME04: Solution pipeline links to how-it-works chapters | Passed | 0.579s |
| `E-HOME05` | e2e-chromium | E-HOME05: Detector status matches system status API | Passed | 0.742s |
| `E-HOME06` | e2e-chromium | E-HOME06: Historical recordings and dynamic metrics render | Passed | 0.571s |
| `E-HOME07` | e2e-chromium | E-HOME07: Drive link behavior when unset vs set | Passed | 0.744s |
| `E-NAV01` | e2e-chromium | E-NAV01: Public pill nav reaches pages; active state correct; mobile drawer behaves correctly | Passed | 0.98s |
| `E-QA01` | e2e-chromium | E-QA01: Viewport responsive test and no horizontal overflow | Passed | 2.152s |
| `E-PDF` | e2e-chromium | E-PDF-01: sample result downloads a parseable PDF | Passed | 1.126s |
| `E-PDF` | e2e-chromium | E-PDF-02: result PDF endpoint sends safe attachment headers | Passed | 0.138s |
| `E-SCI01` | e2e-chromium | E-SCI01: /science shows rules table from API, anchors work, and formulas visible | Passed | 0.427s |
| `E-HOW01` | e2e-chromium | E-HOW01: /how-it-works architecture diagram clicking nodes opens side panel; analyzer table shows active mode | Passed | 0.461s |
| `E-ABT01` | e2e-chromium | E-ABT01: /about shows team, institution, milestones with evidence links, and maturity table | Passed | 0.343s |
| `E-NAV03` | e2e-chromium | E-NAV03: Legacy routes redirect permanently | Passed | 1.151s |
| `E-RES01` | e2e-chromium | E-RES01: /resources displays catalog, supports search, category/type filters, sort, preview drawer, and external links | Passed | 2.875s |
| `E-RES02` | e2e-chromium | E-RES02: Empty library state is designed and helpful | Passed | 1.013s |
| `E-VAL01` | e2e-chromium | E-VAL01: /validation separates software tests from unlabelled stand-in footage without claiming goldfish accuracy | Passed | 0.693s |
| `E-VAL02` | e2e-chromium | E-VAL02: no console error or warning logs across public routes including validation | Passed | 1.891s |

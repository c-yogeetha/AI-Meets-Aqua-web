# Matsya - Test Verification Report

**Generated:** 2026-11-14T18:34:15.714294+00:00
**Environment:** Linux 6.8.0-142-generic | Python 3.12.3 | Node v24.21.0
**Git Commit:** `36ab6b5e59`
**All P0 cases passing:** **yes**  

## 1. Executive Summary

| Metric | Result | Target | Status |
|---|---|---|---|
| **Total Tests** | 218 | >= 90 | PASS |
| **Passed** | 218 | 100% of P0 | PASS |
| **Failed** | 0 | 0 | PASS |
| **Backend Line Coverage** | 88.4% | >= 80% | PASS |

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
| End-to-End User Workflows | `E-` | 84 | 84 | 100.0% |

## 3. Detailed Case Results

| Case ID | Suite | Title | Status | Duration (s) |
|---|---|---|---|---|
| `B-A01` | backend | a01 to a11 and a12 manifest samples | Passed | 102.216s |
| `B-A04` | backend | a04 surface gasping views | Passed | 9.566s |
| `B-A05` | backend | a05 isolated bottom | Passed | 4.344s |
| `B-A06` | backend | a06 lethargic all | Passed | 4.377s |
| `B-A07` | backend | a07 white fish | Passed | 4.507s |
| `B-A08` | backend | a08 two fish overlap | Passed | 4.271s |
| `B-A09` | backend | a09 plants decoy | Passed | 4.644s |
| `B-A10` | backend | a10 blank video | Passed | 3.67s |
| `B-A13` | backend | a13 determinism | Passed | 8.942s |
| `B-A14` | backend | a14 annotated video faststart | Passed | 4.947s |
| `B-A15` | backend | a15 webm option | Passed | 9.542s |
| `B-A16` | backend | a16 keyframes | Passed | 4.506s |
| `B-A17` | backend | a17 low confidence fish never stressed | Passed | 0.026s |
| `B-A18` | backend | a18 reliability arithmetic | Passed | 0.018s |
| `B-A19` | backend | a19 quality metrics synthetic frames | Passed | 0.027s |
| `B-A20` | backend | a20 dominant color model learning | Passed | 0.018s |
| `B-A21` | backend | a21 watershed splitting | Passed | 0.018s |
| `B-A22` | backend | a22 template retention | Passed | 0.015s |
| `B-A24` | backend | a24 performance budget | Passed | 4.848s |
| `B-PP` | backend | pp preprocessor never mutates original and respects disabled mode | Passed | 0.021s |
| `B-PP` | backend | pp glare mask detects bright low saturation region | Passed | 0.024s |
| `B-CT01` | backend | ct01 openapi contract no drift | Passed | 0.298s |
| `B-ENV02` | backend | env02 published report matches latest pytest run | Passed | 0.027s |
| `B-F01` | backend | f01 speed on straight track | Passed | 0.03s |
| `B-F02` | backend | f02 direction change rate | Passed | 0.024s |
| `B-F03` | backend | f03 surface ratio | Passed | 0.027s |
| `B-F04` | backend | f04 bottom ratio and inactivity | Passed | 0.024s |
| `B-F05` | backend | f05 isolation ratio | Passed | 0.027s |
| `B-F06` | backend | f06 single fish isolation | Passed | 0.024s |
| `B-F07` | backend | f07 track with gaps | Passed | 0.036s |
| `B-F08` | backend | f08 zero fish | Passed | 0.024s |
| `B-F20` | backend | f20 explanation sentence | Passed | 0.016s |
| `B-OWN01` | backend | own01 two cookies scoping | Passed | 0.091s |
| `B-OWN02` | backend | own02 another owner media pdf 404 | Passed | 0.928s |
| `B-OWN03` | backend | own03 single user mode and cookie attributes | Passed | 0.063s |
| `B-RET01` | backend | ret01 raw upload deleted after success | Passed | 0.048s |
| `B-RET02` | backend | ret02 retention purge removes old outputs except demo | Passed | 0.05s |
| `B-J05` | backend | j05 back to back queue position | Passed | 0.051s |
| `B-J06` | backend | j06 cancel queued and running jobs | Passed | 0.056s |
| `B-A23` | backend | a23 onnx decode nms canned tensor | Passed | 0.017s |
| `B-H01` | backend | h01 health check | Passed | 0.038s |
| `B-H02` | backend | h02 system info | Passed | 0.037s |
| `B-H03` | backend | h03 cors preflight | Passed | 0.036s |
| `B-H04` | backend | h04 openapi endpoints | Passed | 0.32s |
| `B-H05` | backend | h05 unknown route | Passed | 0.083s |
| `B-HI01` | backend | hi01 history paging and filtering | Passed | 0.566s |
| `B-HI02` | backend | hi02 history excludes deleted | Passed | 0.594s |
| `B-IN01` | backend | in01 fsi weighted mean | Passed | 0.083s |
| `B-IN02` | backend | in02 trend labels | Passed | 0.094s |
| `B-IN03` | backend | in03 temperature pattern message | Passed | 0.087s |
| `B-BN01` | backend | bn01 and bn02 delete and restore | Passed | 0.642s |
| `B-BN03` | backend | bn03 and bn04 purge retention | Passed | 0.611s |
| `B-BN05` | backend | bn05 permanent delete | Passed | 0.687s |
| `B-AL01` | backend | al01 to al04 alerts | Passed | 5.73s |
| `B-D01` | backend | d01 demo seed idempotent | Passed | 0.555s |
| `B-X01` | backend | x01 external detect and track | Passed | 0.905s |
| `B-X03` | backend | x03 missing ai module | Passed | 0.318s |
| `B-X02` | backend | x02 external analyze video | Passed | 0.485s |
| `B-X04` | backend | x04 malformed ai output | Passed | 0.452s |
| `B-J01` | backend | j01 and j02 lifecycle and monotonic | Passed | 2.018s |
| `B-J03` | backend | j03 failure path | Passed | 0.132s |
| `B-J04` | backend | j04 unknown job | Passed | 0.059s |
| `B-J05` | backend | j05 timeout | Passed | 1.363s |
| `B-J06` | backend | j06 startup recovery | Passed | 0.056s |
| `B-J07` | backend | j07 sequential processing | Passed | 3.478s |
| `B-PDF01` | backend | pdf01 pdf sample download | Passed | 0.762s |
| `B-PDF02` | backend | pdf02 unicode and unusual tank names | Passed | 1.362s |
| `B-PDF03` | backend | pdf03 zero fish result | Passed | 0.26s |
| `B-PDF04` | backend | pdf04 missing key frames on disk | Passed | 0.321s |
| `B-PDF05` | backend | pdf05 error statuses | Passed | 0.332s |
| `B-PDF06` | backend | pdf06 caching and invalidation | Passed | 0.592s |
| `B-PDF07` | backend | pdf07 timeout returns 503 | Passed | 0.101s |
| `B-PDF08` | backend | pdf08 no emoji in extracted text | Passed | 0.254s |
| `B-PDF09` | backend | pdf09 pdf metadata | Passed | 0.273s |
| `B-PDF10` | backend | pdf10 generation performance | Passed | 0.267s |
| `B-RES01` | backend | res01 ingestion fixtures | Passed | 0.572s |
| `B-RES02` | backend | res02 idempotency preserves overrides | Passed | 0.641s |
| `B-RES03` | backend | res03 resource endpoints | Passed | 0.12s |
| `B-RES04` | backend | res04 large video preview | Passed | 0.425s |
| `B-R01` | backend | r01 result before done | Passed | 0.087s |
| `B-R02` | backend | r02 result finished | Passed | 0.628s |
| `B-R03` | backend | r03 unknown result | Passed | 0.069s |
| `B-M01` | backend | m01 video range request | Passed | 0.582s |
| `B-M02` | backend | m02 frame endpoint | Passed | 0.59s |
| `B-M03` | backend | m03 frame path traversal | Passed | 0.604s |
| `B-P01` | backend | p01 pdf report | Passed | 0.754s |
| `B-S01` | backend | s01 level from score[0-Normal] | Passed | 0.019s |
| `B-S01` | backend | s01 level from score[34-Normal] | Passed | 0.016s |
| `B-S01` | backend | s01 level from score[35-Moderate] | Passed | 0.016s |
| `B-S01` | backend | s01 level from score[59-Moderate] | Passed | 0.019s |
| `B-S01` | backend | s01 level from score[60-High] | Passed | 0.016s |
| `B-S01` | backend | s01 level from score[100-High] | Passed | 0.015s |
| `B-S02` | backend | s02 fish score sum and clamp | Passed | 0.019s |
| `B-S03` | backend | s03 stressed threshold | Passed | 0.02s |
| `B-S04` | backend | s04 tank formula max plus spread | Passed | 0.02s |
| `B-S05` | backend | s05 tank formula mean max blend | Passed | 0.014s |
| `B-S06` | backend | s06 top view disables vertical flags | Passed | 0.021s |
| `B-S07` | backend | s07 lethargic all fish inactive | Passed | 0.022s |
| `B-S08` | backend | s08 configurable threshold | Passed | 0.018s |
| `B-S09` | backend | s09 timeline windows | Passed | 0.026s |
| `B-G01` | backend | g01 all flags have rules and ordered | Passed | 0.036s |
| `B-G02` | backend | g02 fish placeholder replacement | Passed | 0.025s |
| `B-G03` | backend | g03 context rules | Passed | 0.025s |
| `B-G04` | backend | g04 all clear when no flags | Passed | 0.025s |
| `B-G05` | backend | g05 rules yaml schema | Passed | 0.026s |
| `B-G06` | backend | g06 safe condition evaluator | Passed | 0.018s |
| `B-SYS01` | backend | sys01 system status | Passed | 0.054s |
| `B-SYS02` | backend | sys02 scoring config | Passed | 0.2s |
| `B-SYS03` | backend | sys03 overview seeded data | Passed | 0.554s |
| `B-SYS04` | backend | sys04 docs and openapi urls | Passed | 0.333s |
| `B-SYS05` | backend | sys05 trailing slash 404 not 307 | Passed | 0.087s |
| `B-SYS06` | backend | sys06 timestamps end with z | Passed | 0.591s |
| `B-SYS07` | backend | sys07 media urls root relative | Passed | 0.548s |
| `B-SYS08` | backend | sys08 error envelopes | Passed | 0.088s |
| `B-T01` | backend | t01 create tank valid | Passed | 0.061s |
| `B-T02` | backend | t02 invalid tanks[bad payload0] | Passed | 0.051s |
| `B-T02` | backend | t02 invalid tanks[bad payload1] | Passed | 0.081s |
| `B-T02` | backend | t02 invalid tanks[bad payload2] | Passed | 0.056s |
| `B-T02` | backend | t02 invalid tanks[bad payload3] | Passed | 0.062s |
| `B-T02` | backend | t02 invalid tanks[bad payload4] | Passed | 0.063s |
| `B-T03` | backend | t03 list tanks | Passed | 0.086s |
| `B-T04` | backend | t04 get tank 404 | Passed | 0.05s |
| `B-T05` | backend | t05 delete tank cascades | Passed | 0.09s |
| `B-T06` | backend | t06 tank name special characters | Passed | 0.057s |
| `B-U01` | backend | u01 valid upload | Passed | 0.083s |
| `B-U02` | backend | u02 unknown tank id | Passed | 0.063s |
| `B-U03` | backend | u03 wrong extension | Passed | 0.074s |
| `B-U04` | backend | u04 not a video | Passed | 0.072s |
| `B-U05` | backend | u05 oversize | Passed | 0.075s |
| `B-U06` | backend | u06 duration limit | Passed | 0.072s |
| `B-U07` | backend | u07 path traversal filename | Passed | 0.079s |
| `B-U08` | backend | u08 missing fields | Passed | 0.046s |
| `B-U09` | backend | u09 invalid view and temp | Passed | 0.204s |
| `B-U10` | backend | u10 optional fields saved | Passed | 0.087s |
| `E-APP01` | e2e-chromium | E-APP01: Overview renders with summary strip, tank cards, and navigation | Passed | 0.709s |
| `E-APP02` | e2e-chromium | E-APP02: Tank CRUD: create, edit, and delete with confirm | Passed | 1.376s |
| `E-APP03` | e2e-chromium | E-APP03: Complete analyse flow with calm.mp4 finishes with score, gauge, and PDF button | Passed | 27.595s |
| `E-APP04` | e2e-chromium | E-APP04: Invalid file type and oversized upload show inline errors without hang | Passed | 0.569s |
| `E-APP05` | e2e-chromium | E-APP05: Simulated failure hook shows failure panel and retry button | Passed | 0.825s |
| `E-APP08` | e2e-chromium | E-APP08: Results timeline and key moments click seeks video | Passed | 0.747s |
| `E-APP10` | e2e-chromium | E-APP10: History filters, delete, bin tab, and restore | Passed | 1.084s |
| `E-APP11` | e2e-chromium | E-APP11: Insights displays FSI value, trend chart, and formula explanation | Passed | 0.654s |
| `E-APP12` | e2e-chromium | E-APP12: Alerts displays list, filter, and mark all read | Passed | 0.461s |
| `E-APP13` | e2e-chromium | E-APP13: Settings persists toggles after reload and shows system diagnostics | Passed | 0.751s |
| `E-APP16` | e2e-chromium | E-APP16: Result error states: 404 and 410 deleted | Passed | 1.695s |
| `E-01` | e2e-chromium | E-01: Homepage loads and renders its primary CTA | Passed | 0.622s |
| `E-02` | e2e-chromium | E-02: Desktop depth rail updates as the page scrolls | Passed | 0.885s |
| `E-03` | e2e-chromium | E-03: Public analysis CTA enters the current /app route | Passed | 2.206s |
| `E-04` | e2e-chromium | E-04: FAQ accordion exposes the current behavioural-indicator explanation | Passed | 2.073s |
| `E-05` | e2e-chromium | E-05: Tank form validates empty names on the current route | Passed | 0.682s |
| `E-06` | e2e-chromium | E-06: Tank creation succeeds on the current route | Passed | 0.673s |
| `E-07` | e2e-chromium | E-07: Reduced motion skips the intro loader | Passed | 0.674s |
| `E-08` | e2e-chromium | E-08: Unknown route shows the not-found page | Passed | 0.361s |
| `E-09` | e2e-chromium | E-09: Homepage has no critical accessibility violations | Passed | 2.199s |
| `E-DL01` | e2e-chromium | E-DL01: Click Download PDF triggers browser download with valid file and no navigation | Passed | 2.474s |
| `E-DL02` | e2e-chromium | E-DL02: Tank names in Devanagari, emoji and 120 characters download valid PDF | Passed | 0.731s |
| `E-DL03` | e2e-chromium | E-DL03: Server error shows error toast, does not navigate, re-enables button | Passed | 2.481s |
| `E-DL05` | e2e-chromium | E-DL05: Media elements on result page respond 200 or 206 | Passed | 2.378s |
| `E-HOME01` | e2e-chromium | E-HOME01: Loader appears once per session and disappears; second visit skips; reduced motion skips | Passed | 3.456s |
| `E-HOME02` | e2e-chromium | E-HOME02: Hero text, CTA links, and hero video paused when scrolled away | Passed | 3.125s |
| `E-HOME03` | e2e-chromium | E-HOME03: Signal explorer click and keyboard arrows change panel; thresholds equal API | Passed | 2.503s |
| `E-HOME04` | e2e-chromium | E-HOME04: Drawn timeline contains nodes linking to how-it-works chapters | Passed | 2.402s |
| `E-HOME05` | e2e-chromium | E-HOME05: Status table values equal the system status API | Passed | 2.489s |
| `E-HOME06` | e2e-chromium | E-HOME06: Sample result section renders Gauge, fish rows, chart from sample json | Passed | 2.415s |
| `E-HOME07` | e2e-chromium | E-HOME07: Drive link behavior when unset vs set | Passed | 0.549s |
| `E-NAV01` | e2e-chromium | E-NAV01: Public pill nav reaches pages; active state correct; mobile drawer behaves correctly | Passed | 2.958s |
| `E-QA01` | e2e-chromium | E-QA01: Viewport responsive test and no horizontal overflow | Passed | 4.066s |
| `E-PDF` | e2e-chromium | E-PDF-01: sample result downloads a parseable PDF | Passed | 2.493s |
| `E-PDF` | e2e-chromium | E-PDF-02: result PDF endpoint sends safe attachment headers | Passed | 0.156s |
| `E-SCI01` | e2e-chromium | E-SCI01: /science shows rules table from API, anchors work, and formulas visible | Passed | 0.407s |
| `E-HOW01` | e2e-chromium | E-HOW01: /how-it-works architecture diagram clicking nodes opens side panel; analyzer table shows active mode | Passed | 0.479s |
| `E-ABT01` | e2e-chromium | E-ABT01: /about shows team, institution, milestones with evidence links, and maturity table | Passed | 0.382s |
| `E-NAV03` | e2e-chromium | E-NAV03: Legacy routes redirect permanently | Passed | 0.982s |
| `E-RES01` | e2e-chromium | E-RES01: /resources displays catalog, supports search, category/type filters, sort, preview drawer, and external links | Passed | 2.803s |
| `E-RES02` | e2e-chromium | E-RES02: Empty library state is designed and helpful | Passed | 0.935s |
| `E-VAL01` | e2e-chromium | E-VAL01: /validation separates software tests from unlabelled stand-in footage without claiming goldfish accuracy | Passed | 0.597s |
| `E-APP01` | e2e-firefox | E-APP01: Overview renders with summary strip, tank cards, and navigation | Passed | 2.048s |
| `E-APP02` | e2e-firefox | E-APP02: Tank CRUD: create, edit, and delete with confirm | Passed | 1.817s |
| `E-APP03` | e2e-firefox | E-APP03: Complete analyse flow with calm.mp4 finishes with score, gauge, and PDF button | Passed | 27.717s |
| `E-APP04` | e2e-firefox | E-APP04: Invalid file type and oversized upload show inline errors without hang | Passed | 0.785s |
| `E-APP05` | e2e-firefox | E-APP05: Simulated failure hook shows failure panel and retry button | Passed | 1.139s |
| `E-APP08` | e2e-firefox | E-APP08: Results timeline and key moments click seeks video | Passed | 0.991s |
| `E-APP10` | e2e-firefox | E-APP10: History filters, delete, bin tab, and restore | Passed | 1.363s |
| `E-APP11` | e2e-firefox | E-APP11: Insights displays FSI value, trend chart, and formula explanation | Passed | 0.838s |
| `E-APP12` | e2e-firefox | E-APP12: Alerts displays list, filter, and mark all read | Passed | 0.694s |
| `E-APP13` | e2e-firefox | E-APP13: Settings persists toggles after reload and shows system diagnostics | Passed | 1.842s |
| `E-APP16` | e2e-firefox | E-APP16: Result error states: 404 and 410 deleted | Passed | 2.073s |
| `E-01` | e2e-firefox | E-01: Homepage loads and renders its primary CTA | Passed | 0.806s |
| `E-02` | e2e-firefox | E-02: Desktop depth rail updates as the page scrolls | Passed | 1.084s |
| `E-03` | e2e-firefox | E-03: Public analysis CTA enters the current /app route | Passed | 2.481s |
| `E-04` | e2e-firefox | E-04: FAQ accordion exposes the current behavioural-indicator explanation | Passed | 2.456s |
| `E-05` | e2e-firefox | E-05: Tank form validates empty names on the current route | Passed | 0.877s |
| `E-06` | e2e-firefox | E-06: Tank creation succeeds on the current route | Passed | 0.999s |
| `E-07` | e2e-firefox | E-07: Reduced motion skips the intro loader | Passed | 0.774s |
| `E-08` | e2e-firefox | E-08: Unknown route shows the not-found page | Passed | 0.561s |
| `E-09` | e2e-firefox | E-09: Homepage has no critical accessibility violations | Passed | 3.829s |
| `E-DL01` | e2e-firefox | E-DL01: Click Download PDF triggers browser download with valid file and no navigation | Passed | 3.202s |
| `E-DL02` | e2e-firefox | E-DL02: Tank names in Devanagari, emoji and 120 characters download valid PDF | Passed | 0.926s |
| `E-DL03` | e2e-firefox | E-DL03: Server error shows error toast, does not navigate, re-enables button | Passed | 2.995s |
| `E-DL05` | e2e-firefox | E-DL05: Media elements on result page respond 200 or 206 | Passed | 2.966s |
| `E-HOME01` | e2e-firefox | E-HOME01: Loader appears once per session and disappears; second visit skips; reduced motion skips | Passed | 4.132s |
| `E-HOME02` | e2e-firefox | E-HOME02: Hero text, CTA links, and hero video paused when scrolled away | Passed | 3.503s |
| `E-HOME03` | e2e-firefox | E-HOME03: Signal explorer click and keyboard arrows change panel; thresholds equal API | Passed | 2.86s |
| `E-HOME04` | e2e-firefox | E-HOME04: Drawn timeline contains nodes linking to how-it-works chapters | Passed | 2.738s |
| `E-HOME05` | e2e-firefox | E-HOME05: Status table values equal the system status API | Passed | 2.591s |
| `E-HOME06` | e2e-firefox | E-HOME06: Sample result section renders Gauge, fish rows, chart from sample json | Passed | 3.122s |
| `E-HOME07` | e2e-firefox | E-HOME07: Drive link behavior when unset vs set | Passed | 0.845s |
| `E-NAV01` | e2e-firefox | E-NAV01: Public pill nav reaches pages; active state correct; mobile drawer behaves correctly | Passed | 3.41s |
| `E-QA01` | e2e-firefox | E-QA01: Viewport responsive test and no horizontal overflow | Passed | 6.95s |
| `E-PDF` | e2e-firefox | E-PDF-01: sample result downloads a parseable PDF | Passed | 3.058s |
| `E-PDF` | e2e-firefox | E-PDF-02: result PDF endpoint sends safe attachment headers | Passed | 0.287s |
| `E-SCI01` | e2e-firefox | E-SCI01: /science shows rules table from API, anchors work, and formulas visible | Passed | 0.584s |
| `E-HOW01` | e2e-firefox | E-HOW01: /how-it-works architecture diagram clicking nodes opens side panel; analyzer table shows active mode | Passed | 0.735s |
| `E-ABT01` | e2e-firefox | E-ABT01: /about shows team, institution, milestones with evidence links, and maturity table | Passed | 0.706s |
| `E-NAV03` | e2e-firefox | E-NAV03: Legacy routes redirect permanently | Passed | 1.858s |
| `E-RES01` | e2e-firefox | E-RES01: /resources displays catalog, supports search, category/type filters, sort, preview drawer, and external links | Passed | 3.893s |
| `E-RES02` | e2e-firefox | E-RES02: Empty library state is designed and helpful | Passed | 1.221s |
| `E-VAL01` | e2e-firefox | E-VAL01: /validation separates software tests from unlabelled stand-in footage without claiming goldfish accuracy | Passed | 0.896s |

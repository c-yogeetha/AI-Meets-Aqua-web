# Matsya - Test Verification Report

**Generated:** 2026-11-19T16:05:13.159185+00:00
**Environment:** Linux 6.19.10-300.fc44.x86_64 | Python 3.14.3 | Node unknown
**Git Commit:** `31263c2101`
**All P0 cases passing:** **yes**  

## 1. Executive Summary

| Metric | Result | Target | Status |
|---|---|---|---|
| **Total Tests** | 132 | >= 90 | PASS |
| **Passed** | 132 | 100% of P0 | PASS |
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
| Video Analysis Integration | `B-A` | 2 | 2 | 100.0% |
| Results Verification | `B-R` | 9 | 9 | 100.0% |
| Media Streaming & Encoding | `B-M` | 3 | 3 | 100.0% |
| PDF Report Packaging | `B-PDF` | 10 | 10 | 100.0% |
| PDF Generation Legacy | `B-P` | 11 | 11 | 100.0% |
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
| OpenAPI Schema Contract | `B-CT` | 1 | 1 | 100.0% |
| End-to-End User Workflows | `E-` | 4 | 4 | 100.0% |

## 3. Detailed Case Results

| Case ID | Suite | Title | Status | Duration (s) |
|---|---|---|---|---|
| `B-CT01` | backend | ct01 openapi contract no drift | Passed | 0.111s |
| `B-ENV02` | backend | env02 published report matches latest pytest run | Passed | 0.011s |
| `B-test_real_` | backend | test real detector modes are not marked validated[baseline] | Passed | 0.006s |
| `B-test_real_` | backend | test real detector modes are not marked validated[onnx] | Passed | 0.008s |
| `B-test_mock_` | backend | test mock mode is explicitly synthetic | Passed | 0.005s |
| `B-F01` | backend | f01 speed on straight track | Passed | 0.01s |
| `B-F02` | backend | f02 direction change rate | Passed | 0.009s |
| `B-F03` | backend | f03 surface ratio | Passed | 0.008s |
| `B-F04` | backend | f04 bottom ratio and inactivity | Passed | 0.009s |
| `B-F05` | backend | f05 isolation ratio | Passed | 0.01s |
| `B-F06` | backend | f06 single fish isolation | Passed | 0.014s |
| `B-F07` | backend | f07 track with gaps | Passed | 0.01s |
| `B-F08` | backend | f08 zero fish | Passed | 0.008s |
| `B-F20` | backend | f20 explanation sentence | Passed | 0.008s |
| `B-OWN01` | backend | own01 two cookies scoping | Passed | 0.047s |
| `B-OWN02` | backend | own02 another owner media pdf 404 | Passed | 0.734s |
| `B-OWN03` | backend | own03 single user mode and cookie attributes | Passed | 0.032s |
| `B-RET01` | backend | ret01 raw upload deleted after success | Passed | 0.018s |
| `B-RET02` | backend | ret02 retention purge removes old outputs except demo | Passed | 0.02s |
| `B-J05` | backend | j05 back to back queue position | Passed | 0.028s |
| `B-J06` | backend | j06 cancel queued and running jobs | Passed | 0.028s |
| `B-A23` | backend | a23 onnx decode nms canned tensor | Passed | 0.008s |
| `B-H01` | backend | h01 health check | Passed | 0.018s |
| `B-H02` | backend | h02 system info | Passed | 0.019s |
| `B-H03` | backend | h03 cors preflight | Passed | 0.021s |
| `B-H04` | backend | h04 openapi endpoints | Passed | 0.095s |
| `B-H05` | backend | h05 unknown route | Passed | 0.035s |
| `B-HI01` | backend | hi01 history paging and filtering | Passed | 0.513s |
| `B-HI02` | backend | hi02 history excludes deleted | Passed | 0.501s |
| `B-IN01` | backend | in01 fsi weighted mean | Passed | 0.041s |
| `B-IN02` | backend | in02 trend labels | Passed | 0.048s |
| `B-IN03` | backend | in03 temperature pattern message | Passed | 0.039s |
| `B-BN01` | backend | bn01 and bn02 delete and restore | Passed | 0.541s |
| `B-BN03` | backend | bn03 and bn04 purge retention | Passed | 0.544s |
| `B-BN05` | backend | bn05 permanent delete | Passed | 0.5s |
| `B-AL01` | backend | al01 to al04 alerts | Passed | 8.405s |
| `B-D01` | backend | d01 demo seed idempotent | Passed | 0.521s |
| `B-X01` | backend | x01 external detect and track | Passed | 0.933s |
| `B-X03` | backend | x03 missing ai module | Passed | 0.416s |
| `B-X02` | backend | x02 external analyze video | Passed | 0.396s |
| `B-X04` | backend | x04 malformed ai output | Passed | 0.382s |
| `B-J01` | backend | j01 and j02 lifecycle and monotonic | Passed | 1.938s |
| `B-J03` | backend | j03 failure path | Passed | 0.203s |
| `B-J04` | backend | j04 unknown job | Passed | 0.04s |
| `B-J05` | backend | j05 timeout | Passed | 1.365s |
| `B-J06` | backend | j06 startup recovery | Passed | 0.043s |
| `B-J07` | backend | j07 sequential processing | Passed | 3.761s |
| `B-test_model` | backend | test models dir environment setting controls detector discovery | Passed | 0.014s |
| `B-test_broke` | backend | test broken model in configured directory falls back to classical | Passed | 0.014s |
| `B-test_onnx_` | backend | test onnx gate uses v5 independent evaluation thresholds | Passed | 0.013s |
| `B-test_noteb` | backend | test notebook reads open images ground truth field by default | Passed | 0.009s |
| `B-test_strin` | backend | test string zero and unknown minus one flags are not truthy | Passed | 0.012s |
| `B-test_true_` | backend | test true group flag skips the entire image | Passed | 0.012s |
| `B-test_wrong` | backend | test wrong sample field is reported as skip | Passed | 0.008s |
| `B-test_candi` | backend | test candidate b keeps 400 image gate when goldfish only is small | Passed | 0.006s |
| `B-PDF01` | backend | pdf01 pdf sample download | Passed | 0.721s |
| `B-PDF02` | backend | pdf02 unicode and unusual tank names | Passed | 0.832s |
| `B-PDF03` | backend | pdf03 zero fish result | Passed | 0.14s |
| `B-PDF04` | backend | pdf04 missing key frames on disk | Passed | 0.146s |
| `B-PDF05` | backend | pdf05 error statuses | Passed | 0.172s |
| `B-PDF06` | backend | pdf06 caching and invalidation | Passed | 0.316s |
| `B-PDF07` | backend | pdf07 timeout returns 503 | Passed | 0.04s |
| `B-PDF08` | backend | pdf08 no emoji in extracted text | Passed | 0.155s |
| `B-PDF09` | backend | pdf09 pdf metadata | Passed | 0.146s |
| `B-PDF10` | backend | pdf10 generation performance | Passed | 0.138s |
| `B-test_corne` | backend | test corner lock on generated frame is implausible | Passed | 0.013s |
| `B-test_movin` | backend | test moving goldfish sized track is not rejected | Passed | 0.01s |
| `B-test_low_c` | backend | test low colour track triggers the documented rule | Passed | 0.008s |
| `B-test_impla` | backend | test implausible track forces reliability low | Passed | 0.006s |
| `B-RES01` | backend | res01 ingestion fixtures | Passed | 0.566s |
| `B-RES02` | backend | res02 idempotency preserves overrides | Passed | 0.612s |
| `B-RES03` | backend | res03 resource endpoints | Passed | 0.056s |
| `B-RES04` | backend | res04 large video preview | Passed | 0.422s |
| `B-R01` | backend | r01 result before done | Passed | 0.037s |
| `B-R02` | backend | r02 result finished | Passed | 0.525s |
| `B-R03` | backend | r03 unknown result | Passed | 0.029s |
| `B-M01` | backend | m01 video range request | Passed | 0.499s |
| `B-M02` | backend | m02 frame endpoint | Passed | 0.513s |
| `B-M03` | backend | m03 frame path traversal | Passed | 0.495s |
| `B-P01` | backend | p01 pdf report | Passed | 0.641s |
| `B-S01` | backend | s01 level from score[0-Normal] | Passed | 0.009s |
| `B-S01` | backend | s01 level from score[34-Normal] | Passed | 0.006s |
| `B-S01` | backend | s01 level from score[35-Moderate] | Passed | 0.006s |
| `B-S01` | backend | s01 level from score[59-Moderate] | Passed | 0.007s |
| `B-S01` | backend | s01 level from score[60-High] | Passed | 0.005s |
| `B-S01` | backend | s01 level from score[100-High] | Passed | 0.01s |
| `B-S02` | backend | s02 fish score sum and clamp | Passed | 0.008s |
| `B-S03` | backend | s03 stressed threshold | Passed | 0.009s |
| `B-S04` | backend | s04 tank formula max plus spread | Passed | 0.008s |
| `B-S05` | backend | s05 tank formula mean max blend | Passed | 0.005s |
| `B-S06` | backend | s06 top view disables vertical flags | Passed | 0.009s |
| `B-S07` | backend | s07 lethargic all fish inactive | Passed | 0.008s |
| `B-S08` | backend | s08 configurable threshold | Passed | 0.007s |
| `B-S09` | backend | s09 timeline windows | Passed | 0.015s |
| `B-G01` | backend | g01 all flags have rules and ordered | Passed | 0.012s |
| `B-G02` | backend | g02 fish placeholder replacement | Passed | 0.009s |
| `B-G03` | backend | g03 context rules | Passed | 0.009s |
| `B-G04` | backend | g04 all clear when no flags | Passed | 0.01s |
| `B-G05` | backend | g05 rules yaml schema | Passed | 0.01s |
| `B-G06` | backend | g06 safe condition evaluator | Passed | 0.005s |
| `B-SYS01` | backend | sys01 system status | Passed | 0.163s |
| `B-SYS02` | backend | sys02 scoring config | Passed | 0.022s |
| `B-SYS03` | backend | sys03 overview seeded data | Passed | 0.504s |
| `B-SYS04` | backend | sys04 docs and openapi urls | Passed | 0.097s |
| `B-SYS05` | backend | sys05 trailing slash 404 not 307 | Passed | 0.029s |
| `B-SYS06` | backend | sys06 timestamps end with z | Passed | 0.521s |
| `B-SYS07` | backend | sys07 media urls root relative | Passed | 0.555s |
| `B-SYS08` | backend | sys08 error envelopes | Passed | 0.053s |
| `B-T01` | backend | t01 create tank valid | Passed | 0.033s |
| `B-T02` | backend | t02 invalid tanks[bad payload0] | Passed | 0.041s |
| `B-T02` | backend | t02 invalid tanks[bad payload1] | Passed | 0.033s |
| `B-T02` | backend | t02 invalid tanks[bad payload2] | Passed | 0.023s |
| `B-T02` | backend | t02 invalid tanks[bad payload3] | Passed | 0.024s |
| `B-T02` | backend | t02 invalid tanks[bad payload4] | Passed | 0.054s |
| `B-T03` | backend | t03 list tanks | Passed | 0.028s |
| `B-T04` | backend | t04 get tank 404 | Passed | 0.026s |
| `B-T05` | backend | t05 delete tank cascades | Passed | 0.036s |
| `B-T06` | backend | t06 tank name special characters | Passed | 0.022s |
| `B-U01` | backend | u01 valid upload | Passed | 0.054s |
| `B-U02` | backend | u02 unknown tank id | Passed | 0.032s |
| `B-U03` | backend | u03 wrong extension | Passed | 0.051s |
| `B-U04` | backend | u04 not a video | Passed | 0.06s |
| `B-U05` | backend | u05 oversize | Passed | 0.067s |
| `B-U06` | backend | u06 duration limit | Passed | 0.057s |
| `B-U07` | backend | u07 path traversal filename | Passed | 0.111s |
| `B-U08` | backend | u08 missing fields | Passed | 0.037s |
| `B-U09` | backend | u09 invalid view and temp | Passed | 0.118s |
| `B-U10` | backend | u10 optional fields saved | Passed | 0.073s |
| `E-DL01` | e2e-chromium | E-DL01: Click Download PDF triggers browser download with valid file and no navigation | Passed | 3.133s |
| `E-DL02` | e2e-chromium | E-DL02: Tank names in Devanagari, emoji and 120 characters download valid PDF | Passed | 0.994s |
| `E-DL03` | e2e-chromium | E-DL03: Server error shows error toast, does not navigate, re-enables button | Passed | 2.785s |
| `E-DL05` | e2e-chromium | E-DL05: Media elements on result page respond 200 or 206 | Passed | 2.802s |

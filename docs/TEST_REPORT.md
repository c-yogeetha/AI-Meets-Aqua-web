# Matsya - Test Verification Report

**Generated:** 2026-11-12T16:31:27.222958+00:00  
**Environment:** Linux 7.2.6-200.fc44.x86_64 | Python 3.12.16 | Node v22.23.1  
**Git Commit:** `a45b27779f`  
**All P0 cases passing:** **yes**  

## 1. Executive Summary

| Metric | Result | Target | Status |
|---|---|---|---|
| **Total Tests** | 94 | >= 90 | PASS |
| **Passed** | 94 | 100% of P0 | PASS |
| **Failed** | 0 | 0 | PASS |
| **Backend Line Coverage** | 92.8% | >= 80% | PASS |

## 2. Category Pass Rates

| Category | Prefix | Total | Passed | Pass Rate |
|---|---|---|---|---|
| System & Health | `B-H` | 7 | 7 | 100.0% |
| Tank Management | `B-T` | 10 | 10 | 100.0% |
| Upload & Validation | `B-U` | 10 | 10 | 100.0% |
| Job Lifecycle & Recovery | `B-J` | 6 | 6 | 100.0% |
| Feature Extraction Kinematics | `B-F` | 9 | 9 | 100.0% |
| Stress Scoring Rules | `B-S` | 14 | 14 | 100.0% |
| Actionable Suggestions | `B-G` | 6 | 6 | 100.0% |
| Video Analysis Integration | `B-A` | 10 | 10 | 100.0% |
| Results Verification | `B-R` | 3 | 3 | 100.0% |
| Media Streaming & Encoding | `B-M` | 3 | 3 | 100.0% |
| PDF Generation Legacy | `B-P` | 1 | 1 | 100.0% |
| Historical Analyses | `B-HI` | 2 | 2 | 100.0% |
| Tank Insights & FSI | `B-IN` | 3 | 3 | 100.0% |
| Recycle Bin Retention | `B-BN` | 3 | 3 | 100.0% |
| Alert System & Notification | `B-AL` | 1 | 1 | 100.0% |
| Demo Seeding Engine | `B-D` | 1 | 1 | 100.0% |
| External AI Adapter | `B-X` | 4 | 4 | 100.0% |
| End-to-End User Workflows | `E-` | 4 | 4 | 100.0% |

## 3. Detailed Case Results

| Case ID | Suite | Title | Status | Duration (s) |
|---|---|---|---|---|
| `B-A01` | backend | a01 to a07 and a11 a12 manifest samples | Passed | 7.953s |
| `B-A05` | backend | a05 top view vertical flags disabled | Passed | 0.75s |
| `B-A08` | backend | a08 short clip warning | Passed | 0.138s |
| `B-A09` | backend | a09 determinism | Passed | 1.775s |
| `B-A10` | backend | a10 mock analyzer determinism | Passed | 1.952s |
| `B-A13` | backend | a13 plants not detected as fish | Passed | 0.789s |
| `B-A14` | backend | a14 and a15 annotated video and keyframes | Passed | 1.027s |
| `B-A16` | backend | a16 performance | Passed | 0.93s |
| `B-A17` | backend | a17 progress callback valid stages | Passed | 0.85s |
| `B-F01` | backend | f01 speed on straight track | Passed | 0.011s |
| `B-F02` | backend | f02 direction change rate | Passed | 0.012s |
| `B-F03` | backend | f03 surface ratio | Passed | 0.011s |
| `B-F04` | backend | f04 bottom ratio and inactivity | Passed | 0.011s |
| `B-F05` | backend | f05 isolation ratio | Passed | 0.013s |
| `B-F06` | backend | f06 single fish isolation | Passed | 0.012s |
| `B-F07` | backend | f07 track with gaps | Passed | 0.011s |
| `B-F08` | backend | f08 zero fish | Passed | 0.011s |
| `B-F20` | backend | f20 explanation sentence | Passed | 0.006s |
| `B-H01` | backend | h01 health check | Passed | 0.12s |
| `B-H02` | backend | h02 system info | Passed | 0.018s |
| `B-H03` | backend | h03 cors preflight | Passed | 0.016s |
| `B-H04` | backend | h04 openapi endpoints | Passed | 0.23s |
| `B-H05` | backend | h05 unknown route | Passed | 0.045s |
| `B-HI01` | backend | hi01 history paging and filtering | Passed | 0.643s |
| `B-HI02` | backend | hi02 history excludes deleted | Passed | 0.636s |
| `B-IN01` | backend | in01 fsi weighted mean | Passed | 0.057s |
| `B-IN02` | backend | in02 trend labels | Passed | 0.064s |
| `B-IN03` | backend | in03 temperature pattern message | Passed | 0.064s |
| `B-BN01` | backend | bn01 and bn02 delete and restore | Passed | 0.759s |
| `B-BN03` | backend | bn03 and bn04 purge retention | Passed | 0.757s |
| `B-BN05` | backend | bn05 permanent delete | Passed | 0.65s |
| `B-AL01` | backend | al01 to al04 alerts | Passed | 1.392s |
| `B-D01` | backend | d01 demo seed idempotent | Passed | 0.612s |
| `B-X01` | backend | x01 external detect and track | Passed | 0.634s |
| `B-X03` | backend | x03 missing ai module | Passed | 0.485s |
| `B-X02` | backend | x02 external analyze video | Passed | 0.193s |
| `B-X04` | backend | x04 malformed ai output | Passed | 0.179s |
| `B-J01` | backend | j01 and j02 lifecycle and monotonic | Passed | 1.889s |
| `B-J03` | backend | j03 failure path | Passed | 0.229s |
| `B-J04` | backend | j04 unknown job | Passed | 0.033s |
| `B-J05` | backend | j05 timeout | Passed | 1.159s |
| `B-J06` | backend | j06 startup recovery | Passed | 0.042s |
| `B-J07` | backend | j07 sequential processing | Passed | 3.032s |
| `B-R01` | backend | r01 result before done | Passed | 0.078s |
| `B-R02` | backend | r02 result finished | Passed | 0.629s |
| `B-R03` | backend | r03 unknown result | Passed | 0.038s |
| `B-M01` | backend | m01 video range request | Passed | 0.571s |
| `B-M02` | backend | m02 frame endpoint | Passed | 0.571s |
| `B-M03` | backend | m03 frame path traversal | Passed | 0.564s |
| `B-P01` | backend | p01 pdf report | Passed | 13.282s |
| `B-S01` | backend | s01 level from score[0-Normal] | Passed | 0.007s |
| `B-S01` | backend | s01 level from score[34-Normal] | Passed | 0.006s |
| `B-S01` | backend | s01 level from score[35-Moderate] | Passed | 0.008s |
| `B-S01` | backend | s01 level from score[59-Moderate] | Passed | 0.009s |
| `B-S01` | backend | s01 level from score[60-High] | Passed | 0.007s |
| `B-S01` | backend | s01 level from score[100-High] | Passed | 0.006s |
| `B-S02` | backend | s02 fish score sum and clamp | Passed | 0.009s |
| `B-S03` | backend | s03 stressed threshold | Passed | 0.01s |
| `B-S04` | backend | s04 tank formula max plus spread | Passed | 0.011s |
| `B-S05` | backend | s05 tank formula mean max blend | Passed | 0.007s |
| `B-S06` | backend | s06 top view disables vertical flags | Passed | 0.011s |
| `B-S07` | backend | s07 lethargic all fish inactive | Passed | 0.01s |
| `B-S08` | backend | s08 configurable threshold | Passed | 0.01s |
| `B-S09` | backend | s09 timeline windows | Passed | 0.013s |
| `B-G01` | backend | g01 all flags have rules and ordered | Passed | 0.014s |
| `B-G02` | backend | g02 fish placeholder replacement | Passed | 0.014s |
| `B-G03` | backend | g03 context rules | Passed | 0.014s |
| `B-G04` | backend | g04 all clear when no flags | Passed | 0.014s |
| `B-G05` | backend | g05 rules yaml schema | Passed | 0.014s |
| `B-G06` | backend | g06 safe condition evaluator | Passed | 0.007s |
| `B-T01` | backend | t01 create tank valid | Passed | 0.026s |
| `B-T02` | backend | t02 invalid tanks[bad payload0] | Passed | 0.02s |
| `B-T02` | backend | t02 invalid tanks[bad payload1] | Passed | 0.02s |
| `B-T02` | backend | t02 invalid tanks[bad payload2] | Passed | 0.022s |
| `B-T02` | backend | t02 invalid tanks[bad payload3] | Passed | 0.021s |
| `B-T02` | backend | t02 invalid tanks[bad payload4] | Passed | 0.021s |
| `B-T03` | backend | t03 list tanks | Passed | 0.033s |
| `B-T04` | backend | t04 get tank 404 | Passed | 0.023s |
| `B-T05` | backend | t05 delete tank cascades | Passed | 0.043s |
| `B-T06` | backend | t06 tank name special characters | Passed | 0.024s |
| `B-U01` | backend | u01 valid upload | Passed | 0.052s |
| `B-U02` | backend | u02 unknown tank id | Passed | 0.03s |
| `B-U03` | backend | u03 wrong extension | Passed | 0.035s |
| `B-U04` | backend | u04 not a video | Passed | 0.052s |
| `B-U05` | backend | u05 oversize | Passed | 0.038s |
| `B-U06` | backend | u06 duration limit | Passed | 0.04s |
| `B-U07` | backend | u07 path traversal filename | Passed | 0.157s |
| `B-U08` | backend | u08 missing fields | Passed | 0.076s |
| `B-U09` | backend | u09 invalid view and temp | Passed | 0.044s |
| `B-U10` | backend | u10 optional fields saved | Passed | 0.049s |
| `E-SCI01` | e2e | E-SCI01: /science shows rules table from API, anchors work, and formulas visible | Passed | 1.047s |
| `E-HOW01` | e2e | E-HOW01: /how-it-works architecture diagram clicking nodes opens side panel; analyzer table shows active mode | Passed | 0.986s |
| `E-ABT01` | e2e | E-ABT01: /about shows team, institution, milestones with evidence links, and maturity table | Passed | 0.861s |
| `E-NAV03` | e2e | E-NAV03: Legacy routes redirect permanently | Passed | 1.773s |

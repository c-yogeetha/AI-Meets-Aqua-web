#!/usr/bin/env python3
import json
import math
import sys
from pathlib import Path

p = Path(sys.argv[1])
meta = json.loads(p.read_text(encoding='utf-8'))
e = meta.get('eval') or {}
required = ('precision', 'holdout_recall', 'classical_holdout_recall', 'count_exact_match_pct', 'holdout_clips')
missing = [k for k in required if k not in e]
if missing:
    raise SystemExit('Refusing swap; evaluation is missing: ' + ', '.join(missing))
try:
    precision = float(e['precision']); recall = float(e['holdout_recall'])
    classical = float(e['classical_holdout_recall']); count_exact = float(e['count_exact_match_pct'])
    clips = int(e['holdout_clips'])
except (TypeError, ValueError):
    raise SystemExit('Refusing swap; evaluation metrics have invalid types')
if not all(math.isfinite(v) for v in (precision, recall, classical, count_exact)):
    raise SystemExit('Refusing swap; evaluation metrics are non-finite')
if clips < 1 or precision < .85 or recall < .85 or count_exact < 70 or recall <= classical:
    raise SystemExit('Refusing swap; v5 independent-evaluation gate failed')
print('v5 model evaluation gate: PASS')

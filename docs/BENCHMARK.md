# Matsya Detection Benchmark Report

## Status: Pending Real-Tank Footage

**Notice on Empirical Metrics**:
Matsya adheres strictly to honest reporting standards. We do not substitute synthetic video simulation metrics for real-world biological tank performance.

- **Real Footage Directory**: `samples_real/` is currently empty or awaiting field collection.
- **Ground Truth Labels**: `benchmarks/labels.csv` will define expected counts and behavior states once footage is recorded.
- **Synthetic Verification**: Multi-condition synthetic verification (including lighting shifts, glare, turbidity, and high-density occlusion) is continuously validated under automated software test suites (`pytest backend/tests/test_analyzer_samples.py`).

### Verification Protocol When Real Footage Arrives:
1. Place raw tank recordings in `samples_real/`.
2. Populate `benchmarks/labels.csv` with `filename,expected_fish,ground_truth_label`.
3. Execute `python scripts/run_benchmark.py`.
4. Review generated contact sheets in `docs/screens/contact_sheets/` to inspect individual bounding tracks and trajectory fidelity.

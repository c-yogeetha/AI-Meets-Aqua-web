"use client";

import React, { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { api, type ScoringConfigResponse } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export default function SciencePage() {
  const [config, setConfig] = useState<ScoringConfigResponse | null>(null);

  useEffect(() => {
    api
      .getScoringConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  const fastBls = config?.speed?.fast_bl_s ?? 3.2;
  const inactBls = config?.speed?.inactive_bl_s ?? 0.15;
  const turnDeg = config?.direction?.turn_deg ?? 60;
  const erraticPerS = config?.direction?.erratic_per_s ?? 0.8;
  const isoDiag = ((config?.isolation?.nn_dist_frac_diag ?? 0.3) * 100).toFixed(0);
  const surfMin = ((config?.surface?.ratio_min ?? 0.35) * 100).toFixed(0);
  const botMin = ((config?.bottom?.ratio_min ?? 0.6) * 100).toFixed(0);

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 sm:py-24 space-y-16">
      {/* Intro Header */}
      <div className="space-y-4">
        <SectionLabel number="SCIENCE" title="METHODOLOGY & FORMULATION" />
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-ink">
          Quantifying Aquatic Stress Through Kinematics
        </h1>
        <p className="text-base text-ink-2 max-w-2xl leading-relaxed">
          Matsya employs classical computer vision and kinematic trajectory analysis to translate raw goldfish locomotion into deterministic stress indicators.
        </p>
      </div>

      {/* "What This Is Not" Caution Banner */}
      <div className="hairline-panel p-6 border-warn/30 bg-warn/5 space-y-3">
        <div className="font-mono text-xs uppercase tracking-wider text-warn flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4" />
          <span>Scope & Scientific Limitations</span>
        </div>
        <div className="text-sm text-ink-2 space-y-2 leading-relaxed">
          <p>
            <strong>Not a clinical pathology diagnosis:</strong> Matsya detects biomechanical anomalies that frequently correlate with environmental or physiological stress. It does not identify specific pathogens, bacterial strains, or biochemical parameters.
          </p>
          <p>
            <strong>Threshold status:</strong> Current thresholds were calibrated by the project engineering team against controlled synthetic and reference aquarium footage; they have not undergone multi-center clinical validation.
          </p>
          <p>
            <strong>Elevation requirement:</strong> Vertical depth analysis (surface gasping and substrate resting) requires a side or front elevation camera angle. Top-down camera angles cannot evaluate depth metrics.
          </p>
        </div>
      </div>

      {/* The Four Kinematic Signals */}
      <section id="signals" className="space-y-8 scroll-mt-24">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Pillar 01</div>
          <h2 className="font-serif text-3xl font-medium text-ink">The Four Kinematic Signals</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Signal 1: Speed */}
          <div className="hairline-panel p-6 space-y-3 bg-trench/40">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-medium text-ink">1. Swimming Speed</h3>
              <span className="font-mono text-xs text-aqua">+{config?.points?.fast_swimming ?? 10} pts</span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Displacement per frame normalized by estimated fish body length (BL). Measures burst darting and lethargic motionless drifting.
            </p>
            <div className="font-mono text-xs p-2.5 rounded bg-abyss border border-hair text-aqua tabular-nums">
              v(t) = ||x(t) - x(t - Δt)|| / (Δt · L_body)
            </div>
            <div className="text-xs text-ink-3">
              Configured threshold: <strong className="text-ink font-normal">≥ {fastBls} BL/s</strong> for fast swimming, <strong className="text-ink font-normal">≤ {inactBls} BL/s</strong> for inactivity.
            </div>
          </div>

          {/* Signal 2: Direction */}
          <div className="hairline-panel p-6 space-y-3 bg-trench/40">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-medium text-ink">2. Direction Changes</h3>
              <span className="font-mono text-xs text-aqua">+{config?.points?.erratic_swimming ?? 10} pts</span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Angular deviation between consecutive velocity vectors. Acute heading reversals reflect erratic darting or panic.
            </p>
            <div className="font-mono text-xs p-2.5 rounded bg-abyss border border-hair text-aqua tabular-nums">
              θ(t) = arccos((v_t · v_{`{t-1}`}) / (||v_t|| · ||v_{`{t-1}`}||))
            </div>
            <div className="text-xs text-ink-3">
              Configured threshold: <strong className="text-ink font-normal">≥ {turnDeg}°</strong> turn angle at a rate of <strong className="text-ink font-normal">≥ {erraticPerS} turns/s</strong>.
            </div>
          </div>

          {/* Signal 3: Isolation */}
          <div className="hairline-panel p-6 space-y-3 bg-trench/40">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-medium text-ink">3. Social Isolation</h3>
              <span className="font-mono text-xs text-aqua">+{config?.points?.isolation ?? 15} pts</span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Nearest-neighbor Euclidean distance normalized by tank diagonal. Social goldfish naturally shoal; sustained isolation indicates distress.
            </p>
            <div className="font-mono text-xs p-2.5 rounded bg-abyss border border-hair text-aqua tabular-nums">
              d_nn(t) = min_{`{j ≠ i}`} ||x_i(t) - x_j(t)||
            </div>
            <div className="text-xs text-ink-3">
              Configured threshold: <strong className="text-ink font-normal">&gt; {isoDiag}%</strong> tank diagonal for &gt; 50% of the observation window.
            </div>
          </div>

          {/* Signal 4: Vertical Depth */}
          <div className="hairline-panel p-6 space-y-3 bg-trench/40">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-medium text-ink">4. Vertical Position</h3>
              <span className="font-mono text-xs text-aqua">+{config?.points?.surface_gasping ?? 20} / +{config?.points?.bottom_inactivity ?? 15} pts</span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Normalized Y-axis coordinate in the water column. Surface gasping indicates hypoxia; bottom freezing indicates lethargy.
            </p>
            <div className="font-mono text-xs p-2.5 rounded bg-abyss border border-hair text-aqua tabular-nums">
              y_norm = (y - y_surface) / (y_bottom - y_surface)
            </div>
            <div className="text-xs text-ink-3">
              Configured threshold: Surface gasping <strong className="text-ink font-normal">&gt; {surfMin}%</strong> time; bottom resting <strong className="text-ink font-normal">&gt; {botMin}%</strong> time.
            </div>
          </div>
        </div>
      </section>

      {/* Scoring Rules Table from API */}
      <section id="scoring" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Pillar 02</div>
          <h2 className="font-serif text-3xl font-medium text-ink">Active Scoring Configuration</h2>
          <p className="text-xs text-ink-3">
            Dynamic parameters retrieved directly from <code className="text-aqua">/api/v1/config/scoring</code>.
          </p>
        </div>

        <div className="hairline-panel overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-hair bg-abyss/60 text-ink-3 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Behavioural Rule</th>
                <th className="py-3 px-4">Condition & Active Threshold</th>
                <th className="py-3 px-4">Points Added</th>
                <th className="py-3 px-4">View Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              <tr>
                <td className="py-3 px-4 font-medium text-ink">Fast Darting</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-2">speed ≥ {fastBls} BL/s</td>
                <td className="py-3 px-4 font-mono text-xs text-warn">+{config?.points?.fast_swimming ?? 10}</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-3">Any view</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-ink">Erratic Turning</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-2">turns ≥ {turnDeg}° at ≥ {erraticPerS}/s</td>
                <td className="py-3 px-4 font-mono text-xs text-warn">+{config?.points?.erratic_swimming ?? 10}</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-3">Any view</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-ink">Surface Gasping</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-2">y &lt; 0.15 for &gt; {surfMin}% time</td>
                <td className="py-3 px-4 font-mono text-xs text-danger">+{config?.points?.surface_gasping ?? 20}</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-3">Side or front view</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-ink">Bottom Inactivity</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-2">y &gt; 0.85 &amp; inactive &gt; {botMin}%</td>
                <td className="py-3 px-4 font-mono text-xs text-warn">+{config?.points?.bottom_inactivity ?? 15}</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-3">Side or front view</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-ink">Social Isolation</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-2">nearest neighbor &gt; {isoDiag}% diag</td>
                <td className="py-3 px-4 font-mono text-xs text-warn">+{config?.points?.isolation ?? 15}</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-3">Multi-fish only</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-ink">General Tank Lethargy</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-2">all fish inactive &gt; 80% time</td>
                <td className="py-3 px-4 font-mono text-xs text-warn">+{config?.points?.lethargic ?? 10}</td>
                <td className="py-3 px-4 font-mono text-xs text-ink-3">Any view</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Tank Score & FSI Formula */}
      <section id="formulas" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Pillar 03</div>
          <h2 className="font-serif text-3xl font-medium text-ink">Aggregate Formulas</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tank Score Formula */}
          <div className="hairline-panel p-6 space-y-3 bg-trench/40">
            <h3 className="font-serif text-xl font-medium text-ink">Overall Tank Stress Score</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              Determined by the maximum individual fish stress score plus a spread bonus for each additional stressed fish in the tank:
            </p>
            <div className="font-mono text-xs p-3 rounded bg-abyss border border-hair text-aqua tabular-nums">
              S_tank = min(100, max_i(S_i) + max(0, N_stressed - 1) · 10)
            </div>
            <div className="text-xs text-ink-3 font-mono space-y-1">
              <div>Level bands:</div>
              <div>Normal: 0 – 34 | Moderate: 35 – 59 | Stressed: 60 – 100</div>
            </div>
          </div>

          {/* FSI Formula */}
          <div className="hairline-panel p-6 space-y-3 bg-trench/40">
            <h3 className="font-serif text-xl font-medium text-ink">Fish Stress Index (FSI)</h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              A longitudinal health metric (0–100) reflecting tank stability over historical runs. Higher FSI indicates lower stress and higher welfare:
            </p>
            <div className="font-mono text-xs p-3 rounded bg-abyss border border-hair text-aqua tabular-nums">
              FSI = max(0, 100 - mean(recent_tank_scores))
            </div>
            <div className="text-xs text-ink-3 font-mono">
              Computed over the last 10 completed analyses for the tank.
            </div>
          </div>
        </div>
      </section>

      {/* Technical Glossary */}
      <section id="glossary" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Pillar 04</div>
          <h2 className="font-serif text-3xl font-medium text-ink">Technical Glossary</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="hairline-panel p-4 space-y-1">
            <span className="font-mono text-aqua uppercase tracking-wider font-semibold">BL/s (Body Lengths per Second)</span>
            <p className="text-ink-3 leading-relaxed">
              Velocity normalized by fish body length, allowing scale-invariant comparisons between juvenile and adult fish.
            </p>
          </div>

          <div className="hairline-panel p-4 space-y-1">
            <span className="font-mono text-aqua uppercase tracking-wider font-semibold">Hungarian Algorithm</span>
            <p className="text-ink-3 leading-relaxed">
              Combinatorial optimization algorithm used in bipartite data association to assign bounding boxes across video frames minimizing centroid and appearance distances.
            </p>
          </div>

          <div className="hairline-panel p-4 space-y-1">
            <span className="font-mono text-aqua uppercase tracking-wider font-semibold">MOG2 Background Subtractor</span>
            <p className="text-ink-3 leading-relaxed">
              Gaussian Mixture-based background segmentation algorithm with shadow detection, calibrated to separate moving aquatic life from static tank decor.
            </p>
          </div>

          <div className="hairline-panel p-4 space-y-1">
            <span className="font-mono text-aqua uppercase tracking-wider font-semibold">Bhattacharyya Distance</span>
            <p className="text-ink-3 leading-relaxed">
              Statistical distance metric between HSV color histograms used during track assignment to prevent track ID swaps when fish cross paths.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

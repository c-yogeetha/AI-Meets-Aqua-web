"use client";

import React, { useState, useEffect } from "react";
import { api, type ScoringConfigResponse } from "@/lib/api";

interface SignalDefinition {
  id: string;
  index: number;
  name: string;
  summary: string;
  definition: string;
  formula: string;
  limitation: string;
  getThresholdText: (cfg?: ScoringConfigResponse | null) => string;
  getPointsText: (cfg?: ScoringConfigResponse | null) => string;
  renderSvg: () => React.ReactNode;
}

export function SignalExplorer() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfigResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getScoringConfig()
      .then((cfg) => {
        if (mounted) setScoringConfig(cfg);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const SIGNALS: SignalDefinition[] = [
    {
      id: "speed",
      index: 0,
      name: "Swimming Speed",
      summary: "Darting bursts and lethargic drifts",
      definition:
        "Measures instantaneous displacement calibrated in fish body lengths per second (BL/s). Sustained high-velocity darting indicates agitation or predator avoidance, while prolonged stagnation signals lethargy.",
      formula: "v(t) = ||x(t) - x(t - Δt)|| / (Δt · L_body)",
      limitation:
        "Requires reliable pixel-to-cm calibration or body length normalization. Highly dependent on camera frame rate.",
      getThresholdText: (cfg) => {
        const fast = cfg?.speed?.fast_bl_s ?? 3.2;
        const inact = cfg?.speed?.inactive_bl_s ?? 0.15;
        return `Fast: ≥ ${fast} BL/s | Inactive: ≤ ${inact} BL/s`;
      },
      getPointsText: (cfg) => {
        const pts = cfg?.points?.fast_swimming ?? 10;
        return `+${pts} pts (Fast darting)`;
      },
      renderSvg: () => (
        <svg viewBox="0 0 200 100" className="w-full h-full stroke-aqua fill-none">
          <path
            d="M 10 50 Q 50 10, 90 60 T 170 30"
            strokeWidth="2"
            strokeDasharray="6 3"
            className="animate-pulse"
          />
          <circle cx="170" cy="30" r="4" fill="var(--gold)" />
          <line x1="170" y1="30" x2="195" y2="20" stroke="var(--gold)" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: "direction",
      index: 1,
      name: "Direction Changes",
      summary: "Erratic turning & rapid yaw oscillation",
      definition:
        "Calculates angular velocity and heading change between consecutive trajectory vectors. Frequent acute angle reversals (>60°) reflect disoriented darting or physical distress.",
      formula: "Δθ(t) = arccos((v(t) · v(t - Δt)) / (||v(t)|| · ||v(t - Δt)||))",
      limitation:
        "Tracking noise on low-resolution cameras can create artificial micro-turns. Smoothed with running average.",
      getThresholdText: (cfg) => {
        const deg = cfg?.direction?.turn_deg ?? 60;
        const rate = cfg?.direction?.erratic_per_s ?? 0.8;
        return `Turn angle: ≥ ${deg}° | Rate: ≥ ${rate} turns/s`;
      },
      getPointsText: (cfg) => {
        const pts = cfg?.points?.erratic_swimming ?? 10;
        return `+${pts} pts (Erratic turning)`;
      },
      renderSvg: () => (
        <svg viewBox="0 0 200 100" className="w-full h-full stroke-warn fill-none">
          <path
            d="M 20 70 L 60 30 L 90 75 L 130 25 L 160 80"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="160" cy="80" r="4" fill="var(--danger)" />
        </svg>
      ),
    },
    {
      id: "isolation",
      index: 2,
      name: "Social Isolation",
      summary: "Distance from nearest conspecifics",
      definition:
        "Tracks Euclidean distance between the subject fish and its nearest tank-mate. Social shoaling fish consistently isolating in corners indicate weakness or bullying.",
      formula: "d_nn(t) = min_{j ≠ i} ||x_i(t) - x_j(t)||",
      limitation:
        "Only applicable to community tanks with 2 or more fish. Meaningless for solitary fish tanks.",
      getThresholdText: (cfg) => {
        const frac = ((cfg?.isolation?.nn_dist_frac_diag ?? 0.3) * 100).toFixed(0);
        const minRatio = ((cfg?.isolation?.ratio_min ?? 0.5) * 100).toFixed(0);
        return `Distance: > ${frac}% tank diag | Duration: > ${minRatio}% time`;
      },
      getPointsText: (cfg) => {
        const pts = cfg?.points?.isolation ?? 15;
        return `+${pts} pts (Persistent isolation)`;
      },
      renderSvg: () => (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Group */}
          <circle cx="150" cy="40" r="5" fill="var(--aqua)" />
          <circle cx="165" cy="55" r="5" fill="var(--aqua)" />
          <circle cx="140" cy="65" r="5" fill="var(--aqua)" />
          {/* Isolated fish */}
          <circle cx="35" cy="50" r="5" fill="var(--warn)" />
          {/* Distance line */}
          <line
            x1="35"
            y1="50"
            x2="140"
            y2="65"
            stroke="var(--hair-strong)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
      ),
    },
    {
      id: "vertical",
      index: 3,
      name: "Vertical Position",
      summary: "Surface gasping & bottom freezing",
      definition:
        "Analyzes normalized depth within the water column. Prolonged lingering at the water surface (y < 0.15) indicates hypoxia or gill irritation; lingering stationary on the tank floor indicates severe exhaustion.",
      formula: "y_norm(t) = (y(t) - y_surface) / (y_bottom - y_surface)",
      limitation:
        "Requires a side or front elevation view of the tank. Not supported in top-down camera angles.",
      getThresholdText: (cfg) => {
        const surf = ((cfg?.surface?.ratio_min ?? 0.35) * 100).toFixed(0);
        const bot = ((cfg?.bottom?.ratio_min ?? 0.6) * 100).toFixed(0);
        return `Surface gasping: > ${surf}% time | Bottom resting: > ${bot}% time`;
      },
      getPointsText: (cfg) => {
        const surfPts = cfg?.points?.surface_gasping ?? 20;
        const botPts = cfg?.points?.bottom_inactivity ?? 15;
        return `+${surfPts} pts (Surface) / +${botPts} pts (Bottom)`;
      },
      renderSvg: () => (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Water surface */}
          <line x1="0" y1="20" x2="200" y2="20" stroke="var(--aqua)" strokeWidth="1.5" />
          <text x="10" y="15" fill="var(--aqua)" fontSize="8" fontFamily="monospace">
            SURFACE ZONE
          </text>
          {/* Fish gasping at surface */}
          <circle cx="80" cy="22" r="5" fill="var(--danger)" />
          {/* Tank floor */}
          <line x1="0" y1="85" x2="200" y2="85" stroke="var(--hair-strong)" strokeWidth="1.5" />
          <text x="10" y="95" fill="var(--ink-3)" fontSize="8" fontFamily="monospace">
            SUBSTRATE
          </text>
        </svg>
      ),
    },
  ];

  // Handle keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % SIGNALS.length);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + SIGNALS.length) % SIGNALS.length);
    }
  };

  const selectedSignal = SIGNALS[selectedIndex];

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="grid grid-cols-1 md:grid-cols-12 gap-6 focus:outline-none focus-visible:ring-1 focus-visible:ring-aqua rounded"
    >
      {/* Left List of Signals */}
      <div className="md:col-span-5 space-y-2">
        <div className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-2 px-1">
          Select Signal (or use arrow keys)
        </div>
        {SIGNALS.map((sig) => {
          const isSelected = selectedIndex === sig.index;
          return (
            <button
              key={sig.id}
              type="button"
              data-testid={`signal-tab-${sig.index}`}
              onClick={() => setSelectedIndex(sig.index)}
              className={`w-full text-left p-4 rounded hairline-panel transition-all duration-150 flex items-start justify-between group ${
                isSelected
                  ? "border-aqua bg-trench/90 shadow-md"
                  : "border-hair hover:border-hair-strong hover:bg-trench/40"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-aqua">0{sig.index + 1}</span>
                  <span className="font-sans font-medium text-ink group-hover:text-foam">
                    {sig.name}
                  </span>
                </div>
                <div className="text-xs text-ink-3">{sig.summary}</div>
              </div>
              <span
                className={`w-2 h-2 rounded-full mt-2 transition-colors ${
                  isSelected ? "bg-aqua" : "bg-transparent group-hover:bg-hair"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Right Signal Detail Panel */}
      <div
        data-testid="signal-panel"
        className="md:col-span-7 hairline-panel p-6 flex flex-col justify-between bg-trench/50"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-hair">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-aqua">
                Signal 0{selectedSignal.index + 1} Specification
              </span>
              <h3 className="font-serif text-2xl font-medium text-ink mt-0.5">
                {selectedSignal.name}
              </h3>
            </div>
            <div className="font-mono text-xs text-warn px-2.5 py-1 rounded bg-warn/10 border border-warn/30">
              {selectedSignal.getPointsText(scoringConfig)}
            </div>
          </div>

          {/* SVG Trajectory Graphic */}
          <div className="w-full h-32 bg-abyss rounded border border-hair p-2 flex items-center justify-center overflow-hidden">
            {selectedSignal.renderSvg()}
          </div>

          {/* Definition */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1">
              Definition & Behavioural Context
            </div>
            <p className="text-sm text-ink-2 leading-relaxed">
              {selectedSignal.definition}
            </p>
          </div>

          {/* Mathematical Formula */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1">
              Measurement Formulation
            </div>
            <div className="font-mono text-xs p-2.5 rounded bg-abyss border border-hair text-aqua tabular-nums">
              {selectedSignal.formula}
            </div>
          </div>

          {/* Active Configured Threshold */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1">
              Active Configured Thresholds (from scoring API)
            </div>
            <div className="font-mono text-xs text-ink bg-trench p-2 rounded border border-hair">
              {selectedSignal.getThresholdText(scoringConfig)}
            </div>
          </div>

          {/* Limitation */}
          <div className="pt-2 border-t border-hair">
            <div className="text-xs text-ink-3 flex items-start gap-1.5">
              <span className="font-mono text-warn uppercase text-[10px] shrink-0 font-semibold">
                Limitation:
              </span>
              <span>{selectedSignal.limitation}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

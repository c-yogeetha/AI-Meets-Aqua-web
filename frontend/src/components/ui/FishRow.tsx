"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface FishItemData {
  id?: number;
  fish_id?: number;
  score: number;
  status?: string; // "Stressed" | "Watch" | "Normal" | "Not enough data"
  stressed?: boolean;
  flagged?: boolean;
  flags?: string[];
  explanation?: string;
  confidence?: number;
  metrics?: {
    speed_mean_cm_s?: number;
    speed_max_cm_s?: number;
    speed_bl_s?: number;
    erratic_turn_count?: number;
    depth_mean_norm?: number;
    surface_time_frac?: number;
    bottom_time_frac?: number;
    freezing_time_frac?: number;
    isolation_distance_cm?: number;
    active_frames?: number;
    total_frames?: number;
  };
}

interface FishRowProps {
  fish: FishItemData;
  className?: string;
}

export function FishRow({ fish, className = "" }: FishRowProps) {
  const [expanded, setExpanded] = useState(false);

  const rawId = String(fish.fish_id ?? fish.id ?? 1);
  const cleanId = rawId.replace(/^Fish_/, "");
  const confidence = fish.confidence ?? 1.0;
  const score = fish.score ?? 0;

  // Derive status text
  const statusText =
    fish.status ||
    (confidence < 0.4
      ? "Not enough data"
      : fish.stressed || score >= 60
      ? "Stressed"
      : score >= 35
      ? "Watch"
      : "Normal");

  const getStatusColor = (sText: string) => {
    const s = sText.toLowerCase();
    if (s.includes("stress")) return "border-danger/30 text-danger bg-danger/10";
    if (s.includes("watch")) return "border-warn/30 text-warn bg-warn/10";
    if (s.includes("normal")) return "border-ok/30 text-ok bg-ok/10";
    return "border-hair text-ink-3 bg-hair/10";
  };

  const getScoreBarColor = (sc: number) => {
    if (sc >= 60) return "bg-danger";
    if (sc >= 35) return "bg-warn";
    return "bg-ok";
  };

  return (
    <div
      data-testid={`fish-row-${cleanId}`}
      data-fish-raw-id={rawId}
      className={`hairline-panel p-3 transition-colors hover:border-hair-strong ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: ID & status */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-aqua">
            Fish #{cleanId}
          </span>
          <span
            data-testid={`fish-status-${cleanId}`}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider border ${getStatusColor(
              statusText
            )}`}
          >
            {statusText}
          </span>
          {confidence < 0.4 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-hair text-ink-3">
              Low tracking confidence
            </span>
          )}
        </div>

        {/* Center: Score bar */}
        <div className="flex items-center gap-3 w-full sm:w-48">
          <div className="w-full h-2 bg-abyss rounded-full overflow-hidden border border-hair">
            <div
              className={`h-full ${getScoreBarColor(score)} transition-all duration-300`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-ink shrink-0 w-8 text-right">
            {Math.round(score)}
          </span>
        </div>

        {/* Right: Expand button */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-mono uppercase text-ink-3 hover:text-aqua flex items-center gap-1 self-end sm:self-auto"
        >
          <span>{expanded ? "Less" : "Details"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Explanation line & flags */}
      <div className="mt-2 text-xs text-ink-2">
        <p>{fish.explanation || "Locomotion tracked across observation period."}</p>
        {fish.flags && fish.flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {fish.flags.map((flag, idx) => (
              <span
                key={idx}
                className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-abyss border border-hair text-warn"
              >
                {flag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expandable metrics with plain language */}
      {expanded && fish.metrics && (
        <div className="mt-3 pt-3 border-t border-hair grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {fish.metrics.speed_bl_s !== undefined && (
            <div className="p-2 rounded bg-abyss/50 border border-hair/50">
              <span className="text-ink-3 block text-[10px] uppercase">Body speed</span>
              <span className="text-ink font-semibold tabular-nums">
                {fish.metrics.speed_bl_s.toFixed(2)} BL/s
              </span>
            </div>
          )}
          {fish.metrics.erratic_turn_count !== undefined && (
            <div className="p-2 rounded bg-abyss/50 border border-hair/50">
              <span className="text-ink-3 block text-[10px] uppercase">Erratic turns</span>
              <span className="text-ink font-semibold tabular-nums">
                {fish.metrics.erratic_turn_count}
              </span>
            </div>
          )}
          {fish.metrics.surface_time_frac !== undefined && (
            <div className="p-2 rounded bg-abyss/50 border border-hair/50">
              <span className="text-ink-3 block text-[10px] uppercase">Near surface</span>
              <span className="text-ink font-semibold tabular-nums">
                {(fish.metrics.surface_time_frac * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {fish.metrics.freezing_time_frac !== undefined && (
            <div className="p-2 rounded bg-abyss/50 border border-hair/50">
              <span className="text-ink-3 block text-[10px] uppercase">Stationary time</span>
              <span className="text-ink font-semibold tabular-nums">
                {(fish.metrics.freezing_time_frac * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

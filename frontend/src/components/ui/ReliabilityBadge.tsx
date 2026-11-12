"use client";

import React from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

export interface ReliabilityData {
  score: number;
  level: "high" | "medium" | "low" | string;
  reasons: string[];
  tips: string[];
  metrics?: Record<string, unknown>;
}

interface ReliabilityBadgeProps {
  reliability?: ReliabilityData;
  className?: string;
}

export function ReliabilityBadge({ reliability, className = "" }: ReliabilityBadgeProps) {
  if (!reliability) return null;

  const getLevelConfig = () => {
    switch (reliability.level) {
      case "high":
        return {
          label: "High reliability",
          borderClass: "border-ok/30",
          textClass: "text-ok",
          bgClass: "bg-ok/10",
          icon: <CheckCircle className="w-3.5 h-3.5" />,
        };
      case "medium":
        return {
          label: "Moderate reliability",
          borderClass: "border-warn/30",
          textClass: "text-warn",
          bgClass: "bg-warn/10",
          icon: <Info className="w-3.5 h-3.5" />,
        };
      case "low":
      default:
        return {
          label: "Low reliability",
          borderClass: "border-danger/30",
          textClass: "text-danger",
          bgClass: "bg-danger/10",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
    }
  };

  const config = getLevelConfig();

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        data-testid="result-reliability"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider border ${config.borderClass} ${config.textClass} ${config.bgClass}`}
      >
        {config.icon}
        <span>
          {config.label} ({Math.round(reliability.score)}/100)
        </span>
      </div>

      {reliability.level !== "high" && (
        <div
          data-testid="reliability-banner"
          className="hairline-panel p-3 border-warn/30 bg-warn/5 text-xs text-ink-2 space-y-1.5"
        >
          <div className="font-mono text-warn font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Analysis Confidence Advisory</span>
          </div>
          {reliability.reasons && reliability.reasons.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-ink-3">
              {reliability.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {reliability.tips && reliability.tips.length > 0 && (
            <p className="text-ink-2 pt-1 border-t border-hair">
              <span className="text-aqua font-mono uppercase text-[10px] mr-1.5">Tip:</span>
              {reliability.tips.join(" ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

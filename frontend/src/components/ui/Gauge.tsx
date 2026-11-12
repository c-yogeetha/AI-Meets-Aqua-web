"use client";

import React from "react";

interface GaugeProps {
  score: number;
  level?: string;
  size?: number;
  className?: string;
}

export function Gauge({ score, level, size = 180, className = "" }: GaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Semicircle geometry
  // Angle from -180 deg (score 0) to 0 deg (score 100)
  // or 180 deg arc: -90 deg to +90 deg
  const angle = (clampedScore / 100) * 180 - 180; // -180 to 0 degrees

  // Determine level color
  let strokeColor = "var(--ok)";
  let levelText = level || "NORMAL";
  if (clampedScore >= 65) {
    strokeColor = "var(--danger)";
    if (!level) levelText = "STRESSED";
  } else if (clampedScore >= 30) {
    strokeColor = "var(--warn)";
    if (!level) levelText = "WATCH";
  }

  return (
    <div
      data-testid="result-gauge"
      className={`flex flex-col items-center justify-center select-none ${className}`}
      style={{ width: size, height: size * 0.65 }}
    >
      <svg
        viewBox="0 0 100 55"
        className="w-full h-full overflow-visible"
        aria-label={`Stress score gauge: ${clampedScore} of 100, level ${levelText}`}
      >
        <defs>
          <linearGradient id="gauge-track-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--ok)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--warn)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Background arc: radius 40, center (50, 50) */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="var(--hair-strong)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Active arc gradient indicator */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="url(#gauge-track-grad)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Needle */}
        {/* Needle center at (50, 48), length 32 */}
        <g
          transform={`rotate(${angle + 90}, 50, 48)`}
          className="transition-transform duration-500 ease-out"
        >
          <line
            x1="50"
            y1="48"
            x2="50"
            y2="18"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="50" cy="48" r="4" fill={strokeColor} />
        </g>
      </svg>

      <div className="flex flex-col items-center -mt-2">
        <div className="font-mono text-2xl font-bold tracking-tight tabular-nums" style={{ color: strokeColor }}>
          {clampedScore}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {levelText}
        </div>
      </div>
    </div>
  );
}

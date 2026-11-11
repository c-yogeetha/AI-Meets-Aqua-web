"use client";

import React from "react";

interface StressGaugeProps {
  score: number;
  level: string;
}

export default function StressGauge({ score, level }: StressGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Semicircle gauge: 180 degrees from -90 to +90
  // score 0 -> angle -90, score 100 -> angle 90
  const angle = -90 + (clampedScore / 100) * 180;

  const levelColor =
    level === "High"
      ? "#FF4D5E"
      : level === "Moderate"
      ? "#FFC145"
      : "#3DDC97";

  return (
    <div data-testid="result-gauge" className="flex flex-col items-center justify-center relative">
      <svg viewBox="0 0 200 120" className="w-56 sm:w-64 overflow-visible">
        <defs>
          {/* Gradients */}
          <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3DDC97" />
            <stop offset="34%" stopColor="#3DDC97" />
            <stop offset="35%" stopColor="#FFC145" />
            <stop offset="59%" stopColor="#FFC145" />
            <stop offset="60%" stopColor="#FF4D5E" />
            <stop offset="100%" stopColor="#FF4D5E" />
          </linearGradient>
          <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={levelColor} floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Outer Background Arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Colored Segments Arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeTrack)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="251.2"
          strokeDashoffset="0"
          opacity="0.85"
        />

        {/* Band Boundary Markers */}
        {/* Score 35: 35% of 180 deg = 63 deg -> -90 + 63 = -27 deg */}
        {/* Score 60: 60% of 180 deg = 108 deg -> -90 + 108 = 18 deg */}
        <line
          x1="100"
          y1="22"
          x2="100"
          y2="14"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          transform="rotate(-27 100 100)"
        />
        <line
          x1="100"
          y1="22"
          x2="100"
          y2="14"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          transform="rotate(18 100 100)"
        />

        {/* Needle */}
        <g
          transform={`rotate(${angle} 100 100)`}
          className="transition-transform duration-1000 ease-out"
          filter="url(#needleGlow)"
        >
          {/* Needle shape */}
          <polygon points="98,100 100,24 102,100" fill={levelColor} />
          <circle cx="100" cy="100" r="7" fill={levelColor} />
          <circle cx="100" cy="100" r="3" fill="#04141F" />
        </g>

        {/* Arc Labels */}
        <text x="20" y="118" fill="#3DDC97" fontSize="9" fontWeight="600" textAnchor="start">
          Normal
        </text>
        <text x="100" y="118" fill="#FFC145" fontSize="9" fontWeight="600" textAnchor="middle">
          Moderate
        </text>
        <text x="180" y="118" fill="#FF4D5E" fontSize="9" fontWeight="600" textAnchor="end">
          High
        </text>
      </svg>

      {/* Numerical score & Level badge */}
      <div className="flex flex-col items-center -mt-6">
        <span
          data-testid="result-score"
          className="font-display font-extrabold text-4xl sm:text-5xl text-white tracking-tight"
        >
          {clampedScore}
        </span>
        <span
          data-testid="result-level"
          className="mt-1 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm"
          style={{
            backgroundColor: `${levelColor}20`,
            color: levelColor,
            border: `1px solid ${levelColor}40`,
          }}
        >
          {level} Stress
        </span>
      </div>
    </div>
  );
}

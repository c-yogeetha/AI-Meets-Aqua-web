"use client";

import React from "react";
import Link from "next/link";

export interface TimelineStage {
  id: string; // e.g. "upload", "clean", "detect", "track", "score", "advise"
  name: string;
  summary: string;
  details: string;
}

const STAGES: TimelineStage[] = [
  {
    id: "upload",
    name: "Upload",
    summary: "Video ingestion & integrity check",
    details: "Container validation, metadata probe, codec verification, and dimensions check.",
  },
  {
    id: "clean",
    name: "Clean",
    summary: "Quality probe & baseline establishment",
    details: "Frame brightness, contrast, sharpness, shake assessment, and transparent reliability rating.",
  },
  {
    id: "detect",
    name: "Detect",
    summary: "Fused 3-cue candidate extraction",
    details: "MOG2 foreground subtraction, circular hue k-means clustering, local contrast, and watershed blob splitting.",
  },
  {
    id: "track",
    name: "Track",
    summary: "Hungarian data association",
    details: "Centroid and color histogram matching, multi-frame continuity, and template coasting for still fish.",
  },
  {
    id: "score",
    name: "Score",
    summary: "Deterministic behaviour rules",
    details: "Feature extraction (speed, erratic turns, depth ratio, isolation) mapped to transparent point penalties.",
  },
  {
    id: "advise",
    name: "Advise",
    summary: "Actionable caretaker recommendations",
    details: "Categorized guidance based on identified stressors (aeration, water parameters, isolation check).",
  },
];

interface DrawnTimelineProps {
  className?: string;
}

export function DrawnTimeline({ className = "" }: DrawnTimelineProps) {
  return (
    <div className={`relative max-w-3xl mx-auto py-8 ${className}`}>
      {/* Central vertical line */}
      <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-[2px] bg-hair -translate-x-1/2" />

      <div className="space-y-12">
        {STAGES.map((stage, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <div
              key={stage.id}
              data-testid={`timeline-node-${idx}`}
              className={`relative flex items-center ${
                isEven ? "sm:flex-row-reverse" : "sm:flex-row"
              } flex-row pl-10 sm:pl-0`}
            >
              {/* Timeline Center Node */}
              <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-abyss border-2 border-aqua flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-aqua" />
              </div>

              {/* Content Card (alternating sides on desktop) */}
              <div className="w-full sm:w-1/2 px-0 sm:px-8">
                <Link
                  href={`/how-it-works#${stage.id}`}
                  className="block hairline-panel p-5 transition-all hover:border-aqua/50 group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs uppercase tracking-wider text-aqua">
                      0{idx + 1} / {stage.name}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3 uppercase tracking-wider group-hover:text-aqua transition-colors">
                      Learn more &rarr;
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-medium text-ink group-hover:text-foam transition-colors mb-2">
                    {stage.summary}
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    {stage.details}
                  </p>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

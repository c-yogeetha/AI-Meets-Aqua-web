"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Gauge } from "@/components/ui/Gauge";
import { FishRow, type FishItemData } from "@/components/ui/FishRow";
import { TimelineChart } from "@/components/ui/TimelineChart";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ResultResponse, SuggestionItem } from "@/lib/api";

export function SampleResultSection() {
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    fetch("/sample/result.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setResult(data);
      })
      .catch(() => {});
  }, []);

  if (!result) {
    return (
      <div className="w-full py-16 text-center text-ink-3 font-mono text-sm">
        Loading sample pipeline output...
      </div>
    );
  }

  const isSynthetic = true; // generated from synthetic sample
  const labelText = isSynthetic
    ? "Sample output (baseline analyzer, synthetic clip)"
    : "Real output";

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hair">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-aqua block mb-1">
            {labelText}
          </span>
          <h3 className="font-serif text-2xl font-medium text-ink">
            {result.tank?.name || "Main Observation Tank"}
          </h3>
          <p className="text-xs text-ink-3 font-mono mt-0.5">
            Analyzed with {result.mode || "baseline classical"} mode
          </p>
        </div>

        <Link
          href="/app"
          className="btn-primary-gold text-xs font-mono uppercase tracking-wider self-start sm:self-auto"
        >
          <span>Open the app</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Primary KPI Row: Gauge, Reliability & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Gauge */}
        <div className="md:col-span-4 hairline-panel p-6 flex flex-col items-center justify-center bg-trench/40">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-2">
            Overall Tank Score
          </div>
          <Gauge score={result.tank_score ?? 0} level={result.level} size={190} />
          <div className="mt-2 text-center text-xs text-ink-3">
            Threshold: {result.threshold ?? 35} / 100
          </div>
        </div>

        {/* Reliability & Video Preview */}
        <div className="md:col-span-8 hairline-panel p-6 space-y-4 bg-trench/40">
          <ReliabilityBadge reliability={result.reliability} />

          {/* Timeline Chart */}
          {result.timeline && result.timeline.length > 0 && (
            <TimelineChart
              timeline={result.timeline}
              currentTime={currentTime}
              onSeek={(t) => setCurrentTime(t)}
            />
          )}
        </div>
      </div>

      {/* Tracked Fish Rows */}
      {result.fish && result.fish.length > 0 && (
        <div className="space-y-3">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-3">
            Individual Fish Breakdown ({result.fish.length} tracked)
          </div>
          <div className="space-y-2">
            {(result.fish as unknown as FishItemData[]).map((f) => (
              <FishRow key={f.fish_id} fish={f} />
            ))}
          </div>
        </div>
      )}

      {/* Actionable Suggestions */}
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="hairline-panel p-5 bg-trench/30 space-y-3">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Recommended Actions for Tank Caretaker</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.suggestions.slice(0, 4).map((sugg: SuggestionItem, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded bg-abyss/60 border border-hair space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{sugg.behaviour || "Observed behaviour"}</span>
                  <span className="font-mono text-[10px] uppercase text-warn px-1.5 py-0.5 rounded bg-warn/10 border border-warn/20">
                    {sugg.priority || "priority"}
                  </span>
                </div>
                <p className="text-ink-3">
                  <strong className="text-ink-2 font-normal">Cause: </strong>
                  {sugg.cause}
                </p>
                <p className="text-aqua">
                  <strong className="text-ink-2 font-normal">Action: </strong>
                  {sugg.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

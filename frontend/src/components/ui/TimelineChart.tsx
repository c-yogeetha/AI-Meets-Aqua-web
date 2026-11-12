"use client";

import React, { useEffect, useState } from "react";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface TimelineDataPoint {
  t: number;
  score: number;
  [key: string]: unknown;
}

interface TimelineChartProps {
  timeline: TimelineDataPoint[];
  currentTime?: number;
  onSeek?: (timeSec: number) => void;
  className?: string;
}

export function TimelineChart({
  timeline,
  currentTime,
  onSeek,
  className = "",
}: TimelineChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div
        data-testid="result-timeline"
        className={`w-full h-44 bg-trench/50 rounded flex items-center justify-center font-mono text-xs text-ink-3 ${className}`}
      >
        Loading timeline chart...
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div
        data-testid="result-timeline"
        className="w-full h-44 bg-trench/50 rounded flex items-center justify-center font-mono text-xs text-ink-3"
      >
        No timeline data available
      </div>
    );
  }

  const handleClick: CategoricalChartFunc<React.MouseEvent<SVGGraphicsElement>> = (nextState) => {
    if (nextState) {
      if (typeof nextState.activeLabel === "number" && onSeek) {
        onSeek(nextState.activeLabel);
      } else if (
        typeof nextState.activeTooltipIndex === "number" &&
        timeline[nextState.activeTooltipIndex] &&
        onSeek
      ) {
        onSeek(timeline[nextState.activeTooltipIndex].t);
      }
    }
  };

  return (
    <div
      data-testid="result-timeline"
      className={`w-full h-48 hairline-panel p-3 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-mono text-ink-3 mb-1">
        <span className="uppercase tracking-wider">Stress Score Progression Over Time</span>
        <span className="text-[10px]">Click point to seek</span>
      </div>

      <div className="w-full h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeline}
            onClick={handleClick}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="t"
              stroke="var(--ink-3)"
              fontSize={10}
              tickFormatter={(t) => `${t}s`}
              tickLine={false}
              axisLine={{ stroke: "var(--hair)" }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--ink-3)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "var(--hair)" }}
              ticks={[0, 30, 65, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as TimelineDataPoint;
                  return (
                    <div className="bg-abyss/95 border border-hair p-2 rounded shadow-lg font-mono text-xs text-ink">
                      <div>
                        Time: <span className="text-aqua">{data.t}s</span>
                      </div>
                      <div>
                        Stress:{" "}
                        <span
                          className={
                            data.score >= 65
                              ? "text-danger"
                              : data.score >= 30
                              ? "text-warn"
                              : "text-ok"
                          }
                        >
                          {Math.round(data.score)}/100
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Warning threshold line */}
            <ReferenceLine y={30} stroke="var(--warn)" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={65} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.4} />

            {/* Current playback playhead line */}
            {currentTime !== undefined && (
              <ReferenceLine
                x={currentTime}
                stroke="var(--aqua)"
                strokeWidth={2}
                label={{
                  value: "playhead",
                  position: "top",
                  fill: "var(--aqua)",
                  fontSize: 9,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--aqua)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--aqua)" }}
              activeDot={{ r: 5, stroke: "var(--foam)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

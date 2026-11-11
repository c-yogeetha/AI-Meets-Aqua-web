"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TimelinePoint, FishStress } from "@/lib/api";

interface StressTimelineProps {
  timeline: TimelinePoint[];
  fishList: FishStress[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
}

export default function StressTimeline({
  timeline,
  fishList,
  currentTime,
  onSeek,
}: StressTimelineProps) {
  const [selectedFish, setSelectedFish] = useState<string>("tank");

  if (!timeline || timeline.length === 0) {
    return (
      <div
        data-testid="result-timeline"
        className="glass-card p-6 text-center text-xs text-foam/50 border-white/10"
      >
        No timeline data available for this clip duration.
      </div>
    );
  }

  // Build unified timeline data
  // Start with tank timeline points: { t: number, tank: score, [fish_id]: score }
  const timeMap = new Map<number, Record<string, number>>();

  timeline.forEach((pt) => {
    const roundedT = Math.round(pt.t * 10) / 10;
    const entry = timeMap.get(roundedT) || { t: roundedT };
    entry.tank = pt.score;
    timeMap.set(roundedT, entry);
  });

  fishList.forEach((fish) => {
    if (fish.timeline) {
      fish.timeline.forEach((pt) => {
        const roundedT = Math.round(pt.t * 10) / 10;
        const entry = timeMap.get(roundedT) || { t: roundedT };
        entry[fish.id] = pt.score;
        timeMap.set(roundedT, entry);
      });
    }
  });

  const chartData = Array.from(timeMap.values()).sort((a, b) => a.t - b.t);
  const activeKey = selectedFish;

  return (
    <div data-testid="result-timeline" className="glass-card p-5 border-white/10 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Stress Timeline (5s Windows)</h3>
          <p className="text-[11px] text-foam/60">
            Click any point on the chart to jump the video to that moment.
          </p>
        </div>

        {/* Fish Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="fish-select" className="text-xs text-foam/70">
            Focus:
          </label>
          <select
            id="fish-select"
            data-testid="timeline-fish-select"
            value={selectedFish}
            onChange={(e) => setSelectedFish(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-aqua"
          >
            <option value="tank" className="bg-deep text-white">
              Overall Tank Score
            </option>
            {fishList.map((f) => (
              <option key={f.id} value={f.id} className="bg-deep text-white">
                {f.id} ({f.score})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onClick={(e) => {
              const eventPayload = e as { activePayload?: Array<{ payload?: { t?: number } }> };
              if (eventPayload?.activePayload && eventPayload.activePayload.length > 0) {
                const pt = eventPayload.activePayload[0].payload;
                if (pt && typeof pt.t === "number") {
                  onSeek(pt.t);
                }
              }
            }}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3DD6D0" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3DD6D0" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              unit="s"
              stroke="rgba(255, 255, 255, 0.3)"
              tick={{ fill: "#CFF5F2", fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="rgba(255, 255, 255, 0.3)"
              tick={{ fill: "#CFF5F2", fontSize: 11 }}
            />
            <ReferenceLine
              y={35}
              stroke="#FFC145"
              strokeDasharray="4 4"
              label={{
                value: "Threshold (35)",
                fill: "#FFC145",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            {currentTime > 0 && (
              <ReferenceLine
                x={Math.round(currentTime * 10) / 10}
                stroke="#FF8A1F"
                strokeWidth={2}
                label={{
                  value: "Now",
                  fill: "#FF8A1F",
                  fontSize: 10,
                  position: "top",
                }}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as Record<string, number>;
                  return (
                    <div className="p-2.5 rounded-xl bg-deep border border-white/20 shadow-xl text-xs">
                      <div className="font-semibold text-aqua mb-1">Time: {data.t}s</div>
                      <div className="text-white">
                        {activeKey === "tank" ? "Tank Stress" : activeKey}:{" "}
                        <span className="font-mono font-bold text-gold">
                          {data[activeKey] ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey={activeKey}
              stroke="#3DD6D0"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#timelineGradient)"
              activeDot={{ r: 6, fill: "#FF8A1F", stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

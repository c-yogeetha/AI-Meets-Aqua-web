"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Loader2,
} from "lucide-react";

export default function InsightsPage() {
  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [showFormula, setShowFormula] = useState(false);

  const { data: tanks } = useQuery({
    queryKey: ["tanks"],
    queryFn: () => api.listTanks(),
  });

  const activeTankId = selectedTankId || (tanks && tanks[0]?.id) || "";

  const { data: insights, isLoading } = useQuery({
    queryKey: ["insights", activeTankId],
    queryFn: () => api.getInsights(activeTankId),
    enabled: Boolean(activeTankId),
  });

  const { data: history } = useQuery({
    queryKey: ["history", activeTankId],
    queryFn: () => api.getHistory(activeTankId || undefined),
    enabled: Boolean(activeTankId),
  });

  const fsi = insights?.fsi ?? null;
  const trend = insights?.trend ?? "insufficient_data";
  const messages = insights?.messages ?? [];

  const trendIcon =
    trend === "improving" ? (
      <TrendingDown className="w-5 h-5 text-ok" />
    ) : trend === "worsening" ? (
      <TrendingUp className="w-5 h-5 text-danger" />
    ) : (
      <Minus className="w-5 h-5 text-foam/60" />
    );

  const chartData = (insights?.series || []).map((pt) => ({
    date: new Date(pt.date).toLocaleDateString([], { month: "short", day: "numeric" }),
    score: pt.score,
  }));

  return (
    <div className="space-y-8">
      {/* Header & Tank Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
            Fish Stress Index & Insights
          </h1>
          <p className="text-xs text-foam/60 font-mono mt-0.5">
            Longitudinal trend tracking, weighted baseline FSI, and environmental patterns
          </p>
        </div>

        {tanks && tanks.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-foam/60">Tank:</span>
            <select
              value={activeTankId}
              onChange={(e) => setSelectedTankId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
            >
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-aqua mb-2" />
          <span className="text-xs text-foam/60 font-mono">Loading insights...</span>
        </div>
      ) : !activeTankId || !insights || chartData.length === 0 ? (
        <div className="glass-card p-12 text-center border-border/40">
          <Activity className="w-10 h-10 text-aqua/50 mx-auto mb-3" />
          <h2 className="font-semibold text-foam text-sm mb-1">No historical data yet</h2>
          <p className="text-xs text-foam/60 max-w-sm mx-auto">
            Analyse videos for this tank to compute the Fish Stress Index and detect environmental trends.
          </p>
        </div>
      ) : (
        <>
          {/* FSI & Trend Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 border-border/40">
              <span className="text-[10px] uppercase font-mono tracking-wider text-foam/60 block mb-1">
                Fish Stress Index (FSI)
              </span>
              <div className="flex items-baseline gap-3">
                <span data-testid="fsi-value" className="font-mono text-4xl font-bold text-foam">
                  {fsi !== null ? fsi : "N/A"}
                </span>
                <span className="text-xs text-foam/50 font-mono">/ 100</span>
              </div>
              <p className="text-[11px] text-foam/50 mt-2">
                Weighted rolling index of the 5 most recent analyses.
              </p>
            </div>

            <div className="glass-card p-5 border-border/40">
              <span className="text-[10px] uppercase font-mono tracking-wider text-foam/60 block mb-1">
                Trend Direction
              </span>
              <div className="flex items-center gap-2 mt-1">
                {trendIcon}
                <span className="font-display font-semibold text-xl text-foam capitalize">
                  {trend.replace("_", " ")}
                </span>
              </div>
              <p className="text-[11px] text-foam/50 mt-2">
                {trend === "improving"
                  ? "Average stress has decreased over recent recordings."
                  : trend === "worsening"
                  ? "Elevated scores observed compared to baseline."
                  : "Consistent scores across observation periods."}
              </p>
            </div>

            <div className="glass-card p-5 border-border/40">
              <span className="text-[10px] uppercase font-mono tracking-wider text-foam/60 block mb-1">
                Current Level
              </span>
              <div className="mt-2">
                <StatusChip
                  label={insights.level || "Normal"}
                  variant={
                    insights.level === "Critical"
                      ? "prototype"
                      : insights.level === "Elevated"
                      ? "validation"
                      : "real"
                  }
                />
              </div>
              <p className="text-[11px] text-foam/50 mt-3">
                {insights.series.length} data points recorded for this enclosure.
              </p>
            </div>
          </div>

          {/* FSI Formula Note (Expandable) */}
          <div className="glass-card p-4 border-border/40">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="w-full flex items-center justify-between text-left text-xs font-mono text-foam/70 hover:text-foam"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-aqua" />
                <span>How is FSI computed? (Weighted rolling formula)</span>
              </div>
              {showFormula ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFormula && (
              <div className="mt-3 pt-3 border-t border-border/30 text-xs text-foam/70 space-y-2 font-mono">
                <p>
                  FSI uses a 5-step decaying geometric weight distribution to reflect recent changes
                  while retaining context from previous days:
                </p>
                <div className="p-3 rounded-lg bg-abyss border border-border/50 text-aqua">
                  FSI = (0.40 × S<sub>t</sub> + 0.25 × S<sub>t-1</sub> + 0.20 × S<sub>t-2</sub> + 0.10 × S<sub>t-3</sub> + 0.05 × S<sub>t-4</sub>)
                </div>
                <p className="text-[11px] text-foam/50">
                  Where S<sub>t</sub> is the tank stress score from the latest analysis. Missing historical slots are normalized across available samples.
                </p>
              </div>
            )}
          </div>

          {/* Longitudinal Trend Chart */}
          <div data-testid="trend-chart" className="glass-card p-6 border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
                Stress Score Over Time
              </h2>
              <span className="text-[11px] font-mono text-foam/50">
                Threshold: 35 (Elevated), 65 (Critical)
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    stroke="#8892b0"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2937" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#8892b0"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2937" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#060d1a",
                      border: "1px solid #1a2744",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                  <ReferenceLine y={35} stroke="#d97706" strokeDasharray="3 3" />
                  <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4fd1c5"
                    strokeWidth={2.5}
                    dot={{ fill: "#4fd1c5", r: 4 }}
                    activeDot={{ r: 6, fill: "#f6ad55" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detected Patterns */}
          {messages.length > 0 && (
            <div className="glass-card p-5 border-border/40 space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
                Observed Environmental Patterns
              </h2>
              <div className="space-y-2">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-lagoon/30 border border-aqua/30 text-xs text-foam flex items-start gap-2.5"
                  >
                    <Info className="w-4 h-4 text-aqua flex-shrink-0 mt-0.5" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recorded Context Table */}
          {history?.items && history.items.length > 0 && (
            <div className="glass-card p-6 border-border/40 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
                Recorded Environmental Context vs Stress Score
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/40 text-[10px] font-mono uppercase text-foam/50">
                    <tr>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Level</th>
                      <th className="pb-2">Stressed Fish</th>
                      <th className="pb-2">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-mono">
                    {history.items.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="py-2.5 text-foam">
                          {new Date(item.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 font-bold text-foam">{item.tank_score}</td>
                        <td className="py-2.5">
                          <StatusChip
                            label={item.level}
                            variant={
                              item.level === "Critical"
                                ? "prototype"
                                : item.level === "Elevated"
                                ? "validation"
                                : "real"
                            }
                          />
                        </td>
                        <td className="py-2.5 text-foam/70">
                          {item.stressed_count}/{item.fish_count}
                        </td>
                        <td className="py-2.5 text-foam/50 capitalize">{item.mode || "classical"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

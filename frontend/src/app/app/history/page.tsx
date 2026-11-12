"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type HistoryItem,
  type TrashItem,
  ApiError,
} from "@/lib/api";
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
  Trash2,
  RotateCcw,
  Sparkles,
  Calendar,
  Fish,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function HistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"analyses" | "bin">("analyses");

  // Tanks
  const { data: tanks } = useQuery({
    queryKey: ["tanks"],
    queryFn: () => api.listTanks(),
  });

  // History query
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery({
    queryKey: ["history", selectedTankId],
    queryFn: () => api.getHistory(selectedTankId || undefined),
  });

  // Insights query
  const { data: insightsData } = useQuery({
    queryKey: ["insights", selectedTankId],
    queryFn: () => api.getInsights(selectedTankId || undefined),
  });

  // Trash query
  const { data: trashData, isLoading: trashLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: () => api.listTrash(),
    enabled: activeTab === "bin",
  });

  // Seed demo mutation
  const seedDemoMutation = useMutation({
    mutationFn: () => api.seedDemo(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      showToast("Demo tank & sample analyses seeded", "success");
      if (data.result_ids && data.result_ids.length > 0) {
        router.push(`/app/results/${data.result_ids[0]}`);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to seed demo data";
      showToast(msg, "danger");
    },
  });

  // Delete result mutation
  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => api.deleteResult(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      showToast("Moved to recycle bin", "info");
    },
  });

  // Restore trash mutation
  const restoreMutation = useMutation({
    mutationFn: (jobId: string) => api.restoreTrash(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      showToast("Analysis restored successfully", "success");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to restore";
      showToast(msg, "danger");
    },
  });

  // Purge trash mutation
  const purgeMutation = useMutation({
    mutationFn: () => api.purgeTrash(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      showToast(`Purged ${data.purged} expired item(s)`, "info");
    },
  });

  // Format chart data for trend
  const trendPoints =
    insightsData?.series && insightsData.series.length > 0
      ? insightsData.series.map((pt) => ({
          date: new Date(pt.date).toLocaleDateString([], { month: "short", day: "numeric" }),
          score: pt.score,
        }))
      : historyData?.items && historyData.items.length > 0
      ? [...historyData.items]
          .reverse()
          .map((item) => ({
            date: new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric" }),
            score: item.tank_score,
          }))
      : [];

  const fsi = insightsData?.fsi ?? null;
  const trend = insightsData?.trend ?? "stable";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            Historical Records & Insights
          </h1>
          <p className="text-foam/70 text-sm">
            Track long-term tank wellbeing, trends, and review past video analyses.
          </p>
        </div>

        {/* Tank Filter dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="tank-filter" className="text-xs text-foam/70">
            Filter:
          </label>
          <select
            id="tank-filter"
            value={selectedTankId}
            onChange={(e) => setSelectedTankId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-aqua"
          >
            <option value="" className="bg-deep text-white">
              All Tanks
            </option>
            {tanks?.map((t) => (
              <option key={t.id} value={t.id} className="bg-deep text-white">
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("analyses")}
          data-testid="tab-analyses"
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "analyses"
              ? "bg-aqua/20 text-aqua border border-aqua/30 shadow-aqua-glow"
              : "text-foam/70 hover:text-white"
          }`}
        >
          Analyses History
        </button>
        <button
          onClick={() => setActiveTab("bin")}
          data-testid="tab-bin"
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "bin"
              ? "bg-danger/20 text-danger border border-danger/30"
              : "text-foam/70 hover:text-white"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Recycle Bin</span>
        </button>
      </div>

      {activeTab === "analyses" ? (
        <div className="space-y-8">
          {/* FSI & Trend Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FSI Card */}
            <div className="glass-card p-6 border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-aqua font-semibold">
                    Fish Stress Index (FSI)
                  </span>
                  {/* Trend Arrow */}
                  <span
                    data-testid="fsi-trend"
                    className="flex items-center gap-1 text-xs font-semibold"
                  >
                    {trend === "improving" ? (
                      <span className="text-ok flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" /> Improving
                      </span>
                    ) : trend === "worsening" ? (
                      <span className="text-danger flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> Worsening
                      </span>
                    ) : (
                      <span className="text-foam/60 flex items-center gap-1">
                        <Minus className="w-4 h-4" /> Stable
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <span
                    data-testid="fsi-value"
                    className="font-display text-4xl sm:text-5xl font-extrabold text-white"
                  >
                    {fsi !== null ? fsi : "--"}
                  </span>
                  {fsi !== null && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        fsi < 35
                          ? "bg-ok/20 text-ok"
                          : fsi < 60
                          ? "bg-warn/20 text-warn"
                          : "bg-danger/20 text-danger"
                      }`}
                    >
                      {fsi < 35 ? "Normal" : fsi < 60 ? "Moderate" : "High"}
                    </span>
                  )}
                </div>
              </div>

              {/* Insights Messages */}
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                {insightsData?.messages && insightsData.messages.length > 0 ? (
                  insightsData.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-foam/80 leading-relaxed">
                      • {msg}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-foam/50 italic">
                    {historyData?.items && historyData.items.length > 0
                      ? "Keep recording regular checks to surface behavioral trends."
                      : "No past data recorded yet."}
                  </p>
                )}
              </div>
            </div>

            {/* Trend Chart */}
            <div
              data-testid="trend-chart"
              className="lg:col-span-2 glass-card p-6 border-white/10 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-wider text-aqua font-semibold">
                  Historical Stress Trajectory
                </h3>
                <span className="text-[11px] text-foam/60">Tank score over time</span>
              </div>

              <div className="h-44 w-full">
                {trendPoints.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendPoints} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: "#CFF5F2", fontSize: 10 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: "#CFF5F2", fontSize: 10 }}
                      />
                      <ReferenceLine y={35} stroke="#FFC145" strokeDasharray="3 3" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload as { date: string; score: number };
                            return (
                              <div className="p-2 rounded bg-deep border border-white/20 text-xs">
                                <div className="text-foam/60">{d.date}</div>
                                <div className="font-bold text-aqua">Score: {d.score}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3DD6D0"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#FF8A1F" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-foam/40">
                    At least two analyses needed to display a trend line.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analyses List */}
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase text-aqua mb-4">
              Recorded Analyses ({historyData?.items.length || 0})
            </h2>

            {historyLoading && (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-aqua mx-auto mb-2" />
                <span className="text-xs text-foam/60">Loading history records...</span>
              </div>
            )}

            {historyError && (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
                Failed to load history records.
              </div>
            )}

            {!historyLoading && historyData && historyData.items.length === 0 && (
              <div className="glass-card p-12 text-center border-dashed border-white/20">
                <Fish className="w-12 h-12 text-gold/60 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-1">No analysis records found</h3>
                <p className="text-xs text-foam/60 max-w-sm mx-auto mb-6">
                  Upload a tank video or load sample demo footage to evaluate fish behaviour.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/analyse" className="btn-gold px-4 py-2 rounded-xl text-xs font-semibold">
                    Analyse a Video
                  </Link>
                  <button
                    onClick={() => seedDemoMutation.mutate()}
                    disabled={seedDemoMutation.isPending}
                    className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{seedDemoMutation.isPending ? "Seeding..." : "Try a sample"}</span>
                  </button>
                </div>
              </div>
            )}

            {!historyLoading && historyData && historyData.items.length > 0 && (
              <div className="space-y-3">
                {historyData.items.map((item: HistoryItem) => {
                  const levelColor =
                    item.level === "High"
                      ? "text-danger bg-danger/10 border-danger/30"
                      : item.level === "Moderate"
                      ? "text-warn bg-warn/10 border-warn/30"
                      : "text-ok bg-ok/10 border-ok/30";

                  return (
                    <div
                      key={item.id}
                      data-testid={`history-row-${item.id}`}
                      className="glass-card p-4 sm:p-5 border-white/10 hover:border-aqua/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <Link href={`/app/results/${item.id}`} className="flex-1 space-y-1 group">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white group-hover:text-aqua transition-colors text-base">
                            {item.tank_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${levelColor}`}>
                            {item.level} ({item.tank_score})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border ${
                              item.mode === "mock"
                                ? "bg-gold/10 text-gold border-gold/30"
                                : "bg-aqua/10 text-aqua border-aqua/30"
                            }`}
                          >
                            {item.mode === "mock" ? "Demo" : item.mode}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-foam/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>
                            {item.stressed_count > 0 ? (
                              <span className="text-danger font-semibold">
                                {item.stressed_count} stressed
                              </span>
                            ) : (
                              <span className="text-ok">All normal</span>
                            )}
                          </span>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link
                          href={`/app/results/${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-foam/80 hover:text-white transition-colors"
                        >
                          View Report
                        </Link>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-foam/40 hover:text-danger transition-colors"
                          title="Move to recycle bin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Recycle Bin Tab */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-wider uppercase text-danger">
                Recycle Bin (7-day retention)
              </h2>
              <p className="text-xs text-foam/60 mt-0.5">
                Deleted analyses stay here for 7 days before permanent removal.
              </p>
            </div>
            <button
              onClick={() => purgeMutation.mutate()}
              disabled={purgeMutation.isPending}
              className="px-3 py-1.5 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Expired Trash</span>
            </button>
          </div>

          {trashLoading && (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-aqua mx-auto mb-2" />
              <span className="text-xs text-foam/60">Loading recycle bin...</span>
            </div>
          )}

          {!trashLoading && trashData && trashData.length === 0 && (
            <div className="glass-card p-12 text-center border-dashed border-white/20">
              <Trash2 className="w-12 h-12 text-foam/30 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">Recycle Bin is empty</h3>
              <p className="text-xs text-foam/60">
                No analyses have been deleted recently.
              </p>
            </div>
          )}

          {!trashLoading && trashData && trashData.length > 0 && (
            <div className="space-y-3">
              {trashData.map((item: TrashItem) => (
                <div
                  key={item.id}
                  data-testid={`bin-row-${item.id}`}
                  className="glass-card p-4 sm:p-5 border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{item.tank_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-foam/80">
                        Score: {item.tank_score} ({item.level})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foam/50">
                      <span data-testid={`bin-days-${item.id}`} className="text-warn font-semibold">
                        {item.days_remaining} day(s) remaining
                      </span>
                      <span>•</span>
                      <span>Deleted: {new Date(item.deleted_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    data-testid={`restore-${item.id}`}
                    onClick={() => restoreMutation.mutate(item.id)}
                    disabled={restoreMutation.isPending}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

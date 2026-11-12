"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Box,
  Video,
  AlertTriangle,
  Activity,
  Plus,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function OverviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  const {
    data: overview,
    isLoading,
  } = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.getOverview(),
    refetchInterval: 15000,
  });

  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      const seed = await api.seedDemo();
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      showToast("Sample tank and analyses seeded", "success");
      const targetId = seed.result_ids?.[0];
      if (targetId) {
        router.push(`/app/results/${targetId}`);
      }
    } catch {
      showToast("Failed to load demo data", "danger");
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-aqua mb-3" />
        <span className="text-xs text-foam/60 font-mono">Loading overview...</span>
      </div>
    );
  }

  const isEmpty =
    !overview ||
    (overview.tanks_count === 0 && overview.analyses_count === 0);

  if (isEmpty) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="glass-card p-10 border-border/60">
          <div className="w-14 h-14 rounded-2xl bg-lagoon/40 border border-aqua/30 text-aqua flex items-center justify-center mx-auto mb-4">
            <Box className="w-7 h-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foam mb-2">
            Welcome to Matsya
          </h1>
          <p className="text-sm text-foam/70 mb-8 max-w-md mx-auto">
            Matsya monitors goldfish behaviour through classical computer vision,
            providing objective stress scoring and caretaker advisories.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app/tanks"
              className="btn-gold w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Tank</span>
            </Link>
            <button
              data-testid="cta-sample"
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="btn-secondary w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-gold" />
              <span>{isSeeding ? "Loading Demo..." : "Try a Sample Video"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
            System Overview
          </h1>
          <p className="text-xs text-foam/60 font-mono mt-0.5">
            Operational dashboard and recent analysis activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/analyse"
            className="btn-gold px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Analyse Video</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-border/40">
          <div className="flex items-center justify-between text-foam/60 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Tanks</span>
            <Box className="w-4 h-4 text-aqua" />
          </div>
          <div className="font-mono text-2xl font-bold text-foam">
            {overview.tanks_count}
          </div>
          <span className="text-[10px] text-foam/50 font-mono">Monitored enclosures</span>
        </div>

        <div className="glass-card p-4 border-border/40">
          <div className="flex items-center justify-between text-foam/60 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">This Week</span>
            <Activity className="w-4 h-4 text-ok" />
          </div>
          <div className="font-mono text-2xl font-bold text-foam">
            {overview.analyses_this_week}
          </div>
          <span className="text-[10px] text-foam/50 font-mono">Analyses completed</span>
        </div>

        <div className="glass-card p-4 border-border/40">
          <div className="flex items-center justify-between text-foam/60 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Flagged Fish</span>
            <ShieldAlert className="w-4 h-4 text-warn" />
          </div>
          <div className="font-mono text-2xl font-bold text-warn">
            {overview.flagged_fish_count}
          </div>
          <span className="text-[10px] text-foam/50 font-mono">Requiring observation</span>
        </div>

        <div className="glass-card p-4 border-border/40">
          <div className="flex items-center justify-between text-foam/60 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <div className="font-mono text-2xl font-bold text-foam">
            {overview.unread_alerts_count}
          </div>
          <span className="text-[10px] text-foam/50 font-mono">Unread notifications</span>
        </div>
      </div>

      {/* Monitored Tanks Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
            Monitored Tanks ({overview.tanks.length})
          </h2>
          <Link
            href="/app/tanks"
            className="text-xs font-mono text-aqua hover:underline inline-flex items-center gap-1"
          >
            <span>Manage tanks</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview.tanks.map((t) => {
            const hasScore = t.latest_score !== null && t.latest_score !== undefined;
            const level = t.latest_level || "Normal";

            return (
              <Link
                key={t.id}
                href={`/app/tanks`}
                data-testid={`tank-card-${t.id}`}
                className="glass-card p-5 border-border/40 hover:border-aqua/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-sm text-foam group-hover:text-aqua transition-colors truncate">
                      {t.name}
                    </h3>
                    {hasScore && (
                      <StatusChip
                        label={`${t.latest_score} / 100`}
                        variant={
                          level === "Critical"
                            ? "prototype"
                            : level === "Elevated"
                            ? "validation"
                            : "real"
                        }
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-foam/60 mb-4">
                    <div>
                      <span className="block text-foam/40 text-[10px]">Volume</span>
                      <span>{t.volume_l} L</span>
                    </div>
                    <div>
                      <span className="block text-foam/40 text-[10px]">Goldfish</span>
                      <span>{t.goldfish_count}</span>
                    </div>
                  </div>
                </div>

                {/* Sparkline & Last Analysis */}
                <div className="pt-3 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-foam/50">
                  <span>
                    {t.last_analyzed_at
                      ? `Analysed ${new Date(t.last_analyzed_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
                      : "No analyses yet"}
                  </span>
                  {t.sparkline && t.sparkline.length > 1 && (
                    <div className="flex items-end gap-1 h-4">
                      {t.sparkline.slice(-6).map((val, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 bg-aqua/60 rounded-t"
                          style={{ height: `${Math.max(20, Math.min(100, val))}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Analyses & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Analyses (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
              Recent Analyses
            </h2>
            <Link
              href="/app/history"
              className="text-xs font-mono text-aqua hover:underline inline-flex items-center gap-1"
            >
              <span>Full history</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {overview.recent_analyses.length === 0 ? (
            <div className="glass-card p-8 text-center border-border/40 text-foam/50 text-xs">
              No recent analyses recorded.
            </div>
          ) : (
            <div className="glass-card border-border/40 overflow-hidden divide-y divide-border/30">
              {overview.recent_analyses.map((item) => (
                <Link
                  key={item.id}
                  href={`/app/results/${item.id}`}
                  className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors group text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-lagoon/40 border border-border/50 flex items-center justify-center text-foam/80 group-hover:border-aqua/50 transition-colors">
                      <Activity className="w-4 h-4 text-aqua" />
                    </div>
                    <div>
                      <span className="font-semibold text-foam group-hover:text-aqua transition-colors block">
                        {item.tank_name}
                      </span>
                      <span className="text-[11px] font-mono text-foam/50">
                        {new Date(item.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-foam/70 hidden sm:inline">
                      {item.stressed_count}/{item.fish_count} stressed
                    </span>
                    <StatusChip
                      label={`${item.tank_score} (${item.level})`}
                      variant={
                        item.level === "Critical"
                          ? "prototype"
                          : item.level === "Elevated"
                          ? "validation"
                          : "real"
                      }
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Priority Alerts & Recommendations (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
              Active Alerts
            </h2>
            <Link
              href="/app/alerts"
              className="text-xs font-mono text-aqua hover:underline inline-flex items-center gap-1"
            >
              <span>All alerts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {overview.priority_alerts.length === 0 ? (
            <div className="glass-card p-6 text-center border-border/40 text-foam/50 text-xs">
              <CheckCircle2 className="w-6 h-6 text-ok mx-auto mb-2" />
              <span>All tanks operating within normal parameters.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {overview.priority_alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-foam font-medium leading-snug">{al.message}</p>
                    <span className="text-[10px] font-mono text-foam/50 block mt-1">
                      {new Date(al.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

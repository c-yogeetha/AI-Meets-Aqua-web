"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Alert } from "@/lib/api";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedTank, setSelectedTank] = useState<string>("all");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.listAlerts(),
    refetchInterval: 15000,
  });

  const { data: tanks } = useQuery({
    queryKey: ["tanks"],
    queryFn: () => api.listTanks(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast("Alert marked as read", "info");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllAlertsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast("All alerts marked as read", "success");
    },
  });

  const filteredAlerts = (alerts || []).filter((al) => {
    if (severityFilter !== "all" && al.severity.toLowerCase() !== severityFilter) {
      return false;
    }
    if (readFilter === "unread" && al.read) return false;
    if (readFilter === "read" && !al.read) return false;
    if (selectedTank !== "all" && al.tank_id !== selectedTank) return false;
    return true;
  });

  const unreadCount = (alerts || []).filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
            Alert Center
          </h1>
          <p className="text-xs text-foam/60 font-mono mt-0.5">
            Real-time stress notifications and threshold events
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5 text-aqua" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-3 sm:p-4 border-border/40 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-foam/60 mr-2">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Filters:</span>
        </div>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        {/* Status */}
        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as "all" | "unread" | "read")}
          className="px-3 py-1.5 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
        >
          <option value="all">All Status</option>
          <option value="unread">Unread Only</option>
          <option value="read">Read Only</option>
        </select>

        {/* Tank */}
        {tanks && tanks.length > 0 && (
          <select
            value={selectedTank}
            onChange={(e) => setSelectedTank(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
          >
            <option value="all">All Tanks</option>
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto text-foam/50 text-[11px] font-mono">
          Showing {filteredAlerts.length} of {alerts?.length || 0}
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-aqua mb-2" />
          <span className="text-xs text-foam/60 font-mono">Loading alerts...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card p-12 text-center border-border/40">
          <CheckCircle2 className="w-10 h-10 text-ok mx-auto mb-3" />
          <h2 className="font-semibold text-foam text-sm mb-1">No alerts found</h2>
          <p className="text-xs text-foam/60 max-w-sm mx-auto">
            {unreadCount === 0
              ? "All clear. No active alerts or unresolved stress events."
              : "No alerts match the selected filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((al: Alert) => {
            const isCrit = al.severity.toLowerCase() === "critical";
            const isWarn = al.severity.toLowerCase() === "warning";

            return (
              <div
                key={al.id}
                data-testid={`alert-item-${al.id}`}
                className={`glass-card p-4 sm:p-5 border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  !al.read ? "border-l-4 border-l-aqua bg-lagoon/20" : "opacity-75"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCrit
                        ? "bg-danger/20 text-danger border border-danger/40"
                        : isWarn
                        ? "bg-warn/20 text-warn border border-warn/40"
                        : "bg-aqua/20 text-aqua border border-aqua/40"
                    }`}
                  >
                    {isCrit ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : isWarn ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
                          isCrit
                            ? "bg-danger/20 text-danger border border-danger/30"
                            : isWarn
                            ? "bg-warn/20 text-warn border border-warn/30"
                            : "bg-aqua/20 text-aqua border border-aqua/30"
                        }`}
                      >
                        {al.severity}
                      </span>
                      <span className="font-semibold text-xs text-foam">
                        {tanks?.find((t) => t.id === al.tank_id)?.name || "Aquarium"}
                      </span>
                      {!al.read && (
                        <span className="w-2 h-2 rounded-full bg-aqua" title="Unread" />
                      )}
                    </div>

                    <p className="text-xs text-foam/90 leading-relaxed break-words">
                      {al.message}
                    </p>

                    <div className="text-[10px] font-mono text-foam/50 pt-0.5">
                      {new Date(al.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {al.result_id && (
                    <Link
                      href={`/app/results/${al.result_id}`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-foam/80 hover:text-white transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>View Result</span>
                      <ArrowRight className="w-3 h-3 text-aqua" />
                    </Link>
                  )}

                  {!al.read && (
                    <button
                      onClick={() => markReadMutation.mutate(al.id)}
                      disabled={markReadMutation.isPending}
                      className="px-3 py-1.5 rounded-lg border border-border/60 hover:bg-white/5 text-xs font-medium text-foam/70 hover:text-white transition-colors"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

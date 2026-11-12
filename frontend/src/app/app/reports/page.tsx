"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type HistoryItem } from "@/lib/api";
import { StatusChip } from "@/components/ui/StatusChip";
import { downloadFile } from "@/lib/download";
import {
  FileText,
  Download,
  ExternalLink,
  Table,
  Filter,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function ReportsPage() {
  const [selectedTank, setSelectedTank] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: tanks } = useQuery({
    queryKey: ["tanks"],
    queryFn: () => api.listTanks(),
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["history", selectedTank],
    queryFn: () => api.getHistory(selectedTank !== "all" ? selectedTank : undefined),
  });

  const handleDownloadPdf = async (item: HistoryItem) => {
    try {
      setDownloadingId(item.id);
      await downloadFile(`/api/v1/results/${item.id}/report.pdf`, `matsya-report-${item.id.slice(0, 8)}.pdf`);
      showToast("PDF report downloaded", "success");
    } catch {
      showToast("Failed to download PDF report", "danger");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportCsv = () => {
    if (!history?.items || history.items.length === 0) {
      showToast("No data to export", "info");
      return;
    }

    const headers = ["Analysis ID", "Tank Name", "Date (UTC)", "Score", "Level", "Stressed Fish", "Total Fish", "Mode"];
    const rows = history.items.map((it) => [
      it.id,
      `"${it.tank_name.replace(/"/g, '""')}"`,
      it.created_at,
      it.tank_score,
      it.level,
      it.stressed_count,
      it.fish_count,
      it.mode || "classical",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `matsya_analyses_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV exported successfully", "success");
  };

  const items = history?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
            Report Center
          </h1>
          <p className="text-xs text-foam/60 font-mono mt-0.5">
            Archived observation summaries, comprehensive PDF report downloads, and tabular data exports
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Table className="w-4 h-4 text-aqua" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Tank Filter */}
      {tanks && tanks.length > 0 && (
        <div className="glass-card p-3 sm:p-4 border-border/40 flex items-center gap-3 text-xs">
          <Filter className="w-3.5 h-3.5 text-foam/60" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-foam/60">
            Tank Enclosure:
          </span>
          <select
            value={selectedTank}
            onChange={(e) => setSelectedTank(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
          >
            <option value="all">All Tanks ({tanks.length})</option>
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Reports Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-aqua mb-2" />
          <span className="text-xs text-foam/60 font-mono">Loading reports...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 text-center border-border/40">
          <FileText className="w-10 h-10 text-foam/30 mx-auto mb-3" />
          <h2 className="font-semibold text-foam text-sm mb-1">No reports available</h2>
          <p className="text-xs text-foam/60 max-w-sm mx-auto">
            Completed video analyses will appear here with one-click PDF generation and CSV exports.
          </p>
        </div>
      ) : (
        <div className="glass-card border-border/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-lagoon/20 border-b border-border/40 text-[10px] font-mono uppercase text-foam/60">
                <tr>
                  <th className="px-4 py-3">Tank</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Score & Level</th>
                  <th className="px-4 py-3">Fish Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono">
                {items.map((item) => {
                  const isDl = downloadingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-sans font-semibold text-foam">
                        <Link
                          href={`/app/results/${item.id}`}
                          className="hover:text-aqua transition-colors"
                        >
                          {item.tank_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foam/60 text-[11px]">
                        {new Date(item.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foam">{item.tank_score}</span>
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
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foam/70">
                        {item.stressed_count > 0 ? (
                          <span className="text-warn">{item.stressed_count}/{item.fish_count} stressed</span>
                        ) : (
                          <span className="text-ok">0/{item.fish_count} stressed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/app/results/${item.id}`}
                            className="p-1.5 rounded-lg text-foam/60 hover:text-white hover:bg-white/5 transition-colors"
                            title="View Result"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            data-testid={`download-pdf-${item.id}`}
                            onClick={() => handleDownloadPdf(item)}
                            disabled={isDl}
                            className="px-2.5 py-1 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {isDl ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
